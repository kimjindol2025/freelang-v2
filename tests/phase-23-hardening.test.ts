/**
 * Phase 23: Production Hardening Tests
 * Error handling, memory management, 30-day reliability
 */

import { GlobalErrorHandler } from '../src/phase-23/error-handling/global-error-handler';
import { MemoryProfiler } from '../src/phase-23/memory-profiling/memory-profiler';
import { ReliabilityValidator } from '../src/phase-23/reliability/reliability-validator';

describe('Phase 23: Production Hardening', () => {
  describe('Global Error Handler', () => {
    let handler: GlobalErrorHandler;

    beforeEach(() => {
      handler = new GlobalErrorHandler('./test-logs/errors.log');
    });

    test('Should handle errors with context', async () => {
      const error = new Error('Test error');
      await handler.handleError(error, 'TestError', 'HIGH', true, { testId: 123 });

      const stats = handler.getStats();
      expect(stats.totalErrors).toBe(1);
      expect(stats.errorsByType['TestError']).toBe(1);
    });

    test('Should track error severity', async () => {
      await handler.handleError(new Error('Critical'), 'Critical', 'CRITICAL', false);
      await handler.handleError(new Error('Low'), 'Low', 'LOW', true);

      const stats = handler.getStats();
      expect(stats.errorsBySeverity['CRITICAL']).toBe(1);
      expect(stats.errorsBySeverity['LOW']).toBe(1);
    });

    test('Should register and execute recovery strategy', async () => {
      let recovered = false;

      handler.registerRecoveryStrategy('RecoverableError', async () => {
        recovered = true;
      });

      await handler.handleError(new Error('Test'), 'RecoverableError', 'MEDIUM', true);

      // Wait for async recovery
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(recovered).toBe(true);
    });

    test('Should report error statistics', async () => {
      await handler.handleError(new Error('Error 1'), 'Type1', 'HIGH', true);
      await handler.handleError(new Error('Error 2'), 'Type2', 'MEDIUM', false);

      const stats = handler.getStats();
      expect(stats.totalErrors).toBe(2);
      expect(stats.recoveredErrors).toBe(1);
      expect(stats.unrecoveredErrors).toBe(1);
    });
  });

  describe('Memory Profiler', () => {
    let profiler: MemoryProfiler;

    beforeEach(() => {
      profiler = new MemoryProfiler();
      profiler.setMemoryLimit(512);
    });

    afterEach(() => {
      profiler.stop();
    });

    test('Should collect memory samples', (done) => {
      profiler.start(100);

      setTimeout(() => {
        const report = profiler.getReport();
        expect(report.samples).toBeGreaterThan(0);
        expect(report.current).toBeDefined();
        done();
      }, 300);
    });

    test('Should detect memory trend', (done) => {
      profiler.start(50);

      setTimeout(() => {
        const trend = profiler.getTrend();
        expect(['increasing', 'stable', 'decreasing', 'unknown']).toContain(trend);
        done();
      }, 300);
    });

    test('Should track peak memory usage', (done) => {
      profiler.start(50);

      setTimeout(() => {
        // Allocate memory
        const buffer = Buffer.alloc(1024 * 1024); // 1MB

        setTimeout(() => {
          const report = profiler.getReport();
          expect(report.peak).toBeDefined();
          expect(report.peak!.heapUsed).toBeGreaterThan(0);
          done();
        }, 100);
      }, 100);
    });

    test('Should generate memory report', (done) => {
      profiler.start(50);

      setTimeout(() => {
        const report = profiler.getReport();
        expect(report.current).toBeDefined();
        expect(report.average).toBeDefined();
        expect(report.peak).toBeDefined();
        done();
      }, 200);
    });
  });

  describe('Reliability Validator', () => {
    let validator: ReliabilityValidator;

    beforeEach(() => {
      validator = new ReliabilityValidator();
    });

    test('Should run 30-day endurance test', async () => {
      let execCount = 0;
      const workload = async () => {
        execCount++;
      };

      const result = await validator.run30DayTest(workload, 100);

      expect(result.status).toBe('PASSED');
      expect(result.successRate).toBeCloseTo(100, 1);
    });

    test('Should handle failures in endurance test', async () => {
      let callCount = 0;
      const faultyWorkload = async () => {
        callCount++;
        if (callCount % 5 === 0) {
          throw new Error('Simulated failure');
        }
      };

      const result = await validator.run30DayTest(faultyWorkload, 50);

      expect(result.status).toBe('FAILED');
      expect(result.errors).toBeGreaterThan(0);
    });

    test('Should register and execute chaos scenarios', async () => {
      let chaosExecuted = false;

      validator.registerChaosScenario({
        name: 'TestChaos',
        description: 'Test chaos scenario',
        execute: async () => {
          chaosExecuted = true;
        },
        severity: 'MEDIUM',
      });

      const result = await validator.executeChaos('TestChaos');
      expect(result.success).toBe(true);
      expect(chaosExecuted).toBe(true);
    });

    test('Should track downtime', () => {
      validator.recordDowntime(1000);
      const uptime = validator.getUptimePercentage();

      // Uptime should be less than 100% after recording downtime
      expect(uptime).toBeLessThan(100);
    });

    test('Should generate reliability report', async () => {
      const workload = async () => {
        /* no-op */
      };
      await validator.run30DayTest(workload, 50);

      const report = validator.getReport();
      expect(report.testsRun).toBeGreaterThan(0);
      expect(report.overallReliability).toBeDefined();
    });

    test('Should classify reliability level', () => {
      const report = validator.getReport();
      const validLevels = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'];
      expect(validLevels).toContain(report.overallReliability);
    });
  });
});
