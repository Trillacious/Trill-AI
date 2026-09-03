import { TokenUsageRecord, AggregatedMetrics, TimeBucketMetric } from '../types';

const METRICS_STORAGE_KEY = 'trill_token_metrics_records';

export function getStoredTokenRecords(): TokenUsageRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(METRICS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse token metrics from storage', err);
    return [];
  }
}

export function recordTokenUsage(record: Omit<TokenUsageRecord, 'timestamp'>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredTokenRecords();
    const newRecord: TokenUsageRecord = {
      ...record,
      timestamp: Date.now(),
    };
    // Keep last 1000 records
    const updated = [newRecord, ...current].slice(0, 1000);
    localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('trill_metrics_updated', { detail: newRecord }));
  } catch (err) {
    console.error('Failed to store token record', err);
  }
}

export function clearTokenMetrics(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(METRICS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('trill_metrics_updated'));
  } catch (err) {
    console.error('Failed to clear token metrics', err);
  }
}

export function seedDemoTokenMetrics(): void {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const models = [
    '@cf/meta/llama-3.1-8b-instruct-fast',
    '@cf/deepseek/deepseek-r1-distill-qwen-32b',
    '@cf/black-forest-labs/flux-2-klein-4b',
    '@cf/deepgram/aura-2-en',
    '@cf/meta/m2m100-1.2b',
  ];
  const endpoints = ['/text', '/ai/reason', '/image/generate', '/voice/speak', '/translate'];

  const demoRecords: TokenUsageRecord[] = [];

  // Generate realistic data spread across the last 30 days
  for (let d = 29; d >= 0; d--) {
    const dayTimestamp = now - d * dayMs;
    const numCallsToday = Math.floor(Math.random() * 6) + 2;

    for (let c = 0; c < numCallsToday; c++) {
      const modelIdx = Math.floor(Math.random() * models.length);
      const isVision = models[modelIdx].includes('flux');
      const isVoice = models[modelIdx].includes('aura');

      const promptTokens = isVision ? 60 : isVoice ? 40 : Math.floor(Math.random() * 250) + 40;
      const completionTokens = isVision ? 200 : isVoice ? 120 : Math.floor(Math.random() * 850) + 120;
      const totalTokens = promptTokens + completionTokens;
      const neurons = parseFloat((totalTokens * 0.008 + (isVision ? 0.05 : 0)).toFixed(4));
      const latencyMs = isVision
        ? Math.floor(Math.random() * 2000) + 1400
        : Math.floor(Math.random() * 800) + 200;

      demoRecords.push({
        promptTokens,
        completionTokens,
        totalTokens,
        neurons,
        latencyMs,
        model: models[modelIdx],
        endpoint: endpoints[modelIdx],
        timestamp: dayTimestamp + Math.floor(Math.random() * (dayMs - 1000)),
        success: Math.random() > 0.04, // 96% success rate
      });
    }
  }

  // Combine with existing records or set
  const current = getStoredTokenRecords();
  const merged = [...current, ...demoRecords].slice(0, 1000);
  localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(merged));
  window.dispatchEvent(new CustomEvent('trill_metrics_updated'));
}

