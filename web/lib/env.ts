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

export const env = {
  /** PocketBase server URL */
  POCKETBASE_URL: optional(
    "NEXT_PUBLIC_POCKETBASE_URL",
    "http://127.0.0.1:8090"
  ),

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

  /** Whether this is the managed cloud deployment (enables billing/limits) */
  get isCloud(): boolean {
    return process.env.NEXT_PUBLIC_LANGSYNC_CLOUD === "true";
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
};
