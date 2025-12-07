/**
 * Hook for accessing a single translation
 */

'use client';

import { interpolate } from '@langsync/core';
import { useTranslationContext } from '../context.js';

/**
 * Hook that returns a specific translation
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const title = useTranslation('hero.title')
 *   const subtitle = useTranslation('hero.subtitle')
 *
 *   return (
 *     <div>
 *       <h1>{title}</h1>
 *       <p>{subtitle}</p>
 *     </div>
 *   )
 * }
 * ```
 */
export function useTranslation(
  key: string,
  variables?: Record<string, string | number>,
  options?: { fallback?: string }
): string {
  const { translations, fallbackToDefault } = useTranslationContext();

  let value = translations[key];

  // Use fallback if key not found
  if (value === undefined) {
    if (options?.fallback) {
      value = options.fallback;
    } else if (fallbackToDefault) {
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
}
