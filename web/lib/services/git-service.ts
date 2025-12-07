import { GitCommit, GitBranch, GitFileStatus, GitSettings, GitSyncStatus } from '@/lib/types/git';

// Serialized types for localStorage (Date fields are strings)
type SerializedGitCommit = Omit<GitCommit, 'date'> & { date: string };

const GIT_COMMITS_KEY = 'langsync_git_commits';
const GIT_BRANCHES_KEY = 'langsync_git_branches';
const GIT_SETTINGS_KEY = 'langsync_git_settings';

const DEFAULT_SETTINGS: GitSettings = {
  defaultBranch: 'main',
  autoCommit: false,
  commitMessageTemplate: 'Update translations for {{languages}}',
  author: {
    name: 'LangSync User',
    email: 'user@langsync.xyz',
  },
};

/**
 * Mock Git Service for frontend demo
 * In production, this would call backend APIs that execute actual git commands
 */
export class GitService {
  static getSettings(): GitSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;

    const stored = localStorage.getItem(GIT_SETTINGS_KEY);
    if (!stored) return DEFAULT_SETTINGS;

    return JSON.parse(stored);
  }

  static saveSettings(settings: GitSettings): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(GIT_SETTINGS_KEY, JSON.stringify(settings));
  }

  static getAllCommits(): GitCommit[] {
    if (typeof window === 'undefined') return [];

    const data = localStorage.getItem(GIT_COMMITS_KEY);
    if (!data) return [];

    const serializedCommits = JSON.parse(data) as SerializedGitCommit[];
    return serializedCommits
      .map((c): GitCommit => ({
        ...c,
        date: new Date(c.date),
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  static async createCommit(
    message: string,
    files: GitFileStatus[],
    branch: string = 'main'
  ): Promise<GitCommit> {
    const settings = this.getSettings();
    const commits = this.getAllCommits();

    const commit: GitCommit = {
      id: crypto.randomUUID(),
      hash: this.generateCommitHash(),
      message,
      author: settings.author.name,
      authorEmail: settings.author.email,
      date: new Date(),
      filesChanged: files.length,
      insertions: files.reduce((sum, f) => sum + f.insertions, 0),
      deletions: files.reduce((sum, f) => sum + f.deletions, 0),
      branch,
    };

    commits.push(commit);
    localStorage.setItem(GIT_COMMITS_KEY, JSON.stringify(commits));

    return commit;
  }

  static getAllBranches(): GitBranch[] {
    if (typeof window === 'undefined') return [];

    const stored = localStorage.getItem(GIT_BRANCHES_KEY);
    if (stored) {
      const branches = JSON.parse(stored);
      return branches.map((b: GitBranch) => ({
        ...b,
        lastCommit: {
          ...b.lastCommit,
          date: new Date(b.lastCommit.date),
        },
      }));
    }

    // Default branches
    const commits = this.getAllCommits();
    const mainCommit = commits.find(c => c.branch === 'main') || this.createDefaultCommit('main');

    return [
      {
        name: 'main',
        current: true,
        lastCommit: mainCommit,
        ahead: 0,
        behind: 0,
      },
    ];
  }

  static getCurrentBranch(): GitBranch {
    const branches = this.getAllBranches();
    return branches.find(b => b.current) || branches[0];
  }

  static async createBranch(name: string, fromBranch?: string): Promise<GitBranch> {
    const branches = this.getAllBranches();
    const sourceBranch = fromBranch
      ? branches.find(b => b.name === fromBranch)
      : this.getCurrentBranch();

    const newBranch: GitBranch = {
      name,
      current: false,
      lastCommit: sourceBranch!.lastCommit,
      ahead: 0,
      behind: 0,
    };

    branches.push(newBranch);
    localStorage.setItem(GIT_BRANCHES_KEY, JSON.stringify(branches));

    return newBranch;
  }

  static async switchBranch(name: string): Promise<void> {
    const branches = this.getAllBranches();
    branches.forEach(b => {
      b.current = b.name === name;
    });
    localStorage.setItem(GIT_BRANCHES_KEY, JSON.stringify(branches));
  }

  static getSyncStatus(): GitSyncStatus {
    const currentBranch = this.getCurrentBranch();
    const commits = this.getAllCommits();
    const branchCommits = commits.filter(c => c.branch === currentBranch.name);

    return {
      branch: currentBranch.name,
      ahead: currentBranch.ahead,
      behind: currentBranch.behind,
      hasUnpushedCommits: branchCommits.length > 0,
      hasUncommittedChanges: false, // Mock - would check actual git status
      lastSync: commits.length > 0 ? commits[0].date : null,
    };
  }

  static getCommitHistory(branch?: string, limit: number = 50): GitCommit[] {
    const commits = this.getAllCommits();
    const filtered = branch ? commits.filter(c => c.branch === branch) : commits;
    return filtered.slice(0, limit);
  }

  static async push(branch: string): Promise<void> {
    // Mock push operation
    await this.delay(1000);
  }

  static async pull(branch: string): Promise<void> {
    // Mock pull operation
    await this.delay(1000);
  }

  private static generateCommitHash(): string {
    return Array.from({ length: 40 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  private static createDefaultCommit(branch: string): GitCommit {
    const settings = this.getSettings();
    return {
      id: crypto.randomUUID(),
      hash: this.generateCommitHash(),
      message: 'Initial commit',
      author: settings.author.name,
      authorEmail: settings.author.email,
      date: new Date(),
      filesChanged: 0,
      insertions: 0,
      deletions: 0,
      branch,
    };
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
