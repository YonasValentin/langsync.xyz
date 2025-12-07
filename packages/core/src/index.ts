/**
 * @langsync/core
 *
 * Core types, constants, and utilities for LangSync translation management.
 * This package provides the foundation for all LangSync packages.
 *
 * @packageDocumentation
 */

// Export types
export type {
  Project,
  TranslationKey,
  Language,
  Namespace,
  TranslationDictionary,
  TranslationObject,
  LangSyncConfig,
  ApiResponse,
  FetchOptions,
} from './types/index.js';

// Export constants
export {
  DEFAULT_API_URL,
  DEFAULT_CACHE_TTL,
  DEFAULT_TIMEOUT,
  SUPPORTED_LANGUAGES,
  LANGUAGE_MAP,
  ENDPOINTS,
} from './constants/index.js';

// Export utilities
export {
  flattenTranslations,
  unflattenTranslations,
  getNestedValue,
  isValidLanguageCode,
  normalizeLanguageCode,
  interpolate,
  createKeyBuilder,
} from './utils/index.js';
