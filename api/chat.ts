import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  // CORS configuration
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
    const {
      provider = 'gemini',
      apiKey,
      model,
      messages = [],
      systemInstruction,
      temperature = 0.2
    } = req.body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // 1. EDGE PROVIDER (Browser-based execution)
    if (provider === 'edge') {
      return res.status(200).json({
        reply: 'Edge model operates locally in browser storage.',
        provider: 'edge',
        model: 'smolLM2-360M-instruct'
      });
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

      const client = new GoogleGenAI({
        apiKey: keyToUse,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const contents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const selectedModel = (!model || model === 'gemini-flash-latest' || model === 'gemini-2.5-flash')
        ? 'gemini-3.8-flash'
        : model;

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
              if (typeof res.flush === 'function') {
                res.flush();
              }
            }
          }
          res.write(`data: [DONE]\n\n`);
          if (typeof res.flush === 'function') {
            res.flush();
          }
          res.end();
          return;
        } catch (streamErr: any) {
          console.warn('Gemini stream error:', streamErr?.message || streamErr);
          try {
            const fallbackResponse = await client.models.generateContent({
              model: selectedModel,
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
              if (typeof res.flush === 'function') {
                res.flush();
              }
              res.end();
              return;
            }
          } catch (fallbackErr: any) {
            console.warn('Gemini fallback attempt error:', fallbackErr?.message || fallbackErr);
          }

          res.write(`data: ${JSON.stringify({ error: streamErr?.message || 'Streaming failed' })}\n\n`);
          res.end();
          return;
        }
      }

      let reply = '';
      let lastErr: any = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await client.models.generateContent({
            model: selectedModel,
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
          if (attempt < 2) {
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

      const data: any = await openAiRes.json();
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

      const data: any = await dsRes.json();
      const reply = data.choices?.[0]?.message?.content || '';
      return res.json({ reply, provider: 'deepseek', model: model || 'deepseek-chat' });
    }

    // 4. Z.AI (ZHIPU AI) PROVIDER
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

      const data: any = await zaiRes.json();
      const reply = data.choices?.[0]?.message?.content || '';
      return res.json({ reply, provider: 'zai', model: model || 'glm-4-flash' });
    }

    return res.status(400).json({ error: `Unsupported provider: ${provider}` });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Chat API handler error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error processing agent reasoning' });
  }
}
