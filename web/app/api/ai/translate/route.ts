import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getAdminPb } from "@/lib/pocketbase-server";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { authenticateSession } from "@/lib/api/session-auth";
import { isValidRecordId, escapeFilterValue } from "@/lib/api/sanitize";
import { logger } from "@/lib/logger";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  // Stricter rate limit for AI endpoint (costs money)
  const rateLimited = checkRateLimit(request, { limit: 20, windowSeconds: 60 });
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();
    const { projectId, keyId, targetLanguage } = body;

    if (!projectId || !keyId || !targetLanguage) {
      return NextResponse.json(
        {
          error: "Missing required fields: projectId, keyId, targetLanguage",
        },
        { status: 400 }
      );
    }

    // Validate input formats
    if (!isValidRecordId(projectId) || !isValidRecordId(keyId)) {
      return NextResponse.json(
        { error: "Invalid projectId or keyId format" },
        { status: 400 }
      );
    }

    if (typeof targetLanguage !== "string" || targetLanguage.length > 10) {
      return NextResponse.json(
        { error: "Invalid target language" },
        { status: 400 }
      );
    }

    // Authenticate using the pb_auth cookie
    const auth = authenticateSession(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = auth.userId;

    // Use admin PocketBase client for data operations
    const pb = await getAdminPb();

    // Verify the user exists
    try {
      await pb.collection("users").getOne(userId);
    } catch (err) {
      const status = err && typeof err === "object" && "status" in err ? (err as { status: number }).status : 0;
      if (status === 404) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      logger.error("Failed to verify user in AI translate", {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    // Get the project and verify ownership
    const project = await pb.collection("projects").getOne(projectId);
    if (project.user !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the translation key and its source translation
    const translationKey = await pb
      .collection("translation_keys")
      .getOne(keyId);

    // Get the source translation (default language)
    const sourceTranslations = await pb
      .collection("translations")
      .getFullList({
        filter: `translationKey = "${escapeFilterValue(keyId)}" && language = "${escapeFilterValue(project.defaultLanguage)}"`,
      });

    if (sourceTranslations.length === 0) {
      return NextResponse.json(
        { error: "No source translation found for the default language" },
        { status: 400 }
      );
    }

    const sourceText = sourceTranslations[0].value;

    // Build the system prompt with project context
    let systemPrompt = `You are a professional translator. Translate the following text from ${project.defaultLanguage} to ${targetLanguage}.
Only return the translated text, nothing else.`;

    if (project.toneOfVoice) {
      systemPrompt += `\n\nTone of voice: ${project.toneOfVoice}`;
    }

    if (project.projectBrief) {
      systemPrompt += `\n\nProject context: ${project.projectBrief}`;
    }

    if (project.styleGuide) {
      systemPrompt += `\n\nStyle guide: ${project.styleGuide}`;
    }

    if (project.industryType) {
      systemPrompt += `\n\nIndustry: ${project.industryType}`;
    }

    if (project.targetAudience) {
      systemPrompt += `\n\nTarget audience: ${project.targetAudience}`;
    }

    if (translationKey.context) {
      systemPrompt += `\n\nTranslation context: ${translationKey.context}`;
    }

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: sourceText },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const translatedText =
      completion.choices[0]?.message?.content?.trim() || "";

    // Calculate cost (approximate)
    const promptTokens = completion.usage?.prompt_tokens || 0;
    const completionTokens = completion.usage?.completion_tokens || 0;
    const totalTokens = completion.usage?.total_tokens || 0;
    // GPT-4 Turbo pricing: $0.01/1K input, $0.03/1K output
    const estimatedCost =
      (promptTokens * 0.01 + completionTokens * 0.03) / 1000;

    // Save the AI translation record
    const aiTranslation = await pb.collection("ai_translations").create({
      project: projectId,
      translationKey: keyId,
      sourceLanguage: project.defaultLanguage,
      targetLanguage,
      sourceText,
      translatedText,
      model: "gpt-4-turbo",
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost,
      wasAccepted: false,
    });

    // Add to translation memory
    await pb.collection("translation_memory").create({
      project: projectId,
      sourceLanguage: project.defaultLanguage,
      targetLanguage,
      sourceText,
      targetText: translatedText,
      context: translationKey.context,
      usageCount: 1,
      lastUsedAt: new Date().toISOString(),
    });

    return NextResponse.json(aiTranslation);
  } catch (error: unknown) {
    logger.error("AI Translation error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to translate" },
      { status: 500 }
    );
  }
}
