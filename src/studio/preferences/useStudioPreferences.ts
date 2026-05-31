import { useCallback, useEffect, useState } from 'react';

export type StudioPreferences = {
  aspectRatio: string;
  count: number;
  industry: string;
  platform: string;
};

export type StudioPreferencesPatch = Partial<StudioPreferences>;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const STUDIO_PREFS_STORAGE_KEY = 'aethergenix_studio_prefs';

export const STUDIO_ASPECT_RATIO_OPTIONS = ['1:1', '4:5', '16:9', '9:16', '3:2', '2:3', '3:4', '4:3', '21:9', '2.35:1'];
export const STUDIO_COUNT_OPTIONS = [1, 2, 3, 4];

export const DEFAULT_STUDIO_PREFERENCES: StudioPreferences = {
  aspectRatio: '1:1',
  count: 1,
  industry: 'cross_border_ecommerce',
  platform: '通用',
};

export function sanitizeStudioPreferences(value: unknown): StudioPreferences {
  if (!value || typeof value !== 'object') return DEFAULT_STUDIO_PREFERENCES;
  const partial = value as Partial<StudioPreferences>;
  const aspectRatio = typeof partial.aspectRatio === 'string' && STUDIO_ASPECT_RATIO_OPTIONS.includes(partial.aspectRatio)
    ? partial.aspectRatio
    : DEFAULT_STUDIO_PREFERENCES.aspectRatio;
  const count = typeof partial.count === 'number' && STUDIO_COUNT_OPTIONS.includes(partial.count)
    ? partial.count
    : DEFAULT_STUDIO_PREFERENCES.count;
  const industry = typeof partial.industry === 'string' && partial.industry.trim()
    ? partial.industry
    : DEFAULT_STUDIO_PREFERENCES.industry;
  const platform = typeof partial.platform === 'string' && partial.platform.trim()
    ? partial.platform
    : DEFAULT_STUDIO_PREFERENCES.platform;

  return { aspectRatio, count, industry, platform };
}

export function readStudioPreferences(storage?: StorageLike | null): StudioPreferences {
  if (!storage) return DEFAULT_STUDIO_PREFERENCES;
  try {
    const raw = storage.getItem(STUDIO_PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_STUDIO_PREFERENCES;
    return sanitizeStudioPreferences(JSON.parse(raw));
  } catch {
    return DEFAULT_STUDIO_PREFERENCES;
  }
}

export function writeStudioPreferences(storage: StorageLike | undefined | null, preferences: StudioPreferences) {
  if (!storage) return;
  try {
    storage.setItem(STUDIO_PREFS_STORAGE_KEY, JSON.stringify(sanitizeStudioPreferences(preferences)));
  } catch {
    // localStorage can be unavailable in private or server-like environments.
  }
}

function browserStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function useStudioPreferences() {
  const [preferences, setPreferences] = useState<StudioPreferences>(() => readStudioPreferences(browserStorage()));

  useEffect(() => {
    writeStudioPreferences(browserStorage(), preferences);
  }, [preferences]);

  const updatePreferences = useCallback((patch: StudioPreferencesPatch) => {
    setPreferences((current) => sanitizeStudioPreferences({ ...current, ...patch }));
  }, []);

  const resetPreferences = useCallback(() => {
    const storage = browserStorage();
    try {
      storage?.removeItem(STUDIO_PREFS_STORAGE_KEY);
    } catch {
      // Ignore unavailable storage.
    }
    setPreferences(DEFAULT_STUDIO_PREFERENCES);
  }, []);

  return { preferences, updatePreferences, resetPreferences };
}
