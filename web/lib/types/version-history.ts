export interface TranslationVersion {
  id: string;
  keyId: string;
  language: string;
  value: string;
  previousValue?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  changeType: 'created' | 'updated' | 'deleted';
  createdAt: Date;
  metadata?: {
    source?: 'manual' | 'ai' | 'import' | 'memory';
    confidence?: number;
    comment?: string;
  };
}

export interface VersionDiff {
  type: 'addition' | 'deletion' | 'unchanged';
  value: string;
}

export interface ChangeLog {
  date: Date;
  versions: TranslationVersion[];
  totalChanges: number;
}

export interface RestorePoint {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  createdBy: string;
  snapshot: Record<string, Record<string, string>>; // keyId -> language -> value
}
