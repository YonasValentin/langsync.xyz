/**
 * Translation context and provider for React Native/Expo
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { TranslationDictionary } from '@langsync/core';
import type { LangSyncExpoConfig, TranslationLoader } from './config.js';
import { createLoader, validateConfig } from './config.js';
import { getLanguagePreference, saveLanguagePreference } from './utils/storage.js';
import { applyRTLIfNeeded } from './utils/rtl.js';
import { ERRORS } from './constants.js';

export interface TranslationContextValue {
  /** Current translation dictionary (flat dotted keys) */
  translations: TranslationDictionary;
  /** Current language code */
  language: string;
  /** Default language code */
  defaultLanguage: string;
  /** Available language codes */
  availableLanguages: string[];
  /** Whether translations are currently loading */
  isLoading: boolean;
  /** Current error if any */
  error: Error | null;

  /** Changes the current language */
  changeLanguage: (language: string) => Promise<void>;
  /** Refreshes translations from the server */
  refresh: () => Promise<void>;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

export interface TranslationProviderProps {
  /** Configuration for LangSync */
  config: LangSyncExpoConfig;
  /** Children components */
  children: ReactNode;
  /** Component to show while loading initial translations */
  loadingComponent?: ReactNode;
  /** Component to show on error (receives error and retry function) */
  errorComponent?: (error: Error, retry: () => void) => ReactNode;
}

/**
 * Provider component for translations
 * Wraps your app and provides translation context
 *
 * @example
 * ```tsx
 * <TranslationProvider
 *   config={{
 *     apiKey: process.env.EXPO_PUBLIC_PHRASEFLOW_API_KEY!,
 *     projectId: process.env.EXPO_PUBLIC_PHRASEFLOW_PROJECT_ID!,
 *     defaultLanguage: 'en',
 *     languages: ['en', 'es', 'fr'],
 *     strategy: 'runtime',
 *   }}
 * >
 *   <App />
 * </TranslationProvider>
 * ```
 */
export function TranslationProvider({
  config,
  children,
  loadingComponent,
  errorComponent,
}: TranslationProviderProps) {
  const [translations, setTranslations] = useState<TranslationDictionary>({});
  const [language, setLanguage] = useState(config.defaultLanguage);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [loader, setLoader] = useState<TranslationLoader | null>(null);
  const isChangingLanguageRef = useRef(false);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Validate config on mount
  useEffect(() => {
    try {
      validateConfig(config);
      const loaderInstance = createLoader(config);
      setLoader(loaderInstance);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      config.onError?.(error);
      setIsLoading(false);
    }
  }, []); // Only run once on mount

  // Initialize translations when loader is ready
  useEffect(() => {
    if (loader) {
      initializeTranslations();
    }
  }, [loader]);

  /**
   * Initializes translations on app launch
   */
  const initializeTranslations = async () => {
    if (!loader) return;

    try {
      setIsLoading(true);
      setError(null);

      // Check for saved language preference
      const savedLang = await getLanguagePreference();
      const targetLang =
        savedLang && config.languages.includes(savedLang) ? savedLang : config.defaultLanguage;

      // Load translations
      const trans = await Promise.resolve(loader.loadTranslations(targetLang));

      // Update state
      setLanguage(targetLang);
      setTranslations(trans);

      // Apply RTL if enabled
      if (config.enableRTL !== false) {
        await applyRTLIfNeeded(targetLang, () => {
          if (__DEV__) {
            console.warn(
              '[LangSync] RTL direction changed - app restart may be required on Android'
            );
          }
        });
      }

      if (__DEV__) {
        console.log(`[LangSync] Initialized with language: ${targetLang}`);
        console.log(`[LangSync] Loaded ${Object.keys(trans).length} translation keys`);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      config.onError?.(error);

      if (__DEV__) {
        console.error('[LangSync] Initialization failed:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Changes the current language
   */
  const changeLanguage = useCallback(
    async (newLanguage: string) => {
      if (!loader) {
        throw new Error('Loader not initialized');
      }

      if (!config.languages.includes(newLanguage)) {
        throw new Error(`${ERRORS.INVALID_LANGUAGE}: ${newLanguage}`);
      }

      if (newLanguage === language) {
        // Already using this language
        return;
      }

      // Prevent concurrent language changes
      if (isChangingLanguageRef.current) {
        if (__DEV__) {
          console.warn('[LangSync] Language change already in progress');
        }
        return;
      }

      try {
        isChangingLanguageRef.current = true;
        setIsLoading(true);
        setError(null);

        // Load new translations
        const trans = await Promise.resolve(loader.loadTranslations(newLanguage));

        // Update state
        setLanguage(newLanguage);
        setTranslations(trans);

        // Save preference
        await saveLanguagePreference(newLanguage);

        // Apply RTL if enabled
        if (config.enableRTL !== false) {
          const needsRestart = await applyRTLIfNeeded(newLanguage, () => {
            if (__DEV__) {
              console.warn(
                '[LangSync] RTL direction changed - app restart may be required on Android'
              );
            }
          });

          if (needsRestart && __DEV__) {
            console.log('[LangSync] Please restart the app to apply RTL changes');
          }
        }

        // Callback
        config.onLanguageChange?.(newLanguage);

        if (__DEV__) {
          console.log(`[LangSync] Language changed to: ${newLanguage}`);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        config.onError?.(error);
        throw error;
      } finally {
        isChangingLanguageRef.current = false;
        setIsLoading(false);
      }
    },
    [loader, language, config]
  );

  /**
   * Refreshes translations from the server
   */
  const refresh = useCallback(async () => {
    if (!loader || !loader.refresh) {
      if (__DEV__) {
        console.warn('[LangSync] Refresh not supported by current loader');
      }
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const trans = await loader.refresh(language);
      setTranslations(trans);

      if (__DEV__) {
        console.log(`[LangSync] Translations refreshed for: ${language}`);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      config.onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [loader, language, config]);

  // Set up timeout to prevent infinite loading on empty translations
  useEffect(() => {
    if (isLoading && Object.keys(translations).length === 0) {
      initTimeoutRef.current = setTimeout(() => {
        if (isLoading && Object.keys(translations).length === 0) {
          const timeoutError = new Error('[LangSync] Translation loading timeout - received empty or no translations');
          setError(timeoutError);
          setIsLoading(false);
          config.onError?.(timeoutError);
        }
      }, 30000); // 30 second timeout
    }

    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [isLoading, translations, config]);

  // Show loading component on initial load
  if (isLoading && Object.keys(translations).length === 0) {
    return <>{loadingComponent || null}</>;
  }

  // Show error component if provided
  if (error && errorComponent && Object.keys(translations).length === 0) {
    return <>{errorComponent(error, initializeTranslations)}</>;
  }

  const contextValue: TranslationContextValue = {
    translations,
    language,
    defaultLanguage: config.defaultLanguage,
    availableLanguages: config.languages,
    isLoading,
    error,
    changeLanguage,
    refresh,
  };

  return <TranslationContext.Provider value={contextValue}>{children}</TranslationContext.Provider>;
}

/**
 * Hook to access the translation context
 * Must be used within a TranslationProvider
 *
 * @throws Error if used outside TranslationProvider
 */
export function useTranslationContext(): TranslationContextValue {
  const context = useContext(TranslationContext);

  if (!context) {
    throw new Error(ERRORS.NO_PROVIDER);
  }

  return context;
}
