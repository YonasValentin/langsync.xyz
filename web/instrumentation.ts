export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = async (...args: unknown[]) => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    const { captureRequestError } = await import("@sentry/nextjs");
    // @ts-expect-error - Sentry types may not match Next.js signature exactly
    captureRequestError(...args);
  }
};
