/**
 * Phase 1 Task 1.3: Extended Type Inference Tests
 *
 * STRONGER VALIDATION - Tests for accuracy and edge cases
 * Previously, tests only checked if types existed.
 * Now we validate CORRECTNESS of type inference.
 */

import { TypeInferenceEngine } from '../src/analyzer/type-inference';

describe('Phase 1 Task 1.3: Type Inference Engine (Extended)', () => {
  let engine: TypeInferenceEngine;

  beforeEach(() => {
    engine = new TypeInferenceEngine();
  });

  /**
   * Test: String concatenation detection
   * Previous bug: "hello" + "world" was inferred as number
   */
  test('correctly infer string concatenation', () => {
    const type1 = engine.inferExpressionType('"hello" + "world"');
    expect(type1).toBe('string');

    const type2 = engine.inferExpressionType('"text" + variable');
    expect(type2).toBe('string');

    // NOT number!
    expect(type1).not.toBe('number');
  });

  /**
   * Test: Distinguish string concatenation from number addition
   */
  test('distinguish string concatenation from number addition', () => {
    // String concatenation
    const strType = engine.inferExpressionType('"a" + "b"');
    expect(strType).toBe('string');

    // Number addition
    const numType = engine.inferExpressionType('10 + 5');
    expect(numType).toBe('number');

    // These should be different!
    expect(strType).not.toBe(numType);
  });

  /**
   * Test: Mixed expressions (string + variable)
   */
  test('infer type for mixed expressions', () => {
    const type1 = engine.inferExpressionType('"prefix_" + name');
    expect(type1).toBe('string');

    const type2 = engine.inferExpressionType('100 + value');
    expect(type2).toBe('any'); // Uncertain without variable info
  });

  /**
   * Test: Other arithmetic operators (should be number)
   */
  test('infer number from -, *, / operators', () => {
    expect(engine.inferExpressionType('10 - 5')).toBe('number');
    expect(engine.inferExpressionType('10 * 5')).toBe('number');
    expect(engine.inferExpressionType('10 / 5')).toBe('number');
    expect(engine.inferExpressionType('10 % 3')).toBe('number');
  });

  /**
   * Test: Parameter type inference accuracy
   */
  test('accurately infer parameter types from usage', () => {
    const body1 = 'return arr[0] + arr[1]';
    const types1 = engine.inferParamTypes(['arr'], body1);
    expect(types1.get('arr')).toBe('array');

    const body2 = 'return str.length + 5';
    const types2 = engine.inferParamTypes(['str'], body2);
    expect(types2.get('str')).toBe('string');

    const body3 = 'return x * y';
    const types3 = engine.inferParamTypes(['x', 'y'], body3);
    expect(types3.get('x')).toBe('number');
    expect(types3.get('y')).toBe('number');
  });

  /**
   * Test: Return type from comparison
   */
  test('infer boolean return type from comparison', () => {
    const type1 = engine.inferReturnType('return x > 5');
    expect(type1).toBe('bool');

    const type2 = engine.inferReturnType('return x == y');
    expect(type2).toBe('bool');

    const type3 = engine.inferReturnType('return x && y');
    expect(type3).toBe('bool');
  });

  /**
   * Test: Return type from arithmetic
   */
  test('infer number return type from arithmetic', () => {
    const type1 = engine.inferReturnType('return x + y');
    expect(type1).not.toBe('string'); // NOT string!
    expect(type1).toBe('any'); // Uncertain without context

    const type2 = engine.inferReturnType('return 10 - 5');
    expect(type2).toBe('number');

    const type3 = engine.inferReturnType('result = x * y\nreturn result');
    expect(type3).toBe('number');
  });

  /**
   * Test: Array detection from literals
   */
  test('detect array types from literals and operations', () => {
    const type1 = engine.inferExpressionType('[1, 2, 3]');
    expect(type1).toBe('array');

    const type2 = engine.inferExpressionType('arr.map(x => x + 1)');
    expect(type2).toBe('array');

    const type3 = engine.inferExpressionType('arr.filter(x => x > 0)');
    expect(type3).toBe('array');
  });

  /**
   * Test: Type conflicts (no overwriting)
   */
  test('handle multiple method calls correctly', () => {
    // If both array and string methods appear, prefer the called one
    const body = 'result = arr.map(x => x).length';
    const types = engine.inferParamTypes(['arr'], body);
    // arr.map indicates array, but .length is called on result
    // So arr should be array
    expect(types.get('arr')).toBe('array');
  });

  /**
   * Test: Edge case - empty expression
   */
  test('handle edge cases gracefully', () => {
    const type1 = engine.inferExpressionType('');
    expect(type1).toBe('any');

    const type2 = engine.inferExpressionType('x');
    expect(type2).toBe('any');
  });

  /**
   * Test: Complex nested operations
   */
  test('infer types from complex expressions', () => {
    const type1 = engine.inferExpressionType('arr.map(x => x * 2)');
    expect(type1).toBe('array'); // .map returns array

    const type2 = engine.inferExpressionType('str.substring(0, 5).toUpperCase()');
    expect(type2).toBe('string');

    const type3 = engine.inferExpressionType('arr.filter(x => x > 5)');
    expect(type3).toBe('array'); // .filter returns array
  });

  /**
   * Test: Token inference accuracy
   */
  test('infer types from token stream correctly', () => {
    const tokens = ['x', '=', '10', 'y', '=', '"text"'];
    const types = engine.inferFromTokens(tokens);

    const xType = types.find(t => t.name === 'x');
    expect(xType?.type).toBe('number');

    const yType = types.find(t => t.name === 'y');
    expect(yType?.type).toBe('string');

    // Test explicit type annotation
    const tokens2 = ['z', ':', 'array'];
    const types2 = engine.inferFromTokens(tokens2);
    const zType = types2.find(t => t.name === 'z');
    expect(zType?.type).toBe('array');
  });

  /**
   * Test: Confidence scores
   */
  test('assign confidence scores appropriately', () => {
    const types = engine.inferFromTokens(['x', ':', 'number']);
    const explicitType = types.find(t => t.name === 'x');

    // Explicit type annotation should have high confidence
    expect(explicitType?.confidence).toBe(1.0);
    expect(explicitType?.source).toBe('explicit');
  });

  /**
   * Test: Type accuracy summary
   */
  test('validate overall type inference accuracy', () => {
    // String operations
    expect(engine.inferExpressionType('"hello"')).toBe('string');
    expect(engine.inferExpressionType('"a" + "b"')).toBe('string');

    // Number operations
    expect(engine.inferExpressionType('5')).toBe('number');
    expect(engine.inferExpressionType('10 + 5')).toBe('number');
    expect(engine.inferExpressionType('10 - 5')).toBe('number');

    // Array operations
    expect(engine.inferExpressionType('[1, 2, 3]')).toBe('array');
    expect(engine.inferExpressionType('arr.map(x => x)')).toBe('array');

    // Boolean operations
    expect(engine.inferExpressionType('x > 5')).toBe('bool');
    expect(engine.inferExpressionType('x == y')).toBe('bool');
  });
});
