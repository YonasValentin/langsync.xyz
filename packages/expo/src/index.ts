/**
 * LangSync Expo - Translation management for React Native/Expo apps
 *
 * @example
 * ```tsx
 * import { TranslationProvider, useTranslations } from '@langsync/expo';
 *
 * function App() {
 *   return (
 *     <TranslationProvider
 *       config={{
 *         apiKey: process.env.EXPO_PUBLIC_PHRASEFLOW_API_KEY!,
 *         projectId: process.env.EXPO_PUBLIC_PHRASEFLOW_PROJECT_ID!,
 *         defaultLanguage: 'en',
 *         languages: ['en', 'es', 'fr'],
 *         strategy: 'runtime',
 *       }}
 *     >
 *       <MyApp />
 *     </TranslationProvider>
 *   );
 * }
 *
 * function MyComponent() {
 *   const t = useTranslations();
 *   return <Text>{t('welcome.title')}</Text>;
 * }
 * ```
 */

// Re-export core types and utilities
export type { TranslationDictionary } from '@langsync/core';

// Configuration
export type {
  LangSyncExpoConfig,
  LoadingStrategy,
  TranslationLoader,
} from './config.js';
export { createLoader, validateConfig } from './config.js';

// React Context & Provider
export type {
  TranslationContextValue,
  TranslationProviderProps,
} from './context.js';
export { TranslationProvider, useTranslationContext } from './context.js';

// React Hooks
export type { TranslationOptions } from './hooks/use-translations.js';
export type { LanguageHookResult } from './hooks/use-language.js';
export {
  useTranslations,
  useTranslation,
  useLanguage,
} from './hooks/index.js';

// UI Components
export {
  LanguageSwitcher,
} from './components/LanguageSwitcher.js';
export type {
  LanguageSwitcherProps,
  LanguageSwitcherVariant,
} from './components/LanguageSwitcher.js';

// Utilities
export {
  // RTL utilities
  isRTLLanguage,
  getCurrentDirection,
  isDirectionMatching,
  shouldForceRTL,
  applyRTLIfNeeded,
  resetToLTR,
  isRTLSupported,
  // Storage utilities
  saveLanguagePreference,
  getLanguagePreference,
  clearLanguagePreference,
  hasLanguagePreference,
} from './utils/index.js';

// Loaders (for advanced usage)
export { RuntimeLoader } from './loader/runtime.js';
export { BundledLoader } from './loader/bundled.js';
export { HybridLoader } from './loader/hybrid.js';

// Storage and cache (for advanced usage)
export { TranslationCache } from './storage/cache.js';
