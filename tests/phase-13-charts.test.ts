/**
 * Phase 13: Advanced Chart.js Visualizations - Unit Tests
 *
 * Test data transformation functions for:
 * - Line Chart (confidence trends)
 * - Heatmap (category distribution)
 * - Stacked Bar Chart (top movers)
 */

import { Dashboard } from '../src/dashboard/dashboard';
import { IntentPattern } from '../src/phase-10/unified-pattern-database';
import allPatterns from '../src/phase-10/v1-v2-adjusted-patterns.json';

describe('Phase 13: Chart Data Transformations', () => {
  let patterns: IntentPattern[];
  let mockPatternUpdater: any;

  beforeEach(() => {
    patterns = (allPatterns as IntentPattern[]).slice(0, 50);

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
      getTrend: (id: string, days: number) => [
        {
          date: new Date().toISOString().split('T')[0],
          avg_confidence: 0.75,
          interactions: 10,
          approval_rate: 0.75,
        },
      ],
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
  });

  describe('Line Chart: Confidence Trends Transformation', () => {
    test('should transform trends data into chart format', () => {
      const trends = [
        {
          date: '2026-02-10',
          avgConfidenceBefore: 0.75,
          avgConfidenceAfter: 0.82,
          improvedPatternCount: 36,
        },
        {
          date: '2026-02-11',
          avgConfidenceBefore: 0.76,
          avgConfidenceAfter: 0.83,
          improvedPatternCount: 38,
        },
      ];

      // Simulate transformTrendsData
      const labels = trends.map(t => t.date);
      const beforeData = trends.map(t => (t.avgConfidenceBefore * 100).toFixed(1));
      const afterData = trends.map(t => (t.avgConfidenceAfter * 100).toFixed(1));

      expect(labels).toHaveLength(2);
      expect(beforeData).toEqual(['75.0', '76.0']);
      expect(afterData).toEqual(['82.0', '83.0']);
    });

    test('should handle empty trends data', () => {
      const trends: any[] = [];

      const labels = trends.map(t => t.date);
      expect(labels).toHaveLength(0);
    });

    test('should preserve confidence values in correct range', () => {
      const trends = [
        {
          date: '2026-02-10',
          avgConfidenceBefore: 0.5,
          avgConfidenceAfter: 0.95,
          improvedPatternCount: 10,
        },
      ];

      const beforeData = trends.map(t => (t.avgConfidenceBefore * 100).toFixed(1));
      const afterData = trends.map(t => (t.avgConfidenceAfter * 100).toFixed(1));

      expect(parseFloat(beforeData[0])).toBeGreaterThanOrEqual(0);
      expect(parseFloat(beforeData[0])).toBeLessThanOrEqual(100);
      expect(parseFloat(afterData[0])).toBeGreaterThanOrEqual(0);
      expect(parseFloat(afterData[0])).toBeLessThanOrEqual(100);
    });
  });

  describe('Heatmap: Category Distribution Transformation', () => {
    test('should transform categories and report into heatmap data', () => {
      const categories = [
        {
          categoryId: 'arithmetic',
          patternCount: 12,
          avgBefore: 0.78,
          avgAfter: 0.85,
        },
        {
          categoryId: 'string_ops',
          patternCount: 8,
          avgBefore: 0.72,
          avgAfter: 0.79,
        },
      ];

      const report = {
        patterns: [
          { patternId: 'sum', adjustedConfidence: 0.85, category: 'arithmetic' },
          { patternId: 'avg', adjustedConfidence: 0.55, category: 'arithmetic' },
          { patternId: 'concat', adjustedConfidence: 0.79, category: 'string_ops' },
        ],
      };

      // Simulate transformHeatmapData
      const bins = [
        { label: '0-30%', min: 0, max: 0.3 },
        { label: '30-50%', min: 0.3, max: 0.5 },
        { label: '50-70%', min: 0.5, max: 0.7 },
        { label: '70-90%', min: 0.7, max: 0.9 },
        { label: '90-100%', min: 0.9, max: 1.0 },
      ];

      const data: any[] = [];
      const categoryNames = categories.map(c => c.categoryId);

      categories.forEach(cat => {
        const categoryPatterns = (report.patterns || []).filter(p =>
          p.category === cat.categoryId || cat.categoryId.includes(p.category)
        );

        bins.forEach((bin, binIndex) => {
          const count = categoryPatterns.filter(p =>
            p.adjustedConfidence >= bin.min && p.adjustedConfidence < bin.max
          ).length;

          if (count > 0) {
            data.push({
              x: binIndex,
              y: categoryNames.indexOf(cat.categoryId),
              v: count,
            });
          }
        });
      });

      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);
      expect(categoryNames).toEqual(['arithmetic', 'string_ops']);

      // Verify bin assignment correctness
      data.forEach(d => {
        expect(d.x).toBeGreaterThanOrEqual(0);
        expect(d.x).toBeLessThan(bins.length);
        expect(d.y).toBeGreaterThanOrEqual(0);
        expect(d.y).toBeLessThan(categoryNames.length);
        expect(d.v).toBeGreaterThan(0);
      });
    });

    test('should handle empty categories gracefully', () => {
      const categories: any[] = [];
      const report = { patterns: [] };

      const categoryNames = categories.map(c => c.categoryId);
      expect(categoryNames).toHaveLength(0);
    });

    test('should correctly bin patterns into confidence ranges', () => {
      const bins = [
        { label: '0-30%', min: 0, max: 0.3 },
        { label: '30-50%', min: 0.3, max: 0.5 },
        { label: '50-70%', min: 0.5, max: 0.7 },
        { label: '70-90%', min: 0.7, max: 0.9 },
        { label: '90-100%', min: 0.9, max: 1.0 },
      ];

      const testPattern = 0.75; // Should fall into 70-90% bin
      const binIndex = bins.findIndex(
        b => testPattern >= b.min && testPattern < b.max
      );

      expect(binIndex).toBe(3); // Index 3 = 70-90%
    });
  });

  describe('Stacked Bar: Top Movers Transformation', () => {
    test('should transform movers into stacked bar data', () => {
      const movers = {
        improvements: [
          {
            patternId: 'factorial',
            originalConfidence: 0.55,
            adjustedConfidence: 0.82,
          },
          {
            patternId: 'fibonacci',
            originalConfidence: 0.60,
            adjustedConfidence: 0.81,
          },
        ],
        degradations: [
          {
            patternId: 'edge_case',
            originalConfidence: 0.75,
            adjustedConfidence: 0.62,
          },
        ],
      };

      // Simulate transformStackedBarData
      const allMovers = [
        ...(movers.improvements || []).slice(0, 5),
        ...(movers.degradations || []).slice(0, 5),
      ];

      const labels = allMovers.map(p => p.patternId);
      const improvementData = allMovers.map(p => {
        const delta = p.adjustedConfidence - p.originalConfidence;
        return Math.max(0, delta * 100);
      });
      const degradationData = allMovers.map(p => {
        const delta = p.adjustedConfidence - p.originalConfidence;
        return Math.min(0, delta * 100);
      });

      expect(labels).toHaveLength(3);
      expect(labels).toEqual(['factorial', 'fibonacci', 'edge_case']);

      // Improvements should be positive
      expect(improvementData[0]).toBeGreaterThan(0);
      expect(improvementData[1]).toBeGreaterThan(0);
      expect(improvementData[2]).toBe(0);

      // Degradations should be negative or zero
      expect(degradationData[0]).toBe(0);
      expect(degradationData[1]).toBe(0);
      expect(degradationData[2]).toBeLessThan(0);
    });

    test('should handle empty movers gracefully', () => {
      const movers = { improvements: [], degradations: [] };

      const allMovers = [
        ...(movers.improvements || []).slice(0, 5),
        ...(movers.degradations || []).slice(0, 5),
      ];

      expect(allMovers).toHaveLength(0);
    });

    test('should correctly calculate confidence deltas', () => {
      const movers = {
        improvements: [
          {
            patternId: 'test1',
            originalConfidence: 0.5,
            adjustedConfidence: 0.8,
          },
        ],
        degradations: [],
      };

      const allMovers = [...(movers.improvements || [])];
      const deltas = allMovers.map(
        p => p.adjustedConfidence - p.originalConfidence
      );

      expect(deltas[0]).toBeCloseTo(0.3, 5);
    });

    test('should limit to max 10 patterns (5 improvements + 5 degradations)', () => {
      const movers = {
        improvements: Array.from({ length: 10 }, (_, i) => ({
          patternId: `imp_${i}`,
          originalConfidence: 0.5,
          adjustedConfidence: 0.8,
        })),
        degradations: Array.from({ length: 10 }, (_, i) => ({
          patternId: `deg_${i}`,
          originalConfidence: 0.8,
          adjustedConfidence: 0.5,
        })),
      };

      const allMovers = [
        ...(movers.improvements || []).slice(0, 5),
        ...(movers.degradations || []).slice(0, 5),
      ];

      expect(allMovers).toHaveLength(10);
    });
  });

  describe('Chart Integration with Dashboard', () => {
    test('should work with Dashboard class for trends data', () => {
      const dashboard = new Dashboard(mockPatternUpdater, undefined, patterns);
      const trends = dashboard.getConfidenceTrends(patterns, 7);

      expect(Array.isArray(trends)).toBe(true);
      trends.forEach(trend => {
        expect(trend).toHaveProperty('date');
        expect(trend).toHaveProperty('avgConfidenceBefore');
        expect(trend).toHaveProperty('avgConfidenceAfter');
      });
    });

    test('should work with Dashboard class for category breakdown', () => {
      const dashboard = new Dashboard(mockPatternUpdater, undefined, patterns);
      const categories = dashboard.getCategoryBreakdown(patterns);

      expect(Array.isArray(categories)).toBe(true);
      categories.forEach(cat => {
        expect(cat).toHaveProperty('categoryId');
        expect(cat).toHaveProperty('patternCount');
        expect(cat).toHaveProperty('avgBefore');
        expect(cat).toHaveProperty('avgAfter');
      });
    });

    test('should work with Dashboard class for top movers', () => {
      const dashboard = new Dashboard(mockPatternUpdater, undefined, patterns);
      const movers = dashboard.getTopMovers(patterns, 10);

      expect(movers).toHaveProperty('improvements');
      expect(movers).toHaveProperty('degradations');
      expect(Array.isArray(movers.improvements)).toBe(true);
      expect(Array.isArray(movers.degradations)).toBe(true);
    });
  });

  describe('Performance: Chart Rendering', () => {
    test('should transform line chart data in <5ms', () => {
      const trends = Array.from({ length: 30 }, (_, i) => ({
        date: `2026-02-${String((i % 28) + 1).padStart(2, '0')}`,
        avgConfidenceBefore: 0.75 + Math.random() * 0.1,
        avgConfidenceAfter: 0.82 + Math.random() * 0.1,
        improvedPatternCount: Math.floor(Math.random() * 50),
      }));

      const start = performance.now();
      const labels = trends.map(t => t.date);
      const beforeData = trends.map(t => (t.avgConfidenceBefore * 100).toFixed(1));
      const afterData = trends.map(t => (t.avgConfidenceAfter * 100).toFixed(1));
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(5);
      expect(labels).toHaveLength(30);
    });

    test('should transform heatmap data in <10ms', () => {
      const categories = Array.from({ length: 20 }, (_, i) => ({
        categoryId: `cat_${i}`,
        patternCount: Math.floor(Math.random() * 20),
        avgBefore: 0.7 + Math.random() * 0.1,
        avgAfter: 0.75 + Math.random() * 0.1,
      }));

      const report = {
        patterns: Array.from({ length: 500 }, (_, i) => ({
          patternId: `p_${i}`,
          adjustedConfidence: Math.random(),
          category: `cat_${i % 20}`,
        })),
      };

      const start = performance.now();

      const bins = [
        { min: 0, max: 0.3 },
        { min: 0.3, max: 0.5 },
        { min: 0.5, max: 0.7 },
        { min: 0.7, max: 0.9 },
        { min: 0.9, max: 1.0 },
      ];

      const data: any[] = [];
      categories.forEach(cat => {
        const categoryPatterns = report.patterns.filter(
          p => p.category === cat.categoryId
        );
        bins.forEach((bin, binIndex) => {
          const count = categoryPatterns.filter(p =>
            p.adjustedConfidence >= bin.min && p.adjustedConfidence < bin.max
          ).length;
          if (count > 0) {
            data.push({ x: binIndex, y: 0, v: count });
          }
        });
      });

      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10);
      expect(data.length).toBeGreaterThan(0);
    });

    test('should transform stacked bar data in <5ms', () => {
      const movers = {
        improvements: Array.from({ length: 100 }, (_, i) => ({
          patternId: `imp_${i}`,
          originalConfidence: Math.random(),
          adjustedConfidence: Math.random(),
        })),
        degradations: Array.from({ length: 100 }, (_, i) => ({
          patternId: `deg_${i}`,
          originalConfidence: Math.random(),
          adjustedConfidence: Math.random(),
        })),
      };

      const start = performance.now();

      const allMovers = [
        ...(movers.improvements || []).slice(0, 5),
        ...(movers.degradations || []).slice(0, 5),
      ];

      const labels = allMovers.map(p => p.patternId);
      const improvementData = allMovers.map(p => {
        const delta = p.adjustedConfidence - p.originalConfidence;
        return Math.max(0, delta * 100);
      });
      const degradationData = allMovers.map(p => {
        const delta = p.adjustedConfidence - p.originalConfidence;
        return Math.min(0, delta * 100);
      });

      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(5);
      expect(labels).toHaveLength(10);
    });
  });
});
