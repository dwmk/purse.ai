import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { AppView } from '../../types/finance';
import {
  MessageSquare,
  Wallet,
  PieChart,
  Calendar,
  Brain,
} from 'lucide-react';

export const BottomDock: React.FC = () => {
  const { currentView, setCurrentView } = useFinance();

  if (currentView === 'landing') return null;

  const tabs: { label: string; view: AppView; icon: React.ReactNode }[] = [
    { label: 'Copilot', view: 'chat', icon: <MessageSquare className="w-4 h-4" /> },
    { label: 'Wallet', view: 'overview', icon: <Wallet className="w-4 h-4" /> },
    { label: 'Envelopes', view: 'budgets', icon: <PieChart className="w-4 h-4" /> },
    { label: 'Bills', view: 'bills', icon: <Calendar className="w-4 h-4" /> },
    { label: 'Memory', view: 'memory', icon: <Brain className="w-4 h-4" /> }
  ];

  return (
    <div className="sm:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 max-w-sm w-[92%]">
      <nav className="p-1.5 rounded-full border border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-[#121216]/90 backdrop-blur-md shadow-2xl flex items-center justify-around">
        {tabs.map(t => {
          const isActive = currentView === t.view;
          return (
            <button
              key={t.view}
              onClick={() => setCurrentView(t.view)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer ${
                isActive
                  ? 'bg-violet-600 text-white font-bold shadow-md scale-105'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {t.icon}
              <span className={isActive ? 'inline' : 'hidden sm:inline'}>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
