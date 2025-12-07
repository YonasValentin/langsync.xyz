import { TranslationMemoryEntry, TranslationSuggestion } from '@/lib/types/translation-memory';
import { apiClient } from '@/lib/api/client';

export class TranslationMemoryStore {
  static async getAllEntries(projectId?: string, sourceLanguage?: string, targetLanguage?: string, limit = 50, offset = 0): Promise<TranslationMemoryEntry[]> {
    try {
      const data = await apiClient.getTranslationMemory(projectId, sourceLanguage, targetLanguage, limit, offset);
      return data.map((e: any) => ({
        id: e.id,
        projectId: e.projectId,
        sourceLanguage: e.sourceLanguage,
        targetLanguage: e.targetLanguage,
        sourceText: e.sourceText,
        targetText: e.targetText,
        context: e.context,
        usageCount: e.usageCount,
        lastUsedAt: new Date(e.lastUsedAt),
        createdAt: new Date(e.createdAt),
      }));
    } catch (error) {
      return [];
    }
  }

  static async addOrUpdateEntry(
    sourceLanguage: string,
    targetLanguage: string,
    sourceText: string,
    targetText: string,
    projectId?: string,
    context?: string
  ): Promise<TranslationMemoryEntry | null> {
    try {
      const data: any = await apiClient.createTranslationMemoryEntry({
        projectId,
        sourceLanguage,
        targetLanguage,
        sourceText,
        targetText,
        context,
      });

      return {
        id: data.id,
        projectId: data.projectId,
        sourceLanguage: data.sourceLanguage,
        targetLanguage: data.targetLanguage,
        sourceText: data.sourceText,
        targetText: data.targetText,
        context: data.context,
        usageCount: data.usageCount,
        lastUsedAt: new Date(data.lastUsedAt),
        createdAt: new Date(data.createdAt),
      };
    } catch (error) {
      return null;
    }
  }

  static async getSuggestionsForText(
    sourceText: string,
    sourceLanguage: string,
    targetLanguage: string,
    projectId?: string,
    minSimilarity: number = 0.7
  ): Promise<TranslationSuggestion[]> {
    try {
      const data = await apiClient.searchTranslationMemory({
        sourceLanguage,
        targetLanguage,
        sourceText,
        projectId,
        minimumSimilarity: minSimilarity,
      });

      return data.map((suggestion: any) => ({
        entry: {
          id: suggestion.id,
          projectId: suggestion.projectId || '',
          sourceLanguage,
          targetLanguage,
          sourceText: suggestion.sourceText,
          targetText: suggestion.targetText,
          context: suggestion.context,
          usageCount: suggestion.usageCount,
          lastUsedAt: new Date(suggestion.lastUsedAt),
          createdAt: new Date(),
          similarity: suggestion.similarity,
        },
        similarity: Math.round(suggestion.similarity * 100),
        source: suggestion.similarity === 1 ? ('exact' as const) :
                suggestion.similarity >= 0.9 ? ('fuzzy' as const) :
                ('context' as const),
      }));
    } catch (error) {
      return [];
    }
  }

  static async incrementUsage(id: string): Promise<boolean> {
    try {
      await apiClient.incrementTranslationMemoryUsage(id);
      return true;
    } catch (error) {
      return false;
    }
  }

  static async deleteEntry(id: string): Promise<boolean> {
    try {
      await apiClient.deleteTranslationMemoryEntry(id);
      return true;
    } catch (error) {
      return false;
    }
  }

  static async getPopularTranslations(projectId?: string, limit: number = 10): Promise<TranslationMemoryEntry[]> {
    // Get all entries and sort by usage count (API returns sorted by usage + last used)
    return this.getAllEntries(projectId, undefined, undefined, limit);
  }

  static async getMemorySize(projectId?: string): Promise<number> {
    try {
      const entries = await this.getAllEntries(projectId);
      return entries.length;
    } catch (error) {
      return 0;
    }
  }
}
