'use client';

import { useComments, useUnresolvedCommentCount } from '@/hooks/queries';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommentIndicatorProps {
  projectId: string;
  keyId: string;
  language?: string;
  onClick?: () => void;
}

export function CommentIndicator({ projectId, keyId, language, onClick }: CommentIndicatorProps) {
  // Fetch comments and unresolved count
  const { data: comments = [] } = useComments(projectId, keyId, language);
  const { data: unresolvedCount = 0 } = useUnresolvedCommentCount(projectId, keyId);

  const count = comments.length;

  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 transition-opacity hover:opacity-80"
      )}
    >
      <Badge
        variant={unresolvedCount > 0 ? "default" : "secondary"}
        className="text-xs cursor-pointer"
      >
        <MessageSquare className="h-3 w-3 mr-1" />
        {count}
      </Badge>
    </button>
  );
}
