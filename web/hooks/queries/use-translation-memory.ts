import { useQuery, useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { pb, Collections } from "@/lib/pocketbase";
import type { TranslationMemoryRecord } from "@/lib/pocketbase-types";
import { projectKeys } from "./use-projects";

// ============================================
// Query Keys Factory
// ============================================

export const memoryKeys = {
  all: ["translation-memory"] as const,
  lists: () => [...memoryKeys.all, "list"] as const,
  list: (projectId?: string, sourceLanguage?: string, targetLanguage?: string) =>
    [...memoryKeys.lists(), { projectId, sourceLanguage, targetLanguage }] as const,
  search: () => [...memoryKeys.all, "search"] as const,
  searchQuery: (params: SearchMemoryParams) =>
    [...memoryKeys.search(), params] as const,
};

// ============================================
// Types
// ============================================

export interface TranslationMemoryEntry {
  id: string;
  projectId?: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  targetText: string;
  context?: string;
  usageCount: number;
  lastUsedAt: Date;
  createdAt: Date;
  similarity?: number; // For search results
}

export interface TranslationSuggestion {
  entry: TranslationMemoryEntry;
  similarity: number; // 0-100%
  source: "exact" | "fuzzy" | "context";
}

export interface CreateMemoryEntryInput {
  projectId?: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  targetText: string;
  context?: string;
}

export interface SearchMemoryParams {
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  projectId?: string;
  minimumSimilarity?: number;
}

// ============================================
// API Functions
// ============================================

/**
 * Transform PocketBase record to TranslationMemoryEntry
 */
function transformMemoryRecord(record: TranslationMemoryRecord): TranslationMemoryEntry {
  return {
    id: record.id,
    projectId: record.project,
    sourceLanguage: record.sourceLanguage,
    targetLanguage: record.targetLanguage,
    sourceText: record.sourceText,
    targetText: record.targetText,
    context: record.context,
    usageCount: record.usageCount,
    lastUsedAt: new Date(record.lastUsedAt),
    createdAt: new Date(record.created),
  };
}

/**
 * Calculate similarity between two strings (0-1)
 * Simple implementation - in production you'd want Levenshtein distance or similar
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Exact match
  if (s1 === s2) return 1.0;

  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = Math.min(s1.length, s2.length);
    const longer = Math.max(s1.length, s2.length);
    return shorter / longer;
  }

  // Simple word-based similarity
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const commonWords = words1.filter((w) => words2.includes(w));
  const totalWords = new Set([...words1, ...words2]).size;

  return commonWords.length / totalWords;
}

/**
 * Fetch translation memory entries
 */
async function getTranslationMemory(
  projectId?: string,
  sourceLanguage?: string,
  targetLanguage?: string,
  limit = 50,
  offset = 0
): Promise<TranslationMemoryEntry[]> {
  if (!pb.authStore.isValid) return [];

  const filters: string[] = [];
  if (projectId) filters.push(`project = "${projectId}"`);
  if (sourceLanguage) filters.push(`sourceLanguage = "${sourceLanguage}"`);
  if (targetLanguage) filters.push(`targetLanguage = "${targetLanguage}"`);

  const result = await pb
    .collection(Collections.TRANSLATION_MEMORY)
    .getList<TranslationMemoryRecord>(Math.floor(offset / limit) + 1, limit, {
      filter: filters.length > 0 ? filters.join(" && ") : "",
      sort: "-usageCount,-lastUsedAt",
    });

  return result.items.map(transformMemoryRecord);
}

/**
 * Search translation memory for similar entries
 */
async function searchTranslationMemory(
  params: SearchMemoryParams
): Promise<TranslationSuggestion[]> {
  if (!pb.authStore.isValid) return [];

  const { sourceLanguage, targetLanguage, sourceText, projectId, minimumSimilarity = 0.7 } = params;

  const filters: string[] = [
    `sourceLanguage = "${sourceLanguage}"`,
    `targetLanguage = "${targetLanguage}"`,
  ];
  if (projectId) filters.push(`project = "${projectId}"`);

  const entries = await pb
    .collection(Collections.TRANSLATION_MEMORY)
    .getFullList<TranslationMemoryRecord>({
      filter: filters.join(" && "),
      sort: "-usageCount",
    });

  // Calculate similarity for each entry
  const suggestions: TranslationSuggestion[] = entries
    .map((record) => {
      const similarity = calculateSimilarity(sourceText, record.sourceText);
      const entry = transformMemoryRecord(record);

      return {
        entry: { ...entry, similarity },
        similarity: Math.round(similarity * 100),
        source:
          similarity === 1
            ? ("exact" as const)
            : similarity >= 0.9
            ? ("fuzzy" as const)
            : ("context" as const),
      };
    })
    .filter((s) => s.similarity / 100 >= minimumSimilarity)
    .sort((a, b) => b.similarity - a.similarity);

  return suggestions;
}

/**
 * Create or update a translation memory entry
 */
async function createMemoryEntry(
  data: CreateMemoryEntryInput
): Promise<TranslationMemoryEntry> {
  if (!pb.authStore.isValid) throw new Error("Not authenticated");

  // Check if an exact match already exists
  const filters: string[] = [
    `sourceLanguage = "${data.sourceLanguage}"`,
    `targetLanguage = "${data.targetLanguage}"`,
    `sourceText = "${data.sourceText}"`,
  ];
  if (data.projectId) filters.push(`project = "${data.projectId}"`);

  const existing = await pb
    .collection(Collections.TRANSLATION_MEMORY)
    .getFullList<TranslationMemoryRecord>({
      filter: filters.join(" && "),
      limit: 1,
    });

  // If exists, update it
  if (existing.length > 0) {
    const updated = await pb
      .collection(Collections.TRANSLATION_MEMORY)
      .update<TranslationMemoryRecord>(existing[0].id, {
        targetText: data.targetText,
        context: data.context,
        usageCount: existing[0].usageCount + 1,
        lastUsedAt: new Date().toISOString(),
      });

    return transformMemoryRecord(updated);
  }

  // Create new entry
  const newRecord = await pb
    .collection(Collections.TRANSLATION_MEMORY)
    .create<TranslationMemoryRecord>({
      project: data.projectId,
      sourceLanguage: data.sourceLanguage,
      targetLanguage: data.targetLanguage,
      sourceText: data.sourceText,
      targetText: data.targetText,
      context: data.context,
      usageCount: 1,
      lastUsedAt: new Date().toISOString(),
    });

  return transformMemoryRecord(newRecord);
}

/**
 * Increment usage count for a memory entry
 */
async function incrementMemoryUsage(id: string): Promise<TranslationMemoryEntry> {
  const entry = await pb
    .collection(Collections.TRANSLATION_MEMORY)
    .getOne<TranslationMemoryRecord>(id);

  const updated = await pb
    .collection(Collections.TRANSLATION_MEMORY)
    .update<TranslationMemoryRecord>(id, {
      usageCount: entry.usageCount + 1,
      lastUsedAt: new Date().toISOString(),
    });

  return transformMemoryRecord(updated);
}

/**
 * Delete a translation memory entry
 */
async function deleteMemoryEntry(id: string): Promise<boolean> {
  await pb.collection(Collections.TRANSLATION_MEMORY).delete(id);
  return true;
}

// ============================================
// Query Hooks
// ============================================

/**
 * Fetch translation memory entries with optional filters
 */
export function useTranslationMemory(
  projectId?: string,
  sourceLanguage?: string,
  targetLanguage?: string,
  options?: { enabled?: boolean; limit?: number; offset?: number }
) {
  return useQuery({
    queryKey: memoryKeys.list(projectId, sourceLanguage, targetLanguage),
    queryFn: () =>
      getTranslationMemory(
        projectId,
        sourceLanguage,
        targetLanguage,
        options?.limit,
        options?.offset
      ),
    enabled: options?.enabled !== false && pb.authStore.isValid,
    staleTime: 5 * 60 * 1000, // 5 minutes (relatively stable data)
  });
}

/**
 * Search translation memory for similar entries
 * Can be used as a query with enabled: false, then call refetch() when needed
 */
export function useSearchTranslationMemory(
  params?: SearchMemoryParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: params ? memoryKeys.searchQuery(params) : memoryKeys.search(),
    queryFn: () => (params ? searchTranslationMemory(params) : Promise.resolve([])),
    enabled: options?.enabled !== false && !!params && pb.authStore.isValid,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Create or update a translation memory entry
 */
export function useCreateMemoryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMemoryEntry,
    onSuccess: (newEntry) => {
      // Invalidate all memory lists that might include this entry
      queryClient.invalidateQueries({ queryKey: memoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: memoryKeys.search() });

      // Optionally invalidate project stats if it affects them
      if (newEntry.projectId) {
        queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      }
    },
  });
}

