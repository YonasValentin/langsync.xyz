import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pb, Collections } from "@/lib/pocketbase";
import type {
  TranslationKeysRecord,
  TranslationsRecord,
  TranslationKeyWithTranslations,
} from "@/lib/pocketbase-types";
import { projectKeys } from "./use-projects";

// ============================================
// Query Keys Factory
// ============================================

export const translationKeys = {
  all: ["translations"] as const,
  lists: () => [...translationKeys.all, "list"] as const,
  list: (projectId: string) => [...translationKeys.lists(), projectId] as const,
  details: () => [...translationKeys.all, "detail"] as const,
  detail: (keyId: string) => [...translationKeys.details(), keyId] as const,
};

// ============================================
// Types
// ============================================

export interface CreateTranslationKeyInput {
  key: string;
  description?: string;
  context?: string;
  translations?: Record<string, string>;
}

export interface UpdateTranslationInput {
  keyId: string;
  language: string;
  value: string;
}

export interface BatchTranslationUpdate {
  keyId: string;
  translations: Record<string, string>;
}

// ============================================
// API Functions
// ============================================

async function getTranslationKeys(
  projectId: string
): Promise<TranslationKeyWithTranslations[]> {
  if (!pb.authStore.isValid) return [];

  // Get all keys for the project
  const keys = await pb
    .collection(Collections.TRANSLATION_KEYS)
    .getFullList<TranslationKeysRecord>({
      filter: `project = "${projectId}"`,
      sort: "key",
    });

  if (keys.length === 0) return [];

  // Get all translations for these keys
  const keyIds = keys.map((k) => k.id);
  const translations = await pb
    .collection(Collections.TRANSLATIONS)
    .getFullList<TranslationsRecord>({
      filter: keyIds.map((id) => `translationKey = "${id}"`).join(" || "),
    });

  // Group translations by key
  const translationsByKey: Record<string, Record<string, string>> = {};
  for (const t of translations) {
    if (!translationsByKey[t.translationKey]) {
      translationsByKey[t.translationKey] = {};
    }
    translationsByKey[t.translationKey][t.language] = t.value;
  }

  // Combine keys with their translations
  return keys.map((key) => ({
    id: key.id,
    key: key.key,
    description: key.description,
    context: key.context,
    translations: translationsByKey[key.id] || {},
    created: key.created,
    updated: key.updated,
  }));
}

async function createTranslationKey(
  projectId: string,
  data: CreateTranslationKeyInput
): Promise<TranslationKeysRecord> {
  const userId = pb.authStore.record?.id;
  if (!userId) throw new Error("Not authenticated");

  // Create the key
  const newKey = await pb.collection(Collections.TRANSLATION_KEYS).create<TranslationKeysRecord>({
    project: projectId,
    key: data.key,
    description: data.description || "",
    context: data.context || "",
  });

  // Create translations if provided
  if (data.translations) {
    const translationPromises = Object.entries(data.translations)
      .filter(([_, value]) => value && value.trim() !== "")
      .map(([language, value]) =>
        pb.collection(Collections.TRANSLATIONS).create<TranslationsRecord>({
          translationKey: newKey.id,
          language,
          value,
          updatedBy: userId,
        })
      );

    await Promise.all(translationPromises);
  }

  // Log activity
  await pb.collection(Collections.ACTIVITY_LOGS).create({
    project: projectId,
    user: userId,
    type: "key_created",
    translationKey: newKey.id,
    description: `Created key: ${data.key}`,
  });

  return newKey;
}

async function updateTranslation(
  keyId: string,
  language: string,
  value: string
): Promise<void> {
  const userId = pb.authStore.record?.id;
  if (!userId) throw new Error("Not authenticated");

  // Get the key to find the project
  const key = await pb.collection(Collections.TRANSLATION_KEYS).getOne<TranslationKeysRecord>(keyId);

  // Try to find existing translation
  try {
    const existing = await pb
      .collection(Collections.TRANSLATIONS)
      .getFirstListItem<TranslationsRecord>(
        `translationKey = "${keyId}" && language = "${language}"`
      );

    const oldValue = existing.value;

    // Update existing
    await pb.collection(Collections.TRANSLATIONS).update(existing.id, {
      value,
      updatedBy: userId,
    });

    // Create version history
    await pb.collection(Collections.TRANSLATION_VERSIONS).create({
      translationKey: keyId,
      language,
      value,
      previousValue: oldValue,
      user: userId,
      changeType: "updated",
    });

    // Log activity
    await pb.collection(Collections.ACTIVITY_LOGS).create({
      project: key.project,
      user: userId,
      type: "translation_updated",
      translationKey: keyId,
      language,
      description: `Updated ${language} translation`,
    });
  } catch {
    // Create new translation
    await pb.collection(Collections.TRANSLATIONS).create<TranslationsRecord>({
      translationKey: keyId,
      language,
      value,
      updatedBy: userId,
    });

    // Create version history
    await pb.collection(Collections.TRANSLATION_VERSIONS).create({
      translationKey: keyId,
      language,
      value,
      user: userId,
      changeType: "created",
    });

    // Log activity
    await pb.collection(Collections.ACTIVITY_LOGS).create({
      project: key.project,
      user: userId,
      type: "translation_updated",
      translationKey: keyId,
      language,
      description: `Created ${language} translation`,
    });
  }
}

