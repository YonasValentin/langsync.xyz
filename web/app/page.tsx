import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Languages,
  ArrowRight,
  Github,
  Zap,
  Globe,
  Code,
  Shield,
  BarChart3,
  Terminal,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function HomePage() {
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
          <nav className="hidden sm:flex items-center gap-6 text-sm">
            <Link
              href="/pricing"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/compare/tolgee"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Compare
            </Link>
            <Link
              href="https://github.com/YonasValentin/langsync.xyz"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </Link>
          </nav>
          <div className="flex items-center gap-2">
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
      <section id="main-content" className="relative bg-glow">
        <div className="container-default section-py text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5">
            Open Source &middot; MIT License
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-balance">
            Translate your app
            <br />
            <span className="text-gradient">in minutes, not weeks</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 text-pretty">
            LangSync is an open-source translation management platform with
            AI-powered translations, real-time SDKs for Next.js and React
            Native, and a dashboard your whole team can use.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild>
              <Link href="/sign-up">
                Get Started Free
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="https://github.com/YonasValentin/langsync.xyz">
                <Github className="h-4 w-4 mr-2" />
                Star on GitHub
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required &middot; Self-host or use our cloud
          </p>
        </div>
      </section>

      {/* Code Preview */}
      <section className="container-default pb-16">
        <Card className="max-w-2xl mx-auto overflow-hidden border-border/60">
          <div className="bg-gray-950 text-gray-100 p-6 text-sm font-mono">
            <div className="flex items-center gap-2 mb-4 text-gray-500">
              <Terminal className="h-4 w-4" />
              <span>Quick Setup</span>
            </div>
            <div className="space-y-1">
              <p>
                <span className="text-primary-300">npm</span> install
                @langsync/next
              </p>
              <p className="text-gray-500 mt-3"># Add to your component:</p>
              <p>
                <span className="text-primary-300">{"import"}</span>
                {" { useTranslation } "}
                <span className="text-primary-300">from</span>{" "}
                <span className="text-warning">{`'@langsync/next'`}</span>
              </p>
              <p className="mt-2">
                <span className="text-primary-300">const</span> {"{ t }"} ={" "}
                <span className="text-primary-300">useTranslation</span>()
              </p>
              <p>
                {"<h1>{"}
                <span className="text-primary-300">t</span>(
                <span className="text-warning">{`'hello'`}</span>){"}</h1>"}
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Features Grid */}
      <section className="container-default section-py">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Everything you need to go global
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            From AI translation to real-time SDKs, LangSync handles the
            complexity so you can focus on your product.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-stagger">
          {[
            {
              icon: Zap,
              title: "AI Translation",
              description:
                "Translate instantly with GPT-4. Context-aware translations that understand your product's tone and terminology.",
            },
            {
              icon: Globe,
              title: "Multi-language Support",
              description:
                "Add unlimited languages. LangSync supports RTL, pluralization, and variable interpolation out of the box.",
            },
            {
              icon: Code,
              title: "SDK for Next.js & Expo",
              description:
                "First-class SDKs for Next.js (App Router) and React Native / Expo. Zero-config setup with TypeScript support.",
            },
            {
              icon: Shield,
              title: "Self-Host or Cloud",
              description:
                "Run on your own infrastructure with Docker, or use our managed cloud. Same MIT-licensed code either way.",
            },
            {
              icon: BarChart3,
              title: "Translation Analytics",
              description:
                "Track translation coverage, AI cost per project, and team activity. Know exactly where gaps are.",
            },
            {
              icon: Languages,
              title: "Team Collaboration",
              description:
                "Comments, approval workflows, version history, and activity feeds. Built for teams that care about quality.",
            },
          ].map((feature) => (
            <Card key={feature.title} className="p-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-default section-py">
        <Card className="bg-muted/30 border-border/60">
          <CardContent className="p-8 sm:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
              Ready to ship in every language?
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-6">
              Join developers who use LangSync to manage translations. Start
              free, no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" asChild>
                <Link href="/sign-up">
                  Start Free
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
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
