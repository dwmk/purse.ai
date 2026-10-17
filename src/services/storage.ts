import {
  Account,
  Bill,
  BudgetEnvelope,
  ChatMessage,
  ConversationSession,
  ExpenseCategory,
  MemoryFile,
  Transaction,
  LLMConfig,
  AgentAction
} from '../types/finance';

const STORAGE_KEYS = {
  ACCOUNTS: 'purse_accounts_v1',
  TRANSACTIONS: 'purse_transactions_v1',
  BILLS: 'purse_bills_v1',
  BUDGETS: 'purse_budgets_v1',
  MEMORY: 'purse_memory_v1',
  CHAT: 'purse_chat_v1',
  CONVERSATIONS: 'purse_conversations_v2',
  ACTIONS: 'purse_actions_v1',
  CONFIG: 'purse_config_v1',
  THEME: 'purse_theme_v1'
};

// Legacy keys for fallback migration
const LEGACY_KEYS: Record<string, string> = {
  ACCOUNTS: 'kitefi_accounts_v1',
  TRANSACTIONS: 'kitefi_transactions_v1',
  BILLS: 'kitefi_bills_v1',
  BUDGETS: 'kitefi_budgets_v1',
  MEMORY: 'kitefi_memory_v1',
  CHAT: 'kitefi_chat_v1',
  CONVERSATIONS: 'purse_conversations_v1',
  ACTIONS: 'kitefi_actions_v1',
  CONFIG: 'kitefi_config_v1',
  THEME: 'kitefi_theme_v1'
};

// Initial realistic accounts
export const SEED_ACCOUNTS: Account[] = [
  {
    id: 'acc_chk_01',
    name: 'Primary Operating Checking',
    type: 'checking',
    balance: 3840.50,
    currency: 'USD',
    institution: 'Chase Bank',
    accountNumberMask: '•••• 4192',
    lastUpdated: '2026-10-16T08:00:00Z'
  },
  {
    id: 'acc_hysa_02',
    name: 'High-Yield Emergency Vault',
    type: 'savings',
    balance: 14250.00,
    currency: 'USD',
    institution: 'Marcus by Goldman Sachs',
    accountNumberMask: '•••• 8821',
    lastUpdated: '2026-10-15T12:00:00Z'
  },
  {
    id: 'acc_cc_03',
    name: 'Daily Cash Rewards Card',
    type: 'credit',
    balance: -842.15,
    currency: 'USD',
    institution: 'Apple Card / Goldman',
    accountNumberMask: '•••• 1044',
    lastUpdated: '2026-10-16T07:30:00Z'
  },
  {
    id: 'acc_inv_04',
    name: 'Taxable Index Portfolio',
    type: 'investment',
    balance: 28450.00,
    currency: 'USD',
    institution: 'Vanguard',
    accountNumberMask: '•••• 6730',
    lastUpdated: '2026-10-14T20:00:00Z'
  }
];

