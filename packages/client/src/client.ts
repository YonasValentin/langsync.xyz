/**
 * LangSync API Client
 */

import type {
  Project,
  TranslationKey,
  TranslationDictionary,
  LangSyncConfig,
  ApiResponse,
  FetchOptions,
} from '@langsync/core';

import {
  DEFAULT_API_URL,
  DEFAULT_CACHE_TTL,
  DEFAULT_TIMEOUT,
  ENDPOINTS,
} from '@langsync/core';

import { Cache } from './cache.js';
import {
  LangSyncError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  NetworkError,
} from './errors.js';

export interface ClientConfig extends Partial<LangSyncConfig> {
  apiKey: string;
  projectId: string;
  baseUrl?: string;
  timeout?: number;
  cacheTTL?: number;
  retries?: number;
}

export class LangSyncClient {
  private readonly apiKey: string;
  private readonly projectId: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retries: number;
  private readonly cache: Cache;
  private readonly inflightRequests: Map<string, Promise<ApiResponse<unknown>>>;

  constructor(config: ClientConfig) {
    if (!config.apiKey) {
      throw new LangSyncError('API key is required');
    }
    if (!config.projectId) {
      throw new LangSyncError('Project ID is required');
    }

    this.apiKey = config.apiKey;
    this.projectId = config.projectId;
    this.baseUrl = config.baseUrl ?? DEFAULT_API_URL;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.retries = config.retries ?? 3;
    this.cache = new Cache(config.cacheTTL ?? DEFAULT_CACHE_TTL);
    this.inflightRequests = new Map();
  }

  /**
   * Fetches project metadata
   */
  async getProject(options?: FetchOptions): Promise<Project> {
    const cacheKey = `project:${this.projectId}`;

    if (!options?.refresh) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;
    }

    const endpoint = ENDPOINTS.PROJECT.replace(':projectId', this.projectId);
    const response = await this.request<Project>(endpoint, options);

