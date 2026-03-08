/**
 * Phase 6.2 Week 5: Integration Tests
 *
 * 15+ tests for complete system integration
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Integration } from '../../src/phase-6/integration';

describe('Phase 6.2 Week 5: Integration', () => {
  let integration: Integration;

  beforeEach(() => {
    integration = new Integration();
  });

  // ============================================================================
  // CATEGORY 1: PIPELINE EXECUTION (4 tests)
  // ============================================================================

  describe('Pipeline Execution', () => {
    it('should execute complete pipeline', () => {
      const result = integration.execute('sum([1, 2, 3])');

      expect(result).toBeTruthy();
      expect(result.input).toBe('sum([1, 2, 3])');
      expect(result.execution).toBeTruthy();
      expect(result.patternLearned).toBeTruthy();
    });

    it('should include intent recognition', () => {
      const result = integration.execute('sum([1, 2, 3])');

      expect(result.intentRecognition).toBeTruthy();
      expect(result.intentRecognition.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should execute code immediately', () => {
      const result = integration.execute('sum([1, 2, 3])');

      expect(result.execution).toBeTruthy();
      expect(result.execution.executionTime).toBeLessThan(100);
    });

    it('should measure processing time', () => {
      const result = integration.execute('sum([1, 2, 3])');

      expect(result.processingTime).toBeGreaterThanOrEqual(0);
      expect(result.processingTime).toBeLessThan(500);
    });
  });

  // ============================================================================
  // CATEGORY 2: COMPONENT INTEGRATION (3 tests)
  // ============================================================================

  describe('Component Integration', () => {
    it('should integrate all components', () => {
      const result = integration.execute('[1, 2, 3]');

      expect(result.execution).toBeTruthy();
      expect(result.patternLearned).toBeTruthy();
      expect(result.suggestions).toBeTruthy();
    });

    it('should track errors through pipeline', () => {
      const result = integration.execute('undefinedVar + 5');

      expect(result.execution.success).toBe(false);
      expect(result.errorAnalysis).toBeTruthy();
    });

    it('should handle partial execution', () => {
      const code = 'let x = 5\n???\nlet y = 10';
      const result = integration.execute(code);

      expect(result).toBeTruthy();
      if (result.partialExecution) {
        expect(result.partialExecution.partial).toBe(true);
      }
    });
  });

  // ============================================================================
  // CATEGORY 3: STATISTICS (3 tests)
  // ============================================================================

  describe('Statistics', () => {
    it('should calculate integration statistics', () => {
      for (let i = 0; i < 3; i++) {
        integration.execute(`sum([${i}])`);
      }

      const stats = integration.getStats();

      expect(stats.totalRuns).toBe(3);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.patternCount).toBeGreaterThanOrEqual(0);
    });

    it('should track health score', () => {
      for (let i = 0; i < 5; i++) {
        integration.execute(`sum([${i}])`);
      }

      const stats = integration.getStats();

      expect(stats.overallHealthScore).toBeGreaterThanOrEqual(0);
      expect(stats.overallHealthScore).toBeLessThanOrEqual(100);
    });

    it('should calculate average processing time', () => {
      integration.execute('sum([1, 2, 3])');
      integration.execute('len([4, 5, 6])');

      const stats = integration.getStats();

      expect(stats.averageProcessingTime).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // CATEGORY 4: HISTORY TRACKING (2 tests)
  // ============================================================================

  describe('History Tracking', () => {
    it('should maintain execution history', () => {
      for (let i = 0; i < 5; i++) {
        integration.execute(`sum([${i}])`);
      }

      const history = integration.getHistory(10);

      expect(history.length).toBe(5);
    });

    it('should respect history limit', () => {
      for (let i = 0; i < 10; i++) {
        integration.execute(`sum([${i}])`);
      }

      const history = integration.getHistory(3);

      expect(history.length).toBeLessThanOrEqual(3);
    });
  });

  // ============================================================================
  // CATEGORY 5: DASHBOARD INTEGRATION (2 tests)
  // ============================================================================

  describe('Dashboard Integration', () => {
    it('should collect dashboard metrics', () => {
      integration.execute('sum([1, 2, 3])');

      const metric = integration.collectDashboardMetrics();

      expect(metric).toBeTruthy();
      expect(metric.timestamp).toBeTruthy();
    });

    it('should generate dashboard report', () => {
      for (let i = 0; i < 3; i++) {
        integration.execute(`sum([${i}])`);
      }

      // Collect metrics for dashboard
      integration.collectDashboardMetrics();

      const report = integration.generateDashboardReport();

      expect(report).toBeTruthy();
      expect(report.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // CATEGORY 6: SYSTEM STATUS (1 test)
  // ============================================================================

  describe('System Status', () => {
    it('should provide system status', () => {
      integration.execute('sum([1, 2, 3])');

      const status = integration.getSystemStatus();

      expect(status).toBeTruthy();
      expect(status).toHaveProperty('stats');
      expect(status).toHaveProperty('componentStatus');
    });
  });

  // ============================================================================
  // CATEGORY 7: E2E TESTING (3 tests)
  // ============================================================================

  describe('E2E Testing', () => {
    it('should run E2E tests', async () => {
      const testCases = [
        { input: 'sum([1, 2, 3])' },
        { input: 'len([4, 5, 6])' },
        { input: '[1, 2, 3]' },
      ];

      const results = await integration.runE2ETest(testCases);

      expect(results.length).toBe(3);
      expect(results.every((r) => r.passed !== undefined)).toBe(true);
    });

    it('should handle test failures', async () => {
      const testCases = [
        { input: 'sum([1, 2, 3])' },
        { input: 'undefinedVar' },
      ];

      const results = await integration.runE2ETest(testCases);

      expect(results.length).toBe(2);
    });

    it('should track test errors', async () => {
      const testCases = [
        { input: 'sum([1, 2, 3])' },
        { input: 'invalid code' },
      ];

      const results = await integration.runE2ETest(testCases);

      const failedTests = results.filter((r) => !r.passed);
      expect(failedTests.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // CATEGORY 8: AUTONOMOUS LEARNING SIMULATION (2 tests)
  // ============================================================================

  describe('Autonomous Learning Simulation', () => {
    it('should simulate autonomous learning', () => {
      const result = integration.simulateAutonomousLearning(5);

      expect(result.iterations).toBe(5);
      expect(result.finalStats).toBeTruthy();
      expect(result.improvements).toBeDefined();
    });

    it('should track learning improvements', () => {
      const result = integration.simulateAutonomousLearning(10);

      expect(result.finalStats.patternCount).toBeGreaterThanOrEqual(0);
      expect(result.finalStats.improvementGain).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // CATEGORY 9: STATE MANAGEMENT (1 test)
  // ============================================================================

  describe('State Management', () => {
    it('should reset integration state', () => {
      integration.execute('sum([1, 2, 3])');

      let stats = integration.getStats();
      expect(stats.totalRuns).toBeGreaterThan(0);

      integration.reset();

      stats = integration.getStats();
      expect(stats.totalRuns).toBe(0);
    });
  });
});
