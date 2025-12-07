/**
 * Simple structured logger for the application
 * Can be extended to integrate with error tracking services like Sentry
 */

type LogLevel = "info" | "warn" | "error"

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString()
    const logData = {
      timestamp,
      level,
      message,
      ...context,
    }

    // In development, use console for better DX
    if (process.env.NODE_ENV === "development") {
      const consoleMethod = level === "error" ? console.error : level === "warn" ? console.warn : console.log
      consoleMethod(`[${level.toUpperCase()}]`, message, context || "")
    } else {
      // In production, log as JSON for log aggregation services
      console.log(JSON.stringify(logData))

      // TODO: Integrate with error tracking service (Sentry, LogRocket, etc.)
      // if (level === "error") {
      //   Sentry.captureException(new Error(message), { extra: context })
      // }
    }
  }

  info(message: string, context?: LogContext) {
    this.log("info", message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log("warn", message, context)
  }

  error(message: string, context?: LogContext) {
    this.log("error", message, context)
  }
}

export const logger = new Logger()
