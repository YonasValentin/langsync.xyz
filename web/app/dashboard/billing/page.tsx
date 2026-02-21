"use client";

import { useAuth } from "@/contexts/auth-context";
import { UserMenu } from "@/components/user-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Languages,
  CreditCard,
  ExternalLink,
  Loader2,
  Zap,
  FolderOpen,
  Key,
  Sparkles,
  Check,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  useSubscription,
  useUsage,
  usePlanLimits,
  useCheckout,
  usePortal,
} from "@/hooks/queries";
import { getPlan, isCloudMode, getAllPlans } from "@/lib/plans";
import type { PlanId } from "@/lib/pocketbase-types";

function UsageBar({
  label,
  icon: Icon,
  used,
  limit,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  used: number;
  limit: number;
}) {
  const isUnlimited = !isFinite(limit);
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isNearLimit = percentage >= 80;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        <span className={isNearLimit ? "text-destructive font-medium" : ""}>
          {used.toLocaleString()}
          {isUnlimited ? "" : ` / ${limit.toLocaleString()}`}
        </span>
      </div>
      {!isUnlimited && (
        <Progress
          value={percentage}
          className={`h-1.5 ${isNearLimit ? "[&>div]:bg-destructive" : ""}`}
        />
      )}
    </div>
  );
}

export default function BillingPage() {
  const { isLoading: authLoading } = useAuth();
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const { data: usage, isLoading: usageLoading } = useUsage();
  const limits = usePlanLimits();
  const checkout = useCheckout();
  const portal = usePortal();

  const cloud = isCloudMode();
  const plan = getPlan(subscription?.plan || "free");

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleUpgrade = (planId: PlanId) => {
    checkout.mutate(planId, {
      onError: () => toast.error("Failed to start checkout"),
    });
  };

  const handleManageBilling = () => {
    portal.mutate(undefined, {
      onError: () => toast.error("Failed to open billing portal"),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 glass">
        <div className="container-default flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-semibold text-lg"
            >
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Languages className="h-4 w-4 text-primary-foreground" />
              </div>
              <span>LangSync</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-medium">Billing</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="container-default py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Billing</h1>
            <p className="text-muted-foreground">
              {cloud
                ? "Manage your plan and usage"
                : "Self-hosted — unlimited everything"}
            </p>
          </div>

          {/* Current Plan */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Current Plan</CardTitle>
                  <CardDescription>
                    {cloud
                      ? `You're on the ${plan.name} plan`
                      : "Self-hosted deployment — no limits"}
                  </CardDescription>
                </div>
                <Badge
                  variant={plan.id === "free" ? "secondary" : "default"}
                  className="text-sm px-3 py-1"
                >
                  {cloud ? plan.name : "Self-Hosted"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {subLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <div className="space-y-3">
                  {cloud && subscription?.currentPeriodEnd && (
                    <p className="text-sm text-muted-foreground">
                      {subscription.cancelAtPeriodEnd
                        ? `Cancels on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                        : `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
                    </p>
                  )}
                  {cloud && subscription?.hasStripeSubscription && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleManageBilling}
                      disabled={portal.isPending}
                    >
                      {portal.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      Manage Billing
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                  {!cloud && (
                    <p className="text-sm text-muted-foreground">
                      All limits are disabled in self-hosted mode. Upgrade to
                      LangSync Cloud for a managed experience.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Usage */}
          {cloud && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Usage This Month</CardTitle>
                <CardDescription>
                  Track your usage against plan limits
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usageLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <UsageBar
                      label="Projects"
                      icon={FolderOpen}
                      used={usage?.projects || 0}
                      limit={limits.maxProjects}
                    />
                    <UsageBar
                      label="AI Translations"
                      icon={Sparkles}
                      used={usage?.aiTranslationsThisMonth || 0}
                      limit={limits.maxAiTranslationsPerMonth}
                    />
                    <UsageBar
                      label="API Keys"
                      icon={Key}
                      used={usage?.apiKeys || 0}
                      limit={limits.maxApiKeys}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Upgrade Options */}
          {cloud && plan.id !== "enterprise" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  {plan.id === "free" ? "Upgrade Your Plan" : "Change Plan"}
                </CardTitle>
                <CardDescription>
                  Get more projects, translations, and features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getAllPlans()
                    .filter((p) => p.id !== "free" && p.id !== "enterprise")
                    .map((upgradePlan) => (
                      <Card
                        key={upgradePlan.id}
                        className={`${
                          upgradePlan.id === plan.id
                            ? "border-primary"
                            : "border-border"
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium">{upgradePlan.name}</h3>
                            {upgradePlan.id === plan.id && (
                              <Badge variant="secondary" className="text-xs">
                                Current
                              </Badge>
                            )}
                          </div>
                          <p className="text-2xl font-bold mb-1">
                            ${upgradePlan.priceMonthly}
                            <span className="text-sm font-normal text-muted-foreground">
                              /mo
                            </span>
                          </p>
                          <ul className="space-y-1 mb-4">
                            {upgradePlan.features.slice(0, 4).map((f) => (
                              <li
                                key={f}
                                className="flex items-center gap-1.5 text-xs text-muted-foreground"
                              >
                                <Check className="h-3 w-3 text-primary" />
                                {f}
                              </li>
                            ))}
                          </ul>
                          {upgradePlan.id !== plan.id ? (
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() =>
                                handleUpgrade(upgradePlan.id)
                              }
                              disabled={checkout.isPending}
                            >
                              {checkout.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  Upgrade
                                  <ArrowRight className="h-3 w-3 ml-1" />
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              disabled
                            >
                              Current Plan
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  Need more?{" "}
                  <Link
                    href="mailto:hello@langsync.xyz"
                    className="underline"
                  >
                    Contact us for Enterprise pricing
                  </Link>
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
