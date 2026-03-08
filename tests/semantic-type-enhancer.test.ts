/**
 * Phase 3 Stage 3 - SemanticTypeEnhancer Tests (30 tests)
 */

import { SemanticTypeEnhancer } from '../src/analyzer/semantic-type-enhancer';

describe('SemanticTypeEnhancer', () => {
  let enhancer: SemanticTypeEnhancer;

  beforeAll(() => {
    enhancer = new SemanticTypeEnhancer();
  });

  // ============================================================================
  // 1. 도메인 추론 테스트 (10개)
  // ============================================================================
  describe('Domain Inference', () => {
    test('should infer finance domain from function name', () => {
      const result = enhancer.inferDomain('calculateTax', ['price'], []);

      expect(result).not.toBeNull();
      expect(result?.domain).toBe('finance');
      expect(result?.confidence).toBeGreaterThan(0.5);
    });

    test('should infer finance domain from variable names', () => {
      const result = enhancer.inferDomain('compute', ['tax', 'amount'], []);

      expect(result?.domain).toBe('finance');
    });

    test('should infer data-science domain from vector', () => {
      const result = enhancer.inferDomain('filter', ['vector'], []);

      expect(result?.domain).toBe('data-science');
    });

    test('should infer web domain from email', () => {
      const result = enhancer.inferDomain('validate', ['email'], []);

      expect(result?.domain).toBe('web');
    });

    test('should infer crypto domain from hash', () => {
      const result = enhancer.inferDomain('generate', ['hash'], []);

      expect(result?.domain).toBe('crypto');
    });

    test('should infer iot domain from sensor', () => {
      const result = enhancer.inferDomain('read', ['sensor'], []);

      expect(result?.domain).toBe('iot');
    });

    test('should return null for unknown domain', () => {
      const result = enhancer.inferDomain('xyz', ['abc'], []);

      expect(result).toBeNull();
    });

    test('should handle multiple variable names', () => {
      const result = enhancer.inferDomain(
        'calculate',
        ['tax', 'price', 'amount'],
        []
      );

      expect(result?.domain).toBe('finance');
      expect(result?.confidence).toBeGreaterThanOrEqual(0.6);
    });

    test('should extract evidence for domain inference', () => {
      const result = enhancer.inferDomain('calculateTax', ['tax'], []);

      expect(result?.evidence).toBeDefined();
      expect(result?.evidence.length).toBeGreaterThan(0);
    });

    test('should handle case-insensitive matching', () => {
      const result1 = enhancer.inferDomain('CalculateTax', ['Price'], []);
      const result2 = enhancer.inferDomain('calculatetax', ['price'], []);

      expect(result1?.domain).toBe(result2?.domain);
    });
  });

  // ============================================================================
  // 2. 타입 강화 테스트 (10개)
  // ============================================================================
  describe('Type Enhancement', () => {
    test('should enhance number to decimal in finance domain', () => {
      const result = enhancer.enhanceType('number', 'finance');

      expect(result.enhancedType).toBe('decimal');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test('should enhance string to validated_string in web domain', () => {
      const result = enhancer.enhanceType('string', 'web');

      expect(result.enhancedType).toBe('validated_string');
    });

    test('should enhance number to integer in web domain', () => {
      const result = enhancer.enhanceType('number', 'web');

      expect(result.enhancedType).toBe('integer');
    });

    test('should enhance string to hash_string in crypto domain', () => {
      const result = enhancer.enhanceType('string', 'crypto');

      expect(result.enhancedType).toBe('hash_string');
    });

    test('should keep number unchanged in data-science domain', () => {
      const result = enhancer.enhanceType('number', 'data-science');

      expect(result.enhancedType).toBe('number');
    });

    test('should enhance with variable name hint', () => {
      const result = enhancer.enhanceType('number', 'finance', 'tax');

      expect(result.enhancedType).toBe('decimal');
      expect(result.confidence).toBe(0.95);  // Higher due to variable name match
    });

    test('should return original type if no rule exists', () => {
      const result = enhancer.enhanceType('unknown_type', 'finance');

      expect(result.enhancedType).toBe('unknown_type');
    });

    test('should include reasoning in enhancement', () => {
      const result = enhancer.enhanceType('number', 'finance');

      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    test('should enhance array types', () => {
      const result = enhancer.enhanceType('array<number>', 'finance');

      expect(result.enhancedType).toBe('array<decimal>');
    });

    test('should handle domain-specific array enhancements', () => {
      const dataScience = enhancer.enhanceType('array<number>', 'data-science');
      const finance = enhancer.enhanceType('array<number>', 'finance');

      expect(dataScience.enhancedType).toBe('array<number>');
      expect(finance.enhancedType).toBe('array<decimal>');
    });
  });

  // ============================================================================
  // 3. 도메인별 타입 매핑 테스트 (5개)
  // ============================================================================
  describe('Domain Type Mapping', () => {
    test('should map tax variable to decimal in finance', () => {
      const type = enhancer.mapDomainType('tax', 'finance');

      expect(type).toBe('decimal');
    });

    test('should map vector to array<number> in data-science', () => {
      const type = enhancer.mapDomainType('vector', 'data-science');

      expect(type).toBe('array<number>');
    });

    test('should map email to validated_string in web', () => {
      const type = enhancer.mapDomainType('email', 'web');

      expect(type).toBe('validated_string');
    });

    test('should return null for unmapped variable', () => {
      const type = enhancer.mapDomainType('unknown', 'finance');

      expect(type).toBeNull();
    });

    test('should handle partial name matching', () => {
      const type = enhancer.mapDomainType('total_price', 'finance');

      expect(type).toBe('currency');
    });
  });

  // ============================================================================
  // 4. 엄격성 강화 테스트 (3개)
  // ============================================================================
  describe('Strictness Level', () => {
    test('should get strict validation rules for finance decimal', () => {
      const result = enhancer.getStrictType('number', 'finance');

      expect(result.strictType).toBe('decimal');
      expect(result.validationRules).toBeDefined();
      expect(result.validationRules.length).toBeGreaterThan(0);
    });

    test('should get validation rules for web validated_string', () => {
      const result = enhancer.getStrictType('string', 'web');

      expect(result.strictType).toBe('validated_string');
      expect(result.rationale).toBeDefined();
      expect(result.rationale.length).toBeGreaterThan(0);
    });

    test('should include rationale in strict type', () => {
      const result = enhancer.getStrictType('string', 'crypto');

      expect(result.rationale).toBeDefined();
      expect(result.rationale.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // 5. 통합 타입 추론 테스트 (2개)
  // ============================================================================
  describe('Integrated Type Inference', () => {
    test('should infer complete type with context', () => {
      const result = enhancer.inferTypeWithContext(
        'number',
        'calculateTax',
        'tax',
        ['arithmetic']
      );

      expect(result).not.toBeNull();
      expect(result?.domain).toBe('finance');
      expect(result?.finalType).toBe('decimal');
      expect(result?.confidence).toBeGreaterThan(0.7);
    });

    test('should return null for unknown context', () => {
      const result = enhancer.inferTypeWithContext(
        'number',
        'xyz',
        'abc',
        []
      );

      expect(result).toBeNull();
    });
  });
});
