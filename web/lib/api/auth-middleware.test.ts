import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextResponse } from "next/server";

// Mock dependencies before importing the module under test
vi.mock("@/lib/pocketbase-server", () => ({
  getAdminPb: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { authenticateApiKey } from "./auth-middleware";
import { getAdminPb } from "@/lib/pocketbase-server";

const VALID_PROJECT_ID = "abc123def456ghi"; // 15 chars
const VALID_API_KEY = "lsk_" + "a".repeat(48);

function makeRequest(apiKey?: string): Request {
  const headers: Record<string, string> = {};
  if (apiKey !== undefined) {
    headers["authorization"] = `Bearer ${apiKey}`;
  }
  return new Request("http://localhost/api/v1/test", { headers });
}

function makeMockPb(overrides: {
  apiKeyRecords?: Array<Record<string, unknown>>;
  project?: Record<string, unknown>;
  apiKeyQueryError?: boolean;
  projectError?: boolean;
}) {
  const mockPb = {
    collection: vi.fn((name: string) => {
      if (name === "api_keys") {
        return {
          getFullList: overrides.apiKeyQueryError
            ? vi.fn().mockRejectedValue(new Error("DB error"))
            : vi.fn().mockResolvedValue(overrides.apiKeyRecords ?? []),
        };
      }
      if (name === "projects") {
        return {
          getOne: overrides.projectError
            ? vi.fn().mockRejectedValue(new Error("Not found"))
            : vi.fn().mockResolvedValue(overrides.project ?? {}),
        };
      }
      return {
        getFullList: vi.fn().mockResolvedValue([]),
        getOne: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      };
    }),
  };

  // Also need update on api_keys for lastUsedAt
  const originalCollection = mockPb.collection;
  mockPb.collection = vi.fn((name: string) => {
    const result = originalCollection(name) as Record<string, unknown>;
    if (name === "api_keys") {
      result.update = vi.fn().mockResolvedValue({});
    }
    return result;
  });

  return mockPb;
}

describe("authenticateApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no authorization header", async () => {
    const req = new Request("http://localhost/api/test");
    const result = await authenticateApiKey(req, VALID_PROJECT_ID);
    expect(result).toBeInstanceOf(NextResponse);
    const res = result as NextResponse;
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Missing or invalid authorization header");
  });

  it("returns 401 when authorization header has wrong scheme", async () => {
    const req = new Request("http://localhost/api/test", {
      headers: { authorization: "Basic abc123" },
    });
    const result = await authenticateApiKey(req, VALID_PROJECT_ID);
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it("returns 401 for invalid API key format", async () => {
    const req = makeRequest("invalid-key-format");
    const result = await authenticateApiKey(req, VALID_PROJECT_ID);
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
    const body = await (result as NextResponse).json();
    expect(body.error).toContain("Invalid API key format");
  });

  it("returns 400 for invalid project ID format", async () => {
    const req = makeRequest(VALID_API_KEY);
    const result = await authenticateApiKey(req, "bad-id");
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(400);
    const body = await (result as NextResponse).json();
    expect(body.error).toContain("Invalid project ID");
  });

  it("returns 500 when getAdminPb fails", async () => {
    vi.mocked(getAdminPb).mockRejectedValue(new Error("Auth failed"));
    const req = makeRequest(VALID_API_KEY);
    const result = await authenticateApiKey(req, VALID_PROJECT_ID);
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(500);
  });

  it("returns 401 when API key not found in DB", async () => {
    const mockPb = makeMockPb({ apiKeyRecords: [] });
    vi.mocked(getAdminPb).mockResolvedValue(mockPb as never);

    const req = makeRequest(VALID_API_KEY);
    const result = await authenticateApiKey(req, VALID_PROJECT_ID);
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
    const body = await (result as NextResponse).json();
    expect(body.error).toBe("Invalid API key");
  });

  it("returns 401 when API key is revoked", async () => {
    const mockPb = makeMockPb({
      apiKeyRecords: [
        { id: "key1", key: VALID_API_KEY, user: "user1", revoked: true },
      ],
    });
    vi.mocked(getAdminPb).mockResolvedValue(mockPb as never);

    const req = makeRequest(VALID_API_KEY);
    const result = await authenticateApiKey(req, VALID_PROJECT_ID);
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
    const body = await (result as NextResponse).json();
    expect(body.error).toBe("API key has been revoked");
  });

  it("returns 401 when API key is expired", async () => {
    const mockPb = makeMockPb({
      apiKeyRecords: [
        {
          id: "key1",
          key: VALID_API_KEY,
          user: "user1",
          revoked: false,
          expiresAt: "2020-01-01T00:00:00Z", // past
        },
      ],
    });
    vi.mocked(getAdminPb).mockResolvedValue(mockPb as never);

    const req = makeRequest(VALID_API_KEY);
    const result = await authenticateApiKey(req, VALID_PROJECT_ID);
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
    const body = await (result as NextResponse).json();
    expect(body.error).toBe("API key has expired");
  });

  it("returns 403 when key is scoped to different project", async () => {
    const mockPb = makeMockPb({
      apiKeyRecords: [
        {
          id: "key1",
          key: VALID_API_KEY,
          user: "user1",
          revoked: false,
          project: "otherProjectId12",
        },
      ],
    });
    vi.mocked(getAdminPb).mockResolvedValue(mockPb as never);

    const req = makeRequest(VALID_API_KEY);
    const result = await authenticateApiKey(req, VALID_PROJECT_ID);
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
    const body = await (result as NextResponse).json();
    expect(body.error).toContain("does not have access");
  });

  it("returns 404 when project not found", async () => {
    const mockPb = makeMockPb({
      apiKeyRecords: [
        {
          id: "key1",
          key: VALID_API_KEY,
          user: "user1",
          revoked: false,
        },
      ],
      projectError: true,
    });
    vi.mocked(getAdminPb).mockResolvedValue(mockPb as never);

    const req = makeRequest(VALID_API_KEY);
    const result = await authenticateApiKey(req, VALID_PROJECT_ID);
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(404);
  });

  it("returns 404 when project ownership doesn't match", async () => {
    const mockPb = makeMockPb({
      apiKeyRecords: [
        {
          id: "key1",
          key: VALID_API_KEY,
          user: "user1",
          revoked: false,
        },
      ],
      project: { id: VALID_PROJECT_ID, user: "different-user" },
    });
    vi.mocked(getAdminPb).mockResolvedValue(mockPb as never);

    const req = makeRequest(VALID_API_KEY);
    const result = await authenticateApiKey(req, VALID_PROJECT_ID);
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(404);
  });

  it("returns AuthResult on success", async () => {
    const project = { id: VALID_PROJECT_ID, user: "user1", name: "Test" };
    const mockPb = makeMockPb({
      apiKeyRecords: [
        {
          id: "key1",
          key: VALID_API_KEY,
          user: "user1",
          revoked: false,
        },
      ],
      project,
    });
    vi.mocked(getAdminPb).mockResolvedValue(mockPb as never);

    const req = makeRequest(VALID_API_KEY);
    const result = await authenticateApiKey(req, VALID_PROJECT_ID);
    expect(result).not.toBeInstanceOf(NextResponse);
    const auth = result as { pb: unknown; userId: string; project: unknown };
    expect(auth.userId).toBe("user1");
    expect(auth.project).toEqual(project);
    expect(auth.pb).toBeDefined();
  });

  it("allows key without expiration (null expiresAt)", async () => {
    const project = { id: VALID_PROJECT_ID, user: "user1" };
    const mockPb = makeMockPb({
      apiKeyRecords: [
        {
          id: "key1",
          key: VALID_API_KEY,
          user: "user1",
          revoked: false,
          expiresAt: null,
        },
      ],
      project,
    });
    vi.mocked(getAdminPb).mockResolvedValue(mockPb as never);

    const req = makeRequest(VALID_API_KEY);
    const result = await authenticateApiKey(req, VALID_PROJECT_ID);
    expect(result).not.toBeInstanceOf(NextResponse);
  });

  it("returns 500 when api_keys query fails", async () => {
    const mockPb = makeMockPb({ apiKeyQueryError: true });
    vi.mocked(getAdminPb).mockResolvedValue(mockPb as never);

    const req = makeRequest(VALID_API_KEY);
    const result = await authenticateApiKey(req, VALID_PROJECT_ID);
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(500);
  });
});
