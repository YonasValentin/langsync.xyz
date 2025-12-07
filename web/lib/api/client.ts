/**
 * LangSync API Client for Dashboard
 * Uses PocketBase SDK for all data operations.
 */

import { pb, Collections } from '@/lib/pocketbase';
import type {
  ProjectsRecord,
  TranslationKeysRecord,
  TranslationsRecord,
  AiTranslationsRecord,
  CommentsRecord,
  ApprovalsRecord,
  ActivityLogsRecord,
  TranslationVersionsRecord,
  TranslationMemoryRecord,
} from '@/lib/pocketbase-types';

// Type aliases for backward compatibility
type Project = ProjectsRecord;
type TranslationKey = TranslationKeysRecord;
type Translation = TranslationsRecord;
type AiTranslation = AiTranslationsRecord;
type Comment = CommentsRecord;
type Approval = ApprovalsRecord;
type ActivityLog = ActivityLogsRecord;
type TranslationVersion = TranslationVersionsRecord;
type TranslationMemory = TranslationMemoryRecord;

// Helper to transform translations for a key
function transformTranslations(translations: Translation[] = []): Record<string, string> {
  const result: Record<string, string> = {};
  for (const t of translations) {
    result[t.language] = t.value;
  }
  return result;
}

class LangSyncApiClient {
  // Projects
  async getProjects(): Promise<Project[]> {
    return pb.collection(Collections.PROJECTS).getFullList<Project>({
      sort: '-created',
    });
  }

  async getProject(id: string): Promise<Project> {
    return pb.collection(Collections.PROJECTS).getOne<Project>(id);
  }

  async createProject(data: {
    name: string;
    description?: string;
    defaultLanguage: string;
    languages: string[];
  }): Promise<Project> {
    const userId = pb.authStore.model?.id;
    if (!userId) throw new Error('Not authenticated');

    return pb.collection(Collections.PROJECTS).create<Project>({
      ...data,
      user: userId,
      enableAiTranslation: true,
    });
  }

  async updateProject(
    id: string,
    data: {
      name?: string;
      description?: string;
      defaultLanguage?: string;
      languages?: string[];
      toneOfVoice?: string;
      projectBrief?: string;
      styleGuide?: string;
      industryType?: string;
      targetAudience?: string;
      enableAiTranslation?: boolean;
    }
  ): Promise<Project> {
    return pb.collection(Collections.PROJECTS).update<Project>(id, data);
  }

  async deleteProject(id: string): Promise<boolean> {
    return pb.collection(Collections.PROJECTS).delete(id);
  }

  // Translation Keys
  async getKeys(projectId: string): Promise<(TranslationKey & { translations: Record<string, string> })[]> {
    const keys = await pb.collection(Collections.TRANSLATION_KEYS).getFullList<TranslationKey>({
      filter: `project = "${projectId}"`,
      sort: 'key',
    });

    // Get all translations for this project's keys
    const keyIds = keys.map(k => k.id);
    if (keyIds.length === 0) return [];

    const translations = await pb.collection(Collections.TRANSLATIONS).getFullList<Translation>({
      filter: keyIds.map(id => `translationKey = "${id}"`).join(' || '),
    });

    // Group translations by key
    const translationsByKey: Record<string, Translation[]> = {};
    for (const t of translations) {
      if (!translationsByKey[t.translationKey]) {
        translationsByKey[t.translationKey] = [];
      }
      translationsByKey[t.translationKey].push(t);
    }

    return keys.map(key => ({
      ...key,
      translations: transformTranslations(translationsByKey[key.id]),
    }));
  }

  async createKey(
    projectId: string,
    data: {
      key: string;
      description?: string;
      context?: string;
      translations: Record<string, string>;
    }
  ): Promise<TranslationKey> {
    const key = await pb.collection(Collections.TRANSLATION_KEYS).create<TranslationKey>({
      project: projectId,
      key: data.key,
      description: data.description,
      context: data.context,
    });

    // Create translations for each language
    const translationPromises = Object.entries(data.translations).map(([language, value]) =>
      pb.collection(Collections.TRANSLATIONS).create({
        translationKey: key.id,
        language,
        value,
        updatedBy: pb.authStore.model?.id,
      })
    );

    await Promise.all(translationPromises);

    // Log activity
    await this.logActivity(projectId, 'key_created', key.id, undefined, `Created key: ${data.key}`);

    return key;
  }

