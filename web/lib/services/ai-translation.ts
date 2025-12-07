import { AISettings, CostEstimate, AITranslationSuggestion } from '@/lib/types/ai-translation';
import { AISettingsStore, AISuggestionsStore } from '@/lib/store/ai-settings-store';

// Cost per 1M tokens (approximate, as of 2025)
const COST_PER_MILLION_TOKENS = {
  'gpt-4': { input: 30, output: 60 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
};

export class AITranslationService {
  /**
   * Translate a single text using AI
   */
  static async translateText(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    context?: string
  ): Promise<{ translation: string; confidence: number; cost: number }> {
    const settings = AISettingsStore.getSettings();

    if (!settings.apiKey) {
      throw new Error('API key not configured');
    }

    const prompt = this.buildTranslationPrompt(text, sourceLanguage, targetLanguage, context);

    if (settings.provider === 'openai') {
      return this.translateWithOpenAI(prompt, settings);
    } else {
      return this.translateWithAnthropic(prompt, settings);
    }
  }

  /**
   * Build the translation prompt
   */
  private static buildTranslationPrompt(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    context?: string
  ): string {
    let prompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}.\n\n`;

    if (context) {
      prompt += `Context: ${context}\n\n`;
    }

    prompt += `Text to translate: "${text}"\n\n`;
    prompt += `Important:
- Provide ONLY the translation, no explanations
- Maintain the same tone and formality
- Keep any placeholders or variables intact
- Be culturally appropriate\n\n`;
    prompt += `Translation:`;

    return prompt;
  }

  /**
   * Translate using OpenAI API
   */
  private static async translateWithOpenAI(
    prompt: string,
    settings: AISettings
  ): Promise<{ translation: string; confidence: number; cost: number }> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Provide accurate, natural-sounding translations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    const translation = data.choices[0].message.content.trim();

    // Calculate cost
    const inputTokens = data.usage.prompt_tokens;
    const outputTokens = data.usage.completion_tokens;
    const cost = this.calculateCost(settings.model, inputTokens, outputTokens);

    // Confidence based on temperature (lower temp = higher confidence)
    const confidence = Math.round((1 - settings.temperature) * 100);

    return { translation, confidence, cost };
  }

  /**
   * Translate using Anthropic API
   */
  private static async translateWithAnthropic(
    prompt: string,
    settings: AISettings
  ): Promise<{ translation: string; confidence: number; cost: number }> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: settings.maxTokens,
        temperature: settings.temperature,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Anthropic API error');
    }

    const data = await response.json();
    const translation = data.content[0].text.trim();

    // Calculate cost (approximate)
    const inputTokens = data.usage.input_tokens;
    const outputTokens = data.usage.output_tokens;
    const cost = this.calculateCost(settings.model, inputTokens, outputTokens);

    const confidence = Math.round((1 - settings.temperature) * 100);

    return { translation, confidence, cost };
  }

  /**
   * Calculate cost based on token usage
   */
  private static calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const costs = COST_PER_MILLION_TOKENS[model as keyof typeof COST_PER_MILLION_TOKENS];
    if (!costs) return 0;

    const inputCost = (inputTokens / 1_000_000) * costs.input;
    const outputCost = (outputTokens / 1_000_000) * costs.output;

    return inputCost + outputCost;
  }

  /**
   * Estimate cost for a batch of translations
   */
  static estimateCost(texts: string[], targetLanguages: number): CostEstimate {
    const settings = AISettingsStore.getSettings();

    // Rough estimation: ~50 tokens per text input, ~100 tokens per output
    const avgInputTokensPerText = 50;
    const avgOutputTokensPerText = 100;

    const totalInputTokens = texts.length * targetLanguages * avgInputTokensPerText;
    const totalOutputTokens = texts.length * targetLanguages * avgOutputTokensPerText;

    const estimatedCost = this.calculateCost(settings.model, totalInputTokens, totalOutputTokens);

    return {
      provider: settings.provider,
      model: settings.model,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      estimatedCost,
    };
  }

  /**
   * Batch translate multiple keys
   */
  static async batchTranslate(
    keyTexts: Array<{ keyId: string; text: string; context?: string }>,
    sourceLanguage: string,
    targetLanguages: string[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<AITranslationSuggestion[]> {
    const suggestions: AITranslationSuggestion[] = [];
    const settings = AISettingsStore.getSettings();
    const total = keyTexts.length * targetLanguages.length;
    let completed = 0;

    for (const { keyId, text, context } of keyTexts) {
      for (const targetLang of targetLanguages) {
        try {
          const result = await this.translateText(text, sourceLanguage, targetLang, context);

          const suggestion = AISuggestionsStore.addSuggestion({
            keyId,
            language: targetLang,
            value: result.translation,
            confidence: result.confidence,
            provider: settings.provider,
            model: settings.model,
            cost: result.cost,
          });

          suggestions.push(suggestion);
          completed++;

          if (onProgress) {
            onProgress(completed, total);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          completed++;

          if (onProgress) {
            onProgress(completed, total);
          }
        }
      }
    }

    return suggestions;
  }
}
