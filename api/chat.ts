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
    let {
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

      const client = new GoogleGenAI({
        apiKey: keyToUse,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const contents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const selectedModel = (!model || model === 'gemini-flash-latest' || model === 'gemini-2.5-flash' || model.includes('smolLM'))
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
                if (typeof res.flush === 'function') {
                  res.flush();
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
    console.error('Chat API handler error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error processing agent reasoning' });
  }
}
