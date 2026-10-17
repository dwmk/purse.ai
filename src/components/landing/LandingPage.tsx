import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { usePWA } from '../../hooks/usePWA';
import {
  Sparkles,
  ArrowRight,
  Shield,
  Zap,
  Lock,
  Cpu,
  Brain,
  MessageSquare,
  CheckCircle2,
  Download,
  Smartphone,
  X,
  Clock,
  RotateCcw,
  Sliders,
  Layers,
  Database,
  FileText,
  Activity,
  Check,
  Loader2,
  TrendingUp,
  BarChart3,
  GitBranch,
  Terminal,
  AlertCircle,
  Calendar,
  DollarSign,
  Play,
  RefreshCw,
  Search,
  CheckCheck
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { setCurrentView } = useFinance();
  const { isInstalled, isInstallable, isIOS, install } = usePWA();

  // If PWA is detected, automatically redirect to /app
  useEffect(() => {
    if (isInstalled) {
      setCurrentView('chat');
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/app');
      }
    }
  }, [isInstalled, setCurrentView]);

  const [showIOSModal, setShowIOSModal] = useState(false);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    if (isInstallable) {
      await install();
    } else {
      setShowIOSModal(true);
    }
  };

  // -------------------------------------------------------------
  // HERO: Live Cognitive Intent Simulator with Thinking & Text Streaming
  // -------------------------------------------------------------
  const [simPrompt, setSimPrompt] = useState("Spent $42.50 at Trader Joe's");
  const [simState, setSimState] = useState<'idle' | 'thinking' | 'streaming' | 'complete'>('idle');
  const [thinkingStep, setThinkingStep] = useState(0);
  const [streamedText, setStreamedText] = useState('');
  const [simResultData, setSimResultData] = useState<{
    intent: string;
    actionDetail: string;
    impact: string;
  } | null>(null);

  const samplePrompts = [
    "Spent $42.50 at Trader Joe's",
    "Gained $1,200 freelance deposit",
    "Can I afford $120 dinner tonight?",
    "Audit subscriptions for recurring leaks"
  ];

  const runSimulation = (promptText: string) => {
    setSimPrompt(promptText);
    setSimState('thinking');
    setThinkingStep(1);
    setStreamedText('');
    setSimResultData(null);

    const lower = promptText.toLowerCase();
    const isGain = lower.includes('gained') || lower.includes('freelance') || lower.includes('deposit') || lower.includes('salary');
    const isAfford = lower.includes('afford') || lower.includes('dinner');
    const isAudit = lower.includes('audit') || lower.includes('subscription');

    const fullResponse = isGain
      ? 'I parsed an incoming transaction of $1,200.00 from Client Invoice. Staged +$1,200.00 income to Checking Account. Projected liquid balance: $4,400.00. Safe daily spend increased by +$14.20/day.'
      : isAfford
      ? 'Evaluated $120.00 against Dining & Nightlife envelope ($155.00 remaining). Status: Approved. Post-purchase balance leaves $35.00 cushion and respects your $1,000 checking floor invariant.'
      : isAudit
      ? 'Audited 4 active recurring software subscriptions ($79.00/month). Flagged dormant Adobe CC subscription (inactive 42 days). Potential annual recovery: $659.88/year with zero lifestyle friction.'
      : "Parsed transaction of $42.50 at Trader Joe's categorized under Groceries. Envelope remaining headroom: $188.00. Non-destructive ledger mutation staged with 1-click rollback guarantee.";

    const intentLabel = isGain
      ? 'INCOMING_REVENUE_LOG'
      : isAfford
      ? 'AFFORDABILITY_EVALUATION'
      : isAudit
      ? 'RECURRING_LEAK_AUDIT'
      : 'CONVERSATIONAL_EXPENSE_LOG';

    const actionText = isGain
      ? 'Log income of $1,200.00 from Client Invoice (Savings & Investments)'
      : isAfford
      ? 'Discretionary check approved ($120.00 < $155.00 envelope cushion)'
      : isAudit
      ? 'Flagged 1 dormant subscription for cancellation review'
      : "Log expense of $42.50 at Trader Joe's (Groceries)";

    const impactText = isGain
      ? '+$1,200.00 to Checking (Balance: $4,400.00)'
      : isAfford
      ? '$35.00 discretionary cushion remaining'
      : isAudit
      ? '$54.99/mo potential recurring savings'
      : '-$42.50 to Groceries Envelope';

    setTimeout(() => {
      setThinkingStep(2);
    }, 400);

    setTimeout(() => {
      setThinkingStep(3);
    }, 850);

    setTimeout(() => {
      setSimState('streaming');
      setSimResultData({
        intent: intentLabel,
        actionDetail: actionText,
        impact: impactText
      });

      let charIndex = 0;
      const streamInterval = setInterval(() => {
        if (charIndex <= fullResponse.length) {
          setStreamedText(fullResponse.slice(0, charIndex));
          charIndex += 2;
        } else {
          clearInterval(streamInterval);
          setSimState('complete');
        }
      }, 14);
    }, 1300);
  };

  // -------------------------------------------------------------
  // SECTION 1: Interactive Pipeline Flow (Entity Extraction)
  // -------------------------------------------------------------
  const [pipelineSample, setPipelineSample] = useState<number>(0);
  const pipelineExamples = [
    {
      input: "Spent $34.80 at Blue Bottle Coffee yesterday",
      type: "EXPENSE",
      merchant: "Blue Bottle Coffee",
      amount: "$34.80",
      date: "Yesterday",
      category: "Dining & Drinks",
      confidence: 99.4,
      invariantCheck: "Checking Floor > $1,000 (Pass)"
    },
    {
      input: "Received $2,450 wire transfer for consulting project",
      type: "INCOME",
      merchant: "Consulting Client",
      amount: "$2,450.00",
      date: "Today",
      category: "Revenue & Consulting",
      confidence: 99.9,
      invariantCheck: "Liquidity Floor Safe (+12.4% buffer)"
    },
    {
      input: "Set aside $300 into Emergency High-Yield Savings",
      type: "TRANSFER",
      merchant: "Internal Vault Transfer",
      amount: "$300.00",
      date: "Immediate",
      category: "Emergency Reserve",
      confidence: 98.7,
      invariantCheck: "Emergency Target 95% Reached"
    }
  ];

  // -------------------------------------------------------------
  // SECTION 2: Client Vector DB Similarity Distance Demo
  // -------------------------------------------------------------
  const [ragQueryIndex, setRagQueryIndex] = useState(0);
  const ragQueries = [
    {
      query: "Can I buy the $180 espresso machine?",
      closestMatch: "MEMORY.md: Rule #2 - Non-essential purchases over $50 require discretionary cushion check.",
      cosine: 0.942,
      latency: "8.4 ms",
      vectorSpace: [
        { label: "Dining / Kitchen Envelope", score: 0.942, match: true },
        { label: "Recent Checking Inflows", score: 0.812, match: false },
        { label: "Emergency Reserve Floor", score: 0.765, match: false },
        { label: "Unrelated Travel Bills", score: 0.312, match: false }
      ]
    },
    {
      query: "How much did I spend on groceries this month?",
      closestMatch: "Ledger Store: 4 transactions categorized under Groceries (Total $312.40).",
      cosine: 0.978,
      latency: "6.1 ms",
      vectorSpace: [
        { label: "Groceries Envelope ($500 quota)", score: 0.978, match: true },
        { label: "Trader Joe's ($42.50)", score: 0.915, match: false },
        { label: "Whole Foods Market ($89.20)", score: 0.884, match: false },
        { label: "Electric Bill Utility", score: 0.221, match: false }
      ]
    },
    {
      query: "Is my rent autopay scheduled?",
      closestMatch: "Obligations Matrix: Rent ($1,400.00) due on 1st. Autopay active via Chase Operating.",
      cosine: 0.963,
      latency: "7.2 ms",
      vectorSpace: [
        { label: "Recurring Obligation: Rent", score: 0.963, match: true },
        { label: "Apartment Utilities", score: 0.841, match: false },
        { label: "Bank Account Floors", score: 0.729, match: false },
        { label: "Discretionary Dining", score: 0.185, match: false }
      ]
    }
  ];

  // -------------------------------------------------------------
  // SECTION 3: Dynamic Envelope Simulation
  // -------------------------------------------------------------
  const [checkingBalance, setCheckingBalance] = useState(3800);
  const [pendingBills, setPendingBills] = useState(1350);
  const safetyFloor = 1000;
  const daysRemaining = 18;

  const availableCushion = Math.max(0, checkingBalance - safetyFloor - pendingBills);
  const safeDailySpend = (availableCushion / daysRemaining).toFixed(2);

  // -------------------------------------------------------------
  // SECTION 5: Two-Phase Rollback State Machine Demo
  // -------------------------------------------------------------
  const [rollbackStage, setRollbackStage] = useState<'idle' | 'staged' | 'committed' | 'reverted'>('idle');
  const [simBalance, setSimBalance] = useState(3800);

  const handleStageDemo = () => {
    setRollbackStage('staged');
  };

  const handleCommitDemo = () => {
    setRollbackStage('committed');
    setSimBalance(prev => prev - 85.00);
  };

  const handleRevertDemo = () => {
    setRollbackStage('reverted');
    setSimBalance(prev => prev + 85.00);
  };

  const handleResetDemo = () => {
    setRollbackStage('idle');
    setSimBalance(3800);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#0A0910] text-[#18181B] dark:text-[#F4F4F5] flex flex-col font-sans transition-colors duration-200">
      
      {/* =========================================================
          HERO SECTION (Clean Corporate SaaS Layout, No 3D Window)
         ========================================================= */}
      <section className="relative pt-14 pb-16 sm:pt-20 sm:pb-24 border-b border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden bg-gradient-to-b from-white to-[#F8F9FB] dark:from-[#0f0e17] dark:to-[#0A0910]">
        
        {/* Subtle Background Glow Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f1e29_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

        <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
          
          <div className="text-center max-w-4xl mx-auto space-y-6">
            
            {/* Architectural Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium border border-violet-200 dark:border-violet-800/80 bg-violet-50/80 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
              <span>PURSE · AUTONOMOUS PRIVATE AGENT COGNITION</span>
              <span className="text-zinc-300 dark:text-zinc-700">|</span>
              <span className="text-zinc-500 dark:text-zinc-400">EDGE NATIVE · ZERO CLOUD TELEMETRY</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-[1.06] text-balance">
              Autonomous Personal Finance. <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Private In Your Browser.
              </span>
            </h1>

            {/* Sub-headline */}
            <p className="text-base sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Purse pairs deterministic ledger mathematics with client-side vector memory and LLM reasoning. Conversational bookkeeping, live bill radars, and safe execution gates with single-click rollback.
            </p>

            {/* Action Row: Launch App + Install PWA */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setCurrentView('chat')}
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-all cursor-pointer shadow-lg shadow-violet-500/25 active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Launch Purse App</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {!isInstalled && (
                <button
                  onClick={handleInstallClick}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-mono font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-850 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Install PWA</span>
                </button>
              )}
            </div>

            {/* Trust Metrics Pill Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-5 sm:gap-8 text-xs font-mono text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                100% Client-Side Privacy
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                Zero Cloud Data Brokers
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                1-Click Rollback State Machine
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                Sub-15ms In-Browser RAG
              </span>
            </div>

          </div>

          {/* Interactive Live Intent Reasoning Engine Preview */}
          <div className="pt-4 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-2xl overflow-hidden text-left">
              
              {/* Simulator Header */}
              <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/80 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 ml-2">
                    Cognitive Intent & Execution Gate Simulator
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
                  <span>Interactive Engine Demo</span>
                </div>
              </div>

              {/* Input Area */}
              <div className="p-5 sm:p-6 space-y-3.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={simPrompt}
                    onChange={e => setSimPrompt(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && runSimulation(simPrompt)}
                    placeholder="Enter transaction: e.g. 'Gained $1,200 freelance deposit' or 'Spent $42.50 at Trader Joe\'s'"
                    className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-3 rounded-xl text-xs sm:text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-violet-500"
                  />
                  <button
                    onClick={() => runSimulation(simPrompt)}
                    disabled={simState === 'thinking' || simState === 'streaming'}
                    className="px-5 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer shrink-0 shadow-xs active:scale-95 flex items-center gap-1.5"
                  >
                    {simState === 'thinking' ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Reasoning...</span>
                      </>
                    ) : (
                      <span>Simulate Intent</span>
                    )}
                  </button>
                </div>

                {/* Sample Prompt Pills */}
                <div className="flex flex-wrap gap-2">
                  {samplePrompts.map(p => (
                    <button
                      key={p}
                      onClick={() => runSimulation(p)}
                      disabled={simState === 'thinking' || simState === 'streaming'}
                      className="text-[11px] font-mono px-3 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-750 transition-colors cursor-pointer font-medium disabled:opacity-50"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulated Thinking Trace */}
              {simState === 'thinking' && (
                <div className="px-5 sm:px-6 pb-6 pt-2 font-mono text-xs border-t border-zinc-200 dark:border-zinc-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-bold text-[11px]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>COGNITIVE THOUGHT TRACE (SIMULATED THINKING):</span>
                  </div>

                  <div className="space-y-1.5 text-zinc-600 dark:text-zinc-400 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>[Step 1/3] Parsing linguistic entities and detecting transaction polarity...</span>
                    </div>

                    {thinkingStep >= 2 && (
                      <div className="flex items-center gap-2 animate-in fade-in duration-150">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>[Step 2/3] Querying client-side Vector Database via Cosine RAG...</span>
                      </div>
                    )}

                    {thinkingStep >= 3 && (
                      <div className="flex items-center gap-2 animate-in fade-in duration-150">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>[Step 3/3] Validating checking floor invariant ($1,000 baseline) and budget envelope...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Text Streaming Output */}
              {(simState === 'streaming' || simState === 'complete') && simResultData && (
                <div className="px-5 sm:px-6 pb-6 pt-3 font-mono text-xs border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-[11px] font-bold">
                    <span>RECOGNIZED AGENT INTENT:</span>
                    <span className="font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 px-2.5 py-0.5 rounded-full border border-violet-200 dark:border-violet-800">
                      {simResultData.intent}
                    </span>
                  </div>

                  {/* Character/Word Streamed AI Response */}
                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-sans text-xs sm:text-sm leading-relaxed">
                    {streamedText}
                    {simState === 'streaming' && (
                      <span className="inline-block w-1.5 h-3.5 bg-violet-600 ml-1 animate-pulse align-middle" />
                    )}
                  </div>

                  {/* Staged Execution Gate Card */}
                  <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                    <div className="flex items-center gap-2 text-violet-900 dark:text-violet-200">
                      <Shield className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                      <span><strong>STAGED SAFE ACTION:</strong> {simResultData.actionDetail}</span>
                    </div>
                    <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {simResultData.impact}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </section>

      {/* =========================================================
          FEATURE SECTION 1: Natural Language Lexical Extraction Pipeline
         ========================================================= */}
      <section className="py-20 sm:py-28 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#0c0b12]">
        <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left: Detailed Explanations */}
            <div className="lg:col-span-5 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800">
                <Terminal className="w-3.5 h-3.5" />
                <span>SUBSYSTEM 01 · COGNITIVE PARSER</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                Linguistic Entity Extraction & Deterministic Parsing
              </h2>
              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                Human finance is messy: unstructured receipts, informal chat messages, and irregular deposits. Purse uses a multi-stage parser that extracts transaction polarity (credit vs debit), merchant entity tokens, temporal markers, and amount bounds in sub-12 milliseconds.
              </p>
              
              <ul className="space-y-3 font-mono text-xs text-zinc-600 dark:text-zinc-400 pt-2">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Zero-Friction Bookkeeping:</strong> Type or speak naturally without navigating manual entry modals.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Dual-Tier Fallback:</strong> Local edge regex heuristic validates syntax before invoking server Gemini models.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Confidence Threshold:</strong> Transactions below 95% certainty are highlighted for user review.</span>
                </li>
              </ul>
            </div>

            {/* Right: Unique Animated Pipeline Diagram & Interactive Token Viewer */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-[#F8F9FB] dark:bg-[#121216] shadow-xl overflow-hidden p-6 space-y-6">
                
                {/* Pipeline Top Status */}
                <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">Entity Extraction Logic Stream</span>
                  </div>
                  <div className="text-zinc-400 text-[11px]">Pipeline Latency: ~11.8ms</div>
                </div>

                {/* Animated Pipeline Nodes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-[11px]">
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-violet-200 dark:border-violet-800 shadow-xs">
                    <div className="text-violet-600 dark:text-violet-400 font-bold">1. Lexical Token</div>
                    <div className="text-zinc-500 text-[10px] mt-1">Tokenizer & Regex</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-violet-200 dark:border-violet-800 shadow-xs">
                    <div className="text-violet-600 dark:text-violet-400 font-bold">2. Polarity Gate</div>
                    <div className="text-zinc-500 text-[10px] mt-1">Debit / Credit Flag</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-violet-200 dark:border-violet-800 shadow-xs">
                    <div className="text-violet-600 dark:text-violet-400 font-bold">3. Envelope Route</div>
                    <div className="text-zinc-500 text-[10px] mt-1">Category Classifier</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs">
                    <div className="text-emerald-600 dark:text-emerald-400 font-bold">4. Action Stage</div>
                    <div className="text-zinc-500 text-[10px] mt-1">Verified Payload</div>
                  </div>
                </div>

                {/* Interactive Example Selector */}
                <div className="space-y-3">
                  <div className="text-xs font-mono font-semibold text-zinc-500 dark:text-zinc-400">
                    CLICK TO TEST INGESTION SAMPLE:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pipelineExamples.map((ex, idx) => (
                      <button
                        key={idx}
                        onClick={() => setPipelineSample(idx)}
                        className={`text-xs font-mono px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                          pipelineSample === idx
                            ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                            : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-violet-400'
                        }`}
                      >
                        Sample #{idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Extracted Entity Data Visualizer */}
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 space-y-3 font-mono text-xs">
                  <div className="text-zinc-500 text-[11px]">
                    RAW INPUT: <span className="text-zinc-900 dark:text-zinc-100 font-sans font-semibold">&ldquo;{pipelineExamples[pipelineSample].input}&rdquo;</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
                      <div className="text-[10px] text-zinc-400">INTENT POLARITY</div>
                      <div className={`font-bold mt-0.5 ${pipelineExamples[pipelineSample].type === 'INCOME' ? 'text-emerald-600' : 'text-violet-600'}`}>
                        {pipelineExamples[pipelineSample].type}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
                      <div className="text-[10px] text-zinc-400">EXTRACTED AMOUNT</div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                        {pipelineExamples[pipelineSample].amount}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
                      <div className="text-[10px] text-zinc-400">IDENTIFIED ENTITY</div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 truncate">
                        {pipelineExamples[pipelineSample].merchant}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
                      <div className="text-[10px] text-zinc-400">CONFIDENCE SCORE</div>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {pipelineExamples[pipelineSample].confidence}%
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Shield className="w-3.5 h-3.5" />
                      INVARIANT SAFETY VERIFICATION:
                    </span>
                    <span>{pipelineExamples[pipelineSample].invariantCheck}</span>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================
          FEATURE SECTION 2: Client Vector DB & Cosine RAG Engine
         ========================================================= */}
      <section className="py-20 sm:py-28 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-[#F8F9FB] dark:bg-[#0A0910]">
        <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left: Vector Radar & Visual Distance Graph */}
            <div className="lg:col-span-7 order-2 lg:order-1">
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xl overflow-hidden p-6 space-y-5">
                
                {/* RAG Query Controls */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 font-mono text-xs">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                    <Database className="w-4 h-4 text-violet-600" />
                    In-Browser Vector Embeddings Matrix
                  </span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    100% In-Memory Sandbox
                  </span>
                </div>

                {/* Prompt Queries */}
                <div className="flex flex-wrap gap-2">
                  {ragQueries.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => setRagQueryIndex(idx)}
                      className={`text-xs font-mono px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        ragQueryIndex === idx
                          ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                          : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-violet-400'
                      }`}
                    >
                      Query #{idx + 1}
                    </button>
                  ))}
                </div>

                {/* Active Query Display */}
                <div className="p-3 rounded-xl bg-violet-50/60 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/60 font-mono text-xs space-y-1">
                  <div className="text-[10px] text-violet-700 dark:text-violet-300 font-bold uppercase">
                    Client Natural Query
                  </div>
                  <div className="text-zinc-900 dark:text-zinc-100 font-semibold font-sans">
                    &ldquo;{ragQueries[ragQueryIndex].query}&rdquo;
                  </div>
                </div>

                {/* Cosine Similarity Visual Bars */}
                <div className="space-y-2.5 font-mono text-xs">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>EMBEDDING SPACE CLUSTERS</span>
                    <span>COSINE SIMILARITY METRIC</span>
                  </div>

                  {ragQueries[ragQueryIndex].vectorSpace.map((cluster, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-xl border transition-all ${
                        cluster.match
                          ? 'bg-violet-50 dark:bg-violet-950/40 border-violet-300 dark:border-violet-700'
                          : 'bg-zinc-50/60 dark:bg-zinc-900/40 border-zinc-200/80 dark:border-zinc-800/80'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className={cluster.match ? 'font-bold text-violet-900 dark:text-violet-200' : 'text-zinc-600 dark:text-zinc-400'}>
                          {cluster.label}
                        </span>
                        <span className="font-bold text-violet-600 dark:text-violet-400">
                          {cluster.score.toFixed(3)}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            cluster.match ? 'bg-violet-600' : 'bg-zinc-400 dark:bg-zinc-600'
                          }`}
                          style={{ width: `${cluster.score * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Top Semantic Match Result */}
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1 font-mono text-xs">
                  <div className="flex justify-between items-center text-[10px] text-zinc-400">
                    <span>TOP RETRIEVED CHUNK (INJECTED TO PROMPT)</span>
                    <span className="text-emerald-500 font-bold">Latency: {ragQueries[ragQueryIndex].latency}</span>
                  </div>
                  <div className="text-zinc-800 dark:text-zinc-200 font-sans text-xs leading-relaxed">
                    {ragQueries[ragQueryIndex].closestMatch}
                  </div>
                </div>

              </div>
            </div>

            {/* Right: Architectural Text */}
            <div className="lg:col-span-5 order-1 lg:order-2 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800">
                <Database className="w-3.5 h-3.5" />
                <span>SUBSYSTEM 02 · ZERO-CLOUD RAG</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                In-Memory Vector Search With Total Client Isolation
              </h2>
              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                Traditional RAG architectures transmit your private account balances, spending habits, and vendor histories to hosted vector cloud clusters (like Pinecone or Qdrant). Purse computes dense semantic embeddings entirely inside your web browser using a zero-dependency in-memory cosine index.
              </p>
              
              <ul className="space-y-3 font-mono text-xs text-zinc-600 dark:text-zinc-400 pt-2">
                <li className="flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span><strong>Zero Network Egress:</strong> Your financial knowledge graph never traverses external networks for vector storage.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Zap className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span><strong>Sub-10ms Exact Search:</strong> Cosine similarity dot-products run synchronously without network roundtrips.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span><strong>Markdown Grounding:</strong> Vector chunks map directly to lines in your editable <code>MEMORY.md</code> graph.</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================
          FEATURE SECTION 3: Dynamic Envelope Budgeting & Safe-Daily-Spend
         ========================================================= */}
      <section className="py-20 sm:py-28 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#0c0b12]">
        <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left: Explanations */}
            <div className="lg:col-span-5 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                <Sliders className="w-3.5 h-3.5" />
                <span>SUBSYSTEM 03 · DYNAMIC ENVELOPES</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                Algorithmic Safe-to-Spend & Envelope Headroom
              </h2>
              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                Static budgeting breaks the moment unexpected expenses arise. Purse continuously calculates your liquid safety buffer: subtracting mandatory 30-day bills and your immutable checking safety floor from current deposits, giving you an exact, risk-free daily discretionary limit.
              </p>
              
              {/* Math Formulation Callout */}
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-mono text-xs space-y-2 text-zinc-700 dark:text-zinc-300">
                <div className="text-[10px] text-zinc-400 uppercase font-bold">Mathematical Formulation:</div>
                <div className="text-violet-600 dark:text-violet-400 font-bold text-[13px]">
                  Cushion = max(0, Balance - Floor - CommittedBills)
                </div>
                <div className="text-emerald-600 dark:text-emerald-400 font-bold text-[13px]">
                  Safe Daily Spend = Cushion / DaysRemaining
                </div>
              </div>
            </div>

            {/* Right: Interactive Live Slider & Visual Gauge */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-[#F8F9FB] dark:bg-[#121216] shadow-xl overflow-hidden p-6 space-y-6">
                
                <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 font-mono text-xs">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    Interactive Liquidity & Daily Cap Modeler
                  </span>
                  <span className="text-[11px] text-zinc-400">Live Feedback Loop</span>
                </div>

                {/* Interactive Sliders */}
                <div className="space-y-4 font-mono text-xs">
                  
                  {/* Slider 1: Checking Balance */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-600 dark:text-zinc-400">Operating Checking Balance:</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">${checkingBalance.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min={2000}
                      max={8000}
                      step={100}
                      value={checkingBalance}
                      onChange={e => setCheckingBalance(Number(e.target.value))}
                      className="w-full accent-violet-600 cursor-pointer"
                    />
                  </div>

                  {/* Slider 2: Pending Bills */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-600 dark:text-zinc-400">Committed 30-Day Bills:</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">${pendingBills.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min={500}
                      max={3000}
                      step={50}
                      value={pendingBills}
                      onChange={e => setPendingBills(Number(e.target.value))}
                      className="w-full accent-violet-600 cursor-pointer"
                    />
                  </div>

                </div>

                {/* Real-Time Computed Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs pt-1">
                  
                  <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <div className="text-[10px] text-zinc-400">SAFETY FLOOR</div>
                    <div className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-1">${safetyFloor}</div>
                    <div className="text-[10px] text-emerald-500 mt-0.5">Strict Baseline</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <div className="text-[10px] text-zinc-400">AVAILABLE CUSHION</div>
                    <div className="text-base font-bold text-violet-600 dark:text-violet-400 mt-1">
                      ${availableCushion.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Risk-Free Capital</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700">
                    <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold">SAFE DAILY SPEND</div>
                    <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                      ${safeDailySpend} <span className="text-xs font-normal">/ day</span>
                    </div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-0.5">Over {daysRemaining} days</div>
                  </div>

                </div>

                {/* Dynamic Envelope Categories Breakdown */}
                <div className="space-y-2.5 font-mono text-xs pt-2">
                  <div className="text-[11px] text-zinc-500">DYNAMIC ENVELOPE HEADROOM ALLOCATION:</div>
                  
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span>Groceries & Restocking</span>
                      <span className="font-bold text-emerald-600">$188.00 / $500.00 left</span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '62%' }} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span>Dining & Leisure Wants</span>
                      <span className="font-bold text-amber-500">$95.00 / $300.00 left</span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: '68%' }} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span>Software & Media Subscriptions</span>
                      <span className="font-bold text-violet-500">$79.00 / $120.00 left</span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-violet-500 h-full rounded-full" style={{ width: '65%' }} />
                    </div>
                  </div>

                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================
          FEATURE SECTION 4: Temporal Obligations Radar & Predictive Cash-Flow
         ========================================================= */}
      <section className="py-20 sm:py-28 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-[#F8F9FB] dark:bg-[#0A0910]">
        <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left: SVG Cashflow Graph & Leak Matrix */}
            <div className="lg:col-span-7 order-2 lg:order-1">
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xl overflow-hidden p-6 space-y-5">
                
                <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 font-mono text-xs">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                    30-Day Liquidity Trajectory & Invariant Bounds
                  </span>
                  <span className="text-[11px] text-zinc-400">Forward Projection</span>
                </div>

                {/* SVG Visual Graph: Cash Balance over 30 Days */}
                <div className="w-full bg-zinc-50 dark:bg-zinc-900/80 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
                  <div className="text-[10px] font-mono text-zinc-400 mb-2 flex justify-between">
                    <span>LIQUID BALANCE PROJECTION CURVE ($)</span>
                    <span className="text-emerald-500">Checking Floor: $1,000</span>
                  </div>

                  {/* SVG Chart */}
                  <div className="relative w-full h-36">
                    <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                      {/* Grid Lines */}
                      <line x1="0" y1="30" x2="500" y2="30" stroke="currentColor" strokeDasharray="3 3" className="text-zinc-200 dark:text-zinc-800" />
                      <line x1="0" y1="70" x2="500" y2="70" stroke="currentColor" strokeDasharray="3 3" className="text-zinc-200 dark:text-zinc-800" />
                      <line x1="0" y1="100" x2="500" y2="100" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 2" />

                      {/* Cashflow Trajectory Path */}
                      <path
                        d="M 0,25 Q 80,30 140,55 T 220,70 T 320,35 T 420,60 T 500,45"
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="3"
                      />

                      {/* Gradient Fill under Path */}
                      <path
                        d="M 0,25 Q 80,30 140,55 T 220,70 T 320,35 T 420,60 T 500,45 L 500,120 L 0,120 Z"
                        fill="url(#violetGradient)"
                        opacity="0.15"
                      />

                      {/* Payday Cliff Marker */}
                      <circle cx="320" cy="35" r="4" fill="#10b981" />
                      {/* Rent Deduction Marker */}
                      <circle cx="140" cy="55" r="4" fill="#f59e0b" />

                      <defs>
                        <linearGradient id="violetGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <span>Day 1 (Today)</span>
                    <span className="text-amber-500 font-bold">• Day 10: Rent ($1,400)</span>
                    <span className="text-emerald-500 font-bold">• Day 15: Payday (+$2,850)</span>
                    <span>Day 30</span>
                  </div>
                </div>

                {/* Subscription Leak Detection Radar Card */}
                <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 font-mono text-xs space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      AUTONOMOUS LEAK AUDIT DETECTED:
                    </span>
                    <span className="text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full font-bold">
                      Recovery: $659.88/yr
                    </span>
                  </div>

                  <div className="text-zinc-700 dark:text-zinc-300 text-xs font-sans">
                    Flagged <strong>Adobe Creative Cloud ($54.99/mo)</strong>: Zero operational receipts or login tokens logged in 42 days. Redundant with Affinity suite license.
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300 border-t border-amber-200/60 dark:border-amber-800/40">
                    <span>Status: Staged cancellation review in Cockpit</span>
                    <span className="font-bold">Zero Lifestyle Impact</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Right: Architectural Text */}
            <div className="lg:col-span-5 order-1 lg:order-2 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
                <Clock className="w-3.5 h-3.5" />
                <span>SUBSYSTEM 04 · TEMPORAL RADAR</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                Predictive Cashflow Timelines & Subscription Leak Auditing
              </h2>
              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                Bills don&apos;t arrive uniformly. Clustered rent payments and auto-renewing software fees cause liquidity crises even when a monthly budget looks healthy on paper. Purse models exact timing curves, testing whether committed deductions breach your safety floor before your next confirmed deposit.
              </p>
              
              <ul className="space-y-3 font-mono text-xs text-zinc-600 dark:text-zinc-400 pt-2">
                <li className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span><strong>Second-by-Second Due Radar:</strong> Dynamic countdown clocks for impending rent, utilities, and debt payments.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span><strong>Zero-Friction Leak Discovery:</strong> Detects overlapping streaming services and abandoned monthly licenses.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <TrendingUp className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span><strong>Survival Runway Simulation:</strong> Real-time zero-income runway projection based on non-discretionary commitments.</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================
          FEATURE SECTION 5: Two-Phase Rollback State Machine & Continuous Memory
         ========================================================= */}
      <section className="py-20 sm:py-28 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#0c0b12]">
        <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left: Explanations */}
            <div className="lg:col-span-5 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>SUBSYSTEM 05 · EXECUTION GATE</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                Two-Phase Rollback Protocol & Markdown Knowledge Graph
              </h2>
              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                Autonomous agents must never perform unmonitored silent mutations on financial records. Every transaction, budget update, or memory alteration adheres to a strict two-phase commit protocol: staged with impact previews and backed by mathematical single-click rollback.
              </p>
              
              <ul className="space-y-3 font-mono text-xs text-zinc-600 dark:text-zinc-400 pt-2">
                <li className="flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span><strong>Human-in-the-Loop Gate:</strong> Explicit confirmation before any ledger entry or bank balance mutation is sealed.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <RotateCcw className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span><strong>1-Click Instant Rollback:</strong> Inverse delta transforms return account balances to their exact prior states.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span><strong>Human-Auditable Memory:</strong> Preferences and rules persist in an inspectable Markdown file (<code>MEMORY.md</code>).</span>
                </li>
              </ul>
            </div>

            {/* Right: Interactive State Machine Visualizer */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-[#F8F9FB] dark:bg-[#121216] shadow-xl overflow-hidden p-6 space-y-6">
                
                <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 font-mono text-xs">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-rose-500" />
                    Two-Phase State Machine Simulation
                  </span>
                  <span className="text-[11px] text-zinc-400">Deterministic Invariants</span>
                </div>

                {/* State Node Graph */}
                <div className="grid grid-cols-4 gap-2 text-center font-mono text-[11px]">
                  <div className={`p-2.5 rounded-xl border transition-all ${
                    rollbackStage === 'idle'
                      ? 'bg-violet-600 text-white border-violet-600 font-bold shadow-xs'
                      : 'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800'
                  }`}>
                    <div>S0: IDLE</div>
                    <div className="text-[9px] mt-0.5">Ready</div>
                  </div>

                  <div className={`p-2.5 rounded-xl border transition-all ${
                    rollbackStage === 'staged'
                      ? 'bg-amber-500 text-white border-amber-500 font-bold shadow-xs'
                      : 'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800'
                  }`}>
                    <div>S1: STAGED</div>
                    <div className="text-[9px] mt-0.5">Preview Gate</div>
                  </div>

                  <div className={`p-2.5 rounded-xl border transition-all ${
                    rollbackStage === 'committed'
                      ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                      : 'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800'
                  }`}>
                    <div>S2: COMMITTED</div>
                    <div className="text-[9px] mt-0.5">Mutated</div>
                  </div>

                  <div className={`p-2.5 rounded-xl border transition-all ${
                    rollbackStage === 'reverted'
                      ? 'bg-rose-600 text-white border-rose-600 font-bold shadow-xs'
                      : 'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800'
                  }`}>
                    <div>S3: REVERTED</div>
                    <div className="text-[9px] mt-0.5">Restored</div>
                  </div>
                </div>

                {/* Interactive Simulated Balance & Staged Action */}
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">SIMULATED CHECKING BALANCE:</span>
                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">${simBalance.toFixed(2)}</span>
                  </div>

                  {rollbackStage === 'idle' && (
                    <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                      No active staged mutations. Click below to simulate the agent staging a new $85.00 transaction.
                    </div>
                  )}

                  {rollbackStage === 'staged' && (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        STAGED TRANSACTION: -$85.00 at Apple Store
                      </div>
                      <div className="text-[11px]">Ledger status: PENDING. Balance has NOT yet been changed.</div>
                    </div>
                  )}

                  {rollbackStage === 'committed' && (
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <CheckCheck className="w-3.5 h-3.5" />
                        TRANSACTION APPLIED: -$85.00 debited from Checking
                      </div>
                      <div className="text-[11px]">Undo checkpoint registered in recovery stack.</div>
                    </div>
                  )}

                  {rollbackStage === 'reverted' && (
                    <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5" />
                        ACTION REVERTED: +$85.00 restored to Checking
                      </div>
                      <div className="text-[11px]">Balance perfectly restored to initial $3,800.00 baseline.</div>
                    </div>
                  )}

                  {/* Action Trigger Buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {rollbackStage === 'idle' && (
                      <button
                        onClick={handleStageDemo}
                        className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-xs flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Stage New Transaction (-$85.00)
                      </button>
                    )}

                    {rollbackStage === 'staged' && (
                      <div className="flex gap-2">
                        <button
                          onClick={handleCommitDemo}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-xs flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Confirm & Commit
                        </button>
                        <button
                          onClick={handleResetDemo}
                          className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {rollbackStage === 'committed' && (
                      <button
                        onClick={handleRevertDemo}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-xs flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        1-Click Instant Rollback
                      </button>
                    )}

                    {rollbackStage === 'reverted' && (
                      <button
                        onClick={handleResetDemo}
                        className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reset Simulation
                      </button>
                    )}
                  </div>
                </div>

                {/* Inspectable MEMORY.md Snippet Preview */}
                <div className="p-3.5 rounded-xl bg-zinc-900 text-zinc-200 font-mono text-[11px] space-y-1.5 border border-zinc-800">
                  <div className="flex justify-between items-center text-zinc-400 text-[10px] pb-1 border-b border-zinc-800">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3 h-3 text-violet-400" />
                      PERSISTENT MEMORY GRAPH · MEMORY.md
                    </span>
                    <span className="text-emerald-400">Rev #14 · Client Verified</span>
                  </div>
                  <div className="text-zinc-400">## ACTIVE INVARIANTS & PREFERENCES</div>
                  <div className="text-zinc-300">- RULE_01: Maintain $1,000 checking operating floor.</div>
                  <div className="text-zinc-300">- RULE_02: Require confirmation for all transactions &gt; $50.</div>
                  <div className="text-zinc-300">- RULE_03: Restrict Dining envelope spending to $95.00/week.</div>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================
          CORPORATE CALL TO ACTION BANNER
         ========================================================= */}
      <section className="py-20 sm:py-24 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-gradient-to-b from-white to-[#F8F9FB] dark:from-[#0c0b12] dark:to-[#0A0910]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 text-white shadow-2xl space-y-6 relative overflow-hidden">
            
            <div className="space-y-3 relative z-10">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/15 text-violet-100 border border-white/20">
                100% PRIVATE · CLIENT-SIDE SOVEREIGNTY
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                Experience Autonomous Private Finance.
              </h2>
              <p className="text-sm sm:text-base text-violet-100 max-w-xl mx-auto leading-relaxed">
                No third-party bank screen-scrapers, no remote data leaks. Run your entire financial intelligence engine directly in your browser.
              </p>
            </div>

            <div className="pt-2 flex justify-center relative z-10">
              <button
                onClick={() => setCurrentView('chat')}
                className="flex items-center gap-2 px-9 py-4 rounded-xl text-sm font-bold bg-white text-violet-950 hover:bg-violet-50 transition-all shadow-xl cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-violet-600" />
                <span>Launch Purse App</span>
                <ArrowRight className="w-4 h-4 text-violet-600" />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================
          PWA iOS / BROWSER INSTALL MODAL
         ========================================================= */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800 w-full max-w-sm p-6 rounded-2xl shadow-2xl space-y-4 font-mono text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-zinc-100">
                <Smartphone className="w-4 h-4 text-violet-600" />
                <span>Install Purse App</span>
              </div>
              <button onClick={() => setShowIOSModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-zinc-600 dark:text-zinc-400 font-sans text-xs leading-relaxed">
              To install Purse on your device for fast access, offline resilience, and an app-like experience:
            </p>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl space-y-2 text-[11px] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
              <div>1. Tap your browser&apos;s <strong>Share</strong> or <strong>Menu (⋮)</strong> button.</div>
              <div>2. Scroll down and select <strong>&quot;Add to Home Screen&quot;</strong> or <strong>&quot;Install App&quot;</strong>.</div>
              <div>3. Launch Purse directly from your phone or desktop home screen!</div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 font-semibold cursor-pointer shadow-xs transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Minimal Footer */}
      <footer className="py-8 text-center text-xs font-mono text-zinc-400 dark:text-zinc-500 border-t border-zinc-200/60 dark:border-zinc-800/60">
        Purse Autonomous Finance · Edge-Native AI Personal Finance Engine · 100% Client-Side Sovereignty
      </footer>

    </div>
  );
};
