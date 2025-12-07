/**
 * Core types for LangSync translation management
 * @packageDocumentation
 */

/**
 * Represents a translation project
 */
export interface Project {
  /** Unique project identifier */
  id: string;
  /** Project name */
  name: string;
  /** Project description */
  description: string;
  /** Array of supported language codes (ISO 639-1) */
  languages: string[];
  /** Default/source language code */
  defaultLanguage: string;
  /** Project creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Represents a translation key with its translations across languages
 */
export interface TranslationKey {
  /** Unique key identifier */
  id: string;
  /** Associated project ID */
  projectId: string;
  /** Translation key (e.g., "hero.title") */
  key: string;
  /** Optional description/context for translators */
  description?: string;
  /** Map of language codes to translation strings */
  translations: Record<string, string>;
  /** Key creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Language metadata
 */
export interface Language {
  /** ISO 639-1 language code */
  code: string;
  /** English name of the language */
  name: string;
  /** Native name of the language */
  nativeName: string;
  /** Text direction */
  direction: 'ltr' | 'rtl';
}

/**
 * Translation namespace for organizing keys
 */
export interface Namespace {
  /** Namespace identifier */
  id: string;
  /** Namespace name (e.g., "common", "errors") */
  name: string;
  /** Nested keys within this namespace */
  keys: string[];
}

/**
 * Flattened translation dictionary
 */
export type TranslationDictionary = Record<string, string>;

/**
 * Nested translation object structure
 */
export type TranslationObject = {
  [key: string]: string | TranslationObject;
};

/**
 * Configuration for LangSync client
 */
export interface LangSyncConfig {
  /** API key for authentication */
  apiKey: string;
  /** Project ID */
  projectId: string;
  /** Default language */
  defaultLanguage: string;
  /** Supported languages */
  languages: string[];
  /** Base URL for API (optional, for self-hosted) */
  baseUrl?: string;
  /** Cache TTL in seconds */
  cacheTTL?: number;
  /** Enable fallback to default language */
  fallbackToDefault?: boolean;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  /** Response data */
  data: T;
  /** Request success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Response metadata */
  meta?: {
    /** Total count for paginated results */
    total?: number;
    /** Current page */
    page?: number;
    /** Items per page */
    perPage?: number;
  };
}

/**
 * Fetch options for translations
 */
export interface FetchOptions {
  /** Force refresh cache */
  refresh?: boolean;
  /** Custom fetch timeout in ms */
  timeout?: number;
  /** Request signal for cancellation */
  signal?: AbortSignal;
}