/**
 * Increment usage count for a memory entry with optimistic updates
 */
export function useIncrementMemoryUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: incrementMemoryUsage,

    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: memoryKeys.lists() });

      // Get all list queries
      const queries = queryClient.getQueriesData<TranslationMemoryEntry[]>({
        queryKey: memoryKeys.lists(),
      });

      const previousData: Array<[QueryKey, TranslationMemoryEntry[]]> = [];

      // Optimistically update each list
      for (const [queryKey, data] of queries) {
        if (data) {
          previousData.push([queryKey, data]);

          queryClient.setQueryData(
            queryKey,
            data.map((entry) =>
              entry.id === id
                ? {
                    ...entry,
                    usageCount: entry.usageCount + 1,
                    lastUsedAt: new Date(),
                  }
                : entry
            )
          );
        }
      }

      return { previousData };
    },

    onError: (_err, _id, context) => {
      // Rollback all optimistic updates
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },

    onSettled: () => {
      // Refetch to ensure data is in sync
      queryClient.invalidateQueries({ queryKey: memoryKeys.lists() });
    },
  });
}

/**
 * Delete a translation memory entry with optimistic updates
 */
export function useDeleteMemoryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMemoryEntry,

    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: memoryKeys.lists() });
      await queryClient.cancelQueries({ queryKey: memoryKeys.search() });

      // Get all list queries
      const listQueries = queryClient.getQueriesData<TranslationMemoryEntry[]>({
        queryKey: memoryKeys.lists(),
      });

      const searchQueries = queryClient.getQueriesData<TranslationSuggestion[]>({
        queryKey: memoryKeys.search(),
      });

      const previousData: {
        lists: Array<[QueryKey, TranslationMemoryEntry[]]>;
        searches: Array<[QueryKey, TranslationSuggestion[]]>;
      } = {
        lists: [],
        searches: [],
      };

      // Optimistically remove from lists
      for (const [queryKey, data] of listQueries) {
        if (data) {
          previousData.lists.push([queryKey, data]);
          queryClient.setQueryData(
            queryKey,
            data.filter((entry) => entry.id !== id)
          );
        }
      }

      // Optimistically remove from search results
      for (const [queryKey, data] of searchQueries) {
        if (data) {
          previousData.searches.push([queryKey, data]);
          queryClient.setQueryData(
            queryKey,
            data.filter((suggestion) => suggestion.entry.id !== id)
          );
        }
      }

      return { previousData };
    },

    onError: (_err, _id, context) => {
      // Rollback all optimistic updates
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData.lists) {
          queryClient.setQueryData(queryKey, data);
        }
        for (const [queryKey, data] of context.previousData.searches) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },

    onSettled: () => {
      // Refetch to ensure data is in sync
      queryClient.invalidateQueries({ queryKey: memoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: memoryKeys.search() });
    },
  });
}

/**
 * Prefetch translation memory for faster navigation
 */
export function usePrefetchTranslationMemory() {
  const queryClient = useQueryClient();

  return (projectId?: string, sourceLanguage?: string, targetLanguage?: string) => {
    queryClient.prefetchQuery({
      queryKey: memoryKeys.list(projectId, sourceLanguage, targetLanguage),
      queryFn: () => getTranslationMemory(projectId, sourceLanguage, targetLanguage),
      staleTime: 5 * 60 * 1000,
    });
  };
}
