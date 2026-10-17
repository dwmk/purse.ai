import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { AppView } from '../../types/finance';
import {
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Settings,
  ArrowRight,
  PanelLeft,
  Plus,
  Sparkles
} from 'lucide-react';

export const TopBar: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    theme,
    toggleTheme,
    isSpeechEnabled,
    toggleSpeechEnabled,
    stopSpeaking,
    is3DMode,
    toggle3DMode,
    isSidebarOpen,
    toggleSidebar,
    createNewConversation
  } = useFinance();

  const isLanding = currentView === 'landing';

  const navLinks: { id: AppView; label: string; icon: string }[] = [
    { id: 'chat', label: 'Copilot Chat', icon: '💬' },
    { id: 'overview', label: 'Wallet & Runway', icon: '👛' },
    { id: 'ledger', label: 'Ledger', icon: '📊' },
    { id: 'budgets', label: 'Envelopes', icon: '🎯' },
    { id: 'bills', label: 'Bills', icon: '📅' },
    { id: 'memory', label: 'Memory Core', icon: '🧠' }
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-violet-100/80 dark:border-zinc-800/80 bg-white/85 dark:bg-[#0A0910]/85 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        
        {/* Zone 1: Brand on Landing / Sidebar Toggle while in /app */}
        {isLanding ? (
          <button
            onClick={() => setCurrentView('landing')}
            className="flex items-center gap-2.5 text-left text-zinc-900 dark:text-zinc-100 transition-all cursor-pointer group shrink-0 bubbly-btn"
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md overflow-hidden p-1.5 animate-bounce-gentle">
              <img src="/icon.svg" alt="Purse" className="w-5 h-5 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-sans font-extrabold text-base tracking-tight leading-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                <span>Purse</span>
                <span className="text-xs">✨</span>
              </span>
              <span className="text-[10px] font-mono text-violet-600 dark:text-violet-400 font-bold leading-tight">
                AI Autonomous Finance
              </span>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleSidebar}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border transition-all cursor-pointer text-xs font-mono bubbly-btn ${
                isSidebarOpen
                  ? 'border-violet-600 bg-violet-600 text-white font-bold shadow-md'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-850 hover:border-violet-300'
              }`}
              title={isSidebarOpen ? 'Close conversation history' : 'Open conversation history'}
              aria-label="Toggle Conversation Sidebar"
            >
              <PanelLeft className="w-4 h-4" />
              <span className="font-sans font-bold text-xs hidden sm:inline">History</span>
            </button>

            <button
              onClick={() => {
                createNewConversation();
                if (currentView !== 'chat') setCurrentView('chat');
              }}
              className="p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-violet-50 dark:hover:bg-zinc-850 hover:border-violet-300 transition-all cursor-pointer bubbly-btn shadow-xs"
              title="Start New Chat"
              aria-label="Start New Chat"
            >
              <Plus className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </button>
          </div>
        )}

        {/* Zone 2: Navigation Links for Desktop */}
        {!isLanding && (
          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
            {navLinks.map(link => {
              const isActive = currentView === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => setCurrentView(link.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer bubbly-pill ${
                    isActive
                      ? 'bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 font-bold shadow-xs scale-103'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-850/60'
                  }`}
                >
                  <span className="text-xs">{link.icon}</span>
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Zone 3: Micro-Interactions (3D Toggle + Mute TTS Toggle + Theme Switcher + Settings Icon) */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* 3D / 2D Avatar Toggle Button */}
          <button
            onClick={toggle3DMode}
            title={is3DMode ? '3D Fiona Avatar Active (Click for 2D)' : '2D View Active (Click for 3D Fiona Avatar)'}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-mono font-bold rounded-2xl border transition-all cursor-pointer bubbly-btn ${
              is3DMode
                ? 'border-violet-600 bg-violet-600 text-white shadow-md'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <span>{is3DMode ? '✨ 3D' : '2D'}</span>
          </button>

          {/* TTS Audio Voice Toggle with immediate speech cutoff */}
          <button
            onClick={() => {
              stopSpeaking();
              toggleSpeechEnabled();
            }}
            title={isSpeechEnabled ? 'Voice readout active (Click to mute)' : 'Voice readout muted (Click to enable)'}
            className={`p-2 rounded-2xl border transition-all cursor-pointer bubbly-btn ${
              isSpeechEnabled
                ? 'border-violet-600 bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-bold'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {isSpeechEnabled ? <Volume2 className="w-4 h-4 text-violet-600" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark/light theme"
            className="p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer shadow-xs bubbly-btn"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-600" />
            )}
          </button>

          {isLanding ? (
            <button
              onClick={() => setCurrentView('chat')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-2xl transition-all bubbly-btn cursor-pointer whitespace-nowrap shadow-md ml-1"
            >
              <span>Launch Copilot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => setCurrentView('settings')}
              title="Settings & System Governance"
              className={`p-2 rounded-2xl border transition-colors cursor-pointer bubbly-btn ${
                currentView === 'settings'
                  ? 'border-violet-600 bg-violet-600 text-white font-bold shadow-md'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

        </div>

      </div>
    </header>
  );
};
