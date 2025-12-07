import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

const runtimeLoadTranslations = vi.hoisted(() => vi.fn());
const runtimeLoaderFactory = vi.hoisted(() =>
  vi.fn().mockImplementation(() => ({
    loadTranslations: runtimeLoadTranslations,
    refresh: vi.fn(),
    preloadLanguages: vi.fn(),
    getCacheInfo: vi.fn(),
    clearCache: vi.fn(),
  }))
);

vi.mock('./runtime.js', () => ({
  RuntimeLoader: runtimeLoaderFactory,
}));

import { HybridLoader } from './hybrid.js';
import { RuntimeLoader } from './runtime.js';

describe('HybridLoader', () => {
  beforeAll(() => {
    vi.stubGlobal('__DEV__', false);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    runtimeLoadTranslations.mockReset();
    vi.mocked(RuntimeLoader).mockClear();
  });

  it('loads bundled translations without calling runtime loader', async () => {
    const loader = new HybridLoader({
      apiKey: 'test',
      projectId: 'proj',
      bundledTranslations: {
        en: { greeting: 'Hello' },
      },
      defaultLanguage: 'en',
    });

    await expect(loader.loadTranslations('en')).resolves.toEqual({ greeting: 'Hello' });
    expect(runtimeLoadTranslations).not.toHaveBeenCalled();
  });

  it('falls back to runtime loader when language is not bundled', async () => {
    const loader = new HybridLoader({
      apiKey: 'test',
      projectId: 'proj',
      bundledTranslations: {
        en: { greeting: 'Hello' },
      },
      defaultLanguage: 'en',
    });

    runtimeLoadTranslations.mockResolvedValue({ greeting: 'Bonjour' });

    await expect(loader.loadTranslations('fr')).resolves.toEqual({ greeting: 'Bonjour' });
    expect(runtimeLoadTranslations).toHaveBeenCalledWith('fr');
  });
});
