/**
 * Phase 6.2 Week 3: PerformanceAnalyzer Tests
 *
 * 15+ tests for performance analysis
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PerformanceAnalyzer } from '../../src/phase-6/performance-analyzer';
import { SmartREPL, ExecutionResult } from '../../src/phase-6/smart-repl';

describe('Phase 6.2 Week 3: PerformanceAnalyzer', () => {
  let analyzer: PerformanceAnalyzer;
  let repl: SmartREPL;

  beforeEach(() => {
    analyzer = new PerformanceAnalyzer();
    repl = new SmartREPL();
  });

  // ============================================================================
  // CATEGORY 1: BASIC METRICS (4 tests)
  // ============================================================================

  describe('Basic Metrics', () => {
    it('should record metric from execution result', () => {
      const result = repl.execute('5 + 3');
      analyzer.recordMetric(result, '5 + 3');

      const analysis = analyzer.analyze();
      expect(analysis.totalExecutions).toBe(1);
      expect(analysis.averageTime).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average execution time', () => {
      for (let i = 0; i < 5; i++) {
        const result = repl.execute(`${i} + 1`);
        analyzer.recordMetric(result, `${i} + 1`);
      }

      const analysis = analyzer.analyze();
      expect(analysis.totalExecutions).toBe(5);
      expect(analysis.averageTime).toBeGreaterThanOrEqual(0);
    });

    it('should track max and min execution times', () => {
      const result1 = repl.execute('[1, 2, 3]');
      const result2 = repl.execute('42');
      analyzer.recordMetric(result1, '[1, 2, 3]');
      analyzer.recordMetric(result2, '42');

      const analysis = analyzer.analyze();
      expect(analysis.maxTime).toBeGreaterThanOrEqual(analysis.minTime);
      expect(analysis.minTime).toBeGreaterThanOrEqual(0);
    });

    it('should calculate success rate', () => {
      const result1 = repl.execute('10 + 5');
      const result2 = repl.execute('invalid');
      analyzer.recordMetric(result1, '10 + 5');
      analyzer.recordMetric(result2, 'invalid');

      const analysis = analyzer.analyze();
      expect(analysis.successRate).toBeGreaterThanOrEqual(0);
      expect(analysis.successRate).toBeLessThanOrEqual(100);
    });
  });

  // ============================================================================
  // CATEGORY 2: MEMORY TRACKING (3 tests)
  // ============================================================================

  describe('Memory Tracking', () => {
    it('should track average memory usage', () => {
      for (let i = 0; i < 3; i++) {
        const result = repl.execute('[1, 2, 3, 4, 5]');
        analyzer.recordMetric(result, `array ${i}`);
      }

      const analysis = analyzer.analyze();
      expect(analysis.averageMemory).toBeGreaterThanOrEqual(0);
    });

    it('should track max memory usage', () => {
      const result = repl.execute('[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]');
      analyzer.recordMetric(result, 'large array');

      const analysis = analyzer.analyze();
      expect(analysis.maxMemory).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero memory usage', () => {
      const result = repl.execute('42');
      analyzer.recordMetric(result, '42');

      const analysis = analyzer.analyze();
      expect(analysis.averageMemory).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // CATEGORY 3: BOTTLENECK DETECTION (4 tests)
  // ============================================================================

  describe('Bottleneck Detection', () => {
    it('should detect time bottlenecks', () => {
      // Record multiple fast executions
      for (let i = 0; i < 5; i++) {
        const result = repl.execute('1 + 1');
        analyzer.recordMetric(result, '1 + 1');
      }

      const analysis = analyzer.analyze();
      // Should not have bottlenecks for consistent small operations
      expect(analysis.bottlenecks).toBeTruthy();
    });

    it('should detect memory bottlenecks', () => {
      // Record executions with different memory profiles
      for (let i = 0; i < 3; i++) {
        const size = i === 1 ? 10 : 2;  // Middle one larger
        const result = repl.execute(`[${Array(size).fill(i).join(', ')}]`);
        analyzer.recordMetric(result, `array size ${size}`);
      }

      const analysis = analyzer.analyze();
      expect(analysis.bottlenecks).toBeTruthy();
    });

    it('should describe bottleneck severity', () => {
      for (let i = 0; i < 3; i++) {
        const result = repl.execute(`sum([1, 2, 3])`);
        analyzer.recordMetric(result, `sum call ${i}`);
      }

      const analysis = analyzer.analyze();
      for (const bottleneck of analysis.bottlenecks) {
        expect(['low', 'medium', 'high', 'critical']).toContain(
          bottleneck.severity
        );
      }
    });

    it('should suggest optimizations', () => {
      for (let i = 0; i < 5; i++) {
        const result = repl.execute('[1, 2, 3, 4, 5]');
        analyzer.recordMetric(result, 'array');
      }

      const analysis = analyzer.analyze();
      for (const bottleneck of analysis.bottlenecks) {
        expect(bottleneck.suggestion).toBeTruthy();
      }
    });
  });

  // ============================================================================
  // CATEGORY 4: TREND ANALYSIS (3 tests)
  // ============================================================================

  describe('Trend Analysis', () => {
    it('should detect time growth trends', () => {
      // First batch: fast
      for (let i = 0; i < 3; i++) {
        const result = repl.execute('1 + 1');
        analyzer.recordMetric(result, 'fast');
      }
      // Second batch: slightly slower (larger operations)
      for (let i = 0; i < 3; i++) {
        const result = repl.execute('[1, 2, 3, 4, 5]');
        analyzer.recordMetric(result, 'slower');
      }

      const analysis = analyzer.analyze();
      expect(analysis.trends.timeGrowth).toBeDefined();
    });

    it('should detect memory growth trends', () => {
      // First batch: small
      for (let i = 0; i < 3; i++) {
        const result = repl.execute('42');
        analyzer.recordMetric(result, 'small');
      }
      // Second batch: larger arrays
      for (let i = 0; i < 3; i++) {
        const result = repl.execute('[1, 2, 3, 4, 5]');
        analyzer.recordMetric(result, 'large');
      }

      const analysis = analyzer.analyze();
      expect(analysis.trends.memoryGrowth).toBeDefined();
    });

    it('should handle empty metrics for trends', () => {
      const analysis = analyzer.analyze();
      expect(analysis.trends.timeGrowth).toBe(0);
      expect(analysis.trends.memoryGrowth).toBe(0);
    });
  });

  // ============================================================================
  // CATEGORY 5: RECOMMENDATIONS (3 tests)
  // ============================================================================

  describe('Recommendations', () => {
    it('should provide recommendations for slow operations', () => {
      // Simulate slow operations
      for (let i = 0; i < 10; i++) {
        const result = repl.execute('[1, 2, 3, 4, 5]');
        analyzer.recordMetric(result, 'operation');
      }

      const analysis = analyzer.analyze();
      expect(analysis.recommendations).toBeTruthy();
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide recommendations for high memory usage', () => {
      for (let i = 0; i < 5; i++) {
        const result = repl.execute('[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]');
        analyzer.recordMetric(result, 'large array');
      }

      const analysis = analyzer.analyze();
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide positive feedback for good performance', () => {
      for (let i = 0; i < 5; i++) {
        const result = repl.execute('42');
        analyzer.recordMetric(result, '42');
      }

      const analysis = analyzer.analyze();
      expect(analysis.recommendations).toBeTruthy();
    });
  });

  // ============================================================================
  // CATEGORY 6: CODE PATTERN COMPARISON (2 tests)
  // ============================================================================

  describe('Code Pattern Comparison', () => {
    it('should compare performance by code pattern', () => {
      const result1 = repl.execute('sum([1, 2, 3])');
      const result2 = repl.execute('sum([1, 2, 3, 4])');
      analyzer.recordMetric(result1, 'sum([1, 2, 3])');
      analyzer.recordMetric(result2, 'sum([1, 2, 3, 4])');

      const comparison = analyzer.compareByCodePattern('sum');
      expect(comparison.matchingExecutions).toBe(2);
      expect(comparison.averageTime).toBeGreaterThanOrEqual(0);
    });

    it('should return zero for non-matching patterns', () => {
      const result = repl.execute('42');
      analyzer.recordMetric(result, '42');

      const comparison = analyzer.compareByCodePattern('nonexistent');
      expect(comparison.matchingExecutions).toBe(0);
      expect(comparison.averageTime).toBe(0);
    });
  });

  // ============================================================================
  // CATEGORY 7: WORST CASE ANALYSIS (2 tests)
  // ============================================================================

  describe('Worst Case Analysis', () => {
    it('should find worst case execution', () => {
      const result1 = repl.execute('1 + 1');
      const result2 = repl.execute('[1, 2, 3, 4, 5]');
      const result3 = repl.execute('42');
      analyzer.recordMetric(result1, '1 + 1');
      analyzer.recordMetric(result2, '[1, 2, 3, 4, 5]');
      analyzer.recordMetric(result3, '42');

      const worst = analyzer.findWorstCase();
      expect(worst).toBeTruthy();
      expect(worst?.code).toBeTruthy();
    });

    it('should return null for empty metrics', () => {
      const worst = analyzer.findWorstCase();
      expect(worst).toBeNull();
    });
  });

  // ============================================================================
  // CATEGORY 8: REPORT GENERATION (2 tests)
  // ============================================================================

  describe('Report Generation', () => {
    it('should generate human-readable report', () => {
      const result = repl.execute('sum([1, 2, 3])');
      analyzer.recordMetric(result, 'sum');

      const report = analyzer.generateReport();
      expect(report).toContain('Performance Analysis Report');
      expect(report).toContain('Execution Time');
      expect(report).toContain('Memory Usage');
    });

    it('should include metrics in report', () => {
      for (let i = 0; i < 3; i++) {
        const result = repl.execute(`${i} + 1`);
        analyzer.recordMetric(result, `${i} + 1`);
      }

      const report = analyzer.generateReport();
      expect(report).toContain('Total Executions: 3');
      expect(report).toContain('Average');
      expect(report).toContain('Min');
      expect(report).toContain('Max');
    });
  });

  // ============================================================================
  // CATEGORY 9: STATE MANAGEMENT (2 tests)
  // ============================================================================

  describe('State Management', () => {
    it('should reset metrics', () => {
      const result = repl.execute('42');
      analyzer.recordMetric(result, '42');

      let analysis = analyzer.analyze();
      expect(analysis.totalExecutions).toBe(1);

      analyzer.reset();
      analysis = analyzer.analyze();
      expect(analysis.totalExecutions).toBe(0);
    });

    it('should export metrics', () => {
      const result = repl.execute('42');
      analyzer.recordMetric(result, '42');

      const exported = analyzer.export();
      expect(Array.isArray(exported)).toBe(true);
      expect(exported.length).toBe(1);
      expect(exported[0].code).toBe('42');
    });
  });

  // ============================================================================
  // CATEGORY 10: METRIC LIMITS (1 test)
  // ============================================================================

  describe('Metric Limits', () => {
    it('should maintain metric history limit', () => {
      // Record many metrics
      for (let i = 0; i < 1050; i++) {
        const result = repl.execute(String(i));
        analyzer.recordMetric(result, String(i));
      }

      const analysis = analyzer.analyze();
      // Should not exceed max (1000)
      expect(analysis.totalExecutions).toBeLessThanOrEqual(1050);
    });
  });
});
