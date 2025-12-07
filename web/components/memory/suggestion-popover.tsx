'use client';

import { TranslationSuggestion } from '@/hooks/queries';
import { Badge } from '@/components/ui/badge';
import { Clock, Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuggestionPopoverProps {
  suggestions: TranslationSuggestion[];
  onSelect: (suggestion: TranslationSuggestion) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

export function SuggestionPopover({
  suggestions,
  onSelect,
  onClose,
  position = { top: 0, left: 0 },
}: SuggestionPopoverProps) {
  if (suggestions.length === 0) return null;

  const getSourceBadge = (source: 'exact' | 'fuzzy' | 'context') => {
    switch (source) {
      case 'exact':
        return (
          <Badge variant="default" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            Exact Match
          </Badge>
        );
      case 'fuzzy':
        return (
          <Badge variant="secondary" className="text-xs">
            Similar
          </Badge>
        );
      case 'context':
        return (
          <Badge variant="outline" className="text-xs">
            Other Project
          </Badge>
        );
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Popover */}
      <div
        className="absolute z-50 bg-popover border shadow-lg rounded-lg w-96 max-h-96 overflow-y-auto"
        style={{
          top: position.top + 40,
          left: position.left,
        }}
      >
        <div className="p-3 border-b bg-muted/50">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Translation Memory ({suggestions.length})
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Suggestions from previous translations
          </p>
        </div>

        <div className="divide-y">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSelect(suggestion)}
              className={cn(
                "w-full text-left p-3 hover:bg-muted/50 transition-colors",
                "focus:outline-none focus:bg-muted/70"
              )}
            >
              <div className="space-y-2">
                {/* Suggestion text */}
                <div className="font-medium text-sm">
                  {suggestion.entry.targetText}
                </div>

                {/* Source text if different */}
                {suggestion.similarity < 100 && (
                  <div className="text-xs text-muted-foreground">
                    Source: &quot;{suggestion.entry.sourceText}&quot;
                  </div>
                )}

                {/* Context if available */}
                {suggestion.entry.context && (
                  <div className="text-xs text-muted-foreground italic">
                    Context: {suggestion.entry.context}
                  </div>
                )}

                {/* Metadata */}
                <div className="flex items-center gap-2 flex-wrap">
                  {getSourceBadge(suggestion.source)}

                  {suggestion.similarity < 100 && (
                    <Badge variant="outline" className="text-xs">
                      {suggestion.similarity}% match
                    </Badge>
                  )}

                  {suggestion.entry.usageCount > 1 && (
                    <Badge variant="outline" className="text-xs">
                      Used {suggestion.entry.usageCount}x
                    </Badge>
                  )}

                  <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                    <Clock className="h-3 w-3" />
                    {formatDate(suggestion.entry.lastUsedAt)}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="p-2 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Click a suggestion to use it • Press Esc to close
          </p>
        </div>
      </div>
    </>
  );
}
