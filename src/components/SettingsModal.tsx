import React, { useState } from 'react';
import {
  X,
  Sliders,
  RotateCcw,
  Globe,
  Zap,
  Cpu,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Video,
  Mic,
  Languages,
  BookOpen,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { AppSettings } from '../types';
import { AVAILABLE_MODELS } from '../constants/models';
import {
  DEFAULT_APP_SETTINGS,
  MODEL_PARAMETER_CATALOG,
  ParameterMeta,
} from '../constants/parameters';
import { pingWorker } from '../utils/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onResetSettings: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetSettings,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pingStatus, setPingStatus] = useState<{
    testing: boolean;
    ok?: boolean;
    latency?: number;
    error?: string;
  }>({ testing: false });

  if (!isOpen) return null;

  const handleChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onUpdateSettings({
      ...settings,
      [key]: value,
    });
  };

  const handleResetSingle = (key: keyof AppSettings) => {
    onUpdateSettings({
      ...settings,
      [key]: DEFAULT_APP_SETTINGS[key],
    });
  };

  const handleTestConnection = async () => {
    setPingStatus({ testing: true });
    const res = await pingWorker(settings.baseUrl);
    setPingStatus({
      testing: false,
      ok: res.ok,
      latency: res.latencyMs,
      error: res.error,
    });
  };

  const categories = [
    { id: 'all', label: 'All Parameters', icon: SlidersHorizontal },
    { id: 'text', label: 'Text & Reasoning', icon: Zap },
    { id: 'vision', label: 'Vision & Image', icon: Eye },
    { id: 'video', label: 'Video Dynamics', icon: Video },
    { id: 'voice', label: 'Voice & Speech', icon: Mic },
    { id: 'translate', label: 'Translation & ML', icon: Languages },
    { id: 'resilience', label: 'Gateway & Resilience', icon: RefreshCw },
  ];

  const filteredParams = MODEL_PARAMETER_CATALOG.filter((p) => {
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchesSearch =
      searchQuery === '' ||
      p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.effect.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const textModels = AVAILABLE_MODELS.filter((m) => m.category === 'text' || m.category === 'reason');
  const imageModels = AVAILABLE_MODELS.filter((m) => m.category === 'image');
  const voiceModels = AVAILABLE_MODELS.filter((m) => m.category === 'voice' || m.category === 'tts');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4 bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Model Parameters & Inference Configuration
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  Worker v5.0
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Configure all model parameters exposed by the Cloudflare Workers AI endpoints at{' '}
                <span className="font-mono text-neutral-700 dark:text-neutral-300">
                  {settings.baseUrl}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter Navigation Bar */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/30 dark:bg-neutral-900/30 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search parameters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Gateway Endpoint Ping Status Card */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-emerald-500" />
              <div>
                <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                  Active Worker Base URL
                </span>
                <p className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                  {settings.baseUrl}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {pingStatus.latency !== undefined && (
                <span
                  className={`text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 ${
                    pingStatus.ok
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {pingStatus.ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                  {pingStatus.ok ? `Online (${pingStatus.latency}ms)` : 'Unreachable'}
                </span>
              )}
              <button
                onClick={handleTestConnection}
                disabled={pingStatus.testing}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${pingStatus.testing ? 'animate-spin' : ''}`} />
                {pingStatus.testing ? 'Testing...' : 'Test Gateway Ping'}
              </button>
            </div>
          </div>

          {/* Default Model Mappings Section */}
          {(activeCategory === 'all' || activeCategory === 'text' || activeCategory === 'vision' || activeCategory === 'voice') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-emerald-500" />
                  Default Model Routing
                </label>
                <span className="text-[11px] text-neutral-400">
                  Target Cloudflare AI models for each modality
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Default Text Model */}
                {(activeCategory === 'all' || activeCategory === 'text') && (
                  <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                        Default Text Model
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-500 font-mono">
                        POST /text
                      </span>
                    </div>
                    <select
                      value={settings.defaultTextModel}
                      onChange={(e) => handleChange('defaultTextModel', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:ring-1 focus:ring-emerald-500"
                    >
                      {textModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.speed})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-neutral-400">
                      Default: <span className="font-mono text-emerald-600 dark:text-emerald-400">Llama 3.1 8B Fast</span>
                    </p>
                  </div>
                )}

                {/* Default Image Model */}
                {(activeCategory === 'all' || activeCategory === 'vision') && (
                  <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                        Default Image Model
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-500 font-mono">
                        POST /image/generate
                      </span>
                    </div>
                    <select
                      value={settings.defaultImageModel}
                      onChange={(e) => handleChange('defaultImageModel', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:ring-1 focus:ring-emerald-500"
                    >
                      {imageModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.speed})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-neutral-400">
                      Default: <span className="font-mono text-emerald-600 dark:text-emerald-400">FLUX.2 Klein 4B</span>
                    </p>
                  </div>
                )}

                {/* Default Voice Model */}
                {(activeCategory === 'all' || activeCategory === 'voice') && (
                  <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                        Default Voice Model
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-500 font-mono">
                        POST /voice/speak
                      </span>
                    </div>
                    <select
                      value={settings.defaultVoiceModel}
                      onChange={(e) => handleChange('defaultVoiceModel', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:ring-1 focus:ring-emerald-500"
                    >
                      {voiceModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-neutral-400">
                      Default: <span className="font-mono text-emerald-600 dark:text-emerald-400">Deepgram Aura 2 EN</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Configurable Endpoint Parameters List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500" />
                Endpoint Parameters Catalog ({filteredParams.length})
              </label>
              <span className="text-[11px] text-neutral-400">
                Adjust hyperparameters, generation limits, and runtime effects
              </span>
            </div>

            {filteredParams.length === 0 ? (
              <div className="py-8 text-center text-neutral-400 text-xs">
                No parameters match the filter "{searchQuery}".
              </div>
            ) : (
              <div className="space-y-4">
                {filteredParams.map((param) => {
                  const currentValue = settings[param.key];
                  const isModified = currentValue !== param.defaultValue;

                  return (
                    <div
                      key={param.key}
                      className={`p-4 rounded-xl border transition-all ${
                        isModified
                          ? 'border-emerald-500/40 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.03]'
                          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/40'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                              {param.label}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                              {param.endpoint}
                            </span>
                            {isModified && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                Customized
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                            {param.description}
                          </p>
                        </div>

                        {/* Reset button per parameter */}
                        {isModified && (
                          <button
                            onClick={() => handleResetSingle(param.key)}
                            className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
                            title="Reset to default value"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Reset ({String(param.defaultValue)})
                          </button>
                        )}
                      </div>

                      {/* Control Input */}
                      <div className="mt-3">
                        {param.type === 'slider' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-neutral-400">
                                Range: {param.min} - {param.max} {param.unit}
                              </span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                                {String(currentValue)} {param.unit}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={param.min}
                              max={param.max}
                              step={param.step}
                              value={Number(currentValue)}
                              onChange={(e) =>
                                handleChange(
                                  param.key,
                                  param.step && param.step < 1
                                    ? parseFloat(e.target.value)
                                    : parseInt(e.target.value, 10)
                                )
                              }
                              className="w-full accent-emerald-500 cursor-pointer"
                            />
                          </div>
                        )}

                        {param.type === 'select' && (
                          <select
                            value={String(currentValue)}
                            onChange={(e) => {
                              const val =
                                typeof param.defaultValue === 'number'
                                  ? parseInt(e.target.value, 10)
                                  : e.target.value;
                              handleChange(param.key, val as any);
                            }}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:ring-1 focus:ring-emerald-500"
                          >
                            {param.options?.map((opt) => (
                              <option key={String(opt.value)} value={String(opt.value)}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}

                        {param.type === 'boolean' && (
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(currentValue)}
                              onChange={(e) => handleChange(param.key, e.target.checked as any)}
                              className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-emerald-600 focus:ring-emerald-500 accent-emerald-500"
                            />
                            <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                              Enabled ({Boolean(currentValue) ? 'Active' : 'Disabled'})
                            </span>
                          </label>
                        )}

                        {param.type === 'string' && (
                          <input
                            type="text"
                            value={String(currentValue)}
                            onChange={(e) => handleChange(param.key, e.target.value as any)}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:ring-1 focus:ring-emerald-500"
                          />
                        )}
                      </div>

                      {/* Effect & Default Explanatory Footer */}
                      <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] gap-1">
                        <div className="text-neutral-500 dark:text-neutral-400">
                          <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                            Effect:{' '}
                          </span>
                          {param.effect}
                        </div>
                        <div className="shrink-0 font-mono text-neutral-400 text-[10px]">
                          Default:{' '}
                          <span className="text-neutral-600 dark:text-neutral-300">
                            {String(param.defaultValue)} {param.unit || ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/80 flex items-center justify-between gap-3">
          <button
            onClick={onResetSettings}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-800 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All to Worker Defaults
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-neutral-900 text-white dark:bg-emerald-500 dark:text-neutral-950 hover:opacity-90 transition shadow-sm"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