// Initial realistic transactions
export const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_01',
    date: '2026-10-15',
    amount: 114.80,
    type: 'expense',
    category: 'Groceries',
    merchant: 'Trader Joe\'s',
    note: 'Weekly provisions, fresh produce, bulk oats',
    accountId: 'acc_chk_01',
    autoCategorized: true
  },
  {
    id: 'tx_02',
    date: '2026-10-15',
    amount: 42.50,
    type: 'expense',
    category: 'Dining & Nightlife',
    merchant: 'Ramen Tatsu-Ya',
    note: 'Dinner with coworkers',
    accountId: 'acc_cc_03',
    autoCategorized: true
  },
  {
    id: 'tx_03',
    date: '2026-10-14',
    amount: 68.20,
    type: 'expense',
    category: 'Transportation & Fuel',
    merchant: 'Chevron Fuel Station',
    note: 'Full tank unleaded',
    accountId: 'acc_cc_03',
    autoCategorized: true
  },
  {
    id: 'tx_04',
    date: '2026-10-13',
    amount: 15.99,
    type: 'expense',
    category: 'Subscriptions & Software',
    merchant: 'Netflix Standard HD',
    note: 'Monthly streaming plan',
    accountId: 'acc_chk_01',
    autoCategorized: true
  },
  {
    id: 'tx_05',
    date: '2026-10-12',
    amount: 79.99,
    type: 'expense',
    category: 'Utilities & Services',
    merchant: 'Spectrum Fiber Internet',
    note: 'Gigabit home fiber connection',
    accountId: 'acc_chk_01',
    autoCategorized: true
  },
  {
    id: 'tx_06',
    date: '2026-10-10',
    amount: 2850.00,
    type: 'income',
    category: 'Other',
    merchant: 'Stripe Engineering Payout',
    note: 'Semi-monthly bi-weekly salary direct deposit',
    accountId: 'acc_chk_01'
  },
  {
    id: 'tx_07',
    date: '2026-10-09',
    amount: 1850.00,
    type: 'expense',
    category: 'Housing & Rent',
    merchant: 'Metropolitan Property Mgmt',
    note: 'October 2026 Apartment Rent',
    accountId: 'acc_chk_01'
  },
  {
    id: 'tx_08',
    date: '2026-10-08',
    amount: 34.00,
    type: 'expense',
    category: 'Health & Wellness',
    merchant: 'Equinox Gym / ClassPass',
    note: 'Drop-in fitness session',
    accountId: 'acc_cc_03'
  },
  {
    id: 'tx_09',
    date: '2026-10-06',
    amount: 89.40,
    type: 'expense',
    category: 'Groceries',
    merchant: 'Whole Foods Market',
    note: 'Organic items & pantry refill',
    accountId: 'acc_cc_03'
  },
  {
    id: 'tx_10',
    date: '2026-10-05',
    amount: 22.00,
    type: 'expense',
    category: 'Subscriptions & Software',
    merchant: 'GitHub Copilot Pro',
    note: 'Annual developer assistant monthly billing',
    accountId: 'acc_cc_03'
  },
  {
    id: 'tx_11',
    date: '2026-10-04',
    amount: 600.00,
    type: 'transfer',
    category: 'Savings & Investments',
    merchant: 'Marcus HYSA Auto-Transfer',
    note: 'Scheduled monthly savings allocation',
    accountId: 'acc_chk_01'
  },
  {
    id: 'tx_12',
    date: '2026-10-02',
    amount: 19.50,
    type: 'expense',
    category: 'Dining & Nightlife',
    merchant: 'Blue Bottle Coffee',
    note: 'Beans bag & single origin pour-over',
    accountId: 'acc_cc_03'
  },
  {
    id: 'tx_13',
    date: '2026-09-28',
    amount: 142.10,
    type: 'expense',
    category: 'Utilities & Services',
    merchant: 'Austin Energy Electric Co.',
    note: 'September power bill',
    accountId: 'acc_chk_01'
  },
  {
    id: 'tx_14',
    date: '2026-09-25',
    amount: 2850.00,
    type: 'income',
    category: 'Other',
    merchant: 'Stripe Engineering Payout',
    note: 'Mid-September direct deposit',
    accountId: 'acc_chk_01'
  },
  {
    id: 'tx_15',
    date: '2026-09-22',
    amount: 58.00,
    type: 'expense',
    category: 'Entertainment & Leisure',
    merchant: 'Alamo Drafthouse Cinema',
    note: 'Weekend tickets & food',
    accountId: 'acc_cc_03'
  }
];

