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
  return new Request("http://localhost/api/v1/projects/" + PROJECT_ID, {
    headers: { authorization: "Bearer test-key" },
  });
}

describe("v1 GET /projects/[projectId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue(null);
  });

  it("returns 429 when rate limited", async () => {
    const rateLimitResponse = NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
    vi.mocked(checkRateLimit).mockResolvedValue(rateLimitResponse);

    const res = await GET(makeRequest(), {
      params: Promise.resolve({ projectId: PROJECT_ID }),
    });
    expect(res.status).toBe(429);
  });

  it("returns auth error when authentication fails", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );

    const res = await GET(makeRequest(), {
      params: Promise.resolve({ projectId: PROJECT_ID }),
    });
    expect(res.status).toBe(401);
  });

  it("returns project data on success", async () => {
    const project = {
      id: PROJECT_ID,
      name: "Test Project",
      description: "A test project",
      defaultLanguage: "en",
      languages: ["en", "es", "fr"],
      created: "2024-01-01T00:00:00Z",
      updated: "2024-06-01T00:00:00Z",
    };

    vi.mocked(authenticateApiKey).mockResolvedValue({
      pb: {} as never,
      userId: "user1",
      project,
    });

    const res = await GET(makeRequest(), {
      params: Promise.resolve({ projectId: PROJECT_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(PROJECT_ID);
    expect(body.data.name).toBe("Test Project");
    expect(body.data.languages).toEqual(["en", "es", "fr"]);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(authenticateApiKey).mockRejectedValue(
      new Error("Unexpected error")
    );

    const res = await GET(makeRequest(), {
      params: Promise.resolve({ projectId: PROJECT_ID }),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
