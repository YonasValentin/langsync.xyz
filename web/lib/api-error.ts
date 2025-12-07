/**
 * Custom error class for API errors with additional context
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string,
    public method?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }

  /**
   * Get a user-friendly error message
   */
  getUserMessage(): string {
    // Map common status codes to user-friendly messages
    switch (this.statusCode) {
      case 400:
        return this.message || "Invalid request. Please check your input."
      case 401:
        return "Your session has expired. Please log in again."
      case 403:
        return "You don't have permission to perform this action."
      case 404:
        return "The requested resource was not found."
      case 409:
        return this.message || "This action conflicts with existing data."
      case 422:
        return this.message || "Validation failed. Please check your input."
      case 500:
        return "An unexpected error occurred. Please try again later."
      case 502:
      case 503:
        return "The service is temporarily unavailable. Please try again later."
      default:
        return this.message || "An error occurred. Please try again."
    }
  }

  /**
   * Get developer-friendly context for logging
   */
  getDebugContext() {
    return {
      message: this.message,
      statusCode: this.statusCode,
      endpoint: this.endpoint,
      method: this.method,
      details: this.details,
    }
  }
}
