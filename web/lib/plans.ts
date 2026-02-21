/**
 * Plan definitions and limits for LangSync.
 *
 * When self-hosted (NEXT_PUBLIC_LANGSYNC_CLOUD !== "true"), all limits
 * are Infinity — self-hosters get everything unlimited.
 */

import type { PlanId } from "@/lib/pocketbase-types";

// ============================================
// Plan Limits
// ============================================

export interface PlanLimits {
  maxProjects: number;
  maxKeysPerProject: number;
  maxAiTranslationsPerMonth: number;
  maxApiKeys: number;
  maxLanguagesPerProject: number;
  teamMembers: number; // future
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  description: string;
  priceMonthly: number; // in USD, 0 = free
  priceYearly: number; // in USD per year
  limits: PlanLimits;
  features: string[];
  highlighted?: boolean; // show as "recommended"
}

const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    description: "For personal projects and trying LangSync",
    priceMonthly: 0,
    priceYearly: 0,
    limits: {
      maxProjects: 3,
      maxKeysPerProject: 100,
      maxAiTranslationsPerMonth: 500,
      maxApiKeys: 2,
      maxLanguagesPerProject: 5,
      teamMembers: 1,
    },
    features: [
      "3 projects",
      "100 keys per project",
      "5 languages per project",
      "500 AI translations/month",
      "2 API keys",
      "Community support",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For growing apps and indie developers",
    priceMonthly: 19,
    priceYearly: 190,
    limits: {
      maxProjects: 20,
      maxKeysPerProject: 5000,
      maxAiTranslationsPerMonth: 10000,
      maxApiKeys: 10,
      maxLanguagesPerProject: 30,
      teamMembers: 1,
    },
    features: [
      "20 projects",
      "5,000 keys per project",
      "30 languages per project",
      "10,000 AI translations/month",
      "10 API keys",
      "Priority email support",
      "Translation memory",
      "Version history",
    ],
    highlighted: true,
  },
  team: {
    id: "team",
    name: "Team",
    description: "For teams shipping multilingual products",
    priceMonthly: 49,
    priceYearly: 490,
    limits: {
      maxProjects: 100,
      maxKeysPerProject: 50000,
      maxAiTranslationsPerMonth: 50000,
      maxApiKeys: 50,
      maxLanguagesPerProject: 100,
      teamMembers: 10,
    },
    features: [
      "100 projects",
      "50,000 keys per project",
      "Unlimited languages",
      "50,000 AI translations/month",
      "50 API keys",
      "Priority support",
      "Translation memory",
      "Version history",
      "Approval workflows",
      "Activity logs",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom limits, SLAs, and dedicated support",
    priceMonthly: 0, // custom
    priceYearly: 0,
    limits: {
      maxProjects: Infinity,
      maxKeysPerProject: Infinity,
      maxAiTranslationsPerMonth: Infinity,
      maxApiKeys: Infinity,
      maxLanguagesPerProject: Infinity,
      teamMembers: Infinity,
    },
    features: [
      "Unlimited everything",
      "Custom SLA",
      "Dedicated support",
      "On-premise option",
      "SSO/SAML",
      "Custom integrations",
    ],
  },
};

/** Unlimited limits for self-hosted deployments */
const SELF_HOSTED_LIMITS: PlanLimits = {
  maxProjects: Infinity,
  maxKeysPerProject: Infinity,
  maxAiTranslationsPerMonth: Infinity,
  maxApiKeys: Infinity,
  maxLanguagesPerProject: Infinity,
  teamMembers: Infinity,
};

// ============================================
// Public API
// ============================================

/** Whether this deployment uses cloud billing */
export function isCloudMode(): boolean {
  return process.env.NEXT_PUBLIC_LANGSYNC_CLOUD === "true";
}

/** Get the plan definition by ID */
export function getPlan(planId: PlanId): PlanDefinition {
  return PLANS[planId];
}

/** Get all plan definitions (for pricing page) */
export function getAllPlans(): PlanDefinition[] {
  return Object.values(PLANS);
}

/** Get the effective limits for a plan (respects self-hosted mode) */
export function getPlanLimits(planId: PlanId): PlanLimits {
  if (!isCloudMode()) return SELF_HOSTED_LIMITS;
  return PLANS[planId].limits;
}
