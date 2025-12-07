import PocketBase, { RecordService } from "pocketbase";

// ============================================
// Base Record Type
// ============================================
export interface BaseRecord {
  id: string;
  created: string;
  updated: string;
  collectionId: string;
  collectionName: string;
}

// ============================================
// Collection Record Types
// ============================================

// Users (Auth Collection)
export interface UsersRecord extends BaseRecord {
  email: string;
  name: string;
  avatar?: string;
  emailVisibility: boolean;
  verified: boolean;
}

// Projects
export interface ProjectsRecord extends BaseRecord {
  user: string; // Relation to users
  name: string;
  description?: string;
  defaultLanguage: string;
  languages: string[]; // JSON array: ["en", "da", "sv"]
  toneOfVoice?: string;
  projectBrief?: string;
  styleGuide?: string;
  industryType?: string;
  targetAudience?: string;
  enableAiTranslation: boolean;
}

// Translation Keys
export interface TranslationKeysRecord extends BaseRecord {
  project: string; // Relation to projects
  key: string;
  description?: string;
  context?: string;
}

// Translations
export interface TranslationsRecord extends BaseRecord {
  translationKey: string; // Relation to translation_keys
  language: string;
  value: string;
  updatedBy?: string; // Relation to users
}

// AI Translations
export interface AiTranslationsRecord extends BaseRecord {
  project: string; // Relation to projects
  translationKey: string; // Relation to translation_keys
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  translatedText: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  estimatedCost?: number;
  wasAccepted: boolean;
}

// Comments
export interface CommentsRecord extends BaseRecord {
  project: string; // Relation to projects
  translationKey: string; // Relation to translation_keys
  user: string; // Relation to users
  text: string;
  language?: string;
  resolved: boolean;
  resolvedBy?: string; // Relation to users
  resolvedAt?: string;
}

// Approvals
export type ApprovalStatus = "pending" | "approved" | "rejected" | "needs_review";

export interface ApprovalsRecord extends BaseRecord {
  translationKey: string; // Relation to translation_keys
  language: string;
  status: ApprovalStatus;
  approvedBy?: string; // Relation to users
  approvedAt?: string;
  rejectedBy?: string; // Relation to users
  rejectedAt?: string;
  rejectionReason?: string;
}

// Activity Logs
export type ActivityType =
  | "key_created"
  | "key_updated"
  | "key_deleted"
  | "translation_updated"
  | "translation_approved"
  | "translation_rejected"
  | "comment_added"
  | "comment_resolved"
  | "ai_translation_generated"
  | "ai_translation_accepted"
  | "project_created"
  | "project_updated";

