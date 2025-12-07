import PocketBase from "pocketbase";
import type {
  TypedPocketBase,
  UsersRecord,
  ProjectsRecord,
  TranslationKeysRecord,
  TranslationsRecord,
  AiTranslationsRecord,
  CommentsRecord,
  ApprovalsRecord,
  ActivityLogsRecord,
  TranslationVersionsRecord,
  TranslationMemoryRecord,
} from "./pocketbase-types";

// ============================================
// PocketBase Instance
// ============================================

// Create a typed PocketBase instance
const pb = new PocketBase(
  process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090"
) as TypedPocketBase;

// Disable auto-cancellation for concurrent requests
pb.autoCancellation(false);

// Export the PocketBase instance
export { pb };

// ============================================
// Collection Helpers
// ============================================

export const collections = {
  users: () => pb.collection("users"),
  projects: () => pb.collection("projects"),
  translationKeys: () => pb.collection("translation_keys"),
  translations: () => pb.collection("translations"),
  aiTranslations: () => pb.collection("ai_translations"),
  comments: () => pb.collection("comments"),
  approvals: () => pb.collection("approvals"),
  activityLogs: () => pb.collection("activity_logs"),
  translationVersions: () => pb.collection("translation_versions"),
  translationMemory: () => pb.collection("translation_memory"),
};

// ============================================
// Auth Helper Functions
// ============================================

export const auth = {
  /**
   * Check if current session is valid
   */
  isAuthenticated: () => pb.authStore.isValid,

  /**
   * Get current authenticated user
   */
  getCurrentUser: () => pb.authStore.record as UsersRecord | null,

  /**
   * Get current auth token
   */
  getToken: () => pb.authStore.token,

  /**
   * Login with email and password
   */
  loginWithEmail: async (email: string, password: string) => {
    return await pb.collection("users").authWithPassword(email, password);
  },

  /**
   * Register a new user with email and password
   */
  registerWithEmail: async (
    email: string,
    password: string,
    name?: string
  ) => {
    const user = await pb.collection("users").create({
      email,
      password,
      passwordConfirm: password,
      name: name || "",
    });
    // Auto-login after registration
    await pb.collection("users").authWithPassword(email, password);
    return user;
  },

  /**
   * Login with OAuth2 provider
   */
  loginWithOAuth2: async (provider: "google" | "github" | "apple") => {
    return await pb.collection("users").authWithOAuth2({ provider });
  },

  /**
   * Logout and clear auth state
   */
  logout: () => {
    pb.authStore.clear();
  },

  /**
   * Refresh the auth token
   */
  refreshAuth: async () => {
    if (pb.authStore.isValid) {
      return await pb.collection("users").authRefresh();
    }
    return null;
  },

  /**
   * Request a password reset email
   */
  requestPasswordReset: async (email: string) => {
    return await pb.collection("users").requestPasswordReset(email);
  },

  /**
   * Confirm password reset with token
   */
  confirmPasswordReset: async (
    token: string,
    password: string,
    passwordConfirm: string
  ) => {
    return await pb
      .collection("users")
      .confirmPasswordReset(token, password, passwordConfirm);
  },

  /**
   * Request email verification
   */
  requestVerification: async (email: string) => {
    return await pb.collection("users").requestVerification(email);
  },

  /**
   * Confirm email verification with token
   */
  confirmVerification: async (token: string) => {
    return await pb.collection("users").confirmVerification(token);
  },
};

// ============================================
// File URL Helper
// ============================================

/**
 * Get the URL for a file stored in PocketBase
 * @param record - The record containing the file
 * @param filename - The filename field value
 * @param options - Optional thumb size (e.g., "100x100")
 */
export function getFileUrl(
  record: { id: string; collectionId: string; collectionName: string },
  filename: string,
  options?: { thumb?: string }
): string {
  return pb.files.getURL(record, filename, options);
}

// ============================================
// Re-export Types for Convenience
// ============================================

export type {
  UsersRecord,
  ProjectsRecord,
  TranslationKeysRecord,
  TranslationsRecord,
  AiTranslationsRecord,
  CommentsRecord,
  ApprovalsRecord,
  ActivityLogsRecord,
  TranslationVersionsRecord,
  TranslationMemoryRecord,
} from "./pocketbase-types";

// Also export commonly used helper types
export type {
  ProjectCardData,
  TranslationKeyWithTranslations,
  AiSuggestion,
  CommentDisplay,
  ActivityItem,
  VersionHistoryEntry,
  MemorySuggestion,
  ApprovalStatus,
  ActivityType,
  ChangeType,
} from "./pocketbase-types";

// Export Collections constant
export { Collections } from "./pocketbase-types";
