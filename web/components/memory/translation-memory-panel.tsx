'use client';

import { useState, useMemo } from 'react';
import { useTranslationMemory, useDeleteMemoryEntry } from '@/hooks/queries';
import { TranslationMemoryEntry } from '@/lib/types/translation-memory';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  Trash2,
  TrendingUp,
  Clock,
  Globe,
  Database,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TranslationMemoryPanelProps {
  projectId: string;
  currentLanguagePair?: {
    source: string;
    target: string;
  };
}

export function TranslationMemoryPanel({
  projectId,
  currentLanguagePair,
}: TranslationMemoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [view, setView] = useState<'all' | 'project' | 'popular'>('project');

  // Fetch translation memory entries using TanStack Query
  const { data: allEntries = [], isLoading } = useTranslationMemory(
    view === 'project' ? projectId : undefined,
    undefined, // sourceLanguage
    undefined  // targetLanguage
  );

  // Fetch total memory size (all entries across projects)
  const { data: totalMemoryEntries = [] } = useTranslationMemory();
  const memorySize = totalMemoryEntries.length;

  // Delete mutation
  const deleteMemoryEntry = useDeleteMemoryEntry();

  const filteredEntries = useMemo(() => {
    let entries = allEntries;

    // Filter by current language pair if specified
    if (currentLanguagePair) {
      entries = entries.filter(
        e =>
          e.sourceLanguage === currentLanguagePair.source &&
          e.targetLanguage === currentLanguagePair.target
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      entries = entries.filter(
        e =>
          e.sourceText.toLowerCase().includes(query) ||
          e.targetText.toLowerCase().includes(query) ||
          e.context?.toLowerCase().includes(query)
      );
    }

    // Sort by last used
    return entries.sort(
      (a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime()
    );
  }, [allEntries, currentLanguagePair, searchQuery]);

  const handleDeleteEntry = async (id: string) => {
    if (confirm('Delete this translation memory entry?')) {
      await deleteMemoryEntry.mutateAsync(id);
      setSelectedEntry(null);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Translation Memory
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {memorySize} entries • {filteredEntries.length} shown
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search translations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* View Tabs */}
        <div className="flex gap-2">
          <Button
            variant={view === 'project' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('project')}
            className="flex-1"
          >
            This Project
          </Button>
          <Button
            variant={view === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('all')}
            className="flex-1"
          >
            All Projects
          </Button>
          <Button
            variant={view === 'popular' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('popular')}
            className="flex-1"
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Popular
          </Button>
        </div>

        {/* Current Language Pair */}
        {currentLanguagePair && (
          <div className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Showing:</span>
            <Badge variant="outline">
              {currentLanguagePair.source.toUpperCase()} →{' '}
              {currentLanguagePair.target.toUpperCase()}
            </Badge>
          </div>
        )}
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="text-sm text-muted-foreground">Loading translation memory...</div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 text-center">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {memorySize === 0
                  ? 'No translation memory yet. Start translating to build your memory!'
                  : 'No matches found. Try a different search or filter.'}
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="divide-y">
            {filteredEntries.map(entry => (
              <button
                key={entry.id}
                onClick={() =>
                  setSelectedEntry(
                    selectedEntry === entry.id ? null : entry.id
                  )
                }
                className={cn(
                  'w-full text-left p-4 hover:bg-muted/50 transition-colors',
                  selectedEntry === entry.id && 'bg-muted'
                )}
              >
                <div className="space-y-2">
                  {/* Source → Target */}
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      {entry.sourceText}
                    </div>
                    <div className="font-medium">
                      {entry.targetText}
                    </div>
                  </div>

                  {/* Context */}
                  {entry.context && (
                    <div className="text-xs text-muted-foreground italic">
                      {entry.context}
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {entry.sourceLanguage.toUpperCase()} →{' '}
                      {entry.targetLanguage.toUpperCase()}
                    </Badge>

                    {entry.usageCount > 1 && (
                      <Badge variant="secondary" className="text-xs">
                        Used {entry.usageCount}x
                      </Badge>
                    )}

                    {entry.projectId !== projectId && (
                      <Badge variant="outline" className="text-xs">
                        Other Project
                      </Badge>
                    )}

                    <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                      <Clock className="h-3 w-3" />
                      {formatDate(entry.lastUsedAt)}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedEntry === entry.id && (
                    <div className="pt-2 mt-2 border-t space-y-2">
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div>Created: {formatDate(entry.createdAt)}</div>
                        <div>ID: {entry.id}</div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEntry(entry.id);
                        }}
                        disabled={deleteMemoryEntry.isPending}
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        {deleteMemoryEntry.isPending ? 'Deleting...' : 'Delete Entry'}
                      </Button>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t bg-muted/30">
        <div className="text-xs text-muted-foreground text-center">
          Translation memory helps you reuse previous translations
        </div>
      </div>
    </div>
  );
}
