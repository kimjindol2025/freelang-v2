/**
 * FreeLang v3.0 Performance Profiler
 *
 * Comprehensive profiling infrastructure for:
 * - Function call frequency and timing
 * - Memory allocation tracking
 * - Garbage collection monitoring
 *
 * Used to identify bottlenecks in VM execution
 */

export interface FunctionStat {
  count: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  avgTime?: number;
  stdDev?: number;
  callStack: string[];
}

export interface MemorySample {
  label: string;
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

export interface GCEvent {
  type: 'scavenge' | 'markSweepCompact' | 'incrementalMarking' | 'unknown';
  duration: number;
  timestamp: number;
  heapBefore: number;
  heapAfter: number;
}

/**
 * Function-level profiler
 * Tracks call counts, execution time, and timing statistics
 */
export class FunctionProfiler {
  private stats: Map<string, FunctionStat> = new Map();
  private callStack: string[] = [];
  private enabled: boolean = true;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  /**
   * Start profiling a function
   * @param fnName Function name
   * @returns Context object to pass to end()
   */
  start(fnName: string): { fnName: string; startTime: bigint; startStack: string[] } {
    if (!this.enabled) return { fnName, startTime: 0n, startStack: [] };

    this.callStack.push(fnName);
    return {
      fnName,
      startTime: process.hrtime.bigint(),
      startStack: [...this.callStack]
    };
  }

  /**
   * End profiling a function
   * @param ctx Context returned from start()
   */
  end(ctx: { fnName: string; startTime: bigint; startStack: string[] }): void {
    if (!this.enabled) return;

    const duration = Number(process.hrtime.bigint() - ctx.startTime) / 1e6; // Convert to ms

    if (!this.stats.has(ctx.fnName)) {
      this.stats.set(ctx.fnName, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: -Infinity,
        callStack: ctx.startStack
      });
    }

    const stat = this.stats.get(ctx.fnName)!;
    stat.count++;
    stat.totalTime += duration;
    stat.minTime = Math.min(stat.minTime, duration);
    stat.maxTime = Math.max(stat.maxTime, duration);

    // Calculate average and std dev
    stat.avgTime = stat.totalTime / stat.count;
    if (stat.count > 1) {
      // Simplified std dev calculation
      stat.stdDev = Math.sqrt(duration * duration / stat.count);
    }

    this.callStack.pop();
  }

  /**
   * Get statistics for a function
   */
  getStats(fnName: string): FunctionStat | undefined {
    return this.stats.get(fnName);
  }

  /**
   * Get all statistics sorted by total time (descending)
   */
  getAllStats(limit: number = Infinity): [string, FunctionStat][] {
    const sorted = Array.from(this.stats.entries())
      .sort((a, b) => b[1].totalTime - a[1].totalTime);
    return sorted.slice(0, limit);
  }

  /**
   * Generate performance report
   */
  report(topN: number = 10): string {
    const sorted = this.getAllStats(topN);

    let output = '=== Function Performance Report ===\n';
    output += `Total functions profiled: ${this.stats.size}\n`;
    output += `Top ${Math.min(topN, sorted.length)} slowest functions:\n\n`;

    sorted.forEach(([name, stat], idx) => {
      const avg = stat.avgTime?.toFixed(3) ?? 'N/A';
      const stdDev = stat.stdDev?.toFixed(3) ?? 'N/A';
      output += `${idx + 1}. ${name}\n`;
      output += `   Calls: ${stat.count}\n`;
      output += `   Total: ${stat.totalTime.toFixed(2)}ms\n`;
      output += `   Avg: ${avg}ms\n`;
      output += `   Min: ${stat.minTime.toFixed(3)}ms\n`;
      output += `   Max: ${stat.maxTime.toFixed(3)}ms\n`;
      output += `   StdDev: ${stdDev}ms\n\n`;
    });

    return output;
  }

