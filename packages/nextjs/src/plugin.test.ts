import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withLangSync } from './plugin';

describe('withLangSync plugin', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('Configuration validation', () => {
    it('throws error when projectId is missing', () => {
      expect(() =>
        withLangSync({}, {
          defaultLanguage: 'en',
          languages: ['en', 'es'],
        } as any)
      ).toThrow(/projectId is required/);
    });

    it('throws error when defaultLanguage is missing', () => {
      expect(() =>
        withLangSync({}, {
          projectId: 'test-proj',
          languages: ['en', 'es'],
        } as any)
      ).toThrow(/defaultLanguage is required/);
    });

    it('throws error when languages array is missing', () => {
      expect(() =>
        withLangSync({}, {
          projectId: 'test-proj',
          defaultLanguage: 'en',
        } as any)
      ).toThrow(/languages array is required/);
    });

    it('throws error when languages array is empty', () => {
      expect(() =>
        withLangSync({}, {
          projectId: 'test-proj',
          defaultLanguage: 'en',
          languages: [],
        })
      ).toThrow(/languages array is required and cannot be empty/);
    });

    it('accepts valid configuration', () => {
      const result = withLangSync({}, {
        projectId: 'test-proj',
        defaultLanguage: 'en',
        languages: ['en', 'es', 'fr'],
      });

      expect(result).toBeDefined();
      expect(result.env).toBeDefined();
    });
  });

  describe('Security - API key handling', () => {
    it('warns when apiKey is provided in config', () => {
      withLangSync({}, {
        projectId: 'test-proj',
        defaultLanguage: 'en',
        languages: ['en'],
        apiKey: 'secret-key' as any,
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('apiKey should NOT be passed to the plugin')
      );
    });

    it('does not add apiKey to environment variables', () => {
      const result = withLangSync({}, {
        projectId: 'test-proj',
        defaultLanguage: 'en',
        languages: ['en'],
        apiKey: 'secret-key' as any,
      });

      expect(result.env).not.toHaveProperty('PHRASEFLOW_API_KEY');
      expect(Object.values(result.env || {})).not.toContain('secret-key');
    });

    it('only adds non-sensitive configuration to env', () => {
      const result = withLangSync({}, {
        projectId: 'test-proj',
        defaultLanguage: 'en',
        languages: ['en', 'es'],
        revalidate: 3600,
      });

      expect(result.env).toEqual({
        PHRASEFLOW_PROJECT_ID: 'test-proj',
        PHRASEFLOW_DEFAULT_LANGUAGE: 'en',
        PHRASEFLOW_LANGUAGES: 'en,es',
        PHRASEFLOW_REVALIDATE: '3600',
      });
    });
  });

  describe('Next.js config merging', () => {
    it('merges with existing Next.js config', () => {
      const existingConfig = {
        reactStrictMode: true,
        env: {
          CUSTOM_VAR: 'value',
        },
      };

      const result = withLangSync(existingConfig, {
        projectId: 'test-proj',
        defaultLanguage: 'en',
        languages: ['en'],
      });

      expect(result.reactStrictMode).toBe(true);
      expect(result.env).toEqual({
        CUSTOM_VAR: 'value',
        PHRASEFLOW_PROJECT_ID: 'test-proj',
        PHRASEFLOW_DEFAULT_LANGUAGE: 'en',
        PHRASEFLOW_LANGUAGES: 'en',
        PHRASEFLOW_REVALIDATE: undefined,
      });
    });

    it('handles empty Next.js config', () => {
      const result = withLangSync({}, {
        projectId: 'test-proj',
        defaultLanguage: 'en',
        languages: ['en'],
      });

      expect(result).toBeDefined();
    });

    it('handles undefined Next.js config', () => {
      const result = withLangSync(undefined, {
        projectId: 'test-proj',
        defaultLanguage: 'en',
        languages: ['en'],
      });

      expect(result).toBeDefined();
    });
  });

  describe('Verbose logging', () => {
    it('logs configuration when verbose is true', () => {
      withLangSync({}, {
        projectId: 'test-proj',
        defaultLanguage: 'en',
        languages: ['en', 'es', 'fr'],
        verbose: true,
      });

      expect(consoleLogSpy).toHaveBeenCalledWith('[LangSync] Plugin initialized');
      expect(consoleLogSpy).toHaveBeenCalledWith('[LangSync] Project ID: test-proj');
      expect(consoleLogSpy).toHaveBeenCalledWith('[LangSync] Default Language: en');
      expect(consoleLogSpy).toHaveBeenCalledWith('[LangSync] Languages: en, es, fr');
    });

    it('does not log when verbose is false', () => {
      withLangSync({}, {
        projectId: 'test-proj',
        defaultLanguage: 'en',
        languages: ['en'],
        verbose: false,
      });

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('does not log by default', () => {
      withLangSync({}, {
        projectId: 'test-proj',
        defaultLanguage: 'en',
        languages: ['en'],
      });

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('Environment variable formatting', () => {
    it('converts languages array to comma-separated string', () => {
      const result = withLangSync({}, {
        projectId: 'test-proj',
        defaultLanguage: 'en',
        languages: ['en', 'es', 'fr', 'de'],
      });

      expect(result.env?.PHRASEFLOW_LANGUAGES).toBe('en,es,fr,de');
    });

    it('converts revalidate number to string', () => {
      const result = withLangSync({}, {
        projectId: 'test-proj',
        defaultLanguage: 'en',
        languages: ['en'],
        revalidate: 7200,
      });

      expect(result.env?.PHRASEFLOW_REVALIDATE).toBe('7200');
    });

    it('handles single language', () => {
      const result = withLangSync({}, {
        projectId: 'test-proj',
        defaultLanguage: 'en',
        languages: ['en'],
      });

      expect(result.env?.PHRASEFLOW_LANGUAGES).toBe('en');
    });
  });
});
