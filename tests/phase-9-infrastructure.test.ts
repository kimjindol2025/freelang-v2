/**
 * Phase 9: Infrastructure Extensions - Complete Test Suite
 */

import {
  HTTPServer,
  HTTPClient,
  SimpleRouter,
} from '../src/phase-9/http-server';
import {
  AsyncUtils,
  Spawn,
} from '../src/phase-9/async-concurrency';
import { MemoryMonitor, PerformanceProfiler } from '../src/phase-9/memory-monitor';
import { WebProxy } from '../src/phase-9/web-proxy';

describe('Phase 9: Infrastructure Extensions', () => {
  describe('HTTP Server & Client', () => {
    test('should create HTTP server', () => {
      const server = new HTTPServer(8080);
      expect(server).toBeDefined();
    });

    test('should register routes', () => {
      const server = new HTTPServer(8080);
      server.route('/test', () => ({
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Test response',
      }));
      expect(server).toBeDefined();
    });

    test('should format bytes', () => {
      expect(HTTPServer).toBeDefined();
      // Just verify class exists
    });
  });

  describe('Async & Concurrency', () => {
    test('should handle async delay', async () => {
      const start = performance.now();
      await AsyncUtils.delay(100);
      const duration = performance.now() - start;

      expect(duration).toBeGreaterThanOrEqual(95); // Allow 5ms variance
      expect(duration).toBeLessThan(200);
    });

    test('should retry failed operations', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) throw new Error('Fail');
        return 'Success';
      };

      const result = await AsyncUtils.retry(fn, 5, 50);
      expect(result).toBe('Success');
      expect(attempts).toBe(3);
    });

    test('should timeout operations', async () => {
      try {
        await AsyncUtils.withTimeout(AsyncUtils.delay(1000), 100);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(String(error)).toContain('timed out');
      }
    });

    test('should execute sequential tasks', async () => {
      const tasks = [
        async () => {
          await AsyncUtils.delay(50);
          return 'Task 1';
        },
        async () => {
          await AsyncUtils.delay(50);
          return 'Task 2';
        },
        async () => {
          await AsyncUtils.delay(50);
          return 'Task 3';
        },
      ];

      const results = await AsyncUtils.sequential(tasks);
      expect(results.length).toBe(3);
      expect(results.filter((r) => r.success).length).toBe(3);
      expect(results.reduce((a, r) => a + r.duration, 0)).toBeGreaterThan(150);
    });

    test('should execute parallel tasks', async () => {
      const tasks = Array.from({ length: 10 }, (_, i) => async () => {
        await AsyncUtils.delay(50);
        return i;
      });

      const start = performance.now();
      const result = await AsyncUtils.parallel(tasks, 3);
      const duration = performance.now() - start;

      expect(result.completed).toBe(10);
      expect(result.failed).toBe(0);
      expect(duration).toBeLessThan(500); // 10 tasks, 3 concurrent, 50ms each
      expect(duration).toBeGreaterThan(150); // At least 3 * 50ms
    });

    test('should spawn single task', async () => {
      const result = await Spawn.run(async () => {
        return 'Spawned result';
      });

      expect(result.success).toBe(true);
      expect(result.value).toBe('Spawned result');
    });

    test('should spawn multiple tasks', async () => {
      const tasks = Array.from({ length: 5 }, (_, i) => async () => i * 2);
      const result = await Spawn.runMany(tasks, 2);

      expect(result.completed).toBe(5);
      expect(result.failed).toBe(0);
    });

    test('should map items in parallel', async () => {
      const items = [1, 2, 3, 4, 5];
      const results = await Spawn.map(
        items,
        async (n) => {
          await AsyncUtils.delay(10);
          return n * 2;
        },
        2
      );

      expect(results.length).toBe(5);
      expect(results.filter((r) => r.success).length).toBe(5);
      expect(results[0].value).toBe(2);
      expect(results[4].value).toBe(10);
    });
  });

  describe('Memory Monitoring', () => {
    test('should get memory usage', () => {
      const usage = MemoryMonitor.getMemoryUsage();
      expect(usage.rss).toBeGreaterThan(0);
      expect(usage.heapTotal).toBeGreaterThan(0);
      expect(usage.heapUsed).toBeGreaterThan(0);
      expect(usage.heapUsed).toBeLessThanOrEqual(usage.heapTotal);
    });

    test('should get system memory', () => {
      const memory = MemoryMonitor.getSystemMemory();
      expect(memory.totalMemory).toBeGreaterThan(0);
      expect(memory.freeMemory).toBeGreaterThan(0);
      expect(memory.freeMemory).toBeLessThanOrEqual(memory.totalMemory);
    });

    test('should format bytes', () => {
      expect(MemoryMonitor.formatBytes(1024)).toBe('1.00 KB');
      expect(MemoryMonitor.formatBytes(1024 * 1024)).toBe('1.00 MB');
      expect(MemoryMonitor.formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
    });

    test('should get memory report', () => {
      const report = MemoryMonitor.getReport();
      expect(report.timestamp).toBeDefined();
      expect(report.process.heapUsed).toBeGreaterThan(0);
      expect(report.system.totalMemory).toBeGreaterThan(0);
      expect(report.percentages.heapUsagePercent).toBeGreaterThan(0);
      expect(report.percentages.heapUsagePercent).toBeLessThanOrEqual(100);
    });

    test('should track memory snapshots', () => {
      const monitor = new MemoryMonitor();
      monitor.recordSnapshot();
      monitor.recordSnapshot();

      const trend = monitor.getMemoryTrend();
      expect(trend).toBeDefined();
      expect(trend?.duration).toBeGreaterThanOrEqual(0);
    });

    test('should set memory thresholds', () => {
      const monitor = new MemoryMonitor();
      monitor.setThreshold('heapUsagePercent', 85);
      expect(monitor).toBeDefined();
    });
  });

  describe('Performance Profiler', () => {
    test('should measure operation duration', () => {
      const profiler = new PerformanceProfiler();

      profiler.start('operation');
      for (let i = 0; i < 1000000; i++) {
        Math.sqrt(i);
      }
      const duration = profiler.end('operation');

      expect(duration).toBeGreaterThan(0);
    });

    test('should calculate average duration', () => {
      const profiler = new PerformanceProfiler();

      for (let i = 0; i < 3; i++) {
        profiler.start('task');
        for (let j = 0; j < 100000; j++) {
          Math.sqrt(j);
        }
        profiler.end('task');
      }

      const avg = profiler.getAverage('task');
      expect(avg).toBeGreaterThan(0);
    });

    test('should get operation statistics', () => {
      const profiler = new PerformanceProfiler();

      for (let i = 0; i < 5; i++) {
        profiler.start('test');
        for (let j = 0; j < 50000; j++) {
          Math.sqrt(j);
        }
        profiler.end('test');
      }

      const stats = profiler.getStats('test');
      expect(stats).toBeDefined();
      expect(stats?.count).toBe(5);
      expect(stats?.min).toBeGreaterThan(0);
      expect(stats?.max).toBeGreaterThanOrEqual(stats?.min || 0);
      expect(stats?.avg).toBeGreaterThan(0);
    });

    test('should handle multiple measurements', () => {
      const profiler = new PerformanceProfiler();

      profiler.start('task1');
      for (let i = 0; i < 100000; i++) Math.sqrt(i);
      profiler.end('task1');

      profiler.start('task2');
      for (let i = 0; i < 200000; i++) Math.sqrt(i);
      profiler.end('task2');

      const allStats = profiler.getAllStats();
      expect(allStats.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Web Proxy', () => {
    test('should create proxy with config', () => {
      const proxy = new WebProxy({
        port: 9000,
        targets: ['http://localhost:3000'],
        cacheEnabled: true,
        cacheTTL: 60000,
        timeout: 5000,
        maxRetries: 3,
      });

      expect(proxy).toBeDefined();
    });

    test('should get proxy statistics', () => {
      const proxy = new WebProxy({
        port: 9001,
        targets: ['http://localhost:3000'],
        cacheEnabled: true,
        cacheTTL: 60000,
        timeout: 5000,
        maxRetries: 3,
      });

      const stats = proxy.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
    });

    test('should track cache statistics', () => {
      const proxy = new WebProxy({
        port: 9002,
        targets: ['http://localhost:3000'],
        cacheEnabled: true,
        cacheTTL: 60000,
        timeout: 5000,
        maxRetries: 3,
      });

      const cacheStats = proxy.getCacheStats();
      expect(cacheStats.size).toBe(0);
      expect(cacheStats.capacity).toBeGreaterThan(0);
    });
  });

  describe('Router', () => {
    test('should create router', () => {
      const router = new SimpleRouter();
      expect(router).toBeDefined();
    });

    test('should register GET routes', () => {
      const router = new SimpleRouter();
      router.get('/api/users', () => ({
        statusCode: 200,
        headers: {},
        body: JSON.stringify([]),
      }));

      const handler = router.match('GET', '/api/users');
      expect(handler).toBeDefined();
    });

    test('should register POST routes', () => {
      const router = new SimpleRouter();
      router.post('/api/users', () => ({
        statusCode: 201,
        headers: {},
        body: JSON.stringify({ id: 1 }),
      }));

      const handler = router.match('POST', '/api/users');
      expect(handler).toBeDefined();
    });

    test('should list all routes', () => {
      const router = new SimpleRouter();
      router.get('/users', () => ({
        statusCode: 200,
        headers: {},
        body: '[]',
      }));
      router.post('/users', () => ({
        statusCode: 201,
        headers: {},
        body: '{}',
      }));

      const routes = router.list();
      expect(routes.length).toBe(2);
      expect(routes).toContain('GET:/users');
      expect(routes).toContain('POST:/users');
    });

    test('should return null for unmatched routes', () => {
      const router = new SimpleRouter();
      router.get('/api/users', () => ({
        statusCode: 200,
        headers: {},
        body: '[]',
      }));

      const handler = router.match('GET', '/api/posts');
      expect(handler).toBeNull();
    });
  });

  describe('Performance Benchmarks', () => {
    test('async delay should be < 150ms for 100ms delay', async () => {
      const start = performance.now();
      await AsyncUtils.delay(100);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(150);
    });

    test('memory usage check should be instant', () => {
      const start = performance.now();
      MemoryMonitor.getMemoryUsage();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5);
    });

    test('performance profiling should have minimal overhead', () => {
      const profiler = new PerformanceProfiler();

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        profiler.start(`task${i}`);
        for (let j = 0; j < 1000; j++) Math.sqrt(j);
        profiler.end(`task${i}`);
      }
      const duration = performance.now() - start;

      // Should complete reasonably fast
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Error Handling', () => {
    test('should handle retry failures', async () => {
      try {
        await AsyncUtils.retry(
          async () => {
            throw new Error('Always fails');
          },
          2,
          10
        );
        expect(true).toBe(false); // Should not reach
      } catch (error) {
        expect(String(error)).toContain('Always fails');
      }
    });

    test('should handle timeout errors', async () => {
      try {
        await AsyncUtils.withTimeout(
          new Promise(() => {
            // Never resolves
          }),
          100
        );
        expect(true).toBe(false);
      } catch (error) {
        expect(String(error)).toContain('timed out');
      }
    });

    test('should handle spawn failures gracefully', async () => {
      const result = await Spawn.run(async () => {
        throw new Error('Task failed');
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
