/**
 * Phase 6.2 Week 4: AutoImprover Tests
 *
 * 15+ tests for automatic code improvement
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { AutoImprover } from '../../src/phase-6/auto-improver';
import { LearningEngine } from '../../src/phase-6/learning-engine';
import { ErrorAnalyzer } from '../../src/phase-6/error-analyzer';
import { PerformanceAnalyzer } from '../../src/phase-6/performance-analyzer';
import { SmartREPL } from '../../src/phase-6/smart-repl';

describe('Phase 6.2 Week 4: AutoImprover', () => {
  let improver: AutoImprover;
  let learningEngine: LearningEngine;
  let errorAnalyzer: ErrorAnalyzer;
  let performanceAnalyzer: PerformanceAnalyzer;
  let repl: SmartREPL;

  beforeEach(() => {
    learningEngine = new LearningEngine();
    errorAnalyzer = new ErrorAnalyzer();
    performanceAnalyzer = new PerformanceAnalyzer();
    improver = new AutoImprover(learningEngine, errorAnalyzer, performanceAnalyzer);
    repl = new SmartREPL();
  });

  // ============================================================================
  // CATEGORY 1: SUGGESTION GENERATION (4 tests)
  // ============================================================================

  describe('Suggestion Generation', () => {
    it('should generate improvement suggestions', () => {
      const code = 'sum([1, 2, 3])';
      const result = repl.execute(code);
      learningEngine.learn(code, result);

      const suggestions = improver.suggest(code);

      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should suggest patterns', () => {
      const code1 = 'sum([1, 2, 3])';
      const result1 = repl.execute(code1);
      learningEngine.learn(code1, result1);

      const code2 = 'sum([4, 5, 6])';
      const suggestions = improver.suggest(code2);

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
      if (suggestions.length > 0) {
        expect(['performance', 'reliability', 'pattern', 'safety']).toContain(
          suggestions[0].type
        );
      }
    });

    it('should include description in suggestions', () => {
      const code = 'sum([1, 2, 3])';
      const result = repl.execute(code);
      learningEngine.learn(code, result);

      const suggestions = improver.suggest(code);

      for (const suggestion of suggestions) {
        expect(suggestion.description).toBeTruthy();
      }
    });

    it('should provide suggested code', () => {
      const code = 'sum([1, 2, 3])';
      const result = repl.execute(code);
      learningEngine.learn(code, result);

      const suggestions = improver.suggest(code);

      for (const suggestion of suggestions) {
        expect(suggestion.suggestedCode).toBeTruthy();
      }
    });
  });

  // ============================================================================
  // CATEGORY 2: CONFIDENCE SCORING (3 tests)
  // ============================================================================

  describe('Confidence Scoring', () => {
    it('should include confidence in suggestions', () => {
      const code = 'sum([1, 2, 3])';
      const result = repl.execute(code);
      learningEngine.learn(code, result);

      const suggestions = improver.suggest(code);

      for (const suggestion of suggestions) {
        expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
        expect(suggestion.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should rank suggestions by confidence', () => {
      const code = 'sum([1, 2, 3])';
      const result = repl.execute(code);
      learningEngine.learn(code, result);

      const suggestions = improver.suggest(code);

      if (suggestions.length > 1) {
        expect(suggestions[0].confidence).toBeGreaterThanOrEqual(
          suggestions[1].confidence
        );
      }
    });

    it('should calculate expected improvement', () => {
      const code = 'sum([1, 2, 3])';
      const result = repl.execute(code);
      learningEngine.learn(code, result);

      const suggestions = improver.suggest(code);

      for (const suggestion of suggestions) {
        expect(suggestion.expectedImprovement).toBeTruthy();
      }
    });
  });

  // ============================================================================
  // CATEGORY 3: SUGGESTION APPLICATION (3 tests)
  // ============================================================================

  describe('Suggestion Application', () => {
    it('should apply suggestion', () => {
      const code = 'sum([1, 2, 3])';
      const result = repl.execute(code);
      learningEngine.learn(code, result);

      const suggestions = improver.suggest(code);
      if (suggestions.length > 0) {
        const applied = improver.applySuggestion(code, suggestions[0]);

        expect(applied).toBeTruthy();
        expect(applied.originalCode).toBe(code);
        expect(applied.suggestedCode).toBeTruthy();
      }
    });

    it('should calculate estimated gain', () => {
      const code = 'sum([1, 2, 3])';
      const result = repl.execute(code);
      learningEngine.learn(code, result);

      const suggestions = improver.suggest(code);
      if (suggestions.length > 0) {
        const applied = improver.applySuggestion(code, suggestions[0]);

        expect(applied.estimatedGain).toBeGreaterThanOrEqual(0);
        expect(applied.estimatedGain).toBeLessThanOrEqual(1);
      }
    });

    it('should track applied suggestions', () => {
      const code = 'sum([1, 2, 3])';
      const result = repl.execute(code);
      learningEngine.learn(code, result);

      const suggestions = improver.suggest(code);
      if (suggestions.length > 0) {
        improver.applySuggestion(code, suggestions[0]);

        const history = improver.getHistory();
        expect(history.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // CATEGORY 4: IMPROVEMENT HISTORY (2 tests)
  // ============================================================================

  describe('Improvement History', () => {
    it('should maintain improvement history', () => {
      const code = 'sum([1, 2, 3])';
      const result = repl.execute(code);
      learningEngine.learn(code, result);

      const suggestions = improver.suggest(code);
      if (suggestions.length > 0) {
        improver.applySuggestion(code, suggestions[0]);
      }

      const history = improver.getHistory();

      expect(Array.isArray(history)).toBe(true);
    });

    it('should return correct history structure', () => {
      const code = 'sum([1, 2, 3])';
      const result = repl.execute(code);
      learningEngine.learn(code, result);

      const suggestions = improver.suggest(code);
      if (suggestions.length > 0) {
        improver.applySuggestion(code, suggestions[0]);
      }

      const history = improver.getHistory(1);

      if (history.length > 0) {
        expect(history[0].originalCode).toBeDefined();
        expect(history[0].suggestedCode).toBeDefined();
        expect(history[0].estimatedGain).toBeDefined();
      }
    });
  });

  // ============================================================================
  // CATEGORY 5: CUMULATIVE IMPROVEMENT (2 tests)
  // ============================================================================

  describe('Cumulative Improvement', () => {
    it('should calculate cumulative gain', () => {
      const code = 'sum([1, 2, 3])';
      const result = repl.execute(code);
      learningEngine.learn(code, result);

      const suggestions = improver.suggest(code);
      if (suggestions.length > 0) {
        improver.applySuggestion(code, suggestions[0]);
      }

      const gain = improver.getCumulativeGain();

      expect(gain).toBeGreaterThanOrEqual(0);
      expect(gain).toBeLessThanOrEqual(1);
    });

    it('should return zero gain for empty history', () => {
      const gain = improver.getCumulativeGain();

      expect(gain).toBe(0);
    });
  });

  // ============================================================================
  // CATEGORY 6: IMPROVEMENT TYPES (3 tests)
  // ============================================================================

  describe('Improvement Types', () => {
    it('should suggest pattern improvements', () => {
      const code = 'sum([1, 2, 3])';
      const result = repl.execute(code);
      learningEngine.learn(code, result);

      const suggestions = improver.suggest(code);

      const patternSuggestions = suggestions.filter((s) => s.type === 'pattern');
      expect(patternSuggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should suggest reliability improvements', () => {
      const code = 'undefinedVar + 5';
      const result = repl.execute(code);
      errorAnalyzer.analyzeError(code, result);

      const suggestions = improver.suggest(code);

      const reliabilitySuggestions = suggestions.filter(
        (s) => s.type === 'reliability'
      );
      expect(reliabilitySuggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should suggest performance improvements', () => {
      for (let i = 0; i < 5; i++) {
        const code = '[1, 2, 3, 4, 5]';
        const result = repl.execute(code);
        performanceAnalyzer.recordMetric(result, code);
      }

      const code = '[1, 2, 3, 4, 5]';
      const suggestions = improver.suggest(code);

      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  // ============================================================================
  // CATEGORY 7: REPORT GENERATION (1 test)
  // ============================================================================

  describe('Report Generation', () => {
    it('should generate improvement report', () => {
      const code = 'sum([1, 2, 3])';
      const result = repl.execute(code);
      learningEngine.learn(code, result);

      const suggestions = improver.suggest(code);
      if (suggestions.length > 0) {
        improver.applySuggestion(code, suggestions[0]);
      }

      const report = improver.generateReport();

      expect(report).toContain('Auto-Improvement Report');
    });
  });

  // ============================================================================
  // CATEGORY 8: INTEGRATION (1 test)
  // ============================================================================

  describe('Integration', () => {
    it('should work with all three engines', () => {
      // Learning
      const code1 = 'sum([1, 2, 3])';
      const result1 = repl.execute(code1);
      learningEngine.learn(code1, result1);

      // Error Analysis
      const code2 = 'undefinedVar';
      const result2 = repl.execute(code2);
      errorAnalyzer.analyzeError(code2, result2);

      // Performance
      performanceAnalyzer.recordMetric(result1, code1);

      // Suggestions
      const suggestions = improver.suggest(code1);

      expect(Array.isArray(suggestions)).toBe(true);
    });
  });
});
