/**
 * Public API v1 - Get Translations for a Specific Language
 * Used by @langsync/client, @langsync/nextjs, @langsync/expo
 *
 * Returns a flat dictionary: { "key.name": "value", ... }
 */

import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api/auth-middleware";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { escapeFilterValue, isValidLanguageCode } from "@/lib/api/sanitize";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ projectId: string; language: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const rateLimited = checkRateLimit(request);
  if (rateLimited) return rateLimited;

  try {
    const { projectId, language } = await params;

    // Validate language code format before using in queries
    if (!isValidLanguageCode(language)) {
      return NextResponse.json(
        { success: false, error: "Invalid language code" },
        { status: 400 }
      );
    }

    const authResult = await authenticateApiKey(request, projectId);
    if (authResult instanceof NextResponse) return authResult;

    const { pb, project } = authResult;

    // Check if the language is supported by this project
    if (
      !Array.isArray(project.languages) ||
      !project.languages.includes(language)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Language '${language}' is not configured for this project`,
        },
        { status: 404 }
      );
    }

    // Get all translation keys for the project
    const keys = await pb.collection("translation_keys").getFullList({
      filter: `project = "${escapeFilterValue(projectId)}"`,
      sort: "key",
    });

    if (keys.length === 0) {
      return NextResponse.json({
        success: true,
        data: {},
      });
    }

    // Get translations for this language
    const keyIds = keys.map((k) => k.id);
    const translations = await pb.collection("translations").getFullList({
      filter: `(${keyIds.map((id) => `translationKey = "${escapeFilterValue(id)}"`).join(" || ")}) && language = "${escapeFilterValue(language)}"`,
    });

    // Build the flat dictionary: { "key.name": "value" }
    const translationMap: Record<string, string> = {};
    for (const t of translations) {
      translationMap[t.translationKey] = t.value;
    }

    const data: Record<string, string> = {};
    for (const key of keys) {
      if (translationMap[key.id]) {
        data[key.key] = translationMap[key.id];
      }
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    logger.error("API v1 language translations error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Failed to get translations" },
      { status: 500 }
    );
  }
}