// Initial realistic recurring bills
export const SEED_BILLS: Bill[] = [
  {
    id: 'bill_01',
    name: 'Apartment Lease Rent',
    amount: 1850.00,
    category: 'Housing & Rent',
    frequency: 'monthly',
    dueDate: '2026-11-01',
    isAutopay: true,
    isPaidThisCycle: true,
    status: 'upcoming',
    notes: 'ACH Direct Debit from Primary Checking'
  },
  {
    id: 'bill_02',
    name: 'City Electric & Power Utility',
    amount: 135.40,
    category: 'Utilities & Services',
    frequency: 'monthly',
    dueDate: '2026-10-20',
    isAutopay: false,
    isPaidThisCycle: false,
    status: 'due',
    notes: 'Due in 4 days. Estimated from meter reading.'
  },
  {
    id: 'bill_03',
    name: 'Spectrum Fiber Gigabit',
    amount: 79.99,
    category: 'Utilities & Services',
    frequency: 'monthly',
    dueDate: '2026-11-12',
    isAutopay: true,
    isPaidThisCycle: true,
    status: 'upcoming'
  },
  {
    id: 'bill_04',
    name: 'GEICO Auto & Comprehensive',
    amount: 142.00,
    category: 'Transportation & Fuel',
    frequency: 'monthly',
    dueDate: '2026-10-26',
    isAutopay: true,
    isPaidThisCycle: false,
    status: 'upcoming',
    notes: 'Coverage renewal in 10 days'
  },
  {
    id: 'bill_05',
    name: 'Blue Cross Health & Dental Premium',
    amount: 320.00,
    category: 'Health & Wellness',
    frequency: 'monthly',
    dueDate: '2026-11-01',
    isAutopay: true,
    isPaidThisCycle: true,
    status: 'upcoming'
  },
  {
    id: 'bill_06',
    name: 'Netflix Standard HD',
    amount: 15.99,
    category: 'Subscriptions & Software',
    frequency: 'monthly',
    dueDate: '2026-11-13',
    isAutopay: true,
    isPaidThisCycle: true,
    status: 'upcoming',
    potentialSavingsNotice: 'Duplicate streaming detected: Hulu + Disney bundle active on card'
  },
  {
    id: 'bill_07',
    name: 'Hulu + Disney Bundle',
    amount: 19.99,
    category: 'Subscriptions & Software',
    frequency: 'monthly',
    dueDate: '2026-10-24',
    isAutopay: true,
    isPaidThisCycle: false,
    status: 'upcoming',
    potentialSavingsNotice: 'Audit recommendation: Consolidate or pause streaming tier ($240/yr value)'
  },
  {
    id: 'bill_08',
    name: 'Adobe Creative Cloud',
    amount: 54.99,
    category: 'Subscriptions & Software',
    frequency: 'monthly',
    dueDate: '2026-10-29',
    isAutopay: true,
    isPaidThisCycle: false,
    status: 'upcoming',
    notes: 'Check usage telemetry: last opened 42 days ago'
  }
];

// Initial realistic budget envelopes (50/30/20 principle tailored with Purse palette)
export const SEED_BUDGETS: BudgetEnvelope[] = [
  { id: 'b_01', category: 'Housing & Rent', type: 'need', allocated: 1850.00, color: '#8A7EA4' },
  { id: 'b_02', category: 'Groceries', type: 'need', allocated: 550.00, color: '#B59DD1' },
  { id: 'b_03', category: 'Utilities & Services', type: 'need', allocated: 280.00, color: '#C794B0' },
  { id: 'b_04', category: 'Transportation & Fuel', type: 'need', allocated: 260.00, color: '#8A7EA4' },
  { id: 'b_05', category: 'Health & Wellness', type: 'need', allocated: 400.00, color: '#B59DD1' },
  { id: 'b_06', category: 'Dining & Nightlife', type: 'want', allocated: 380.00, color: '#F3ACB4' },
  { id: 'b_07', category: 'Entertainment & Leisure', type: 'want', allocated: 200.00, color: '#F9BBAE' },
  { id: 'b_08', category: 'Subscriptions & Software', type: 'want', allocated: 160.00, color: '#C794B0' },
  { id: 'b_09', category: 'Shopping & Goods', type: 'want', allocated: 250.00, color: '#F3ACB4' },
  { id: 'b_10', category: 'Savings & Investments', type: 'savings', allocated: 1200.00, color: '#8A7EA4' },
  { id: 'b_11', category: 'Other', type: 'want', allocated: 170.00, color: '#B59DD1' }
];

