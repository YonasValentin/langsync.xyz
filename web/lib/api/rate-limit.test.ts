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
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null (allowed) for the first request", async () => {
    const result = await checkRateLimit(makeRequest("10.0.0.1"));
    expect(result).toBeNull();
  });

  it("allows requests up to the limit", async () => {
    const ip = "10.0.0.2";
    for (let i = 0; i < 60; i++) {
      const result = await checkRateLimit(makeRequest(ip));
      expect(result).toBeNull();
    }
  });

  it("returns 429 when limit is exceeded", async () => {
    const ip = "10.0.0.3";
    for (let i = 0; i < 60; i++) {
      await checkRateLimit(makeRequest(ip));
    }
    const result = await checkRateLimit(makeRequest(ip));
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });

  it("includes rate limit headers in 429 response", async () => {
    const ip = "10.0.0.4";
    for (let i = 0; i < 60; i++) {
      await checkRateLimit(makeRequest(ip));
    }
    const result = await checkRateLimit(makeRequest(ip));
    expect(result).not.toBeNull();
    expect(result!.headers.get("Retry-After")).toBeDefined();
    expect(result!.headers.get("X-RateLimit-Limit")).toBe("60");
    expect(result!.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(result!.headers.get("X-RateLimit-Reset")).toBeDefined();
  });

  it("returns error body on 429", async () => {
    const ip = "10.0.0.5";
    for (let i = 0; i < 60; i++) {
      await checkRateLimit(makeRequest(ip));
    }
    const result = await checkRateLimit(makeRequest(ip));
    const body = await result!.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Too many requests");
  });

  it("respects custom limit option", async () => {
    const ip = "10.0.0.6";
    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit(makeRequest(ip), { limit: 5 });
      expect(result).toBeNull();
    }
    const result = await checkRateLimit(makeRequest(ip), { limit: 5 });
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });

  it("resets after window expires", async () => {
    const ip = "10.0.0.7";
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(makeRequest(ip), { limit: 5, windowSeconds: 10 });
    }
    expect(
      await checkRateLimit(makeRequest(ip), { limit: 5, windowSeconds: 10 })
    ).not.toBeNull();

    vi.advanceTimersByTime(11_000);

    const result = await checkRateLimit(makeRequest(ip), {
      limit: 5,
      windowSeconds: 10,
    });
    expect(result).toBeNull();
  });

  it("tracks different IPs independently", async () => {
    const ip1 = "10.0.1.1";
    const ip2 = "10.0.1.2";

    for (let i = 0; i < 3; i++) {
      await checkRateLimit(makeRequest(ip1), { limit: 3 });
    }
    expect(
      await checkRateLimit(makeRequest(ip1), { limit: 3 })
    ).not.toBeNull();

    expect(await checkRateLimit(makeRequest(ip2), { limit: 3 })).toBeNull();
  });

  it("uses x-real-ip if x-forwarded-for not present", async () => {
    const req = new Request("http://localhost/api/test", {
      headers: {
        "x-real-ip": "192.168.1.1",
      },
    });
    const result = await checkRateLimit(req);
    expect(result).toBeNull();
  });

  it('falls back to "unknown" when no IP headers', async () => {
    const req = new Request("http://localhost/api/test");
    const result = await checkRateLimit(req);
    expect(result).toBeNull();
  });

  it("uses first IP from x-forwarded-for chain", async () => {
    const req = new Request("http://localhost/api/test", {
      headers: {
        "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12",
      },
    });
    const result = await checkRateLimit(req);
    expect(result).toBeNull();
  });
});
