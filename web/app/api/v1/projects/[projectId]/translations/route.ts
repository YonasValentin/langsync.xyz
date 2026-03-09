/**
 * Public API v1 - Get All Translations for a Project
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
  const rateLimited = await checkRateLimit(request);
  if (rateLimited) return rateLimited;

  try {
    const { projectId } = await params;

    const authResult = await authenticateApiKey(request, projectId);
    if (authResult instanceof NextResponse) return authResult;

    const { pb } = authResult;

    // Get all translation keys for the project
    const keys = await pb.collection("translation_keys").getFullList({
      filter: `project = "${escapeFilterValue(projectId)}"`,
      sort: "key",
    });

    if (keys.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Get all translations for these keys (IDs come from PocketBase, safe to use)
    const keyIds = keys.map((k) => k.id);
    const translations = await pb.collection("translations").getFullList({
      filter: keyIds
        .map((id) => `translationKey = "${escapeFilterValue(id)}"`)
        .join(" || "),
    });

    // Group translations by key
    const translationsByKey: Record<string, Record<string, string>> = {};
    for (const t of translations) {
      if (!translationsByKey[t.translationKey]) {
        translationsByKey[t.translationKey] = {};
      }
      translationsByKey[t.translationKey][t.language] = t.value;
    }

    const data = keys.map((key) => ({
      id: key.id,
      key: key.key,
      description: key.description,
      context: key.context,
      translations: translationsByKey[key.id] || {},
      created: key.created,
      updated: key.updated,
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    logger.error("API v1 translations error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Failed to get translations" },
      { status: 500 }
    );
  }
}
