import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pb, Collections } from "@/lib/pocketbase";
import type {
  CommentsRecord,
  CommentExpanded,
  ApprovalsRecord,
  ApprovalExpanded,
  ActivityLogsRecord,
  ActivityLogExpanded,
  ActivityType,
  ApprovalStatus,
  TranslationKeysRecord,
  UsersRecord,
} from "@/lib/pocketbase-types";
import { translationKeys } from "./use-translations";

// ============================================
// Query Keys Factory
// ============================================

export const commentKeys = {
  all: ["comments"] as const,
  lists: () => [...commentKeys.all, "list"] as const,
  list: (projectId: string, keyId?: string, language?: string, resolved?: boolean) =>
    [...commentKeys.lists(), { projectId, keyId, language, resolved }] as const,
  detail: (id: string) => [...commentKeys.all, "detail", id] as const,
  unresolvedCount: (projectId: string, keyId?: string) =>
    [...commentKeys.all, "unresolved-count", projectId, keyId] as const,
};

export const approvalKeys = {
  all: ["approvals"] as const,
  lists: () => [...approvalKeys.all, "list"] as const,
  list: (projectId: string, keyId?: string, language?: string, status?: string) =>
    [...approvalKeys.lists(), { projectId, keyId, language, status }] as const,
  detail: (keyId: string, language: string) =>
    [...approvalKeys.all, "detail", keyId, language] as const,
  pendingCount: (projectId: string) =>
    [...approvalKeys.all, "pending-count", projectId] as const,
};

export const activityKeys = {
  all: ["activity"] as const,
  lists: () => [...activityKeys.all, "list"] as const,
  list: (
    projectId: string,
    keyId?: string,
    type?: string,
    language?: string,
    limit?: number,
    offset?: number
  ) =>
    [...activityKeys.lists(), { projectId, keyId, type, language, limit, offset }] as const,
  types: (projectId: string) => [...activityKeys.all, "types", projectId] as const,
  stats: (projectId: string, since?: string) =>
    [...activityKeys.all, "stats", projectId, since] as const,
};

// ============================================
// Types
// ============================================

export interface CommentDisplay {
  id: string;
  keyId: string;
  text: string;
  language?: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  resolved: boolean;
  resolvedBy?: {
    id: string;
    name: string;
  };
  resolvedAt?: string;
  created: string;
  updated: string;
}

export interface CreateCommentInput {
  keyId: string;
  text: string;
  language?: string;
}

export interface UpdateCommentInput {
  commentId: string;
  text: string;
}

export interface ResolveCommentInput {
  commentId: string;
  resolved?: boolean;
}

export interface ApprovalDisplay {
  id: string;
  keyId: string;
  language: string;
  status: ApprovalStatus;
  approvedBy?: {
    id: string;
    name: string;
  };
  approvedAt?: string;
  rejectedBy?: {
    id: string;
    name: string;
  };
  rejectedAt?: string;
  rejectionReason?: string;
  created: string;
  updated: string;
}

export interface CreateApprovalInput {
  keyId: string;
  language: string;
}

export interface UpdateApprovalStatusInput {
  approvalId: string;
  status: ApprovalStatus;
  rejectionReason?: string;
}

export interface ActivityLogDisplay {
  id: string;
  type: ActivityType;
  description: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  keyId?: string;
  keyName?: string;
  language?: string;
  metadata?: Record<string, unknown>;
  created: string;
}

