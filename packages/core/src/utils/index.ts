/**
 * Core utility functions for LangSync
 * @packageDocumentation
 */

import type { TranslationDictionary, TranslationObject } from '../types/index.js';

/**
 * Flattens a nested translation object into a flat dictionary
 * @param obj - Nested translation object
 * @param prefix - Key prefix for nested properties
 * @returns Flattened translation dictionary
 *
 * @example
 * ```ts
 * const nested = { hero: { title: 'Welcome', subtitle: 'Get started' } }
 * const flat = flattenTranslations(nested)
 * // Returns: { 'hero.title': 'Welcome', 'hero.subtitle': 'Get started' }
 * ```
 */
export function flattenTranslations(
  obj: TranslationObject,
  prefix: string = ''
): TranslationDictionary {
  const result: TranslationDictionary = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      result[newKey] = value;
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(result, flattenTranslations(value, newKey));
    }
  }

  return result;
}

/**
 * Converts a flat translation dictionary into a nested object
 * @param dict - Flat translation dictionary
 * @returns Nested translation object
 *
 * @example
 * ```ts
 * const flat = { 'hero.title': 'Welcome', 'hero.subtitle': 'Get started' }
 * const nested = unflattenTranslations(flat)
 * // Returns: { hero: { title: 'Welcome', subtitle: 'Get started' } }
 * ```
 */
export function unflattenTranslations(
  dict: TranslationDictionary
): TranslationObject {
  const result: TranslationObject = {};

  for (const [key, value] of Object.entries(dict)) {
    const keys = key.split('.');
    let current: TranslationObject | string = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];

      // Type guard: ensure current is an object
      if (typeof current !== 'object' || current === null) {
        throw new Error(
          `Cannot create nested structure: key "${k}" conflicts with existing string value`
        );
      }

      if (!(k in current)) {
        current[k] = {};
      }
      current = current[k];
    }

    // Type guard for final assignment
    if (typeof current !== 'object' || current === null) {
      throw new Error(
        `Cannot assign value: key path conflicts with existing string value`
      );
    }

    current[keys[keys.length - 1]] = value;
  }

  return result;
}

/**
 * Gets a nested property value using dot notation
 * @param obj - Translation object
 * @param path - Dot-separated path
 * @param fallback - Fallback value if path not found
 * @returns Translation string or fallback
 *
 * @example
 * ```ts
 * const obj = { hero: { title: 'Welcome' } }
 * getNestedValue(obj, 'hero.title') // Returns: 'Welcome'
 * getNestedValue(obj, 'hero.missing', 'Default') // Returns: 'Default'
 * ```
 */
export function getNestedValue(
  obj: TranslationObject,
  path: string,
  fallback?: string
): string | undefined {
  const keys = path.split('.');
  let current: TranslationObject | string = obj;

  for (const key of keys) {
    // Type guard: can only traverse objects
    if (typeof current !== 'object' || current === null) {
      return fallback;
    }
    current = current[key];

    // Check if the value is undefined
    if (current === undefined) {
      return fallback;
    }
  }

  return typeof current === 'string' ? current : fallback;
}

/**
 * Validates a language code according to BCP 47 / ISO 639
 * @param code - Language code to validate
 * @returns True if valid language code
 *
 * @example
 * ```ts
 * isValidLanguageCode('en')        // true
 * isValidLanguageCode('en-US')     // true
 * isValidLanguageCode('zh-Hans')   // true
 * isValidLanguageCode('en-GB-oxendict') // true
 * isValidLanguageCode('invalid!')  // false
 * ```
 */
export function isValidLanguageCode(code: string): boolean {
  // More permissive regex supporting BCP 47 language tags
  // Format: language[-script][-region][-variant]
  // Examples: en, en-US, zh-Hans, en-GB-oxendict
  return /^[a-z]{2,3}(-[A-Z][a-z]{3})?(-[A-Z]{2})?(-[a-z]+)?$/i.test(code);
}

/**
 * Normalizes a language code to lowercase
 * @param code - Language code
 * @returns Normalized language code
 *
 * @example
 * ```ts
 * normalizeLanguageCode('EN-US') // Returns: 'en-us'
 * normalizeLanguageCode('fr') // Returns: 'fr'
 * ```
 */
export function normalizeLanguageCode(code: string): string {
  return code.toLowerCase();
}

/**
 * Interpolates variables in a translation string
 * @param template - Translation string with {{variable}} placeholders
 * @param variables - Object with variable values
 * @returns Interpolated string
 * @throws {TypeError} If template is not a string
 *
 * @example
 * ```ts
 * interpolate('Hello {{name}}!', { name: 'World' })
 * // Returns: 'Hello World!'
 * ```
 */
export function interpolate(
  template: string,
  variables: Record<string, string | number>
): string {
  // Input validation
  if (typeof template !== 'string') {
    throw new TypeError(
      `interpolate expects a string template, received ${typeof template}`
    );
  }

  if (!variables || typeof variables !== 'object') {
    return template;
  }

  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return key in variables ? String(variables[key]) : match;
  });
}

/**
 * Creates a type-safe translation key builder
 * @param prefix - Prefix for all keys
 * @returns Function that builds prefixed keys
 *
 * @example
 * ```ts
 * const buildKey = createKeyBuilder('auth')
 * buildKey('login.title') // Returns: 'auth.login.title'
 * ```
 */
export function createKeyBuilder(prefix: string) {
  return (key: string): string => {
    return prefix ? `${prefix}.${key}` : key;
  };
}
