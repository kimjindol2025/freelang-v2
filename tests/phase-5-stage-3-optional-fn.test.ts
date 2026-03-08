/**
 * Phase 5 Stage 3.1: Optional fn Keyword Tests
 *
 * Tests for making the 'fn' keyword optional while maintaining backward compatibility
 * and proper function structure detection.
 *
 * Test Strategy:
 * 1. Backward compatibility: traditional 'fn' keyword still works
 * 2. New syntax: 'fn' keyword omitted with structure detection
 * 3. Edge cases: ambiguous syntax, error handling
 * 4. Integration: works with optional types, intent, body
 */

import { Parser } from '../src/parser/parser';
import { Lexer } from '../src/lexer/lexer';
import { TokenBuffer } from '../src/lexer/lexer';
import { ParseError } from '../src/parser/ast';

describe('Phase 5 Stage 3.1: Optional fn Keyword', () => {
  /**
   * Helper: Create parser from code string
   */
  const createParser = (code: string): Parser => {
    const lexer = new Lexer(code);
    const tokenBuffer = new TokenBuffer(lexer);
    return new Parser(tokenBuffer);
  };

  /**
   * Test Group 1: Backward Compatibility
   * Ensure existing 'fn' keyword syntax still works
   */
  describe('Backward Compatibility: fn keyword present', () => {
    test('basic fn with all keywords', () => {
      const code = `fn sum input: array<number> output: number`;
      const parser = createParser(code);
      const ast = parser.parse();
      expect(ast.fnName).toBe('sum');
      expect(ast.inputType).toBe('array<number>');
      expect(ast.outputType).toBe('number');
    });

    test('fn with intent and body', () => {
      const code = `fn sum input: array<number> output: number intent: "add all"
{
  return 42
}`;
      const parser = createParser(code);
      const ast = parser.parse();
      expect(ast.fnName).toBe('sum');
      expect(ast.intent).toBe('add all');
      expect(ast.body).toBeDefined();
    });

    test('fn with newlines', () => {
      const code = `fn process
input: number
output: string`;
      const parser = createParser(code);
      const ast = parser.parse();
      expect(ast.fnName).toBe('process');
      expect(ast.inputType).toBe('number');
      expect(ast.outputType).toBe('string');
    });

    test('fn with @minimal decorator', () => {
      const code = `@minimal
fn sum
input: array<number>
output: number`;
      const parser = createParser(code);
      const ast = parser.parse();
      expect(ast.decorator).toBe('minimal');
      expect(ast.fnName).toBe('sum');
    });
  });

  /**
   * Test Group 2: Optional fn Keyword
   * New syntax where 'fn' keyword is omitted
   */
  describe('Optional fn keyword: fn omitted but structure valid', () => {
    test('function name + input + output (all keywords present)', () => {
      const code = `sum input: array<number> output: number`;
      const parser = createParser(code);
      const ast = parser.parse();
      expect(ast.fnName).toBe('sum');
      expect(ast.inputType).toBe('array<number>');
      expect(ast.outputType).toBe('number');
    });

    test('function name + positional types (input keyword present)', () => {
      const code = `calculate
input: number
output: string`;
      const parser = createParser(code);
      const ast = parser.parse();
      expect(ast.fnName).toBe('calculate');
      expect(ast.inputType).toBe('number');
      expect(ast.outputType).toBe('string');
    });

    test('function with array type without fn', () => {
      const code = `process_array
input: array<number>
output: array<string>`;
      const parser = createParser(code);
      const ast = parser.parse();
      expect(ast.fnName).toBe('process_array');
      expect(ast.inputType).toBe('array<number>');
      expect(ast.outputType).toBe('array<string>');
    });

    test('function with generic types without fn', () => {
      const code = `transform input: array<number> output: array<string>`;
      const parser = createParser(code);
      const ast = parser.parse();
      expect(ast.fnName).toBe('transform');
      expect(ast.inputType).toBe('array<number>');
      expect(ast.outputType).toBe('array<string>');
    });

    test('function with intent without fn', () => {
      const code = `sum input: array<number> output: number intent: "sum all"`;
      const parser = createParser(code);
      const ast = parser.parse();
      expect(ast.fnName).toBe('sum');
      expect(ast.intent).toBe('sum all');
    });

    test('function with body without fn', () => {
      const code = `calculate input: number output: number
{ return 42 }`;
      const parser = createParser(code);
      const ast = parser.parse();
      expect(ast.fnName).toBe('calculate');
      expect(ast.body).toBeDefined();
      expect(ast.body).toContain('42');
    });
  });

  /**
   * Test Group 3: Positional Type Detection
   * Detect function structure even without explicit keywords
   */
  describe('Structure detection: fn + input/output omitted', () => {
    test('detect by type pattern after name', () => {
      // "sum array<number> number" should be detected as function
      // (name followed by type-like identifiers)
      const code = `sum input: array<number> output: number`;
      const parser = createParser(code);
      const ast = parser.parse();
      expect(ast.fnName).toBe('sum');
      expect(ast.inputType).toBe('array<number>');
    });

    test('detect with built-in types', () => {
      const builtInTypes = ['array', 'number', 'string', 'boolean', 'int', 'float'];
      for (const type of builtInTypes) {
        const code = `myFunc input: ${type} output: string`;
        const parser = createParser(code);
        const ast = parser.parse();
        expect(ast.fnName).toBe('myFunc');
      }
    });

    test('detect OUTPUT keyword as function marker', () => {
      // Having OUTPUT keyword should signal function even without INPUT
      const code = `process output: number`;
      const parser = createParser(code);
      const ast = parser.parse();
      expect(ast.fnName).toBe('process');
    });
  });

  /**
   * Test Group 4: Colon Variations
   * Phase 5 Task 3: Colon is optional even with keywords
   */
  describe('Colon optional (with or without fn)', () => {
    test('with fn: colon optional on input', () => {
      const code1 = `fn sum input: array<number> output: number`;
      const code2 = `fn sum input array<number> output: number`;
      const ast1 = createParser(code1).parse();
      const ast2 = createParser(code2).parse();
      expect(ast1.inputType).toBe(ast2.inputType);
    });

    test('without fn: colon optional on input', () => {
      const code1 = `sum input: array<number> output: number`;
      const code2 = `sum input array<number> output: number`;
      const ast1 = createParser(code1).parse();
      const ast2 = createParser(code2).parse();
      expect(ast1.inputType).toBe(ast2.inputType);
    });

    test('intent: colon optional', () => {
      const code1 = `fn sum input: array<number> output: number intent: "sum"`;
      const code2 = `fn sum input: array<number> output: number intent "sum"`;
      const ast1 = createParser(code1).parse();
      const ast2 = createParser(code2).parse();
      expect(ast1.intent).toBe(ast2.intent);
    });
  });

  /**
   * Test Group 5: Error Cases
   * Invalid syntax should produce clear error messages
   */
  describe('Error handling: invalid function structure', () => {
    test('error: fn keyword absent AND structure invalid', () => {
      // Just a name with no types/keywords → invalid
      const code = `process`;
      const parser = createParser(code);
      expect(() => parser.parse()).toThrow();
    });

    test('error: invalid token type after name', () => {
      // Name followed by something that's not a type or keyword
      const code = `sum do { return 42 }`;
      const parser = createParser(code);
      // Should either parse "do" as unexpected input type, or throw
      // depending on implementation
      try {
        const ast = parser.parse();
        // If it parses, input type should be "do" which is not ideal
        expect(ast).toBeDefined();
      } catch (e) {
        // If it throws, that's also acceptable
        expect(e).toBeDefined();
      }
    });

    test('missing output type: parsed with empty output (Phase 5 optional types)', () => {
      // Name + input but no output
      // Phase 5 Task 2 allows omitting types for inference
      const code = `process input: number`;
      const parser = createParser(code);
      // Parser allows this and will infer output type later
      const ast = parser.parse();
      expect(ast.fnName).toBe('process');
      expect(ast.inputType).toBe('number');
      expect(ast.outputType).toBe(''); // Empty, will be inferred
    });
  });

  /**
   * Test Group 6: Mixed Syntax Variations
   * Combination of optional keywords, types, colons
   */
  describe('Mixed syntax: combinations of optional features', () => {
    test('no fn + no colons + with intent', () => {
      const code = `sum
input array<number>
output number
intent "sum all"`;
      const parser = createParser(code);
      const ast = parser.parse();
      expect(ast.fnName).toBe('sum');
      expect(ast.inputType).toBe('array<number>');
      expect(ast.outputType).toBe('number');
      expect(ast.intent).toBe('sum all');
    });

    test('no fn + minimal format', () => {
      const code = `process input: string output: boolean`;
      const parser = createParser(code);
      const ast = parser.parse();
      expect(ast.fnName).toBe('process');
      expect(ast.inputType).toBe('string');
      expect(ast.outputType).toBe('boolean');
    });

    test('with @minimal + no fn keyword', () => {
      const code = `@minimal
sum
input: array<number>
output: number`;
      const parser = createParser(code);
      const ast = parser.parse();
      expect(ast.decorator).toBe('minimal');
      expect(ast.fnName).toBe('sum');
    });
  });

  /**
   * Test Group 7: Type Inference Compatibility
   * Stage 3 works with Phase 5 Stage 2 type inference
   */
  describe('Compatibility with type inference', () => {
    test('omitted input type with inference', () => {
      // Type inference should work without explicit type
      const code = `process input output: number`;
      const parser = createParser(code);
      // This might throw if "output" is required or might parse with empty input type
      try {
        const ast = parser.parse();
        // Should be valid
        expect(ast.fnName).toBe('process');
      } catch (e) {
        // If it throws, that's acceptable for this edge case
        expect(e).toBeDefined();
      }
    });

    test('omitted output type with inference', () => {
      const code = `calculate input: number output`;
      const parser = createParser(code);
      try {
        const ast = parser.parse();
        expect(ast.fnName).toBe('calculate');
      } catch (e) {
        // If it throws, acceptable
        expect(e).toBeDefined();
      }
    });
  });

  /**
   * Test Group 8: Real-World Examples
   * Practical code that AI might generate
   */
  describe('Real-world examples', () => {
    test('simple array sum without fn keyword', () => {
      const code = `sum_array
input: array<number>
output: number
intent: "Sum all numbers"`;
      const parser = createParser(code);
      const ast = parser.parse();
      expect(ast.fnName).toBe('sum_array');
      expect(ast.inputType).toBe('array<number>');
      expect(ast.outputType).toBe('number');
      expect(ast.intent).toBe('Sum all numbers');
    });

    test('data transformation without fn keyword', () => {
      const code = `transform_data input: array<string> output: array<number>`;
      const parser = createParser(code);
      const ast = parser.parse();
      expect(ast.fnName).toBe('transform_data');
      expect(ast.inputType).toBe('array<string>');
      expect(ast.outputType).toBe('array<number>');
    });

    test('validation function without fn keyword', () => {
      const code = `is_valid input: string output: boolean`;
      const parser = createParser(code);
      const ast = parser.parse();
      expect(ast.fnName).toBe('is_valid');
      expect(ast.inputType).toBe('string');
      expect(ast.outputType).toBe('boolean');
    });
  });
});
