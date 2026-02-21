import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/api/auth-middleware", () => ({
  authenticateApiKey: vi.fn(),
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

import { GET } from "./route";
import { authenticateApiKey } from "@/lib/api/auth-middleware";
import { checkRateLimit } from "@/lib/api/rate-limit";

const PROJECT_ID = "abc123def456ghi";

function makeRequest(): Request {
  return new Request(
    `http://localhost/api/v1/projects/${PROJECT_ID}/translations/es`,
    { headers: { authorization: "Bearer test-key" } }
  );
}

describe("v1 GET /projects/[projectId]/translations/[language]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockReturnValue(null);
  });

  it("returns 400 for invalid language code", async () => {
    const res = await GET(makeRequest(), {
      params: Promise.resolve({ projectId: PROJECT_ID, language: "INVALID" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid language code");
  });

  it("returns 404 when language is not configured for project", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({
      pb: {} as never,
      userId: "user1",
      project: { id: PROJECT_ID, languages: ["en", "fr"] },
    });

    const res = await GET(makeRequest(), {
      params: Promise.resolve({ projectId: PROJECT_ID, language: "es" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("not configured for this project");
  });

  it("returns empty object when no keys exist", async () => {
    const mockPb = {
      collection: vi.fn().mockReturnValue({
        getFullList: vi.fn().mockResolvedValue([]),
      }),
    };

    vi.mocked(authenticateApiKey).mockResolvedValue({
      pb: mockPb as never,
      userId: "user1",
      project: { id: PROJECT_ID, languages: ["en", "es"] },
    });

    const res = await GET(makeRequest(), {
      params: Promise.resolve({ projectId: PROJECT_ID, language: "es" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({});
  });

  it("returns flat dictionary for language", async () => {
    const keys = [
      { id: "k1", key: "greeting.hello" },
      { id: "k2", key: "greeting.bye" },
    ];

    const translations = [
      { translationKey: "k1", language: "es", value: "Hola" },
      { translationKey: "k2", language: "es", value: "Adiós" },
    ];

    let callIndex = 0;
    const mockPb = {
      collection: vi.fn().mockReturnValue({
        getFullList: vi.fn().mockImplementation(() => {
          callIndex++;
          return callIndex === 1
            ? Promise.resolve(keys)
            : Promise.resolve(translations);
        }),
      }),
    };

    vi.mocked(authenticateApiKey).mockResolvedValue({
      pb: mockPb as never,
      userId: "user1",
      project: { id: PROJECT_ID, languages: ["en", "es"] },
    });

    const res = await GET(makeRequest(), {
      params: Promise.resolve({ projectId: PROJECT_ID, language: "es" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({
      "greeting.hello": "Hola",
      "greeting.bye": "Adiós",
    });
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(
      NextResponse.json({ error: "Too many" }, { status: 429 })
    );

    const res = await GET(makeRequest(), {
      params: Promise.resolve({ projectId: PROJECT_ID, language: "es" }),
    });
    expect(res.status).toBe(429);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(authenticateApiKey).mockRejectedValue(new Error("crash"));

    const res = await GET(makeRequest(), {
      params: Promise.resolve({ projectId: PROJECT_ID, language: "es" }),
    });
    expect(res.status).toBe(500);
  });
});
