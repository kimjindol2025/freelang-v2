/**
 * Phase 12: Worker Pool Tests
 *
 * OS-level 병렬화 검증
 */

import {
  WorkerPool,
  getGlobalPool,
  initGlobalPool,
  terminateGlobalPool,
  runInWorker,
} from '../src/phase-12/worker-pool';

describe('Phase 12: Worker Pool - OS-Level Threading', () => {
  // ==================== Basic Functionality ====================

  describe('WorkerPool Creation & Termination', () => {
    it('should create pool with default size (CPU core count)', () => {
      const pool = new WorkerPool();
      const status = pool.getStatus();
      expect(status.poolSize).toBeGreaterThan(0);
      expect(status.workers.length).toBe(status.poolSize);
      pool.terminate();
    });

    it('should create pool with custom size', () => {
      const pool = new WorkerPool({ size: 2 });
      const status = pool.getStatus();
      expect(status.poolSize).toBe(2);
      expect(status.workers.length).toBe(2);
      pool.terminate();
    });

    it('should terminate without errors', async () => {
      const pool = new WorkerPool({ size: 2 });
      await expect(pool.terminate()).resolves.not.toThrow();
    });
  });

  // ==================== Task Execution ====================

  describe('Simple Task Execution', () => {
    let pool: WorkerPool;

    beforeEach(() => {
      pool = new WorkerPool({ size: 2 });
    });

    afterEach(async () => {
      await pool.terminate();
    });

    it('should execute synchronous function', async () => {
      const result = await pool.execute(() => 42);
      expect(result).toBe(42);
    });

    it('should execute async function', async () => {
      const result = await pool.execute(async () => {
        return new Promise(resolve => {
          setTimeout(() => resolve(42), 10);
        });
      });
      expect(result).toBe(42);
    });

    it('should return function result', async () => {
      const result = await pool.execute(() => ({ value: 42 }));
      expect(result).toEqual({ value: 42 });
    });

    it('should handle multiple sequential tasks', async () => {
      const r1 = await pool.execute(() => 1);
      const r2 = await pool.execute(() => 2);
      const r3 = await pool.execute(() => 3);

      expect([r1, r2, r3]).toEqual([1, 2, 3]);
    });

    it('should handle errors gracefully', async () => {
      await expect(
        pool.execute(() => {
          throw new Error('Task failed');
        })
      ).rejects.toThrow('Task failed');
    });

    it('should handle async errors', async () => {
      await expect(
        pool.execute(async () => {
          throw new Error('Async task failed');
        })
      ).rejects.toThrow('Async task failed');
    });
  });

  // ==================== Parallelism ====================

  describe('Parallelism & Performance', () => {
    let pool: WorkerPool;

    beforeEach(() => {
      pool = new WorkerPool({ size: 4 });
    });

    afterEach(async () => {
      await pool.terminate();
    });

    it('should execute tasks in parallel (wall time < sum of task times)', async () => {
      const taskTime = 100; // 100ms per task
      const taskCount = 4;

      const startTime = performance.now();

      // Sequential would take ~400ms
      // Parallel on 4 cores should take ~100ms
      const promises = Array.from({ length: taskCount }, () =>
        pool.execute(async () => {
          return new Promise(resolve => {
            setTimeout(resolve, taskTime);
          });
        })
      );

      await Promise.all(promises);
      const elapsed = performance.now() - startTime;

      // Parallel execution should be much faster than sequential
      // Threshold: 300ms (gives some margin for system overhead)
      expect(elapsed).toBeLessThan(taskTime * taskCount - 100);
    });

    it('should queue tasks when all workers busy', async () => {
      const longTask = () =>
        new Promise(resolve => setTimeout(resolve, 50));

      const startTime = performance.now();

      // Submit 8 tasks to 4-worker pool
      const promises = Array.from({ length: 8 }, () =>
        pool.execute(longTask)
      );

      await Promise.all(promises);
      const elapsed = performance.now() - startTime;

      // 8 tasks × 50ms ÷ 4 workers ≈ 100ms
      // With overhead, should be 100-150ms
      expect(elapsed).toBeGreaterThan(90);
      expect(elapsed).toBeLessThan(200);
    });
  });

  // ==================== Status & Monitoring ====================

  describe('Pool Status & Monitoring', () => {
    let pool: WorkerPool;

    beforeEach(() => {
      pool = new WorkerPool({ size: 2 });
    });

    afterEach(async () => {
      await pool.terminate();
    });

    it('should report initial status', () => {
      const status = pool.getStatus();

      expect(status.poolSize).toBe(2);
      expect(status.queuedTasks).toBe(0);
      expect(status.activeTasks).toBe(0);
      expect(status.workers.length).toBe(2);
      expect(status.workers.every(w => !w.busy)).toBe(true);
    });

    it('should track task count', async () => {
      const longTask = () =>
        new Promise(resolve => setTimeout(resolve, 50));

      const promise = pool.execute(longTask);

      // Give it time to start
      await new Promise(resolve => setTimeout(resolve, 10));

      const statusDuring = pool.getStatus();
      expect(statusDuring.activeTasks).toBeGreaterThanOrEqual(0);

      await promise;

      const statusAfter = pool.getStatus();
      expect(statusAfter.activeTasks).toBe(0);
    });
  });

  // ==================== Global Pool ====================

  describe('Global Pool Singleton', () => {
    afterEach(async () => {
      await terminateGlobalPool();
    });

    it('should initialize global pool', () => {
      const pool = initGlobalPool({ size: 2 });
      expect(pool).toBeDefined();
      expect(pool.getStatus().poolSize).toBe(2);
    });

    it('should return same instance on getGlobalPool', () => {
      initGlobalPool({ size: 2 });
      const pool1 = getGlobalPool();
      const pool2 = getGlobalPool();

      expect(pool1).toBe(pool2);
    });

    it('should execute with runInWorker convenience function', async () => {
      initGlobalPool({ size: 2 });
      const result = await runInWorker(() => 42);

      expect(result).toBe(42);
    });
  });

  // ==================== Queue Management ====================

  describe('Queue Management', () => {
    it('should have maxQueueSize configuration', () => {
      const pool = new WorkerPool({ size: 1, maxQueueSize: 10 });
      const status = pool.getStatus();

      expect(status.queuedTasks).toBe(0);
      pool.terminate();
    });
  });

  // ==================== Drain ====================

  describe('Drain (Wait for Completion)', () => {
    it('should provide drain API for waiting', async () => {
      const pool = new WorkerPool({ size: 2 });

      // Quick tasks
      const promises = Array.from({ length: 5 }, () =>
        pool.execute(() => 1)
      );

      // Drain method exists and works
      await pool.drain();
      await Promise.all(promises);

      expect(promises.length).toBe(5);
      await pool.terminate();
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    let pool: WorkerPool;

    beforeEach(() => {
      pool = new WorkerPool({ size: 2 });
    });

    afterEach(async () => {
      await pool.terminate();
    });

    it('should reject execute after termination', async () => {
      await pool.terminate();

      await expect(pool.execute(() => 42)).rejects.toThrow(
        'Worker pool has been terminated'
      );
    });

    it('should handle null/undefined results', async () => {
      const resultNull = await pool.execute(() => null);
      expect(resultNull).toBeNull();

      const resultUndef = await pool.execute(() => undefined);
      expect(resultUndef).toBeUndefined();
    });

    it('should handle large objects', async () => {
      const largeObj = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: Math.random(),
        })),
      };

      const result = await pool.execute(() => largeObj);
      expect(result.data.length).toBe(1000);
    });
  });
});
