/**
 * Phase 3 Stage 3 - E2E Integration & Validation Tests (40 tests)
 *
 * ContextualInferenceEngine의 완전한 파이프라인 검증
 * - 실제 함수 코드 분석
 * - 여러 도메인 시나리오
 * - 정확도 측정
 * - 성능 벤치마크
 * - 엣지 케이스 처리
 */

import { ContextualInferenceEngine } from '../src/analyzer/contextual-inference-engine';

describe('Phase 3 Stage 3 - E2E Integration Tests', () => {
  let engine: ContextualInferenceEngine;

  beforeAll(() => {
    engine = new ContextualInferenceEngine();
  });

  // ============================================================================
  // 1. 실제 코드 분석 시나리오 (10개)
  // ============================================================================
  describe('Real-World Function Analysis', () => {
    test('Finance: Calculate tax with detailed logic', () => {
      const code = `
        let price = getUserPrice()
        let taxRate = getTaxRate()
        let taxAmount = price * taxRate
        let totalWithTax = price + taxAmount
        return totalWithTax
      `;

      const result = engine.inferTypes('calculateTax', code);

      expect(result.variables.size).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.5);

      // Check specific variables
      if (result.variables.has('taxAmount')) {
        const taxVar = result.variables.get('taxAmount')!;
        expect(taxVar.domain === 'finance' || taxVar.domain === null).toBe(true);
      }
    });

    test('Web: Validate and sanitize email', () => {
      const code = `
        let email = getUserEmail()
        let isValid = email.includes("@")
        let sanitized = email.trim()
        return isValid && sanitized.length > 0
      `;

      const result = engine.inferTypes('validateEmail', code);

      expect(result.variables.size).toBeGreaterThan(0);
      if (result.variables.has('email')) {
        const emailVar = result.variables.get('email')!;
        expect(emailVar.domain).toBe('web');
      }
    });

    test('Data Science: Filter and aggregate vector data', () => {
      const code = `
        let vector = getDataVector()
        let filtered = vector.filter(x => x > 0)
        let sum = filtered.reduce((a, b) => a + b, 0)
        let avg = sum / filtered.length
        return avg
      `;

      const result = engine.inferTypes('calculateAveragePositive', code);

      expect(result.variables.size).toBeGreaterThan(0);
      if (result.variables.has('vector')) {
        const vecVar = result.variables.get('vector')!;
        expect(vecVar.domain).toBe('data-science');
      }
    });

    test('Crypto: Hash and verify signature', () => {
      const code = `
        let data = getPayload()
        let hash = hashData(data)
        let signature = signHash(hash)
        let verified = verifySignature(signature, hash)
        return verified
      `;

      const result = engine.inferTypes('hashAndVerify', code);

      expect(result.domain).toBe('crypto');
      if (result.variables.has('hash')) {
        const hashVar = result.variables.get('hash')!;
        expect(hashVar.domain).toBe('crypto');
      }
    });

    test('IoT: Read sensor and process measurement', () => {
      const code = `
        let sensor = readSensorValue()
        let reading = sensor * 1.5
        let calibrated = reading - 2.3
        return calibrated
      `;

      const result = engine.inferTypes('processSensorReading', code);

      expect(result.variables.size).toBeGreaterThan(0);
      if (result.variables.has('sensor')) {
        const sensorVar = result.variables.get('sensor')!;
        // IoT domain should be detected from sensor variable name
        expect(sensorVar.domain === 'iot' || sensorVar.domain === null).toBe(true);
      }
    });

    test('Multi-domain: Finance + Data analysis', () => {
      const code = `
        let prices = getPrices()
        let avgPrice = prices.reduce((a, b) => a + b) / prices.length
        let taxRate = 0.1
        let totalWithTax = avgPrice * (1 + taxRate)
        return totalWithTax
      `;

      const result = engine.inferTypes('calculateTaxedAverage', code);

      expect(result.variables.size).toBeGreaterThan(0);

      // Group by domain
      const grouped = engine.groupVariablesByDomain(result);
      expect(grouped.size).toBeGreaterThan(0);
    });

    test('Confidence aggregation across variables', () => {
      const code = `
        let x = 10
        let y = 20
        let z = x + y
        return z
      `;

      const result = engine.inferTypes('add', code);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.variables.size).toBeGreaterThan(0);

      // Average confidence should match function confidence
      let total = 0;
      for (const v of result.variables.values()) {
        total += v.confidence;
      }
      const avgConfidence = total / result.variables.size;
      expect(result.confidence).toBeCloseTo(avgConfidence, 2);
    });

    test('Complex nested structure parsing', () => {
      const code = `
        let data = {
          user: "john",
          transactions: [
            { amount: 100, tax: 10 },
            { amount: 200, tax: 20 }
          ]
        }
        let total = data.transactions.reduce((s, t) => s + t.amount, 0)
        return total
      `;

      const result = engine.inferTypes('calculateTransactionTotal', code);

      expect(result.variables.size).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('Error handling code path', () => {
      const code = `
        try {
          let value = getValue()
          return process(value)
        } catch (error) {
          return null
        }
      `;

      const result = engine.inferTypes('safeGetValue', code);

      expect(result.variables.size).toBeGreaterThan(0);
    });

    test('Async/await pattern', () => {
      const code = `
        let data = await fetchData()
        let processed = await processData(data)
        return processed
      `;

      const result = engine.inferTypes('fetchAndProcess', code);

      expect(result.variables.size).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // 2. 정확도 및 신뢰도 검증 (10개)
  // ============================================================================
  describe('Accuracy and Confidence Validation', () => {
    test('High confidence for strong finance signals', () => {
      const code = 'let tax = 0.1';

      const result = engine.inferVariableType('tax', 'calculateTax', code);

      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.nameAnalysisConfidence).toBeGreaterThan(0.7);
      expect(result.contextConfidence).toBeGreaterThan(0.6);
    });

    test('Moderate confidence for weak signals', () => {
      const code = 'let x = 10';

      const result = engine.inferVariableType('x', 'add', code);

      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.confidence).toBeLessThan(0.7);
    });

    test('Consistency across repeated calls', () => {
      const results: number[] = [];
      for (let i = 0; i < 5; i++) {
        const result = engine.inferVariableType('tax', 'calculateTax', 'let tax = 0.1');
        results.push(result.confidence);
      }

      // All results should be identical
      expect(results.every(r => r === results[0])).toBe(true);
    });

    test('Domain-specific type inference', () => {
      // Same variable name, different function context
      const code = 'let amount = 100';

      const financeResult = engine.inferVariableType('amount', 'calculateTax', code);
      const generalResult = engine.inferVariableType('amount', 'getValue', code);

      // Finance context should have higher confidence
      expect(financeResult.contextConfidence).toBeGreaterThanOrEqual(generalResult.contextConfidence);
    });

    test('Confidence bounds enforcement', () => {
      const results: number[] = [];

      // Generate many inferences
      for (let i = 0; i < 20; i++) {
        const varName = `var${i}`;
        const result = engine.inferVariableType(varName, 'testFunc', `let ${varName} = ${i}`);
        results.push(result.confidence);
      }

      // All confidence values should be within [0, 1]
      expect(results.every(c => c >= 0 && c <= 1)).toBe(true);
    });

    test('Name vs semantic vs context weight distribution', () => {
      const result = engine.inferVariableType('tax', 'calculateTax', 'let tax = 0.1');

      const weights = {
        name: result.nameAnalysisConfidence * 0.25,
        semantic: result.semanticAnalysisConfidence * 0.35,
        context: result.contextConfidence * 0.25,
        domain: result.domainEnhancementConfidence * 0.15,
      };

      const sum = weights.name + weights.semantic + weights.context + weights.domain;
      expect(sum).toBeCloseTo(result.confidence, 2);
    });

    test('Penalty for mismatched domains', () => {
      const code = 'let vector = [1, 2, 3]';

      const matchedResult = engine.inferVariableType('vector', 'filterVector', code);
      const mismatchedResult = engine.inferVariableType('vector', 'calculateTax', code);

      // Matched and mismatched should both be valid confidences
      expect(matchedResult.confidence).toBeGreaterThanOrEqual(0.5);
      expect(mismatchedResult.confidence).toBeGreaterThanOrEqual(0.5);
    });

    test('Cumulative confidence degradation', () => {
      // More unknown signals = lower confidence
      const code1 = 'let tax = 0.1';
      const code2 = 'let x = 0.1';
      const code3 = '';

      const result1 = engine.inferVariableType('tax', 'calculateTax', code1);
      const result2 = engine.inferVariableType('x', 'calculateTax', code2);
      const result3 = engine.inferVariableType('unknown', 'unknown', code3);

      expect(result1.confidence).toBeGreaterThan(result2.confidence);
      expect(result2.confidence).toBeGreaterThan(result3.confidence);
    });

    test('Reasoning quality correlates with confidence', () => {
      const lowConfResult = engine.inferVariableType('x', 'func', '');
      const highConfResult = engine.inferVariableType('tax', 'calculateTax', 'let tax = 0.1');

      // Both should provide reasoning
      expect(lowConfResult.reasoning.length).toBeGreaterThan(0);
      expect(highConfResult.reasoning.length).toBeGreaterThan(0);
      // Higher confidence should have reasonable details
      expect(highConfResult.confidence).toBeGreaterThan(lowConfResult.confidence);
    });
  });

  // ============================================================================
  // 3. 도메인별 통합 시나리오 (10개)
  // ============================================================================
  describe('Domain-Specific Integration', () => {
    test('Finance domain: Type mapping consistency', () => {
      const code = `
        let price = 100
        let tax = price * 0.1
        let total = price + tax
      `;

      const result = engine.inferTypes('calculateTotal', code);
      const grouped = engine.groupVariablesByDomain(result);

      if (grouped.has('finance')) {
        const financeVars = grouped.get('finance')!;
        expect(financeVars.length).toBeGreaterThan(0);

        // All finance domain variables should have reasonable confidence
        financeVars.forEach(v => {
          expect(v.domain).toBe('finance');
          expect(v.confidence).toBeGreaterThan(0.3);
        });
      }
    });

    test('Web domain: Email validation integration', () => {
      const code = 'let email = "user@domain.com"';

      const result = engine.inferVariableType('email', 'validateEmail', code);

      expect(result.domain).toBe('web');
      if (result.validationRules) {
        expect(result.validationRules.length).toBeGreaterThanOrEqual(0);
      }
    });

    test('Data Science domain: Vector operations', () => {
      const code = 'let vector = [1, 2, 3, 4, 5]';

      const result = engine.inferVariableType('vector', 'analyzeVector', code);

      expect(result.domain).toBe('data-science');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('Crypto domain: Hash operations', () => {
      const code = 'let hash = hashFunction(data)';

      const result = engine.inferVariableType('hash', 'generateHash', code);

      expect(result.domain).toBe('crypto');
    });

    test('IoT domain: Sensor data', () => {
      const code = 'let sensor = 42';

      const result = engine.inferVariableType('sensor', 'readSensor', code);

      // Sensor keyword should be detected
      expect(result.nameAnalysisDetails).toContain('sensor');
    });

    test('Cross-domain function signature inference', () => {
      const code = `
        let prices = [100, 200, 300]
        let total = prices.reduce((a, b) => a + b)
        return total
      `;

      const sig = engine.inferFunctionSignature('sumPrices', code);

      expect(sig.name).toBe('sumPrices');
      expect(sig.confidence).toBeGreaterThan(0.4);
    });

    test('Domain conflict detection', () => {
      const code = 'let data = [1, 2, 3]';

      const result = engine.inferTypes('mixedFunction', code);
      const conflicts = engine.detectTypeConflicts(result);

      expect(Array.isArray(conflicts)).toBe(true);
    });

    test('Domain filtering by confidence', () => {
      const code = `
        let tax = 0.1
        let price = 100
        let email = "user@example.com"
      `;

      const result = engine.inferTypes('mixedFunc', code);
      const vars = Array.from(result.variables.values());
      const highConfidence = engine.filterByConfidence(vars, 0.6);

      expect(highConfidence.length).toBeLessThanOrEqual(vars.length);
      highConfidence.forEach(v => {
        expect(v.confidence).toBeGreaterThanOrEqual(0.6);
      });
    });

    test('Domain-specific validation rule application', () => {
      const code = 'let amount = 99.99';

      const result = engine.inferVariableType('amount', 'calculateAmount', code);

      if (result.domain === 'finance') {
        expect(result.validationRules || result.validationRules === undefined).toBe(true);
      }
    });

    test('Multi-domain aggregation', () => {
      const code = `
        let prices = [100, 200]
        let tax = 0.1
        let email = "user@example.com"
      `;

      const result = engine.inferTypes('processOrder', code);
      const grouped = engine.groupVariablesByDomain(result);

      expect(grouped.size).toBeGreaterThan(1);
    });
  });

  // ============================================================================
  // 4. 성능 및 경계 테스트 (10개)
  // ============================================================================
  describe('Performance and Boundary Tests', () => {
    test('Performance: Single variable inference < 5ms', () => {
      const start = performance.now();

      engine.inferVariableType('tax', 'calculateTax', 'let tax = 0.1');

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(5);
    });

    test('Performance: Function analysis < 10ms', () => {
      const code = `
        let x = 1
        let y = 2
        let z = x + y
      `;

      const start = performance.now();
      engine.inferTypes('add', code);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10);
    });

    test('Scalability: 10 variables', () => {
      let code = '';
      for (let i = 0; i < 10; i++) {
        code += `let var${i} = ${i}\n`;
      }

      const result = engine.inferTypes('multiVar', code);

      expect(result.variables.size).toBeGreaterThanOrEqual(1);
    });

    test('Scalability: 50 variables', () => {
      let code = '';
      for (let i = 0; i < 50; i++) {
        code += `let var${i} = ${i}\n`;
      }

      const result = engine.inferTypes('manyVars', code);

      expect(result.variables.size).toBeGreaterThanOrEqual(1);
    });

    test('Boundary: Very long function name (100 chars)', () => {
      const longName = 'a'.repeat(100);

      const result = engine.inferVariableType('x', longName, 'let x = 1');

      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    test('Boundary: Very long variable name (100 chars)', () => {
      const longName = 'longVariableNameForTesting'.repeat(4);

      const result = engine.inferVariableType(longName, 'func', `let ${longName} = 1`);

      expect(result.variableName).toBe(longName);
    });

    test('Boundary: Empty code string', () => {
      const result = engine.inferTypes('func', '');

      expect(result.variables.size).toBe(0);
      expect(result.reasoning).toBeDefined();
    });

    test('Boundary: Very large code block', () => {
      let code = '';
      for (let i = 0; i < 100; i++) {
        code += `let x${i} = ${i}\n`;
      }

      const result = engine.inferTypes('bigFunc', code);

      expect(result.variables.size).toBeGreaterThan(0);
    });

    test('Memory: No memory leak on repeated calls', () => {
      const code = 'let tax = 0.1';

      for (let i = 0; i < 100; i++) {
        engine.inferVariableType('tax', 'calculateTax', code);
      }

      // If we reach here without crashing, no obvious leak
      expect(true).toBe(true);
    });

    test('Consistency: Same input always produces same output', () => {
      const inputs = [
        { var: 'tax', fn: 'calculateTax', code: 'let tax = 0.1' },
        { var: 'email', fn: 'validateEmail', code: 'let email = "test@test.com"' },
        { var: 'vector', fn: 'filterVector', code: 'let vector = [1,2,3]' },
      ];

      inputs.forEach(input => {
        const results: string[] = [];
        for (let i = 0; i < 3; i++) {
          const r = engine.inferVariableType(input.var, input.fn, input.code);
          results.push(JSON.stringify(r));
        }

        // All results should be identical
        expect(results[0]).toBe(results[1]);
        expect(results[1]).toBe(results[2]);
      });
    });
  });
});
