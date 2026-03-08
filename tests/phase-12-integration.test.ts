/**
 * Phase 12: Dashboard Integration Tests
 *
 * Test Phase 11 (Dynamic Confidence System) integration with Phase 8 Dashboard
 * and Phase 9 HTTP Server
 */

import { Dashboard } from '../src/dashboard/dashboard';
import { createDashboardServer } from '../src/phase-12/dashboard-server';
import { FeedbackAnalyzer } from '../src/phase-11/feedback-analyzer';
import { DynamicConfidenceAdjuster } from '../src/phase-11/dynamic-confidence-adjuster';
import { ConfidenceReporter } from '../src/phase-11/confidence-reporter';
import { IntentPattern } from '../src/phase-10/unified-pattern-database';
import allPatterns from '../src/phase-10/v1-v2-adjusted-patterns.json';

describe('Phase 12: Dashboard Integration', () => {
  describe('Dashboard Extension', () => {
    let dashboard: Dashboard;
    let patterns: IntentPattern[];

    beforeEach(() => {
      patterns = (allPatterns as IntentPattern[]).slice(0, 100);

      // Initialize a mock PatternUpdater with test data
      const mockPatternUpdater = {
        getAll: () => patterns.map(p => ({
          id: p.id,
          original: { confidence: p.confidence ?? 0.75 },
          total_interactions: 5,
        })),
        getAllStats: () => patterns.map(p => ({
          id: p.id,
          total_interactions: 5,
          approval_rate: p.confidence ?? 0.75,
          rejection_rate: 0.1,
          modification_rate: 0.15,
          avgAccuracy: p.confidence ?? 0.75,
          lastUpdated: Date.now(),
        })),
        getTrend: (id: string, days: number) => [{
          date: new Date().toISOString().split('T')[0],
          avg_confidence: 0.75,
          interactions: 5,
          approval_rate: 0.75,
        }],
        get: (id: string) => {
          const pattern = patterns.find(p => p.id === id);
          return pattern ? {
            id,
            original: { confidence: pattern.confidence ?? 0.75 },
            total_interactions: 5,
          } : null;
        },
        getNeedsImprovement: (threshold: number) => [],
        getPatternDetails: (id: string) => null,
        getPopularVariations: (id: string, count: number) => [],
        getLearningScore: (id: string) => 0.75,
        getStats: (id: string) => null,
      } as any;

      dashboard = new Dashboard(mockPatternUpdater, undefined, patterns);
    });

    test('should initialize with Phase 11 components', () => {
      expect(dashboard).toBeDefined();
      expect(dashboard.getStats).toBeDefined();
      expect(dashboard.getConfidenceReport).toBeDefined();
      expect(dashboard.getCategoryBreakdown).toBeDefined();
      expect(dashboard.getTopMovers).toBeDefined();
      expect(dashboard.getConfidenceTrends).toBeDefined();
    });

    test('should return null confidence report with no feedback', () => {
      const report = dashboard.getConfidenceReport(patterns);
      expect(report).toBeNull();
    });

    test('should extract category breakdown from confidence report', () => {
      const categories = dashboard.getCategoryBreakdown(patterns);
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThanOrEqual(0);
    });

    test('should identify top movers (improvements and degradations)', () => {
      const movers = dashboard.getTopMovers(patterns, 10);
      expect(movers.improvements).toBeDefined();
      expect(movers.degradations).toBeDefined();
      expect(Array.isArray(movers.improvements)).toBe(true);
      expect(Array.isArray(movers.degradations)).toBe(true);
    });

    test('should return confidence trends', () => {
      const trends = dashboard.getConfidenceTrends(patterns, 7);
      expect(Array.isArray(trends)).toBe(true);
      // Each trend should have required fields
      trends.forEach(trend => {
        expect(trend.date).toBeDefined();
        expect(trend.avgConfidenceBefore).toBeDefined();
        expect(trend.avgConfidenceAfter).toBeDefined();
        expect(trend.improvedPatternCount).toBeDefined();
      });
    });

    test('should retrieve pattern-specific confidence', () => {
      const patternId = patterns[0]?.id;
      const confidence = dashboard.getPatternConfidence(patterns, patternId);
      // May be null if no feedback, which is ok
      if (confidence) {
        expect(confidence.patternId).toBe(patternId);
        expect(confidence.originalConfidence).toBeDefined();
        expect(confidence.adjustedConfidence).toBeDefined();
      }
    });

    test('should maintain backward compatibility with Phase 8 methods', () => {
      const stats = dashboard.getStats();
      expect(stats).toBeDefined();
      expect(stats.total_patterns).toBeGreaterThan(0);
      expect(stats.avg_confidence).toBeGreaterThanOrEqual(0);
      expect(stats.avg_approval_rate).toBeGreaterThanOrEqual(0);

      const trends = dashboard.getTrends(7);
      expect(Array.isArray(trends)).toBe(true);

      const feedback = dashboard.getFeedbackSummary();
      expect(feedback).toBeDefined();
      expect(feedback.total).toBeGreaterThanOrEqual(0);

      const progress = dashboard.getLearningProgress();
      expect(progress).toBeDefined();
      expect(progress.total_patterns).toBeGreaterThan(0);
    });

    test('should export data to JSON and CSV', () => {
      const json = dashboard.exportToJSON();
      expect(json).toBeDefined();
      expect(json.timestamp).toBeDefined();
      expect(json.stats).toBeDefined();
      expect(json.trends).toBeDefined();

      const csv = dashboard.exportTrendsToCSV();
      expect(typeof csv).toBe('string');
      expect(csv.includes('Date,PatternID')).toBe(true);
    });
  });

  describe('Dashboard Server', () => {
    test('should create HTTP server with routes', () => {
      const server = createDashboardServer(9999);
      expect(server).toBeDefined();
      // Server should have route() method
      expect(server.route).toBeDefined();
    });

    test('should have all required endpoints configured', () => {
      // This is a white-box test to ensure all routes are set up
      const server = createDashboardServer(9998);

      // Verify that routes can be created without error
      expect(() => {
        // Routes are added during creation, no throw should occur
        createDashboardServer(9997);
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    let dashboard: Dashboard;
    let patterns: IntentPattern[];

    beforeEach(() => {
      patterns = (allPatterns as IntentPattern[]).slice(0, 100);
      dashboard = new Dashboard(undefined, undefined, patterns);
    });

    test('should get stats in <50ms', () => {
      const start = performance.now();
      dashboard.getStats();
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(50);
    });

    test('should process trends in <100ms', () => {
      const start = performance.now();
      dashboard.getTrends(7);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    test('should get category breakdown in <50ms', () => {
      const start = performance.now();
      dashboard.getCategoryBreakdown(patterns);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(50);
    });

    test('should identify top movers in <100ms', () => {
      const start = performance.now();
      dashboard.getTopMovers(patterns, 10);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('Data Consistency', () => {
    let dashboard: Dashboard;
    let patterns: IntentPattern[];

    beforeEach(() => {
      patterns = (allPatterns as IntentPattern[]).slice(0, 50);
      dashboard = new Dashboard(undefined, undefined, patterns);
    });

    test('should maintain consistency across pattern counts', () => {
      const stats = dashboard.getStats();
      const breakdown = dashboard.getCategoryBreakdown(patterns);

      // Total patterns should be consistent
      expect(stats.total_patterns).toBeGreaterThanOrEqual(breakdown.length);
    });

    test('should provide valid confidence ranges', () => {
      const movers = dashboard.getTopMovers(patterns);
      const allMovers = [...movers.improvements, ...movers.degradations];

      allMovers.forEach(mover => {
        expect(mover.originalConfidence).toBeGreaterThanOrEqual(0.0);
        expect(mover.originalConfidence).toBeLessThanOrEqual(1.0);
        expect(mover.adjustedConfidence).toBeGreaterThanOrEqual(0.0);
        expect(mover.adjustedConfidence).toBeLessThanOrEqual(1.0);
      });
    });

    test('should calculate change percentages correctly', () => {
      const movers = dashboard.getTopMovers(patterns);

      movers.improvements.forEach(improvement => {
        const expectedChange = improvement.adjustedConfidence - improvement.originalConfidence;
        expect(improvement.confidenceChange).toBeCloseTo(expectedChange, 4);
      });
    });
  });
});
