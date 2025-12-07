/**
 * Constants for LangSync Expo package
 */

/**
 * Languages that use Right-to-Left (RTL) text direction
 */
export const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur', 'yi'] as const;

/**
 * Default cache Time-To-Live in seconds (24 hours)
 */
export const DEFAULT_CACHE_TTL = 86400;

/**
 * Default AsyncStorage cache key prefix
 */
export const DEFAULT_CACHE_KEY = '@langsync';

/**
 * Default background sync setting
 */
export const DEFAULT_BACKGROUND_SYNC = true;

/**
 * Error messages
 */
export const ERRORS = {
  NO_PROVIDER: 'useTranslations must be used within a TranslationProvider',
  OFFLINE_NO_CACHE: 'Device is offline and no cached translations available',
  INVALID_LANGUAGE: 'Language is not available in configuration',
  BUNDLED_TRANSLATIONS_REQUIRED: 'bundledTranslations required for bundled/hybrid strategy',
  LOADER_CREATION_FAILED: 'Failed to create translation loader',
} as const;
