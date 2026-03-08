/**
 * FreeLang v3.0 Performance Analyzer
 *
 * Analyzes profiling data to:
 * 1. Identify bottleneck functions
 * 2. Calculate performance hotspots
 * 3. Recommend optimization strategies
 * 4. Track improvement over iterations
 */

import { FunctionProfiler, MemoryProfiler, GCProfiler, UnifiedProfiler } from './profiler';
import * as fs from 'fs';
import * as path from 'path';

export interface BottleneckAnalysis {
  rank: number;
  functionName: string;
  totalTime: number;
  percentage: number;
  callCount: number;
  recommendation: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface PerformanceReport {
  timestamp: Date;
  totalFunctions: number;
  topBottlenecks: BottleneckAnalysis[];
  memoryTrend: string;
  gcImpact: number;
  recommendedActions: string[];
}

/**
 * Analyzes function profiler data to identify bottlenecks
 */
export class PerformanceAnalyzer {
  constructor(private profiler: UnifiedProfiler) {}

  /**
   * Analyze function execution and identify bottlenecks
   */
  analyzeBottlenecks(topN: number = 10): BottleneckAnalysis[] {
    const sorted = this.profiler.functionProfiler.getAllStats(topN);

    if (sorted.length === 0) {
      return [];
    }

    // Calculate total time for percentage calculation
    const totalTime = sorted.reduce((sum, [, stat]) => sum + stat.totalTime, 0);

    const analysis: BottleneckAnalysis[] = sorted.map(([name, stat], idx) => {
      const percentage = (stat.totalTime / totalTime) * 100;
      const priority = this.determinePriority(percentage, stat.count, stat.avgTime ?? 0);
      const recommendation = this.generateRecommendation(name, stat, percentage);

      return {
        rank: idx + 1,
        functionName: name,
        totalTime: stat.totalTime,
        percentage,
        callCount: stat.count,
        recommendation,
        priority
      };
    });

    return analysis;
  }

  /**
   * Determine optimization priority based on metrics
   */
  private determinePriority(
    percentage: number,
    callCount: number,
    avgTime: number
  ): 'critical' | 'high' | 'medium' | 'low' {
    // Critical: >20% of total time
    if (percentage > 20) return 'critical';

    // High: 10-20% of total time OR called >10K times with avg >0.1ms
    if (percentage > 10 || (callCount > 10000 && avgTime > 0.1)) return 'high';

    // Medium: 5-10% of total time
    if (percentage > 5) return 'medium';

    return 'low';
  }

  /**
   * Generate optimization recommendation based on function characteristics
   */
  private generateRecommendation(name: string, stat: any, percentage: number): string {
    const callCount = stat.count;
    const avgTime = stat.avgTime ?? 0;

    // High call frequency with low avg time = caching opportunity
    if (callCount > 100000 && avgTime < 0.5) {
      return 'Consider memoization or caching for frequent small calls';
    }

    // Single slow call = algorithm optimization needed
    if (callCount === 1 && avgTime > 100) {
      return 'Single slow execution; optimize algorithm or reduce problem size';
    }

    // Many medium-length calls = reduce call overhead
    if (callCount > 1000 && avgTime > 1) {
      return 'High call count with significant avg time; reduce recursion depth or inline hot loops';
    }

    // Recursive function taking significant time
    if (name.includes('fib') || name.includes('recursive')) {
      return 'Recursive function detected; use iteration or memoization';
    }

    return 'Profile-guided optimization opportunity';
  }

  /**
   * Analyze memory trends
   */
  analyzeMemoryTrend(): string {
    const snapshots = this.profiler.memoryProfiler.getSnapshots();

    if (snapshots.length < 2) {
      return 'Insufficient memory snapshots for trend analysis';
    }

    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];

    const heapDelta = (last.heapUsed - first.heapUsed) / 1024 / 1024; // MB
    const rssDelta = (last.rss - first.rss) / 1024 / 1024; // MB

    if (heapDelta > 50) {
      return `⚠️  Significant heap growth: +${heapDelta.toFixed(1)}MB (potential memory leak)`;
    } else if (heapDelta > 10) {
      return `📈 Moderate heap growth: +${heapDelta.toFixed(1)}MB`;
    } else if (heapDelta < -10) {
      return `📉 Heap reduction: ${heapDelta.toFixed(1)}MB`;
    } else {
      return `✓ Stable memory usage: ${heapDelta > 0 ? '+' : ''}${heapDelta.toFixed(1)}MB`;
    }
  }

  /**
   * Calculate GC impact on performance
   */
  analyzeGCImpact(): number {
    const gcStats = this.profiler.gcProfiler.getStats();
    let totalGCTime = 0;

    for (const stat of Object.values(gcStats)) {
      totalGCTime += (stat as any).totalDuration ?? 0;
    }

    return totalGCTime;
  }

