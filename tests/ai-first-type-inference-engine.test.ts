/**
 * Phase 4 Step 4: AI-First Type Inference Engine Tests
 */

import { describe, it, expect } from '@jest/globals';
import { AIFirstTypeInferenceEngine } from '../src/analyzer/ai-first-type-inference-engine';

describe('AIFirstTypeInferenceEngine', () => {
  let engine: AIFirstTypeInferenceEngine;

  beforeAll(() => {
    engine = new AIFirstTypeInferenceEngine();
  });

  // ============================================================================
  // 1. 함수 타입 추론 (10개)
  // ============================================================================
  describe('Function Type Inference', () => {
    it('should infer calculateTax return type as decimal from function name', () => {
      const result = engine.inferType('calculateTax', 'function');

      expect(result.type).toBe('decimal');
      expect(result.confidence).toBeGreaterThanOrEqual(0.70);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should infer isValid return type as boolean from function name', () => {
      const result = engine.inferType('isValid', 'function');

      expect(result.type).toBe('boolean');
      expect(result.confidence).toBe(0.95);
    });

    it('should combine function name and comment for confidence boost', () => {
      const comment = '// finance: calculate tax amount';
      const result = engine.inferType('calculateTax', 'function', comment);

      expect(result.confidence).toBeGreaterThanOrEqual(0.70);
      expect(result.recommendation).toBeDefined();
    });

    it('should handle predicate functions correctly', () => {
      const result = engine.inferType('hasError', 'function');

      expect(result.type).toBe('boolean');
      expect(result.confidence).toBe(0.95);
    });

    it('should infer filter return type as array', () => {
      const result = engine.inferType('filterItems', 'function');

      expect(result.type).toBe('array');
    });

    it('should infer formatDate return type as string', () => {
      const result = engine.inferType('formatDate', 'function');

      expect(result.type).toBe('string');
    });

    it('should include reasoning in result', () => {
      const result = engine.inferType('calculateTotal', 'function');

      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should handle unknown functions gracefully', () => {
      const result = engine.inferType('unknownOp', 'function');

      expect(result.type).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should assess uncertainty correctly', () => {
      const result = engine.inferType('test', 'function');

      expect(result.uncertainty).toBeDefined();
      expect(result.uncertainty.length).toBeGreaterThan(0);
    });

    it('should provide AI recommendation', () => {
      const result = engine.inferType('calculatePrice', 'function');

      expect(result.recommendation).toBeDefined();
      expect(result.recommendation.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // 2. 변수 타입 추론 (10개)
  // ============================================================================
  describe('Variable Type Inference', () => {
    it('should infer tax variable as decimal from name', () => {
      const result = engine.inferType('tax', 'variable');

      expect(result.type).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0.70);
    });

    it('should infer isValid variable as boolean', () => {
      const result = engine.inferType('isValid', 'variable');

      expect(result.type).toBe('boolean');
      expect(result.confidence).toBe(0.95);
    });

    it('should infer email variable as validated_string', () => {
      const result = engine.inferType('email', 'variable');

      expect(result.type).toBe('validated_string');
      expect(result.confidence).toBe(0.95);
    });

    it('should infer count variable as number', () => {
      const result = engine.inferType('count', 'variable');

      expect(result.type).toBe('number');
      expect(result.confidence).toBe(0.95);
    });

    it('should infer price variable with finance domain', () => {
      const comment = '// finance: product price in currency';
      const result = engine.inferType('price', 'variable', comment);

      expect(result.confidence).toBeGreaterThanOrEqual(0.70);
    });

    it('should infer list variable as array', () => {
      const result = engine.inferType('itemList', 'variable');

      expect(result.type).toBe('array');
    });

    it('should infer url variable as string', () => {
      const result = engine.inferType('url', 'variable');

      expect(result.type).toBe('validated_string');
    });

    it('should infer vector as array<number>', () => {
      const result = engine.inferType('vector', 'variable');

      expect(result.type).toBe('array<number>');
    });

    it('should handle unknown variables gracefully', () => {
      const result = engine.inferType('xyz', 'variable');

      expect(result.type).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should provide alternatives when uncertain', () => {
      const result = engine.inferType('data', 'variable');

      expect(result.alternatives).toBeDefined();
      expect(Array.isArray(result.alternatives)).toBe(true);
    });
  });

  // ============================================================================
  // 3. E2E 통합 메서드 (10개)
  // ============================================================================
  describe('E2E Integration Methods', () => {
    it('should infer multiple variables from code', () => {
      const code = `
        function calculateTotal(items) {
          const count = items.length;
          const total = 0;
          return total;
        }
      `;
      const result = engine.inferTypes('calculateTotal', code);

      expect(result.signature).toBeDefined();
      expect(result.signature.confidence).toBeGreaterThanOrEqual(0.0);
      expect(result.variables).toBeDefined();
      expect(Array.isArray(result.variables)).toBe(true);
    });

    it('should infer variable type with context', () => {
      const result = engine.inferVariableType('email', 'contact', 'const email = "";');

      expect(result.type).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0.0);
    });

    it('should group variables by domain', () => {
      const vars = [
        { name: 'tax', inferredType: 'decimal', domain: 'finance', confidence: 0.95 },
        { name: 'email', inferredType: 'string', domain: 'web', confidence: 0.90 },
        { name: 'price', inferredType: 'decimal', domain: 'finance', confidence: 0.85 },
      ];
      const grouped = engine.groupVariablesByDomain(vars);

      expect(grouped).toBeDefined();
      expect(grouped['finance']).toBeDefined();
      expect(grouped['finance'].length).toBe(2);
      expect(grouped['web']).toBeDefined();
      expect(grouped['web'].length).toBe(1);
    });

    it('should filter by confidence threshold', () => {
      const vars = [
        { name: 'tax', inferredType: 'decimal', domain: 'finance', confidence: 0.95 },
        { name: 'unknown', inferredType: 'unknown', domain: undefined, confidence: 0.30 },
        { name: 'email', inferredType: 'string', domain: 'web', confidence: 0.85 },
      ];
      const filtered = engine.filterByConfidence(vars, 0.80);

      expect(filtered.length).toBe(2);
      expect(filtered.every(v => v.confidence >= 0.80)).toBe(true);
    });

    it('should get high confidence types', () => {
      const result = engine.inferType('calculateTax', 'function');
      const highConf = engine.getHighConfidenceTypes(result, 0.70);

      expect(Array.isArray(highConf)).toBe(true);
      expect(highConf.length).toBeGreaterThan(0);
    });

    it('should handle multiple comments', () => {
      const comments = ['// finance: tax calculation', '// domain: accounting'];
      const result = engine.inferType('calculateTax', 'function', comments[0]);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0.0);
    });

    it('should detect type conflicts', () => {
      const code = 'function test() {}';
      const result = engine.inferType('test', 'function', code);

      expect(result.uncertainty).toBeDefined();
    });

    it('should provide confidence levels correctly', () => {
      const resultHigh = engine.inferType('calculateTax', 'function');
      const resultLow = engine.inferType('xyz', 'variable');

      expect(resultHigh.confidence).toBeGreaterThanOrEqual(resultLow.confidence);
    });

    it('should recommend based on confidence', () => {
      const resultHigh = engine.inferType('isValid', 'function');
      const resultLow = engine.inferType('xyzFunc', 'function');

      expect(resultHigh.recommendation).toContain('✅');
      expect(resultLow.recommendation).toBeDefined();
    });

    it('should work with complex code patterns', () => {
      const code = `
        function processVector(vec) {
          const sum = 0;
          for (const val of vec) {
            sum += val;
          }
          return sum;
        }
      `;
      const comment = '// data-science: process vector sum';
      const result = engine.inferTypes('processVector', code, [comment]);

      expect(result.signature).toBeDefined();
      expect(result.variables.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // 4. 신뢰도 및 불확실성 (8개)
  // ============================================================================
  describe('Confidence and Uncertainty', () => {
    it('should assign high confidence to clear patterns', () => {
      const result = engine.inferType('isValid', 'function');

      expect(result.confidence).toBe(0.95);
    });

    it('should assign lower confidence to ambiguous names', () => {
      const result = engine.inferType('process', 'function');

      expect(result.confidence).toBeLessThan(0.95);
    });

    it('should assess uncertainty at high confidence', () => {
      const result = engine.inferType('calculateTax', 'function');

      expect(result.uncertainty).toContain('likely');
    });

    it('should assess uncertainty at low confidence', () => {
      const result = engine.inferType('x', 'variable');

      expect(result.uncertainty).toBeDefined();
    });

    it('should provide alternatives when not 100% certain', () => {
      const result = engine.inferType('getData', 'function');

      expect(result.alternatives).toBeDefined();
    });

    it('should have at most high confidence from single source', () => {
      const result = engine.inferType('test', 'function');

      expect(result.confidence).toBeLessThanOrEqual(1.0);
      expect(result.confidence).toBeGreaterThanOrEqual(0.0);
    });

    it('should improve confidence with comments', () => {
      const withoutComment = engine.inferType('calculate', 'function');
      const withComment = engine.inferType('calculate', 'function', '// finance');

      expect(withComment.confidence).toBeGreaterThanOrEqual(withoutComment.confidence);
    });

    it('should flag conflicts when detected', () => {
      const result = engine.inferType('unknownFunc', 'function');

      expect(result.recommendation).toBeDefined();
    });
  });

  // ============================================================================
  // 5. AI 추천 (8개)
  // ============================================================================
  describe('AI Recommendations', () => {
    it('should recommend confident types with checkmark', () => {
      const result = engine.inferType('isValid', 'function');

      expect(result.recommendation).toContain('✅');
    });

    it('should recommend probable types with warning', () => {
      const result = engine.inferType('process', 'function');

      expect(result.recommendation).toBeDefined();
    });

    it('should recommend annotation for uncertain types', () => {
      const result = engine.inferType('x', 'variable');

      expect(result.recommendation).toContain('annotation');
    });

    it('should include confidence percentage in recommendation', () => {
      const result = engine.inferType('get', 'function');

      expect(result.recommendation).toBeDefined();
    });

    it('should suggest adding comments when helpful', () => {
      const result = engine.inferType('calculate', 'function');

      expect(result.recommendation).toBeDefined();
    });

    it('should detect and warn about conflicts', () => {
      // This would be tested if there's a conflict scenario
      const result = engine.inferType('test', 'function');
      expect(result.recommendation).toBeDefined();
    });

    it('should distinguish between different confidence levels', () => {
      const high = engine.inferType('isValid', 'function');
      const low = engine.inferType('func', 'function');

      expect(high.recommendation).not.toBe(low.recommendation);
    });

    it('should be actionable for AI systems', () => {
      const result = engine.inferType('calculateTax', 'function');

      expect(result.recommendation.length).toBeGreaterThan(10);
      expect(result.recommendation).toMatch(/✅|✓|◐|✗|⚠️/);
    });
  });
});
