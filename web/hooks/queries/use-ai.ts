import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pb, Collections } from "@/lib/pocketbase";
import type { AiTranslationsRecord } from "@/lib/pocketbase-types";
import { translationKeys } from "./use-translations";

// ============================================
// Query Keys Factory
// ============================================

export const aiKeys = {
  all: ["ai"] as const,
  usage: () => [...aiKeys.all, "usage"] as const,
  usageByProject: (projectId: string, startDate?: string) =>
    [...aiKeys.usage(), projectId, startDate] as const,
  translations: () => [...aiKeys.all, "translations"] as const,
  translationsByProject: (projectId: string) =>
    [...aiKeys.translations(), projectId] as const,
};

// ============================================
// Types
// ============================================

export interface AiUsageStats {
  totalTokens: number;
  totalCost: number;
  translations: AiTranslationsRecord[];
  byLanguage: Record<string, { count: number; tokens: number; cost: number }>;
  byModel: Record<string, { count: number; tokens: number; cost: number }>;
  acceptedCount: number;
  rejectedCount: number;
}

export interface TranslateKeyInput {
  keyId: string;
  targetLanguage: string;
}

export interface TranslateBatchInput {
  keyIds: string[];
  targetLanguages: string[];
}

export interface AutoTranslateMissingInput {
  targetLanguages: string[];
}

export interface AcceptAiTranslationInput {
  aiTranslationId: string;
}

// ============================================
// API Functions
// ============================================

async function getAiUsage(
  projectId: string,
  startDate?: string,
  endDate?: string
): Promise<AiUsageStats> {
  if (!pb.authStore.isValid) {
    return {
      totalTokens: 0,
      totalCost: 0,
      translations: [],
      byLanguage: {},
      byModel: {},
      acceptedCount: 0,
      rejectedCount: 0,
    };
  }

  // Build filter
  let filter = `project = "${projectId}"`;
  if (startDate) filter += ` && created >= "${startDate}"`;
  if (endDate) filter += ` && created <= "${endDate}"`;

  // Fetch AI translations from PocketBase
  const translations = await pb
    .collection(Collections.AI_TRANSLATIONS)
    .getFullList<AiTranslationsRecord>({
      filter,
      sort: "-created",
    });

  // Calculate statistics
  let totalTokens = 0;
  let totalCost = 0;
  let acceptedCount = 0;
  let rejectedCount = 0;
  const byLanguage: Record<string, { count: number; tokens: number; cost: number }> = {};
  const byModel: Record<string, { count: number; tokens: number; cost: number }> = {};

  for (const t of translations) {
    // Total stats
    totalTokens += t.totalTokens || 0;
    totalCost += t.estimatedCost || 0;

    // Acceptance stats
    if (t.wasAccepted) {
      acceptedCount++;
    } else {
      rejectedCount++;
    }

    // By language
    if (!byLanguage[t.targetLanguage]) {
      byLanguage[t.targetLanguage] = { count: 0, tokens: 0, cost: 0 };
    }
    byLanguage[t.targetLanguage].count++;
    byLanguage[t.targetLanguage].tokens += t.totalTokens || 0;
    byLanguage[t.targetLanguage].cost += t.estimatedCost || 0;

    // By model
    if (!byModel[t.model]) {
      byModel[t.model] = { count: 0, tokens: 0, cost: 0 };
    }
    byModel[t.model].count++;
    byModel[t.model].tokens += t.totalTokens || 0;
    byModel[t.model].cost += t.estimatedCost || 0;
  }

  return {
    totalTokens,
    totalCost,
    translations,
    byLanguage,
    byModel,
    acceptedCount,
    rejectedCount,
  };
}

