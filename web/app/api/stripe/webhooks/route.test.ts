import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all external dependencies
vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(),
}));

vi.mock("@/lib/pocketbase-server", () => ({
  getAdminPb: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: {
    STRIPE_WEBHOOK_SECRET: "whsec_test",
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

function makeWebhookRequest(body: string, signature: string | null): Request {
  const headers: Record<string, string> = {};
  if (signature) {
    headers["stripe-signature"] = signature;
  }
  return new Request("http://localhost/api/stripe/webhooks", {
    method: "POST",
    body,
    headers,
  });
}

describe("Stripe webhooks POST", () => {
  let mockStripe: Record<string, unknown>;
  let mockPb: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockStripe = {
      webhooks: {
        constructEvent: vi.fn(),
      },
      subscriptions: {
        retrieve: vi.fn(),
      },
    };
    vi.mocked(getStripe).mockReturnValue(mockStripe as never);

    mockPb = {
      collection: vi.fn().mockReturnValue({
        getFullList: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      }),
    };
    vi.mocked(getAdminPb).mockResolvedValue(mockPb as never);
  });

  it("returns 400 when stripe-signature header is missing", async () => {
    const req = makeWebhookRequest("{}", null);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Missing stripe-signature");
  });

  it("returns 400 when signature verification fails", async () => {
    (mockStripe.webhooks as Record<string, unknown>).constructEvent = vi
      .fn()
      .mockImplementation(() => {
        throw new Error("Invalid signature");
      });

    const req = makeWebhookRequest("{}", "sig_invalid");
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid signature");
  });

  it("handles checkout.session.completed event", async () => {
    const mockSubscription = {
      id: "sub_123",
      status: "active",
      cancel_at_period_end: false,
      items: {
        data: [
          {
            price: { id: "price_pro" },
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
          },
        ],
      },
    };

    (mockStripe.webhooks as Record<string, unknown>).constructEvent = vi
      .fn()
      .mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: { userId: "user_123", plan: "pro" },
            customer: "cus_123",
            subscription: "sub_123",
          },
        },
      });

    (mockStripe.subscriptions as Record<string, unknown>).retrieve = vi
      .fn()
      .mockResolvedValue(mockSubscription);

    const req = makeWebhookRequest("{}", "sig_valid");
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
  });

  it("handles customer.subscription.updated event", async () => {
    (mockStripe.webhooks as Record<string, unknown>).constructEvent = vi
      .fn()
      .mockReturnValue({
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_123",
            metadata: { userId: "user_123", plan: "team" },
            customer: "cus_123",
            status: "active",
            cancel_at_period_end: false,
            items: {
              data: [
                {
                  price: { id: "price_team" },
                  current_period_start: Math.floor(Date.now() / 1000),
                  current_period_end:
                    Math.floor(Date.now() / 1000) + 30 * 86400,
                },
              ],
            },
          },
        },
      });

    const req = makeWebhookRequest("{}", "sig_valid");
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("handles customer.subscription.deleted event", async () => {
    const existingSub = [{ id: "sub_rec_1", user: "user_123" }];
    mockPb.collection = vi.fn().mockReturnValue({
      getFullList: vi.fn().mockResolvedValue(existingSub),
      update: vi.fn().mockResolvedValue({}),
    });
    vi.mocked(getAdminPb).mockResolvedValue(mockPb as never);

    (mockStripe.webhooks as Record<string, unknown>).constructEvent = vi
      .fn()
      .mockReturnValue({
        type: "customer.subscription.deleted",
        data: {
          object: {
            id: "sub_123",
            metadata: { userId: "user_123" },
            customer: "cus_123",
          },
        },
      });

    const req = makeWebhookRequest("{}", "sig_valid");
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("ignores events without userId in metadata", async () => {
    (mockStripe.webhooks as Record<string, unknown>).constructEvent = vi
      .fn()
      .mockReturnValue({
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_123",
            metadata: {},
            customer: "cus_123",
            status: "active",
            cancel_at_period_end: false,
            items: { data: [] },
          },
        },
      });

    const req = makeWebhookRequest("{}", "sig_valid");
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
  });

  it("ignores unhandled event types", async () => {
    (mockStripe.webhooks as Record<string, unknown>).constructEvent = vi
      .fn()
      .mockReturnValue({
        type: "invoice.payment_succeeded",
        data: { object: {} },
      });

    const req = makeWebhookRequest("{}", "sig_valid");
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("returns 500 when processing fails", async () => {
    (mockStripe.webhooks as Record<string, unknown>).constructEvent = vi
      .fn()
      .mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: { userId: "user_123", plan: "pro" },
            customer: "cus_123",
            subscription: "sub_123",
          },
        },
      });

    (mockStripe.subscriptions as Record<string, unknown>).retrieve = vi
      .fn()
      .mockRejectedValue(new Error("Stripe API error"));

    const req = makeWebhookRequest("{}", "sig_valid");
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Webhook processing failed");
  });
});
