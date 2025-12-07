'use client';

import { useState, useEffect } from 'react';
import { GitService } from '@/lib/services/git-service';
import { GitCommit } from '@/lib/types/git';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitCommit as GitCommitIcon, GitBranch } from 'lucide-react';

interface GitHistoryProps {
  branch?: string;
  limit?: number;
}

export function GitHistory({ branch, limit = 50 }: GitHistoryProps) {
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [currentBranch, setCurrentBranch] = useState('main');

  const loadHistory = () => {
    const history = GitService.getCommitHistory(branch, limit);
    setCommits(history);
    setCurrentBranch(GitService.getCurrentBranch().name);
  };

   
   
  useEffect(() => {
    loadHistory();
  }, [branch, limit]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (commits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <GitCommitIcon className="h-12 w-12 mb-3 opacity-50" />
        <p>No commits yet</p>
        <p className="text-xs mt-1">Make your first commit to see history</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        {commits.map((commit, index) => (
          <div key={commit.id} className="relative">
            {/* Timeline line */}
            {index < commits.length - 1 && (
              <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-border" />
            )}

            <div className="flex gap-4">
              {/* Commit indicator */}
              <div className="flex-shrink-0 mt-1">
                <div className="w-3 h-3 rounded-full bg-primary ring-4 ring-background" />
              </div>

              {/* Commit details */}
              <div className="flex-1 pb-8">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">{commit.message}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-xs">
                          {commit.author.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{commit.author}</span>
                      <span>•</span>
                      <span>{formatDate(commit.date)}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    {commit.hash.substring(0, 7)}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  {commit.branch !== currentBranch && (
                    <Badge variant="secondary" className="gap-1">
                      <GitBranch className="h-3 w-3" />
                      {commit.branch}
                    </Badge>
                  )}

                  <span className="text-muted-foreground">
                    {commit.filesChanged} {commit.filesChanged === 1 ? 'file' : 'files'}
                  </span>

                  {commit.insertions > 0 && (
                    <span className="text-green-600 dark:text-green-400">
                      +{commit.insertions}
                    </span>
                  )}

                  {commit.deletions > 0 && (
                    <span className="text-red-600 dark:text-red-400">
                      -{commit.deletions}
                    </span>
                  )}

                  {commit.tags && commit.tags.length > 0 && (
                    <div className="flex gap-1">
                      {commit.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
