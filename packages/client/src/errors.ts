/**
 * Custom error classes for LangSync client
 */

export class LangSyncError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'LangSyncError';
    Object.setPrototypeOf(this, LangSyncError.prototype);
  }
}

export class AuthenticationError extends LangSyncError {
  constructor(message: string = 'Invalid API key') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class NotFoundError extends LangSyncError {
  constructor(
    message: string = 'Resource not found',
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class RateLimitError extends LangSyncError {
  constructor(
    message: string = 'Rate limit exceeded',
    public readonly retryAfter?: number
  ) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class NetworkError extends LangSyncError {
  constructor(message: string, public readonly originalError?: Error) {
    super(message, undefined, 'NETWORK_ERROR');
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}