export interface ActivityLogsOptions {
  keyId?: string;
  type?: string;
  language?: string;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export interface ActivityStats {
  total: number;
  byType: Record<string, number>;
  byUser: Record<string, number>;
}

// ============================================
// Helper Functions
// ============================================

function transformComment(comment: CommentExpanded): CommentDisplay {
  return {
    id: comment.id,
    keyId: comment.translationKey,
    text: comment.text,
    language: comment.language,
    user: {
      id: comment.user,
      name: comment.expand?.user?.name || "Unknown User",
      avatar: comment.expand?.user?.avatar,
    },
    resolved: comment.resolved,
    resolvedBy: comment.resolvedBy && comment.expand?.resolvedBy
      ? {
          id: comment.resolvedBy,
          name: comment.expand.resolvedBy.name,
        }
      : undefined,
    resolvedAt: comment.resolvedAt,
    created: comment.created,
    updated: comment.updated,
  };
}

function transformApproval(approval: ApprovalExpanded): ApprovalDisplay {
  return {
    id: approval.id,
    keyId: approval.translationKey,
    language: approval.language,
    status: approval.status,
    approvedBy: approval.approvedBy && approval.expand?.approvedBy
      ? {
          id: approval.approvedBy,
          name: approval.expand.approvedBy.name,
        }
      : undefined,
    approvedAt: approval.approvedAt,
    rejectedBy: approval.rejectedBy && approval.expand?.rejectedBy
      ? {
          id: approval.rejectedBy,
          name: approval.expand.rejectedBy.name,
        }
      : undefined,
    rejectedAt: approval.rejectedAt,
    rejectionReason: approval.rejectionReason,
    created: approval.created,
    updated: approval.updated,
  };
}

function transformActivity(activity: ActivityLogExpanded): ActivityLogDisplay {
  return {
    id: activity.id,
    type: activity.type,
    description: activity.description,
    user: {
      id: activity.user,
      name: activity.expand?.user?.name || "Unknown User",
      avatar: activity.expand?.user?.avatar,
    },
    keyId: activity.translationKey,
    keyName: activity.expand?.translationKey?.key,
    language: activity.language,
    metadata: activity.metadata,
    created: activity.created,
  };
}

// ============================================
// API Functions - Comments
// ============================================

async function getComments(
  projectId: string,
  keyId?: string,
  language?: string,
  resolved?: boolean
): Promise<CommentDisplay[]> {
  if (!pb.authStore.isValid) return [];

  const filters: string[] = [`project = "${projectId}"`];
  if (keyId) filters.push(`translationKey = "${keyId}"`);
  if (language) filters.push(`language = "${language}"`);
  if (resolved !== undefined) filters.push(`resolved = ${resolved}`);

  const comments = await pb
    .collection(Collections.COMMENTS)
    .getFullList<CommentExpanded>({
      filter: filters.join(" && "),
      sort: "-created",
      expand: "user,resolvedBy",
    });

  return comments.map(transformComment);
}

async function createComment(
  projectId: string,
  data: CreateCommentInput
): Promise<CommentDisplay> {
  const userId = pb.authStore.record?.id;
  if (!userId) throw new Error("Not authenticated");

  const comment = await pb.collection(Collections.COMMENTS).create<CommentsRecord>({
    project: projectId,
    translationKey: data.keyId,
    user: userId,
    text: data.text,
    language: data.language,
    resolved: false,
  });

  // Log activity
  await pb.collection(Collections.ACTIVITY_LOGS).create({
    project: projectId,
    user: userId,
    type: "comment_added",
    translationKey: data.keyId,
    language: data.language,
    description: "Added a comment",
  });

  // Fetch the created comment with expanded relations
  const expandedComment = await pb
    .collection(Collections.COMMENTS)
    .getOne<CommentExpanded>(comment.id, {
      expand: "user,resolvedBy",
    });

  return transformComment(expandedComment);
}

async function updateComment(
  projectId: string,
  commentId: string,
  text: string
): Promise<CommentDisplay> {
  const updated = await pb
    .collection(Collections.COMMENTS)
    .update<CommentsRecord>(commentId, { text });

  // Fetch updated comment with expanded relations
  const expandedComment = await pb
    .collection(Collections.COMMENTS)
    .getOne<CommentExpanded>(updated.id, {
      expand: "user,resolvedBy",
    });

  return transformComment(expandedComment);
}

async function resolveComment(
  projectId: string,
  commentId: string,
  resolved: boolean = true
): Promise<CommentDisplay> {
  const userId = pb.authStore.record?.id;
  if (!userId) throw new Error("Not authenticated");

  const updateData: Partial<CommentsRecord> = {
    resolved,
    resolvedBy: resolved ? userId : undefined,
    resolvedAt: resolved ? new Date().toISOString() : undefined,
  };

  const updated = await pb
    .collection(Collections.COMMENTS)
    .update<CommentsRecord>(commentId, updateData);

  // Log activity
  const comment = await pb
    .collection(Collections.COMMENTS)
    .getOne<CommentsRecord>(commentId);

  await pb.collection(Collections.ACTIVITY_LOGS).create({
    project: projectId,
    user: userId,
    type: resolved ? "comment_resolved" : "comment_added",
    translationKey: comment.translationKey,
    language: comment.language,
    description: resolved ? "Resolved a comment" : "Reopened a comment",
  });

  // Fetch updated comment with expanded relations
  const expandedComment = await pb
    .collection(Collections.COMMENTS)
    .getOne<CommentExpanded>(updated.id, {
      expand: "user,resolvedBy",
    });

  return transformComment(expandedComment);
}

async function deleteComment(projectId: string, commentId: string): Promise<boolean> {
  await pb.collection(Collections.COMMENTS).delete(commentId);
  return true;
}

async function getUnresolvedCommentCount(
  projectId: string,
  keyId?: string
): Promise<number> {
  if (!pb.authStore.isValid) return 0;

  const filters: string[] = [`project = "${projectId}"`, "resolved = false"];
  if (keyId) filters.push(`translationKey = "${keyId}"`);

  const comments = await pb
    .collection(Collections.COMMENTS)
    .getFullList<CommentsRecord>({
      filter: filters.join(" && "),
      fields: "id",
    });

  return comments.length;
}

// ============================================
// API Functions - Approvals
// ============================================

async function getApprovals(
  projectId: string,
  keyId?: string,
  language?: string,
  status?: string
): Promise<ApprovalDisplay[]> {
  if (!pb.authStore.isValid) return [];

  // First, get all keys for this project
  const keys = await pb
    .collection(Collections.TRANSLATION_KEYS)
    .getFullList<TranslationKeysRecord>({
      filter: `project = "${projectId}"`,
      fields: "id",
    });

  if (keys.length === 0) return [];

  const keyFilters = keys.map((k) => `translationKey = "${k.id}"`).join(" || ");
  const filters: string[] = [`(${keyFilters})`];
  if (keyId) filters.push(`translationKey = "${keyId}"`);
  if (language) filters.push(`language = "${language}"`);
  if (status) filters.push(`status = "${status}"`);

  const approvals = await pb
    .collection(Collections.APPROVALS)
    .getFullList<ApprovalExpanded>({
      filter: filters.join(" && "),
      sort: "-created",
      expand: "approvedBy,rejectedBy",
    });

  return approvals.map(transformApproval);
}

async function createApproval(
  projectId: string,
  data: CreateApprovalInput
): Promise<ApprovalDisplay> {
  const userId = pb.authStore.record?.id;
  if (!userId) throw new Error("Not authenticated");

  const approval = await pb.collection(Collections.APPROVALS).create<ApprovalsRecord>({
    translationKey: data.keyId,
    language: data.language,
    status: "pending",
  });

  // Log activity
  await pb.collection(Collections.ACTIVITY_LOGS).create({
    project: projectId,
    user: userId,
    type: "translation_approved",
    translationKey: data.keyId,
    language: data.language,
    description: "Requested approval",
  });

  // Fetch the created approval with expanded relations
  const expandedApproval = await pb
    .collection(Collections.APPROVALS)
    .getOne<ApprovalExpanded>(approval.id, {
      expand: "approvedBy,rejectedBy",
    });

  return transformApproval(expandedApproval);
}

async function updateApprovalStatus(
  projectId: string,
  approvalId: string,
  status: ApprovalStatus,
  rejectionReason?: string
): Promise<ApprovalDisplay> {
  const userId = pb.authStore.record?.id;
  if (!userId) throw new Error("Not authenticated");

  const now = new Date().toISOString();
  const updateData: Partial<ApprovalsRecord> = { status };

  if (status === "approved") {
    updateData.approvedBy = userId;
    updateData.approvedAt = now;
  } else if (status === "rejected") {
    updateData.rejectedBy = userId;
    updateData.rejectedAt = now;
    updateData.rejectionReason = rejectionReason;
  }

  const updated = await pb
    .collection(Collections.APPROVALS)
    .update<ApprovalsRecord>(approvalId, updateData);

  // Log activity
  const approval = await pb
    .collection(Collections.APPROVALS)
    .getOne<ApprovalsRecord>(approvalId);

  await pb.collection(Collections.ACTIVITY_LOGS).create({
    project: projectId,
    user: userId,
    type: status === "approved" ? "translation_approved" : "translation_rejected",
    translationKey: approval.translationKey,
    language: approval.language,
    description: `Approval ${status}`,
  });

  // Fetch updated approval with expanded relations
  const expandedApproval = await pb
    .collection(Collections.APPROVALS)
    .getOne<ApprovalExpanded>(updated.id, {
      expand: "approvedBy,rejectedBy",
    });

  return transformApproval(expandedApproval);
}

async function deleteApproval(projectId: string, approvalId: string): Promise<boolean> {
  await pb.collection(Collections.APPROVALS).delete(approvalId);
  return true;
}

async function getPendingApprovalCount(projectId: string): Promise<number> {
  if (!pb.authStore.isValid) return 0;

  // First, get all keys for this project
  const keys = await pb
    .collection(Collections.TRANSLATION_KEYS)
    .getFullList<TranslationKeysRecord>({
      filter: `project = "${projectId}"`,
      fields: "id",
    });

  if (keys.length === 0) return 0;

  const keyFilters = keys.map((k) => `translationKey = "${k.id}"`).join(" || ");
  const filters = [
    `(${keyFilters})`,
    `(status = "pending" || status = "needs_review")`,
  ];

  const approvals = await pb
    .collection(Collections.APPROVALS)
    .getFullList<ApprovalsRecord>({
      filter: filters.join(" && "),
      fields: "id",
    });

  return approvals.length;
}

// ============================================
// API Functions - Activity Logs
// ============================================

async function getActivityLogs(
  projectId: string,
  keyId?: string,
  type?: string,
  language?: string,
  limit = 50,
  offset = 0
): Promise<ActivityLogDisplay[]> {
  if (!pb.authStore.isValid) return [];

  const filters: string[] = [`project = "${projectId}"`];
  if (keyId) filters.push(`translationKey = "${keyId}"`);
  if (type) filters.push(`type = "${type}"`);
  if (language) filters.push(`language = "${language}"`);

  const page = Math.floor(offset / limit) + 1;

  const result = await pb
    .collection(Collections.ACTIVITY_LOGS)
    .getList<ActivityLogExpanded>(page, limit, {
      filter: filters.join(" && "),
      sort: "-created",
      expand: "user,translationKey",
    });

  return result.items.map(transformActivity);
}

async function getActivityTypes(projectId: string): Promise<string[]> {
  if (!pb.authStore.isValid) return [];

  const activities = await pb
    .collection(Collections.ACTIVITY_LOGS)
    .getFullList<ActivityLogsRecord>({
      filter: `project = "${projectId}"`,
      fields: "type",
    });

  return [...new Set(activities.map((a) => a.type))];
}

async function getActivityStats(
  projectId: string,
  since?: string
): Promise<ActivityStats> {
  if (!pb.authStore.isValid)
    return { total: 0, byType: {}, byUser: {} };

  let filter = `project = "${projectId}"`;
  if (since) filter += ` && created >= "${since}"`;

  const activities = await pb
    .collection(Collections.ACTIVITY_LOGS)
    .getFullList<ActivityLogExpanded>({
      filter,
      expand: "user",
    });

  const byType: Record<string, number> = {};
  const byUser: Record<string, number> = {};

  for (const activity of activities) {
    byType[activity.type] = (byType[activity.type] || 0) + 1;

    const userName = activity.expand?.user?.name || "Unknown User";
    byUser[userName] = (byUser[userName] || 0) + 1;
  }

  return {
    total: activities.length,
    byType,
    byUser,
  };
}

// ============================================
// Query Hooks - Comments
// ============================================

/**
 * Fetch comments for a project, optionally filtered by key, language, or resolved status
 */
export function useComments(
  projectId: string,
  keyId?: string,
  language?: string,
  resolved?: boolean,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: commentKeys.list(projectId, keyId, language, resolved),
    queryFn: () => getComments(projectId, keyId, language, resolved),
    enabled:
      options?.enabled !== false && !!projectId && pb.authStore.isValid,
    staleTime: 30 * 1000, // 30 seconds (comments change frequently)
  });
}

