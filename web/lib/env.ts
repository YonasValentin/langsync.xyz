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

  /** OpenAI API key for AI translations (server-side only) */
  get OPENAI_API_KEY(): string {
    return required("OPENAI_API_KEY");
  },

  /** Current environment */
  NODE_ENV: optional("NODE_ENV", "development"),

  /** Whether we are in production */
  get isProduction(): boolean {
    return this.NODE_ENV === "production";
  },
};
