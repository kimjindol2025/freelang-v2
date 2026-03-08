/**
 * FreeLang Standard Library: std/bench
 *
 * Benchmarking utilities
 */

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number; // milliseconds
  avgTime: number; // milliseconds
  opsPerSec: number;
  minTime: number;
  maxTime: number;
}

/**
 * Run benchmark
 * @param name Benchmark name
 * @param fn Function to benchmark
 * @param iterations Number of iterations
 * @returns Benchmark result
 */
export function bench(name: string, fn: () => void, iterations: number = 1000): BenchmarkResult {
  const times: number[] = [];
  let totalTime = 0;

  // Warmup
  for (let i = 0; i < 10; i++) {
    fn();
  }

  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    const time = end - start;
    times.push(time);
    totalTime += time;
  }

  const avgTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const opsPerSec = (iterations / totalTime) * 1000;

  return {
    name,
    iterations,
    totalTime,
    avgTime,
    opsPerSec,
    minTime,
    maxTime
  };
}

/**
 * Format benchmark result for display
 * @param result Benchmark result
 * @returns Formatted string
 */
export function format(result: BenchmarkResult): string {
  return `${result.name}: ${result.avgTime.toFixed(3)}ms (${Math.round(result.opsPerSec).toLocaleString()} ops/sec)`;
}

/**
 * Compare two benchmark results
 * @param a First result
 * @param b Second result
 * @returns Comparison object
 */
export function compare(a: BenchmarkResult, b: BenchmarkResult): object {
  const ratio = b.avgTime / a.avgTime;
  const faster = ratio > 1 ? b.name : a.name;
  const percent = Math.abs((ratio - 1) * 100).toFixed(1);

  return {
    faster,
    ratio: ratio.toFixed(2),
    percent: `${percent}%`
  };
}

/**
 * Run multiple benchmarks and compare
 * @param benchmarks Object with name -> function mapping
 * @param iterations Iterations per benchmark
 * @returns Array of results sorted by speed
 */
export function suite(
  benchmarks: Record<string, () => void>,
  iterations: number = 1000
): BenchmarkResult[] {
  const results = Object.entries(benchmarks).map(([name, fn]) => {
    return bench(name, fn, iterations);
  });

  // Sort by ops/sec descending
  return results.sort((a, b) => b.opsPerSec - a.opsPerSec);
}
