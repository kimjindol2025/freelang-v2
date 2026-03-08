/**
 * Phase 11: Dynamic Confidence System Tests
 *
 * Comprehensive tests for feedback analysis and confidence adjustment
 */

import FeedbackAnalyzer, { PatternUsageMetrics, AggregatedStats } from '../src/phase-11/feedback-analyzer';
import {
  DynamicConfidenceAdjuster,
  AdjustedPattern,
  ConfidenceAdjustmentFactors,
} from '../src/phase-11/dynamic-confidence-adjuster';
import ConfidenceReporter from '../src/phase-11/confidence-reporter';
import { FeedbackEntry } from '../src/feedback/feedback-types';
import { IntentPattern } from '../src/phase-10/unified-pattern-database';
import allPatterns from '../src/phase-10/v1-v2-adjusted-patterns.json';

/**
 * Test fixtures
 */
function createMockPattern(name: string, category: string = 'core'): IntentPattern {
  return {
    id: `test-${name}`,
    name,
    aliases: [name.toLowerCase(), `${name}_alias`],
    category,
    packages: ['test'],
    description: `Test pattern for ${name}`,
    confidence: 0.95,
    inputTypes: 'number[]',
    outputType: 'number',
    examples: [],
    tags: ['test'],
    complexity: 2,
    relatedPatterns: [],
    metadata: {},
  };
}

