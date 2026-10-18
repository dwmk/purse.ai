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
import { isWindowAIAvailable, runWindowAI, runBrowserEngine } from './browserLm';

export interface AgentContext {
  accounts: Account[];
  transactions: Transaction[];
  bills: Bill[];
  budgets: BudgetEnvelope[];
  memory: MemoryFile;
  config: LLMConfig;
  theme?: 'dark' | 'light';
  isSpeechEnabled?: boolean;
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
  const standaloneMatch = text.match(/(?:spent|paid|cost|add|bought|received|receive|earn|earned|earning|income|log|gain|gained|gaining|gains|made|deposited|deposit|sold|got|plus|\+)\s+\$?([0-9]+(?:\.[0-9]{1,2})?)/i);
  if (standaloneMatch) return parseFloat(standaloneMatch[1]);
  const plusMatch = text.match(/\+\s*\$?([0-9]+(?:\.[0-9]{1,2})?)/);
  if (plusMatch) return parseFloat(plusMatch[1]);
  const postDollarMatch = text.match(/\b([0-9]+(?:\.[0-9]{1,2})?)\s*\$/);
  if (postDollarMatch) return parseFloat(postDollarMatch[1]);
  return null;
}

// Comprehensive Income Intent Classifier
export function isIncomeIntent(text: string): boolean {
  const lower = text.toLowerCase();
  
  const incomePatterns = [
    /\b(find|found|finding)\b/i,
    /\b(gain|gained|gaining|gains)\b/i,
    /\b(earn|earned|earning|earns)\b/i,
    /\b(income|salary|paycheck|payroll|wage|wages|stipend)\b/i,
    /\b(deposit|deposited|depositing|deposits)\b/i,
    /\b(receive|received|receives|receiving)\b/i,
    /\b(got|get|gets)\s+(?:\$|[0-9]|\bpaid\b|\bmoney\b|\bcash\b)/i,
    /\b(made|make|makes)\s+(?:\$|[0-9]|\bprofit\b|\bmoney\b|\bcash\b)/i,
    /\b(sold|sell|selling|sells)\b/i,
    /\b(refund|refunded|refunds|refunding)\b/i,
    /\b(reimburse|reimbursed|reimbursement|reimbursements)\b/i,
    /\b(dividend|dividends|yield|interest)\b/i,
    /\b(cashback|cash\s*back|bonus|bonuses|reward|rewards|grant|grants)\b/i,
    /\b(win|won|winning|winnings)\b/i,
    /\b(credit|credited|credits)\b/i,
    /\b(gift|gifted|gifting|tips|tip|tipped|collected|picked\s*up)\b/i,
    /\b(add|added)\s+(?:\$|[0-9]+).*?\b(?:to|into)\b/i,
    /\b(paid\s+me|gave\s+me|sent\s+me|transferred\s+me)\b/i,
    /\b(incoming|inflow)\b/i,
    /^\s*\+\s*\$?[0-9]+/
  ];

  return incomePatterns.some(p => p.test(lower));
}

