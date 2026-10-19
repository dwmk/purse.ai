import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, provider = 'gemini', apiKey, model } = req.body || {};
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

      const client = new GoogleGenAI({
        apiKey: keyToUse,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

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
    console.error('Organize transactions API handler error:', error);
    return res.status(500).json({ error: error.message || 'Error processing transactions' });
  }
}
