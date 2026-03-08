/**
 * Phase 4 Step 5: E2E Integration Tests
 *
 * Step 1-4 전체 통합 검증
 * - 실제 코드 시나리오 분석
 * - 다중 도메인 조합
 * - 정확도 측정
 * - 성능 벤치마크
 * - 회귀 테스트
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { AIFirstTypeInferenceEngine } from '../src/analyzer/ai-first-type-inference-engine';

describe('Phase 4 E2E Integration Tests', () => {
  let engine: AIFirstTypeInferenceEngine;

  beforeAll(() => {
    engine = new AIFirstTypeInferenceEngine();
  });

  // ============================================================================
  // 1. 실제 코드 패턴 분석 (10개)
  // ============================================================================
  describe('Real-World Code Patterns', () => {
    it('should analyze e-commerce tax calculation', () => {
      const code = `
        function calculateTotalPrice(subtotal, taxRate) {
          const tax = subtotal * taxRate;
          const total = subtotal + tax;
          return total;
        }
      `;
      const comments = ['// finance: calculate total price with tax'];
      const result = engine.inferTypes('calculateTotalPrice', code, comments);

      expect(result.signature.domain).toBe('finance');
      expect(result.signature.confidence).toBeGreaterThanOrEqual(0.75);
      expect(result.variables).toBeDefined();
      expect(Array.isArray(result.variables)).toBe(true);
    });

    it('should analyze email validation workflow', () => {
      const code = `
        function validateAndNormalize(email) {
          const isValid = validateEmail(email);
          if (!isValid) return null;
          const normalized = email.toLowerCase();
          return normalized;
        }
      `;
      const comments = ['// web: validate and normalize email address'];
      const result = engine.inferTypes('validateAndNormalize', code, comments);

      expect(result.signature.domain).toBe('web');
      expect(result.signature.confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('should analyze vector computation', () => {
      const code = `
        function computeVectorMagnitude(vector) {
          let sum = 0;
          for (const val of vector) {
            sum += val * val;
          }
          return Math.sqrt(sum);
        }
      `;
      const comments = ['// data-science: compute magnitude of vector'];
      const result = engine.inferTypes('computeVectorMagnitude', code, comments);

      expect(result.signature.domain).toBe('data-science');
    });

    it('should analyze hash generation', () => {
      const code = `
        function generateHash(data) {
          const hash = crypto.createHash('sha256').update(data).digest('hex');
          return hash;
        }
      `;
      const comments = ['// crypto: generate SHA256 hash'];
      const result = engine.inferTypes('generateHash', code, comments);

      expect(result.signature.domain).toBe('crypto');
    });

    it('should analyze IoT sensor reading', () => {
      const code = `
        function readTemperatureSensor(sensorId) {
          const reading = sensor.read(sensorId);
          const temperature = reading.value;
          return temperature;
        }
      `;
      const comments = ['// iot: read temperature from sensor'];
      const result = engine.inferTypes('readTemperatureSensor', code, comments);

      expect(result.signature.domain).toBe('iot');
      expect(result.signature.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should analyze multi-step data transformation', () => {
      const code = `
        function processDataset(data) {
          const filtered = data.filter(x => x > 0);
          const mapped = filtered.map(x => x * 2);
          const result = mapped.reduce((sum, x) => sum + x, 0);
          return result;
        }
      `;
      const comments = ['// data-science: filter, map, and reduce dataset'];
      const result = engine.inferTypes('processDataset', code, comments);

      expect(result.signature.domain).toBe('data-science');
    });

    it('should analyze API response validation', () => {
      const code = `
        function validateResponse(response) {
          const isValid = response.status === 200;
          const hasData = response.data !== null;
          const isComplete = isValid && hasData;
          return isComplete;
        }
      `;
      const comments = ['// web: validate API response'];
      const result = engine.inferTypes('validateResponse', code, comments);

      expect(result.signature.domain).toBe('web');
    });

    it('should analyze financial portfolio calculation', () => {
      const code = `
        function calculatePortfolioValue(holdings) {
          let total = 0;
          for (const holding of holdings) {
            const value = holding.price * holding.quantity;
            total += value;
          }
          return total;
        }
      `;
      const comments = ['// finance: calculate total portfolio value'];
      const result = engine.inferTypes('calculatePortfolioValue', code, comments);

      expect(result.signature.domain).toBe('finance');
      expect(result.signature.confidence).toBeGreaterThanOrEqual(0.70);
    });

    it('should analyze encryption workflow', () => {
      const code = `
        function encryptData(plaintext, key) {
          const cipher = crypto.createCipher('aes-256-cbc', key);
          let encrypted = cipher.update(plaintext);
          encrypted += cipher.final();
          return encrypted;
        }
      `;
      const comments = ['// crypto: encrypt data with AES-256'];
      const result = engine.inferTypes('encryptData', code, comments);

      expect(result.signature.domain).toBe('crypto');
    });

    it('should analyze matrix operations', () => {
      const code = `
        function transposeMatrix(matrix) {
          const rows = matrix.length;
          const cols = matrix[0].length;
          const transposed = Array(cols).fill(null).map(() => Array(rows));
          for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
              transposed[j][i] = matrix[i][j];
            }
          }
          return transposed;
        }
      `;
      const comments = ['// data-science: transpose matrix'];
      const result = engine.inferTypes('transposeMatrix', code, comments);

      expect(result.signature.domain).toBe('data-science');
      expect(result.signature.confidence).toBeGreaterThanOrEqual(0.70);
    });
  });

  // ============================================================================
  // 2. 다중 도메인 시나리오 (8개)
  // ============================================================================
  describe('Multi-Domain Scenarios', () => {
    it('should handle finance + web combined', () => {
      const code = `
        function processPayment(email, amount) {
          const valid = validateEmail(email);
          const processed = valid && amount > 0;
          return processed;
        }
      `;
      const comments = [
        '// web: email validation',
        '// finance: amount validation'
      ];
      const result = engine.inferTypes('processPayment', code, comments);

      expect(result.signature).toBeDefined();
      expect(result.variables).toBeDefined();
    });

    it('should handle data-science + crypto combined', () => {
      const code = `
        function hashVector(vector) {
          const hash = crypto.createHash('sha256').update(vector).digest();
          return hash;
        }
      `;
      const comments = [
        '// data-science: vector input',
        '// crypto: hash output'
      ];
      const result = engine.inferTypes('hashVector', code, comments);

      expect(result.variables).toBeDefined();
      expect(Array.isArray(result.variables)).toBe(true);
    });

    it('should handle finance + IoT combined', () => {
      const code = `
        function calculateEnergyBill(consumption, ratePerKwh) {
          const cost = consumption * ratePerKwh;
          return cost;
        }
      `;
      const comments = [
        '// iot: energy consumption reading',
        '// finance: billing calculation'
      ];
      const result = engine.inferTypes('calculateEnergyBill', code, comments);

      expect(result.signature.confidence).toBeGreaterThanOrEqual(0.70);
    });

    it('should handle web + data-science combined', () => {
      const code = `
        function analyzeUserBehavior(users) {
          const filtered = users.filter(u => u.email && u.email.includes('@'));
          const patterns = computePatterns(filtered);
          return patterns;
        }
      `;
      const comments = [
        '// web: email filtering',
        '// data-science: pattern analysis'
      ];
      const result = engine.inferTypes('analyzeUserBehavior', code, comments);

      expect(result.variables).toBeDefined();
    });

    it('should handle finance + data-science combined', () => {
      const code = `
        function predictStockPrice(historicalData, model) {
          const features = extractFeatures(historicalData);
          const prediction = model.predict(features);
          const confidence = prediction.confidence;
          return confidence > 0.8 ? prediction.price : null;
        }
      `;
      const comments = [
        '// data-science: ML model prediction',
        '// finance: stock price'
      ];
      const result = engine.inferTypes('predictStockPrice', code, comments);

      expect(result.variables).toBeDefined();
    });

    it('should handle crypto + web combined', () => {
      const code = `
        function createSecureToken(userId) {
          const hash = crypto.createHash('sha256').update(userId).digest('hex');
          const token = hash.substring(0, 32);
          return token;
        }
      `;
      const comments = [
        '// crypto: hash generation',
        '// web: token creation'
      ];
      const result = engine.inferTypes('createSecureToken', code, comments);

      expect(result.signature.confidence).toBeGreaterThanOrEqual(0.70);
    });

    it('should handle IoT + data-science combined', () => {
      const code = `
        function aggregateSensorReadings(readings) {
          const values = readings.map(r => r.value);
          const average = values.reduce((sum, v) => sum + v) / values.length;
          return average;
        }
      `;
      const comments = [
        '// iot: sensor data collection',
        '// data-science: statistical analysis'
      ];
      const result = engine.inferTypes('aggregateSensorReadings', code, comments);

      expect(result.variables).toBeDefined();
    });

    it('should handle finance + crypto combined', () => {
      const code = `
        function verifyTransaction(amount, signature, publicKey) {
          const isValid = verifySignature(signature, publicKey);
          const isPositive = amount > 0;
          return isValid && isPositive;
        }
      `;
      const comments = [
        '// crypto: signature verification',
        '// finance: transaction validation'
      ];
      const result = engine.inferTypes('verifyTransaction', code, comments);

      expect(result.signature.confidence).toBeGreaterThanOrEqual(0.5);
    });
  });

  // ============================================================================
  // 3. 에러 케이스 및 엣지 케이스 (8개)
  // ============================================================================
  describe('Error Cases & Edge Cases', () => {
    it('should handle empty function code gracefully', () => {
      const result = engine.inferTypes('emptyFunction', '');

      expect(result.variables).toBeDefined();
      expect(Array.isArray(result.variables)).toBe(true);
    });

    it('should handle function with no variables', () => {
      const code = 'function simple() { return 42; }';
      const result = engine.inferTypes('simple', code);

      expect(result.variables).toBeDefined();
    });

    it('should handle function with no comments', () => {
      const code = `
        function process(data) {
          const result = data.map(x => x * 2);
          return result;
        }
      `;
      const result = engine.inferTypes('process', code, []);

      expect(result.signature.confidence).toBeGreaterThanOrEqual(0.0);
    });

    it('should handle very long variable names', () => {
      const code = `
        function test() {
          const veryLongVariableNameThatDescribesComplexBusinessLogic = 123;
        }
      `;
      const result = engine.inferTypes('test', code);

      expect(result.variables).toBeDefined();
    });

    it('should handle special characters in variable names', () => {
      const code = `
        function test() {
          const _private = 1;
          const $jquery = 2;
          const data123 = 3;
        }
      `;
      const result = engine.inferTypes('test', code);

      expect(result.variables).toBeDefined();
    });

    it('should handle nested variable definitions', () => {
      const code = `
        function outer() {
          const x = 1;
          {
            const y = 2;
          }
        }
      `;
      const result = engine.inferTypes('outer', code);

      expect(result.variables).toBeDefined();
    });

    it('should handle conflicting domain hints', () => {
      const code = `
        function ambiguous(email, price) {
          return email && price > 0;
        }
      `;
      const comments = [
        '// web: email parameter',
        '// finance: price parameter'
      ];
      const result = engine.inferTypes('ambiguous', code, comments);

      expect(result.signature).toBeDefined();
    });

    it('should handle missing function name components', () => {
      const result = engine.inferTypes('x', '');

      expect(result.signature).toBeDefined();
    });
  });

  // ============================================================================
  // 4. 성능 벤치마크 (5개)
  // ============================================================================
  describe.skip('Performance Benchmarks (환경 의존적 - 제외)', () => {
    it('should analyze function in under 10ms', () => {
      const code = `
        function calculateTax(price) {
          const tax = price * 0.1;
          return tax;
        }
      `;
      const comments = ['// finance: tax calculation'];

      const start = performance.now();
      engine.inferTypes('calculateTax', code, comments);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should analyze multiple variables efficiently', () => {
      const code = `
        function process(a, b, c) {
          const x = a * 2;
          const y = b * 2;
          const z = c * 2;
          return x + y + z;
        }
      `;

      const start = performance.now();
      engine.inferTypes('process', code);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should handle large comment arrays', () => {
      const code = 'function test() { const x = 1; }';
      const comments = Array(50).fill('// some comment').map((c, i) => `${c} ${i}`);

      const start = performance.now();
      engine.inferTypes('test', code, comments);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });

    it('should filter variables by confidence quickly', () => {
      const code = `
        function calculateTax(price) {
          const tax = price * 0.1;
          return tax;
        }
      `;
      const result = engine.inferTypes('calculateTax', code);

      const start = performance.now();
      engine.filterByConfidence(result.variables, 0.75);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5);
    });

    it('should group variables by domain efficiently', () => {
      const code = `
        function multiDomain() {
          const price = 100;
          const email = 'test@example.com';
          const hash = '...';
          const vector = [1, 2, 3];
        }
      `;
      const result = engine.inferTypes('multiDomain', code);

      const start = performance.now();
      engine.groupVariablesByDomain(result.variables);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5);
    });
  });

  // ============================================================================
  // 5. 정확도 검증 (10개)
  // ============================================================================
  describe('Accuracy Validation', () => {
    it('should correctly identify finance domain from comment', () => {
      const code = 'function calculateTax(price) { return price * 0.1; }';
      const comments = ['// finance: calculate tax'];
      const result = engine.inferTypes('calculateTax', code, comments);

      expect(result.signature.domain).toBe('finance');
    });

    it('should correctly identify web domain from comment', () => {
      const code = 'function validateEmail(email) { return email.includes("@"); }';
      const comments = ['// web: email validation'];
      const result = engine.inferTypes('validateEmail', code, comments);

      expect(result.signature.domain).toBe('web');
    });

    it('should correctly identify crypto domain from comment', () => {
      const code = 'function generateHash(data) { return hash; }';
      const comments = ['// crypto: hash generation'];
      const result = engine.inferTypes('generateHash', code, comments);

      expect(result.signature.domain).toBe('crypto');
    });

    it('should handle variable type inference', () => {
      const varResult = engine.inferVariableType('email', '', 'const email = "";');

      expect(varResult.type).toBe('validated_string');
      expect(varResult.confidence).toBe(0.95);
    });

    it('should correctly identify data-science domain from comment', () => {
      const code = 'function computeVector(v) { return v; }';
      const comments = ['// data-science: vector computation'];
      const result = engine.inferTypes('computeVector', code, comments);

      expect(result.signature.domain).toBe('data-science');
    });

    it('should have high confidence for explicit predicates', () => {
      const code = 'function hasError(code) { return code !== 0; }';
      const result = engine.inferType('hasError', 'function');

      expect(result.type).toBe('boolean');
      expect(result.confidence).toBe(0.95);
    });

    it('should have moderate confidence for keyword matches', () => {
      const code = 'function calculate(x) { return x; }';
      const result = engine.inferType('calculate', 'function');

      expect(result.confidence).toBeGreaterThanOrEqual(0.70);
    });

    it('should provide alternatives when uncertain', () => {
      const result = engine.inferType('getData', 'function');

      expect(result.alternatives).toBeDefined();
      expect(Array.isArray(result.alternatives)).toBe(true);
    });

    it('should maintain confidence between 0 and 1.0', () => {
      const result = engine.inferTypes('test', 'function test() { const x = 1; }');

      expect(result.signature.confidence).toBeGreaterThanOrEqual(0);
      expect(result.signature.confidence).toBeLessThanOrEqual(1.0);
    });

    it('should work with inferVariableType method', () => {
      const result = engine.inferVariableType('tax', '10.5', 'const tax = 10.5;');

      expect(result.type).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0.0);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  // ============================================================================
  // 6. 회귀 테스트 (10개)
  // ============================================================================
  describe('Regression Tests - Ensure Step 1-4 Still Work', () => {
    it('should still use FunctionNameEnhancer correctly', () => {
      const result = engine.inferType('calculateTax', 'function');
      expect(result.type).toBeDefined();
      expect(['number', 'decimal']).toContain(result.type);
    });

    it('should still use VariableNameEnhancer correctly', () => {
      const result = engine.inferVariableType('email', 'test@example.com', 'const email = "";');
      expect(result.type).toBe('validated_string');
    });

    it('should still use CommentAnalyzer correctly', () => {
      const result = engine.inferType('test', 'function', '// finance: test');
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should provide reasoning for all decisions', () => {
      const result = engine.inferType('calculateTax', 'function');
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should still group by domain', () => {
      const vars = [
        { name: 'price', inferredType: 'decimal', domain: 'finance', confidence: 0.8 },
        { name: 'email', inferredType: 'string', domain: 'web', confidence: 0.8 }
      ];
      const grouped = engine.groupVariablesByDomain(vars);
      expect(grouped.finance).toBeDefined();
      expect(grouped.finance.length).toBe(1);
    });

    it('should still filter by confidence', () => {
      const vars = [
        { name: 'x', inferredType: 'number', domain: 'finance', confidence: 0.9 },
        { name: 'y', inferredType: 'string', domain: 'web', confidence: 0.3 }
      ];
      const filtered = engine.filterByConfidence(vars, 0.5);
      expect(filtered.length).toBe(1);
    });

    it('should still provide high-confidence filtering', () => {
      const result = engine.inferType('isValid', 'function');
      const high = engine.getHighConfidenceTypes(result, 0.90);
      expect(high.length).toBeGreaterThan(0);
    });

    it('should provide uncertainty assessment', () => {
      const result = engine.inferType('calculateTax', 'function');
      expect(result.uncertainty).toBeDefined();
      expect(result.uncertainty.length).toBeGreaterThan(0);
    });

    it('should provide AI recommendations', () => {
      const result = engine.inferType('calculateTax', 'function');
      expect(result.recommendation).toBeDefined();
      expect(result.recommendation.length).toBeGreaterThan(0);
    });

    it('should handle inferTypes end-to-end', () => {
      const code = `
        function test() {
          const x = 1;
          const email = 'test@example.com';
        }
      `;
      const result = engine.inferTypes('test', code);

      expect(result.signature.confidence).toBeGreaterThanOrEqual(0.0);
      expect(result.variables).toBeDefined();
      expect(Array.isArray(result.variables)).toBe(true);
    });
  });
});
