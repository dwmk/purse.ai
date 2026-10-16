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
    <div className="min-h-screen bg-[#F9BBAE] dark:bg-[#8A7EA4] text-[#8A7EA4] dark:text-[#F9BBAE] flex flex-col font-sans transition-colors duration-200">
      
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-[#C794B0] dark:border-[#B59DD1] overflow-hidden">
        
        <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8 text-center sm:text-left">
          
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-medium border border-[#8A7EA4] bg-[#F3ACB4] dark:bg-[#8A7EA4] text-[#8A7EA4] dark:text-[#F9BBAE] shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#8A7EA4] dark:bg-[#F9BBAE] animate-pulse" />
            <span>PURSE · AUTONOMOUS PRIVATE FINANCE COPILOT</span>
          </div>

          {/* Headline */}
          <div className="space-y-4 max-w-3xl">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#8A7EA4] dark:text-[#F9BBAE] leading-[1.08] text-balance">
              Every Dollar In Order. Private In Your Pocket.
            </h1>
            <p className="text-base sm:text-lg text-[#8A7EA4]/85 dark:text-[#F9BBAE]/85 max-w-2xl leading-relaxed">
              Conversational bookkeeping, natural voice speech, smart envelope budgeting, and persistent memory reasoning stored completely in your browser.
            </p>
          </div>

          {/* Action Row: Open App + PWA Install Button */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3.5 pt-2">
            
            <button
              onClick={() => setCurrentView('chat')}
              className="flex items-center gap-2 px-7 py-3.5 rounded-2xl text-xs sm:text-sm font-semibold text-[#F9BBAE] bg-[#8A7EA4] hover:bg-[#B59DD1] hover:text-[#8A7EA4] transition-all tactile-btn cursor-pointer shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch Purse App</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* PWA Install Button (Shown if PWA not detected) */}
            {!isInstalled && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-2 px-5 py-3.5 rounded-2xl text-xs sm:text-sm font-mono font-semibold border border-[#8A7EA4] bg-[#F3ACB4] dark:bg-[#8A7EA4] text-[#8A7EA4] dark:text-[#F9BBAE] hover:bg-[#B59DD1] hover:text-[#8A7EA4] transition-all cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Install Purse on Device</span>
              </button>
            )}

            <button
              onClick={() => setCurrentView('overview')}
              className="px-5 py-3.5 rounded-2xl text-xs sm:text-sm font-medium border border-[#C794B0] dark:border-[#B59DD1] bg-[#F3ACB4] dark:bg-[#8A7EA4] text-[#8A7EA4] dark:text-[#F9BBAE] hover:bg-[#B59DD1] hover:text-[#8A7EA4] transition-colors cursor-pointer"
            >
              <span>Explore Wallet Cockpit</span>
            </button>

          </div>

          {/* Interactive Bento Intent Simulator */}
          <div className="pt-6">
            <div className="rounded-3xl border border-[#C794B0] dark:border-[#B59DD1] bg-[#F3ACB4] dark:bg-[#8A7EA4] shadow-xl overflow-hidden text-left">
              
              <div className="px-5 py-3.5 border-b border-[#C794B0] dark:border-[#B59DD1] flex items-center justify-between bg-[#B59DD1]/30">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8A7EA4]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C794B0]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B59DD1]" />
                  <span className="font-mono text-xs text-[#8A7EA4] dark:text-[#F9BBAE] ml-2 font-bold">
                    Live Cognitive Simulator
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-mono text-[#8A7EA4] dark:text-[#F9BBAE]">
                    <Mic className="w-3 h-3" />
                    <Volume2 className="w-3 h-3" />
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
                    className="flex-1 bg-[#F9BBAE] dark:bg-[#8A7EA4] border border-[#8A7EA4] px-4 py-3 rounded-xl text-xs sm:text-sm font-mono text-[#8A7EA4] dark:text-[#F9BBAE] placeholder-[#8A7EA4]/60 dark:placeholder-[#F9BBAE]/60 focus:outline-none"
                  />
                  <button
                    onClick={() => runSimulation(simPrompt)}
                    className="px-5 py-3 bg-[#8A7EA4] text-[#F9BBAE] hover:bg-[#B59DD1] hover:text-[#8A7EA4] rounded-xl text-xs font-mono font-semibold transition-all tactile-btn cursor-pointer shrink-0"
                  >
                    Simulate
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {samplePrompts.map(p => (
                    <button
                      key={p}
                      onClick={() => runSimulation(p)}
                      className="text-[11px] font-mono px-3.5 py-1.5 rounded-full bg-[#B59DD1] text-[#8A7EA4] hover:bg-[#F9BBAE] border border-[#8A7EA4] transition-colors cursor-pointer font-medium"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {simOutput && (
                <div className="px-5 sm:px-6 pb-6 pt-1 space-y-3 font-mono text-xs border-t border-[#C794B0] dark:border-[#B59DD1]">
                  <div className="flex items-center justify-between text-[#8A7EA4] dark:text-[#F9BBAE] text-[11px] pt-3 font-bold">
                    <span>RECOGNIZED INTENT:</span>
                    <span className="font-bold text-[#8A7EA4] dark:text-[#F9BBAE]">{simOutput.intent}</span>
                  </div>

                  <div className="space-y-1.5">
                    {simOutput.steps.map(s => (
                      <div key={s.step} className="flex items-start gap-2 p-2.5 bg-[#F9BBAE] dark:bg-[#B59DD1] rounded-xl border border-[#C794B0] dark:border-[#8A7EA4]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#8A7EA4] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-[#8A7EA4]">0{s.step}. {s.title}: </span>
                          <span className="text-[#8A7EA4]/85">{s.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {simOutput.measurableValue && (
                    <div className="p-3 bg-[#B59DD1] border border-[#8A7EA4] rounded-xl text-[#8A7EA4] font-bold">
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
          
          <div className="p-6 rounded-3xl border border-[#C794B0] dark:border-[#B59DD1] bg-[#F3ACB4] dark:bg-[#8A7EA4] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#8A7EA4] text-[#F9BBAE] flex items-center justify-center font-bold">
              <Mic className="w-5 h-5 text-[#F9BBAE]" />
            </div>
            <h3 className="font-bold text-sm text-[#8A7EA4] dark:text-[#F9BBAE]">
              Voice-First Natural Speech
            </h3>
            <p className="text-xs text-[#8A7EA4]/80 dark:text-[#F9BBAE]/80 leading-relaxed font-sans">
              Speak transactions into the mic or listen to the agent read answers aloud using modern Web Speech APIs with zero latency.
            </p>
          </div>

          <div className="p-6 rounded-3xl border border-[#C794B0] dark:border-[#B59DD1] bg-[#F3ACB4] dark:bg-[#8A7EA4] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#8A7EA4] text-[#F9BBAE] flex items-center justify-center font-bold">
              <Shield className="w-5 h-5 text-[#F9BBAE]" />
            </div>
            <h3 className="font-bold text-sm text-[#8A7EA4] dark:text-[#F9BBAE]">
              Safe Non-Destructive Gates
            </h3>
            <p className="text-xs text-[#8A7EA4]/80 dark:text-[#F9BBAE]/80 leading-relaxed font-sans">
              The AI agent cannot silently change your records. Every transaction requires your approval and includes a 1-click Rollback.
            </p>
          </div>

          <div className="p-6 rounded-3xl border border-[#C794B0] dark:border-[#B59DD1] bg-[#F3ACB4] dark:bg-[#8A7EA4] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#8A7EA4] text-[#F9BBAE] flex items-center justify-center font-bold">
              <Cpu className="w-5 h-5 text-[#F9BBAE]" />
            </div>
            <h3 className="font-bold text-sm text-[#8A7EA4] dark:text-[#F9BBAE]">
              Persistent Memory Core
            </h3>
            <p className="text-xs text-[#8A7EA4]/80 dark:text-[#F9BBAE]/80 leading-relaxed font-sans">
              Your financial invariants and habits persist in a compact Markdown knowledge file that you can inspect, edit, and export anytime.
            </p>
          </div>

        </div>
      </section>

      {/* PWA iOS / Browser Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#8A7EA4]/60 backdrop-blur-sm p-4">
          <div className="bg-[#F3ACB4] dark:bg-[#8A7EA4] border border-[#C794B0] dark:border-[#B59DD1] w-full max-w-sm p-6 rounded-3xl shadow-2xl space-y-4 font-mono text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#C794B0] dark:border-[#B59DD1]">
              <div className="flex items-center gap-2 font-bold text-sm text-[#8A7EA4] dark:text-[#F9BBAE]">
                <Smartphone className="w-4 h-4 text-[#8A7EA4] dark:text-[#F9BBAE]" />
                <span>Install Purse App</span>
              </div>
              <button onClick={() => setShowIOSModal(false)} className="text-[#8A7EA4] dark:text-[#F9BBAE] hover:opacity-75 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[#8A7EA4] dark:text-[#F9BBAE] font-sans text-xs leading-relaxed">
              To install Purse on your device for quick access, offline resilience, and a native app experience:
            </p>

            <div className="p-3 bg-[#F9BBAE] dark:bg-[#B59DD1] rounded-xl space-y-2 text-[11px] text-[#8A7EA4] border border-[#C794B0] dark:border-[#8A7EA4]">
              <div>1. Tap your browser&apos;s <strong>Share</strong> or <strong>Menu (⋮)</strong> button.</div>
              <div>2. Scroll down and select <strong>&quot;Add to Home Screen&quot;</strong> or <strong>&quot;Install App&quot;</strong>.</div>
              <div>3. Launch Purse directly from your phone or desktop home screen!</div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#8A7EA4] text-[#F9BBAE] hover:bg-[#B59DD1] hover:text-[#8A7EA4] font-semibold cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Minimal Footer */}
      <footer className="py-8 border-t border-[#C794B0] dark:border-[#B59DD1] text-center text-xs font-mono text-[#8A7EA4] dark:text-[#F9BBAE]">
        Purse · Autonomous AI Personal Finance Copilot
      </footer>

    </div>
  );
};
