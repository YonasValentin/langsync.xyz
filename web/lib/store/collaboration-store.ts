import { Comment, ApprovalStatus, Activity, User } from '@/lib/types/collaboration';
import { apiClient } from '@/lib/api/client';

// Note: UserStore is now handled by auth system
// Current user info comes from JWT token

export class CommentStore {
  static async getAllComments(projectId: string, keyId?: string, language?: string, resolved?: boolean): Promise<Comment[]> {
    try {
      const data = await apiClient.getComments(projectId, keyId, language, resolved);
      return data.map((c: any) => ({
        id: c.id,
        keyId: c.keyId,
        language: c.language,
        userId: c.userId,
        userName: c.user.name,
        userAvatar: c.user.avatar,
        text: c.text,
        createdAt: new Date(c.createdAt),
        updatedAt: c.updatedAt ? new Date(c.updatedAt) : undefined,
        resolved: c.resolved,
        resolvedBy: c.resolvedBy ? c.user.name : undefined,
        resolvedAt: c.resolvedAt ? new Date(c.resolvedAt) : undefined,
      }));
    } catch (error) {
      return [];
    }
  }

  static async getKeyComments(projectId: string, keyId: string, language?: string): Promise<Comment[]> {
    return this.getAllComments(projectId, keyId, language);
  }

  static async addComment(
    projectId: string,
    keyId: string,
    text: string,
    language?: string
  ): Promise<Comment | null> {
    try {
      const data: any = await apiClient.createComment(projectId, { keyId, text, language });
      return {
        id: data.id,
        keyId: data.keyId,
        language: data.language,
        userId: data.userId,
        userName: data.user.name,
        userAvatar: data.user.avatar,
        text: data.text,
        createdAt: new Date(data.createdAt),
        resolved: data.resolved,
      };
    } catch (error) {
      return null;
    }
  }

  static async updateComment(projectId: string, commentId: string, text: string): Promise<Comment | null> {
    try {
      const data: any = await apiClient.updateComment(projectId, commentId, text);
      return {
        id: data.id,
        keyId: data.keyId,
        language: data.language,
        userId: data.userId,
        userName: data.user.name,
        userAvatar: data.user.avatar,
        text: data.text,
        createdAt: new Date(data.createdAt),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
        resolved: data.resolved,
        resolvedBy: data.resolvedBy,
        resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : undefined,
      };
    } catch (error) {
      return null;
    }
  }

  static async resolveComment(projectId: string, commentId: string, resolved: boolean = true): Promise<Comment | null> {
    try {
      const data: any = await apiClient.resolveComment(projectId, commentId, resolved);
      return {
        id: data.id,
        keyId: data.keyId,
        language: data.language,
        userId: data.userId,
        userName: data.user.name,
        userAvatar: data.user.avatar,
        text: data.text,
        createdAt: new Date(data.createdAt),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
        resolved: data.resolved,
        resolvedBy: data.resolvedBy,
        resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : undefined,
      };
    } catch (error) {
      return null;
    }
  }

  static async deleteComment(projectId: string, commentId: string): Promise<boolean> {
    try {
      await apiClient.deleteComment(projectId, commentId);
      return true;
    } catch (error) {
      return false;
    }
  }

  static async getUnresolvedCount(projectId: string, keyId?: string): Promise<number> {
    try {
      const comments = await this.getAllComments(projectId, keyId, undefined, false);
      return comments.length;
    } catch (error) {
      return 0;
    }
  }
}

