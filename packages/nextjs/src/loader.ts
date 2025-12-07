/**
 * Build-time translation loader for Next.js
 */

import { LangSyncClient, type ClientConfig } from '@langsync/client';
import type { TranslationDictionary } from '@langsync/core';

export interface LoaderConfig extends ClientConfig {
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Loads all translations at build time
 * Call this in getStaticProps, getServerSideProps, or during SSG
 *
 * @example
 * ```ts
 * // app/[lang]/layout.tsx (App Router)
 * export async function generateStaticParams() {
 *   return [{ lang: 'en' }, { lang: 'es' }, { lang: 'fr' }]
 * }
 *
 * export default async function Layout({ params }: { params: { lang: string } }) {
 *   const translations = await loadTranslations({
 *     apiKey: process.env.PHRASEFLOW_API_KEY!,
 *     projectId: process.env.PHRASEFLOW_PROJECT_ID!,
 *     language: params.lang,
 *   })
 *
 *   return (
 *     <TranslationProvider translations={translations} language={params.lang}>
 *       {children}
 *     </TranslationProvider>
 *   )
 * }
 * ```
 */
export async function loadTranslations(
  config: LoaderConfig & { language: string }
): Promise<TranslationDictionary> {
  const { language, verbose, ...clientConfig } = config;

  if (verbose) {
    console.log(`[LangSync] Loading translations for language: ${language}`);
  }

  const client = new LangSyncClient(clientConfig);

  try {
    const translations = await client.getLanguageTranslations(language);

    if (verbose) {
      const count = Object.keys(translations).length;
      console.log(`[LangSync] Loaded ${count} translation keys for ${language}`);
    }

    return translations;
  } catch (error) {
    if (verbose || process.env.NODE_ENV === 'development') {
      console.error('[LangSync] Failed to load translations:', error);
    }
    throw error;
  }
}

/**
 * Loads translations for the provided language list
 * Each language in the `languages` array is fetched individually, allowing
 * callers to load a subset of project languages during build-time rendering.
 *
 * @example
 * ```ts
 * const allTranslations = await loadAllTranslations({
 *   apiKey: process.env.PHRASEFLOW_API_KEY!,
 *   projectId: process.env.PHRASEFLOW_PROJECT_ID!,
 *   languages: ['en', 'es', 'fr'],
 * })
 * ```
 */
export async function loadAllTranslations(
  config: LoaderConfig & { languages: string[] }
): Promise<Record<string, TranslationDictionary>> {
  const { languages, verbose, ...clientConfig } = config;

  if (verbose) {
    console.log(
      `[LangSync] Loading translations for ${languages.length} languages`
    );
  }

  const client = new LangSyncClient(clientConfig);

  try {
    const translationEntries = await Promise.all(
      languages.map(async (language) => {
        const translations = await client.getLanguageTranslations(language);
        return [language, translations] as const;
      })
    );

    const allTranslations = Object.fromEntries(translationEntries) as Record<
      string,
      TranslationDictionary
    >;

    if (verbose) {
      languages.forEach((lang) => {
        const count = Object.keys(allTranslations[lang] || {}).length;
        console.log(`[LangSync] Loaded ${count} keys for ${lang}`);
      });
    }

    return allTranslations;
  } catch (error) {
    if (verbose || process.env.NODE_ENV === 'development') {
      console.error('[LangSync] Failed to load translations:', error);
    }
    throw error;
  }
}
