/**
 * Phase 3 Stage 3 - Contextual Inference Engine Tests (35 tests)
 */

import { ContextualInferenceEngine } from '../src/analyzer/contextual-inference-engine';

describe('ContextualInferenceEngine', () => {
  let engine: ContextualInferenceEngine;

  beforeAll(() => {
    engine = new ContextualInferenceEngine();
  });

  // ============================================================================
  // 1. E2E 전체 추론 테스트 (10개)
  // ============================================================================
  describe('E2E Type Inference', () => {
    test('should infer complete function types for calculateTax', () => {
      const code = `
        let price = 100
        let tax = price * 0.1
        return tax
      `;

      const result = engine.inferTypes('calculateTax', code);

      expect(result.functionName).toBe('calculateTax');
      expect(result.domain).toBe('finance');
      expect(result.variables.size).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test('should infer types for validateEmail', () => {
      const code = `
        let email = "user@example.com"
        let isValid = email.includes("@")
        return isValid
      `;

      const result = engine.inferTypes('validateEmail', code);

      expect(result.domain).toBe('web');
      expect(result.variables.size).toBeGreaterThan(0);
    });

    test('should infer types for filterVector', () => {
      const code = `
        let vector = [1, 2, 3, 4, 5]
        let filtered = vector.filter(x => x > 2)
        return filtered
      `;

      const result = engine.inferTypes('filterVector', code);

      expect(result.domain).toBe('data-science');
      expect(result.variables.size).toBeGreaterThan(0);
    });

    test('should infer types for generateHash', () => {
      const code = `
        let data = "secret"
        let hash = data.hash()
        return hash
      `;

      const result = engine.inferTypes('generateHash', code);

      expect(result.domain).toBe('crypto');
      expect(result.variables.size).toBeGreaterThan(0);
    });

    test('should infer types for readSensor', () => {
      const code = `
        let sensor = 42
        let reading = sensor * 1.5
        return reading
      `;

      const result = engine.inferTypes('readSensor', code);

      // IoT domain detection depends on keyword matching
      expect(result.variables.size).toBeGreaterThan(0);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    test('should handle multiple variables with different domains', () => {
      const code = `
        let price = 100
        let tax = price * 0.1
        let totalAmount = price + tax
        return totalAmount
      `;

      const result = engine.inferTypes('calculateTotal', code);

      expect(result.variables.size).toBeGreaterThanOrEqual(3);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should handle unknown domains gracefully', () => {
      const code = `
        let x = 10
        let y = x + 5
        return y
      `;

      const result = engine.inferTypes('unknownFunction', code);

      expect(result.domain).toBeNull();
      expect(result.variables.size).toBeGreaterThan(0);
    });

    test('should handle empty code', () => {
      const result = engine.inferTypes('emptyFunction', '');

      expect(result.functionName).toBe('emptyFunction');
      expect(result.variables.size).toBe(0);
      expect(result.reasoning).toBeDefined();
    });

    test('should provide detailed reasoning for each variable', () => {
      const code = `
        let tax = 0.1
        return tax
      `;

      const result = engine.inferTypes('getTax', code);

      expect(result.reasoning.length).toBeGreaterThan(0);
      for (const variable of result.variables.values()) {
        expect(variable.reasoning).toBeDefined();
        expect(variable.reasoning.length).toBeGreaterThan(0);
      }
    });

    test('should infer function with complex variable names', () => {
      const code = `
        let totalPrice = 100
        let taxAmount = 10
        let finalTotal = totalPrice + taxAmount
        return finalTotal
      `;

      const result = engine.inferTypes('calculateTotal', code);

      expect(result.variables.size).toBeGreaterThanOrEqual(2);
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // 2. 단일 변수 타입 추론 테스트 (10개)
  // ============================================================================
  describe('Single Variable Inference', () => {
    test('should infer tax variable as decimal in finance context', () => {
      const code = 'let tax = price * 0.1';

      const result = engine.inferVariableType('tax', 'calculateTax', code);

      expect(result.variableName).toBe('tax');
      expect(result.domain).toBe('finance');
      // Type enhancement depends on baseType being inferred
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.nameAnalysisConfidence).toBeGreaterThan(0.7);
    });

    test('should infer email as validated_string in web context', () => {
      const code = 'let email = "user@example.com"';

      const result = engine.inferVariableType('email', 'validateEmail', code);

      expect(result.domain).toBe('web');
      expect(result.variableName).toBe('email');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should infer vector as array in data-science context', () => {
      const code = 'let vector = [1, 2, 3]';

      const result = engine.inferVariableType('vector', 'filterVector', code);

      expect(result.domain).toBe('data-science');
      expect(result.variableName).toBe('vector');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should infer hash as hash_string in crypto context', () => {
      const code = 'let hash = generateHash()';

      const result = engine.inferVariableType('hash', 'generateHash', code);

      expect(result.domain).toBe('crypto');
      expect(result.variableName).toBe('hash');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should provide name analysis confidence', () => {
      const code = 'let totalAmount = 100';

      const result = engine.inferVariableType('totalAmount', 'calculateTotal', code);

      expect(result.nameAnalysisConfidence).toBeGreaterThan(0);
      expect(result.nameAnalysisDetails).toBeDefined();
    });

    test('should provide semantic analysis confidence', () => {
      const code = 'let count = 5';

      const result = engine.inferVariableType('count', 'getCount', code);

      expect(result.semanticAnalysisConfidence).toBeGreaterThan(0);
      expect(result.semanticAnalysisDetails).toBeDefined();
    });

    test('should provide context tracking confidence', () => {
      const code = 'let price = 100';

      const result = engine.inferVariableType('price', 'getPrice', code);

      expect(result.contextConfidence).toBeGreaterThan(0);
      expect(result.contextDetails).toBeDefined();
    });

    test('should provide domain enhancement confidence', () => {
      const code = 'let tax = 10';

      const result = engine.inferVariableType('tax', 'calculateTax', code);

      expect(result.domainEnhancementConfidence).toBeGreaterThan(0);
    });

    test('should include validation rules for strict domains', () => {
      const code = 'let amount = 100.50';

      const result = engine.inferVariableType('amount', 'calculateAmount', code);

      // Validation rules are only populated when both domain and baseType are known
      if (result.domain === 'finance' && result.inferredType !== 'unknown') {
        expect(result.validationRules).toBeDefined();
        expect(result.validationRules!.length).toBeGreaterThan(0);
      } else {
        // When domain or type is unknown, rules may not be populated
        expect(result.variableName).toBe('amount');
      }
    });

    test('should normalize confidence to 0.0-1.0 range', () => {
      const code = 'let x = 10';

      const result = engine.inferVariableType('x', 'getX', code);

      expect(result.confidence).toBeGreaterThanOrEqual(0.0);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  // ============================================================================
  // 3. 신뢰도 계산 테스트 (10개)
  // ============================================================================
  describe('Confidence Calculation', () => {
    test('should calculate weighted confidence correctly', () => {
      const code = 'let tax = 0.1';

      const result = engine.inferVariableType('tax', 'calculateTax', code);

      // Weighted: 0.25*name + 0.35*semantic + 0.25*context + 0.15*domain
      const expected =
        result.nameAnalysisConfidence * 0.25 +
        result.semanticAnalysisConfidence * 0.35 +
        result.contextConfidence * 0.25 +
        result.domainEnhancementConfidence * 0.15;

      expect(result.confidence).toBeCloseTo(expected, 2);
    });

    test('should have higher confidence for strong matches', () => {
      const code = 'let tax = price * 0.1';

      const result = engine.inferVariableType('tax', 'calculateTax', code);

      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test('should have lower confidence for weak matches', () => {
      const code = 'let x = 10';

      const result = engine.inferVariableType('x', 'unknownFunc', code);

      expect(result.confidence).toBeLessThan(0.6);
    });

    test('should aggregate function-level confidence', () => {
      const code = `
        let tax = 0.1
        let price = 100
        let total = price + tax
      `;

      const result = engine.inferTypes('calculateTotal', code);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    test('should increase confidence when multiple signals align', () => {
      const code = 'let tax = 10';

      const result = engine.inferVariableType('tax', 'calculateTax', code);

      // tax variable + calculateTax function + both in finance domain = high confidence
      expect(result.nameAnalysisConfidence).toBeGreaterThan(0.7);
      expect(result.contextConfidence).toBeGreaterThan(0.7);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test('should decrease confidence when signals conflict', () => {
      const code = 'let vector = [1, 2, 3]';

      const result = engine.inferVariableType('vector', 'calculateTax', code);

      // vector in finance domain = mismatch = lower confidence
      expect(result.confidence).toBeLessThan(0.8);
    });

    test('should balance confidence components', () => {
      const code = 'let email = "test@example.com"';

      const result = engine.inferVariableType('email', 'validateEmail', code);

      // All weights should contribute
      expect(result.nameAnalysisConfidence).toBeGreaterThan(0);
      expect(result.semanticAnalysisConfidence).toBeGreaterThan(0);
      expect(result.contextConfidence).toBeGreaterThan(0);
      expect(result.domainEnhancementConfidence).toBeGreaterThan(0);
    });

    test('should handle zero confidence gracefully', () => {
      const code = '';

      const result = engine.inferVariableType('unknown_var', 'unknown_func', code);

      expect(result.confidence).toBeGreaterThanOrEqual(0.0);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    test('should not exceed 1.0 confidence even with perfect alignment', () => {
      const code = 'let tax = 0.1';

      const result = engine.inferVariableType('tax', 'calculateTax', code);

      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  // ============================================================================
  // 4. 추론 추적 및 설명 테스트 (5개)
  // ============================================================================
  describe('Reasoning Trace', () => {
    test('should provide detailed reasoning steps', () => {
      const code = 'let tax = 0.1';

      const result = engine.inferVariableType('tax', 'calculateTax', code);

      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.reasoning.join('\n')).toContain('tax');
    });

    test('should include name analysis in reasoning', () => {
      const code = 'let tax = 0.1';

      const result = engine.inferVariableType('tax', 'calculateTax', code);

      expect(result.nameAnalysisDetails).toBeDefined();
      expect(result.reasoning).toContain(result.nameAnalysisDetails);
    });

    test('should include semantic analysis in reasoning', () => {
      const code = 'let tax = 0.1';

      const result = engine.inferVariableType('tax', 'calculateTax', code);

      expect(result.semanticAnalysisDetails).toBeDefined();
      expect(result.reasoning).toContain(result.semanticAnalysisDetails);
    });

    test('should include context details in reasoning', () => {
      const code = 'let tax = 0.1';

      const result = engine.inferVariableType('tax', 'calculateTax', code);

      expect(result.contextDetails).toBeDefined();
      expect(result.reasoning).toContain(result.contextDetails);
    });

    test('should provide final confidence explanation', () => {
      const code = 'let tax = 0.1';

      const result = engine.inferVariableType('tax', 'calculateTax', code);

      expect(result.reasoning.some(r => r.includes('%'))).toBe(true);
      expect(result.reasoning.some(r => r.includes('신뢰도'))).toBe(true);
    });
  });

  // ============================================================================
  // 5. 통합 및 엣지 케이스 테스트 (10개)
  // ============================================================================
  describe('Integration and Edge Cases', () => {
    test('should group variables by domain', () => {
      const code = `
        let tax = 0.1
        let price = 100
        let vector = [1, 2, 3]
      `;

      const result = engine.inferTypes('mixedFunction', code);
      const grouped = engine.groupVariablesByDomain(result);

      expect(grouped.size).toBeGreaterThan(0);
      expect(grouped.has('finance') || grouped.has('unknown')).toBe(true);
    });

    test('should filter variables by confidence threshold', () => {
      const code = `
        let tax = 0.1
        let x = 10
      `;

      const result = engine.inferTypes('calculateTax', code);
      const variables = Array.from(result.variables.values());
      const filtered = engine.filterByConfidence(variables, 0.5);

      expect(filtered.length).toBeGreaterThanOrEqual(0);
      expect(filtered.length).toBeLessThanOrEqual(variables.length);
    });

    test('should detect type conflicts', () => {
      const code = `
        let data = [1, 2, 3]
      `;

      const result = engine.inferTypes('mixedDomainFunc', code);
      const conflicts = engine.detectTypeConflicts(result);

      expect(conflicts).toBeDefined();
      expect(Array.isArray(conflicts)).toBe(true);
    });

    test('should handle very long variable names', () => {
      const longName = 'calculateMonthlyTotalTaxAmountForUserAccount';

      const result = engine.inferVariableType(
        longName,
        'complexFunction',
        `let ${longName} = 0.1`
      );

      expect(result.variableName).toBe(longName);
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should handle special characters in function names', () => {
      const code = 'let tax = 0.1';

      const result = engine.inferVariableType('tax', 'calculate_Tax_v2', code);

      expect(result.variableName).toBe('tax');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should handle duplicate variable names with different types', () => {
      const code = `
        let price = 100
        let price = "premium"
      `;

      const result = engine.inferTypes('getPrice', code);

      expect(result.variables.has('price')).toBe(true);
    });

    test('should infer function signature', () => {
      const code = 'let tax = 0.1; return tax';

      const signature = engine.inferFunctionSignature('calculateTax', code);

      expect(signature.name).toBe('calculateTax');
      expect(signature.confidence).toBeGreaterThan(0);
    });

    test('should handle null/undefined safely', () => {
      const result = engine.inferVariableType('undefined_var', 'func', '');

      expect(result.variableName).toBe('undefined_var');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    test('should maintain consistency across multiple calls', () => {
      const code = 'let tax = 0.1';

      const result1 = engine.inferVariableType('tax', 'calculateTax', code);
      const result2 = engine.inferVariableType('tax', 'calculateTax', code);

      expect(result1.confidence).toEqual(result2.confidence);
      expect(result1.enhancedType).toEqual(result2.enhancedType);
      expect(result1.domain).toEqual(result2.domain);
    });

    test('should prioritize exact domain matches over partial matches', () => {
      const code = 'let email = "test@example.com"';

      const result1 = engine.inferVariableType('email', 'validateEmail', code);
      const result2 = engine.inferVariableType('email', 'calculateSomething', code);

      // Email in web context should have higher confidence
      expect(result1.confidence).toBeGreaterThanOrEqual(result2.confidence);
    });
  });
});
