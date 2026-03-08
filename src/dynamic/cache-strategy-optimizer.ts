/**
 * FreeLang v2 Phase 5: Dynamic Optimizer
 * Module B: Cache Strategy Optimizer
 *
 * 목적: 함수별 최적의 캐싱 전략 자동 선택 및 적용
 */

import type { RuntimeMetrics } from './dynamic-profiler';

export interface CacheStrategy {
  type: 'lru' | 'lfu' | 'ttl' | 'adaptive';
  maxSize: number;
  ttl?: number; // milliseconds
  evictionPolicy: 'lru' | 'lfu' | 'fifo';
  estimatedHitRate: number; // 0-1
}

export interface CacheAnalysis {
  functionName: string;
  isPure: boolean;
  inputVariance: number; // 0=동일 입력, 1=완전 다른 입력
  computeCost: number; // ms
  recommendedStrategy: CacheStrategy | null;
  reason: string;
  estimatedSavings: {
    timeSavedMs: number;
    memoryCostBytes: number;
    roi: number; // return on investment ratio
  };
}

/**
 * 함수의 순수성 분석 (간단한 휴리스틱)
 */
export class PurityAnalyzer {
  /**
   * 함수가 순수 함수인지 휴리스틱으로 판단
   * (실제로는 정적 분석 필요)
   */
  analyzePurity(functionName: string, metrics: RuntimeMetrics): boolean {
    // 에러가 없고 메모리 변동이 없으면 순수함수로 가정
    const isStable = metrics.errorRate < 0.01 && Math.abs(metrics.memoryUsage) < 1000;
    const isFast = metrics.avgTime < 100; // 빠른 함수는 보통 순수
    const isConsistent = metrics.p95Time / metrics.avgTime < 1.5; // 실행시간이 일관적

    return isStable && isFast && isConsistent;
  }

  /**
   * 입력 다양성 추정
   * 호출 횟수가 많은데 캐시 히트가 낮으면 입력이 다양
   */
  analyzeInputVariance(metrics: RuntimeMetrics): number {
    if (metrics.callCount === 0) return 0.5;

    // 캐시 히트가 높으면 입력이 반복적 (variance 낮음)
    // 캐시 히트가 낮으면 입력이 다양 (variance 높음)
    return 1 - Math.max(0, metrics.cacheHitRate);
  }
}

/**
 * 캐시 전략 최적화기
 */
export class CacheStrategyOptimizer {
  private appliedCaches: Map<string, CacheStrategy> = new Map();
  private purityAnalyzer = new PurityAnalyzer();
  private cacheInstances: Map<string, Map<any, any>> = new Map();

  /**
   * 함수 분석 및 캐시 전략 추천
   */
  analyzeFunction(functionName: string, metrics: RuntimeMetrics): CacheAnalysis {
    const isPure = this.purityAnalyzer.analyzePurity(functionName, metrics);
    const inputVariance = this.purityAnalyzer.analyzeInputVariance(metrics);
    const computeCost = metrics.avgTime;

    let recommendedStrategy: CacheStrategy | null = null;
    let reason = '';
    let estimatedHitRate = metrics.cacheHitRate;

    // 캐싱이 의미있는 경우
    if (computeCost < 5) {
      reason = 'Function is too fast → caching overhead exceeds benefit';
    } else if (!isPure) {
      reason = 'Function is not pure → caching not recommended';
    } else if (computeCost > 5) { // 5ms 이상 걸리는 순수함수
      if (inputVariance < 0.3) {
        // 입력이 반복적 → LRU 캐시
        recommendedStrategy = {
          type: 'lru',
          maxSize: Math.min(100, Math.ceil(metrics.callCount / 10)),
          evictionPolicy: 'lru',
          estimatedHitRate: Math.min(0.9, metrics.callCount > 100 ? 0.8 : 0.6),
        };
        reason = 'Repetitive inputs detected → LRU cache recommended';
        estimatedHitRate = recommendedStrategy.estimatedHitRate;
      } else if (inputVariance < 0.6) {
        // 입력이 중간 정도 다양 → LFU 캐시
        recommendedStrategy = {
          type: 'lfu',
          maxSize: Math.min(200, Math.ceil(metrics.callCount / 5)),
          evictionPolicy: 'lfu',
          estimatedHitRate: Math.min(0.7, 0.4 + inputVariance),
        };
        reason = 'Moderate input variance → LFU cache recommended';
        estimatedHitRate = recommendedStrategy.estimatedHitRate;
      } else if (metrics.callCount > 1000) {
        // 많이 호출되지만 입력이 다양 → TTL 캐시
        recommendedStrategy = {
          type: 'ttl',
          maxSize: 50,
          ttl: 5000, // 5초
          evictionPolicy: 'fifo',
          estimatedHitRate: 0.4,
        };
        reason = 'High call count with diverse inputs → TTL cache recommended';
        estimatedHitRate = 0.4;
      }
    }

    // 예상 절감액 계산
    const estimatedSavings = this.estimateSavings(
      metrics,
      recommendedStrategy,
      computeCost,
      estimatedHitRate
    );

    return {
      functionName,
      isPure,
      inputVariance,
      computeCost,
      recommendedStrategy,
      reason,
      estimatedSavings,
    };
  }

