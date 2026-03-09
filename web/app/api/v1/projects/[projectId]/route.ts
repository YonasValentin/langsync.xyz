/**
 * Public API v1 - Get Project Details
 * Used by @langsync/client, @langsync/nextjs, @langsync/expo
 */

import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api/auth-middleware";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const rateLimited = await checkRateLimit(request);
  if (rateLimited) return rateLimited;

  try {
    const { projectId } = await params;

    const authResult = await authenticateApiKey(request, projectId);
    if (authResult instanceof NextResponse) return authResult;

    const { project } = authResult;

    return NextResponse.json({
      success: true,
      data: {
        id: project.id,
        name: project.name,
        description: project.description,
        defaultLanguage: project.defaultLanguage,
        languages: project.languages,
        created: project.created,
        updated: project.updated,
      },
    });
  } catch (error: unknown) {
    logger.error("API v1 project error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Failed to get project" },
      { status: 500 }
    );
  }
}
