export type AIProvider = 'openai' | 'anthropic';
export type AIModel = 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3-5-sonnet-20241022' | 'claude-3-haiku-20240307';

export interface AISettings {
  provider: AIProvider;
  model: AIModel;
  apiKey: string;
  temperature: number; // 0-1
  maxTokens: number;
  enableAutoCost: boolean;
}

export interface AITranslationJob {
  id: string;
  projectId: string;
  sourceLanguage: string;
  targetLanguages: string[];
  keyIds: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  totalKeys: number;
  completedKeys: number;
  estimatedCost: number;
  actualCost: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface AITranslationSuggestion {
  keyId: string;
  language: string;
  value: string;
  confidence: number; // 0-100
  provider: AIProvider;
  model: AIModel;
  cost: number;
  createdAt: Date;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface CostEstimate {
  provider: AIProvider;
  model: AIModel;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}
