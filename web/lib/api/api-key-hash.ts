/**
 * API key hashing utilities using Node.js built-in crypto.
 *
 * Uses SHA-256 for fast, constant-time API key lookups.
 * API keys are high-entropy random strings (64+ chars), so
 * a fast hash is appropriate — unlike passwords, they don't
 * need bcrypt/scrypt protection against brute-force.
 *
 * The prefix (first 8 chars) is stored in plaintext for display
 * purposes (e.g., "lsk_abc1..."). The full key is never stored.
 */

import { createHash, timingSafeEqual } from "crypto";

/**
 * Hash an API key for storage.
 * Returns a hex-encoded SHA-256 hash.
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Verify an API key against a stored hash using timing-safe comparison.
 */
export function verifyApiKey(key: string, storedHash: string): boolean {
  const candidateHash = hashApiKey(key);
  const a = Buffer.from(candidateHash, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Extract the display prefix from an API key.
 * Returns the first 8 characters for user-facing display.
 */
export function getKeyPrefix(key: string): string {
  return key.slice(0, 8);
}