    this.cache.set(cacheKey, response.data);
    return response.data;
  }

  /**
   * Fetches all translations for the project
   */
  async getTranslations(options?: FetchOptions): Promise<TranslationKey[]> {
    const cacheKey = `translations:${this.projectId}`;

    if (!options?.refresh) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;
    }

    const endpoint = ENDPOINTS.TRANSLATIONS.replace(':projectId', this.projectId);
    const response = await this.request<TranslationKey[]>(endpoint, options);

    this.cache.set(cacheKey, response.data);
    return response.data;
  }

  /**
   * Fetches translations for a specific language
   */
  async getLanguageTranslations(
    language: string,
    options?: FetchOptions
  ): Promise<TranslationDictionary> {
    const cacheKey = `translations:${this.projectId}:${language}`;

    if (!options?.refresh) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;
    }

    const endpoint = ENDPOINTS.LANGUAGE_TRANSLATIONS
      .replace(':projectId', this.projectId)
      .replace(':language', language);

    const response = await this.request<TranslationDictionary>(endpoint, options);

    this.cache.set(cacheKey, response.data);
    return response.data;
  }

  /**
   * Builds all translations into a nested structure by language
   * Pass a `languages` array to limit the fetch to a subset of project locales.
   */
  async getAllTranslations(
    options?: FetchOptions & { languages?: string[] }
  ): Promise<Record<string, TranslationDictionary>> {
    const fetchOptions: FetchOptions | undefined = options
      ? {
          refresh: options.refresh,
          timeout: options.timeout,
          signal: options.signal,
        }
      : undefined;

    const languagesToFetch =
      options?.languages && options.languages.length > 0
        ? options.languages
        : (await this.getProject(fetchOptions)).languages;

    const allTranslations: Record<string, TranslationDictionary> = {};

    // Fetch translations for each language in parallel
    await Promise.all(
      languagesToFetch.map(async (language) => {
        allTranslations[language] = await this.getLanguageTranslations(
          language,
          fetchOptions
        );
      })
    );

    return allTranslations;
  }

  /**
   * Clears the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics
   */
  getCacheSize(): number {
    return this.cache.size();
  }

  /**
   * Makes an HTTP request to the API
   * Implements request deduplication to prevent multiple concurrent requests for the same endpoint
   */
  private async request<T>(
    endpoint: string,
    options?: FetchOptions,
    attempt: number = 1
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    // Request deduplication: check if an identical request is already in flight
    // Skip deduplication if this is a retry or if refresh is explicitly requested
    if (attempt === 1 && !options?.refresh) {
      const existingRequest = this.inflightRequests.get(endpoint);
      if (existingRequest) {
        // Cast is safe because we know the endpoint will return the same type
        return existingRequest as Promise<ApiResponse<T>>;
      }
    }

    const timeoutController = new AbortController();
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      timeoutController.abort();
    }, this.timeout);

    const { signal, cleanup } = this.composeSignals(
      timeoutController.signal,
      options?.signal
    );

    // Create the request promise
    const requestPromise = (async () => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-LangSync-Client': '@langsync/client',
        },
        signal,
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data: ApiResponse<T> = await response.json();

      if (!data.success) {
        throw new LangSyncError(
          data.error ?? 'Request failed',
          response.status
        );
      }

      return data;
    } catch (error) {
      // Handle abort/timeout
      if (error instanceof Error && error.name === 'AbortError') {
        const abortedByCaller = options?.signal?.aborted && !timedOut;
        if (abortedByCaller) {
          throw new NetworkError('Request aborted by caller', error);
        }
        if (attempt < this.retries) {
          return this.request<T>(endpoint, options, attempt + 1);
        }
        throw new NetworkError('Request timeout', error);
      }

      // Handle network errors
      if (error instanceof TypeError) {
        if (attempt < this.retries) {
          return this.request<T>(endpoint, options, attempt + 1);
        }
        throw new NetworkError('Network error', error);
      }

      throw error;
    } finally {
      // ALWAYS cleanup resources, regardless of success or failure
      clearTimeout(timeoutId);
      cleanup();
    }
    })();

    // Store the request promise for deduplication (only for initial attempts)
    if (attempt === 1 && !options?.refresh) {
      this.inflightRequests.set(endpoint, requestPromise as Promise<ApiResponse<unknown>>);
    }

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Always remove from inflight requests when complete
      if (attempt === 1 && !options?.refresh) {
        this.inflightRequests.delete(endpoint);
      }
    }
  }

  /**
   * Handles error responses
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    const contentType = response.headers.get('content-type');
    const fallbackMessage =
      response.status === 404
        ? 'Resource not found'
        : response.statusText || 'Request failed';
    let errorMessage: string | undefined;
    let errorMetadata: Record<string, unknown> | undefined;

    if (contentType?.includes('application/json')) {
      try {
        const json = await response.json();

        if (json && typeof json === 'object' && !Array.isArray(json)) {
          const { error, message, ...rest } = json as Record<string, unknown> & {
            error?: unknown;
            message?: unknown;
          };

          if (typeof error === 'string') {
            errorMessage = error;
          } else if (typeof message === 'string') {
            errorMessage = message;
          }

          if (Object.keys(rest).length > 0) {
            errorMetadata = rest;
          }
        } else if (typeof json === 'string') {
          errorMessage = json;
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    const resolvedMessage = errorMessage?.trim()
      ? errorMessage
      : fallbackMessage;

    switch (response.status) {
      case 401:
        throw new AuthenticationError(resolvedMessage);
      case 404:
        // TODO: Add client-level tests for 404 responses once a harness exists.
        throw new NotFoundError(resolvedMessage, errorMetadata);
      case 429:
        const retryAfter = response.headers.get('Retry-After');
        throw new RateLimitError(
          resolvedMessage,
          retryAfter ? parseInt(retryAfter, 10) : undefined
        );
      default:
        throw new LangSyncError(resolvedMessage, response.status);
    }
  }

  private composeSignals(
    timeoutSignal: AbortSignal,
    externalSignal?: AbortSignal
  ): { signal: AbortSignal; cleanup: () => void } {
    if (!externalSignal) {
      return { signal: timeoutSignal, cleanup: () => {} };
    }

    if (typeof AbortSignal.any === 'function') {
      return {
        signal: AbortSignal.any([timeoutSignal, externalSignal]),
        cleanup: () => {},
      };
    }

    const controller = new AbortController();

    let timeoutListener: (() => void) | undefined;
    let externalListener: (() => void) | undefined;

    const cleanup = () => {
      if (timeoutListener) {
        timeoutSignal.removeEventListener('abort', timeoutListener);
        timeoutListener = undefined;
      }
      if (externalListener) {
        externalSignal.removeEventListener('abort', externalListener);
        externalListener = undefined;
      }
    };

    const abortFrom = (source: AbortSignal) => {
      cleanup();
      if (!controller.signal.aborted) {
        try {
          controller.abort(source.reason);
        } catch {
          controller.abort();
        }
      }
    };

    timeoutListener = () => abortFrom(timeoutSignal);
    externalListener = () => abortFrom(externalSignal);

    if (timeoutSignal.aborted) {
      abortFrom(timeoutSignal);
    } else if (externalSignal.aborted) {
      abortFrom(externalSignal);
    } else {
      timeoutSignal.addEventListener('abort', timeoutListener);
      externalSignal.addEventListener('abort', externalListener);
    }

    return { signal: controller.signal, cleanup };
  }
}
