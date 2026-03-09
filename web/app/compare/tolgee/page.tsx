"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  Languages,
  ArrowRight,
  Github,
  Zap,
  Shield,
  DollarSign,
  Code,
  Brain,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type Feature = {
  name: string;
  langsync: string | boolean;
  tolgee: string | boolean;
};

const featureCategories: { title: string; icon: React.ReactNode; features: Feature[] }[] = [
  {
    title: "Pricing & Plans",
    icon: <DollarSign className="h-5 w-5" />,
    features: [
      { name: "Free tier", langsync: "100 keys, 3 projects", tolgee: "500 keys (cloud)" },
      { name: "Starting paid price", langsync: "$19/mo", tolgee: "€49/mo" },
      { name: "Self-hosted (free)", langsync: true, tolgee: true },
      { name: "Self-hosted (unlimited keys)", langsync: true, tolgee: true },
      { name: "Open-source license", langsync: "MIT", tolgee: "Apache 2.0" },
      { name: "Annual billing discount", langsync: "~17%", tolgee: "~15% (2 months free)" },
    ],
  },
  {
    title: "AI & Translation",
    icon: <Brain className="h-5 w-5" />,
    features: [
      { name: "AI-powered translations", langsync: true, tolgee: true },
      { name: "AI model", langsync: "GPT-4", tolgee: "ChatGPT + custom LLMs" },
      { name: "Bring your own LLM", langsync: false, tolgee: true },
      { name: "Translation memory", langsync: true, tolgee: true },
      { name: "Machine translation (DeepL, Google)", langsync: false, tolgee: true },
      { name: "Auto-translate on key creation", langsync: true, tolgee: true },
      { name: "Context-aware AI (layout context)", langsync: false, tolgee: true },
      { name: "AI cost tracking per project", langsync: true, tolgee: false },
    ],
  },
  {
    title: "Developer Experience",
    icon: <Code className="h-5 w-5" />,
    features: [
      { name: "Next.js SDK", langsync: true, tolgee: true },
      { name: "React Native / Expo SDK", langsync: true, tolgee: false },
      { name: "React SDK", langsync: "Via Next.js", tolgee: true },
      { name: "Vue / Angular / Svelte SDKs", langsync: false, tolgee: true },
      { name: "iOS / Android native SDKs", langsync: false, tolgee: true },
      { name: "REST API", langsync: true, tolgee: true },
      { name: "CLI tooling", langsync: false, tolgee: true },
      { name: "Zero-runtime (build-time bundling)", langsync: true, tolgee: false },
      { name: "Offline / hybrid loading strategies", langsync: true, tolgee: false },
      { name: "Variable interpolation", langsync: true, tolgee: true },
      { name: "RTL language support", langsync: true, tolgee: true },
    ],
  },
  {
    title: "Collaboration & Workflow",
    icon: <Users className="h-5 w-5" />,
    features: [
      { name: "In-context editing (edit in live app)", langsync: false, tolgee: true },
      { name: "Comments on translations", langsync: true, tolgee: true },
      { name: "Approval workflows", langsync: true, tolgee: true },
      { name: "Activity logs / audit trail", langsync: true, tolgee: true },
      { name: "Version history", langsync: true, tolgee: true },
      { name: "Automated screenshots", langsync: false, tolgee: true },
      { name: "Chrome extension for translators", langsync: false, tolgee: true },
      { name: "Glossaries", langsync: false, tolgee: true },
      { name: "Tasks / project management", langsync: false, tolgee: true },
      { name: "Branching (translation branches)", langsync: false, tolgee: true },
    ],
  },
  {
    title: "Infrastructure",
    icon: <Shield className="h-5 w-5" />,
    features: [
      { name: "Cloud hosting", langsync: true, tolgee: true },
      { name: "Self-hosting with Docker", langsync: true, tolgee: true },
      { name: "Backend", langsync: "PocketBase (SQLite)", tolgee: "Java (PostgreSQL)" },
      { name: "SSO / SAML (Enterprise)", langsync: true, tolgee: true },
      { name: "CI/CD integration", langsync: false, tolgee: true },
      { name: "MCP server (AI coding assistants)", langsync: false, tolgee: true },
      { name: "Stripe billing integration", langsync: true, tolgee: true },
    ],
  },
];

function FeatureValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return <Check className="h-5 w-5 text-green-500" />;
  }
  if (value === false) {
    return <X className="h-5 w-5 text-muted-foreground/40" />;
  }
  return <span className="text-sm">{value}</span>;
}

export default function CompareTolgeePage() {
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
              <Link href="/pricing">Pricing</Link>
            </Button>
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
        <Badge variant="secondary" className="mb-4">
          Comparison
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          LangSync vs Tolgee
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
          Both are open-source translation management platforms. Here&apos;s how they
          compare so you can pick the right tool for your stack.
        </p>
      </section>

      {/* TL;DR Cards */}
      <section className="container-default pb-12">
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Card className="border-primary shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Languages className="h-4 w-4 text-primary-foreground" />
                </div>
                <CardTitle className="text-lg">LangSync</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Best for:</strong> Next.js
                and React Native developers who want a lightweight, fast setup
                with AI translations and zero-runtime build-time bundling.
              </p>
              <ul className="space-y-1.5 pt-2">
                <li className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>Zero-runtime translations (bundled at build time)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>Expo / React Native first-class support</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>Lightweight PocketBase backend (easy self-hosting)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>Lower starting price ($19/mo vs €49/mo)</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold">
                  T
                </div>
                <CardTitle className="text-lg">Tolgee</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Best for:</strong> Larger
                teams needing in-context editing, broad framework support (Vue,
                Angular, Svelte, native mobile), and advanced translation
                workflows.
              </p>
              <ul className="space-y-1.5 pt-2">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>In-context editing (ALT+click in live app)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>SDKs for React, Vue, Angular, Svelte, iOS, Android</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>Multiple MT providers (DeepL, Google, AWS)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>Glossaries, branching, tasks, Chrome extension</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Feature Comparison Tables */}
      <section className="container-default pb-16">
        <h2 className="text-2xl font-semibold text-center mb-8">
          Feature-by-feature comparison
        </h2>
        <div className="max-w-4xl mx-auto space-y-8">
          {featureCategories.map((category) => (
            <Card key={category.title}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  {category.icon}
                  <CardTitle className="text-base">{category.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left font-medium px-6 py-3 w-1/2">
                          Feature
                        </th>
                        <th className="text-center font-medium px-4 py-3 w-1/4">
                          LangSync
                        </th>
                        <th className="text-center font-medium px-4 py-3 w-1/4">
                          Tolgee
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.features.map((feature, i) => (
                        <tr
                          key={feature.name}
                          className={
                            i < category.features.length - 1
                              ? "border-b border-border/50"
                              : ""
                          }
                        >
                          <td className="px-6 py-3 text-muted-foreground">
                            {feature.name}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center">
                              <FeatureValue value={feature.langsync} />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center">
                              <FeatureValue value={feature.tolgee} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* When to choose section */}
      <section className="container-default pb-16">
        <h2 className="text-2xl font-semibold text-center mb-8">
          Which one should you choose?
        </h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-base">Choose LangSync if you&hellip;</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Build with Next.js or React Native / Expo",
                  "Want zero-runtime translations bundled at build time",
                  "Need offline-first strategies for mobile apps",
                  "Prefer a lightweight backend (PocketBase / SQLite)",
                  "Want a lower starting price point",
                  "Need AI translation cost tracking per project",
                  "Value simplicity and fast onboarding (~3 minutes)",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-base">Choose Tolgee if you&hellip;</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Need in-context editing in your live app",
                  "Use Vue, Angular, Svelte, or native mobile (iOS/Android)",
                  "Want to bring your own LLM provider",
                  "Need multiple MT engines (DeepL, Google, AWS)",
                  "Have non-technical translators who need a Chrome extension",
                  "Need advanced workflow features (glossaries, branching, tasks)",
                  "Want CI/CD integration and CLI tooling",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="container-default pb-16">
        <Card className="max-w-3xl mx-auto bg-muted/30">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">
              Ready to try LangSync?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Get started for free with 3 projects, 100 keys, and AI-powered
              translations. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link href="/sign-up">
                  Get Started Free
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="https://github.com/YonasValentin/langsync.xyz">
                  <Github className="h-4 w-4 mr-2" />
                  Self-Host for Free
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