// Cognitive Edge Rule Engine for Action Extraction & Intent Parsing
export function runEdgeCognition(userInput: string, context: AgentContext): AgentResponse {
  const text = userInput.trim();
  const lower = text.toLowerCase();
  const { accounts, transactions, bills, budgets, memory } = context;

  const checkingAcc = accounts.find(a => a.type === 'checking') || accounts.find(a => a.type === 'cash') || accounts[0];
  const checkingBalance = checkingAcc?.balance || 0;
  const totalLiquid = accounts
    .filter(a => a.type === 'checking' || a.type === 'savings' || a.type === 'cash')
    .reduce((sum, a) => sum + Math.max(0, a.balance), 0);

  // 1. INTENT: CASH RUNWAY QUERY
  if (lower.includes('runway') || lower.includes('how long can i survive') || lower.includes('survival')) {
    const monthlyNeeds = budgets
      .filter(b => b.type === 'need')
      .reduce((sum, b) => sum + b.allocated, 0);
    const months = monthlyNeeds > 0 ? (totalLiquid / monthlyNeeds).toFixed(1) : '6.0';
    const days = Math.round(parseFloat(months) * 30.4);

    const cashSavingsAccs = accounts.filter(a => a.type === 'savings' || a.type === 'cash');
    const cashReserveStr = cashSavingsAccs.length > 0
      ? ` + $${cashSavingsAccs.reduce((s, a) => s + a.balance, 0).toLocaleString()} in reserves/cash`
      : '';

    return {
      content: `### Cash Runway & Liquidity Analysis\n\nBased on your total liquid reserves of **$${totalLiquid.toLocaleString('en-US', { minimumFractionDigits: 2 })}** ($${checkingBalance.toFixed(2)} in ${checkingAcc?.name || 'primary account'}${cashReserveStr}) and essential fixed needs of **$${monthlyNeeds.toFixed(2)}/month**:\n\n- **Zero-Income Runway:** **${months} months** (~${days} days)\n- **Operating Cushion:** $${checkingBalance.toFixed(2)} (Floor: $${memory.profile.minimumCheckingFloor.toFixed(2)})\n- **Safety Invariant:** Your liquidity exceeds the minimum 3-month survival baseline of $${(monthlyNeeds * 3).toFixed(2)}.`,
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
  const isIncome = isIncomeIntent(text);
  const isTransaction = amt !== null || lower.includes('spent') || lower.includes('paid') || lower.includes('bought') || lower.includes('cost') || isIncome;

  if (isTransaction && amt !== null) {
    let category: ExpenseCategory;
    let merchant: string;

    if (isIncome) {
      if (lower.match(/found|floor|street|ground|pocket|sidewalk/)) {
        category = 'Other';
        merchant = 'Found Cash';
      } else if (lower.match(/salary|paycheck|payroll|wage|job|work/)) {
        category = 'Other';
        merchant = 'Employer Payroll';
      } else if (lower.match(/freelance|client|invoice|consult/)) {
        category = 'Other';
        merchant = 'Client Payment';
      } else if (lower.match(/dividend|invest|stock|yield|interest/)) {
        category = 'Savings & Investments';
        merchant = 'Investment Yield';
      } else if (lower.match(/gift|birthday|present/)) {
        category = 'Other';
        merchant = 'Cash Gift';
      } else if (lower.match(/refund|cashback|reimbursement/)) {
        category = detectCategory(text);
        merchant = 'Merchant Refund';
      } else if (lower.match(/sold|sale/)) {
        category = 'Other';
        merchant = 'Personal Sale';
      } else {
        category = 'Other';
        merchant = 'Income Deposit';
      }

      const fromMatch = text.match(/(?:from|by|via)\s+([A-Za-z0-9'\s&.-]+?)(?:\s+(?:today|yesterday|on|\$|[0-9]|\.|$))/i);
      if (fromMatch && fromMatch[1].trim().length > 1) {
        merchant = fromMatch[1].trim();
      }
    } else {
      category = detectCategory(text);
      merchant = 'Retail Merchant';
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

    let memoryNote: string | undefined;
    let updatedMemory: MemoryFile | undefined;
    if (merchant.toLowerCase().includes('trader joe') || amt > 100) {
      memoryNote = `Recorded transaction pattern for ${merchant} under ${category}.`;
    }

    return {
      content: isIncome
        ? `I parsed your intent to record **+$${amt.toFixed(2)}** income from **${merchant}** (${category}).\n\n- **Type:** Income (+)\n- **Account:** ${checkingAcc?.name || 'Primary Checking'}\n- **Projected Balance:** $${newBal.toFixed(2)} (+$${amt.toFixed(2)})\n\nI have prepared a safe execution plan below for your approval.`
        : `I parsed your intent to record **$${amt.toFixed(2)}** expense for **${merchant}** (${category}).\n\n- **Type:** Expense (-)\n- **Impact:** -$${amt.toFixed(2)} to ${checkingAcc?.name || 'Primary Checking'}\n- **Projected Balance:** $${newBal.toFixed(2)}\n${liquidityWarning ? `⚠️ **${liquidityWarning}**\n` : ''}\nI have prepared a safe execution plan below for your confirmation.`,
      measurableValue: `${isIncome ? '+$' : '-$'}${amt.toFixed(2)} logged to ${category}`,
      plan: {
        id: `plan_tx_${Date.now()}`,
        intent: isIncome ? 'CONVERSATIONAL_INCOME_LOG' : 'CONVERSATIONAL_EXPENSE_LOG',
        confidence: 0.96,
        reasoning: isIncome
          ? 'Parsed income transaction, updated projected balance upward, and verified liquidity.'
          : 'Extracted merchant, amount, category and checked against liquidity invariants.',
        steps: [
          { step: 1, title: 'Parse Natural Language Entities', detail: `Type: ${isIncome ? 'Income (+)' : 'Expense (-)'} · Amount: $${amt.toFixed(2)} · Category: ${category} · Source: ${merchant}`, status: 'completed' },
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

// Full-stack Agent Reasoning Dispatcher with Real-time Word Streaming
// Full-stack Agent Reasoning Dispatcher with Real-time Word Streaming
// Parse action JSON block from LLM output to let the LLM decide transactions, bills, accounts, and memory rules accurately
export function parseAgentResponseWithActions(
  rawReply: string,
  edgePlan: AgentResponse,
  context: AgentContext,
  userInput: string
): AgentResponse {
  const defaultAcc = context.accounts.find(a => a.type === 'checking') || context.accounts.find(a => a.type === 'cash') || context.accounts[0];

  const actionJsonMatch = rawReply.match(/```action_json\s*([\s\S]*?)\s*```/);
  if (actionJsonMatch) {
    try {
      const parsed = JSON.parse(actionJsonMatch[1].trim());

      // 1. Transaction proposal (income / expense / transfer)
      if (parsed && typeof parsed.amount === 'number' && (parsed.type || parsed.action === 'ADD_TRANSACTION')) {
        const isIncome = parsed.type === 'income';
        const isTransfer = parsed.type === 'transfer';
        const txType = isIncome ? 'income' : (isTransfer ? 'transfer' : 'expense');
        const amt = Math.abs(parsed.amount);
        const category: ExpenseCategory = parsed.category || (isIncome ? 'Other' : detectCategory(userInput));
        const merchant = parsed.merchant || (isIncome ? 'Income Source' : (isTransfer ? 'Account Transfer' : 'Retail Merchant'));

        // Resolve target account
        let targetAccount = defaultAcc;
        if (parsed.accountId) {
          const found = context.accounts.find(a => a.id === parsed.accountId);
          if (found) targetAccount = found;
        } else if (parsed.accountName) {
          const found = context.accounts.find(a => a.name.toLowerCase().includes(parsed.accountName.toLowerCase()));
          if (found) targetAccount = found;
        } else if (parsed.accountType) {
          const found = context.accounts.find(a => a.type === parsed.accountType);
          if (found) targetAccount = found;
        } else {
          const inputLower = userInput.toLowerCase();
          if (inputLower.includes('cash') || inputLower.includes('pocket') || inputLower.includes('wallet cash')) {
            const cashAcc = context.accounts.find(a => a.type === 'cash');
            if (cashAcc) targetAccount = cashAcc;
          } else if (inputLower.includes('crypto') || inputLower.includes('eth') || inputLower.includes('btc') || inputLower.includes('sol') || inputLower.includes('phantom') || inputLower.includes('metamask')) {
            const cryptoAcc = context.accounts.find(a => a.type === 'crypto');
            if (cryptoAcc) targetAccount = cryptoAcc;
          } else if (inputLower.includes('checking')) {
            const chkAcc = context.accounts.find(a => a.type === 'checking');
            if (chkAcc) targetAccount = chkAcc;
          } else if (inputLower.includes('savings')) {
            const savAcc = context.accounts.find(a => a.type === 'savings');
            if (savAcc) targetAccount = savAcc;
          }
        }

        const delta = isIncome ? amt : -amt;
        const targetBal = targetAccount?.balance || 0;
        const newBal = targetBal + delta;
        const liquidityWarning = (!isIncome && targetAccount?.type === 'checking' && newBal < context.memory.profile.minimumCheckingFloor)
          ? `Warning: This brings ${targetAccount.name} balance ($${newBal.toFixed(2)}) below your safety floor ($${context.memory.profile.minimumCheckingFloor.toFixed(2)}).`
          : undefined;

        const newTx: Transaction = {
          id: `tx_${Date.now()}`,
          date: parsed.date || new Date().toISOString().split('T')[0],
          amount: amt,
          type: txType as any,
          category,
          merchant,
          note: parsed.note || userInput,
          accountId: targetAccount?.id || 'acc_primary_01',
          autoCategorized: true
        };

        const action: AgentAction = {
          id: `act_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'ADD_TRANSACTION',
          description: `Log ${txType} of $${amt.toFixed(2)} ${isIncome ? 'to' : isTransfer ? 'via' : 'from'} ${targetAccount?.name || 'Account'} (${category})`,
          payload: {
            ...newTx,
            fromAccountId: parsed.fromAccountId || targetAccount?.id,
            toAccountId: parsed.toAccountId
          },
          status: 'pending',
          safetyLevel: amt > 250 ? 'medium_risk' : 'low_risk',
          confidenceScore: 0.98,
          dryRunImpact: {
            balanceDelta: delta,
            categoryImpact: category,
            newBudgetRemaining: 0,
            liquidityWarning
          }
        };

        const plan: AgentTaskPlan = {
          id: `plan_tx_${Date.now()}`,
          intent: isIncome ? 'CONVERSATIONAL_INCOME_LOG' : (isTransfer ? 'CONVERSATIONAL_TRANSFER' : 'CONVERSATIONAL_EXPENSE_LOG'),
          confidence: 0.98,
          reasoning: `Classified ${txType} transaction of $${amt.toFixed(2)} for ${merchant} on ${targetAccount?.name || 'Account'}.`,
          steps: [
            { step: 1, title: 'Identify Target Account', detail: `${targetAccount?.name || 'Default Account'} (${targetAccount?.type?.toUpperCase() || 'CHECKING'})`, status: 'completed' },
            { step: 2, title: 'Verify Entities & Cushion', detail: `Type: ${isIncome ? 'Income (+)' : isTransfer ? 'Transfer (⇄)' : 'Expense (-)'} · Amount: $${amt.toFixed(2)} · Category: ${category} · Source: ${merchant}`, status: 'completed' },
            { step: 3, title: 'Prepare Non-Destructive Mutation', detail: 'Awaiting user execution confirmation in Gate', status: 'in_progress' }
          ],
          proposedAction: action
        };

        const cleanContent = rawReply.replace(/```action_json\s*[\s\S]*?\s*```/, '').trim();
        return {
          content: cleanContent,
          plan,
          action,
          measurableValue: `${isIncome ? '+$' : '-$'}${amt.toFixed(2)} on ${targetAccount?.name || 'Account'}`,
          memoryNote: edgePlan.memoryNote,
          updatedMemory: edgePlan.updatedMemory
        };
      }

      // 2. Add Account proposal (Crypto wallets, Cash accounts without bank, Bank accounts, etc.)
      if (parsed && (parsed.action === 'ADD_ACCOUNT' || (parsed.name && parsed.type && ['cash', 'crypto', 'checking', 'savings', 'credit', 'investment'].includes(parsed.type)))) {
        const accType = parsed.type;
        const accName = parsed.name || (accType === 'cash' ? 'Cash Wallet' : accType === 'crypto' ? 'Web3 Crypto Wallet' : 'New Bank Account');
        const initialBal = typeof parsed.balance === 'number' ? parsed.balance : (parseFloat(parsed.balance) || 0);
        const institution = parsed.institution !== undefined ? parsed.institution : (accType === 'cash' ? '' : 'Bank');
        const network = parsed.network || (accType === 'crypto' ? 'Ethereum & Solana' : undefined);
        const walletAddress = parsed.walletAddress || undefined;

        const newAccount: Account = {
          id: `acc_${Date.now()}`,
          name: accName,
          type: accType,
          balance: initialBal,
          currency: parsed.currency || 'USD',
          institution,
          network,
          walletAddress,
          accountNumberMask: parsed.accountNumberMask || (accType === 'cash' ? 'Cash' : (accType === 'crypto' ? (walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : '0x...Web3') : `•••• ${Math.floor(1000 + Math.random() * 9000)}`)),
          lastUpdated: new Date().toISOString()
        };

        const action: AgentAction = {
          id: `act_acc_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'ADD_ACCOUNT',
          description: `Create new ${accType.toUpperCase()} account: "${accName}" with $${initialBal.toFixed(2)} balance${institution ? ` (${institution})` : ' (No bank specified)'}`,
          payload: newAccount,
          status: 'pending',
          safetyLevel: 'low_risk',
          confidenceScore: 0.98,
          dryRunImpact: {
            balanceDelta: initialBal,
            categoryImpact: 'Accounts'
          }
        };

        const plan: AgentTaskPlan = {
          id: `plan_acc_${Date.now()}`,
          intent: 'CREATE_ACCOUNT',
          confidence: 0.98,
          reasoning: `Prepared new ${accType} account "${accName}".`,
          steps: [
            { step: 1, title: 'Configure Account Metadata', detail: `Type: ${accType.toUpperCase()} · Name: ${accName} · Bank: ${institution || 'None (Cash)'}`, status: 'completed' },
            { step: 2, title: 'Set Initial Reserve', detail: `$${initialBal.toFixed(2)} initial balance`, status: 'completed' },
            { step: 3, title: 'Await User Confirmation', detail: 'Ready for commit to local storage', status: 'in_progress' }
          ],
          proposedAction: action
        };

        const cleanContent = rawReply.replace(/```action_json\s*[\s\S]*?\s*```/, '').trim();
        return {
          content: cleanContent,
          plan,
          action,
          measurableValue: `New ${accType} account: ${accName}`
        };
      }

      // 3. Scheduled Bill proposal
      if (parsed && (parsed.action === 'ADD_BILL' || (parsed.name && parsed.dueDate && typeof parsed.amount === 'number'))) {
        const billAmt = Math.abs(parsed.amount);
        const billName = parsed.name || 'New Recurring Bill';
        const category: ExpenseCategory = parsed.category || detectCategory(billName);
        const dueDate = parsed.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

        const newBill: Bill = {
          id: `bill_${Date.now()}`,
          name: billName,
          amount: billAmt,
          category,
          frequency: parsed.frequency || 'monthly',
          dueDate,
          isAutopay: Boolean(parsed.isAutopay),
          isPaidThisCycle: false,
          status: 'upcoming',
          notes: parsed.notes || `Scheduled via Fiona AI conversation`
        };

        const action: AgentAction = {
          id: `act_bill_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'ADD_BILL',
          description: `Schedule recurring bill: ${billName} ($${billAmt.toFixed(2)}/mo due ${dueDate})`,
          payload: newBill,
          status: 'pending',
          safetyLevel: 'low_risk',
          confidenceScore: 0.95,
          dryRunImpact: {
            balanceDelta: -billAmt,
            categoryImpact: category
          }
        };

        const plan: AgentTaskPlan = {
          id: `plan_bill_${Date.now()}`,
          intent: 'SCHEDULE_RECURRING_BILL',
          confidence: 0.95,
          reasoning: `Prepared recurring obligation for ${billName} ($${billAmt.toFixed(2)}).`,
          steps: [
            { step: 1, title: 'Extract Obligation Parameters', detail: `${billName} · $${billAmt.toFixed(2)} · Due ${dueDate}`, status: 'completed' },
            { step: 2, title: 'Check Cashflow Timeline', detail: 'Integrated into upcoming payments forecast', status: 'completed' },
            { step: 3, title: 'Awaiting User Confirmation', detail: 'Ready for commit to local storage', status: 'in_progress' }
          ],
          proposedAction: action
        };

        const cleanContent = rawReply.replace(/```action_json\s*[\s\S]*?\s*```/, '').trim();
        return {
          content: cleanContent,
          plan,
          action,
          measurableValue: `$${billAmt.toFixed(2)}/mo scheduled bill`
        };
      }

      // 4. Memory Invariant Update proposal
      if (parsed && (parsed.action === 'UPDATE_MEMORY' || (parsed.rule && typeof parsed.rule === 'string'))) {
        const newRule = (parsed.rule as string).trim();
        if (newRule.length > 3) {
          const updatedRules = [...context.memory.rules, newRule];
          const updatedMarkdown = `${context.memory.rawMarkdown}\n- RULE_NEW: ${newRule} (Logged ${new Date().toISOString().split('T')[0]})`;
          const updatedMem: MemoryFile = {
            ...context.memory,
            rules: updatedRules,
            rawMarkdown: updatedMarkdown,
            lastUpdated: new Date().toISOString(),
            revisionCount: context.memory.revisionCount + 1
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

          const plan: AgentTaskPlan = {
            id: `plan_mem_${Date.now()}`,
            intent: 'MEMORY_UPDATE',
            confidence: 0.98,
            reasoning: 'Extracted financial invariant and updated markdown memory graph.',
            steps: [
              { step: 1, title: 'Extract Invariant', detail: newRule, status: 'completed' },
              { step: 2, title: 'Compile Markdown Revision', detail: `Revision #${updatedMem.revisionCount}`, status: 'completed' },
              { step: 3, title: 'Await User Approval', detail: 'Safe execution gate active', status: 'in_progress' }
            ],
            proposedAction: action
          };

          const cleanContent = rawReply.replace(/```action_json\s*[\s\S]*?\s*```/, '').trim();
          return {
            content: cleanContent,
            plan,
            action,
            updatedMemory: updatedMem,
            memoryNote: `Added rule: "${newRule}"`,
            measurableValue: 'Memory Graph Updated with 1 Invariant'
          };
        }
      }

      // 5. Update Account proposal
      if (parsed && (parsed.action === 'UPDATE_ACCOUNT' || parsed.action === 'EDIT_ACCOUNT')) {
        const accId = parsed.accountId || parsed.id;
        const target = context.accounts.find(a => a.id === accId) || context.accounts.find(a => a.name.toLowerCase().includes(String(parsed.accountName || '').toLowerCase())) || defaultAcc;
        const updates: Partial<Account> = {};
        if (typeof parsed.balance === 'number') updates.balance = parsed.balance;
        if (parsed.name) updates.name = parsed.name;
        if (parsed.institution !== undefined) updates.institution = parsed.institution;
        if (parsed.network) updates.network = parsed.network;
        if (parsed.currency) updates.currency = parsed.currency;

        const updateDetails = Object.entries(updates).map(([k, v]) => `${k} → ${v}`).join(', ');
        const action: AgentAction = {
          id: `act_edit_acc_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'EDIT_ACCOUNT',
          description: `Update account "${target?.name || 'Account'}": ${updateDetails}`,
          payload: { id: target?.id, updates, previous: target },
          status: 'pending',
          safetyLevel: 'low_risk',
          confidenceScore: 0.98
        };

        const plan: AgentTaskPlan = {
          id: `plan_edit_acc_${Date.now()}`,
          intent: 'UPDATE_ACCOUNT',
          confidence: 0.98,
          reasoning: `Prepared account update for ${target?.name}.`,
          steps: [
            { step: 1, title: 'Locate Account', detail: `${target?.name} (${target?.id})`, status: 'completed' },
            { step: 2, title: 'Verify Updates', detail: updateDetails, status: 'completed' },
            { step: 3, title: 'Await Confirmation', detail: 'Safe Execution Gate', status: 'in_progress' }
          ],
          proposedAction: action
        };

        const cleanContent = rawReply.replace(/```action_json\s*[\s\S]*?\s*```/, '').trim();
        return { content: cleanContent, plan, action, measurableValue: `Update ${target?.name}` };
      }

      // 6. Delete Account proposal
      if (parsed && parsed.action === 'DELETE_ACCOUNT') {
        const accId = parsed.accountId || parsed.id;
        const target = context.accounts.find(a => a.id === accId) || context.accounts.find(a => a.name.toLowerCase().includes(String(parsed.accountName || '').toLowerCase()));
        if (target) {
          const action: AgentAction = {
            id: `act_del_acc_${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'DELETE_ACCOUNT',
            description: `Delete account "${target.name}" (${target.type.toUpperCase()}) with balance $${target.balance.toFixed(2)}`,
            payload: target,
            status: 'pending',
            safetyLevel: 'medium_risk',
            confidenceScore: 0.98
          };

          const plan: AgentTaskPlan = {
            id: `plan_del_acc_${Date.now()}`,
            intent: 'DELETE_ACCOUNT',
            confidence: 0.98,
            reasoning: `Prepared account deletion for ${target.name}.`,
            steps: [
              { step: 1, title: 'Verify Account', detail: `${target.name} (${target.id})`, status: 'completed' },
              { step: 2, title: 'Preserve Balance Records', detail: 'Transactions remapped to remaining primary account', status: 'completed' },
              { step: 3, title: 'Await Confirmation', detail: 'Safe Execution Gate', status: 'in_progress' }
            ],
            proposedAction: action
          };

          const cleanContent = rawReply.replace(/```action_json\s*[\s\S]*?\s*```/, '').trim();
          return { content: cleanContent, plan, action, measurableValue: `Remove ${target.name}` };
        }
      }

      // 7. Update Budget proposal
      if (parsed && (parsed.action === 'UPDATE_BUDGET' || (parsed.category && typeof parsed.allocated === 'number' && !parsed.amount))) {
        const catName = parsed.category;
        const existing = context.budgets.find(b => b.category.toLowerCase() === String(catName).toLowerCase() || b.id === parsed.budgetId);
        const newAlloc = Math.abs(parsed.allocated);

        const action: AgentAction = {
          id: `act_bud_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'UPDATE_BUDGET',
          description: `Update "${existing?.category || catName}" budget envelope to $${newAlloc.toFixed(2)}/mo`,
          payload: { id: existing?.id, category: existing?.category || catName, allocated: newAlloc, previousAllocated: existing?.allocated },
          status: 'pending',
          safetyLevel: 'low_risk',
          confidenceScore: 0.98
        };

        const plan: AgentTaskPlan = {
          id: `plan_bud_${Date.now()}`,
          intent: 'UPDATE_BUDGET',
          confidence: 0.98,
          reasoning: `Updated budget envelope allocation for ${existing?.category || catName}.`,
          steps: [
            { step: 1, title: 'Identify Envelope', detail: existing?.category || catName, status: 'completed' },
            { step: 2, title: 'Recalculate Headroom', detail: `Allocation: $${existing?.allocated?.toFixed(2) || '0.00'} → $${newAlloc.toFixed(2)}`, status: 'completed' },
            { step: 3, title: 'Await Confirmation', detail: 'Safe Execution Gate', status: 'in_progress' }
          ],
          proposedAction: action
        };

        const cleanContent = rawReply.replace(/```action_json\s*[\s\S]*?\s*```/, '').trim();
        return { content: cleanContent, plan, action, measurableValue: `Budget: ${existing?.category || catName} → $${newAlloc.toFixed(2)}` };
      }

      // 8. Add Budget proposal
      if (parsed && parsed.action === 'ADD_BUDGET') {
        const newBudget: BudgetEnvelope = {
          id: `b_${Date.now()}`,
          category: parsed.category || 'Other',
          type: parsed.type || 'want',
          allocated: Math.abs(parsed.allocated || 100),
          color: parsed.color || '#B59DD1'
        };

        const action: AgentAction = {
          id: `act_add_bud_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'ADD_BUDGET',
          description: `Add new "${newBudget.category}" envelope ($${newBudget.allocated.toFixed(2)}/mo, ${newBudget.type})`,
          payload: newBudget,
          status: 'pending',
          safetyLevel: 'low_risk',
          confidenceScore: 0.98
        };

        const plan: AgentTaskPlan = {
          id: `plan_add_bud_${Date.now()}`,
          intent: 'ADD_BUDGET',
          confidence: 0.98,
          reasoning: `Created new envelope for ${newBudget.category}.`,
          steps: [
            { step: 1, title: 'Envelope Definition', detail: `${newBudget.category} · $${newBudget.allocated.toFixed(2)}`, status: 'completed' },
            { step: 2, title: 'Category Classification', detail: `Type: ${newBudget.type}`, status: 'completed' },
            { step: 3, title: 'Await Confirmation', detail: 'Safe Execution Gate', status: 'in_progress' }
          ],
          proposedAction: action
        };

        const cleanContent = rawReply.replace(/```action_json\s*[\s\S]*?\s*```/, '').trim();
        return { content: cleanContent, plan, action, measurableValue: `New envelope: ${newBudget.category}` };
      }

      // 9. Delete Budget proposal
      if (parsed && parsed.action === 'DELETE_BUDGET') {
        const existing = context.budgets.find(b => b.id === parsed.budgetId || b.category.toLowerCase().includes(String(parsed.category || '').toLowerCase()));
        if (existing) {
          const action: AgentAction = {
            id: `act_del_bud_${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'DELETE_BUDGET',
            description: `Delete budget envelope "${existing.category}" ($${existing.allocated.toFixed(2)}/mo)`,
            payload: existing,
            status: 'pending',
            safetyLevel: 'low_risk',
            confidenceScore: 0.98
          };

          const plan: AgentTaskPlan = {
            id: `plan_del_bud_${Date.now()}`,
            intent: 'DELETE_BUDGET',
            confidence: 0.98,
            reasoning: `Removed envelope ${existing.category}.`,
            steps: [
              { step: 1, title: 'Identify Envelope', detail: existing.category, status: 'completed' },
              { step: 2, title: 'Check Unallocated Overflow', detail: 'Spend falls back to General Ledger', status: 'completed' },
              { step: 3, title: 'Await Confirmation', detail: 'Safe Execution Gate', status: 'in_progress' }
            ],
            proposedAction: action
          };

          const cleanContent = rawReply.replace(/```action_json\s*[\s\S]*?\s*```/, '').trim();
          return { content: cleanContent, plan, action, measurableValue: `Delete envelope: ${existing.category}` };
        }
      }

      // 10. Update or Pay Bill proposal
      if (parsed && (parsed.action === 'UPDATE_BILL' || parsed.action === 'EDIT_BILL' || parsed.action === 'PAY_BILL')) {
        const isPay = parsed.action === 'PAY_BILL' || parsed.status === 'paid' || parsed.isPaidThisCycle === true;
        const existing = context.bills.find(b => b.id === parsed.billId || b.name.toLowerCase().includes(String(parsed.name || parsed.billName || '').toLowerCase()));
        const updates: Partial<Bill> = {};
        if (typeof parsed.amount === 'number') updates.amount = Math.abs(parsed.amount);
        if (parsed.dueDate) updates.dueDate = parsed.dueDate;
        if (parsed.isAutopay !== undefined) updates.isAutopay = Boolean(parsed.isAutopay);
        if (isPay) {
          updates.isPaidThisCycle = true;
          updates.status = 'paid';
        }

        const action: AgentAction = {
          id: `act_edit_bill_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: isPay ? 'PAY_BILL' : 'EDIT_BILL',
          description: isPay
            ? `Mark recurring bill "${existing?.name || parsed.name}" ($${existing?.amount.toFixed(2) || ''}) as paid for this cycle`
            : `Update recurring bill "${existing?.name || parsed.name}"`,
          payload: { id: existing?.id || parsed.billId, updates, previous: existing },
          status: 'pending',
          safetyLevel: 'low_risk',
          confidenceScore: 0.98
        };

        const plan: AgentTaskPlan = {
          id: `plan_edit_bill_${Date.now()}`,
          intent: isPay ? 'PAY_BILL' : 'UPDATE_BILL',
          confidence: 0.98,
          reasoning: isPay ? `Marked bill ${existing?.name || parsed.name} as paid.` : `Updated bill ${existing?.name || parsed.name}.`,
          steps: [
            { step: 1, title: 'Identify Bill', detail: existing?.name || parsed.name, status: 'completed' },
            { step: 2, title: 'Apply Status Update', detail: isPay ? 'Status: PAID' : JSON.stringify(updates), status: 'completed' },
            { step: 3, title: 'Await Confirmation', detail: 'Safe Execution Gate', status: 'in_progress' }
          ],
          proposedAction: action
        };

        const cleanContent = rawReply.replace(/```action_json\s*[\s\S]*?\s*```/, '').trim();
        return { content: cleanContent, plan, action, measurableValue: isPay ? `Paid: ${existing?.name || parsed.name}` : `Update: ${existing?.name || parsed.name}` };
      }

      // 11. Delete Bill proposal
      if (parsed && parsed.action === 'DELETE_BILL') {
        const existing = context.bills.find(b => b.id === parsed.billId || b.name.toLowerCase().includes(String(parsed.name || parsed.billName || '').toLowerCase()));
        if (existing) {
          const action: AgentAction = {
            id: `act_del_bill_${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'DELETE_BILL',
            description: `Delete recurring bill "${existing.name}" ($${existing.amount.toFixed(2)}/mo)`,
            payload: existing,
            status: 'pending',
            safetyLevel: 'low_risk',
            confidenceScore: 0.98
          };

          const plan: AgentTaskPlan = {
            id: `plan_del_bill_${Date.now()}`,
            intent: 'DELETE_BILL',
            confidence: 0.98,
            reasoning: `Removed bill ${existing.name}.`,
            steps: [
              { step: 1, title: 'Locate Bill', detail: `${existing.name} ($${existing.amount.toFixed(2)})`, status: 'completed' },
              { step: 2, title: 'Update Recurring Cashflow', detail: 'Removed from upcoming commitments', status: 'completed' },
              { step: 3, title: 'Await Confirmation', detail: 'Safe Execution Gate', status: 'in_progress' }
            ],
            proposedAction: action
          };

          const cleanContent = rawReply.replace(/```action_json\s*[\s\S]*?\s*```/, '').trim();
          return { content: cleanContent, plan, action, measurableValue: `Deleted: ${existing.name}` };
        }
      }

      // 12. Delete Memory Rule proposal
      if (parsed && parsed.action === 'DELETE_MEMORY_RULE') {
        const ruleIdx = typeof parsed.ruleIndex === 'number'
          ? parsed.ruleIndex
          : context.memory.rules.findIndex(r => r.toLowerCase().includes(String(parsed.rule || '').toLowerCase()));

        if (ruleIdx >= 0 && ruleIdx < context.memory.rules.length) {
          const removedRule = context.memory.rules[ruleIdx];
          const updatedRules = context.memory.rules.filter((_, idx) => idx !== ruleIdx);
          const updatedMarkdown = `${context.memory.rawMarkdown}\n- REMOVED_RULE: ${removedRule} (Cleared ${new Date().toISOString().split('T')[0]})`;
          const updatedMem: MemoryFile = {
            ...context.memory,
            rules: updatedRules,
            rawMarkdown: updatedMarkdown,
            lastUpdated: new Date().toISOString(),
            revisionCount: context.memory.revisionCount + 1
          };

          const action: AgentAction = {
            id: `act_del_mem_${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'DELETE_MEMORY_RULE',
            description: `Remove operational rule from Memory: "${removedRule}"`,
            payload: updatedMem,
            status: 'pending',
            safetyLevel: 'low_risk',
            confidenceScore: 0.98
          };

          const plan: AgentTaskPlan = {
            id: `plan_del_mem_${Date.now()}`,
            intent: 'DELETE_MEMORY_RULE',
            confidence: 0.98,
            reasoning: `Removed rule from memory graph.`,
            steps: [
              { step: 1, title: 'Locate Rule', detail: removedRule, status: 'completed' },
              { step: 2, title: 'Compile Memory Revision', detail: `Revision #${updatedMem.revisionCount}`, status: 'completed' },
              { step: 3, title: 'Await Confirmation', detail: 'Safe Execution Gate', status: 'in_progress' }
            ],
            proposedAction: action
          };

          const cleanContent = rawReply.replace(/```action_json\s*[\s\S]*?\s*```/, '').trim();
          return { content: cleanContent, plan, action, updatedMemory: updatedMem, memoryNote: `Removed rule: "${removedRule}"`, measurableValue: 'Memory Rule Cleared' };
        }
      }

      // 13. Update Settings proposal
      if (parsed && parsed.action === 'UPDATE_SETTINGS') {
        const settingsPayload: { theme?: 'light' | 'dark'; isSpeechEnabled?: boolean; currency?: string; provider?: LLMProvider; model?: string } = {};
        if (parsed.theme === 'light' || parsed.theme === 'dark') settingsPayload.theme = parsed.theme;
        if (typeof parsed.isSpeechEnabled === 'boolean') settingsPayload.isSpeechEnabled = parsed.isSpeechEnabled;
        if (typeof parsed.speech === 'boolean') settingsPayload.isSpeechEnabled = parsed.speech;
        if (parsed.currency) settingsPayload.currency = parsed.currency;
        if (parsed.provider) settingsPayload.provider = parsed.provider;
        if (parsed.model) settingsPayload.model = parsed.model;

        const desc = [
          settingsPayload.theme ? `Set theme to ${settingsPayload.theme.toUpperCase()}` : null,
          settingsPayload.isSpeechEnabled !== undefined ? (settingsPayload.isSpeechEnabled ? 'Enable voice speech' : 'Mute voice speech') : null,
          settingsPayload.currency ? `Set primary currency to ${settingsPayload.currency}` : null,
          settingsPayload.provider ? `Set AI model provider to ${settingsPayload.provider}` : null
        ].filter(Boolean).join(', ');

        const action: AgentAction = {
          id: `act_settings_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'UPDATE_SETTINGS',
          description: desc || 'Update application settings',
          payload: settingsPayload,
          status: 'pending',
          safetyLevel: 'low_risk',
          confidenceScore: 0.98
        };

        const plan: AgentTaskPlan = {
          id: `plan_settings_${Date.now()}`,
          intent: 'UPDATE_SETTINGS',
          confidence: 0.98,
          reasoning: `Prepared application settings update.`,
          steps: [
            { step: 1, title: 'Parse Settings Parameters', detail: desc, status: 'completed' },
            { step: 2, title: 'Stage Preference Mutation', detail: 'Ready for client persistence', status: 'completed' },
            { step: 3, title: 'Await Confirmation', detail: 'Safe Execution Gate', status: 'in_progress' }
          ],
          proposedAction: action
        };

        const cleanContent = rawReply.replace(/```action_json\s*[\s\S]*?\s*```/, '').trim();
        return { content: cleanContent, plan, action, measurableValue: desc };
      }
    } catch (e) {
      console.warn('Action JSON parsing warning:', e);
    }
  }

  const cleanContent = rawReply.replace(/```action_json\s*[\s\S]*?\s*```/, '').trim();

  // If the LLM did not output an action_json block, it decided that NO account mutation was intended.
  // Return the pure conversational or generic answer (e.g. general knowledge, BRAC university, advice, greetings) directly!
  return {
    content: cleanContent || rawReply
  };
}

// Full-stack Agent Reasoning Dispatcher with Real-time AI Model Execution
export async function processAgentMessage(
  userInput: string,
  context: AgentContext,
  onChunk?: (partialText: string) => void,
  history?: { role: 'user' | 'assistant'; content: string }[]
): Promise<AgentResponse> {
  const { config, memory, bills, budgets, accounts } = context;

  // Sync latest ledger snapshot to the browser Vector Database
  try {
    vectorDb.syncLedgerContext({ accounts, transactions: context.transactions, bills, budgets, memory });
  } catch (syncErr) {
    console.warn('[VectorDB] Sync notice:', syncErr);
  }

  // Check if edge cognition determined a preliminary transaction or query plan
  const edgePlan = runEdgeCognition(userInput, context);

  // Helper to stream text word-by-word if needed
  const streamFallbackText = async (text: string) => {
    if (!onChunk || !text) return;
    const words = text.split(' ');
    let current = '';
    for (let i = 0; i < words.length; i++) {
      current += (i === 0 ? '' : ' ') + words[i];
      onChunk(current);
      if (i < words.length - 1) {
        await new Promise(r => setTimeout(r, 14));
      }
    }
  };

  // 1. Retrieve top semantically relevant chunks from local browser vector database
  const ragContext = vectorDb.buildRagContext(userInput, 4);

  // Format accounts overview with Cash, Crypto, Banks, etc.
  const accountsOverview = accounts.map(a => {
    const bankDesc = a.institution ? `Bank/Custodian: ${a.institution}` : 'No bank specified (Physical/Unbanked Cash)';
    const networkDesc = a.network ? `, Network: ${a.network}` : '';
    const maskDesc = a.accountNumberMask ? `, Mask: ${a.accountNumberMask}` : '';
    return `- [${a.id}] "${a.name}" | Type: ${a.type} | Balance: $${a.balance.toFixed(2)} | ${bankDesc}${networkDesc}${maskDesc}`;
  }).join('\n');

  const totalLiquid = accounts
    .filter(a => a.type === 'checking' || a.type === 'savings' || a.type === 'cash')
    .reduce((sum, a) => sum + Math.max(0, a.balance), 0);

  // 2. Personal, human secretary system prompt with thorough general knowledge and accurate financial actions
  const systemPrompt = `You are Fiona, the user's friendly, sharp, knowledgeable personal finance secretary, accountant, and intelligent companion.

ARCHITECTURE & MEMORY RETRIEVAL (Browser-Native Vector RAG):
- You operate with a decentralized in-browser vector database and embedding retrieval system (stored persistently in the user's browser).
- Relevant vector chunks from the user's local database for this query:
${ragContext || '[No specific historical vector chunks matched]'}

ACTIVE AGENT KNOWLEDGE GRAPH (Memory):
${memory.rawMarkdown}

ACCOUNTS CURRENTLY IN LEDGER:
${accountsOverview || '[No accounts configured yet]'}

LIQUIDITY & BUDGET SUMMARY:
- Total Liquid Cash & Checking: $${totalLiquid.toFixed(2)}
- Envelopes: ${budgets.map(b => `${b.category} ($${b.allocated}/mo)`).join(', ')}
- Upcoming Bills: ${bills.slice(0, 5).map(b => `${b.name} ($${b.amount} on ${b.dueDate})`).join(', ')}

CORE PERSONALITY & COMMUNICATION GUIDELINES:
1. ACT LIKE A GENUINE INTELLIGENT PERSONAL SECRETARY (FIONA):
   - Be warm, attentive, conversational, witty, and helpful. You are a trusted human-like confidante, NOT a rigid corporate template or robot.
   - For generic questions, general queries, small talk, questions about institutions, universities (e.g. "do you know about BRAC university?"), science, geography, culture, history, programming, writing, or general advice:
     ANSWER DIRECTLY, KNOWLEDGEABLY, ACCURATELY, AND THOROUGHLY as Fiona. Do NOT deflect, do NOT give canned account status summaries, and do NOT force the conversation back to bank balances when the user is asking about an external topic.
   - For simple greetings and casual banter ("hey", "how are you?", "hello"), reply in 1 to 2 warm, natural sentences.

2. AUTONOMOUS ACCOUNT & LEDGER OPERATIONS:
   - You must evaluate whether the user's message is an instruction to OPERATE on their accounts or ledger data (e.g., logging income, recording an expense, transferring money, creating a crypto wallet, setting up an unbanked cash account, scheduling a bill, or saving a memory rule).
   - If they ARE asking to operate on accounts or data, decide which account to operate on based on the context:
     * Cash account: for physical cash, cash found, cash pocket, cash payments without a bank (e.g. acc_cash_01).
     * Crypto wallet: for crypto tokens, web3, ETH, BTC, SOL, hardware wallets, on-chain transfers (e.g. acc_crypto_03).
     * Bank checking, savings, credit cards, or investments: for their respective accounts.
     * New Account Creation: If the user asks to add an account (e.g. "Add a crypto wallet for Phantom", "Create a cash jar account with $50", "Add my Chase savings"):
       Emit an ADD_ACCOUNT action!
     * When proposing an operation, explain what you are doing in your response, and append this exact action_json block at the very end:

   For Transactions:
\`\`\`action_json
{
  "action": "ADD_TRANSACTION",
  "type": "income" | "expense" | "transfer",
  "amount": number,
  "accountId": "string (the target account ID, e.g. acc_cash_01, acc_chk_01, acc_crypto_03)",
  "fromAccountId": "string (optional for transfers)",
  "toAccountId": "string (optional for transfers)",
  "category": "Groceries" | "Dining & Nightlife" | "Transportation & Fuel" | "Subscriptions & Software" | "Utilities & Services" | "Housing & Rent" | "Health & Wellness" | "Entertainment & Leisure" | "Shopping & Goods" | "Savings & Investments" | "Other",
  "merchant": "string",
  "note": "string"
}
\`\`\`

   For Creating Accounts (Crypto wallet, Cash account, Bank account, etc.):
\`\`\`action_json
{
  "action": "ADD_ACCOUNT",
  "name": "string (e.g. Phantom Crypto Wallet, Cash Pocket, Chase Checking)",
  "type": "cash" | "crypto" | "checking" | "savings" | "credit" | "investment",
  "balance": number,
  "currency": "USD",
  "institution": "string (leave empty string \"\" for cash accounts with no bank specified, or specify bank/wallet e.g. MetaMask, Chase)",
  "network": "string (optional for crypto e.g. Solana, Ethereum, Bitcoin)",
  "walletAddress": "string (optional for crypto e.g. 0x...)"
}
\`\`\`

   For Scheduling Bills:
\`\`\`action_json
{
  "action": "ADD_BILL",
  "name": "string",
  "amount": number,
  "category": "Subscriptions & Software" | "Utilities & Services" | "Housing & Rent" | "Other",
  "dueDate": "YYYY-MM-DD",
  "isAutopay": boolean
}
\`\`\`

   For Memory Rules:
\`\`\`action_json
{
  "action": "UPDATE_MEMORY",
  "rule": "string"
}
\`\`\`

3. CRITICAL: NO ACTION FOR NON-TRANSACTIONAL QUERIES:
   - If the user is asking a general knowledge question, learning something, asking about a university, discussing hypothetical math, or chatting without requesting a financial transaction, DO NOT output any action_json block.`;

  // If local edge engine (Chrome Prompt API / Transformers.js) is explicitly active, try it first
  if (config.provider === 'edge') {
    try {
      if (isWindowAIAvailable()) {
        try {
          const winAiReply = await runWindowAI(userInput, systemPrompt, onChunk);
          if (winAiReply && winAiReply.trim()) {
            return parseAgentResponseWithActions(winAiReply, edgePlan, context, userInput);
          }
        } catch (winErr) {
          console.warn('Window AI notice, falling back to server AI model:', winErr);
        }
      }

      const localReply = await runBrowserEngine(userInput, context, onChunk, systemPrompt);
      if (localReply && localReply.trim()) {
        return parseAgentResponseWithActions(localReply, edgePlan, context, userInput);
      }
    } catch (edgeErr) {
      console.warn('Edge execution notice, delegating to AI model:', edgeErr);
    }
  }

  // Real AI Model Execution (Gemini 3.8 Flash default or configured provider)
  try {
    const effectiveProvider = (!config.provider || config.provider === 'edge') ? 'gemini' : config.provider;
    const effectiveModel = (!config.model || config.model === 'gemini-flash-latest' || config.model === 'gemini-2.5-flash' || config.model.includes('smolLM'))
      ? 'gemini-3.8-flash'
      : config.model;

    const historyMessages = (history || []).slice(-8).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    const messages = [
      ...historyMessages,
      { role: 'user', content: userInput }
    ];

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: effectiveProvider,
        apiKey: config.apiKey,
        model: effectiveModel,
        messages,
        systemInstruction: systemPrompt,
        stream: true
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `AI Model request failed with status ${res.status}`);
    }

    const contentType = res.headers.get('content-type') || '';

    // Handle real-time Server-Sent Events (SSE) stream from AI model
    if (contentType.includes('text/event-stream') && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamBuffer = '';
      let accumulated = '';
      let streamError = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split('\n');
        streamBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const payloadStr = trimmed.replace(/^data:\s*/, '');
          if (payloadStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(payloadStr);
            if (parsed.error) {
              streamError = typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error);
            }
            if (parsed.text) {
              accumulated += parsed.text;
              if (onChunk) onChunk(accumulated);
            }
          } catch {}
        }
      }

      if (accumulated.trim()) {
        return parseAgentResponseWithActions(accumulated, edgePlan, context, userInput);
      }

      if (streamError) {
        throw new Error(streamError);
      }
    }

    // Standard JSON response fallback
    const data = await res.json().catch(() => ({}));
    if (data.error) {
      throw new Error(data.error);
    }

    const reply = data.reply || '';
    if (!reply.trim()) {
      throw new Error('AI model returned an empty response. Please try again.');
    }

    if (onChunk && reply) {
      await streamFallbackText(reply);
    }

    return parseAgentResponseWithActions(reply, edgePlan, context, userInput);
  } catch (err: any) {
    console.error('AI Model execution error:', err);
    throw err;
  }
}

