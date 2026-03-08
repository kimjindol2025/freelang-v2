/**
 * FreeLang v2 Phase 5: Dynamic Optimizer
 * Module A: Runtime Profiler
 *
 * 목적: 런타임 메트릭 수집 및 핫스팟 감지
 */

export interface RuntimeMetrics {
  functionName: string;
  callCount: number;
  totalTime: number; // ms
  avgTime: number; // ms
  p95Time: number; // ms
  p99Time: number; // ms
  minTime: number;
  maxTime: number;
  memoryUsage: number; // bytes
  cacheHitRate: number; // 0-1
  errorRate: number; // 0-1
  lastCalledAt: number; // timestamp
  firstCalledAt: number;
}

export interface HotSpot {
  functionName: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  impact: number; // 0-100
  suggestedOptimization: OptimizationType;
  metrics: RuntimeMetrics;
}

export type OptimizationType = 'memoize' | 'parallelize' | 'batch' | 'jit-hint' | 'none';

interface CallRecord {
  duration: number;
  timestamp: number;
  memoryDelta: number;
}

/**
 * 런타임 메트릭 수집 및 분석기
 * - 함수 호출 추적
 * - 성능 메트릭 계산
 * - 핫스팟 감지
 */
export class DynamicProfiler {
  private metricsMap: Map<string, RuntimeMetrics> = new Map();
  private callHistory: Map<string, CallRecord[]> = new Map();
  private startTime: number = Date.now();
  private sessionDuration: number = 0;

  constructor(private sessionId: string = `prof-${Date.now()}`) {
    this.startTime = Date.now();
  }

  /**
   * 함수 호출 기록
   */
  recordCall(
    functionName: string,
    duration: number,
    memoryDelta: number = 0,
    cacheHit: boolean = false,
    hadError: boolean = false
  ): void {
    const timestamp = Date.now();
    const now = Date.now();

    // 호출 이력 저장
    if (!this.callHistory.has(functionName)) {
      this.callHistory.set(functionName, []);
    }
    this.callHistory.get(functionName)!.push({
      duration,
      timestamp,
      memoryDelta,
    });

    // 메트릭 업데이트
    let metrics = this.metricsMap.get(functionName);
    if (!metrics) {
      metrics = {
        functionName,
        callCount: 0,
        totalTime: 0,
        avgTime: 0,
        p95Time: 0,
        p99Time: 0,
        minTime: Infinity,
        maxTime: 0,
        memoryUsage: 0,
        cacheHitRate: 0,
        errorRate: 0,
        lastCalledAt: now,
        firstCalledAt: now,
      };
      this.metricsMap.set(functionName, metrics);
    }

    metrics.callCount++;
    metrics.totalTime += duration;
    metrics.avgTime = metrics.totalTime / metrics.callCount;
    metrics.minTime = Math.min(metrics.minTime, duration);
    metrics.maxTime = Math.max(metrics.maxTime, duration);
    metrics.memoryUsage += memoryDelta;
    metrics.lastCalledAt = now;

    // 캐시 히트율 계산
    if (cacheHit) {
      metrics.cacheHitRate = (metrics.cacheHitRate * (metrics.callCount - 1) + 1) / metrics.callCount;
    } else {
      metrics.cacheHitRate = (metrics.cacheHitRate * (metrics.callCount - 1)) / metrics.callCount;
    }

    // 에러율 계산
    if (hadError) {
      metrics.errorRate = (metrics.errorRate * (metrics.callCount - 1) + 1) / metrics.callCount;
    } else {
      metrics.errorRate = (metrics.errorRate * (metrics.callCount - 1)) / metrics.callCount;
    }

    this.sessionDuration = Date.now() - this.startTime;
  }

