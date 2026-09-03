export interface StreamController {
  stop: () => void;
  pause: () => void;
  resume: () => void;
  finishNow: () => void;
  isPaused: () => boolean;
}

export interface StreamUpdate {
  text: string;
  delta?: string;
  isComplete: boolean;
  tokensPerSec: number;
  elapsedMs: number;
  tokenCount?: number;
}

/**
 * Parses raw text or SSE stream chunks into token deltas.
 */
export function parseStreamChunk(chunk: string): string[] {
  if (!chunk) return [];
  const deltas: string[] = [];

  // If it looks like SSE with 'data:' lines
  if (chunk.includes('data:')) {
    const lines = chunk.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (trimmed.startsWith('data:')) {
        const jsonStr = trimmed.slice(5).trim();
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed?.response) {
            deltas.push(parsed.response);
          } else if (parsed?.choices?.[0]?.delta?.content) {
            deltas.push(parsed.choices[0].delta.content);
          } else if (parsed?.choices?.[0]?.message?.content) {
            deltas.push(parsed.choices[0].message.content);
          } else if (typeof parsed === 'string') {
            deltas.push(parsed);
          }
        } catch {
          // If not JSON, treat whatever follows data: as raw string
          deltas.push(jsonStr);
        }
      }
    }
    return deltas;
  }

  // If it's a JSON block with response field
  if (chunk.trim().startsWith('{') && chunk.trim().endsWith('}')) {
    try {
      const parsed = JSON.parse(chunk.trim());
      if (parsed?.response?.response) {
        return [parsed.response.response];
      }
      if (parsed?.response?.choices?.[0]?.message?.content) {
        return [parsed.response.choices[0].message.content];
      }
      if (typeof parsed?.response === 'string') {
        return [parsed.response];
      }
    } catch {
      // Fall through to plain chunk
    }
  }

  // Raw text chunk
  return [chunk];
}

export interface RealtimeStreamQueue {
  pushDelta: (delta: string) => void;
  markStreamEnded: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  finishNow: () => void;
}

/**
 * Creates an active, real-time token stream queue that renders content
 * progressively as it becomes available from the network.
 */
export function createRealtimeStreamConsumer(
  speed: 'fast' | 'normal' | 'slow' | 'instant',
  onUpdate: (update: StreamUpdate) => void,
  onComplete?: () => void
): RealtimeStreamQueue {
  let accumulated = '';
  let tokenQueue: string[] = [];
  let isStreamEnded = false;
  let isStopped = false;
  let isPausedState = false;
  const startTime = performance.now();
  let timerId: any = null;
  let totalTokensEmitted = 0;

  const intervalMap = {
    instant: 0,
    fast: 10,
    normal: 24,
    slow: 50,
  };
  const baseInterval = intervalMap[speed] ?? 10;

  const flushImmediate = () => {
    if (tokenQueue.length > 0) {
      const remaining = tokenQueue.join('');
      accumulated += remaining;
      totalTokensEmitted += tokenQueue.length;
      tokenQueue = [];
    }
    const elapsedMs = Math.max(1, performance.now() - startTime);
    const tokensPerSec = parseFloat(((totalTokensEmitted / elapsedMs) * 1000).toFixed(1));
    onUpdate({
      text: accumulated,
      isComplete: true,
      tokensPerSec,
      elapsedMs: Math.round(elapsedMs),
      tokenCount: totalTokensEmitted,
    });
    onComplete?.();
  };

  const processTick = () => {
    if (isStopped) return;

    if (isPausedState) {
      timerId = setTimeout(processTick, 80);
      return;
    }

    if (speed === 'instant') {
      if (tokenQueue.length > 0) {
        accumulated += tokenQueue.join('');
        totalTokensEmitted += tokenQueue.length;
        tokenQueue = [];
        const elapsedMs = Math.max(1, performance.now() - startTime);
        const tokensPerSec = parseFloat(((totalTokensEmitted / elapsedMs) * 1000).toFixed(1));
        onUpdate({
          text: accumulated,
          isComplete: isStreamEnded,
          tokensPerSec,
          elapsedMs: Math.round(elapsedMs),
          tokenCount: totalTokensEmitted,
        });
      }
      if (isStreamEnded) {
        onComplete?.();
      } else {
        timerId = setTimeout(processTick, 15);
      }
      return;
    }

    if (tokenQueue.length > 0) {
      // Dequeue 1-3 tokens depending on queue depth to keep up with API
      const step = tokenQueue.length > 15 ? 4 : tokenQueue.length > 6 ? 2 : 1;
      const nextBatch = tokenQueue.splice(0, step);
      const nextText = nextBatch.join('');
      accumulated += nextText;
      totalTokensEmitted += nextBatch.length;

      const elapsedMs = Math.max(1, performance.now() - startTime);
      const tokensPerSec = parseFloat(((totalTokensEmitted / elapsedMs) * 1000).toFixed(1));

      onUpdate({
        text: accumulated,
        delta: nextText,
        isComplete: false,
        tokensPerSec,
        elapsedMs: Math.round(elapsedMs),
        tokenCount: totalTokensEmitted,
      });

      // Shorter interval if queue is piling up
      const adaptiveInterval = tokenQueue.length > 8 ? Math.max(4, baseInterval / 2) : baseInterval;
      timerId = setTimeout(processTick, adaptiveInterval);
    } else if (isStreamEnded) {
      const elapsedMs = Math.max(1, performance.now() - startTime);
      const tokensPerSec = parseFloat(((totalTokensEmitted / elapsedMs) * 1000).toFixed(1));
      onUpdate({
        text: accumulated,
        isComplete: true,
        tokensPerSec,
        elapsedMs: Math.round(elapsedMs),
        tokenCount: totalTokensEmitted,
      });
      onComplete?.();
    } else {
      // Waiting for next chunk from API
      timerId = setTimeout(processTick, 25);
    }
  };

  // Start processing loop
  timerId = setTimeout(processTick, 5);

  return {
    pushDelta: (delta: string) => {
      if (isStopped || !delta) return;
      // Slice delta into words and punctuation tokens for fluid display
      const tokens = delta.match(/\S+|\s+/g) || [delta];
      tokenQueue.push(...tokens);
    },
    markStreamEnded: () => {
      isStreamEnded = true;
    },
    stop: () => {
      isStopped = true;
      if (timerId) clearTimeout(timerId);
    },
    pause: () => {
      isPausedState = true;
    },
    resume: () => {
      isPausedState = false;
    },
    finishNow: () => {
      isStopped = true;
      if (timerId) clearTimeout(timerId);
      flushImmediate();
    },
  };
}

/**
 * Retained for backwards compatibility with static strings.
 */
export function streamTextAnimation(
  fullText: string,
  speed: 'fast' | 'normal' | 'slow' | 'instant',
  onUpdate: (update: StreamUpdate) => void,
  onFinish?: () => void
): StreamController {
  const consumer = createRealtimeStreamConsumer(speed, onUpdate, onFinish);
  consumer.pushDelta(fullText);
  consumer.markStreamEnded();

  let paused = false;
  return {
    stop: () => consumer.stop(),
    pause: () => {
      paused = true;
      consumer.pause();
    },
    resume: () => {
      paused = false;
      consumer.resume();
    },
    finishNow: () => consumer.finishNow(),
    isPaused: () => paused,
  };
}
