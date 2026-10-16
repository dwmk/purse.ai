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
  Mic,
  Volume2,
  Download,
  Smartphone,
  X
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { setCurrentView } = useFinance();
  const { isInstalled, isInstallable, isIOS, install } = usePWA();

  // If PWA is detected, automatically redirect to /app (skipping landing page)
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

  const [simPrompt, setSimPrompt] = useState('Spent $42.50 at Trader Joe\'s');
  const [simOutput, setSimOutput] = useState<{
    intent: string;
    steps: { step: number; title: string; detail: string }[];
    measurableValue: string;
  } | null>({
    intent: 'Add Grocery Expense with Safe Envelope Gate',
    steps: [
      { step: 1, title: 'Parse Natural Language', detail: 'Identified merchant "Trader Joe\'s", amount $42.50, category "Groceries"' },
      { step: 2, title: 'Check Invariants & Envelope', detail: 'Envelope allocated: $550.00. Current spent: $210.00. Post-txn remaining: $297.50.' },
      { step: 3, title: 'Queue Safe Proposal', detail: 'Dry-run liquidity checks passed. Waiting for user 1-click confirmation.' }
    ],
    measurableValue: 'Groceries Envelope is within safe target (54.1% left with 15 days remaining).'
  });

  const runSimulation = (prompt: string) => {
    setSimPrompt(prompt);
    if (prompt.toLowerCase().includes('dinner') || prompt.toLowerCase().includes('afford')) {
      setSimOutput({
        intent: 'Affordability & Cashflow Reasoning',
        steps: [
          { step: 1, title: 'Inspect Daily Safe Spend Floor', detail: 'Safe daily spend is $74.20. Proposed discretionary expense: $120.00.' },
          { step: 2, title: 'Verify Fixed Needs Buffer', detail: 'Upcoming bills before next payday: $280 utilities on Oct 29. Cushion covers it.' },
          { step: 3, title: 'Recommend Envelope Rebalance', detail: 'Permissible if shifting $45.80 from Entertainment or pausing 1 dining out run.' }
        ],
        measurableValue: 'Yes, you can afford $120 tonight without breaching the $1,200 emergency liquidity floor.'
      });
    } else if (prompt.toLowerCase().includes('runway') || prompt.toLowerCase().includes('cash')) {
      setSimOutput({
        intent: 'Zero-Income Survival Runway Calculation',
        steps: [
          { step: 1, title: 'Aggregate Liquid Reserves', detail: 'Checking ($3,420) + High Yield Savings ($14,250) = $17,670 total liquidity.' },
          { step: 2, title: 'Sum Strictly Essential Needs', detail: 'Rent ($1,850) + Groceries ($550) + Utilities ($280) + Fuel ($260) = $2,940/month.' },
          { step: 3, title: 'Compute Survival Duration', detail: '$17,670 / $2,940 = 6.01 months runway without any income or credit.' }
        ],
        measurableValue: 'Cash survival runway is 6.0 months under strict essential-needs conditions.'
      });
    } else {
      setSimOutput({
        intent: 'Automated Expense Ledger Entry',
        steps: [
          { step: 1, title: 'Entity Extraction', detail: `Extracted parameters from "${prompt}"` },
          { step: 2, title: 'Category Classification', detail: 'Matched category to optimal envelope with zero latency.' },
          { step: 3, title: 'Non-Destructive Proposal', detail: 'Drafted ledger transaction with 1-click rollback guarantee.' }
        ],
        measurableValue: 'Envelope remaining balance updated safely in local browser storage.'
      });
    }
  };

  const samplePrompts = [
    'Spent $42.50 at Trader Joe\'s',
    'Can I afford $120 dinner out tonight?',
    'What is my emergency cash runway if income stops?',
    'Audit recurring subscriptions for leaks'
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#0A0910] text-[#18181B] dark:text-[#F4F4F5] flex flex-col font-sans transition-colors duration-200">
      
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden">
        
        <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8 text-center sm:text-left">
          
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-medium border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
            <span>PURSE · AUTONOMOUS PRIVATE FINANCE COPILOT</span>
          </div>

          {/* Headline */}
          <div className="space-y-4 max-w-3xl">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-[1.08] text-balance">
              Every Dollar In Order. Private In Your Pocket.
            </h1>
            <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
              Conversational bookkeeping, natural voice speech, smart envelope budgeting, and persistent memory reasoning stored completely in your browser.
            </p>
          </div>

          {/* Action Row: Open App + PWA Install Button */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3.5 pt-2">
            
            <button
              onClick={() => setCurrentView('chat')}
              className="flex items-center gap-2 px-7 py-3.5 rounded-2xl text-xs sm:text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-all tactile-btn cursor-pointer shadow-lg shadow-violet-500/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch Purse App</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* PWA Install Button (Shown if PWA not detected) */}
            {!isInstalled && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-2 px-5 py-3.5 rounded-2xl text-xs sm:text-sm font-mono font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-850 transition-all cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Install Purse on Device</span>
              </button>
            )}

            <button
              onClick={() => setCurrentView('overview')}
              className="px-5 py-3.5 rounded-2xl text-xs sm:text-sm font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-850 transition-colors cursor-pointer"
            >
              <span>Explore Wallet Cockpit</span>
            </button>

          </div>

          {/* Interactive Bento Intent Simulator */}
          <div className="pt-6">
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xl overflow-hidden text-left">
              
              <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="font-mono text-xs text-zinc-800 dark:text-zinc-200 ml-2 font-bold">
                    Live Cognitive Simulator
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                    <Mic className="w-3 h-3 text-violet-500" />
                    <Volume2 className="w-3 h-3 text-violet-500" />
                    <span>Web Speech Enabled</span>
                  </span>
                </div>
              </div>

              <div className="p-5 sm:p-6 space-y-3.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={simPrompt}
                    onChange={e => setSimPrompt(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && runSimulation(simPrompt)}
                    placeholder="Try speaking or typing: e.g. 'Spent $64 at Trader Joe\'s'"
                    className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-3 rounded-xl text-xs sm:text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-violet-500"
                  />
                  <button
                    onClick={() => runSimulation(simPrompt)}
                    className="px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-mono font-semibold transition-all tactile-btn cursor-pointer shrink-0 shadow-xs"
                  >
                    Simulate
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {samplePrompts.map(p => (
                    <button
                      key={p}
                      onClick={() => runSimulation(p)}
                      className="text-[11px] font-mono px-3.5 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-750 transition-colors cursor-pointer font-medium"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {simOutput && (
                <div className="px-5 sm:px-6 pb-6 pt-1 space-y-3 font-mono text-xs border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-[11px] pt-3 font-bold">
                    <span>RECOGNIZED INTENT:</span>
                    <span className="font-bold text-violet-600 dark:text-violet-400">{simOutput.intent}</span>
                  </div>

                  <div className="space-y-1.5">
                    {simOutput.steps.map(s => (
                      <div key={s.step} className="flex items-start gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">0{s.step}. {s.title}: </span>
                          <span className="text-zinc-600 dark:text-zinc-400">{s.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {simOutput.measurableValue && (
                    <div className="p-3 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded-xl text-violet-900 dark:text-violet-200 font-bold">
                      MEASURABLE VALUE: {simOutput.measurableValue}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>
      </section>

      {/* 3 Bento Feature Highlights */}
      <section className="py-16 max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/80 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
              <Mic className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              Voice-First Natural Speech
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
              Speak transactions into the mic or listen to the agent read answers aloud using modern Web Speech APIs with zero latency.
            </p>
          </div>

          <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              Safe Non-Destructive Gates
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
              The AI agent cannot silently change your records. Every transaction requires your approval and includes a 1-click Rollback.
            </p>
          </div>

          <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              Persistent Memory Core
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
              Your financial invariants and habits persist in a compact Markdown knowledge file that you can inspect, edit, and export anytime.
            </p>
          </div>

        </div>
      </section>

      {/* PWA iOS / Browser Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800 w-full max-w-sm p-6 rounded-3xl shadow-2xl space-y-4 font-mono text-xs animate-in zoom-in-95 duration-150">
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
              To install Purse on your device for quick access, offline resilience, and a native app experience:
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
      <footer className="py-8 border-t border-zinc-200 dark:border-zinc-800 text-center text-xs font-mono text-zinc-400 dark:text-zinc-500">
        Purse · Autonomous AI Personal Finance Copilot
      </footer>

    </div>
  );
};
