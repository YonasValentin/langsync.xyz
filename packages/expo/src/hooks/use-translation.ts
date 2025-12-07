/**
 * Hook for single translation (optimized for performance)
 */

import { useMemo } from 'react';
import { interpolate } from '@langsync/core';
import { useTranslationContext } from '../context.js';
import type { TranslationOptions } from './use-translations.js';
import { getTranslationValue } from './use-translations.js';

/**
 * Hook for accessing a single translation
 * Returns the translated string directly (not a function)
 * Optimized for performance when you need just one translation
 *
 * @example
 * ```tsx
 * const title = useTranslation('welcome.title');
 * const greeting = useTranslation('welcome.greeting', { name: 'John' });
 *
 * return (
 *   <View>
 *     <Text>{title}</Text>
 *     <Text>{greeting}</Text>
 *   </View>
 * );
 * ```
 */
export function useTranslation(
  key: string,
  variables?: Record<string, string | number>,
  options?: TranslationOptions
): string {
  const { translations, language } = useTranslationContext();

  return useMemo(() => {
    const { defaultValue, fallbackToKey = true } = options || {};

    const value = getTranslationValue(translations, key);

    // If not found, return default or key
    if (value == null) {
      if (defaultValue) return defaultValue;
      if (fallbackToKey) return key;

      if (__DEV__) {
        console.warn(`[LangSync] Missing translation for key: "${key}" (language: ${language})`);
      }

      return key;
    }

    // Apply variable interpolation if provided
    if (variables) {
      try {
        return interpolate(value, variables);
      } catch (error) {
        if (__DEV__) {
          console.error(
            `[LangSync] Failed to interpolate translation for key: "${key}"`,
            error
          );
        }
        return value;
      }
    }

    return value;
  }, [translations, language, key, JSON.stringify(variables), options?.defaultValue, options?.fallbackToKey]);
}
