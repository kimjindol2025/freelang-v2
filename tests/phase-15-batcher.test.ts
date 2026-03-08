/**
 * Phase 15: Message Batcher Tests
 *
 * 배칭 엔진 검증:
 * - 메시지 큐잉 동작
 * - 즉시/배치 분류
 * - 대역폭 계산
 * - 성능 메트릭
 */

import { MessageBatcher, BatchedMessage, BatchMessage, BatchingStats } from '../src/dashboard/message-batcher';

describe('Phase 15: Message Batcher', () => {
  let batcher: MessageBatcher;

  beforeEach(() => {
    batcher = new MessageBatcher(100); // 100ms for faster testing
  });

  afterEach(() => {
    batcher.stop();
  });

  describe('Basic Enqueue & Classification', () => {
    test('should queue batch messages correctly', (done) => {
      const messages: BatchedMessage[] = [
        { type: 'stats', timestamp: Date.now(), data: { value: 1 } },
        { type: 'trends', timestamp: Date.now(), data: { value: 2 } }
      ];

      let queueSize = 0;
      batcher.setOnBatchReady(() => {
        // Batch sent
      });

      messages.forEach(msg => {
        batcher.enqueue(msg);
        queueSize = batcher.getQueueSize();
      });

      expect(queueSize).toBe(2);
      done();
    });

    test('should send initial messages immediately', (done) => {
      let immediateCount = 0;

      batcher.setOnImmediateMessage(() => {
        immediateCount++;
      });

      const initialMsg: BatchedMessage = {
        type: 'initial',
        timestamp: Date.now(),
        data: { initial: true }
      };

      batcher.enqueue(initialMsg);

      expect(immediateCount).toBe(1);
      expect(batcher.getQueueSize()).toBe(0);
      done();
    });

    test('should send heartbeat messages immediately', (done) => {
      let immediateCount = 0;

      batcher.setOnImmediateMessage(() => {
        immediateCount++;
      });

      const heartbeatMsg: BatchedMessage = {
        type: 'heartbeat',
        timestamp: Date.now()
      };

      batcher.enqueue(heartbeatMsg);

      expect(immediateCount).toBe(1);
      expect(batcher.getQueueSize()).toBe(0);
      done();
    });

    test('should send error messages immediately', (done) => {
      let immediateCount = 0;

      batcher.setOnImmediateMessage(() => {
        immediateCount++;
      });

      const errorMsg: BatchedMessage = {
        type: 'error',
        timestamp: Date.now(),
        error: 'Test error'
      };

      batcher.enqueue(errorMsg);

      expect(immediateCount).toBe(1);
      expect(batcher.getQueueSize()).toBe(0);
      done();
    });
  });

  describe('Batching Behavior', () => {
    test('should batch stats messages after timeout', (done) => {
      let batchCount = 0;

      batcher.setOnBatchReady((batch) => {
        batchCount++;
        expect(batch.type).toBe('batch');
        expect(batch.count).toBe(2);
        expect(batch.messages.length).toBe(2);
        done();
      });

      batcher.enqueue({
        type: 'stats',
        timestamp: Date.now(),
        data: { value: 1 }
      });

      batcher.enqueue({
        type: 'trends',
        timestamp: Date.now(),
        data: { value: 2 }
      });
    }, 5000);

    test('should combine different message types in batch', (done) => {
      let batchReceived: BatchMessage | null = null;

      batcher.setOnBatchReady((batch) => {
        batchReceived = batch;
      });

      const messages: BatchedMessage[] = [
        { type: 'stats', timestamp: Date.now(), data: { stats: true } },
        { type: 'trends', timestamp: Date.now(), data: { trends: true } },
        { type: 'report', timestamp: Date.now(), data: { report: true } }
      ];

      messages.forEach(msg => batcher.enqueue(msg));

      setTimeout(() => {
        expect(batchReceived).not.toBeNull();
        expect(batchReceived!.count).toBe(3);
        expect(batchReceived!.messages.map(m => m.type)).toContain('stats');
        expect(batchReceived!.messages.map(m => m.type)).toContain('trends');
        expect(batchReceived!.messages.map(m => m.type)).toContain('report');
        done();
      }, 200);
    }, 5000);

    test('should maintain message order in batch', (done) => {
      let batchReceived: BatchMessage | null = null;

      batcher.setOnBatchReady((batch) => {
        batchReceived = batch;
      });

      const values = [10, 20, 30, 40, 50];
      values.forEach(val => {
        batcher.enqueue({
          type: 'stats',
          timestamp: Date.now(),
          data: { value: val }
        });
      });

      setTimeout(() => {
        expect(batchReceived).not.toBeNull();
        const receivedValues = batchReceived!.messages.map(m => (m.data?.value as number));
        expect(receivedValues).toEqual(values);
        done();
      }, 200);
    }, 5000);
  });

  describe('Queue Management', () => {
    test('should respect max queue size', (done) => {
      const smallBatcher = new MessageBatcher(1000);
      let batchCount = 0;

      smallBatcher.setOnBatchReady(() => {
        batchCount++;
      });

      // Add more messages than max queue size (100)
      for (let i = 0; i < 150; i++) {
        smallBatcher.enqueue({
          type: 'stats',
          timestamp: Date.now(),
          data: { index: i }
        });
      }

      setTimeout(() => {
        // Early flush should have happened
        expect(batchCount).toBeGreaterThan(0);
        smallBatcher.stop();
        done();
      }, 100);
    }, 5000);

    test('should clear queue after flush', (done) => {
      batcher.enqueue({
        type: 'stats',
        timestamp: Date.now(),
        data: { value: 1 }
      });

      batcher.setOnBatchReady(() => {
        // Batch sent
      });

      expect(batcher.getQueueSize()).toBe(1);

      setTimeout(() => {
        expect(batcher.getQueueSize()).toBe(0);
        done();
      }, 200);
    }, 5000);
  });

  describe('Statistics & Bandwidth Calculation', () => {
    test('should track total messages', (done) => {
      batcher.setOnBatchReady(() => {
        // Batch sent
      });

      const msgCount = 5;
      for (let i = 0; i < msgCount; i++) {
        batcher.enqueue({
          type: 'stats',
          timestamp: Date.now(),
          data: { index: i }
        });
      }

      // Add immediate message
      batcher.enqueue({
        type: 'initial',
        timestamp: Date.now(),
        data: { initial: true }
      });

      setTimeout(() => {
        const stats = batcher.getStats();
        expect(stats.totalMessages).toBe(msgCount + 1); // 5 batch + 1 immediate
        expect(stats.immediateMessages).toBe(1);
        expect(stats.batchedMessages).toBe(msgCount);
        done();
      }, 200);
    }, 5000);

    test('should calculate bandwidth savings', (done) => {
      batcher.setOnBatchReady(() => {
        // Batch sent
      });

      for (let i = 0; i < 10; i++) {
        batcher.enqueue({
          type: 'stats',
          timestamp: Date.now(),
          data: {
            pattern_id: `pattern_${i}`,
            confidence: 0.75 + (i * 0.01),
            usage_count: 100 + i
          }
        });
      }

      setTimeout(() => {
        const stats = batcher.getStats();
        // Batching should save bandwidth
        expect(stats.bandwidthSaved).toBeGreaterThan(0);
        expect(stats.compressionRatio).toBeGreaterThan(1);
        done();
      }, 200);
    }, 5000);

    test('should calculate average messages per batch', (done) => {
      batcher.setOnBatchReady(() => {
        // Batch sent
      });

      for (let i = 0; i < 8; i++) {
        batcher.enqueue({
          type: 'stats',
          timestamp: Date.now(),
          data: { value: i }
        });
      }

      setTimeout(() => {
        const stats = batcher.getStats();
        expect(stats.batchCount).toBe(1);
        expect(stats.averageMessagesPerBatch).toBe(8);
        expect(stats.batchedMessages).toBe(8);
        done();
      }, 200);
    }, 5000);
  });

  describe('Manual Flush', () => {
    test('should flush on demand', (done) => {
      let batchCount = 0;

      batcher.setOnBatchReady(() => {
        batchCount++;
      });

      batcher.enqueue({
        type: 'stats',
        timestamp: Date.now(),
        data: { value: 1 }
      });

      // Manual flush
      batcher.flush();

      expect(batchCount).toBe(1);
      expect(batcher.getQueueSize()).toBe(0);
      done();
    });

    test('should handle empty queue flush', (done) => {
      let batchCount = 0;

      batcher.setOnBatchReady(() => {
        batchCount++;
      });

      // Flush empty queue
      batcher.flush();

      expect(batchCount).toBe(0);
      expect(batcher.getQueueSize()).toBe(0);
      done();
    });
  });

  describe('Mixed Immediate & Batch', () => {
    test('should handle mixed message types', (done) => {
      let immediateCount = 0;
      let batchCount = 0;

      batcher.setOnImmediateMessage(() => {
        immediateCount++;
      });

      batcher.setOnBatchReady(() => {
        batchCount++;
      });

      // Mix of immediate and batch messages
      batcher.enqueue({ type: 'initial', timestamp: Date.now(), data: {} });
      batcher.enqueue({ type: 'stats', timestamp: Date.now(), data: {} });
      batcher.enqueue({ type: 'heartbeat', timestamp: Date.now() });
      batcher.enqueue({ type: 'trends', timestamp: Date.now(), data: {} });
      batcher.enqueue({ type: 'error', timestamp: Date.now(), error: 'test' });

      setTimeout(() => {
        expect(immediateCount).toBe(3); // initial, heartbeat, error
        expect(batchCount).toBe(1); // batch of stats + trends
        const stats = batcher.getStats();
        expect(stats.totalMessages).toBe(5);
        expect(stats.immediateMessages).toBe(3);
        expect(stats.batchedMessages).toBe(2);
        done();
      }, 200);
    }, 5000);
  });

  describe('Stats & Debug Info', () => {
    test('should provide accurate stats', (done) => {
      batcher.setOnBatchReady(() => {
        // Batch sent
      });

      for (let i = 0; i < 5; i++) {
        batcher.enqueue({
          type: 'stats',
          timestamp: Date.now(),
          data: { value: i }
        });
      }

      batcher.enqueue({ type: 'heartbeat', timestamp: Date.now() });

      setTimeout(() => {
        const stats = batcher.getStats();
        expect(stats.totalMessages).toBe(6);
        expect(stats.immediateMessages).toBe(1);
        expect(stats.batchedMessages).toBe(5);
        expect(stats.batchCount).toBe(1);
        done();
      }, 200);
    }, 5000);

    test('should reset stats', (done) => {
      batcher.setOnBatchReady(() => {
        // Batch sent
      });

      batcher.enqueue({
        type: 'stats',
        timestamp: Date.now(),
        data: { value: 1 }
      });

      setTimeout(() => {
        let stats = batcher.getStats();
        expect(stats.totalMessages).toBe(1);

        batcher.resetStats();

        stats = batcher.getStats();
        expect(stats.totalMessages).toBe(0);
        expect(stats.immediateMessages).toBe(0);
        expect(stats.batchedMessages).toBe(0);
        expect(stats.batchCount).toBe(0);
        done();
      }, 200);
    }, 5000);

    test('should provide debug info', (done) => {
      batcher.enqueue({
        type: 'stats',
        timestamp: Date.now(),
        data: { value: 1 }
      });

      const debug = batcher.getDebugInfo();
      expect(debug).toHaveProperty('queueSize', 1);
      expect(debug).toHaveProperty('batchIntervalMs');
      expect(debug).toHaveProperty('maxQueueSize');
      expect(debug).toHaveProperty('isActive');
      expect(debug).toHaveProperty('stats');
      done();
    });
  });

  describe('Stop & Cleanup', () => {
    test('should flush remaining messages on stop', (done) => {
      let batchCount = 0;

      batcher.setOnBatchReady(() => {
        batchCount++;
      });

      batcher.enqueue({
        type: 'stats',
        timestamp: Date.now(),
        data: { value: 1 }
      });

      batcher.stop();

      expect(batchCount).toBe(1);
      expect(batcher.getQueueSize()).toBe(0);
      done();
    });
  });
});
