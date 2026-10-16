import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { BudgetEnvelope } from '../../types/finance';
import {
  PieChart,
  AlertTriangle,
  Edit2,
  Check,
  X
} from 'lucide-react';

export const BudgetsView: React.FC = () => {
  const { budgets, transactions, memory, updateBudget } = useFinance();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const currentMonthTxs = transactions.filter(t => t.date.startsWith('2026-10') && t.type === 'expense');

  const getSpentForCategory = (catName: string) => {
    return currentMonthTxs
      .filter(t => t.category === catName)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const totalAllocated = budgets.reduce((sum, b) => sum + b.allocated, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + getSpentForCategory(b.category), 0);
  const totalIncome = memory.profile.monthlyIncome;
  const unallocatedIncome = totalIncome - totalAllocated;

  const handleStartEdit = (b: BudgetEnvelope) => {
    setEditingId(b.id);
    setEditValue(b.allocated.toString());
  };

  const handleSaveEdit = (id: string) => {
    const val = parseFloat(editValue);
    if (!isNaN(val) && val >= 0) {
      updateBudget(id, val);
    }
    setEditingId(null);
  };

  const groups: { title: string; type: 'need' | 'want' | 'savings'; targetPct: number }[] = [
    { title: 'Essential Needs', type: 'need', targetPct: 50 },
    { title: 'Discretionary Wants', type: 'want', targetPct: 30 },
    { title: 'Savings & Investments', type: 'savings', targetPct: 20 }
  ];

  return (
    <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80 dark:border-neutral-800/80">
        <div>
          <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
            50 / 30 / 20 Envelopes
          </span>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Smart Budgets
          </h1>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">
            Net Monthly Inflow
          </span>
          <span className="font-mono text-sm font-bold text-neutral-900 dark:text-white tabular-nums">
            ${totalIncome.toFixed(0)}
          </span>
        </div>
      </div>

      {/* Aggregate Overview Card */}
      <div className="p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl shadow-xs space-y-2.5">
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
            <PieChart className="w-3.5 h-3.5 text-emerald-500" />
            <span>Monthly Envelope Spend</span>
          </span>
          <span className="text-neutral-500">
            ${totalSpent.toFixed(0)} / ${totalAllocated.toFixed(0)} ({totalAllocated > 0 ? ((totalSpent / totalAllocated) * 100).toFixed(0) : 0}%)
          </span>
        </div>

        <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden flex">
          {budgets.map(b => {
            const spent = getSpentForCategory(b.category);
            const pct = totalAllocated > 0 ? (spent / totalAllocated) * 100 : 0;
            if (pct <= 0) return null;
            return (
              <div
                key={b.id}
                title={`${b.category}: $${spent.toFixed(2)}`}
                className="h-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: b.color }}
              />
            );
          })}
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-4">
        {groups.map(group => {
          const groupBudgets = budgets.filter(b => b.type === group.type);

          return (
            <div
              key={group.type}
              className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl shadow-xs overflow-hidden"
            >
              <div className="px-4 py-2.5 bg-neutral-50/50 dark:bg-neutral-950/50 border-b border-neutral-200/80 dark:border-neutral-800/80 font-mono text-xs flex items-center justify-between">
                <span className="font-bold text-neutral-900 dark:text-white">
                  {group.title}
                </span>
                <span className="text-neutral-400 text-[11px]">
                  Target: {group.targetPct}%
                </span>
              </div>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                {groupBudgets.map(b => {
                  const spent = getSpentForCategory(b.category);
                  const remaining = b.allocated - spent;
                  const pct = b.allocated > 0 ? Math.min(100, Math.round((spent / b.allocated) * 100)) : 0;
                  const isOver = spent > b.allocated;
                  const isEditing = editingId === b.id;

                  return (
                    <div key={b.id} className="p-3.5 space-y-1.5 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                          <span className="font-semibold text-neutral-900 dark:text-white">{b.category}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] tabular-nums ${isOver ? 'text-red-500 font-bold' : 'text-neutral-500'}`}>
                            ${spent.toFixed(0)} / ${b.allocated.toFixed(0)}
                          </span>
                          {!isEditing ? (
                            <button
                              onClick={() => handleStartEdit(b)}
                              className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-0.5 cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                className="w-16 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-xs text-neutral-900 dark:text-white"
                                autoFocus
                              />
                              <button onClick={() => handleSaveEdit(b.id)} className="text-emerald-500 p-0.5">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setEditingId(null)} className="text-neutral-400 p-0.5">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-neutral-900 dark:bg-neutral-100'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
