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
    `http://localhost/api/v1/projects/${PROJECT_ID}/keys`,
    { headers: { authorization: "Bearer test-key" } }
  );
}

describe("v1 GET /projects/[projectId]/keys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue(null);
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

  it("returns 401 when auth fails", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );

    const res = await GET(makeRequest(), {
      params: Promise.resolve({ projectId: PROJECT_ID }),
    });
    expect(res.status).toBe(401);
  });

  it("returns keys on success", async () => {
    const mockKeys = [
      {
        id: "key1",
        key: "greeting.hello",
        description: "Hello greeting",
        context: "used on homepage",
        created: "2024-01-01",
        updated: "2024-06-01",
      },
      {
        id: "key2",
        key: "greeting.bye",
        description: "Goodbye",
        context: "",
        created: "2024-01-02",
        updated: "2024-06-02",
      },
    ];

    const mockPb = {
      collection: vi.fn().mockReturnValue({
        getFullList: vi.fn().mockResolvedValue(mockKeys),
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
    expect(body.data).toHaveLength(2);
    expect(body.data[0].key).toBe("greeting.hello");
    expect(body.data[1].key).toBe("greeting.bye");
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(authenticateApiKey).mockRejectedValue(new Error("DB error"));

    const res = await GET(makeRequest(), {
      params: Promise.resolve({ projectId: PROJECT_ID }),
    });
    expect(res.status).toBe(500);
  });
});