function createMockFeedback(
  operation: string,
  action: 'approve' | 'modify' | 'reject' | 'suggest' = 'approve',
  accuracy: number = 0.9
): FeedbackEntry {
  return {
    id: `feedback-${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    sessionId: 'test-session',
    proposal: {
      operation,
      header: `${operation}(arr)`,
      confidence: 0.85,
    },
    userFeedback: {
      action,
      message: action === 'modify' ? 'Modified feedback' : undefined,
      modifiedHeader: action === 'modify' ? `modified_${operation}` : undefined,
    },
    analysis: {
      accuracy,
      reasoning: `${action} feedback`,
    },
    metadata: {
      inputText: `Test input for ${operation}`,
      session: 'test-session',
      tags: ['test'],
    },
  };
}

describe('Phase 11: Dynamic Confidence System', () => {
  describe('FeedbackAnalyzer', () => {
    let analyzer: FeedbackAnalyzer;
    let testPatterns: IntentPattern[];

    beforeEach(() => {
      testPatterns = [
        createMockPattern('sum', 'core'),
        createMockPattern('mean', 'core'),
        createMockPattern('max', 'core'),
        createMockPattern('filter', 'utilities'),
      ];
      analyzer = new FeedbackAnalyzer(testPatterns);
    });

    test('should initialize with patterns', () => {
      expect(analyzer).toBeDefined();
    });

    test('should analyze feedback and map to patterns', () => {
      const feedback = [
        createMockFeedback('sum', 'approve'),
        createMockFeedback('sum', 'approve'),
        createMockFeedback('mean', 'approve'),
      ];

      const stats = analyzer.analyzeFeedback(feedback);

      expect(stats.totalFeedbackEntries).toBe(3);
      expect(stats.patternsWithFeedback).toBe(2);
      expect(stats.patternsWithoutFeedback).toBe(2);
    });

    test('should calculate usage metrics correctly', () => {
      const feedback = [
        createMockFeedback('sum', 'approve', 0.95),
        createMockFeedback('sum', 'approve', 0.90),
        createMockFeedback('sum', 'reject', 0.50),
      ];

      const stats = analyzer.analyzeFeedback(feedback);
      const sumMetrics = Array.from(stats.metrics.values()).find(m => m.patternName === 'sum');

      expect(sumMetrics).toBeDefined();
      expect(sumMetrics!.usageCount).toBe(3);
      expect(sumMetrics!.approvedCount).toBe(2);
      expect(sumMetrics!.rejectedCount).toBe(1);
      expect(sumMetrics!.approvalRate).toBeCloseTo(2 / 3, 2);
      expect(sumMetrics!.averageAccuracy).toBeCloseTo((0.95 + 0.90 + 0.50) / 3, 2);
    });

    test('should handle empty feedback', () => {
      const stats = analyzer.analyzeFeedback([]);

      expect(stats.totalFeedbackEntries).toBe(0);
      expect(stats.patternsWithFeedback).toBe(0);
      expect(stats.patternsWithoutFeedback).toBe(4);
    });

    test('should calculate overall approval rate', () => {
      const feedback = [
        createMockFeedback('sum', 'approve'),
        createMockFeedback('sum', 'approve'),
        createMockFeedback('mean', 'reject'),
        createMockFeedback('mean', 'modify'),
      ];

      const stats = analyzer.analyzeFeedback(feedback);
      expect(stats.approvalRate).toBeCloseTo(0.5, 1); // 2 approved out of 4
    });

    test('should calculate category statistics', () => {
      const feedback = [
        createMockFeedback('sum', 'approve'),
        createMockFeedback('sum', 'approve'),
        createMockFeedback('filter', 'approve'),
      ];

      const stats = analyzer.analyzeFeedback(feedback);
      const coreCategory = stats.categoryStats.get('core');

      expect(coreCategory).toBeDefined();
      expect(coreCategory!.feedbackCount).toBe(2);
    });

    test('should track session information', () => {
      const feedback1 = createMockFeedback('sum', 'approve');
      const feedback2 = { ...createMockFeedback('sum', 'approve'), sessionId: 'session2' };

      const stats = analyzer.analyzeFeedback([feedback1, feedback2]);
      const sumMetrics = Array.from(stats.metrics.values()).find(m => m.patternName === 'sum');

      expect(sumMetrics!.sessionCount).toBeGreaterThan(1);
    });

    test('should find patterns without feedback', () => {
      const feedback = [createMockFeedback('sum', 'approve')];

      analyzer.analyzeFeedback(feedback);
      const unfeedback = analyzer.getPatternsWithoutFeedback();

      // Should have mean, max, and filter patterns without feedback
      expect(unfeedback.map(p => p.name)).toContain('mean');
      expect(unfeedback.map(p => p.name)).toContain('max');
      expect(unfeedback.map(p => p.name)).toContain('filter');
    });
  });

  describe('DynamicConfidenceAdjuster', () => {
    let adjuster: DynamicConfidenceAdjuster;
    let analyzer: FeedbackAnalyzer;
    let testPatterns: IntentPattern[];

    beforeEach(() => {
      testPatterns = [
        createMockPattern('sum', 'core'),
        createMockPattern('mean', 'core'),
        createMockPattern('max', 'core'),
      ];
      analyzer = new FeedbackAnalyzer(testPatterns);
      adjuster = new DynamicConfidenceAdjuster();
    });

    test('should initialize adjuster', () => {
      expect(adjuster).toBeDefined();
    });

    test('should adjust single pattern with positive feedback', () => {
      const feedback = Array(10).fill(null).map(() => createMockFeedback('sum', 'approve', 0.95));
      const stats = analyzer.analyzeFeedback(feedback);
      const sumMetrics = Array.from(stats.metrics.values()).find(m => m.patternName === 'sum')!;
      const pattern = testPatterns.find(p => p.name === 'sum')!;

      const adjusted = adjuster.adjustPattern(pattern, sumMetrics);

      expect(adjusted.adjustedConfidence).toBeGreaterThan(adjusted.originalConfidence);
      expect(adjusted.confidenceChange).toBeGreaterThan(0);
    });

    test('should adjust pattern with negative feedback', () => {
      const feedback = Array(5).fill(null).map(() => createMockFeedback('sum', 'reject', 0.3));
      const stats = analyzer.analyzeFeedback(feedback);
      const sumMetrics = Array.from(stats.metrics.values()).find(m => m.patternName === 'sum')!;
      const pattern = testPatterns.find(p => p.name === 'sum')!;

      const adjusted = adjuster.adjustPattern(pattern, sumMetrics);

      expect(adjusted.adjustedConfidence).toBeLessThan(adjusted.originalConfidence);
      expect(adjusted.confidenceChange).toBeLessThan(0);
    });

    test('should not adjust pattern with insufficient feedback', () => {
      const feedback = [createMockFeedback('sum', 'approve')]; // Only 1 feedback
      const stats = analyzer.analyzeFeedback(feedback);
      const sumMetrics = Array.from(stats.metrics.values()).find(m => m.patternName === 'sum')!;
      const pattern = testPatterns.find(p => p.name === 'sum')!;

      const adjusted = adjuster.adjustPattern(pattern, sumMetrics);

      // With low statistical significance, adjustment should be minimal
      expect(Math.abs(adjusted.confidenceChange)).toBeLessThan(0.05);
    });

    test('should clamp adjusted confidence within bounds', () => {
      const feedback = Array(20).fill(null).map(() => createMockFeedback('sum', 'approve', 1.0));
      const stats = analyzer.analyzeFeedback(feedback);
      const sumMetrics = Array.from(stats.metrics.values()).find(m => m.patternName === 'sum')!;
      const pattern = testPatterns.find(p => p.name === 'sum')!;

      const adjusted = adjuster.adjustPattern(pattern, sumMetrics);

      expect(adjusted.adjustedConfidence).toBeLessThanOrEqual(0.99);
      expect(adjusted.adjustedConfidence).toBeGreaterThanOrEqual(0.70);
    });

    test('should adjust all patterns in batch', () => {
      const feedback = [
        ...Array(8).fill(null).map(() => createMockFeedback('sum', 'approve', 0.95)),
        ...Array(6).fill(null).map(() => createMockFeedback('mean', 'reject', 0.40)),
      ];

      const stats = analyzer.analyzeFeedback(feedback);
      const adjusted = adjuster.adjustAllPatterns(testPatterns, stats);

      expect(adjusted.length).toBe(testPatterns.length);
      expect(adjusted.every(p => p.adjustedConfidence >= 0.70 && p.adjustedConfidence <= 0.99)).toBe(true);
    });

    test('should generate comparison report', () => {
      const feedback = Array(10).fill(null).map(() => createMockFeedback('sum', 'approve', 0.95));
      const stats = analyzer.analyzeFeedback(feedback);
      const adjusted = adjuster.adjustAllPatterns(testPatterns, stats);
      const comparison = adjuster.generateComparisonReport(testPatterns, adjusted);

      expect(comparison.totalPatterns).toBe(testPatterns.length);
      expect(comparison.averageConfidenceBefore).toBeGreaterThan(0.7);
      expect(comparison.averageConfidenceAfter).toBeGreaterThanOrEqual(comparison.averageConfidenceBefore);
    });

    test('should handle mixed feedback (approve/reject)', () => {
      const feedback = [
        ...Array(5).fill(null).map(() => createMockFeedback('sum', 'approve', 0.95)),
        ...Array(3).fill(null).map(() => createMockFeedback('sum', 'reject', 0.40)),
      ];

      const stats = analyzer.analyzeFeedback(feedback);
      const sumMetrics = Array.from(stats.metrics.values()).find(m => m.patternName === 'sum')!;
      const pattern = testPatterns.find(p => p.name === 'sum')!;

      const adjusted = adjuster.adjustPattern(pattern, sumMetrics);

      // Net positive but smaller adjustment
      expect(adjusted.adjustedConfidence).toBeGreaterThan(adjusted.originalConfidence);
      expect(adjusted.confidenceChange).toBeLessThan(0.05);
    });

    test('should identify confidence improvements', () => {
      const feedback = Array(15).fill(null).map(() => createMockFeedback('sum', 'approve', 0.96));
      const stats = analyzer.analyzeFeedback(feedback);
      const adjusted = adjuster.adjustAllPatterns(testPatterns, stats);
      const comparison = adjuster.generateComparisonReport(testPatterns, adjusted);

      expect(comparison.improvementsCount).toBeGreaterThan(0);
      expect(comparison.averageConfidenceAfter).toBeGreaterThan(comparison.averageConfidenceBefore);
    });

    test('should track confidence changes per pattern', () => {
      const feedback = Array(10).fill(null).map(() => createMockFeedback('sum', 'approve', 0.95));
      const stats = analyzer.analyzeFeedback(feedback);
      const adjusted = adjuster.adjustAllPatterns(testPatterns, stats);

      const sumAdjusted = adjusted.find(p => p.name === 'sum');
      expect(sumAdjusted!.confidenceChange).toBeLessThanOrEqual(0.15);
      expect(sumAdjusted!.confidenceChange).toBeGreaterThanOrEqual(-0.15);
    });
  });

  describe('ConfidenceReporter', () => {
    let reporter: ConfidenceReporter;
    let testPatterns: IntentPattern[];
    let adjustedPatterns: AdjustedPattern[];

    beforeEach(() => {
      testPatterns = [
        createMockPattern('sum', 'core'),
        createMockPattern('mean', 'core'),
        createMockPattern('max', 'core'),
      ];

      adjustedPatterns = testPatterns.map(p => ({
        ...p,
        originalConfidence: p.confidence,
        adjustedConfidence: p.confidence + 0.02,
        confidenceChange: 0.02,
        adjustmentFactors: {
          usageFactor: 0.01,
          satisfactionFactor: 0.01,
          accuracyFactor: 0.0,
          statisticalSignificance: 0.8,
          finalAdjustment: 0.02,
        },
      }));

      reporter = new ConfidenceReporter();
    });

    test('should generate comparison report', () => {
      const comparisonReport = {
        totalPatterns: 3,
        averageConfidenceBefore: 0.95,
        averageConfidenceAfter: 0.97,
        averageConfidenceChange: 0.02,
        improvementsCount: 3,
        improvementsAverage: 0.02,
        degradationsCount: 0,
        degradationsAverage: 0,
        unchangedCount: 0,
        highConfidenceBefore: 3,
        highConfidenceAfter: 3,
        highConfidenceChange: 0,
        patternsWithFeedback: 3,
      };

      const stats: AggregatedStats = {
        totalFeedbackEntries: 30,
        totalPatterns: 3,
        patternsWithFeedback: 3,
        patternsWithoutFeedback: 0,
        approvalRate: 1.0,
        modificationRate: 0,
        rejectionRate: 0,
        metrics: new Map(),
        categoryStats: new Map(),
      };

      const report = reporter.generateReport(
        testPatterns,
        adjustedPatterns,
        comparisonReport,
        stats
      );

      expect(report.totalPatterns).toBe(3);
      expect(report.patternsAdjusted).toBe(3);
      expect(report.comparison.averageConfidenceChange).toBeCloseTo(0.02, 2);
    });

    test('should generate markdown report', () => {
      const comparisonReport = {
        totalPatterns: 3,
        averageConfidenceBefore: 0.95,
        averageConfidenceAfter: 0.97,
        averageConfidenceChange: 0.02,
        improvementsCount: 3,
        improvementsAverage: 0.02,
        degradationsCount: 0,
        degradationsAverage: 0,
        unchangedCount: 0,
        highConfidenceBefore: 3,
        highConfidenceAfter: 3,
        highConfidenceChange: 0,
        patternsWithFeedback: 3,
      };

      const stats: AggregatedStats = {
        totalFeedbackEntries: 30,
        totalPatterns: 3,
        patternsWithFeedback: 3,
        patternsWithoutFeedback: 0,
        approvalRate: 1.0,
        modificationRate: 0,
        rejectionRate: 0,
        metrics: new Map(),
        categoryStats: new Map(),
      };

      const report = reporter.generateReport(
        testPatterns,
        adjustedPatterns,
        comparisonReport,
        stats
      );

      const markdown = reporter.generateMarkdownReport(report);

      expect(markdown).toContain('Phase 11');
      expect(markdown).toContain('Summary');
      expect(markdown).toContain('Confidence');
      expect(markdown.length).toBeGreaterThan(200);
    });

    test('should identify top improvements', () => {
      const betterPatterns: AdjustedPattern[] = [
        {
          ...testPatterns[0],
          originalConfidence: 0.90,
          adjustedConfidence: 0.96,
          confidenceChange: 0.06,
          adjustmentFactors: {
            usageFactor: 0.03,
            satisfactionFactor: 0.03,
            accuracyFactor: 0.0,
            statisticalSignificance: 0.9,
            finalAdjustment: 0.06,
          },
        },
      ];

      const comparisonReport = {
        totalPatterns: 1,
        averageConfidenceBefore: 0.90,
        averageConfidenceAfter: 0.96,
        averageConfidenceChange: 0.06,
        improvementsCount: 1,
        improvementsAverage: 0.06,
        degradationsCount: 0,
        degradationsAverage: 0,
        unchangedCount: 0,
        highConfidenceBefore: 0,
        highConfidenceAfter: 1,
        highConfidenceChange: 1,
        patternsWithFeedback: 1,
      };

      const stats: AggregatedStats = {
        totalFeedbackEntries: 20,
        totalPatterns: 1,
        patternsWithFeedback: 1,
        patternsWithoutFeedback: 0,
        approvalRate: 1.0,
        modificationRate: 0,
        rejectionRate: 0,
        metrics: new Map(),
        categoryStats: new Map(),
      };

      const report = reporter.generateReport(
        testPatterns.slice(0, 1),
        betterPatterns,
        comparisonReport,
        stats
      );

      expect(report.topImprovements.length).toBeGreaterThan(0);
      expect(report.topImprovements[0].confidenceChange).toBeGreaterThan(0);
    });
  });

  describe('E2E: Full Pipeline', () => {
    test('should process real patterns with simulated feedback', () => {
      // Use a subset of real patterns
      const realPatterns = (allPatterns as IntentPattern[]).slice(0, 10);
      const analyzer = new FeedbackAnalyzer(realPatterns);

      // Create simulated feedback for some patterns
      const feedback: FeedbackEntry[] = [];
      for (const pattern of realPatterns.slice(0, 5)) {
        for (let i = 0; i < 8; i++) {
          feedback.push(createMockFeedback(pattern.name, 'approve', 0.92));
        }
      }

      const stats = analyzer.analyzeFeedback(feedback);
      expect(stats.patternsWithFeedback).toBeGreaterThan(0);

      const adjuster = new DynamicConfidenceAdjuster();
      const adjusted = adjuster.adjustAllPatterns(realPatterns, stats);

      expect(adjusted.length).toBe(realPatterns.length);
      expect(adjusted.every(p => p.adjustedConfidence >= 0.70 && p.adjustedConfidence <= 0.99)).toBe(true);
    });

    test('should not degrade patterns without sufficient feedback', () => {
      const testPatterns = [
        createMockPattern('sum', 'core'),
        createMockPattern('mean', 'core'),
      ];
      const analyzer = new FeedbackAnalyzer(testPatterns);

      // Only 1 feedback entry for sum
      const feedback = [createMockFeedback('sum', 'approve')];

      const stats = analyzer.analyzeFeedback(feedback);
      const adjuster = new DynamicConfidenceAdjuster();
      const adjusted = adjuster.adjustAllPatterns(testPatterns, stats);

      // mean should be unchanged
      const meanAdjusted = adjusted.find(p => p.name === 'mean')!;
      expect(meanAdjusted.confidenceChange).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    let analyzer: FeedbackAnalyzer;
    let adjuster: DynamicConfidenceAdjuster;

    beforeEach(() => {
      const patterns = [createMockPattern('test', 'core')];
      analyzer = new FeedbackAnalyzer(patterns);
      adjuster = new DynamicConfidenceAdjuster();
    });

    test('should handle feedback with 0 accuracy', () => {
      const feedback = [createMockFeedback('test', 'approve', 0)];
      const stats = analyzer.analyzeFeedback(feedback);

      expect(stats).toBeDefined();
      expect(stats.totalFeedbackEntries).toBe(1);
    });

    test('should handle all rejection feedback', () => {
      const feedback = Array(10).fill(null).map(() => createMockFeedback('test', 'reject', 0.1));
      const stats = analyzer.analyzeFeedback(feedback);
      const metrics = Array.from(stats.metrics.values())[0];

      expect(metrics.rejectionRate).toBeCloseTo(1.0, 1);
      expect(metrics.approvalRate).toBe(0);
    });

    test('should handle all approval feedback', () => {
      const feedback = Array(10).fill(null).map(() => createMockFeedback('test', 'approve', 0.99));
      const stats = analyzer.analyzeFeedback(feedback);
      const metrics = Array.from(stats.metrics.values())[0];

      expect(metrics.approvalRate).toBeCloseTo(1.0, 1);
      expect(metrics.rejectionRate).toBe(0);
    });
  });

  describe('Performance', () => {
    test('should analyze 1000 feedback entries in < 100ms', () => {
      const testPatterns = (allPatterns as IntentPattern[]).slice(0, 50);
      const analyzer = new FeedbackAnalyzer(testPatterns);

      const feedback: FeedbackEntry[] = [];
      for (let i = 0; i < 1000; i++) {
        const pattern = testPatterns[i % testPatterns.length];
        feedback.push(createMockFeedback(pattern.name, 'approve', 0.9));
      }

      const start = performance.now();
      analyzer.analyzeFeedback(feedback);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    test('should adjust 578 patterns in < 50ms', () => {
      const testPatterns = (allPatterns as IntentPattern[]).slice(0, 578);
      const analyzer = new FeedbackAnalyzer(testPatterns);
      const feedback = Array(500).fill(null).map(() => createMockFeedback('sum', 'approve', 0.95));

      const stats = analyzer.analyzeFeedback(feedback);
      const adjuster = new DynamicConfidenceAdjuster();

      const start = performance.now();
      adjuster.adjustAllPatterns(testPatterns, stats);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(50);
    });
  });
});
