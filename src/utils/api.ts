import { AppSettings, EndpointCategory, HistoryItem } from '../types';
import { recordTokenUsage } from './metrics';
import { saveHistoryItem } from './history';
import { DEFAULT_WORKER_URL } from '../constants/models';
import { parseStreamChunk } from './streaming';

export interface RequestOptions {
  endpoint: string;
  category: EndpointCategory;
  method?: 'GET' | 'POST';
  body?: any;
  isFormData?: boolean;
  model?: string;
  promptText?: string;
  systemPrompt?: string;
  onRetry?: (attempt: number, maxAttempts: number, error: Error) => void;
  signal?: AbortSignal;
}

export interface StreamingRequestOptions extends RequestOptions {
  onToken?: (delta: string, accumulated: string) => void;
  onStatusChange?: (status: 'connecting' | 'streaming' | 'completed' | 'error') => void;
}

export interface ApiResponse<T = any> {
  data: T;
  rawResponse?: Response;
  status: number;
  latencyMs: number;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
    neurons: number;
  };
}

export async function pingWorker(baseUrl: string = DEFAULT_WORKER_URL): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${baseUrl}/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - start);
    if (res.ok) {
      return { ok: true, latencyMs };
    }
    return { ok: false, latencyMs, error: `HTTP ${res.status}: ${res.statusText}` };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return { ok: false, latencyMs, error: err.message || 'Worker unreachable' };
  }
}

