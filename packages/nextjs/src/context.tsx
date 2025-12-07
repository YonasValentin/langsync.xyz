/**
 * Translation context for React components
 */

'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { TranslationDictionary } from '@langsync/core';

export interface TranslationContextValue {
  translations: TranslationDictionary;
  language: string;
  defaultLanguage: string;
  fallbackToDefault: boolean;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

export interface TranslationProviderProps {
  translations: TranslationDictionary;
  language: string;
  defaultLanguage: string;
  fallbackToDefault?: boolean;
  children: ReactNode;
}

/**
 * Provider component for translations
 * @example
 * ```tsx
 * <TranslationProvider
 *   translations={translations}
 *   language="en"
 *   defaultLanguage="en"
 * >
 *   <App />
 * </TranslationProvider>
 * ```
 */
export function TranslationProvider({
  translations,
  language,
  defaultLanguage,
  fallbackToDefault = true,
  children,
}: TranslationProviderProps) {
  return (
    <TranslationContext.Provider
      value={{
        translations,
        language,
        defaultLanguage,
        fallbackToDefault,
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

/**
 * Hook to access translation context
 */
export function useTranslationContext(): TranslationContextValue {
  const context = useContext(TranslationContext);

  if (!context) {
    throw new Error(
      'useTranslationContext must be used within a TranslationProvider'
    );
  }

  return context;
}
