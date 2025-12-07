/**
 * Enhanced Translation Provider with built-in language switching
 */

'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { TranslationProvider as BaseTranslationProvider } from './context.js';
import { LangSyncClient } from '@langsync/client';
import type { TranslationDictionary } from '@langsync/core';
import { LanguageContext } from './language-context.js';

export type LoadingStrategy = 'preload-all' | 'lazy-load' | 'hybrid';

export interface EnhancedProviderProps {
  /** API key for authentication */
  apiKey: string;
  /** Project ID */
  projectId: string;
  /** Base URL for the API (optional) */
  baseUrl?: string;
  /** Default language */
  defaultLanguage: string;
  /** Available languages */
  languages: string[];
  /** Loading strategy for translations */
  strategy?: LoadingStrategy;
  /** Persist language choice to localStorage */
  persistLanguage?: boolean;
  /** localStorage key for persisting language */
  storageKey?: string;
  /** Children components */
  children: ReactNode;
  /** Pre-loaded translations (from server-side) */
  initialTranslations?: Record<string, TranslationDictionary>;
}

/**
 * Enhanced TranslationProvider with built-in language switching
 *
 * @example
 * ```tsx
 * <EnhancedTranslationProvider
 *   apiKey={process.env.PHRASEFLOW_API_KEY!}
 *   projectId={process.env.PHRASEFLOW_PROJECT_ID!}
 *   defaultLanguage="en"
 *   languages={['en', 'da', 'de']}
 *   strategy="preload-all"
 * >
 *   <App />
 * </EnhancedTranslationProvider>
 * ```
 */
export function EnhancedTranslationProvider({
  apiKey,
  projectId,
  baseUrl,
  defaultLanguage,
  languages,
  strategy = 'preload-all',
  persistLanguage = true,
  storageKey = 'langsync-language',
  children,
  initialTranslations,
}: EnhancedProviderProps) {
  // Get initial language from localStorage or use default
  const getInitialLanguage = () => {
    if (typeof window === 'undefined') return defaultLanguage;
    if (!persistLanguage) return defaultLanguage;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && languages.includes(stored)) {
        return stored;
      }
    } catch (error) {
      console.warn('[LangSync] Failed to read language from localStorage:', error);
    }

    return defaultLanguage;
  };

  const [currentLanguage, setCurrentLanguage] = useState(getInitialLanguage);
  const [translations, setTranslations] = useState<Record<string, TranslationDictionary>>(
    initialTranslations || {}
  );
  const [loading, setLoading] = useState(false);
  const [client] = useState(() => new LangSyncClient({ apiKey, projectId, baseUrl }));

  // Persist language to localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || !persistLanguage) return;

    try {
      localStorage.setItem(storageKey, currentLanguage);
    } catch (error) {
      console.warn('[LangSync] Failed to persist language to localStorage:', error);
    }
  }, [currentLanguage, persistLanguage, storageKey]);

  // Load translations based on strategy
  useEffect(() => {
    if (strategy === 'preload-all' && !initialTranslations) {
      loadAllLanguages();
    } else if (strategy === 'lazy-load') {
      // Only load current language
      if (!translations[currentLanguage]) {
        loadLanguage(currentLanguage);
      }
    } else if (strategy === 'hybrid') {
      // Load current + default, others on demand
      const toLoad = new Set([currentLanguage, defaultLanguage]);
      toLoad.forEach(lang => {
        if (!translations[lang]) {
          loadLanguage(lang);
        }
      });
    }
  }, []);

  const loadAllLanguages = async () => {
    setLoading(true);
    try {
      const allTranslations = await client.getAllTranslations({ languages });
      setTranslations(allTranslations);
    } catch (error) {
      console.error('[LangSync] Failed to load translations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLanguage = async (language: string) => {
    if (translations[language]) return; // Already loaded

    setLoading(true);
    try {
      const langTranslations = await client.getLanguageTranslations(language);
      setTranslations(prev => ({
        ...prev,
        [language]: langTranslations,
      }));
    } catch (error) {
      console.error(`[LangSync] Failed to load translations for ${language}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const switchLanguage = useCallback(async (language: string) => {
    if (!languages.includes(language)) {
      console.warn(`[LangSync] Language "${language}" is not in the available languages list`);
      return;
    }

    // For lazy-load strategy, fetch the language if not loaded
    if (strategy === 'lazy-load' && !translations[language]) {
      await loadLanguage(language);
    }

    setCurrentLanguage(language);
  }, [languages, strategy, translations]);

  const currentTranslations = translations[currentLanguage] || {};

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        switchLanguage,
        availableLanguages: languages,
        loading,
      }}
    >
      <BaseTranslationProvider
        translations={currentTranslations}
        language={currentLanguage}
        defaultLanguage={defaultLanguage}
      >
        {children}
      </BaseTranslationProvider>
    </LanguageContext.Provider>
  );
}
