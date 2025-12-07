import { TranslationVersion, RestorePoint } from '@/lib/types/version-history';
import { apiClient } from '@/lib/api/client';

// Note: Version history is automatically created by the backend when translations are updated
// This store provides read-only access to the version history

export class VersionHistoryStore {
  static async getAllVersions(projectId: string, keyId?: string, language?: string, changeType?: string, limit = 50, offset = 0): Promise<TranslationVersion[]> {
    try {
      const data = await apiClient.getVersions(projectId, keyId, language, changeType, limit, offset);
      return data.map((v: any) => ({
        id: v.id,
        keyId: v.keyId,
        language: v.language,
        value: v.value,
        previousValue: v.previousValue,
        userId: v.userId,
        userName: v.user.name,
        userAvatar: v.user.avatar,
        changeType: v.changeType as 'created' | 'updated' | 'deleted',
        createdAt: new Date(v.createdAt),
        metadata: v.metadata ? JSON.parse(v.metadata) : undefined,
      }));
    } catch (error) {
      return [];
    }
  }

  static async getKeyVersions(projectId: string, keyId: string, language?: string): Promise<TranslationVersion[]> {
    try {
      const data = await apiClient.getKeyVersionHistory(projectId, keyId, language);
      return data.map((v: any) => ({
        id: v.id,
        keyId: v.keyId,
        language: v.language,
        value: v.value,
        previousValue: v.previousValue,
        userId: v.userId,
        userName: v.user.name,
        userAvatar: v.user.avatar,
        changeType: v.changeType as 'created' | 'updated' | 'deleted',
        createdAt: new Date(v.createdAt),
        metadata: v.metadata ? JSON.parse(v.metadata) : undefined,
      }));
    } catch (error) {
      return [];
    }
  }

  static async getLatestVersion(projectId: string, keyId: string, language: string): Promise<TranslationVersion | null> {
    try {
      const versions = await this.getKeyVersions(projectId, keyId, language);
      return versions.length > 0 ? versions[0] : null;
    } catch (error) {
      return null;
    }
  }

  static async getVersionHistory(projectId: string, keyId: string, language: string, limit: number = 50): Promise<TranslationVersion[]> {
    return this.getKeyVersions(projectId, keyId, language);
  }

  static async compareVersions(projectId: string, versionId1: string, versionId2: string): Promise<{
    version1: TranslationVersion | null;
    version2: TranslationVersion | null;
    keyId: string;
    keyName: string;
    language: string;
  }> {
    try {
      const data: any = await apiClient.compareVersions(projectId, versionId1, versionId2);
      return {
        version1: data.version1 ? {
          id: data.version1.id,
          keyId: data.keyId,
          language: data.language,
          value: data.version1.value,
          previousValue: undefined,
          userId: data.version1.user.id,
          userName: data.version1.user.name,
          userAvatar: data.version1.user.avatar,
          changeType: data.version1.changeType as 'created' | 'updated' | 'deleted',
          createdAt: new Date(data.version1.createdAt),
        } : null,
        version2: data.version2 ? {
          id: data.version2.id,
          keyId: data.keyId,
          language: data.language,
          value: data.version2.value,
          previousValue: undefined,
          userId: data.version2.user.id,
          userName: data.version2.user.name,
          userAvatar: data.version2.user.avatar,
          changeType: data.version2.changeType as 'created' | 'updated' | 'deleted',
          createdAt: new Date(data.version2.createdAt),
        } : null,
        keyId: data.keyId,
        keyName: data.keyName,
        language: data.language,
      };
    } catch (error) {
      return {
        version1: null,
        version2: null,
        keyId: '',
        keyName: '',
        language: '',
      };
    }
  }

  static async getVersionStats(projectId: string, since?: Date): Promise<any> {
    try {
      return await apiClient.getVersionStats(projectId, since?.toISOString());
    } catch (error) {
      return { total: 0, byChangeType: [], byUser: [], since: new Date() };
    }
  }

  // Restore Points (kept as localStorage-only feature for now)
  // In production, these could be moved to the backend as well
  static getAllRestorePoints(): RestorePoint[] {
    if (typeof window === 'undefined') return [];

    const data = localStorage.getItem('langsync_restore_points');
    if (!data) return [];

    const serializedPoints = JSON.parse(data) as any[];
    return serializedPoints
      .map((p): RestorePoint => ({
        ...p,
        createdAt: new Date(p.createdAt),
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  static createRestorePoint(
    name: string,
    description: string,
    snapshot: Record<string, Record<string, string>>
  ): RestorePoint {
    const point: RestorePoint = {
      id: crypto.randomUUID(),
      name,
      description,
      createdAt: new Date(),
      createdBy: 'Current User', // Would come from auth in production
      snapshot,
    };

    const points = this.getAllRestorePoints();
    points.push(point);

    if (typeof window !== 'undefined') {
      localStorage.setItem('langsync_restore_points', JSON.stringify(points));
    }
    return point;
  }

  static getRestorePoint(id: string): RestorePoint | null {
    const points = this.getAllRestorePoints();
    return points.find(p => p.id === id) || null;
  }

  static deleteRestorePoint(id: string): boolean {
    const points = this.getAllRestorePoints();
    const filtered = points.filter(p => p.id !== id);

    if (filtered.length === points.length) return false;

    if (typeof window !== 'undefined') {
      localStorage.setItem('langsync_restore_points', JSON.stringify(filtered));
    }
    return true;
  }
}
