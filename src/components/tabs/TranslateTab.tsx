import React, { useState } from 'react';
import {
  Languages,
  ArrowRightLeft,
  Copy,
  Check,
  Volume2,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { AppSettings } from '../../types';
import { POPULAR_LANGUAGES } from '../../constants/models';
import { executeInference } from '../../utils/api';
import { streamTextAnimation } from '../../utils/streaming';

interface TranslateTabProps {
  settings: AppSettings;
}

export const TranslateTab: React.FC<TranslateTabProps> = ({ settings }) => {
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const [inputText, setInputText] = useState('Hello! Welcome to Trill AI. Explore advanced multi-modal artificial intelligence.');
  const [translatedText, setTranslatedText] = useState('');
  const [streamedText, setStreamedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSwap = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    if (translatedText) {
      setInputText(translatedText);
      setTranslatedText('');
      setStreamedText('');
    }
  };

  const handleTranslate = async () => {
    if (!inputText.trim() || isLoading) return;

    setIsLoading(true);
    setIsStreaming(false);
    setError(null);
    setTranslatedText('');
    setStreamedText('');

    try {
      const res = await executeInference(settings, {
        endpoint: '/translate',
        category: 'translate',
        promptText: `Translate (${sourceLang} -> ${targetLang}): ${inputText}`,
        body: {
          text: inputText,
          source_lang: sourceLang,
          target_lang: targetLang,
        },
      });

      const output = res.data?.translation || (typeof res.data === 'string' ? res.data : JSON.stringify(res.data));
      setTranslatedText(output);
      setIsStreaming(true);

      streamTextAnimation(
        output,
        settings.streamSpeed,
        (u) => {
          setStreamedText(u.text);
          if (u.isComplete) setIsStreaming(false);
        },
        () => setIsStreaming(false)
      );
    } catch (err: any) {
      setError(err.message || 'Translation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    const txt = streamedText || translatedText;
    if (!txt) return;
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Languages className="w-5 h-5 text-emerald-500" />
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Multilingual Neural Translation
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Direct language translation via Meta M2M-100 & AI4Bharat IndicTrans2 (<code className="font-mono text-[11px]">POST /translate</code>)
            </p>
          </div>
        </div>

        {/* Language Selectors */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
          >
            {POPULAR_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleSwap}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            title="Swap source and target languages"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>

          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
          >
            {POPULAR_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Translation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source Text Input */}
        <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              Source Text:
            </span>
            <textarea
              rows={7}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text to translate..."
              className="w-full p-3 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-neutral-400">{inputText.length} characters</span>
            <button
              onClick={handleTranslate}
              disabled={isLoading || !inputText.trim()}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-neutral-950 flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Translating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Translate</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Translated Output */}
        <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                Translation:
              </span>
              {(streamedText || translatedText) && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>

            <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/80 min-h-[160px] text-sm text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap leading-relaxed border border-neutral-200 dark:border-neutral-700">
              {isLoading ? (
                <div className="text-neutral-400 flex items-center gap-2 py-8">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                  <span>Connecting to neural translation worker...</span>
                </div>
              ) : streamedText || translatedText ? (
                <>
                  {streamedText || translatedText}
                  {isStreaming && <span className="inline-block w-2 h-4 bg-emerald-500 animate-pulse ml-1" />}
                </>
              ) : (
                <span className="text-neutral-400 text-xs italic">
                  Translated output will stream here.
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
