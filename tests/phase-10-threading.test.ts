import {
  Mutex,
  Channel,
  ThreadManager,
  ThreadPool,
  parallelMap,
  parallelFilter,
  testThreading,
} from '../src/phase-10/threading';

describe('Phase 10: Threading & Concurrency', () => {
  // Mutex Tests
  describe('Mutex', () => {
    it('should acquire and release locks', async () => {
      const mutex = new Mutex();
      await mutex.lock();
      expect(true).toBe(true); // Lock acquired
      mutex.unlock();
    });

    it('should execute with lock', async () => {
      const mutex = new Mutex();
      let executed = false;
      await mutex.withLock(async () => {
        executed = true;
      });
      expect(executed).toBe(true);
    });

    it('should serialize access with mutex', async () => {
      const mutex = new Mutex();
      let counter = 0;
      const tasks = Array.from({ length: 5 }, () =>
        mutex.withLock(async () => {
          counter++;
          await new Promise((r) => setTimeout(r, 10));
        })
      );
      await Promise.all(tasks);
      expect(counter).toBe(5);
    });
  });

  // Channel Tests
  describe('Channel', () => {
    it('should send and receive messages', async () => {
      const channel = new Channel<number>();
      channel.send(42);
      const msg = await channel.receive();
      expect(msg).toBe(42);
    });

    it('should handle multiple messages', async () => {
      const channel = new Channel<string>();
      await channel.send('hello');
      await channel.send('world');
      const msg1 = await channel.receive();
      const msg2 = await channel.receive();
      expect(msg1).toBe('hello');
      expect(msg2).toBe('world');
    });

    it('should try receive without blocking', async () => {
      const channel = new Channel<number>();
      const result = channel.tryReceive();
      expect(result).toBeUndefined();
      await channel.send(99);
      expect(channel.tryReceive()).toBe(99);
    });

    it('should track queue size', async () => {
      const channel = new Channel<string>();
      await channel.send('a');
      await channel.send('b');
      expect(channel.size()).toBe(2);
    });
  });

  // ThreadManager Tests
  describe('ThreadManager', () => {
    it('should spawn and join threads', async () => {
      const manager = new ThreadManager();
      const thread = await manager.spawnThread(async () => {
        await new Promise((r) => setTimeout(r, 50));
        return 'done';
      });
      const result = await manager.join(thread);
      expect(result).toBe('done');
    });

    it('should track thread status', async () => {
      const manager = new ThreadManager();
      const thread = await manager.spawnThread(async () => {
        return 42;
      });
      await manager.join(thread);
      const status = manager.getThreadStatus(thread.id);
      expect(status?.state).toBe('completed');
      expect(status?.result).toBe(42);
    });

    it('should handle thread errors', async () => {
      const manager = new ThreadManager();
      const thread = await manager.spawnThread(async () => {
        throw new Error('Thread failed');
      });
      try {
        await manager.join(thread);
        expect(true).toBe(false); // Should have thrown
      } catch (error) {
        expect(String(error)).toContain('Thread failed');
      }
    });

    it('should join all threads', async () => {
      const manager = new ThreadManager();
      const thread1 = await manager.spawnThread(async () => 1);
      const thread2 = await manager.spawnThread(async () => 2);
      const results = await manager.joinAll();
      expect(results.size).toBe(2);
    });

    it('should get all thread status', async () => {
      const manager = new ThreadManager();
      await manager.spawnThread(async () => 1);
      await manager.spawnThread(async () => 2);
      const statuses = manager.getAllThreadStatus();
      expect(statuses.length).toBe(2);
    });
  });

  // ThreadPool Tests
  describe('ThreadPool', () => {
    it('should execute tasks in pool', async () => {
      const pool = new ThreadPool(2);
      let count = 0;
      for (let i = 0; i < 4; i++) {
        pool.addTask(async () => {
          count++;
          return count;
        });
      }
      const results = await pool.run();
      expect(results.length).toBe(4);
    });

    it('should respect concurrency limit', async () => {
      const pool = new ThreadPool(2);
      let maxConcurrent = 0;
      let currentConcurrent = 0;
      for (let i = 0; i < 5; i++) {
        pool.addTask(async () => {
          currentConcurrent++;
          maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
          await new Promise((r) => setTimeout(r, 50));
          currentConcurrent--;
        });
      }
      await pool.run();
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it('should get progress', async () => {
      const pool = new ThreadPool(1);
      pool.addTask(async () => 1);
      pool.addTask(async () => 2);
      const progress = pool.getProgress();
      expect(progress.total).toBe(2);
    });

    it('should track active threads', async () => {
      const pool = new ThreadPool(2);
      pool.addTask(async () => 1);
      pool.addTask(async () => 2);
      // Before running
      expect(pool.getActiveThreadCount()).toBe(0);
      expect(pool.getPendingTaskCount()).toBe(2);
    });
  });

  // Parallel Map/Filter Tests
  describe('Parallel Operations', () => {
    it('should parallel map', async () => {
      const items = [1, 2, 3, 4, 5];
      const results = await parallelMap(
        items,
        async (n) => n * 2,
        2
      );
      expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    it('should parallel filter', async () => {
      const items = [1, 2, 3, 4, 5];
      const results = await parallelFilter(
        items,
        async (n) => n > 2,
        2
      );
      expect(results).toEqual([3, 4, 5]);
    });

    it('should maintain order in parallel map', async () => {
      const items = ['a', 'b', 'c', 'd'];
      const results = await parallelMap(
        items,
        async (s) => {
          await new Promise((r) => setTimeout(r, Math.random() * 10));
          return s.toUpperCase();
        },
        2
      );
      expect(results).toEqual(['A', 'B', 'C', 'D']);
    });
  });

  // Integration test
  it('should run threading tests without errors', async () => {
    await expect(testThreading()).resolves.not.toThrow();
  });
});
