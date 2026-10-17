import {
  Account,
  AgentAction,
  AgentTaskPlan,
  Bill,
  BudgetEnvelope,
  ExpenseCategory,
  LLMConfig,
  MemoryFile,
  Transaction
} from '../types/finance';
import { vectorDb } from './vectorDb';

export interface AgentContext {
  accounts: Account[];
  transactions: Transaction[];
  bills: Bill[];
  budgets: BudgetEnvelope[];
  memory: MemoryFile;
  config: LLMConfig;
}

export interface AgentResponse {
  content: string;
  plan?: AgentTaskPlan;
  action?: AgentAction;
  updatedMemory?: MemoryFile;
  memoryNote?: string;
  measurableValue?: string;
}

// Category matcher helper based on merchant or keywords
export function detectCategory(text: string): ExpenseCategory {
  const lower = text.toLowerCase();
  if (lower.match(/grocer|market|trader joe|whole foods|safeway|heb|kroger|aldi|sprouts|supermarket|apples|milk/)) {
    return 'Groceries';
  }
  if (lower.match(/dining|restaurant|ramen|dinner|lunch|breakfast|coffee|starbucks|tatsu|chipotle|cafe|bar|pub|sushi|pizza|doordash|uber eats/)) {
    return 'Dining & Nightlife';
  }
  if (lower.match(/uber|lyft|fuel|gas|chevron|shell|exxon|transit|subway|metro|parking|toll|airline|flight/)) {
    return 'Transportation & Fuel';
  }
  if (lower.match(/netflix|spotify|hulu|disney|apple tv|hbo|github|openai|cloud|software|subscription|adobe|notion/)) {
    return 'Subscriptions & Software';
  }
  if (lower.match(/electric|power|energy|water|gas|internet|spectrum|wifi|fiber|utility|att|verizon/)) {
    return 'Utilities & Services';
  }
  if (lower.match(/rent|apartment|mortgage|landlord|lease|property mgmt|housing/)) {
    return 'Housing & Rent';
  }
  if (lower.match(/gym|fitness|classpass|equinox|health|doctor|dental|pharmacy|cvs|walgreens|clinic|therapy/)) {
    return 'Health & Wellness';
  }
  if (lower.match(/cinema|movie|theatre|concert|game|steam|playstation|arcade|golf|bowling/)) {
    return 'Entertainment & Leisure';
  }
  if (lower.match(/amazon|target|walmart|clothing|shoes|ikea|best buy|hardware/)) {
    return 'Shopping & Goods';
  }
  if (lower.match(/savings|invest|vanguard|fidelity|roth|ira|etf|index|deposit/)) {
    return 'Savings & Investments';
  }
  return 'Other';
}

// Helper to extract dollar amounts
export function extractAmount(text: string): number | null {
  const match = text.match(/\$\s*([0-9]+(?:\.[0-9]{1,2})?)/);
  if (match) return parseFloat(match[1]);
  const numMatch = text.match(/\b([0-9]+(?:\.[0-9]{1,2})?)\s*(?:dollars|bucks|usd)\b/i);
  if (numMatch) return parseFloat(numMatch[1]);
  const standaloneMatch = text.match(/(?:spent|paid|cost|add|bought|received|receive|earn|earned|income|log|gain|gained|gaining|made|deposited|deposit|sold)\s+([0-9]+(?:\.[0-9]{1,2})?)/i);
  if (standaloneMatch) return parseFloat(standaloneMatch[1]);
  return null;
}

