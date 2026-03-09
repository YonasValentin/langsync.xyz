import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/api/auth-middleware", () => ({
  authenticateApiKey: vi.fn(),
}));

vi.mock("@/lib/api/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
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
    `http://localhost/api/v1/projects/${PROJECT_ID}/translations`,
    { headers: { authorization: "Bearer test-key" } }
  );
}

describe("v1 GET /projects/[projectId]/translations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue(null);
  });

  it("returns empty data when no keys exist", async () => {
    const mockPb = {
      collection: vi.fn().mockReturnValue({
        getFullList: vi.fn().mockResolvedValue([]),
      }),
    };

    vi.mocked(authenticateApiKey).mockResolvedValue({
      pb: mockPb as never,
      userId: "user1",
      project: { id: PROJECT_ID },
    });

    const res = await GET(makeRequest(), {
      params: Promise.resolve({ projectId: PROJECT_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("returns keys with grouped translations", async () => {
    const keys = [
      { id: "k1", key: "hello", description: "", context: "", created: "", updated: "" },
    ];

    const translations = [
      { translationKey: "k1", language: "en", value: "Hello" },
      { translationKey: "k1", language: "es", value: "Hola" },
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
      project: { id: PROJECT_ID },
    });

    const res = await GET(makeRequest(), {
      params: Promise.resolve({ projectId: PROJECT_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].key).toBe("hello");
    expect(body.data[0].translations).toEqual({ en: "Hello", es: "Hola" });
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(
      NextResponse.json({ error: "Too many requests" }, { status: 429 })
    );

    const res = await GET(makeRequest(), {
      params: Promise.resolve({ projectId: PROJECT_ID }),
    });
    expect(res.status).toBe(429);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(authenticateApiKey).mockRejectedValue(new Error("error"));

    const res = await GET(makeRequest(), {
      params: Promise.resolve({ projectId: PROJECT_ID }),
    });
    expect(res.status).toBe(500);
  });
});
