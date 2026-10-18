import React, { useState, useRef, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { IngestionService, OrganizedIngestionResult } from '../../services/ingestion';
import { BrowserLMService } from '../../services/browserLm';
import { MODEL_OPTIONS, MODEL_LOGOS } from '../../constants/models';
import { LLMProvider, AccountType } from '../../types/finance';
import {
  UploadCloud,
  FileText,
  Sparkles,
  ArrowRight,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  Calendar,
  Layers,
  HardDrive,
  RefreshCw,
  Cpu,
  X
} from 'lucide-react';

interface InitializationModalProps {
  isOpen: boolean;
  onClose?: () => void;
  canCancel?: boolean;
}

const SAMPLE_CSV = `Date,Amount,Type,Merchant,Category,Notes
2026-10-10,3200.00,income,Employer Payroll,Income,Semi-monthly salary deposit
2026-10-11,1450.00,expense,Avalon Bay Properties,Housing & Rent,October rent
2026-10-12,84.50,expense,Trader Joe's,Groceries,Weekly grocery stock
2026-10-13,15.99,expense,Netflix,Subscriptions & Software,Monthly streaming
2026-10-14,48.20,expense,Chevron Fuel,Transportation & Fuel,Gas refill
2026-10-15,62.00,expense,Blue Bottle Coffee,Dining & Nightlife,Team coffee
2026-10-16,35.00,expense,CVS Pharmacy,Health & Wellness,Prescription
`;

export const InitializationModal: React.FC<InitializationModalProps> = ({
  isOpen,
  onClose,
  canCancel = false
}) => {
  const {
    config,
    updateConfig,
    initializeWithData,
    initializeBlank,
    openSettingsForProvider
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'upload' | 'scratch'>('upload');
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>(config.provider);
  const [apiKeyInput, setApiKeyInput] = useState<string>(config.apiKey || '');
  const [rawText, setRawText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string>('');
  const [organizedResult, setOrganizedResult] = useState<OrganizedIngestionResult | null>(null);

  // Blank account form states (default is cash account with no bank specified)
  const [blankAccountName, setBlankAccountName] = useState<string>('Physical Cash Wallet');
  const [blankAccountType, setBlankAccountType] = useState<AccountType>('cash');
  const [blankBalance, setBlankBalance] = useState<string>('0.00');
  const [blankCurrency, setBlankCurrency] = useState<string>('USD');
  const [blankInstitution, setBlankInstitution] = useState<string>(''); // No bank specified for cash
  const [blankNetwork, setBlankNetwork] = useState<string>('Ethereum & Solana');
  const [blankWalletAddress, setBlankWalletAddress] = useState<string>('');

  // Browser LM status tracking
  const [browserLmProgress, setBrowserLmProgress] = useState<number>(0);
  const [browserLmMsg, setBrowserLmMsg] = useState<string>('');
  const [isBrowserLmDownloading, setIsBrowserLmDownloading] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return BrowserLMService.subscribe(st => {
      setBrowserLmProgress(st.progress);
      setBrowserLmMsg(st.message);
      setIsBrowserLmDownloading(st.status === 'downloading' || st.status === 'caching');
    });
  }, []);

  if (!isOpen) return null;

  const currentProviderInfo = MODEL_OPTIONS.find(p => p.id === selectedProvider) || MODEL_OPTIONS[0];
  const isApiMissing = currentProviderInfo.isApiBased && !apiKeyInput.trim() && !config.apiKey;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      setRawText(content);
    };
    reader.readAsText(file);
  };

  const handleProviderSelect = (prov: LLMProvider) => {
    setSelectedProvider(prov);
    if (prov === 'edge') {
      BrowserLMService.ensurePreloadedOrDownload();
    }
  };

  const handleProcessTransactions = async () => {
    if (!rawText.trim()) {
      setParseError('Please enter or upload transaction details first.');
      return;
    }

    if (isApiMissing) {
      setParseError(`Missing API key for ${currentProviderInfo.name}. Please enter your key below or switch to Browser Edge.`);
      return;
    }

    setIsProcessing(true);
    setParseError('');

    try {
      const result = await IngestionService.organizeWithLLM(rawText, {
        provider: selectedProvider,
        apiKey: apiKeyInput.trim() || config.apiKey,
        model: currentProviderInfo.model
      });

      if (!result.transactions || result.transactions.length === 0) {
        setParseError('Could not identify any valid transactions. Try formatting as CSV or line-by-line entries.');
        setIsProcessing(false);
        return;
      }

      setOrganizedResult(result);
    } catch (err: unknown) {
      setParseError('Error parsing transactions. Falling back to local parser.');
      const localResult = IngestionService.parseTextLocally(rawText);
      setOrganizedResult(localResult);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = () => {
    if (!organizedResult) return;
    // Persist API key if provided
    if (apiKeyInput.trim()) {
      updateConfig({ provider: selectedProvider, apiKey: apiKeyInput.trim() });
    }
    initializeWithData(organizedResult);
    if (onClose) onClose();
  };

  const handleConfirmBlank = () => {
    const balanceNum = parseFloat(blankBalance) || 0;
    initializeBlank(
      blankAccountName,
      blankAccountType,
      balanceNum,
      blankCurrency,
      blankInstitution,
      blankNetwork,
      blankWalletAddress
    );
    if (onClose) onClose();
  };

  const handleUseSample = () => {
    setRawText(SAMPLE_CSV);
    setFileName('sample_statement_oct2026.csv');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100 my-auto">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-600/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 block">
                Welcome to Purse · Ledger Setup
              </span>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                Initialize Your Decentralized Ledger
              </h2>
            </div>
          </div>
          {canCancel && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Pathway Tabs */}
        {!organizedResult && (
          <div className="grid grid-cols-2 p-2 mx-6 mt-4 bg-zinc-100 dark:bg-zinc-850 rounded-2xl font-mono text-xs gap-1">
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-2.5 px-3 rounded-xl font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-zinc-900 text-violet-600 dark:text-violet-400 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Import with AI</span>
            </button>
            <button
              onClick={() => setActiveTab('scratch')}
              className={`py-2.5 px-3 rounded-xl font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'scratch'
                  ? 'bg-white dark:bg-zinc-900 text-violet-600 dark:text-violet-400 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Start from Scratch</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* PATHWAY 1: AI INGESTION & PARSING */}
          {activeTab === 'upload' && !organizedResult && (
            <div className="space-y-4 font-sans text-xs">
              
              {/* Model Selection with Logos */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-2">
                  Select AI Reasoning Model for Ingestion
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MODEL_OPTIONS.map(opt => {
                    const isSelected = selectedProvider === opt.id;
                    return (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => handleProviderSelect(opt.id)}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                          isSelected
                            ? 'border-violet-600 bg-violet-50/50 dark:bg-violet-950/30 text-violet-900 dark:text-violet-100 ring-2 ring-violet-500/20'
                            : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-855 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {opt.logo ? (
                          <img
                            src={opt.logo}
                            alt={opt.name}
                            className="w-7 h-7 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                            <Cpu className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-[11px] truncate">{opt.name}</div>
                          <div className="text-[9px] opacity-75 font-mono truncate">{opt.tag.split('/')[0]}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Browser LM Download Status Bar */}
              {selectedProvider === 'edge' && (
                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5" />
                      <span>Browser Edge LM Status</span>
                    </span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                      {BrowserLMService.checkIfCached() ? 'CACHED IN STORAGE' : 'DOWNLOADING'}
                    </span>
                  </div>

                  {isBrowserLmDownloading ? (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] text-zinc-500">
                        <span>{browserLmMsg || 'Downloading model weights...'}</span>
                        <span className="font-bold">{browserLmProgress}%</span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-violet-600 h-full transition-all duration-150 rounded-full"
                          style={{ width: `${browserLmProgress}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-zinc-400">
                        Once downloaded, model is preserved in persistent browser CacheStorage for instant preloading.
                      </p>
                    </div>
                  ) : (
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Model preloaded from local browser storage. Fast &amp; 100% offline.</span>
                    </div>
                  )}
                </div>
              )}

              {/* API Key prompt if missing */}
              {isApiMissing && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 font-mono text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      <span>Missing API Key for {currentProviderInfo.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => openSettingsForProvider(selectedProvider)}
                      className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                    >
                      Fix in Settings
                    </button>
                  </div>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={e => setApiKeyInput(e.target.value)}
                    placeholder={`Enter your private ${currentProviderInfo.name} API key`}
                    className="w-full bg-white dark:bg-zinc-900 border border-rose-300 dark:border-rose-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
                  />
                  <p className="text-[10px] text-rose-600/80 dark:text-rose-400/80">
                    Your key is stored strictly on this device and never uploaded to any third party.
                  </p>
                </div>
              )}

              {/* Drag & Drop File Upload Area */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.txt,.json,.tsv"
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-violet-500 dark:hover:border-violet-400 bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer transition-all flex flex-col items-center justify-center text-center group"
                >
                  <UploadCloud className="w-8 h-8 text-violet-500 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                    {fileName ? `Loaded: ${fileName}` : 'Click to select CSV, Bank Statement, or JSON file'}
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1">
                    Supports exported bank CSVs, transaction logs, or plain text
                  </span>
                </div>
              </div>

              {/* Raw Text Box & Sample Preset */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <label className="font-mono font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                    Or Paste Raw Transaction Text
                  </label>
                  <button
                    type="button"
                    onClick={handleUseSample}
                    className="text-violet-600 dark:text-violet-400 hover:underline font-mono text-[10px] cursor-pointer"
                  >
                    Use Sample Bank Export
                  </button>
                </div>
                <textarea
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  rows={4}
                  placeholder={`Date, Amount, Merchant...\n2026-10-12, $45.20, Trader Joe's\n2026-10-13, $15.99, Netflix`}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 font-mono text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              {parseError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isProcessing || !rawText.trim()}
                  onClick={handleProcessTransactions}
                  className="w-full py-3 px-5 rounded-2xl bg-violet-600 text-white font-bold text-xs sm:text-sm hover:bg-violet-700 disabled:opacity-40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-600/20"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Feeding to LLM &amp; Organizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyze &amp; Organize with {currentProviderInfo.name}</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* PATHWAY 2: START FROM SCRATCH WITH BLANK ACCOUNT */}
          {activeTab === 'scratch' && !organizedResult && (
            <div className="space-y-4 font-sans text-xs">
              <div className="p-4 bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900/50 rounded-2xl text-violet-800 dark:text-violet-300">
                <p className="leading-relaxed">
                  Start fresh with a clean, blank ledger. Default is a Cash account with no bank specified. You can also configure crypto wallets or traditional bank accounts.
                </p>
              </div>

              <div className="space-y-3 font-mono">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={blankAccountName}
                    onChange={e => setBlankAccountName(e.target.value)}
                    placeholder="e.g. Physical Cash Wallet, Phantom Solana, Chase Checking"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Account Type
                    </label>
                    <select
                      value={blankAccountType}
                      onChange={e => {
                        const nextType = e.target.value as AccountType;
                        setBlankAccountType(nextType);
                        if (nextType === 'cash') {
                          setBlankAccountName('Physical Cash Wallet');
                          setBlankInstitution('');
                        } else if (nextType === 'crypto') {
                          setBlankAccountName('Web3 Crypto Wallet');
                          setBlankInstitution('Self-Custody');
                        } else if (nextType === 'checking') {
                          setBlankAccountName('Primary Checking');
                          setBlankInstitution('Chase Bank');
                        } else if (nextType === 'savings') {
                          setBlankAccountName('Emergency Savings Vault');
                          setBlankInstitution('Marcus');
                        }
                      }}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500"
                    >
                      <option value="cash">Cash (Default / No bank required)</option>
                      <option value="crypto">Crypto Wallet (Web3 / Cold Storage)</option>
                      <option value="checking">Checking Account</option>
                      <option value="savings">Savings / Vault</option>
                      <option value="credit">Credit Card</option>
                      <option value="investment">Investment / Brokerage</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Initial Starting Balance
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-zinc-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={blankBalance}
                        onChange={e => setBlankBalance(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-7 pr-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Currency
                    </label>
                    <select
                      value={blankCurrency}
                      onChange={e => setBlankCurrency(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="BDT">BDT (৳) - Bangladeshi Taka</option>
                      <option value="RMB">RMB / CNY (¥) - Chinese Renminbi</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="AUD">AUD ($)</option>
                      <option value="JPY">JPY (¥)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      {blankAccountType === 'cash' ? 'Bank / Institution (Optional)' : 'Bank / Custodian'}
                    </label>
                    <input
                      type="text"
                      value={blankInstitution}
                      onChange={e => setBlankInstitution(e.target.value)}
                      placeholder={blankAccountType === 'cash' ? 'Leave empty (No bank specified)' : 'e.g. Chase, Self-Custody'}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                {blankAccountType === 'crypto' && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        Blockchain Network
                      </label>
                      <input
                        type="text"
                        value={blankNetwork}
                        onChange={e => setBlankNetwork(e.target.value)}
                        placeholder="e.g. Solana, Ethereum, Bitcoin"
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        Public Address (Optional)
                      </label>
                      <input
                        type="text"
                        value={blankWalletAddress}
                        onChange={e => setBlankWalletAddress(e.target.value)}
                        placeholder="e.g. 0x... or solana address"
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleConfirmBlank}
                  className="w-full py-3 px-5 rounded-2xl bg-violet-600 text-white font-bold text-xs sm:text-sm hover:bg-violet-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-600/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Create {blankAccountType.toUpperCase()} Account &amp; Enter Purse</span>
                </button>
              </div>
            </div>
          )}

          {/* ORGANIZED PREVIEW SCREEN (AFTER LLM PARSING) */}
          {organizedResult && (
            <div className="space-y-4 font-sans text-xs">
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl text-emerald-800 dark:text-emerald-300 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <span className="font-bold block">LLM Processing Successful!</span>
                  <span>Organized into accounts, categorized transactions, and recurring commitments.</span>
                </div>
              </div>

              {/* Statistics Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block uppercase">Transactions</span>
                  <span className="text-base font-bold text-violet-600 dark:text-violet-400">
                    {organizedResult.transactions.length}
                  </span>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block uppercase">Total Inflow</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    +${organizedResult.summary.totalInflow.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block uppercase">Total Outflow</span>
                  <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                    -${organizedResult.summary.totalOutflow.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block uppercase">Recurring Bills</span>
                  <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                    {organizedResult.bills.length}
                  </span>
                </div>
              </div>

              {/* Transaction Preview Table */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-850 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  Organized Ledger Preview (Top 5)
                </div>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono text-xs max-h-48 overflow-y-auto">
                  {organizedResult.transactions.slice(0, 5).map(tx => (
                    <div key={tx.id} className="p-2.5 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">{tx.merchant}</div>
                        <div className="text-[10px] text-zinc-500 flex items-center gap-2">
                          <span>{tx.date}</span>
                          <span>·</span>
                          <span className="text-violet-600 dark:text-violet-400">{tx.category}</span>
                        </div>
                      </div>
                      <div className={`font-bold tabular-nums ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                        {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Integration Controls */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setOrganizedResult(null)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-mono text-xs cursor-pointer"
                >
                  &larr; Back to Edit
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="flex-1 py-3 px-5 rounded-2xl bg-violet-600 text-white font-bold text-xs sm:text-sm hover:bg-violet-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-600/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Integrate into Ledger &amp; Enter Purse</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
