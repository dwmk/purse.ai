// Data Ingestion Service: Feeds uploaded files or text to LLM to produce organized ledger storage

import { Transaction, Account, ExpenseCategory, BudgetEnvelope, Bill } from '../types/finance';
import { detectCategory, extractAmount } from './agentEngine';

export interface ParsedFinancialData {
  accountName: string;
  accountType: 'checking' | 'savings' | 'credit';
  startingBalance: number;
  transactions: Array<{
    date: string;
    merchant: string;
    amount: number;
    type: 'expense' | 'income';
    category: ExpenseCategory;
    note: string;
  }>;
  suggestedBudgets?: Array<{
    category: ExpenseCategory;
    allocated: number;
  }>;
  suggestedBills?: Array<{
    name: string;
    amount: number;
    dueDate: string;
    category: ExpenseCategory;
  }>;
}

export const DataIngestionService = {
  // Feed statement text to LLM for smart structuring, with reliable local fallback
  async parseWithLLM(content: string): Promise<ParsedFinancialData> {
    try {
      const systemInstruction = `You are a financial data parsing AI for Purse Personal Finance.
Analyze the input text or file content (which may be CSV, bank statement, receipts, or notes) and extract all accounts and transactions.
Output ONLY raw JSON matching this structure without markdown code blocks, backticks, or other text:
{
  "accountName": "Primary Operating Checking",
  "accountType": "checking",
  "startingBalance": 1000,
  "transactions": [
    {
      "date": "2026-10-15",
      "merchant": "Trader Joe's",
      "amount": 45.20,
      "type": "expense",
      "category": "Groceries",
      "note": "Weekly groceries"
    }
  ],
  "suggestedBudgets": [
    { "category": "Groceries", "allocated": 400 }
  ]
}
Valid categories: "Housing & Rent", "Groceries", "Utilities & Services", "Dining & Nightlife", "Transportation & Fuel", "Health & Wellness", "Subscriptions & Software", "Entertainment & Leisure", "Shopping & Goods", "Savings & Investments", "Other".`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'gemini',
          model: 'gemini-3.8-flash',
          messages: [
            {
              role: 'user',
              content: `Please parse this financial data and return the structured JSON:\n\n${content.slice(0, 8000)}`
            }
          ],
          systemInstruction,
          temperature: 0.1
        })
      });

      if (res.ok) {
        const data = await res.json();
        const rawReply = (data.reply || '').trim();
        const jsonMatch = rawReply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed && Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
            return {
              accountName: parsed.accountName || 'Primary Operating Checking',
              accountType: parsed.accountType || 'checking',
              startingBalance: Number(parsed.startingBalance) || 0,
              transactions: parsed.transactions.map((tx: any) => ({
                date: tx.date || new Date().toISOString().split('T')[0],
                merchant: tx.merchant || 'Expense',
                amount: Math.abs(Number(tx.amount) || 0),
                type: tx.type === 'income' ? 'income' : 'expense',
                category: tx.category || detectCategory(tx.merchant || ''),
                note: tx.note || `Imported ${tx.merchant || ''}`
              })),
              suggestedBudgets: parsed.suggestedBudgets,
              suggestedBills: parsed.suggestedBills
            };
          }
        }
      }
    } catch (llmErr) {
      console.warn('LLM parsing endpoint notice, using local parser fallback:', llmErr);
    }

    // Fallback to local rule-based parsing
    return this.parseInput(content);
  },

  // Parse CSV format
  parseCsv(content: string): ParsedFinancialData {
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      throw new Error('The uploaded CSV file is empty.');
    }

    const transactions: ParsedFinancialData['transactions'] = [];
    let isHeader = true;

    for (const line of lines) {
      // Split by comma or semicolon, respecting quoted fields
      const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.replace(/^"|"$/g, '').trim());
      
      if (isHeader) {
        const lower = line.toLowerCase();
        if (lower.includes('date') || lower.includes('amount') || lower.includes('description') || lower.includes('merchant')) {
          isHeader = false;
          continue;
        }
        isHeader = false;
      }

      if (parts.length >= 2) {
        let date = new Date().toISOString().split('T')[0];
        let amount = 0;
        let merchant = 'Expense';
        let isIncome = false;

        for (const part of parts) {
          if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(part) || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(part)) {
            try {
              date = new Date(part).toISOString().split('T')[0];
            } catch {}
          } else {
            const parsedNum = parseFloat(part.replace(/[$,]/g, ''));
            if (!isNaN(parsedNum) && Math.abs(parsedNum) > 0) {
              if (parsedNum < 0) {
                amount = Math.abs(parsedNum);
                isIncome = false;
              } else if (part.startsWith('+') || line.toLowerCase().includes('deposit') || line.toLowerCase().includes('salary') || line.toLowerCase().includes('payroll')) {
                amount = parsedNum;
                isIncome = true;
              } else {
                amount = Math.abs(parsedNum);
              }
            } else if (part.length > 2 && isNaN(Number(part))) {
              merchant = part;
            }
          }
        }

        if (amount > 0) {
          const category = detectCategory(merchant);
          transactions.push({
            date,
            merchant,
            amount,
            type: isIncome ? 'income' : 'expense',
            category,
            note: `Imported: ${merchant}`
          });
        }
      }
    }

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = Math.max(0, Math.round(totalIncome - totalExpenses + (totalIncome > 0 ? 500 : 2000)));

    return {
      accountName: 'Imported Checking Account',
      accountType: 'checking',
      startingBalance: balance,
      transactions
    };
  },

  // Parse JSON format
  parseJson(content: string): ParsedFinancialData {
    try {
      const data = JSON.parse(content);
      const txs = Array.isArray(data) ? data : (data.transactions || []);
      const transactions: ParsedFinancialData['transactions'] = txs.map((item: any) => ({
        date: item.date || new Date().toISOString().split('T')[0],
        merchant: item.merchant || item.description || item.name || 'Merchant',
        amount: Math.abs(Number(item.amount) || 0),
        type: (item.type === 'income' || (item.amount > 0 && String(item.merchant).toLowerCase().includes('salary'))) ? 'income' : 'expense',
        category: (item.category as ExpenseCategory) || detectCategory(item.merchant || ''),
        note: item.note || 'Imported via JSON'
      })).filter(t => t.amount > 0);

      return {
        accountName: data.accountName || 'Imported Wallet',
        accountType: data.accountType || 'checking',
        startingBalance: Number(data.startingBalance || data.balance) || 1000,
        transactions
      };
    } catch (e: any) {
      throw new Error(`Invalid JSON format: ${e.message}`);
    }
  },

  // Parse unstructured natural text using regex + rule heuristics
  parseNaturalText(text: string): ParsedFinancialData {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const transactions: ParsedFinancialData['transactions'] = [];
    const today = new Date().toISOString().split('T')[0];

    for (const line of lines) {
      const amount = extractAmount(line);
      if (amount && amount > 0) {
        const isIncome = Boolean(line.match(/\b(salary|payroll|paycheck|income|deposit|refund|received|earned|transfer in)\b/i));
        const cleanedMerchant = line
          .replace(/\$?\s*[0-9]+(?:\.[0-9]{1,2})?/g, '')
          .replace(/\b(dollars|spent|paid|bought|at|for|from|on|yesterday|today|last week)\b/gi, '')
          .replace(/[.,;:]/g, '')
          .trim() || (isIncome ? 'Direct Deposit' : 'General Purchase');

        const category = detectCategory(cleanedMerchant);

        transactions.push({
          date: today,
          merchant: cleanedMerchant,
          amount,
          type: isIncome ? 'income' : 'expense',
          category,
          note: line
        });
      }
    }

    if (transactions.length === 0) {
      throw new Error('Could not find any clear transactions in the provided text. Try details like: "Spent $45 at Trader Joe\'s" or upload a CSV file.');
    }

    const net = transactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
    const startingBal = Math.max(0, Math.round(net + 1500));

    return {
      accountName: 'Personal Operating Checking',
      accountType: 'checking',
      startingBalance: startingBal,
      transactions
    };
  },

  // Universal parse method: routes to JSON, CSV, or natural text
  async parseInput(content: string, filename?: string): Promise<ParsedFinancialData> {
    const trimmed = content.trim();

    if (filename?.endsWith('.json') || (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      return this.parseJson(trimmed);
    }

    if (filename?.endsWith('.csv') || (trimmed.includes(',') && trimmed.includes('\n'))) {
      try {
        return this.parseCsv(trimmed);
      } catch {
        return this.parseNaturalText(trimmed);
      }
    }

    return this.parseNaturalText(trimmed);
  }
};
