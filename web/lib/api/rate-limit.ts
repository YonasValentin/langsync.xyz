/**
 * Simple in-memory rate limiter for API routes.
 *
 * Uses a sliding-window counter per IP address. This works well for single-instance
 * deployments. For multi-instance setups, replace with Redis-backed rate limiting.
 */

import { NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Prune expired entries every 60 seconds to prevent memory leaks
const PRUNE_INTERVAL = 60_000;
let lastPrune = Date.now();

function prune() {
  const now = Date.now();
  if (now - lastPrune < PRUNE_INTERVAL) return;
  lastPrune = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window. Default: 60 */
  limit?: number;
  /** Window size in seconds. Default: 60 */
  windowSeconds?: number;
}

/**
 * Check rate limit for a request. Returns null if allowed, or a 429 response if exceeded.
 */
export function checkRateLimit(
  request: Request,
  options: RateLimitOptions = {}
): NextResponse | null {
  const { limit = 60, windowSeconds = 60 } = options;

  prune();

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const pathname = new URL(request.url).pathname;
  const key = `${ip}:${pathname}`;

  let entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }

  entry.count++;

  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { success: false, error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000)),
        },
      }
    );
  }

  return null;
}