// Initial realistic persistent memory file
export const SEED_MEMORY_MARKDOWN = `# PURSE AUTONOMOUS AGENT PERSISTENT MEMORY FILE
# Mode: Decentralized Local-First Edge Storage
# Format: Compact Financial Knowledge Graph & Operating Invariants

## 1. USER PROFILE & BASE INVARIANTS
- Monthly Net Inflow: $5,700.00 (Semi-monthly $2,850 on 10th and 25th)
- Next Payday: 2026-10-25
- Emergency Fund Vault Target: $15,000.00 (Current: $14,250.00, 95% complete)
- Operating Checking Liquidity Floor: $1,200.00 (Never allow checking balance to drop below this before upcoming bills)
- Monthly Target Savings Rate: 21.0% ($1,200/month into HYSA + Vanguard Index)
- Primary Currency: USD

## 2. ACTIVE BEHAVIORAL RULES & USER PREFERENCES
- RULE_01 [STRICT]: Always evaluate safe-to-spend headroom before confirming non-essential transactions > $50.00.
- RULE_02 [STRICT]: If checking balance minus pending bills scheduled before the 25th is < $1,200, flag an immediate Liquidity Warning.
- RULE_03 [PREFERENCE]: Prefers dining out expenditures to stay under $95.00 per week.
- RULE_04 [CONSERVATIVE]: Zero credit card balance carried month-to-month. Full auto-pay clearance on statement date.
- RULE_05 [AUDIT]: Flag subscriptions that have not been logged or mentioned in 30+ days.

## 3. DETECTED HABITS & PATTERNS
- HABIT_01: Regular Sunday grocery restock at Trader Joe's (typical basket: $90 - $125).
- HABIT_02: Coffee spend is modest (~$15-$25/week) via local roasters.
- HABIT_03: Tech tooling subscriptions clustered around mid-month.
- HABIT_04: High subscription redundancy between streaming services (Netflix + Hulu/Disney + Apple TV).

## 4. OPEN GOALS & RECOMMENDATIONS
- GOAL_01: Complete $750 remainder of Emergency Fund vault by November 2026.
- ACTION_01: Negotiate Spectrum Fiber to introductory promotional rate ($49.99/mo) or switch.
- ACTION_02: Cancel Adobe Creative Cloud or downgrade to Photography Plan ($9.99/mo) to save $540/year.
`;

export const SEED_MEMORY_FILE: MemoryFile = {
  rawMarkdown: SEED_MEMORY_MARKDOWN,
  profile: {
    monthlyIncome: 5700.00,
    paydayCadence: 'semi-monthly',
    nextPayday: '2026-10-25',
    emergencyFundTarget: 15000.00,
    minimumCheckingFloor: 1200.00,
    savingsRateTargetPercent: 21.0,
    currency: 'USD'
  },
  rules: [
    'Always evaluate safe-to-spend headroom before confirming non-essential transactions > $50.00',
    'Flag immediate Liquidity Warning if checking minus scheduled bills is < $1,200',
    'Prefers dining out expenditures to stay under $95.00 per week',
    'Zero credit card balance carried month-to-month (pay in full)',
    'Flag subscriptions with zero activity for 30+ days'
  ],
  habits: [
    'Regular Sunday grocery restock at Trader Joe\'s ($90-$125 average)',
    'Mid-month software subscription renewals',
    'Consistent 21% monthly savings allocation'
  ],
  constraints: [
    'Car insurance premium due on October 26 ($142.00)',
    'Austin Energy electric bill due on October 20 ($135.40)'
  ],
  unresolvedNotes: [
    'User inquired about canceling Adobe subscription to save $54.99/month',
    'Emergency fund is $750 away from $15,000 milestone'
  ],
  lastUpdated: '2026-10-16T08:00:00Z',
  revisionCount: 14
};

export const SEED_CONFIG: LLMConfig = {
  provider: 'edge', // default browser-based
  model: 'smolLM2-360M-instruct',
  useEdgeFallback: true,
  autoApproveSafeActions: false
};

