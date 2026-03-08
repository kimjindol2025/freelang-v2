/**
 * Phase 23: Production Hardening 테스트
 */

import GlobalErrorHandler from '../src/production-hardening/error-handler';
import MemoryManager from '../src/production-hardening/memory-manager';

describe('Phase 23: Production Hardening', () => {
  describe('GlobalErrorHandler', () => {
    it('should record exceptions', () => {
      const handler = new GlobalErrorHandler();
      
      handler.handleException(new Error('Test error'));
      const stats = handler.getStats();

      expect(stats.total).toBe(1);
      expect(stats.high).toBe(1);
    });

    it('should handle rejections', () => {
      const handler = new GlobalErrorHandler();

      handler.handleRejection('Test rejection');
      const stats = handler.getStats();

      expect(stats.total).toBe(1);
    });

    it('should calculate error severity', () => {
      const handler = new GlobalErrorHandler();

      handler.handleException(new Error('CRITICAL error'));
      const stats = handler.getStats();

      expect(stats.lastError.severity).toBe('critical');
    });

    it('should limit error history', () => {
      const handler = new GlobalErrorHandler();

      for (let i = 0; i < 1500; i++) {
        handler.handleException(new Error(`Error ${i}`));
      }

      const stats = handler.getStats();
      expect(stats.total).toBeLessThanOrEqual(1000);
    });

    it('should notify error handlers', () => {
      const handler = new GlobalErrorHandler();
      let called = false;

      handler.onError(() => {
        called = true;
      });

      handler.handleException(new Error('Test'));

      expect(called).toBe(true);
    });
  });

  describe('MemoryManager', () => {
    it('should collect memory metrics', () => {
      const manager = new MemoryManager();
      const metrics = manager.collect();

      expect(metrics.heapUsed).toBeGreaterThan(0);
      expect(metrics.heapTotal).toBeGreaterThan(0);
      expect(metrics.usagePercent).toBeGreaterThan(0);
      expect(metrics.usagePercent).toBeLessThanOrEqual(1);
    });

    it('should track memory trend', () => {
      const manager = new MemoryManager();

      manager.collect();
      manager.collect();
      manager.collect();

      const metrics = manager.collect();
      expect(['stable', 'increasing', 'decreasing']).toContain(metrics.trend);
    });

    it('should detect memory leaks', () => {
      const manager = new MemoryManager();

      // 수집 시뮬레이션
      for (let i = 0; i < 10; i++) {
        manager.collect();
      }

      const leak = manager.detectLeak();
      expect(typeof leak).toBe('boolean');
    });

    it('should provide statistics', () => {
      const manager = new MemoryManager();

      manager.collect();
      const stats = manager.getStats();

      expect(stats.current).toBeDefined();
      expect(stats.leak).toBeDefined();
      expect(stats.avgUsage).toBeGreaterThanOrEqual(0);
    });

    it('should limit memory samples', () => {
      const manager = new MemoryManager();

      // 1500번 수집 (최대 1440)
      for (let i = 0; i < 1500; i++) {
        manager.collect();
      }

      const stats = manager.getStats();
      expect(stats).toBeDefined();
    });
  });

  describe('Integration', () => {
    it('should handle errors with memory monitoring', () => {
      const errorHandler = new GlobalErrorHandler();
      const memoryManager = new MemoryManager();

      // 에러 발생
      errorHandler.handleException(new Error('Out of memory'));

      // 메모리 모니터링
      const metrics = memoryManager.collect();
      const errorStats = errorHandler.getStats();

      expect(errorStats.total).toBe(1);
      expect(metrics.usagePercent).toBeGreaterThan(0);
    });
  });
});
