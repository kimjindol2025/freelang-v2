/**
 * FreeLang Standard Library: std/stats
 *
 * Statistical calculations and analysis
 */

/**
 * Calculate sum of array
 * @param arr Array of numbers
 * @returns Sum
 */
export function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

/**
 * Calculate average (mean)
 * @param arr Array of numbers
 * @returns Mean value
 */
export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return sum(arr) / arr.length;
}

/**
 * Calculate median
 * @param arr Array of numbers
 * @returns Median value
 */
export function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate mode (most frequent value)
 * @param arr Array of numbers
 * @returns Mode value (or first if tie)
 */
export function mode(arr: number[]): number | null {
  if (arr.length === 0) return null;

  const freq = new Map<number, number>();
  for (const val of arr) {
    freq.set(val, (freq.get(val) || 0) + 1);
  }

  let maxFreq = 0;
  let modeVal: number | null = null;
  for (const [val, count] of freq.entries()) {
    if (count > maxFreq) {
      maxFreq = count;
      modeVal = val;
    }
  }

  return modeVal;
}

/**
 * Calculate variance
 * @param arr Array of numbers
 * @param sample If true, use sample variance; else population
 * @returns Variance
 */
export function variance(arr: number[], sample: boolean = false): number {
  if (arr.length === 0) return 0;

  const avg = mean(arr);
  const squaredDiffs = arr.map(x => Math.pow(x - avg, 2));
  const divisor = sample ? arr.length - 1 : arr.length;

  return sum(squaredDiffs) / divisor;
}

/**
 * Calculate standard deviation
 * @param arr Array of numbers
 * @param sample If true, use sample SD; else population
 * @returns Standard deviation
 */
export function stdDev(arr: number[], sample: boolean = false): number {
  return Math.sqrt(variance(arr, sample));
}

/**
 * Find minimum value
 * @param arr Array of numbers
 * @returns Minimum value
 */
export function min(arr: number[]): number {
  if (arr.length === 0) return Infinity;
  return Math.min(...arr);
}

/**
 * Find maximum value
 * @param arr Array of numbers
 * @returns Maximum value
 */
export function max(arr: number[]): number {
  if (arr.length === 0) return -Infinity;
  return Math.max(...arr);
}

/**
 * Calculate range (max - min)
 * @param arr Array of numbers
 * @returns Range
 */
export function range(arr: number[]): number {
  if (arr.length === 0) return 0;
  return max(arr) - min(arr);
}

/**
 * Calculate quartiles
 * @param arr Array of numbers
 * @returns Object with Q1, Q2 (median), Q3
 */
export function quartiles(arr: number[]): object {
  if (arr.length === 0) return { Q1: 0, Q2: 0, Q3: 0 };

  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;

  const q1Idx = Math.floor(n * 0.25);
  const q2Idx = Math.floor(n * 0.50);
  const q3Idx = Math.floor(n * 0.75);

  return {
    Q1: sorted[q1Idx],
    Q2: sorted[q2Idx],
    Q3: sorted[q3Idx]
  };
}

/**
 * Get summary statistics
 * @param arr Array of numbers
 * @returns Object with all statistics
 */
export function summary(arr: number[]): object {
  return {
    count: arr.length,
    sum: sum(arr),
    mean: mean(arr),
    median: median(arr),
    mode: mode(arr),
    min: min(arr),
    max: max(arr),
    range: range(arr),
    variance: variance(arr),
    stdDev: stdDev(arr),
    ...quartiles(arr)
  };
}
