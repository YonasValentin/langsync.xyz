/**
 * @langsync/client
 *
 * API client for fetching translations from LangSync.
 * Supports both cloud and self-hosted installations.
 *
 * @packageDocumentation
 */

export { LangSyncClient } from './client.js';
export type { ClientConfig } from './client.js';

export { Cache } from './cache.js';

export {
  LangSyncError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  NetworkError,
} from './errors.js';
