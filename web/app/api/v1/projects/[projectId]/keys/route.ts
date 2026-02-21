/**
 * Public API v1 - Get Translation Keys
 * Used by @langsync/client, @langsync/nextjs, @langsync/expo
 */

import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api/auth-middleware";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { escapeFilterValue } from "@/lib/api/sanitize";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const rateLimited = checkRateLimit(request);
  if (rateLimited) return rateLimited;

  try {
    const { projectId } = await params;

    const authResult = await authenticateApiKey(request, projectId);
    if (authResult instanceof NextResponse) return authResult;

    const { pb } = authResult;

    // Get all translation keys for the project (projectId already validated as record ID)
    const keys = await pb.collection("translation_keys").getFullList({
      filter: `project = "${escapeFilterValue(projectId)}"`,
      sort: "key",
    });

    const data = keys.map((key) => ({
      id: key.id,
      key: key.key,
      description: key.description,
      context: key.context,
      created: key.created,
      updated: key.updated,
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    logger.error("API v1 keys error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Failed to get keys" },
      { status: 500 }
    );
  }
}
