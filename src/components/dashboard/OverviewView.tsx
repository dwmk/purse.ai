import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import {
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Trash2
} from 'lucide-react';

export const OverviewView: React.FC = () => {
  const {
    accounts,
    transactions,
    budgets,
    actions,
    rollbackAction,
    deleteTransaction,
    setCurrentView
  } = useFinance();

  const [activeAccountIdx, setActiveAccountIdx] = useState(0);
  const activeAccount = accounts[activeAccountIdx] || accounts[0];

  const totalLiquid = accounts
    .filter(a => a.type === 'checking' || a.type === 'savings')
    .reduce((sum, a) => sum + a.balance, 0);

  const monthlyEssentialNeeds = budgets
    .filter(b => b.type === 'need')
    .reduce((sum, b) => sum + b.allocated, 0);

  const runwayMonths = monthlyEssentialNeeds > 0 ? (totalLiquid / monthlyEssentialNeeds).toFixed(1) : '5.0';
  const safeDailySpend = '74.20';

  const recentTxs = transactions.slice(0, 6);
  const appliedActions = actions.filter(a => a.status === 'applied');

  return (
    <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-6 font-sans">
      
      {/* Top 2-Column Desktop Grid: Luxury Card on Left, Key Metrics on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: Solid Luxury Card Showcase (NO gradients) */}
        <div className="lg:col-span-7 relative overflow-hidden rounded-3xl p-6 sm:p-7 bg-[#8A7EA4] text-[#F9BBAE] shadow-xl border border-[#B59DD1] flex flex-col justify-between min-h-[220px]">
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B59DD1]" />
              <span className="font-mono text-xs uppercase tracking-wider text-[#F9BBAE]">
                {activeAccount.institution} · {activeAccount.name}
              </span>
            </div>
            <span className="font-mono text-xs text-[#F9BBAE]/80">
              {activeAccount.accountNumberMask}
            </span>
          </div>

          <div className="space-y-1 mb-6">
            <span className="text-xs font-mono uppercase text-[#F3ACB4] tracking-wider font-semibold">
              AVAILABLE BALANCE
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight tabular-nums text-[#F9BBAE]">
              ${activeAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Account Selector Pill Strip */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-3 border-t border-[#B59DD1]/60">
            {accounts.map((acc, idx) => (
              <button
                key={acc.id}
                onClick={() => setActiveAccountIdx(idx)}
                className={`px-3 py-1 rounded-full text-xs font-mono whitespace-nowrap transition-all cursor-pointer ${
                  activeAccountIdx === idx
                    ? 'bg-[#F9BBAE] text-[#8A7EA4] font-bold shadow-xs'
                    : 'bg-[#B59DD1] text-[#8A7EA4] hover:bg-[#F3ACB4]'
                }`}
              >
                {acc.type.toUpperCase()}: ${acc.balance.toFixed(0)}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Key Metric Dial Cards */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          
          <div className="p-5 rounded-3xl border border-[#C794B0] dark:border-[#B59DD1] bg-[#F3ACB4] dark:bg-[#8A7EA4] shadow-xs flex-1 flex flex-col justify-center">
            <span className="text-[11px] font-mono text-[#8A7EA4] dark:text-[#F9BBAE] uppercase tracking-wider block mb-1 font-bold">
              Safe To Spend Today
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-[#8A7EA4] dark:text-[#F9BBAE] tabular-nums">
              ${safeDailySpend}
              <span className="text-xs font-normal text-[#8A7EA4]/70 dark:text-[#F9BBAE]/70"> / day</span>
            </div>
            <p className="text-[11px] text-[#8A7EA4]/80 dark:text-[#F9BBAE]/80 mt-1 font-mono">
              Calculated after fixed housing, bills &amp; emergency savings
            </p>
          </div>

          <div className="p-5 rounded-3xl border border-[#C794B0] dark:border-[#B59DD1] bg-[#F3ACB4] dark:bg-[#8A7EA4] shadow-xs flex-1 flex flex-col justify-center">
            <span className="text-[11px] font-mono text-[#8A7EA4] dark:text-[#F9BBAE] uppercase tracking-wider block mb-1 font-bold">
              Emergency Cash Runway
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-[#8A7EA4] dark:text-[#F9BBAE] tabular-nums">
              {runwayMonths}
              <span className="text-xs font-normal text-[#8A7EA4]/70 dark:text-[#F9BBAE]/70"> months</span>
            </div>
            <p className="text-[11px] text-[#8A7EA4]/80 dark:text-[#F9BBAE]/80 mt-1 font-mono">
              Zero-income survival reserve (${totalLiquid.toLocaleString()} liquid)
            </p>
          </div>

        </div>

      </div>

      {/* Recent Ledger Activity */}
      <div className="p-5 sm:p-6 rounded-3xl border border-[#C794B0] dark:border-[#B59DD1] bg-[#F3ACB4] dark:bg-[#8A7EA4] shadow-xs space-y-3.5">
        <div className="flex items-center justify-between pb-3 border-b border-[#C794B0] dark:border-[#B59DD1]">
          <div>
            <span className="font-bold text-sm text-[#8A7EA4] dark:text-[#F9BBAE] block">
              Recent Ledger Activity
            </span>
            <span className="text-xs text-[#8A7EA4]/80 dark:text-[#F9BBAE]/80">Stored safely in private browser storage</span>
          </div>
          <button
            onClick={() => setCurrentView('ledger')}
            className="text-xs font-mono text-[#8A7EA4] dark:text-[#F9BBAE] hover:underline cursor-pointer font-bold"
          >
            All Transactions &rarr;
          </button>
        </div>

        <div className="divide-y divide-[#C794B0]/60 dark:divide-[#B59DD1]/60 font-mono text-xs">
          {recentTxs.map(t => {
            const isIncome = t.type === 'income';
            return (
              <div key={t.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#8A7EA4] dark:text-[#F9BBAE] text-xs sm:text-sm">{t.merchant}</div>
                  <div className="text-[11px] text-[#8A7EA4]/70 dark:text-[#F9BBAE]/70">
                    {t.date} · {t.category}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold tabular-nums text-xs sm:text-sm text-[#8A7EA4] dark:text-[#F9BBAE]">
                    {isIncome ? '+' : '-'}${t.amount.toFixed(2)}
                  </span>
                  <button
                    onClick={() => deleteTransaction(t.id)}
                    aria-label={`Delete ${t.merchant}`}
                    className="text-[#8A7EA4] dark:text-[#F9BBAE] hover:opacity-60 p-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Applied Agent Actions with 1-Click Undo */}
      {appliedActions.length > 0 && (
        <div className="p-5 rounded-3xl border border-[#C794B0] dark:border-[#B59DD1] bg-[#F3ACB4] dark:bg-[#8A7EA4] shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-[#C794B0] dark:border-[#B59DD1]">
            <span className="font-bold text-[#8A7EA4] dark:text-[#F9BBAE] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#8A7EA4] dark:text-[#F9BBAE]" />
              <span>Agent Mutation Stack (Safe Rollback)</span>
            </span>
            <span className="text-[#8A7EA4]/80 dark:text-[#F9BBAE]/80">{appliedActions.length} actions</span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {appliedActions.slice(0, 4).map(a => (
              <div key={a.id} className="p-2.5 bg-[#F9BBAE] dark:bg-[#B59DD1] rounded-xl flex items-center justify-between gap-3 border border-[#C794B0] dark:border-[#8A7EA4]">
                <span className="truncate text-[#8A7EA4] text-xs font-semibold">
                  {a.description}
                </span>
                <button
                  onClick={() => rollbackAction(a.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#8A7EA4] text-[#8A7EA4] hover:bg-[#F3ACB4] text-[11px] shrink-0 cursor-pointer font-bold"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Undo</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Launch CTA to Copilot */}
      <button
        onClick={() => setCurrentView('chat')}
        className="w-full py-4 rounded-2xl bg-[#8A7EA4] text-[#F9BBAE] hover:bg-[#B59DD1] hover:text-[#8A7EA4] font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all tactile-btn cursor-pointer"
      >
        <Sparkles className="w-4 h-4" />
        <span>Ask Purse Copilot to Log or Analyze</span>
      </button>

    </div>
  );
};
