/**
 * AsyncStorage-based translation cache for React Native/Expo
 */

import type { TranslationDictionary } from '@langsync/core';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CacheEntry {
  translations: TranslationDictionary;
  cachedAt: number;
  expiresAt: number;
  version: string;
}

export class TranslationCache {
  private readonly prefix: string;
  private readonly version = '1.0.0';
  private readonly timeoutMs: number;

  constructor(cacheKey: string = '@langsync', timeoutMs: number = 5000) {
    this.prefix = cacheKey;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Wraps a promise with a timeout to prevent hanging operations
   * @param promise - The promise to wrap
   * @param operationName - Name of the operation for error messages
   */
  private async withTimeout<T>(promise: Promise<T>, operationName: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`[LangSync] Cache ${operationName} timeout after ${this.timeoutMs}ms`)),
          this.timeoutMs
        )
      ),
    ]);
  }

  /**
   * Stores translations in AsyncStorage with TTL
   * Translations are expected to be flat dictionaries using dotted keys.
   */
  async set(
    language: string,
    translations: TranslationDictionary,
    ttl: number = 86400
  ): Promise<void> {
    const key = this.getKey(language);
    const now = Date.now();

    const entry: CacheEntry = {
      translations,
      cachedAt: now,
      expiresAt: now + ttl * 1000,
      version: this.version,
    };

    try {
      await this.withTimeout(
        AsyncStorage.setItem(key, JSON.stringify(entry)),
        'set'
      );
    } catch (error) {
      if (__DEV__) {
        console.error('[LangSync] Failed to cache translations:', error);
      }
      throw error;
    }
  }

  /**
   * Retrieves translations from AsyncStorage
   * Returns null if not found or expired
   */
  async get(language: string): Promise<TranslationDictionary | null> {
    const key = this.getKey(language);

    try {
      const data = await this.withTimeout(
        AsyncStorage.getItem(key),
        'get'
      );

      if (!data) {
        return null;
      }

      const entry: CacheEntry = JSON.parse(data);

      // Check version mismatch (for migrations)
      if (entry.version !== this.version) {
        await this.delete(language);
        return null;
      }

      // Check if expired
      if (Date.now() > entry.expiresAt) {
        await this.delete(language);
        return null;
      }

      return entry.translations;
    } catch (error) {
      if (__DEV__) {
        console.error('[LangSync] Failed to read cache:', error);
      }
      return null;
    }
  }

  /**
   * Checks if cache exists and is not expired
   */
  async has(language: string): Promise<boolean> {
    const translations = await this.get(language);
    return translations !== null;
  }

  /**
   * Checks if cache is stale (approaching expiration)
   * Returns true if cache expires in less than 10% of original TTL
   */
  async isStale(language: string): Promise<boolean> {
    const key = this.getKey(language);

    try {
      const data = await AsyncStorage.getItem(key);
      if (!data) return true;

      const entry: CacheEntry = JSON.parse(data);
      const now = Date.now();
      const timeRemaining = entry.expiresAt - now;
      const originalTTL = entry.expiresAt - entry.cachedAt;

      // Stale if less than 10% of TTL remaining
      return timeRemaining < originalTTL * 0.1;
    } catch {
      return true;
    }
  }

  /**
   * Deletes cached translations for a language
   */
  async delete(language: string): Promise<void> {
    const key = this.getKey(language);
    await AsyncStorage.removeItem(key);
  }

  /**
   * Clears all cached translations
   */
  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const langsyncKeys = keys.filter((key) => key.startsWith(this.prefix));
      await AsyncStorage.multiRemove(langsyncKeys);
    } catch (error) {
      if (__DEV__) {
        console.error('[LangSync] Failed to clear cache:', error);
      }
    }
  }

  /**
   * Gets cache metadata for debugging
   */
  async getMetadata(language: string): Promise<Omit<CacheEntry, 'translations'> | null> {
    const key = this.getKey(language);

    try {
      const data = await AsyncStorage.getItem(key);
      if (!data) return null;

      const entry: CacheEntry = JSON.parse(data);
      return {
        cachedAt: entry.cachedAt,
        expiresAt: entry.expiresAt,
        version: entry.version,
      };
    } catch {
      return null;
    }
  }

  /**
   * Gets all cached languages
   */
  async getCachedLanguages(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const langsyncKeys = keys.filter((key) => key.startsWith(`${this.prefix}:`));
      return langsyncKeys.map((key) => key.replace(`${this.prefix}:`, ''));
    } catch {
      return [];
    }
  }

  private getKey(language: string): string {
    return `${this.prefix}:${language}`;
  }
}
