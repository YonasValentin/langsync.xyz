'use client';

import { useAuth } from '@/contexts/auth-context';
import { UserMenu } from '@/components/user-menu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen, Languages, Zap, Globe, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 glass">
        <div className="container-default flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Languages className="h-4 w-4 text-primary-foreground" />
            </div>
            <span>LangSync</span>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-default py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div>
            <h1 className="text-2xl font-semibold mb-1">
              Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-muted-foreground">
              Manage your translation projects and keys
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Link href="/dashboard/projects">
              <Card className="card-interactive h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Plus className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Create Project</CardTitle>
                      <CardDescription className="text-sm">Start a new translation project</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/dashboard/projects">
              <Card className="card-interactive h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <FolderOpen className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base">View Projects</CardTitle>
                      <CardDescription className="text-sm">Browse all your projects</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </div>

          {/* Features Grid */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Features</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  icon: Globe,
                  title: 'Multi-language Support',
                  description: 'Add unlimited languages to your projects',
                },
                {
                  icon: Zap,
                  title: 'AI Translation',
                  description: 'Translate instantly with GPT-4',
                },
                {
                  icon: BarChart3,
                  title: 'Usage Analytics',
                  description: 'Track translation coverage and usage',
                },
              ].map((feature, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <feature.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm mb-0.5">{feature.title}</h3>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Getting Started */}
          <Card className="bg-muted/30">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Getting Started</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first project to start managing translations. You can add languages,
                import existing translations, or let AI generate them automatically.
              </p>
              <Link href="/dashboard/projects">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
