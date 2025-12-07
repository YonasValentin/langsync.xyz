import { Project, TranslationKey, CreateProjectData, CreateTranslationKeyData } from '@/lib/types/project';
import { apiClient } from '@/lib/api/client';

// Project Store - manages MULTIPLE projects for a developer/team (API-based)
export class ProjectStore {
  // Get all projects for the current user
  static async getAllProjects(): Promise<Project[]> {
    try {
      const response: any = await apiClient.getProjects();
      return response.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        defaultLanguage: p.defaultLanguage,
        languages: p.languages,
        enableAiTranslation: p.enableAiTranslation ?? false,
        toneOfVoice: p.toneOfVoice,
        projectBrief: p.projectBrief,
        styleGuide: p.styleGuide,
        industryType: p.industryType,
        targetAudience: p.targetAudience,
        createdAt: new Date(p.created || p.createdAt),
        updatedAt: new Date(p.updated || p.updatedAt),
      }));
    } catch (error) {
      throw error;
    }
  }

  // Get a single project by ID
  static async getProject(id: string): Promise<Project | null> {
    try {
      const response: any = await apiClient.getProject(id);
      return {
        id: response.id,
        name: response.name,
        description: response.description,
        defaultLanguage: response.defaultLanguage,
        languages: response.languages,
        enableAiTranslation: response.enableAiTranslation ?? false,
        toneOfVoice: response.toneOfVoice,
        projectBrief: response.projectBrief,
        styleGuide: response.styleGuide,
        industryType: response.industryType,
        targetAudience: response.targetAudience,
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt),
      };
    } catch (error) {
      return null;
    }
  }

  // Create a new project
  static async createProject(data: CreateProjectData): Promise<Project> {
    try {
      const response: any = await apiClient.createProject({
        name: data.name,
        description: data.description,
        defaultLanguage: data.defaultLanguage,
        languages: data.languages,
      });
      return {
        id: response.id,
        name: response.name,
        description: response.description,
        defaultLanguage: response.defaultLanguage,
        languages: response.languages,
        enableAiTranslation: response.enableAiTranslation ?? false,
        toneOfVoice: response.toneOfVoice,
        projectBrief: response.projectBrief,
        styleGuide: response.styleGuide,
        industryType: response.industryType,
        targetAudience: response.targetAudience,
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt),
      };
    } catch (error) {
      throw error;
    }
  }

  // Update an existing project
  static async updateProject(id: string, data: Partial<CreateProjectData>): Promise<Project | null> {
    try {
      const response: any = await apiClient.updateProject(id, {
        name: data.name!,
        description: data.description!,
        defaultLanguage: data.defaultLanguage!,
        languages: data.languages!,
      });
      return {
        id: response.id,
        name: response.name,
        description: response.description,
        defaultLanguage: response.defaultLanguage,
        languages: response.languages,
        enableAiTranslation: response.enableAiTranslation ?? false,
        toneOfVoice: response.toneOfVoice,
        projectBrief: response.projectBrief,
        styleGuide: response.styleGuide,
        industryType: response.industryType,
        targetAudience: response.targetAudience,
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt),
      };
    } catch (error) {
      return null;
    }
  }

  // Delete a project and all its translation keys
  static async deleteProject(id: string): Promise<boolean> {
    try {
      await apiClient.deleteProject(id);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get project count
  static async getProjectCount(): Promise<number> {
    try {
      const projects = await this.getAllProjects();
      return projects.length;
    } catch (error) {
      return 0;
    }
  }
}

// Translation Key Store - manages translation keys within projects (API-based)
export class TranslationKeyStore {
  // Get translation keys for a specific project
  static async getProjectKeys(projectId: string): Promise<TranslationKey[]> {
    try {
      const response: any = await apiClient.getKeys(projectId);
      return response.map((k: any) => ({
        id: k.id,
        projectId,
        key: k.key,
        description: k.description,
        translations: k.translations,
        createdAt: new Date(k.createdAt),
        updatedAt: new Date(k.updatedAt),
      }));
    } catch (error) {
      throw error;
    }
  }

  // Get all translation keys (for backwards compatibility - fetches for current project)
  static async getAllKeys(projectId?: string): Promise<TranslationKey[]> {
    if (!projectId) {
      return [];
    }
    return this.getProjectKeys(projectId);
  }

  // Get a single translation key by ID (need to fetch all and filter)
  static async getKey(projectId: string, id: string): Promise<TranslationKey | null> {
    try {
      const keys = await this.getProjectKeys(projectId);
      return keys.find(k => k.id === id) || null;
    } catch (error) {
      return null;
    }
  }

  // Create a new translation key
  static async createKey(data: CreateTranslationKeyData): Promise<TranslationKey> {
    try {
      const response: any = await apiClient.createKey(data.projectId, {
        key: data.key,
        description: data.description,
        context: undefined,
        translations: data.translations || {},
      });
      return {
        id: response.id,
        projectId: data.projectId,
        key: response.key,
        description: response.description,
        translations: response.translations,
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt),
      };
    } catch (error) {
      throw error;
    }
  }

  // Update a translation value for a specific language
  static async updateTranslation(keyId: string, language: string, value: string): Promise<boolean> {
    try {
      await apiClient.updateTranslation(keyId, language, value);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Delete a translation key
  static async deleteKey(id: string): Promise<boolean> {
    try {
      await apiClient.deleteKey(id);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Export translations to JSON format
  static async exportToJSON(projectId: string): Promise<Record<string, Record<string, string>>> {
    try {
      const project = await ProjectStore.getProject(projectId);
      if (!project) return {};

      const keys = await this.getProjectKeys(projectId);
      const result: Record<string, Record<string, string>> = {};

      // Initialize language objects
      project.languages.forEach(lang => {
        result[lang] = {};
      });

      // Populate translations
      keys.forEach(key => {
        project.languages.forEach(lang => {
          if (key.translations[lang]) {
            result[lang][key.key] = key.translations[lang];
          }
        });
      });

      return result;
    } catch (error) {
      return {};
    }
  }

  // Get translation count for a project
  static async getKeyCount(projectId: string): Promise<number> {
    try {
      const keys = await this.getProjectKeys(projectId);
      return keys.length;
    } catch (error) {
      return 0;
    }
  }
}
