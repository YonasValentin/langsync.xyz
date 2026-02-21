import { describe, it, expect } from "vitest";
import { computeDiff, calculateChangePercentage } from "./diff";

// ============================================
// computeDiff
// ============================================
describe("computeDiff", () => {
  it("returns empty array for two empty strings", () => {
    expect(computeDiff("", "")).toEqual([]);
  });

  it("returns full addition when old text is empty", () => {
    const diff = computeDiff("", "hello world");
    expect(diff).toEqual([{ type: "addition", value: "hello world" }]);
  });

  it("returns full deletion when new text is empty", () => {
    const diff = computeDiff("hello world", "");
    expect(diff).toEqual([{ type: "deletion", value: "hello world" }]);
  });

  it("returns unchanged for identical strings", () => {
    const diff = computeDiff("hello world", "hello world");
    expect(diff).toHaveLength(1);
    expect(diff[0].type).toBe("unchanged");
    expect(diff[0].value).toBe("hello world");
  });

  it("detects changes when text is added", () => {
    const diff = computeDiff("hello world", "hello beautiful world");
    const hasChanges = diff.some((d) => d.type !== "unchanged");
    expect(hasChanges).toBe(true);
    // Should have at least one addition
    const additions = diff.filter((d) => d.type === "addition");
    expect(additions.length).toBeGreaterThan(0);
  });

  it("detects changes when text is removed", () => {
    const diff = computeDiff("hello beautiful world", "hello world");
    const hasChanges = diff.some((d) => d.type !== "unchanged");
    expect(hasChanges).toBe(true);
    // Should have at least one deletion
    const deletions = diff.filter((d) => d.type === "deletion");
    expect(deletions.length).toBeGreaterThan(0);
  });

  it("detects word replacement", () => {
    const diff = computeDiff("the cat sat", "the dog sat");
    const hasAddition = diff.some((d) => d.type === "addition");
    const hasDeletion = diff.some((d) => d.type === "deletion");
    expect(hasAddition).toBe(true);
    expect(hasDeletion).toBe(true);
  });

  it("merges continuous diffs of the same type", () => {
    const diff = computeDiff("a b c", "x y z");
    // Should not have adjacent entries of the same type
    for (let i = 1; i < diff.length; i++) {
      if (diff[i].type === diff[i - 1].type) {
        // This would indicate unmerged diffs — shouldn't happen
        expect(diff[i].type).not.toBe(diff[i - 1].type);
      }
    }
  });

  it("handles completely different strings", () => {
    const diff = computeDiff("alpha beta gamma", "one two three");
    expect(diff.length).toBeGreaterThan(0);
    // Should have both deletions and additions
    const types = new Set(diff.map((d) => d.type));
    expect(types.has("deletion") || types.has("addition")).toBe(true);
  });

  it("preserves whitespace in splits", () => {
    const diff = computeDiff("a  b", "a  b");
    // Identical strings should produce one unchanged
    expect(diff).toHaveLength(1);
    expect(diff[0].type).toBe("unchanged");
  });
});

// ============================================
// calculateChangePercentage
// ============================================
describe("calculateChangePercentage", () => {
  it("returns 0 for two empty strings", () => {
    expect(calculateChangePercentage("", "")).toBe(0);
  });

  it("returns 100 for empty old text", () => {
    expect(calculateChangePercentage("", "something")).toBe(100);
  });

  it("returns 100 for empty new text", () => {
    expect(calculateChangePercentage("something", "")).toBe(100);
  });

  it("returns 0 for identical strings", () => {
    expect(calculateChangePercentage("hello world", "hello world")).toBe(0);
  });

  it("returns value between 0 and 100 for partial changes", () => {
    const pct = calculateChangePercentage("hello world", "hello there");
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThanOrEqual(100);
  });

  it("returns a rounded integer", () => {
    const pct = calculateChangePercentage("the quick brown fox", "the slow brown cat");
    expect(Number.isInteger(pct)).toBe(true);
  });

  it("returns 100 for completely different strings", () => {
    const pct = calculateChangePercentage("abc", "xyz");
    expect(pct).toBe(100);
  });
});
