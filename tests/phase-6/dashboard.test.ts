/**
 * Phase 6.2 Week 5: Dashboard Tests
 *
 * 15+ tests for dashboard visualization
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Dashboard } from '../../src/phase-6/dashboard';
import { LearningEngine } from '../../src/phase-6/learning-engine';
import { ErrorAnalyzer } from '../../src/phase-6/error-analyzer';
import { AutoImprover } from '../../src/phase-6/auto-improver';
import { PerformanceAnalyzer } from '../../src/phase-6/performance-analyzer';
import { SmartREPL } from '../../src/phase-6/smart-repl';

describe('Phase 6.2 Week 5: Dashboard', () => {
  let dashboard: Dashboard;
  let learningEngine: LearningEngine;
  let errorAnalyzer: ErrorAnalyzer;
  let autoImprover: AutoImprover;
  let performanceAnalyzer: PerformanceAnalyzer;
  let repl: SmartREPL;

  beforeEach(() => {
    learningEngine = new LearningEngine();
    errorAnalyzer = new ErrorAnalyzer();
    performanceAnalyzer = new PerformanceAnalyzer();
    autoImprover = new AutoImprover(
      learningEngine,
      errorAnalyzer,
      performanceAnalyzer
    );
    dashboard = new Dashboard(
      learningEngine,
      errorAnalyzer,
      autoImprover,
      performanceAnalyzer
    );
    repl = new SmartREPL();
  });

  // ============================================================================
  // CATEGORY 1: METRIC COLLECTION (4 tests)
  // ============================================================================

  describe('Metric Collection', () => {
    it('should collect metrics', () => {
      const metric = dashboard.collectMetrics();

      expect(metric).toBeTruthy();
      expect(metric.timestamp).toBeTruthy();
      expect(metric.learningStats).toBeTruthy();
      expect(metric.errorStats).toBeTruthy();
    });

    it('should calculate health score', () => {
      // Add some data
      const code = 'sum([1, 2, 3])';
      const result = repl.execute(code);
      learningEngine.learn(code, result);
      performanceAnalyzer.recordMetric(result, code);

      const metric = dashboard.collectMetrics();

      expect(metric.overallHealthScore).toBeGreaterThanOrEqual(0);
      expect(metric.overallHealthScore).toBeLessThanOrEqual(100);
    });

    it('should maintain metric history', () => {
      dashboard.collectMetrics();
      dashboard.collectMetrics();
      dashboard.collectMetrics();

      const count = dashboard.getMetricCount();
      expect(count).toBe(3);
    });

    it('should include all metric types', () => {
      const metric = dashboard.collectMetrics();

      expect(metric.learningStats).toBeTruthy();
      expect(metric.errorStats).toBeTruthy();
      expect(metric.performanceAnalysis).toBeTruthy();
      expect(metric.improvementGain).toBeDefined();
    });
  });

  // ============================================================================
  // CATEGORY 2: HEALTH SCORE CALCULATION (4 tests)
  // ============================================================================

  describe('Health Score Calculation', () => {
    it('should calculate learning score', () => {
      const code = 'sum([1, 2, 3])';
      for (let i = 0; i < 5; i++) {
        const result = repl.execute(code);
        learningEngine.learn(code, result);
      }

      const metric = dashboard.collectMetrics();

      expect(metric.overallHealthScore).toBeGreaterThan(0);
    });

    it('should factor in reliability', () => {
      const code1 = 'sum([1, 2, 3])';
      const code2 = 'undefinedVar';

      const result1 = repl.execute(code1);
      const result2 = repl.execute(code2);

      learningEngine.learn(code1, result1);
      errorAnalyzer.analyzeError(code2, result2);

      const metric = dashboard.collectMetrics();

      expect(metric.overallHealthScore).toBeGreaterThanOrEqual(0);
      expect(metric.overallHealthScore).toBeLessThanOrEqual(100);
    });

    it('should consider performance metrics', () => {
      const code = '[1, 2, 3, 4, 5]';
      const result = repl.execute(code);
      performanceAnalyzer.recordMetric(result, code);

      const metric = dashboard.collectMetrics();

      expect(metric.overallHealthScore).toBeDefined();
    });

    it('should calculate detailed health score', () => {
      const code = 'sum([1, 2, 3])';
      const result = repl.execute(code);
      learningEngine.learn(code, result);
      performanceAnalyzer.recordMetric(result, code);

      const metric = dashboard.collectMetrics();
      const health = dashboard.calculateDetailedHealthScore(
        metric.learningStats,
        metric.errorStats,
        metric.performanceAnalysis,
        metric.improvementGain
      );

      expect(health.learning).toBeGreaterThanOrEqual(0);
      expect(health.reliability).toBeGreaterThanOrEqual(0);
      expect(health.performance).toBeGreaterThanOrEqual(0);
      expect(health.overall).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // CATEGORY 3: TREND EXTRACTION (3 tests)
  // ============================================================================

  describe('Trend Extraction', () => {
    it('should extract trends', () => {
      for (let i = 0; i < 5; i++) {
        const code = `sum([${i}])`;
        const result = repl.execute(code);
        performanceAnalyzer.recordMetric(result, code);
        dashboard.collectMetrics();
      }

      const trends = dashboard.extractTrends(5);

      expect(trends.timestamp.length).toBeGreaterThan(0);
      expect(trends.successRate.length).toEqual(trends.timestamp.length);
      expect(trends.averageTime.length).toEqual(trends.timestamp.length);
    });

    it('should track trend components', () => {
      for (let i = 0; i < 3; i++) {
        dashboard.collectMetrics();
      }

      const trends = dashboard.extractTrends(10);

      expect(trends.patternCount).toBeTruthy();
      expect(trends.errorCount).toBeTruthy();
      expect(trends.improvementGain).toBeTruthy();
    });

    it('should respect limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        dashboard.collectMetrics();
      }

      const trends = dashboard.extractTrends(3);

      expect(trends.timestamp.length).toBeLessThanOrEqual(3);
    });
  });

  // ============================================================================
  // CATEGORY 4: REPORT GENERATION (4 tests)
  // ============================================================================

  describe('Report Generation', () => {
    it('should generate text report', () => {
      const code = 'sum([1, 2, 3])';
      const result = repl.execute(code);
      learningEngine.learn(code, result);
      dashboard.collectMetrics();

      const report = dashboard.generateReport();

      expect(report).toContain('Dashboard Report');
      expect(report).toContain('Health Score');
    });

    it('should include metrics in report', () => {
      for (let i = 0; i < 3; i++) {
        const code = `sum([${i}])`;
        const result = repl.execute(code);
        learningEngine.learn(code, result);
      }
      dashboard.collectMetrics();

      const report = dashboard.generateReport();

      expect(report).toContain('Learning');
      expect(report).toContain('Reliability');
      expect(report).toContain('Performance');
    });

    it('should generate JSON report', () => {
      const code = 'sum([1, 2, 3])';
      const result = repl.execute(code);
      learningEngine.learn(code, result);
      dashboard.collectMetrics();

      const jsonReport = dashboard.generateJsonReport();

      expect(jsonReport).toBeTruthy();
      expect(jsonReport).toHaveProperty('healthScore');
    });

    it('should generate HTML dashboard', () => {
      const code = 'sum([1, 2, 3])';
      const result = repl.execute(code);
      learningEngine.learn(code, result);
      dashboard.collectMetrics();

      const html = dashboard.generateHtmlDashboard();

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Dashboard');
      expect(html).toContain('Health Score');
    });
  });

  // ============================================================================
  // CATEGORY 5: METRIC HISTORY (2 tests)
  // ============================================================================

  describe('Metric History', () => {
    it('should retrieve latest metrics', () => {
      dashboard.collectMetrics();
      dashboard.collectMetrics();

      const latest = dashboard.getLatestMetrics();

      expect(latest).toBeTruthy();
      expect(latest?.timestamp).toBeTruthy();
    });

    it('should retrieve metric history with limit', () => {
      for (let i = 0; i < 10; i++) {
        dashboard.collectMetrics();
      }

      const history = dashboard.getMetricsHistory(5);

      expect(history.length).toBeLessThanOrEqual(5);
      expect(history.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // CATEGORY 6: STATE MANAGEMENT (2 tests)
  // ============================================================================

  describe('State Management', () => {
    it('should reset metrics', () => {
      dashboard.collectMetrics();
      dashboard.collectMetrics();

      expect(dashboard.getMetricCount()).toBeGreaterThan(0);

      dashboard.reset();

      expect(dashboard.getMetricCount()).toBe(0);
    });

    it('should handle empty metrics gracefully', () => {
      const latest = dashboard.getLatestMetrics();

      expect(latest).toBeNull();
    });
  });
});
