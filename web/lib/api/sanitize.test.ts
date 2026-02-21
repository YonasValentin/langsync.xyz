import { describe, it, expect } from "vitest";
import {
  escapeFilterValue,
  isValidRecordId,
  isValidApiKey,
  isValidLanguageCode,
} from "./sanitize";

// ============================================
// escapeFilterValue
// ============================================
describe("escapeFilterValue", () => {
  it("returns the original string when no special chars", () => {
    expect(escapeFilterValue("hello")).toBe("hello");
  });

  it("escapes double quotes", () => {
    expect(escapeFilterValue('say "hello"')).toBe('say \\"hello\\"');
  });

  it("escapes backslashes", () => {
    expect(escapeFilterValue("path\\to\\file")).toBe("path\\\\to\\\\file");
  });

  it("escapes backslashes before double quotes (order matters)", () => {
    // A trailing backslash followed by a quote must not produce an unescaped quote
    expect(escapeFilterValue('\\"')).toBe('\\\\\\"');
  });

  it("handles empty string", () => {
    expect(escapeFilterValue("")).toBe("");
  });

  it("prevents filter injection via double-quote escape", () => {
    // Attacker input: value" || 1==1 || "
    const malicious = '" || 1==1 || "';
    const escaped = escapeFilterValue(malicious);
    expect(escaped).not.toContain('""');
    expect(escaped).toBe('\\" || 1==1 || \\"');
  });

  it("handles unicode characters without escaping", () => {
    expect(escapeFilterValue("日本語テスト")).toBe("日本語テスト");
  });

  it("handles mixed special characters", () => {
    expect(escapeFilterValue('a\\b"c')).toBe('a\\\\b\\"c');
  });
});

// ============================================
// isValidRecordId
// ============================================
describe("isValidRecordId", () => {
  it("accepts a valid 15-char alphanumeric id", () => {
    expect(isValidRecordId("abc123def456ghi")).toBe(true);
  });

  it("accepts uppercase letters", () => {
    expect(isValidRecordId("AbC123DeF456GhI")).toBe(true);
  });

  it("rejects too short ids", () => {
    expect(isValidRecordId("abc123")).toBe(false);
  });

  it("rejects too long ids", () => {
    expect(isValidRecordId("abc123def456ghij")).toBe(false);
  });

  it("rejects ids with special characters", () => {
    expect(isValidRecordId("abc123def456gh!")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidRecordId("")).toBe(false);
  });

  it("rejects ids with spaces", () => {
    expect(isValidRecordId("abc 23def456ghi")).toBe(false);
  });

  it("rejects ids with underscores", () => {
    expect(isValidRecordId("abc_23def456ghi")).toBe(false);
  });
});

// ============================================
// isValidApiKey
// ============================================
describe("isValidApiKey", () => {
  it("accepts lsk_ prefixed key with 48 alphanumeric chars", () => {
    const key = "lsk_" + "a".repeat(48);
    expect(isValidApiKey(key)).toBe(true);
  });

  it("accepts lsk_ prefixed key with mixed case and numbers", () => {
    // 48 chars: 16 * 3 = 48
    const key = "lsk_" + "aB1".repeat(16);
    expect(key.length).toBe(52); // 4 prefix + 48 alphanum
    expect(isValidApiKey(key)).toBe(true);
  });

  it("accepts legacy 64-char alphanumeric key", () => {
    const key = "a".repeat(64);
    expect(isValidApiKey(key)).toBe(true);
  });

  it("rejects lsk_ key with wrong length", () => {
    const key = "lsk_" + "a".repeat(47);
    expect(isValidApiKey(key)).toBe(false);
  });

  it("rejects key with special characters", () => {
    const key = "lsk_" + "a".repeat(47) + "!";
    expect(isValidApiKey(key)).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidApiKey("")).toBe(false);
  });

  it("rejects short random string", () => {
    expect(isValidApiKey("short-key")).toBe(false);
  });

  it("rejects legacy key with wrong length", () => {
    const key = "a".repeat(63);
    expect(isValidApiKey(key)).toBe(false);
  });
});

// ============================================
// isValidLanguageCode
// ============================================
describe("isValidLanguageCode", () => {
  it('accepts "en"', () => {
    expect(isValidLanguageCode("en")).toBe(true);
  });

  it('accepts "pt-BR"', () => {
    expect(isValidLanguageCode("pt-BR")).toBe(true);
  });

  it('accepts "zh-Hans"', () => {
    expect(isValidLanguageCode("zh-Hans")).toBe(true);
  });

  it("accepts 3-letter codes like 'haw'", () => {
    expect(isValidLanguageCode("haw")).toBe(true);
  });

  it("rejects uppercase primary tag", () => {
    expect(isValidLanguageCode("EN")).toBe(false);
  });

  it("rejects all-lowercase subtag", () => {
    expect(isValidLanguageCode("pt-br")).toBe(false);
  });

  it("rejects numeric codes", () => {
    expect(isValidLanguageCode("12")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidLanguageCode("")).toBe(false);
  });

  it("rejects single character", () => {
    expect(isValidLanguageCode("e")).toBe(false);
  });

  it("rejects overly long primary tag", () => {
    expect(isValidLanguageCode("abcd")).toBe(false);
  });
});
