/**
 * Hybrid loader - Combines bundled and runtime loading
 * Bundled translations for default language, runtime for others
 */

import type { TranslationDictionary } from '@langsync/core';
import { BundledLoader, type BundledLoaderConfig } from './bundled.js';
import { RuntimeLoader, type RuntimeLoaderConfig } from './runtime.js';

export interface HybridLoaderConfig extends RuntimeLoaderConfig {
  /** Pre-bundled translations (typically just default language) */
  bundledTranslations: Record<string, TranslationDictionary>;
  /** Default language that must be available in bundle */
  defaultLanguage: string;
}

export class HybridLoader {
  private readonly bundledLoader: BundledLoader;
  private readonly runtimeLoader: RuntimeLoader;

  constructor(config: HybridLoaderConfig) {
    const { bundledTranslations, defaultLanguage, ...runtimeConfig } = config;

    this.bundledLoader = new BundledLoader({
      translations: bundledTranslations,
      defaultLanguage,
    });

    this.runtimeLoader = new RuntimeLoader(runtimeConfig);
  }

  /**
   * Loads translations - uses bundled if available, otherwise runtime
   */
  async loadTranslations(language: string): Promise<TranslationDictionary> {
    // Check if language is bundled
    if (this.bundledLoader.hasLanguage(language)) {
      if (__DEV__) {
        console.log(`[LangSync] Loading "${language}" from bundle`);
      }
      return this.bundledLoader.loadTranslations(language);
    }

    // Load from runtime (with caching)
    if (__DEV__) {
      console.log(`[LangSync] Loading "${language}" from API`);
    }
    return await this.runtimeLoader.loadTranslations(language);
  }

  /**
   * Forces a refresh for non-bundled languages
   */
  async refresh(language: string): Promise<TranslationDictionary> {
    if (this.bundledLoader.hasLanguage(language)) {
      // Bundled languages can't be refreshed
      return this.bundledLoader.loadTranslations(language);
    }

    return await this.runtimeLoader.refresh(language);
  }

  /**
   * Preloads multiple languages
   */
  async preloadLanguages(languages: string[]): Promise<void> {
    // Filter out bundled languages (already available)
    const bundledLanguages = this.bundledLoader.getAvailableLanguages();
    const languagesToFetch = languages.filter((lang) => !bundledLanguages.includes(lang));

    if (languagesToFetch.length > 0) {
      await this.runtimeLoader.preloadLanguages(languagesToFetch);
    }
  }

  /**
   * Gets cache info (only for runtime-loaded languages)
   */
  async getCacheInfo() {
    return await this.runtimeLoader.getCacheInfo();
  }

  /**
   * Clears cache (only affects runtime-loaded languages)
   */
  async clearCache(): Promise<void> {
    await this.runtimeLoader.clearCache();
  }
}
