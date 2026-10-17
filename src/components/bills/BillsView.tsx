import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Bill, ExpenseCategory } from '../../types/finance';
import {
  Calendar,
  CheckCircle2,
  Plus,
  Trash2,
  Sparkles,
  X,
  Clock,
  AlertCircle,
  Pencil
} from 'lucide-react';

// Live Countdown & Progress Bar Component for each bill deadline
const BillCountdownBar: React.FC<{
  dueDate: string;
  isPaid: boolean;
}> = ({ dueDate, isPaid }) => {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute target deadline (end of due date day: 23:59:59 local time)
  const targetTime = new Date(`${dueDate}T23:59:59`).getTime();
  const diffMs = targetTime - now;

  if (isPaid) {
    return (
      <div className="space-y-1.5 mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 font-mono text-[11px]">
        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Paid for this billing cycle</span>
          </span>
          <span className="text-[10px] bg-emerald-500/10 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/20">
            100% COMPLETED
          </span>
        </div>
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full w-full rounded-full transition-all duration-300" />
        </div>
      </div>
    );
  }

  const isOverdue = diffMs <= 0;

  if (isOverdue) {
    const pastDays = Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    return (
      <div className="space-y-1.5 mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 font-mono text-[11px]">
        <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 font-bold">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{pastDays === 0 ? 'Deadline is today!' : `Deadline passed (${pastDays}d overdue)`}</span>
          </span>
          <span className="text-[10px] bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
            ACTION REQUIRED
          </span>
        </div>
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
          <div className="bg-rose-500 h-full w-full rounded-full" />
        </div>
      </div>
    );
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  const seconds = Math.floor((diffMs / 1000) % 60);

  // Billing cycle assumption: 30 days total
  const cycleTotalMs = 30 * 24 * 60 * 60 * 1000;
  const elapsedMs = Math.max(0, cycleTotalMs - diffMs);
  const progressPercent = Math.min(100, Math.max(3, (elapsedMs / cycleTotalMs) * 100));

  const isUrgent = days < 3;
  const isCritical = days === 0;

  const barColor = isCritical
    ? 'bg-rose-500'
    : isUrgent
    ? 'bg-amber-500'
    : 'bg-gradient-to-r from-violet-600 to-indigo-600';

  const badgeColor = isCritical
    ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20'
    : isUrgent
    ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'
    : 'text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20';

  return (
    <div className="space-y-1.5 mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 font-mono text-[11px]">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-violet-500" />
          <span>Deadline countdown:</span>
        </span>
        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border tabular-nums ${badgeColor}`}>
          {days}d {hours}h {minutes}m {seconds}s remain
        </span>
      </div>

      <div className="space-y-1">
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-zinc-400 uppercase tracking-wider">
          <span>Cycle Start</span>
          <span>{progressPercent.toFixed(0)}% elapsed · Due in {days} {days === 1 ? 'day' : 'days'}</span>
          <span>Deadline</span>
        </div>
      </div>
    </div>
  );
};

export const BillsView: React.FC = () => {
  const { bills, addBill, updateBill, toggleBillPaid, deleteBill } = useFinance();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Utilities & Services');
  const [dueDate, setDueDate] = useState('2026-11-01');
  const [isAutopay, setIsAutopay] = useState(true);

  const totalMonthlyBills = bills.reduce((sum, b) => sum + b.amount, 0);
  const unpaidBills = bills.filter(b => !b.isPaidThisCycle);
  const flaggedLeaks = bills.filter(b => b.potentialSavingsNotice);

  const openAddModal = () => {
    setEditingBill(null);
    setName('');
    setAmount('');
    setCategory('Utilities & Services');
    setDueDate('2026-11-01');
    setIsAutopay(true);
    setShowAddModal(true);
  };

  const openEditModal = (b: Bill) => {
    setEditingBill(b);
    setName(b.name);
    setAmount(b.amount.toString());
    setCategory(b.category);
    setDueDate(b.dueDate);
    setIsAutopay(b.isAutopay);
    setShowAddModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0 || !name.trim()) return;

    if (editingBill) {
      updateBill(editingBill.id, {
        name: name.trim(),
        amount: amt,
        category,
        dueDate,
        isAutopay
      });
    } else {
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
    }

    setShowAddModal(false);
    setEditingBill(null);
    setName('');
    setAmount('');
  };

  return (
    <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block font-bold">
            Recurring Commitments
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Bills &amp; Subscriptions
          </h1>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-mono font-semibold transition-all tactile-btn cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Bill</span>
        </button>
      </div>

      {/* Subscription Leak Alert Banner */}
      {flaggedLeaks.length > 0 && (
        <div className="p-4 rounded-3xl border border-violet-200 dark:border-violet-900/50 bg-violet-50/50 dark:bg-violet-950/20 backdrop-blur-md space-y-2 font-mono text-xs shadow-xs">
          <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300 font-bold">
            <Sparkles className="w-4 h-4" />
            <span>AI Subscription Leak Detection</span>
          </div>
          <div className="space-y-1.5 text-zinc-700 dark:text-zinc-300">
            {flaggedLeaks.map(f => (
              <div key={f.id} className="p-2.5 bg-white/80 dark:bg-zinc-900/80 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-[11px]">
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{f.name}: </span>
                <span>{f.potentialSavingsNotice}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bills Calendar Card with Live Deadlines and Progress Bars */}
      <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 font-mono text-xs flex items-center justify-between">
          <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span>Upcoming Calendar Deadlines</span>
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">
            {unpaidBills.length} unpaid (${unpaidBills.reduce((s, b) => s + b.amount, 0).toFixed(2)}) · Total ${totalMonthlyBills.toFixed(2)}/mo
          </span>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 font-mono text-xs">
          {bills.map(b => (
            <div
              key={b.id}
              className={`p-4 transition-all hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 ${
                b.isPaidThisCycle ? 'opacity-65' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => toggleBillPaid(b.id)}
                    title={b.isPaidThisCycle ? 'Mark as unpaid' : 'Mark as paid'}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                      b.isPaidThisCycle
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-zinc-300 dark:border-zinc-600 hover:border-violet-500'
                    }`}
                  >
                    {b.isPaidThisCycle && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm truncate">{b.name}</div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                      <span>Due: {b.dueDate}</span>
                      <span>·</span>
                      <span className="text-violet-600 dark:text-violet-400">{b.category}</span>
                      <span>·</span>
                      <span>{b.isAutopay ? 'Autopay' : 'Manual'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm sm:text-base tabular-nums mr-1">
                    ${b.amount.toFixed(2)}
                  </span>
                  <button
                    onClick={() => openEditModal(b)}
                    title={`Edit ${b.name}`}
                    className="text-zinc-400 hover:text-violet-600 dark:hover:text-violet-400 p-1.5 cursor-pointer rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteBill(b.id)}
                    title={`Delete ${b.name}`}
                    className="text-zinc-400 hover:text-rose-500 p-1.5 cursor-pointer rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress Bar & Live Countdown */}
              <BillCountdownBar
                dueDate={b.dueDate}
                isPaid={b.isPaidThisCycle}
              />
            </div>
          ))}

          {bills.length === 0 && (
            <div className="py-10 text-center text-xs font-mono text-zinc-400">
              No bills scheduled yet. Click &quot;Add Bill&quot; above to track upcoming obligations.
            </div>
          )}
        </div>
      </div>

      {/* ADD / EDIT BILL MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800 w-full max-w-sm p-5 rounded-3xl shadow-2xl space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                {editingBill ? 'Edit Recurring Bill' : 'Add Recurring Bill'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingBill(null);
                }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">NAME</label>
                <input
                  type="text"
                  placeholder="e.g. Netflix, Spectrum Fiber"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">AMOUNT ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-zinc-900 dark:text-zinc-100 tabular-nums focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">DUE DATE</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">CATEGORY</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500"
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
                  className="rounded cursor-pointer accent-violet-600"
                />
                <label htmlFor="autopay" className="text-zinc-700 dark:text-zinc-300 cursor-pointer text-xs">
                  Autopay is enabled
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingBill(null);
                  }}
                  className="px-3.5 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-850"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 text-white font-semibold rounded-xl cursor-pointer hover:bg-violet-700 shadow-xs"
                >
                  {editingBill ? 'Save Changes' : 'Save Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
