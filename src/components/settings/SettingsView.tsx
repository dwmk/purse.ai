import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { LLMProvider } from '../../types/finance';
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
  X
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
    refreshStorageUsage
  } = useFinance();

  const [provider, setProvider] = useState<LLMProvider>(config.provider);
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [model, setModel] = useState(config.model || '');
  const [autoApprove, setAutoApprove] = useState(config.autoApproveSafeActions);
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);
  
  // Double-confirmation state for Clear All
  const [showClearModal, setShowClearModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

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

  const providers: { id: LLMProvider; name: string; tag: string }[] = [
    { id: 'edge', name: 'Browser Edge (Local)', tag: 'smolLM2 / 100% Offline' },
    { id: 'gemini', name: 'Google Gemini', tag: 'High-speed analytical' },
    { id: 'openai', name: 'OpenAI (GPT-4o)', tag: 'Personal API key' },
    { id: 'deepseek', name: 'DeepSeek', tag: 'DeepSeek-Chat API' },
    { id: 'zai', name: 'Z.ai / Zhipu', tag: 'GLM-4 API' }
  ];

  return (
    <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#C794B0] dark:border-[#B59DD1]">
        <div>
          <span className="text-[11px] font-mono text-[#8A7EA4] dark:text-[#F9BBAE] uppercase tracking-wider block font-bold">
            System &amp; Storage Governance
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#8A7EA4] dark:text-[#F9BBAE]">
            Purse Settings
          </h1>
        </div>

        {/* Working Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#C794B0] dark:border-[#B59DD1] bg-[#F3ACB4] dark:bg-[#8A7EA4] text-xs font-mono font-medium text-[#8A7EA4] dark:text-[#F9BBAE] hover:bg-[#B59DD1] transition-colors cursor-pointer shadow-xs"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-[#F9BBAE]" /> : <Moon className="w-3.5 h-3.5 text-[#8A7EA4]" />}
          <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
        </button>
      </div>

      {/* Storage Usage & Long Persistence Indicator */}
      <div className="p-5 rounded-2xl border border-[#C794B0] dark:border-[#B59DD1] bg-[#F3ACB4] dark:bg-[#8A7EA4] shadow-xs space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-[#C794B0] dark:border-[#B59DD1]">
          <span className="font-bold text-[#8A7EA4] dark:text-[#F9BBAE] flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#8A7EA4] dark:text-[#F9BBAE]" />
            <span>Local Browser Storage Allocation</span>
          </span>
          <span className="text-[10px] text-[#8A7EA4] bg-[#B59DD1] px-2.5 py-0.5 rounded-full border border-[#8A7EA4] font-bold">
            PERSISTENT STORAGE ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="p-3 bg-[#F9BBAE] dark:bg-[#B59DD1] rounded-xl border border-[#C794B0] dark:border-[#8A7EA4]">
            <span className="text-[10px] text-[#8A7EA4] uppercase tracking-wider block mb-0.5 font-bold">
              TOTAL BROWSER STORAGE USED
            </span>
            <div className="text-xl font-bold text-[#8A7EA4] tabular-nums">
              {storageUsage.formatted}
            </div>
            <p className="text-[10px] text-[#8A7EA4]/85 font-sans mt-0.5">
              Stored locally across transactions, bills, and memory graphs.
            </p>
          </div>

          <div className="p-3 bg-[#F9BBAE] dark:bg-[#B59DD1] rounded-xl border border-[#C794B0] dark:border-[#8A7EA4] flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-[#8A7EA4] uppercase tracking-wider block mb-0.5 font-bold">
                STORAGE PRIVACY GUARANTEE
              </span>
              <p className="text-[11px] text-[#8A7EA4] font-sans leading-tight">
                Data never leaves your browser sandbox. Zero cloud telemetry or external logging.
              </p>
            </div>
            <button
              onClick={refreshStorageUsage}
              className="text-[11px] text-[#8A7EA4] hover:underline text-left mt-2 cursor-pointer font-bold"
            >
              Refresh calculation &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Voice Readout Toggle Card */}
      <div className="p-5 rounded-2xl border border-[#C794B0] dark:border-[#B59DD1] bg-[#F3ACB4] dark:bg-[#8A7EA4] shadow-xs flex items-center justify-between">
        <div>
          <span className="font-bold text-xs text-[#8A7EA4] dark:text-[#F9BBAE] block font-mono">
            AI Agent Voice Readout (Web Speech TTS)
          </span>
          <span className="text-xs text-[#8A7EA4]/80 dark:text-[#F9BBAE]/80 font-sans">
            Automatically reads agent answers aloud with natural voice. Stopping speech occurs immediately when muted.
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
              ? 'border-[#8A7EA4] bg-[#B59DD1] text-[#8A7EA4] font-bold'
              : 'border-[#C794B0] text-[#8A7EA4] dark:text-[#F9BBAE]'
          }`}
        >
          {isSpeechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* LLM Engine Selection */}
      <form onSubmit={handleSaveLlm} className="p-5 rounded-2xl border border-[#C794B0] dark:border-[#B59DD1] bg-[#F3ACB4] dark:bg-[#8A7EA4] shadow-xs space-y-4 font-mono text-xs">
        <div className="flex items-center gap-2 font-bold text-[#8A7EA4] dark:text-[#F9BBAE] pb-2 border-b border-[#C794B0] dark:border-[#B59DD1]">
          <Cpu className="w-4 h-4 text-[#8A7EA4] dark:text-[#F9BBAE]" />
          <span>AI Reasoning Engine &amp; API Keys</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {providers.map(p => (
            <button
              type="button"
              key={p.id}
              onClick={() => setProvider(p.id)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                provider === p.id
                  ? 'border-[#8A7EA4] bg-[#B59DD1] text-[#8A7EA4] font-bold shadow-xs'
                  : 'border-[#C794B0] dark:border-[#B59DD1] bg-[#F9BBAE] dark:bg-[#8A7EA4] text-[#8A7EA4] dark:text-[#F9BBAE] hover:bg-[#B59DD1]/40'
              }`}
            >
              <div className="font-bold text-xs">{p.name}</div>
              <div className="text-[10px] opacity-80 mt-0.5">{p.tag}</div>
            </button>
          ))}
        </div>

        {provider !== 'edge' && (
          <div className="p-3.5 bg-[#F9BBAE] dark:bg-[#B59DD1] rounded-xl border border-[#8A7EA4] space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-[#8A7EA4] mb-1">
                API Key for {providers.find(p => p.id === provider)?.name}
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="Paste your private API key here (persisted only in browser)"
                  className="w-full bg-[#F3ACB4] dark:bg-[#8A7EA4] border border-[#8A7EA4] px-3 py-2 rounded-lg text-xs font-mono text-[#8A7EA4] dark:text-[#F9BBAE] placeholder-[#8A7EA4]/60 dark:placeholder-[#F9BBAE]/60 focus:outline-none"
                />
                <Key className="w-3.5 h-3.5 text-[#8A7EA4] dark:text-[#F9BBAE] absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#8A7EA4] mb-1">
                Model Name / Override Tag
              </label>
              <input
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="e.g. gemini-3.8-flash, gpt-4o-mini"
                className="w-full bg-[#F3ACB4] dark:bg-[#8A7EA4] border border-[#8A7EA4] px-3 py-2 rounded-lg text-xs font-mono text-[#8A7EA4] dark:text-[#F9BBAE] placeholder-[#8A7EA4]/60 dark:placeholder-[#F9BBAE]/60 focus:outline-none"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-3 bg-[#F9BBAE] dark:bg-[#B59DD1] rounded-xl border border-[#C794B0] dark:border-[#8A7EA4]">
          <div>
            <span className="font-bold text-xs text-[#8A7EA4] block">
              Auto-Approve Safe Low-Risk Actions
            </span>
            <span className="text-[11px] text-[#8A7EA4]/80 font-sans">
              Automatically commits routine non-destructive ledger entries under $50 without asking.
            </span>
          </div>
          <input
            type="checkbox"
            checked={autoApprove}
            onChange={e => setAutoApprove(e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer accent-[#8A7EA4]"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#8A7EA4] text-[#F9BBAE] hover:bg-[#B59DD1] hover:text-[#8A7EA4] font-semibold cursor-pointer transition-all tactile-btn shadow-xs"
          >
            Save Model Configuration
          </button>
        </div>
      </form>

      {/* Data Backup & Double-Confirmation Clear All */}
      <div className="p-5 rounded-2xl border border-[#C794B0] dark:border-[#B59DD1] bg-[#F3ACB4] dark:bg-[#8A7EA4] shadow-xs space-y-4 font-mono text-xs">
        <div className="flex items-center gap-2 font-bold text-[#8A7EA4] dark:text-[#F9BBAE] pb-2 border-b border-[#C794B0] dark:border-[#B59DD1]">
          <Database className="w-4 h-4 text-[#8A7EA4] dark:text-[#F9BBAE]" />
          <span>Data Backup, Export &amp; Reset</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={exportJson}
            className="p-3 rounded-xl border border-[#8A7EA4] bg-[#F9BBAE] dark:bg-[#B59DD1] text-[#8A7EA4] flex items-center justify-center gap-2 cursor-pointer font-bold hover:bg-[#B59DD1]"
          >
            <Download className="w-4 h-4 text-[#8A7EA4]" />
            <span>Export JSON Backup</span>
          </button>

          <button
            onClick={() => setShowImportArea(!showImportArea)}
            className="p-3 rounded-xl border border-[#8A7EA4] bg-[#F9BBAE] dark:bg-[#B59DD1] text-[#8A7EA4] flex items-center justify-center gap-2 cursor-pointer font-bold hover:bg-[#B59DD1]"
          >
            <Upload className="w-4 h-4 text-[#8A7EA4]" />
            <span>Restore JSON Backup</span>
          </button>
        </div>

        {showImportArea && (
          <div className="p-4 bg-[#F9BBAE] dark:bg-[#B59DD1] border border-[#8A7EA4] rounded-xl space-y-2.5">
            <input
              type="file"
              accept=".json"
              onChange={handleJsonFileDrop}
              className="w-full text-xs text-[#8A7EA4] file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-[#B59DD1] file:text-[#8A7EA4] file:text-xs"
            />
            <div className="text-[11px] text-[#8A7EA4]/80">Or paste raw JSON:</div>
            <textarea
              rows={4}
              value={importJsonText}
              onChange={e => setImportJsonText(e.target.value)}
              placeholder="Paste Purse JSON backup contents here..."
              className="w-full bg-[#F3ACB4] dark:bg-[#8A7EA4] border border-[#8A7EA4] p-2.5 rounded-lg text-xs font-mono text-[#8A7EA4] dark:text-[#F9BBAE] focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImportArea(false)}
                className="px-3 py-1.5 border border-[#8A7EA4] text-[#8A7EA4] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDirectJsonImport}
                className="px-3 py-1.5 bg-[#8A7EA4] text-[#F9BBAE] rounded-lg font-bold cursor-pointer"
              >
                Import Data
              </button>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-[#C794B0] dark:border-[#B59DD1] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="font-bold text-xs text-[#8A7EA4] dark:text-[#F9BBAE] block">
              Reset to Realistic Demo Records
            </span>
            <span className="text-[11px] text-[#8A7EA4]/80 dark:text-[#F9BBAE]/80 font-sans">
              Restores initial mock transactions, envelopes, bills, and knowledge graph.
            </span>
          </div>
          {confirmReset ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  resetAllData();
                  setConfirmReset(false);
                }}
                className="px-3 py-1.5 bg-[#8A7EA4] text-[#F9BBAE] font-bold rounded-lg text-xs cursor-pointer"
              >
                Confirm Reset
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="px-3 py-1.5 border border-[#8A7EA4] text-[#8A7EA4] rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="px-3.5 py-1.5 border border-[#8A7EA4] text-[#8A7EA4] dark:text-[#F9BBAE] hover:bg-[#B59DD1] rounded-lg text-xs flex items-center gap-1.5 cursor-pointer font-bold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset to Demo Data</span>
            </button>
          )}
        </div>

        {/* Double-Confirmation "Clear All" Button that purges everything */}
        <div className="pt-3 border-t border-[#C794B0] dark:border-[#B59DD1] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="font-bold text-xs text-[#8A7EA4] dark:text-[#F9BBAE] block">
              Danger: Wipe &amp; Clear All Storage
            </span>
            <span className="text-[11px] text-[#8A7EA4]/80 dark:text-[#F9BBAE]/80 font-sans">
              Permanently purges all transactions, accounts, bills, and memory from this browser.
            </span>
          </div>
          <button
            onClick={() => setShowClearModal(true)}
            className="px-4 py-2 bg-[#8A7EA4] hover:bg-[#C794B0] text-[#F9BBAE] font-semibold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Data</span>
          </button>
        </div>

      </div>

      {/* DOUBLE-CONFIRMATION MODAL */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#8A7EA4]/60 backdrop-blur-md p-4">
          <div className="bg-[#F3ACB4] dark:bg-[#8A7EA4] border border-[#8A7EA4] w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-4 font-mono text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between text-[#8A7EA4] dark:text-[#F9BBAE] border-b border-[#8A7EA4] pb-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-[#8A7EA4] dark:text-[#F9BBAE]" />
                <span>Double-Confirmation Required</span>
              </div>
              <button onClick={() => setShowClearModal(false)} className="text-[#8A7EA4] dark:text-[#F9BBAE] hover:opacity-75 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[#8A7EA4] dark:text-[#F9BBAE] font-sans text-xs leading-relaxed">
              This action is <strong>irreversible</strong>. It will delete all your local transactions, envelope allocations, recurring bills, and the long-term agent memory graph from this device.
            </p>

            <div className="space-y-1.5">
              <label className="block text-[#8A7EA4] dark:text-[#F9BBAE] text-[11px] font-bold">
                Please type <strong className="underline">DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={e => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-[#F9BBAE] dark:bg-[#B59DD1] border border-[#8A7EA4] p-2.5 rounded-xl text-[#8A7EA4] uppercase font-bold tracking-widest text-center focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowClearModal(false);
                  setDeleteConfirmationText('');
                }}
                className="px-4 py-2 border border-[#8A7EA4] text-[#8A7EA4] dark:text-[#F9BBAE] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmationText.trim().toUpperCase() !== 'DELETE'}
                onClick={handleWipeEverything}
                className="px-5 py-2 bg-[#8A7EA4] hover:bg-[#C794B0] disabled:opacity-40 text-[#F9BBAE] font-bold rounded-xl cursor-pointer transition-colors"
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
