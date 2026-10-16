import React from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { TopBar } from './components/layout/TopBar';
import { BottomDock } from './components/layout/BottomDock';
import { LandingPage } from './components/landing/LandingPage';
import { OverviewView } from './components/dashboard/OverviewView';
import { AgentChatView } from './components/chat/AgentChatView';
import { LedgerView } from './components/ledger/LedgerView';
import { BudgetsView } from './components/budgets/BudgetsView';
import { BillsView } from './components/bills/BillsView';
import { MemoryCoreView } from './components/memory/MemoryCoreView';
import { SettingsView } from './components/settings/SettingsView';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentView, notification, clearNotification } = useFinance();

  const renderView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingPage />;
      case 'overview':
        return <OverviewView />;
      case 'chat':
        return <AgentChatView />;
      case 'ledger':
        return <LedgerView />;
      case 'budgets':
        return <BudgetsView />;
      case 'bills':
        return <BillsView />;
      case 'memory':
        return <MemoryCoreView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <AgentChatView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F9BBAE] dark:bg-[#8A7EA4] text-[#8A7EA4] dark:text-[#F9BBAE] flex flex-col font-sans transition-colors duration-200">
      <TopBar />
      
      <main className="flex-1 w-full pb-14 sm:pb-8">
        {renderView()}
      </main>

      {/* Floating Luxury Bottom Dock on App Views */}
      <BottomDock />

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 z-50 max-w-sm w-full bg-[#8A7EA4] dark:bg-[#F3ACB4] text-[#F9BBAE] dark:text-[#8A7EA4] p-3 rounded-2xl border border-[#B59DD1] shadow-2xl flex items-center justify-between gap-3 font-mono text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#F9BBAE] dark:text-[#8A7EA4] shrink-0" />}
            {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-[#F3ACB4] dark:text-[#8A7EA4] shrink-0" />}
            {notification.type === 'info' && <Info className="w-4 h-4 text-[#B59DD1] dark:text-[#8A7EA4] shrink-0" />}
            <span className="leading-tight font-sans text-xs">{notification.message}</span>
          </div>
          <button
            onClick={clearNotification}
            className="text-[#F9BBAE] dark:text-[#8A7EA4] hover:opacity-75 p-0.5 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <FinanceProvider>
      <AppContent />
    </FinanceProvider>
  );
}
