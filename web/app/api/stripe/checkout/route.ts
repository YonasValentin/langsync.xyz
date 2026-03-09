/**
 * Create a Stripe Checkout session for plan upgrades.
 */

import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAdminPb } from "@/lib/pocketbase-server";
import { authenticateSession } from "@/lib/api/session-auth";
import { escapeFilterValue } from "@/lib/api/sanitize";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { PlanId } from "@/lib/pocketbase-types";

function getPriceId(plan: PlanId): string | null {
  switch (plan) {
    case "pro":
      return env.STRIPE_PRICE_ID_PRO;
    case "team":
      return env.STRIPE_PRICE_ID_TEAM;
    default:
      return null;
  }
}

export async function POST(request: Request) {
  try {
    // Authenticate user from session cookie
    const auth = authenticateSession(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = auth;

    const body = await request.json();
    const { plan } = body as { plan: PlanId };

    if (!plan) {
      return NextResponse.json(
        { error: "Missing plan" },
        { status: 400 }
      );
    }

    const priceId = getPriceId(plan);
    if (!priceId) {
      return NextResponse.json(
        { error: "Invalid plan for checkout" },
        { status: 400 }
      );
    }

    const pb = await getAdminPb();
    const stripe = getStripe();

    // Get user email for Stripe
    const user = await pb.collection("users").getOne(userId);

    // Check if user already has a subscription with a Stripe customer ID
    let customerId: string | undefined;
    try {
      const existingSubs = await pb
        .collection("subscriptions")
        .getFullList({ filter: `user = "${escapeFilterValue(userId)}"` });
      if (existingSubs.length > 0 && existingSubs[0].stripeCustomerId) {
        customerId = existingSubs[0].stripeCustomerId;
      }
    } catch (err) {
      logger.error("Failed to check existing subscription before checkout", {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    const appUrl = env.APP_URL;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing?success=true`,
      cancel_url: `${appUrl}/dashboard/billing?canceled=true`,
      metadata: {
        userId,
        plan,
      },
      subscription_data: {
        metadata: {
          userId,
          plan,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    logger.error("Stripe checkout error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
