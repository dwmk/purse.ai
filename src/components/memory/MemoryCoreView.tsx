import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import {
  Brain,
  Download,
  Save,
  ShieldCheck,
  FileCode,
  Sparkles,
  Edit2
} from 'lucide-react';

export const MemoryCoreView: React.FC = () => {
  const { memory, updateMemory, showNotification } = useFinance();
  const [markdownContent, setMarkdownContent] = useState(memory.rawMarkdown);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    updateMemory({
      ...memory,
      rawMarkdown: markdownContent,
      lastUpdated: new Date().toISOString(),
      revisionCount: memory.revisionCount + 1
    });
    setIsEditing(false);
  };

  const handleDownloadMd = () => {
    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `purse_memory_v${memory.revisionCount}_${new Date().toISOString().split('T')[0]}.md`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('success', 'Exported Agent Memory File (.md).');
  };

  return (
    <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80 dark:border-neutral-800/80">
        <div>
          <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
            Persistent Knowledge Graph
          </span>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Memory Core
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadMd}
            className="p-2 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-xl transition-colors cursor-pointer"
            title="Download .md file"
          >
            <Download className="w-4 h-4" />
          </button>
          {isEditing ? (
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 text-xs font-mono font-semibold transition-all cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit File</span>
            </button>
          )}
        </div>
      </div>

      {/* Explainer Pill */}
      <div className="p-3.5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl shadow-xs font-mono text-xs space-y-1">
        <div className="flex items-center justify-between text-neutral-900 dark:text-white font-bold">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <Brain className="w-3.5 h-3.5" />
            <span>Agent Long-Term Memory File</span>
          </span>
          <span className="text-[11px] text-neutral-400">Rev #{memory.revisionCount}</span>
        </div>
        <p className="text-neutral-500 font-sans text-xs">
          The LLM reads this file on every prompt to respect your income cycle, checking floors, and spending rules.
        </p>
      </div>

      {/* Active Rules Card */}
      <div className="p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl shadow-xs space-y-2.5 font-mono text-xs">
        <span className="font-bold text-neutral-900 dark:text-white block pb-1 border-b border-neutral-100 dark:border-neutral-800">
          Active Operating Invariants
        </span>
        <div className="space-y-1.5">
          {memory.rules.map((rule, idx) => (
            <div key={idx} className="p-2.5 bg-neutral-50 dark:bg-neutral-950/70 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 text-neutral-800 dark:text-neutral-200 text-xs leading-relaxed">
              <span className="text-emerald-500 font-bold mr-1">R-0{idx + 1}:</span>
              {rule}
            </div>
          ))}
        </div>
      </div>

      {/* Raw Markdown Editor */}
      <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-950 text-neutral-100 overflow-hidden shadow-md flex flex-col h-96">
        <div className="px-4 py-2 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-1.5 text-neutral-300">
            <FileCode className="w-3.5 h-3.5" />
            <span>purse_agent_memory.md</span>
          </div>
          <span className="text-[10px] text-neutral-400">
            {isEditing ? 'EDITING' : 'READ-ONLY'}
          </span>
        </div>

        <div className="flex-1 p-3.5 overflow-y-auto font-mono text-xs">
          {isEditing ? (
            <textarea
              value={markdownContent}
              onChange={e => setMarkdownContent(e.target.value)}
              className="w-full h-full bg-transparent text-emerald-400 font-mono text-xs leading-relaxed focus:outline-none resize-none"
            />
          ) : (
            <pre className="text-neutral-300 whitespace-pre-wrap leading-relaxed">
              {memory.rawMarkdown}
            </pre>
          )}
        </div>
      </div>

    </div>
  );
};
