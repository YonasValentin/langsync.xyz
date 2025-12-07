/**
 * Bundled translation loader
 * For translations included with the app bundle
 */

import type { TranslationDictionary } from '@langsync/core';

export interface BundledLoaderConfig {
  /** Pre-bundled translations */
  translations: Record<string, TranslationDictionary>;
  /** Default/fallback language */
  defaultLanguage: string;
}

export class BundledLoader {
  private readonly translations: Record<string, TranslationDictionary>;
  private readonly defaultLanguage: string;

  constructor(config: BundledLoaderConfig) {
    const { translations, defaultLanguage } = config;

    if (!defaultLanguage) {
      throw new Error('[LangSync] defaultLanguage is required for BundledLoader');
    }

    if (!Object.prototype.hasOwnProperty.call(translations, defaultLanguage)) {
      throw new Error(
        `[LangSync] Bundled translations must include default language "${defaultLanguage}"`
      );
    }

    if (!translations[defaultLanguage]) {
      throw new Error(
        `[LangSync] Bundled translations must include default language "${defaultLanguage}"`
      );
    }

    this.translations = translations;
    this.defaultLanguage = defaultLanguage;
  }

  /**
   * Loads translations synchronously from bundled data
   */
  loadTranslations(language: string): TranslationDictionary {
    const translations = this.translations[language];

    if (!translations) {
      // Fallback to default language
      const defaultTranslations = this.translations[this.defaultLanguage];

      if (!defaultTranslations) {
        throw new Error(
          `[LangSync] No bundled translations found for "${language}" or default "${this.defaultLanguage}"`
        );
      }

      if (__DEV__) {
        console.warn(
          `[LangSync] No bundled translations for "${language}", using "${this.defaultLanguage}" as fallback`
        );
      }

      return defaultTranslations;
    }

    return translations;
  }

  /**
   * Checks if language is available in bundle
   */
  hasLanguage(language: string): boolean {
    return language in this.translations;
  }

  /**
   * Gets all bundled languages
   */
  getAvailableLanguages(): string[] {
    return Object.keys(this.translations);
  }
}
