import { pb } from "@/lib/pocketbase";
import type {
  AiTranslationsRecord,
  AiTranslationExpanded,
  TranslationKeysRecord,
  TranslationsRecord,
  ProjectsRecord,
  AiSuggestion,
} from "@/lib/pocketbase-types";

// ============================================
// AI Translation API
// ============================================

/**
 * Generate an AI translation for a key
 */
export async function translateWithAI(
  projectId: string,
  keyId: string,
  targetLanguage: string
): Promise<AiTranslationsRecord> {
  // Call the AI translation edge function
  const response = await fetch("/api/ai/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, keyId, targetLanguage }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to translate");
  }

  return response.json();
}

/**
 * Generate AI translations for multiple keys
 */
export async function translateBatchWithAI(
  projectId: string,
  keyIds: string[],
  targetLanguages: string[]
): Promise<AiTranslationsRecord[]> {
  const results: AiTranslationsRecord[] = [];

  for (const keyId of keyIds) {
    for (const targetLanguage of targetLanguages) {
      try {
        const result = await translateWithAI(projectId, keyId, targetLanguage);
        results.push(result);
      } catch (error) {
        console.error(`Failed to translate key ${keyId} to ${targetLanguage}:`, error);
      }
    }
  }

  return results;
}

/**
 * Accept an AI translation (apply it to the actual translation)
 */
export async function acceptAiTranslation(
  projectId: string,
  aiTranslationId: string
): Promise<void> {
  const userId = pb.authStore.record?.id;
  if (!userId) throw new Error("Not authenticated");

  // Get the AI translation
  const aiTranslation = await pb
    .collection("ai_translations")
    .getOne<AiTranslationsRecord>(aiTranslationId);

  // Update or create the actual translation
  try {
    const existing = await pb
      .collection("translations")
      .getFirstListItem<TranslationsRecord>(
        `translationKey = "${aiTranslation.translationKey}" && language = "${aiTranslation.targetLanguage}"`
      );

    await pb.collection("translations").update(existing.id, {
      value: aiTranslation.translatedText,
      updatedBy: userId,
    });
  } catch {
    // Create new translation
    await pb.collection("translations").create<TranslationsRecord>({
      translationKey: aiTranslation.translationKey,
      language: aiTranslation.targetLanguage,
      value: aiTranslation.translatedText,
      updatedBy: userId,
    });
  }

  // Mark AI translation as accepted
  await pb.collection("ai_translations").update(aiTranslationId, {
    wasAccepted: true,
  });

  // Log activity
  await pb.collection("activity_logs").create({
    project: projectId,
    user: userId,
    type: "ai_translation_accepted",
    translationKey: aiTranslation.translationKey,
    language: aiTranslation.targetLanguage,
    description: "Accepted AI translation",
  });
}

/**
 * Get AI usage statistics for a project
 */
export async function getAiUsage(
  projectId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  totalTokens: number;
  totalCost: number;
  translations: AiTranslationsRecord[];
}> {
  let filter = `project = "${projectId}"`;
  if (startDate) filter += ` && created >= "${startDate}"`;
  if (endDate) filter += ` && created <= "${endDate}"`;

  const translations = await pb
    .collection("ai_translations")
    .getFullList<AiTranslationsRecord>({
      filter,
      sort: "-created",
    });

  const totalTokens = translations.reduce((sum, t) => sum + (t.totalTokens || 0), 0);
  const totalCost = translations.reduce((sum, t) => sum + (t.estimatedCost || 0), 0);

  return { totalTokens, totalCost, translations };
}

/**
 * Get recent AI suggestions for a project
 */
export async function getRecentAiSuggestions(
  projectId: string,
  limit: number = 10
): Promise<AiSuggestion[]> {
  const translations = await pb
    .collection("ai_translations")
    .getList<AiTranslationExpanded>(1, limit, {
      filter: `project = "${projectId}"`,
      sort: "-created",
      expand: "translationKey",
    });

  return translations.items.map((t) => ({
    id: t.id,
    keyId: t.translationKey,
    keyName: t.expand?.translationKey?.key || "",
    sourceLanguage: t.sourceLanguage,
    targetLanguage: t.targetLanguage,
    sourceText: t.sourceText,
    translatedText: t.translatedText,
    model: t.model,
    tokens: t.totalTokens || 0,
    cost: t.estimatedCost || 0,
    wasAccepted: t.wasAccepted,
    created: t.created,
  }));
}
