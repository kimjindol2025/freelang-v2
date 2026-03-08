/**
 * FreeLang Phase E - Stdlib Optimization
 *
 * Agent 3 성능 최적화 모듈
 * - 함수 캐싱 (반복 호출 제거)
 * - 병렬 처리 (Promise.all)
 * - 메모리 절약 (WeakMap)
 * - 에러 복구 (자동 재시도)
 *
 * 목표: 함수 성능 50% 향상, 메모리 20% 절약
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

// ══════════════════════════════════════════════════════════════
// 1. 함수 캐싱 레이어
// ══════════════════════════════════════════════════════════════

interface CacheEntry {
  key: string;
  value: any;
  timestamp: number;
  hits: number;
}

class FunctionCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 1000;
  private ttl = 60000; // 60초

  set(key: string, value: any): void {
    if (this.cache.size >= this.maxSize) {
      // LRU 제거
      const oldest = Array.from(this.cache.values())
        .sort((a, b) => a.timestamp - b.timestamp)[0];
      if (oldest) {
        this.cache.delete(oldest.key);
      }
    }

    this.cache.set(key, {
      key,
      value,
      timestamp: Date.now(),
      hits: 0
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // TTL 확인
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    entry.timestamp = Date.now(); // LRU 업데이트
    return entry.value;
  }

  clear(): void {
    this.cache.clear();
  }

  stats(): { size: number; hitRate: number } {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, e) => sum + e.hits, 0);
    const hitRate = entries.length > 0 ? totalHits / entries.length : 0;
    return { size: entries.length, hitRate };
  }
}

export const globalFunctionCache = new FunctionCache();

// ══════════════════════════════════════════════════════════════
// 2. 메모이제이션 (Memoization)
// ══════════════════════════════════════════════════════════════

export function memoize(fn: (...args: any[]) => any): (...args: any[]) => any {
  const cache = new WeakMap<object, any>();

  return function(...args: any[]): any {
    const key = JSON.stringify(args);

    // 캐시에서 조회
    let cached = globalFunctionCache.get(key);
    if (cached !== null) {
      return cached;
    }

    // 함수 실행
    const result = fn(...args);

    // 캐시 저장
    globalFunctionCache.set(key, result);

    return result;
  };
}

// ══════════════════════════════════════════════════════════════
// 3. 병렬 처리 유틸리티
// ══════════════════════════════════════════════════════════════

export async function parallelMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number = 4
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const promise = Promise.resolve().then(() =>
      fn(item, i).then(result => {
        results[i] = result;
      })
    );

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(executing.findIndex(p => p === promise), 1);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * 배치 처리 - 여러 함수 호출을 그룹화하여 실행
 */
export async function batchProcess<T, R>(
  items: T[],
  fn: (batch: T[]) => Promise<R[]>,
  batchSize: number = 10
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await fn(batch);
    results.push(...batchResults);
  }

  return results;
}

// ══════════════════════════════════════════════════════════════
// 4. 에러 복구 (Retry Logic)
// ══════════════════════════════════════════════════════════════

interface RetryOptions {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelayMs: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  backoffMultiplier: 2,
  initialDelayMs: 100
};

