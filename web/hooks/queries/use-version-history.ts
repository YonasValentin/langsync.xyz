import { useQuery } from "@tanstack/react-query";
import { pb, Collections } from "@/lib/pocketbase";
import type {
  TranslationKeysRecord,
  TranslationVersionsRecord,
  TranslationVersionExpanded,
  VersionHistoryEntry,
  ChangeType,
} from "@/lib/pocketbase-types";

// ============================================
// Query Keys Factory
// ============================================

export const versionKeys = {
  all: ["versions"] as const,
  lists: () => [...versionKeys.all, "list"] as const,
  list: (projectId: string, filters?: { keyId?: string; language?: string }) =>
    [...versionKeys.lists(), projectId, filters] as const,
  history: (keyId: string, language?: string) =>
    [...versionKeys.all, "history", keyId, language] as const,
  stats: (projectId: string, since?: Date) =>
    [...versionKeys.all, "stats", projectId, since?.toISOString()] as const,
};

// ============================================
// Types
// ============================================

export interface VersionStats {
  total: number;
  byChangeType: Record<ChangeType, number>;
  byLanguage: Record<string, number>;
  byUser: Record<string, { count: number; userName: string }>;
}

// ============================================
// API Functions
// ============================================

async function getVersionHistory(
  projectId: string,
  keyId: string,
  language?: string
): Promise<VersionHistoryEntry[]> {
  if (!pb.authStore.isValid) return [];

  // Get all keys for the project to verify keyId belongs to this project
  const keys = await pb
    .collection(Collections.TRANSLATION_KEYS)
    .getFullList<TranslationKeysRecord>({
      filter: `project = "${projectId}"`,
      fields: "id",
    });

  const keyIds = keys.map((k) => k.id);
  if (!keyIds.includes(keyId)) return [];

  // Build filter
  const filters: string[] = [`translationKey = "${keyId}"`];
  if (language) filters.push(`language = "${language}"`);

  // Get versions
  const versions = await pb
    .collection(Collections.TRANSLATION_VERSIONS)
    .getFullList<TranslationVersionExpanded>({
      filter: filters.join(" && "),
      sort: "-created",
      expand: "user",
    });

  // Transform to VersionHistoryEntry
  return versions.map((v) => ({
    id: v.id,
    keyId: v.translationKey,
    language: v.language,
    value: v.value,
    previousValue: v.previousValue,
    user: {
      id: v.user,
      name: v.expand?.user?.name || "Unknown",
      avatar: v.expand?.user?.avatar,
    },
    changeType: v.changeType,
    created: v.created,
  }));
}

async function getVersionStats(
  projectId: string,
  since?: Date
): Promise<VersionStats> {
  if (!pb.authStore.isValid) {
    return {
      total: 0,
      byChangeType: {} as Record<ChangeType, number>,
      byLanguage: {},
      byUser: {},
    };
  }

  // Get all keys for the project
  const keys = await pb
    .collection(Collections.TRANSLATION_KEYS)
    .getFullList<TranslationKeysRecord>({
      filter: `project = "${projectId}"`,
      fields: "id",
    });

  if (keys.length === 0) {
    return {
      total: 0,
      byChangeType: {} as Record<ChangeType, number>,
      byLanguage: {},
      byUser: {},
    };
  }

  // Build filter for versions
  const keyFilters = keys.map((k) => `translationKey = "${k.id}"`).join(" || ");
  let filter = `(${keyFilters})`;
  if (since) {
    filter += ` && created >= "${since.toISOString()}"`;
  }

  // Get versions with user expansion
  const versions = await pb
    .collection(Collections.TRANSLATION_VERSIONS)
    .getFullList<TranslationVersionExpanded>({
      filter,
      expand: "user",
    });

  // Calculate statistics
  const byChangeType: Record<string, number> = {};
  const byLanguage: Record<string, number> = {};
  const byUser: Record<string, { count: number; userName: string }> = {};

  for (const v of versions) {
    // Count by change type
    byChangeType[v.changeType] = (byChangeType[v.changeType] || 0) + 1;

    // Count by language
    byLanguage[v.language] = (byLanguage[v.language] || 0) + 1;

    // Count by user
    const userId = v.user;
    const userName = v.expand?.user?.name || "Unknown";
    if (!byUser[userId]) {
      byUser[userId] = { count: 0, userName };
    }
    byUser[userId].count++;
  }

  return {
    total: versions.length,
    byChangeType: byChangeType as Record<ChangeType, number>,
    byLanguage,
    byUser,
  };
}

// ============================================
// Query Hooks
// ============================================

/**
 * Fetch version history for a specific translation key
 * @param projectId - Project ID to verify key ownership
 * @param keyId - Translation key ID
 * @param language - Optional language filter
 */
export function useVersionHistory(
  projectId: string,
  keyId: string,
  language?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: versionKeys.history(keyId, language),
    queryFn: () => getVersionHistory(projectId, keyId, language),
    enabled:
      options?.enabled !== false &&
      !!projectId &&
      !!keyId &&
      pb.authStore.isValid,
    staleTime: 30 * 1000, // 30 seconds - version history doesn't change frequently
  });
}

/**
 * Fetch version statistics for a project
 * @param projectId - Project ID
 * @param since - Optional date to get stats since
 */
export function useVersionStats(
  projectId: string,
  since?: Date,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: versionKeys.stats(projectId, since),
    queryFn: () => getVersionStats(projectId, since),
    enabled: options?.enabled !== false && !!projectId && pb.authStore.isValid,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================
// Re-export types from pocketbase-types
// ============================================

export type { VersionHistoryEntry, ChangeType };