export interface ActivityLogsRecord extends BaseRecord {
  project: string; // Relation to projects
  user: string; // Relation to users
  type: ActivityType;
  translationKey?: string; // Relation to translation_keys
  language?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

// Translation Versions
export type ChangeType = "created" | "updated" | "deleted";

export interface TranslationVersionsRecord extends BaseRecord {
  translationKey: string; // Relation to translation_keys
  language: string;
  value: string;
  previousValue?: string;
  user: string; // Relation to users
  changeType: ChangeType;
  metadata?: Record<string, unknown>;
}

// Translation Memory
export interface TranslationMemoryRecord extends BaseRecord {
  project?: string; // Relation to projects (optional for global entries)
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  targetText: string;
  context?: string;
  usageCount: number;
  lastUsedAt: string;
}

// ============================================
// Expanded Types (with relations)
// ============================================

export interface ProjectExpanded extends ProjectsRecord {
  expand?: {
    user?: UsersRecord;
  };
}

export interface TranslationKeyExpanded extends TranslationKeysRecord {
  expand?: {
    project?: ProjectsRecord;
  };
}

export interface TranslationExpanded extends TranslationsRecord {
  expand?: {
    translationKey?: TranslationKeysRecord;
    updatedBy?: UsersRecord;
  };
}

export interface AiTranslationExpanded extends AiTranslationsRecord {
  expand?: {
    project?: ProjectsRecord;
    translationKey?: TranslationKeysRecord;
  };
}

export interface CommentExpanded extends CommentsRecord {
  expand?: {
    project?: ProjectsRecord;
    translationKey?: TranslationKeysRecord;
    user?: UsersRecord;
    resolvedBy?: UsersRecord;
  };
}

export interface ApprovalExpanded extends ApprovalsRecord {
  expand?: {
    translationKey?: TranslationKeysRecord;
    approvedBy?: UsersRecord;
    rejectedBy?: UsersRecord;
  };
}

export interface ActivityLogExpanded extends ActivityLogsRecord {
  expand?: {
    project?: ProjectsRecord;
    user?: UsersRecord;
    translationKey?: TranslationKeysRecord;
  };
}

export interface TranslationVersionExpanded extends TranslationVersionsRecord {
  expand?: {
    translationKey?: TranslationKeysRecord;
    user?: UsersRecord;
  };
}

export interface TranslationMemoryExpanded extends TranslationMemoryRecord {
  expand?: {
    project?: ProjectsRecord;
  };
}

// ============================================
// Typed PocketBase Interface
// ============================================

export interface TypedPocketBase extends PocketBase {
  collection(idOrName: "users"): RecordService<UsersRecord>;
  collection(idOrName: "projects"): RecordService<ProjectsRecord>;
  collection(idOrName: "translation_keys"): RecordService<TranslationKeysRecord>;
  collection(idOrName: "translations"): RecordService<TranslationsRecord>;
  collection(idOrName: "ai_translations"): RecordService<AiTranslationsRecord>;
  collection(idOrName: "comments"): RecordService<CommentsRecord>;
  collection(idOrName: "approvals"): RecordService<ApprovalsRecord>;
  collection(idOrName: "activity_logs"): RecordService<ActivityLogsRecord>;
  collection(idOrName: "translation_versions"): RecordService<TranslationVersionsRecord>;
  collection(idOrName: "translation_memory"): RecordService<TranslationMemoryRecord>;
  // Generic fallback for any other collection
  collection(idOrName: string): RecordService;
}

// ============================================
// Helper Types for Frontend
// ============================================

// Project card/list display
export interface ProjectCardData {
  id: string;
  name: string;
  description?: string;
  defaultLanguage: string;
  languages: string[];
  keyCount: number;
  translationProgress: number; // 0-100
  enableAiTranslation: boolean;
  created: string;
  updated: string;
}

// Translation key with all translations
export interface TranslationKeyWithTranslations {
  id: string;
  key: string;
  description?: string;
  context?: string;
  translations: Record<string, string>; // { en: "Hello", da: "Hej" }
  created: string;
  updated: string;
}

// AI translation suggestion for display
export interface AiSuggestion {
  id: string;
  keyId: string;
  keyName: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  translatedText: string;
  model: string;
  tokens: number;
  cost: number;
  wasAccepted: boolean;
  created: string;
}

// Comment for display
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
}

// Activity item for feed
export interface ActivityItem {
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

// Version history entry
export interface VersionHistoryEntry {
  id: string;
  keyId: string;
  language: string;
  value: string;
  previousValue?: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  changeType: ChangeType;
  created: string;
}

// Translation memory entry for suggestions
export interface MemorySuggestion {
  id: string;
  sourceText: string;
  targetText: string;
  similarity: number; // 0-100
  usageCount: number;
  lastUsedAt: string;
}

// ============================================
// Collection Names Constants
// ============================================

export const Collections = {
  USERS: "users",
  PROJECTS: "projects",
  TRANSLATION_KEYS: "translation_keys",
  TRANSLATIONS: "translations",
  AI_TRANSLATIONS: "ai_translations",
  COMMENTS: "comments",
  APPROVALS: "approvals",
  ACTIVITY_LOGS: "activity_logs",
  TRANSLATION_VERSIONS: "translation_versions",
  TRANSLATION_MEMORY: "translation_memory",
} as const;

export type CollectionName = (typeof Collections)[keyof typeof Collections];
