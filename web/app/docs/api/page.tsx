import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Languages, ArrowLeft, Key, Globe, Zap, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Documentation",
  description:
    "LangSync REST API documentation. Fetch translations, list keys, and integrate with any platform.",
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-gray-950 text-gray-100 rounded-lg p-4 text-sm font-mono overflow-x-auto">
      <code>{children}</code>
    </pre>
  );
}

function Endpoint({
  method,
  path,
  description,
  children,
}: {
  method: string;
  path: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border">
        <Badge
          variant={method === "GET" ? "secondary" : "default"}
          className="font-mono text-xs"
        >
          {method}
        </Badge>
        <code className="text-sm font-mono">{path}</code>
      </div>
      <div className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        {children}
      </div>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background">
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

      <main className="container-default py-12 max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <h1 className="text-3xl font-bold tracking-tight mb-2">
          API Documentation
        </h1>
        <p className="text-muted-foreground mb-8">
          Use the LangSync REST API to fetch translations for your app. All
          endpoints require an API key.
        </p>

        {/* Authentication */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Authentication</h2>
          </div>
          <Card>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                All API requests require a Bearer token in the{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                  Authorization
                </code>{" "}
                header. Create API keys in{" "}
                <strong>Dashboard &rarr; Settings &rarr; API Keys</strong>.
              </p>
              <CodeBlock>
                {`curl -H "Authorization: Bearer lsk_your_api_key_here" \\
  https://your-instance.langsync.xyz/api/v1/projects/{projectId}/translations`}
              </CodeBlock>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <Shield className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  API keys are hashed on first use. The full key is only shown
                  once at creation. Keys can be scoped to specific projects and
                  have optional expiry dates.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Rate Limiting */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Rate Limiting</h2>
          </div>
          <Card>
            <CardContent className="p-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                API requests are rate-limited to <strong>60 requests per
                minute</strong> per IP address. AI translation endpoints have a
                stricter limit of <strong>20 requests per minute</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                Rate limit headers are included in 429 responses:
              </p>
              <CodeBlock>
                {`X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1709913600
Retry-After: 42`}
              </CodeBlock>
            </CardContent>
          </Card>
        </section>

        {/* Base URL */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Base URL</h2>
          </div>
          <Card>
            <CardContent className="p-6 space-y-2">
              <p className="text-sm text-muted-foreground">
                Cloud:{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                  https://app.langsync.xyz/api/v1
                </code>
              </p>
              <p className="text-sm text-muted-foreground">
                Self-hosted:{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                  https://your-domain.com/api/v1
                </code>
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Endpoints */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Endpoints</h2>
          </div>

          <div className="space-y-6">
            <Endpoint
              method="GET"
              path="/api/v1/projects/{projectId}"
              description="Get project details including languages, default language, and metadata."
            >
              <h4 className="text-sm font-medium">Response</h4>
              <CodeBlock>
                {`{
  "success": true,
  "project": {
    "id": "abc123def456789",
    "name": "My App",
    "defaultLanguage": "en",
    "languages": ["en", "da", "de", "fr"],
    "description": "Main web application",
    "keyCount": 142,
    "translationProgress": 87
  }
}`}
              </CodeBlock>
            </Endpoint>

            <Endpoint
              method="GET"
              path="/api/v1/projects/{projectId}/keys"
              description="List all translation keys for a project, including their translations."
            >
              <h4 className="text-sm font-medium">Response</h4>
              <CodeBlock>
                {`{
  "success": true,
  "keys": [
    {
      "id": "key123abc456789",
      "key": "hero.title",
      "description": "Main hero section title",
      "translations": {
        "en": "Welcome to our app",
        "da": "Velkommen til vores app",
        "de": "Willkommen bei unserer App"
      }
    }
  ]
}`}
              </CodeBlock>
            </Endpoint>

            <Endpoint
              method="GET"
              path="/api/v1/projects/{projectId}/translations"
              description="Get all translations for a project, organized by language."
            >
              <h4 className="text-sm font-medium">Response</h4>
              <CodeBlock>
                {`{
  "success": true,
  "translations": {
    "en": {
      "hero.title": "Welcome to our app",
      "hero.subtitle": "The best translation platform",
      "nav.home": "Home"
    },
    "da": {
      "hero.title": "Velkommen til vores app",
      "hero.subtitle": "Den bedste oversaettelsesplatform",
      "nav.home": "Hjem"
    }
  }
}`}
              </CodeBlock>
            </Endpoint>

            <Endpoint
              method="GET"
              path="/api/v1/projects/{projectId}/translations/{language}"
              description="Get translations for a single language. Use this endpoint in your SDK for optimal performance."
            >
              <h4 className="text-sm font-medium">
                Parameters
              </h4>
              <div className="text-sm text-muted-foreground">
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                  language
                </code>{" "}
                — BCP 47 language code (e.g., &quot;en&quot;, &quot;da&quot;,
                &quot;pt-BR&quot;)
              </div>
              <h4 className="text-sm font-medium">Response</h4>
              <CodeBlock>
                {`{
  "success": true,
  "language": "da",
  "translations": {
    "hero.title": "Velkommen til vores app",
    "hero.subtitle": "Den bedste oversaettelsesplatform",
    "nav.home": "Hjem"
  }
}`}
              </CodeBlock>
            </Endpoint>
          </div>
        </section>

        {/* SDK Examples */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">SDK Quick Start</h2>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Next.js</CardTitle>
              </CardHeader>
              <CardContent>
                <CodeBlock>
                  {`npm install @langsync/next

// next.config.ts
import { withLangSync } from '@langsync/next/plugin';

export default withLangSync({
  projectId: 'your-project-id',
  apiKey: process.env.LANGSYNC_API_KEY,
  languages: ['en', 'da', 'de'],
  defaultLanguage: 'en',
});

// app/page.tsx
import { useTranslation } from '@langsync/next';

export default function Page() {
  const { t } = useTranslation();
  return <h1>{t('hero.title')}</h1>;
}`}
                </CodeBlock>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">React Native / Expo</CardTitle>
              </CardHeader>
              <CardContent>
                <CodeBlock>
                  {`npm install @langsync/expo

// App.tsx
import { LangSyncProvider, useTranslation } from '@langsync/expo';

function App() {
  return (
    <LangSyncProvider
      projectId="your-project-id"
      apiKey={process.env.EXPO_PUBLIC_LANGSYNC_API_KEY}
      defaultLanguage="en"
    >
      <HomeScreen />
    </LangSyncProvider>
  );
}

function HomeScreen() {
  const { t } = useTranslation();
  return <Text>{t('hero.title')}</Text>;
}`}
                </CodeBlock>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Error Codes */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Error Codes</h2>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left font-medium px-4 py-3">Status</th>
                    <th className="text-left font-medium px-4 py-3">
                      Meaning
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["400", "Bad request — invalid parameters"],
                    ["401", "Unauthorized — missing or invalid API key"],
                    ["403", "Forbidden — API key lacks access to this project"],
                    ["404", "Not found — project or resource does not exist"],
                    ["429", "Too many requests — rate limit exceeded"],
                    ["500", "Internal server error — contact support"],
                  ].map(([code, desc], i, arr) => (
                    <tr
                      key={code}
                      className={
                        i < arr.length - 1 ? "border-b border-border/50" : ""
                      }
                    >
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-mono">
                          {code}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {desc}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>

        <div className="text-center pt-4 pb-8">
          <p className="text-sm text-muted-foreground mb-4">
            Need help? Check the source code or open an issue.
          </p>
          <Button variant="outline" asChild>
            <Link href="https://github.com/YonasValentin/langsync.xyz">
              View on GitHub
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
