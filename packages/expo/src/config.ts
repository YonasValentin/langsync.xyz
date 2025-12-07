/**
 * Configuration types and loader factory for LangSync Expo
 */

import type { TranslationDictionary } from '@langsync/core';
import type { ClientConfig } from '@langsync/client';
import { RuntimeLoader } from './loader/runtime.js';
import { BundledLoader } from './loader/bundled.js';
import { HybridLoader } from './loader/hybrid.js';
import { ERRORS, DEFAULT_CACHE_TTL, DEFAULT_CACHE_KEY, DEFAULT_BACKGROUND_SYNC } from './constants.js';

/**
 * Loading strategy for translations
 */
export type LoadingStrategy = 'runtime' | 'bundled' | 'hybrid';

/**
 * Configuration for LangSync Expo integration
 */
export interface LangSyncExpoConfig extends Partial<ClientConfig> {
  // Required
  /** API key for LangSync */
  apiKey: string;
  /** Project ID */
  projectId: string;
  /** Default/source language */
  defaultLanguage: string;
  /** Supported languages */
  languages: string[];

  // Loading strategy
  /** How translations are loaded */
  strategy: LoadingStrategy;

  // Optional - Runtime/Hybrid strategy
  /** Cache Time-To-Live in seconds (default: 86400 = 24 hours) */
  cacheTTL?: number;
  /** AsyncStorage cache key prefix (default: '@langsync') */
  cacheKey?: string;
  /** Enable background sync for stale cache (default: true) */
  backgroundSync?: boolean;
  /** Base URL for self-hosted LangSync instance */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;

  // Optional - Bundled/Hybrid strategy
  /** Pre-bundled translations (required for 'bundled' and 'hybrid' strategies) */
  bundledTranslations?: Record<string, TranslationDictionary>;

  // Optional - Callbacks
  /** Called when language changes */
  onLanguageChange?: (language: string) => void;
  /** Called when background sync completes */
  onBackgroundSyncComplete?: (language: string, success: boolean) => void;
  /** Called on errors */
  onError?: (error: Error) => void;

  // Optional - Features
  /** Return translation key if not found (default: true) */
  fallbackToDefault?: boolean;
  /** Enable RTL support with I18nManager (default: true) */
  enableRTL?: boolean;
}

/**
 * Loader type that all loaders must implement
 */
export interface TranslationLoader {
  loadTranslations(language: string): Promise<TranslationDictionary> | TranslationDictionary;
  refresh?(language: string): Promise<TranslationDictionary>;
  clearCache?(): Promise<void>;
  getCacheInfo?(): Promise<{ languages: string[]; totalSize: number }>;
}

/**
 * Creates a translation loader based on the strategy
 */
export function createLoader(config: LangSyncExpoConfig): TranslationLoader {
  const {
    strategy,
    apiKey,
    projectId,
    bundledTranslations,
    cacheTTL = DEFAULT_CACHE_TTL,
    cacheKey = DEFAULT_CACHE_KEY,
    backgroundSync = DEFAULT_BACKGROUND_SYNC,
    baseUrl,
    timeout,
    onBackgroundSyncComplete,
  } = config;

  try {
    switch (strategy) {
      case 'runtime':
        return new RuntimeLoader({
          apiKey,
          projectId,
          baseUrl,
          timeout,
          cacheTTL,
          cacheKey,
          backgroundSync,
          onBackgroundSyncComplete,
        });

      case 'bundled':
        if (!bundledTranslations || Object.keys(bundledTranslations).length === 0) {
          throw new Error(ERRORS.BUNDLED_TRANSLATIONS_REQUIRED);
        }
        return new BundledLoader({
          translations: bundledTranslations,
          defaultLanguage: config.defaultLanguage,
        });

      case 'hybrid':
        if (!bundledTranslations || Object.keys(bundledTranslations).length === 0) {
          throw new Error(ERRORS.BUNDLED_TRANSLATIONS_REQUIRED);
        }
        return new HybridLoader({
          apiKey,
          projectId,
          baseUrl,
          timeout,
          cacheTTL,
          cacheKey,
          backgroundSync,
          onBackgroundSyncComplete,
          bundledTranslations,
          defaultLanguage: config.defaultLanguage,
        });

      default:
        throw new Error(`Unknown loading strategy: ${strategy}`);
    }
  } catch (error) {
    console.error('[LangSync] Loader creation failed:', error);
    throw error;
  }
}

/**
 * Validates configuration
 */
export function validateConfig(config: LangSyncExpoConfig): void {
  if (!config.apiKey && config.strategy !== 'bundled') {
    throw new Error('apiKey is required for runtime and hybrid strategies');
  }

  if (!config.projectId && config.strategy !== 'bundled') {
    throw new Error('projectId is required for runtime and hybrid strategies');
  }

  if (!config.defaultLanguage) {
    throw new Error('defaultLanguage is required');
  }

  if (!config.languages || config.languages.length === 0) {
    throw new Error('languages array must contain at least one language');
  }

  // Check for invalid language codes (empty strings, whitespace)
  const invalidLanguages = config.languages.filter(
    (lang) => !lang || typeof lang !== 'string' || lang.trim() === ''
  );
  if (invalidLanguages.length > 0) {
    throw new Error('languages array contains invalid language codes (empty or whitespace)');
  }

  // Check for duplicate language codes
  const uniqueLanguages = new Set(config.languages);
  if (uniqueLanguages.size !== config.languages.length) {
    throw new Error('languages array contains duplicate language codes');
  }

  if (!config.languages.includes(config.defaultLanguage)) {
    throw new Error('defaultLanguage must be included in languages array');
  }

  if ((config.strategy === 'bundled' || config.strategy === 'hybrid') && !config.bundledTranslations) {
    throw new Error(ERRORS.BUNDLED_TRANSLATIONS_REQUIRED);
  }
}
