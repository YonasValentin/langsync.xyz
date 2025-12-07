/**
 * Next.js plugin for LangSync (optional)
 * This plugin can be used to add LangSync configuration to Next.js
 */

import type { NextConfig } from 'next';
import type { LangSyncConfig } from '@langsync/core';

export interface LangSyncPluginConfig extends Partial<LangSyncConfig> {
  /** Enable verbose logging during build */
  verbose?: boolean;
  /** Revalidate interval in seconds (for ISR) */
  revalidate?: number;
}

/**
 * Next.js plugin for LangSync
 * Adds LangSync configuration to your Next.js app
 *
 * **Security Note**: The API key is intentionally NOT added to Next.js env variables
 * to prevent client-side exposure. Use server-side environment variables or
 * server-only loaders to access the API key.
 *
 * @example
 * ```ts
 * // next.config.ts
 * import { withLangSync } from '@langsync/nextjs/plugin'
 *
 * export default withLangSync({
 *   // Next.js config
 * }, {
 *   // Do NOT pass apiKey here - it's not used by the plugin
 *   projectId: process.env.PHRASEFLOW_PROJECT_ID,
 *   defaultLanguage: 'en',
 *   languages: ['en', 'es', 'fr'],
 *   revalidate: 3600, // 1 hour
 * })
 * ```
 */
export function withLangSync(
  nextConfig: NextConfig = {},
  langsyncConfig: LangSyncPluginConfig
): NextConfig {
  const { verbose = false } = langsyncConfig;

  // Validate required configuration
  if (!langsyncConfig.projectId) {
    throw new Error('[LangSync] projectId is required in plugin configuration');
  }

  if (!langsyncConfig.defaultLanguage) {
    throw new Error('[LangSync] defaultLanguage is required in plugin configuration');
  }

  if (!langsyncConfig.languages || langsyncConfig.languages.length === 0) {
    throw new Error('[LangSync] languages array is required and cannot be empty');
  }

  // Warn if apiKey is provided (it shouldn't be)
  if ('apiKey' in langsyncConfig && langsyncConfig.apiKey) {
    console.warn(
      '[LangSync] WARNING: apiKey should NOT be passed to the plugin. ' +
      'Use server-side environment variables instead to prevent client-side exposure.'
    );
  }

  if (verbose) {
    console.log('[LangSync] Plugin initialized');
    console.log(`[LangSync] Project ID: ${langsyncConfig.projectId}`);
    console.log(`[LangSync] Default Language: ${langsyncConfig.defaultLanguage}`);
    console.log(`[LangSync] Languages: ${langsyncConfig.languages?.join(', ')}`);
  }

  // Add LangSync config to environment variables
  const env = {
    ...nextConfig.env,
    PHRASEFLOW_PROJECT_ID: langsyncConfig.projectId,
    PHRASEFLOW_DEFAULT_LANGUAGE: langsyncConfig.defaultLanguage,
    PHRASEFLOW_LANGUAGES: langsyncConfig.languages?.join(','),
    PHRASEFLOW_REVALIDATE: langsyncConfig.revalidate?.toString(),
  };

  return {
    ...nextConfig,
    env,
  };
}
