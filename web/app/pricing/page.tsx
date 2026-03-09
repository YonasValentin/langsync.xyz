"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Languages, ArrowRight, Github } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getAllPlans } from "@/lib/plans";
import type { PlanDefinition } from "@/lib/plans";

function PricingCard({ plan }: { plan: PlanDefinition }) {
  const isEnterprise = plan.id === "enterprise";
  const isFree = plan.id === "free";

  return (
    <Card
      className={`relative flex flex-col ${
        plan.highlighted
          ? "border-primary shadow-lg scale-[1.02]"
          : "border-border"
      }`}
    >
      {plan.highlighted && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-3">
          Most Popular
        </Badge>
      )}
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
        <div className="pt-2">
          {isEnterprise ? (
            <span className="text-3xl font-bold">Custom</span>
          ) : isFree ? (
            <div>
              <span className="text-3xl font-bold">$0</span>
              <span className="text-muted-foreground ml-1">/month</span>
            </div>
          ) : (
            <div>
              <span className="text-3xl font-bold">
                ${plan.priceMonthly}
              </span>
              <span className="text-muted-foreground ml-1">/month</span>
              <p className="text-xs text-muted-foreground mt-1">
                or ${plan.priceYearly}/year (save{" "}
                {Math.round(
                  (1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100
                )}
                %)
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <ul className="space-y-2 flex-1">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6">
          {isEnterprise ? (
            <Button variant="outline" className="w-full" asChild>
              <Link href="mailto:hello@langsync.xyz">Contact Sales</Link>
            </Button>
          ) : isFree ? (
            <Button variant="outline" className="w-full" asChild>
              <Link href="/sign-up">
                Get Started Free
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          ) : (
            <Button
              className="w-full"
              variant={plan.highlighted ? "default" : "outline"}
              asChild
            >
              <Link href="/sign-up">
                Start Free Trial
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PricingPage() {
  const plans = getAllPlans();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 glass">
        <div className="container-default flex h-14 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-lg"
          >
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Languages className="h-4 w-4 text-primary-foreground" />
            </div>
            <span>LangSync</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Log In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/sign-up">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container-default py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-2">
          Start free, scale as you grow. No surprises.
        </p>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          Or{" "}
          <Link
            href="https://github.com/YonasValentin/langsync.xyz"
            className="underline inline-flex items-center gap-1"
          >
            <Github className="h-3 w-3" />
            self-host for free
          </Link>{" "}
          with unlimited everything.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="container-default pb-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </div>
      </section>

      {/* Self-hosting callout */}
      <section className="container-default pb-16">
        <Card className="max-w-3xl mx-auto bg-muted/30">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">
              Prefer to self-host?
            </h2>
            <p className="text-muted-foreground mb-4 max-w-lg mx-auto">
              LangSync is fully open-source under the MIT license. Self-host
              with Docker and get unlimited everything — no usage limits, no
              billing, no vendor lock-in.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" asChild>
                <Link href="https://github.com/YonasValentin/langsync.xyz">
                  <Github className="h-4 w-4 mr-2" />
                  View on GitHub
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* FAQ */}
      <section className="container-default pb-16">
        <h2 className="text-2xl font-semibold text-center mb-8">
          Frequently Asked Questions
        </h2>
        <div className="max-w-2xl mx-auto space-y-6">
          {[
            {
              q: "What's the difference between cloud and self-hosted?",
              a: "The cloud version is managed by us — we handle hosting, backups, and updates. Self-hosted is the exact same code running on your own infrastructure with no usage limits.",
            },
            {
              q: "Can I switch between cloud and self-hosted?",
              a: "Yes. Your translation data can be exported and imported via the PocketBase admin panel. The npm packages work with both.",
            },
            {
              q: "What happens if I exceed my plan limits?",
              a: "You won't lose data. We'll notify you and give you time to upgrade or reduce usage. Existing translations continue to be served.",
            },
            {
              q: "Do you offer annual billing?",
              a: "Yes! Annual plans save you ~17% compared to monthly billing.",
            },
            {
              q: "Is there a free trial for paid plans?",
              a: "You can start with the free plan and upgrade anytime. Paid plans include a 14-day money-back guarantee.",
            },
          ].map(({ q, a }) => (
            <div key={q}>
              <h3 className="font-medium mb-1">{q}</h3>
              <p className="text-sm text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50">
        <div className="container-default py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                <Languages className="h-3 w-3 text-primary-foreground" />
              </div>
              <span>LangSync</span>
              <span>&middot;</span>
              <span>Open source translation management</span>
            </div>
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link
                href="/pricing"
                className="hover:text-foreground transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="https://github.com/YonasValentin/langsync.xyz"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </Link>
              <Link
                href="mailto:hello@langsync.xyz"
                className="hover:text-foreground transition-colors"
              >
                Contact
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
