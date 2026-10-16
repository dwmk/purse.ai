import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

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
      const {
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

      // 1. GEMINI PROVIDER
      if (provider === 'gemini') {
        const keyToUse = apiKey || process.env.GEMINI_API_KEY;
        if (!keyToUse || keyToUse === 'MY_GEMINI_API_KEY') {
          return res.status(400).json({
            error: 'No valid Gemini API key found. Please enter a key in Settings or run with Edge mode.'
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

        const response = await client.models.generateContent({
          model: model || 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction: systemInstruction || undefined,
            temperature,
          }
        });

        const reply = response.text || '';
        return res.json({ reply, provider: 'gemini', model: model || 'gemini-3.8-flash' });
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

      return res.status(400).json({ error: `Unsupported provider: ${provider}` });
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Chat error:', error);
      return res.status(500).json({ error: error.message || 'Internal server error processing agent reasoning' });
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