  /**
   * 백분위수 계산
   */
  private calculatePercentile(durations: number[], percentile: number): number {
    if (durations.length === 0) return 0;
    const sorted = [...durations].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * 모든 함수의 메트릭 업데이트 (백분위수 포함)
   */
  private updatePercentiles(): void {
    for (const [functionName, records] of this.callHistory.entries()) {
      const durations = records.map(r => r.duration);
      const metrics = this.metricsMap.get(functionName)!;
      metrics.p95Time = this.calculatePercentile(durations, 95);
      metrics.p99Time = this.calculatePercentile(durations, 99);
    }
  }

  /**
   * 핫스팟 감지
   */
  detectHotSpots(topN: number = 10): HotSpot[] {
    this.updatePercentiles();

    const hotspots: HotSpot[] = [];
    const avgMetrics = Array.from(this.metricsMap.values());

    if (avgMetrics.length === 0) return [];

    // 평균 성능 계산
    const avgTotalTime = avgMetrics.reduce((sum, m) => sum + m.totalTime, 0) / avgMetrics.length;
    const avgCallCount = avgMetrics.reduce((sum, m) => sum + m.callCount, 0) / avgMetrics.length;

    // 각 함수의 영향도 계산
    for (const metrics of avgMetrics) {
      const timeImpact = (metrics.totalTime / avgTotalTime) * 100;
      const frequencyImpact = (metrics.callCount / avgCallCount) * 100;
      const impact = (timeImpact * 0.6 + frequencyImpact * 0.4);

      let severity: HotSpot['severity'] = 'low';
      let reason = '';
      let suggestedOptimization: OptimizationType = 'none';

      if (impact >= 75) {
        severity = 'critical';
        reason = `Critical hotspot: ${impact.toFixed(1)}% total impact`;
        if (metrics.avgTime > 100) {
          suggestedOptimization = 'parallelize';
        } else {
          suggestedOptimization = 'memoize';
        }
      } else if (impact >= 50) {
        severity = 'high';
        reason = `High impact function: ${impact.toFixed(1)}% impact`;
        suggestedOptimization = metrics.callCount > 1000 ? 'batch' : 'memoize';
      } else if (impact >= 25) {
        severity = 'medium';
        reason = `Moderate impact: ${impact.toFixed(1)}% impact`;
        suggestedOptimization = 'jit-hint';
      } else {
        severity = 'low';
        reason = `Low impact function`;
      }

      if (impact > 0) {
        hotspots.push({
          functionName: metrics.functionName,
          severity,
          reason,
          impact: Math.min(100, impact),
          suggestedOptimization,
          metrics,
        });
      }
    }

    // 영향도 기준 정렬
    hotspots.sort((a, b) => b.impact - a.impact);
    return hotspots.slice(0, topN);
  }

  /**
   * 특정 함수의 메트릭 조회
   */
  getMetrics(functionName: string): RuntimeMetrics | null {
    return this.metricsMap.get(functionName) || null;
  }

  /**
   * 모든 함수의 메트릭 조회
   */
  getAllMetrics(): RuntimeMetrics[] {
    this.updatePercentiles();
    return Array.from(this.metricsMap.values());
  }

  /**
   * 가장 느린 함수들 조회
   */
  getTopSlowFunctions(limit: number = 10): RuntimeMetrics[] {
    this.updatePercentiles();
    return Array.from(this.metricsMap.values())
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, limit);
  }

  /**
   * 가장 자주 호출되는 함수들 조회
   */
  getTopFrequentFunctions(limit: number = 10): RuntimeMetrics[] {
    return Array.from(this.metricsMap.values())
      .sort((a, b) => b.callCount - a.callCount)
      .slice(0, limit);
  }

  /**
   * 가장 메모리 사용이 많은 함수들
   */
  getTopMemoryFunctions(limit: number = 10): RuntimeMetrics[] {
    return Array.from(this.metricsMap.values())
      .sort((a, b) => b.memoryUsage - a.memoryUsage)
      .slice(0, limit);
  }

