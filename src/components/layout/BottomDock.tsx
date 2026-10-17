import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { AppView } from '../../types/finance';
import {
  MessageSquare,
  Wallet,
  PieChart,
  Calendar,
  Brain,
  FileSpreadsheet
} from 'lucide-react';

export const BottomDock: React.FC = () => {
  const { currentView, setCurrentView } = useFinance();

  if (currentView === 'landing') return null;

  const tabs: { label: string; view: AppView; icon: React.ReactNode }[] = [
    { label: 'Copilot', view: 'chat', icon: <MessageSquare className="w-4 h-4" /> },
    { label: 'Wallet', view: 'overview', icon: <Wallet className="w-4 h-4" /> },
    { label: 'Ledger', view: 'ledger', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { label: 'Envelopes', view: 'budgets', icon: <PieChart className="w-4 h-4" /> },
    { label: 'Bills', view: 'bills', icon: <Calendar className="w-4 h-4" /> },
    { label: 'Memory', view: 'memory', icon: <Brain className="w-4 h-4" /> }
  ];

  return (
    <div className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 max-w-md w-[95%]">
      <nav className="p-1.5 rounded-3xl border-2 border-violet-300/60 dark:border-violet-900/60 bg-white/95 dark:bg-[#121216]/95 backdrop-blur-lg shadow-2xl flex items-center justify-between gap-1">
        {tabs.map(t => {
          const isActive = currentView === t.view;
          return (
            <button
              key={t.view}
              onClick={() => setCurrentView(t.view)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-2 rounded-2xl text-[10px] sm:text-xs font-mono transition-all cursor-pointer bubbly-btn flex-1 ${
                isActive
                  ? 'bg-violet-600 text-white font-extrabold shadow-md scale-105'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-violet-50 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="shrink-0">{t.icon}</span>
              <span className="leading-none text-[9px] sm:text-xs">{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
