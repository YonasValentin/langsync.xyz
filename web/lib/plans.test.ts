import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isCloudMode, getPlan, getAllPlans, getPlanLimits } from "./plans";

// We need to control process.env for cloud mode
const originalEnv = process.env;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_LANGSYNC_CLOUD", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ============================================
// isCloudMode
// ============================================
describe("isCloudMode", () => {
  it('returns true when NEXT_PUBLIC_LANGSYNC_CLOUD is "true"', () => {
    vi.stubEnv("NEXT_PUBLIC_LANGSYNC_CLOUD", "true");
    expect(isCloudMode()).toBe(true);
  });

  it("returns false when env var is not set", () => {
    vi.stubEnv("NEXT_PUBLIC_LANGSYNC_CLOUD", "");
    expect(isCloudMode()).toBe(false);
  });

  it('returns false when env var is "false"', () => {
    vi.stubEnv("NEXT_PUBLIC_LANGSYNC_CLOUD", "false");
    expect(isCloudMode()).toBe(false);
  });

  it('returns false when env var is "1" (only "true" works)', () => {
    vi.stubEnv("NEXT_PUBLIC_LANGSYNC_CLOUD", "1");
    expect(isCloudMode()).toBe(false);
  });
});

// ============================================
// getPlan
// ============================================
describe("getPlan", () => {
  it("returns the free plan definition", () => {
    const plan = getPlan("free");
    expect(plan.id).toBe("free");
    expect(plan.name).toBe("Free");
    expect(plan.priceMonthly).toBe(0);
    expect(plan.limits.maxProjects).toBe(3);
  });

  it("returns the pro plan definition", () => {
    const plan = getPlan("pro");
    expect(plan.id).toBe("pro");
    expect(plan.name).toBe("Pro");
    expect(plan.priceMonthly).toBe(19);
    expect(plan.priceYearly).toBe(190);
    expect(plan.highlighted).toBe(true);
  });

  it("returns the team plan definition", () => {
    const plan = getPlan("team");
    expect(plan.id).toBe("team");
    expect(plan.name).toBe("Team");
    expect(plan.priceMonthly).toBe(49);
    expect(plan.limits.teamMembers).toBe(10);
  });

  it("returns the enterprise plan with Infinity limits", () => {
    const plan = getPlan("enterprise");
    expect(plan.id).toBe("enterprise");
    expect(plan.limits.maxProjects).toBe(Infinity);
    expect(plan.limits.maxKeysPerProject).toBe(Infinity);
    expect(plan.limits.maxAiTranslationsPerMonth).toBe(Infinity);
  });

  it("free plan has correct limits", () => {
    const plan = getPlan("free");
    expect(plan.limits).toEqual({
      maxProjects: 3,
      maxKeysPerProject: 100,
      maxAiTranslationsPerMonth: 500,
      maxApiKeys: 2,
      maxLanguagesPerProject: 5,
      teamMembers: 1,
    });
  });

  it("pro plan has correct limits", () => {
    const plan = getPlan("pro");
    expect(plan.limits).toEqual({
      maxProjects: 20,
      maxKeysPerProject: 5000,
      maxAiTranslationsPerMonth: 10000,
      maxApiKeys: 10,
      maxLanguagesPerProject: 30,
      teamMembers: 1,
    });
  });

  it("team plan has correct limits", () => {
    const plan = getPlan("team");
    expect(plan.limits).toEqual({
      maxProjects: 100,
      maxKeysPerProject: 50000,
      maxAiTranslationsPerMonth: 50000,
      maxApiKeys: 50,
      maxLanguagesPerProject: 100,
      teamMembers: 10,
    });
  });

  it("every plan has features array", () => {
    const plans = ["free", "pro", "team", "enterprise"] as const;
    for (const id of plans) {
      const plan = getPlan(id);
      expect(plan.features).toBeDefined();
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });
});

// ============================================
// getAllPlans
// ============================================
describe("getAllPlans", () => {
  it("returns all 4 plans", () => {
    const plans = getAllPlans();
    expect(plans).toHaveLength(4);
  });

  it("contains free, pro, team, enterprise", () => {
    const plans = getAllPlans();
    const ids = plans.map((p) => p.id);
    expect(ids).toContain("free");
    expect(ids).toContain("pro");
    expect(ids).toContain("team");
    expect(ids).toContain("enterprise");
  });

  it("returns plan definitions with all required fields", () => {
    const plans = getAllPlans();
    for (const plan of plans) {
      expect(plan).toHaveProperty("id");
      expect(plan).toHaveProperty("name");
      expect(plan).toHaveProperty("description");
      expect(plan).toHaveProperty("priceMonthly");
      expect(plan).toHaveProperty("priceYearly");
      expect(plan).toHaveProperty("limits");
      expect(plan).toHaveProperty("features");
    }
  });
});

// ============================================
// getPlanLimits
// ============================================
describe("getPlanLimits", () => {
  it("returns plan-specific limits in cloud mode", () => {
    vi.stubEnv("NEXT_PUBLIC_LANGSYNC_CLOUD", "true");
    const limits = getPlanLimits("free");
    expect(limits.maxProjects).toBe(3);
    expect(limits.maxApiKeys).toBe(2);
  });

  it("returns Infinity for all limits in self-hosted mode", () => {
    vi.stubEnv("NEXT_PUBLIC_LANGSYNC_CLOUD", "");
    const limits = getPlanLimits("free");
    expect(limits.maxProjects).toBe(Infinity);
    expect(limits.maxKeysPerProject).toBe(Infinity);
    expect(limits.maxAiTranslationsPerMonth).toBe(Infinity);
    expect(limits.maxApiKeys).toBe(Infinity);
    expect(limits.maxLanguagesPerProject).toBe(Infinity);
    expect(limits.teamMembers).toBe(Infinity);
  });

  it("returns team limits in cloud mode", () => {
    vi.stubEnv("NEXT_PUBLIC_LANGSYNC_CLOUD", "true");
    const limits = getPlanLimits("team");
    expect(limits.maxProjects).toBe(100);
    expect(limits.teamMembers).toBe(10);
  });

  it("self-hosted mode always returns Infinity regardless of plan", () => {
    vi.stubEnv("NEXT_PUBLIC_LANGSYNC_CLOUD", "");

    const plans = ["free", "pro", "team", "enterprise"] as const;
    for (const planId of plans) {
      const limits = getPlanLimits(planId);
      expect(limits.maxProjects).toBe(Infinity);
    }
  });

  it("yearly price gives ~17% discount for pro plan", () => {
    const plan = getPlan("pro");
    const monthlyTotal = plan.priceMonthly * 12;
    const savings = ((monthlyTotal - plan.priceYearly) / monthlyTotal) * 100;
    expect(savings).toBeGreaterThan(15);
    expect(savings).toBeLessThan(20);
  });
});
