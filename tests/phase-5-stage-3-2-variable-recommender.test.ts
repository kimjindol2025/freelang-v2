/**
 * Phase 5 Stage 3.2: Variable Type Recommender Tests
 *
 * Tests for deciding whether variable type annotations can be omitted
 * based on inference confidence and other factors.
 */

import {
  VariableTypeRecommender,
  VariableTypeInfo,
  variableTypeRecommender
} from '../src/analyzer/variable-type-recommender';

describe('Phase 5 Stage 3.2: Variable Type Recommender', () => {
  const recommender = new VariableTypeRecommender();

  /**
   * Test Group 1: High Confidence (≥0.80)
   * Should recommend omitting type entirely
   */
  describe('High Confidence (≥0.80): Safe to omit without comment', () => {
    test('literal number assignment (0.95 confidence)', () => {
      const info: VariableTypeInfo = {
        name: 'total',
        inferredType: 'number',
        confidence: 0.95,
        source: 'assignment',
        reasoning: ['Assignment: Literal value of type number']
      };

      const rec = recommender.recommend(info);
      expect(rec.shouldOmitType).toBe(true);
      expect(rec.shouldShowComment).toBe(false);
      expect(rec.riskLevel).toBe('safe');
    });

    test('literal string assignment (0.95 confidence)', () => {
      const info: VariableTypeInfo = {
        name: 'msg',
        inferredType: 'string',
        confidence: 0.95,
        source: 'assignment',
        reasoning: ['Assignment: Literal value of type string']
      };

      const rec = recommender.recommend(info);
      expect(rec.shouldOmitType).toBe(true);
      expect(rec.shouldShowComment).toBe(false);
    });

    test('literal array assignment (0.85 confidence)', () => {
      const info: VariableTypeInfo = {
        name: 'items',
        inferredType: 'array<unknown>',
        confidence: 0.85,
        source: 'assignment',
        reasoning: ['Assignment: Array literal']
      };

      const rec = recommender.recommend(info);
      expect(rec.shouldOmitType).toBe(true);
      expect(rec.shouldShowComment).toBe(false);
    });

    test('method detection (0.80 confidence - edge of safe)', () => {
      const info: VariableTypeInfo = {
        name: 'arr',
        inferredType: 'array<unknown>',
        confidence: 0.80,
        source: 'method',
        reasoning: ['Method: push() → array type']
      };

      const rec = recommender.recommend(info);
      expect(rec.shouldOmitType).toBe(true);
      expect(rec.shouldShowComment).toBe(false);
    });
  });

  /**
   * Test Group 2: Moderate Confidence (0.70-0.79)
   * Can omit type but should show comment
   */
  describe('Moderate Confidence (0.70-0.79): Omit with confidence comment', () => {
    test('operation-based inference (0.75 confidence)', () => {
      const info: VariableTypeInfo = {
        name: 'result',
        inferredType: 'number',
        confidence: 0.75,
        source: 'operation',
        reasoning: ['Operation: x + y → numeric operands']
      };

      const rec = recommender.recommend(info);
      expect(rec.shouldOmitType).toBe(true);
      expect(rec.shouldShowComment).toBe(true);
      expect(rec.riskLevel).toBe('medium');
      expect(rec.comment).toContain('75%');
    });

    test('transitive inference (0.70 confidence - edge)', () => {
      const info: VariableTypeInfo = {
        name: 'y',
        inferredType: 'number',
        confidence: 0.70,
        source: 'transitive',
        reasoning: ['Transitive: Derived from x (number)']
      };

      const rec = recommender.recommend(info);
      expect(rec.shouldOmitType).toBe(true);
      expect(rec.shouldShowComment).toBe(true);
      expect(rec.riskLevel).toBe('medium');
    });

    test('control flow (conditional branch, same type)', () => {
      const info: VariableTypeInfo = {
        name: 'value',
        inferredType: 'number',
        confidence: 0.75,
        source: 'control_flow',
        reasoning: ['Control flow: Same type in both if/else branches']
      };

      const rec = recommender.recommend(info);
      expect(rec.shouldOmitType).toBe(true);
      expect(rec.shouldShowComment).toBe(true);
    });
  });

  /**
   * Test Group 3: Lower Confidence (0.60-0.69)
   * Should recommend explicit type but show comment
   */
  describe('Lower Confidence (0.60-0.69): Recommend explicit type', () => {
    test('function call result (0.65 confidence)', () => {
      const info: VariableTypeInfo = {
        name: 'result',
        inferredType: 'unknown',
        confidence: 0.65,
        source: 'function_call',
        reasoning: ['Function: Unknown return type']
      };

      const rec = recommender.recommend(info);
      expect(rec.shouldOmitType).toBe(false);
      expect(rec.shouldShowComment).toBe(true);
      expect(rec.riskLevel).toBe('medium');
      expect(rec.comment).toContain('65%');
    });

    test('conditional with mixed types (0.60 confidence)', () => {
      const info: VariableTypeInfo = {
        name: 'mixed',
        inferredType: 'unknown',
        confidence: 0.60,
        source: 'control_flow',
        reasoning: ['Control flow: Different types in if/else branches (union)']
      };

      const rec = recommender.recommend(info);
      expect(rec.shouldOmitType).toBe(false);
      expect(rec.shouldShowComment).toBe(true);
      expect(rec.riskLevel).toBe('medium');
    });
  });

  /**
   * Test Group 4: Very Low Confidence (<0.60)
   * Require explicit type annotation
   */
  describe('Very Low Confidence (<0.60): Require explicit type', () => {
    test('unknown type (0.40 confidence)', () => {
      const info: VariableTypeInfo = {
        name: 'unknown_var',
        inferredType: 'unknown',
        confidence: 0.40,
        source: 'function_call',
        reasoning: ['Unknown pattern']
      };

      const rec = recommender.recommend(info);
      expect(rec.shouldOmitType).toBe(false);
      expect(rec.shouldShowComment).toBe(true);
      expect(rec.riskLevel).toBe('risky');
    });

    test('completely uncertain (0.0 confidence)', () => {
      const info: VariableTypeInfo = {
        name: 'uncertain',
        inferredType: 'unknown',
        confidence: 0.0,
        source: 'unknown',
        reasoning: ['No inference possible']
      };

      const rec = recommender.recommend(info);
      expect(rec.shouldOmitType).toBe(false);
      expect(rec.shouldShowComment).toBe(true);
      expect(rec.riskLevel).toBe('risky');
    });
  });

  /**
   * Test Group 5: Comment Generation
   */
  describe('Comment Generation: Format and content', () => {
    test('high confidence: no comment generated', () => {
      const info: VariableTypeInfo = {
        name: 'x',
        inferredType: 'number',
        confidence: 0.95,
        source: 'assignment',
        reasoning: ['Assignment: Literal 5']
      };

      const rec = recommender.recommend(info);
      expect(rec.comment).toBe('');
    });

    test('moderate confidence: includes confidence percentage', () => {
      const info: VariableTypeInfo = {
        name: 'result',
        inferredType: 'number',
        confidence: 0.75,
        source: 'operation',
        reasoning: ['Operation: x + y']
      };

      const rec = recommender.recommend(info);
      expect(rec.comment).toContain('75%');
      expect(rec.comment).toContain('number');
      expect(rec.comment).toContain('operation');
    });

    test('comment includes first reasoning line', () => {
      const info: VariableTypeInfo = {
        name: 'total',
        inferredType: 'number',
        confidence: 0.75,
        source: 'operation',
        reasoning: [
          'Operation: arithmetic addition',
          'Involves numeric types',
          'Result must be numeric'
        ]
      };

      const rec = recommender.recommend(info);
      expect(rec.comment).toContain('Operation: arithmetic addition');
      expect(rec.comment).toContain('2 more');  // Shows count of remaining reasons
    });

    test('comment with single reasoning line', () => {
      const info: VariableTypeInfo = {
        name: 'msg',
        inferredType: 'string',
        confidence: 0.75,
        source: 'assignment',
        reasoning: ['Literal string assignment']
      };

      const rec = recommender.recommend(info);
      expect(rec.comment).toContain('Literal string assignment');
      expect(rec.comment).not.toContain('more');  // No "more" indicator
    });
  });

  /**
   * Test Group 6: Loop Variable Special Handling
   */
  describe('Loop Variables: Special treatment', () => {
    test('recognizes loop variable by reasoning', () => {
      const info: VariableTypeInfo = {
        name: 'item',
        inferredType: 'number',
        confidence: 0.65,
        source: 'control_flow',
        reasoning: ['Loop iteration variable']
      };

      const isLoop = recommender.isLoopVariable(info.name, info.reasoning);
      expect(isLoop).toBe(true);

      // Boost confidence for loop variable
      const boosted = recommender.adjustConfidenceForLoopVariable(info.confidence, isLoop);
      expect(boosted).toBeGreaterThan(info.confidence);
      expect(boosted).toBeLessThanOrEqual(1.0);
    });

    test('recognizes common loop variable names', () => {
      const names = ['i', 'j', 'k', 'item', 'element'];
      names.forEach(name => {
        const isLoop = recommender.isLoopVariable(name, []);
        expect(isLoop).toBe(true);
      });
    });

    test('non-loop variables not boosted', () => {
      const info: VariableTypeInfo = {
        name: 'total',
        inferredType: 'number',
        confidence: 0.65,
        source: 'assignment',
        reasoning: ['Assignment: literal 0']
      };

      const isLoop = recommender.isLoopVariable(info.name, info.reasoning);
      expect(isLoop).toBe(false);

      const boosted = recommender.adjustConfidenceForLoopVariable(info.confidence, isLoop);
      expect(boosted).toBe(info.confidence);  // No change
    });
  });

  /**
   * Test Group 7: Obvious Type Detection
   */
  describe('Obvious Types: Types that need no comment', () => {
    test('obvious number literal', () => {
      expect(recommender.isObviousType('number', '42')).toBe(true);
      expect(recommender.isObviousType('number', '-5')).toBe(true);
      expect(recommender.isObviousType('number', '3.14')).toBe(true);
    });

    test('obvious string literal', () => {
      expect(recommender.isObviousType('string', '"hello"')).toBe(true);
      expect(recommender.isObviousType('string', "'world'")).toBe(true);
    });

    test('obvious boolean literal', () => {
      expect(recommender.isObviousType('boolean', 'true')).toBe(true);
      expect(recommender.isObviousType('boolean', 'false')).toBe(true);
    });

    test('obvious array literal', () => {
      expect(recommender.isObviousType('array', '[]')).toBe(true);
      expect(recommender.isObviousType('array', '[1, 2, 3]')).toBe(true);
    });

    test('non-obvious types', () => {
      expect(recommender.isObviousType('number', 'x')).toBe(false);
      expect(recommender.isObviousType('string', 'func()')).toBe(false);
      expect(recommender.isObviousType('array', 'arr')).toBe(false);
    });
  });

  /**
   * Test Group 8: Summary Generation
   */
  describe('Summary: Aggregate recommendations', () => {
    test('summary counts omit and require correctly', () => {
      const infos: VariableTypeInfo[] = [
        { name: 'x', inferredType: 'number', confidence: 0.95, source: 'assignment', reasoning: [] },
        { name: 'y', inferredType: 'string', confidence: 0.80, source: 'assignment', reasoning: [] },
        { name: 'z', inferredType: 'unknown', confidence: 0.50, source: 'unknown', reasoning: [] }
      ];

      const summary = recommender.summarizeRecommendations(infos);
      expect(summary.omitCount).toBe(2);  // x, y
      expect(summary.requireCount).toBe(1);  // z
      expect(summary.totalConfidence).toBeCloseTo(0.75, 1);
    });

    test('summary counts risk levels', () => {
      const infos: VariableTypeInfo[] = [
        { name: 'a', inferredType: 'number', confidence: 0.90, source: 'assignment', reasoning: [] },
        { name: 'b', inferredType: 'number', confidence: 0.75, source: 'operation', reasoning: [] },
        { name: 'c', inferredType: 'unknown', confidence: 0.40, source: 'unknown', reasoning: [] }
      ];

      const summary = recommender.summarizeRecommendations(infos);
      expect(summary.riskLevels.safe).toBe(1);    // a: 0.90
      expect(summary.riskLevels.medium).toBe(1);  // b: 0.75
      expect(summary.riskLevels.risky).toBe(1);   // c: 0.40
    });
  });

  /**
   * Test Group 9: Explanation Generation
   */
  describe('Explanation: User-friendly output', () => {
    test('explains recommendation clearly', () => {
      const info: VariableTypeInfo = {
        name: 'total',
        inferredType: 'number',
        confidence: 0.85,
        source: 'assignment',
        reasoning: ['Literal assignment', 'Clear type']
      };

      const rec = recommender.recommend(info);
      const explanation = recommender.explainRecommendation(info, rec);

      expect(explanation).toContain('total');
      expect(explanation).toContain('number');
      expect(explanation).toContain('85%');
      expect(explanation).toContain('assignment');
      expect(explanation).toContain('Can omit type');
    });

    test('explanation includes all reasoning lines', () => {
      const info: VariableTypeInfo = {
        name: 'result',
        inferredType: 'number',
        confidence: 0.75,
        source: 'operation',
        reasoning: [
          'Operation: arithmetic',
          'Both operands numeric',
          'Result is numeric'
        ]
      };

      const rec = recommender.recommend(info);
      const explanation = recommender.explainRecommendation(info, rec);

      expect(explanation).toContain('Operation: arithmetic');
      expect(explanation).toContain('Both operands numeric');
      expect(explanation).toContain('Result is numeric');
    });
  });

  /**
   * Test Group 10: Tuning/Configuration
   */
  describe('Tuning: Adjustable thresholds', () => {
    test('can adjust safe threshold to require higher confidence', () => {
      // Create strict recommender with higher safeThreshold
      // This means confidence must be >= 0.95 to skip comment entirely
      const strict = recommender.withThresholds({
        safeThreshold: 0.95,
        omitThreshold: 0.85
      });

      const info: VariableTypeInfo = {
        name: 'x',
        inferredType: 'number',
        confidence: 0.85,  // Below 0.95 safe threshold
        source: 'assignment',
        reasoning: []
      };

      const rec = strict.recommend(info);
      // With safeThreshold 0.95, 0.85 is not "safe"
      // But it's >= omitThreshold 0.85, so should omit with comment
      expect(rec.shouldOmitType).toBe(true);
      expect(rec.shouldShowComment).toBe(true);  // Shows comment because not "safe"
    });

    test('can adjust safe threshold to be more lenient', () => {
      const lenient = recommender.withThresholds({ safeThreshold: 0.70 });

      const info: VariableTypeInfo = {
        name: 'x',
        inferredType: 'number',
        confidence: 0.75,
        source: 'assignment',
        reasoning: []
      };

      const rec = lenient.recommend(info);
      // With safeThreshold 0.70, 0.75 is "safe"
      expect(rec.shouldOmitType).toBe(true);
      expect(rec.shouldShowComment).toBe(false);  // Now considered "safe", no comment
    });

    test('can adjust omit threshold to be stricter', () => {
      const strict = recommender.withThresholds({ omitThreshold: 0.90 });

      const info: VariableTypeInfo = {
        name: 'x',
        inferredType: 'number',
        confidence: 0.75,  // Between 0.70 and 0.90
        source: 'operation',
        reasoning: []
      };

      const rec = strict.recommend(info);
      // With omitThreshold 0.90, can't omit at 0.75
      expect(rec.shouldOmitType).toBe(false);
    });
  });

  /**
   * Test Group 11: Singleton Instance
   */
  describe('Singleton: Global instance', () => {
    test('singleton instance works', () => {
      const info: VariableTypeInfo = {
        name: 'x',
        inferredType: 'number',
        confidence: 0.95,
        source: 'assignment',
        reasoning: []
      };

      const rec = variableTypeRecommender.recommend(info);
      expect(rec.shouldOmitType).toBe(true);
    });
  });
});
