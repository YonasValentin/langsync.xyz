/**
 * @langsync/nextjs
 *
 * Next.js integration for LangSync translation management.
 * Provides React hooks, context provider, and build-time loading.
 *
 * @packageDocumentation
 */

// Context and Provider
export {
  TranslationProvider,
  useTranslationContext,
} from './context.js';
export type {
  TranslationProviderProps,
  TranslationContextValue,
} from './context.js';

// Enhanced Provider with Language Switching (NEW in v1.1.0)
export {
  EnhancedTranslationProvider,
} from './provider.js';
export type {
  EnhancedProviderProps,
  LoadingStrategy,
} from './provider.js';

// Language Switching (NEW in v1.1.0)
export {
  useLanguage,
} from './language-context.js';
export type {
  LanguageContextValue,
} from './language-context.js';

// Language Switcher Component (NEW in v1.1.0)
export {
  LanguageSwitcher,
} from './components/LanguageSwitcher.js';
export type {
  LanguageSwitcherProps,
  LanguageSwitcherVariant,
} from './components/LanguageSwitcher.js';

// Hooks
export { useTranslations } from './hooks/use-translations.js';
export { useTranslation } from './hooks/use-translation.js';

// Build-time loader
export {
  loadTranslations,
  loadAllTranslations,
} from './loader.js';
export type { LoaderConfig } from './loader.js';

// Re-export client for convenience
export { LangSyncClient } from '@langsync/client';
export type { ClientConfig } from '@langsync/client';

// Re-export core types
export type {
  Project,
  TranslationKey,
  Language,
  TranslationDictionary,
  TranslationObject,
  LangSyncConfig,
} from '@langsync/core';
