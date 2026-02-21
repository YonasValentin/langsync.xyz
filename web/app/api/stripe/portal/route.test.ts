import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(),
}));

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

import { POST } from "./route";
import { getStripe } from "@/lib/stripe";
import { getAdminPb } from "@/lib/pocketbase-server";

function makePortalRequest(
  body: Record<string, unknown>,
  origin?: string
): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (origin) headers["origin"] = origin;
  return new Request("http://localhost/api/stripe/portal", {
    method: "POST",
    body: JSON.stringify(body),
    headers,
  });
}

describe("Stripe portal POST", () => {
  let mockStripe: Record<string, unknown>;
  let mockPb: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockStripe = {
      billingPortal: {
        sessions: {
          create: vi
            .fn()
            .mockResolvedValue({ url: "https://billing.stripe.com/portal" }),
        },
      },
    };
    vi.mocked(getStripe).mockReturnValue(mockStripe as never);

    mockPb = {
      collection: vi.fn().mockReturnValue({
        getFullList: vi
          .fn()
          .mockResolvedValue([{ stripeCustomerId: "cus_123" }]),
      }),
    };
    vi.mocked(getAdminPb).mockResolvedValue(mockPb as never);
  });

  it("returns 400 when userId is missing", async () => {
    const req = makePortalRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Missing userId");
  });

  it("returns 404 when no subscription found", async () => {
    mockPb.collection = vi.fn().mockReturnValue({
      getFullList: vi.fn().mockResolvedValue([]),
    });
    vi.mocked(getAdminPb).mockResolvedValue(mockPb as never);

    const req = makePortalRequest({ userId: "user_123" });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("No active subscription");
  });

  it("returns 404 when subscription has no stripeCustomerId", async () => {
    mockPb.collection = vi.fn().mockReturnValue({
      getFullList: vi
        .fn()
        .mockResolvedValue([{ stripeCustomerId: "" }]),
    });
    vi.mocked(getAdminPb).mockResolvedValue(mockPb as never);

    const req = makePortalRequest({ userId: "user_123" });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("creates billing portal session on success", async () => {
    const req = makePortalRequest(
      { userId: "user_123" },
      "https://langsync.xyz"
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe("https://billing.stripe.com/portal");

    const createCall = (
      (mockStripe.billingPortal as Record<string, unknown>)
        .sessions as Record<string, unknown>
    ).create as ReturnType<typeof vi.fn>;
    expect(createCall).toHaveBeenCalledWith({
      customer: "cus_123",
      return_url: "https://langsync.xyz/dashboard/billing",
    });
  });

  it("uses localhost fallback when origin header missing", async () => {
    const req = makePortalRequest({ userId: "user_123" });
    await POST(req);

    const createCall = (
      (mockStripe.billingPortal as Record<string, unknown>)
        .sessions as Record<string, unknown>
    ).create as ReturnType<typeof vi.fn>;
    expect(createCall).toHaveBeenCalledWith(
      expect.objectContaining({
        return_url: "http://localhost:3000/dashboard/billing",
      })
    );
  });

  it("returns 500 on Stripe error", async () => {
    (
      (mockStripe.billingPortal as Record<string, unknown>)
        .sessions as Record<string, unknown>
    ).create = vi.fn().mockRejectedValue(new Error("Stripe down"));

    const req = makePortalRequest({ userId: "user_123" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to create portal session");
  });
});
