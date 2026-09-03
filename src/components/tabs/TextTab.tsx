import React, { useState, useRef } from 'react';
import {
  Send,
  Sparkles,
  BrainCircuit,
  Wrench,
  Copy,
  Check,
  RotateCcw,
  StopCircle,
  Play,
  Pause,
  FastForward,
  AlertCircle,
  Clock,
  Zap,
} from 'lucide-react';
import { AppSettings, ModelOption } from '../../types';
import { AVAILABLE_MODELS } from '../../constants/models';
import { executeStreamingInference } from '../../utils/api';
import { createRealtimeStreamConsumer, RealtimeStreamQueue } from '../../utils/streaming';

interface TextTabProps {
  settings: AppSettings;
  prefillPrompt?: string;
  onPreFillUsed?: () => void;
}

export const TextTab: React.FC<TextTabProps> = ({ settings, prefillPrompt, onPreFillUsed }) => {
  const [mode, setMode] = useState<'text' | 'reason' | 'function'>('text');
  const [selectedModel, setSelectedModel] = useState<string>(settings.defaultTextModel);
  const [prompt, setPrompt] = useState<string>(prefillPrompt || '');
  const [systemPrompt, setSystemPrompt] = useState<string>(settings.systemPrompt);
  const [showSystem, setShowSystem] = useState<boolean>(false);
  const [toolsInput, setToolsInput] = useState<string>(
    JSON.stringify(
      [
        {
          name: 'get_current_weather',
          description: 'Get current weather for a given location',
          parameters: {
            type: 'object',
            properties: {
              location: { type: 'string', description: 'City and state, e.g. San Francisco, CA' },
              unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
            },
            required: ['location'],
          },
        },
      ],
      null,
      2
    )
  );

  // Streaming & Generation State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [streamedText, setStreamedText] = useState<string>('');
  const [fullOutput, setFullOutput] = useState<string>('');
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [tokensPerSec, setTokensPerSec] = useState<number>(0);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [retryInfo, setRetryInfo] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const streamConsumerRef = useRef<RealtimeStreamQueue | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync prefillPrompt if changed
  React.useEffect(() => {
    if (prefillPrompt) {
      setPrompt(prefillPrompt);
      onPreFillUsed?.();
    }
  }, [prefillPrompt]);

  const endpointPath =
    mode === 'reason'
      ? '/ai/reason'
      : mode === 'function'
      ? '/ai/function-call'
      : '/text';

  const handleSend = async () => {
    if (!prompt.trim() || isLoading) return;

    // Reset states
    setIsLoading(true);
    setIsStreaming(false);
    setIsPaused(false);
    setError(null);
    setRetryInfo(null);
    setStreamedText('');
    setFullOutput('');
    setRawResponse(null);
    setTokensPerSec(0);
    setElapsedMs(0);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const body: Record<string, any> = {
      prompt,
      model: selectedModel,
    };

    if (mode === 'text' && systemPrompt.trim()) {
      body.system = systemPrompt;
    }

    if (mode === 'function') {
      try {
        body.tools = JSON.parse(toolsInput);
      } catch (err) {
        setError('Invalid JSON in tools definition. Please review function tools schema.');
        setIsLoading(false);
        return;
      }
    }

    const consumer = createRealtimeStreamConsumer(
      settings.streamSpeed,
      (update) => {
        setStreamedText(update.text);
        setTokensPerSec(update.tokensPerSec);
        setElapsedMs(update.elapsedMs);
        if (update.isComplete) {
          setIsStreaming(false);
        }
      },
      () => {
        setIsStreaming(false);
      }
    );
    streamConsumerRef.current = consumer;

    try {
      const res = await executeStreamingInference(settings, {
        endpoint: endpointPath,
        category: 'text',
        model: selectedModel,
        promptText: prompt,
        systemPrompt: mode === 'text' ? systemPrompt : undefined,
        body: {
          ...body,
          temperature: settings.temperature,
          top_p: settings.topP,
          max_tokens: settings.maxTokens,
        },
        signal: abortController.signal,
        onStatusChange: (status) => {
          if (status === 'streaming') {
            setIsLoading(false);
            setIsStreaming(true);
          }
        },
        onToken: (delta) => {
          setIsLoading(false);
          setIsStreaming(true);
          consumer.pushDelta(delta);
        },
        onRetry: (attempt, max) => {
          setRetryInfo(`Connection interrupted. Auto-retrying (${attempt}/${max})...`);
        },
      });

      consumer.markStreamEnded();
      setRetryInfo(null);
      setIsLoading(false);
      setRawResponse(res.data.fullData || res.data);
      setFullOutput(res.data.response);
    } catch (err: any) {
      consumer.stop();
      setIsLoading(false);
      setIsStreaming(false);
      setError(err.message || 'An error occurred during inference');
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (streamConsumerRef.current) {
      streamConsumerRef.current.stop();
    }
    setIsLoading(false);
    setIsStreaming(false);
  };

  const handleTogglePause = () => {
    if (!streamConsumerRef.current) return;
    if (isPaused) {
      streamConsumerRef.current.resume();
      setIsPaused(false);
    } else {
      streamConsumerRef.current.pause();
      setIsPaused(true);
    }
  };

  const handleFinishNow = () => {
    if (streamConsumerRef.current) {
      streamConsumerRef.current.finishNow();
      setIsStreaming(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = streamedText || fullOutput;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyFallback = () => {
    setSelectedModel('@cf/meta/llama-3.1-8b-instruct-fast');
    setError(null);
  };

  const samplePrompts = [
    {
      title: 'Quantum Computing Explanation',
      prompt: 'Explain quantum superposition to a high schooler using the coin flip analogy.',
      m: 'text',
    },
    {
      title: 'Logic Puzzle (Reasoning)',
      prompt: 'Three boxes are labeled "Apples", "Oranges", and "Both". Every box is incorrectly labeled. You pick one fruit from one box without looking inside. How do you correctly label all three?',
      m: 'reason',
    },
    {
      title: 'Function Tool Schema',
      prompt: 'Find the weather forecast for Seattle, WA for the next 3 days.',
      m: 'function',
    },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Mode Selector and Model Options */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800">
          <button
            onClick={() => setMode('text')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              mode === 'text'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>Text Generation</span>
            <span className="font-mono text-[10px] text-neutral-400">/text</span>
          </button>

          <button
            onClick={() => setMode('reason')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              mode === 'reason'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5 text-purple-500" />
            <span>Deep Reasoning</span>
            <span className="font-mono text-[10px] text-neutral-400">/ai/reason</span>
          </button>

          <button
            onClick={() => setMode('function')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              mode === 'function'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-cyan-500" />
            <span>Function Calling</span>
            <span className="font-mono text-[10px] text-neutral-400">/ai/function-call</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 whitespace-nowrap">Model:</span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
          >
            <option value="@cf/meta/llama-3.1-8b-instruct-fast">Llama 3.1 8B Fast (Recommended)</option>
            <option value="@cf/meta/llama-3.3-70b-instruct-fp8-fast">Llama 3.3 70B Fast</option>
            <option value="@cf/deepseek/deepseek-r1-distill-qwen-32b">DeepSeek R1 Distill 32B</option>
            <option value="@cf/openai/gpt-oss-20b">GPT-OSS 20B</option>
            <option value="@cf/nvidia/nemotron-3-120b-a12b">NVIDIA Nemotron 3 120B</option>
            <option value="@cf/ibm/granite-4.0-h-micro">IBM Granite 4.0 Micro</option>
          </select>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider whitespace-nowrap">
          Quick Inferences:
        </span>
        {samplePrompts.map((s, idx) => (
          <button
            key={idx}
            onClick={() => {
              setPrompt(s.prompt);
              setMode(s.m as any);
            }}
            className="px-2.5 py-1 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition whitespace-nowrap"
          >
            {s.title}
          </button>
        ))}
      </div>

      {/* Input Section */}
      <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
        {mode === 'text' && (
          <div>
            <button
              onClick={() => setShowSystem(!showSystem)}
              className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center gap-1 font-medium mb-1"
            >
              {showSystem ? 'Hide System Prompt' : '+ Add Custom System Prompt'}
            </button>
            {showSystem && (
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Optional system guidance..."
                rows={2}
                className="w-full p-2.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
              />
            )}
          </div>
        )}

        {mode === 'function' && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 block">
              JSON Tools Definition (Array):
            </span>
            <textarea
              rows={3}
              value={toolsInput}
              onChange={(e) => setToolsInput(e.target.value)}
              className="w-full p-2 font-mono text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 text-neutral-800 dark:text-neutral-200 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        )}

        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSend();
              }
            }}
            placeholder={
              mode === 'reason'
                ? 'Enter a complex reasoning question, logic puzzle, math problem...'
                : mode === 'function'
                ? 'Enter a prompt that requires calling the defined tools...'
                : 'Enter prompt (e.g. write an article, write code, explain concept)...'
            }
            rows={3}
            className="w-full p-3 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
            <div className="flex items-center gap-3 text-xs text-neutral-400">
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-mono text-[10px]">Ctrl+Enter</kbd></span>
              {retryInfo && (
                <span className="text-amber-500 font-medium animate-pulse flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {retryInfo}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isLoading || isStreaming ? (
                <button
                  onClick={handleStop}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition"
                >
                  <StopCircle className="w-4 h-4" />
                  <span>Stop</span>
                </button>
              ) : null}

              <button
                onClick={handleSend}
                disabled={isLoading || !prompt.trim()}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-neutral-950 disabled:opacity-50 transition shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>Process Inference</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error / Interruption Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Inference Interrupted</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pl-6">
            <button
              onClick={handleSend}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition"
            >
              Retry Request
            </button>
            {error.includes('5007') && (
              <button
                onClick={handleApplyFallback}
                className="px-3 py-1 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 rounded-lg font-medium hover:bg-neutral-100 transition"
              >
                Switch to Llama 3.1 8B (Online)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Output Stream Card */}
      {(streamedText || fullOutput || isLoading) && (
        <div className="rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          {/* Stream Status Bar */}
          <div className="px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                Streamed Output
              </span>

              {isStreaming ? (
                <span className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Streaming {tokensPerSec} tok/s
                </span>
              ) : isLoading ? (
                <span className="flex items-center gap-1.5 text-[11px] text-amber-500">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Worker running inference...
                </span>
              ) : (
                <span className="text-[11px] text-neutral-400 font-mono">
                  Finished in {elapsedMs}ms
                </span>
              )}
            </div>

            {/* Stream Player Controls */}
            <div className="flex items-center gap-1.5">
              {isStreaming && (
                <>
                  <button
                    onClick={handleTogglePause}
                    className="p-1 rounded text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition"
                    title={isPaused ? 'Resume Stream' : 'Pause Stream'}
                  >
                    {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleFinishNow}
                    className="p-1 rounded text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition"
                    title="Skip typing animation"
                  >
                    <FastForward className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Stream Text Body */}
          <div className="p-5 text-sm text-neutral-900 dark:text-neutral-100 font-sans leading-relaxed whitespace-pre-wrap selection:bg-emerald-500/30 min-h-[140px]">
            {isLoading && !streamedText ? (
              <div className="flex items-center gap-2 text-neutral-400 py-6">
                <Zap className="w-4 h-4 text-emerald-500 animate-bounce" />
                <span>Generating tokens from worker endpoint...</span>
              </div>
            ) : (
              <>
                {streamedText || fullOutput}
                {isStreaming && (
                  <span className="inline-block w-2 h-4 ml-0.5 bg-emerald-500 animate-pulse align-middle" />
                )}
              </>
            )}
          </div>

          {/* Raw Metrics Footer */}
          {rawResponse?.response?.usage && (
            <div className="px-5 py-2.5 bg-neutral-50/70 dark:bg-neutral-950/40 border-t border-neutral-100 dark:border-neutral-800/80 flex flex-wrap items-center justify-between text-xs text-neutral-500 font-mono">
              <div className="flex items-center gap-4">
                <span>Prompt: {rawResponse.response.usage.prompt_tokens}</span>
                <span>Completion: {rawResponse.response.usage.completion_tokens}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Total: {rawResponse.response.usage.total_tokens} tokens
                </span>
                {rawResponse.response.usage.neurons && (
                  <span>Neurons: {rawResponse.response.usage.neurons.toFixed(3)}</span>
                )}
              </div>
              <span>Model: {rawResponse.response.model || selectedModel}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
