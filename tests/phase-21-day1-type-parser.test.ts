/**
 * Phase 21 Day 1: Type Annotation Parser Tests
 * Parse and extract type information from function signatures
 */

import { describe, it, expect } from '@jest/globals';
import { TypeParser, TypedFunction } from '../src/cli/type-parser';

describe('Phase 21 Day 1: Type Annotation Parser', () => {
  // ── Test 1: Parse function with single parameter type ─────
  it('parses function with single parameter type', () => {
    const source = `fn increment(x: number) { return x + 1 }`;
    const parsed = TypeParser.parseTypedFunction(source);

    expect(parsed).not.toBeNull();
    expect(parsed!.name).toBe('increment');
    expect(parsed!.params).toEqual(['x']);
    expect(parsed!.paramTypes).toEqual({ x: 'number' });
    expect(parsed!.returnType).toBeUndefined();
  });

  // ── Test 2: Parse function with multiple parameter types ──
  it('parses function with multiple parameter types', () => {
    const source = `fn add(a: number, b: number) { return a + b }`;
    const parsed = TypeParser.parseTypedFunction(source);

    expect(parsed).not.toBeNull();
    expect(parsed!.params).toEqual(['a', 'b']);
    expect(parsed!.paramTypes).toEqual({ a: 'number', b: 'number' });
  });

  // ── Test 3: Parse function with return type ───────────────
  it('parses function with return type', () => {
    const source = `fn add(a: number, b: number): number { return a + b }`;
    const parsed = TypeParser.parseTypedFunction(source);

    expect(parsed).not.toBeNull();
    expect(parsed!.returnType).toBe('number');
    expect(parsed!.paramTypes).toEqual({ a: 'number', b: 'number' });
  });

  // ── Test 4: Parse function with mixed typed/untyped parameters ─
  it('parses function with mixed typed and untyped parameters', () => {
    const source = `fn process(id: number, name, data: any) { return name }`;
    const parsed = TypeParser.parseTypedFunction(source);

    expect(parsed).not.toBeNull();
    expect(parsed!.params).toEqual(['id', 'name', 'data']);
    expect(parsed!.paramTypes['id']).toBe('number');
    expect(parsed!.paramTypes['data']).toBe('any');
    // name has no type annotation
    expect(parsed!.paramTypes['name']).toBeUndefined();
  });

  // ── Test 5: Parse function without types (backward compat) ──
  it('parses function without types (backward compatible)', () => {
    const source = `fn add(a, b) { return a + b }`;
    const parsed = TypeParser.parseTypedFunction(source);

    expect(parsed).not.toBeNull();
    expect(parsed!.name).toBe('add');
    expect(parsed!.params).toEqual(['a', 'b']);
    expect(Object.keys(parsed!.paramTypes).length).toBe(0);
    expect(parsed!.returnType).toBeUndefined();
  });

  // ── Test 6: Parse array type annotations ─────────────────
  it('parses array type annotations', () => {
    const source = `fn sumArray(arr: array<number>): number { return arr }`;
    const parsed = TypeParser.parseTypedFunction(source);

    expect(parsed).not.toBeNull();
    expect(parsed!.paramTypes['arr']).toBe('array<number>');
    expect(parsed!.returnType).toBe('number');
  });

  // ── Test 7: Parse any/dynamic types ──────────────────────
  it('parses any and dynamic types', () => {
    const source = `fn identity(x: any): any { return x }`;
    const parsed = TypeParser.parseTypedFunction(source);

    expect(parsed).not.toBeNull();
    expect(parsed!.paramTypes['x']).toBe('any');
    expect(parsed!.returnType).toBe('any');
  });

  // ── Test 8: Handle whitespace in type annotations ────────
  it('handles whitespace in type annotations', () => {
    const source = `fn process( a  :  number , b  :  string ) : boolean { return 1 }`;
    const parsed = TypeParser.parseTypedFunction(source);

    expect(parsed).not.toBeNull();
    expect(parsed!.params).toEqual(['a', 'b']);
    expect(parsed!.paramTypes).toEqual({ a: 'number', b: 'string' });
    expect(parsed!.returnType).toBe('boolean');
  });

  // ── Test 9: Extract all parameter types ──────────────────
  it('extracts all parameter types from function', () => {
    const source = `fn calculate(x: number, y: number, z: any)`;
    const paramTypes = TypeParser.getParameterTypes(source);

    expect(paramTypes).toHaveLength(3);
    expect(paramTypes[0]).toEqual({ name: 'x', type: 'number' });
    expect(paramTypes[1]).toEqual({ name: 'y', type: 'number' });
    expect(paramTypes[2]).toEqual({ name: 'z', type: 'any' });
  });

  // ── Test 10: Extract return types correctly ──────────────
  it('extracts return types correctly', () => {
    const tests = [
      { source: `fn getNumber(): number { return 42 }`, expected: 'number' },
      { source: `fn getText(): string { return "hello" }`, expected: 'string' },
      { source: `fn getArray(): array<number> { return [] }`, expected: 'array<number>' },
      { source: `fn get(): any { return 1 }`, expected: 'any' },
      { source: `fn noReturn() { return 1 }`, expected: undefined }
    ];

    for (const test of tests) {
      const parsed = TypeParser.parseTypedFunction(test.source);
      expect(parsed!.returnType).toBe(test.expected);
    }
  });

  // ── Extra Test 11: Parse multiple typed functions ────────
  it('parses multiple typed functions from source', () => {
    const source = `
      fn add(a: number, b: number): number { return a + b }
      fn greet(name: string): string { return "Hello, " + name }
      fn process(data: any): any { return data }
    `;
    const parsed = TypeParser.parseTypedProgram(source);

    expect(parsed).toHaveLength(3);
    expect(parsed[0].name).toBe('add');
    expect(parsed[0].paramTypes).toEqual({ a: 'number', b: 'number' });
    expect(parsed[0].returnType).toBe('number');
    expect(parsed[2].name).toBe('process');
    expect(parsed[2].paramTypes['data']).toBe('any');
  });

  // ── Extra Test 12: Type validation ───────────────────────
  it('validates basic type names', () => {
    expect(TypeParser.isValidType('number')).toBe(true);
    expect(TypeParser.isValidType('string')).toBe(true);
    expect(TypeParser.isValidType('boolean')).toBe(true);
    expect(TypeParser.isValidType('any')).toBe(true);
    expect(TypeParser.isValidType('array<number>')).toBe(true);
    expect(TypeParser.isValidType('array<string>')).toBe(true);
    expect(TypeParser.isValidType('array<array<number>>')).toBe(true);
    expect(TypeParser.isValidType('invalid')).toBe(false);
    expect(TypeParser.isValidType('array<invalid>')).toBe(false);
  });

  // ── Extra Test 13: Type inference ────────────────────────
  it('infers types from literal values', () => {
    expect(TypeParser.inferType(42)).toBe('number');
    expect(TypeParser.inferType('hello')).toBe('string');
    expect(TypeParser.inferType(true)).toBe('boolean');
    expect(TypeParser.inferType([1, 2, 3])).toBe('array<number>');
    expect(TypeParser.inferType(['a', 'b'])).toBe('array<string>');
    expect(TypeParser.inferType([])).toBe('array<any>');
    expect(TypeParser.inferType(null)).toBe('any');
  });

  // ── Extra Test 14: Type compatibility ────────────────────
  it('checks type compatibility for assignment', () => {
    // Exact matches
    expect(TypeParser.areTypesCompatible('number', 'number')).toBe(true);
    expect(TypeParser.areTypesCompatible('string', 'string')).toBe(true);

    // any compatibility
    expect(TypeParser.areTypesCompatible('any', 'number')).toBe(true);
    expect(TypeParser.areTypesCompatible('number', 'any')).toBe(true);

    // array compatibility
    expect(TypeParser.areTypesCompatible('array<number>', 'array<number>')).toBe(true);
    expect(TypeParser.areTypesCompatible('array<number>', 'array<string>')).toBe(false);

    // incompatible types
    expect(TypeParser.areTypesCompatible('number', 'string')).toBe(false);
    expect(TypeParser.areTypesCompatible('string', 'number')).toBe(false);
  });

  // ── Extra Test 15: Complex nested body ───────────────────
  it('parses function with complex nested body', () => {
    const source = `fn complex(a: number, b: number): number {
      if a > b {
        return a * 2
      }
      if b > a {
        return b * 3
      }
      return a + b
    }`;
    const parsed = TypeParser.parseTypedFunction(source);

    expect(parsed).not.toBeNull();
    expect(parsed!.name).toBe('complex');
    expect(parsed!.params).toEqual(['a', 'b']);
    expect(parsed!.paramTypes).toEqual({ a: 'number', b: 'number' });
    expect(parsed!.returnType).toBe('number');
    expect(parsed!.body).toContain('if a > b');
    expect(parsed!.body).toContain('return a * 2');
  });

  // ── Extra Test 16: Parameter type extraction with arrays ──
  it('extracts parameter types with nested array types', () => {
    const source = `fn process(matrix: array<array<number>>): number`;
    const paramTypes = TypeParser.getParameterTypes(source);

    expect(paramTypes).toHaveLength(1);
    expect(paramTypes[0].name).toBe('matrix');
    expect(paramTypes[0].type).toBe('array<array<number>>');
  });

  // ── Extra Test 17: String parameter with quotes ──────────
  it('parses function with string parameter type', () => {
    const source = `fn formatName(first: string, last: string): string { return first + last }`;
    const parsed = TypeParser.parseTypedFunction(source);

    expect(parsed).not.toBeNull();
    expect(parsed!.params).toEqual(['first', 'last']);
    expect(parsed!.paramTypes).toEqual({ first: 'string', last: 'string' });
    expect(parsed!.returnType).toBe('string');
  });

  // ── Extra Test 18: Boolean parameter types ───────────────
  it('parses function with boolean parameter types', () => {
    const source = `fn makeDecision(condition: boolean): string { return "ok" }`;
    const parsed = TypeParser.parseTypedFunction(source);

    expect(parsed).not.toBeNull();
    expect(parsed!.paramTypes['condition']).toBe('boolean');
    expect(parsed!.returnType).toBe('string');
  });

  // ── Extra Test 19: Empty function parameters ─────────────
  it('parses function with no parameters but with return type', () => {
    const source = `fn getValue(): number { return 42 }`;
    const parsed = TypeParser.parseTypedFunction(source);

    expect(parsed).not.toBeNull();
    expect(parsed!.params).toEqual([]);
    expect(Object.keys(parsed!.paramTypes).length).toBe(0);
    expect(parsed!.returnType).toBe('number');
  });

  // ── Extra Test 20: Real-world typed function ─────────────
  it('parses real-world typed function example', () => {
    const source = `
      fn calculateTotal(items: array<number>, taxRate: number): number {
        sum = 0
        for item in items {
          sum = sum + item
        }
        return sum * (1 + taxRate)
      }
    `;
    const parsed = TypeParser.parseTypedFunction(source);

    expect(parsed).not.toBeNull();
    expect(parsed!.name).toBe('calculateTotal');
    expect(parsed!.params).toEqual(['items', 'taxRate']);
    expect(parsed!.paramTypes).toEqual({
      items: 'array<number>',
      taxRate: 'number'
    });
    expect(parsed!.returnType).toBe('number');
    expect(parsed!.body).toContain('sum = 0');
    expect(parsed!.body).toContain('for item in items');
  });
});