  /**
   * Generate comprehensive performance report
   */
  generateReport(): PerformanceReport {
    const bottlenecks = this.analyzeBottlenecks(10);
    const memoryTrend = this.analyzeMemoryTrend();
    const gcImpact = this.analyzeGCImpact();

    const recommendedActions: string[] = [];

    // Generate recommendations based on analysis
    if (bottlenecks.length > 0) {
      const topBottleneck = bottlenecks[0];
      if (topBottleneck.priority === 'critical') {
        recommendedActions.push(`1. URGENT: Optimize ${topBottleneck.functionName} (${topBottleneck.percentage.toFixed(1)}% of execution time)`);
      }
    }

    if (gcImpact > 100) {
      recommendedActions.push(`2. GC pause time is significant (${gcImpact.toFixed(0)}ms); consider optimizing memory allocation`);
    }

    if (memoryTrend.includes('leak')) {
      recommendedActions.push('3. Investigate potential memory leak');
    }

    if (bottlenecks.some((b) => b.functionName.includes('fib'))) {
      recommendedActions.push('4. Fibonacci implementation is a bottleneck; use memoization or iteration');
    }

    return {
      timestamp: new Date(),
      totalFunctions: this.profiler.functionProfiler.getAllStats().length,
      topBottlenecks: bottlenecks,
      memoryTrend,
      gcImpact,
      recommendedActions
    };
  }

  /**
   * Display analysis report to console
   */
  displayReport(): void {
    const report = this.generateReport();

    console.log('\n=====================================');
    console.log('Performance Analysis Report');
    console.log('=====================================\n');

    console.log(`Generated: ${report.timestamp.toISOString()}`);
    console.log(`Total functions profiled: ${report.totalFunctions}\n`);

    console.log('Top 10 Bottlenecks:');
    console.log('-------------------');

    report.topBottlenecks.forEach((bottleneck) => {
      const priorityEmoji =
        bottleneck.priority === 'critical'
          ? '🔴'
          : bottleneck.priority === 'high'
            ? '🟠'
            : bottleneck.priority === 'medium'
              ? '🟡'
              : '🟢';

      console.log(`\n${priorityEmoji} [${bottleneck.priority.toUpperCase()}] ${bottleneck.rank}. ${bottleneck.functionName}`);
      console.log(`   Total Time: ${bottleneck.totalTime.toFixed(2)}ms (${bottleneck.percentage.toFixed(1)}%)`);
      console.log(`   Call Count: ${bottleneck.callCount}`);
      console.log(`   Recommendation: ${bottleneck.recommendation}`);
    });

    console.log('\n\nMemory Analysis:');
    console.log('----------------');
    console.log(report.memoryTrend);

    console.log('\n\nGarbage Collection:');
    console.log('-------------------');
    console.log(`Total GC pause time: ${report.gcImpact.toFixed(2)}ms`);

    console.log('\n\nRecommended Actions:');
    console.log('--------------------');
    if (report.recommendedActions.length > 0) {
      report.recommendedActions.forEach((action) => {
        console.log(`${action}`);
      });
    } else {
      console.log('No critical issues detected');
    }

    console.log('\n');
  }

  /**
   * Save report to JSON file
   */
  saveReport(filepath: string): void {
    const report = this.generateReport();
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`Report saved to: ${filepath}`);
  }
}

/**
 * Compares performance between two runs
 */
export class PerformanceComparison {
  private baseline: PerformanceReport | null = null;
  private current: PerformanceReport | null = null;

  /**
   * Load baseline report from file
   */
  loadBaseline(filepath: string): void {
    const data = fs.readFileSync(filepath, 'utf-8');
    this.baseline = JSON.parse(data);
  }

  /**
   * Set current report
   */
  setCurrent(report: PerformanceReport): void {
    this.current = report;
  }

  /**
   * Compare baseline and current
   */
  compare(): Record<string, any> {
    if (!this.baseline || !this.current) {
      throw new Error('Missing baseline or current report');
    }

    const improvement: Record<string, any> = {
      timestamp: new Date().toISOString(),
      baseline: this.baseline.timestamp,
      current: this.current.timestamp
    };

    // Compare GC impact
    const gcImprovement = ((this.baseline.gcImpact - this.current.gcImpact) / this.baseline.gcImpact) * 100;
    improvement.gcImprovementPercent = gcImprovement;

    // Compare top bottleneck
    if (this.baseline.topBottlenecks.length > 0 && this.current.topBottlenecks.length > 0) {
      const baselineTop = this.baseline.topBottlenecks[0];
      const currentTop = this.current.topBottlenecks[0];

      improvement.topBottleneckImprovement = {
        name: currentTop.functionName,
        baseline: baselineTop.totalTime,
        current: currentTop.totalTime,
        improvementPercent: ((baselineTop.totalTime - currentTop.totalTime) / baselineTop.totalTime) * 100
      };
    }

    return improvement;
  }
}

// Export default analyzer instance
export function createAnalyzer(profiler: UnifiedProfiler): PerformanceAnalyzer {
  return new PerformanceAnalyzer(profiler);
}