  async updateKey(
    keyId: string,
    data: {
      description?: string;
      context?: string;
    }
  ): Promise<TranslationKey> {
    return pb.collection(Collections.TRANSLATION_KEYS).update<TranslationKey>(keyId, data);
  }

  async updateTranslation(keyId: string, language: string, value: string): Promise<void> {
    const userId = pb.authStore.model?.id;

    // Find existing translation
    const existing = await pb.collection(Collections.TRANSLATIONS).getFullList<Translation>({
      filter: `translationKey = "${keyId}" && language = "${language}"`,
      limit: 1,
    });

    // Get the key to find the project
    const key = await pb.collection(Collections.TRANSLATION_KEYS).getOne<TranslationKey>(keyId);

    if (existing.length > 0) {
      const oldValue = existing[0].value;

      // Update existing translation
      await pb.collection(Collections.TRANSLATIONS).update(existing[0].id, {
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
        changeType: 'updated',
      });

      // Log activity
      await this.logActivity(key.project, 'translation_updated', keyId, language, `Updated ${language} translation`);
    } else {
      // Create new translation
      await pb.collection(Collections.TRANSLATIONS).create({
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
        changeType: 'created',
      });

      // Log activity
      await this.logActivity(key.project, 'translation_created', keyId, language, `Created ${language} translation`);
    }
  }

  async deleteKey(keyId: string): Promise<boolean> {
    // Get the key first to find the project
    const key = await pb.collection(Collections.TRANSLATION_KEYS).getOne<TranslationKey>(keyId);

    // Log activity before deletion
    await this.logActivity(key.project, 'key_deleted', keyId, undefined, `Deleted key: ${key.key}`);

    // Delete the key (cascade will handle translations)
    return pb.collection(Collections.TRANSLATION_KEYS).delete(keyId);
  }

  // AI Translation endpoints - these will call the Vercel Edge Function
  async translateKey(projectId: string, keyId: string, targetLanguage: string): Promise<AiTranslation> {
    const response = await fetch('/api/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, keyId, targetLanguage }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to translate');
    }

