/**
 * FreeLang v2 Phase 5: Dynamic Optimizer
 * Module D: Orchestrator & Main Entry Point
 *
 * 목적: 동적 최적화 파이프라인 조율
 * 파이프라인: 메트릭 수집 → 핫스팟 감지 → 캐싱 분석 → 병렬화 검토 → 최적화 적용
 */

import { DynamicProfiler, type HotSpot, type RuntimeMetrics } from './dynamic-profiler';
import { CacheStrategyOptimizer, type CacheAnalysis } from './cache-strategy-optimizer';
import { ParallelizationDetector, type ParallelizationOpportunity } from './parallelization-detector';

/**
 * 동적 최적화 세션 결과
 */
export interface DynamicOptimizationResult {
  sessionId: string;
  duration: number; // ms
  timestamp: number;
  metrics: RuntimeMetrics[];
  hotSpots: HotSpot[];
  cacheAnalyses: CacheAnalysis[];
  parallelOpportunities: ParallelizationOpportunity[];
  appliedOptimizations: string[];
  performanceDelta: number; // %
  healthScore: number; // 0-100
  recommendations: string[];
}

interface OptimizationSession {
  sessionId: string;
  timestamp: number;
  result: DynamicOptimizationResult;
}

/**
 * 동적 최적화 오케스트레이터
 *
 * 역할:
 * 1. 런타임 메트릭 수집 및 관리
 * 2. 성능 분석 (핫스팟 감지)
 * 3. 최적화 전략 도출 (캐싱, 병렬화)
 * 4. 최적화 적용 및 검증
 * 5. 성능 개선 추적
 */
export class DynamicOptimizer {
  private profiler: DynamicProfiler;
  private cacheOptimizer: CacheStrategyOptimizer;
  private parallelDetector: ParallelizationDetector;
  private sessionHistory: OptimizationSession[] = [];
  private lastResult: DynamicOptimizationResult | null = null;

  constructor(
    private readonly sessionId: string = `dyn-${Date.now()}`,
    private readonly maxSessionHistory: number = 100
  ) {
    this.profiler = new DynamicProfiler(sessionId);
    this.cacheOptimizer = new CacheStrategyOptimizer();
    this.parallelDetector = new ParallelizationDetector();
  }

  /**
   * 메인 최적화 파이프라인 실행
   */
  async optimizeRuntime(
    code?: string,
    executionTrace?: Array<{ functionName: string; duration: number; memory: number }>
  ): Promise<DynamicOptimizationResult> {
    const startTime = Date.now();

    // 1. 실행 트레이스가 제공되면 메트릭에 추가
    if (executionTrace) {
      for (const trace of executionTrace) {
        this.profiler.recordCall(trace.functionName, trace.duration, trace.memory);
      }
    }

    // 2. 메트릭 수집 및 분석
    const metrics = this.profiler.getAllMetrics();
    const hotSpots = this.profiler.detectHotSpots(20);

    // 3. 캐싱 분석
    const cacheAnalyses: CacheAnalysis[] = [];
    for (const metric of metrics) {
      const analysis = this.cacheOptimizer.analyzeFunction(metric.functionName, metric);
      cacheAnalyses.push(analysis);

      // ROI > 1.0인 경우 자동 적용
      const strategy = this.cacheOptimizer.selectStrategy(analysis);
      if (strategy) {
        this.cacheOptimizer.registerCache(metric.functionName, strategy);
      }
    }

    // 4. 병렬화 기회 감지
    const parallelOpportunities = this.parallelDetector.detectOpportunities(metrics);

    // 5. 적용된 최적화 정리
    const appliedOptimizations: string[] = [];
    const caches = this.cacheOptimizer.getAppliedCaches();

    for (const [funcName, strategy] of caches) {
      appliedOptimizations.push(`memoize(${funcName}) [${strategy.type}]`);
    }

    for (const opp of parallelOpportunities.slice(0, 3)) {
      // 상위 3개 병렬화 기회만 기록
      if (opp.feasibility !== 'low') {
        appliedOptimizations.push(`parallelize(${opp.functionName}) [${opp.type}]`);
      }
    }

    // 6. 성능 델타 및 건강도 점수 계산
    const performanceDelta = this.calculatePerformanceDelta(hotSpots, cacheAnalyses);
    const healthScore = this.calculateHealthScore(metrics, hotSpots);

    // 7. 권장사항 생성
    const recommendations = this.generateRecommendations(hotSpots, cacheAnalyses, parallelOpportunities);

    // 8. 결과 생성
    const duration = Date.now() - startTime;
    const result: DynamicOptimizationResult = {
      sessionId: this.sessionId,
      duration,
      timestamp: Date.now(),
      metrics,
      hotSpots,
      cacheAnalyses,
      parallelOpportunities,
      appliedOptimizations,
      performanceDelta,
      healthScore,
      recommendations,
    };

    // 9. 세션 이력 저장
    this.lastResult = result;
    this.sessionHistory.push({
      sessionId: this.sessionId,
      timestamp: Date.now(),
      result,
    });

    // 이력 크기 제한
    if (this.sessionHistory.length > this.maxSessionHistory) {
      this.sessionHistory.shift();
    }

    return result;
  }

