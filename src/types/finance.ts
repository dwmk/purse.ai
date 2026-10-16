export type TransactionType = 'income' | 'expense' | 'transfer';

export type ExpenseCategory =
  | 'Housing & Rent'
  | 'Groceries'
  | 'Utilities & Services'
  | 'Dining & Nightlife'
  | 'Transportation & Fuel'
  | 'Health & Wellness'
  | 'Subscriptions & Software'
  | 'Entertainment & Leisure'
  | 'Shopping & Goods'
  | 'Savings & Investments'
  | 'Other';

export interface Transaction {
  id: string;
  date: string; // ISO YYYY-MM-DD
  amount: number;
  type: TransactionType;
  category: ExpenseCategory;
  merchant: string;
  note?: string;
  accountId: string;
  tags?: string[];
  autoCategorized?: boolean;
}

export type AccountType = 'checking' | 'savings' | 'credit' | 'investment';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  institution: string;
  accountNumberMask: string;
  lastUpdated: string;
}

export type BillFrequency = 'monthly' | 'bi-weekly' | 'quarterly' | 'annual';

export interface Bill {
  id: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  frequency: BillFrequency;
  dueDate: string; // ISO YYYY-MM-DD
  isAutopay: boolean;
  isPaidThisCycle: boolean;
  status: 'upcoming' | 'due' | 'paid' | 'overdue';
  providerUrl?: string;
  notes?: string;
  potentialSavingsNotice?: string;
}

export interface BudgetEnvelope {
  id: string;
  category: ExpenseCategory;
  type: 'need' | 'want' | 'savings';
  allocated: number;
  color: string;
}

export type ActionType =
  | 'ADD_TRANSACTION'
  | 'EDIT_TRANSACTION'
  | 'DELETE_TRANSACTION'
  | 'ADD_BILL'
  | 'EDIT_BILL'
  | 'PAY_BILL'
  | 'UPDATE_BUDGET'
  | 'UPDATE_MEMORY'
  | 'ALLOCATE_SAVINGS';

export interface AgentAction {
  id: string;
  timestamp: string;
  type: ActionType;
  description: string;
  payload: any;
  previousState?: any;
  status: 'pending' | 'applied' | 'rejected' | 'reverted';
  safetyLevel: 'low_risk' | 'medium_risk' | 'high_risk';
  confidenceScore: number; // 0.0 - 1.0
  dryRunImpact?: {
    balanceDelta: number;
    categoryImpact?: string;
    newBudgetRemaining?: number;
    liquidityWarning?: string;
  };
}

export interface TaskPlanStep {
  step: number;
  title: string;
  detail: string;
  status: 'completed' | 'in_progress' | 'pending';
}

export interface AgentTaskPlan {
  id: string;
  intent: string;
  confidence: number;
  steps: TaskPlanStep[];
  proposedAction?: AgentAction;
  reasoning: string;
  measurableValue?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  plan?: AgentTaskPlan;
  action?: AgentAction;
  memoryUpdateNote?: string;
}

export interface UserFinancialProfile {
  monthlyIncome: number;
  paydayCadence: 'bi-weekly' | 'monthly' | 'semi-monthly';
  nextPayday: string;
  emergencyFundTarget: number;
  minimumCheckingFloor: number;
  savingsRateTargetPercent: number;
  currency: string;
}

export interface MemoryFile {
  rawMarkdown: string;
  profile: UserFinancialProfile;
  rules: string[];
  habits: string[];
  constraints: string[];
  unresolvedNotes: string[];
  lastUpdated: string;
  revisionCount: number;
}

export type LLMProvider = 'edge' | 'gemini' | 'openai' | 'deepseek' | 'zai' | 'custom';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  model?: string;
  customBaseUrl?: string;
  useEdgeFallback: boolean;
  autoApproveSafeActions: boolean;
}

export type AppView = 'landing' | 'overview' | 'chat' | 'ledger' | 'budgets' | 'bills' | 'memory' | 'settings';