export async function executeInference<T = any>(
  settings: AppSettings,
  options: RequestOptions
): Promise<ApiResponse<T>> {
  const {
    endpoint,
    category,
    method = 'POST',
    body,
    isFormData = false,
    model = '',
    promptText = '',
    systemPrompt = '',
    onRetry,
    signal,
  } = options;

  const baseUrl = settings.baseUrl || DEFAULT_WORKER_URL;
  const url = `${baseUrl.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const maxRetries = settings.autoRetryAttempts ?? 2;
  const timeoutMs = (settings.timeoutSeconds || 45) * 1000;

  let lastError: Error | null = null;
  const overallStart = performance.now();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check client network status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const offlineError = new Error('You appear to be offline. Please check your internet connection.');
      recordTokenUsage({
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        neurons: 0,
        latencyMs: Math.round(performance.now() - overallStart),
        model: model || 'none',
        endpoint,
        success: false,
      });
      throw offlineError;
    }

    const attemptStart = performance.now();
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      timeoutController.abort(new Error(`Request timed out after ${settings.timeoutSeconds || 45} seconds`));
    }, timeoutMs);

    // Combine caller signal and timeout signal
    let mergedSignal = timeoutController.signal;
    if (signal) {
      const compositeAbort = () => timeoutController.abort();
      signal.addEventListener('abort', compositeAbort, { once: true });
    }

    try {
      const headers: Record<string, string> = {};
      let requestBody: any = undefined;

      if (method === 'POST') {
        if (isFormData) {
          // Let fetch set multipart boundaries automatically
          requestBody = body;
        } else {
          headers['Content-Type'] = 'application/json';
          requestBody = JSON.stringify(body || {});
        }
      }

      const response = await fetch(url, {
        method,
        headers,
        body: requestBody,
        signal: mergedSignal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - attemptStart);

      // Check for non-2xx status
      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: await response.text() };
        }

        const rawErrorMessage = errorData?.error || errorData?.message || `Inference error: HTTP ${response.status}`;
        
        // Detailed advice for common worker issues
        let enhancedMessage = rawErrorMessage;
        if (typeof rawErrorMessage === 'string' && rawErrorMessage.includes('5007')) {
          enhancedMessage = `${rawErrorMessage} — Hint: This specific model ID might be offline in the worker. Switch to @cf/meta/llama-3.1-8b-instruct-fast in Settings or the Model selector!`;
        }

        const serverError = new Error(enhancedMessage);
        (serverError as any).status = response.status;
        (serverError as any).response = errorData;

        // If it's a 500 error or rate limit, retry if we have attempts left
        if ((response.status >= 500 || response.status === 429) && attempt < maxRetries) {
          lastError = serverError;
          onRetry?.(attempt + 1, maxRetries, serverError);
          await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, attempt)));
          continue;
        }

        // Record failed token entry
        recordTokenUsage({
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          neurons: 0,
          latencyMs,
          model: model || 'none',
          endpoint,
          success: false,
        });

        throw serverError;
      }

      // Check response content-type
      const contentType = response.headers.get('content-type') || '';
      let parsedData: any;

      if (contentType.includes('image/') || contentType.includes('audio/') || contentType.includes('video/')) {
        // Media blob response
        const blob = await response.blob();
        parsedData = blob;
      } else {
        parsedData = await response.json();
      }

      // Extract usage if available
      let promptTokens = 0;
      let completionTokens = 0;
      let totalTokens = 0;
      let neurons = 0;

      if (parsedData?.response?.usage) {
        const u = parsedData.response.usage;
        promptTokens = u.prompt_tokens || 0;
        completionTokens = u.completion_tokens || 0;
        totalTokens = u.total_tokens || promptTokens + completionTokens;
        neurons = u.neurons || 0;
      } else if (parsedData?.usage) {
        const u = parsedData.usage;
        promptTokens = u.prompt_tokens || 0;
        completionTokens = u.completion_tokens || 0;
        totalTokens = u.total_tokens || promptTokens + completionTokens;
        neurons = u.neurons || 0;
      } else if (promptText) {
        // Approximate token estimate if not provided (approx 4 chars per token)
        promptTokens = Math.max(1, Math.round(promptText.length / 4));
        const outputStr = typeof parsedData === 'string' ? parsedData : JSON.stringify(parsedData);
        completionTokens = Math.max(1, Math.round(outputStr.length / 4));
        totalTokens = promptTokens + completionTokens;
        neurons = parseFloat((totalTokens * 0.008).toFixed(4));
      }

      // Record successful token metric
      recordTokenUsage({
        promptTokens,
        completionTokens,
        totalTokens,
        neurons,
        latencyMs,
        model: model || parsedData?.model || 'default',
        endpoint,
        success: true,
      });

      // Optionally auto save history
      if (settings.autoSaveHistory) {
        let outputType: HistoryItem['output']['type'] = 'text';
        let content = '';
        let mediaUrl: string | undefined = undefined;

        if (parsedData instanceof Blob) {
          if (parsedData.type.startsWith('image/')) {
            outputType = 'image';
            mediaUrl = URL.createObjectURL(parsedData);
            content = `[Generated Image: ${parsedData.type}, ${(parsedData.size / 1024).toFixed(1)} KB]`;
          } else if (parsedData.type.startsWith('audio/')) {
            outputType = 'audio';
            mediaUrl = URL.createObjectURL(parsedData);
            content = `[Synthesized Audio: ${(parsedData.size / 1024).toFixed(1)} KB]`;
          } else {
            outputType = 'video';
            mediaUrl = URL.createObjectURL(parsedData);
            content = `[Generated Media: ${(parsedData.size / 1024).toFixed(1)} KB]`;
          }
        } else if (parsedData?.response?.response) {
          content = parsedData.response.response;
        } else if (parsedData?.response?.choices?.[0]?.message?.content) {
          content = parsedData.response.choices[0].message.content;
        } else if (parsedData?.translation) {
          content = parsedData.translation;
        } else if (parsedData?.verified_answer) {
          content = parsedData.verified_answer;
        } else {
          outputType = 'json';
          content = JSON.stringify(parsedData, null, 2);
        }

        saveHistoryItem({
          endpoint,
          category,
          model: model || parsedData?.model || 'default',
          prompt: promptText || endpoint,
          system: systemPrompt,
          output: {
            type: outputType,
            content,
            mediaUrl,
            extra: parsedData,
          },
          tokensUsed: {
            prompt: promptTokens,
            completion: completionTokens,
            total: totalTokens,
            neurons,
          },
          latencyMs,
          status: 'success',
          parameters: body,
        });
      }

      return {
        data: parsedData,
        rawResponse: response,
        status: response.status,
        latencyMs,
        tokens: {
          prompt: promptTokens,
          completion: completionTokens,
          total: totalTokens,
          neurons,
        },
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;

      // Check if aborted by user
      if (signal?.aborted) {
        throw new Error('Inference canceled by user');
      }

      // Network failures (e.g. Failed to fetch, DNS drop, timeout)
      const isNetworkDrop =
        err.name === 'AbortError' ||
        err.message?.includes('fetch') ||
        err.message?.includes('network') ||
        err.message?.includes('timed out');

      if (isNetworkDrop && attempt < maxRetries) {
        onRetry?.(attempt + 1, maxRetries, err);
        // Exponential backoff
        await new Promise((res) => setTimeout(res, 800 * Math.pow(2, attempt)));
        continue;
      }

      // Failure record
      recordTokenUsage({
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        neurons: 0,
        latencyMs: Math.round(performance.now() - attemptStart),
        model: model || 'none',
        endpoint,
        success: false,
      });

      throw err;
    }
  }

  throw lastError || new Error('Request failed after multiple retry attempts');
}

export async function executeStreamingInference(
  settings: AppSettings,
  options: StreamingRequestOptions
): Promise<ApiResponse<{ response: string; fullData?: any }>> {
  const {
    endpoint,
    category,
    body,
    model = '',
    promptText = '',
    systemPrompt = '',
    onToken,
    onStatusChange,
    onRetry,
    signal,
  } = options;

  const baseUrl = settings.baseUrl || DEFAULT_WORKER_URL;
  const url = `${baseUrl.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const maxRetries = settings.autoRetryAttempts ?? 2;
  const timeoutMs = (settings.timeoutSeconds || 45) * 1000;

  let lastError: Error | null = null;
  const overallStart = performance.now();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const offlineError = new Error('You appear to be offline. Please check your internet connection.');
      recordTokenUsage({
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        neurons: 0,
        latencyMs: Math.round(performance.now() - overallStart),
        model: model || 'none',
        endpoint,
        success: false,
      });
      throw offlineError;
    }

    const attemptStart = performance.now();
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      timeoutController.abort(new Error(`Request timed out after ${settings.timeoutSeconds || 45} seconds`));
    }, timeoutMs);

    let mergedSignal = timeoutController.signal;
    if (signal) {
      const compositeAbort = () => timeoutController.abort();
      signal.addEventListener('abort', compositeAbort, { once: true });
    }

    try {
      onStatusChange?.('connecting');

      const requestBody = {
        ...body,
        stream: settings.stream !== false,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream, application/json, text/plain',
        },
        body: JSON.stringify(requestBody),
        signal: mergedSignal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        onStatusChange?.('error');
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: await response.text() };
        }

        const rawErrorMessage = errorData?.error || errorData?.message || `Inference error: HTTP ${response.status}`;
        const serverError = new Error(rawErrorMessage);
        (serverError as any).status = response.status;
        (serverError as any).response = errorData;

        if ((response.status >= 500 || response.status === 429) && attempt < maxRetries) {
          lastError = serverError;
          onRetry?.(attempt + 1, maxRetries, serverError);
          await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, attempt)));
          continue;
        }

        recordTokenUsage({
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          neurons: 0,
          latencyMs: Math.round(performance.now() - attemptStart),
          model: model || 'none',
          endpoint,
          success: false,
        });

        throw serverError;
      }

      onStatusChange?.('streaming');

      // Read streaming body
      let accumulatedText = '';
      let rawText = '';
      let parsedData: any = null;

      if (response.body && typeof response.body.getReader === 'function') {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          rawText += chunk;

          const deltas = parseStreamChunk(chunk);
          for (const delta of deltas) {
            accumulatedText += delta;
            onToken?.(delta, accumulatedText);
          }
        }
      } else {
        rawText = await response.text();
      }

      // Try parsing the complete response if it was a JSON payload
      try {
        parsedData = JSON.parse(rawText);
        if (parsedData?.response?.response) {
          accumulatedText = parsedData.response.response;
        } else if (parsedData?.response?.choices?.[0]?.message?.content) {
          accumulatedText = parsedData.response.choices[0].message.content;
        } else if (typeof parsedData?.response === 'string') {
          accumulatedText = parsedData.response;
        }
      } catch {
        // Not a single JSON block, accumulatedText already collected chunks
      }

      // If accumulatedText was empty but rawText has content
      if (!accumulatedText && rawText) {
        accumulatedText = rawText;
        onToken?.(rawText, accumulatedText);
      }

      const latencyMs = Math.round(performance.now() - attemptStart);
      onStatusChange?.('completed');

      // Extract or estimate tokens
      let promptTokens = 0;
      let completionTokens = 0;
      let totalTokens = 0;
      let neurons = 0;

      if (parsedData?.response?.usage) {
        const u = parsedData.response.usage;
        promptTokens = u.prompt_tokens || 0;
        completionTokens = u.completion_tokens || 0;
        totalTokens = u.total_tokens || promptTokens + completionTokens;
        neurons = u.neurons || 0;
      } else if (parsedData?.usage) {
        const u = parsedData.usage;
        promptTokens = u.prompt_tokens || 0;
        completionTokens = u.completion_tokens || 0;
        totalTokens = u.total_tokens || promptTokens + completionTokens;
        neurons = u.neurons || 0;
      } else {
        promptTokens = Math.max(1, Math.round(promptText.length / 4));
        completionTokens = Math.max(1, Math.round(accumulatedText.length / 4));
        totalTokens = promptTokens + completionTokens;
        neurons = parseFloat((totalTokens * 0.008).toFixed(4));
      }

      // Record successful token metric
      recordTokenUsage({
        promptTokens,
        completionTokens,
        totalTokens,
        neurons,
        latencyMs,
        model: model || parsedData?.model || 'default',
        endpoint,
        success: true,
      });

      // Save history item if configured
      if (settings.autoSaveHistory) {
        saveHistoryItem({
          endpoint,
          category,
          model: model || parsedData?.model || 'default',
          prompt: promptText || endpoint,
          system: systemPrompt,
          output: {
            type: 'text',
            content: accumulatedText,
            extra: parsedData,
          },
          tokensUsed: {
            prompt: promptTokens,
            completion: completionTokens,
            total: totalTokens,
            neurons,
          },
          latencyMs,
          status: 'success',
          parameters: body,
        });
      }

      return {
        data: {
          response: accumulatedText,
          fullData: parsedData,
        },
        rawResponse: response,
        status: response.status,
        latencyMs,
        tokens: {
          prompt: promptTokens,
          completion: completionTokens,
          total: totalTokens,
          neurons,
        },
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      onStatusChange?.('error');

      if (signal?.aborted) {
        throw new Error('Inference canceled by user');
      }

      const isNetworkDrop =
        err.name === 'AbortError' ||
        err.message?.includes('fetch') ||
        err.message?.includes('network') ||
        err.message?.includes('timed out');

      if (isNetworkDrop && attempt < maxRetries) {
        onRetry?.(attempt + 1, maxRetries, err);
        await new Promise((res) => setTimeout(res, 800 * Math.pow(2, attempt)));
        continue;
      }

      recordTokenUsage({
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        neurons: 0,
        latencyMs: Math.round(performance.now() - attemptStart),
        model: model || 'none',
        endpoint,
        success: false,
      });

      throw err;
    }
  }

  throw lastError || new Error('Streaming request failed after retry attempts');
}

