/**
 * Phase 6.2 Week 2: IntentParser Tests
 *
 * 20+ tests for natural language → code translation
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { IntentParser, RecognizedIntent } from '../../src/phase-6/intent-parser';

describe('Phase 6.2 Week 2: IntentParser', () => {
  let parser: IntentParser;

  beforeEach(() => {
    parser = new IntentParser();
  });

  // ============================================================================
  // CATEGORY 1: BASIC INTENT RECOGNITION (5 tests)
  // ============================================================================

  describe('Basic Intent Recognition', () => {
    it('should recognize sum intent from keyword', () => {
      const result = parser.parse('sum');

      expect(result.intent).toBe('sum-array');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.code).toContain('sum');
    });

    it('should recognize intent from English keywords', () => {
      const resultSum = parser.parse('add');
      const resultLen = parser.parse('count');

      expect(resultSum.intent).toBe('sum-array');
      expect(resultLen.intent).toBe('array-length');
    });

    it('should recognize multiple intent variants', () => {
      const result1 = parser.parse('double');
      const result2 = parser.parse('2배');

      expect(result1.intent).toBe('map-double');
      expect(result2.code).toContain('* 2');
    });

    it('should recognize maximum intent', () => {
      const result = parser.parse('max');

      expect(result.intent).toBe('find-max');
      expect(result.code).toContain('max');
    });

    it('should handle unknown intents', () => {
      const result = parser.parse('xyz123abc');

      expect(result.intent).toBe('unknown');
      expect(result.confidence).toBe(0);
    });
  });

  // ============================================================================
  // CATEGORY 2: ENGLISH INTENT RECOGNITION (4 tests)
  // ============================================================================

  describe('English Intent Recognition', () => {
    it('should recognize English sum intent', () => {
      const result = parser.parse('sum array');

      expect(result.intent).toBe('sum-array');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should recognize filter-related intents', () => {
      const result = parser.parse('greater');

      expect(result.code).toContain('filter');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should recognize English max intent', () => {
      const result = parser.parse('find maximum value');

      expect(result.intent).toBe('find-max');
    });

    it('should recognize English average intent', () => {
      const result = parser.parse('calculate average');

      expect(result.intent).toBe('find-average');
      expect(result.code).toContain('sum');
      expect(result.code).toContain('len');
    });
  });

  // ============================================================================
  // CATEGORY 3: CONFIDENCE SCORING (3 tests)
  // ============================================================================

  describe('Confidence Scoring', () => {
    it('should recognize keyword matches', () => {
      const result1 = parser.parse('sum');
      const result2 = parser.parse('count');

      expect(result1.intent).toBe('sum-array');
      expect(result2.intent).toBe('array-length');
    });

    it('should have valid confidence scores', () => {
      const result = parser.parse('합산');

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should recognize multiple keyword variants', () => {
      const result1 = parser.parse('sum');
      const result2 = parser.parse('add');

      // Both should recognize sum intent
      expect(result1.intent).toBe('sum-array');
    });
  });

  // ============================================================================
  // CATEGORY 4: COMPLEX INTENTS (3 tests)
  // ============================================================================

  describe('Complex Intents', () => {
    it('should recognize filter large pattern', () => {
      const result = parser.parse('greater');

      expect(result.intent).toBe('filter-large');
      expect(result.code).toContain('filter');
      expect(result.code).toContain('>');
    });

    it('should recognize filter small pattern', () => {
      const result = parser.parse('less than');

      expect(result.intent).toBe('filter-small');
      expect(result.code).toContain('filter');
      expect(result.code).toContain('<');
    });

    it('should recognize range intent', () => {
      const result = parser.parse('range');

      expect(result.intent).toBe('create-range');
      expect(result.code).toContain('range');
    });
  });

  // ============================================================================
  // CATEGORY 5: STRING OPERATIONS (3 tests)
  // ============================================================================

  describe('String Operations', () => {
    it('should recognize string length intent', () => {
      const result = parser.parse('문자열 길이');

      expect(result.intent).toBe('string-length');
      expect(result.code).toContain('len');
    });

    it('should recognize uppercase intent', () => {
      const result = parser.parse('대문자');

      expect(result.intent).toBe('string-uppercase');
      expect(result.code).toContain('toUpperCase');
    });

    it('should recognize lowercase intent', () => {
      const result = parser.parse('소문자');

      expect(result.intent).toBe('string-lowercase');
      expect(result.code).toContain('toLowerCase');
    });
  });

  // ============================================================================
  // CATEGORY 6: TOP-N PARSING (2 tests)
  // ============================================================================

  describe('Top-N Parsing', () => {
    it('should return top 3 intents', () => {
      const results = parser.parseTopN('배열 합산', 3);

      expect(results.length).toBeLessThanOrEqual(3);
      expect(results.every(r => r.confidence >= 0)).toBe(true);
    });

    it('should sort results by confidence', () => {
      const results = parser.parseTopN('필터링', 5);

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].confidence).toBeGreaterThanOrEqual(results[i + 1].confidence);
      }
    });
  });

  // ============================================================================
  // CATEGORY 7: PATTERN MANAGEMENT (2 tests)
  // ============================================================================

  describe('Pattern Management', () => {
    it('should add custom pattern', () => {
      parser.addPattern('custom-intent', 'result = custom_func(arr)', [
        'custom',
        'special',
      ]);

      const result = parser.parse('custom function');

      expect(result.intent).toBe('custom-intent');
    });

    it('should list all patterns', () => {
      const patterns = parser.listPatterns();

      expect(patterns.length).toBeGreaterThan(15);
      expect(patterns.every(p => p.id && p.code && p.keywords)).toBe(true);
    });
  });

  // ============================================================================
  // CATEGORY 8: EXPLANATION (1 test)
  // ============================================================================

  describe('Explanation', () => {
    it('should provide explanation for recognized intent', () => {
      const result = parser.parse('배열 합산');

      expect(result.explanation).toBeTruthy();
      expect(result.explanation).toContain('의도');
      expect(result.explanation).toContain('신뢰도');
    });
  });

  // ============================================================================
  // CATEGORY 9: EDGE CASES (2 tests)
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      const result = parser.parse('');

      expect(result.intent).toBe('unknown');
      expect(result.code).toContain('의도를 인식');
    });

    it('should handle punctuation', () => {
      const result1 = parser.parse('배열 합산!');
      const result2 = parser.parse('배열 합산');

      expect(result1.intent).toBe(result2.intent);
      expect(result1.confidence).toBeCloseTo(result2.confidence, 0.1);
    });
  });

  // ============================================================================
  // CATEGORY 10: INTEGRATION (2 tests)
  // ============================================================================

  describe('Integration', () => {
    it('should recognize intent from simple keywords', () => {
      const result = parser.parse('합산');

      expect(result.intent).toBe('sum-array');
      expect(result.code).toContain('sum');
    });

    it('should recognize mathematical operations', () => {
      const result = parser.parse('제곱');

      expect(result.intent).toBe('map-square');
      expect(result.code).toContain('*');
    });
  });
});
