import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { ExpenseCategory, Transaction, TransactionType } from '../../types/finance';
import confetti from 'canvas-confetti';
import {
  Plus,
  Download,
  Upload,
  Search,
  Trash2,
  Filter,
  FileSpreadsheet,
  AlertCircle,
  X,
  Sparkles,
  CheckCircle2,
  Calendar,
  Tag
} from 'lucide-react';

export const LedgerView: React.FC = () => {
  const {
    transactions,
    accounts,
    addTransaction,
    deleteTransaction,
    exportCsv,
    importCsv,
    openInitModal,
    setCurrentView
  } = useFinance();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Add Transaction Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formAmount, setFormAmount] = useState('');
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('Groceries');
  const [formMerchant, setFormMerchant] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formAccount, setFormAccount] = useState(accounts[0]?.id || 'acc_default');

  // CSV Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const categories: ExpenseCategory[] = [
    'Housing & Rent',
    'Groceries',
    'Utilities & Services',
    'Dining & Nightlife',
    'Transportation & Fuel',
    'Health & Wellness',
    'Subscriptions & Software',
    'Entertainment & Leisure',
    'Shopping & Goods',
    'Savings & Investments',
    'Other'
  ];

  // Filtering
  const filteredTxs = transactions.filter(t => {
    const matchesSearch =
      t.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.note && t.note.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesType = selectedType === 'all' || t.type === selectedType;
    return matchesSearch && matchesCat && matchesType;
  });

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#7C3AED', '#A78BFA', '#10B981', '#F472B6']
      });
    } catch {}
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0 || !formMerchant.trim()) return;

    addTransaction({
      date: formDate,
      amount: amt,
      type: formType,
      category: formCategory,
      merchant: formMerchant.trim(),
      note: formNote.trim() || undefined,
      accountId: formAccount || accounts[0]?.id || 'acc_default'
    });

    triggerConfetti();
    setShowAddModal(false);
    setFormAmount('');
    setFormMerchant('');
    setFormNote('');
  };

  const handleCsvImport = () => {
    if (!csvText.trim()) return;
    const res = importCsv(csvText);
    if (res.success) {
      setImportStatus(`Success! Added ${res.addedCount} records.`);
      triggerConfetti();
      setTimeout(() => {
        setShowImportModal(false);
        setImportStatus(null);
        setCsvText('');
      }, 1200);
    } else {
      setImportStatus(res.message);
    }
  };

  return (
    <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-6 font-sans animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <span className="text-[11px] font-mono text-violet-600 dark:text-violet-400 uppercase tracking-wider block font-bold">
            Local Encrypted Ledger
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>Transactions &amp; General Ledger</span>
            <span className="text-xs">📊</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 hover:text-violet-600 dark:hover:text-violet-400 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 transition-all cursor-pointer bubbly-btn shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-violet-500" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={exportCsv}
            disabled={transactions.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 hover:text-violet-600 dark:hover:text-violet-400 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 disabled:opacity-40 transition-all cursor-pointer bubbly-btn shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-indigo-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-extrabold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-2xl cursor-pointer bubbly-btn shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Record Transaction ✨</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white dark:bg-[#121216] p-3.5 border-2 border-violet-100 dark:border-zinc-800 rounded-3xl font-mono text-xs shadow-sm bubbly-card">
        
        {/* Search */}
        <div className="flex-1 flex items-center gap-2 border border-zinc-200 dark:border-zinc-700 px-3 py-2 rounded-2xl bg-zinc-50 dark:bg-zinc-900">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search payee, merchant, note..."
            className="w-full bg-transparent text-xs text-zinc-900 dark:text-white focus:outline-none placeholder-zinc-400 font-sans"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-violet-500 shrink-0" />
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3 py-2 rounded-2xl text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <select
          value={selectedType}
          onChange={e => setSelectedType(e.target.value)}
          className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3 py-2 rounded-2xl text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
        >
          <option value="all">All Types</option>
          <option value="expense">Expenses Only</option>
          <option value="income">Income Only</option>
          <option value="transfer">Transfers Only</option>
        </select>

        <span className="text-zinc-500 dark:text-zinc-400 whitespace-nowrap text-right text-[11px] font-bold">
          {filteredTxs.length} items
        </span>
      </div>

      {/* Empty State vs Bubbly Ledger Table */}
      {transactions.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-3xl border-2 border-dashed border-violet-200 dark:border-violet-900/50 bg-white/70 dark:bg-[#121216]/70 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-300 flex items-center justify-center text-3xl shadow-md animate-bounce-gentle">
            🧾
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">
              Your Ledger is Pristine
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
              No transactions recorded yet. Drop a bank statement, let AI parse your CSV, or manually record your first expense!
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={openInitModal}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl text-xs font-extrabold cursor-pointer bubbly-btn shadow-md flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Import with AI Ingestion 🪄</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 border-2 border-zinc-200 dark:border-zinc-800 hover:border-violet-400 text-zinc-800 dark:text-zinc-200 rounded-2xl text-xs font-bold cursor-pointer bubbly-btn"
            >
              <span>Record First Expense ➕</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-violet-100 dark:border-zinc-800 bg-white dark:bg-[#121216] rounded-3xl overflow-hidden shadow-sm bubbly-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 font-mono text-zinc-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 font-bold w-28">DATE</th>
                  <th className="py-3 px-4 font-bold">MERCHANT / PAYEE</th>
                  <th className="py-3 px-4 font-bold">CATEGORY</th>
                  <th className="py-3 px-4 font-bold hidden md:table-cell">NOTE</th>
                  <th className="py-3 px-4 font-bold text-right w-32">AMOUNT</th>
                  <th className="py-3 px-4 font-bold text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 font-mono">
                {filteredTxs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                      No records match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTxs.map(t => {
                    const isIncome = t.type === 'income';
                    const isTransfer = t.type === 'transfer';
                    return (
                      <tr
                        key={t.id}
                        className="hover:bg-violet-50/40 dark:hover:bg-violet-950/20 transition-colors h-11"
                      >
                        <td className="py-2.5 px-4 text-zinc-500 whitespace-nowrap">
                          {t.date}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                          {t.merchant}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 font-medium">
                            {t.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-zinc-500 dark:text-zinc-400 hidden md:table-cell truncate max-w-xs font-sans">
                          {t.note || '—'}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right font-extrabold tabular-nums whitespace-nowrap text-sm ${
                            isIncome
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isTransfer
                              ? 'text-blue-500 dark:text-blue-400'
                              : 'text-zinc-900 dark:text-zinc-100'
                          }`}
                        >
                          {isIncome ? '+' : isTransfer ? '' : '-'}${t.amount.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => deleteTransaction(t.id)}
                            className="text-zinc-300 hover:text-rose-500 p-1 cursor-pointer transition-colors"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#121216] border-2 border-violet-400 dark:border-violet-600 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Record New Transaction</span>
                <span className="text-xs">✨</span>
              </span>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 font-sans">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Merchant / Payee
                </label>
                <input
                  type="text"
                  required
                  value={formMerchant}
                  onChange={e => setFormMerchant(e.target.value)}
                  placeholder="e.g. Trader Joe's, Blue Bottle"
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Type
                  </label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  value={formNote}
                  onChange={e => setFormNote(e.target.value)}
                  placeholder="Optional detail or context"
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold cursor-pointer bubbly-btn shadow-md"
                >
                  Commit Record ✨
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#121216] border-2 border-violet-400 dark:border-violet-600 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Upload className="w-4 h-4 text-violet-600" />
                <span>Import CSV Transactions</span>
              </span>
              <button
                onClick={() => { setShowImportModal(false); setImportStatus(null); }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-zinc-600 dark:text-zinc-400 font-sans text-xs">
              Paste standard bank CSV data below (must include header row with Date and Amount columns):
            </p>

            <textarea
              rows={6}
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder="Date,Amount,Type,Category,Merchant,Note&#10;2026-10-15,42.50,expense,Groceries,Trader Joe's,Apples & oats"
              className="w-full p-3 rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 font-mono text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500"
            />

            {importStatus && (
              <div className="p-3 bg-violet-50 dark:bg-violet-950/60 rounded-xl border border-violet-200 dark:border-violet-800 text-xs font-bold text-violet-700 dark:text-violet-300">
                {importStatus}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => { setShowImportModal(false); setImportStatus(null); }}
                className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCsvImport}
                className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold cursor-pointer bubbly-btn shadow-md"
              >
                Parse &amp; Import ✨
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
