/**
 * API key authentication middleware for public v1 API routes.
 *
 * Validates the Bearer token from the Authorization header against
 * the api_keys collection, verifies the key is active and not expired,
 * checks project ownership/scope, and updates lastUsedAt.
 */

import { NextResponse } from "next/server";
import type PocketBase from "pocketbase";
import { getAdminPb } from "@/lib/pocketbase-server";
import { isValidApiKey, isValidRecordId, escapeFilterValue } from "./sanitize";
import { hashApiKey } from "./api-key-hash";
import { logger } from "@/lib/logger";

interface AuthResult {
  pb: PocketBase;
  userId: string;
  project: Record<string, unknown>;
}

/**
 * Authenticate via API key and verify project access.
 * Returns a NextResponse on failure, or the resolved auth context on success.
 */
export async function authenticateApiKey(
  request: Request,
  projectId: string
): Promise<NextResponse | AuthResult> {
  // Validate Authorization header
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { success: false, error: "Missing or invalid authorization header" },
      { status: 401 }
    );
  }

  const apiKey = authHeader.slice("Bearer ".length);

  // Validate API key format
  if (!isValidApiKey(apiKey)) {
    return NextResponse.json(
      { success: false, error: "Invalid API key format" },
      { status: 401 }
    );
  }

  // Validate projectId format
  if (!isValidRecordId(projectId)) {
    return NextResponse.json(
      { success: false, error: "Invalid project ID" },
      { status: 400 }
    );
  }

  let pb: PocketBase;
  try {
    pb = await getAdminPb();
  } catch (err) {
    logger.error("Auth middleware: failed to get admin PocketBase client", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }

  // Look up the API key — supports both hashed keys (preferred) and legacy plaintext
  const keyHash = hashApiKey(apiKey);
  let keyRecords;
  try {
    // Try hashed lookup first, then fall back to plaintext for migration
    keyRecords = await pb.collection("api_keys").getFullList({
      filter: `key = "${escapeFilterValue(keyHash)}" || key = "${escapeFilterValue(apiKey)}"`,
    });
  } catch (err) {
    logger.error("Failed to query api_keys", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }

  if (keyRecords.length === 0) {
    return NextResponse.json(
      { success: false, error: "Invalid API key" },
      { status: 401 }
    );
  }

  const keyRecord = keyRecords[0];

  // Auto-migrate plaintext keys to hashed on first use
  if (keyRecord.key === apiKey && keyRecord.key !== keyHash) {
    pb.collection("api_keys")
      .update(keyRecord.id, { key: keyHash })
      .catch((err) => {
        logger.warn("Failed to migrate API key to hashed format", {
          keyId: keyRecord.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });
  }

  // Check if key is revoked
  if (keyRecord.revoked) {
    return NextResponse.json(
      { success: false, error: "API key has been revoked" },
      { status: 401 }
    );
  }

  // Check if key has expired
  if (keyRecord.expiresAt) {
    const expiresAt = new Date(keyRecord.expiresAt);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "API key has expired" },
        { status: 401 }
      );
    }
  }

  const userId = keyRecord.user;

  // Check project scope: if the key is scoped to a specific project, verify it matches
  if (keyRecord.project && keyRecord.project !== projectId) {
    return NextResponse.json(
      { success: false, error: "API key does not have access to this project" },
      { status: 403 }
    );
  }

  // Get the project and verify ownership
  let project: Record<string, unknown>;
  try {
    project = await pb.collection("projects").getOne(projectId);
  } catch (err) {
    const status = err && typeof err === "object" && "status" in err ? (err as { status: number }).status : 0;
    if (status === 404) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }
    logger.error("Failed to fetch project in auth middleware", {
      projectId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }

  if (project.user !== userId) {
    logger.warn("API key project ownership mismatch", {
      userId,
      projectId,
      keyId: keyRecord.id,
    });
    return NextResponse.json(
      { success: false, error: "Project not found" },
      { status: 404 }
    );
  }

  // Update lastUsedAt in the background (don't block the response)
  pb.collection("api_keys")
    .update(keyRecord.id, { lastUsedAt: new Date().toISOString() })
    .catch((err) => {
      logger.warn("Failed to update API key lastUsedAt", {
        keyId: keyRecord.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });

  return { pb, userId, project };
}
