import { describe, it, expect } from "vitest";
import {
  levenshteinDistance,
  calculateSimilarity,
  findFuzzyMatches,
} from "./fuzzy-match";

// ============================================
// levenshteinDistance
// ============================================
describe("levenshteinDistance", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshteinDistance("hello", "hello")).toBe(0);
  });

  it("returns 0 for two empty strings", () => {
    expect(levenshteinDistance("", "")).toBe(0);
  });

  it("returns length of other string when one is empty", () => {
    expect(levenshteinDistance("", "hello")).toBe(5);
    expect(levenshteinDistance("hello", "")).toBe(5);
  });

  it("counts single substitution", () => {
    expect(levenshteinDistance("cat", "bat")).toBe(1);
  });

  it("counts single insertion", () => {
    expect(levenshteinDistance("cat", "cats")).toBe(1);
  });

  it("counts single deletion", () => {
    expect(levenshteinDistance("cats", "cat")).toBe(1);
  });

  it("handles completely different strings", () => {
    expect(levenshteinDistance("abc", "xyz")).toBe(3);
  });

  it("kitten -> sitting = 3", () => {
    expect(levenshteinDistance("kitten", "sitting")).toBe(3);
  });

  it("is symmetric", () => {
    const d1 = levenshteinDistance("hello", "world");
    const d2 = levenshteinDistance("world", "hello");
    expect(d1).toBe(d2);
  });

  it("handles unicode characters", () => {
    expect(levenshteinDistance("café", "cafe")).toBe(1);
  });
});

// ============================================
// calculateSimilarity
// ============================================
describe("calculateSimilarity", () => {
  it("returns 100 for identical strings", () => {
    expect(calculateSimilarity("hello", "hello")).toBe(100);
  });

  it("returns 100 for identical strings with different casing", () => {
    expect(calculateSimilarity("Hello", "hello")).toBe(100);
  });

  it("returns 100 for identical strings with leading/trailing whitespace", () => {
    expect(calculateSimilarity("  hello  ", "hello")).toBe(100);
  });

  it("returns 0 when one string is empty", () => {
    expect(calculateSimilarity("", "hello")).toBe(0);
    expect(calculateSimilarity("hello", "")).toBe(0);
  });

  it("returns a rounded integer", () => {
    const sim = calculateSimilarity("abc", "abd");
    expect(Number.isInteger(sim)).toBe(true);
  });

  it("returns value between 0 and 100", () => {
    const sim = calculateSimilarity("hello", "world");
    expect(sim).toBeGreaterThanOrEqual(0);
    expect(sim).toBeLessThanOrEqual(100);
  });

  it("similar strings score higher than dissimilar", () => {
    const similar = calculateSimilarity("hello", "hella");
    const dissimilar = calculateSimilarity("hello", "xxxxx");
    expect(similar).toBeGreaterThan(dissimilar);
  });

  it("handles single-char strings", () => {
    expect(calculateSimilarity("a", "a")).toBe(100);
    expect(calculateSimilarity("a", "b")).toBe(0);
  });
});

// ============================================
// findFuzzyMatches
// ============================================
describe("findFuzzyMatches", () => {
  const entries = [
    { sourceText: "Hello world", targetText: "Hola mundo" },
    { sourceText: "Good morning", targetText: "Buenos días" },
    { sourceText: "Goodbye", targetText: "Adiós" },
    { sourceText: "Hello there", targetText: "Hola allí" },
  ];

  it("finds matches above default threshold (70%)", () => {
    const matches = findFuzzyMatches("Hello world", entries);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].similarity).toBe(100); // exact match
  });

  it("returns results sorted by similarity descending", () => {
    const matches = findFuzzyMatches("Hello world", entries, 30);
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i - 1].similarity).toBeGreaterThanOrEqual(
        matches[i].similarity
      );
    }
  });

  it("filters out entries below minimum similarity", () => {
    const matches = findFuzzyMatches("Hello world", entries, 90);
    for (const match of matches) {
      expect(match.similarity).toBeGreaterThanOrEqual(90);
    }
  });

  it("returns empty array when nothing matches", () => {
    const matches = findFuzzyMatches("zzzzzzz", entries, 90);
    expect(matches).toEqual([]);
  });

  it("each result includes the similarity score", () => {
    const matches = findFuzzyMatches("Hello", entries, 30);
    for (const match of matches) {
      expect(match).toHaveProperty("similarity");
      expect(typeof match.similarity).toBe("number");
    }
  });

  it("preserves original entry properties", () => {
    const matches = findFuzzyMatches("Hello world", entries);
    if (matches.length > 0) {
      expect(matches[0]).toHaveProperty("sourceText");
      expect(matches[0]).toHaveProperty("targetText");
    }
  });

  it("uses custom minimum similarity", () => {
    const strict = findFuzzyMatches("Hello world", entries, 95);
    const loose = findFuzzyMatches("Hello world", entries, 30);
    expect(loose.length).toBeGreaterThanOrEqual(strict.length);
  });

  it("handles empty entries array", () => {
    const matches = findFuzzyMatches("Hello", [], 50);
    expect(matches).toEqual([]);
  });
});
