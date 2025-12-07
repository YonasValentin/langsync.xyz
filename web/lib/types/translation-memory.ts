export interface TranslationMemoryEntry {
  id: string;
  projectId: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  targetText: string;
  context?: string;
  usageCount: number;
  lastUsedAt: Date;
  createdAt: Date;
}

export interface TranslationSuggestion {
  entry: TranslationMemoryEntry;
  similarity: number; // 0-100%
  source: 'exact' | 'fuzzy' | 'context';
}
