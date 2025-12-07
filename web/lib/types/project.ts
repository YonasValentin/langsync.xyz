export interface Project {
  id: string;
  name: string;
  description: string;
  languages: string[]; // Language codes: ['en', 'es', 'fr']
  defaultLanguage: string; // Primary language code
  createdAt: Date;
  updatedAt: Date;
  // AI Translation fields
  toneOfVoice?: string;
  projectBrief?: string;
  styleGuide?: string;
  industryType?: string;
  targetAudience?: string;
  enableAiTranslation: boolean;
}

export interface TranslationKey {
  id: string;
  projectId: string;
  key: string; // e.g., "hero.title"
  description?: string;
  translations: Record<string, string>; // { en: "Welcome", es: "Bienvenido" }
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectData {
  name: string;
  description: string;
  languages: string[];
  defaultLanguage: string;
}

export interface CreateTranslationKeyData {
  projectId: string;
  key: string;
  description?: string;
  translations?: Record<string, string>;
}

export interface UpdateTranslationData {
  keyId: string;
  language: string;
  value: string;
}
