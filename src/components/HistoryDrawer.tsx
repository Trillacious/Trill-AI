import React, { useState } from 'react';
import {
  X,
  Search,
  Trash2,
  Download,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { HistoryItem, EndpointCategory } from '../types';
import { deleteHistoryItem, clearAllHistory, exportHistoryAsJSON } from '../utils/history';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onRestoreItem: (item: HistoryItem) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onRestoreItem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'text', label: 'Text & Reason' },
    { id: 'vision', label: 'Vision' },
    { id: 'voice', label: 'Voice' },
    { id: 'translate', label: 'Translate' },
    { id: 'ml', label: 'ML' },
    { id: 'education', label: 'Education' },
  ];

  const filteredHistory = history.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      item.prompt.toLowerCase().includes(query) ||
      item.output.content.toLowerCase().includes(query) ||
      item.model.toLowerCase().includes(query) ||
      item.endpoint.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearAll = () => {
    if (window.confirm('Delete all stored prompt and output history? This cannot be undone.')) {
      clearAllHistory();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md md:max-w-lg bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-500" />
              <div>
                <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                  Generation History
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {history.length} stored prompts & inferences
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => exportHistoryAsJSON(history)}
                disabled={history.length === 0}
                className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition disabled:opacity-40"
                title="Export history as JSON"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleClearAll}
                disabled={history.length === 0}
                className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition disabled:opacity-40"
                title="Clear all history"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search & Category Tabs */}
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 space-y-3 bg-neutral-50 dark:bg-neutral-900/50">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history by prompt or output..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-full whitespace-nowrap transition ${
                    selectedCategory === c.id
                      ? 'bg-neutral-900 text-white dark:bg-emerald-500 dark:text-neutral-950'
                      : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredHistory.length === 0 ? (
              <div className="py-16 text-center">
                <Sparkles className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  No history found
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  Generations and prompts will appear here automatically.
                </p>
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition shadow-xs space-y-2.5"
                >
                  {/* Top Item Meta */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 uppercase">
                        {item.endpoint}
                      </span>
                      <span className="font-mono text-neutral-400 text-[11px]">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.tokensUsed && (
                        <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400">
                          {item.tokensUsed.total} tok
                        </span>
                      )}
                      <button
                        onClick={() => deleteHistoryItem(item.id)}
                        className="text-neutral-400 hover:text-rose-500 transition p-1"
                        title="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Prompt Text */}
                  <div className="text-xs">
                    <span className="text-[11px] font-medium text-neutral-400 block mb-0.5">Prompt:</span>
                    <p className="font-medium text-neutral-900 dark:text-neutral-200 line-clamp-2 bg-neutral-50 dark:bg-neutral-900/80 p-2 rounded-lg border border-neutral-100 dark:border-neutral-800">
                      {item.prompt}
                    </p>
                  </div>

                  {/* Output Preview */}
                  <div className="text-xs">
                    <span className="text-[11px] font-medium text-neutral-400 block mb-0.5">Output:</span>
                    {item.output.type === 'image' && item.output.mediaUrl ? (
                      <div className="relative group rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 max-h-48 bg-neutral-950 flex items-center justify-center">
                        <img
                          src={item.output.mediaUrl}
                          alt="Generated output"
                          className="w-full h-auto object-contain max-h-48"
                        />
                      </div>
                    ) : item.output.type === 'audio' && item.output.mediaUrl ? (
                      <audio controls src={item.output.mediaUrl} className="w-full h-8 mt-1" />
                    ) : (
                      <pre className="text-[11px] font-mono p-2 rounded-lg bg-neutral-100 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-300 max-h-32 overflow-y-auto whitespace-pre-wrap break-words border border-neutral-200 dark:border-neutral-800">
                        {item.output.content}
                      </pre>
                    )}
                  </div>

                  {/* Bottom Action Row */}
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800/80">
                    <span className="text-[10px] font-mono text-neutral-400 truncate max-w-[180px]">
                      {item.model}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(item.id, item.output.content)}
                        className="flex items-center gap-1 text-[11px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          onRestoreItem(item);
                          onClose();
                        }}
                        className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Load Prompt</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
