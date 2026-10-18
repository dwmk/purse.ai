import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { BrowserLMService, BrowserLMStatus } from '../../services/browserLm';
import {
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Settings,
  ArrowRight,
  PanelLeft,
  Box,
  Loader2,
  Cpu
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
    toggleSidebar
  } = useFinance();

  const [lmStatus, setLmStatus] = useState<BrowserLMStatus>(() => BrowserLMService.getStatus());

  useEffect(() => {
    return BrowserLMService.subscribe(st => setLmStatus(st));
  }, []);

  const isLanding = currentView === 'landing';

  return (
    <header className={`sticky top-0 z-40 w-full transition-colors ${
      isLanding
        ? 'border-b border-[#D9D2F2]/70 dark:border-[#38295F]/70 bg-[#F4F1FF]/90 dark:bg-[#150F29]/90 backdrop-blur-md'
        : 'border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/85 dark:bg-[#0A0910]/85 backdrop-blur-md'
    }`}>
      <div className={`${isLanding ? 'max-w-[1080px]' : 'max-w-7xl'} mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-4`}>
        
        {/* Left Side: Purse Wordmark & Brand Logo + Mobile Sidebar Toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          {!isLanding && (
            <button
              onClick={toggleSidebar}
              title="Toggle Conversation History"
              aria-label="Toggle Conversation History"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors sm:hidden"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => {
              setCurrentView(isLanding ? 'landing' : 'chat');
              if (isLanding) window.history.pushState(null, '', '/');
            }}
            className="flex items-center gap-2.5 group cursor-pointer text-left"
            title="Purse Autonomous Finance"
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-['Bricolage_Grotesque'] font-extrabold text-sm shadow-xs group-hover:scale-105 transition-transform ${
              isLanding
                ? 'bg-[#1E1538] dark:bg-[#F1EDFF] text-white dark:text-[#150F29]'
                : 'bg-violet-600 text-white'
            }`}>
              P
            </div>
            <span className={`font-extrabold text-2xl tracking-tight font-['Bricolage_Grotesque'] ${
              isLanding
                ? 'text-[#1E1538] dark:text-[#F1EDFF]'
                : 'text-zinc-900 dark:text-zinc-100'
            }`}>
              Purse
            </span>
          </button>
        </div>

        {/* Center: Navigation Links for In-App Desktop layout */}
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
              Wallet
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
            <button
              onClick={() => setCurrentView('settings')}
              className={`py-1 transition-colors cursor-pointer ${
                currentView === 'settings'
                  ? 'text-violet-600 dark:text-violet-400 font-bold border-b-2 border-violet-600 dark:border-violet-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Settings
            </button>
          </nav>
        )}

        {/* Right Side: Landing Controls OR In-App Controls */}
        {isLanding ? (
          <div className="flex items-center gap-3 shrink-0">
            {/* Theme Switcher Button on Landing Page */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle dark/light theme"
              title="Toggle theme"
              className="p-2 rounded-xl border border-[#D9D2F2] dark:border-[#38295F] text-[#5E557D] dark:text-[#A89FCB] hover:bg-[#D9D2F2]/40 dark:hover:bg-[#38295F]/40 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-[#1E1538]" />
              )}
            </button>

            {/* Get Started Button on Landing Page */}
            <button
              onClick={() => {
                setCurrentView('chat');
                window.history.pushState(null, '', '/app');
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full font-semibold text-sm transition-all bg-[#1E1538] hover:bg-[#2d2050] text-[#fff] dark:bg-[#F1EDFF] dark:hover:bg-white dark:text-[#150F29] shadow-sm cursor-pointer tactile-btn hover:scale-105 active:scale-95"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Browser Edge AI Model Status Indicator */}
            {lmStatus.status === 'downloading' || lmStatus.status === 'caching' ? (
              <div
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900/60 text-[11px] font-mono text-violet-700 dark:text-violet-300"
                title={lmStatus.message}
              >
                <Loader2 className="w-3 h-3 animate-spin text-violet-600 shrink-0" />
                <span className="truncate max-w-[140px]">Downloading AI: {lmStatus.progress}%</span>
              </div>
            ) : lmStatus.isCached ? (
              <div
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-[11px] font-mono text-emerald-700 dark:text-emerald-300"
                title="SmolLM2-135M neural weights preloaded in browser memory"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Ready</span>
              </div>
            ) : null}

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
              title="Toggle theme"
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-600" />
              )}
            </button>

            {/* Settings Icon in Top Right Corner of /app */}
            <button
              onClick={() => setCurrentView(currentView === 'settings' ? 'chat' : 'settings')}
              title="Settings (API Keys, Ingestion & Preferences)"
              aria-label="Settings"
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border transition-all cursor-pointer tactile-btn ${
                currentView === 'settings'
                  ? 'border-violet-600 bg-violet-600 text-white font-bold shadow-xs'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <Settings className="w-4 h-4 text-current" />
              <span className="hidden md:inline text-xs font-semibold">Settings</span>
            </button>
          </div>
        )}

      </div>
    </header>
  );
};