/**
 * Get count of unresolved comments
 */
export function useUnresolvedCommentCount(
  projectId: string,
  keyId?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: commentKeys.unresolvedCount(projectId, keyId),
    queryFn: () => getUnresolvedCommentCount(projectId, keyId),
    enabled:
      options?.enabled !== false && !!projectId && pb.authStore.isValid,
    staleTime: 30 * 1000,
  });
}

// ============================================
// Mutation Hooks - Comments
// ============================================

/**
 * Create a new comment
 */
export function useCreateComment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCommentInput) => createComment(projectId, data),
    onSuccess: (newComment) => {
      // Invalidate all comment lists for this project
      queryClient.invalidateQueries({ queryKey: commentKeys.lists() });

      // Invalidate unresolved count
      queryClient.invalidateQueries({
        queryKey: commentKeys.unresolvedCount(projectId),
      });

      // Invalidate activity logs
      queryClient.invalidateQueries({ queryKey: activityKeys.lists() });

      // Invalidate translation keys to update comment indicators
      queryClient.invalidateQueries({
        queryKey: translationKeys.list(projectId),
      });
    },
  });
}

/**
 * Update an existing comment
 */
export function useUpdateComment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, text }: UpdateCommentInput) =>
      updateComment(projectId, commentId, text),
    onSuccess: () => {
      // Invalidate comment lists
      queryClient.invalidateQueries({ queryKey: commentKeys.lists() });
    },
  });
}