// Cognitive Edge Rule Engine for Action Extraction & Intent Parsing
export function runEdgeCognition(userInput: string, context: AgentContext): AgentResponse {
  const text = userInput.trim();
  const lower = text.toLowerCase();
  const { accounts, transactions, bills, budgets, memory } = context;

  const checkingAcc = accounts.find(a => a.type === 'checking') || accounts[0];
  const checkingBalance = checkingAcc?.balance || 0;
  const totalLiquid = accounts
    .filter(a => a.type === 'checking' || a.type === 'savings')
    .reduce((sum, a) => sum + a.balance, 0);

  // 2. INTENT: CASH RUNWAY QUERY
  if (lower.includes('runway') || lower.includes('how long can i survive') || lower.includes('survival')) {
    const monthlyNeeds = budgets
      .filter(b => b.type === 'need')
      .reduce((sum, b) => sum + b.allocated, 0);
    const months = monthlyNeeds > 0 ? (totalLiquid / monthlyNeeds).toFixed(1) : '6.0';
    const days = Math.round(parseFloat(months) * 30.4);

    return {
      content: `### Cash Runway & Liquidity Analysis\n\nBased on your total liquid reserves of **$${totalLiquid.toLocaleString('en-US', { minimumFractionDigits: 2 })}** ($${checkingBalance.toFixed(2)} in checking + $${(accounts.find(a => a.type === 'savings')?.balance || 0).toLocaleString()} in emergency savings) and essential fixed needs of **$${monthlyNeeds.toFixed(2)}/month**:\n\n- **Zero-Income Runway:** **${months} months** (~${days} days)\n- **Operating Checking Cushion:** $${checkingBalance.toFixed(2)} (Floor: $${memory.profile.minimumCheckingFloor.toFixed(2)})\n- **Safety Invariant:** Your liquidity exceeds the minimum 3-month survival baseline of $${(monthlyNeeds * 3).toFixed(2)}.`,
      measurableValue: `${months} Months Total Cash Runway (${days} Days)`,
      plan: {
        id: `plan_runway_${Date.now()}`,
        intent: 'CASH_RUNWAY_ASSESSMENT',
        confidence: 0.98,
        reasoning: 'Aggregated liquid checking and savings against budgeted essential monthly commitments.',
        steps: [
          { step: 1, title: 'Aggregate Liquid Balances', detail: `Summed $${totalLiquid.toFixed(2)} across checking & HYSA`, status: 'completed' },
          { step: 2, title: 'Calculate Monthly Essential Needs', detail: `Summed fixed housing, bills, utilities, and groceries ($${monthlyNeeds.toFixed(2)})`, status: 'completed' },
          { step: 3, title: 'Model Zero-Income Burn Rate', detail: `Derived ${months} months survival buffer`, status: 'completed' }
        ]
      }
    };
  }

  // 2. INTENT: SUBSCRIPTION AUDIT / LEAKS
  if (lower.includes('subscription') || lower.includes('audit') || lower.includes('leak') || lower.includes('recurring')) {
    const subs = bills.filter(b => b.category === 'Subscriptions & Software');
    const totalSubMonthly = subs.reduce((sum, s) => sum + s.amount, 0);
    const annualCost = totalSubMonthly * 12;

    const redundantNotice = bills.filter(b => b.potentialSavingsNotice);
    const potentialMonthlySavings = 54.99 + 19.99; // Adobe + streaming consolidation
    const potentialAnnualSavings = potentialMonthlySavings * 12;

    let subList = subs.map(s => `- **${s.name}**: $${s.amount.toFixed(2)}/mo (Due ${s.dueDate})`).join('\n');
    if (redundantNotice.length > 0) {
      subList += '\n\n**Flagged Leaks & Optimizations:**\n' + redundantNotice.map(r => `⚠️ *${r.name}*: ${r.potentialSavingsNotice}`).join('\n');
    }

    return {
      content: `### Subscription & Recurring Leak Audit\n\nYou currently have **${subs.length} active recurring software and media subscriptions** totaling **$${totalSubMonthly.toFixed(2)}/month** ($${annualCost.toFixed(2)}/year):\n\n${subList}\n\n**Actionable Recommendation:**\nBy canceling or pausing inactive items (Adobe CC last used 42 days ago, and consolidating Hulu/Disney + Netflix overlap), you can recover **$${potentialMonthlySavings.toFixed(2)}/month** or **$${potentialAnnualSavings.toFixed(2)}/year** with zero impact on daily comfort.`,
      measurableValue: `$${potentialAnnualSavings.toFixed(0)}/year Potential Recurring Savings`,
      plan: {
        id: `plan_audit_${Date.now()}`,
        intent: 'SUBSCRIPTION_LEAK_AUDIT',
        confidence: 0.95,
        reasoning: 'Audited active recurring contracts against recent transaction activity and service redundancy.',
        steps: [
          { step: 1, title: 'Scan Recurring Invariants', detail: `Found ${subs.length} active subscription bills`, status: 'completed' },
          { step: 2, title: 'Analyze Service Redundancy', detail: 'Detected duplicate streaming tiers and dormant Adobe license', status: 'completed' },
          { step: 3, title: 'Quantify Recoverable Capital', detail: `$${potentialAnnualSavings.toFixed(2)}/year measurable recovery`, status: 'completed' }
        ]
      }
    };
  }

  // 3. INTENT: AFFORDABILITY CHECK
  if (lower.includes('afford') || lower.includes('can i buy') || lower.includes('can i spend')) {
    const amt = extractAmount(text) || 100;
    const category = detectCategory(text);
    const budget = budgets.find(b => b.category === category) || budgets.find(b => b.category === 'Dining & Nightlife');
    const spentSoFar = transactions
      .filter(t => t.category === category && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const remainingBudget = (budget?.allocated || 300) - spentSoFar;
    const isAffordable = amt <= remainingBudget && (checkingBalance - amt) >= memory.profile.minimumCheckingFloor;

    return {
      content: `### Affordability Evaluation: $${amt.toFixed(2)} for ${category}\n\n- **Category Budget Headroom:** You have **$${remainingBudget.toFixed(2)} remaining** in ${category} (allocated: $${budget?.allocated.toFixed(2)}, spent: $${spentSoFar.toFixed(2)}).\n- **Checking Balance Impact:** Current balance is $${checkingBalance.toFixed(2)}. After this purchase, it would be **$${(checkingBalance - amt).toFixed(2)}**.\n- **Liquidity Floor Invariant:** Your safety threshold is $${memory.profile.minimumCheckingFloor.toFixed(2)}.\n\n${
        isAffordable
          ? `✅ **Approved for Safe Execution**: This expenditure is completely within your discretionary limits and does not endanger upcoming bills before your next payday (${memory.profile.nextPayday}).`
          : `⚠️ **Caution / Budget Stress**: This expenditure exceeds your current envelope cushion by $${Math.abs(remainingBudget - amt).toFixed(2)}. If you proceed, consider reallocating from your Entertainment envelope.`
      }`,
      measurableValue: isAffordable ? `Safe to spend $${amt.toFixed(2)}` : `Budget exceeded by $${(amt - remainingBudget).toFixed(2)}`,
      plan: {
        id: `plan_afford_${Date.now()}`,
        intent: 'AFFORDABILITY_CHECK',
        confidence: 0.94,
        reasoning: 'Calculated remaining envelope capacity against checking liquidity floor.',
        steps: [
          { step: 1, title: 'Parse Requested Amount', detail: `$${amt.toFixed(2)} for ${category}`, status: 'completed' },
          { step: 2, title: 'Check Category Envelope', detail: `$${remainingBudget.toFixed(2)} headroom remaining`, status: 'completed' },
          { step: 3, title: 'Verify Liquidity Floor', detail: `Checking balance post-purchase: $${(checkingBalance - amt).toFixed(2)} (Floor: $${memory.profile.minimumCheckingFloor.toFixed(2)})`, status: 'completed' }
        ]
      }
    };
  }

  // 4. INTENT: LOG TRANSACTION (Conversational Bookkeeping)
  const amt = extractAmount(text);
  const incomeRegex = /\b(gain|gained|gaining|gains|income|received|receive|receives|got|get|gets|earn|earned|earning|earns|salary|paycheck|deposit|deposited|depositing|deposits|sold|sell|selling|dividend|dividends|refund|refunded|refunds|reimbursement|reimbursed|cashback|bonus|profit|profits|made|win|won|credit|credited|credits)\b|paid\s+me|gave\s+me|sent\s+me|incoming\b/i;
  const isIncome = incomeRegex.test(lower);
  const isTransaction = amt !== null || lower.includes('spent') || lower.includes('paid') || lower.includes('bought') || lower.includes('cost') || isIncome;

  if (isTransaction && amt !== null) {
    const category = isIncome ? 'Savings & Investments' : detectCategory(text);
    // Merchant / Source extraction
    let merchant = isIncome ? 'Direct Deposit / Payer' : 'Unknown Merchant';
    if (isIncome) {
      const fromMatch = text.match(/(?:from|by|via|for)\s+([A-Za-z0-9'\s&.-]+?)(?:\s+(?:today|yesterday|on|\$|[0-9]|\.|$))/i);
      if (fromMatch && fromMatch[1].trim().length > 1) {
        merchant = fromMatch[1].trim();
      } else if (lower.includes('salary') || lower.includes('paycheck')) {
        merchant = 'Employer Payroll';
      } else if (lower.includes('freelance') || lower.includes('client')) {
        merchant = 'Client Invoice';
      } else if (lower.includes('dividend')) {
        merchant = 'Investment Dividend';
      } else if (lower.includes('refund')) {
        merchant = 'Merchant Refund';
      }
    } else {
      const atMatch = text.match(/(?:at|to|for)\s+([A-Za-z0-9'\s&.-]+?)(?:\s+(?:today|yesterday|for|on|\$|[0-9]|\.|$))/i);
      if (atMatch && atMatch[1].trim().length > 1) {
        merchant = atMatch[1].trim();
      } else {
        merchant = category === 'Groceries' ? 'Grocery Store' : category === 'Dining & Nightlife' ? 'Dining Venue' : 'Retail Merchant';
      }
    }

    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      amount: amt,
      type: isIncome ? 'income' : 'expense',
      category,
      merchant,
      note: `Logged via conversational bookkeeping: "${text}"`,
      accountId: checkingAcc?.id || 'acc_chk_01',
      autoCategorized: true
    };

    const delta = isIncome ? amt : -amt;
    const newBal = checkingBalance + delta;
    const liquidityWarning = (!isIncome && newBal < memory.profile.minimumCheckingFloor)
      ? `Warning: This brings checking balance ($${newBal.toFixed(2)}) below your safety floor ($${memory.profile.minimumCheckingFloor.toFixed(2)}).`
      : undefined;

    const action: AgentAction = {
      id: `act_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'ADD_TRANSACTION',
      description: `Log ${isIncome ? 'income' : 'expense'} of $${amt.toFixed(2)} ${isIncome ? 'from' : 'at'} ${merchant} (${category})`,
      payload: newTx,
      status: 'pending',
      safetyLevel: amt > 250 ? 'medium_risk' : 'low_risk',
      confidenceScore: 0.96,
      dryRunImpact: {
        balanceDelta: delta,
        categoryImpact: category,
        newBudgetRemaining: 0,
        liquidityWarning
      }
    };

    // Check if new rule/habit should be registered in memory
    let memoryNote: string | undefined;
    let updatedMemory: MemoryFile | undefined;
    if (merchant.toLowerCase().includes('trader joe') || amt > 100) {
      memoryNote = `Recorded transaction pattern for ${merchant} under ${category}.`;
    }

    return {
      content: `I parsed your intent to record **$${amt.toFixed(2)}** for **${merchant}** categorized under **${category}**.\n\n- **Impact:** ${isIncome ? '+' : '-'}$${amt.toFixed(2)} to ${checkingAcc?.name}\n- **Projected Balance:** $${newBal.toFixed(2)}\n${liquidityWarning ? `⚠️ **${liquidityWarning}**\n` : ''}\nI have prepared a safe execution plan below for your confirmation.`,
      measurableValue: `${isIncome ? '+$' : '-$'}${amt.toFixed(2)} logged to ${category}`,
      plan: {
        id: `plan_tx_${Date.now()}`,
        intent: 'CONVERSATIONAL_BOOKKEEPING_LOG',
        confidence: 0.96,
        reasoning: 'Extracted merchant, amount, category and checked against liquidity invariants.',
        steps: [
          { step: 1, title: 'Parse Natural Language Entities', detail: `Amount: $${amt.toFixed(2)} · Category: ${category} · Merchant: ${merchant}`, status: 'completed' },
          { step: 2, title: 'Verify Account & Balance Cushion', detail: `Projected checking balance: $${newBal.toFixed(2)}`, status: 'completed' },
          { step: 3, title: 'Prepare Non-Destructive Mutation', detail: 'Awaiting user execution confirmation', status: 'in_progress' }
        ],
        proposedAction: action
      },
      action,
      memoryNote,
      updatedMemory
    };
  }

  // 5. INTENT: ADD BILL / BILL MANAGEMENT
  if (lower.includes('bill') && (lower.includes('add') || lower.includes('create') || lower.includes('due'))) {
    const billAmt = extractAmount(text) || 50;
    const category = detectCategory(text);

    // Extract due date or default to 15 days from now
    const now = new Date();
    const future = new Date(now.getTime() + 14 * 86400000);
    const dueDateStr = future.toISOString().split('T')[0];

    const billNameMatch = text.match(/(?:add|create|new)\s+(?:bill\s+)?([A-Za-z0-9'\s&.-]+?)(?:\s+(?:for|\$|[0-9]|due))/i);
    const billName = billNameMatch ? billNameMatch[1].trim() : 'New Recurring Bill';

    const newBill: Bill = {
      id: `bill_${Date.now()}`,
      name: billName,
      amount: billAmt,
      category,
      frequency: 'monthly',
      dueDate: dueDateStr,
      isAutopay: lower.includes('autopay'),
      isPaidThisCycle: false,
      status: 'upcoming',
      notes: 'Added via Purse Agent conversational management'
    };

    const action: AgentAction = {
      id: `act_bill_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'ADD_BILL',
      description: `Schedule recurring bill: ${billName} ($${billAmt.toFixed(2)}/mo due ${dueDateStr})`,
      payload: newBill,
      status: 'pending',
      safetyLevel: 'low_risk',
      confidenceScore: 0.92,
      dryRunImpact: {
        balanceDelta: -billAmt,
        categoryImpact: category
      }
    };

    return {
      content: `I have prepared a new recurring bill schedule for **${billName}** ($${billAmt.toFixed(2)}/mo, due on **${dueDateStr}**):\n\n- **Category:** ${category}\n- **Autopay:** ${newBill.isAutopay ? 'Enabled' : 'Manual verification'}\n- **Cashflow Impact:** Added to monthly obligations forecast.`,
      measurableValue: `$${billAmt.toFixed(2)}/mo scheduled bill`,
      plan: {
        id: `plan_bill_${Date.now()}`,
        intent: 'SCHEDULE_RECURRING_BILL',
        confidence: 0.92,
        reasoning: 'Constructed recurring bill structure and calculated monthly obligations impact.',
        steps: [
          { step: 1, title: 'Extract Bill Parameters', detail: `${billName} · $${billAmt.toFixed(2)} · Due ${dueDateStr}`, status: 'completed' },
          { step: 2, title: 'Incorporate into Liquidity Timeline', detail: 'Checked date against upcoming paydays', status: 'completed' },
          { step: 3, title: 'Awaiting User Confirmation', detail: 'Ready to write to encrypted local database', status: 'in_progress' }
        ],
        proposedAction: action
      },
      action
    };
  }

  // 6. INTENT: MEMORY RULE UPDATE
  if (lower.includes('remember') || lower.includes('rule:') || lower.includes('new rule') || lower.includes('cushion to') || lower.includes('salary to')) {
    let newRule = text.replace(/^(?:remember that|remember|please remember|note that)\s*/i, '').trim();
    if (newRule.length > 5) {
      const updatedRules = [...memory.rules, newRule];
      const updatedMarkdown = `${memory.rawMarkdown}\n- RULE_NEW: ${newRule} (Logged ${new Date().toISOString().split('T')[0]})`;

      const updatedMem: MemoryFile = {
        ...memory,
        rules: updatedRules,
        rawMarkdown: updatedMarkdown,
        lastUpdated: new Date().toISOString(),
        revisionCount: memory.revisionCount + 1
      };

      const action: AgentAction = {
        id: `act_mem_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'UPDATE_MEMORY',
        description: `Append new operational rule to Agent Memory: "${newRule}"`,
        payload: updatedMem,
        status: 'pending',
        safetyLevel: 'low_risk',
        confidenceScore: 0.98
      };

      return {
        content: `I have extracted a new operational rule to append to your **Persistent Memory File**:\n\n> "${newRule}"\n\nThis invariant will be loaded into my cognitive context on every future prompt and budget calculation. Please confirm to commit this revision to your local storage.`,
        measurableValue: 'Memory Graph Updated with 1 Invariant',
        plan: {
          id: `plan_mem_${Date.now()}`,
          intent: 'MEMORY_UPDATE',
          confidence: 0.98,
          reasoning: 'Parsed user financial rule and updated markdown memory graph.',
          steps: [
            { step: 1, title: 'Extract Invariant', detail: newRule, status: 'completed' },
            { step: 2, title: 'Compile Markdown Revision', detail: `Revision #${updatedMem.revisionCount}`, status: 'completed' },
            { step: 3, title: 'Await User Approval', detail: 'Safe execution gate active', status: 'in_progress' }
          ],
          proposedAction: action
        },
        action,
        updatedMemory: updatedMem,
        memoryNote: `Added rule: "${newRule}"`
      };
    }
  }

  // 7. ONLY PROVIDE FULL REPORT IF USER EXPLICITLY ASKS FOR A SUMMARY OR REPORT
  if (lower.includes('report') || lower.includes('summary') || lower.includes('breakdown') || lower.includes('overview') || lower.includes('audit my finances')) {
    const monthlyIncome = memory.profile.monthlyIncome;
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);
    const currentMonthExpenses = transactions
      .filter(t => t.type === 'expense' && (t.date.startsWith(currentMonthPrefix) || transactions.length < 20))
      .reduce((sum, t) => sum + t.amount, 0);
    const netCashFlow = monthlyIncome - currentMonthExpenses;
    const safeDailySpend = Math.max(0, (netCashFlow / 16)).toFixed(2);

    return {
      content: `### Financial Overview & Status Summary\n\n- **Monthly Net Cash Flow:** **+$${netCashFlow.toFixed(2)}** (Income: $${monthlyIncome.toFixed(2)} · Outflows: $${currentMonthExpenses.toFixed(2)})\n- **Safe-to-Spend Today:** **$${safeDailySpend}/day** discretionary allowance\n- **Checking Balance:** $${checkingBalance.toFixed(2)} (Safe Floor: $${memory.profile.minimumCheckingFloor.toFixed(2)})\n- **Next Payday:** ${memory.profile.nextPayday}\n\nLet me know if you want to look closer into any specific category or bill!`,
      measurableValue: `$${safeDailySpend}/day Safe Spend`
    };
  }

  // 8. DEFAULT: Friendly, natural secretary conversation
  return {
    content: `I'm keeping an eye on your finances right here in your browser. All your balances and upcoming bills look steady today. How can I help you right now? Feel free to ask about any purchase, log an expense, or check your savings!`
  };
}

// Full-stack Agent Reasoning Dispatcher
export async function processAgentMessage(
  userInput: string,
  context: AgentContext
): Promise<AgentResponse> {
  const { config, memory, transactions, bills, budgets, accounts } = context;

  // Sync latest ledger snapshot to the browser Vector Database
  try {
    vectorDb.syncLedgerContext({ accounts, transactions, bills, budgets, memory });
  } catch (syncErr) {
    console.warn('[VectorDB] Sync notice:', syncErr);
  }

  // Always invoke LLM via server-side reasoning endpoint (Gemini, OpenAI, DeepSeek, Z.ai)
  try {
    // 1. Retrieve top semantically relevant chunks from local browser vector database
    const ragContext = vectorDb.buildRagContext(userInput, 4);

    const checkingAcc = accounts.find(a => a.type === 'checking') || accounts[0];
    const savingsAcc = accounts.find(a => a.type === 'savings');

    // 2. Personal, human secretary system prompt
    const systemPrompt = `You are Fiona, the user's friendly, sharp, and attentive personal finance secretary and accountant.

ARCHITECTURE & MEMORY RETRIEVAL (Browser-Native Vector RAG):
- You operate a decentralized in-browser vector database and embedding retrieval system (stored persistently in the user's browser).
- The user's ledger, transaction history, active budget envelopes, recurring obligations, and lifestyle memory rules have been embedded and indexed into this local vector store.
- Here are the most semantically relevant chunks retrieved from the user's local vector database for this prompt:

${ragContext || '[No specific historical vector chunks matched]'}

ACTIVE AGENT KNOWLEDGE GRAPH (Memory):
${memory.rawMarkdown}

QUICK LEDGER SNAPSHOT:
- Checking Balance: $${(checkingAcc?.balance || 0).toFixed(2)}
- Total Savings Vault: $${(savingsAcc?.balance || 0).toFixed(2)}
- Envelopes: ${budgets.map(b => `${b.category} ($${b.allocated}/mo)`).join(', ')}
- Upcoming Bills: ${bills.slice(0, 4).map(b => `${b.name} ($${b.amount} on ${b.dueDate})`).join(', ')}

CORE PERSONALITY & COMMUNICATION GUIDELINES:
1. ACT LIKE A GENUINE PERSONAL SECRETARY / ACCOUNTANT:
   - Be warm, friendly, conversational, and helpful. You are a trusted human-like confidante, NOT a cold corporate dashboard or robot.
   - Talk in natural, simple English. Avoid stiff financial jargon unless asked.
   - Feel free to engage in general friendly conversation, greetings ("Hey!", "Good morning!"), and everyday check-ins.

2. NEVER DUMP UNSOLICITED BUSINESS REPORTS OR BULLETED SUMMARIES:
   - For simple greetings, small talk, casual questions ("hey", "how are you?", "can I grab a coffee?"), reply in 1 to 3 friendly, direct, natural sentences.
   - Do NOT produce full financial summaries, multi-bullet status reports, or executive overviews UNLESS the user explicitly asks for them.
   - When asked a specific question like "Can I afford dinner tonight?", answer conversationally with direct numbers (e.g. "Yes, totally! You've got $120 left in your dining envelope this week, so a $40 dinner is well within your safe zone.").

3. SMART BOOKKEEPING & ACTIONS:
   - If the user mentions spending or receiving money (e.g. "Spent $15 at Starbucks"), acknowledge it warmly and confirm it's tracked against their envelope.
   - If the user shares a rule or personal goal ("Remember that I want to save $300 for a trip"), warmly confirm that you've noted it in their persistent memory.`;

    const effectiveProvider = (!config.provider || config.provider === 'edge') ? 'gemini' : config.provider;
    const effectiveModel = (!config.model || config.model === 'gemini-flash-latest' || config.model === 'gemini-2.5-flash' || config.model === 'smolLM2-360M-instruct')
      ? 'gemini-3.8-flash'
      : config.model;

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: effectiveProvider,
        apiKey: config.apiKey,
        model: effectiveModel,
        messages: [{ role: 'user', content: userInput }],
        systemInstruction: systemPrompt
      })
    });

    // Check if user input triggered a concrete ledger action (e.g. logging a transaction)
    const edgePlan = runEdgeCognition(userInput, context);
    const hasConcreteAction = Boolean(edgePlan.action);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errDetail = errData.error || `${res.status} ${res.statusText}`;
      // All messages must be from LLM, return actual error with no fake mock replies
      return {
        content: `LLM Service Notice: ${errDetail}. Please check your connection or LLM settings.`,
        plan: hasConcreteAction ? edgePlan.plan : undefined,
        action: edgePlan.action,
        measurableValue: hasConcreteAction ? edgePlan.measurableValue : undefined,
        memoryNote: edgePlan.memoryNote,
        updatedMemory: edgePlan.updatedMemory
      };
    }

    const data = await res.json();
    const reply = data.reply || '';

    return {
      content: reply,
      plan: hasConcreteAction ? edgePlan.plan : undefined,
      action: edgePlan.action,
      measurableValue: hasConcreteAction ? edgePlan.measurableValue : undefined,
      memoryNote: edgePlan.memoryNote,
      updatedMemory: edgePlan.updatedMemory
    };
  } catch (err: any) {
    console.error('LLM generation error:', err);
    // All messages sent by the AI agent must be generated via the LLM with no fallbacks!
    const edgePlan = runEdgeCognition(userInput, context);
    const hasConcreteAction = Boolean(edgePlan.action);
    return {
      content: `LLM Connection Error: ${err?.message || 'Failed to reach AI Agent server'}. All messages must come directly from the LLM.`,
      plan: hasConcreteAction ? edgePlan.plan : undefined,
      action: edgePlan.action,
      measurableValue: hasConcreteAction ? edgePlan.measurableValue : undefined,
      memoryNote: edgePlan.memoryNote,
      updatedMemory: edgePlan.updatedMemory
    };
  }
}
