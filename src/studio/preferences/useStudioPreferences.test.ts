import assert from 'node:assert/strict';
import {
  DEFAULT_STUDIO_PREFERENCES,
  STUDIO_PREFS_STORAGE_KEY,
  readStudioPreferences,
  sanitizeStudioPreferences,
  writeStudioPreferences,
} from './useStudioPreferences';

function test(name: string, run: () => void) {
  run();
  console.log(`ok - ${name}`);
}

function memoryStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(STUDIO_PREFS_STORAGE_KEY, initial);
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    },
  };
}

test('reads defaults when storage is unavailable or empty', () => {
  assert.deepEqual(readStudioPreferences(null), DEFAULT_STUDIO_PREFERENCES);
  assert.deepEqual(readStudioPreferences(memoryStorage()), DEFAULT_STUDIO_PREFERENCES);
});

test('falls back to defaults for bad JSON and invalid values', () => {
  assert.deepEqual(readStudioPreferences(memoryStorage('{bad json')), DEFAULT_STUDIO_PREFERENCES);
  assert.deepEqual(
    sanitizeStudioPreferences({
      aspectRatio: '100:7',
      count: 99,
      industry: '',
      platform: '',
    }),
    DEFAULT_STUDIO_PREFERENCES,
  );
});

test('persists valid preferences', () => {
  const storage = memoryStorage();
  writeStudioPreferences(storage, {
    aspectRatio: '4:5',
    count: 3,
    industry: 'domestic_ecommerce',
    platform: '小红书',
  });

  assert.deepEqual(readStudioPreferences(storage), {
    aspectRatio: '4:5',
    count: 3,
    industry: 'domestic_ecommerce',
    platform: '小红书',
  });
});
