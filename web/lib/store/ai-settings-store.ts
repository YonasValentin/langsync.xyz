import { AISettings, AITranslationSuggestion } from '@/lib/types/ai-translation';

const AI_SETTINGS_KEY = 'langsync_ai_settings';
const AI_SUGGESTIONS_KEY = 'langsync_ai_suggestions';

const DEFAULT_SETTINGS: AISettings = {
  provider: 'openai',
  model: 'gpt-4',
  apiKey: '',
  temperature: 0.3,
  maxTokens: 1000,
  enableAutoCost: true,
};

export class AISettingsStore {
  static getSettings(): AISettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;

    const data = localStorage.getItem(AI_SETTINGS_KEY);
    if (!data) return DEFAULT_SETTINGS;

    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(settings: AISettings): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
  }

  static hasApiKey(): boolean {
    const settings = this.getSettings();
    return settings.apiKey.length > 0;
  }

  static clearApiKey(): void {
    const settings = this.getSettings();
    settings.apiKey = '';
    this.saveSettings(settings);
  }
}

export class AISuggestionsStore {
  static getAllSuggestions(): AITranslationSuggestion[] {
    if (typeof window === 'undefined') return [];

    const data = localStorage.getItem(AI_SUGGESTIONS_KEY);
    if (!data) return [];

    const suggestions = JSON.parse(data);
    return suggestions.map((s: AITranslationSuggestion) => ({
      ...s,
      createdAt: new Date(s.createdAt),
    }));
  }

  static getSuggestionsForKey(keyId: string, language: string): AITranslationSuggestion[] {
    const all = this.getAllSuggestions();
    return all.filter(s => s.keyId === keyId && s.language === language);
  }

  static addSuggestion(suggestion: Omit<AITranslationSuggestion, 'createdAt' | 'status'>): AITranslationSuggestion {
    const suggestions = this.getAllSuggestions();

    const newSuggestion: AITranslationSuggestion = {
      ...suggestion,
      status: 'pending',
      createdAt: new Date(),
    };

    suggestions.push(newSuggestion);
    localStorage.setItem(AI_SUGGESTIONS_KEY, JSON.stringify(suggestions));

    return newSuggestion;
  }

  static updateSuggestionStatus(
    keyId: string,
    language: string,
    status: 'accepted' | 'rejected'
  ): void {
    const suggestions = this.getAllSuggestions();
    const suggestion = suggestions.find(s => s.keyId === keyId && s.language === language);

    if (suggestion) {
      suggestion.status = status;
      localStorage.setItem(AI_SUGGESTIONS_KEY, JSON.stringify(suggestions));
    }
  }

  static getTotalCost(): number {
    const suggestions = this.getAllSuggestions();
    return suggestions
      .filter(s => s.status === 'accepted')
      .reduce((sum, s) => sum + s.cost, 0);
  }
}
