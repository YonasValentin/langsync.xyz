/**
 * Runtime translation loader with caching and background sync
 */

import { LangSyncClient, type ClientConfig } from '@langsync/client';
import type { TranslationDictionary } from '@langsync/core';
import { TranslationCache } from '../storage/cache.js';

// Optional NetInfo support
let NetInfo: any;
try {
  NetInfo = require('@react-native-community/netinfo');
} catch {
  // NetInfo not available, fallback to always connected
  NetInfo = {
    fetch: async () => ({ isConnected: true }),
  };
}

export interface RuntimeLoaderConfig extends ClientConfig {
  /** Cache TTL in seconds */
  cacheTTL?: number;
  /** Cache key prefix */
  cacheKey?: string;
  /** Enable background sync */
  backgroundSync?: boolean;
  /** Callback when background sync completes */
  onBackgroundSyncComplete?: (language: string, success: boolean) => void;
}

export class RuntimeLoader {
  private readonly client: LangSyncClient;
  private readonly cache: TranslationCache;
  private readonly config: RuntimeLoaderConfig;
  private syncInProgress = new Set<string>();

  constructor(config: RuntimeLoaderConfig) {
    this.config = {
      cacheTTL: 86400, // 24 hours default
      cacheKey: '@langsync',
      backgroundSync: true,
      ...config,
    };

    this.client = new LangSyncClient(config);
    this.cache = new TranslationCache(this.config.cacheKey);
  }

  /**
   * Loads translations for a language
   * Uses cache first, then fetches from API if needed
   */
  async loadTranslations(language: string): Promise<TranslationDictionary> {
    // 1. Try cache first
    const cached = await this.cache.get(language);

    if (cached) {
      // Start background refresh if stale and sync is enabled
      if (this.config.backgroundSync) {
        const isStale = await this.cache.isStale(language);
        if (isStale) {
          this.backgroundRefresh(language);
        }
      }

      return cached;
    }

    // 2. Check network connectivity
    const isConnected = await this.isNetworkAvailable();

    if (!isConnected) {
      throw new Error(
        `[LangSync] No cached translations for "${language}" and device is offline`
      );
    }

    // 3. Fetch from API
    try {
      const translations = await this.client.getLanguageTranslations(language);

      // 4. Cache for future use
      await this.cache.set(language, translations, this.config.cacheTTL!);

      return translations;
    } catch (error) {
      console.error(`[LangSync] Failed to fetch translations for "${language}":`, error);
      throw error;
    }
  }

  /**
   * Preloads translations for multiple languages
   * Useful for app initialization
   */
  async preloadLanguages(languages: string[]): Promise<void> {
    const promises = languages.map((lang) =>
      this.loadTranslations(lang).catch((error) => {
        console.warn(`[LangSync] Failed to preload "${lang}":`, error);
      })
    );

    await Promise.all(promises);
  }

  /**
   * Forces a refresh from the API
   */
  async refresh(language: string): Promise<TranslationDictionary> {
    const isConnected = await this.isNetworkAvailable();

    if (!isConnected) {
      // Return cached version if offline
      const cached = await this.cache.get(language);
      if (cached) return cached;

      throw new Error(
        `[LangSync] Cannot refresh "${language}" - device is offline and no cache available`
      );
    }

    try {
      const translations = await this.client.getLanguageTranslations(language, {
        refresh: true,
      });

      await this.cache.set(language, translations, this.config.cacheTTL!);

      return translations;
    } catch (error) {
      console.error(`[LangSync] Refresh failed for "${language}":`, error);
      throw error;
    }
  }

  /**
   * Background refresh (silent failure)
   */
  private async backgroundRefresh(language: string): Promise<void> {
    // Prevent duplicate background syncs
    if (this.syncInProgress.has(language)) {
      return;
    }

    this.syncInProgress.add(language);

    try {
      // Check network
      const isConnected = await this.isNetworkAvailable();
      if (!isConnected) {
        this.syncInProgress.delete(language);
        return;
      }

      // Fetch fresh translations
      const translations = await this.client.getLanguageTranslations(language, {
        refresh: true,
      });

      // Update cache
      await this.cache.set(language, translations, this.config.cacheTTL!);

      // Notify callback
      this.config.onBackgroundSyncComplete?.(language, true);

      if (__DEV__) {
        console.log(`[LangSync] Background sync completed for "${language}"`);
      }
    } catch (error) {
      // Silent failure for background sync
      if (__DEV__) {
        console.warn(`[LangSync] Background sync failed for "${language}":`, error);
      }

      this.config.onBackgroundSyncComplete?.(language, false);
    } finally {
      this.syncInProgress.delete(language);
    }
  }

  /**
   * Checks if network is available
   */
  private async isNetworkAvailable(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected === true;
    } catch {
      // If NetInfo fails, assume connected
      return true;
    }
  }

  /**
   * Clears all cached translations
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  /**
   * Gets cache statistics
   */
  async getCacheInfo(): Promise<{
    languages: string[];
    totalSize: number;
  }> {
    const languages = await this.cache.getCachedLanguages();

    return {
      languages,
      totalSize: languages.length,
    };
  }
}
