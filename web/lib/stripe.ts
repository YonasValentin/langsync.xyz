/**
 * Stripe client initialization (server-side only).
 *
 * Only imported in API routes — never in client components.
 */

import Stripe from "stripe";
import { env } from "@/lib/env";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
}
