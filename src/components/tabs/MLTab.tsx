import React, { useState } from 'react';
import {
  Cpu,
  Sparkles,
  BarChart3,
  Network,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';
import { AppSettings } from '../../types';
import { executeInference } from '../../utils/api';

interface MLTabProps {
  settings: AppSettings;
}

export const MLTab: React.FC<MLTabProps> = ({ settings }) => {
  const [subTab, setSubTab] = useState<'classify' | 'embed'>('classify');

  // Classification State
  const [classifyText, setClassifyText] = useState(
    'Tesla reported record Q4 vehicle deliveries and revenue growth despite supply chain headwinds in foreign markets.'
  );
  const [labels, setLabels] = useState<string[]>(['Technology', 'Automotive', 'Finance', 'Healthcare', 'Politics']);
  const [newLabelInput, setNewLabelInput] = useState('');
  const [classificationResult, setClassificationResult] = useState<any>(null);

  // Embedding State
  const [embedText, setEmbedText] = useState('Artificial intelligence systems for real-time edge processing and neural inference');
  const [embeddingResult, setEmbeddingResult] = useState<number[] | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleAddLabel = () => {
    if (!newLabelInput.trim() || labels.includes(newLabelInput.trim())) return;
    setLabels([...labels, newLabelInput.trim()]);
    setNewLabelInput('');
  };

  const handleRemoveLabel = (index: number) => {
    setLabels(labels.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    setIsLoading(true);
    setError(null);
    setClassificationResult(null);
    setEmbeddingResult(null);

    try {
      if (subTab === 'classify') {
        const res = await executeInference(settings, {
          endpoint: '/ml/classify',
          category: 'ml',
          promptText: `Classify: ${classifyText.slice(0, 80)}... into [${labels.join(', ')}]`,
          body: {
            text: classifyText,
            labels,
          },
        });

        setClassificationResult(res.data);
      } else {
        const res = await executeInference(settings, {
          endpoint: '/ml/embed',
          category: 'ml',
          promptText: `Embedding: ${embedText.slice(0, 80)}...`,
          body: {
            text: embedText,
          },
        });

        // The worker returns embedding vectors
        if (Array.isArray(res.data)) {
          setEmbeddingResult(res.data);
        } else if (res.data?.data?.[0]?.embedding) {
          setEmbeddingResult(res.data.data[0].embedding);
        } else if (res.data?.embedding) {
          setEmbeddingResult(res.data.embedding);
        } else {
          setClassificationResult(res.data);
        }
      }
    } catch (err: any) {
      setError(err.message || 'ML Inference failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyVectors = () => {
    if (!embeddingResult) return;
    navigator.clipboard.writeText(JSON.stringify(embeddingResult));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Sub Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => setSubTab('classify')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            subTab === 'classify'
              ? 'bg-neutral-900 text-white dark:bg-emerald-500 dark:text-neutral-950 font-semibold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Zero-Shot Classification</span>
          <span className="font-mono text-[10px] opacity-70">/ml/classify</span>
        </button>

        <button
          onClick={() => setSubTab('embed')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            subTab === 'embed'
              ? 'bg-neutral-900 text-white dark:bg-emerald-500 dark:text-neutral-950 font-semibold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Vector Embeddings</span>
          <span className="font-mono text-[10px] opacity-70">/ml/embed</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            {subTab === 'classify' ? (
              <>
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Text to Classify:
                  </label>
                  <textarea
                    rows={4}
                    value={classifyText}
                    onChange={(e) => setClassifyText(e.target.value)}
                    placeholder="Enter document, article, or review to classify..."
                    className="w-full p-3 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">
                    Candidate Classification Labels:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {labels.map((lbl, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700"
                      >
                        {lbl}
                        <button
                          onClick={() => handleRemoveLabel(idx)}
                          className="hover:text-rose-500 transition ml-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newLabelInput}
                      onChange={(e) => setNewLabelInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddLabel()}
                      placeholder="Add another label..."
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    />
                    <button
                      onClick={handleAddLabel}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Text to Generate Dense Vector Embeddings:
                </label>
                <textarea
                  rows={5}
                  value={embedText}
                  onChange={(e) => setEmbedText(e.target.value)}
                  placeholder="Enter text to generate BAAI/bge-base-en embeddings..."
                  className="w-full p-3 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Generates dense 768-dimensional or 1024-dimensional floating point representation vectors for semantic search, clustering, and retrieval.
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Inference Error</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleProcess}
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl font-semibold text-xs bg-emerald-500 hover:bg-emerald-600 text-neutral-950 flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Computing neural tensors...</span>
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4" />
                  <span>Execute ML Inference</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Output Column */}
        <div className="lg:col-span-5">
          <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-center min-h-[380px]">
            {isLoading ? (
              <div className="text-center py-16 space-y-3">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                <p className="text-xs text-neutral-400">Processing ML tensors on Cloudflare Worker...</p>
              </div>
            ) : classificationResult ? (
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-emerald-500" />
                  Classification Results:
                </h4>

                {Array.isArray(classificationResult) ? (
                  <div className="space-y-2">
                    {classificationResult.map((res: any, idx: number) => {
                      const label = res.label || res.name || `Class ${idx}`;
                      const score = res.score !== undefined ? res.score : res.confidence || 0;
                      const percent = Math.round(score * 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-neutral-800 dark:text-neutral-200">{label}</span>
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                              {percent}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <pre className="p-3 rounded-lg bg-neutral-100 dark:bg-neutral-950 font-mono text-xs max-h-[300px] overflow-y-auto text-neutral-800 dark:text-neutral-200">
                    {JSON.stringify(classificationResult, null, 2)}
                  </pre>
                )}
              </div>
            ) : embeddingResult ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Network className="w-4 h-4 text-emerald-500" />
                    Embedding Vector ({embeddingResult.length} dimensions):
                  </span>
                  <button
                    onClick={handleCopyVectors}
                    className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy Array'}</span>
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-neutral-950 text-emerald-400 font-mono text-[11px] max-h-[280px] overflow-y-auto leading-tight space-y-1 break-all">
                  [{embeddingResult.map((val) => val.toFixed(5)).join(', ')}]
                </div>

                <p className="text-[11px] text-neutral-400">
                  Vector ready for cosine similarity matching, Pinecone, or vector indexes.
                </p>
              </div>
            ) : (
              <div className="text-center py-16 text-neutral-400 space-y-2">
                <Cpu className="w-10 h-10 mx-auto opacity-40" />
                <p className="text-xs font-medium">ML Inference Output</p>
                <p className="text-[11px] text-neutral-400">
                  Select classification or embeddings and execute inference.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
