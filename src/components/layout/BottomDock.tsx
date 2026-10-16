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
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 max-w-sm w-[92%] sm:w-auto">
      <nav className="p-1.5 rounded-full border border-[#C794B0] dark:border-[#B59DD1] bg-[#F3ACB4] dark:bg-[#8A7EA4] shadow-xl flex items-center justify-around sm:gap-2">
        {tabs.map(t => {
          const isActive = currentView === t.view;
          return (
            <button
              key={t.view}
              onClick={() => setCurrentView(t.view)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#8A7EA4] text-[#F9BBAE] dark:bg-[#F9BBAE] dark:text-[#8A7EA4] font-bold shadow-md scale-105'
                  : 'text-[#8A7EA4] dark:text-[#F9BBAE] hover:bg-[#B59DD1]/40'
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