  /**
   * 분석 결과에서 캐시 전략 선택
   */
  selectStrategy(analysis: CacheAnalysis): CacheStrategy | null {
    if (!analysis.recommendedStrategy) return null;

    // ROI가 1.0 이상일 때만 캐싱 적용
    if (analysis.estimatedSavings.roi < 1.0) return null;

    return analysis.recommendedStrategy;
  }

  /**
   * 함수에 메모이제이션 적용
   */
  applyMemoization<T extends (...args: any[]) => any>(
    fn: T,
    strategy: CacheStrategy
  ): T {
    const cache = new Map<string, any>();
    const accessCount = new Map<string, number>();
    const timestamps = new Map<string, number>();

    const memoized = (...args: any[]) => {
      const key = JSON.stringify(args);
      const now = Date.now();

      // TTL 체크
      if (strategy.type === 'ttl' && strategy.ttl) {
        const timestamp = timestamps.get(key);
        if (timestamp && now - timestamp > strategy.ttl) {
          cache.delete(key);
          timestamps.delete(key);
        }
      }

      // 캐시 히트
      if (cache.has(key)) {
        if (strategy.type === 'lfu') {
          accessCount.set(key, (accessCount.get(key) || 0) + 1);
        }
        return cache.get(key);
      }

      // 캐시 미스 - 함수 실행
      const result = fn(...args);

      // 캐시 저장
      if (cache.size >= strategy.maxSize) {
        // 제거 정책 적용
        const keyToRemove = this.selectKeyForEviction(
          strategy.evictionPolicy,
          cache,
          accessCount,
          timestamps
        );
        if (keyToRemove) {
          cache.delete(keyToRemove);
          accessCount.delete(keyToRemove);
          timestamps.delete(keyToRemove);
        }
      }

      cache.set(key, result);
      timestamps.set(key, now);
      accessCount.set(key, 1);

      return result;
    };

    return memoized as T;
  }

  /**
   * 제거 대상 키 선택
   */
  private selectKeyForEviction(
    policy: 'lru' | 'lfu' | 'fifo',
    cache: Map<string, any>,
    accessCount: Map<string, number>,
    timestamps: Map<string, number>
  ): string | null {
    if (cache.size === 0) return null;

    const keys = Array.from(cache.keys());

    if (policy === 'lru') {
      // 가장 오래 사용되지 않은 키 제거
      return keys.reduce((oldest, key) => {
        const oldestTime = timestamps.get(oldest) || 0;
        const keyTime = timestamps.get(key) || 0;
        return keyTime < oldestTime ? key : oldest;
      });
    } else if (policy === 'lfu') {
      // 가장 적게 사용된 키 제거
      return keys.reduce((least, key) => {
        const leastCount = accessCount.get(least) || 0;
        const keyCount = accessCount.get(key) || 0;
        return keyCount < leastCount ? key : least;
      });
    } else {
      // FIFO: 첫 번째 키 제거
      return keys[0];
    }
  }

  /**
   * 적용된 캐시 전략 조회
   */
  getAppliedCaches(): Map<string, CacheStrategy> {
    return new Map(this.appliedCaches);
  }

  /**
   * 캐시 전략 적용
   */
  registerCache(functionName: string, strategy: CacheStrategy): void {
    this.appliedCaches.set(functionName, strategy);
    this.cacheInstances.set(functionName, new Map());
  }

  /**
   * 절감액 추정
   */
  estimateSavings(
    metrics: RuntimeMetrics,
    strategy: CacheStrategy | null,
    computeCost: number,
    estimatedHitRate: number
  ): { timeSavedMs: number; memoryCostBytes: number; roi: number } {
    if (!strategy) {
      return {
        timeSavedMs: 0,
        memoryCostBytes: 0,
        roi: 0,
      };
    }

    // 절감 시간: 캐시 히트 수 * 컴퓨팅 비용
    const futureCallsEstimate = metrics.callCount * 2; // 향후 호출 추정
    const expectedHits = futureCallsEstimate * estimatedHitRate;
    const timeSavedMs = expectedHits * computeCost;

    // 메모리 비용: 캐시 크기 * 평균 값 크기 (휴리스틱)
    const memoryCostBytes = strategy.maxSize * (computeCost * 100); // 휴리스틱

    // ROI: 절감시간 / 메모리비용
    const roi = timeSavedMs > 0 ? timeSavedMs / Math.max(1, memoryCostBytes / 1000) : 0;

    return {
      timeSavedMs: Math.max(0, timeSavedMs),
      memoryCostBytes,
      roi,
    };
  }

  /**
   * 캐시 통계 조회
   */
  getCacheStats(functionName: string) {
    const strategy = this.appliedCaches.get(functionName);
    const cache = this.cacheInstances.get(functionName);

    if (!strategy || !cache) return null;

    return {
      functionName,
      strategy,
      cacheSize: cache.size,
      maxSize: strategy.maxSize,
      utilizationRate: cache.size / strategy.maxSize,
    };
  }

  /**
   * 모든 캐시 통계
   */
  getAllCacheStats() {
    const stats = [];
    for (const functionName of this.appliedCaches.keys()) {
      const stat = this.getCacheStats(functionName);
      if (stat) {
        stats.push(stat);
      }
    }
    return stats;
  }

  /**
   * 캐시 초기화
   */
  clearCache(functionName?: string): void {
    if (functionName) {
      this.cacheInstances.delete(functionName);
    } else {
      this.cacheInstances.clear();
    }
  }
}
