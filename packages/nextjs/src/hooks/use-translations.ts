/**
 * Hook for accessing translations
 */

'use client';

import { useCallback } from 'react';
import { interpolate } from '@langsync/core';
import { useTranslationContext } from '../context.js';

/**
 * Hook that returns a translation function
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const t = useTranslations()
 *
 *   return (
 *     <div>
 *       <h1>{t('hero.title')}</h1>
 *       <p>{t('hero.subtitle')}</p>
 *       <button>{t('cta.button', { name: 'World' })}</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useTranslations() {
  const { translations, fallbackToDefault } = useTranslationContext();

  const t = useCallback(
    (
      key: string,
      variables?: Record<string, string | number>,
      options?: { fallback?: string }
    ): string => {
      let value = translations[key];

      // Use fallback if key not found
      if (value === undefined) {
        if (options?.fallback) {
          value = options.fallback;
        } else if (fallbackToDefault) {
          // Log missing keys in development mode only
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[LangSync] Missing translation key: "${key}"`);
          }
          return key;
        } else {
          return key;
        }
      }

      // Interpolate variables if provided
      if (variables && Object.keys(variables).length > 0) {
        return interpolate(value, variables);
      }

      return value;
    },
    [translations, fallbackToDefault]
  );

  return t;
}
