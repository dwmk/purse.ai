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

    const systemPrompt = `You are a financial data organization engine. 
The user will provide raw transaction text, bank statement export, CSV rows, or financial notes.
Your task is to analyze, normalize, clean, and organize the data into a structured financial ledger format.

Return ONLY a valid JSON object with the following schema (no markdown formatting, no code fences):
{
  "accounts": [
    {
      "id": "acc_primary",
      "name": "string (e.g. Primary Checking)",
      "type": "checking" | "savings" | "credit" | "investment",
      "balance": number,
      "currency": "USD",
      "institution": "string (e.g. Bank)",
      "accountNumberMask": "string (e.g. •••• 1234)"
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
      "accountId": "acc_primary",
      "autoCategorized": true
    }
  ],
  "bills": [
    {
      "id": "bill_1",
      "name": "string (e.g. Netflix)",
      "amount": number,
      "category": "Subscriptions & Software" | "Utilities & Services" | "Housing & Rent",
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

    return res.status(400).json({ error: `Unsupported provider: ${provider}` });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Organize transactions API handler error:', error);
    return res.status(500).json({ error: error.message || 'Error processing transactions' });
  }
}
