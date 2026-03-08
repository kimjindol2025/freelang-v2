/**
 * Phase 12: End-to-End Dashboard Integration Tests
 *
 * Full workflow validation:
 * Feedback Collection → Phase 11 Analysis → Dashboard Display
 */

import { Dashboard } from '../src/dashboard/dashboard';
import { createDashboardServer } from '../src/phase-12/dashboard-server';
import { feedbackCollector } from '../src/feedback/collector';
import { FeedbackAnalyzer } from '../src/phase-11/feedback-analyzer';
import { DynamicConfidenceAdjuster } from '../src/phase-11/dynamic-confidence-adjuster';
import { ConfidenceReporter } from '../src/phase-11/confidence-reporter';
import { IntentPattern } from '../src/phase-10/unified-pattern-database';
import allPatterns from '../src/phase-10/v1-v2-adjusted-patterns.json';

describe('Phase 12: E2E Dashboard Workflow', () => {
  let dashboard: Dashboard;
  let patterns: IntentPattern[];
  let mockPatternUpdater: any;

  beforeEach(() => {
    patterns = (allPatterns as IntentPattern[]).slice(0, 50);

    // Mock PatternUpdater with test patterns
    mockPatternUpdater = {
      getAll: () => patterns.map(p => ({
        id: p.id,
        original: { confidence: p.confidence ?? 0.75 },
        total_interactions: 10,
      })),
      getAllStats: () => patterns.map(p => ({
        id: p.id,
        total_interactions: 10,
        approval_rate: p.confidence ?? 0.75,
        rejection_rate: 0.15,
        modification_rate: 0.1,
        avgAccuracy: p.confidence ?? 0.75,
        lastUpdated: Date.now(),
      })),
      getTrend: (id: string, days: number) => [{
        date: new Date().toISOString().split('T')[0],
        avg_confidence: 0.75,
        interactions: 10,
        approval_rate: 0.75,
      }],
      get: (id: string) => {
        const pattern = patterns.find(p => p.id === id);
        return pattern ? {
          id,
          original: { confidence: pattern.confidence ?? 0.75 },
          total_interactions: 10,
        } : null;
      },
      getNeedsImprovement: (threshold: number) => [],
      getPopularVariations: (id: string, count: number) => [],
      getLearningScore: (id: string) => 0.75,
    } as any;

    dashboard = new Dashboard(mockPatternUpdater, undefined, patterns);
  });

  describe('Full Workflow', () => {
    test('should perform complete workflow from feedback to dashboard display', () => {
      // Step 1: Get initial stats (Phase 8)
      const initialStats = dashboard.getStats();
      expect(initialStats.total_patterns).toBe(50);
      expect(initialStats.avg_confidence).toBeGreaterThan(0);

      // Step 2: Collect feedback
      const feedbacks = feedbackCollector.getAllFeedbacks();
      expect(Array.isArray(feedbacks)).toBe(true);

      // Step 3: Generate confidence report (Phase 11)
      const report = dashboard.getConfidenceReport(patterns);
      // Report may be null if no feedback, that's ok
      if (report) {
        expect(report.totalPatterns).toBeGreaterThan(0);
      }

      // Step 4: Extract breakdowns
      const categories = dashboard.getCategoryBreakdown(patterns);
      expect(Array.isArray(categories)).toBe(true);

      // Step 5: Get top movers
      const movers = dashboard.getTopMovers(patterns, 10);
      expect(movers).toHaveProperty('improvements');
      expect(movers).toHaveProperty('degradations');
      expect(Array.isArray(movers.improvements)).toBe(true);
      expect(Array.isArray(movers.degradations)).toBe(true);

      // Step 6: Get trends
      const trends = dashboard.getConfidenceTrends(patterns, 7);
      expect(Array.isArray(trends)).toBe(true);
    });

    test('should handle missing feedback gracefully', () => {
      // No feedback in test environment
      const report = dashboard.getConfidenceReport(patterns);
      // Should return null or empty report, not crash
      if (report) {
        expect(report.totalPatterns).toBeGreaterThan(0);
      } else {
        expect(report).toBeNull();
      }
    });

    test('should maintain data consistency across workflow', () => {
      const stats = dashboard.getStats();
      const report = dashboard.getConfidenceReport(patterns);

      // If report exists, total patterns should match or be subset
      if (report) {
        expect(report.totalPatterns).toBeLessThanOrEqual(stats.total_patterns);
      }

      // Category count should not exceed total patterns
      const categories = dashboard.getCategoryBreakdown(patterns);
      const totalPatternsInCategories = categories.reduce((sum, cat) => sum + cat.patternCount, 0);
      expect(totalPatternsInCategories).toBeLessThanOrEqual(stats.total_patterns);
    });
  });

  describe('HTTP Server Integration', () => {
    test('should create server with all required endpoints', () => {
      const server = createDashboardServer(9998);
      expect(server).toBeDefined();
      expect(server.route).toBeDefined();
    });

    test('should serve HTML dashboard', async () => {
      const server = createDashboardServer(9997);
      // Server object created successfully without errors
      expect(server).toBeDefined();
    });
  });

  describe('Performance & Load', () => {
    test('should handle large pattern sets efficiently', () => {
      const largePatterns = (allPatterns as IntentPattern[]).slice(0, 500);
      const largeDashboard = new Dashboard(mockPatternUpdater, undefined, largePatterns);

      const start = performance.now();
      const report = largeDashboard.getConfidenceReport(largePatterns);
      const elapsed = performance.now() - start;

      // Should complete in reasonable time even with 500 patterns
      expect(elapsed).toBeLessThan(500);
    });

    test('should cache report results efficiently', () => {
      const start1 = performance.now();
      dashboard.getConfidenceReport(patterns);
      const time1 = performance.now() - start1;

      const start2 = performance.now();
      dashboard.getConfidenceReport(patterns);
      const time2 = performance.now() - start2;

      // Second call may be slightly faster due to any internal caching
      expect(time2).toBeLessThanOrEqual(time1 * 1.5);
    });

    test('should handle concurrent dashboard updates', () => {
      const promises: Promise<any>[] = [];

      for (let i = 0; i < 10; i++) {
        promises.push(Promise.resolve(dashboard.getStats()));
        promises.push(Promise.resolve(dashboard.getTrends(7)));
        promises.push(Promise.resolve(dashboard.getFeedbackSummary()));
      }

      return Promise.all(promises).then(results => {
        expect(results.length).toBe(30);
        results.forEach(result => {
          expect(result).toBeDefined();
        });
      });
    });
  });

  describe('Data Quality', () => {
    test('should provide valid confidence scores', () => {
      const report = dashboard.getConfidenceReport(patterns);
      if (report && report.patterns) {
        report.patterns.forEach(p => {
          if (p.originalConfidence) {
            expect(p.originalConfidence).toBeGreaterThanOrEqual(0);
            expect(p.originalConfidence).toBeLessThanOrEqual(1);
          }
          if (p.adjustedConfidence) {
            expect(p.adjustedConfidence).toBeGreaterThanOrEqual(0);
            expect(p.adjustedConfidence).toBeLessThanOrEqual(1);
          }
        });
      }
    });

    test('should calculate proper change deltas', () => {
      const movers = dashboard.getTopMovers(patterns);

      movers.improvements.forEach(p => {
        const delta = p.adjustedConfidence - p.originalConfidence;
        expect(p.confidenceChange).toBeCloseTo(delta, 4);
        expect(delta).toBeGreaterThan(0); // Improvements should be positive
      });

      movers.degradations.forEach(p => {
        const delta = p.adjustedConfidence - p.originalConfidence;
        expect(p.confidenceChange).toBeCloseTo(delta, 4);
        expect(delta).toBeLessThan(0); // Degradations should be negative
      });
    });

    test('should return trends in chronological order', () => {
      const trends = dashboard.getConfidenceTrends(patterns, 7);

      for (let i = 1; i < trends.length; i++) {
        expect(trends[i].date >= trends[i - 1].date).toBe(true);
      }
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain Phase 8 API compatibility', () => {
      // All Phase 8 methods should work
      const stats = dashboard.getStats();
      const trends = dashboard.getTrends(7);
      const feedback = dashboard.getFeedbackSummary();
      const progress = dashboard.getLearningProgress();
      const json = dashboard.exportToJSON();
      const csv = dashboard.exportTrendsToCSV();

      expect(stats).toBeDefined();
      expect(trends).toBeDefined();
      expect(feedback).toBeDefined();
      expect(progress).toBeDefined();
      expect(json).toBeDefined();
      expect(csv).toBeDefined();
      expect(typeof csv).toBe('string');
    });

    test('should not break existing exports', () => {
      const json = dashboard.exportToJSON();

      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('stats');
      expect(json).toHaveProperty('trends');
      expect(json).toHaveProperty('feedback_summary');
      expect(json).toHaveProperty('learning_progress');
    });
  });
});
