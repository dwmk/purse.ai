import React, { useState, useEffect, useRef } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { LLMProvider } from '../../types/finance';
import { MODEL_OPTIONS, MODEL_LOGOS } from '../../constants/models';
import { BrowserLMService, BrowserLMStatus } from '../../services/browserLm';
import {
  Cpu,
  Key,
  Database,
  Download,
  Upload,
  RefreshCw,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  AlertTriangle,
  HardDrive,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    config,
    updateConfig,
    theme,
    toggleTheme,
    isSpeechEnabled,
    setIsSpeechEnabled,
    stopSpeaking,
    exportJson,
    importJson,
    resetAllData,
    wipeEverything,
    storageUsage,
    refreshStorageUsage,
    setShowInitializationModal,
    highlightedApiKeyProvider
  } = useFinance();

  const [provider, setProvider] = useState<LLMProvider>(config.provider);
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [model, setModel] = useState(config.model || '');
  const [autoApprove, setAutoApprove] = useState(config.autoApproveSafeActions);
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);

  // Browser LM status tracking
  const [browserLmStatus, setBrowserLmStatus] = useState<BrowserLMStatus>(BrowserLMService.getStatus());
  const [isDownloadingModel, setIsDownloadingModel] = useState(false);

  // Double-confirmation state for Clear All
  const [showClearModal, setShowClearModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const apiKeyInputRef = useRef<HTMLInputElement>(null);

  // Handle highlighted provider from "Fix" button
  useEffect(() => {
    if (highlightedApiKeyProvider) {
      setProvider(highlightedApiKeyProvider);
      setTimeout(() => {
        apiKeyInputRef.current?.focus();
        apiKeyInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, [highlightedApiKeyProvider]);

  // Subscribe to Browser LM status
  useEffect(() => {
    const unsub = BrowserLMService.subscribe(st => {
      setBrowserLmStatus(st);
      if (st.status === 'downloading' || st.status === 'caching') {
        setIsDownloadingModel(true);
      } else {
        setIsDownloadingModel(false);
      }
    });
    return unsub;
  }, []);

  const handleProviderSelect = (p: LLMProvider) => {
    setProvider(p);
    const opt = MODEL_OPTIONS.find(m => m.id === p);
    if (opt) {
      setModel(opt.model);
    }
    if (p === 'edge' && !browserLmStatus.isCached) {
      BrowserLMService.startDownload();
    }
  };

  const handleDownloadModel = () => {
    BrowserLMService.startDownload();
  };

  const handleClearModelCache = async () => {
    await BrowserLMService.clearCache();
  };

  const handleSaveLlm = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      provider,
      apiKey: apiKey.trim() || undefined,
      model: model.trim() || undefined,
      autoApproveSafeActions: autoApprove
    });
  };

  const handleJsonFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      importJson(text);
    };
    reader.readAsText(file);
  };

  const handleDirectJsonImport = () => {
    if (!importJsonText.trim()) return;
    importJson(importJsonText);
    setImportJsonText('');
    setShowImportArea(false);
  };

  const handleWipeEverything = () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'DELETE') return;
    wipeEverything();
    setShowClearModal(false);
    setDeleteConfirmationText('');
  };

  const currentProviderInfo = MODEL_OPTIONS.find(p => p.id === provider) || MODEL_OPTIONS[0];

  return (
    <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 space-y-6 font-sans text-zinc-900 dark:text-zinc-100">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block font-bold">
            System &amp; Storage Governance
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Purse Settings
          </h1>
        </div>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-colors cursor-pointer shadow-xs"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-zinc-600" />}
          <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
        </button>
      </div>

      {/* Ledger Initialization Card */}
      <div className="p-5 rounded-3xl border border-violet-200 dark:border-violet-900/50 bg-violet-50/40 dark:bg-violet-950/20 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span className="font-bold text-sm text-violet-950 dark:text-violet-200 font-mono">
              Ledger Ingestion &amp; Setup Wizard
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
            Upload new statements, CSV files, or raw text to have AI parse and organize transactions, or start over fresh with a blank account.
          </p>
        </div>
        <button
          onClick={() => setShowInitializationModal(true)}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-md shadow-violet-600/20 transition-all shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Launch Ingestion Wizard</span>
        </button>
      </div>

      {/* Local Storage Status Card */}
      <div className="p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xs space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <span className="font-bold flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span>Local Browser Storage Allocation</span>
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-bold">
            100% PRIVATE ON-DEVICE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-0.5 font-bold">
              TOTAL BROWSER STORAGE USED
            </span>
            <div className="text-xl font-bold text-violet-600 dark:text-violet-400 tabular-nums">
              {storageUsage.formatted}
            </div>
            <p className="text-[10px] text-zinc-500 font-sans mt-0.5">
              Encrypted locally across transactions, bills, and knowledge graphs.
            </p>
          </div>

          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-0.5 font-bold">
                STORAGE PRIVACY GUARANTEE
              </span>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-sans leading-tight">
                Data never leaves your browser sandbox. Zero cloud telemetry or external logging.
              </p>
            </div>
            <button
              onClick={refreshStorageUsage}
              className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline text-left mt-2 cursor-pointer font-bold"
            >
              Refresh calculation &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Voice Readout Toggle Card */}
      <div className="p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xs flex items-center justify-between">
        <div>
          <span className="font-bold text-xs block font-mono">
            AI Agent Voice Readout (Web Speech TTS)
          </span>
          <span className="text-xs text-zinc-500 font-sans">
            Guaranteed female voicepack with natural cadence. Muting cuts off speech immediately.
          </span>
        </div>
        <button
          onClick={() => {
            if (isSpeechEnabled) {
              stopSpeaking();
            }
            setIsSpeechEnabled(!isSpeechEnabled);
          }}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            isSpeechEnabled
              ? 'border-violet-600 bg-violet-600 text-white shadow-xs'
              : 'border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          {isSpeechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* LLM Engine Selection Form */}
      <form onSubmit={handleSaveLlm} className="p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xs space-y-4 font-mono text-xs">
        <div className="flex items-center gap-2 font-bold pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <Cpu className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <span>AI Reasoning Engine &amp; API Keys</span>
        </div>

        {/* Provider Cards with Exact Logos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODEL_OPTIONS.map(p => {
            const isSelected = provider === p.id;
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => handleProviderSelect(p.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  isSelected
                    ? 'border-violet-600 bg-violet-50/60 dark:bg-violet-950/30 text-violet-950 dark:text-violet-100 ring-2 ring-violet-500/30 shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {p.logo ? (
                  <img
                    src={p.logo}
                    alt={p.name}
                    className="w-9 h-9 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 shadow-xs"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                    <Cpu className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">{p.name}</div>
                  <div className="text-[10px] opacity-75 font-mono truncate">{p.tag}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Browser LM Local Download & Storage Status Card */}
        {provider === 'edge' && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span>smolLM2 Browser Storage &amp; Preload</span>
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                browserLmStatus.isCached
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
              }`}>
                {browserLmStatus.isCached ? 'CACHED & PRELOADED' : 'NOT CACHED'}
              </span>
            </div>

            {isDownloadingModel ? (
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] text-zinc-600 dark:text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-600" />
                    <span>{browserLmStatus.message}</span>
                  </span>
                  <span className="font-bold">{browserLmStatus.progress}%</span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-violet-600 h-full transition-all duration-150 rounded-full"
                    style={{ width: `${browserLmStatus.progress}%` }}
                  />
                </div>
              </div>
            ) : browserLmStatus.isCached ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-zinc-600 dark:text-zinc-400 text-xs font-sans">
                  Model weights are cached inside browser CacheStorage ({browserLmStatus.downloadedMb} MB). Zero downloads needed on subsequent visits.
                </div>
                <button
                  type="button"
                  onClick={handleClearModelCache}
                  className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-zinc-500 text-[11px] font-bold cursor-pointer transition-colors shrink-0"
                >
                  Clear Model Cache
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-zinc-600 dark:text-zinc-400 text-xs font-sans">
                  Model weights not yet downloaded on this browser. Download once for fast offline preloading.
                </div>
                <button
                  type="button"
                  onClick={handleDownloadModel}
                  className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs shrink-0"
                >
                  Download Model (185 MB)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Gemini Built-in Status Box */}
        {provider === 'gemini' && (
          <div className="p-4 bg-violet-50/60 dark:bg-violet-950/30 rounded-2xl border border-violet-200 dark:border-violet-900/60 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-violet-900 dark:text-violet-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span>Google Gemini 3.8 Flash (Active)</span>
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                READY &amp; CONNECTED
              </span>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 text-xs font-sans leading-relaxed">
              Purse is actively powered by Gemini with full conversational intelligence, autonomous bookkeeping, and ledger reasoning. Zero manual setup needed.
            </p>
          </div>
        )}

        {/* API Key Box for Optional 3rd-Party Providers */}
        {provider !== 'edge' && provider !== 'gemini' && (
          <div
            className={`p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border space-y-3 transition-all ${
              highlightedApiKeyProvider === provider
                ? 'border-violet-500 ring-2 ring-violet-500/30'
                : 'border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                API Key for {currentProviderInfo.name}
              </label>
              <div className="relative">
                <input
                  ref={apiKeyInputRef}
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={`Paste your private ${currentProviderInfo.name} API key`}
                  className="w-full bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-700 px-3 py-2.5 rounded-xl text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-violet-500"
                />
                <Key className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 font-sans">
                Stored solely in your browser's private local storage. Never transmitted to analytics or telemetry.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Model Name / Override Tag
              </label>
              <input
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder={`e.g. ${currentProviderInfo.model}`}
                className="w-full bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-700 px-3 py-2 rounded-xl text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div>
            <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 block">
              Auto-Approve Safe Low-Risk Actions
            </span>
            <span className="text-[11px] text-zinc-500 font-sans">
              Automatically commits routine non-destructive ledger entries under $50 without waiting for manual confirmation.
            </span>
          </div>
          <input
            type="checkbox"
            checked={autoApprove}
            onChange={e => setAutoApprove(e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer accent-violet-600"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 font-semibold cursor-pointer transition-all shadow-md shadow-violet-600/20"
          >
            Save Model Configuration
          </button>
        </div>
      </form>

      {/* Data Backup, Export & Clear */}
      <div className="p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xs space-y-4 font-mono text-xs">
        <div className="flex items-center gap-2 font-bold pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <Database className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <span>Data Backup, Export &amp; Reset</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={exportJson}
            className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 flex items-center justify-center gap-2 cursor-pointer font-bold hover:bg-zinc-100 dark:hover:bg-zinc-850"
          >
            <Download className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span>Export JSON Backup</span>
          </button>

          <button
            onClick={() => setShowImportArea(!showImportArea)}
            className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 flex items-center justify-center gap-2 cursor-pointer font-bold hover:bg-zinc-100 dark:hover:bg-zinc-850"
          >
            <Upload className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span>Restore JSON Backup</span>
          </button>
        </div>

        {showImportArea && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-2.5">
            <input
              type="file"
              accept=".json"
              onChange={handleJsonFileDrop}
              className="w-full text-xs text-zinc-600 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-violet-600 file:text-white file:text-xs cursor-pointer"
            />
            <div className="text-[11px] text-zinc-500">Or paste raw JSON:</div>
            <textarea
              rows={4}
              value={importJsonText}
              onChange={e => setImportJsonText(e.target.value)}
              placeholder="Paste Purse JSON backup contents here..."
              className="w-full bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-700 p-2.5 rounded-xl text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImportArea(false)}
                className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDirectJsonImport}
                className="px-3 py-1.5 bg-violet-600 text-white rounded-lg font-bold cursor-pointer hover:bg-violet-700"
              >
                Import Data
              </button>
            </div>
          </div>
        )}

        {/* Clear Ledger Button */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="font-bold text-xs block text-rose-600 dark:text-rose-400">
              Clear &amp; Wipe Storage
            </span>
            <span className="text-[11px] text-zinc-500 font-sans">
              Erases all records and allows re-running the initialization wizard or starting from scratch.
            </span>
          </div>
          <button
            onClick={() => setShowClearModal(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Data</span>
          </button>
        </div>

      </div>

      {/* DOUBLE-CONFIRMATION MODAL */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800 w-full max-w-md p-6 rounded-3xl shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <span>Confirmation Required</span>
              </div>
              <button onClick={() => setShowClearModal(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-zinc-600 dark:text-zinc-400 font-sans text-xs leading-relaxed">
              This will erase all accounts, transactions, recurring bills, and memory graphs from this browser. You will be prompted to re-initialize or start fresh with a blank account.
            </p>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                Please type <strong className="underline text-rose-600">DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={e => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl uppercase font-bold tracking-widest text-center focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowClearModal(false);
                  setDeleteConfirmationText('');
                }}
                className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-850"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmationText.trim().toUpperCase() !== 'DELETE'}
                onClick={handleWipeEverything}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold rounded-xl cursor-pointer transition-colors shadow-xs"
              >
                Yes, Purge Everything
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
