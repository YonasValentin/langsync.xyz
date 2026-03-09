/**
 * Rate limiter for API routes with in-memory and Redis backends.
 *
 * Uses a sliding-window counter per IP address.
 * - In-memory: default, works for single-instance deployments.
 * - Redis: set REDIS_URL env var for multi-instance deployments.
 */

import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// In-Memory Backend
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const MAX_STORE_SIZE = 10_000;
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
  if (store.size > MAX_STORE_SIZE) {
    const excess = store.size - MAX_STORE_SIZE;
    const iterator = store.keys();
    for (let i = 0; i < excess; i++) {
      const key = iterator.next().value;
      if (key) store.delete(key);
    }
  }
}

function checkMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; resetAt: number; count: number } {
  prune();
  const now = Date.now();

  let entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }

  entry.count++;

  return {
    allowed: entry.count <= limit,
    resetAt: entry.resetAt,
    count: entry.count,
  };
}

// ---------------------------------------------------------------------------
// Redis Backend (optional — activated when REDIS_URL is set)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redisClient: any = null;
let redisInitAttempted = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getRedisClient(): Promise<any> {
  if (redisInitAttempted) return redisClient;
  redisInitAttempted = true;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    const { default: Redis } = await import("ioredis");
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 3000,
    });
    await redisClient.connect();
    return redisClient;
  } catch {
    // Redis unavailable — fall back to in-memory
    redisClient = null;
    return null;
  }
}

async function checkRedisRateLimit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  redis: any,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; resetAt: number; count: number }> {
  const redisKey = `rl:${key}`;
  const now = Date.now();

  const multi = redis.multi();
  multi.incr(redisKey);
  multi.pttl(redisKey);
  const results = await multi.exec();

  const count = (results?.[0]?.[1] as number) || 1;
  const ttl = (results?.[1]?.[1] as number) || -1;

  // Set expiry on first request in window
  if (count === 1 || ttl === -1) {
    await redis.pexpire(redisKey, windowSeconds * 1000);
  }

  const resetAt = ttl > 0 ? now + ttl : now + windowSeconds * 1000;

  return { allowed: count <= limit, resetAt, count };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window. Default: 60 */
  limit?: number;
  /** Window size in seconds. Default: 60 */
  windowSeconds?: number;
}

/**
 * Check rate limit for a request. Returns null if allowed, or a 429 response if exceeded.
 *
 * Automatically uses Redis when REDIS_URL is set, otherwise falls back to in-memory.
 */
export async function checkRateLimit(
  request: Request,
  options: RateLimitOptions = {}
): Promise<NextResponse | null> {
  const { limit = 60, windowSeconds = 60 } = options;

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const pathname = new URL(request.url).pathname;
  const key = `${ip}:${pathname}`;

  let result: { allowed: boolean; resetAt: number; count: number };

  const redis = await getRedisClient();
  if (redis) {
    try {
      result = await checkRedisRateLimit(redis, key, limit, windowSeconds);
    } catch {
      // Redis error — fallback to in-memory
      result = checkMemoryRateLimit(key, limit, windowSeconds * 1000);
    }
  } else {
    result = checkMemoryRateLimit(key, limit, windowSeconds * 1000);
  }

  if (!result.allowed) {
    const now = Date.now();
    const retryAfter = Math.ceil((result.resetAt - now) / 1000);
    return NextResponse.json(
      { success: false, error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
        },
      }
    );
  }

  return null;
}
