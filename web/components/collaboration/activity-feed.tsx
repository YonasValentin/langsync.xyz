'use client';

import { useActivityLogs, type ActivityLogDisplay } from '@/hooks/queries';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  Edit3,
  Plus,
  Trash2,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityFeedProps {
  projectId: string;
  keyId?: string;
  limit?: number;
}

export function ActivityFeed({ projectId, keyId, limit = 50 }: ActivityFeedProps) {
  // Fetch activity logs
  const { data: activities = [], isLoading } = useActivityLogs(projectId, {
    keyId,
    limit,
  });

  const getActivityIcon = (type: ActivityLogDisplay['type']) => {
    switch (type) {
      case 'key_created':
      case 'project_created':
        return <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'translation_updated':
      case 'key_updated':
      case 'project_updated':
        return <Edit3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'key_deleted':
        return <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case 'comment_added':
        return <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case 'comment_resolved':
        return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'translation_approved':
      case 'ai_translation_accepted':
        return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'translation_rejected':
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case 'ai_translation_generated':
        return <Plus className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (activities.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <div>
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No activity yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex gap-3 items-start p-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="text-xs">
                {activity.user.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{activity.user.name}</span>
                  {getActivityIcon(activity.type)}
                </div>
                <time className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatRelativeTime(activity.created)}
                </time>
              </div>

              <p className="text-sm text-muted-foreground mt-1">
                {activity.description}
              </p>

              {activity.language && (
                <Badge variant="outline" className="mt-2 text-xs">
                  {activity.language}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