async function translateKey(
  projectId: string,
  data: TranslateKeyInput
): Promise<AiTranslationsRecord> {
  const response = await fetch("/api/ai/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: document.cookie,
    },
    credentials: "include",
    body: JSON.stringify({
      projectId,
      keyId: data.keyId,
      targetLanguage: data.targetLanguage,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to translate");
  }

  return response.json();
}

async function translateBatch(
  projectId: string,
  data: TranslateBatchInput
): Promise<AiTranslationsRecord[]> {
  const response = await fetch("/api/ai/translate-batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: document.cookie,
    },
    credentials: "include",
    body: JSON.stringify({
      projectId,
      keyIds: data.keyIds,
      targetLanguages: data.targetLanguages,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to translate batch");
  }

  return response.json();
}

async function autoTranslateMissing(
  projectId: string,
  data: AutoTranslateMissingInput
): Promise<AiTranslationsRecord[]> {
  const response = await fetch("/api/ai/auto-translate-missing", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: document.cookie,
    },
    credentials: "include",
    body: JSON.stringify({
      projectId,
      targetLanguages: data.targetLanguages,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to auto-translate missing translations");
  }

  return response.json();
}

async function acceptAiTranslation(
  projectId: string,
  aiTranslationId: string
): Promise<void> {
  const userId = pb.authStore.record?.id;
  if (!userId) throw new Error("Not authenticated");

  // Get the AI translation
  const aiTranslation = await pb
    .collection(Collections.AI_TRANSLATIONS)
    .getOne<AiTranslationsRecord>(aiTranslationId);

  // Get the translation key to find existing translation
  const existingTranslations = await pb
    .collection(Collections.TRANSLATIONS)
    .getFullList({
      filter: `translationKey = "${aiTranslation.translationKey}" && language = "${aiTranslation.targetLanguage}"`,
      limit: 1,
    });

  if (existingTranslations.length > 0) {
    // Update existing translation
    const existing = existingTranslations[0];
    const oldValue = existing.value;

    await pb.collection(Collections.TRANSLATIONS).update(existing.id, {
      value: aiTranslation.translatedText,
      updatedBy: userId,
    });

    // Create version history
    await pb.collection(Collections.TRANSLATION_VERSIONS).create({
      translationKey: aiTranslation.translationKey,
      language: aiTranslation.targetLanguage,
      value: aiTranslation.translatedText,
      previousValue: oldValue,
      user: userId,
      changeType: "updated",
    });
  } else {
    // Create new translation
    await pb.collection(Collections.TRANSLATIONS).create({
      translationKey: aiTranslation.translationKey,
      language: aiTranslation.targetLanguage,
      value: aiTranslation.translatedText,
      updatedBy: userId,
    });

    // Create version history
    await pb.collection(Collections.TRANSLATION_VERSIONS).create({
      translationKey: aiTranslation.translationKey,
      language: aiTranslation.targetLanguage,
      value: aiTranslation.translatedText,
      user: userId,
      changeType: "created",
    });
  }

  // Mark AI translation as accepted
  await pb.collection(Collections.AI_TRANSLATIONS).update(aiTranslationId, {
    wasAccepted: true,
  });

  // Log activity
  await pb.collection(Collections.ACTIVITY_LOGS).create({
    project: projectId,
    user: userId,
    type: "ai_translation_accepted",
    translationKey: aiTranslation.translationKey,
    language: aiTranslation.targetLanguage,
    description: "Accepted AI translation",
  });
}

// ============================================
// Query Hooks
// ============================================

/**
 * Fetch AI usage statistics for a project
 */
export function useAiUsage(
  projectId: string,
  startDate?: string,
  endDate?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: aiKeys.usageByProject(projectId, startDate),
    queryFn: () => getAiUsage(projectId, startDate, endDate),
    enabled: options?.enabled !== false && !!projectId && pb.authStore.isValid,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Translate a single key to a target language using AI
 */
export function useTranslateKey(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TranslateKeyInput) => translateKey(projectId, data),
    onSuccess: () => {
      // Invalidate AI usage stats
      queryClient.invalidateQueries({ queryKey: aiKeys.usageByProject(projectId) });
      // Invalidate translations list (in case it's displayed)
      queryClient.invalidateQueries({ queryKey: translationKeys.list(projectId) });
    },
  });
}

/**
 * Translate multiple keys to multiple languages in batch
 */
export function useTranslateBatch(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TranslateBatchInput) => translateBatch(projectId, data),
    onSuccess: () => {
      // Invalidate AI usage stats
      queryClient.invalidateQueries({ queryKey: aiKeys.usageByProject(projectId) });
      // Invalidate translations list
      queryClient.invalidateQueries({ queryKey: translationKeys.list(projectId) });
    },
  });
}

/**
 * Auto-translate all missing translations for target languages
 */
export function useAutoTranslateMissing(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AutoTranslateMissingInput) =>
      autoTranslateMissing(projectId, data),
    onSuccess: () => {
      // Invalidate AI usage stats
      queryClient.invalidateQueries({ queryKey: aiKeys.usageByProject(projectId) });
      // Invalidate translations list
      queryClient.invalidateQueries({ queryKey: translationKeys.list(projectId) });
    },
  });
}

/**
 * Accept an AI translation and apply it to the actual translation
 */
export function useAcceptAiTranslation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (aiTranslationId: string) =>
      acceptAiTranslation(projectId, aiTranslationId),
    onMutate: async (aiTranslationId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: aiKeys.usageByProject(projectId),
      });

      // Snapshot previous value
      const previousUsage = queryClient.getQueryData<AiUsageStats>(
        aiKeys.usageByProject(projectId)
      );

      // Optimistically update acceptance count
      if (previousUsage) {
        queryClient.setQueryData(aiKeys.usageByProject(projectId), {
          ...previousUsage,
          acceptedCount: previousUsage.acceptedCount + 1,
          rejectedCount: Math.max(0, previousUsage.rejectedCount - 1),
          translations: previousUsage.translations.map((t) =>
            t.id === aiTranslationId ? { ...t, wasAccepted: true } : t
          ),
        });
      }

      return { previousUsage };
    },
    onError: (_err, _aiTranslationId, context) => {
      // Rollback on error
      if (context?.previousUsage) {
        queryClient.setQueryData(
          aiKeys.usageByProject(projectId),
          context.previousUsage
        );
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: aiKeys.usageByProject(projectId) });
      queryClient.invalidateQueries({ queryKey: translationKeys.list(projectId) });
    },
  });
}
