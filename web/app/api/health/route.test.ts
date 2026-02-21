import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock PocketBase
vi.mock("pocketbase", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      health: {
        check: vi.fn(),
      },
    })),
  };
});

import { GET } from "./route";
import PocketBase from "pocketbase";

describe("Health check GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns healthy when PocketBase is reachable", async () => {
    vi.mocked(PocketBase).mockImplementation(
      () =>
        ({
          health: {
            check: vi.fn().mockResolvedValue({ code: 200 }),
          },
        }) as never
    );

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(body.checks.app).toBe("ok");
    expect(body.checks.pocketbase).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });

  it("returns degraded when PocketBase is unreachable", async () => {
    vi.mocked(PocketBase).mockImplementation(
      () =>
        ({
          health: {
            check: vi.fn().mockRejectedValue(new Error("Connection refused")),
          },
        }) as never
    );

    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe("degraded");
    expect(body.checks.app).toBe("ok");
    expect(body.checks.pocketbase).toBe("error");
  });

  it("always includes timestamp", async () => {
    vi.mocked(PocketBase).mockImplementation(
      () =>
        ({
          health: {
            check: vi.fn().mockResolvedValue({ code: 200 }),
          },
        }) as never
    );

    const res = await GET();
    const body = await res.json();
    expect(body.timestamp).toBeDefined();
    // Should be valid ISO date
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });
});
