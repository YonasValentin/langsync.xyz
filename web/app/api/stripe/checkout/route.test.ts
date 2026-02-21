import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(),
}));

vi.mock("@/lib/pocketbase-server", () => ({
  getAdminPb: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: {
    STRIPE_PRICE_ID_PRO: "price_pro_123",
    STRIPE_PRICE_ID_TEAM: "price_team_123",
  },
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

function makeCheckoutRequest(
  body: Record<string, unknown>,
  origin?: string
): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (origin) headers["origin"] = origin;
  return new Request("http://localhost/api/stripe/checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers,
  });
}

describe("Stripe checkout POST", () => {
  let mockStripe: Record<string, unknown>;
  let mockPb: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockStripe = {
      checkout: {
        sessions: {
          create: vi
            .fn()
            .mockResolvedValue({ url: "https://checkout.stripe.com/session" }),
        },
      },
    };
    vi.mocked(getStripe).mockReturnValue(mockStripe as never);

    mockPb = {
      collection: vi.fn().mockImplementation((name: string) => {
        if (name === "users") {
          return {
            getOne: vi
              .fn()
              .mockResolvedValue({ id: "user_123", email: "user@test.com" }),
          };
        }
        if (name === "subscriptions") {
          return { getFullList: vi.fn().mockResolvedValue([]) };
        }
        return {};
      }),
    };
    vi.mocked(getAdminPb).mockResolvedValue(mockPb as never);
  });

  it("returns 400 when plan is missing", async () => {
    const req = makeCheckoutRequest({ userId: "user_123" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Missing plan or userId");
  });

  it("returns 400 when userId is missing", async () => {
    const req = makeCheckoutRequest({ plan: "pro" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Missing plan or userId");
  });

  it("returns 400 for invalid plan (free)", async () => {
    const req = makeCheckoutRequest({ plan: "free", userId: "user_123" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid plan for checkout");
  });

  it("returns 400 for invalid plan (enterprise)", async () => {
    const req = makeCheckoutRequest({
      plan: "enterprise",
      userId: "user_123",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("creates checkout session for pro plan", async () => {
    const req = makeCheckoutRequest(
      { plan: "pro", userId: "user_123" },
      "https://langsync.xyz"
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe("https://checkout.stripe.com/session");

    const createCall = (
      (mockStripe.checkout as Record<string, unknown>)
        .sessions as Record<string, unknown>
    ).create as ReturnType<typeof vi.fn>;
    expect(createCall).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        line_items: [{ price: "price_pro_123", quantity: 1 }],
        metadata: { userId: "user_123", plan: "pro" },
      })
    );
  });

  it("creates checkout session for team plan", async () => {
    const req = makeCheckoutRequest({ plan: "team", userId: "user_123" });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const createCall = (
      (mockStripe.checkout as Record<string, unknown>)
        .sessions as Record<string, unknown>
    ).create as ReturnType<typeof vi.fn>;
    expect(createCall).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_team_123", quantity: 1 }],
      })
    );
  });

  it("reuses existing Stripe customer ID", async () => {
    mockPb.collection = vi.fn().mockImplementation((name: string) => {
      if (name === "users") {
        return {
          getOne: vi
            .fn()
            .mockResolvedValue({ id: "user_123", email: "user@test.com" }),
        };
      }
      if (name === "subscriptions") {
        return {
          getFullList: vi
            .fn()
            .mockResolvedValue([{ stripeCustomerId: "cus_existing" }]),
        };
      }
      return {};
    });

    const req = makeCheckoutRequest({ plan: "pro", userId: "user_123" });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const createCall = (
      (mockStripe.checkout as Record<string, unknown>)
        .sessions as Record<string, unknown>
    ).create as ReturnType<typeof vi.fn>;
    expect(createCall).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_existing",
        customer_email: undefined,
      })
    );
  });

  it("uses email when no existing customer", async () => {
    const req = makeCheckoutRequest({ plan: "pro", userId: "user_123" });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const createCall = (
      (mockStripe.checkout as Record<string, unknown>)
        .sessions as Record<string, unknown>
    ).create as ReturnType<typeof vi.fn>;
    expect(createCall).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_email: "user@test.com",
      })
    );
  });

  it("uses correct success and cancel URLs", async () => {
    const req = makeCheckoutRequest(
      { plan: "pro", userId: "user_123" },
      "https://app.langsync.xyz"
    );
    await POST(req);

    const createCall = (
      (mockStripe.checkout as Record<string, unknown>)
        .sessions as Record<string, unknown>
    ).create as ReturnType<typeof vi.fn>;
    expect(createCall).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: "https://app.langsync.xyz/dashboard/billing?success=true",
        cancel_url:
          "https://app.langsync.xyz/dashboard/billing?canceled=true",
      })
    );
  });

  it("returns 500 on Stripe error", async () => {
    (
      (mockStripe.checkout as Record<string, unknown>)
        .sessions as Record<string, unknown>
    ).create = vi.fn().mockRejectedValue(new Error("Stripe down"));

    const req = makeCheckoutRequest({ plan: "pro", userId: "user_123" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to create checkout session");
  });
});
