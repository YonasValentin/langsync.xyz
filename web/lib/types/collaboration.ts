export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'translator' | 'reviewer';
  avatar?: string;
}

export interface Comment {
  id: string;
  keyId: string;
  language?: string; // Optional - comment can be for specific language or general
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: Date;
  updatedAt?: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
}

export interface ApprovalStatus {
  keyId: string;
  language: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_review';
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  reviewers: string[]; // User IDs who can approve
}

export interface Activity {
  id: string;
  type: 'translation_added' | 'translation_updated' | 'translation_deleted' |
        'comment_added' | 'comment_resolved' |
        'approval_granted' | 'approval_rejected' |
        'key_created' | 'key_deleted';
  keyId?: string;
  language?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  description: string; // Human-readable description
  metadata?: Record<string, unknown>; // Additional data
  createdAt: Date;
}

export interface TeamMember {
  user: User;
  joinedAt: Date;
  lastActive: Date;
  translationsCount: number;
  approvalsCount: number;
  commentsCount: number;
}
