import type { StudioBusinessHistoryEntry } from './studioTypes';

export function createHistoryEntry(type: string): StudioBusinessHistoryEntry {
  return {
    id: `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    at: new Date().toISOString(),
  };
}

export function appendBusinessHistory(
  history: StudioBusinessHistoryEntry[],
  type: string,
): StudioBusinessHistoryEntry[] {
  return [createHistoryEntry(type), ...history].slice(0, 100);
}

