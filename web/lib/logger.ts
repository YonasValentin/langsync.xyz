/**
 * Structured logger with Sentry integration.
 *
 * Sentry is used when NEXT_PUBLIC_SENTRY_DSN is configured.
 * Falls back to JSON-structured console logging otherwise.
 */

import * as Sentry from "@sentry/nextjs"

type LogLevel = "info" | "warn" | "error"

interface LogContext {
  [key: string]: unknown
}

const sentryEnabled = !!process.env.NEXT_PUBLIC_SENTRY_DSN

class Logger {
  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString()
    const logData = {
      timestamp,
      level,
      message,
      ...context,
    }

    if (process.env.NODE_ENV === "development") {
      const consoleMethod = level === "error" ? console.error : level === "warn" ? console.warn : console.log
      consoleMethod(`[${level.toUpperCase()}]`, message, context || "")
      return
    }

    // Production: structured JSON logging
    console.log(JSON.stringify(logData))

    // Report errors and warnings to Sentry
    if (sentryEnabled) {
      if (level === "error") {
        Sentry.captureException(new Error(message), {
          extra: context,
        })
      } else if (level === "warn") {
        Sentry.captureMessage(message, {
          level: "warning",
          extra: context,
        })
      }
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
