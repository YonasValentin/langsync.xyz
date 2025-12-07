/**
 * Language switching context and hook
 */

'use client';

import { createContext, useContext } from 'react';

export interface LanguageContextValue {
  /** Current active language */
  currentLanguage: string;
  /** Function to switch language */
  switchLanguage: (language: string) => Promise<void> | void;
  /** List of available languages */
  availableLanguages: string[];
  /** Whether translations are currently loading */
  loading: boolean;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * Hook to access language switching functionality
 *
 * @example
 * ```tsx
 * const { currentLanguage, switchLanguage, availableLanguages } = useLanguage();
 *
 * <button onClick={() => switchLanguage('da')}>
 *   Switch to Danish
 * </button>
 * ```
 */
export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      'useLanguage must be used within EnhancedTranslationProvider'
    );
  }

  return context;
}
