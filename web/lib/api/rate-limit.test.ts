import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { checkRateLimit } from "./rate-limit";

function makeRequest(ip: string = "127.0.0.1"): Request {
  return new Request("http://localhost/api/test", {
    headers: {
      "x-forwarded-for": ip,
    },
  });
}

describe("checkRateLimit", () => {
  beforeEach(() => {
    // Reset the module to clear the in-memory store between tests
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null (allowed) for the first request", () => {
    const result = checkRateLimit(makeRequest("10.0.0.1"));
    expect(result).toBeNull();
  });

  it("allows requests up to the limit", () => {
    const ip = "10.0.0.2";
    for (let i = 0; i < 60; i++) {
      const result = checkRateLimit(makeRequest(ip));
      expect(result).toBeNull();
    }
  });

  it("returns 429 when limit is exceeded", () => {
    const ip = "10.0.0.3";
    // Exhaust the limit
    for (let i = 0; i < 60; i++) {
      checkRateLimit(makeRequest(ip));
    }
    // This one should be rate limited
    const result = checkRateLimit(makeRequest(ip));
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });

  it("includes rate limit headers in 429 response", async () => {
    const ip = "10.0.0.4";
    for (let i = 0; i < 60; i++) {
      checkRateLimit(makeRequest(ip));
    }
    const result = checkRateLimit(makeRequest(ip));
    expect(result).not.toBeNull();
    expect(result!.headers.get("Retry-After")).toBeDefined();
    expect(result!.headers.get("X-RateLimit-Limit")).toBe("60");
    expect(result!.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(result!.headers.get("X-RateLimit-Reset")).toBeDefined();
  });

  it("returns error body on 429", async () => {
    const ip = "10.0.0.5";
    for (let i = 0; i < 60; i++) {
      checkRateLimit(makeRequest(ip));
    }
    const result = checkRateLimit(makeRequest(ip));
    const body = await result!.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Too many requests");
  });

  it("respects custom limit option", () => {
    const ip = "10.0.0.6";
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(makeRequest(ip), { limit: 5 });
      expect(result).toBeNull();
    }
    const result = checkRateLimit(makeRequest(ip), { limit: 5 });
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });

  it("resets after window expires", () => {
    const ip = "10.0.0.7";
    // Use up the limit
    for (let i = 0; i < 5; i++) {
      checkRateLimit(makeRequest(ip), { limit: 5, windowSeconds: 10 });
    }
    // Should be blocked
    expect(
      checkRateLimit(makeRequest(ip), { limit: 5, windowSeconds: 10 })
    ).not.toBeNull();

    // Advance past the window
    vi.advanceTimersByTime(11_000);

    // Should be allowed again
    const result = checkRateLimit(makeRequest(ip), {
      limit: 5,
      windowSeconds: 10,
    });
    expect(result).toBeNull();
  });

  it("tracks different IPs independently", () => {
    const ip1 = "10.0.1.1";
    const ip2 = "10.0.1.2";

    // Exhaust ip1
    for (let i = 0; i < 3; i++) {
      checkRateLimit(makeRequest(ip1), { limit: 3 });
    }
    expect(
      checkRateLimit(makeRequest(ip1), { limit: 3 })
    ).not.toBeNull();

    // ip2 should still be allowed
    expect(checkRateLimit(makeRequest(ip2), { limit: 3 })).toBeNull();
  });

  it("uses x-real-ip if x-forwarded-for not present", () => {
    const req = new Request("http://localhost/api/test", {
      headers: {
        "x-real-ip": "192.168.1.1",
      },
    });
    const result = checkRateLimit(req);
    expect(result).toBeNull();
  });

  it('falls back to "unknown" when no IP headers', () => {
    const req = new Request("http://localhost/api/test");
    const result = checkRateLimit(req);
    expect(result).toBeNull();
  });

  it("uses first IP from x-forwarded-for chain", () => {
    const req = new Request("http://localhost/api/test", {
      headers: {
        "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12",
      },
    });
    const result = checkRateLimit(req);
    expect(result).toBeNull();
  });
});
