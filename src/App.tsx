import React from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { TopBar } from './components/layout/TopBar';
import { BottomDock } from './components/layout/BottomDock';
import { ConversationSidebar } from './components/layout/ConversationSidebar';
import { FionaAvatar } from './components/avatar/FionaAvatar';
import { LandingPage } from './components/landing/LandingPage';
import { OverviewView } from './components/dashboard/OverviewView';
import { AgentChatView } from './components/chat/AgentChatView';
import { LedgerView } from './components/ledger/LedgerView';
import { BudgetsView } from './components/budgets/BudgetsView';
import { BillsView } from './components/bills/BillsView';
import { MemoryCoreView } from './components/memory/MemoryCoreView';
import { SettingsView } from './components/settings/SettingsView';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { InitializationModal } from './components/onboarding/InitializationModal';

const AppContent: React.FC = () => {
  const {
    currentView,
    notification,
    clearNotification,
    showInitializationModal,
    setShowInitializationModal,
    isInitialized
  } = useFinance();

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
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#0A0910] text-[#18181B] dark:text-[#F4F4F5] flex flex-col font-sans transition-colors duration-200">
      <TopBar />
      
      {/* Slide-out / Collapsible Conversation History Sidebar */}
      <ConversationSidebar />
      
      <main className="flex-1 w-full pb-16 sm:pb-4">
        {renderView()}
      </main>

      {/* 3D Fiona Avatar (Waist-height in 3D Chat view, or PIP in bottom-left corner behind floating navbar) */}
      <FionaAvatar />

      {/* Floating Bottom Dock on Mobile Views Only */}
      <BottomDock />

      {/* Ledger Initialization / AI Ingestion Modal */}
      <InitializationModal
        isOpen={showInitializationModal && currentView !== 'landing'}
        onClose={() => setShowInitializationModal(false)}
        canCancel={isInitialized}
      />

      {/* Floating Notification Toast with Action Button (e.g. "Fix") */}
      {notification && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 z-50 max-w-sm w-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex items-center justify-between gap-3 font-mono text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2.5 min-w-0">
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
            {notification.type === 'info' && <Info className="w-4 h-4 text-violet-500 shrink-0" />}
            <span className="leading-tight font-sans text-xs truncate text-balance">{notification.message}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {notification.action && (
              <button
                onClick={() => {
                  notification.action?.onClick();
                  clearNotification();
                }}
                className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-colors"
              >
                {notification.action.label}
              </button>
            )}
            <button
              onClick={clearNotification}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
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
