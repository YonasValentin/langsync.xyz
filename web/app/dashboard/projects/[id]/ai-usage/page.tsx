'use client';

import { useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Sparkles, TrendingUp, DollarSign, Languages, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useProject, useAiUsage } from '@/hooks/queries';
import type { AiTranslationsRecord } from '@/lib/pocketbase-types';

interface LanguagePairStats {
  sourceLanguage: string;
  targetLanguage: string;
  count: number;
  cost: number;
  acceptanceRate: number;
}

export default function AIUsagePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Calculate start date based on selected range
  const startDate = useMemo(() => {
    const now = new Date();
    if (dateRange === '7d') {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (dateRange === '30d') {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (dateRange === '90d') {
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    }
    return undefined;
  }, [dateRange]);

  // Fetch project data
  const { data: project, isLoading: projectLoading } = useProject(projectId);

  // Fetch AI usage data
  const { data: usageData, isLoading: usageLoading } = useAiUsage(
    projectId,
    startDate
  );

  // Combined loading state
  const loading = projectLoading || usageLoading;

  // Redirect if project not found
  if (!projectLoading && !project) {
    router.push('/dashboard/projects');
    return null;
  }

  // Compute derived statistics from raw translations
  const stats = useMemo(() => {
    if (!usageData) return null;

    const { translations, totalTokens, totalCost, acceptedCount, rejectedCount } = usageData;
    const totalTranslations = translations.length;
    const acceptedTranslations = acceptedCount;
    const rejectedTranslations = rejectedCount;
    const acceptanceRate = totalTranslations > 0
      ? Math.round((acceptedTranslations / totalTranslations) * 100)
      : 0;

    // Compute language pair statistics
    const pairMap = new Map<string, { count: number; cost: number; accepted: number }>();
    for (const t of translations) {
      const key = `${t.sourceLanguage}-${t.targetLanguage}`;
      const existing = pairMap.get(key) || { count: 0, cost: 0, accepted: 0 };
      pairMap.set(key, {
        count: existing.count + 1,
        cost: existing.cost + (t.estimatedCost || 0),
        accepted: existing.accepted + (t.wasAccepted ? 1 : 0),
      });
    }

    const languagePairs: LanguagePairStats[] = Array.from(pairMap.entries()).map(([key, data]) => {
      const [sourceLanguage, targetLanguage] = key.split('-');
      return {
        sourceLanguage,
        targetLanguage,
        count: data.count,
        cost: data.cost,
        acceptanceRate: data.count > 0 ? Math.round((data.accepted / data.count) * 100) : 0,
      };
    });

    // Get recent translations (first 10)
    const recentTranslations = translations.slice(0, 10);

    return {
      totalTokens,
      totalCost,
      totalTranslations,
      acceptedTranslations,
      rejectedTranslations,
      acceptanceRate,
      languagePairs,
      recentTranslations,
    };
  }, [usageData]);

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-white to-rose-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 dark:bg-gray-950/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/projects/${projectId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-bold text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                AI Usage Statistics
              </h1>
              <p className="text-xs text-muted-foreground">{project.name}</p>
            </div>
          </div>

          <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-8 max-w-7xl mx-auto space-y-6">
        {/* Overview Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Translations */}
          <Card className="border-violet-200 dark:border-violet-900">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                Total Translations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalTranslations || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                AI-generated translations
              </p>
            </CardContent>
          </Card>

          {/* Acceptance Rate */}
          <Card className="border-green-200 dark:border-green-900">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                Acceptance Rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.acceptanceRate || 0}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.acceptedTranslations || 0} of {stats?.totalTranslations || 0} accepted
              </p>
            </CardContent>
          </Card>

          {/* Total Cost */}
          <Card className="border-blue-200 dark:border-blue-900">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Total Cost
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${(stats?.totalCost || 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                AI translation costs
              </p>
            </CardContent>
          </Card>

          {/* Total Tokens */}
          <Card className="border-amber-200 dark:border-amber-900">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Total Tokens
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{(stats?.totalTokens || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                API tokens used
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Language Pairs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Translation by Language Pair
            </CardTitle>
            <CardDescription>
              Breakdown of AI translations by source and target languages
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.languagePairs && stats.languagePairs.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source Language</TableHead>
                      <TableHead>Target Language</TableHead>
                      <TableHead className="text-right">Translations</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Acceptance Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.languagePairs.map((pair, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge variant="outline">{pair.sourceLanguage.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{pair.targetLanguage.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{pair.count}</TableCell>
                        <TableCell className="text-right font-mono">${pair.cost.toFixed(4)}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={pair.acceptanceRate >= 80 ? 'default' : pair.acceptanceRate >= 60 ? 'secondary' : 'outline'}
                          >
                            {pair.acceptanceRate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No language pair data available for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Translations */}
        <Card>
          <CardHeader>
            <CardTitle>Recent AI Translations</CardTitle>
            <CardDescription>
              Latest AI-generated translations and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentTranslations && stats.recentTranslations.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source Text</TableHead>
                      <TableHead>Translation</TableHead>
                      <TableHead>Languages</TableHead>
                      <TableHead className="text-right">Tokens</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentTranslations.map((translation) => (
                      <TableRow key={translation.id}>
                        <TableCell className="max-w-xs truncate text-sm">{translation.sourceText}</TableCell>
                        <TableCell className="max-w-xs truncate">{translation.translatedText}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs">
                            <Badge variant="outline" className="text-xs">
                              {translation.sourceLanguage.toUpperCase()}
                            </Badge>
                            <span>→</span>
                            <Badge variant="outline" className="text-xs">
                              {translation.targetLanguage.toUpperCase()}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{translation.totalTokens || 0}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          ${(translation.estimatedCost || 0).toFixed(4)}
                        </TableCell>
                        <TableCell>
                          {translation.wasAccepted ? (
                            <Badge className="bg-green-600 dark:bg-green-700">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Accepted
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(translation.created).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent translations available
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