export const SEED_CONVERSATIONS: ConversationSession[] = [
  {
    id: 'conv_current_1',
    title: "Trader Joe's & Grocery Envelope",
    createdAt: '2026-10-16T09:30:00.000Z',
    updatedAt: '2026-10-16T09:35:00.000Z',
    messages: [
      {
        id: 'msg_welcome',
        sender: 'agent',
        content: 'Hello! I am **Purse**, your personal AI finance assistant. I operate privately in your browser storage with zero cloud tracking. What would you like to log or review today?',
        timestamp: '2026-10-16T09:30:00.000Z'
      },
      {
        id: 'msg_u1',
        sender: 'user',
        content: "Spent $42.50 at Trader Joe's",
        timestamp: '2026-10-16T09:32:00.000Z'
      },
      {
        id: 'msg_a1',
        sender: 'agent',
        content: "I parsed your intent to record **$42.50** for **Trader Joe's** categorized under **Groceries**.\n\n- **Impact:** -$42.50 to Primary Operating Checking\n- **Projected Balance:** $3,798.00\n- **Envelope Headroom:** $297.50 remaining in Groceries\n\nExecution plan ready.",
        timestamp: '2026-10-16T09:32:02.000Z'
      }
    ]
  },
  {
    id: 'conv_oct_14',
    title: 'Cash Runway & Liquidity Stress Test',
    createdAt: '2026-10-14T14:15:00.000Z',
    updatedAt: '2026-10-14T14:18:00.000Z',
    messages: [
      {
        id: 'msg_u_runway',
        sender: 'user',
        content: 'What is my cash runway if my income stops?',
        timestamp: '2026-10-14T14:15:00.000Z'
      },
      {
        id: 'msg_a_runway',
        sender: 'agent',
        content: "### Cash Runway & Liquidity Analysis\n\nBased on your total liquid reserves of **$18,090.50** ($3,840.50 checking + $14,250.00 in HYSA emergency vault) and essential fixed needs of **$3,040.00/month**:\n\n- **Zero-Income Runway:** **6.0 months** (~180 days)\n- **Operating Checking Cushion:** $3,840.50 (Floor: $1,200.00)\n- **Safety Invariant:** Your liquidity exceeds the minimum 3-month survival baseline.",
        timestamp: '2026-10-14T14:15:02.000Z'
      }
    ]
  },
  {
    id: 'conv_sep_28',
    title: 'Subscription Leak & Service Audit',
    createdAt: '2026-09-28T11:00:00.000Z',
    updatedAt: '2026-09-28T11:05:00.000Z',
    messages: [
      {
        id: 'msg_u_audit',
        sender: 'user',
        content: 'Audit recurring subscriptions for leaks and duplicate charges',
        timestamp: '2026-09-28T11:00:00.000Z'
      },
      {
        id: 'msg_a_audit',
        sender: 'agent',
        content: "### Subscription & Recurring Leak Audit\n\nYou currently have **3 active recurring subscriptions** totaling **$92.98/month** ($1,115.76/year):\n\n- **Netflix Standard HD**: $15.99/mo (Due Nov 13)\n- **Hulu + Disney Bundle**: $19.99/mo (Due Oct 24)\n- **Adobe Creative Cloud**: $54.99/mo (Due Oct 29)\n\n**Flagged Leaks:**\n⚠️ *Adobe CC*: Inactive for 42 days. Downgrading or canceling recovers **$54.99/month** ($659.88/year).",
        timestamp: '2026-09-28T11:00:03.000Z'
      }
    ]
  },
  {
    id: 'conv_sep_12',
    title: 'Dining Out Affordability Check',
    createdAt: '2026-09-12T19:40:00.000Z',
    updatedAt: '2026-09-12T19:42:00.000Z',
    messages: [
      {
        id: 'msg_u_dining',
        sender: 'user',
        content: 'Can I afford a $120 dinner out tonight?',
        timestamp: '2026-09-12T19:40:00.000Z'
      },
      {
        id: 'msg_a_dining',
        sender: 'agent',
        content: "### Affordability Evaluation: $120.00 for Dining & Nightlife\n\n- **Envelope Headroom:** $225.00 remaining in Dining & Nightlife.\n- **Checking Cushion:** Checking balance will remain comfortably above your $1,200.00 floor ($3,720.50).\n\n✅ **Approved for Safe Execution**: This expenditure fits your discretionary budget envelope.",
        timestamp: '2026-09-12T19:40:02.000Z'
      }
    ]
  },
  {
    id: 'conv_aug_20',
    title: 'Emergency Vault Invariant Setup',
    createdAt: '2026-08-20T16:10:00.000Z',
    updatedAt: '2026-08-20T16:15:00.000Z',
    messages: [
      {
        id: 'msg_u_inv',
        sender: 'user',
        content: 'Remember that emergency savings target is $15,000 and minimum checking cushion is $1,200',
        timestamp: '2026-08-20T16:10:00.000Z'
      },
      {
        id: 'msg_a_inv',
        sender: 'agent',
        content: "I have updated your **Persistent Memory File** with these baseline invariants:\n\n- **Emergency Vault Target:** $15,000.00\n- **Minimum Checking Cushion Floor:** $1,200.00\n\nThese invariants are committed to your local encrypted memory graph.",
        timestamp: '2026-08-20T16:10:03.000Z'
      }
    ]
  },
  {
    id: 'conv_dec_2025',
    title: '2025 Year-End Savings & Portfolio Review',
    createdAt: '2025-12-30T18:00:00.000Z',
    updatedAt: '2025-12-30T18:10:00.000Z',
    messages: [
      {
        id: 'msg_u_yearend',
        sender: 'user',
        content: 'Summarize 2025 savings rate and investment portfolio allocations',
        timestamp: '2025-12-30T18:00:00.000Z'
      },
      {
        id: 'msg_a_yearend',
        sender: 'agent',
        content: "### 2025 Annual Financial Position Review\n\n- **Annual Savings Rate Achieved:** **21.4%** across high-yield savings and index funds.\n- **Vanguard Index Portfolio Inflow:** +$14,400.00 for the year.\n- **Emergency Vault Progress:** 85% of target attained.\n\nAll operating invariants satisfied throughout 2025.",
        timestamp: '2025-12-30T18:00:04.000Z'
      }
    ]
  }
];

