/**
 * Server-side PocketBase client with superuser authentication.
 *
 * Used by API routes that need to bypass collection rules (e.g., v1 API
 * routes authenticating via API key rather than PocketBase session).
 *
 * IMPORTANT: Only import this file from server-side code (API routes,
 * server components). Never import from client components.
 */

import PocketBase from "pocketbase";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

let adminPb: PocketBase | null = null;
let authPromise: Promise<void> | null = null;
let startupValidated = false;

/**
 * Returns a PocketBase client authenticated as a superuser.
 * Caches the client and re-authenticates if the token has expired.
 */
export async function getAdminPb(): Promise<PocketBase> {
  // Return cached client if still valid
  if (adminPb && adminPb.authStore.isValid) {
    return adminPb;
  }

  // If another caller is already authenticating, wait for it
  if (authPromise) {
    await authPromise;
    if (adminPb && adminPb.authStore.isValid) {
      return adminPb;
    }
  }

  const pb = new PocketBase(env.POCKETBASE_URL);
  pb.autoCancellation(false);

  authPromise = pb
    .collection("_superusers")
    .authWithPassword(env.POCKETBASE_ADMIN_EMAIL, env.POCKETBASE_ADMIN_PASSWORD)
    .then(() => {
      adminPb = pb;
      authPromise = null;
      if (!startupValidated) {
        startupValidated = true;
        logger.info("PocketBase superuser authentication validated");
      }
    })
    .catch((err) => {
      authPromise = null;
      adminPb = null;
      logger.error("Failed to authenticate PocketBase superuser", {
        error: err instanceof Error ? err.message : String(err),
      });
      throw new Error("Server configuration error: PocketBase admin auth failed");
    });

  await authPromise;
  return adminPb!;
}

/**
 * Eagerly validate PocketBase admin credentials.
 * Call at application startup to fail fast on misconfiguration.
 */
export async function validateAdminAuth(): Promise<void> {
  await getAdminPb();
}
