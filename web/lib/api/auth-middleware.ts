/**
 * Shared API key authentication for public v1 API routes.
 *
 * Validates the Bearer token from the Authorization header, looks up the
 * associated user, and verifies project ownership — all in one call.
 */

import { NextResponse } from "next/server";
import PocketBase from "pocketbase";
import { isValidApiKey, isValidRecordId, escapeFilterValue } from "./sanitize";
import { logger } from "@/lib/logger";

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || "";

interface AuthResult {
  pb: PocketBase;
  user: Record<string, unknown>;
  project: Record<string, unknown>;
}

/**
 * Authenticate via API key and verify project ownership.
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

  // Validate API key format before using in filter
  if (!isValidApiKey(apiKey)) {
    return NextResponse.json(
      { success: false, error: "Invalid API key" },
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

  const pb = new PocketBase(POCKETBASE_URL);

  // Find user by API key (value is pre-validated to be alphanumeric, but escape anyway)
  const users = await pb.collection("users").getFullList({
    filter: `apiKey = "${escapeFilterValue(apiKey)}"`,
    limit: 1,
  });

  if (users.length === 0) {
    return NextResponse.json(
      { success: false, error: "Invalid API key" },
      { status: 401 }
    );
  }

  const user = users[0];

  // Get the project
  let project: Record<string, unknown>;
  try {
    project = await pb.collection("projects").getOne(projectId);
  } catch {
    return NextResponse.json(
      { success: false, error: "Project not found" },
      { status: 404 }
    );
  }

  // Verify ownership
  if (project.user !== user.id) {
    logger.warn("Project ownership mismatch", {
      userId: user.id,
      projectId,
    });
    return NextResponse.json(
      { success: false, error: "Project not found" },
      { status: 404 }
    );
  }

  return { pb, user, project };
}
