// Financial Ingestion Service: LLM-powered and deterministic normalization for raw transaction files & text

import { Account, Bill, BudgetEnvelope, ExpenseCategory, Transaction } from '../types/finance';
import { detectCategory } from './agentEngine';

export interface OrganizedIngestionResult {
  accounts: Account[];
  transactions: Transaction[];
  bills: Bill[];
  budgets: BudgetEnvelope[];
  summary: {
    totalInflow: number;
    totalOutflow: number;
    netSavings: number;
    suggestedMonthlyIncome: number;
  };
}

export const IngestionService = {
  // Deterministic local parser for CSV, TSV, or raw transaction text lines
  parseTextLocally(rawText: string): OrganizedIngestionResult {
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const transactions: Transaction[] = [];
    const accounts: Account[] = [
      {
        id: 'acc_primary_01',
        name: 'Primary Checking',
        type: 'checking',
        balance: 0,
        currency: 'USD',
        institution: 'Imported Account',
        accountNumberMask: '•••• 1001',
        lastUpdated: new Date().toISOString()
      }
    ];

    let totalInflow = 0;
    let totalOutflow = 0;

    // Detect header row in CSV
    let startIndex = 0;
    if (lines.length > 0) {
      const firstLine = lines[0].toLowerCase();
      if (firstLine.includes('date') || firstLine.includes('amount') || firstLine.includes('merchant')) {
        startIndex = 1;
      }
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // Check CSV or TSV splitting
      const delimiter = line.includes('\t') ? '\t' : (line.includes(',') ? ',' : null);
      let date = new Date().toISOString().split('T')[0];
      let amount = 0;
      let merchant = '';
      let type: 'income' | 'expense' = 'expense';
      let note = '';

      if (delimiter) {
        const parts = line.split(delimiter).map(p => p.replace(/^["']|["']$/g, '').trim());
        // Find date part
        for (const p of parts) {
          if (p.match(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/) || p.match(/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/)) {
            const parsedD = new Date(p);
            if (!isNaN(parsedD.getTime())) {
              date = parsedD.toISOString().split('T')[0];
            }
          }
        }

        // Find amount
        for (const p of parts) {
          const cleanP = p.replace(/[$,]/g, '').trim();
          const num = parseFloat(cleanP);
          if (!isNaN(num) && num !== 0 && !p.match(/^[0-9]{4}$/)) {
            if (num < 0) {
              amount = Math.abs(num);
              type = 'expense';
            } else {
              amount = num;
              // Check if likely income or expense based on column or merchant
              if (line.toLowerCase().includes('credit') || line.toLowerCase().includes('deposit') || line.toLowerCase().includes('payroll') || line.toLowerCase().includes('salary')) {
                type = 'income';
              } else {
                type = 'expense';
              }
            }
            break;
          }
        }

        // Find merchant
        const nonNumbers = parts.filter(p => isNaN(parseFloat(p.replace(/[$,]/g, ''))) && !p.match(/\d{4}/) && p.length > 1);
        merchant = nonNumbers[0] || `Transaction ${i}`;
        note = nonNumbers.slice(1).join(' ');
      } else {
        // Natural text line parsing (e.g. "2026-10-12 Spent $45.20 at Trader Joe's")
        const amountMatch = line.match(/\$?\s*([0-9]+(?:\.[0-9]{1,2})?)/);
        if (amountMatch) {
          amount = parseFloat(amountMatch[1]);
        }
        const dateMatch = line.match(/\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/);
        if (dateMatch) {
          const parsedD = new Date(dateMatch[1]);
          if (!isNaN(parsedD.getTime())) {
            date = parsedD.toISOString().split('T')[0];
          }
        }
        if (line.toLowerCase().includes('income') || line.toLowerCase().includes('salary') || line.toLowerCase().includes('received') || line.toLowerCase().includes('deposit')) {
          type = 'income';
        }

        merchant = line.replace(/(\$\s*[0-9]+(?:\.[0-9]{1,2})?|\d{4}[-/]\d{1,2}[-/]\d{1,2})/g, '').trim() || `Entry ${i}`;
      }

      if (amount <= 0) continue;

      const category = detectCategory(merchant + ' ' + note);
      if (type === 'income') {
        totalInflow += amount;
      } else {
        totalOutflow += amount;
      }

      transactions.push({
        id: `tx_imported_${i}_${Date.now()}`,
        date,
        amount,
        type,
        category,
        merchant,
        note: note || undefined,
        accountId: 'acc_primary_01',
        autoCategorized: true
      });
    }

    // Calculate initial account balance
    accounts[0].balance = Math.max(0, totalInflow - totalOutflow);

    // Identify recurring bills from subscriptions or repeated merchants
    const bills: Bill[] = [];
    const subscriptionTxs = transactions.filter(t => t.category === 'Subscriptions & Software' || t.category === 'Utilities & Services');
    const seenMerchants = new Set<string>();

    for (const sub of subscriptionTxs) {
      if (!seenMerchants.has(sub.merchant)) {
        seenMerchants.add(sub.merchant);
        bills.push({
          id: `bill_${bills.length + 1}`,
          name: sub.merchant,
          amount: sub.amount,
          category: sub.category,
          frequency: 'monthly',
          dueDate: sub.date,
          isAutopay: true,
          isPaidThisCycle: false,
          status: 'upcoming'
        });
      }
    }

    // Default envelope budgets tailored to detected categories
    const budgets: BudgetEnvelope[] = [
      { id: 'b_01', category: 'Housing & Rent', type: 'need', allocated: Math.max(1200, totalOutflow * 0.35), color: '#8B5CF6' },
      { id: 'b_02', category: 'Groceries', type: 'need', allocated: Math.max(450, totalOutflow * 0.2), color: '#A78BFA' },
      { id: 'b_03', category: 'Utilities & Services', type: 'need', allocated: 200, color: '#C4B5FD' },
      { id: 'b_04', category: 'Transportation & Fuel', type: 'need', allocated: 220, color: '#6366F1' },
      { id: 'b_05', category: 'Health & Wellness', type: 'need', allocated: 180, color: '#818CF8' },
      { id: 'b_06', category: 'Dining & Nightlife', type: 'want', allocated: 280, color: '#EC4899' },
      { id: 'b_07', category: 'Entertainment & Leisure', type: 'want', allocated: 150, color: '#F43F5E' },
      { id: 'b_08', category: 'Subscriptions & Software', type: 'want', allocated: 120, color: '#D946EF' },
      { id: 'b_09', category: 'Shopping & Goods', type: 'want', allocated: 200, color: '#FB7185' },
      { id: 'b_10', category: 'Savings & Investments', type: 'savings', allocated: Math.max(500, totalInflow * 0.2), color: '#10B981' },
      { id: 'b_11', category: 'Other', type: 'want', allocated: 150, color: '#64748B' }
    ];

    return {
      accounts,
      transactions,
      bills,
      budgets,
      summary: {
        totalInflow,
        totalOutflow,
        netSavings: totalInflow - totalOutflow,
        suggestedMonthlyIncome: Math.max(totalInflow, totalOutflow * 1.25)
      }
    };
  },

  // Main ingestion dispatcher: feeds raw content to LLM server, falling back safely to deterministic parser
  async organizeWithLLM(
    text: string,
    options: {
      provider: string;
      apiKey?: string;
      model?: string;
    }
  ): Promise<OrganizedIngestionResult> {
    try {
      const res = await fetch('/api/organize-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          provider: options.provider,
          apiKey: options.apiKey,
          model: options.model
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.organized && Array.isArray(data.organized.transactions) && data.organized.transactions.length > 0) {
          // Normalize IDs and required structures
          const rawOrg = data.organized;
          const accounts: Account[] = (rawOrg.accounts && rawOrg.accounts.length > 0) ? rawOrg.accounts.map((a: any, idx: number) => ({
            id: a.id || `acc_${idx + 1}`,
            name: a.name || (a.type === 'cash' ? 'Cash Wallet' : a.type === 'crypto' ? 'Crypto Wallet' : 'Primary Checking'),
            type: a.type || 'checking',
            balance: typeof a.balance === 'number' ? a.balance : 0,
            currency: a.currency || 'USD',
            institution: a.institution ?? (a.type === 'cash' ? '' : a.type === 'crypto' ? 'Self-Custody' : 'Bank'),
            network: a.network,
            walletAddress: a.walletAddress,
            accountNumberMask: a.accountNumberMask || (a.type === 'cash' ? 'Cash' : a.type === 'crypto' ? 'Web3' : '•••• 1234'),
            lastUpdated: new Date().toISOString()
          })) : [
            {
              id: 'acc_primary_01',
              name: 'Primary Checking',
              type: 'checking',
              balance: 0,
              currency: 'USD',
              institution: 'Bank',
              accountNumberMask: '•••• 1234',
              lastUpdated: new Date().toISOString()
            }
          ];

          const transactions: Transaction[] = rawOrg.transactions.map((t: any, idx: number) => ({
            id: t.id || `tx_ai_${idx + 1}_${Date.now()}`,
            date: t.date || new Date().toISOString().split('T')[0],
            amount: Math.abs(typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0),
            type: t.type === 'income' ? 'income' : 'expense',
            category: (t.category as ExpenseCategory) || detectCategory(t.merchant || ''),
            merchant: t.merchant || 'Unlabeled Merchant',
            note: t.note || undefined,
            accountId: accounts[0].id,
            autoCategorized: true
          }));

          const bills: Bill[] = (rawOrg.bills || []).map((b: any, idx: number) => ({
            id: b.id || `bill_ai_${idx + 1}`,
            name: b.name || 'Recurring Service',
            amount: typeof b.amount === 'number' ? b.amount : parseFloat(b.amount) || 0,
            category: (b.category as ExpenseCategory) || 'Subscriptions & Software',
            frequency: b.frequency || 'monthly',
            dueDate: b.dueDate || new Date().toISOString().split('T')[0],
            isAutopay: Boolean(b.isAutopay),
            isPaidThisCycle: Boolean(b.isPaidThisCycle),
            status: 'upcoming'
          }));

          const budgets: BudgetEnvelope[] = (rawOrg.budgets && rawOrg.budgets.length > 0) ? rawOrg.budgets : [
            { id: 'b_01', category: 'Housing & Rent', type: 'need', allocated: 1500, color: '#8B5CF6' },
            { id: 'b_02', category: 'Groceries', type: 'need', allocated: 500, color: '#A78BFA' },
            { id: 'b_03', category: 'Utilities & Services', type: 'need', allocated: 250, color: '#C4B5FD' },
            { id: 'b_04', category: 'Transportation & Fuel', type: 'need', allocated: 200, color: '#6366F1' },
            { id: 'b_05', category: 'Health & Wellness', type: 'need', allocated: 150, color: '#818CF8' },
            { id: 'b_06', category: 'Dining & Nightlife', type: 'want', allocated: 300, color: '#EC4899' },
            { id: 'b_07', category: 'Entertainment & Leisure', type: 'want', allocated: 180, color: '#F43F5E' },
            { id: 'b_08', category: 'Subscriptions & Software', type: 'want', allocated: 120, color: '#D946EF' },
            { id: 'b_09', category: 'Shopping & Goods', type: 'want', allocated: 200, color: '#FB7185' },
            { id: 'b_10', category: 'Savings & Investments', type: 'savings', allocated: 600, color: '#10B981' },
            { id: 'b_11', category: 'Other', type: 'want', allocated: 150, color: '#64748B' }
          ];

          const totalInflow = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
          const totalOutflow = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

          return {
            accounts,
            transactions,
            bills,
            budgets,
            summary: {
              totalInflow,
              totalOutflow,
              netSavings: totalInflow - totalOutflow,
              suggestedMonthlyIncome: Math.max(totalInflow, totalOutflow * 1.25)
            }
          };
        }
      }
    } catch (err) {
      console.warn('Server LLM organize error, falling back to local deterministic parser:', err);
    }

    // Fallback to local parser
    return this.parseTextLocally(text);
  }
};
