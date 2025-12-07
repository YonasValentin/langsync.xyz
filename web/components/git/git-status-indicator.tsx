'use client';

import { useState, useEffect } from 'react';
import { GitService } from '@/lib/services/git-service';
import { GitSyncStatus } from '@/lib/types/git';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { GitBranch, GitCommit, ArrowUp, ArrowDown, Check } from 'lucide-react';

interface GitStatusIndicatorProps {
  onCommitClick?: () => void;
  onHistoryClick?: () => void;
}

export function GitStatusIndicator({
  onCommitClick,
  onHistoryClick,
}: GitStatusIndicatorProps) {
  const [status, setStatus] = useState<GitSyncStatus | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const loadStatus = () => {
    const syncStatus = GitService.getSyncStatus();
    setStatus(syncStatus);
  };

   
  useEffect(() => {
    loadStatus();
  }, []);

  if (!status) return null;

  const hasChanges = status.hasUncommittedChanges || status.hasUnpushedCommits;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <GitBranch className="h-4 w-4" />
          <span>{status.branch}</span>
          {hasChanges && (
            <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center rounded-full">
              <span className="text-xs">!</span>
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-1 flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" />
              Git Status
            </h4>
            <p className="text-sm text-muted-foreground">
              Current branch: <strong>{status.branch}</strong>
            </p>
          </div>

          {/* Sync Status */}
          <div className="space-y-2">
            {status.ahead > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <ArrowUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span>
                  {status.ahead} {status.ahead === 1 ? 'commit' : 'commits'} ahead
                </span>
              </div>
            )}

            {status.behind > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <ArrowDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>
                  {status.behind} {status.behind === 1 ? 'commit' : 'commits'} behind
                </span>
              </div>
            )}

            {status.ahead === 0 && status.behind === 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span>Up to date with remote</span>
              </div>
            )}

            {status.lastSync && (
              <p className="text-xs text-muted-foreground">
                Last synced: {status.lastSync.toLocaleString()}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2 border-t">
            <Button
              className="w-full justify-start"
              variant="outline"
              size="sm"
              onClick={() => {
                onCommitClick?.();
                setIsOpen(false);
              }}
            >
              <GitCommit className="h-4 w-4 mr-2" />
              Commit Changes
            </Button>

            <Button
              className="w-full justify-start"
              variant="outline"
              size="sm"
              onClick={() => {
                onHistoryClick?.();
                setIsOpen(false);
              }}
            >
              <GitBranch className="h-4 w-4 mr-2" />
              View History
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
