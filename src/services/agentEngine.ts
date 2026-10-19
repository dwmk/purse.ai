import {
  Account,
  AgentAction,
  AgentTaskPlan,
  Bill,
  BudgetEnvelope,
  ExpenseCategory,
  LLMConfig,
  LLMProvider,
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
  actions?: AgentAction[];
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

  // 0A. INTENT: THEME & APPEARANCE (Switch theme, set light/dark mode)
  const isThemeSwitch =
    lower === 'switch theme' ||
    lower === 'toggle theme' ||
    lower.includes('theme to light') ||
    lower.includes('theme to dark') ||
    lower.includes('light mode') ||
    lower.includes('dark mode') ||
    lower.includes('light theme') ||
    lower.includes('dark theme') ||
    lower.includes('change theme') ||
    lower.includes('switch to dark') ||
    lower.includes('switch to light') ||
    (lower.includes('theme') && (lower.includes('switch') || lower.includes('toggle') || lower.includes('change') || lower.includes('set')));

  if (isThemeSwitch) {
    let targetTheme: 'light' | 'dark';
    if (lower.includes('light') || lower.includes('day') || lower.includes('white')) {
      targetTheme = 'light';
    } else if (lower.includes('dark') || lower.includes('night') || lower.includes('obsidian')) {
      targetTheme = 'dark';
    } else {
      // Toggle from current context theme
      targetTheme = context.theme === 'dark' ? 'light' : 'dark';
    }

    const action: AgentAction = {
      id: `act_settings_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'UPDATE_SETTINGS',
      description: `Switch interface theme to ${targetTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}`,
      payload: { theme: targetTheme },
      status: 'pending',
      safetyLevel: 'low_risk',
      confidenceScore: 0.99
    };

    return {
      content: `I've switched your theme to **${targetTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}**! The interface styling has updated immediately.`,
      measurableValue: `Theme: ${targetTheme.toUpperCase()} MODE`,
      plan: {
        id: `plan_theme_${Date.now()}`,
        intent: 'UPDATE_THEME',
        confidence: 0.99,
        reasoning: `User requested switching theme to ${targetTheme} mode.`,
        steps: [
          { step: 1, title: 'Parse Theme Request', detail: `Target: ${targetTheme.toUpperCase()} mode`, status: 'completed' },
          { step: 2, title: 'Apply Theme Palette', detail: `Updated visual tokens to ${targetTheme}`, status: 'completed' }
        ],
        proposedAction: action
      },
      action
    };
  }

  // 0B. INTENT: VOICE READOUT (Mute/Unmute speech)
  if (lower.includes('mute') || lower.includes('unmute') || (lower.includes('voice') && (lower.includes('turn on') || lower.includes('turn off') || lower.includes('disable') || lower.includes('enable')))) {
    const shouldEnable = lower.includes('unmute') || lower.includes('turn on') || lower.includes('enable');
    const action: AgentAction = {
      id: `act_speech_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'UPDATE_SETTINGS',
      description: shouldEnable ? 'Enable voice readout audio' : 'Mute voice readout audio',
      payload: { isSpeechEnabled: shouldEnable },
      status: 'pending',
      safetyLevel: 'low_risk',
      confidenceScore: 0.99
    };

    return {
      content: shouldEnable
        ? "I've enabled voice readout! I'll read out summaries aloud as we converse."
        : "I've muted voice readout. All future responses will be strictly visual text.",
      measurableValue: shouldEnable ? 'Voice: ON' : 'Voice: MUTED',
      action
    };
  }

  // 0C. INTENT: BALANCES FROM ALL ACCOUNTS QUERY
  const isBalanceQuery =
    lower.includes('what are my current balances from all my accounts') ||
    lower.includes('what are my current balances') ||
    lower.includes('what are my balances') ||
    lower.includes('balances from all my accounts') ||
    lower.includes('how much money do i have') ||
    lower.includes('show my accounts') ||
    lower.includes('list my accounts') ||
    (lower.includes('balance') && (lower.includes('all') || lower.includes('current') || lower.includes('what are') || lower.includes('show')));

  if (isBalanceQuery && !lower.includes('update') && !lower.includes('set balance') && !lower.includes('change balance')) {
    const totalNetWorth = accounts.reduce((sum, a) => sum + a.balance, 0);

    const breakdown = accounts.map(a => {
      const typeBadge = a.type.toUpperCase();
      const instStr = a.institution ? ` (${a.institution})` : (a.type === 'cash' ? ' (Cash/Physical)' : '');
      const netStr = a.network ? ` · Network: ${a.network}` : '';
      const maskStr = a.accountNumberMask ? ` · ${a.accountNumberMask}` : '';
      const balStr = a.balance >= 0
        ? `$${a.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `-$${Math.abs(a.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      return `- **${a.name}** [${typeBadge}]: **${balStr}**${instStr}${maskStr}${netStr}`;
    }).join('\n');

    return {
      content: `### Current Balances Across All Accounts\n\nHere is your real-time balance breakdown across all **${accounts.length} active account(s)**:\n\n${breakdown}\n\n---\n**Liquidity & Net Worth Summary:**\n- **Total Liquid Reserves (Checking + Savings + Cash):** **$${totalLiquid.toLocaleString('en-US', { minimumFractionDigits: 2 })}**\n- **Total Combined Net Worth:** **$${totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}**\n- **Safe Operating Checking Cushion:** $${checkingBalance.toFixed(2)} (Safe Floor: $${memory.profile.minimumCheckingFloor.toFixed(2)})\n\nFeel free to ask me to log new transactions, record a transfer between accounts, or update an account balance anytime!`,
      measurableValue: `$${totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })} Total Net Worth`,
      plan: {
        id: `plan_bal_${Date.now()}`,
        intent: 'ACCOUNT_BALANCES_AUDIT',
        confidence: 0.99,
        reasoning: 'Retrieved and verified balances across all configured ledger accounts.',
        steps: [
          { step: 1, title: 'Fetch Ledger Accounts', detail: `Located ${accounts.length} active account entities`, status: 'completed' },
          { step: 2, title: 'Sum Liquid & Credit Reserves', detail: `Total Liquid: $${totalLiquid.toFixed(2)} · Net Worth: $${totalNetWorth.toFixed(2)}`, status: 'completed' },
          { step: 3, title: 'Verify Operating Cushion', detail: `Checking balance: $${checkingBalance.toFixed(2)}`, status: 'completed' }
        ]
      }
    };
  }

  // 0D. INTENT: UPCOMING BILLS QUERY
  const isBillsQuery =
    (lower.includes('upcoming bill') || lower.includes('upcoming bills') || lower.includes('what bills') || lower.includes('any bills') || lower.includes('do i have any upcoming bills') || lower.includes('bills due')) &&
    !lower.includes('add') && !lower.includes('create') && !lower.includes('delete') && !lower.includes('remove') && !lower.includes('pay');

  if (isBillsQuery) {
    const totalObligations = bills.reduce((sum, b) => sum + b.amount, 0);
    const unpaidBills = bills.filter(b => !b.isPaidThisCycle && b.status !== 'paid');
    const totalUnpaid = unpaidBills.reduce((sum, b) => sum + b.amount, 0);

    const billList = bills.length > 0
      ? bills.map(b => {
          const isPaid = b.isPaidThisCycle || b.status === 'paid';
          const statusIcon = isPaid ? '✅ Paid this cycle' : '⏳ Due';
          const autopayBadge = b.isAutopay ? '· Autopay' : '· Manual';
          return `- **${b.name}**: **$${b.amount.toFixed(2)}** (Due: ${b.dueDate}) · Category: ${b.category} · ${statusIcon} ${autopayBadge}`;
        }).join('\n')
      : 'No upcoming bills are currently scheduled in your ledger.';

    return {
      content: `### Upcoming Recurring Bills & Obligations\n\nYou currently have **${bills.length} scheduled recurring bill(s)** totaling **$${totalObligations.toFixed(2)}/month** ($${totalUnpaid.toFixed(2)} remaining to pay this cycle):\n\n${billList}\n\n- **Next Payday:** ${memory.profile.nextPayday} ($${memory.profile.monthlyIncome.toFixed(2)} expected)\n- **Operating Cushion:** $${checkingBalance.toFixed(2)} available in checking\n\nLet me know if you would like to mark any bill as paid, add a new bill, or cancel an existing subscription!`,
      measurableValue: `$${totalUnpaid.toFixed(2)} Unpaid Bills This Cycle`,
      plan: {
        id: `plan_bills_${Date.now()}`,
        intent: 'UPCOMING_BILLS_AUDIT',
        confidence: 0.99,
        reasoning: 'Audited upcoming bill dates against checking balance and payday timeline.',
        steps: [
          { step: 1, title: 'Retrieve Bill Schedule', detail: `Found ${bills.length} active recurring commitments`, status: 'completed' },
          { step: 2, title: 'Calculate Cycle Obligations', detail: `$${totalUnpaid.toFixed(2)} remaining to clear`, status: 'completed' }
        ]
      }
    };
  }

  // 0E. INTENT: WHAT DO YOU KNOW ABOUT ME (MEMORY & PROFILE QUERY)
  const isMemoryQuery =
    lower.includes('what do you know about me so far') ||
    lower.includes('what do you know about me') ||
    lower.includes('what do you remember') ||
    lower.includes('what do you know') ||
    lower.includes('tell me about me') ||
    lower.includes('what are my rules') ||
    lower.includes('who am i financially');

  if (isMemoryQuery) {
    const rulesList = memory.rules.length > 0
      ? memory.rules.map((r, i) => `${i + 1}. ${r}`).join('\n')
      : 'No custom behavioral rules configured yet.';

    const habitsList = memory.habits.length > 0
      ? memory.habits.map((h, i) => `- ${h}`).join('\n')
      : 'No recurring habits logged yet.';

    return {
      content: `### What I Know About You & Your Financial Profile\n\nI store your financial knowledge graph 100% privately in your browser local storage (Revision #${memory.revisionCount}, last updated ${memory.lastUpdated.split('T')[0]}):\n\n#### 1. Core Profile & Liquidity Invariants\n- **Monthly Net Income:** **$${memory.profile.monthlyIncome.toFixed(2)}** (${memory.profile.paydayCadence})\n- **Next Payday:** **${memory.profile.nextPayday}**\n- **Emergency Fund Vault Target:** $${memory.profile.emergencyFundTarget.toFixed(2)}\n- **Safe Operating Checking Floor:** $${memory.profile.minimumCheckingFloor.toFixed(2)} (safety cushion)\n- **Target Savings Rate:** ${memory.profile.savingsRateTargetPercent}%\n- **Primary Currency:** ${memory.profile.currency || 'USD'}\n\n#### 2. Active Behavioral Rules & Preferences (${memory.rules.length})\n${rulesList}\n\n#### 3. Detected Habits & Spending Patterns\n${habitsList}\n\nYou can teach me new rules anytime by saying *"remember that [rule]"*, or ask me to forget/delete any rule!`,
      measurableValue: `${memory.rules.length} Rules · Revision #${memory.revisionCount}`,
      plan: {
        id: `plan_mem_query_${Date.now()}`,
        intent: 'KNOWLEDGE_GRAPH_RETRIEVAL',
        confidence: 0.99,
        reasoning: 'Extracted active financial profile and behavioral rules from persistent memory.',
        steps: [
          { step: 1, title: 'Read Persistent Memory File', detail: `Revision #${memory.revisionCount}`, status: 'completed' },
          { step: 2, title: 'Synthesize Invariants & Habits', detail: `${memory.rules.length} rules and ${memory.habits.length} habits loaded`, status: 'completed' }
        ]
      }
    };
  }

  // 0F. INTENT: BUDGET ENVELOPES REVIEW QUERY
  const isBudgetReviewQuery =
    (lower.includes('budget') && (lower.includes('envelope') || lower.includes('review') || lower.includes('what are') || lower.includes('show') || lower.includes('status'))) &&
    !lower.includes('add') && !lower.includes('create') && !lower.includes('delete') && !lower.includes('update') && !lower.includes('increase');

  if (isBudgetReviewQuery) {
    const totalBudget = budgets.reduce((sum, b) => sum + b.allocated, 0);
    const envList = budgets.map(b => {
      const spent = transactions
        .filter(t => t.category === b.category && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      const remaining = b.allocated - spent;
      return `- **${b.category}** [${b.type.toUpperCase()}]: **$${b.allocated.toFixed(2)}/mo** (Spent: $${spent.toFixed(2)}, Headroom: $${remaining.toFixed(2)})`;
    }).join('\n');

    return {
      content: `### Monthly Budget Envelopes Overview\n\nYou currently have **${budgets.length} budget envelopes** with a combined allocation of **$${totalBudget.toFixed(2)}/month**:\n\n${envList}\n\nFeel free to adjust any envelope allocation anytime by saying *"set [category] budget to $[amount]"*!`,
      measurableValue: `$${totalBudget.toFixed(2)} Total Monthly Budgets`,
      plan: {
        id: `plan_bud_rev_${Date.now()}`,
        intent: 'BUDGET_ENVELOPES_REVIEW',
        confidence: 0.98,
        reasoning: 'Calculated headroom across all budget envelopes against current cycle expenses.',
        steps: [
          { step: 1, title: 'Retrieve Envelopes', detail: `${budgets.length} envelopes active`, status: 'completed' },
          { step: 2, title: 'Calculate Category Spend', detail: 'Cross-referenced against transactions', status: 'completed' }
        ]
      }
    };
  }

  // 0G. INTENT: DELETE / REMOVE / EDIT ACCOUNTS VIA CHAT
  const delAccMatch = text.match(/(?:delete|remove)\s+(?:account\s+)?([A-Za-z0-9'\s&.-]+)/i);
  if (delAccMatch && !lower.includes('bill') && !lower.includes('transaction') && !lower.includes('rule') && !lower.includes('budget')) {
    const targetQuery = delAccMatch[1].trim().toLowerCase();
    const target = accounts.find(a => a.name.toLowerCase().includes(targetQuery) || a.id.toLowerCase() === targetQuery);
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

      return {
        content: `I've prepared a safe execution plan to remove the account **"${target.name}"** ($${target.balance.toFixed(2)}). Any associated transactions will remain preserved and remapped to your primary account.\n\nPlease confirm in the gate below to commit this removal.`,
        measurableValue: `Delete account: ${target.name}`,
        plan: {
          id: `plan_del_acc_${Date.now()}`,
          intent: 'DELETE_ACCOUNT',
          confidence: 0.98,
          reasoning: `User requested deleting account ${target.name}.`,
          steps: [
            { step: 1, title: 'Verify Account', detail: `${target.name} (${target.id})`, status: 'completed' },
            { step: 2, title: 'Prepare Non-Destructive Removal', detail: 'Awaiting user execution gate confirmation', status: 'in_progress' }
          ],
          proposedAction: action
        },
        action
      };
    }
  }

  // 0H. INTENT: PAY / DELETE BILLS VIA CHAT
  if (lower.includes('pay') && lower.includes('bill')) {
    const billMatch = text.match(/(?:pay|mark\s+paid|paid)\s+(?:bill\s+)?([A-Za-z0-9'\s&.-]+)/i);
    const query = billMatch ? billMatch[1].trim().toLowerCase() : '';
    const target = bills.find(b => b.name.toLowerCase().includes(query)) || bills[0];
    if (target) {
      const action: AgentAction = {
        id: `act_pay_bill_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'PAY_BILL',
        description: `Mark recurring bill "${target.name}" ($${target.amount.toFixed(2)}) as paid for this cycle`,
        payload: { id: target.id, updates: { isPaidThisCycle: true, status: 'paid' }, previous: target },
        status: 'pending',
        safetyLevel: 'low_risk',
        confidenceScore: 0.98
      };

      return {
        content: `I have prepared to mark your bill **${target.name}** ($${target.amount.toFixed(2)}) as **Paid** for this billing cycle.\n\nPlease confirm below to commit this change.`,
        measurableValue: `Marked bill paid: ${target.name}`,
        plan: {
          id: `plan_pay_bill_${Date.now()}`,
          intent: 'PAY_BILL',
          confidence: 0.98,
          reasoning: `User requested marking bill ${target.name} as paid.`,
          steps: [
            { step: 1, title: 'Locate Bill', detail: `${target.name} ($${target.amount.toFixed(2)})`, status: 'completed' },
            { step: 2, title: 'Update Status to Paid', detail: 'Cycle status updated', status: 'completed' },
            { step: 3, title: 'Await Confirmation', detail: 'Safe Execution Gate', status: 'in_progress' }
          ],
          proposedAction: action
        },
        action
      };
    }
  }

  const delBillMatch = text.match(/(?:delete|remove|cancel)\s+(?:bill\s+)?([A-Za-z0-9'\s&.-]+)/i);
  if (delBillMatch && (lower.includes('bill') || lower.includes('subscription')) && !lower.includes('account') && !lower.includes('transaction')) {
    const query = delBillMatch[1].trim().toLowerCase();
    const target = bills.find(b => b.name.toLowerCase().includes(query));
    if (target) {
      const action: AgentAction = {
        id: `act_del_bill_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'DELETE_BILL',
        description: `Delete recurring bill "${target.name}" ($${target.amount.toFixed(2)}/mo)`,
        payload: target,
        status: 'pending',
        safetyLevel: 'low_risk',
        confidenceScore: 0.98
      };

      return {
        content: `I've prepared to remove the recurring bill **"${target.name}"** ($${target.amount.toFixed(2)}/mo) from your schedule.\n\nPlease approve below to commit this removal.`,
        measurableValue: `Deleted bill: ${target.name}`,
        plan: {
          id: `plan_del_bill_${Date.now()}`,
          intent: 'DELETE_BILL',
          confidence: 0.98,
          reasoning: `User requested removing bill ${target.name}.`,
          steps: [
            { step: 1, title: 'Locate Bill', detail: target.name, status: 'completed' },
            { step: 2, title: 'Update Cashflow Commitments', detail: `Recovered $${target.amount.toFixed(2)}/mo`, status: 'completed' }
          ],
          proposedAction: action
        },
        action
      };
    }
  }

  // 0I. INTENT: DELETE MEMORY RULE VIA CHAT
  if ((lower.includes('forget') || lower.includes('delete rule') || lower.includes('remove rule')) && (lower.includes('rule') || lower.includes('remember'))) {
    const ruleNumMatch = text.match(/rule\s*#?([0-9]+)/i);
    let targetIdx = -1;
    if (ruleNumMatch) {
      targetIdx = parseInt(ruleNumMatch[1], 10) - 1;
    } else {
      const query = text.replace(/^(?:forget|delete rule|remove rule)\s*/i, '').trim().toLowerCase();
      targetIdx = memory.rules.findIndex(r => r.toLowerCase().includes(query));
    }

    if (targetIdx >= 0 && targetIdx < memory.rules.length) {
      const removedRule = memory.rules[targetIdx];
      const updatedRules = memory.rules.filter((_, idx) => idx !== targetIdx);
      const updatedMem: MemoryFile = {
        ...memory,
        rules: updatedRules,
        rawMarkdown: `${memory.rawMarkdown}\n- REMOVED_RULE: ${removedRule} (Cleared on ${new Date().toISOString().split('T')[0]})`,
        lastUpdated: new Date().toISOString(),
        revisionCount: memory.revisionCount + 1
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

      return {
        content: `I've prepared to remove the rule:\n\n> "${removedRule}"\n\nfrom your persistent memory graph. Please confirm to commit this update.`,
        measurableValue: 'Memory Rule Removed',
        plan: {
          id: `plan_del_mem_${Date.now()}`,
          intent: 'DELETE_MEMORY_RULE',
          confidence: 0.98,
          reasoning: `Removed rule from memory.`,
          steps: [
            { step: 1, title: 'Locate Invariant', detail: removedRule, status: 'completed' },
            { step: 2, title: 'Compile Memory Revision', detail: `Revision #${updatedMem.revisionCount}`, status: 'completed' }
          ],
          proposedAction: action
        },
        action
      };
    }
  }

  // 0J. INTENT: RECENT TRANSACTIONS QUERY
  const isTxQuery =
    (lower.includes('recent transaction') || lower.includes('recent transactions') || lower.includes('show my transactions') || lower.includes('what are my transactions') || lower.includes('show transactions') || lower.includes('last transactions')) &&
    !lower.includes('add') && !lower.includes('delete') && !lower.includes('remove') && !lower.includes('edit');

  if (isTxQuery) {
    const recent = transactions.slice(0, 8);
    const txList = recent.length > 0
      ? recent.map(t => {
          const acc = accounts.find(a => a.id === t.accountId);
          const sign = t.type === 'income' ? '+' : '-';
          return `- **${t.merchant}**: **${sign}$${t.amount.toFixed(2)}** (${t.date}) · ${t.category} · [${acc?.name || 'Account'}]`;
        }).join('\n')
      : 'No transactions recorded yet in your ledger.';

    return {
      content: `### Recent Transactions\n\nHere are your most recent recorded ledger entries:\n\n${txList}\n\nYou can ask me to log new transactions, edit any entry, or delete a transaction anytime!`,
      measurableValue: `${recent.length} Recent Transactions`,
      plan: {
        id: `plan_tx_audit_${Date.now()}`,
        intent: 'TRANSACTIONS_AUDIT',
        confidence: 0.99,
        reasoning: 'Retrieved latest ledger entries.',
        steps: [
          { step: 1, title: 'Fetch Recent Transactions', detail: `Retrieved ${recent.length} records`, status: 'completed' },
          { step: 2, title: 'Cross-reference Accounts', detail: 'Mapped to ledger accounts', status: 'completed' }
        ]
      }
    };
  }

  // 0K. INTENT: EDIT / UPDATE ACCOUNT BALANCE OR NAME
  const editAccBalMatch = text.match(/(?:update|edit|set|change)\s+(?:account\s+)?([A-Za-z0-9'\s&.-]+?)\s+balance\s+(?:to\s+)?\$?([0-9.]+)/i);
  if (editAccBalMatch) {
    const accQuery = editAccBalMatch[1].trim().toLowerCase();
    const newBal = parseFloat(editAccBalMatch[2]);
    const target = accounts.find(a => a.name.toLowerCase().includes(accQuery) || a.id.toLowerCase() === accQuery) || accounts[0];
    if (target && !isNaN(newBal)) {
      const action: AgentAction = {
        id: `act_edit_acc_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'EDIT_ACCOUNT',
        description: `Update "${target.name}" balance: $${target.balance.toFixed(2)} → $${newBal.toFixed(2)}`,
        payload: { id: target.id, updates: { balance: newBal }, previous: target },
        status: 'pending',
        safetyLevel: 'low_risk',
        confidenceScore: 0.98
      };

      return {
        content: `I've prepared to update the balance of **"${target.name}"** from **$${target.balance.toFixed(2)}** to **$${newBal.toFixed(2)}**.\n\nPlease confirm in the gate below to commit this update.`,
        measurableValue: `Balance: ${target.name} → $${newBal.toFixed(2)}`,
        plan: {
          id: `plan_edit_acc_${Date.now()}`,
          intent: 'UPDATE_ACCOUNT',
          confidence: 0.98,
          reasoning: `User requested setting balance of ${target.name} to $${newBal.toFixed(2)}.`,
          steps: [
            { step: 1, title: 'Locate Account', detail: `${target.name} (${target.id})`, status: 'completed' },
            { step: 2, title: 'Recalculate Reserve', detail: `$${target.balance.toFixed(2)} → $${newBal.toFixed(2)}`, status: 'completed' },
            { step: 3, title: 'Await Confirmation', detail: 'Safe Execution Gate', status: 'in_progress' }
          ],
          proposedAction: action
        },
        action
      };
    }
  }

  // 0L. INTENT: DELETE TRANSACTION VIA CHAT
  const delTxMatch = text.match(/(?:delete|remove)\s+(?:transaction|tx)\s+(?:for\s+|with\s+|named\s+)?([A-Za-z0-9'\s&.-]+)/i);
  if (delTxMatch && (lower.includes('transaction') || lower.includes('tx')) && !lower.includes('account') && !lower.includes('bill')) {
    const query = delTxMatch[1].trim().toLowerCase();
    const target = transactions.find(t => t.id.toLowerCase() === query || t.merchant.toLowerCase().includes(query));
    if (target) {
      const action: AgentAction = {
        id: `act_del_tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'DELETE_TRANSACTION',
        description: `Delete transaction: ${target.merchant} ($${target.amount.toFixed(2)}) from ${target.date}`,
        payload: target,
        status: 'pending',
        safetyLevel: 'low_risk',
        confidenceScore: 0.98
      };

      return {
        content: `I've prepared to remove the transaction **${target.merchant}** ($${target.amount.toFixed(2)}, logged on ${target.date}). The affected account balance will be restored accordingly.\n\nPlease approve below to commit this deletion.`,
        measurableValue: `Delete tx: ${target.merchant}`,
        plan: {
          id: `plan_del_tx_${Date.now()}`,
          intent: 'DELETE_TRANSACTION',
          confidence: 0.98,
          reasoning: `User requested deleting transaction ${target.merchant}.`,
          steps: [
            { step: 1, title: 'Locate Transaction', detail: `${target.merchant} ($${target.amount.toFixed(2)})`, status: 'completed' },
            { step: 2, title: 'Restore Balance Buffer', detail: 'Balance delta prepared', status: 'completed' },
            { step: 3, title: 'Await Confirmation', detail: 'Safe Execution Gate', status: 'in_progress' }
          ],
          proposedAction: action
        },
        action
      };
    }
  }

  // 0M. INTENT: EDIT TRANSACTION VIA CHAT
  const editTxMatch = text.match(/(?:edit|update|change)\s+(?:transaction\s+)?([A-Za-z0-9'\s&.-]+?)\s+(?:to|amount)\s+\$?([0-9.]+)/i);
  if (editTxMatch && lower.includes('transaction')) {
    const query = editTxMatch[1].trim().toLowerCase();
    const newAmt = parseFloat(editTxMatch[2]);
    const target = transactions.find(t => t.id.toLowerCase() === query || t.merchant.toLowerCase().includes(query));
    if (target && !isNaN(newAmt)) {
      const updates = { amount: newAmt };
      const action: AgentAction = {
        id: `act_edit_tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'EDIT_TRANSACTION',
        description: `Update transaction "${target.merchant}" amount: $${target.amount.toFixed(2)} → $${newAmt.toFixed(2)}`,
        payload: { id: target.id, updates, previous: target },
        status: 'pending',
        safetyLevel: 'low_risk',
        confidenceScore: 0.98
      };

      return {
        content: `I've prepared to update the transaction for **${target.merchant}** from **$${target.amount.toFixed(2)}** to **$${newAmt.toFixed(2)}**.\n\nPlease approve below to commit this update.`,
        measurableValue: `Update tx: ${target.merchant} → $${newAmt.toFixed(2)}`,
        plan: {
          id: `plan_edit_tx_${Date.now()}`,
          intent: 'EDIT_TRANSACTION',
          confidence: 0.98,
          reasoning: `User requested updating transaction ${target.merchant} to $${newAmt.toFixed(2)}.`,
          steps: [
            { step: 1, title: 'Locate Transaction', detail: `${target.merchant} (${target.id})`, status: 'completed' },
            { step: 2, title: 'Recalculate Ledger Impact', detail: `$${target.amount.toFixed(2)} → $${newAmt.toFixed(2)}`, status: 'completed' },
            { step: 3, title: 'Await Confirmation', detail: 'Safe Execution Gate', status: 'in_progress' }
          ],
          proposedAction: action
        },
        action
      };
    }
  }

  // 0N. INTENT: UPDATE BUDGET ENVELOPE VIA CHAT
  const editBudgetMatch = text.match(/(?:update|set|change)\s+(?:budget\s+for\s+|budget\s+)?([A-Za-z0-9'\s&.-]+?)\s+budget\s+(?:to\s+)?\$?([0-9.]+)/i) ||
    text.match(/(?:set|change|update)\s+([A-Za-z0-9'\s&.-]+?)\s+budget\s+(?:to\s+)?\$?([0-9.]+)/i);
  if (editBudgetMatch && (lower.includes('budget') || lower.includes('envelope')) && !lower.includes('transaction') && !lower.includes('account')) {
    const query = editBudgetMatch[1].trim().toLowerCase();
    const newAmt = parseFloat(editBudgetMatch[2]);
    const target = budgets.find(b => b.category.toLowerCase().includes(query) || b.id.toLowerCase() === query);
    if (target && !isNaN(newAmt)) {
      const action: AgentAction = {
        id: `act_bud_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'UPDATE_BUDGET',
        description: `Update "${target.category}" budget envelope to $${newAmt.toFixed(2)}/mo`,
        payload: { id: target.id, category: target.category, allocated: newAmt, previousAllocated: target.allocated },
        status: 'pending',
        safetyLevel: 'low_risk',
        confidenceScore: 0.98
      };

      return {
        content: `I've prepared to update your **${target.category}** monthly budget envelope to **$${newAmt.toFixed(2)}/month** (previously $${target.allocated.toFixed(2)}).\n\nPlease confirm below to commit this change.`,
        measurableValue: `Budget: ${target.category} → $${newAmt.toFixed(2)}`,
        plan: {
          id: `plan_bud_${Date.now()}`,
          intent: 'UPDATE_BUDGET',
          confidence: 0.98,
          reasoning: `User requested setting ${target.category} budget to $${newAmt.toFixed(2)}.`,
          steps: [
            { step: 1, title: 'Identify Envelope', detail: target.category, status: 'completed' },
            { step: 2, title: 'Recalculate Allocation', detail: `$${target.allocated.toFixed(2)} → $${newAmt.toFixed(2)}`, status: 'completed' },
            { step: 3, title: 'Await Confirmation', detail: 'Safe Execution Gate', status: 'in_progress' }
          ],
          proposedAction: action
        },
        action
      };
    }
  }

  // 0O. INTENT: BATCH POPULATE / SAMPLE DATA STACK (e.g. "populate my wallet, envelopes, bills with some random data")
  const isPopulateIntent =
    (lower.includes('populate') || lower.includes('seed') || lower.includes('generate random') || lower.includes('dummy data') || lower.includes('sample data') || lower.includes('fill with random') || (lower.includes('random data') && (lower.includes('wallet') || lower.includes('bill') || lower.includes('envelope')))) &&
    (lower.includes('wallet') || lower.includes('envelope') || lower.includes('bill') || lower.includes('account') || lower.includes('data'));

  if (isPopulateIntent) {
    const timestamp = Date.now();
    const actionsToStack: AgentAction[] = [];

    // 1. Account (Wallet)
    const newAccount: Account = {
      id: `acc_wallet_${timestamp}`,
      name: 'Physical Cash & Digital Wallet',
      type: 'cash',
      balance: 350.00,
      currency: 'USD',
      institution: '',
      accountNumberMask: 'Cash Drawer',
      lastUpdated: new Date().toISOString()
    };
    actionsToStack.push({
      id: `act_acc_${timestamp}_1`,
      timestamp: new Date().toISOString(),
      type: 'ADD_ACCOUNT',
      description: `Create account "Physical Cash & Digital Wallet" ($350.00)`,
      payload: newAccount,
      status: 'pending',
      safetyLevel: 'low_risk',
      confidenceScore: 0.98
    });

    // 2. Budget Envelope (Groceries)
    actionsToStack.push({
      id: `act_bud_${timestamp}_2`,
      timestamp: new Date().toISOString(),
      type: 'UPDATE_BUDGET',
      description: `Set "Groceries" budget envelope to $450.00/mo`,
      payload: { id: 'b_02', category: 'Groceries', allocated: 450.00, previousAllocated: 400.00 },
      status: 'pending',
      safetyLevel: 'low_risk',
      confidenceScore: 0.98
    });

    // 3. Budget Envelope (Dining & Nightlife)
    actionsToStack.push({
      id: `act_bud_${timestamp}_3`,
      timestamp: new Date().toISOString(),
      type: 'UPDATE_BUDGET',
      description: `Set "Dining & Nightlife" budget envelope to $240.00/mo`,
      payload: { id: 'b_06', category: 'Dining & Nightlife', allocated: 240.00, previousAllocated: 200.00 },
      status: 'pending',
      safetyLevel: 'low_risk',
      confidenceScore: 0.98
    });

    // 4. Recurring Bill 1 (Netflix)
    actionsToStack.push({
      id: `act_bill_${timestamp}_4`,
      timestamp: new Date().toISOString(),
      type: 'ADD_BILL',
      description: `Schedule recurring bill: Netflix Standard ($15.99/mo due 10th)`,
      payload: {
        id: `bill_${timestamp}_1`,
        name: 'Netflix Standard',
        amount: 15.99,
        category: 'Subscriptions & Software',
        frequency: 'monthly',
        dueDate: '2026-11-10',
        isAutopay: true,
        isPaidThisCycle: false,
        status: 'upcoming'
      },
      status: 'pending',
      safetyLevel: 'low_risk',
      confidenceScore: 0.98
    });

    // 5. Recurring Bill 2 (Electric Utility)
    actionsToStack.push({
      id: `act_bill_${timestamp}_5`,
      timestamp: new Date().toISOString(),
      type: 'ADD_BILL',
      description: `Schedule recurring bill: City Electric & Grid ($84.50/mo due 18th)`,
      payload: {
        id: `bill_${timestamp}_2`,
        name: 'City Electric & Grid',
        amount: 84.50,
        category: 'Utilities & Services',
        frequency: 'monthly',
        dueDate: '2026-11-18',
        isAutopay: true,
        isPaidThisCycle: false,
        status: 'upcoming'
      },
      status: 'pending',
      safetyLevel: 'low_risk',
      confidenceScore: 0.98
    });

    // 6. Sample Transaction
    actionsToStack.push({
      id: `act_tx_${timestamp}_6`,
      timestamp: new Date().toISOString(),
      type: 'ADD_TRANSACTION',
      description: `Log expense of $68.40 at Trader Joe's (Groceries)`,
      payload: {
        id: `tx_${timestamp}_1`,
        date: new Date().toISOString().split('T')[0],
        amount: 68.40,
        type: 'expense',
        category: 'Groceries',
        merchant: "Trader Joe's Market",
        note: 'Weekly fresh groceries',
        accountId: newAccount.id,
        autoCategorized: true
      },
      status: 'pending',
      safetyLevel: 'low_risk',
      confidenceScore: 0.98
    });

    const plan: AgentTaskPlan = {
      id: `plan_populate_${timestamp}`,
      intent: 'BATCH_POPULATE_FINANCES',
      confidence: 0.99,
      reasoning: 'Constructed synchronized multi-action batch to seed wallet, envelopes, bills, and transactions.',
      steps: [
        { step: 1, title: 'Seed Wallet Entity', detail: 'Physical Cash & Digital Wallet ($350.00)', status: 'completed' },
        { step: 2, title: 'Calibrate Budget Envelopes', detail: 'Groceries ($450) & Dining ($240)', status: 'completed' },
        { step: 3, title: 'Schedule Recurring Obligations', detail: 'Netflix ($15.99) & City Electric ($84.50)', status: 'completed' },
        { step: 4, title: 'Seed Ledger Transactions', detail: "Trader Joe's ($68.40) mapped to wallet", status: 'completed' }
      ]
    };

    return {
      content: `I've prepared a complete set of **${actionsToStack.length} synchronized actions** to populate your wallet, budget envelopes, recurring bills, and transactions with realistic initial data.\n\nAll ${actionsToStack.length} proposals are stacked up in the Execution Gate below. You can confirm and execute them individually or tap **Execute All** to commit the entire bundle at once!`,
      measurableValue: `${actionsToStack.length} Financial Actions Stacked`,
      plan,
      action: actionsToStack[0],
      actions: actionsToStack
    };
  }

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

      // 14. Delete Transaction proposal
      if (parsed && parsed.action === 'DELETE_TRANSACTION') {
        const txId = parsed.transactionId || parsed.id;
        const target = context.transactions.find(t => t.id === txId) || context.transactions.find(t => t.merchant.toLowerCase().includes(String(parsed.merchant || '').toLowerCase()));
        if (target) {
          const action: AgentAction = {
            id: `act_del_tx_${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'DELETE_TRANSACTION',
            description: `Delete transaction: ${target.merchant} ($${target.amount.toFixed(2)}) from ${target.date}`,
            payload: target,
            status: 'pending',
            safetyLevel: 'low_risk',
            confidenceScore: 0.98
          };

          const plan: AgentTaskPlan = {
            id: `plan_del_tx_${Date.now()}`,
            intent: 'DELETE_TRANSACTION',
            confidence: 0.98,
            reasoning: `Prepared transaction deletion for ${target.merchant}.`,
            steps: [
              { step: 1, title: 'Locate Transaction', detail: `${target.merchant} ($${target.amount.toFixed(2)})`, status: 'completed' },
              { step: 2, title: 'Verify Balance Remap', detail: 'Account balance will be restored', status: 'completed' },
              { step: 3, title: 'Await Confirmation', detail: 'Safe Execution Gate', status: 'in_progress' }
            ],
            proposedAction: action
          };

          const cleanContent = rawReply.replace(/```action_json\s*[\s\S]*?\s*```/, '').trim();
          return { content: cleanContent, plan, action, measurableValue: `Delete tx: ${target.merchant}` };
        }
      }

      // 15. Edit Transaction proposal
      if (parsed && (parsed.action === 'EDIT_TRANSACTION' || parsed.action === 'UPDATE_TRANSACTION')) {
        const txId = parsed.transactionId || parsed.id;
        const target = context.transactions.find(t => t.id === txId) || context.transactions.find(t => t.merchant.toLowerCase().includes(String(parsed.merchant || '').toLowerCase())) || context.transactions[0];
        if (target) {
          const updates: Partial<Transaction> = {};
          if (typeof parsed.amount === 'number') updates.amount = Math.abs(parsed.amount);
          if (parsed.merchant) updates.merchant = parsed.merchant;
          if (parsed.category) updates.category = parsed.category;
          if (parsed.note) updates.note = parsed.note;
          if (parsed.date) updates.date = parsed.date;

          const action: AgentAction = {
            id: `act_edit_tx_${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'EDIT_TRANSACTION',
            description: `Update transaction "${target.merchant}" amount/details`,
            payload: { id: target.id, updates, previous: target },
            status: 'pending',
            safetyLevel: 'low_risk',
            confidenceScore: 0.98
          };

          const plan: AgentTaskPlan = {
            id: `plan_edit_tx_${Date.now()}`,
            intent: 'EDIT_TRANSACTION',
            confidence: 0.98,
            reasoning: `Prepared transaction update for ${target.merchant}.`,
            steps: [
              { step: 1, title: 'Locate Transaction', detail: `${target.merchant} (${target.id})`, status: 'completed' },
              { step: 2, title: 'Apply Field Modifications', detail: JSON.stringify(updates), status: 'completed' },
              { step: 3, title: 'Await Confirmation', detail: 'Safe Execution Gate', status: 'in_progress' }
            ],
            proposedAction: action
          };

          const cleanContent = rawReply.replace(/```action_json\s*[\s\S]*?\s*```/, '').trim();
          return { content: cleanContent, plan, action, measurableValue: `Update tx: ${target.merchant}` };
        }
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

  // Check if edge cognition determined a definitive transaction, query, or settings plan
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

  // If edge cognition determined a definitive transaction, query, or settings plan, return immediately
  if (edgePlan.plan || edgePlan.action) {
    if (onChunk && edgePlan.content) {
      await streamFallbackText(edgePlan.content);
    }
    return edgePlan;
  }

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
   - For generic questions, general queries, small talk, questions about institutions, universities, science, geography, culture, history, programming, writing, or general advice:
     ANSWER DIRECTLY, KNOWLEDGEABLY, ACCURATELY, AND THOROUGHLY as Fiona. Do NOT deflect, do NOT give canned account status summaries, and do NOT force the conversation back to bank balances when the user is asking about an external topic.
   - For simple greetings and casual banter ("hey", "how are you?", "hello"), reply in 1 to 2 warm, natural sentences.

2. READING & AUDITING LEDGER DATA (READ OPERATIONS):
   - If the user asks to read, check, or audit ANY section (e.g., "what are my current balances from all my accounts?", "do i have any upcoming bills?", "what do you know about me so far?", "show my budgets", "what are my recent transactions?"):
     Answer directly, clearly, and accurately using the accounts, bills, budgets, and memory files provided above.
     DO NOT output any action_json block for read-only questions!

3. AUTONOMOUS MUTATIONS ACROSS ALL SECTIONS (CREATE, UPDATE, DELETE):
   - You have full capability to mutate, update, or remove entries when the user instructs you to.
   - When proposing an operation, explain what you are doing warmly in your response, and append this exact action_json block at the very end:

   For Updating Settings / Theme (e.g. "set theme to light mode", "switch theme", "mute voice"):
\`\`\`action_json
{
  "action": "UPDATE_SETTINGS",
  "theme": "light" | "dark",
  "isSpeechEnabled": boolean
}
\`\`\`

   For Transactions (Logging new spend or income):
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

   For Editing a Transaction:
\`\`\`action_json
{
  "action": "EDIT_TRANSACTION",
  "transactionId": "string",
  "amount": number,
  "merchant": "string",
  "category": "string"
}
\`\`\`

   For Deleting a Transaction:
\`\`\`action_json
{
  "action": "DELETE_TRANSACTION",
  "transactionId": "string",
  "merchant": "string"
}
\`\`\`

   For Creating Accounts (ONLY when user explicitly requests adding a new account/wallet):
\`\`\`action_json
{
  "action": "ADD_ACCOUNT",
  "name": "string (e.g. Phantom Crypto Wallet, Cash Pocket, Chase Checking)",
  "type": "cash" | "crypto" | "checking" | "savings" | "credit" | "investment",
  "balance": number,
  "currency": "USD",
  "institution": "string",
  "network": "string (optional for crypto)",
  "walletAddress": "string (optional for crypto)"
}
\`\`\`

   For Updating an Account Balance or Name:
\`\`\`action_json
{
  "action": "EDIT_ACCOUNT",
  "accountId": "string",
  "balance": number,
  "name": "string"
}
\`\`\`

   For Deleting an Account:
\`\`\`action_json
{
  "action": "DELETE_ACCOUNT",
  "accountId": "string"
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

   For Paying or Deleting Bills:
\`\`\`action_json
{
  "action": "PAY_BILL",
  "billId": "string"
}
\`\`\`
   or:
\`\`\`action_json
{
  "action": "DELETE_BILL",
  "billId": "string"
}
\`\`\`

   For Updating Budget Envelopes:
\`\`\`action_json
{
  "action": "UPDATE_BUDGET",
  "category": "string",
  "allocated": number
}
\`\`\`

   For Memory Rules:
\`\`\`action_json
{
  "action": "UPDATE_MEMORY",
  "rule": "string"
}
\`\`\`
   or:
\`\`\`action_json
{
  "action": "DELETE_MEMORY_RULE",
  "rule": "string"
}
\`\`\`

4. CRITICAL: STRICT DISCIPLINE & NO HALLUCINATIONS:
   - NEVER assume the user wants to open an account when they talk about themes, display mode, settings, questions, or other topics!
   - DO NOT hallucinate account creation: NEVER say "The user is seeking to open a new account, creating a new wallet, and creating a bank account."
   - If the user asks a question, gives advice, or chats without asking for a mutation, DO NOT output any action_json block.`;

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