  /**
   * Get report as JSON
   */
  toJSON(): Record<string, any> {
    const data: Record<string, any> = {};
    this.stats.forEach((stat, name) => {
      data[name] = {
        count: stat.count,
        totalTime: stat.totalTime.toFixed(2),
        avgTime: stat.avgTime?.toFixed(3),
        minTime: stat.minTime.toFixed(3),
        maxTime: stat.maxTime.toFixed(3),
        stdDev: stat.stdDev?.toFixed(3)
      };
    });
    return data;
  }

  /**
   * Reset all statistics
   */
  reset(): void {
    this.stats.clear();
    this.callStack = [];
  }

  /**
   * Enable/disable profiling
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

/**
 * Memory profiler
 * Tracks heap usage, external memory, and RSS over time
 */
export class MemoryProfiler {
  private snapshots: MemorySample[] = [];
  private enabled: boolean = true;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  /**
   * Take a memory snapshot
   */
  snapshot(label: string): MemorySample {
    if (!this.enabled) {
      return {
        label,
        timestamp: Date.now(),
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0
      };
    }

    const used = process.memoryUsage();
    const sample: MemorySample = {
      label,
      timestamp: Date.now(),
      heapUsed: used.heapUsed,
      heapTotal: used.heapTotal,
      external: used.external,
      rss: used.rss
    };

    this.snapshots.push(sample);
    return sample;
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): MemorySample[] {
    return [...this.snapshots];
  }

  /**
   * Get memory delta between two snapshots
   */
  getDelta(fromIdx: number, toIdx: number): Record<string, number> {
    if (fromIdx < 0 || toIdx >= this.snapshots.length || fromIdx >= toIdx) {
      return {};
    }

    const from = this.snapshots[fromIdx];
    const to = this.snapshots[toIdx];

    return {
      heapUsedDelta: (to.heapUsed - from.heapUsed) / 1024 / 1024, // MB
      heapTotalDelta: (to.heapTotal - from.heapTotal) / 1024 / 1024,
      externalDelta: (to.external - from.external) / 1024 / 1024,
      rssDelta: (to.rss - from.rss) / 1024 / 1024,
      timeDelta: to.timestamp - from.timestamp // ms
    };
  }

  /**
   * Generate memory report
   */
  report(): string {
    let output = '=== Memory Profile Report ===\n';
    output += `Total snapshots: ${this.snapshots.length}\n\n`;

    this.snapshots.forEach((snap, idx) => {
      const heapMB = (snap.heapUsed / 1024 / 1024).toFixed(2);
      const rssMB = (snap.rss / 1024 / 1024).toFixed(2);
      output += `${idx + 1}. ${snap.label}\n`;
      output += `   Heap Used: ${heapMB}MB\n`;
      output += `   RSS: ${rssMB}MB\n`;
      output += `   External: ${(snap.external / 1024 / 1024).toFixed(2)}MB\n`;

      if (idx > 0) {
        const delta = this.getDelta(idx - 1, idx);
        output += `   Delta from prev: +${delta.heapUsedDelta?.toFixed(2)}MB heap\n`;
      }
      output += '\n';
    });

    return output;
  }

  /**
   * Reset all snapshots
   */
  reset(): void {
    this.snapshots = [];
  }

  /**
   * Enable/disable profiling
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

/**
 * Garbage Collection monitor
 * Tracks GC events and their impact on performance
 */
export class GCProfiler {
  private gcEvents: GCEvent[] = [];
  private enabled: boolean = true;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  /**
   * Record a GC event
   */
  recordGC(type: GCEvent['type'], duration: number, heapBefore: number, heapAfter: number): void {
    if (!this.enabled) return;

    this.gcEvents.push({
      type,
      duration,
      timestamp: Date.now(),
      heapBefore,
      heapAfter
    });
  }

  /**
   * Get all GC events
   */
  getEvents(): GCEvent[] {
    return [...this.gcEvents];
  }

