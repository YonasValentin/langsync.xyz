/**
 * Core constants for LangSync
 * @packageDocumentation
 */

import type { Language } from '../types/index.js';

/**
 * Default API base URL for LangSync cloud
 */
export const DEFAULT_API_URL = 'https://api.langsync.xyz/v1';

/**
 * Default cache TTL in seconds (1 hour)
 */
export const DEFAULT_CACHE_TTL = 3600;

/**
 * Default request timeout in milliseconds
 */
export const DEFAULT_TIMEOUT = 10000;

/**
 * Supported languages with metadata
 */
export const SUPPORTED_LANGUAGES: readonly Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', direction: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'ltr' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', direction: 'ltr' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', direction: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', direction: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', direction: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', direction: 'rtl' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', direction: 'ltr' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', direction: 'ltr' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', direction: 'ltr' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', direction: 'ltr' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', direction: 'ltr' },
] as const;

/**
 * Language code to metadata map
 */
export const LANGUAGE_MAP = new Map<string, Language>(
  SUPPORTED_LANGUAGES.map(lang => [lang.code, lang])
);

/**
 * API endpoints
 */
export const ENDPOINTS = {
  /** Get project details */
  PROJECT: '/projects/:projectId',
  /** Get all translations for a project */
  TRANSLATIONS: '/projects/:projectId/translations',
  /** Get translations for a specific language */
  LANGUAGE_TRANSLATIONS: '/projects/:projectId/translations/:language',
  /** Get translation keys */
  KEYS: '/projects/:projectId/keys',
} as const;
