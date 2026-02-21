import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/pocketbase-server", () => ({
  getAdminPb: vi.fn(),
}));

vi.mock("@/lib/api/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: "Translated text" } }],
            usage: {
              prompt_tokens: 100,
              completion_tokens: 20,
              total_tokens: 120,
            },
          }),
        },
      },
    })),
  };
});

import { POST } from "./route";
import { getAdminPb } from "@/lib/pocketbase-server";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { NextResponse } from "next/server";

const VALID_PROJECT_ID = "abc123def456ghi";
const VALID_KEY_ID = "xyz789abc123def";

function makeRequest(
  body: Record<string, unknown>,
  cookie?: string
): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (cookie) headers["cookie"] = cookie;
  return new Request("http://localhost/api/ai/translate", {
    method: "POST",
    body: JSON.stringify(body),
    headers,
  });
}

function makePbAuthCookie(userId: string): string {
  const data = { record: { id: userId } };
  return `pb_auth=${encodeURIComponent(JSON.stringify(data))}`;
}

describe("AI translate POST", () => {
  let mockPb: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockReturnValue(null);

    mockPb = {
      collection: vi.fn().mockImplementation((name: string) => {
        if (name === "users") {
          return {
            getOne: vi.fn().mockResolvedValue({ id: "user_123" }),
          };
        }
        if (name === "projects") {
          return {
            getOne: vi.fn().mockResolvedValue({
              id: VALID_PROJECT_ID,
              user: "user_123",
              defaultLanguage: "en",
              toneOfVoice: "",
              projectBrief: "",
              styleGuide: "",
              industryType: "",
              targetAudience: "",
            }),
          };
        }
        if (name === "translation_keys") {
          return {
            getOne: vi.fn().mockResolvedValue({
              id: VALID_KEY_ID,
              key: "greeting.hello",
              context: "",
            }),
          };
        }
        if (name === "translations") {
          return {
            getFullList: vi.fn().mockResolvedValue([
              { value: "Hello", language: "en", translationKey: VALID_KEY_ID },
            ]),
          };
        }
        if (name === "ai_translations") {
          return {
            create: vi.fn().mockResolvedValue({
              id: "ai_1",
              translatedText: "Translated text",
            }),
          };
        }
        if (name === "translation_memory") {
          return {
            create: vi.fn().mockResolvedValue({}),
          };
        }
        return { getOne: vi.fn(), getFullList: vi.fn(), create: vi.fn() };
      }),
    };
    vi.mocked(getAdminPb).mockResolvedValue(mockPb as never);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(
      NextResponse.json({ error: "Too many requests" }, { status: 429 })
    );

    const req = makeRequest(
      {
        projectId: VALID_PROJECT_ID,
        keyId: VALID_KEY_ID,
        targetLanguage: "es",
      },
      makePbAuthCookie("user_123")
    );
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it("returns 400 when required fields are missing", async () => {
    const req = makeRequest(
      { projectId: VALID_PROJECT_ID },
      makePbAuthCookie("user_123")
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Missing required fields");
  });

  it("returns 400 for invalid projectId format", async () => {
    const req = makeRequest(
      { projectId: "bad", keyId: VALID_KEY_ID, targetLanguage: "es" },
      makePbAuthCookie("user_123")
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid projectId or keyId");
  });

  it("returns 400 for invalid targetLanguage", async () => {
    const req = makeRequest(
      {
        projectId: VALID_PROJECT_ID,
        keyId: VALID_KEY_ID,
        targetLanguage: "this-is-way-too-long",
      },
      makePbAuthCookie("user_123")
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid target language");
  });

  it("returns 401 when no cookie header", async () => {
    const req = makeRequest({
      projectId: VALID_PROJECT_ID,
      keyId: VALID_KEY_ID,
      targetLanguage: "es",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when pb_auth cookie missing", async () => {
    const req = makeRequest(
      {
        projectId: VALID_PROJECT_ID,
        keyId: VALID_KEY_ID,
        targetLanguage: "es",
      },
      "other_cookie=value"
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when cookie has invalid JSON", async () => {
    const req = makeRequest(
      {
        projectId: VALID_PROJECT_ID,
        keyId: VALID_KEY_ID,
        targetLanguage: "es",
      },
      "pb_auth=not-valid-json"
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 when user doesn't own project", async () => {
    // Override projects mock to return different user
    mockPb.collection = vi.fn().mockImplementation((name: string) => {
      if (name === "users") {
        return {
          getOne: vi.fn().mockResolvedValue({ id: "user_123" }),
        };
      }
      if (name === "projects") {
        return {
          getOne: vi.fn().mockResolvedValue({
            id: VALID_PROJECT_ID,
            user: "other_user",
            defaultLanguage: "en",
          }),
        };
      }
      return { getOne: vi.fn(), getFullList: vi.fn(), create: vi.fn() };
    });

    const req = makeRequest(
      {
        projectId: VALID_PROJECT_ID,
        keyId: VALID_KEY_ID,
        targetLanguage: "es",
      },
      makePbAuthCookie("user_123")
    );
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 when no source translation found", async () => {
    mockPb.collection = vi.fn().mockImplementation((name: string) => {
      if (name === "users") {
        return { getOne: vi.fn().mockResolvedValue({ id: "user_123" }) };
      }
      if (name === "projects") {
        return {
          getOne: vi.fn().mockResolvedValue({
            id: VALID_PROJECT_ID,
            user: "user_123",
            defaultLanguage: "en",
          }),
        };
      }
      if (name === "translation_keys") {
        return { getOne: vi.fn().mockResolvedValue({ id: VALID_KEY_ID }) };
      }
      if (name === "translations") {
        return { getFullList: vi.fn().mockResolvedValue([]) }; // No source
      }
      return { getOne: vi.fn(), getFullList: vi.fn(), create: vi.fn() };
    });

    const req = makeRequest(
      {
        projectId: VALID_PROJECT_ID,
        keyId: VALID_KEY_ID,
        targetLanguage: "es",
      },
      makePbAuthCookie("user_123")
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("No source translation");
  });

  it("returns translated text on success", async () => {
    const req = makeRequest(
      {
        projectId: VALID_PROJECT_ID,
        keyId: VALID_KEY_ID,
        targetLanguage: "es",
      },
      makePbAuthCookie("user_123")
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.translatedText).toBe("Translated text");
  });
});