  /**
   * 캐시 효율이 낮은 함수들
   */
  getLowCacheHitFunctions(threshold: number = 0.3, limit: number = 10): RuntimeMetrics[] {
    return Array.from(this.metricsMap.values())
      .filter(m => m.cacheHitRate < threshold && m.callCount > 10)
      .sort((a, b) => a.cacheHitRate - b.cacheHitRate)
      .slice(0, limit);
  }

  /**
   * 에러율이 높은 함수들
   */
  getHighErrorFunctions(threshold: number = 0.05, limit: number = 10): RuntimeMetrics[] {
    return Array.from(this.metricsMap.values())
      .filter(m => m.errorRate > threshold)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, limit);
  }

  /**
   * 프로파일링 보고서 생성
   */
  generateProfilingReport(): string {
    const metrics = this.getAllMetrics();
    const hotspots = this.detectHotSpots(20);

    let report = `\n=== PROFILING REPORT [${this.sessionId}] ===\n`;
    report += `Session Duration: ${(this.sessionDuration / 1000).toFixed(2)}s\n`;
    report += `Functions Tracked: ${metrics.length}\n`;
    report += `Total Calls: ${metrics.reduce((sum, m) => sum + m.callCount, 0)}\n\n`;

    // 핫스팟 섹션
    report += `--- HOTSPOTS (Top 20) ---\n`;
    for (const hotspot of hotspots) {
      report += `[${hotspot.severity.toUpperCase()}] ${hotspot.functionName}\n`;
      report += `  Impact: ${hotspot.impact.toFixed(1)}%\n`;
      report += `  Calls: ${hotspot.metrics.callCount} (avg ${hotspot.metrics.avgTime.toFixed(2)}ms)\n`;
      report += `  Suggested: ${hotspot.suggestedOptimization}\n`;
      report += `  Reason: ${hotspot.reason}\n\n`;
    }

    // 성능 통계
    report += `--- PERFORMANCE SUMMARY ---\n`;
    const slowest = this.getTopSlowFunctions(5);
    report += `Slowest Functions:\n`;
    for (const m of slowest) {
      report += `  ${m.functionName}: ${m.avgTime.toFixed(2)}ms (p95: ${m.p95Time.toFixed(2)}ms)\n`;
    }

    const frequent = this.getTopFrequentFunctions(5);
    report += `\nMost Frequent Functions:\n`;
    for (const m of frequent) {
      report += `  ${m.functionName}: ${m.callCount} calls\n`;
    }

    const memory = this.getTopMemoryFunctions(5);
    report += `\nMemory Usage:\n`;
    for (const m of memory) {
      report += `  ${m.functionName}: ${(m.memoryUsage / 1024).toFixed(2)}KB\n`;
    }

    return report;
  }

  /**
   * 프로파일 초기화
   */
  reset(): void {
    this.metricsMap.clear();
    this.callHistory.clear();
    this.startTime = Date.now();
    this.sessionDuration = 0;
  }

  /**
   * 세션 데이터 조회
   */
  getSessionData() {
    return {
      sessionId: this.sessionId,
      duration: this.sessionDuration,
      functionCount: this.metricsMap.size,
      totalCalls: Array.from(this.metricsMap.values()).reduce((sum, m) => sum + m.callCount, 0),
      metrics: this.getAllMetrics(),
      hotspots: this.detectHotSpots(),
    };
  }

  /**
   * 함수별 상세 통계
   */
  getDetailedStats(functionName: string) {
    const records = this.callHistory.get(functionName) || [];
    const metrics = this.metricsMap.get(functionName);

    if (!metrics) return null;

    const durations = records.map(r => r.duration);
    const memoryDeltas = records.map(r => r.memoryDelta);

    return {
      ...metrics,
      durations,
      memoryDeltas,
      callFrequency: metrics.callCount / (this.sessionDuration / 1000), // calls per second
      stdDev: this.calculateStdDev(durations),
      variance: this.calculateVariance(durations),
    };
  }

  /**
   * 표준편차 계산
   */
  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * 분산 계산
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }
}
