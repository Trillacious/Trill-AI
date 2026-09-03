import { HistoryItem } from '../types';

const HISTORY_STORAGE_KEY = 'trill_inference_history';

export function getStoredHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse history from storage', err);
    return [];
  }
}

export function saveHistoryItem(item: Omit<HistoryItem, 'id' | 'timestamp'>): HistoryItem {
  const newItem: HistoryItem = {
    ...item,
    id: 'hist_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
    timestamp: Date.now(),
  };

  if (typeof window !== 'undefined') {
    try {
      const current = getStoredHistory();
      // Cap at 200 items, and trim large image base64 if needed to avoid localStorage quota issues
      const sanitized = { ...newItem };
      if (sanitized.output?.content?.length > 500000 && sanitized.output.type !== 'image') {
        sanitized.output.content = sanitized.output.content.slice(0, 500000) + '... (truncated for storage)';
      }
      const updated = [sanitized, ...current].slice(0, 200);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('trill_history_updated', { detail: sanitized }));
    } catch (err) {
      console.warn('Could not persist history item (possibly quota limit):', err);
    }
  }

  return newItem;
}

export function deleteHistoryItem(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredHistory();
    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('trill_history_updated'));
  } catch (err) {
    console.error('Failed to delete history item', err);
  }
}

export function clearAllHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('trill_history_updated'));
  } catch (err) {
    console.error('Failed to clear history', err);
  }
}

export function exportHistoryAsJSON(history: HistoryItem[]): void {
  const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trill_ai_history_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
