/**
 * PocketBase filter value sanitization utilities.
 *
 * PocketBase uses a SQL-like filter syntax where values are wrapped in double quotes.
 * Without sanitization, user input containing `"` or `||` could escape the value
 * and inject arbitrary filter logic (similar to SQL injection).
 */

/**
 * Escape a string value for safe use inside PocketBase filter expressions.
 * Escapes backslashes first, then double quotes.
 *
 * Usage:
 *   filter: `apiKey = "${escapeFilterValue(apiKey)}"`
 */
export function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Validate that a string matches PocketBase's 15-character record ID format.
 * PocketBase IDs are alphanumeric strings of exactly 15 characters.
 */
export function isValidRecordId(id: string): boolean {
  return /^[a-zA-Z0-9]{15}$/.test(id);
}

/**
 * Validate that a string looks like an API key (64 alphanumeric chars).
 */
export function isValidApiKey(key: string): boolean {
  return /^[a-zA-Z0-9]{64}$/.test(key);
}

/**
 * Validate that a string is a valid BCP 47-style language code (e.g., "en", "pt-BR").
 */
export function isValidLanguageCode(code: string): boolean {
  return /^[a-z]{2,3}(-[A-Z][a-zA-Z]{1,7})?$/.test(code);
}
