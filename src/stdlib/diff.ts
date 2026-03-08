/**
 * FreeLang Standard Library: std/diff
 *
 * String and text comparison utilities
 */

export interface DiffMatch {
  type: 'insert' | 'delete' | 'equal';
  value: string;
}

/**
 * Calculate Levenshtein distance between two strings
 * @param a First string
 * @param b Second string
 * @returns Edit distance
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity between two strings (0-1)
 * @param a First string
 * @param b Second string
 * @returns Similarity ratio
 */
export function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  const distance = levenshtein(a, b);
  return 1 - distance / maxLen;
}

/**
 * Simple diff using longest common subsequence
 * @param a First string
 * @param b Second string
 * @returns Array of diff matches
 */
export function simpleDiff(a: string, b: string): DiffMatch[] {
  const result: DiffMatch[] = [];

  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      result.push({ type: 'equal', value: a[i] });
      i++;
      j++;
    } else {
      // Try to find matching character
      let foundInB = -1;
      for (let k = j + 1; k < b.length; k++) {
        if (b[k] === a[i]) {
          foundInB = k;
          break;
        }
      }

      if (foundInB !== -1) {
        for (let k = j; k < foundInB; k++) {
          result.push({ type: 'insert', value: b[k] });
        }
        j = foundInB;
      } else {
        result.push({ type: 'delete', value: a[i] });
        i++;
      }
    }
  }

  // Remaining characters
  while (i < a.length) {
    result.push({ type: 'delete', value: a[i] });
    i++;
  }

  while (j < b.length) {
    result.push({ type: 'insert', value: b[j] });
    j++;
  }

  return result;
}

/**
 * Diff two strings line by line
 * @param aLines First string lines
 * @param bLines Second string lines
 * @returns Array of line diffs
 */
export function lineDiff(aLines: string[], bLines: string[]): DiffMatch[] {
  const result: DiffMatch[] = [];

  let i = 0;
  let j = 0;

  while (i < aLines.length && j < bLines.length) {
    if (aLines[i] === bLines[j]) {
      result.push({ type: 'equal', value: aLines[i] });
      i++;
      j++;
    } else {
      result.push({ type: 'delete', value: aLines[i] });
      result.push({ type: 'insert', value: bLines[j] });
      i++;
      j++;
    }
  }

  while (i < aLines.length) {
    result.push({ type: 'delete', value: aLines[i] });
    i++;
  }

  while (j < bLines.length) {
    result.push({ type: 'insert', value: bLines[j] });
    j++;
  }

  return result;
}

/**
 * Check if two strings are equal (case insensitive)
 * @param a First string
 * @param b Second string
 * @returns true if equal
 */
export function equalsIgnoreCase(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Check if two strings are similar (above threshold)
 * @param a First string
 * @param b Second string
 * @param threshold Similarity threshold (0-1)
 * @returns true if similar
 */
export function isSimilar(a: string, b: string, threshold: number = 0.8): boolean {
  return similarity(a, b) >= threshold;
}

/**
 * Get common characters between two strings
 * @param a First string
 * @param b Second string
 * @returns String of common characters
 */
export function commonCharacters(a: string, b: string): string {
  const aSet = new Set(a);
  const common: string[] = [];

  for (const char of b) {
    if (aSet.has(char) && !common.includes(char)) {
      common.push(char);
    }
  }

  return common.join('');
}
