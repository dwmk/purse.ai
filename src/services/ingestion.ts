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

    // Detect header row in CSV & check if an Account/Card column exists
    let startIndex = 0;
    let accountColIdx = -1;
    let typeColIdx = -1;
    let categoryColIdx = -1;
    let merchantColIdx = -1;
    let amountColIdx = -1;
    let dateColIdx = -1;

    if (lines.length > 0) {
      const headerLine = lines[0].toLowerCase();
      if (headerLine.includes('date') || headerLine.includes('amount') || headerLine.includes('merchant')) {
        startIndex = 1;
        const delimiter = lines[0].includes('\t') ? '\t' : (lines[0].includes(',') ? ',' : null);
        if (delimiter) {
          const cols = lines[0].split(delimiter).map(c => c.replace(/^["']|["']$/g, '').trim().toLowerCase());
          accountColIdx = cols.findIndex(c => c.includes('account') || c.includes('card') || c.includes('source') || c.includes('wallet'));
          typeColIdx = cols.findIndex(c => c === 'type' || c.includes('transaction type'));
          categoryColIdx = cols.findIndex(c => c.includes('category'));
          merchantColIdx = cols.findIndex(c => c.includes('merchant') || c.includes('description') || c.includes('payee') || c.includes('name'));
          amountColIdx = cols.findIndex(c => c.includes('amount') || c.includes('total') || c.includes('value'));
          dateColIdx = cols.findIndex(c => c.includes('date') || c.includes('time'));
        }
      }
    }

    // Dynamic accounts pool
    const accountsMap: Map<string, Account> = new Map();

    const getOrCreateAccount = (key: string, defaultType: Account['type'] = 'checking', defaultInstitution = 'Imported Account'): Account => {
      const normalizedKey = key.toLowerCase().trim();
      for (const [existingKey, acc] of accountsMap.entries()) {
        if (existingKey === normalizedKey || acc.name.toLowerCase() === normalizedKey) {
          return acc;
        }
      }

      const isCash = defaultType === 'cash' || normalizedKey.includes('cash') || normalizedKey.includes('pocket');
      const isCard = defaultType === 'credit' || normalizedKey.includes('credit') || normalizedKey.includes('card') || normalizedKey.includes('amex') || normalizedKey.includes('visa');
      const isCrypto = defaultType === 'crypto' || normalizedKey.includes('crypto') || normalizedKey.includes('web3') || normalizedKey.includes('solana') || normalizedKey.includes('eth');
      const isSavings = defaultType === 'savings' || normalizedKey.includes('saving') || normalizedKey.includes('vault');

      const accType: Account['type'] = isCash ? 'cash' : (isCard ? 'credit' : (isCrypto ? 'crypto' : (isSavings ? 'savings' : defaultType)));
      const accId = `acc_${accType}_${accountsMap.size + 1}`;
      
      const newAcc: Account = {
        id: accId,
        name: key.trim() || (accType === 'cash' ? 'Cash Wallet' : accType === 'credit' ? 'Credit Card Account' : 'Primary Checking'),
        type: accType,
        balance: 0,
        currency: 'USD',
        institution: isCash ? '' : (isCard ? 'Credit Provider' : defaultInstitution),
        accountNumberMask: isCash ? 'Cash' : (isCard ? '•••• Card' : `•••• ${1000 + accountsMap.size}`),
        lastUpdated: new Date().toISOString()
      };

      accountsMap.set(normalizedKey, newAcc);
      return newAcc;
    };

    // Ensure at least a primary checking account exists
    const primaryChecking = getOrCreateAccount('Primary Checking', 'checking', 'Primary Bank');

    let totalInflow = 0;
    let totalOutflow = 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const delimiter = line.includes('\t') ? '\t' : (line.includes(',') ? ',' : null);
      let date = new Date().toISOString().split('T')[0];
      let amount = 0;
      let merchant = '';
      let type: 'income' | 'expense' = 'expense';
      let note = '';
      let detectedAccountName = '';

      if (delimiter) {
        const parts = line.split(delimiter).map(p => p.replace(/^["']|["']$/g, '').trim());

        // Explicit column mappings if available
        if (dateColIdx >= 0 && parts[dateColIdx]) {
          const parsedD = new Date(parts[dateColIdx]);
          if (!isNaN(parsedD.getTime())) date = parsedD.toISOString().split('T')[0];
        }
        if (amountColIdx >= 0 && parts[amountColIdx]) {
          const num = parseFloat(parts[amountColIdx].replace(/[$,]/g, '').trim());
          if (!isNaN(num) && num !== 0) {
            amount = Math.abs(num);
            if (num < 0) type = 'expense';
          }
        }
        if (merchantColIdx >= 0 && parts[merchantColIdx]) {
          merchant = parts[merchantColIdx];
        }
        if (accountColIdx >= 0 && parts[accountColIdx]) {
          detectedAccountName = parts[accountColIdx];
        }
        if (typeColIdx >= 0 && parts[typeColIdx]) {
          const t = parts[typeColIdx].toLowerCase();
          if (t.includes('income') || t.includes('credit') || t.includes('deposit') || t.includes('inflow')) {
            type = 'income';
          } else {
            type = 'expense';
          }
        }

        // Fallbacks if columns were not mapped
        if (!date || date === new Date().toISOString().split('T')[0]) {
          for (const p of parts) {
            if (p.match(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/) || p.match(/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/)) {
              const parsedD = new Date(p);
              if (!isNaN(parsedD.getTime())) date = parsedD.toISOString().split('T')[0];
            }
          }
        }

        if (amount === 0) {
          for (const p of parts) {
            const cleanP = p.replace(/[$,]/g, '').trim();
            const num = parseFloat(cleanP);
            if (!isNaN(num) && num !== 0 && !p.match(/^[0-9]{4}$/)) {
              amount = Math.abs(num);
              if (num < 0) type = 'expense';
              break;
            }
          }
        }

        if (!merchant) {
          const nonNumbers = parts.filter(p => isNaN(parseFloat(p.replace(/[$,]/g, ''))) && !p.match(/\d{4}/) && p.length > 1);
          merchant = nonNumbers[0] || `Transaction ${i}`;
          note = nonNumbers.slice(1).join(' ');
        }
      } else {
        // Natural text line parsing
        const amountMatch = line.match(/\$?\s*([0-9]+(?:\.[0-9]{1,2})?)/);
        if (amountMatch) amount = parseFloat(amountMatch[1]);
        const dateMatch = line.match(/\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/);
        if (dateMatch) {
          const parsedD = new Date(dateMatch[1]);
          if (!isNaN(parsedD.getTime())) date = parsedD.toISOString().split('T')[0];
        }
        if (line.toLowerCase().includes('income') || line.toLowerCase().includes('salary') || line.toLowerCase().includes('received') || line.toLowerCase().includes('deposit')) {
          type = 'income';
        }
        merchant = line.replace(/(\$\s*[0-9]+(?:\.[0-9]{1,2})?|\d{4}[-/]\d{1,2}[-/]\d{1,2})/g, '').trim() || `Entry ${i}`;
      }

      if (amount <= 0) continue;

      // Smart Account Assignment
      let assignedAccount: Account;
      const lowerLine = line.toLowerCase();
      const lowerMerchant = merchant.toLowerCase();

      if (detectedAccountName) {
        assignedAccount = getOrCreateAccount(detectedAccountName);
      } else if (lowerLine.includes('credit card') || lowerLine.includes('visa') || lowerLine.includes('mastercard') || lowerLine.includes('amex') || lowerMerchant.includes('apple card')) {
        assignedAccount = getOrCreateAccount('Daily Credit Card', 'credit', 'Card Custodian');
      } else if (lowerLine.includes('cash') || lowerLine.includes('pocket') || lowerMerchant.includes('cash withdrawal')) {
        assignedAccount = getOrCreateAccount('Physical Cash Wallet', 'cash', '');
      } else if (lowerLine.includes('savings') || lowerLine.includes('vault') || lowerMerchant.includes('interest')) {
        assignedAccount = getOrCreateAccount('High-Yield Savings', 'savings', 'Savings Bank');
      } else if (lowerLine.includes('crypto') || lowerMerchant.includes('solana') || lowerMerchant.includes('ethereum') || lowerMerchant.includes('bitcoin')) {
        assignedAccount = getOrCreateAccount('Web3 Crypto Wallet', 'crypto', 'Self-Custody');
      } else {
        // Default checking account
        assignedAccount = primaryChecking;
      }

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
        accountId: assignedAccount.id,
        autoCategorized: true
      });
    }

    const accounts = Array.from(accountsMap.values());

    // Calculate smart starting balance for each account based on its assigned transactions
    accounts.forEach(acc => {
      const accTxs = transactions.filter(t => t.accountId === acc.id);
      const accInflow = accTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const accOutflow = accTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

      if (acc.type === 'credit') {
        acc.balance = -accOutflow;
      } else {
        acc.balance = Math.max(0, accInflow - accOutflow);
      }
    });

    // Identify recurring bills from subscriptions or utilities
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
          const rawOrg = data.organized;

          // 1. Build Accounts
          const accounts: Account[] = (rawOrg.accounts && rawOrg.accounts.length > 0) ? rawOrg.accounts.map((a: any, idx: number) => ({
            id: a.id || `acc_${idx + 1}`,
            name: a.name || (a.type === 'cash' ? 'Cash Wallet' : a.type === 'crypto' ? 'Crypto Wallet' : a.type === 'credit' ? 'Credit Card' : 'Primary Checking'),
            type: a.type || 'checking',
            balance: typeof a.balance === 'number' ? a.balance : 0,
            currency: a.currency || 'USD',
            institution: a.institution !== undefined ? a.institution : (a.type === 'cash' ? '' : a.type === 'crypto' ? 'Self-Custody' : 'Bank'),
            network: a.network,
            walletAddress: a.walletAddress,
            accountNumberMask: a.accountNumberMask || (a.type === 'cash' ? 'Cash Drawer' : a.type === 'crypto' ? 'Web3' : `•••• ${1000 + idx + 1}`),
            lastUpdated: new Date().toISOString()
          })) : [
            {
              id: 'acc_primary_01',
              name: 'Primary Checking',
              type: 'checking',
              balance: 0,
              currency: 'USD',
              institution: 'Bank',
              accountNumberMask: '•••• 1001',
              lastUpdated: new Date().toISOString()
            }
          ];

          // 2. Smartly Assign Transactions to their exact Accounts
          const transactions: Transaction[] = rawOrg.transactions.map((t: any, idx: number) => {
            let assignedAccountId = accounts[0].id;

            // Direct ID match
            if (t.accountId && accounts.some(a => a.id === t.accountId)) {
              assignedAccountId = t.accountId;
            } else if (t.account || t.accountName) {
              const nameLower = String(t.account || t.accountName).toLowerCase();
              const matched = accounts.find(a =>
                a.name.toLowerCase().includes(nameLower) ||
                nameLower.includes(a.name.toLowerCase()) ||
                (a.accountNumberMask && nameLower.includes(a.accountNumberMask.replace(/[^0-9]/g, '')))
              );
              if (matched) assignedAccountId = matched.id;
            } else {
              // Smart heuristic assignment based on merchant or category
              const desc = (String(t.merchant || '') + ' ' + String(t.note || '')).toLowerCase();
              const creditAcc = accounts.find(a => a.type === 'credit');
              const savingsAcc = accounts.find(a => a.type === 'savings');
              const cashAcc = accounts.find(a => a.type === 'cash');
              const checkingAcc = accounts.find(a => a.type === 'checking') || accounts[0];

              if (desc.includes('cash') || desc.includes('pocket') || desc.includes('atm')) {
                if (cashAcc) assignedAccountId = cashAcc.id;
              } else if (desc.includes('saving') || desc.includes('vault') || desc.includes('interest') || t.category === 'Savings & Investments') {
                if (savingsAcc) assignedAccountId = savingsAcc.id;
              } else if (desc.includes('credit') || desc.includes('card') || (creditAcc && (t.category === 'Dining & Nightlife' || t.category === 'Entertainment & Leisure'))) {
                if (creditAcc) assignedAccountId = creditAcc.id;
              } else {
                assignedAccountId = checkingAcc.id;
              }
            }

            return {
              id: t.id || `tx_ai_${idx + 1}_${Date.now()}`,
              date: t.date || new Date().toISOString().split('T')[0],
              amount: Math.abs(typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0),
              type: t.type === 'income' ? 'income' : (t.type === 'transfer' ? 'transfer' : 'expense'),
              category: (t.category as ExpenseCategory) || detectCategory(t.merchant || ''),
              merchant: t.merchant || 'Unlabeled Merchant',
              note: t.note || undefined,
              accountId: assignedAccountId,
              autoCategorized: true
            };
          });

          // 3. Recalculate each account's balance accurately based on assigned transactions if not explicitly set
          accounts.forEach(acc => {
            const accTxs = transactions.filter(t => t.accountId === acc.id);
            if (accTxs.length > 0 && acc.balance === 0) {
              const inflow = accTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
              const outflow = accTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
              if (acc.type === 'credit') {
                acc.balance = -outflow;
              } else {
                acc.balance = Math.max(0, inflow - outflow);
              }
            }
          });

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
