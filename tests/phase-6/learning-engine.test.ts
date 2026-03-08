/**
 * Phase 6.2 Week 4: LearningEngine Tests
 *
 * 15+ tests for automatic pattern learning
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { LearningEngine } from '../../src/phase-6/learning-engine';
import { SmartREPL } from '../../src/phase-6/smart-repl';

describe('Phase 6.2 Week 4: LearningEngine', () => {
  let engine: LearningEngine;
  let repl: SmartREPL;

  beforeEach(() => {
    engine = new LearningEngine();
    repl = new SmartREPL();
  });

  // ============================================================================
  // CATEGORY 1: BASIC PATTERN LEARNING (4 tests)
  // ============================================================================

  describe('Basic Pattern Learning', () => {
    it('should learn from successful execution', () => {
      const code = 'let x = 5';
      const result = repl.execute(code);

      const pattern = engine.learn(code, result);

      expect(pattern).toBeTruthy();
      expect(pattern.code).toBe(code);
      expect(pattern.executionCount).toBe(1);
      expect(pattern.successRate).toBeGreaterThan(0);
    });

    it('should update pattern on repeated execution', () => {
      const code = 'let x = 10';
      const result1 = repl.execute(code);
      const result2 = repl.execute(code);

      const pattern1 = engine.learn(code, result1);
      const pattern2 = engine.learn(code, result2);

      expect(pattern2.executionCount).toBe(2);
      expect(pattern2.id).toBe(pattern1.id);
    });

    it('should calculate success rate correctly', () => {
      const code = 'sum([1, 2, 3])';
      const result = repl.execute(code);

      const pattern = engine.learn(code, result);

      expect(pattern.successRate).toBeGreaterThanOrEqual(0);
      expect(pattern.successRate).toBeLessThanOrEqual(1);
    });

    it('should calculate confidence score', () => {
      const code = '[1, 2, 3]';
      const result = repl.execute(code);

      const pattern = engine.learn(code, result);

      expect(pattern.confidence).toBeGreaterThan(0);
      expect(pattern.confidence).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================================
  // CATEGORY 2: PATTERN SIMILARITY (4 tests)
  // ============================================================================

  describe('Pattern Similarity', () => {
    it('should calculate identical pattern similarity as 1.0', () => {
      const code = 'let x = 5';
      const similarity = engine.calculateSimilarity(code, code);

      expect(similarity).toBe(1);
    });

    it('should calculate completely different patterns as low', () => {
      const code1 = 'let x = 5';
      const code2 = 'function foo() {}';

      const similarity = engine.calculateSimilarity(code1, code2);

      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThan(0.5);
    });

    it('should find similar patterns', () => {
      const code1 = 'sum([1, 2, 3])';
      const code2 = 'sum([4, 5, 6])';
      const result1 = repl.execute(code1);
      const result2 = repl.execute(code2);

      engine.learn(code1, result1);
      engine.learn(code2, result2);

      const similar = engine.findSimilarPatterns(code1, 5);

      expect(similar.length).toBeGreaterThan(0);
      expect(similar[0].similarity).toBeGreaterThan(0);
    });

    it('should rank similar patterns by similarity score', () => {
      const code1 = 'let x = 5; let y = 10';
      const code2 = 'let x = 5; let y = 15';
      const code3 = 'let a = 1; let b = 2; let c = 3';

      const result1 = repl.execute(code1);
      const result2 = repl.execute(code2);
      const result3 = repl.execute(code3);

      engine.learn(code1, result1);
      engine.learn(code2, result2);
      engine.learn(code3, result3);

      const similar = engine.findSimilarPatterns(code1, 5);

      if (similar.length > 1) {
        expect(similar[0].similarity).toBeGreaterThanOrEqual(similar[1].similarity);
      }
    });
  });

  // ============================================================================
  // CATEGORY 3: PATTERN RECOMMENDATIONS (3 tests)
  // ============================================================================

  describe('Pattern Recommendations', () => {
    it('should recommend improvements for code', () => {
      const code1 = 'sum([1, 2, 3])';
      const result1 = repl.execute(code1);
      engine.learn(code1, result1);

      const recommendations = engine.recommendImprovement(code1);

      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should prioritize recommendations by confidence', () => {
      const code1 = 'sum([1, 2, 3])';
      const code2 = 'len([4, 5, 6])';
      const result1 = repl.execute(code1);
      const result2 = repl.execute(code2);

      engine.learn(code1, result1);
      engine.learn(code2, result2);

      const recommendations = engine.recommendImprovement(code1);

      if (recommendations.length > 1) {
        expect(
          recommendations[0].confidenceGain >=
            recommendations[1].confidenceGain
        ).toBe(true);
      }
    });

    it('should include confidence gain in recommendation', () => {
      const code = 'sum([1, 2, 3])';
      const result = repl.execute(code);
      engine.learn(code, result);

      const recommendations = engine.recommendImprovement(code);

      for (const rec of recommendations) {
        expect(rec.confidenceGain).toBeDefined();
      }
    });
  });

  // ============================================================================
  // CATEGORY 4: LEARNING STATISTICS (4 tests)
  // ============================================================================

  describe('Learning Statistics', () => {
    it('should return empty stats initially', () => {
      const stats = engine.getStats();

      expect(stats.totalPatterns).toBe(0);
      expect(stats.totalExecutions).toBe(0);
      expect(stats.topPatterns.length).toBe(0);
    });

    it('should calculate total patterns', () => {
      for (let i = 0; i < 5; i++) {
        const code = `sum([${i}])`;
        const result = repl.execute(code);
        engine.learn(code, result);
      }

      const stats = engine.getStats();

      expect(stats.totalPatterns).toBeGreaterThan(0);
    });

    it('should track average success rate', () => {
      const code1 = 'sum([1, 2, 3])';
      const code2 = 'len([4, 5, 6])';
      const result1 = repl.execute(code1);
      const result2 = repl.execute(code2);

      engine.learn(code1, result1);
      engine.learn(code2, result2);

      const stats = engine.getStats();

      expect(stats.averageSuccessRate).toBeGreaterThanOrEqual(0);
      expect(stats.averageSuccessRate).toBeLessThanOrEqual(1);
    });

    it('should identify top patterns', () => {
      for (let i = 0; i < 3; i++) {
        const code = `sum([${i}])`;
        const result = repl.execute(code);
        engine.learn(code, result);
        engine.learn(code, result);  // Learn twice for higher confidence
      }

      const stats = engine.getStats();

      expect(stats.topPatterns.length).toBeGreaterThan(0);
      if (stats.topPatterns.length > 1) {
        expect(stats.topPatterns[0].confidence).toBeGreaterThanOrEqual(
          stats.topPatterns[1].confidence
        );
      }
    });
  });

  // ============================================================================
  // CATEGORY 5: PATTERN MANAGEMENT (3 tests)
  // ============================================================================

  describe('Pattern Management', () => {
    it('should list all patterns', () => {
      const code = 'sum([1, 2, 3])';
      const result = repl.execute(code);
      engine.learn(code, result);

      const patterns = engine.listPatterns();

      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should reset all patterns', () => {
      const code = 'sum([1, 2, 3])';
      const result = repl.execute(code);
      engine.learn(code, result);

      let stats = engine.getStats();
      expect(stats.totalPatterns).toBeGreaterThan(0);

      engine.reset();

      stats = engine.getStats();
      expect(stats.totalPatterns).toBe(0);
    });

    it('should maintain pattern execution history', () => {
      const code = 'sum([1, 2, 3])';
      for (let i = 0; i < 3; i++) {
        const result = repl.execute(code);
        engine.learn(code, result);
      }

      const patterns = engine.listPatterns();

      if (patterns.length > 0) {
        expect(patterns[0].executionCount).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // CATEGORY 6: EXECUTION HISTORY (2 tests)
  // ============================================================================

  describe('Execution History', () => {
    it('should track execution history', () => {
      for (let i = 0; i < 5; i++) {
        const code = `sum([${i}])`;
        const result = repl.execute(code);
        engine.learn(code, result);
      }

      const history = engine.getHistory(10);

      expect(history.length).toBeGreaterThan(0);
      expect(history.length).toBeLessThanOrEqual(10);
    });

    it('should return execution with correct structure', () => {
      const code = 'sum([1, 2, 3])';
      const result = repl.execute(code);
      engine.learn(code, result);

      const history = engine.getHistory(1);

      expect(history[0].code).toBeDefined();
      expect(history[0].result).toBeDefined();
      expect(history[0].timestamp).toBeDefined();
    });
  });

  // ============================================================================
  // CATEGORY 7: LEARNING TRENDS (2 tests)
  // ============================================================================

  describe('Learning Trends', () => {
    it('should calculate learning trend', () => {
      for (let i = 0; i < 3; i++) {
        const code = `sum([${i}])`;
        const result = repl.execute(code);
        engine.learn(code, result);
      }

      const stats = engine.getStats();

      expect(stats.learningTrend).toBeDefined();
    });

    it('should track pattern success rate trend', () => {
      const code = 'sum([1, 2, 3])';
      for (let i = 0; i < 3; i++) {
        const result = repl.execute(code);
        engine.learn(code, result);
      }

      const patterns = engine.listPatterns();
      if (patterns.length > 0) {
        const patternId = patterns[0].id;
        const trend = engine.getSuccessRateTrend(patternId);

        expect(Array.isArray(trend)).toBe(true);
      }
    });
  });
});
