import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { ExpenseCategory, Transaction, TransactionType } from '../../types/finance';
import {
  Plus,
  Download,
  Upload,
  Search,
  Trash2,
  Filter,
  FileSpreadsheet,
  AlertCircle,
  X
} from 'lucide-react';

export const LedgerView: React.FC = () => {
  const {
    transactions,
    accounts,
    addTransaction,
    deleteTransaction,
    exportCsv,
    importCsv
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
  const [formAccount, setFormAccount] = useState(accounts[0]?.id || 'acc_chk_01');

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
      accountId: formAccount
    });

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
      setTimeout(() => {
        setShowImportModal(false);
        setImportStatus(null);
        setCsvText('');
      }, 1200);
    } else {
      setImportStatus(`Error: ${res.message}`);
    }
  };

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      setCsvText(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5 font-sans">
      
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 dark:text-neutral-400">
            <span>Purse Core</span>
            <span>/</span>
            <span>Immutable Local Bookkeeping Ledger</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white mt-0.5">
            Transactions & General Ledger
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-neutral-700 rounded-xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-neutral-700 rounded-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 rounded-xs tactile-key dark:tactile-key-light cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Transaction</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white dark:bg-neutral-900 p-3 border border-neutral-200 dark:border-neutral-800 rounded-xs carbon-panel font-mono text-xs">
        
        {/* Search */}
        <div className="flex-1 flex items-center gap-2 border border-neutral-200 dark:border-neutral-700 px-2.5 py-1.5 rounded-xs bg-neutral-50 dark:bg-neutral-950">
          <Search className="w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search payee, merchant, note..."
            className="w-full bg-transparent text-xs text-neutral-900 dark:text-white focus:outline-none"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 px-2.5 py-1.5 rounded-xs text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer"
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
          className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 px-2.5 py-1.5 rounded-xs text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer"
        >
          <option value="all">All Types</option>
          <option value="expense">Expenses Only</option>
          <option value="income">Income Only</option>
          <option value="transfer">Transfers Only</option>
        </select>

        <span className="text-neutral-500 dark:text-neutral-400 whitespace-nowrap ml-auto">
          {filteredTxs.length} records
        </span>
      </div>

      {/* Carbon High-Density Ledger Table */}
      <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-xs overflow-hidden carbon-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 font-mono text-neutral-500 dark:text-neutral-400">
                <th className="py-2.5 px-4 font-medium w-28">DATE</th>
                <th className="py-2.5 px-4 font-medium">MERCHANT / PAYEE</th>
                <th className="py-2.5 px-4 font-medium">CATEGORY</th>
                <th className="py-2.5 px-4 font-medium hidden md:table-cell">NOTE</th>
                <th className="py-2.5 px-4 font-medium text-right w-32">AMOUNT</th>
                <th className="py-2.5 px-4 font-medium text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80 font-mono">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-500 dark:text-neutral-400">
                    No matching records found. Use conversational assistant or click &quot;Record Transaction&quot;.
                  </td>
                </tr>
              ) : (
                filteredTxs.map(t => {
                  const isIncome = t.type === 'income';
                  const isTransfer = t.type === 'transfer';
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors h-10"
                    >
                      <td className="py-2 px-4 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                        {t.date}
                      </td>
                      <td className="py-2 px-4 font-semibold text-neutral-900 dark:text-white">
                        {t.merchant}
                      </td>
                      <td className="py-2 px-4 text-neutral-600 dark:text-neutral-300">
                        {t.category}
                      </td>
                      <td className="py-2 px-4 text-neutral-500 dark:text-neutral-400 hidden md:table-cell truncate max-w-xs">
                        {t.note || '—'}
                      </td>
                      <td
                        className={`py-2 px-4 text-right font-bold tabular-nums whitespace-nowrap ${
                          isIncome
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isTransfer
                            ? 'text-blue-500 dark:text-blue-400'
                            : 'text-neutral-900 dark:text-white'
                        }`}
                      >
                        {isIncome ? '+' : isTransfer ? '' : '-'}${t.amount.toFixed(2)}
                      </td>
                      <td className="py-2 px-4 text-center">
                        <button
                          onClick={() => deleteTransaction(t.id)}
                          aria-label={`Delete transaction ${t.merchant}`}
                          className="text-neutral-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
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

      {/* ADD TRANSACTION MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 w-full max-w-md p-6 rounded-xs carbon-panel space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                Record New Transaction
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-neutral-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block text-neutral-500 mb-1">DATE</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 p-2 text-neutral-900 dark:text-white rounded-xs focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-500 mb-1">AMOUNT ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 p-2 text-neutral-900 dark:text-white rounded-xs focus:outline-none tabular-nums"
                    required
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 mb-1">TYPE</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as TransactionType)}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 p-2 text-neutral-900 dark:text-white rounded-xs focus:outline-none"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-neutral-500 mb-1">PAYEE / MERCHANT</label>
                <input
                  type="text"
                  placeholder="e.g. Trader Joe's"
                  value={formMerchant}
                  onChange={e => setFormMerchant(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 p-2 text-neutral-900 dark:text-white rounded-xs focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-500 mb-1">CATEGORY</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 p-2 text-neutral-900 dark:text-white rounded-xs focus:outline-none"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-500 mb-1">ACCOUNT</label>
                <select
                  value={formAccount}
                  onChange={e => setFormAccount(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 p-2 text-neutral-900 dark:text-white rounded-xs focus:outline-none"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} (${a.balance.toFixed(2)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-500 mb-1">OPTIONAL NOTE</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly organic groceries"
                  value={formNote}
                  onChange={e => setFormNote(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 p-2 text-neutral-900 dark:text-white rounded-xs focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold rounded-xs tactile-key dark:tactile-key-light cursor-pointer"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL WITH SAMPLE TEMPLATES & FORMAT HINTS */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 w-full max-w-lg p-6 rounded-xs carbon-panel space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Import Bank / Bookkeeping CSV
                </h2>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-neutral-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Format Hints */}
            <div className="bg-neutral-50 dark:bg-neutral-950 p-3 border border-neutral-200 dark:border-neutral-800 rounded-xs text-[11px] text-neutral-600 dark:text-neutral-400 space-y-1">
              <div className="font-semibold text-neutral-900 dark:text-neutral-200 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
                <span>EXPECTED FORMAT & COLUMN HINTS:</span>
              </div>
              <p>Headers required: <code className="text-emerald-500">Date, Amount, Merchant, Category, Note</code></p>
              <p>Sample line: <code className="text-neutral-500">2026-10-15, 42.50, Ramen Tatsu-Ya, Dining &amp; Nightlife, Dinner</code></p>
            </div>

            {/* File Pick */}
            <div>
              <label className="block text-neutral-500 mb-1">SELECT CSV FILE OR PASTE CONTENT BELOW</label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileDrop}
                className="w-full text-xs text-neutral-500 file:mr-3 file:py-1.5 file:px-3 file:border file:border-neutral-300 dark:file:border-neutral-700 file:bg-neutral-100 dark:file:bg-neutral-800 file:text-xs file:font-mono file:text-neutral-700 dark:file:text-neutral-200 cursor-pointer"
              />
            </div>

            {/* Paste Area */}
            <div>
              <textarea
                rows={6}
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                placeholder="Paste CSV rows here..."
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 p-2 text-neutral-900 dark:text-white rounded-xs font-mono text-xs focus:outline-none"
              />
            </div>

            {importStatus && (
              <div className={`p-2 rounded-xs text-xs font-mono ${importStatus.startsWith('Success') ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                {importStatus}
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleCsvImport}
                disabled={!csvText.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xs tactile-key cursor-pointer disabled:opacity-40"
              >
                Import Transactions
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
