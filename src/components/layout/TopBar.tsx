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
  Box
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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-[#0A0910]/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        
        {/* Zone 1: Brand on Landing / Sidebar Toggle while in /app */}
        {isLanding ? (
          <button
            onClick={() => setCurrentView('landing')}
            className="flex items-center gap-2.5 text-left text-zinc-900 dark:text-zinc-100 hover:opacity-85 transition-opacity cursor-pointer group shrink-0"
          >
            <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden p-1.5">
              <img src="/icon.svg" alt="Purse" className="w-5 h-5 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-sans font-extrabold text-base tracking-tight leading-tight text-zinc-900 dark:text-zinc-100">
                Purse
              </span>
              <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 leading-tight">
                AI Finance Copilot
              </span>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleSidebar}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer text-xs font-mono tactile-btn ${
                isSidebarOpen
                  ? 'border-violet-600 bg-violet-600 text-white font-bold shadow-xs'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-850'
              }`}
              title={isSidebarOpen ? 'Close conversation sidebar' : 'Open conversation history sidebar'}
              aria-label="Toggle Conversation Sidebar"
            >
              <PanelLeft className="w-4 h-4" />
              <span className="font-sans font-semibold text-xs">History</span>
            </button>

            <button
              onClick={() => {
                createNewConversation();
                if (currentView !== 'chat') setCurrentView('chat');
              }}
              className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-all cursor-pointer tactile-btn"
              title="Start New Chat"
              aria-label="Start New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Zone 2: Navigation Links for Desktop */}
        {!isLanding && (
          <nav className="hidden sm:flex items-center gap-6 text-xs font-medium">
            <button
              onClick={() => setCurrentView('chat')}
              className={`py-1 transition-colors cursor-pointer ${
                currentView === 'chat'
                  ? 'text-violet-600 dark:text-violet-400 font-bold border-b-2 border-violet-600 dark:border-violet-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setCurrentView('overview')}
              className={`py-1 transition-colors cursor-pointer ${
                currentView === 'overview'
                  ? 'text-violet-600 dark:text-violet-400 font-bold border-b-2 border-violet-600 dark:border-violet-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Wallet &amp; Runway
            </button>
            <button
              onClick={() => setCurrentView('budgets')}
              className={`py-1 transition-colors cursor-pointer ${
                currentView === 'budgets'
                  ? 'text-violet-600 dark:text-violet-400 font-bold border-b-2 border-violet-600 dark:border-violet-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Envelopes
            </button>
            <button
              onClick={() => setCurrentView('bills')}
              className={`py-1 transition-colors cursor-pointer ${
                currentView === 'bills'
                  ? 'text-violet-600 dark:text-violet-400 font-bold border-b-2 border-violet-600 dark:border-violet-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Bills
            </button>
            <button
              onClick={() => setCurrentView('memory')}
              className={`py-1 transition-colors cursor-pointer ${
                currentView === 'memory'
                  ? 'text-violet-600 dark:text-violet-400 font-bold border-b-2 border-violet-600 dark:border-violet-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Memory Core
            </button>
          </nav>
        )}

        {/* Zone 3: Micro-Interactions (3D Toggle + Mute TTS Toggle + Theme Switcher + Settings Icon) */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* 3D / 2D Avatar Toggle Button */}
          <button
            onClick={toggle3DMode}
            title={is3DMode ? '3D Fiona Avatar Active (Click to switch to 2D)' : '3D Mode Inactive (Click to switch to 3D Fiona Avatar)'}
            aria-label="Toggle 3D Avatar"
            className={`p-2 rounded-xl border transition-all cursor-pointer tactile-btn ${
              is3DMode
                ? 'border-violet-600 bg-violet-600 text-white shadow-xs'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Box className="w-4 h-4" />
          </button>

          {/* TTS Audio Voice Toggle with immediate speech cutoff */}
          <button
            onClick={() => {
              stopSpeaking();
              toggleSpeechEnabled();
            }}
            title={isSpeechEnabled ? 'Voice readout active (Click to mute & stop)' : 'Voice readout muted (Click to enable)'}
            className={`p-2 rounded-xl border transition-all cursor-pointer tactile-btn ${
              isSpeechEnabled
                ? 'border-violet-600 bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-bold'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {isSpeechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark/light theme"
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer shadow-xs active:scale-95"
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
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-all tactile-btn cursor-pointer whitespace-nowrap shadow-xs ml-1"
            >
              <span>Open Purse</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => setCurrentView('settings')}
              title="Settings & System Governance"
              className={`p-2 rounded-xl border transition-colors cursor-pointer tactile-btn ${
                currentView === 'settings'
                  ? 'border-violet-600 bg-violet-600 text-white font-bold'
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
