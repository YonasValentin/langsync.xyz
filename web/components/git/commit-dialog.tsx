'use client';

import { useState } from 'react';
import { GitService } from '@/lib/services/git-service';
import { GitFileStatus } from '@/lib/types/git';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { GitCommit as GitCommitIcon, Check, Loader2 } from 'lucide-react';

interface CommitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: GitFileStatus[];
  onCommitComplete?: () => void;
}

export function CommitDialog({
  open,
  onOpenChange,
  files,
  onCommitComplete,
}: CommitDialogProps) {
  const [commitMessage, setCommitMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [committed, setCommitted] = useState(false);

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;

    setIsCommitting(true);

    try {
      const currentBranch = GitService.getCurrentBranch();
      await GitService.createCommit(commitMessage, files, currentBranch.name);

      setCommitted(true);
      setTimeout(() => {
        onCommitComplete?.();
        onOpenChange(false);
        setCommitMessage('');
        setCommitted(false);
      }, 1500);
    } catch (error) {
    } finally {
      setIsCommitting(false);
    }
  };

  const totalInsertions = files.reduce((sum, f) => sum + f.insertions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

  const getStatusColor = (status: GitFileStatus['status']) => {
    switch (status) {
      case 'added':
        return 'text-success';
      case 'modified':
        return 'text-primary';
      case 'deleted':
        return 'text-destructive';
      case 'renamed':
        return 'text-warning';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCommitIcon className="h-5 w-5 text-primary" />
            Commit Changes
          </DialogTitle>
          <DialogDescription>
            Commit your translation changes to version control
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Files Changed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Files Changed ({files.length})</Label>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-success">
                  +{totalInsertions} insertions
                </span>
                <span className="text-destructive">
                  -{totalDeletions} deletions
                </span>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
              {files.map((file, index) => (
                <div key={index} className="p-3 hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {file.status}
                      </Badge>
                      <span className="text-sm font-mono">{file.path}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {file.insertions > 0 && (
                        <span className="text-success">
                          +{file.insertions}
                        </span>
                      )}
                      {file.deletions > 0 && (
                        <span className="text-destructive">
                          -{file.deletions}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Commit Message */}
          <div className="space-y-2">
            <Label htmlFor="commit-message">
              Commit Message *
            </Label>
            <Textarea
              id="commit-message"
              placeholder="Update translations for Spanish and French"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              rows={4}
              disabled={isCommitting || committed}
            />
            <p className="text-xs text-muted-foreground">
              Describe what translations were changed and why
            </p>
          </div>

          {/* Success State */}
          {committed && (
            <div className="flex items-center gap-2 p-3 bg-success/5 border border-success/20 rounded-lg">
              <Check className="h-5 w-5 text-success" />
              <span className="text-sm text-foreground">
                Changes committed successfully!
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCommitting || committed}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCommit}
            disabled={!commitMessage.trim() || isCommitting || committed}
          >
            {isCommitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Committing...
              </>
            ) : committed ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Committed
              </>
            ) : (
              <>
                <GitCommitIcon className="h-4 w-4 mr-2" />
                Commit Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
