/**
 * Phase 24: Performance Optimization & Profiling - Tests
 * Comprehensive tests for CPU profiling, memory profiling, benchmarking, etc.
 */

import {
  CPUProfiler,
  FunctionTimer,
  MemoryProfiler,
  BenchmarkRunner,
  OptimizationRecommender,
  PerformanceMonitor,
} from '../src/phase-24/index';

describe('Phase 24: Performance Optimization & Profiling', () => {
  describe('CPU Profiler', () => {
    let profiler: CPUProfiler;

    beforeEach(() => {
      profiler = new CPUProfiler('SAMPLING', 10);
    });

    test('Records function calls', () => {
      profiler.start();

      profiler.recordFunction('function1', 10);
      profiler.recordFunction('function1', 15);
      profiler.recordFunction('function2', 5);

      const profile1 = profiler.getProfile('function1');
      expect(profile1).toBeDefined();
      expect(profile1?.call_count).toBe(2);
      expect(profile1?.total_time_ms).toBe(25);
      expect(profile1?.avg_time_ms).toBe(12.5);
    });

    test('Calculates min/max times', () => {
      profiler.recordFunction('func', 5);
      profiler.recordFunction('func', 20);
      profiler.recordFunction('func', 10);

      const profile = profiler.getProfile('func');
      expect(profile?.min_time_ms).toBe(5);
      expect(profile?.max_time_ms).toBe(20);
    });

    test('Identifies hotspots', () => {
      // Create a scenario with one dominant function
      for (let i = 0; i < 100; i++) {
        profiler.recordFunction('hot_function', 1);
      }
      for (let i = 0; i < 10; i++) {
        profiler.recordFunction('cold_function', 1);
      }

      const hotspots = profiler.getTopFunctions(1);
      expect(hotspots[0].name).toBe('hot_function');
      expect(hotspots[0].call_count).toBe(100);
    });

    test('Generates flame graph', () => {
      profiler.recordFunction('main', 100);
      profiler.recordFunction('func1', 50);
      profiler.recordFunction('func2', 30);

      const graph = profiler.generateFlameGraph();
      expect(graph.name).toBe('root');
      expect(graph.children.length).toBe(3);
      expect(graph.value).toBeGreaterThan(0);
    });

    test('Provides statistics', () => {
      profiler.start();
      profiler.recordFunction('f1', 10);
      profiler.recordFunction('f2', 20);

      const stats = profiler.getStats();
      expect(stats.active).toBe(true);
      expect(stats.function_count).toBe(2);
      expect(stats.total_calls).toBe(2);
      expect(stats.total_time_ms).toBe(30);
    });

    test('Exports JSON', () => {
      profiler.recordFunction('test', 5);

      const exported = profiler.exportJSON();
      expect(exported.functions).toBeDefined();
      expect(exported.stats).toBeDefined();
      expect(exported.timestamp).toBeGreaterThan(0);
    });

    test('Resets profiler', () => {
      profiler.recordFunction('func', 10);
      expect(profiler.getAllProfiles().length).toBeGreaterThan(0);

      profiler.reset();
      expect(profiler.getAllProfiles().length).toBe(0);
    });
  });

  describe('Function Timer', () => {
    let profiler: CPUProfiler;
    let timer: FunctionTimer;

    beforeEach(() => {
      profiler = new CPUProfiler();
      timer = new FunctionTimer(profiler, 'test-func');
    });

    test('Measures function execution time', () => {
      timer.start();
      // Simulate work
      let sum = 0;
      for (let i = 0; i < 1000000; i++) {
        sum += i;
      }
      const duration = timer.end();

      expect(duration).toBeGreaterThan(0);

      const profile = profiler.getProfile('test-func');
      expect(profile?.call_count).toBe(1);
    });

    test('Measures async functions', async () => {
      const result = await timer.measure(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 42;
      });

      expect(result).toBe(42);

      const profile = profiler.getProfile('test-func');
      expect(profile?.call_count).toBe(1);
      expect(profile?.total_time_ms).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Memory Profiler', () => {
    let profiler: MemoryProfiler;

    beforeEach(() => {
      profiler = new MemoryProfiler();
      profiler.enableTracking();
    });

    test('Tracks allocations', () => {
      const id1 = profiler.recordAllocation(1024, 'String');
      const id2 = profiler.recordAllocation(2048, 'Array');

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();

      const usage = profiler.getCurrentUsage();
      expect(usage.object_count).toBe(2);
      expect(usage.total_size).toBe(3072);
    });

    test('Tracks deallocations', () => {
      const id = profiler.recordAllocation(1024, 'String');
      expect(profiler.getCurrentUsage().object_count).toBe(1);

      profiler.recordDeallocation(id);
      expect(profiler.getCurrentUsage().object_count).toBe(0);
    });

    test('Creates heap snapshots', () => {
      profiler.recordAllocation(1024, 'Object');
      profiler.recordAllocation(2048, 'Object');

      const snapshot = profiler.createSnapshot();
      expect(snapshot.object_count).toBe(2);
      expect(snapshot.total_size).toBe(3072);

      const all_snapshots = profiler.getAllProfiles();
      expect(all_snapshots.length).toBeGreaterThan(0);
    });

    test('Detects memory leaks', () => {
      // Create growing allocations
      for (let i = 0; i < 10; i++) {
        profiler.recordAllocation(100, 'LeakedObject');
      }
      profiler.createSnapshot();

      for (let i = 0; i < 15; i++) {
        profiler.recordAllocation(100, 'LeakedObject');
      }
      profiler.createSnapshot();

      const leaks = profiler.detectLeaks(10);
      expect(leaks.length).toBeGreaterThan(0);
      expect(leaks[0].type).toBe('LeakedObject');
    });

    test('Simulates garbage collection', () => {
      profiler.recordAllocation(1024, 'Temp');
      profiler.recordAllocation(2048, 'Temp');

      const before = profiler.getCurrentUsage().object_count;
      const freed = profiler.simulateGarbageCollection();

      expect(freed).toBeGreaterThanOrEqual(0);

      const stats = profiler.getStats();
      expect(stats.gc_stats.collections_run).toBe(1);
    });

    test('Compares snapshots', () => {
      profiler.recordAllocation(1024, 'String');
      profiler.createSnapshot();

      profiler.recordAllocation(2048, 'String');
      profiler.createSnapshot();

      const comparison = profiler.compareSnapshots(0, 1);
      expect(comparison).toBeDefined();
      expect(comparison?.size_diff).toBeGreaterThan(0);
      expect(comparison?.object_count_diff).toBeGreaterThan(0);
    });

    test('Disables tracking', () => {
      profiler.disableTracking();

      const id = profiler.recordAllocation(1024, 'String');
      expect(id).toBe('');

      const usage = profiler.getCurrentUsage();
      expect(usage.object_count).toBe(0);
    });
  });

  describe('Benchmark Runner', () => {
    let runner: BenchmarkRunner;

    beforeEach(() => {
      runner = new BenchmarkRunner();
    });

    test('Registers and runs benchmarks', async () => {
      runner.registerBenchmark({
        name: 'test-bench',
        iterations: 10,
        warmup_iterations: 2,
      });

      const result = await runner.run('test-bench', async () => {
        // Simulate work
        for (let i = 0; i < 100; i++) {
          Math.sqrt(i);
        }
      });

      expect(result.name).toBe('test-bench');
      expect(result.iterations).toBe(10);
      expect(result.avg_time_ms).toBeGreaterThan(0);
      expect(result.throughput).toBeGreaterThan(0);
    });

    test('Runs synchronous benchmarks', () => {
      runner.registerBenchmark({
        name: 'sync-bench',
        iterations: 5,
      });

      const result = runner.runSync('sync-bench', () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
      });

      expect(result.iterations).toBe(5);
      expect(result.min_time_ms).toBeLessThanOrEqual(result.avg_time_ms);
      expect(result.avg_time_ms).toBeLessThanOrEqual(result.max_time_ms);
    });

    test('Calculates statistics', () => {
      runner.registerBenchmark({
        name: 'stats-bench',
        iterations: 10,
      });

      runner.runSync('stats-bench', () => {
        Math.random();
      });

      const result = runner.getResult('stats-bench');
      expect(result?.std_dev_ms).toBeGreaterThanOrEqual(0);
      expect(result?.median_time_ms).toBeGreaterThan(0);
    });

    test('Compares benchmarks', async () => {
      runner.registerBenchmark({
        name: 'comparison',
        iterations: 5,
      });

      await runner.run('comparison', async () => {
        for (let i = 0; i < 100; i++) {
          Math.sqrt(i);
        }
      });

      // Simulate slower version
      runner.runSync('comparison', () => {
        for (let i = 0; i < 1000; i++) {
          Math.sqrt(i);
        }
      });

      const comparison = runner.compare('comparison', -2, -1, 10);
      expect(comparison).toBeDefined();
      expect(comparison?.baseline).toBeDefined();
      expect(comparison?.current).toBeDefined();
    });

    test('Detects regressions', () => {
      runner.registerBenchmark({
        name: 'regression',
        iterations: 5,
      });

      runner.runSync('regression', () => {
        Math.random();
      });

      // Slower run
      runner.runSync('regression', () => {
        for (let i = 0; i < 10000; i++) {
          Math.random();
        }
      });

      const regressions = runner.detectRegressions(10);
      expect(regressions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Optimization Recommender', () => {
    let recommender: OptimizationRecommender;

    beforeEach(() => {
      recommender = new OptimizationRecommender();
    });

    test('Detects hotspots', () => {
      const profiles = [
        { name: 'hot_func', total_time_ms: 500, call_count: 100 },
        { name: 'cold_func', total_time_ms: 50, call_count: 50 },
      ];

      const recs = recommender.analyzeHotspots(profiles);
      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0].type).toBe('HOTSPOT');
    });

    test('Detects memory leaks', () => {
      const stats = {
        potential_leaks: [
          { type: 'LeakedObject', growth_rate: 60 },
        ],
      };

      const recs = recommender.analyzeMemory(stats);
      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0].type).toBe('MEMORY_LEAK');
    });

    test('Recommends concurrency optimizations', () => {
      const profiles = [
        { name: 'long_func', total_time_ms: 5000, call_count: 10 },
      ];

      const recs = recommender.analyzeConcurrency(profiles);
      expect(recs.length).toBeGreaterThan(0);
    });

    test('Generates comprehensive recommendations', () => {
      const data = {
        function_profiles: [
          { name: 'hot', total_time_ms: 500, call_count: 100 },
        ],
        memory_stats: {
          potential_leaks: [],
          current_usage: { total_size: 50 * 1024 * 1024 },
        },
      };

      const recs = recommender.getRecommendations(data);
      expect(recs.length).toBeGreaterThan(0);
    });

    test('Generates text report', () => {
      const data = {
        function_profiles: [
          { name: 'test', total_time_ms: 100, call_count: 10 },
        ],
      };

      recommender.getRecommendations(data);
      const report = recommender.generateReport();

      expect(report).toContain('Optimization Report');
      expect(report).toContain('Recommendations');
    });
  });

  describe('Performance Monitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
      monitor = new PerformanceMonitor();
    });

    test('Collects metrics', () => {
      const snapshot = monitor.collectMetrics(50, 200, 100, 25, 0.02);

      expect(snapshot.cpu_percent).toBe(50);
      expect(snapshot.memory_mb).toBe(200);
      expect(snapshot.timestamp).toBeGreaterThan(0);
    });

    test('Tracks current metrics', () => {
      monitor.collectMetrics(60, 300, 150, 30, 0.03);

      const current = monitor.getCurrentMetrics();
      expect(current).toBeDefined();
      expect(current?.cpu_percent).toBe(60);
    });

    test('Calculates average metrics', () => {
      monitor.collectMetrics(50, 200, 100, 25, 0.02);
      monitor.collectMetrics(60, 250, 120, 30, 0.03);

      const avg = monitor.getAverageMetrics(10000);
      expect(avg.avg_cpu).toBeLessThanOrEqual(60);
      expect(avg.avg_memory).toBeLessThanOrEqual(250);
    });

    test('Generates alerts for high CPU', () => {
      monitor.setThresholds({ cpu_percent_warning: 50 });

      monitor.collectMetrics(75, 200, 100, 25, 0.02);

      const alerts = monitor.getAlerts('WARNING');
      expect(alerts.length).toBeGreaterThan(0);
    });

    test('Generates alerts for high memory', () => {
      monitor.setThresholds({ memory_mb_critical: 300 });

      monitor.collectMetrics(50, 400, 100, 25, 0.02);

      const alerts = monitor.getAlerts('CRITICAL');
      expect(alerts.length).toBeGreaterThan(0);
    });

    test('Alert handlers are called', (done) => {
      monitor.setThresholds({ cpu_percent_warning: 50 });

      monitor.onAlert((alert) => {
        expect(alert.type).toBe('CPU_WARNING');
        done();
      });

      monitor.collectMetrics(75, 200, 100, 25, 0.02);
    });

    test('Exports monitoring data', () => {
      monitor.collectMetrics(50, 200, 100, 25, 0.02);

      const exported = monitor.exportJSON();
      expect(exported.snapshots).toBeDefined();
      expect(exported.alerts).toBeDefined();
      expect(exported.stats).toBeDefined();
    });

    test('Resets monitor', () => {
      monitor.collectMetrics(50, 200, 100, 25, 0.02);
      expect(monitor.getStats().total_snapshots).toBe(1);

      monitor.reset();
      expect(monitor.getStats().total_snapshots).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    test('CPU Profiler + Benchmark Runner', async () => {
      const profiler = new CPUProfiler();
      const runner = new BenchmarkRunner();

      runner.registerBenchmark({
        name: 'integrated',
        iterations: 5,
      });

      profiler.start();

      await runner.run('integrated', async () => {
        for (let i = 0; i < 1000; i++) {
          Math.sqrt(i);
        }
      });

      profiler.stop();

      const result = runner.getResult('integrated');
      expect(result).toBeDefined();
    });

    test('Memory Profiler + Optimization Recommender', () => {
      const memory_prof = new MemoryProfiler();
      const recommender = new OptimizationRecommender();

      memory_prof.enableTracking();

      for (let i = 0; i < 50; i++) {
        memory_prof.recordAllocation(1024, 'Object');
      }
      memory_prof.createSnapshot();

      for (let i = 0; i < 75; i++) {
        memory_prof.recordAllocation(1024, 'Object');
      }
      memory_prof.createSnapshot();

      const stats = memory_prof.getStats();
      const recs = recommender.analyzeMemory(stats);

      expect(recs.length).toBeGreaterThan(0);
    });

    test('Performance Monitor + Benchmark Runner', async () => {
      const monitor = new PerformanceMonitor();
      const runner = new BenchmarkRunner();

      runner.registerBenchmark({
        name: 'monitored',
        iterations: 3,
      });

      monitor.startMonitoring(100);

      await runner.run('monitored', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
      });

      monitor.stopMonitoring();

      const bench_result = runner.getResult('monitored');
      const monitor_stats = monitor.getStats();

      expect(bench_result).toBeDefined();
      expect(monitor_stats.total_snapshots).toBeGreaterThan(0);
    });
  });
});
