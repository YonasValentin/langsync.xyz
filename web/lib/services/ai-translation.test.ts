import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the store dependencies
vi.mock("@/lib/store/ai-settings-store", () => ({
  AISettingsStore: {
    getSettings: vi.fn(),
  },
  AISuggestionsStore: {
    addSuggestion: vi.fn(),
  },
}));

import { AITranslationService } from "./ai-translation";
import { AISettingsStore, AISuggestionsStore } from "@/lib/store/ai-settings-store";

const defaultSettings = {
  provider: "openai" as const,
  model: "gpt-4" as const,
  apiKey: "sk-test-key",
  temperature: 0.3,
  maxTokens: 1000,
  enableAutoCost: true,
};

describe("AITranslationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AISettingsStore.getSettings).mockReturnValue(defaultSettings);
    vi.mocked(AISuggestionsStore.addSuggestion).mockImplementation(
      (input: Record<string, unknown>) =>
        ({
          ...input,
          createdAt: new Date(),
          status: "pending",
        }) as never
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // estimateCost (pure logic, no API calls)
  // ============================================
  describe("estimateCost", () => {
    it("calculates cost for single text and single language", () => {
      const estimate = AITranslationService.estimateCost(["Hello world"], 1);
      expect(estimate).toHaveProperty("provider", "openai");
      expect(estimate).toHaveProperty("model", "gpt-4");
      expect(estimate.inputTokens).toBe(50); // 1 text * 1 lang * 50
      expect(estimate.outputTokens).toBe(100); // 1 text * 1 lang * 100
      expect(estimate.estimatedCost).toBeGreaterThan(0);
    });

    it("scales with number of texts", () => {
      const single = AITranslationService.estimateCost(["a"], 1);
      const multiple = AITranslationService.estimateCost(["a", "b", "c"], 1);
      expect(multiple.estimatedCost).toBe(single.estimatedCost * 3);
    });

    it("scales with number of target languages", () => {
      const oneLang = AITranslationService.estimateCost(["a"], 1);
      const threeLangs = AITranslationService.estimateCost(["a"], 3);
      expect(threeLangs.estimatedCost).toBe(oneLang.estimatedCost * 3);
    });

    it("returns 0 cost for unknown model", () => {
      vi.mocked(AISettingsStore.getSettings).mockReturnValue({
        ...defaultSettings,
        model: "unknown-model" as never,
      });
      const estimate = AITranslationService.estimateCost(["Hello"], 1);
      expect(estimate.estimatedCost).toBe(0);
    });

    it("calculates correct GPT-4 cost", () => {
      // 1 text * 1 lang = 50 input, 100 output tokens
      // GPT-4: $30/1M input, $60/1M output
      // Cost = (50/1M)*30 + (100/1M)*60 = 0.0015 + 0.006 = 0.0075
      const estimate = AITranslationService.estimateCost(["Hello"], 1);
      expect(estimate.estimatedCost).toBeCloseTo(0.0075, 4);
    });

    it("calculates correct GPT-3.5-turbo cost", () => {
      vi.mocked(AISettingsStore.getSettings).mockReturnValue({
        ...defaultSettings,
        model: "gpt-3.5-turbo" as never,
      });
      // 50 input @ $0.5/1M, 100 output @ $1.5/1M
      // Cost = (50/1M)*0.5 + (100/1M)*1.5 = 0.000025 + 0.00015 = 0.000175
      const estimate = AITranslationService.estimateCost(["Hello"], 1);
      expect(estimate.estimatedCost).toBeCloseTo(0.000175, 6);
    });

    it("calculates correct Claude 3.5 Sonnet cost", () => {
      vi.mocked(AISettingsStore.getSettings).mockReturnValue({
        ...defaultSettings,
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022" as never,
      });
      // 50 input @ $3/1M, 100 output @ $15/1M
      // Cost = (50/1M)*3 + (100/1M)*15 = 0.00015 + 0.0015 = 0.00165
      const estimate = AITranslationService.estimateCost(["Hello"], 1);
      expect(estimate.estimatedCost).toBeCloseTo(0.00165, 5);
    });

    it("returns correct provider and model", () => {
      vi.mocked(AISettingsStore.getSettings).mockReturnValue({
        ...defaultSettings,
        provider: "anthropic",
        model: "claude-3-haiku-20240307" as never,
      });
      const estimate = AITranslationService.estimateCost(["Hello"], 1);
      expect(estimate.provider).toBe("anthropic");
      expect(estimate.model).toBe("claude-3-haiku-20240307");
    });
  });

  // ============================================
  // translateText
  // ============================================
  describe("translateText", () => {
    it("throws when API key is not configured", async () => {
      vi.mocked(AISettingsStore.getSettings).mockReturnValue({
        ...defaultSettings,
        apiKey: "",
      });
      await expect(
        AITranslationService.translateText("Hello", "en", "es")
      ).rejects.toThrow("API key not configured");
    });

    it("calls OpenAI when provider is openai", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: "Hola" } }],
            usage: { prompt_tokens: 50, completion_tokens: 10 },
          }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await AITranslationService.translateText(
        "Hello",
        "en",
        "es"
      );
      expect(result.translation).toBe("Hola");
      expect(result.confidence).toBeDefined();
      expect(result.cost).toBeGreaterThanOrEqual(0);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/chat/completions",
        expect.objectContaining({
          method: "POST",
        })
      );
      vi.unstubAllGlobals();
    });

    it("calls Anthropic when provider is anthropic", async () => {
      vi.mocked(AISettingsStore.getSettings).mockReturnValue({
        ...defaultSettings,
        provider: "anthropic",
        model: "claude-3-haiku-20240307" as never,
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [{ text: "Hola" }],
            usage: { input_tokens: 50, output_tokens: 10 },
          }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await AITranslationService.translateText(
        "Hello",
        "en",
        "es"
      );
      expect(result.translation).toBe("Hola");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.anthropic.com/v1/messages",
        expect.objectContaining({
          method: "POST",
        })
      );
      vi.unstubAllGlobals();
    });

    it("throws on OpenAI API error", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({
            error: { message: "Rate limit exceeded" },
          }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(
        AITranslationService.translateText("Hello", "en", "es")
      ).rejects.toThrow("Rate limit exceeded");
      vi.unstubAllGlobals();
    });

    it("calculates confidence from temperature", async () => {
      vi.mocked(AISettingsStore.getSettings).mockReturnValue({
        ...defaultSettings,
        temperature: 0.2,
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: "Hola" } }],
            usage: { prompt_tokens: 50, completion_tokens: 10 },
          }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await AITranslationService.translateText(
        "Hello",
        "en",
        "es"
      );
      // confidence = Math.round((1 - 0.2) * 100) = 80
      expect(result.confidence).toBe(80);
      vi.unstubAllGlobals();
    });

    it("includes context in prompt when provided", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: "Hola" } }],
            usage: { prompt_tokens: 50, completion_tokens: 10 },
          }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await AITranslationService.translateText(
        "Hello",
        "en",
        "es",
        "greeting context"
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const userContent = body.messages[1].content;
      expect(userContent).toContain("greeting context");
      vi.unstubAllGlobals();
    });
  });

  // ============================================
  // batchTranslate
  // ============================================
  describe("batchTranslate", () => {
    it("translates multiple keys and languages", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: "Translated" } }],
            usage: { prompt_tokens: 50, completion_tokens: 10 },
          }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const results = await AITranslationService.batchTranslate(
        [{ keyId: "k1", text: "Hello" }],
        "en",
        ["es", "fr"]
      );

      expect(results).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      vi.unstubAllGlobals();
    });

    it("calls onProgress callback", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: "Translated" } }],
            usage: { prompt_tokens: 50, completion_tokens: 10 },
          }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const onProgress = vi.fn();
      await AITranslationService.batchTranslate(
        [{ keyId: "k1", text: "Hello" }],
        "en",
        ["es"],
        onProgress
      );

      expect(onProgress).toHaveBeenCalledWith(1, 1);
      vi.unstubAllGlobals();
    });

    it("continues on error and still calls onProgress", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
      vi.stubGlobal("fetch", mockFetch);

      // The batchTranslate catches errors internally, so the API key check will throw
      vi.mocked(AISettingsStore.getSettings).mockReturnValue({
        ...defaultSettings,
        apiKey: "", // This will cause translateText to throw
      });

      const onProgress = vi.fn();
      const results = await AITranslationService.batchTranslate(
        [{ keyId: "k1", text: "Hello" }],
        "en",
        ["es"],
        onProgress
      );

      expect(results).toHaveLength(0); // Failed translations not included
      expect(onProgress).toHaveBeenCalledWith(1, 1);
      vi.unstubAllGlobals();
    });
  });
});
