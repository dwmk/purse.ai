import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Account,
  AgentAction,
  AppView,
  Bill,
  BudgetEnvelope,
  ChatMessage,
  LLMConfig,
  MemoryFile,
  Transaction
} from '../types/finance';
import { StorageService } from '../services/storage';
import { processAgentMessage } from '../services/agentEngine';
import { SpeechService } from '../services/speech';

interface FinanceContextType {
  accounts: Account[];
  transactions: Transaction[];
  bills: Bill[];
  budgets: BudgetEnvelope[];
  memory: MemoryFile;
  chatMessages: ChatMessage[];
  actions: AgentAction[];
  config: LLMConfig;
  theme: 'dark' | 'light';
  currentView: AppView;
  isGenerating: boolean;
  notification: { type: 'success' | 'error' | 'info'; message: string } | null;
  isSpeechEnabled: boolean;
  setIsSpeechEnabled: (enabled: boolean) => void;
  speakingMsgId: string | null;
  speakMessage: (id: string, text: string) => void;
  stopSpeaking: () => void;
  toggleSpeechEnabled: () => void;
  storageUsage: { bytes: number; formatted: string };
  refreshStorageUsage: () => void;
  clearNotification: () => void;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
  setCurrentView: (view: AppView) => void;
  toggleTheme: () => void;
  sendMessage: (text: string) => Promise<void>;
  applyAction: (actionId: string) => void;
  rejectAction: (actionId: string) => void;
  rollbackAction: (actionId: string) => void;
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  addBill: (bill: Omit<Bill, 'id'>) => void;
  toggleBillPaid: (id: string) => void;
  deleteBill: (id: string) => void;
  updateBudget: (id: string, allocated: number) => void;
  updateMemory: (newMemory: MemoryFile) => void;
  updateConfig: (newConfig: Partial<LLMConfig>) => void;
  exportJson: () => void;
  exportCsv: () => void;
  importJson: (jsonStr: string) => { success: boolean; message: string };
  importCsv: (csvStr: string) => { success: boolean; addedCount: number; message: string };
  resetAllData: () => void;
  wipeEverything: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>(() => StorageService.getAccounts());
  const [transactions, setTransactions] = useState<Transaction[]>(() => StorageService.getTransactions());
  const [bills, setBills] = useState<Bill[]>(() => StorageService.getBills());
  const [budgets, setBudgets] = useState<BudgetEnvelope[]>(() => StorageService.getBudgets());
  const [memory, setMemory] = useState<MemoryFile>(() => StorageService.getMemory());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => StorageService.getChatHistory());
  const [actions, setActions] = useState<AgentAction[]>(() => StorageService.getActions());
  const [config, setConfig] = useState<LLMConfig>(() => StorageService.getConfig());
  const [theme, setTheme] = useState<'dark' | 'light'>(() => StorageService.getTheme());
  
  // Storage Usage State
  const [storageUsage, setStorageUsage] = useState(() => StorageService.getStorageUsage());

  const refreshStorageUsage = () => {
    setStorageUsage(StorageService.getStorageUsage());
  };

  // Voice & Web Speech API States
  const [isSpeechEnabled, setIsSpeechEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('purse_speech_enabled') !== 'false';
  });
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  // URL sync & PWA detection: If PWA detected or /app in URL, skip landing page
  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      const isPWA =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      const path = window.location.pathname;
      if (isPWA || path.startsWith('/app')) return 'chat';
    }
    return 'landing';
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Sync theme with HTML document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.classList.add('dark');
      document.body.style.backgroundColor = '#8A7EA4';
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
      document.body.style.backgroundColor = '#F9BBAE';
    }
    StorageService.saveTheme(theme);
  }, [theme]);

  // Request persistent storage and check PWA auto-redirect
  useEffect(() => {
    StorageService.requestPersistence().catch(() => {});
    if (typeof window !== 'undefined') {
      const isPWA =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      if (isPWA && currentView === 'landing') {
        setCurrentView('chat');
        window.history.replaceState(null, '', '/app');
      }
    }
  }, []);

  // Sync Speech Preference
  useEffect(() => {
    localStorage.setItem('purse_speech_enabled', String(isSpeechEnabled));
  }, [isSpeechEnabled]);

  // Sync URL history state
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/' || path === '') {
        setCurrentView('landing');
      } else if (path.startsWith('/app')) {
        setCurrentView('chat');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const changeView = (view: AppView) => {
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      const targetPath = view === 'landing' ? '/' : '/app';
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    }
  };

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(prev => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const clearNotification = () => setNotification(null);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      const root = document.documentElement;
      if (next === 'dark') {
        root.classList.add('dark');
        document.body.classList.add('dark');
        document.body.style.backgroundColor = '#8A7EA4';
      } else {
        root.classList.remove('dark');
        document.body.classList.remove('dark');
        document.body.style.backgroundColor = '#F9BBAE';
      }
      StorageService.saveTheme(next);
      return next;
    });
  };

  // Toggle speech with immediate cutoff when muting
  const toggleSpeechEnabled = () => {
    setIsSpeechEnabledState(prev => {
      const next = !prev;
      if (!next) {
        // Stop active speech immediately when muting
        SpeechService.stopSpeaking();
        setSpeakingMsgId(null);
      }
      return next;
    });
  };

  const setIsSpeechEnabled = (enabled: boolean) => {
    if (!enabled) {
      SpeechService.stopSpeaking();
      setSpeakingMsgId(null);
    }
    setIsSpeechEnabledState(enabled);
  };

  // Speak a message aloud
  const speakMessage = (id: string, text: string) => {
    if (speakingMsgId === id) {
      SpeechService.stopSpeaking();
      setSpeakingMsgId(null);
      return;
    }
    setSpeakingMsgId(id);
    SpeechService.speak(text, () => {
      setSpeakingMsgId(null);
    });
  };

  const stopSpeaking = () => {
    SpeechService.stopSpeaking();
    setSpeakingMsgId(null);
  };

  // Safe Execution: Apply an agent action
  const applyAction = (actionId: string) => {
    const action = actions.find(a => a.id === actionId);
    if (!action || action.status !== 'pending') return;

    if (action.type === 'ADD_TRANSACTION') {
      const newTx: Transaction = action.payload;
      const updatedTxs = [newTx, ...transactions];
      setTransactions(updatedTxs);
      StorageService.saveTransactions(updatedTxs);

      const delta = newTx.type === 'income' ? newTx.amount : -newTx.amount;
      const updatedAccounts = accounts.map(acc => {
        if (acc.id === newTx.accountId) {
          return { ...acc, balance: acc.balance + delta, lastUpdated: new Date().toISOString() };
        }
        return acc;
      });
      setAccounts(updatedAccounts);
      StorageService.saveAccounts(updatedAccounts);
      showNotification('success', `Logged ${newTx.type} of $${newTx.amount.toFixed(2)}.`);
    } else if (action.type === 'ADD_BILL') {
      const newBill: Bill = action.payload;
      const updatedBills = [...bills, newBill];
      setBills(updatedBills);
      StorageService.saveBills(updatedBills);
      showNotification('success', `Scheduled bill ${newBill.name} ($${newBill.amount.toFixed(2)}).`);
    } else if (action.type === 'UPDATE_MEMORY') {
      const updatedMem: MemoryFile = action.payload;
      setMemory(updatedMem);
      StorageService.saveMemory(updatedMem);
      showNotification('success', `Committed Revision #${updatedMem.revisionCount} to Memory.`);
    }

    const updatedActions = actions.map(a => (a.id === actionId ? { ...a, status: 'applied' as const } : a));
    setActions(updatedActions);
    StorageService.saveActions(updatedActions);
    refreshStorageUsage();

    setChatMessages(prev =>
      prev.map(msg => (msg.action?.id === actionId ? { ...msg, action: { ...msg.action, status: 'applied' } } : msg))
    );
  };

  const rejectAction = (actionId: string) => {
    const updatedActions = actions.map(a => (a.id === actionId ? { ...a, status: 'rejected' as const } : a));
    setActions(updatedActions);
    StorageService.saveActions(updatedActions);

    setChatMessages(prev =>
      prev.map(msg => (msg.action?.id === actionId ? { ...msg, action: { ...msg.action, status: 'rejected' } } : msg))
    );
    showNotification('info', 'Action rejected and dismissed safely.');
  };

  const rollbackAction = (actionId: string) => {
    const action = actions.find(a => a.id === actionId);
    if (!action || action.status !== 'applied') return;

    if (action.type === 'ADD_TRANSACTION') {
      const tx: Transaction = action.payload;
      const updatedTxs = transactions.filter(t => t.id !== tx.id);
      setTransactions(updatedTxs);
      StorageService.saveTransactions(updatedTxs);

      const delta = tx.type === 'income' ? -tx.amount : tx.amount;
      const updatedAccounts = accounts.map(acc => {
        if (acc.id === tx.accountId) {
          return { ...acc, balance: acc.balance + delta, lastUpdated: new Date().toISOString() };
        }
        return acc;
      });
      setAccounts(updatedAccounts);
      StorageService.saveAccounts(updatedAccounts);
      showNotification('success', `Reverted $${tx.amount.toFixed(2)} transaction.`);
    } else if (action.type === 'ADD_BILL') {
      const bill: Bill = action.payload;
      const updatedBills = bills.filter(b => b.id !== bill.id);
      setBills(updatedBills);
      StorageService.saveBills(updatedBills);
      showNotification('success', `Removed bill ${bill.name}.`);
    }

    const updatedActions = actions.map(a => (a.id === actionId ? { ...a, status: 'reverted' as const } : a));
    setActions(updatedActions);
    StorageService.saveActions(updatedActions);
    refreshStorageUsage();
  };

  // Conversational interaction
  const sendMessage = async (userInput: string) => {
    if (!userInput.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      content: userInput,
      timestamp: new Date().toISOString()
    };

    const newChatList = [...chatMessages, userMsg];
    setChatMessages(newChatList);
    StorageService.saveChatHistory(newChatList);
    setIsGenerating(true);

    try {
      const response = await processAgentMessage(userInput, {
        accounts,
        transactions,
        bills,
        budgets,
        memory,
        config
      });

      if (response.action) {
        const nextActions = [response.action, ...actions];
        setActions(nextActions);
        StorageService.saveActions(nextActions);

        if (config.autoApproveSafeActions && response.action.safetyLevel === 'low_risk') {
          setTimeout(() => {
            if (response.action) applyAction(response.action.id);
          }, 300);
        }
      }

      if (response.updatedMemory) {
        setMemory(response.updatedMemory);
        StorageService.saveMemory(response.updatedMemory);
      }

      const agentMsgId = `msg_agent_${Date.now()}`;
      const agentMsg: ChatMessage = {
        id: agentMsgId,
        sender: 'agent',
        content: response.content,
        timestamp: new Date().toISOString(),
        plan: response.plan,
        action: response.action,
        memoryUpdateNote: response.memoryNote
      };

      const finalChat = [...newChatList, agentMsg];
      setChatMessages(finalChat);
      StorageService.saveChatHistory(finalChat);
      refreshStorageUsage();

      if (isSpeechEnabled && SpeechService.isTtsSupported()) {
        speakMessage(agentMsgId, response.content);
      }
    } catch (err: unknown) {
      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        sender: 'agent',
        content: `Error processing request: ${(err as Error).message}. Operating via local resilience fallback.`,
        timestamp: new Date().toISOString()
      };
      const finalChat = [...newChatList, errorMsg];
      setChatMessages(finalChat);
      StorageService.saveChatHistory(finalChat);
    } finally {
      setIsGenerating(false);
    }
  };

  const addTransaction = (tx: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...tx,
      id: `tx_man_${Date.now()}`
    };
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    StorageService.saveTransactions(updated);

    const delta = newTx.type === 'income' ? newTx.amount : -newTx.amount;
    const updatedAccs = accounts.map(a =>
      a.id === newTx.accountId ? { ...a, balance: a.balance + delta, lastUpdated: new Date().toISOString() } : a
    );
    setAccounts(updatedAccs);
    StorageService.saveAccounts(updatedAccs);
    refreshStorageUsage();
    showNotification('success', `Added $${newTx.amount.toFixed(2)} for ${newTx.merchant}`);
  };

  const deleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    StorageService.saveTransactions(updated);

    const delta = tx.type === 'income' ? -tx.amount : tx.amount;
    const updatedAccs = accounts.map(a =>
      a.id === tx.accountId ? { ...a, balance: a.balance + delta, lastUpdated: new Date().toISOString() } : a
    );
    setAccounts(updatedAccs);
    StorageService.saveAccounts(updatedAccs);
    refreshStorageUsage();
    showNotification('info', `Removed transaction for ${tx.merchant}`);
  };

  const addBill = (bill: Omit<Bill, 'id'>) => {
    const newBill: Bill = { ...bill, id: `bill_man_${Date.now()}` };
    const updated = [...bills, newBill];
    setBills(updated);
    StorageService.saveBills(updated);
    refreshStorageUsage();
    showNotification('success', `Scheduled bill ${newBill.name} ($${newBill.amount.toFixed(2)})`);
  };

  const toggleBillPaid = (id: string) => {
    const updated = bills.map(b => (b.id === id ? { ...b, isPaidThisCycle: !b.isPaidThisCycle } : b));
    setBills(updated);
    StorageService.saveBills(updated);
    showNotification('info', 'Updated bill payment status');
  };

  const deleteBill = (id: string) => {
    const updated = bills.filter(b => b.id !== id);
    setBills(updated);
    StorageService.saveBills(updated);
    refreshStorageUsage();
    showNotification('info', 'Deleted bill');
  };

  const updateBudget = (id: string, allocated: number) => {
    const updated = budgets.map(b => (b.id === id ? { ...b, allocated } : b));
    setBudgets(updated);
    StorageService.saveBudgets(updated);
    refreshStorageUsage();
    showNotification('success', 'Budget envelope updated');
  };

  const updateMemory = (newMemory: MemoryFile) => {
    setMemory(newMemory);
    StorageService.saveMemory(newMemory);
    refreshStorageUsage();
    showNotification('success', `Memory core updated (Revision #${newMemory.revisionCount})`);
  };

  const updateConfig = (newConfig: Partial<LLMConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    StorageService.saveConfig(updated);
    refreshStorageUsage();
    showNotification('success', 'Agent settings saved');
  };

  const exportJson = () => {
    const dataStr = StorageService.exportAllDataJson();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `purse_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('success', 'Exported full JSON data backup.');
  };

  const exportCsv = () => {
    const csvStr = StorageService.exportTransactionsCsv();
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `purse_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('success', 'Exported transactions as standard CSV.');
  };

  const importJson = (jsonStr: string) => {
    const result = StorageService.importAllDataJson(jsonStr);
    if (result.success) {
      setAccounts(StorageService.getAccounts());
      setTransactions(StorageService.getTransactions());
      setBills(StorageService.getBills());
      setBudgets(StorageService.getBudgets());
      setMemory(StorageService.getMemory());
      setActions(StorageService.getActions());
      refreshStorageUsage();
      showNotification('success', result.message);
    } else {
      showNotification('error', result.message);
    }
    return result;
  };

  const importCsv = (csvStr: string) => {
    const result = StorageService.importTransactionsCsv(csvStr);
    if (result.success) {
      setTransactions(StorageService.getTransactions());
      refreshStorageUsage();
      showNotification('success', result.message);
    } else {
      showNotification('error', result.message);
    }
    return result;
  };

  const resetAllData = () => {
    StorageService.resetToSeed();
    setAccounts(StorageService.getAccounts());
    setTransactions(StorageService.getTransactions());
    setBills(StorageService.getBills());
    setBudgets(StorageService.getBudgets());
    setMemory(StorageService.getMemory());
    setActions([]);
    refreshStorageUsage();
    showNotification('info', 'Reset all records to authentic seed dataset.');
  };

  // Double-confirmation complete wipe of all data
  const wipeEverything = () => {
    SpeechService.stopSpeaking();
    StorageService.clearAllData();
    setAccounts([]);
    setTransactions([]);
    setBills([]);
    setBudgets([]);
    setActions([]);
    setChatMessages([]);
    setMemory(StorageService.getMemory());
    refreshStorageUsage();
    showNotification('info', 'All browser storage has been completely erased.');
  };

  return (
    <FinanceContext.Provider
      value={{
        accounts,
        transactions,
        bills,
        budgets,
        memory,
        chatMessages,
        actions,
        config,
        theme,
        currentView,
        isGenerating,
        notification,
        isSpeechEnabled,
        setIsSpeechEnabled,
        toggleSpeechEnabled,
        speakingMsgId,
        speakMessage,
        stopSpeaking,
        storageUsage,
        refreshStorageUsage,
        clearNotification,
        showNotification,
        setCurrentView: changeView,
        toggleTheme,
        sendMessage,
        applyAction,
        rejectAction,
        rollbackAction,
        addTransaction,
        deleteTransaction,
        addBill,
        toggleBillPaid,
        deleteBill,
        updateBudget,
        updateMemory,
        updateConfig,
        exportJson,
        exportCsv,
        importJson,
        importCsv,
        resetAllData,
        wipeEverything
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within a FinanceProvider');
  return ctx;
};
