'use client';

import { useState } from 'react';
import {
  useComments,
  useUnresolvedCommentCount,
  useCreateComment,
  useResolveComment,
  useDeleteComment,
} from '@/hooks/queries';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommentsPanelProps {
  projectId: string;
  keyId: string;
  language?: string;
  onCommentAdded?: () => void;
}

export function CommentsPanel({ projectId, keyId, language, onCommentAdded }: CommentsPanelProps) {
  const [newComment, setNewComment] = useState('');
  const [filter, setFilter] = useState<'all' | 'unresolved'>('all');

  // Fetch all comments for this key/language
  const { data: allComments = [], isLoading } = useComments(projectId, keyId, language);

  // Fetch unresolved count
  const { data: unresolvedCount = 0 } = useUnresolvedCommentCount(projectId, keyId);

  // Mutations
  const createCommentMutation = useCreateComment(projectId);
  const resolveCommentMutation = useResolveComment(projectId);
  const deleteCommentMutation = useDeleteComment(projectId);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await createCommentMutation.mutateAsync({
        keyId,
        text: newComment.trim(),
        language,
      });
      setNewComment('');
      onCommentAdded?.();
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const handleResolveComment = async (commentId: string) => {
    try {
      await resolveCommentMutation.mutateAsync({ commentId, resolved: true });
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (confirm('Delete this comment?')) {
      try {
        await deleteCommentMutation.mutateAsync(commentId);
      } catch (error) {
        // Error already handled by mutation
      }
    }
  };

  const filteredComments = allComments.filter(c => {
    if (filter === 'unresolved' && c.resolved) return false;
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Comments</h3>
            {unresolvedCount > 0 && (
              <Badge variant="destructive">{unresolvedCount}</Badge>
            )}
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="flex-1"
          >
            All ({allComments.length})
          </Button>
          <Button
            variant={filter === 'unresolved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unresolved')}
            className="flex-1"
          >
            Unresolved ({unresolvedCount})
          </Button>
        </div>

        {language && (
          <div className="text-xs text-muted-foreground">
            For language: <Badge variant="outline">{language.toUpperCase()}</Badge>
          </div>
        )}
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredComments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No comments yet</p>
          </div>
        ) : (
          filteredComments.map(comment => (
            <div
              key={comment.id}
              className={cn(
                'p-3 rounded-lg border',
                comment.resolved ? 'bg-muted/30 opacity-75' : 'bg-background'
              )}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {comment.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-2">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-sm">{comment.user.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatDate(comment.created)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {!comment.resolved && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResolveComment(comment.id)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Text */}
                  <p className="text-sm whitespace-pre-wrap">{comment.text}</p>

                  {/* Resolved badge */}
                  {comment.resolved && comment.resolvedBy && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="h-3 w-3" />
                      Resolved by {comment.resolvedBy.name}
                      {comment.resolvedAt && ` • ${formatDate(comment.resolvedAt)}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Comment */}
      <div className="p-4 border-t space-y-2">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleAddComment();
            }
          }}
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            Press Cmd+Enter to send
          </span>
          <Button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            size="sm"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Add Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
