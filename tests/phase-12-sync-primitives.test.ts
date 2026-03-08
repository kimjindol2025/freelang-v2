/**
 * Phase 12.2: Synchronization Primitives Tests
 *
 * Testing atomic mutex and message channel implementations
 */

import { AtomicMutex, SharedAtomicMutex } from '../src/phase-12/atomic-mutex';
import { MessageChannel, createLinkedChannels, RequestResponseChannel } from '../src/phase-12/message-channel';
import { Worker } from 'worker_threads';

describe('Phase 12.2: Synchronization Primitives', () => {
  // ==================== AtomicMutex Tests ====================

  describe('AtomicMutex - Basic Operations', () => {
    it('should acquire and release lock', async () => {
      const mutex = new AtomicMutex();
      expect(mutex.isLocked()).toBe(false);

      await mutex.lock();
      expect(mutex.isLocked()).toBe(true);

      mutex.unlock();
      expect(mutex.isLocked()).toBe(false);
    });

    it('should support multiple lock/unlock cycles', async () => {
      const mutex = new AtomicMutex();

      for (let i = 0; i < 5; i++) {
        await mutex.lock();
        expect(mutex.isLocked()).toBe(true);
        mutex.unlock();
        expect(mutex.isLocked()).toBe(false);
      }
    });

    it('should support tryLock (non-blocking)', async () => {
      const mutex = new AtomicMutex();

      const acquired1 = mutex.tryLock();
      expect(acquired1).toBe(true);
      expect(mutex.isLocked()).toBe(true);

      const acquired2 = mutex.tryLock();
      expect(acquired2).toBe(false);

      mutex.unlock();
      expect(mutex.isLocked()).toBe(false);

      const acquired3 = mutex.tryLock();
      expect(acquired3).toBe(true);
    });
  });

  describe('AtomicMutex - Critical Section', () => {
    it('should prevent race conditions on shared counter', async () => {
      const mutex = new AtomicMutex();
      let counter = 0;
      const iterations = 20;

      const increment = async () => {
        for (let i = 0; i < iterations; i++) {
          await mutex.lock();
          counter++;
          mutex.unlock();
        }
      };

      // Run two incrementers concurrently
      await Promise.all([increment(), increment()]);

      // With proper mutex, counter should be exactly 2*iterations
      expect(counter).toBe(2 * iterations);
    });

    it('should work with withLock helper', async () => {
      const mutex = new AtomicMutex();
      let value = 0;

      await mutex.withLock(async () => {
        value = 42;
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(value).toBe(42);
      expect(mutex.isLocked()).toBe(false);
    });

    it('should release lock on exception in withLock', async () => {
      const mutex = new AtomicMutex();

      try {
        await mutex.withLock(() => {
          throw new Error('Test error');
        });
      } catch (_) {
        // Expected
      }

      expect(mutex.isLocked()).toBe(false);
      expect(mutex.tryLock()).toBe(true);
      mutex.unlock();
    });
  });

  describe('AtomicMutex - Timeout', () => {
    it('should timeout when lock is held too long', async () => {
      const mutex = new AtomicMutex();

      await mutex.lock();

      // Try to acquire with short timeout
      await expect(mutex.lock(100)).rejects.toThrow('timeout');

      mutex.unlock();
    });

    it('should not timeout if lock is available', async () => {
      const mutex = new AtomicMutex();

      // Should not throw
      await expect(mutex.lock(100)).resolves.not.toThrow();
      mutex.unlock();
    });

    it('should detect possible deadlock', async () => {
      const mutex = new AtomicMutex();
      await mutex.lock();

      // Hold lock in a promise that never completes
      const deadlockPromise = mutex.lock(200);

      await expect(deadlockPromise).rejects.toThrow('deadlock');

      mutex.unlock();
    });
  });

  // ==================== MessageChannel Tests ====================

  describe('MessageChannel - Basic Messaging', () => {
    it('should send and receive messages', async () => {
      const [ch1, ch2] = createLinkedChannels<string>();

      const receivedPromise = ch2.receive();
      await ch1.send('Hello');
      const message = await receivedPromise;

      expect(message).toBe('Hello');

      ch1.close();
      ch2.close();
    });

    it('should preserve message order', async () => {
      const [ch1, ch2] = createLinkedChannels<number>();

      const messages: number[] = [];
      ch2.on((msg) => messages.push(msg));

      // Send multiple messages
      for (let i = 1; i <= 5; i++) {
        await ch1.send(i);
      }

      // Give time for async message delivery
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(messages).toEqual([1, 2, 3, 4, 5]);

      ch1.close();
      ch2.close();
    });

    it('should handle complex objects', async () => {
      const [ch1, ch2] = createLinkedChannels<any>();

      const obj = { name: 'test', count: 42, nested: { key: 'value' } };

      const receivedPromise = ch2.receive();
      await ch1.send(obj);
      const received = await receivedPromise;

      expect(received).toEqual(obj);

      ch1.close();
      ch2.close();
    });
  });

  describe('MessageChannel - Listeners', () => {
    it('should support multiple listeners', async () => {
      const [ch1, ch2] = createLinkedChannels<string>();

      const results: string[] = [];

      ch2.on((msg) => results.push('listener1:' + msg));
      ch2.on((msg) => results.push('listener2:' + msg));

      await ch1.send('test');

      // Wait for async delivery
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(results).toContain('listener1:test');
      expect(results).toContain('listener2:test');

      ch1.close();
      ch2.close();
    });

    it('should support listener removal', async () => {
      const [ch1, ch2] = createLinkedChannels<string>();

      const results: string[] = [];
      const listener = (msg: string) => results.push(msg);

      ch2.on(listener);
      ch2.off(listener);

      await ch1.send('test');
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(results).toEqual([]);

      ch1.close();
      ch2.close();
    });
  });

  describe('MessageChannel - Error Handling', () => {
    it('should throw when sending on closed channel', async () => {
      const [ch1, ch2] = createLinkedChannels<string>();

      ch1.close();

      await expect(ch1.send('test')).rejects.toThrow('closed');

      ch2.close();
    });

    it('should timeout on receive', async () => {
      const [ch1, ch2] = createLinkedChannels<string>();

      await expect(ch2.receive(100)).rejects.toThrow('timeout');

      ch1.close();
      ch2.close();
    });

    it('should handle listener exceptions', async () => {
      const [ch1, ch2] = createLinkedChannels<string>();

      ch2.on(() => {
        throw new Error('Listener error');
      });

      // Should not throw (error is caught internally)
      await expect(ch1.send('test')).resolves.not.toThrow();

      ch1.close();
      ch2.close();
    });
  });

  // ==================== RequestResponseChannel Tests ====================

  describe('RequestResponseChannel - Paired Messaging', () => {
    it('should send request and receive response', async () => {
      const { port1, port2 } = new (require('worker_threads') as any).MessageChannel();

      const requester = new RequestResponseChannel<string, number>(port1);
      const responder = new RequestResponseChannel<string, number>(port2);

      responder.onRequest(async (data) => {
        return data.length;
      });

      const response = await requester.request('hello', 1000);

      expect(response).toBe(5);

      requester.close();
      responder.close();
    });

    it('should handle async response handlers', async () => {
      const { port1, port2 } = new (require('worker_threads') as any).MessageChannel();

      const requester = new RequestResponseChannel<number, number>(port1);
      const responder = new RequestResponseChannel<number, number>(port2);

      responder.onRequest(async (data) => {
        // Simulate async work
        await new Promise(resolve => setTimeout(resolve, 10));
        return data * 2;
      });

      const response = await requester.request(21, 1000);

      expect(response).toBe(42);

      requester.close();
      responder.close();
    });

    it('should timeout on no response', async () => {
      const { port1, port2 } = new (require('worker_threads') as any).MessageChannel();

      const requester = new RequestResponseChannel<string, string>(port1);
      const responder = new RequestResponseChannel<string, string>(port2);

      // Don't register response handler

      await expect(requester.request('test', 100)).rejects.toThrow('timeout');

      requester.close();
      responder.close();
    });
  });

  // ==================== Integration Tests ====================

  describe('Synchronization - Mutex + MessageChannel', () => {
    it('should coordinate concurrent mutex access', async () => {
      const mutex = new AtomicMutex();
      let sharedValue = 0;

      const task1 = async () => {
        await mutex.lock();
        sharedValue = 10;
        sharedValue += 5;
        mutex.unlock();
      };

      const task2 = async () => {
        await mutex.lock();
        sharedValue = sharedValue * 2;
        mutex.unlock();
      };

      // Run tasks concurrently (mutex ensures atomicity)
      await Promise.all([task1(), task2()]);

      // Result should be deterministic due to mutex
      // Either: (10 + 5) * 2 = 30, or 0 * 2 = 0, then 10 + 5 = 15
      expect([30, 15]).toContain(sharedValue);
    }, 10000);
  });

  // ==================== Stress Tests ====================

  describe('AtomicMutex - Stress', () => {
    it('should handle rapid lock/unlock cycles', async () => {
      const mutex = new AtomicMutex();
      let counter = 0;

      const worker = async () => {
        for (let i = 0; i < 10; i++) {
          await mutex.lock();
          counter++;
          mutex.unlock();
        }
      };

      await Promise.all([worker(), worker()]);

      expect(counter).toBe(20);
    }, 5000);
  });

  describe('MessageChannel - Stress', () => {
    it('should handle many messages', async () => {
      const [ch1, ch2] = createLinkedChannels<number>();

      const messages: number[] = [];
      ch2.on((msg) => messages.push(msg));

      // Send 100 messages rapidly
      for (let i = 0; i < 100; i++) {
        await ch1.send(i);
      }

      // Wait for delivery
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(messages.length).toBe(100);
      expect(messages[0]).toBe(0);
      expect(messages[99]).toBe(99);

      ch1.close();
      ch2.close();
    });
  });
});
