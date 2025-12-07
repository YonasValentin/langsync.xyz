// ============================================
// Centralized Query Hooks Export
// ============================================

// Projects
export {
  projectKeys,
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  usePrefetchProject,
  type ProjectWithStats,
  type CreateProjectInput,
  type UpdateProjectInput,
} from "./use-projects";

// Translations
export {
  translationKeys,
  useTranslationKeys,
  useCreateTranslationKey,
  useUpdateTranslation,
  useDeleteTranslationKey,
  useDeleteMultipleKeys,
  type CreateTranslationKeyInput,
  type UpdateTranslationInput,
  type BatchTranslationUpdate,
} from "./use-translations";

// AI Translations
export {
  aiKeys,
  useAiUsage,
  useTranslateKey,
  useTranslateBatch,
  useAutoTranslateMissing,
  useAcceptAiTranslation,
  type AiUsageStats,
  type TranslateKeyInput,
  type TranslateBatchInput,
  type AutoTranslateMissingInput,
  type AcceptAiTranslationInput,
} from "./use-ai";

// Version History
export {
  versionKeys,
  useVersionHistory,
  useVersionStats,
  type VersionStats,
  type VersionHistoryEntry,
  type ChangeType,
} from "./use-version-history";

// Collaboration (Comments, Approvals, Activity)
export {
  commentKeys,
  approvalKeys,
  activityKeys,
  useComments,
  useUnresolvedCommentCount,
  useCreateComment,
  useUpdateComment,
  useResolveComment,
  useDeleteComment,
  useApprovals,
  usePendingApprovalCount,
  useCreateApproval,
  useUpdateApprovalStatus,
  useDeleteApproval,
  useActivityLogs,
  useActivityTypes,
  useActivityStats,
  type CommentDisplay,
  type CreateCommentInput,
  type UpdateCommentInput,
  type ResolveCommentInput,
  type ApprovalDisplay,
  type CreateApprovalInput,
  type UpdateApprovalStatusInput,
  type ActivityLogDisplay,
  type ActivityLogsOptions,
  type ActivityStats,
} from "./use-collaboration";

// Translation Memory
export {
  memoryKeys,
  useTranslationMemory,
  useSearchTranslationMemory,
  useCreateMemoryEntry,
  useIncrementMemoryUsage,
  useDeleteMemoryEntry,
  usePrefetchTranslationMemory,
  type TranslationMemoryEntry,
  type TranslationSuggestion,
  type CreateMemoryEntryInput,
  type SearchMemoryParams,
} from "./use-translation-memory";
