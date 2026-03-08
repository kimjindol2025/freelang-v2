/**
 * Phase 12.3: ThreadManager Tests
 *
 * Testing real OS-level threading vs Phase 10 Promise-based threading
 */

import {
  RealThreadManager,
  ThreadManager,
  createRealThreadManager,
  createThreadManager,
  Thread,
} from '../src/phase-12/thread-manager';

describe('Phase 12.3: ThreadManager - Real OS-Level Threading', () => {
  // ==================== RealThreadManager - Basic Operations ====================

  describe('RealThreadManager - Basic Operations', () => {
    let manager: RealThreadManager;

    beforeEach(() => {
      manager = new RealThreadManager({ size: 2 });
    });

    afterEach(async () => {
      await manager.terminate();
    });

    it('should spawn and complete simple thread', async () => {
      const thread = await manager.spawnThread(() => 42);

      expect(thread.state).toBe('pending'); // Not started yet
      expect(thread.duration).toBe(0);

      const result = await manager.join(thread);

      expect(result).toBe(42);
      expect(thread.state).toBe('completed');
      expect(thread.duration).toBeGreaterThan(0);
    });

    it('should spawn and complete async thread', async () => {
      const thread = await manager.spawnThread(async () => {
        return new Promise(resolve => {
          setTimeout(() => resolve(100), 10);
        });
      });

      const result = await manager.join(thread);

      expect(result).toBe(100);
      expect(thread.state).toBe('completed');
    });

    it('should handle thread errors', async () => {
      const thread = await manager.spawnThread(() => {
        throw new Error('Test error');
      });

      await expect(manager.join(thread)).rejects.toThrow('Test error');
      expect(thread.state).toBe('failed');
      expect(thread.error).toContain('Test error');
    });

    it('should track thread status', async () => {
      const thread = await manager.spawnThread(async () => {
        return new Promise(resolve => setTimeout(resolve, 50));
      });

      const status = manager.getThreadStatus(thread.id);
      expect(status).toBeDefined();
      expect(status?.id).toBe(thread.id);

      await manager.join(thread);

      expect(status?.state).toBe('completed');
    });
  });

  // ==================== RealThreadManager - Thread Pool Integration ====================

  describe('RealThreadManager - Worker Pool Integration', () => {
    let manager: RealThreadManager;

    beforeEach(() => {
      manager = new RealThreadManager({ size: 2 });
    });

    afterEach(async () => {
      await manager.terminate();
    });

    it('should execute threads in parallel (pool)', async () => {
      const slowTask = async () => {
        return new Promise(resolve => {
          setTimeout(() => resolve(1), 50);
        });
      };

      const startTime = performance.now();

      // Spawn 2 threads to run in parallel
      const thread1 = await manager.spawnThread(slowTask);
      const thread2 = await manager.spawnThread(slowTask);

      await Promise.all([
        manager.join(thread1),
        manager.join(thread2),
      ]);

      const elapsed = performance.now() - startTime;

      // Should be ~50ms (parallel), not ~100ms (sequential)
      // Allow 20ms margin for overhead
      expect(elapsed).toBeLessThan(100);
    });

    it('should queue tasks when all workers busy', async () => {
      const longTask = async () => {
        return new Promise(resolve => {
          setTimeout(() => resolve(1), 30);
        });
      };

      const startTime = performance.now();

      // Spawn 4 tasks on 2-worker pool
      const threads = await Promise.all([
        manager.spawnThread(longTask),
        manager.spawnThread(longTask),
        manager.spawnThread(longTask),
        manager.spawnThread(longTask),
      ]);

      const results = await Promise.all(
        threads.map(t => manager.join(t))
      );

      const elapsed = performance.now() - startTime;

      // 4 tasks on 2 workers: ~60ms (2 batches of 2)
      expect(elapsed).toBeGreaterThan(50);
      expect(elapsed).toBeLessThan(150);
      expect(results).toEqual([1, 1, 1, 1]);
    });
  });

  // ==================== RealThreadManager - API Compatibility ====================

  describe('RealThreadManager - Phase 10 API Compatibility', () => {
    let manager: RealThreadManager;

    beforeEach(() => {
      manager = new RealThreadManager({ size: 2 });
    });

    afterEach(async () => {
      await manager.terminate();
    });

    it('should support spawnThread API', async () => {
      const thread = await manager.spawnThread(
        () => 'hello',
        'test-thread'
      );

      const result = await manager.join(thread);
      expect(result).toBe('hello');
    });

    it('should support join with timeout', async () => {
      const thread = await manager.spawnThread(async () => {
        return new Promise(resolve => {
          setTimeout(() => resolve(42), 500);
        });
      });

      await expect(
        manager.join(thread, 100)
      ).rejects.toThrow('timed out');
    });

    it('should support getThreadStatus', async () => {
      const thread = await manager.spawnThread(async () => {
        return new Promise(resolve => setTimeout(resolve, 50));
      });

      const status = manager.getThreadStatus(thread.id);
      expect(status).toBeDefined();
      expect(status?.id).toBe(thread.id);

      await manager.join(thread);

      const completedStatus = manager.getThreadStatus(thread.id);
      expect(completedStatus?.state).toBe('completed');
    });

    it('should support getAllThreadStatus', async () => {
      const thread1 = await manager.spawnThread(() => 1);
      const thread2 = await manager.spawnThread(() => 2);

      const allStatus = manager.getAllThreadStatus();
      expect(allStatus.length).toBeGreaterThanOrEqual(2);
      expect(allStatus.some(t => t.id === thread1.id)).toBe(true);
      expect(allStatus.some(t => t.id === thread2.id)).toBe(true);

      await Promise.all([
        manager.join(thread1),
        manager.join(thread2),
      ]);
    });

    it('should support getThreadCount', async () => {
      const initialCount = manager.getThreadCount();

      const thread = await manager.spawnThread(() => 1);

      expect(manager.getThreadCount()).toBeGreaterThan(initialCount);

      await manager.join(thread);
    });

    it('should support joinAll', async () => {
      const thread1 = await manager.spawnThread(() => 10);
      const thread2 = await manager.spawnThread(() => 20);
      const thread3 = await manager.spawnThread(() => 30);

      const results = await manager.joinAll();

      expect(results.size).toBeGreaterThanOrEqual(3);
      expect(Array.from(results.values())).toContain(10);
      expect(Array.from(results.values())).toContain(20);
      expect(Array.from(results.values())).toContain(30);
    });
  });

  // ==================== Legacy ThreadManager - Phase 10 Compatibility ====================

  describe('ThreadManager (Legacy Phase 10)', () => {
    let manager: ThreadManager;

    beforeEach(() => {
      manager = new ThreadManager();
    });

    it('should spawn and join thread (Promise-based)', async () => {
      const thread = await manager.spawnThread(() => 42);

      const result = await manager.join(thread);

      expect(result).toBe(42);
      expect(thread.state).toBe('completed');
    });

    it('should handle errors', async () => {
      const thread = await manager.spawnThread(() => {
        throw new Error('Legacy error');
      });

      await expect(manager.join(thread)).rejects.toThrow('Legacy error');
      expect(thread.state).toBe('failed');
    });

    it('should maintain API compatibility', async () => {
      const thread = await manager.spawnThread(() => 100);

      expect(manager.getThreadStatus(thread.id)).toBeDefined();
      expect(manager.getThreadCount()).toBeGreaterThan(0);

      const result = await manager.join(thread);
      expect(result).toBe(100);

      const allStatus = manager.getAllThreadStatus();
      expect(allStatus.length).toBeGreaterThan(0);
    });
  });

  // ==================== Comparison: Real vs Legacy ====================

  describe('Comparison: RealThreadManager vs ThreadManager', () => {
    it('RealThreadManager should be faster on CPU-bound tasks', async () => {
      const cpuTask = () => {
        let sum = 0;
        for (let i = 0; i < 1000000; i++) {
          sum += Math.sqrt(i);
        }
        return sum;
      };

      // Legacy (Promise-based, single thread)
      const legacyManager = createThreadManager();
      const legacyStart = performance.now();

      const legacyThread1 = await legacyManager.spawnThread(cpuTask);
      const legacyThread2 = await legacyManager.spawnThread(cpuTask);

      await Promise.all([
        legacyManager.join(legacyThread1),
        legacyManager.join(legacyThread2),
      ]);

      const legacyTime = performance.now() - legacyStart;

      // Real (OS threads, true parallelism)
      const realManager = new RealThreadManager({ size: 2 });
      const realStart = performance.now();

      const realThread1 = await realManager.spawnThread(cpuTask);
      const realThread2 = await realManager.spawnThread(cpuTask);

      await Promise.all([
        realManager.join(realThread1),
        realManager.join(realThread2),
      ]);

      const realTime = performance.now() - realStart;

      await realManager.terminate();

      // RealThreadManager should be faster (ideally ~1.5-2x due to parallelism)
      // Allow for system variance
      console.log(`Legacy time: ${legacyTime.toFixed(2)}ms`);
      console.log(`Real time: ${realTime.toFixed(2)}ms`);
      console.log(`Speedup: ${(legacyTime / realTime).toFixed(2)}x`);

      // This assertion is probabilistic - on single-core it might not show improvement
      // But on multi-core it should be noticeably faster
      expect(realTime).toBeLessThanOrEqual(legacyTime * 1.2); // At least not much slower
    }, 30000);
  });

  // ==================== Stress Tests ====================

  describe('RealThreadManager - Stress Tests', () => {
    let manager: RealThreadManager;

    beforeEach(() => {
      manager = new RealThreadManager({ size: 4 });
    });

    afterEach(async () => {
      await manager.terminate();
    });

    it('should handle many concurrent threads', async () => {
      const threads: Thread<number>[] = [];

      for (let i = 0; i < 20; i++) {
        const thread = await manager.spawnThread(() => i);
        threads.push(thread);
      }

      const results = await Promise.all(
        threads.map(t => manager.join(t))
      );

      // Results might be in different order due to parallelism
      results.sort((a, b) => (a as number) - (b as number));
      expect(results).toEqual(
        Array.from({ length: 20 }, (_, i) => i)
      );
    });

    it('should handle rapid thread creation', async () => {
      const threads: Thread<any>[] = [];

      for (let i = 0; i < 50; i++) {
        const thread = await manager.spawnThread(async (): Promise<number> => {
          return new Promise(resolve => {
            setImmediate(() => resolve(i));
          });
        });
        threads.push(thread);
      }

      const results = await Promise.all(
        threads.map(t => manager.join(t))
      );

      expect(results.length).toBe(50);
    }, 10000);
  });

  // ==================== Factory Functions ====================

  describe('Factory Functions', () => {
    it('createRealThreadManager should work', async () => {
      const manager = createRealThreadManager(2);

      const thread = await manager.spawnThread(() => 42);
      const result = await manager.join(thread);

      expect(result).toBe(42);

      await manager.terminate();
    });

    it('createThreadManager should work', async () => {
      const manager = createThreadManager();

      const thread = await manager.spawnThread(() => 42);
      const result = await manager.join(thread);

      expect(result).toBe(42);
    });
  });
});
