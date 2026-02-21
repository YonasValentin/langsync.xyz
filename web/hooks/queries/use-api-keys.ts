import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pb, Collections } from "@/lib/pocketbase";
import { escapeFilterValue } from "@/lib/api/sanitize";
import type { ApiKeysRecord, ApiKeysExpanded } from "@/lib/pocketbase-types";

// ============================================
// Query Keys Factory
// ============================================

export const apiKeyKeys = {
  all: ["api-keys"] as const,
  lists: () => [...apiKeyKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...apiKeyKeys.lists(), filters] as const,
  detail: (id: string) => [...apiKeyKeys.all, "detail", id] as const,
};

// ============================================
// Types
// ============================================

export interface ApiKeyDisplay {
  id: string;
  name: string;
  prefix: string;
  projectId?: string;
  projectName?: string;
  lastUsedAt?: string;
  expiresAt?: string;
  revoked: boolean;
  revokedAt?: string;
  created: string;
}

export interface CreateApiKeyInput {
  name: string;
  projectId?: string; // Optional: scope to a specific project
  expiresAt?: string; // Optional: ISO date string
}

// ============================================
// Key Generation
// ============================================

function generateApiKey(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = new Uint8Array(48);
  crypto.getRandomValues(randomValues);
  let key = "lsk_";
  for (let i = 0; i < 48; i++) {
    key += chars[randomValues[i] % chars.length];
  }
  return key;
}

// ============================================
// API Functions
// ============================================

async function getApiKeys(): Promise<ApiKeyDisplay[]> {
  const userId = pb.authStore.record?.id;
  if (!userId) return [];

  const keys = await pb
    .collection(Collections.API_KEYS)
    .getFullList<ApiKeysExpanded>({
      filter: `user = "${escapeFilterValue(userId)}"`,
      sort: "-created",
      expand: "project",
    });

  return keys.map((key) => ({
    id: key.id,
    name: key.name,
    prefix: key.prefix,
    projectId: key.project || undefined,
    projectName: key.expand?.project?.name,
    lastUsedAt: key.lastUsedAt || undefined,
    expiresAt: key.expiresAt || undefined,
    revoked: key.revoked,
    revokedAt: key.revokedAt || undefined,
    created: key.created,
  }));
}

async function createApiKey(
  input: CreateApiKeyInput
): Promise<{ record: ApiKeysRecord; fullKey: string }> {
  const userId = pb.authStore.record?.id;
  if (!userId) throw new Error("Not authenticated");

  const fullKey = generateApiKey();
  const prefix = fullKey.slice(0, 8) + "...";

  const record = await pb
    .collection(Collections.API_KEYS)
    .create<ApiKeysRecord>({
      user: userId,
      name: input.name,
      key: fullKey,
      prefix,
      project: input.projectId || "",
      expiresAt: input.expiresAt || "",
      revoked: false,
    });

  return { record, fullKey };
}

async function revokeApiKey(id: string): Promise<ApiKeysRecord> {
  return await pb.collection(Collections.API_KEYS).update<ApiKeysRecord>(id, {
    revoked: true,
    revokedAt: new Date().toISOString(),
  });
}

async function deleteApiKey(id: string): Promise<boolean> {
  await pb.collection(Collections.API_KEYS).delete(id);
  return true;
}

// ============================================
// Query Hooks
// ============================================

/**
 * Fetch all API keys for the current user
 */
export function useApiKeys(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: apiKeyKeys.lists(),
    queryFn: getApiKeys,
    enabled: options?.enabled !== false && pb.authStore.isValid,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Create a new API key
 */
export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.lists() });
    },
  });
}

/**
 * Revoke an API key (soft delete - key stops working but remains visible)
 */
export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeApiKey,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: apiKeyKeys.lists() });

      const previousKeys = queryClient.getQueryData<ApiKeyDisplay[]>(
        apiKeyKeys.lists()
      );

      // Optimistic update
      if (previousKeys) {
        queryClient.setQueryData(
          apiKeyKeys.lists(),
          previousKeys.map((k) =>
            k.id === id
              ? {
                  ...k,
                  revoked: true,
                  revokedAt: new Date().toISOString(),
                }
              : k
          )
        );
      }

      return { previousKeys };
    },
    onError: (_err, _id, context) => {
      if (context?.previousKeys) {
        queryClient.setQueryData(apiKeyKeys.lists(), context.previousKeys);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.lists() });
    },
  });
}

/**
 * Permanently delete an API key
 */
export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteApiKey,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: apiKeyKeys.lists() });

      const previousKeys = queryClient.getQueryData<ApiKeyDisplay[]>(
        apiKeyKeys.lists()
      );

      // Optimistic removal
      if (previousKeys) {
        queryClient.setQueryData(
          apiKeyKeys.lists(),
          previousKeys.filter((k) => k.id !== id)
        );
      }

      return { previousKeys };
    },
    onError: (_err, _id, context) => {
      if (context?.previousKeys) {
        queryClient.setQueryData(apiKeyKeys.lists(), context.previousKeys);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.lists() });
    },
  });
}
