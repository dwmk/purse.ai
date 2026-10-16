import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { ConversationSession } from '../../types/finance';
import {
  Plus,
  X,
  MessageSquare,
  Trash2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Search,
  Clock,
  Sparkles
} from 'lucide-react';

export const ConversationSidebar: React.FC = () => {
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    createNewConversation,
    deleteConversation,
    isSidebarOpen,
    setIsSidebarOpen,
    setCurrentView
  } = useFinance();

  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedYears, setCollapsedYears] = useState<Record<number, boolean>>({});
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

  const toggleYear = (year: number) => {
    setCollapsedYears(prev => ({ ...prev, [year]: !prev[year] }));
  };

  const toggleMonth = (monthKey: string) => {
    setCollapsedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(c =>
      c.title.toLowerCase().includes(query) ||
      c.messages.some(m => m.content.toLowerCase().includes(query))
    );
  }, [conversations, searchQuery]);

  // Group conversations strictly by Year -> Month Name -> Date
  const groupedData = useMemo(() => {
    // Map of year -> map of monthKey -> list of conversations
    const yearMap = new Map<number, Map<string, { monthName: string; monthOrder: number; list: ConversationSession[] }>>();

    filteredConversations.forEach(conv => {
      const d = new Date(conv.createdAt);
      const validDate = isNaN(d.getTime()) ? new Date() : d;
      const year = validDate.getFullYear();
      const monthIndex = validDate.getMonth();
      const monthName = validDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

      if (!yearMap.has(year)) {
        yearMap.set(year, new Map());
      }
      const monthsInYear = yearMap.get(year)!;

      if (!monthsInYear.has(monthKey)) {
        monthsInYear.set(monthKey, {
          monthName,
          monthOrder: monthIndex,
          list: []
        });
      }

      monthsInYear.get(monthKey)!.list.push(conv);
    });

    // Sort years descending (e.g. 2026, 2025)
    const sortedYears = Array.from(yearMap.keys()).sort((a, b) => b - a);

    return sortedYears.map(year => {
      const monthsInYear = yearMap.get(year)!;
      // Sort months descending within the year
      const sortedMonths = Array.from(monthsInYear.entries())
        .sort(([keyA], [keyB]) => keyB.localeCompare(keyA))
        .map(([key, data]) => {
          // Sort conversations within the month by createdAt descending
          const sortedConvs = [...data.list].sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            return timeB - timeA;
          });
          return {
            monthKey: key,
            monthName: data.monthName,
            conversations: sortedConvs
          };
        });

      return {
        year,
        months: sortedMonths
      };
    });
  }, [filteredConversations]);

  const handleSelect = (id: string) => {
    setActiveConversationId(id);
    setCurrentView('chat');
    // On mobile screens, automatically close drawer after selection
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleNewChat = () => {
    createNewConversation();
    setCurrentView('chat');
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const formatItemDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return 'Recently';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  if (!isSidebarOpen) return null;

  return (
    <>
      {/* Backdrop overlay for mobile */}
      <div
        onClick={() => setIsSidebarOpen(false)}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 md:hidden animate-in fade-in duration-200"
      />

      {/* Slide-out Sidebar Panel */}
      <aside className="fixed top-0 left-0 bottom-0 w-80 sm:w-88 max-w-[85vw] z-50 bg-white dark:bg-[#121216] text-zinc-900 dark:text-zinc-100 border-r border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-left">
        
        {/* Top Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold text-xs shadow-sm overflow-hidden p-1.5">
              <img src="/icon.svg" alt="Purse" className="w-5 h-5 object-contain" />
            </div>
            <div>
              <h2 className="font-sans font-bold text-sm tracking-tight leading-tight">
                Conversations
              </h2>
              <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 leading-none">
                Categorized by Date &amp; Month
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close Sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Action: New Chat Button */}
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold shadow-xs tactile-btn cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>

          {/* Search Box */}
          <div className="relative mt-2.5">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search chat history..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 text-xs border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Categorized Conversation Tree */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
          {groupedData.length === 0 ? (
            <div className="py-12 text-center text-xs opacity-70">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No conversations found</p>
            </div>
          ) : (
            groupedData.map(({ year, months }) => {
              const isYearCollapsed = Boolean(collapsedYears[year]);

              return (
                <div key={year} className="space-y-2">
                  {/* Year Header (Highest Category) */}
                  <button
                    onClick={() => toggleYear(year)}
                    className="w-full flex items-center justify-between px-2 py-1 text-xs font-bold font-mono tracking-wider text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-md transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                      <span>Year {year}</span>
                    </span>
                    {isYearCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Months under this Year */}
                  {!isYearCollapsed && (
                    <div className="pl-2 space-y-3 border-l-2 border-zinc-200 dark:border-zinc-800 ml-2">
                      {months.map(({ monthKey, monthName, conversations: convList }) => {
                        const isMonthCollapsed = Boolean(collapsedMonths[monthKey]);

                        return (
                          <div key={monthKey} className="space-y-1">
                            {/* Month Header (Auto Categorized under Year) */}
                            <button
                              onClick={() => toggleMonth(monthKey)}
                              className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-md transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 opacity-75" />
                                <span>{monthName}</span>
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                {convList.length}
                              </span>
                            </button>

                            {/* Conversations in this Month */}
                            {!isMonthCollapsed && (
                              <div className="space-y-1 pt-0.5">
                                {convList.map(conv => {
                                  const isActive = conv.id === activeConversationId;
                                  const dateFormatted = formatItemDate(conv.createdAt);

                                  return (
                                    <div
                                      key={conv.id}
                                      onClick={() => handleSelect(conv.id)}
                                      className={`group relative flex items-start justify-between gap-2 p-2 rounded-xl text-xs transition-all cursor-pointer ${
                                        isActive
                                          ? 'bg-violet-600 text-white font-medium shadow-xs'
                                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300'
                                      }`}
                                    >
                                      <div className="flex items-start gap-2 min-w-0 flex-1">
                                        <MessageSquare className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isActive ? 'text-white' : 'opacity-60'}`} />
                                        <div className="min-w-0 flex-1">
                                          <p className="truncate text-xs leading-snug font-medium">
                                            {conv.title}
                                          </p>
                                          <div className={`flex items-center gap-2 text-[10px] font-mono mt-0.5 ${isActive ? 'opacity-90' : 'opacity-60'}`}>
                                            <span>{dateFormatted}</span>
                                            <span>·</span>
                                            <span>{conv.messages.length} msgs</span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Delete action */}
                                      <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          if (confirm(`Delete conversation "${conv.title}"?`)) {
                                            deleteConversation(conv.id);
                                          }
                                        }}
                                        className={`opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-opacity cursor-pointer ${
                                          isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                                        }`}
                                        title="Delete conversation"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 text-[10px] font-mono text-center text-zinc-400">
          <span>Private Local Storage · Zero Tracking</span>
        </div>

      </aside>
    </>
  );
};