export class ApprovalStore {
  static async getAllApprovals(projectId: string, keyId?: string, language?: string, status?: string): Promise<ApprovalStatus[]> {
    try {
      const data = await apiClient.getApprovals(projectId, keyId, language, status);
      return data.map((a: any) => ({
        keyId: a.keyId,
        language: a.language,
        status: a.status as 'pending' | 'approved' | 'rejected' | 'needs_review',
        approvedBy: a.approver?.name,
        approvedAt: a.approvedAt ? new Date(a.approvedAt) : undefined,
        rejectedBy: a.rejector?.name,
        rejectedAt: a.rejectedAt ? new Date(a.rejectedAt) : undefined,
        rejectionReason: a.rejectionReason,
        reviewers: [a.approvedBy, a.rejectedBy].filter(Boolean) as string[],
      }));
    } catch (error) {
      return [];
    }
  }

  static async getApprovalStatus(projectId: string, keyId: string, language: string): Promise<ApprovalStatus | null> {
    try {
      const approvals = await this.getAllApprovals(projectId, keyId, language);
      return approvals[0] || null;
    } catch (error) {
      return null;
    }
  }

  static async requestApproval(projectId: string, keyId: string, language: string): Promise<ApprovalStatus | null> {
    try {
      const data: any = await apiClient.createApproval(projectId, { keyId, language });
      return {
        keyId: data.keyId,
        language: data.language,
        status: data.status as 'pending',
        reviewers: [],
      };
    } catch (error) {
      return null;
    }
  }

  static async setApprovalStatus(
    projectId: string,
    approvalId: string,
    status: 'pending' | 'approved' | 'rejected' | 'needs_review',
    reason?: string
  ): Promise<ApprovalStatus | null> {
    try {
      const data: any = await apiClient.updateApprovalStatus(projectId, approvalId, status, reason);
      return {
        keyId: data.keyId,
        language: data.language,
        status: data.status,
        approvedBy: data.approver?.name,
        approvedAt: data.approvedAt ? new Date(data.approvedAt) : undefined,
        rejectedBy: data.rejector?.name,
        rejectedAt: data.rejectedAt ? new Date(data.rejectedAt) : undefined,
        rejectionReason: data.rejectionReason,
        reviewers: [data.approvedBy, data.rejectedBy].filter(Boolean) as string[],
      };
    } catch (error) {
      return null;
    }
  }

  static async deleteApproval(projectId: string, approvalId: string): Promise<boolean> {
    try {
      await apiClient.deleteApproval(projectId, approvalId);
      return true;
    } catch (error) {
      return false;
    }
  }

  static async getPendingCount(projectId: string): Promise<number> {
    try {
      const approvals = await this.getAllApprovals(projectId);
      return approvals.filter(a => a.status === 'pending' || a.status === 'needs_review').length;
    } catch (error) {
      return 0;
    }
  }
}

export class ActivityStore {
  static async getAllActivities(projectId: string, keyId?: string, type?: string, language?: string, limit = 50, offset = 0): Promise<Activity[]> {
    try {
      const data = await apiClient.getActivityLogs(projectId, keyId, type, language, limit, offset);
      return data.map((a: any) => ({
        id: a.id,
        type: a.type,
        keyId: a.keyId,
        language: a.language,
        userId: a.userId,
        userName: a.user.name,
        userAvatar: a.user.avatar,
        description: a.description,
        metadata: a.metadata ? JSON.parse(a.metadata) : undefined,
        createdAt: new Date(a.createdAt),
      }));
    } catch (error) {
      return [];
    }
  }

  static async getKeyActivities(projectId: string, keyId: string): Promise<Activity[]> {
    return this.getAllActivities(projectId, keyId);
  }

  static async getRecentActivities(projectId: string, limit: number = 50): Promise<Activity[]> {
    return this.getAllActivities(projectId, undefined, undefined, undefined, limit);
  }

  static async getActivityTypes(projectId: string): Promise<string[]> {
    try {
      return await apiClient.getActivityTypes(projectId);
    } catch (error) {
      return [];
    }
  }

  static async getActivityStats(projectId: string, since?: Date): Promise<any> {
    try {
      return await apiClient.getActivityStats(projectId, since?.toISOString());
    } catch (error) {
      return { total: 0, byType: [], since: new Date() };
    }
  }
}