async function deleteTranslationKey(keyId: string): Promise<boolean> {
  const userId = pb.authStore.record?.id;
  if (!userId) throw new Error("Not authenticated");

  // Get the key first to find the project
  const key = await pb.collection(Collections.TRANSLATION_KEYS).getOne<TranslationKeysRecord>(keyId);

  // Log activity before deletion
  await pb.collection(Collections.ACTIVITY_LOGS).create({
    project: key.project,
    user: userId,
    type: "key_deleted",
    description: `Deleted key: ${key.key}`,
  });

  // Delete the key (cascade will handle translations via PocketBase rules)
  await pb.collection(Collections.TRANSLATION_KEYS).delete(keyId);
  return true;
}

async function deleteMultipleKeys(keyIds: string[]): Promise<boolean> {
  const userId = pb.authStore.record?.id;
  if (!userId) throw new Error("Not authenticated");

  await Promise.all(keyIds.map((id) => deleteTranslationKey(id)));
  return true;
}

// ============================================
// Query Hooks
// ============================================

/**
 * Fetch all translation keys with their translations for a project
 */
export function useTranslationKeys(projectId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: translationKeys.list(projectId),
    queryFn: () => getTranslationKeys(projectId),
    enabled: options?.enabled !== false && !!projectId && pb.authStore.isValid,
    staleTime: 60 * 1000, // 1 minute (translations change frequently)
  });
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Create a new translation key
 */
export function useCreateTranslationKey(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTranslationKeyInput) =>
      createTranslationKey(projectId, data),
    onSuccess: () => {
      // Invalidate translations list
      queryClient.invalidateQueries({ queryKey: translationKeys.list(projectId) });
      // Invalidate projects list (for key count update)
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * Update a single translation value with optimistic updates
 */
export function useUpdateTranslation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ keyId, language, value }: UpdateTranslationInput) =>
      updateTranslation(keyId, language, value),

    // Optimistic update - update cache immediately
    onMutate: async ({ keyId, language, value }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: translationKeys.list(projectId),
      });

      // Snapshot previous value
      const previousKeys = queryClient.getQueryData<TranslationKeyWithTranslations[]>(
        translationKeys.list(projectId)
      );

      // Optimistically update
      if (previousKeys) {
        queryClient.setQueryData(
          translationKeys.list(projectId),
          previousKeys.map((key) =>
            key.id === keyId
              ? {
                  ...key,
                  translations: {
                    ...key.translations,
                    [language]: value,
                  },
                }
              : key
          )
        );
      }

      return { previousKeys };
    },

    // Rollback on error
    onError: (_err, _vars, context) => {
      if (context?.previousKeys) {
        queryClient.setQueryData(
          translationKeys.list(projectId),
          context.previousKeys
        );
      }
    },

    // Refetch after mutation
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: translationKeys.list(projectId) });
      // Update projects list for progress
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * Delete a translation key with optimistic updates
 */
export function useDeleteTranslationKey(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTranslationKey,

    onMutate: async (keyId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: translationKeys.list(projectId),
      });

      // Snapshot previous value
      const previousKeys = queryClient.getQueryData<TranslationKeyWithTranslations[]>(
        translationKeys.list(projectId)
      );

      // Optimistically remove
      if (previousKeys) {
        queryClient.setQueryData(
          translationKeys.list(projectId),
          previousKeys.filter((k) => k.id !== keyId)
        );
      }

      return { previousKeys };
    },

    onError: (_err, _keyId, context) => {
      if (context?.previousKeys) {
        queryClient.setQueryData(
          translationKeys.list(projectId),
          context.previousKeys
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: translationKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * Delete multiple translation keys
 */
export function useDeleteMultipleKeys(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMultipleKeys,

    onMutate: async (keyIds) => {
      await queryClient.cancelQueries({
        queryKey: translationKeys.list(projectId),
      });

      const previousKeys = queryClient.getQueryData<TranslationKeyWithTranslations[]>(
        translationKeys.list(projectId)
      );

      if (previousKeys) {
        queryClient.setQueryData(
          translationKeys.list(projectId),
          previousKeys.filter((k) => !keyIds.includes(k.id))
        );
      }

      return { previousKeys };
    },

    onError: (_err, _keyIds, context) => {
      if (context?.previousKeys) {
        queryClient.setQueryData(
          translationKeys.list(projectId),
          context.previousKeys
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: translationKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}
