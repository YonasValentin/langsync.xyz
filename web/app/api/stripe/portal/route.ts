/**
 * Create a Stripe Billing Portal session.
 *
 * Allows users to manage their subscription, update payment
 * methods, and view invoices.
 */

import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAdminPb } from "@/lib/pocketbase-server";
import { logger } from "@/lib/logger";
import { escapeFilterValue } from "@/lib/api/sanitize";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body as { userId: string };

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    const pb = await getAdminPb();

    // Get the user's subscription to find the Stripe customer ID
    const subs = await pb.collection("subscriptions").getFullList({
      filter: `user = "${escapeFilterValue(userId)}"`,
    });

    if (subs.length === 0 || !subs[0].stripeCustomerId) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    const stripe = getStripe();
    const origin =
      request.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: subs[0].stripeCustomerId,
      return_url: `${origin}/dashboard/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    logger.error("Stripe portal error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