  /**
   * Get GC statistics
   */
  getStats(): Record<string, any> {
    const byType: Record<string, { count: number; totalDuration: number; avgDuration: number }> = {};

    this.gcEvents.forEach((ev) => {
      if (!byType[ev.type]) {
        byType[ev.type] = { count: 0, totalDuration: 0, avgDuration: 0 };
      }
      byType[ev.type].count++;
      byType[ev.type].totalDuration += ev.duration;
    });

    Object.values(byType).forEach((stat) => {
      stat.avgDuration = stat.totalDuration / stat.count;
    });

    return byType;
  }

  /**
   * Generate GC report
   */
  report(): string {
    const stats = this.getStats();

    let output = '=== Garbage Collection Report ===\n';
    output += `Total GC events: ${this.gcEvents.length}\n\n`;

    Object.entries(stats).forEach(([type, stat]) => {
      output += `${type}:\n`;
      output += `   Count: ${stat.count}\n`;
      output += `   Total Duration: ${stat.totalDuration.toFixed(2)}ms\n`;
      output += `   Avg Duration: ${stat.avgDuration.toFixed(3)}ms\n\n`;
    });

    const totalGCTime = Object.values(stats).reduce((sum: number, s: any) => sum + s.totalDuration, 0);
    output += `Total GC Time: ${totalGCTime.toFixed(2)}ms\n`;

    return output;
  }

  /**
   * Reset all events
   */
  reset(): void {
    this.gcEvents = [];
  }

  /**
   * Enable/disable profiling
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

/**
 * Unified profiler combining all three profilers
 */
export class UnifiedProfiler {
  public functionProfiler: FunctionProfiler;
  public memoryProfiler: MemoryProfiler;
  public gcProfiler: GCProfiler;
  private startTime: number = 0;
  private endTime: number = 0;

  constructor(enabled: boolean = true) {
    this.functionProfiler = new FunctionProfiler(enabled);
    this.memoryProfiler = new MemoryProfiler(enabled);
    this.gcProfiler = new GCProfiler(enabled);
    this.startTime = Date.now();
  }

  /**
   * Start profiling session
   */
  start(): void {
    this.startTime = Date.now();
    this.memoryProfiler.snapshot('session_start');
  }

  /**
   * End profiling session
   */
  end(): void {
    this.endTime = Date.now();
    this.memoryProfiler.snapshot('session_end');
  }

  /**
   * Get total elapsed time
   */
  getElapsedTime(): number {
    return this.endTime - this.startTime;
  }

  /**
   * Generate comprehensive report
   */
  report(topFunctions: number = 10): string {
    let output = '==============================================\n';
    output += '   FreeLang v3.0 Unified Performance Report\n';
    output += '==============================================\n\n';

    output += `Session Duration: ${this.getElapsedTime()}ms\n\n`;

    output += this.functionProfiler.report(topFunctions);
    output += '\n' + this.memoryProfiler.report();
    output += '\n' + this.gcProfiler.report();

    return output;
  }

  /**
   * Get report as JSON
   */
  toJSON(): Record<string, any> {
    return {
      sessionDuration: this.getElapsedTime(),
      functions: this.functionProfiler.toJSON(),
      memory: {
        snapshots: this.memoryProfiler.getSnapshots()
      },
      gc: {
        stats: this.gcProfiler.getStats(),
        events: this.gcProfiler.getEvents()
      }
    };
  }

  /**
   * Reset all profilers
   */
  reset(): void {
    this.functionProfiler.reset();
    this.memoryProfiler.reset();
    this.gcProfiler.reset();
  }

  /**
   * Enable/disable all profilers
   */
  setEnabled(enabled: boolean): void {
    this.functionProfiler.setEnabled(enabled);
    this.memoryProfiler.setEnabled(enabled);
    this.gcProfiler.setEnabled(enabled);
  }
}

// Export singleton instance
export const globalProfiler = new UnifiedProfiler(true);
