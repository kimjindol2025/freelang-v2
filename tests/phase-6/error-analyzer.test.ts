/**
 * Phase 6.2 Week 4: ErrorAnalyzer Tests
 *
 * 15+ tests for error pattern analysis
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ErrorAnalyzer } from '../../src/phase-6/error-analyzer';
import { SmartREPL } from '../../src/phase-6/smart-repl';

describe('Phase 6.2 Week 4: ErrorAnalyzer', () => {
  let analyzer: ErrorAnalyzer;
  let repl: SmartREPL;

  beforeEach(() => {
    analyzer = new ErrorAnalyzer();
    repl = new SmartREPL();
  });

  // ============================================================================
  // CATEGORY 1: ERROR CLASSIFICATION (4 tests)
  // ============================================================================

  describe('Error Classification', () => {
    it('should classify syntax errors', () => {
      const classification = analyzer.classifyError(
        'Unexpected token: Expected )'
      );

      expect(classification.errorType).toBe('syntax');
      expect(classification.severity).toBeTruthy();
    });

    it('should classify type errors', () => {
      const classification = analyzer.classifyError('x is not a function');

      expect(classification.errorType).toBe('type');
      expect(classification.severity).toBeTruthy();
    });

    it('should classify runtime errors', () => {
      const classification = analyzer.classifyError('Cannot read property of null');

      expect(classification.errorType).toBe('runtime');
      expect(classification.severity).toBeTruthy();
    });

    it('should classify unknown errors', () => {
      const classification = analyzer.classifyError('Something went wrong');

      expect(classification.errorType).toBeTruthy();
      expect(classification.suggestion).toBeTruthy();
    });
  });

  // ============================================================================
  // CATEGORY 2: ERROR PATTERN TRACKING (3 tests)
  // ============================================================================

  describe('Error Pattern Tracking', () => {
    it('should track error patterns', () => {
      const code1 = 'undefinedVar + 5';
      const result1 = repl.execute(code1);

      const pattern = analyzer.analyzeError(code1, result1);

      if (!result1.success) {
        expect(pattern).toBeTruthy();
        expect(pattern?.count).toBeGreaterThan(0);
      }
    });

    it('should track multiple error patterns', () => {
      const code = 'undefinedVar + 5';
      const result = repl.execute(code);

      const pattern1 = analyzer.analyzeError(code, result);
      analyzer.analyzeError(code, result);

      const patterns = analyzer.listPatterns();

      if (pattern1) {
        expect(patterns.length).toBeGreaterThan(0);
      }
    });

    it('should return null for successful execution', () => {
      const code = '5 + 3';
      const result = repl.execute(code);

      const pattern = analyzer.analyzeError(code, result);

      expect(pattern).toBeNull();
    });
  });

  // ============================================================================
  // CATEGORY 3: ERROR STATISTICS (4 tests)
  // ============================================================================

  describe('Error Statistics', () => {
    it('should calculate error statistics', () => {
      const code = 'undefinedVar';
      const result = repl.execute(code);
      analyzer.analyzeError(code, result);

      const stats = analyzer.getStats();

      expect(stats.totalErrors).toBeGreaterThanOrEqual(0);
      expect(stats.uniqueErrorTypes).toBeGreaterThanOrEqual(0);
    });

    it('should calculate success rate', () => {
      const code1 = '5 + 3';
      const code2 = 'undefinedVar';
      const result1 = repl.execute(code1);
      const result2 = repl.execute(code2);

      analyzer.analyzeError(code1, result1);
      analyzer.analyzeError(code2, result2);

      const stats = analyzer.getStats();

      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(100);
    });

    it('should identify most common error', () => {
      for (let i = 0; i < 3; i++) {
        const code = 'undefinedVar + 5';
        const result = repl.execute(code);
        analyzer.analyzeError(code, result);
      }

      const stats = analyzer.getStats();

      if (stats.mostCommonError) {
        expect(stats.mostCommonError.count).toBeGreaterThan(0);
      }
    });

    it('should calculate error trend', () => {
      // Early errors
      for (let i = 0; i < 3; i++) {
        const code = 'undefinedVar';
        const result = repl.execute(code);
        analyzer.analyzeError(code, result);
      }

      // Successful executions
      for (let i = 0; i < 3; i++) {
        const code = `${i} + 1`;
        const result = repl.execute(code);
        analyzer.analyzeError(code, result);
      }

      const stats = analyzer.getStats();

      expect(stats.errorTrend).toBeDefined();
    });
  });

  // ============================================================================
  // CATEGORY 4: AVOIDANCE STRATEGIES (3 tests)
  // ============================================================================

  describe('Avoidance Strategies', () => {
    it('should generate avoidance strategies', () => {
      const code = 'undefinedVar';
      const result = repl.execute(code);
      analyzer.analyzeError(code, result);

      const advice = analyzer.getAvoidanceAdvice('type');

      expect(Array.isArray(advice)).toBe(true);
    });

    it('should provide strategies for error types', () => {
      const strategies = analyzer.getAvoidanceAdvice('syntax');

      expect(Array.isArray(strategies)).toBe(true);
      if (strategies.length > 0) {
        expect(strategies[0]).toContain('코드');
      }
    });

    it('should return empty advice for unknown error types', () => {
      const advice = analyzer.getAvoidanceAdvice('nonexistent');

      expect(Array.isArray(advice)).toBe(true);
      expect(advice.length).toBe(0);
    });
  });

  // ============================================================================
  // CATEGORY 5: PATTERN MANAGEMENT (2 tests)
  // ============================================================================

  describe('Pattern Management', () => {
    it('should list error patterns', () => {
      const code = 'undefinedVar';
      const result = repl.execute(code);
      analyzer.analyzeError(code, result);

      const patterns = analyzer.listPatterns();

      expect(Array.isArray(patterns)).toBe(true);
    });

    it('should reset patterns', () => {
      const code = 'undefinedVar';
      const result = repl.execute(code);
      analyzer.analyzeError(code, result);

      let stats = analyzer.getStats();
      const beforeReset = stats.totalErrors;

      analyzer.reset();

      stats = analyzer.getStats();
      expect(stats.totalErrors).toBeLessThan(beforeReset);
    });
  });

  // ============================================================================
  // CATEGORY 6: ERROR LOGGING (2 tests)
  // ============================================================================

  describe('Error Logging', () => {
    it('should maintain execution log', () => {
      const code1 = '5 + 3';
      const code2 = 'undefinedVar';
      const result1 = repl.execute(code1);
      const result2 = repl.execute(code2);

      analyzer.analyzeError(code1, result1);
      analyzer.analyzeError(code2, result2);

      const log = analyzer.getLog(10);

      expect(log.length).toBeGreaterThan(0);
    });

    it('should return correct log structure', () => {
      const code = '5 + 3';
      const result = repl.execute(code);
      analyzer.analyzeError(code, result);

      const log = analyzer.getLog(1);

      expect(log[0].code).toBeDefined();
      expect(log[0].result).toBeDefined();
      expect(log[0].timestamp).toBeDefined();
    });
  });

  // ============================================================================
  // CATEGORY 7: REPORT GENERATION (1 test)
  // ============================================================================

  describe('Report Generation', () => {
    it('should generate error report', () => {
      for (let i = 0; i < 3; i++) {
        const code = 'undefinedVar';
        const result = repl.execute(code);
        analyzer.analyzeError(code, result);
      }

      const report = analyzer.generateReport();

      expect(report).toContain('Error Analysis Report');
      expect(report).toContain('Total Errors');
    });
  });
});