    return response.json();
  }

  async translateBatch(projectId: string, keyIds: string[], targetLanguages: string[]): Promise<AiTranslation[]> {
    const response = await fetch('/api/ai/translate-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, keyIds, targetLanguages }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to translate batch');
    }

    return response.json();
  }

  async autoTranslateMissing(projectId: string, targetLanguages: string[]): Promise<AiTranslation[]> {
    const response = await fetch('/api/ai/auto-translate-missing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, targetLanguages }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to auto-translate');
    }

    return response.json();
  }

  async acceptTranslation(projectId: string, aiTranslationId: string): Promise<void> {
    const aiTranslation = await pb.collection(Collections.AI_TRANSLATIONS).getOne<AiTranslation>(aiTranslationId);

    // Update the actual translation
    await this.updateTranslation(aiTranslation.translationKey, aiTranslation.targetLanguage, aiTranslation.translatedText);

    // Mark AI translation as accepted
    await pb.collection(Collections.AI_TRANSLATIONS).update(aiTranslationId, {
      wasAccepted: true,
    });

    // Log activity
    await this.logActivity(projectId, 'ai_translation_accepted', aiTranslation.translationKey, aiTranslation.targetLanguage, 'Accepted AI translation');
  }

  async getAiUsage(projectId: string, startDate?: string, endDate?: string): Promise<{ totalTokens: number; totalCost: number; translations: AiTranslation[] }> {
    let filter = `project = "${projectId}"`;
    if (startDate) filter += ` && created >= "${startDate}"`;
    if (endDate) filter += ` && created <= "${endDate}"`;

    const translations = await pb.collection(Collections.AI_TRANSLATIONS).getFullList<AiTranslation>({
      filter,
      sort: '-created',
    });

    const totalTokens = translations.reduce((sum, t) => sum + (t.totalTokens || 0), 0);
    const totalCost = translations.reduce((sum, t) => sum + (t.estimatedCost || 0), 0);

    return { totalTokens, totalCost, translations };
  }

  // Comments
  async getComments(projectId: string, keyId?: string, language?: string, resolved?: boolean): Promise<Comment[]> {
    const filters: string[] = [`project = "${projectId}"`];
    if (keyId) filters.push(`translationKey = "${keyId}"`);
    if (language) filters.push(`language = "${language}"`);
    if (resolved !== undefined) filters.push(`resolved = ${resolved}`);

    return pb.collection(Collections.COMMENTS).getFullList<Comment>({
      filter: filters.join(' && '),
      sort: '-created',
      expand: 'user,resolvedBy',
    });
  }

  async createComment(projectId: string, data: { keyId: string; text: string; language?: string }): Promise<Comment> {
    const userId = pb.authStore.model?.id;
    if (!userId) throw new Error('Not authenticated');

    const comment = await pb.collection(Collections.COMMENTS).create<Comment>({
      project: projectId,
      translationKey: data.keyId,
      user: userId,
      text: data.text,
      language: data.language,
      resolved: false,
    });

    await this.logActivity(projectId, 'comment_created', data.keyId, data.language, 'Added a comment');

    return comment;
  }

  async updateComment(projectId: string, commentId: string, text: string): Promise<Comment> {
    return pb.collection(Collections.COMMENTS).update<Comment>(commentId, { text });
  }

  async resolveComment(projectId: string, commentId: string, resolved: boolean): Promise<Comment> {
    const userId = pb.authStore.model?.id;
    const updateData: Partial<Comment> = {
      resolved,
      resolvedBy: resolved ? userId : undefined,
      resolvedAt: resolved ? new Date().toISOString() : undefined,
    };

    const comment = await pb.collection(Collections.COMMENTS).update<Comment>(commentId, updateData);

    await this.logActivity(projectId, resolved ? 'comment_resolved' : 'comment_reopened', comment.translationKey, comment.language, resolved ? 'Resolved a comment' : 'Reopened a comment');

    return comment;
  }

  async deleteComment(projectId: string, commentId: string): Promise<boolean> {
    return pb.collection(Collections.COMMENTS).delete(commentId);
  }

  // Approvals
  async getApprovals(projectId: string, keyId?: string, language?: string, status?: string): Promise<Approval[]> {
    // Need to get keys first to filter by project
    const keys = await pb.collection(Collections.TRANSLATION_KEYS).getFullList<TranslationKey>({
      filter: `project = "${projectId}"`,
    });

    if (keys.length === 0) return [];

    const keyFilters = keys.map(k => `translationKey = "${k.id}"`).join(' || ');
    const filters: string[] = [`(${keyFilters})`];
    if (keyId) filters.push(`translationKey = "${keyId}"`);
    if (language) filters.push(`language = "${language}"`);
    if (status) filters.push(`status = "${status}"`);

    return pb.collection(Collections.APPROVALS).getFullList<Approval>({
      filter: filters.join(' && '),
      sort: '-created',
      expand: 'approvedBy,rejectedBy',
    });
  }

  async createApproval(projectId: string, data: { keyId: string; language: string }): Promise<Approval> {
    const approval = await pb.collection(Collections.APPROVALS).create<Approval>({
      translationKey: data.keyId,
      language: data.language,
      status: 'pending',
    });

    await this.logActivity(projectId, 'approval_requested', data.keyId, data.language, 'Requested approval');

    return approval;
  }

  async updateApprovalStatus(projectId: string, approvalId: string, status: string, rejectionReason?: string): Promise<Approval> {
    const userId = pb.authStore.model?.id;
    const now = new Date().toISOString();

    const updateData: Partial<Approval> = { status: status as Approval['status'] };

    if (status === 'approved') {
      updateData.approvedBy = userId;
      updateData.approvedAt = now;
    } else if (status === 'rejected') {
      updateData.rejectedBy = userId;
      updateData.rejectedAt = now;
      updateData.rejectionReason = rejectionReason;
    }

    const approval = await pb.collection(Collections.APPROVALS).update<Approval>(approvalId, updateData);

    await this.logActivity(projectId, `approval_${status}`, approval.translationKey, approval.language, `Approval ${status}`);

    return approval;
  }

  async deleteApproval(projectId: string, approvalId: string): Promise<boolean> {
    return pb.collection(Collections.APPROVALS).delete(approvalId);
  }

  // Activity Logs
  async getActivityLogs(projectId: string, keyId?: string, type?: string, language?: string, limit = 50, offset = 0): Promise<ActivityLog[]> {
    const filters: string[] = [`project = "${projectId}"`];
    if (keyId) filters.push(`translationKey = "${keyId}"`);
    if (type) filters.push(`type = "${type}"`);
    if (language) filters.push(`language = "${language}"`);

    const result = await pb.collection(Collections.ACTIVITY_LOGS).getList<ActivityLog>(Math.floor(offset / limit) + 1, limit, {
      filter: filters.join(' && '),
      sort: '-created',
      expand: 'user,translationKey',
    });

    return result.items;
  }

  async getActivityTypes(projectId: string): Promise<string[]> {
    const activities = await pb.collection(Collections.ACTIVITY_LOGS).getFullList<ActivityLog>({
      filter: `project = "${projectId}"`,
      fields: 'type',
    });

    return [...new Set(activities.map(a => a.type))];
  }

  async getActivityStats(projectId: string, since?: string): Promise<{ total: number; byType: Record<string, number>; byUser: Record<string, number> }> {
    let filter = `project = "${projectId}"`;
    if (since) filter += ` && created >= "${since}"`;

    const activities = await pb.collection(Collections.ACTIVITY_LOGS).getFullList<ActivityLog>({
      filter,
      expand: 'user',
    });

    const byType: Record<string, number> = {};
    const byUser: Record<string, number> = {};

    for (const a of activities) {
      byType[a.type] = (byType[a.type] || 0) + 1;
      byUser[a.user] = (byUser[a.user] || 0) + 1;
    }

    return { total: activities.length, byType, byUser };
  }

  // Version History
  async getVersions(projectId: string, keyId?: string, language?: string, changeType?: string, limit = 50, offset = 0): Promise<TranslationVersion[]> {
    // Need to get keys first to filter by project
    const keys = await pb.collection(Collections.TRANSLATION_KEYS).getFullList<TranslationKey>({
      filter: `project = "${projectId}"`,
    });

    if (keys.length === 0) return [];

    const keyFilters = keys.map(k => `translationKey = "${k.id}"`).join(' || ');
    const filters: string[] = [`(${keyFilters})`];
    if (keyId) filters.push(`translationKey = "${keyId}"`);
    if (language) filters.push(`language = "${language}"`);
    if (changeType) filters.push(`changeType = "${changeType}"`);

    const result = await pb.collection(Collections.TRANSLATION_VERSIONS).getList<TranslationVersion>(Math.floor(offset / limit) + 1, limit, {
      filter: filters.join(' && '),
      sort: '-created',
      expand: 'user,translationKey',
    });

    return result.items;
  }

  async getKeyVersionHistory(projectId: string, keyId: string, language?: string): Promise<TranslationVersion[]> {
    const filters: string[] = [`translationKey = "${keyId}"`];
    if (language) filters.push(`language = "${language}"`);

    return pb.collection(Collections.TRANSLATION_VERSIONS).getFullList<TranslationVersion>({
      filter: filters.join(' && '),
      sort: '-created',
      expand: 'user',
    });
  }

  async compareVersions(projectId: string, versionId1: string, versionId2: string): Promise<{ v1: TranslationVersion; v2: TranslationVersion }> {
    const [v1, v2] = await Promise.all([
      pb.collection(Collections.TRANSLATION_VERSIONS).getOne<TranslationVersion>(versionId1),
      pb.collection(Collections.TRANSLATION_VERSIONS).getOne<TranslationVersion>(versionId2),
    ]);

    return { v1, v2 };
  }

  async getVersionStats(projectId: string, since?: string): Promise<{ total: number; byChangeType: Record<string, number>; byLanguage: Record<string, number> }> {
    // Need to get keys first to filter by project
    const keys = await pb.collection(Collections.TRANSLATION_KEYS).getFullList<TranslationKey>({
      filter: `project = "${projectId}"`,
    });

    if (keys.length === 0) return { total: 0, byChangeType: {}, byLanguage: {} };

    const keyFilters = keys.map(k => `translationKey = "${k.id}"`).join(' || ');
    let filter = `(${keyFilters})`;
    if (since) filter += ` && created >= "${since}"`;

    const versions = await pb.collection(Collections.TRANSLATION_VERSIONS).getFullList<TranslationVersion>({
      filter,
    });

    const byChangeType: Record<string, number> = {};
    const byLanguage: Record<string, number> = {};

    for (const v of versions) {
      byChangeType[v.changeType] = (byChangeType[v.changeType] || 0) + 1;
      byLanguage[v.language] = (byLanguage[v.language] || 0) + 1;
    }

    return { total: versions.length, byChangeType, byLanguage };
  }

  // Translation Memory
  async getTranslationMemory(projectId?: string, sourceLanguage?: string, targetLanguage?: string, limit = 50, offset = 0): Promise<TranslationMemory[]> {
    const filters: string[] = [];
    if (projectId) filters.push(`project = "${projectId}"`);
    if (sourceLanguage) filters.push(`sourceLanguage = "${sourceLanguage}"`);
    if (targetLanguage) filters.push(`targetLanguage = "${targetLanguage}"`);

    const result = await pb.collection(Collections.TRANSLATION_MEMORY).getList<TranslationMemory>(Math.floor(offset / limit) + 1, limit, {
      filter: filters.length > 0 ? filters.join(' && ') : '',
      sort: '-usageCount',
    });

    return result.items;
  }

  async searchTranslationMemory(data: {
    sourceLanguage: string;
    targetLanguage: string;
    sourceText: string;
    projectId?: string;
    minimumSimilarity?: number;
  }): Promise<TranslationMemory[]> {
    // For now, do a simple text search - in production you'd want fuzzy matching
    const filters: string[] = [
      `sourceLanguage = "${data.sourceLanguage}"`,
      `targetLanguage = "${data.targetLanguage}"`,
    ];
    if (data.projectId) filters.push(`project = "${data.projectId}"`);

    return pb.collection(Collections.TRANSLATION_MEMORY).getFullList<TranslationMemory>({
      filter: filters.join(' && '),
      sort: '-usageCount',
    });
  }

  async createTranslationMemoryEntry(data: {
    projectId?: string;
    sourceLanguage: string;
    targetLanguage: string;
    sourceText: string;
    targetText: string;
    context?: string;
  }): Promise<TranslationMemory> {
    return pb.collection(Collections.TRANSLATION_MEMORY).create<TranslationMemory>({
      project: data.projectId,
      sourceLanguage: data.sourceLanguage,
      targetLanguage: data.targetLanguage,
      sourceText: data.sourceText,
      targetText: data.targetText,
      context: data.context,
      usageCount: 1,
      lastUsedAt: new Date().toISOString(),
    });
  }

  async incrementTranslationMemoryUsage(id: string): Promise<TranslationMemory> {
    const entry = await pb.collection(Collections.TRANSLATION_MEMORY).getOne<TranslationMemory>(id);
    return pb.collection(Collections.TRANSLATION_MEMORY).update<TranslationMemory>(id, {
      usageCount: entry.usageCount + 1,
      lastUsedAt: new Date().toISOString(),
    });
  }

  async deleteTranslationMemoryEntry(id: string): Promise<boolean> {
    return pb.collection(Collections.TRANSLATION_MEMORY).delete(id);
  }

  // Helper method to log activity
  private async logActivity(projectId: string, type: string, keyId?: string, language?: string, description?: string): Promise<void> {
    const userId = pb.authStore.model?.id;
    if (!userId) return;

    await pb.collection(Collections.ACTIVITY_LOGS).create({
      project: projectId,
      user: userId,
      type,
      translationKey: keyId,
      language,
      description: description || type,
    });
  }
}

export const apiClient = new LangSyncApiClient();
