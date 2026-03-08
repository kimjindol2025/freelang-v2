/**
 * FreeLang v2 Hotspot Detection
 * Phase 4: JIT 기초 - 함수 호출 빈도 분석
 */

export interface FunctionCallStats {
  name: string;
  callCount: number;
  totalTime: number;
  avgTime: number;
  isHot: boolean;
  lastCalled: number;
}

export class HotspotDetector {
  private callCounts: Map<string, number> = new Map();
  private executionTimes: Map<string, number[]> = new Map();
  private lastCallTimes: Map<string, number> = new Map();

  private readonly HOT_THRESHOLD = 100;
  private readonly VERY_HOT_THRESHOLD = 1000;
  private readonly WINDOW_SIZE = 100;

  trackCall(funcName: string, executionTime: number = 0): void {
    const count = (this.callCounts.get(funcName) || 0) + 1;
    this.callCounts.set(funcName, count);
    this.lastCallTimes.set(funcName, Date.now());

    if (executionTime > 0) {
      const times = this.executionTimes.get(funcName) || [];
      times.push(executionTime);
      if (times.length > this.WINDOW_SIZE) {
        times.shift();
      }
      this.executionTimes.set(funcName, times);
    }
  }

  isHot(funcName: string): boolean {
    const count = this.callCounts.get(funcName) || 0;
    return count >= this.HOT_THRESHOLD;
  }

  isVeryHot(funcName: string): boolean {
    const count = this.callCounts.get(funcName) || 0;
    return count >= this.VERY_HOT_THRESHOLD;
  }

  getHotFunctions(): string[] {
    const hot: string[] = [];
    for (const [name, count] of this.callCounts.entries()) {
      if (count >= this.HOT_THRESHOLD) {
        hot.push(name);
      }
    }
    return hot.sort((a, b) => {
      const countA = this.callCounts.get(a) || 0;
      const countB = this.callCounts.get(b) || 0;
      return countB - countA;
    });
  }

  getVeryHotFunctions(): string[] {
    const veryHot: string[] = [];
    for (const [name, count] of this.callCounts.entries()) {
      if (count >= this.VERY_HOT_THRESHOLD) {
        veryHot.push(name);
      }
    }
    return veryHot.sort((a, b) => {
      const countA = this.callCounts.get(a) || 0;
      const countB = this.callCounts.get(b) || 0;
      return countB - countA;
    });
  }

  getStats(funcName: string): FunctionCallStats {
    const callCount = this.callCounts.get(funcName) || 0;
    const times = this.executionTimes.get(funcName) || [];
    const totalTime = times.reduce((a, b) => a + b, 0);
    const avgTime = times.length > 0 ? totalTime / times.length : 0;
    const lastCalled = this.lastCallTimes.get(funcName) || 0;

    return {
      name: funcName,
      callCount,
      totalTime,
      avgTime,
      isHot: callCount >= this.HOT_THRESHOLD,
      lastCalled
    };
  }

  getAllStats(): FunctionCallStats[] {
    const stats: FunctionCallStats[] = [];
    for (const [name] of this.callCounts.entries()) {
      stats.push(this.getStats(name));
    }
    return stats.sort((a, b) => b.callCount - a.callCount);
  }

  generateReport(): string {
    const hotFunctions = this.getHotFunctions();
    const veryHotFunctions = this.getVeryHotFunctions();

    let report = '\n═══════════════════════════════════════════════════════\n';
    report += 'JIT Hotspot Detection Report\n';
    report += '═══════════════════════════════════════════════════════\n';

    if (hotFunctions.length === 0) {
      report += '✅ No hot functions detected.\n';
      return report;
    }

    report += `\n🔴 Very Hot Functions (${this.VERY_HOT_THRESHOLD}+ calls):\n`;
    if (veryHotFunctions.length === 0) {
      report += '  (none)\n';
    } else {
      for (const name of veryHotFunctions) {
        const stats = this.getStats(name);
        report += `  • ${name}: ${stats.callCount} calls, avg ${stats.avgTime.toFixed(2)}ms\n`;
      }
    }

    report += `\n🟡 Hot Functions (${this.HOT_THRESHOLD}+ calls):\n`;
    const remaining = hotFunctions.filter(f => !veryHotFunctions.includes(f));
    if (remaining.length === 0) {
      report += '  (none)\n';
    } else {
      for (const name of remaining.slice(0, 10)) {
        const stats = this.getStats(name);
        report += `  • ${name}: ${stats.callCount} calls, avg ${stats.avgTime.toFixed(2)}ms\n`;
      }
      if (remaining.length > 10) {
        report += `  ... and ${remaining.length - 10} more\n`;
      }
    }

    report += `\n📊 Total unique functions: ${this.callCounts.size}\n`;
    const totalCalls = Array.from(this.callCounts.values()).reduce((a, b) => a + b, 0);
    report += `📊 Total function calls: ${totalCalls}\n`;

    report += '═══════════════════════════════════════════════════════\n';

    return report;
  }

  getOptimizationHints(): string[] {
    return this.getVeryHotFunctions();
  }

  reset(): void {
    this.callCounts.clear();
    this.executionTimes.clear();
    this.lastCallTimes.clear();
  }
}

const globalDetector = new HotspotDetector();

export { globalDetector };

export function trackFunctionCall(funcName: string, executionTime?: number): void {
  globalDetector.trackCall(funcName, executionTime);
}

export function isHotFunction(funcName: string): boolean {
  return globalDetector.isHot(funcName);
}

export function getHotFunctions(): string[] {
  return globalDetector.getHotFunctions();
}

export function generateHotspotReport(): string {
  return globalDetector.generateReport();
}