export function calculateAggregatedMetrics(records: TokenUsageRecord[]): AggregatedMetrics {
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalTokens = 0;
  let totalNeurons = 0;
  let successfulRequests = 0;
  let failedRequests = 0;
  let totalLatency = 0;

  const modelDistribution: Record<string, number> = {};
  const endpointDistribution: Record<string, number> = {};
  const historyByDay: Record<string, number> = {};

  // Daily map: YYYY-MM-DD -> TimeBucketMetric
  const dailyMap = new Map<string, TimeBucketMetric>();
  // Weekly map: YYYY-Www -> TimeBucketMetric
  const weeklyMap = new Map<string, TimeBucketMetric>();
  // Monthly map: YYYY-MM -> TimeBucketMetric
  const monthlyMap = new Map<string, TimeBucketMetric>();

  for (const r of records) {
    const pTokens = r.promptTokens || 0;
    const cTokens = r.completionTokens || 0;
    const tTokens = r.totalTokens || pTokens + cTokens;
    const neurons = r.neurons || 0;
    const latency = r.latencyMs || 0;

    totalPromptTokens += pTokens;
    totalCompletionTokens += cTokens;
    totalTokens += tTokens;
    totalNeurons += neurons;
    totalLatency += latency;

    if (r.success) {
      successfulRequests++;
    } else {
      failedRequests++;
    }

    const modelName = r.model ? r.model.replace('@cf/', '').split('/').pop() || r.model : 'Unknown';
    modelDistribution[modelName] = (modelDistribution[modelName] || 0) + (tTokens > 0 ? tTokens : 1);

    const epKey = r.endpoint || 'General';
    endpointDistribution[epKey] = (endpointDistribution[epKey] || 0) + 1;

    const dateObj = new Date(r.timestamp);
    const dayKey = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    historyByDay[dayKey] = (historyByDay[dayKey] || 0) + tTokens;

    // Standard ISO string keys
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const isoDay = `${yyyy}-${mm}-${dd}`;
    const dayLabel = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    // Aggregate Daily
    if (!dailyMap.has(isoDay)) {
      dailyMap.set(isoDay, {
        period: isoDay,
        label: dayLabel,
        timestamp: new Date(yyyy, dateObj.getMonth(), dateObj.getDate()).getTime(),
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        neurons: 0,
        requests: 0,
        successfulRequests: 0,
        failedRequests: 0,
      });
    }
    const dBucket = dailyMap.get(isoDay)!;
    dBucket.promptTokens += pTokens;
    dBucket.completionTokens += cTokens;
    dBucket.totalTokens += tTokens;
    dBucket.neurons = parseFloat((dBucket.neurons + neurons).toFixed(4));
    dBucket.requests += 1;
    if (r.success) dBucket.successfulRequests += 1;
    else dBucket.failedRequests += 1;

    // ISO Week helper
    const weekNumber = getWeekNumber(dateObj);
    const isoWeek = `${yyyy}-W${String(weekNumber).padStart(2, '0')}`;
    const weekLabel = `Wk ${weekNumber} (${dateObj.toLocaleDateString(undefined, { month: 'short' })})`;

    if (!weeklyMap.has(isoWeek)) {
      weeklyMap.set(isoWeek, {
        period: isoWeek,
        label: weekLabel,
        timestamp: dateObj.getTime(),
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        neurons: 0,
        requests: 0,
        successfulRequests: 0,
        failedRequests: 0,
      });
    }
    const wBucket = weeklyMap.get(isoWeek)!;
    wBucket.promptTokens += pTokens;
    wBucket.completionTokens += cTokens;
    wBucket.totalTokens += tTokens;
    wBucket.neurons = parseFloat((wBucket.neurons + neurons).toFixed(4));
    wBucket.requests += 1;
    if (r.success) wBucket.successfulRequests += 1;
    else wBucket.failedRequests += 1;

    // Month
    const isoMonth = `${yyyy}-${mm}`;
    const monthLabel = dateObj.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

    if (!monthlyMap.has(isoMonth)) {
      monthlyMap.set(isoMonth, {
        period: isoMonth,
        label: monthLabel,
        timestamp: new Date(yyyy, dateObj.getMonth(), 1).getTime(),
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        neurons: 0,
        requests: 0,
        successfulRequests: 0,
        failedRequests: 0,
      });
    }
    const mBucket = monthlyMap.get(isoMonth)!;
    mBucket.promptTokens += pTokens;
    mBucket.completionTokens += cTokens;
    mBucket.totalTokens += tTokens;
    mBucket.neurons = parseFloat((mBucket.neurons + neurons).toFixed(4));
    mBucket.requests += 1;
    if (r.success) mBucket.successfulRequests += 1;
    else mBucket.failedRequests += 1;
  }

  const totalRequests = records.length;
  const averageLatencyMs = totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0;

  // Ensure Daily breakdown has a clean continuous sequence (at least last 7 days)
  const sortedDays = Array.from(dailyMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  const sortedWeeks = Array.from(weeklyMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  const sortedMonths = Array.from(monthlyMap.values()).sort((a, b) => a.timestamp - b.timestamp);

  // If we have few days, fill in empty recent days so charts show full timeline
  const filledDaily = ensureTimelineDays(sortedDays);

  return {
    totalPromptTokens,
    totalCompletionTokens,
    totalTokens,
    totalNeurons: parseFloat(totalNeurons.toFixed(4)),
    totalRequests,
    successfulRequests,
    failedRequests,
    averageLatencyMs,
    modelDistribution,
    endpointDistribution,
    dailyBreakdown: filledDaily,
    weeklyBreakdown: sortedWeeks.length > 0 ? sortedWeeks : filledDaily.slice(-7),
    monthlyBreakdown: sortedMonths.length > 0 ? sortedMonths : filledDaily.slice(-4),
    historyByDay,
  };
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function ensureTimelineDays(existing: TimeBucketMetric[]): TimeBucketMetric[] {
  const dayMs = 24 * 60 * 60 * 1000;
  const map = new Map<string, TimeBucketMetric>();
  for (const item of existing) {
    map.set(item.period, item);
  }

  const result: TimeBucketMetric[] = [];
  const today = new Date();
  const numDays = 14;

  for (let i = numDays - 1; i >= 0; i--) {
    const targetDate = new Date(today.getTime() - i * dayMs);
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const isoDay = `${yyyy}-${mm}-${dd}`;
    const dayLabel = targetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    if (map.has(isoDay)) {
      result.push(map.get(isoDay)!);
    } else {
      result.push({
        period: isoDay,
        label: dayLabel,
        timestamp: targetDate.getTime(),
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        neurons: 0,
        requests: 0,
        successfulRequests: 0,
        failedRequests: 0,
      });
    }
  }

  return result;
}

export function getAggregatedMetrics(): AggregatedMetrics {
  return calculateAggregatedMetrics(getStoredTokenRecords());
}