  /**
   * 함수 호출 기록
   */
  recordExecution(
    functionName: string,
    duration: number,
    memoryUsage: number = 0,
    cacheHit: boolean = false,
    hadError: boolean = false
  ): void {
    this.profiler.recordCall(functionName, duration, memoryUsage, cacheHit, hadError);
  }

  /**
   * 성능 델타 계산 (%)
   */
  private calculatePerformanceDelta(hotSpots: HotSpot[], cacheAnalyses: CacheAnalysis[]): number {
    let totalSavings = 0;

    // 캐싱으로 인한 절감 계산
    for (const analysis of cacheAnalyses) {
      totalSavings += analysis.estimatedSavings.timeSavedMs;
    }

    // 기준선: 모든 핫스팟의 총 시간
    const baselineTime = hotSpots.reduce((sum, hs) => sum + hs.metrics.totalTime, 0);

    if (baselineTime === 0) return 0;

    const delta = (totalSavings / baselineTime) * 100;
    return Math.min(100, Math.max(0, delta)); // 0-100 범위
  }

  /**
   * 건강도 점수 계산 (0-100)
   */
  private calculateHealthScore(metrics: RuntimeMetrics[], hotSpots: HotSpot[]): number {
    if (metrics.length === 0) return 50;

    // 기본 점수: 100
    let score = 100;

    // 1. 핫스팟 처벌
    const criticalCount = hotSpots.filter(h => h.severity === 'critical').length;
    const highCount = hotSpots.filter(h => h.severity === 'high').length;
    score -= criticalCount * 20 + highCount * 10;

    // 2. 에러율 처벌
    const avgErrorRate = metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length;
    score -= avgErrorRate * 50;

    // 3. 캐시 히트율 보상
    const avgCacheHitRate = metrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / metrics.length;
    score += avgCacheHitRate * 10;

    // 4. 성능 편차 처벌 (불안정한 성능)
    const p95Avg = metrics.reduce((sum, m) => sum + m.p95Time, 0) / metrics.length;
    const avgAvg = metrics.reduce((sum, m) => sum + m.avgTime, 0) / metrics.length;
    const variance = p95Avg / (avgAvg || 1);
    score -= Math.min(20, (variance - 1) * 10); // variance > 1이면 점수 깎임

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * 권장사항 생성
   */
  private generateRecommendations(
    hotSpots: HotSpot[],
    cacheAnalyses: CacheAnalysis[],
    parallelOpportunities: ParallelizationOpportunity[]
  ): string[] {
    const recommendations: string[] = [];

    // 1. 핫스팟 권장사항
    for (const hotspot of hotSpots.slice(0, 3)) {
      recommendations.push(
        `[${hotspot.severity}] Optimize ${hotspot.functionName}: ${hotspot.suggestedOptimization.toUpperCase()}`
      );
    }

    // 2. 캐싱 권장사항
    const cacheCandidates = cacheAnalyses.filter(
      a => a.recommendedStrategy && a.estimatedSavings.roi > 1.5
    );
    for (const candidate of cacheCandidates.slice(0, 3)) {
      recommendations.push(
        `Enable ${candidate.recommendedStrategy!.type.toUpperCase()} cache for ${candidate.functionName}`
      );
    }

    // 3. 병렬화 권장사항
    const parallelCandidates = parallelOpportunities.filter(o => o.feasibility === 'high');
    for (const candidate of parallelCandidates.slice(0, 3)) {
      recommendations.push(
        `[HIGH] Parallelize ${candidate.functionName} with ${candidate.estimatedCoreCount} cores (${candidate.speedupEstimate.toFixed(1)}x speedup)`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('System is well-optimized. No critical optimizations needed.');
    }

    return recommendations;
  }

  /**
   * 분석 및 최적화 실행 (간단한 버전)
   */
  async analyzeAndOptimize(): Promise<DynamicOptimizationResult> {
    return this.optimizeRuntime();
  }

  /**
   * 프로파일링 보고서 생성
   */
  generateReport(): string {
    let report = `\n${'='.repeat(60)}\n`;
    report += `DYNAMIC OPTIMIZATION REPORT\n`;
    report += `Session: ${this.sessionId}\n`;
    report += `${'='.repeat(60)}\n\n`;

    if (this.lastResult) {
      const result = this.lastResult;

      report += `📊 SUMMARY\n`;
      report += `  Health Score: ${result.healthScore}/100\n`;
      report += `  Performance Delta: ${result.performanceDelta.toFixed(1)}%\n`;
      report += `  Duration: ${result.duration}ms\n`;
      report += `  Timestamp: ${new Date(result.timestamp).toISOString()}\n\n`;

      report += `🔥 HOTSPOTS (Top 5)\n`;
      for (const hotspot of result.hotSpots.slice(0, 5)) {
        report += `  [${hotspot.severity.toUpperCase()}] ${hotspot.functionName}\n`;
        report += `    Impact: ${hotspot.impact.toFixed(1)}%\n`;
        report += `    Suggestion: ${hotspot.suggestedOptimization}\n`;
      }
      report += '\n';

      report += `💾 CACHING OPPORTUNITIES\n`;
      const cacheOps = result.cacheAnalyses.filter(a => a.recommendedStrategy);
      for (const cache of cacheOps.slice(0, 5)) {
        report += `  ${cache.functionName}: ${cache.recommendedStrategy!.type}\n`;
        report += `    ROI: ${cache.estimatedSavings.roi.toFixed(2)}x\n`;
      }
      report += '\n';

      report += `⚡ PARALLELIZATION OPPORTUNITIES\n`;
      const parallelOps = result.parallelOpportunities.filter(o => o.feasibility !== 'low');
      for (const parallel of parallelOps.slice(0, 5)) {
        report += `  ${parallel.functionName} (${parallel.type})\n`;
        report += `    Speedup: ${parallel.speedupEstimate.toFixed(2)}x with ${parallel.estimatedCoreCount} cores\n`;
      }
      report += '\n';

      report += `📋 RECOMMENDATIONS\n`;
      for (const rec of result.recommendations) {
        report += `  • ${rec}\n`;
      }
    } else {
      report += `No analysis performed yet. Run optimizeRuntime() first.\n`;
    }

    report += `\n${'='.repeat(60)}\n`;
    return report;
  }

  /**
   * 대시보드 데이터 조회
   */
  getDashboardData(): object {
    if (!this.lastResult) {
      return { error: 'No optimization run yet' };
    }

    const result = this.lastResult;
    return {
      overview: {
        healthScore: result.healthScore,
        performanceDelta: result.performanceDelta,
        functionCount: result.metrics.length,
        totalCalls: result.metrics.reduce((sum, m) => sum + m.callCount, 0),
      },
      hotspots: result.hotSpots.slice(0, 10),
      caching: {
        opportunities: result.cacheAnalyses.filter(a => a.recommendedStrategy).length,
        applied: this.cacheOptimizer.getAppliedCaches().size,
      },
      parallelization: {
        opportunities: result.parallelOpportunities.filter(o => o.feasibility !== 'low').length,
        totalOpportunities: result.parallelOpportunities.length,
      },
      recommendations: result.recommendations,
    };
  }

  /**
   * 세션 이력 조회
   */
  getSessionHistory(limit: number = 10): OptimizationSession[] {
    return this.sessionHistory.slice(-limit);
  }

  /**
   * 통계 조회
   */
  getStats(): object {
    const totalSessions = this.sessionHistory.length;
    const performanceGains = this.sessionHistory.map(s => s.result.performanceDelta);
    const avgPerformanceGain = performanceGains.reduce((a, b) => a + b, 0) / Math.max(1, performanceGains.length);

    // 가장 많이 적용된 최적화
    const optimizationCounts = new Map<string, number>();
    for (const session of this.sessionHistory) {
      for (const opt of session.result.appliedOptimizations) {
        const key = opt.split('(')[0];
        optimizationCounts.set(key, (optimizationCounts.get(key) || 0) + 1);
      }
    }

    const topOptimizations = Array.from(optimizationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      totalSessions,
      avgPerformanceGain: avgPerformanceGain.toFixed(2),
      avgHealthScore:
        this.sessionHistory.reduce((sum, s) => sum + s.result.healthScore, 0) / Math.max(1, totalSessions),
      topOptimizations,
      sessionHistory: this.sessionHistory.length,
      maxHistorySize: this.maxSessionHistory,
    };
  }

  /**
   * 최근 성능 추이 조회
   */
  getPerformanceTrend(limit: number = 10): Array<{ timestamp: number; healthScore: number; performanceDelta: number }> {
    return this.sessionHistory
      .slice(-limit)
      .map(s => ({
        timestamp: s.timestamp,
        healthScore: s.result.healthScore,
        performanceDelta: s.result.performanceDelta,
      }));
  }

  /**
   * 프로파일러 초기화
   */
  reset(): void {
    this.profiler.reset();
    this.cacheOptimizer.clearCache();
    this.lastResult = null;
  }

  /**
   * 전체 세션 초기화
   */
  resetAll(): void {
    this.reset();
    this.sessionHistory = [];
  }

  /**
   * 현재 상태 조회
   */
  getCurrentStatus(): {
    sessionId: string;
    lastOptimizationTime?: number;
    metricsRecorded: number;
    cachesApplied: number;
    sessionHistorySize: number;
    lastHealthScore?: number;
    lastPerformanceDelta?: number;
  } {
    return {
      sessionId: this.sessionId,
      lastOptimizationTime: this.lastResult?.timestamp,
      metricsRecorded: this.profiler.getAllMetrics().length,
      cachesApplied: this.cacheOptimizer.getAppliedCaches().size,
      sessionHistorySize: this.sessionHistory.length,
      lastHealthScore: this.lastResult?.healthScore,
      lastPerformanceDelta: this.lastResult?.performanceDelta,
    };
  }
}

/**
 * 동적 최적화 유틸리티 함수
 */
export function createDynamicOptimizer(sessionId?: string): DynamicOptimizer {
  return new DynamicOptimizer(sessionId);
}
