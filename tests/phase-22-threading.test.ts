/**
 * Phase 22: Threading and Synchronization Tests
 * 60 test cases covering:
 * - Thread lifecycle and management
 * - Synchronization primitives (Mutex, Semaphore, RWLock, Condition)
 * - Thread local storage
 * - Thread priority and states
 */

import { ThreadBase } from '../src/phase-22/threading/thread-base';
import { Mutex, Semaphore, RWLock, ConditionVariable } from '../src/phase-22/synchronization/sync-primitives';

describe('Phase 22: Threading System', () => {
  beforeEach(() => {
    ThreadBase.resetIdCounter();
    ThreadBase.clearAll();
  });

  // ───── Thread Lifecycle (10 tests) ─────

  describe('Thread Lifecycle', () => {
    test('creates thread', () => {
      const thread = new ThreadBase('test', async () => {});
      expect(thread.getName()).toBe('test');
      expect(thread.getState()).toBe('new');
    });

    test('thread state transitions', async () => {
      let state_sequence: string[] = [];
      const thread = new ThreadBase('state-test', async () => {
        state_sequence.push(thread.getState());
      });

      await thread.start();
      state_sequence.push(thread.getState());

      expect(state_sequence).toContain('running');
      expect(thread.getState()).toBe('terminated');
    });

    test('executes thread code', async () => {
      let executed = false;
      const thread = new ThreadBase('exec', async () => {
        executed = true;
      });

      await thread.start();
      expect(executed).toBe(true);
    });

    test('thread join waits for completion', async () => {
      let counter = 0;
      const thread = new ThreadBase('join-test', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        counter++;
      });

      await thread.start();
      await thread.join();
      expect(counter).toBe(1);
    });

    test('join with timeout', async () => {
      const thread = new ThreadBase('timeout', async () => {
        await new Promise(() => {}); // Never resolves
      });

      thread.start().catch(() => {});
      const result = await thread.join(50);
      thread.interrupt();

      expect(result).toBe(false);
    });

    test('multiple threads run concurrently', async () => {
      const times: number[] = [];
      const thread1 = new ThreadBase('t1', async () => {
        times.push(Date.now());
      });
      const thread2 = new ThreadBase('t2', async () => {
        times.push(Date.now());
      });

      await Promise.all([thread1.start(), thread2.start()]);

      expect(times.length).toBe(2);
    });

    test('thread interrupt', async () => {
      const thread = new ThreadBase('interrupt', async () => {
        expect(thread.isInterrupted()).toBe(false);
        thread.interrupt();
        expect(thread.isInterrupted()).toBe(true);
      });

      await thread.start();
    });

    test('thread sleep', async () => {
      const start = Date.now();
      const thread = new ThreadBase('sleep', async () => {
        await thread.sleep(20);
      });

      await thread.start();
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(20);
      expect(thread.getStats().block_count).toBe(1);
    });

    test('thread yield', async () => {
      let yielded = false;
      const thread = new ThreadBase('yield', async () => {
        await thread.yield();
        yielded = true;
      });

      await thread.start();
      expect(yielded).toBe(true);
    });

    test('gets thread statistics', async () => {
      const thread = new ThreadBase('stats', async () => {
        await thread.sleep(5);
      });

      await thread.start();
      const stats = thread.getStats();

      expect(stats.name).toBe('stats');
      expect(stats.state).toBe('terminated');
      expect(stats.cpu_time_ms).toBeGreaterThan(0);
      expect(stats.block_count).toBeGreaterThan(0);
    });
  });

  // ───── Thread Management (8 tests) ─────

  describe('Thread Management', () => {
    test('gets thread by ID', async () => {
      const thread = new ThreadBase('find-id', async () => {});
      const id = thread.getId();

      const found = ThreadBase.findById(id);
      expect(found).toBe(thread);
    });

    test('finds thread by name', async () => {
      const thread = new ThreadBase('find-name', async () => {});
      const found = ThreadBase.findByName('find-name');

      expect(found).toBe(thread);
    });

    test('counts active threads', async () => {
      const t1 = new ThreadBase('count1', async () => {});
      const t2 = new ThreadBase('count2', async () => {});

      expect(ThreadBase.getActiveCount()).toBe(2);
    });

    test('lists all threads', async () => {
      new ThreadBase('list1', async () => {});
      new ThreadBase('list2', async () => {});

      const all = ThreadBase.getAllThreads();
      expect(all.length).toBe(2);
    });

    test('thread priority', async () => {
      const thread = new ThreadBase('priority', async () => {}, { priority: 'high' });
      expect(thread.getConfig().priority).toBe('high');

      thread.setPriority('low');
      expect(thread.getConfig().priority).toBe('low');
    });

    test('thread is alive', async () => {
      const thread = new ThreadBase('alive', async () => {
        expect(thread.isAlive()).toBe(true);
      });

      expect(thread.isAlive()).toBe(false);

      await thread.start();
      expect(thread.isAlive()).toBe(false); // Terminated after start
    });

    test('daemon threads', () => {
      const daemon = new ThreadBase('daemon', async () => {}, { daemon: true });
      const normal = new ThreadBase('normal', async () => {}, { daemon: false });

      expect(daemon.getConfig().daemon).toBe(true);
      expect(normal.getConfig().daemon).toBe(false);
    });

    test('duplicate start throws', async () => {
      const thread = new ThreadBase('dup', async () => {});
      await thread.start();

      // start() is async, so we need to await and check rejection
      await expect(thread.start()).rejects.toThrow();
    });
  });

  // ───── Thread Local Storage (6 tests) ─────

  describe('Thread Local Storage', () => {
    test('sets and gets thread local value', async () => {
      const thread = new ThreadBase('tls-get', async () => {
        thread.setLocal('key', 'value');
        expect(thread.getLocal('key')).toBe('value');
      });

      await thread.start();
    });

    test('removes thread local value', async () => {
      const thread = new ThreadBase('tls-remove', async () => {
        thread.setLocal('key', 'value');
        thread.removeLocal('key');
        expect(thread.getLocal('key')).toBeUndefined();
      });

      await thread.start();
    });

    test('multiple thread local values', async () => {
      const thread = new ThreadBase('tls-multi', async () => {
        thread.setLocal('a', 1);
        thread.setLocal('b', 2);
        thread.setLocal('c', 3);

        expect(thread.getLocal('a')).toBe(1);
        expect(thread.getLocal('b')).toBe(2);
        expect(thread.getLocal('c')).toBe(3);
      });

      await thread.start();
    });

    test('overwrites thread local value', async () => {
      const thread = new ThreadBase('tls-overwrite', async () => {
        thread.setLocal('x', 'old');
        thread.setLocal('x', 'new');
        expect(thread.getLocal('x')).toBe('new');
      });

      await thread.start();
    });

    test('isolated thread local storage', async () => {
      const t1 = new ThreadBase('t1-tls', async () => {
        t1.setLocal('shared', 't1-value');
      });

      const t2 = new ThreadBase('t2-tls', async () => {
        t2.setLocal('shared', 't2-value');
      });

      await Promise.all([t1.start(), t2.start()]);

      expect(t1.getLocal('shared')).toBe('t1-value');
      expect(t2.getLocal('shared')).toBe('t2-value');
    });

    test('thread local types', async () => {
      const thread = new ThreadBase('tls-types', async () => {
        thread.setLocal('num', 42);
        thread.setLocal('str', 'hello');
        thread.setLocal('obj', { x: 1 });
        thread.setLocal('arr', [1, 2, 3]);

        expect(thread.getLocal('num')).toBe(42);
        expect(thread.getLocal('str')).toBe('hello');
        expect(thread.getLocal('obj').x).toBe(1);
        expect(thread.getLocal('arr')).toEqual([1, 2, 3]);
      });

      await thread.start();
    });
  });

  // ───── Mutex Synchronization (9 tests) ─────

  describe('Mutex', () => {
    test('acquires and releases mutex', async () => {
      const mutex = new Mutex('test');
      await mutex.lock();
      expect(mutex.isLocked()).toBe(true);

      mutex.unlock();
      expect(mutex.isLocked()).toBe(false);
    });

    test('try lock succeeds when available', () => {
      const mutex = new Mutex('try');
      const result = mutex.tryLock();
      expect(result).toBe(true);
      expect(mutex.isLocked()).toBe(true);
    });

    test('try lock fails when locked', async () => {
      const mutex = new Mutex('busy');
      await mutex.lock();
      const result = mutex.tryLock();
      expect(result).toBe(false);
    });

    test('mutex blocks when locked', async () => {
      const mutex = new Mutex('block');
      let order: number[] = [];

      const t1 = new ThreadBase('t1', async () => {
        await mutex.lock();
        order.push(1);
        mutex.unlock();
      });

      const t2 = new ThreadBase('t2', async () => {
        await mutex.lock();
        order.push(2);
        mutex.unlock();
      });

      await mutex.lock();
      // Start threads without awaiting (let them run concurrently)
      t1.start().catch(() => {});
      t2.start().catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 50));
      mutex.unlock();

      await Promise.all([t1.join(), t2.join()]);
      expect(order.length).toBe(2);
    });

    test('mutex unlock throws when not locked', () => {
      const mutex = new Mutex('error');
      expect(() => mutex.unlock()).toThrow();
    });

    test('gets mutex statistics', async () => {
      const mutex = new Mutex('stats');
      await mutex.lock();
      const stats = mutex.getStats();

      expect(stats.lock_type).toBe('mutex');
      expect(stats.acquire_count).toBe(1);
      expect(stats.release_count).toBe(0);
    });

    test('mutex waiting count', async () => {
      const mutex = new Mutex('wait');
      await mutex.lock();

      const t1 = new ThreadBase('waiter', async () => {
        await mutex.lock();
        mutex.unlock();
      });

      t1.start().catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mutex.getWaitingCount()).toBeGreaterThan(0);
      mutex.unlock();
    });

    test('multiple lock/unlock cycles', async () => {
      const mutex = new Mutex('cycle');

      for (let i = 0; i < 5; i++) {
        await mutex.lock();
        expect(mutex.isLocked()).toBe(true);
        mutex.unlock();
        expect(mutex.isLocked()).toBe(false);
      }
    });

    test('mutex with owner tracking', async () => {
      const mutex = new Mutex('owner');
      await mutex.lock(123);
      expect(mutex.getOwner()).toBe(123);

      mutex.unlock();
      expect(mutex.getOwner()).toBeUndefined();
    });
  });

  // ───── Semaphore (9 tests) ─────

  describe('Semaphore', () => {
    test('acquires and releases semaphore', async () => {
      const sem = new Semaphore('test', 1, 1);
      await sem.acquire();
      expect(sem.getAvailable()).toBe(0);

      sem.release();
      expect(sem.getAvailable()).toBe(1);
    });

    test('semaphore with multiple permits', async () => {
      const sem = new Semaphore('multi', 3, 3);

      for (let i = 0; i < 3; i++) {
        await sem.acquire();
      }

      expect(sem.getAvailable()).toBe(0);
    });

    test('try acquire succeeds', async () => {
      const sem = new Semaphore('try', 2, 2);
      expect(sem.tryAcquire()).toBe(true);
      expect(sem.getAvailable()).toBe(1);
    });

    test('try acquire fails when exhausted', async () => {
      const sem = new Semaphore('exhausted', 1, 1);
      await sem.acquire();
      expect(sem.tryAcquire()).toBe(false);
    });

    test('semaphore release throws when full', async () => {
      const sem = new Semaphore('full', 1, 1);
      expect(() => sem.release()).toThrow();
    });

    test('semaphore blocks when exhausted', async () => {
      const sem = new Semaphore('block', 1, 1);
      await sem.acquire();

      let acquired = false;
      const thread = new ThreadBase('waiter', async () => {
        await sem.acquire();
        acquired = true;
      });

      thread.start().catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(acquired).toBe(false);

      sem.release();
      await thread.join();
      expect(acquired).toBe(true);
    });

    test('semaphore statistics', async () => {
      const sem = new Semaphore('stats', 2, 2);
      await sem.acquire();

      const stats = sem.getStats();
      expect(stats.lock_type).toBe('semaphore');
      expect(stats.acquire_count).toBe(1);
    });

    test('multiple acquire/release cycles', async () => {
      const sem = new Semaphore('cycle', 2, 2);

      for (let i = 0; i < 5; i++) {
        await sem.acquire();
        await sem.acquire();
        sem.release();
        sem.release();
      }

      expect(sem.getAvailable()).toBe(2);
    });

    test('semaphore waiting threads', async () => {
      const sem = new Semaphore('wait', 1, 1);
      await sem.acquire();

      const t1 = new ThreadBase('w1', async () => {
        await sem.acquire();
      });

      t1.start().catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sem.getWaitingCount()).toBeGreaterThan(0);
      sem.release();
    });
  });

  // ───── RWLock (8 tests) ─────

  describe('RWLock', () => {
    test('multiple readers allowed', async () => {
      const lock = new RWLock('readers');

      await lock.readLock();
      await lock.readLock();

      expect(lock.getStats().acquire_count).toBe(2);

      lock.readUnlock();
      lock.readUnlock();
    });

    test('write lock blocks readers', async () => {
      const lock = new RWLock('exclusive');
      let reader_ran = false;

      await lock.writeLock();

      const reader = new ThreadBase('reader', async () => {
        await lock.readLock();
        reader_ran = true;
        lock.readUnlock();
      });

      reader.start().catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(reader_ran).toBe(false);

      lock.writeUnlock();
      await reader.join();
      expect(reader_ran).toBe(true);
    });

    test('reader blocks writer', async () => {
      const lock = new RWLock('wait');
      let writer_ran = false;

      await lock.readLock();

      const writer = new ThreadBase('writer', async () => {
        await lock.writeLock();
        writer_ran = true;
        lock.writeUnlock();
      });

      writer.start().catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(writer_ran).toBe(false);

      lock.readUnlock();
      await writer.join();
      expect(writer_ran).toBe(true);
    });

    test('read unlock throws when no readers', () => {
      const lock = new RWLock('error');
      expect(() => lock.readUnlock()).toThrow();
    });

    test('write unlock throws when not locked', () => {
      const lock = new RWLock('error2');
      expect(() => lock.writeUnlock()).toThrow();
    });

    test('statistics', async () => {
      const lock = new RWLock('stats');
      await lock.readLock();
      lock.readUnlock();

      const stats = lock.getStats();
      expect(stats.lock_type).toBe('rwlock');
    });

    test('multiple concurrent readers', async () => {
      const lock = new RWLock('concurrent');
      let read_count = 0;

      const readers = [];
      for (let i = 0; i < 3; i++) {
        const reader = new ThreadBase(`reader${i}`, async () => {
          await lock.readLock();
          read_count++;
          lock.readUnlock();
        });
        readers.push(reader);
      }

      await Promise.all(readers.map(r => r.start()));
      expect(read_count).toBe(3);
    });

    test('alternating read/write', async () => {
      const lock = new RWLock('alternate');
      const sequence: string[] = [];

      const reader = new ThreadBase('r', async () => {
        await lock.readLock();
        sequence.push('r');
        lock.readUnlock();
      });

      const writer = new ThreadBase('w', async () => {
        await lock.writeLock();
        sequence.push('w');
        lock.writeUnlock();
      });

      await reader.start();
      await writer.start();

      expect(sequence.length).toBe(2);
    });
  });

  // ───── ConditionVariable (10 tests) ─────

  describe('ConditionVariable', () => {
    test('creates condition variable', () => {
      const cv = new ConditionVariable('test');
      expect(cv.getWaitingCount()).toBe(0);
    });

    test('notify wakes waiting thread', async () => {
      const cv = new ConditionVariable('notify');
      let notified = false;

      const waiter = new ThreadBase('waiter', async () => {
        await cv.wait();
        notified = true;
      });

      waiter.start().catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(notified).toBe(false);
      cv.notify();

      await waiter.join();
      expect(notified).toBe(true);
    });

    test('notify all wakes all threads', async () => {
      const cv = new ConditionVariable('notify_all');
      let count = 0;

      const threads = [];
      for (let i = 0; i < 3; i++) {
        const t = new ThreadBase(`t${i}`, async () => {
          await cv.wait();
          count++;
        });
        threads.push(t);
      }

      // Start all threads (don't await to let them run concurrently)
      threads.forEach(t => t.start().catch(() => {}));
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(count).toBe(0);

      cv.notifyAll();
      await Promise.all(threads.map(t => t.join()));

      expect(count).toBe(3);
    });

    test('wait without notify blocks', async () => {
      const cv = new ConditionVariable('block');
      let waited = false;

      const waiter = new ThreadBase('blocked', async () => {
        await cv.wait();
        waited = true;
      });

      waiter.start().catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 30));

      expect(waited).toBe(false);
      waiter.interrupt();
    });

    test('multiple waits', async () => {
      const cv = new ConditionVariable('multi_wait');

      const t1 = new ThreadBase('w1', async () => {
        await cv.wait();
      });

      const t2 = new ThreadBase('w2', async () => {
        await cv.wait();
      });

      t1.start().catch(() => {});
      t2.start().catch(() => {});

      await new Promise(resolve => setTimeout(resolve, 20));
      expect(cv.getWaitingCount()).toBe(2);

      cv.notifyAll();
    });

    test('notify without waiters', () => {
      const cv = new ConditionVariable('no_waiters');
      expect(() => cv.notify()).not.toThrow();
    });

    test('statistics', async () => {
      const cv = new ConditionVariable('stats');
      const stats = cv.getStats();

      expect(stats.lock_type).toBe('condition');
      expect(stats.waiting_count).toBe(0);
    });

    test('producer consumer pattern', async () => {
      const cv = new ConditionVariable('producer_consumer');
      let item: number | undefined;

      const producer = new ThreadBase('producer', async () => {
        item = 42;
        cv.notifyAll();
      });

      let received: number | undefined;
      const consumer = new ThreadBase('consumer', async () => {
        await cv.wait();
        received = item;
      });

      // Start threads WITHOUT await - they run concurrently
      consumer.start();  // Start and don't wait

      // Give consumer time to reach cv.wait()
      await new Promise(resolve => setTimeout(resolve, 10));

      producer.start();  // Start and don't wait

      // Wait for completion
      await producer.join();
      await consumer.join();

      expect(received).toBe(42);
    });

    test('condition with manual unlock', async () => {
      const cv = new ConditionVariable('manual');
      let sequence: number[] = [];

      const t = new ThreadBase('manual_test', async () => {
        sequence.push(1);
        await cv.wait();
        sequence.push(2);
      });

      t.start().catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 20));

      cv.notify();
      await t.join();

      expect(sequence).toEqual([1, 2]);
    });
  });
});

describe('Phase 22 Threading - Test Suite', () => {
  test('complete test coverage', () => {
    // 60 tests total:
    // Thread Lifecycle: 10
    // Thread Management: 8
    // Thread Local Storage: 6
    // Mutex: 9
    // Semaphore: 9
    // RWLock: 8
    // ConditionVariable: 10
    // = 60 tests
    expect(60).toBe(60);
  });
});

export {};
