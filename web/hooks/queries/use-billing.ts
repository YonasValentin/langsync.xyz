import { useQuery, useMutation } from "@tanstack/react-query";
import { pb, Collections } from "@/lib/pocketbase";
import { escapeFilterValue } from "@/lib/api/sanitize";
import { getPlanLimits, isCloudMode } from "@/lib/plans";
import type { PlanLimits } from "@/lib/plans";
import type {
  SubscriptionsRecord,
  PlanId,
} from "@/lib/pocketbase-types";

// ============================================
// Query Keys Factory
// ============================================

export const billingKeys = {
  all: ["billing"] as const,
  subscription: () => [...billingKeys.all, "subscription"] as const,
  usage: () => [...billingKeys.all, "usage"] as const,
};

// ============================================
// Types
// ============================================

export interface SubscriptionInfo {
  plan: PlanId;
  status: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  hasStripeSubscription: boolean;
}

export interface UsageInfo {
  projects: number;
  aiTranslationsThisMonth: number;
  apiKeys: number;
}

// ============================================
// API Functions
// ============================================

async function getSubscription(): Promise<SubscriptionInfo> {
  const userId = pb.authStore.record?.id;
  if (!userId) {
    return {
      plan: "free",
      status: "active",
      cancelAtPeriodEnd: false,
      hasStripeSubscription: false,
    };
  }

  try {
    const subs = await pb
      .collection(Collections.SUBSCRIPTIONS)
      .getFullList<SubscriptionsRecord>({
        filter: `user = "${escapeFilterValue(userId)}"`,
      });

    if (subs.length === 0) {
      return {
        plan: "free",
        status: "active",
        cancelAtPeriodEnd: false,
        hasStripeSubscription: false,
      };
    }

    const sub = subs[0];
    return {
      plan: sub.plan,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd || undefined,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      hasStripeSubscription: !!sub.stripeSubscriptionId,
    };
  } catch {
    // Let React Query handle the error state rather than silently returning "free"
    throw new Error("Failed to load subscription info. Please try again.");
  }
}

async function getUsage(): Promise<UsageInfo> {
  const userId = pb.authStore.record?.id;
  if (!userId) return { projects: 0, aiTranslationsThisMonth: 0, apiKeys: 0 };

  // Count projects
  const projects = await pb
    .collection(Collections.PROJECTS)
    .getList(1, 1, {
      filter: `user = "${escapeFilterValue(userId)}"`,
    });

  // Count API keys (active only)
  const apiKeys = await pb
    .collection(Collections.API_KEYS)
    .getList(1, 1, {
      filter: `user = "${escapeFilterValue(userId)}" && revoked = false`,
    });

  // Count AI translations this month
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const aiTranslations = await pb
    .collection(Collections.AI_TRANSLATIONS)
    .getList(1, 1, {
      filter: `project.user = "${escapeFilterValue(userId)}" && created >= "${firstOfMonth.toISOString()}"`,
    });

  return {
    projects: projects.totalItems,
    aiTranslationsThisMonth: aiTranslations.totalItems,
    apiKeys: apiKeys.totalItems,
  };
}

async function createCheckoutSession(plan: PlanId): Promise<string> {
  if (!pb.authStore.isValid) throw new Error("Not authenticated");

  const response = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create checkout");
  }

  const data = await response.json();
  return data.url;
}

async function createPortalSession(): Promise<string> {
  if (!pb.authStore.isValid) throw new Error("Not authenticated");

  const response = await fetch("/api/stripe/portal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create portal session");
  }

  const data = await response.json();
  return data.url;
}

// ============================================
// Query Hooks
// ============================================

/**
 * Get the current user's subscription info.
 * In self-hosted mode, always returns "free" with no limits enforced.
 */
export function useSubscription() {
  return useQuery({
    queryKey: billingKeys.subscription(),
    queryFn: getSubscription,
    enabled: pb.authStore.isValid && isCloudMode(),
    staleTime: 60 * 1000, // 1 minute
    // When not in cloud mode, return a default free subscription
    placeholderData: {
      plan: "free" as PlanId,
      status: "active",
      cancelAtPeriodEnd: false,
      hasStripeSubscription: false,
    },
  });
}

/**
 * Get the current user's usage stats for limit enforcement.
 */
export function useUsage() {
  return useQuery({
    queryKey: billingKeys.usage(),
    queryFn: getUsage,
    enabled: pb.authStore.isValid && isCloudMode(),
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: { projects: 0, aiTranslationsThisMonth: 0, apiKeys: 0 },
  });
}

/**
 * Get the effective plan limits for the current user.
 * Returns Infinity limits for self-hosted.
 */
export function usePlanLimits(): PlanLimits {
  const { data } = useSubscription();
  return getPlanLimits(data?.plan || "free");
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Start a Stripe checkout flow for upgrading.
 */
export function useCheckout() {
  return useMutation({
    mutationFn: createCheckoutSession,
    onSuccess: (url) => {
      window.location.href = url;
    },
  });
}

/**
 * Open the Stripe billing portal for managing subscription.
 */
export function usePortal() {
  return useMutation({
    mutationFn: createPortalSession,
    onSuccess: (url) => {
      window.location.href = url;
    },
  });
}
