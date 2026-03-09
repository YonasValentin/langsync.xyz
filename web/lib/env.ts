/**
 * Environment variable validation.
 *
 * Validates required environment variables at build/startup time
 * so misconfigurations fail fast rather than at request time.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `See .env.local.example for the full list.`
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

function requiredUrl(name: string): string {
  const value = required(name);
  try {
    new URL(value);
  } catch {
    throw new Error(
      `Invalid URL in environment variable ${name}: "${value}". ` +
        `Must be a valid URL (e.g., https://example.com).`
    );
  }
  return value;
}

export const env = {
  /**
   * PocketBase server URL.
   * In production, this must be explicitly set — no localhost fallback.
   */
  get POCKETBASE_URL(): string {
    if (process.env.NODE_ENV === "production") {
      return requiredUrl("NEXT_PUBLIC_POCKETBASE_URL");
    }
    return process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090";
  },

  /** PocketBase superuser email (server-side only, for admin API access) */
  get POCKETBASE_ADMIN_EMAIL(): string {
    return required("POCKETBASE_ADMIN_EMAIL");
  },

  /** PocketBase superuser password (server-side only) */
  get POCKETBASE_ADMIN_PASSWORD(): string {
    return required("POCKETBASE_ADMIN_PASSWORD");
  },

  /** Whether AI translation features are enabled */
  get isAiEnabled(): boolean {
    return process.env.NEXT_PUBLIC_ENABLE_AI === "true";
  },

  /** OpenAI API key for AI translations (server-side only, required when AI is enabled) */
  get OPENAI_API_KEY(): string {
    if (!this.isAiEnabled) return "";
    return required("OPENAI_API_KEY");
  },

  /** OpenAI model to use for translations (configurable for model upgrades) */
  get OPENAI_MODEL(): string {
    return process.env.OPENAI_MODEL || "gpt-4-turbo";
  },

  /** Whether this is the managed cloud deployment (enables billing/limits) */
  get isCloud(): boolean {
    return process.env.NEXT_PUBLIC_LANGSYNC_CLOUD === "true";
  },

  /**
   * Application URL for Stripe redirects and external links.
   * Required in cloud mode. Falls back to localhost in development.
   */
  get APP_URL(): string {
    if (this.isCloud) {
      return requiredUrl("NEXT_PUBLIC_APP_URL");
    }
    return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  },

  /** Stripe secret key (server-side only, required in cloud mode) */
  get STRIPE_SECRET_KEY(): string {
    if (!this.isCloud) return "";
    return required("STRIPE_SECRET_KEY");
  },

  /** Stripe webhook signing secret (server-side only) */
  get STRIPE_WEBHOOK_SECRET(): string {
    if (!this.isCloud) return "";
    return required("STRIPE_WEBHOOK_SECRET");
  },

  /** Stripe price ID for Pro plan */
  get STRIPE_PRICE_ID_PRO(): string {
    if (!this.isCloud) return "";
    return required("STRIPE_PRICE_ID_PRO");
  },

  /** Stripe price ID for Team plan */
  get STRIPE_PRICE_ID_TEAM(): string {
    if (!this.isCloud) return "";
    return required("STRIPE_PRICE_ID_TEAM");
  },

  /** Current environment */
  NODE_ENV: optional("NODE_ENV", "development"),

  /** Whether we are in production */
  get isProduction(): boolean {
    return this.NODE_ENV === "production";
  },

  /**
   * Eagerly validate all required environment variables.
   * Call this at startup to fail fast on misconfiguration.
   */
  validate(): void {
    // Always required in production
    if (this.isProduction) {
      this.POCKETBASE_URL;
    }

    // Validate AI config if enabled
    if (this.isAiEnabled) {
      this.OPENAI_API_KEY;
    }

    // Validate Stripe config if cloud mode
    if (this.isCloud) {
      this.APP_URL;
      this.STRIPE_SECRET_KEY;
      this.STRIPE_WEBHOOK_SECRET;
      this.STRIPE_PRICE_ID_PRO;
      this.STRIPE_PRICE_ID_TEAM;
    }
  },
};
