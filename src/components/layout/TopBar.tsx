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
        
        {/* Navigation Links for Desktop layout */}
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
              Memory
            </button>
          </nav>
        )}

        {/* Micro-Interactions (3D Toggle + Mute TTS Toggle + Theme Switcher + Settings Icon) */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* 3D mode, sound and theme switcher buttons are only visible in /app and inactive on landing page / */}
          {!isLanding && (
            <>
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
            </>
          )}

        </div>

      </div>
    </header>
  );
};
