import { VersionDiff } from '@/lib/types/version-history';

/**
 * Simple word-level diff algorithm
 * Compares two strings and returns an array of diff objects
 */
export function computeDiff(oldText: string, newText: string): VersionDiff[] {
  if (!oldText && !newText) return [];
  if (!oldText) return [{ type: 'addition', value: newText }];
  if (!newText) return [{ type: 'deletion', value: oldText }];

  const oldWords = oldText.split(/(\s+)/); // Include whitespace in splits
  const newWords = newText.split(/(\s+)/);

  const diff: VersionDiff[] = [];

  // Simple LCS-based diff
  const lcs = longestCommonSubsequence(oldWords, newWords);

  let oldIndex = 0;
  let newIndex = 0;
  let lcsIndex = 0;

  while (oldIndex < oldWords.length || newIndex < newWords.length) {
    if (lcsIndex < lcs.length && oldIndex < oldWords.length && oldWords[oldIndex] === lcs[lcsIndex]) {
      // Unchanged
      diff.push({ type: 'unchanged', value: oldWords[oldIndex] });
      oldIndex++;
      newIndex++;
      lcsIndex++;
    } else if (lcsIndex < lcs.length && newIndex < newWords.length && newWords[newIndex] === lcs[lcsIndex]) {
      // Unchanged
      diff.push({ type: 'unchanged', value: newWords[newIndex] });
      oldIndex++;
      newIndex++;
      lcsIndex++;
    } else if (newIndex < newWords.length && (lcsIndex >= lcs.length || newWords[newIndex] !== lcs[lcsIndex])) {
      // Addition
      diff.push({ type: 'addition', value: newWords[newIndex] });
      newIndex++;
    } else if (oldIndex < oldWords.length) {
      // Deletion
      diff.push({ type: 'deletion', value: oldWords[oldIndex] });
      oldIndex++;
    }
  }

  return mergeContinuousDiffs(diff);
}

/**
 * Merge continuous diffs of the same type for better readability
 */
function mergeContinuousDiffs(diffs: VersionDiff[]): VersionDiff[] {
  if (diffs.length === 0) return diffs;

  const merged: VersionDiff[] = [];
  let current = diffs[0];

  for (let i = 1; i < diffs.length; i++) {
    if (diffs[i].type === current.type) {
      current = {
        type: current.type,
        value: current.value + diffs[i].value,
      };
    } else {
      merged.push(current);
      current = diffs[i];
    }
  }

  merged.push(current);
  return merged;
}

/**
 * Longest Common Subsequence algorithm
 * Used to find common parts between two arrays
 */
function longestCommonSubsequence(arr1: string[], arr2: string[]): string[] {
  const m = arr1.length;
  const n = arr2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find the LCS
  const lcs: string[] = [];
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (arr1[i - 1] === arr2[j - 1]) {
      lcs.unshift(arr1[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

/**
 * Calculate percentage of change between two texts
 */
export function calculateChangePercentage(oldText: string, newText: string): number {
  if (!oldText && !newText) return 0;
  if (!oldText || !newText) return 100;

  const diff = computeDiff(oldText, newText);
  const totalParts = diff.length;
  const changedParts = diff.filter(d => d.type !== 'unchanged').length;

  return Math.round((changedParts / totalParts) * 100);
}
