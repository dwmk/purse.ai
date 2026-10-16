import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Bill, ExpenseCategory } from '../../types/finance';
import {
  Calendar,
  CheckCircle2,
  Plus,
  Trash2,
  Sparkles,
  X
} from 'lucide-react';

export const BillsView: React.FC = () => {
  const { bills, addBill, toggleBillPaid, deleteBill } = useFinance();
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Utilities & Services');
  const [dueDate, setDueDate] = useState('2026-11-01');
  const [isAutopay, setIsAutopay] = useState(true);

  const totalMonthlyBills = bills.reduce((sum, b) => sum + b.amount, 0);
  const unpaidBills = bills.filter(b => !b.isPaidThisCycle);
  const flaggedLeaks = bills.filter(b => b.potentialSavingsNotice);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0 || !name.trim()) return;

    addBill({
      name: name.trim(),
      amount: amt,
      category,
      frequency: 'monthly',
      dueDate,
      isAutopay,
      isPaidThisCycle: false,
      status: 'upcoming'
    });

    setShowAddModal(false);
    setName('');
    setAmount('');
  };

  return (
    <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80 dark:border-neutral-800/80">
        <div>
          <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
            Recurring Obligations
          </span>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Bills &amp; Subscriptions
          </h1>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 text-xs font-mono font-semibold transition-all tactile-btn cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Bill</span>
        </button>
      </div>

      {/* Subscription Leak Alert Banner */}
      {flaggedLeaks.length > 0 && (
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 backdrop-blur-xl space-y-2 font-mono text-xs">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
            <Sparkles className="w-4 h-4" />
            <span>AI Subscription Leak Detection</span>
          </div>
          <div className="space-y-1.5 text-neutral-700 dark:text-neutral-300">
            {flaggedLeaks.map(f => (
              <div key={f.id} className="p-2 bg-white/60 dark:bg-neutral-900/60 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 text-[11px]">
                <span className="font-bold text-neutral-900 dark:text-white">{f.name}: </span>
                <span>{f.potentialSavingsNotice}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Minimal Bills Card */}
      <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-neutral-50/50 dark:bg-neutral-950/50 border-b border-neutral-200/80 dark:border-neutral-800/80 font-mono text-xs flex items-center justify-between">
          <span className="font-bold text-neutral-900 dark:text-white">
            Upcoming Calendar
          </span>
          <span className="text-neutral-400">
            {unpaidBills.length} unpaid (${unpaidBills.reduce((s, b) => s + b.amount, 0).toFixed(0)})
          </span>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
          {bills.map(b => (
            <div
              key={b.id}
              className={`p-3.5 flex items-center justify-between gap-3 transition-opacity ${
                b.isPaidThisCycle ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleBillPaid(b.id)}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                    b.isPaidThisCycle
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-400'
                  }`}
                >
                  {b.isPaidThisCycle && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
                <div>
                  <div className="font-semibold text-neutral-900 dark:text-white">{b.name}</div>
                  <div className="text-[11px] text-neutral-400">
                    Due: {b.dueDate} · {b.isAutopay ? 'Autopay' : 'Manual'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-bold text-neutral-900 dark:text-white tabular-nums">
                  ${b.amount.toFixed(2)}
                </span>
                <button
                  onClick={() => deleteBill(b.id)}
                  className="text-neutral-300 hover:text-red-500 p-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ADD BILL MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 w-full max-w-sm p-5 rounded-2xl shadow-2xl space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="font-bold text-neutral-900 dark:text-white">Add Recurring Bill</h2>
              <button onClick={() => setShowAddModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block text-neutral-500 mb-1">NAME</label>
                <input
                  type="text"
                  placeholder="e.g. Netflix"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2 rounded-lg text-neutral-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-500 mb-1">AMOUNT ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2 rounded-lg text-neutral-900 dark:text-white tabular-nums"
                    required
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 mb-1">DUE DATE</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2 rounded-lg text-neutral-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-500 mb-1">CATEGORY</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2 rounded-lg text-neutral-900 dark:text-white"
                >
                  <option value="Utilities & Services">Utilities & Services</option>
                  <option value="Housing & Rent">Housing & Rent</option>
                  <option value="Subscriptions & Software">Subscriptions & Software</option>
                  <option value="Health & Wellness">Health & Wellness</option>
                  <option value="Transportation & Fuel">Transportation & Fuel</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autopay"
                  checked={isAutopay}
                  onChange={e => setIsAutopay(e.target.checked)}
                  className="rounded cursor-pointer"
                />
                <label htmlFor="autopay" className="text-neutral-700 dark:text-neutral-300 cursor-pointer">
                  Autopay is enabled
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 text-neutral-500 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 font-semibold rounded-lg"
                >
                  Save Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
