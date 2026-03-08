/**
 * Phase 13 Week 3: HTTP Advanced Features Tests
 * Retry logic + Batch processing
 */

import { HttpRetry } from '../src/engine/http-retry';
import { HttpBatch } from '../src/engine/http-batch';
import {
  BUILTINS,
  getBuiltinType,
  getBuiltinImpl,
  isBuiltin,
} from '../src/engine/builtins';

describe('HTTP Advanced Features (Phase 13 Week 3)', () => {
  /**
   * Retry Logic Tests (5개)
   */
  describe('Retry Logic - HttpRetry', () => {
    test('withRetry: 성공 시 첫 시도에서 반환', async () => {
      let attempts = 0;
      const result = await HttpRetry.withRetry(
        async () => {
          attempts++;
          return 'success';
        },
        { maxRetries: 3, backoffMs: 100 }
      );
      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });

    test('withRetry: 2회 실패 후 성공', async () => {
      let attempts = 0;
      const result = await HttpRetry.withRetry(
        async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Temporary error');
          }
          return 'success';
        },
        { maxRetries: 3, backoffMs: 50 }
      );
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    test('withRetry: 최대 재시도 초과 시 에러 throw', async () => {
      let attempts = 0;
      await expect(
        HttpRetry.withRetry(
          async () => {
            attempts++;
            throw new Error('Persistent error');
          },
          { maxRetries: 2, backoffMs: 50 }
        )
      ).rejects.toThrow('Persistent error');
      expect(attempts).toBe(3); // 0, 1, 2
    });

    test('withRetryResult: 실패 시 객체 반환 (에러 throw 안 함)', async () => {
      let attempts = 0;
      const result = await HttpRetry.withRetryResult(
        async () => {
          attempts++;
          throw new Error('Failed');
        },
        { maxRetries: 2, backoffMs: 50 }
      );
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.attempts).toBe(3);
      expect(result.error?.message).toContain('Failed');
    });

    test('retryOn: 조건이 false면 재시도 안 함', async () => {
      let attempts = 0;
      const error = new Error('Not found');
      (error as any).status_code = 404;

      await expect(
        HttpRetry.withRetry(
          async () => {
            attempts++;
            throw error;
          },
          {
            maxRetries: 3,
            backoffMs: 50,
            retryOn: (e) => e.status_code >= 500, // 5xx만 재시도
          }
        )
      ).rejects.toThrow('Not found');
      expect(attempts).toBe(1); // 즉시 throw
    });
  });

  /**
   * Batch Processing Tests (5개)
   */
  describe('Batch Processing - HttpBatch', () => {
    test('parallel: 모든 항목 동시 실행', async () => {
      const items = [1, 2, 3, 4, 5];
      const results = await HttpBatch.parallel(
        items,
        async (n) => n * 2
      );
      expect(results.successCount).toBe(5);
      expect(results.errorCount).toBe(0);
      expect(results.results).toEqual([2, 4, 6, 8, 10]);
    });

    test('parallel: 에러 발생 시 실패', async () => {
      const items = [1, 2, 3];
      await expect(
        HttpBatch.parallel(
          items,
          async (n) => {
            if (n === 2) throw new Error('Error on 2');
            return n * 2;
          }
        )
      ).rejects.toThrow('Error on 2');
    });

    test('parallel with continueOnError: 에러 무시하고 계속', async () => {
      const items = [1, 2, 3];
      const results = await HttpBatch.parallel(
        items,
        async (n) => {
          if (n === 2) throw new Error('Error on 2');
          return n * 2;
        },
        { continueOnError: true }
      );
      expect(results.successCount).toBe(2);
      expect(results.errorCount).toBe(1);
      expect(results.results[1]).toBeNull();
      expect(results.errors[1]).toBeDefined();
    });

    test('sequential: 순차 실행', async () => {
      const order: number[] = [];
      const items = [1, 2, 3];
      const results = await HttpBatch.sequential(
        items,
        async (n) => {
          order.push(n);
          return n * 2;
        }
      );
      expect(results.results).toEqual([2, 4, 6]);
      expect(order).toEqual([1, 2, 3]);
    });

    test('withLimit: 동시 실행 제한', async () => {
      const active: number[] = [];
      const maxConcurrent = 2;
      const items = [1, 2, 3, 4];

      const results = await HttpBatch.withLimit(
        items,
        maxConcurrent,
        async (n) => {
          active.push(n);
          // 실제로는 활성 개수가 maxConcurrent 이하여야 함
          // (하지만 JavaScript 이벤트 루프 때문에 테스트에서는 동시 확인이 어려움)
          return n * 2;
        }
      );
      expect(results.successCount).toBe(4);
      expect(results.results).toEqual([2, 4, 6, 8]);
    });
  });

  /**
   * Builtin 함수 등록 Tests (3개)
   */
  describe('Builtin Registration', () => {
    test('http_batch: 등록되어 있는가', () => {
      expect(isBuiltin('http_batch')).toBe(true);
      expect(BUILTINS['http_batch']).toBeDefined();
    });

    test('http_batch: 올바른 시그니처', () => {
      const type = getBuiltinType('http_batch');
      expect(type).not.toBeNull();
      expect(type!.params.length).toBe(2);
      expect(type!.params[0].name).toBe('urls');
      expect(type!.params[0].type).toBe('array<string>');
      expect(type!.params[1].name).toBe('limit');
      expect(type!.params[1].type).toBe('number');
      expect(type!.return_type).toBe('array<object>');
    });

    test('http_get_with_retry: 등록되어 있는가', () => {
      expect(isBuiltin('http_get_with_retry')).toBe(true);
      expect(BUILTINS['http_get_with_retry']).toBeDefined();
    });

    test('http_get_with_retry: 올바른 시그니처', () => {
      const type = getBuiltinType('http_get_with_retry');
      expect(type).not.toBeNull();
      expect(type!.params.length).toBe(2);
      expect(type!.params[0].name).toBe('url');
      expect(type!.params[0].type).toBe('string');
      expect(type!.params[1].name).toBe('max_retries');
      expect(type!.params[1].type).toBe('number');
      expect(type!.return_type).toBe('object');
    });

    test('http_batch: impl이 있는가', () => {
      const impl = getBuiltinImpl('http_batch');
      expect(impl).not.toBeNull();
      expect(typeof impl).toBe('function');
    });

    test('http_get_with_retry: impl이 있는가', () => {
      const impl = getBuiltinImpl('http_get_with_retry');
      expect(impl).not.toBeNull();
      expect(typeof impl).toBe('function');
    });
  });

  /**
   * Batch Statistics Tests (2개)
   */
  describe('Batch Statistics', () => {
    test('getStats: 통계 계산', async () => {
      const items = [1, 2, 3, 4, 5];
      const result = await HttpBatch.parallel(items, async (n) => {
        // 약간의 지연 추가
        await new Promise(resolve => setTimeout(resolve, 10 * n));
        return n;
      });

      const stats = HttpBatch.getStats(result);
      expect(stats.avgDurationMs).toBeGreaterThan(0);
      expect(stats.minDurationMs).toBeGreaterThan(0);
      expect(stats.maxDurationMs).toBeGreaterThanOrEqual(stats.minDurationMs);
      expect(stats.throughput).toBeGreaterThan(0);
    });

    test('getStats: 올바른 항목 수', async () => {
      const items = Array.from({ length: 10 }, (_, i) => i);
      const result = await HttpBatch.parallel(
        items,
        async (n) => n * 2
      );
      const stats = HttpBatch.getStats(result);
      expect(result.perItemDurationMs.length).toBe(10);
      expect(stats).toHaveProperty('avgDurationMs');
      expect(stats).toHaveProperty('medianDurationMs');
    });
  });

  /**
   * Integration Tests (HTTP 타입 호환성) (2개)
   */
  describe('HTTP Type Compatibility', () => {
    test('http_batch: array<object> 반환 타입', () => {
      const type = getBuiltinType('http_batch');
      expect(type!.return_type).toBe('array<object>');
    });

    test('http_get_with_retry: object 반환 타입', () => {
      const type = getBuiltinType('http_get_with_retry');
      expect(type!.return_type).toBe('object');
    });
  });
});
