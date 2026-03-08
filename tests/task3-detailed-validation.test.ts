/**
 * Task 1.3 Deep Validation - Type Inference Accuracy
 * Tests actual correctness, not just "pass/fail"
 */

import { TypeInferenceEngine } from '../src/analyzer/type-inference';

describe('Task 1.3 Deep Validation - Type Inference Accuracy', () => {
  let engine: TypeInferenceEngine;

  beforeEach(() => {
    engine = new TypeInferenceEngine();
  });

  // ===== Test Group 1: Basic Type Inference =====

  test('ACCURACY: inferTypeFromValue - number literal', () => {
    const type = engine.inferExpressionType('42');
    console.log('Input: 42 → Type:', type);
    expect(type).toBe('number');
  });

  test('ACCURACY: inferTypeFromValue - string literal', () => {
    const type = engine.inferExpressionType('"hello"');
    console.log('Input: "hello" → Type:', type);
    expect(type).toBe('string');
  });

  test('ACCURACY: inferTypeFromValue - string concatenation (PROBLEM TEST)', () => {
    // This is a known problem: string concatenation uses + operator
    // but the engine might confuse it with arithmetic
    const expr = '"hello" + "world"';
    const type = engine.inferExpressionType(expr);
    console.log('Input:', expr, '→ Type:', type);
    
    // Should be 'string', but regex might detect '+' and think it's number
    // This tests if the engine handles string operations correctly
    expect(type).toBe('string');
  });

  test('ACCURACY: inferTypeFromValue - number arithmetic', () => {
    const type = engine.inferExpressionType('5 + 3');
    console.log('Input: 5 + 3 → Type:', type);
    expect(type).toBe('number');
  });

  test('ACCURACY: inferTypeFromValue - array literal', () => {
    const type = engine.inferExpressionType('[1, 2, 3]');
    console.log('Input: [1, 2, 3] → Type:', type);
    expect(type).toBe('array');
  });

  test('ACCURACY: inferTypeFromValue - boolean literal', () => {
    const type = engine.inferExpressionType('true');
    console.log('Input: true → Type:', type);
    expect(type).toBe('bool');
  });

  test('ACCURACY: inferTypeFromValue - comparison', () => {
    const type = engine.inferExpressionType('5 > 3');
    console.log('Input: 5 > 3 → Type:', type);
    expect(type).toBe('bool');
  });

  // ===== Test Group 2: Return Type Inference =====

  test('ACCURACY: inferReturnType - arithmetic with string (EDGE CASE)', () => {
    const body = `
      x = "hello"
      return x + " world"
    `;
    const type = engine.inferReturnType(body);
    console.log('Body with string concat → Return type:', type);
    
    // Should be 'string' because of string methods detection
    // But might be 'number' if + operator is checked first
    expect(type).toBe('string');
  });

  test('ACCURACY: inferReturnType - boolean operations', () => {
    const body = `
      x = 5
      y = 3
      return x > y && y < 10
    `;
    const type = engine.inferReturnType(body);
    console.log('Logical AND operation → Return type:', type);
    expect(type).toBe('bool');
  });

  test('ACCURACY: inferReturnType - array methods', () => {
    const body = `
      arr = [1, 2, 3]
      return arr.map(x => x * 2)
    `;
    const type = engine.inferReturnType(body);
    console.log('Array.map() → Return type:', type);
    expect(type).toBe('array');
  });

  // ===== Test Group 3: Parameter Type Inference =====

  test('ACCURACY: inferParamTypes - array parameter (accurate detection)', () => {
    const paramNames = ['arr'];
    const body = `
      result = arr[0]
      return result + arr[1]
    `;
    const types = engine.inferParamTypes(paramNames, body);
    console.log('Array access pattern → arr type:', types.get('arr'));
    expect(types.get('arr')).toBe('array');
  });

  test('ACCURACY: inferParamTypes - mixed operations (TYPE OVERWRITE BUG)', () => {
    const paramNames = ['data'];
    const body = `
      // First: data looks like array (indexing)
      x = data[0]
      // Then: data looks like number (arithmetic)
      y = data + 5
    `;
    const types = engine.inferParamTypes(paramNames, body);
    console.log('Mixed array + arithmetic → data type:', types.get('data'));
    
    // Bug: If array check happens first, then arithmetic overwrites it
    // Expected: 'array' (first detection should win)
    // Actual: might be 'number' (last detection overwrites)
    console.log('  (Testing for type overwrite bug)');
  });

  test('ACCURACY: inferParamTypes - string parameter', () => {
    const paramNames = ['text'];
    const body = `
      len = text.length
      upper = text.concat("_suffix")
    `;
    const types = engine.inferParamTypes(paramNames, body);
    console.log('String method pattern → text type:', types.get('text'));
    expect(types.get('text')).toBe('string');
  });

  // ===== Test Group 4: Complex Scenarios =====

  test('ACCURACY: inferFromTokens - variable assignment with inference', () => {
    const tokens = ['x', '=', '42'];
    const inferred = engine.inferFromTokens(tokens);
    console.log('Tokens [x, =, 42] → Inferred:', inferred);
    
    expect(inferred.length).toBeGreaterThan(0);
    if (inferred[0]) {
      expect(inferred[0].type).toBe('number');
      expect(inferred[0].name).toBe('x');
      expect(inferred[0].confidence).toBeGreaterThan(0.7);
    }
  });

  test('ACCURACY: inferFromTokens - for loop variable', () => {
    const tokens = ['for', 'i', 'in', '0..10'];
    const inferred = engine.inferFromTokens(tokens);
    console.log('Tokens [for, i, in, 0..10] → Loop var:', inferred);
    
    const loopVar = inferred.find(t => t.name === 'i');
    expect(loopVar).toBeDefined();
    if (loopVar) {
      expect(loopVar.type).toBe('number');
      expect(loopVar.source).toBe('context');
    }
  });

  test('ACCURACY: inferFromTokens - type annotation', () => {
    const tokens = ['x', ':', 'string'];
    const inferred = engine.inferFromTokens(tokens);
    console.log('Tokens [x, :, string] → Annotation:', inferred);
    
    const typeAnnotation = inferred.find(t => t.name === 'x');
    expect(typeAnnotation).toBeDefined();
    if (typeAnnotation) {
      expect(typeAnnotation.type).toBe('string');
      expect(typeAnnotation.confidence).toBe(1.0);
      expect(typeAnnotation.source).toBe('explicit');
    }
  });

  // ===== Test Group 5: Known Issues =====

  test('ISSUE: String + String might be detected as number (regex problem)', () => {
    // This is a known issue: the regex [+\-*/%] catches + for arithmetic
    // but doesn't distinguish between string concat and number addition
    const expr = 'str1 + str2';
    const type = engine.inferExpressionType(expr);
    console.log('ISSUE - Input: str1 + str2 → Type:', type);
    console.log('  Expected: unknown or string, but might be: number');
    
    // This test documents the bug
    // The actual behavior will show if it's broken
  });

  test('ISSUE: Array method in middle of code might return wrong type', () => {
    // If arithmetic is checked before array methods, first operator wins
    const body = `
      x = data + 5
      y = data.map(x => x * 2)
      return y
    `;
    const type = engine.inferReturnType(body);
    console.log('ISSUE - Multiple operations → Return type:', type);
    console.log('  Expected: array (explicit return), Actual:', type);
  });

  test('CONFIDENCE: Low confidence for uncertain types', () => {
    const tokens = ['x', '=', 'unknown_var'];
    const inferred = engine.inferFromTokens(tokens);
    console.log('Uncertain value → Confidence:', inferred[0]?.confidence);
    
    // If value doesn't match any pattern, what confidence is returned?
    if (inferred.length > 0) {
      expect(typeof inferred[0].confidence).toBe('number');
    }
  });
});
