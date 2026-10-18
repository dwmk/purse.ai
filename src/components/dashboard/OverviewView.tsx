import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { AccountType } from '../../types/finance';
import {
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Trash2,
  Plus,
  X,
  Coins,
  Banknote,
  Building2,
  CheckCircle2
} from 'lucide-react';

export const OverviewView: React.FC = () => {
  const {
    accounts,
    transactions,
    budgets,
    actions,
    rollbackAction,
    deleteTransaction,
    addAccount,
    setCurrentView
  } = useFinance();

  const [activeAccountIdx, setActiveAccountIdx] = useState(0);
  const activeAccount = accounts[activeAccountIdx] || accounts[0] || {
    id: 'acc_default',
    name: 'Primary Account',
    type: 'cash' as const,
    balance: 0,
    currency: 'USD',
    institution: '',
    accountNumberMask: 'Cash',
    lastUpdated: new Date().toISOString()
  };

  // Add Account Modal states
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccType, setNewAccType] = useState<AccountType>('cash');
  const [newAccName, setNewAccName] = useState('Cash Pocket');
  const [newAccBalance, setNewAccBalance] = useState('0.00');
  const [newAccCurrency, setNewAccCurrency] = useState('USD');
  const [newAccInstitution, setNewAccInstitution] = useState('');
  const [newAccNetwork, setNewAccNetwork] = useState('Solana');
  const [newAccWalletAddress, setNewAccWalletAddress] = useState('');

  const totalLiquid = accounts
    .filter(a => a.type === 'checking' || a.type === 'savings' || a.type === 'cash')
    .reduce((sum, a) => sum + Math.max(0, a.balance), 0);

  const monthlyEssentialNeeds = budgets
    .filter(b => b.type === 'need')
    .reduce((sum, b) => sum + b.allocated, 0);

  const runwayMonths = monthlyEssentialNeeds > 0 ? (totalLiquid / monthlyEssentialNeeds).toFixed(1) : (totalLiquid > 0 ? '12.0+' : '0.0');
  const safeDailySpend = monthlyEssentialNeeds > 0 ? Math.max(0, (totalLiquid - monthlyEssentialNeeds) / 30).toFixed(2) : Math.max(0, totalLiquid / 30).toFixed(2);

  const recentTxs = transactions.slice(0, 6);
  const appliedActions = actions.filter(a => a.status === 'applied');

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const bal = parseFloat(newAccBalance) || 0;
    addAccount({
      name: newAccName.trim() || 'New Account',
      type: newAccType,
      balance: bal,
      currency: newAccCurrency || 'USD',
      institution: newAccType === 'cash' ? (newAccInstitution.trim() || undefined) : (newAccInstitution.trim() || (newAccType === 'crypto' ? 'Self-Custody' : 'Bank')),
      network: newAccType === 'crypto' ? newAccNetwork.trim() : undefined,
      walletAddress: newAccType === 'crypto' ? newAccWalletAddress.trim() : undefined,
      accountNumberMask: newAccType === 'cash' ? 'Cash' : newAccType === 'crypto' ? (newAccWalletAddress ? `${newAccWalletAddress.slice(0, 4)}...${newAccWalletAddress.slice(-4)}` : 'Web3') : '•••• 5521'
    });
    setShowAddAccountModal(false);
    // Select newly added account
    setActiveAccountIdx(accounts.length);
  };

  const accountHeaderPrefix = activeAccount.type === 'cash'
    ? (activeAccount.institution ? `${activeAccount.institution} · ` : 'Physical Cash · ')
    : activeAccount.type === 'crypto'
    ? `${activeAccount.network || 'Web3'} · `
    : (activeAccount.institution ? `${activeAccount.institution} · ` : '');

  return (
    <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-6 font-sans">
      
      {/* Top 2-Column Desktop Grid: Luxury Card on Left, Key Metrics on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: Solid Luxury Card Showcase */}
        <div className="lg:col-span-7 relative overflow-hidden rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-violet-900 via-indigo-950 to-purple-950 text-white shadow-xl border border-violet-800/40 flex flex-col justify-between min-h-[220px]">
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400 shrink-0" />
              <span className="font-mono text-xs uppercase tracking-wider text-violet-200 truncate">
                {accountHeaderPrefix}{activeAccount.name}
              </span>
            </div>
            <span className="font-mono text-xs text-violet-300/80 shrink-0">
              {activeAccount.network || activeAccount.accountNumberMask || (activeAccount.type === 'cash' ? 'No Bank' : '')}
            </span>
          </div>

          <div className="space-y-1 mb-6">
            <span className="text-xs font-mono uppercase text-violet-300 tracking-wider font-semibold">
              AVAILABLE BALANCE
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight tabular-nums text-white">
              ${activeAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Account Selector Pill Strip */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-3 border-t border-white/10">
            {accounts.map((acc, idx) => (
              <button
                key={acc.id}
                onClick={() => setActiveAccountIdx(idx)}
                className={`px-3 py-1 rounded-full text-xs font-mono whitespace-nowrap transition-all cursor-pointer ${
                  activeAccountIdx === idx
                    ? 'bg-white text-violet-950 font-bold shadow-xs'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {acc.type.toUpperCase()}: ${acc.balance.toFixed(0)}
              </button>
            ))}

            <button
              onClick={() => setShowAddAccountModal(true)}
              className="px-2.5 py-1 rounded-full text-xs font-mono whitespace-nowrap bg-white/20 hover:bg-white/30 text-white flex items-center gap-1 cursor-pointer transition-colors"
              title="Add Cash, Crypto, or Bank Account"
            >
              <Plus className="w-3 h-3" />
              <span>Add Account</span>
            </button>
          </div>
        </div>

        {/* Right Column: Key Metric Dial Cards */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          
          <div className="p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xs flex-1 flex flex-col justify-center">
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1 font-bold">
              Safe To Spend Today
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">
              ${safeDailySpend}
              <span className="text-xs font-normal text-zinc-400"> / day</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
              Calculated after fixed housing, bills &amp; emergency savings
            </p>
          </div>

          <div className="p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xs flex-1 flex flex-col justify-center">
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1 font-bold">
              Emergency Cash Runway
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">
              {runwayMonths}
              <span className="text-xs font-normal text-zinc-400"> months</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
              Zero-income survival reserve (${totalLiquid.toLocaleString()} liquid)
            </p>
          </div>

        </div>

      </div>

      {/* Recent Ledger Activity */}
      <div className="p-5 sm:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xs space-y-3.5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 block">
              Recent Ledger Activity
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Stored safely in private browser storage</span>
          </div>
          <button
            onClick={() => setCurrentView('ledger')}
            className="text-xs font-mono text-violet-600 dark:text-violet-400 hover:underline cursor-pointer font-bold"
          >
            All Transactions &rarr;
          </button>
        </div>

        {recentTxs.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-zinc-500 space-y-2">
            <p>No transactions logged yet.</p>
            <button
              onClick={() => setCurrentView('chat')}
              className="text-violet-600 dark:text-violet-400 font-bold hover:underline cursor-pointer"
            >
              Log your first transaction with Fiona in Chat &rarr;
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-xs">
            {recentTxs.map(t => {
              const isIncome = t.type === 'income';
              return (
                <div key={t.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm">{t.merchant}</div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {t.date} · {t.category}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold tabular-nums text-xs sm:text-sm ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                      {isIncome ? '+' : '-'}${t.amount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => deleteTransaction(t.id)}
                      aria-label={`Delete ${t.merchant}`}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Applied Agent Actions with 1-Click Undo */}
      {appliedActions.length > 0 && (
        <div className="p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-zinc-200 dark:border-zinc-800">
            <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Agent Mutation Stack (Safe Rollback)</span>
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">{appliedActions.length} actions</span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {appliedActions.slice(0, 4).map(a => (
              <div key={a.id} className="p-2.5 bg-zinc-50 dark:bg-zinc-900 rounded-xl flex items-center justify-between gap-3 border border-zinc-200 dark:border-zinc-800">
                <span className="truncate text-zinc-800 dark:text-zinc-200 text-xs font-semibold">
                  {a.description}
                </span>
                <button
                  onClick={() => rollbackAction(a.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] shrink-0 cursor-pointer font-bold"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Undo</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Launch CTA to Copilot */}
      <button
        onClick={() => setCurrentView('chat')}
        className="w-full py-4 rounded-2xl bg-violet-600 text-white hover:bg-violet-700 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all tactile-btn cursor-pointer"
      >
        <Sparkles className="w-4 h-4" />
        <span>Ask Fiona to Log or Analyze</span>
      </button>

      {/* Add Account Modal */}
      {showAddAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-md w-full p-6 text-zinc-900 dark:text-zinc-100 font-mono text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                  {newAccType === 'crypto' ? <Coins className="w-4 h-4" /> : newAccType === 'cash' ? <Banknote className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight">Add New Account</h3>
                  <span className="text-[10px] text-zinc-500 block">Expand your multi-asset portfolio</span>
                </div>
              </div>
              <button
                onClick={() => setShowAddAccountModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Account Type
                </label>
                <select
                  value={newAccType}
                  onChange={e => {
                    const nt = e.target.value as AccountType;
                    setNewAccType(nt);
                    if (nt === 'cash') {
                      setNewAccName('Physical Cash Pocket');
                      setNewAccInstitution('');
                    } else if (nt === 'crypto') {
                      setNewAccName('Web3 Crypto Wallet');
                      setNewAccInstitution('Self-Custody');
                    } else if (nt === 'checking') {
                      setNewAccName('Secondary Checking');
                      setNewAccInstitution('Bank');
                    } else if (nt === 'savings') {
                      setNewAccName('High-Yield Savings');
                      setNewAccInstitution('Marcus');
                    } else if (nt === 'credit') {
                      setNewAccName('Rewards Credit Card');
                      setNewAccInstitution('Chase');
                    } else if (nt === 'investment') {
                      setNewAccName('Stock Brokerage');
                      setNewAccInstitution('Fidelity');
                    }
                  }}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500 cursor-pointer"
                >
                  <option value="cash">Cash Account (Default / No bank required)</option>
                  <option value="crypto">Crypto Wallet (Web3 / Cold Storage)</option>
                  <option value="checking">Checking Account</option>
                  <option value="savings">Savings Vault</option>
                  <option value="credit">Credit Card</option>
                  <option value="investment">Investment / Brokerage</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  required
                  value={newAccName}
                  onChange={e => setNewAccName(e.target.value)}
                  placeholder="e.g. Physical Cash Wallet, Phantom SOL, Chase Checking"
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Starting Balance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newAccBalance}
                    onChange={e => setNewAccBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={newAccCurrency}
                    onChange={e => setNewAccCurrency(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500 cursor-pointer"
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
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  {newAccType === 'cash' ? 'Bank (Optional)' : 'Institution / Custodian'}
                </label>
                <input
                  type="text"
                  value={newAccInstitution}
                  onChange={e => setNewAccInstitution(e.target.value)}
                  placeholder={newAccType === 'cash' ? 'None (No bank)' : 'e.g. Chase, Self-Custody'}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              {newAccType === 'crypto' && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Network
                    </label>
                    <input
                      type="text"
                      value={newAccNetwork}
                      onChange={e => setNewAccNetwork(e.target.value)}
                      placeholder="e.g. Solana, Ethereum, Bitcoin"
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Public Address
                    </label>
                    <input
                      type="text"
                      value={newAccWalletAddress}
                      onChange={e => setNewAccWalletAddress(e.target.value)}
                      placeholder="0x... or solana address"
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors cursor-pointer shadow-md shadow-violet-600/20"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