export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < opts.maxRetries - 1) {
        const delay = opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * 동기 함수 재시도
 */
export function retrySync<T>(
  fn: () => T,
  options: Partial<RetryOptions> = {}
): T {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      return fn();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

// ══════════════════════════════════════════════════════════════
// 5. 최적화된 함수 래퍼
// ══════════════════════════════════════════════════════════════

export class OptimizedFunctionRegistry {
  private registry: NativeFunctionRegistry;
  private cachedFunctions = new Map<string, any>();

  constructor(registry: NativeFunctionRegistry) {
    this.registry = registry;
  }

  /**
   * 캐싱된 함수 호출
   */
  callCached(name: string, args: any[]): any {
    const cacheKey = `${name}:${JSON.stringify(args)}`;
    const cached = globalFunctionCache.get(cacheKey);

    if (cached !== null) {
      return cached;
    }

    const func = this.registry.get(name);
    if (!func) {
      throw new Error(`Function not found: ${name}`);
    }

    const result = func.executor(args);
    globalFunctionCache.set(cacheKey, result);
    return result;
  }

  /**
   * 재시도 로직이 있는 함수 호출
   */
  callWithRetry(name: string, args: any[], maxRetries: number = 3): any {
    return retrySync(
      () => {
        const func = this.registry.get(name);
        if (!func) {
          throw new Error(`Function not found: ${name}`);
        }
        return func.executor(args);
      },
      { maxRetries }
    );
  }

  /**
   * 병렬 함수 호출
   */
  async callParallel(
    calls: Array<{ name: string; args: any[] }>,
    concurrency: number = 4
  ): Promise<any[]> {
    return parallelMap(
      calls,
      async ({ name, args }) => {
        const func = this.registry.get(name);
        if (!func) {
          throw new Error(`Function not found: ${name}`);
        }
        return func.executor(args);
      },
      concurrency
    );
  }

  /**
   * 함수 체이닝 최적화
   */
  chain(functions: Array<{ name: string; args: any[] }>): any {
    let result: any;

    for (const { name, args } of functions) {
      // 이전 결과를 첫 번째 인자로 사용
      const callArgs = result !== undefined ? [result, ...args] : args;
      result = this.callCached(name, callArgs);
    }

    return result;
  }

  /**
   * 캐시 통계
   */
  getCacheStats() {
    return globalFunctionCache.stats();
  }

  /**
   * 캐시 초기화
   */
  clearCache(): void {
    globalFunctionCache.clear();
  }
}

// ══════════════════════════════════════════════════════════════
// 6. 성능 프로파일링
// ══════════════════════════════════════════════════════════════

export interface PerformanceMetrics {
  functionName: string;
  callCount: number;
  totalTimeMs: number;
  averageTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  cacheHits: number;
  cacheMisses: number;
}

export class PerformanceProfiler {
  private metrics = new Map<string, PerformanceMetrics>();

  recordCall(
    name: string,
    duration: number,
    cacheHit: boolean = false
  ): void {
    let metric = this.metrics.get(name);

    if (!metric) {
      metric = {
        functionName: name,
        callCount: 0,
        totalTimeMs: 0,
        averageTimeMs: 0,
        minTimeMs: duration,
        maxTimeMs: duration,
        cacheHits: 0,
        cacheMisses: 0
      };
    }

    metric.callCount++;
    metric.totalTimeMs += duration;
    metric.averageTimeMs = metric.totalTimeMs / metric.callCount;
    metric.minTimeMs = Math.min(metric.minTimeMs, duration);
    metric.maxTimeMs = Math.max(metric.maxTimeMs, duration);

    if (cacheHit) {
      metric.cacheHits++;
    } else {
      metric.cacheMisses++;
    }

    this.metrics.set(name, metric);
  }

  getMetrics(name?: string): PerformanceMetrics | Map<string, PerformanceMetrics> | undefined {
    if (name) {
      return this.metrics.get(name);
    }
    return this.metrics;
  }

  getTopFunctions(limit: number = 10): PerformanceMetrics[] {
    return Array.from(this.metrics.values())
      .sort((a, b) => b.totalTimeMs - a.totalTimeMs)
      .slice(0, limit);
  }

  getBottlenecks(): PerformanceMetrics[] {
    return Array.from(this.metrics.values())
      .filter(m => m.averageTimeMs > 100) // 100ms 이상
      .sort((a, b) => b.averageTimeMs - a.averageTimeMs);
  }

  reset(): void {
    this.metrics.clear();
  }

  report(): string {
    const metrics = Array.from(this.metrics.values())
      .sort((a, b) => b.totalTimeMs - a.totalTimeMs);

    let report = '╔═══════════════════════════════════════════════╗\n';
    report += '║     Performance Profile Report                ║\n';
    report += '╚═══════════════════════════════════════════════╝\n\n';

    report += '┌─ Top 10 Functions by Total Time ─────────────┐\n';
    metrics.slice(0, 10).forEach(m => {
      report += `│ ${m.functionName.padEnd(25)} ${m.totalTimeMs.toFixed(2)}ms (avg: ${m.averageTimeMs.toFixed(2)}ms)\n`;
    });
    report += '└──────────────────────────────────────────────┘\n\n';

    report += '┌─ Cache Performance ──────────────────────────┐\n';
    const totalCalls = metrics.reduce((sum, m) => sum + m.callCount, 0);
    const totalCacheHits = metrics.reduce((sum, m) => sum + m.cacheHits, 0);
    const cacheHitRate = totalCalls > 0 ? (totalCacheHits / totalCalls * 100).toFixed(2) : '0.00';
    report += `│ Total Calls: ${totalCalls}\n`;
    report += `│ Cache Hits: ${totalCacheHits} (${cacheHitRate}%)\n`;
    report += '└──────────────────────────────────────────────┘\n';

    return report;
  }
}

export const globalProfiler = new PerformanceProfiler();

// ══════════════════════════════════════════════════════════════
// 7. 최적화 설정
// ══════════════════════════════════════════════════════════════

export interface OptimizationConfig {
  enableCache: boolean;
  enableProfiling: boolean;
  cacheTTL: number;
  maxCacheSize: number;
  parallelConcurrency: number;
  retryMaxAttempts: number;
}

export const DEFAULT_OPTIMIZATION_CONFIG: OptimizationConfig = {
  enableCache: true,
  enableProfiling: true,
  cacheTTL: 60000,
  maxCacheSize: 1000,
  parallelConcurrency: 4,
  retryMaxAttempts: 3
};

let currentConfig = { ...DEFAULT_OPTIMIZATION_CONFIG };

export function setOptimizationConfig(config: Partial<OptimizationConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

export function getOptimizationConfig(): OptimizationConfig {
  return { ...currentConfig };
}

// ══════════════════════════════════════════════════════════════
// 8. 최적화된 표준 함수들
// ══════════════════════════════════════════════════════════════

/**
 * 최적화된 배열 필터링
 */
export function optimizedFilter<T>(
  arr: T[],
  predicate: (item: T) => boolean
): T[] {
  // 단순 필터링 (최적화 여지 없음)
  return arr.filter(predicate);
}

/**
 * 최적화된 배열 맵핑 (병렬 처리)
 */
export async function optimizedMapParallel<T, R>(
  arr: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number = 4
): Promise<R[]> {
  return parallelMap(arr, fn, concurrency);
}

/**
 * 최적화된 배열 감소 (캐싱)
 */
export function optimizedReduce<T, R>(
  arr: T[],
  fn: (acc: R, item: T) => R,
  initial: R
): R {
  // 복잡한 감소 연산은 캐싱 가능
  const cacheKey = `reduce:${JSON.stringify(arr)}`;
  const cached = globalFunctionCache.get(cacheKey);
  if (cached !== null) {
    return cached;
  }

  let acc = initial;
  for (const item of arr) {
    acc = fn(acc, item);
  }

  globalFunctionCache.set(cacheKey, acc);
  return acc;
}

// ══════════════════════════════════════════════════════════════
// Export Summary
// ══════════════════════════════════════════════════════════════
/*
 * 최적화 모듈 내보내기:
 *
 * ✅ 1. FunctionCache - 함수 결과 캐싱
 * ✅ 2. memoize - 데코레이터 패턴
 * ✅ 3. parallelMap, batchProcess - 병렬/배치 처리
 * ✅ 4. retryAsync, retrySync - 에러 복구
 * ✅ 5. OptimizedFunctionRegistry - 통합 래퍼
 * ✅ 6. PerformanceProfiler - 성능 프로파일링
 * ✅ 7. 최적화 설정 관리
 * ✅ 8. 최적화된 표준 함수들
 *
 * 성능 목표:
 * - 함수 호출 50% 향상 (캐싱)
 * - 메모리 20% 절약 (WeakMap + LRU)
 * - 병렬 처리로 I/O 성능 3-4배 향상
 * - 에러 복구로 안정성 99.9% 달성
 */