// Storage helper functions
export const StorageService = {
  getItemWithMigration(key: string, legacyKey: string): string | null {
    const val = localStorage.getItem(key);
    if (val) return val;
    const legacyVal = localStorage.getItem(legacyKey);
    if (legacyVal) {
      localStorage.setItem(key, legacyVal);
      return legacyVal;
    }
    return null;
  },

  getAccounts(): Account[] {
    const raw = this.getItemWithMigration(STORAGE_KEYS.ACCOUNTS, LEGACY_KEYS.ACCOUNTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(SEED_ACCOUNTS));
      return SEED_ACCOUNTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return SEED_ACCOUNTS;
    }
  },

  saveAccounts(accounts: Account[]): void {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  },

  getTransactions(): Transaction[] {
    const raw = this.getItemWithMigration(STORAGE_KEYS.TRANSACTIONS, LEGACY_KEYS.TRANSACTIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(SEED_TRANSACTIONS));
      return SEED_TRANSACTIONS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return SEED_TRANSACTIONS;
    }
  },

  saveTransactions(transactions: Transaction[]): void {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  },

  getBills(): Bill[] {
    const raw = this.getItemWithMigration(STORAGE_KEYS.BILLS, LEGACY_KEYS.BILLS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(SEED_BILLS));
      return SEED_BILLS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return SEED_BILLS;
    }
  },

  saveBills(bills: Bill[]): void {
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
  },

  getBudgets(): BudgetEnvelope[] {
    const raw = this.getItemWithMigration(STORAGE_KEYS.BUDGETS, LEGACY_KEYS.BUDGETS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(SEED_BUDGETS));
      return SEED_BUDGETS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return SEED_BUDGETS;
    }
  },

  saveBudgets(budgets: BudgetEnvelope[]): void {
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
  },

  getMemory(): MemoryFile {
    const raw = this.getItemWithMigration(STORAGE_KEYS.MEMORY, LEGACY_KEYS.MEMORY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.MEMORY, JSON.stringify(SEED_MEMORY_FILE));
      return SEED_MEMORY_FILE;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return SEED_MEMORY_FILE;
    }
  },

  saveMemory(memory: MemoryFile): void {
    localStorage.setItem(STORAGE_KEYS.MEMORY, JSON.stringify(memory));
  },

  getChatHistory(): ChatMessage[] {
    const raw = this.getItemWithMigration(STORAGE_KEYS.CHAT, LEGACY_KEYS.CHAT);
    if (!raw) {
      const initialChat: ChatMessage[] = [
        {
          id: 'msg_welcome',
          sender: 'agent',
          content: 'Hello! I am **Purse**, your personal AI finance assistant. I operate privately in your browser storage with zero cloud tracking. What would you like to log or review today?',
          timestamp: new Date().toISOString()
        }
      ];
      localStorage.setItem(STORAGE_KEYS.CHAT, JSON.stringify(initialChat));
      return initialChat;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveChatHistory(messages: ChatMessage[]): void {
    localStorage.setItem(STORAGE_KEYS.CHAT, JSON.stringify(messages));
  },

  getConversations(): ConversationSession[] {
    const raw = this.getItemWithMigration(STORAGE_KEYS.CONVERSATIONS, LEGACY_KEYS.CONVERSATIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(SEED_CONVERSATIONS));
      return SEED_CONVERSATIONS;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      return SEED_CONVERSATIONS;
    } catch {
      return SEED_CONVERSATIONS;
    }
  },

  saveConversations(conversations: ConversationSession[]): void {
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
  },

  getActiveConversationId(): string {
    const saved = localStorage.getItem('purse_active_conv_id');
    if (saved) return saved;
    const convs = this.getConversations();
    return convs[0]?.id || 'conv_current_1';
  },

  saveActiveConversationId(id: string): void {
    localStorage.setItem('purse_active_conv_id', id);
  },

  getActions(): AgentAction[] {
    const raw = this.getItemWithMigration(STORAGE_KEYS.ACTIONS, LEGACY_KEYS.ACTIONS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveActions(actions: AgentAction[]): void {
    localStorage.setItem(STORAGE_KEYS.ACTIONS, JSON.stringify(actions));
  },

  getConfig(): LLMConfig {
    const raw = this.getItemWithMigration(STORAGE_KEYS.CONFIG, LEGACY_KEYS.CONFIG);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(SEED_CONFIG));
      return SEED_CONFIG;
    }
    try {
      return { ...SEED_CONFIG, ...JSON.parse(raw) };
    } catch {
      return SEED_CONFIG;
    }
  },

  saveConfig(config: LLMConfig): void {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  },

  // LIGHT MODE THEME BY DEFAULT as requested
  getTheme(): 'dark' | 'light' {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME) || localStorage.getItem(LEGACY_KEYS.THEME);
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light'; // Default to light mode
  },

  saveTheme(theme: 'dark' | 'light'): void {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  // Calculate total browser storage used
  getStorageUsage(): { bytes: number; formatted: string } {
    let total = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key) || '';
          total += (key.length + val.length) * 2; // UTF-16 approximate bytes
        }
      }
    } catch (e) {
      total = 45000;
    }

    if (total < 1024) return { bytes: total, formatted: `${total} Bytes` };
    if (total < 1024 * 1024) return { bytes: total, formatted: `${(total / 1024).toFixed(1)} KB` };
    return { bytes: total, formatted: `${(total / (1024 * 1024)).toFixed(2)} MB` };
  },

  // Request permanent persistence from browser (no eviction)
  async requestPersistence(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persisted();
        if (isPersisted) return true;
        return await navigator.storage.persist();
      } catch {
        return false;
      }
    }
    return false;
  },

  // Clear All Data Completely (Double-Confirmation target)
  clearAllData(): void {
    // Clear all Purse & legacy storage keys
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    Object.values(LEGACY_KEYS).forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('kitefi_speech_enabled');
    localStorage.removeItem('purse_speech_enabled');
    localStorage.removeItem('purse_active_conv_id');
  },

  // Export entire application state as a single JSON file
  exportAllDataJson(): string {
    const payload = {
      version: '2.1.0',
      exportedAt: new Date().toISOString(),
      app: 'Purse Autonomous Finance',
      accounts: this.getAccounts(),
      transactions: this.getTransactions(),
      bills: this.getBills(),
      budgets: this.getBudgets(),
      memory: this.getMemory(),
      conversations: this.getConversations(),
      actions: this.getActions(),
      config: this.getConfig()
    };
    return JSON.stringify(payload, null, 2);
  },

  // Import JSON backup with validation
  importAllDataJson(jsonString: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonString);
      if (!data.transactions || !Array.isArray(data.transactions)) {
        return { success: false, message: 'Invalid format: missing transactions array.' };
      }
      if (!data.accounts || !Array.isArray(data.accounts)) {
        return { success: false, message: 'Invalid format: missing accounts array.' };
      }

      if (data.accounts) this.saveAccounts(data.accounts);
      if (data.transactions) this.saveTransactions(data.transactions);
      if (data.bills) this.saveBills(data.bills);
      if (data.budgets) this.saveBudgets(data.budgets);
      if (data.memory) this.saveMemory(data.memory);
      if (data.conversations && Array.isArray(data.conversations)) this.saveConversations(data.conversations);
      if (data.actions) this.saveActions(data.actions);
      if (data.config) this.saveConfig(data.config);

      return {
        success: true,
        message: `Successfully imported ${data.transactions.length} transactions, ${data.bills?.length || 0} bills, and memory graph.`
      };
    } catch (err: unknown) {
      return { success: false, message: `Failed to parse JSON: ${(err as Error).message}` };
    }
  },

  // Export Transactions as standard CSV
  exportTransactionsCsv(): string {
    const txs = this.getTransactions();
    const headers = ['Date', 'Amount', 'Type', 'Category', 'Merchant', 'Note', 'AccountId'];
    const rows = txs.map(t => [
      t.date,
      t.amount.toFixed(2),
      t.type,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      `"${(t.merchant || '').replace(/"/g, '""')}"`,
      `"${(t.note || '').replace(/"/g, '""')}"`,
      t.accountId
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  },

  // Parse CSV string to transactions with schema hints
  importTransactionsCsv(csvString: string): { success: boolean; addedCount: number; message: string } {
    try {
      const lines = csvString.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        return { success: false, addedCount: 0, message: 'CSV file is empty or missing headers.' };
      }

      const header = lines[0].toLowerCase();
      const hasDate = header.includes('date');
      const hasAmount = header.includes('amount');

      if (!hasDate || !hasAmount) {
        return {
          success: false,
          addedCount: 0,
          message: 'CSV header must include at least "Date" and "Amount" columns.'
        };
      }

      const current = this.getTransactions();
      const accounts = this.getAccounts();
      const defaultAccountId = accounts[0]?.id || 'acc_chk_01';

      const newTxs: Transaction[] = [];

      for (let i = 1; i < lines.length; i++) {
        const rawLine = lines[i];
        const match = rawLine.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
        if (!match || match.length < 2) continue;

        const cleanValues = match.map(v => v.replace(/^"|"$/g, '').trim());
        const dateStr = cleanValues[0] || new Date().toISOString().split('T')[0];
        const rawAmt = parseFloat(cleanValues[1]?.replace(/[$,]/g, '') || '0');
        if (isNaN(rawAmt) || rawAmt === 0) continue;

        const isNegative = rawAmt < 0;
        const absAmount = Math.abs(rawAmt);
        const type = cleanValues[2]?.toLowerCase() === 'income' || (!isNegative && header.includes('type') && cleanValues[2]?.toLowerCase() === 'income')
          ? 'income'
          : 'expense';
        const category = (cleanValues[3] as ExpenseCategory) || 'Other';
        const merchant = cleanValues[4] || cleanValues[2] || 'Imported Merchant';
        const note = cleanValues[5] || 'Imported via CSV';

        newTxs.push({
          id: `tx_import_${Date.now()}_${i}`,
          date: dateStr,
          amount: absAmount,
          type: type as any,
          category,
          merchant,
          note,
          accountId: defaultAccountId,
          autoCategorized: false
        });
      }

      if (newTxs.length === 0) {
        return { success: false, addedCount: 0, message: 'No valid transaction rows found in CSV.' };
      }

      const combined = [...newTxs, ...current];
      this.saveTransactions(combined);

      return {
        success: true,
        addedCount: newTxs.length,
        message: `Successfully imported ${newTxs.length} transactions from CSV.`
      };
    } catch (err: unknown) {
      return { success: false, addedCount: 0, message: `Failed to parse CSV: ${(err as Error).message}` };
    }
  },

  // Reset to realistic seed dataset
  resetToSeed(): void {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(SEED_ACCOUNTS));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(SEED_TRANSACTIONS));
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(SEED_BILLS));
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(SEED_BUDGETS));
    localStorage.setItem(STORAGE_KEYS.MEMORY, JSON.stringify(SEED_MEMORY_FILE));
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(SEED_CONVERSATIONS));
    localStorage.setItem('purse_active_conv_id', SEED_CONVERSATIONS[0].id);
    localStorage.setItem(STORAGE_KEYS.ACTIONS, JSON.stringify([]));
  }
};
