'use client';

import { useState } from 'react';
import { CommentsPanel } from './comments-panel';
import { ActivityFeed } from './activity-feed';
import { Button } from '@/components/ui/button';
import { MessageSquare, Activity as ActivityIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollaborationSidebarProps {
  projectId: string;
  keyId?: string;
  language?: string;
  onUpdate?: () => void;
}

export function CollaborationSidebar({
  projectId,
  keyId,
  language,
  onUpdate,
}: CollaborationSidebarProps) {
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');

  return (
    <div className="flex flex-col h-full border-l bg-background">
      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('comments')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors',
            activeTab === 'comments'
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          )}
        >
          <MessageSquare className="h-4 w-4" />
          Comments
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors',
            activeTab === 'activity'
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          )}
        >
          <ActivityIcon className="h-4 w-4" />
          Activity
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'comments' ? (
          <CommentsPanel
            projectId={projectId}
            keyId={keyId || ''}
            language={language}
            onCommentAdded={onUpdate}
          />
        ) : (
          <ActivityFeed projectId={projectId} keyId={keyId} limit={100} />
        )}
      </div>
    </div>
  );
}
