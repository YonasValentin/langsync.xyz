import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("env", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_POCKETBASE_URL", "http://test:8090");
    vi.stubEnv("POCKETBASE_ADMIN_EMAIL", "admin@test.com");
    vi.stubEnv("POCKETBASE_ADMIN_PASSWORD", "testpass");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_stripe");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("STRIPE_PRICE_ID_PRO", "price_pro");
    vi.stubEnv("STRIPE_PRICE_ID_TEAM", "price_team");
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("reads POCKETBASE_URL from env", async () => {
    const { env } = await import("./env");
    expect(env.POCKETBASE_URL).toBe("http://test:8090");
  });

  it("falls back to default when POCKETBASE_URL not set", async () => {
    vi.stubEnv("NEXT_PUBLIC_POCKETBASE_URL", "");
    const { env } = await import("./env");
    expect(env.POCKETBASE_URL).toBe("http://127.0.0.1:8090");
  });

  it("reads POCKETBASE_ADMIN_EMAIL", async () => {
    const { env } = await import("./env");
    expect(env.POCKETBASE_ADMIN_EMAIL).toBe("admin@test.com");
  });

  it("throws when POCKETBASE_ADMIN_EMAIL is missing", async () => {
    vi.stubEnv("POCKETBASE_ADMIN_EMAIL", "");
    const { env } = await import("./env");
    expect(() => env.POCKETBASE_ADMIN_EMAIL).toThrow(
      "Missing required environment variable: POCKETBASE_ADMIN_EMAIL"
    );
  });

  it("reads POCKETBASE_ADMIN_PASSWORD", async () => {
    const { env } = await import("./env");
    expect(env.POCKETBASE_ADMIN_PASSWORD).toBe("testpass");
  });

  it("throws when POCKETBASE_ADMIN_PASSWORD is missing", async () => {
    vi.stubEnv("POCKETBASE_ADMIN_PASSWORD", "");
    const { env } = await import("./env");
    expect(() => env.POCKETBASE_ADMIN_PASSWORD).toThrow(
      "Missing required environment variable: POCKETBASE_ADMIN_PASSWORD"
    );
  });

  it("reads OPENAI_API_KEY", async () => {
    const { env } = await import("./env");
    expect(env.OPENAI_API_KEY).toBe("sk-test-key");
  });

  it("throws when OPENAI_API_KEY is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const { env } = await import("./env");
    expect(() => env.OPENAI_API_KEY).toThrow(
      "Missing required environment variable: OPENAI_API_KEY"
    );
  });

  it("isCloud returns true when NEXT_PUBLIC_LANGSYNC_CLOUD is 'true'", async () => {
    vi.stubEnv("NEXT_PUBLIC_LANGSYNC_CLOUD", "true");
    const { env } = await import("./env");
    expect(env.isCloud).toBe(true);
  });

  it("isCloud returns false when not set", async () => {
    vi.stubEnv("NEXT_PUBLIC_LANGSYNC_CLOUD", "");
    const { env } = await import("./env");
    expect(env.isCloud).toBe(false);
  });

  it("reads Stripe keys", async () => {
    const { env } = await import("./env");
    expect(env.STRIPE_SECRET_KEY).toBe("sk_test_stripe");
    expect(env.STRIPE_WEBHOOK_SECRET).toBe("whsec_test");
    expect(env.STRIPE_PRICE_ID_PRO).toBe("price_pro");
    expect(env.STRIPE_PRICE_ID_TEAM).toBe("price_team");
  });

  it("reads NODE_ENV", async () => {
    const { env } = await import("./env");
    expect(env.NODE_ENV).toBe("test");
  });

  it("isProduction returns false in test", async () => {
    const { env } = await import("./env");
    expect(env.isProduction).toBe(false);
  });

  it("isProduction returns true when NODE_ENV is production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { env } = await import("./env");
    expect(env.isProduction).toBe(true);
  });

  it("NODE_ENV falls back to development", async () => {
    vi.stubEnv("NODE_ENV", "");
    const { env } = await import("./env");
    expect(env.NODE_ENV).toBe("development");
  });
});
