export interface GitCommit {
  id: string;
  hash: string;
  message: string;
  author: string;
  authorEmail: string;
  date: Date;
  filesChanged: number;
  insertions: number;
  deletions: number;
  branch: string;
  tags?: string[];
}

export interface GitBranch {
  name: string;
  current: boolean;
  lastCommit: GitCommit;
  ahead: number; // commits ahead of main
  behind: number; // commits behind main
}

export interface GitFileStatus {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  insertions: number;
  deletions: number;
}

export interface GitSettings {
  repositoryPath?: string;
  defaultBranch: string;
  autoCommit: boolean;
  commitMessageTemplate: string;
  author: {
    name: string;
    email: string;
  };
}

export interface GitSyncStatus {
  branch: string;
  ahead: number;
  behind: number;
  hasUnpushedCommits: boolean;
  hasUncommittedChanges: boolean;
  lastSync: Date | null;
}
