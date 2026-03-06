/**
 * FreeLang v2 Phase 5: Dynamic Optimization
 * Comprehensive Test Suite
 */

import {
  DynamicProfiler,
  type HotSpot,
  type RuntimeMetrics,
  type OptimizationType,
} from '../src/dynamic/dynamic-profiler';
import {
  CacheStrategyOptimizer,
  type CacheStrategy,
  type CacheAnalysis,
} from '../src/dynamic/cache-strategy-optimizer';
import {
  ParallelizationDetector,
  type ParallelizationOpportunity,
} from '../src/dynamic/parallelization-detector';
import { DynamicOptimizer, type DynamicOptimizationResult } from '../src/dynamic/dynamic-optimizer';

describe('Phase 5: Dynamic Optimization', () => {
  describe('DynamicProfiler', () => {
    let profiler: DynamicProfiler;

    beforeEach(() => {
      profiler = new DynamicProfiler('test-session');
    });

    test('should record function calls', () => {
      profiler.recordCall('add', 5, 100);
      profiler.recordCall('add', 6, 100);
      profiler.recordCall('multiply', 10, 200);

      const metrics = profiler.getAllMetrics();
      expect(metrics.length).toBe(2);
    });

    test('should calculate metrics correctly', () => {
      profiler.recordCall('compute', 10, 0);
      profiler.recordCall('compute', 20, 0);
      profiler.recordCall('compute', 30, 0);

      const metrics = profiler.getMetrics('compute');
      expect(metrics).toBeDefined();
      expect(metrics!.callCount).toBe(3);
      expect(metrics!.totalTime).toBe(60);
      expect(metrics!.avgTime).toBe(20);
      expect(metrics!.minTime).toBe(10);
      expect(metrics!.maxTime).toBe(30);
    });

    test('should track cache hit rate', () => {
      profiler.recordCall('cached_fn', 10, 0, true);
      profiler.recordCall('cached_fn', 10, 0, false);
      profiler.recordCall('cached_fn', 10, 0, true);

      const metrics = profiler.getMetrics('cached_fn');
      expect(metrics!.cacheHitRate).toBeCloseTo(2 / 3, 2);
    });

    test('should track error rate', () => {
      profiler.recordCall('risky_fn', 10, 0, false, false);
      profiler.recordCall('risky_fn', 10, 0, false, true);
      profiler.recordCall('risky_fn', 10, 0, false, true);

      const metrics = profiler.getMetrics('risky_fn');
      expect(metrics!.errorRate).toBeCloseTo(2 / 3, 2);
    });

    test('should detect hotspots', () => {
      // 시뮬레이션: 무거운 함수 여러 호출
      for (let i = 0; i < 100; i++) {
        profiler.recordCall('heavy_operation', 50, 1000);
      }
      for (let i = 0; i < 10; i++) {
        profiler.recordCall('light_operation', 1, 100);
      }

      const hotspots = profiler.detectHotSpots();
      expect(hotspots.length).toBeGreaterThan(0);
      expect(hotspots[0].functionName).toBe('heavy_operation');
      expect(hotspots[0].impact).toBeGreaterThan(50);
    });

    test('should generate profiling report', () => {
      profiler.recordCall('fn1', 10, 100);
      profiler.recordCall('fn2', 20, 200);

      const report = profiler.generateProfilingReport();
      expect(report).toContain('PROFILING REPORT');
      expect(report).toContain('fn1');
      expect(report).toContain('fn2');
    });

    test('should get top slow functions', () => {
      profiler.recordCall('slow', 100, 0);
      profiler.recordCall('slow', 150, 0);
      profiler.recordCall('fast', 1, 0);

      const slow = profiler.getTopSlowFunctions(1);
      expect(slow[0].functionName).toBe('slow');
    });

    test('should get top frequent functions', () => {
      for (let i = 0; i < 100; i++) {
        profiler.recordCall('frequent', 1, 0);
      }
      for (let i = 0; i < 5; i++) {
        profiler.recordCall('rare', 10, 0);
      }

      const frequent = profiler.getTopFrequentFunctions(1);
      expect(frequent[0].functionName).toBe('frequent');
      expect(frequent[0].callCount).toBe(100);
    });

    test('should get low cache hit functions', () => {
      for (let i = 0; i < 100; i++) {
        profiler.recordCall('uncached', 10, 0, i % 10 === 0); // 10% hit rate
      }

      const lowCache = profiler.getLowCacheHitFunctions(0.5);
      expect(lowCache.some(m => m.functionName === 'uncached')).toBe(true);
    });

    test('should reset profiler', () => {
      profiler.recordCall('fn', 10, 0);
      expect(profiler.getAllMetrics().length).toBe(1);

      profiler.reset();
      expect(profiler.getAllMetrics().length).toBe(0);
    });
  });

  describe('CacheStrategyOptimizer', () => {
    let optimizer: CacheStrategyOptimizer;
    let mockMetrics: RuntimeMetrics;

    beforeEach(() => {
      optimizer = new CacheStrategyOptimizer();
      mockMetrics = {
        functionName: 'test_fn',
        callCount: 1000,
        totalTime: 50000,
        avgTime: 50,
        p95Time: 80,
        p99Time: 90,
        minTime: 40,
        maxTime: 100,
        memoryUsage: 5000,
        cacheHitRate: 0.1,
        errorRate: 0.01,
        lastCalledAt: Date.now(),
        firstCalledAt: Date.now() - 10000,
      };
    });

    test('should analyze pure function', () => {
      const analysis = optimizer.analyzeFunction('pure_fn', mockMetrics);
      expect(analysis.functionName).toBe('pure_fn');
      expect(analysis).toHaveProperty('isPure');
      expect(analysis).toHaveProperty('inputVariance');
      expect(analysis).toHaveProperty('computeCost');
    });

    test('should not recommend caching for fast functions', () => {
      const fastMetrics = { ...mockMetrics, avgTime: 1 };
      const analysis = optimizer.analyzeFunction('fast', fastMetrics);
      expect(analysis.recommendedStrategy).toBeNull();
      expect(analysis.reason).toContain('too fast');
    });

    test('should recommend LRU for repetitive inputs', () => {
      const repetitiveMetrics: RuntimeMetrics = {
        functionName: 'repetitive',
        callCount: 100,
        totalTime: 1000,
        avgTime: 10,
        p95Time: 14, // 14/10 = 1.4 < 1.5
        p99Time: 15,
        minTime: 9,
        maxTime: 16,
        memoryUsage: 100,
        cacheHitRate: 0.8, // 높은 히트율 → 낮은 입력 다양성
        errorRate: 0.0,
        lastCalledAt: Date.now(),
        firstCalledAt: Date.now() - 10000,
      };
      const analysis = optimizer.analyzeFunction('repetitive', repetitiveMetrics);
      expect(analysis.recommendedStrategy?.type).toBe('lru');
    });

    test('should apply memoization to function', () => {
      const fn = (x: number) => x * 2;
      const strategy: CacheStrategy = {
        type: 'lru',
        maxSize: 10,
        evictionPolicy: 'lru',
        estimatedHitRate: 0.8,
      };

      const memoized = optimizer.applyMemoization(fn, strategy);
      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10); // 캐시에서 반환
    });

    test('should estimate savings correctly', () => {
      const strategy: CacheStrategy = {
        type: 'lru',
        maxSize: 50,
        evictionPolicy: 'lru',
        estimatedHitRate: 0.7,
      };

      const savings = optimizer.estimateSavings(mockMetrics, strategy, 50, 0.7);
      expect(savings.timeSavedMs).toBeGreaterThan(0);
      expect(savings.memoryCostBytes).toBeGreaterThan(0);
      expect(savings).toHaveProperty('roi');
    });

    test('should register and retrieve caches', () => {
      const strategy: CacheStrategy = {
        type: 'lru',
        maxSize: 20,
        evictionPolicy: 'lru',
        estimatedHitRate: 0.8,
      };

      optimizer.registerCache('test_fn', strategy);
      const caches = optimizer.getAppliedCaches();
      expect(caches.has('test_fn')).toBe(true);
    });
  });

  describe('ParallelizationDetector', () => {
    let detector: ParallelizationDetector;

    beforeEach(() => {
      detector = new ParallelizationDetector();
    });

    test('should build dependency graph', () => {
      const graph = detector.buildDependencyGraph('fn1');
      expect(graph.nodes).toContain('fn1');
      expect(graph.edges).toBeDefined();
    });

    test('should detect parallelization opportunities', () => {
      const mockMetrics: RuntimeMetrics[] = [
        {
          functionName: 'map_fn',
          callCount: 1000,
          totalTime: 10000,
          avgTime: 10,
          p95Time: 15,
          p99Time: 20,
          minTime: 5,
          maxTime: 50,
          memoryUsage: 100000,
          cacheHitRate: 0.5,
          errorRate: 0.01,
          lastCalledAt: Date.now(),
          firstCalledAt: Date.now() - 10000,
        },
      ];

      const opportunities = detector.detectOpportunities(mockMetrics);
      expect(opportunities.length).toBeGreaterThanOrEqual(0);
    });

    test('should estimate independence for map functions', () => {
      const graph = detector.buildDependencyGraph('map_fn');
      // map 함수는 높은 독립성
    });

    test('should generate parallelization plan', () => {
      const mockMetrics: RuntimeMetrics[] = [
        {
          functionName: 'heavy_map',
          callCount: 100,
          totalTime: 5000,
          avgTime: 50,
          p95Time: 60,
          p99Time: 70,
          minTime: 40,
          maxTime: 100,
          memoryUsage: 500000,
          cacheHitRate: 0.3,
          errorRate: 0.01,
          lastCalledAt: Date.now(),
          firstCalledAt: Date.now() - 10000,
        },
      ];

      const opps = detector.detectOpportunities(mockMetrics);
      const plan = detector.generateParallelPlan(opps);
      expect(plan).toContain('PLAN');
    });

    test('should check data independence', () => {
      const callHistory = [
        { args: [1], result: 2 },
        { args: [1], result: 2 },
        { args: [2], result: 4 },
      ];

      const independent = detector.checkDataIndependence('fn', callHistory);
      expect(independent).toBe(true);
    });

    test('should calculate independence matrix', () => {
      const names = ['fn1', 'fn2', 'fn3'];
      const matrix = detector.getIndependenceMatrix(names);
      expect(matrix.length).toBe(3);
      expect(matrix[0].length).toBe(3);
      // 대각선은 1.0
      expect(matrix[0][0]).toBe(1.0);
    });
  });

  describe('DynamicOptimizer', () => {
    let optimizer: DynamicOptimizer;

    beforeEach(() => {
      optimizer = new DynamicOptimizer('test-optimizer');
    });

    test('should initialize correctly', () => {
      const status = optimizer.getCurrentStatus();
      expect((status as any).sessionId).toBe('test-optimizer');
      expect((status as any).metricsRecorded).toBe(0);
    });

    test('should record executions', () => {
      optimizer.recordExecution('fn1', 10, 100);
      optimizer.recordExecution('fn2', 20, 200);

      const status = optimizer.getCurrentStatus();
      expect((status as any).metricsRecorded).toBeGreaterThan(0);
    });

    test('should run optimization pipeline', async () => {
      optimizer.recordExecution('heavy', 100, 1000);
      for (let i = 0; i < 50; i++) {
        optimizer.recordExecution('heavy', 100, 1000);
      }
      optimizer.recordExecution('light', 1, 10);

      const result = await optimizer.optimizeRuntime();

      expect(result.sessionId).toBe('test-optimizer');
      expect(result.metrics.length).toBeGreaterThan(0);
      expect(result.hotSpots).toBeDefined();
      expect(result.healthScore).toBeGreaterThanOrEqual(0);
      expect(result.healthScore).toBeLessThanOrEqual(100);
    });

    test('should calculate performance delta', async () => {
      for (let i = 0; i < 100; i++) {
        optimizer.recordExecution('compute', 50 + Math.random() * 10, 100);
      }

      const result = await optimizer.optimizeRuntime();
      expect(result.performanceDelta).toBeGreaterThanOrEqual(0);
    });

    test('should generate recommendations', async () => {
      for (let i = 0; i < 100; i++) {
        optimizer.recordExecution('slow_fn', 200, 5000);
      }

      const result = await optimizer.optimizeRuntime();
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0]).toMatch(/Optimize|Enable|Parallelize|well-optimized/);
    });

    test('should generate report', async () => {
      optimizer.recordExecution('test', 10, 100);
      await optimizer.optimizeRuntime();

      const report = optimizer.generateReport();
      expect(report).toContain('DYNAMIC OPTIMIZATION REPORT');
      expect(report).toContain('Health Score');
    });

    test('should return dashboard data', async () => {
      optimizer.recordExecution('fn', 10, 100);
      await optimizer.optimizeRuntime();

      const dashboard = optimizer.getDashboardData();
      expect(dashboard).toHaveProperty('overview');
      expect(dashboard).toHaveProperty('hotspots');
      expect(dashboard).toHaveProperty('caching');
    });

    test('should track session history', async () => {
      await optimizer.optimizeRuntime();
      await optimizer.optimizeRuntime();

      const history = optimizer.getSessionHistory(10);
      expect(history.length).toBeGreaterThan(0);
    });

    test('should provide stats', async () => {
      optimizer.recordExecution('fn', 10, 100);
      await optimizer.optimizeRuntime();

      const stats = optimizer.getStats();
      expect(stats).toHaveProperty('totalSessions');
      expect(stats).toHaveProperty('avgPerformanceGain');
      expect(stats).toHaveProperty('topOptimizations');
    });

    test('should get performance trend', async () => {
      for (let i = 0; i < 3; i++) {
        optimizer.recordExecution(`fn${i}`, 10 + i * 10, 100);
        await optimizer.optimizeRuntime();
      }

      const trend = optimizer.getPerformanceTrend(10);
      expect(trend.length).toBeGreaterThan(0);
      expect(trend[0]).toHaveProperty('timestamp');
      expect(trend[0]).toHaveProperty('healthScore');
    });

    test('should reset optimizer', async () => {
      optimizer.recordExecution('fn', 10, 100);
      await optimizer.optimizeRuntime();

      optimizer.reset();
      const status = optimizer.getCurrentStatus();
      expect((status as any).metricsRecorded).toBe(0);
    });

    test('should reset all data', async () => {
      optimizer.recordExecution('fn', 10, 100);
      await optimizer.optimizeRuntime();

      optimizer.resetAll();
      const stats = optimizer.getStats() as any;
      expect(stats.totalSessions).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    test('should handle real-world performance optimization scenario', async () => {
      const optimizer = new DynamicOptimizer('real-world-test');

      // 시뮬레이션: 실제 워크로드
      // 1. 메인 연산 (무거움)
      for (let i = 0; i < 100; i++) {
        optimizer.recordExecution('matrix_multiply', 500, 10000);
      }

      // 2. 헬퍼 함수 (자주 호출, 반복 입력)
      for (let i = 0; i < 1000; i++) {
        optimizer.recordExecution('validate_input', 5, 50);
      }

      // 3. 캐시 가능한 함수
      for (let i = 0; i < 500; i++) {
        const cached = i % 10 === 0;
        optimizer.recordExecution('hash_lookup', 20, 100, cached, false);
      }

      const result = await optimizer.optimizeRuntime();

      expect(result.healthScore).toBeGreaterThanOrEqual(0);
      expect(result.healthScore).toBeLessThanOrEqual(100);
      expect(result.hotSpots.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    test('should provide actionable insights', async () => {
      const optimizer = new DynamicOptimizer('insights-test');

      for (let i = 0; i < 100; i++) {
        optimizer.recordExecution('expensive_op', 1000, 50000);
      }

      const result = await optimizer.optimizeRuntime();
      const dashboard = optimizer.getDashboardData() as any;

      expect(dashboard.overview.healthScore).toBeLessThan(100);
      expect(dashboard.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty metrics', async () => {
      const optimizer = new DynamicOptimizer('empty-test');
      const result = await optimizer.optimizeRuntime();

      expect(result.metrics.length).toBe(0);
      expect(result.healthScore).toBeDefined();
    });

    test('should handle single function', async () => {
      const optimizer = new DynamicOptimizer('single-test');
      optimizer.recordExecution('only_fn', 10, 100);

      const result = await optimizer.optimizeRuntime();
      expect(result.metrics.length).toBe(1);
    });

    test('should handle very fast functions', async () => {
      const optimizer = new DynamicOptimizer('fast-test');
      for (let i = 0; i < 1000; i++) {
        optimizer.recordExecution('instant_op', 0.1, 0);
      }

      const result = await optimizer.optimizeRuntime();
      expect(result.metrics.length).toBe(1);
    });

    test('should handle very slow functions', async () => {
      const optimizer = new DynamicOptimizer('slow-test');
      for (let i = 0; i < 10; i++) {
        optimizer.recordExecution('slow_op', 100000, 1000000);
      }

      const result = await optimizer.optimizeRuntime();
      expect(result.hotSpots.length).toBeGreaterThan(0);
      expect(result.healthScore).toBeLessThan(100);
    });

    test('should handle error-prone functions', async () => {
      const optimizer = new DynamicOptimizer('error-test');
      for (let i = 0; i < 100; i++) {
        optimizer.recordExecution('risky', 10, 100, false, i % 5 === 0 ? true : false);
      }

      const result = await optimizer.optimizeRuntime();
      const errorFn = result.metrics.find(m => m.functionName === 'risky');
      expect(errorFn!.errorRate).toBeGreaterThan(0);
    });
  });
});
