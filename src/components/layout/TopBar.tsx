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
  } = useFinance();

  const isLanding = currentView === 'landing';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#C794B0] dark:border-[#B59DD1] bg-[#F3ACB4] dark:bg-[#8A7EA4] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        
        {/* Zone 1: Purse Luxury Brand Identity with 5-Color System */}
        <button
          onClick={() => setCurrentView('landing')}
          className="flex items-center gap-2.5 text-left text-[#8A7EA4] dark:text-[#F9BBAE] hover:opacity-85 transition-opacity cursor-pointer group shrink-0"
        >
          <div className="w-8 h-8 rounded-xl bg-[#8A7EA4] text-[#F9BBAE] flex items-center justify-center font-bold text-sm shadow-sm ring-1 ring-[#B59DD1]">
            👛
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-extrabold text-base tracking-tight leading-tight text-[#8A7EA4] dark:text-[#F9BBAE]">
              Purse
            </span>
            <span className="text-[10px] font-mono text-[#8A7EA4] dark:text-[#F3ACB4] leading-tight">
              AI Finance Copilot
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation Links for Desktop */}
        {!isLanding && (
          <nav className="hidden sm:flex items-center gap-6 text-xs font-medium">
            <button
              onClick={() => setCurrentView('chat')}
              className={`py-1 transition-colors cursor-pointer ${
                currentView === 'chat'
                  ? 'text-[#8A7EA4] dark:text-[#F9BBAE] font-bold border-b-2 border-[#8A7EA4] dark:border-[#F9BBAE]'
                  : 'text-[#8A7EA4]/80 dark:text-[#F9BBAE]/80 hover:text-[#8A7EA4] dark:hover:text-[#F9BBAE]'
              }`}
            >
              Copilot Chat
            </button>
            <button
              onClick={() => setCurrentView('overview')}
              className={`py-1 transition-colors cursor-pointer ${
                currentView === 'overview'
                  ? 'text-[#8A7EA4] dark:text-[#F9BBAE] font-bold border-b-2 border-[#8A7EA4] dark:border-[#F9BBAE]'
                  : 'text-[#8A7EA4]/80 dark:text-[#F9BBAE]/80 hover:text-[#8A7EA4] dark:hover:text-[#F9BBAE]'
              }`}
            >
              Wallet &amp; Runway
            </button>
            <button
              onClick={() => setCurrentView('budgets')}
              className={`py-1 transition-colors cursor-pointer ${
                currentView === 'budgets'
                  ? 'text-[#8A7EA4] dark:text-[#F9BBAE] font-bold border-b-2 border-[#8A7EA4] dark:border-[#F9BBAE]'
                  : 'text-[#8A7EA4]/80 dark:text-[#F9BBAE]/80 hover:text-[#8A7EA4] dark:hover:text-[#F9BBAE]'
              }`}
            >
              Envelopes
            </button>
            <button
              onClick={() => setCurrentView('bills')}
              className={`py-1 transition-colors cursor-pointer ${
                currentView === 'bills'
                  ? 'text-[#8A7EA4] dark:text-[#F9BBAE] font-bold border-b-2 border-[#8A7EA4] dark:border-[#F9BBAE]'
                  : 'text-[#8A7EA4]/80 dark:text-[#F9BBAE]/80 hover:text-[#8A7EA4] dark:hover:text-[#F9BBAE]'
              }`}
            >
              Bills
            </button>
            <button
              onClick={() => setCurrentView('memory')}
              className={`py-1 transition-colors cursor-pointer ${
                currentView === 'memory'
                  ? 'text-[#8A7EA4] dark:text-[#F9BBAE] font-bold border-b-2 border-[#8A7EA4] dark:border-[#F9BBAE]'
                  : 'text-[#8A7EA4]/80 dark:text-[#F9BBAE]/80 hover:text-[#8A7EA4] dark:hover:text-[#F9BBAE]'
              }`}
            >
              Memory Core
            </button>
          </nav>
        )}

        {/* Zone 3: Micro-Interactions (Mute TTS Toggle + Theme Switcher + Settings Icon) */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* TTS Audio Voice Toggle with immediate speech cutoff */}
          <button
            onClick={() => {
              stopSpeaking();
              toggleSpeechEnabled();
            }}
            title={isSpeechEnabled ? 'Voice readout active (Click to mute & stop)' : 'Voice readout muted (Click to enable)'}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isSpeechEnabled
                ? 'border-[#8A7EA4] dark:border-[#F9BBAE] bg-[#B59DD1] text-[#8A7EA4] dark:text-[#8A7EA4] font-bold'
                : 'border-[#C794B0] text-[#8A7EA4] dark:text-[#F9BBAE] hover:bg-[#B59DD1]/40'
            }`}
          >
            {isSpeechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark/light theme"
            className="p-2 rounded-xl border border-[#C794B0] text-[#8A7EA4] dark:text-[#F9BBAE] hover:bg-[#B59DD1]/40 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-[#F9BBAE]" />
            ) : (
              <Moon className="w-4 h-4 text-[#8A7EA4]" />
            )}
          </button>

          {isLanding ? (
            <button
              onClick={() => setCurrentView('chat')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#F9BBAE] bg-[#8A7EA4] hover:bg-[#B59DD1] hover:text-[#8A7EA4] rounded-xl transition-all tactile-btn cursor-pointer whitespace-nowrap shadow-xs ml-1"
            >
              <span>Open Purse</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            /* Replaced 'Edge' button with Settings Icon */
            <button
              onClick={() => setCurrentView('settings')}
              title="Settings & System Governance"
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                currentView === 'settings'
                  ? 'border-[#8A7EA4] bg-[#B59DD1] text-[#8A7EA4] font-bold'
                  : 'border-[#C794B0] text-[#8A7EA4] dark:text-[#F9BBAE] hover:bg-[#B59DD1]/40'
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
