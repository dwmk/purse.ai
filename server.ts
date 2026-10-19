import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Allow fetching any custom files or items stored in /public directory as "/file.extension"
  const publicDir = path.resolve(__dirname, 'public');

  // Mount express.static for public files at root and at /public
  app.use(express.static(publicDir, { dotfiles: 'allow', fallthrough: true, index: false }));
  app.use('/public', express.static(publicDir, { dotfiles: 'allow' }));

  // Intercept ANY static file requests before Vite or Express HTML fallback
  app.use((req, res, next) => {
    const rawPath = req.path;

    // NEVER intercept API routes, /app, Vite dev internals, node_modules, or source code
    if (
      rawPath.startsWith('/api') ||
      rawPath === '/app' ||
      rawPath.startsWith('/app/') ||
      rawPath.startsWith('/@') ||
      rawPath.startsWith('/src') ||
      rawPath.startsWith('/node_modules') ||
      rawPath.startsWith('/.vite') ||
      rawPath.endsWith('.tsx') ||
      rawPath.endsWith('.ts') ||
      rawPath.endsWith('.jsx') ||
      rawPath.endsWith('.js') ||
      rawPath.endsWith('.mjs') ||
      rawPath.endsWith('.css') ||
      req.url.includes('?import') ||
      req.url.includes('?t=') ||
      req.url.includes('?v=')
    ) {
      return next();
    }

    const cleanPath = decodeURIComponent(rawPath).replace(/^\/+/, '');
    if (!cleanPath) {
      return next();
    }

    // 1. Check in /public directory (e.g. /icon.svg -> /public/icon.svg, /test.txt, /idle.fbx, /model.vrm)
    const publicFilePath = path.join(publicDir, cleanPath);
    if (fs.existsSync(publicFilePath) && fs.statSync(publicFilePath).isFile()) {
      return res.sendFile(publicFilePath);
    }

    // Also support /public/filename.ext explicitly
    if (cleanPath.startsWith('public/')) {
      const subPath = cleanPath.replace(/^public\//, '');
      const subFilePath = path.join(publicDir, subPath);
      if (fs.existsSync(subFilePath) && fs.statSync(subFilePath).isFile()) {
        return res.sendFile(subFilePath);
      }
    }

    // 2. Check for explicit root metadata files
    const ALLOWED_ROOT_FILES = new Set(['manifest.json', 'metadata.json', 'icon.svg', 'thumbnail.png', 'robots.txt']);
    if (ALLOWED_ROOT_FILES.has(cleanPath)) {
      const rootFilePath = path.join(__dirname, cleanPath);
      if (fs.existsSync(rootFilePath) && fs.statSync(rootFilePath).isFile()) {
        return res.sendFile(rootFilePath);
      }
    }

    // 3. If the request is for a file with an extension (e.g. /something.ext, /model.vrm)
    // and it does NOT exist: DO NOT let Vite SPA fallback serve index.html (which would redirect to the landing page).
    // Instead return an explicit 404!
    if (path.extname(cleanPath) && !cleanPath.endsWith('.html')) {
      return res.status(404).type('text/plain').send(`404 Not Found: File "${cleanPath}" was not found in /public.`);
    }

    next();
  });

  // Initialize server-side Gemini client
  const geminiApiKey = process.env.GEMINI_API_KEY || '';
  const ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      hasServerGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      timestamp: new Date().toISOString()
    });
  });

  // Chat & Agent Reasoning Proxy Endpoint
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      let {
        provider = 'gemini',
        apiKey,
        model,
        messages = [],
        systemInstruction,
        temperature = 0.2
      } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Messages array is required' });
      }

      // 1. EDGE PROVIDER: If key available, use it; otherwise signal browser-based execution
      if (provider === 'edge') {
        const keyToUse = apiKey || process.env.GEMINI_API_KEY;
        if (keyToUse && keyToUse !== 'MY_GEMINI_API_KEY') {
          provider = 'gemini';
        } else {
          return res.status(200).json({
            reply: '',
            provider: 'edge',
            model: 'smolLM2-135M-instruct',
            missingKey: true
          });
        }
      }

      // 2. GEMINI PROVIDER
      if (provider === 'gemini') {
        const keyToUse = apiKey || process.env.GEMINI_API_KEY;
        if (!keyToUse || keyToUse === 'MY_GEMINI_API_KEY') {
          return res.status(200).json({
            error: 'No valid Gemini API key found. Please enter a key in Settings or set GEMINI_API_KEY.',
            missingKey: true,
            reply: ''
          });
        }

        const client = apiKey ? new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        }) : ai;

        // Build contents for Gemini
        const contents = messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

        const selectedModel = (!model || model === 'gemini-flash-latest' || model === 'gemini-2.5-flash' || model.includes('smolLM'))
          ? 'gemini-3.8-flash'
          : model;

        // Streaming support via Server-Sent Events (SSE)
        if (req.body.stream) {
          res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache, no-transform');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Accel-Buffering', 'no');
          if (typeof res.flushHeaders === 'function') {
            res.flushHeaders();
          }

          try {
            const stream = await client.models.generateContentStream({
              model: selectedModel,
              contents,
              config: {
                systemInstruction: systemInstruction || undefined,
                temperature,
              }
            });

            for await (const chunk of stream) {
              const chunkText = chunk.text || '';
              if (chunkText) {
                res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
                if (typeof (res as any).flush === 'function') {
                  (res as any).flush();
                }
              }
            }
            res.write(`data: [DONE]\n\n`);
            if (typeof (res as any).flush === 'function') {
              (res as any).flush();
            }
            res.end();
            return;
          } catch (streamErr: any) {
            for (const fallbackModel of ['gemini-2.5-flash', 'gemini-3.1-flash-lite']) {
              try {
                const fallbackResponse = await client.models.generateContent({
                  model: fallbackModel,
                  contents,
                  config: {
                    systemInstruction: systemInstruction || undefined,
                    temperature,
                  }
                });
                const replyText = fallbackResponse.text || '';
                if (replyText) {
                  res.write(`data: ${JSON.stringify({ text: replyText })}\n\n`);
                  res.write(`data: [DONE]\n\n`);
                  if (typeof (res as any).flush === 'function') {
                    (res as any).flush();
                  }
                  res.end();
                  return;
                }
              } catch (fallbackErr: any) {
                console.warn(`Gemini fallback ${fallbackModel} attempt error:`, fallbackErr?.message || fallbackErr);
              }
            }

            res.write(`data: ${JSON.stringify({ error: streamErr?.message || 'Streaming failed' })}\n\n`);
            res.end();
            return;
          }
        }

        let reply = '';
        let lastErr: any = null;

        const modelCandidates = [selectedModel, 'gemini-2.5-flash', 'gemini-3.1-flash-lite'];
        for (let attempt = 0; attempt < modelCandidates.length; attempt++) {
          try {
            const currentModelCandidate = modelCandidates[attempt];
            const response = await client.models.generateContent({
              model: currentModelCandidate,
              contents,
              config: {
                systemInstruction: systemInstruction || undefined,
                temperature,
              }
            });
            reply = response.text || '';
            break;
          } catch (err: any) {
            lastErr = err;
            console.warn(`Gemini generateContent attempt ${attempt + 1} (${modelCandidates[attempt]}) failed:`, err?.message || err);
            if (attempt < modelCandidates.length - 1) {
              await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
            }
          }
        }

        if (!reply && lastErr) {
          throw lastErr;
        }

        return res.json({ reply, provider: 'gemini', model: selectedModel });
      }

      // 2. OPENAI PROVIDER
      if (provider === 'openai') {
        if (!apiKey) {
          return res.status(400).json({ error: 'OpenAI API Key is required for OpenAI provider' });
        }

        const openAiMessages = [
          ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
          ...messages
        ];

        const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || 'gpt-4o-mini',
            messages: openAiMessages,
            temperature
          })
        });

        if (!openAiRes.ok) {
          const errText = await openAiRes.text();
          return res.status(openAiRes.status).json({ error: `OpenAI API error: ${errText}` });
        }

        const data = await openAiRes.json();
        const reply = data.choices?.[0]?.message?.content || '';
        return res.json({ reply, provider: 'openai', model: model || 'gpt-4o-mini' });
      }

      // 3. DEEPSEEK PROVIDER
      if (provider === 'deepseek') {
        if (!apiKey) {
          return res.status(400).json({ error: 'DeepSeek API Key is required for DeepSeek provider' });
        }

        const deepseekMessages = [
          ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
          ...messages
        ];

        const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || 'deepseek-chat',
            messages: deepseekMessages,
            temperature
          })
        });

        if (!dsRes.ok) {
          const errText = await dsRes.text();
          return res.status(dsRes.status).json({ error: `DeepSeek API error: ${errText}` });
        }

        const data = await dsRes.json();
        const reply = data.choices?.[0]?.message?.content || '';
        return res.json({ reply, provider: 'deepseek', model: model || 'deepseek-chat' });
      }

      // 4. Z.AI (ZHIPU AI / GLM) PROVIDER
      if (provider === 'zai') {
        if (!apiKey) {
          return res.status(400).json({ error: 'Z.ai (Zhipu) API Key is required' });
        }

        const zaiMessages = [
          ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
          ...messages
        ];

        const zaiRes = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || 'glm-4-flash',
            messages: zaiMessages,
            temperature
          })
        });

        if (!zaiRes.ok) {
          const errText = await zaiRes.text();
          return res.status(zaiRes.status).json({ error: `Z.ai API error: ${errText}` });
        }

        const data = await zaiRes.json();
        const reply = data.choices?.[0]?.message?.content || '';
        return res.json({ reply, provider: 'zai', model: model || 'glm-4-flash' });
      }

      // 5. CLAUDE (ANTHROPIC) PROVIDER
      if (provider === 'claude') {
        if (!apiKey) {
          return res.status(400).json({ error: 'Claude API Key is required for Anthropic Claude provider' });
        }

        const claudeMessages = messages.map((m: any) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }));

        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: model || 'claude-3-5-sonnet-20241022',
            system: systemInstruction || undefined,
            messages: claudeMessages,
            max_tokens: 1500,
            temperature
          })
        });

        if (!claudeRes.ok) {
          const errText = await claudeRes.text();
          return res.status(claudeRes.status).json({ error: `Claude API error: ${errText}` });
        }

        const data: any = await claudeRes.json();
        const reply = data.content?.map((c: any) => c.text || '').join('') || '';
        return res.json({ reply, provider: 'claude', model: model || 'claude-3-5-sonnet-20241022' });
      }

      // 6. QWEN (ALIBABA DASHSCOPE) PROVIDER
      if (provider === 'qwen') {
        if (!apiKey) {
          return res.status(400).json({ error: 'Qwen API Key is required for Alibaba Qwen provider' });
        }

        const qwenMessages = [
          ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
          ...messages
        ];

        const qwenRes = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || 'qwen-turbo',
            messages: qwenMessages,
            temperature
          })
        });

        if (!qwenRes.ok) {
          const errText = await qwenRes.text();
          return res.status(qwenRes.status).json({ error: `Qwen API error: ${errText}` });
        }

        const data: any = await qwenRes.json();
        const reply = data.choices?.[0]?.message?.content || '';
        return res.json({ reply, provider: 'qwen', model: model || 'qwen-turbo' });
      }

      // 7. GROQ PROVIDER
      if (provider === 'groq') {
        if (!apiKey) {
          return res.status(400).json({ error: 'Groq API Key is required for Groq provider' });
        }

        const groqMessages = [
          ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
          ...messages
        ];

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || 'llama-3.3-70b-versatile',
            messages: groqMessages,
            temperature
          })
        });

        if (!groqRes.ok) {
          const errText = await groqRes.text();
          return res.status(groqRes.status).json({ error: `Groq API error: ${errText}` });
        }

        const data: any = await groqRes.json();
        const reply = data.choices?.[0]?.message?.content || '';
        return res.json({ reply, provider: 'groq', model: model || 'llama-3.3-70b-versatile' });
      }

      // 8. HUGGING FACE INFERENCE ROUTER PROVIDER
      if (provider === 'huggingface') {
        if (!apiKey) {
          return res.status(400).json({ error: 'Hugging Face API Token is required for Hugging Face provider' });
        }

        const hfMessages = [
          ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
          ...messages
        ];

        const hfRes = await fetch('https://router.huggingface.co/hf-inference/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || 'meta-llama/Llama-3.1-70B-Instruct',
            messages: hfMessages,
            max_tokens: 1500,
            temperature
          })
        });

        if (!hfRes.ok) {
          const errText = await hfRes.text();
          return res.status(hfRes.status).json({ error: `Hugging Face API error: ${errText}` });
        }

        const data: any = await hfRes.json();
        const reply = data.choices?.[0]?.message?.content || '';
        return res.json({ reply, provider: 'huggingface', model: model || 'meta-llama/Llama-3.1-70B-Instruct' });
      }

      return res.status(400).json({ error: `Unsupported provider: ${provider}` });
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Chat error:', error);
      return res.status(500).json({ error: error.message || 'Internal server error processing agent reasoning' });
    }
  });

  // LLM Ingestion & Transaction Organizer Endpoint
  app.post('/api/organize-transactions', async (req: Request, res: Response) => {
    try {
      const { text, provider = 'gemini', apiKey, model } = req.body;
      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ error: 'Transaction data or text is required' });
      }

      const systemPrompt = `You are an expert financial data organizer and accountant engine.
The user will provide raw transaction text, bank statement export, CSV rows, or financial notes.
Your task is to analyze, normalize, clean, and organize the data into a structured financial ledger format.

CRITICAL INSTRUCTIONS FOR MULTI-ACCOUNT DETECTION & SMART TRANSACTION ASSIGNMENT:
1. IDENTIFY ALL ACCOUNTS:
   - Check if the transactions mention multiple accounts, banks, card numbers, or sources (e.g. "Chase Checking", "Amex Card", "Savings", "Physical Cash", "Solana Wallet", or cards with masks like "••4192", "••1044").
   - If multiple accounts exist in the input, create a separate entry in the "accounts" array for EACH distinct account with a unique "id" (e.g. "acc_checking_01", "acc_cc_02", "acc_savings_03", "acc_cash_04").
   - If only one account or no explicit account is mentioned, deduce the best account (e.g. "Primary Checking" for bank statements, "Credit Card" if mostly card purchases, "Physical Cash Wallet" if cash notes).
2. SMARTLY ASSIGN EACH TRANSACTION:
   - Every transaction in "transactions" MUST have its "accountId" field set to the exact "id" of the account it belongs to!
   - For example:
     * Payroll deposits, rent payments, checks, utility direct debits go to checking ("acc_checking_01").
     * Credit card retail purchases, dining, subscriptions go to credit card ("acc_cc_02").
     * Savings deposits and investment transfers go to savings ("acc_savings_03").
     * Cash transactions, cash tips, and physical pocket cash go to cash ("acc_cash_04").
3. CALCULATE STARTING BALANCES:
   - For checking/savings/cash: balance = total inflow - total outflow for that account.
   - For credit cards: balance = -total charges (negative number).

Return ONLY a valid JSON object matching this schema (no markdown fences, no raw text):
{
  "accounts": [
    {
      "id": "acc_checking_01",
      "name": "string (e.g. Primary Checking, Daily Rewards Credit Card, Cash Wallet)",
      "type": "checking" | "savings" | "credit" | "cash" | "crypto" | "investment",
      "balance": number,
      "currency": "USD",
      "institution": "string (leave empty string \"\" for cash account with no bank, or bank/custodian name)",
      "network": "optional string for crypto",
      "walletAddress": "optional string for crypto",
      "accountNumberMask": "string (e.g. •••• 4192, Cash Drawer, Web3)"
    }
  ],
  "transactions": [
    {
      "id": "tx_1",
      "date": "YYYY-MM-DD",
      "amount": number (positive value),
      "type": "expense" | "income" | "transfer",
      "category": "Housing & Rent" | "Groceries" | "Utilities & Services" | "Dining & Nightlife" | "Transportation & Fuel" | "Health & Wellness" | "Subscriptions & Software" | "Entertainment & Leisure" | "Shopping & Goods" | "Savings & Investments" | "Other",
      "merchant": "string",
      "note": "string",
      "accountId": "string (MUST MATCH one of the accounts[i].id values above!)",
      "autoCategorized": true
    }
  ],
  "bills": [
    {
      "id": "bill_1",
      "name": "string (e.g. Netflix)",
      "amount": number,
      "category": "Subscriptions & Software" | "Utilities & Services" | "Housing & Rent" | "Health & Wellness" | "Other",
      "frequency": "monthly",
      "dueDate": "YYYY-MM-DD",
      "isAutopay": boolean,
      "isPaidThisCycle": boolean,
      "status": "upcoming"
    }
  ],
  "budgets": [
    {
      "id": "b_1",
      "category": "Groceries",
      "type": "need" | "want" | "savings",
      "allocated": number,
      "color": "string"
    }
  ],
  "summary": {
    "totalInflow": number,
    "totalOutflow": number,
    "netSavings": number,
    "suggestedMonthlyIncome": number
  }
}`;

      // 1. GEMINI
      if (provider === 'gemini') {
        const keyToUse = apiKey || process.env.GEMINI_API_KEY;
        if (!keyToUse || keyToUse === 'MY_GEMINI_API_KEY') {
          return res.status(200).json({
            error: 'Missing Gemini API key for transaction organization',
            missingKey: true,
            organized: null
          });
        }

        const client = apiKey ? new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        }) : ai;

        const selectedModel = (!model || model === 'gemini-flash-latest' || model === 'gemini-2.5-flash')
          ? 'gemini-3.8-flash'
          : model;

        let reply = '{}';
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const response = await client.models.generateContent({
              model: selectedModel,
              contents: [{ role: 'user', parts: [{ text: `Analyze and organize these financial transactions into JSON:\n\n${text}` }] }],
              config: {
                systemInstruction: systemPrompt,
                responseMimeType: 'application/json',
                temperature: 0.1,
              }
            });
            reply = response.text || '{}';
            break;
          } catch (err) {
            console.warn(`Gemini organize attempt ${attempt + 1} failed:`, err);
            if (attempt < 2) await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
          }
        }

        try {
          const parsed = JSON.parse(reply.replace(/```json/g, '').replace(/```/g, '').trim());
          return res.json({ organized: parsed, provider: 'gemini' });
        } catch {
          return res.json({ organized: null, raw: reply, provider: 'gemini' });
        }
      }

      // 2. OPENAI
      if (provider === 'openai') {
        if (!apiKey) return res.status(400).json({ error: 'OpenAI API key is required' });
        const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Analyze and organize these financial transactions into JSON:\n\n${text}` }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1
          })
        });

        if (!openAiRes.ok) {
          const errText = await openAiRes.text();
          return res.status(openAiRes.status).json({ error: `OpenAI error: ${errText}` });
        }

        const data = await openAiRes.json();
        const content = data.choices?.[0]?.message?.content || '{}';
        return res.json({ organized: JSON.parse(content), provider: 'openai' });
      }

      // 3. DEEPSEEK
      if (provider === 'deepseek') {
        if (!apiKey) return res.status(400).json({ error: 'DeepSeek API key is required' });
        const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || 'deepseek-chat',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Analyze and organize these financial transactions into JSON:\n\n${text}` }
            ],
            temperature: 0.1
          })
        });

        if (!dsRes.ok) {
          const errText = await dsRes.text();
          return res.status(dsRes.status).json({ error: `DeepSeek error: ${errText}` });
        }

        const data = await dsRes.json();
        const content = data.choices?.[0]?.message?.content || '{}';
        const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return res.json({ organized: JSON.parse(cleaned), provider: 'deepseek' });
      }

      // 4. Z.AI
      if (provider === 'zai') {
        if (!apiKey) return res.status(400).json({ error: 'Z.ai API key is required' });
        const zaiRes = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || 'glm-4-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Analyze and organize these financial transactions into JSON:\n\n${text}` }
            ],
            temperature: 0.1
          })
        });

        if (!zaiRes.ok) {
          const errText = await zaiRes.text();
          return res.status(zaiRes.status).json({ error: `Z.ai error: ${errText}` });
        }

        const data = await zaiRes.json();
        const content = data.choices?.[0]?.message?.content || '{}';
        const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return res.json({ organized: JSON.parse(cleaned), provider: 'zai' });
      }

      // 5. CLAUDE
      if (provider === 'claude') {
        if (!apiKey) return res.status(400).json({ error: 'Claude API key is required' });
        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: model || 'claude-3-5-sonnet-20241022',
            system: systemPrompt,
            messages: [{ role: 'user', content: `Analyze and organize these financial transactions into JSON:\n\n${text}` }],
            max_tokens: 3000,
            temperature: 0.1
          })
        });

        if (!claudeRes.ok) {
          const errText = await claudeRes.text();
          return res.status(claudeRes.status).json({ error: `Claude error: ${errText}` });
        }

        const data = await claudeRes.json();
        const content = data.content?.map((c: any) => c.text || '').join('') || '{}';
        const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return res.json({ organized: JSON.parse(cleaned), provider: 'claude' });
      }

      // 6. QWEN
      if (provider === 'qwen') {
        if (!apiKey) return res.status(400).json({ error: 'Qwen API key is required' });
        const qwenRes = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || 'qwen-turbo',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Analyze and organize these financial transactions into JSON:\n\n${text}` }
            ],
            temperature: 0.1
          })
        });

        if (!qwenRes.ok) {
          const errText = await qwenRes.text();
          return res.status(qwenRes.status).json({ error: `Qwen error: ${errText}` });
        }

        const data = await qwenRes.json();
        const content = data.choices?.[0]?.message?.content || '{}';
        const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return res.json({ organized: JSON.parse(cleaned), provider: 'qwen' });
      }

      // 7. GROQ
      if (provider === 'groq') {
        if (!apiKey) return res.status(400).json({ error: 'Groq API key is required' });
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Analyze and organize these financial transactions into JSON:\n\n${text}` }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1
          })
        });

        if (!groqRes.ok) {
          const errText = await groqRes.text();
          return res.status(groqRes.status).json({ error: `Groq error: ${errText}` });
        }

        const data = await groqRes.json();
        const content = data.choices?.[0]?.message?.content || '{}';
        const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return res.json({ organized: JSON.parse(cleaned), provider: 'groq' });
      }

      // 8. HUGGING FACE
      if (provider === 'huggingface') {
        if (!apiKey) return res.status(400).json({ error: 'Hugging Face API key is required' });
        const hfRes = await fetch('https://router.huggingface.co/hf-inference/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || 'meta-llama/Llama-3.1-70B-Instruct',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Analyze and organize these financial transactions into JSON:\n\n${text}` }
            ],
            max_tokens: 3000,
            temperature: 0.1
          })
        });

        if (!hfRes.ok) {
          const errText = await hfRes.text();
          return res.status(hfRes.status).json({ error: `Hugging Face error: ${errText}` });
        }

        const data = await hfRes.json();
        const content = data.choices?.[0]?.message?.content || '{}';
        const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return res.json({ organized: JSON.parse(cleaned), provider: 'huggingface' });
      }

      return res.status(400).json({ error: `Unsupported provider: ${provider}` });
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Organize transactions error:', error);
      return res.status(500).json({ error: error.message || 'Error processing transactions' });
    }
  });

  // Vite middleware in dev or static serving in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KiteFi Autonomous Finance Agent running on port ${PORT}`);
  });
}

startServer();
