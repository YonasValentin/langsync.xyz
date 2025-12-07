import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

import { BundledLoader } from './bundled.js';

describe('BundledLoader', () => {
  beforeAll(() => {
    vi.stubGlobal('__DEV__', false);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('throws if default language is missing from bundled translations', () => {
    expect(
      () =>
        new BundledLoader({
          translations: {
            fr: { greeting: 'Bonjour' },
          },
          defaultLanguage: 'en',
        })
    ).toThrow('[LangSync] Bundled translations must include default language "en"');
  });

  it('falls back to the default language when requested language is unavailable', () => {
    const loader = new BundledLoader({
      translations: {
        en: { greeting: 'Hello' },
      },
      defaultLanguage: 'en',
    });

    expect(loader.loadTranslations('fr')).toEqual({ greeting: 'Hello' });
  });
});
