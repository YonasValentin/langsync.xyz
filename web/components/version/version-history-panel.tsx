'use client';

import { useState } from 'react';
import { useVersionHistory, type VersionHistoryEntry } from '@/hooks/queries';
import { DiffViewer } from './diff-viewer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Clock,
  RotateCcw,
  History,
  Plus,
  Edit3,
  Trash2,
  Loader2,
} from 'lucide-react';

interface VersionHistoryPanelProps {
  projectId: string;
  keyId: string;
  language: string;
  currentValue: string;
  onRestore?: (value: string) => void;
}

export function VersionHistoryPanel({
  projectId,
  keyId,
  language,
  currentValue,
  onRestore,
}: VersionHistoryPanelProps) {
  const [selectedVersion, setSelectedVersion] = useState<VersionHistoryEntry | null>(null);
  const { data: versions = [], isLoading } = useVersionHistory(projectId, keyId, language);

  const handleRestore = (version: VersionHistoryEntry) => {
    if (confirm('Restore this version? This will create a new version with the restored content.')) {
      onRestore?.(version.value);
      setSelectedVersion(null);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getChangeIcon = (changeType: VersionHistoryEntry['changeType']) => {
    switch (changeType) {
      case 'created':
        return <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'updated':
        return <Edit3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'deleted':
        return <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
        <Loader2 className="h-12 w-12 mb-3 opacity-50 animate-spin" />
        <p>Loading version history...</p>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
        <History className="h-12 w-12 mb-3 opacity-50" />
        <p>No version history yet</p>
        <p className="text-xs mt-1">Changes will appear here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Version History</h3>
            <Badge variant="secondary">{versions.length} versions</Badge>
          </div>
          {selectedVersion && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedVersion(null)}
            >
              Close
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Viewing history for <strong>{language.toUpperCase()}</strong>
        </p>
      </div>

      {/* Version List or Detail */}
      {!selectedVersion ? (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {/* Current Value */}
            <div className="p-3 rounded-lg border-2 border-primary bg-primary/5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">
                      Current Version
                    </span>
                    <Badge variant="default" className="text-xs">
                      Active
                    </Badge>
                  </div>
                  <p className="text-sm">{currentValue}</p>
                </div>
              </div>
            </div>

            {/* Version History */}
            {versions.map((version, index) => (
              <button
                key={version.id}
                onClick={() => setSelectedVersion(version)}
                className="w-full p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getChangeIcon(version.changeType)}</div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {version.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{version.user.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(version.created)}
                      </span>
                    </div>

                    <p className="text-sm line-clamp-2">{version.value}</p>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {version.changeType}
                      </Badge>
                      {index === 0 && (
                        <Badge variant="secondary" className="text-xs">
                          Latest
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Version Details */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {selectedVersion.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{selectedVersion.user.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(selectedVersion.created).toLocaleString()}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleRestore(selectedVersion)}
                disabled={selectedVersion.value === currentValue}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="capitalize">
                {getChangeIcon(selectedVersion.changeType)}
                <span className="ml-1">{selectedVersion.changeType}</span>
              </Badge>
            </div>
          </div>

          {/* Diff View */}
          {selectedVersion.previousValue && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Changes</h4>
              <DiffViewer
                oldText={selectedVersion.previousValue}
                newText={selectedVersion.value}
                inline={false}
              />
            </div>
          )}

          {/* Current Version Value */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Version Content</h4>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm font-mono">{selectedVersion.value}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
