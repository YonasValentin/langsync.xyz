/**
 * Lightweight server-side session authentication for API routes.
 *
 * Parses the pb_auth cookie and validates the JWT structure + expiry.
 * Used by Stripe checkout/portal routes that need to identify the caller
 * without requiring an API key.
 *
 * NOTE: This performs structural validation only (same as middleware.ts).
 * Full cryptographic verification happens via PocketBase when the token
 * is used in subsequent requests.
 */

import { logger } from "@/lib/logger";

interface SessionAuth {
  userId: string;
  token: string;
}

/**
 * Extract and validate user identity from the pb_auth cookie.
 * Returns null if the session is missing, malformed, or expired.
 */
export function authenticateSession(request: Request): SessionAuth | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const pbAuthMatch = cookieHeader.match(/pb_auth=([^;]+)/);
  if (!pbAuthMatch) return null;

  try {
    const data = JSON.parse(decodeURIComponent(pbAuthMatch[1]));

    const token = data.token;
    const userId = data.record?.id;

    if (!token || typeof token !== "string") return null;
    if (!userId || typeof userId !== "string") return null;

    // Basic JWT structure check
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Decode JWT payload (handle base64url encoding)
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));

    // Check token expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;

    return { userId, token };
  } catch (err) {
    logger.warn("Failed to parse session cookie", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
