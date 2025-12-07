import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TranslationDictionary } from '@langsync/core';

const asyncStorageState = new Map<string, string>();

const mockGetLanguageTranslations = vi.fn<
  [string, { refresh?: boolean }?],
  Promise<TranslationDictionary>
>();

vi.mock('@langsync/client', () => {
  class MockLangSyncClient {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(config: Record<string, unknown>) {}

    getLanguageTranslations(
      language: string,
      options?: { refresh?: boolean }
    ): Promise<TranslationDictionary> {
      return mockGetLanguageTranslations(language, options);
    }
  }

  return { LangSyncClient: MockLangSyncClient };
});

vi.mock('@react-native-async-storage/async-storage', () => {
  return {
    default: {
      setItem: vi.fn(async (key: string, value: string) => {
        asyncStorageState.set(key, value);
      }),
      getItem: vi.fn(async (key: string) => asyncStorageState.get(key) ?? null),
      removeItem: vi.fn(async (key: string) => {
        asyncStorageState.delete(key);
      }),
      getAllKeys: vi.fn(async () => Array.from(asyncStorageState.keys())),
      multiRemove: vi.fn(async (keys: string[]) => {
        keys.forEach((key) => asyncStorageState.delete(key));
      }),
    },
  };
});

// eslint-disable-next-line import/first
import { RuntimeLoader } from './runtime';

declare global {
  // eslint-disable-next-line no-var
  var __DEV__: boolean | undefined;
}

describe('RuntimeLoader background refresh', () => {
  const initialTime = new Date('2024-01-01T00:00:00.000Z');

  beforeEach(() => {
    globalThis.__DEV__ = false;
    vi.useFakeTimers();
    vi.setSystemTime(initialTime);
    asyncStorageState.clear();
    mockGetLanguageTranslations.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates the cache when background refresh completes', async () => {
    const initialTranslations: TranslationDictionary = {
      greeting: 'hello',
    };
    const updatedTranslations: TranslationDictionary = {
      greeting: 'hi there',
    };

    mockGetLanguageTranslations
      .mockResolvedValueOnce(initialTranslations)
      .mockResolvedValueOnce(updatedTranslations);

    let resolveSync!: () => void;
    const syncCompleted = new Promise<void>((resolve) => {
      resolveSync = resolve;
    });

    const loader = new RuntimeLoader({
      apiKey: 'test',
      projectId: 'demo',
      cacheTTL: 100,
      backgroundSync: true,
      onBackgroundSyncComplete: (language, success) => {
        if (language === 'en' && success) {
          resolveSync();
        }
      },
    });

    const firstLoad = await loader.loadTranslations('en');
    expect(firstLoad).toEqual(initialTranslations);
    expect(mockGetLanguageTranslations).toHaveBeenCalledTimes(1);
    expect(mockGetLanguageTranslations).toHaveBeenCalledWith('en', undefined);

    // Advance close to the cache TTL to mark the entry as stale
    vi.setSystemTime(new Date(initialTime.getTime() + 95_000));

    const cached = await loader.loadTranslations('en');
    expect(cached).toEqual(initialTranslations);
    expect(mockGetLanguageTranslations).toHaveBeenCalledTimes(1);

    await syncCompleted;

    expect(mockGetLanguageTranslations).toHaveBeenCalledTimes(2);
    expect(mockGetLanguageTranslations).toHaveBeenLastCalledWith('en', {
      refresh: true,
    });

    const storedEntry = asyncStorageState.get('@langsync:en');
    expect(storedEntry).toBeTruthy();

    const parsedEntry = JSON.parse(storedEntry!);
    expect(parsedEntry.translations).toEqual(updatedTranslations);

    const refreshed = await loader.loadTranslations('en');
    expect(refreshed).toEqual(updatedTranslations);
  });
});