/**
 * Resolve or unresolve a comment
 */
export function useResolveComment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, resolved = true }: ResolveCommentInput) =>
      resolveComment(projectId, commentId, resolved),
    onSuccess: () => {
      // Invalidate comment lists
      queryClient.invalidateQueries({ queryKey: commentKeys.lists() });

      // Invalidate unresolved count
      queryClient.invalidateQueries({
        queryKey: commentKeys.unresolvedCount(projectId),
      });

      // Invalidate activity logs
      queryClient.invalidateQueries({ queryKey: activityKeys.lists() });
    },
  });
}

/**
 * Delete a comment
 */
export function useDeleteComment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => deleteComment(projectId, commentId),
    onSuccess: () => {
      // Invalidate comment lists
      queryClient.invalidateQueries({ queryKey: commentKeys.lists() });

      // Invalidate unresolved count
      queryClient.invalidateQueries({
        queryKey: commentKeys.unresolvedCount(projectId),
      });
    },
  });
}

// ============================================
// Query Hooks - Approvals
// ============================================

/**
 * Fetch approvals for a project, optionally filtered by key, language, or status
 */
export function useApprovals(
  projectId: string,
  keyId?: string,
  language?: string,
  status?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: approvalKeys.list(projectId, keyId, language, status),
    queryFn: () => getApprovals(projectId, keyId, language, status),
    enabled:
      options?.enabled !== false && !!projectId && pb.authStore.isValid,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Get count of pending approvals
 */
export function usePendingApprovalCount(
  projectId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: approvalKeys.pendingCount(projectId),
    queryFn: () => getPendingApprovalCount(projectId),
    enabled:
      options?.enabled !== false && !!projectId && pb.authStore.isValid,
    staleTime: 60 * 1000,
  });
}

