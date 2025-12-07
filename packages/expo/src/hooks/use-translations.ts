/**
 * Main translation hook with interpolation and fallback support
 */

import { useCallback, useMemo } from 'react';
import { interpolate, type TranslationDictionary } from '@langsync/core';
import { useTranslationContext } from '../context.js';

export interface TranslationOptions {
  /** Default value if translation not found */
  defaultValue?: string;
  /** Whether to return key if translation not found (default: true) */
  fallbackToKey?: boolean;
}

/**
 * Hook for accessing translations with interpolation support
 * Returns a function that translates keys to strings
 *
 * @example
 * ```tsx
 * const t = useTranslations();
 *
 * // Simple translation
 * <Text>{t('welcome.title')}</Text>
 *
 * // With variable interpolation
 * <Text>{t('welcome.greeting', { name: 'John' })}</Text>
 *
 * // With default value
 * <Text>{t('missing.key', {}, { defaultValue: 'Fallback' })}</Text>
 * ```
 */
export function useTranslations() {
  const { translations, language, defaultLanguage } = useTranslationContext();

  const t = useCallback(
    (
      key: string,
      variables?: Record<string, string | number>,
      options?: TranslationOptions
    ): string => {
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
    },
    [translations, language, defaultLanguage]
  );

  return t;
}

const hasOwn = Object.prototype.hasOwnProperty;

export function getTranslationValue(
  translations: TranslationDictionary,
  key: string
): string | undefined {
  if (hasOwn.call(translations, key)) {
    return translations[key];
  }

  return undefined;
}
