/**
 * Hook for language management
 */

import { useState, useCallback } from 'react';
import { useTranslationContext } from '../context.js';

export interface LanguageHookResult {
  /** Current language code */
  language: string;
  /** Default language code */
  defaultLanguage: string;
  /** Available language codes */
  availableLanguages: string[];
  /** Changes the current language */
  changeLanguage: (language: string) => Promise<void>;
  /** Whether language change is in progress */
  isChanging: boolean;
  /** Current error if any */
  error: Error | null;
}

/**
 * Hook for managing language selection
 * Provides current language and function to change it
 *
 * @example
 * ```tsx
 * const { language, availableLanguages, changeLanguage, isChanging } = useLanguage();
 *
 * return (
 *   <View>
 *     <Text>Current: {language}</Text>
 *     {availableLanguages.map((lang) => (
 *       <Button
 *         key={lang}
 *         title={lang}
 *         onPress={() => changeLanguage(lang)}
 *         disabled={isChanging}
 *       />
 *     ))}
 *   </View>
 * );
 * ```
 */
export function useLanguage(): LanguageHookResult {
  const context = useTranslationContext();
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const changeLanguage = useCallback(
    async (language: string) => {
      try {
        setIsChanging(true);
        setError(null);
        await context.changeLanguage(language);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsChanging(false);
      }
    },
    [context.changeLanguage]
  );

  return {
    language: context.language,
    defaultLanguage: context.defaultLanguage,
    availableLanguages: context.availableLanguages,
    changeLanguage,
    isChanging,
    error: error || context.error,
  };
}
