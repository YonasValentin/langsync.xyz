/**
 * Stripe webhook handler.
 *
 * Listens for subscription lifecycle events and syncs
 * the subscription state to PocketBase.
 */

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getAdminPb } from "@/lib/pocketbase-server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { escapeFilterValue } from "@/lib/api/sanitize";
import type { PlanId, SubscriptionStatus } from "@/lib/pocketbase-types";

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "canceled":
      return "canceled";
    case "past_due":
      return "past_due";
    case "trialing":
      return "trialing";
    default:
      return "incomplete";
  }
}

async function upsertSubscription(
  userId: string,
  data: {
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    stripePriceId: string;
    plan: PlanId;
    status: SubscriptionStatus;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  }
) {
  const pb = await getAdminPb();

  // Try to find existing subscription for this user
  const existing = await pb.collection("subscriptions").getFullList({
    filter: `user = "${escapeFilterValue(userId)}"`,
  });

  if (existing.length > 0) {
    await pb.collection("subscriptions").update(existing[0].id, data);
  } else {
    await pb.collection("subscriptions").create({
      user: userId,
      ...data,
    });
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.error("Stripe webhook signature verification failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  // Idempotency: skip events we've already processed.
  // Stripe may retry deliveries; upsertSubscription is itself idempotent
  // (update-or-create), but we still guard against double-processing to
  // avoid redundant work and ensure correctness.
  const pb = await getAdminPb();
  try {
    const existing = await pb
      .collection("webhook_events")
      .getFirstListItem(`stripeEventId = "${escapeFilterValue(event.id)}"`);
    if (existing) {
      return NextResponse.json({ received: true });
    }
  } catch {
    // Not found — continue processing
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = (session.metadata?.plan || "pro") as PlanId;

        if (!userId || !session.subscription) {
          logger.error("checkout.session.completed missing required metadata", {
            sessionId: session.id,
            hasUserId: !!userId,
            hasSubscription: !!session.subscription,
          });
          return NextResponse.json(
            { error: "Missing required metadata" },
            { status: 400 }
          );
        }

        const stripe = getStripe();
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        // Period timestamps live on the first subscription item in newer Stripe API versions
        const item = subscription.items.data[0];
        await upsertSubscription(userId, {
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          stripePriceId: item?.price.id || "",
          plan,
          status: mapStripeStatus(subscription.status),
          currentPeriodStart: item
            ? new Date(item.current_period_start * 1000).toISOString()
            : new Date().toISOString(),
          currentPeriodEnd: item
            ? new Date(item.current_period_end * 1000).toISOString()
            : new Date().toISOString(),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        const plan = (subscription.metadata?.plan || "pro") as PlanId;

        if (!userId) {
          logger.error("customer.subscription.updated missing userId metadata", {
            subscriptionId: subscription.id,
          });
          return NextResponse.json(
            { error: "Missing required metadata" },
            { status: 400 }
          );
        }

        const subItem = subscription.items.data[0];
        await upsertSubscription(userId, {
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          stripePriceId: subItem?.price.id || "",
          plan,
          status: mapStripeStatus(subscription.status),
          currentPeriodStart: subItem
            ? new Date(subItem.current_period_start * 1000).toISOString()
            : new Date().toISOString(),
          currentPeriodEnd: subItem
            ? new Date(subItem.current_period_end * 1000).toISOString()
            : new Date().toISOString(),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (!userId) {
          logger.error("customer.subscription.deleted missing userId metadata", {
            subscriptionId: subscription.id,
          });
          return NextResponse.json(
            { error: "Missing required metadata" },
            { status: 400 }
          );
        }

        const pb = await getAdminPb();
        const existing = await pb.collection("subscriptions").getFullList({
          filter: `user = "${escapeFilterValue(userId)}"`,
        });

        if (existing.length > 0) {
          await pb.collection("subscriptions").update(existing[0].id, {
            plan: "free",
            status: "canceled",
            stripeSubscriptionId: "",
            stripePriceId: "",
            cancelAtPeriodEnd: false,
          });
        }
        break;
      }

      default:
        // Unhandled event type — ignore
        break;
    }
  } catch (error: unknown) {
    logger.error("Stripe webhook processing error", {
      eventType: event.type,
      eventId: event.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }

  // Record successful processing for idempotency
  try {
    await pb.collection("webhook_events").create({
      stripeEventId: event.id,
      eventType: event.type,
      processedAt: new Date().toISOString(),
    });
  } catch (err) {
    // Non-fatal: event was processed, just couldn't record it.
    // Next retry will re-process but upsertSubscription is idempotent.
    logger.warn("Failed to record webhook event for idempotency", {
      eventId: event.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({ received: true });
}
