'use client';

import { computeDiff } from '@/lib/utils/diff';
import { cn } from '@/lib/utils';

interface DiffViewerProps {
  oldText: string;
  newText: string;
  inline?: boolean;
}

export function DiffViewer({ oldText, newText, inline = false }: DiffViewerProps) {
  const diff = computeDiff(oldText || '', newText || '');

  if (inline) {
    return (
      <div className="font-mono text-sm p-3 bg-muted/30 rounded-lg">
        {diff.map((part, index) => (
          <span
            key={index}
            className={cn(
              part.type === 'addition' && 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100',
              part.type === 'deletion' && 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100 line-through',
              part.type === 'unchanged' && 'text-foreground'
            )}
          >
            {part.value}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Old Version */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-red-600 dark:text-red-400">
          Previous Version
        </div>
        <div className="font-mono text-sm p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
          {diff.map((part, index) => (
            part.type === 'deletion' || part.type === 'unchanged' ? (
              <span
                key={index}
                className={cn(
                  part.type === 'deletion' && 'bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-100',
                  part.type === 'unchanged' && 'text-muted-foreground'
                )}
              >
                {part.value}
              </span>
            ) : null
          ))}
        </div>
      </div>

      {/* New Version */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-green-600 dark:text-green-400">
          Current Version
        </div>
        <div className="font-mono text-sm p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
          {diff.map((part, index) => (
            part.type === 'addition' || part.type === 'unchanged' ? (
              <span
                key={index}
                className={cn(
                  part.type === 'addition' && 'bg-green-200 dark:bg-green-900/50 text-green-900 dark:text-green-100',
                  part.type === 'unchanged' && 'text-muted-foreground'
                )}
              >
                {part.value}
              </span>
            ) : null
          ))}
        </div>
      </div>
    </div>
  );
}
