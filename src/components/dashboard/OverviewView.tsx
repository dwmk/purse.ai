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
  const activeAccount = accounts[activeAccountIdx] || accounts[0] || {
    id: 'acc_default',
    name: 'Primary Account',
    type: 'checking' as const,
    balance: 0,
    currency: 'USD',
    institution: 'Purse Vault',
    accountNumberMask: '•••• 0001',
    lastUpdated: new Date().toISOString()
  };

  const totalLiquid = accounts
    .filter(a => a.type === 'checking' || a.type === 'savings')
    .reduce((sum, a) => sum + a.balance, 0);

  const monthlyEssentialNeeds = budgets
    .filter(b => b.type === 'need')
    .reduce((sum, b) => sum + b.allocated, 0);

  const runwayMonths = monthlyEssentialNeeds > 0 ? (totalLiquid / monthlyEssentialNeeds).toFixed(1) : (totalLiquid > 0 ? '12.0+' : '0.0');
  const safeDailySpend = monthlyEssentialNeeds > 0 ? Math.max(0, (totalLiquid - monthlyEssentialNeeds) / 30).toFixed(2) : Math.max(0, totalLiquid / 30).toFixed(2);

  const recentTxs = transactions.slice(0, 6);
  const appliedActions = actions.filter(a => a.status === 'applied');

  return (
    <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-6 font-sans">
      
      {/* Top 2-Column Desktop Grid: Luxury Card on Left, Key Metrics on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: Solid Luxury Card Showcase */}
        <div className="lg:col-span-7 relative overflow-hidden rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-violet-900 via-indigo-950 to-purple-950 text-white shadow-xl border border-violet-800/40 flex flex-col justify-between min-h-[220px]">
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400" />
              <span className="font-mono text-xs uppercase tracking-wider text-violet-200">
                {activeAccount.institution} · {activeAccount.name}
              </span>
            </div>
            <span className="font-mono text-xs text-violet-300/80">
              {activeAccount.accountNumberMask}
            </span>
          </div>

          <div className="space-y-1 mb-6">
            <span className="text-xs font-mono uppercase text-violet-300 tracking-wider font-semibold">
              AVAILABLE BALANCE
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight tabular-nums text-white">
              ${activeAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Account Selector Pill Strip */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-3 border-t border-white/10">
            {accounts.map((acc, idx) => (
              <button
                key={acc.id}
                onClick={() => setActiveAccountIdx(idx)}
                className={`px-3 py-1 rounded-full text-xs font-mono whitespace-nowrap transition-all cursor-pointer ${
                  activeAccountIdx === idx
                    ? 'bg-white text-violet-950 font-bold shadow-xs'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {acc.type.toUpperCase()}: ${acc.balance.toFixed(0)}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Key Metric Dial Cards */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          
          <div className="p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xs flex-1 flex flex-col justify-center">
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1 font-bold">
              Safe To Spend Today
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">
              ${safeDailySpend}
              <span className="text-xs font-normal text-zinc-400"> / day</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
              Calculated after fixed housing, bills &amp; emergency savings
            </p>
          </div>

          <div className="p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xs flex-1 flex flex-col justify-center">
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1 font-bold">
              Emergency Cash Runway
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">
              {runwayMonths}
              <span className="text-xs font-normal text-zinc-400"> months</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
              Zero-income survival reserve (${totalLiquid.toLocaleString()} liquid)
            </p>
          </div>

        </div>

      </div>

      {/* Recent Ledger Activity */}
      <div className="p-5 sm:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xs space-y-3.5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 block">
              Recent Ledger Activity
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Stored safely in private browser storage</span>
          </div>
          <button
            onClick={() => setCurrentView('ledger')}
            className="text-xs font-mono text-violet-600 dark:text-violet-400 hover:underline cursor-pointer font-bold"
          >
            All Transactions &rarr;
          </button>
        </div>

        {recentTxs.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-zinc-500 space-y-2">
            <p>No transactions logged yet.</p>
            <button
              onClick={() => setCurrentView('chat')}
              className="text-violet-600 dark:text-violet-400 font-bold hover:underline cursor-pointer"
            >
              Log your first transaction with Fiona in Chat &rarr;
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-xs">
            {recentTxs.map(t => {
              const isIncome = t.type === 'income';
              return (
                <div key={t.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm">{t.merchant}</div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {t.date} · {t.category}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold tabular-nums text-xs sm:text-sm ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                      {isIncome ? '+' : '-'}${t.amount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => deleteTransaction(t.id)}
                      aria-label={`Delete ${t.merchant}`}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Applied Agent Actions with 1-Click Undo */}
      {appliedActions.length > 0 && (
        <div className="p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-zinc-200 dark:border-zinc-800">
            <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Agent Mutation Stack (Safe Rollback)</span>
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">{appliedActions.length} actions</span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {appliedActions.slice(0, 4).map(a => (
              <div key={a.id} className="p-2.5 bg-zinc-50 dark:bg-zinc-900 rounded-xl flex items-center justify-between gap-3 border border-zinc-200 dark:border-zinc-800">
                <span className="truncate text-zinc-800 dark:text-zinc-200 text-xs font-semibold">
                  {a.description}
                </span>
                <button
                  onClick={() => rollbackAction(a.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] shrink-0 cursor-pointer font-bold"
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
        className="w-full py-4 rounded-2xl bg-violet-600 text-white hover:bg-violet-700 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all tactile-btn cursor-pointer"
      >
        <Sparkles className="w-4 h-4" />
        <span>Ask Purse Copilot to Log or Analyze</span>
      </button>

    </div>
  );
};