// ============================================
// Mutation Hooks - Approvals
// ============================================

/**
 * Create a new approval request
 */
export function useCreateApproval(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApprovalInput) => createApproval(projectId, data),
    onSuccess: () => {
      // Invalidate approval lists
      queryClient.invalidateQueries({ queryKey: approvalKeys.lists() });

      // Invalidate pending count
      queryClient.invalidateQueries({
        queryKey: approvalKeys.pendingCount(projectId),
      });

      // Invalidate activity logs
      queryClient.invalidateQueries({ queryKey: activityKeys.lists() });
    },
  });
}

/**
 * Update approval status (approve, reject, etc.)
 */
export function useUpdateApprovalStatus(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ approvalId, status, rejectionReason }: UpdateApprovalStatusInput) =>
      updateApprovalStatus(projectId, approvalId, status, rejectionReason),
    onSuccess: () => {
      // Invalidate approval lists
      queryClient.invalidateQueries({ queryKey: approvalKeys.lists() });

      // Invalidate pending count
      queryClient.invalidateQueries({
        queryKey: approvalKeys.pendingCount(projectId),
      });

      // Invalidate activity logs
      queryClient.invalidateQueries({ queryKey: activityKeys.lists() });

      // Invalidate translation keys to update approval indicators
      queryClient.invalidateQueries({
        queryKey: translationKeys.list(projectId),
      });
    },
  });
}

/**
 * Delete an approval
 */
export function useDeleteApproval(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (approvalId: string) => deleteApproval(projectId, approvalId),
    onSuccess: () => {
      // Invalidate approval lists
      queryClient.invalidateQueries({ queryKey: approvalKeys.lists() });

      // Invalidate pending count
      queryClient.invalidateQueries({
        queryKey: approvalKeys.pendingCount(projectId),
      });
    },
  });
}

// ============================================
// Query Hooks - Activity Logs
// ============================================

/**
 * Fetch activity logs for a project with various filtering options
 */
export function useActivityLogs(
  projectId: string,
  options?: ActivityLogsOptions
) {
  return useQuery({
    queryKey: activityKeys.list(
      projectId,
      options?.keyId,
      options?.type,
      options?.language,
      options?.limit,
      options?.offset
    ),
    queryFn: () =>
      getActivityLogs(
        projectId,
        options?.keyId,
        options?.type,
        options?.language,
        options?.limit,
        options?.offset
      ),
    enabled:
      options?.enabled !== false && !!projectId && pb.authStore.isValid,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get all unique activity types for a project
 */
export function useActivityTypes(
  projectId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: activityKeys.types(projectId),
    queryFn: () => getActivityTypes(projectId),
    enabled:
      options?.enabled !== false && !!projectId && pb.authStore.isValid,
    staleTime: 5 * 60 * 1000, // 5 minutes (types don't change often)
  });
}

/**
 * Get activity statistics for a project
 */
export function useActivityStats(
  projectId: string,
  since?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: activityKeys.stats(projectId, since),
    queryFn: () => getActivityStats(projectId, since),
    enabled:
      options?.enabled !== false && !!projectId && pb.authStore.isValid,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
