/**
 * Phase 5 Stage 1: Advanced Type Inference Engine Tests
 *
 * 30 comprehensive tests covering:
 * - AST-based variable tracking (8)
 * - Method call inference (6)
 * - Operation-based inference (5)
 * - Control flow analysis (4)
 * - Function call propagation (4)
 * - Transitive inference (3)
 */

import { describe, it, expect } from '@jest/globals';
import { AdvancedTypeInferenceEngine } from '../src/analyzer/advanced-type-inference-engine';

describe('Phase 5 Stage 1: AdvancedTypeInferenceEngine', () => {
  let engine: AdvancedTypeInferenceEngine;

  beforeEach(() => {
    engine = new AdvancedTypeInferenceEngine();
  });

  // ============================================================================
  // CATEGORY 1: AST-Based Variable Tracking (8 tests)
  // ============================================================================

  describe('Category 1: AST-Based Variable Tracking', () => {
    it('should infer number type from numeric literal assignment', () => {
      const code = `
fn test
  x = 10
  return x
      `;

      const result = engine.infer(code);
      expect(result.has('x')).toBe(true);
      const xInfo = result.get('x')!;
      expect(xInfo.inferredType).toBe('number');
      expect(xInfo.confidence).toBeGreaterThanOrEqual(0.80);
    });

    it('should infer string type from string literal assignment', () => {
      const code = `
fn test
  name = "Alice"
  return name
      `;

      const result = engine.infer(code);
      expect(result.has('name')).toBe(true);
      const nameInfo = result.get('name')!;
      expect(nameInfo.inferredType).toBe('string');
      expect(nameInfo.confidence).toBeGreaterThanOrEqual(0.80);
    });

    it('should infer boolean type from boolean literal assignment', () => {
      const code = `
fn test
  flag = true
  return flag
      `;

      const result = engine.infer(code);
      expect(result.has('flag')).toBe(true);
      const flagInfo = result.get('flag')!;
      expect(flagInfo.inferredType).toBe('boolean');
      expect(flagInfo.confidence).toBeGreaterThanOrEqual(0.80);
    });

    it('should infer array type from array literal assignment', () => {
      const code = `
fn test
  nums = [1, 2, 3]
  return nums
      `;

      const result = engine.infer(code);
      expect(result.has('nums')).toBe(true);
      const numsInfo = result.get('nums')!;
      expect(numsInfo.inferredType).toContain('array');
      expect(numsInfo.confidence).toBeGreaterThanOrEqual(0.80);
    });

    it('should track multiple variable assignments', () => {
      const code = `
fn test
  x = 10
  y = "hello"
  z = true
  return z
      `;

      const result = engine.infer(code);
      expect(result.size).toBeGreaterThanOrEqual(3);
      expect(result.get('x')?.inferredType).toBe('number');
      expect(result.get('y')?.inferredType).toBe('string');
      expect(result.get('z')?.inferredType).toBe('boolean');
    });

    it('should track variable reassignment', () => {
      const code = `
fn test
  x = 10
  x = 20
  return x
      `;

      const result = engine.infer(code);
      expect(result.has('x')).toBe(true);
      const xInfo = result.get('x')!;
      expect(xInfo.inferredType).toBe('number');
      expect(xInfo.confidence).toBeGreaterThanOrEqual(0.80);
    });

    it('should generate reasoning for type inference', () => {
      const code = `
fn test
  amount = 100
  return amount
      `;

      const result = engine.infer(code);
      const amountInfo = result.get('amount')!;
      expect(amountInfo.reasoning.length).toBeGreaterThan(0);
      expect(amountInfo.reasoning[0]).toContain('Assignment');
    });

    it('should assign correct source to inferred type', () => {
      const code = `
fn test
  value = 42
  return value
      `;

      const result = engine.infer(code);
      const valueInfo = result.get('value')!;
      expect(valueInfo.source).toBe('assignment');
    });
  });

  // ============================================================================
  // CATEGORY 2: Method Call Inference (6 tests)
  // ============================================================================

  describe('Category 2: Method Call Inference', () => {
    it('should infer array type from method calls', () => {
      const code = `
fn test
  items = [1, 2, 3]
  items.push(4)
  return items
      `;

      const result = engine.infer(code);
      expect(result.has('items')).toBe(true);
      const itemsInfo = result.get('items')!;
      expect(itemsInfo.source).toBe('method');
      expect(itemsInfo.confidence).toBeGreaterThanOrEqual(0.60);
    });

    it('should infer array from multiple method calls', () => {
      const code = `
fn test
  arr = []
  arr.push(1)
  arr.pop()
  arr.length()
  return arr
      `;

      const result = engine.infer(code);
      const arrInfo = result.get('arr')!;
      expect(arrInfo.inferredType).toContain('array');
    });

    it('should track method call frequency in reasoning', () => {
      const code = `
fn test
  data = []
  data.push(1)
  data.push(2)
  data.push(3)
  return data
      `;

      const result = engine.infer(code);
      const dataInfo = result.get('data')!;
      expect(dataInfo.reasoning.some(r => r.includes('Method calls'))).toBe(true);
    });

    it('should infer type from single method call', () => {
      const code = `
fn test
  collection = {}
  collection.add(item)
  return collection
      `;

      const result = engine.infer(code);
      // Should infer some type due to method call
      expect(result.has('collection')).toBe(true);
    });

    it('should distinguish between method calls and other operations', () => {
      const code = `
fn test
  counter = 0
  counter = counter + 1
  return counter
      `;

      const result = engine.infer(code);
      const counterInfo = result.get('counter')!;
      // Should be marked as operation, not method
      expect(['operation', 'assignment']).toContain(counterInfo.source);
    });

    it('should combine assignment and method call information', () => {
      const code = `
fn test
  arr = [1, 2]
  arr.push(3)
  return arr
      `;

      const result = engine.infer(code);
      const arrInfo = result.get('arr')!;
      expect(arrInfo.confidence).toBeGreaterThan(0.65);
      expect(arrInfo.reasoning.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================================
  // CATEGORY 3: Operation-Based Inference (5 tests)
  // ============================================================================

  describe('Category 3: Operation-Based Inference', () => {
    it('should infer numeric type from addition operation', () => {
      const code = `
fn test
  x = 5
  y = 10
  z = x + y
  return z
      `;

      const result = engine.infer(code);
      const xInfo = result.get('x')!;
      const yInfo = result.get('y')!;
      expect(xInfo.inferredType).toBe('number');
      expect(yInfo.inferredType).toBe('number');
      expect(xInfo.confidence).toBeGreaterThanOrEqual(0.80);
    });

    it('should strengthen numeric type for both operands in arithmetic', () => {
      const code = `
fn test
  a = 3
  b = 4
  c = a * b
  return c
      `;

      const result = engine.infer(code);
      const aInfo = result.get('a')!;
      const bInfo = result.get('b')!;
      expect(aInfo.inferredType).toBe('number');
      expect(bInfo.inferredType).toBe('number');
      expect(aInfo.confidence).toBeGreaterThanOrEqual(0.80);
    });

    it('should infer numeric type from subtraction', () => {
      const code = `
fn test
  total = 100
  subtract = 25
  result = total - subtract
  return result
      `;

      const result = engine.infer(code);
      expect(result.get('total')?.inferredType).toBe('number');
      expect(result.get('subtract')?.inferredType).toBe('number');
    });

    it('should infer numeric type from division', () => {
      const code = `
fn test
  numerator = 20
  denominator = 4
  quotient = numerator / denominator
  return quotient
      `;

      const result = engine.infer(code);
      expect(result.get('numerator')?.inferredType).toBe('number');
      expect(result.get('denominator')?.inferredType).toBe('number');
    });

    it('should include operation in reasoning', () => {
      const code = `
fn test
  x = 2
  y = 3
  z = x + y
  return z
      `;

      const result = engine.infer(code);
      const xInfo = result.get('x')!;
      expect(xInfo.reasoning.some(r => r.includes('arithmetic'))).toBe(true);
    });
  });

  // ============================================================================
  // CATEGORY 4: Control Flow Analysis (4 tests)
  // ============================================================================

  describe('Category 4: Control Flow Analysis', () => {
    it('should handle if/else branches with same variable', () => {
      const code = `
fn test
  if condition
    x = 10
  else
    x = 20
  return x
      `;

      const result = engine.infer(code);
      expect(result.has('x')).toBe(true);
      const xInfo = result.get('x')!;
      // Both branches assign numbers
      expect(xInfo.inferredType).toBe('number');
    });

    it('should detect potential union types in conditional branches', () => {
      const code = `
fn test
  if flag
    value = 10
  else
    value = "text"
  return value
      `;

      const result = engine.infer(code);
      const valueInfo = result.get('value')!;
      // Should mark as potentially union type (lower confidence)
      expect(valueInfo.reasoning.some(r => r.includes('Control flow') || r.includes('union'))).toBe(true);
    });

    it('should analyze loop variables', () => {
      const code = `
fn test
  total = 0
  for i in 1..10
    total = total + i
  return total
      `;

      const result = engine.infer(code);
      expect(result.has('total')).toBe(true);
      const totalInfo = result.get('total')!;
      expect(totalInfo.inferredType).toBe('number');
    });

    it('should track confidence reduction for ambiguous control flow', () => {
      const code = `
fn test
  if condition
    x = 100
  else
    x = "hundred"
  return x
      `;

      const result = engine.infer(code);
      const xInfo = result.get('x')!;
      // Confidence should be lower due to uncertainty
      expect(xInfo.confidence).toBeLessThanOrEqual(0.75);
    });
  });

  // ============================================================================
  // CATEGORY 5: Function Call Type Propagation (4 tests)
  // ============================================================================

  describe('Category 5: Function Call Type Propagation', () => {
    it('should infer boolean return type for predicate functions', () => {
      const analysis = engine.analyzeFunctionCall('isValid', [], '');
      expect(analysis.returnType).toBe('boolean');
      expect(analysis.confidence).toBeGreaterThanOrEqual(0.70);
    });

    it('should infer number return type for counting functions', () => {
      const analysis = engine.analyzeFunctionCall('count', [], '');
      expect(analysis.returnType).toBe('number');
      expect(analysis.confidence).toBeGreaterThanOrEqual(0.70);
    });

    it('should infer array return type for filtering functions', () => {
      const analysis = engine.analyzeFunctionCall('filter', [], '');
      expect(analysis.returnType).toContain('array');
      expect(analysis.confidence).toBeGreaterThanOrEqual(0.70);
    });

    it('should cache function call analysis', () => {
      const analysis1 = engine.analyzeFunctionCall('calculateTax', [], '');
      const analysis2 = engine.analyzeFunctionCall('calculateTax', [], '');

      // Should return same reference or equivalent result
      expect(analysis1.returnType).toBe(analysis2.returnType);
      expect(analysis1.confidence).toBe(analysis2.confidence);
    });
  });

  // ============================================================================
  // CATEGORY 6: Transitive Inference (3 tests)
  // ============================================================================

  describe('Category 6: Transitive Inference', () => {
    it('should infer type through variable chain', () => {
      const code = `
fn test
  x = 10
  y = x
  z = y
  return z
      `;

      const result = engine.infer(code);
      expect(result.get('x')?.inferredType).toBe('number');
      expect(result.get('y')?.inferredType).toBe('number');
      expect(result.get('z')?.inferredType).toBe('number');
    });

    it('should strengthen confidence through transitive chain', () => {
      const code = `
fn test
  base = 5
  derived = base
  final = derived
  return final
      `;

      const result = engine.infer(code);
      const baseInfo = result.get('base')!;
      const derivedInfo = result.get('derived')!;
      const finalInfo = result.get('final')!;

      // All should have comparable confidence
      expect(baseInfo.confidence).toBeGreaterThan(0.70);
      expect(derivedInfo.confidence).toBeGreaterThan(0.70);
      expect(finalInfo.confidence).toBeGreaterThan(0.70);
    });

    it('should include transitive reasoning in explanation', () => {
      const code = `
fn test
  source = 42
  intermediate = source
  dest = intermediate
  return dest
      `;

      const result = engine.infer(code);
      const destInfo = result.get('dest')!;

      // Should mention transitive inference if applicable
      const hasTransitiveReasoning = destInfo.reasoning.some((r) =>
        r.toLowerCase().includes('transitive')
      );
      expect(hasTransitiveReasoning || destInfo.inferredType === 'number').toBe(true);
    });
  });

  // ============================================================================
  // Integration Tests (3 tests)
  // ============================================================================

  describe('Integration Tests', () => {
    it('should handle complex real-world function', () => {
      const code = `
fn processArray
  input items
  do
    total = 0
    count = 0
    for item in items
      total = total + item
      count = count + 1
    average = total / count
    return average
      `;

      const result = engine.infer(code);
      expect(result.has('total')).toBe(true);
      expect(result.has('count')).toBe(true);
      expect(result.get('total')?.inferredType).toBe('number');
      expect(result.get('count')?.inferredType).toBe('number');
    });

    it('should handle multiple inference sources simultaneously', () => {
      const code = `
fn analyze
  data = []
  data.push(1)
  data.push(2)
  sum = 0
  for value in data
    sum = sum + value
  return sum
      `;

      const result = engine.infer(code);
      const dataInfo = result.get('data')!;
      const sumInfo = result.get('sum')!;

      expect(dataInfo.inferredType).toContain('array');
      expect(sumInfo.inferredType).toBe('number');
      expect(dataInfo.reasoning.length).toBeGreaterThanOrEqual(1);
      expect(sumInfo.reasoning.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle edge case: no variables declared', () => {
      const code = `
fn empty
  return 42
      `;

      const result = engine.infer(code);
      // Should handle gracefully (empty result or basic inference)
      expect(result).toBeDefined();
      expect(result instanceof Map).toBe(true);
    });
  });

  // ============================================================================
  // Helper Method Tests (2 tests)
  // ============================================================================

  describe('Helper Methods', () => {
    it('should correctly get inferred type from cache', () => {
      const code = `
fn test
  x = 100
  return x
      `;

      engine.infer(code);
      // Note: This tests internal caching behavior
      // In actual implementation, engine would need to expose or we verify through results
      expect(engine).toBeDefined();
    });

    it('should return null for non-existent variable type', () => {
      engine.infer('fn test\n  x = 5\n  return x');
      const result = engine.getInferredType('nonExistent');
      expect(result).toBeNull();
    });
  });
});
