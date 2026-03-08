/**
 * Phase 1 Task 1.3: Type Inference Engine Test
 *
 * Tests for automatic type inference:
 * - Function parameter types
 * - Return value types
 * - Variable assignment types
 * - Expression types
 * - Context-based inference (for loops, etc.)
 */

import { TypeInferenceEngine } from '../src/analyzer/type-inference';

describe('Phase 1 Task 1.3: Type Inference Engine', () => {
  let engine: TypeInferenceEngine;

  beforeEach(() => {
    engine = new TypeInferenceEngine();
  });

  /**
   * Test 1: Infer number type from literal
   */
  test('infer number type from assignment', () => {
    const tokens = ['x', '=', '5'];
    const inferred = engine.inferFromTokens(tokens);

    expect(inferred.length).toBeGreaterThan(0);
    expect(inferred[0].name).toBe('x');
    expect(inferred[0].type).toBe('number');
    expect(inferred[0].source).toBe('inferred');
  });

  /**
   * Test 2: Infer string type
   */
  test('infer string type from string literal', () => {
    const tokens = ['message', '=', '"hello"'];
    const inferred = engine.inferFromTokens(tokens);

    expect(inferred.length).toBeGreaterThan(0);
    expect(inferred[0].type).toBe('string');
  });

  /**
   * Test 3: Infer boolean type
   */
  test('infer bool type from boolean literal', () => {
    const tokens = ['flag', '=', 'true'];
    const inferred = engine.inferFromTokens(tokens);

    expect(inferred.length).toBeGreaterThan(0);
    const boolVar = inferred.find(inf => inf.type === 'bool');
    expect(boolVar).toBeDefined();
  });

  /**
   * Test 4: Explicit type annotation
   */
  test('recognize explicit type annotation', () => {
    const tokens = ['x', ':', 'number'];
    const inferred = engine.inferFromTokens(tokens);

    expect(inferred.length).toBeGreaterThan(0);
    expect(inferred[0].confidence).toBe(1.0);
    expect(inferred[0].source).toBe('explicit');
  });

  /**
   * Test 5: For loop variable inference
   */
  test('infer loop variable type from for loop', () => {
    const tokens = ['for', 'i', 'in', '0..10'];
    const inferred = engine.inferFromTokens(tokens);

    expect(inferred.length).toBeGreaterThan(0);
    const loopVar = inferred.find(inf => inf.name === 'i');
    expect(loopVar).toBeDefined();
    expect(loopVar?.type).toBe('number');
    expect(loopVar?.source).toBe('context');
  });

  /**
   * Test 6: Return type inference from arithmetic operations
   */
  test('infer return type from arithmetic operations', () => {
    const body = `temp = x * 2
result = temp + y
return result`;

    const returnType = engine.inferReturnType(body);
    expect(returnType).toBe('number');
  });

  /**
   * Test 7: Return type inference from array operations
   */
  test('infer return type from array methods', () => {
    const body = `result = arr.map(x => x * 2)
return result`;

    const returnType = engine.inferReturnType(body);
    expect(returnType).toBe('array');
  });

  /**
   * Test 8: Return type inference from boolean operations
   */
  test('infer return type from comparison operations', () => {
    const body = `return x > 5`;

    const returnType = engine.inferReturnType(body);
    expect(returnType).toBe('bool');
  });

  /**
   * Test 9: Parameter type inference - array parameter
   */
  test('infer parameter type - array detection', () => {
    const params = ['arr'];
    const body = `result = arr[0]
sum = sum + arr[1]`;

    const types = engine.inferParamTypes(params, body);

    expect(types.get('arr')).toBe('array');
  });

  /**
   * Test 10: Parameter type inference - number parameter
   */
  test('infer parameter type - number from arithmetic', () => {
    const params = ['x'];
    const body = `result = x + 5
y = x * 2`;

    const types = engine.inferParamTypes(params, body);

    expect(types.get('x')).toBe('number');
  });

  /**
   * Test 11: Parameter type inference - string parameter
   */
  test('infer parameter type - string from string methods', () => {
    const params = ['str'];
    const body = `len = str.length
sub = str.substring(0, 5)`;

    const types = engine.inferParamTypes(params, body);

    expect(types.get('str')).toBe('string');
  });

  /**
   * Test 12: Expression type inference - number
   */
  test('infer expression type - number arithmetic', () => {
    const type = engine.inferExpressionType('10 + 5');
    expect(type).toBe('number');
  });

  /**
   * Test 13: Expression type inference - array
   */
  test('infer expression type - array literal', () => {
    const type = engine.inferExpressionType('[1, 2, 3]');
    expect(type).toBe('array');
  });

  /**
   * Test 14: Expression type inference - string
   */
  test('infer expression type - string literal', () => {
    const type = engine.inferExpressionType('"hello world"');
    expect(type).toBe('string');
  });

  /**
   * Test 15: Expression type inference - boolean
   */
  test('infer expression type - boolean comparison', () => {
    const type = engine.inferExpressionType('x > 5');
    expect(type).toBe('bool');
  });

  /**
   * Test 16: Register and retrieve function signature
   */
  test('register and retrieve function signature', () => {
    const params = [
      { name: 'x', type: 'number', confidence: 1.0, source: 'explicit' as const },
      { name: 'y', type: 'number', confidence: 1.0, source: 'explicit' as const },
    ];

    engine.registerFunction('add', params, 'number');
    const context = engine.getContext();

    const fn = context.functions.get('add');
    expect(fn).toBeDefined();
    expect(fn?.params.length).toBe(2);
    expect(fn?.returns).toBe('number');
  });

  /**
   * Test 17: Generate type annotation
   */
  test('generate type annotation with high confidence', () => {
    const annotation = engine.generateTypeAnnotation('x', 'number', 0.95);

    expect(annotation).toContain('x');
    expect(annotation).toContain('number');
  });

  /**
   * Test 18: Multiple parameter type inference
   */
  test('infer types for multiple parameters', () => {
    const params = ['arr', 'x', 'str'];
    const body = `arr[0] = x + 5
len = str.length`;

    const types = engine.inferParamTypes(params, body);

    expect(types.get('arr')).toBe('array');
    expect(types.get('x')).toBe('number');
    expect(types.get('str')).toBe('string');
  });

  /**
   * Test 19: Reset context
   */
  test('reset inference context', () => {
    engine.registerFunction('test', [], 'number');
    let context = engine.getContext();
    expect(context.functions.size).toBeGreaterThan(0);

    engine.reset();
    context = engine.getContext();
    expect(context.functions.size).toBe(0);
    expect(context.variables.size).toBe(0);
  });

  /**
   * Test 20: Merge types
   */
  test('merge compatible types', () => {
    const merged = engine.mergeTypes('number', 'number', 'number');
    expect(merged).toBe('number');
  });

  /**
   * Test 21: Merge incompatible types (union)
   */
  test('merge incompatible types to union', () => {
    const merged = engine.mergeTypes('number', 'string');
    expect(merged).toContain('|');
  });

  /**
   * Performance Test: Infer types from large token stream
   */
  test('infer types from large token stream efficiently', () => {
    const tokens: string[] = [];
    for (let i = 0; i < 100; i++) {
      tokens.push(`x${i}`, '=', `${i}`);
    }

    const start = performance.now();
    const inferred = engine.inferFromTokens(tokens);
    const elapsed = performance.now() - start;

    expect(inferred.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(50); // Should complete in < 50ms
  });
});
