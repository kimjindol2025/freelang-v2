/**
 * Phase 20 Day 3: End-to-End Program Execution
 * Test function registration and parsing with various program structures
 */

import { describe, it, expect } from '@jest/globals';
import { ProgramRunner } from '../src/cli/runner';
import { FunctionParser } from '../src/cli/parser';

describe('Phase 20 Day 3: End-to-End Program Execution', () => {
  // ── Test 1: Simple Function Definition ───────────────────────
  it('parses and registers simple function', () => {
    const source = `fn add(a, b) { return a + b }`;
    const parsed = FunctionParser.parseProgram(source);

    expect(parsed.functionDefs).toHaveLength(1);
    expect(parsed.functionDefs[0].name).toBe('add');
  });

  // ── Test 2: Function with Return Statement ───────────────────
  it('parses function with complex return statement', () => {
    const source = `fn double(x) { return x * 2 }`;
    const parsed = FunctionParser.parseProgram(source);

    expect(parsed.functionDefs[0].body).toContain('x * 2');
  });

  // ── Test 3: Multiple Function Definitions ────────────────────
  it('parses multiple functions from single source', () => {
    const source = `
      fn add(a, b) { return a + b }
      fn subtract(a, b) { return a - b }
      fn multiply(a, b) { return a * b }
    `;
    const parsed = FunctionParser.parseProgram(source);

    expect(parsed.functionDefs).toHaveLength(3);
    expect(parsed.functionDefs[0].name).toBe('add');
    expect(parsed.functionDefs[1].name).toBe('subtract');
    expect(parsed.functionDefs[2].name).toBe('multiply');
  });

  // ── Test 4: Function with No Parameters ──────────────────────
  it('parses function with empty parameter list', () => {
    const source = `fn getValue() { return 42 }`;
    const parsed = FunctionParser.parseProgram(source);

    expect(parsed.functionDefs[0].name).toBe('getValue');
    expect(parsed.functionDefs[0].params).toEqual([]);
  });

  // ── Test 5: Function with Single Parameter ──────────────────
  it('parses function with one parameter', () => {
    const source = `fn square(x) { return x * x }`;
    const parsed = FunctionParser.parseProgram(source);

    expect(parsed.functionDefs[0].params).toEqual(['x']);
  });

  // ── Test 6: Function with Many Parameters ───────────────────
  it('parses function with multiple parameters', () => {
    const source = `fn sum3(a, b, c) { return a + b + c }`;
    const parsed = FunctionParser.parseProgram(source);

    expect(parsed.functionDefs[0].params).toEqual(['a', 'b', 'c']);
  });

  // ── Test 7: Recursive Function Definition ────────────────────
  it('parses recursive function correctly', () => {
    const source = `fn factorial(n) {
      if n <= 1 { return 1 }
      return n * factorial(n - 1)
    }`;
    const parsed = FunctionParser.parseProgram(source);

    expect(parsed.functionDefs[0].name).toBe('factorial');
    expect(parsed.functionDefs[0].body).toContain('factorial');
  });

  // ── Test 8: Function with Conditional ────────────────────────
  it('parses function with if statement body', () => {
    const source = `fn absolute(x) {
      if x < 0 { return 0 - x }
      return x
    }`;
    const parsed = FunctionParser.parseProgram(source);

    expect(parsed.functionDefs[0].body).toContain('if');
    expect(parsed.functionDefs[0].body).toContain('return');
  });

  // ── Test 9: Function with Loop ───────────────────────────────
  it('parses function with loop body', () => {
    const source = `fn sumToN(n) {
      sum = 0
      for i in range(1, n) {
        sum = sum + i
      }
      return sum
    }`;
    const parsed = FunctionParser.parseProgram(source);

    expect(parsed.functionDefs[0].body).toContain('for');
    expect(parsed.functionDefs[0].body).toContain('range');
  });

  // ── Test 10: Function with String Operation ─────────────────
  it('parses function with string concatenation', () => {
    const source = `fn greet(name) {
      return "Hello, " + name
    }`;
    const parsed = FunctionParser.parseProgram(source);

    expect(parsed.functionDefs[0].body).toContain('"Hello, "');
  });

  // ── Test 11: Mixed Functions in Source ──────────────────────
  it('parses mixed functions with different signatures', () => {
    const source = `
      fn add(a, b) { return a + b }
      fn greet(name) { return "Hello, " + name }
      fn getValue() { return 42 }
    `;
    const parsed = FunctionParser.parseProgram(source);

    expect(parsed.functionDefs).toHaveLength(3);
    expect(parsed.functionDefs[0].params.length).toBe(2);
    expect(parsed.functionDefs[1].params.length).toBe(1);
    expect(parsed.functionDefs[2].params.length).toBe(0);
  });

  // ── Test 12: Function Registry Integration ──────────────────
  it('registers parsed functions in ProgramRunner', () => {
    const runner = new ProgramRunner();
    const source = `fn test(x) { return x }`;
    const registry = runner.getRegistry();

    const parsed = FunctionParser.parseProgram(source);
    for (const fnDef of parsed.functionDefs) {
      registry.register({
        type: 'FunctionDefinition',
        name: fnDef.name,
        params: fnDef.params,
        body: { type: 'Identifier', name: fnDef.body }
      });
    }

    expect(registry.exists('test')).toBe(true);
    expect(registry.count()).toBe(1);
  });

  // ── Test 13: Multiple Functions to Registry ─────────────────
  it('registers multiple functions from source', () => {
    const runner = new ProgramRunner();
    const source = `
      fn add(a, b) { return a + b }
      fn subtract(a, b) { return a - b }
      fn multiply(a, b) { return a * b }
    `;
    const registry = runner.getRegistry();

    const parsed = FunctionParser.parseProgram(source);
    for (const fnDef of parsed.functionDefs) {
      registry.register({
        type: 'FunctionDefinition',
        name: fnDef.name,
        params: fnDef.params,
        body: { type: 'NumberLiteral', value: 0 }
      });
    }

    expect(registry.count()).toBe(3);
    expect(registry.getNames()).toEqual(['add', 'subtract', 'multiply']);
  });

  // ── Test 14: Mutual Recursion Parsing ───────────────────────
  it('parses mutual recursion pattern functions', () => {
    const source = `
      fn isEven(n) {
        if n == 0 { return 1 }
        return isOdd(n - 1)
      }

      fn isOdd(n) {
        if n == 0 { return 0 }
        return isEven(n - 1)
      }
    `;
    const parsed = FunctionParser.parseProgram(source);

    expect(parsed.functionDefs).toHaveLength(2);
    expect(parsed.functionDefs[0].name).toBe('isEven');
    expect(parsed.functionDefs[1].name).toBe('isOdd');
    expect(parsed.functionDefs[0].body).toContain('isOdd');
    expect(parsed.functionDefs[1].body).toContain('isEven');
  });

  // ── Test 15: Large Program with Many Functions ──────────────
  it('parses program with many function definitions', () => {
    let source = '';
    for (let i = 0; i < 20; i++) {
      source += `fn func${i}(x) { return x + ${i} }\n`;
    }
    const parsed = FunctionParser.parseProgram(source);

    expect(parsed.functionDefs).toHaveLength(20);
    for (let i = 0; i < 20; i++) {
      expect(parsed.functionDefs[i].name).toBe(`func${i}`);
    }
  });

  // ── Test 16: Functions with Nested Braces ───────────────────
  it('correctly parses functions with nested braces', () => {
    const source = `fn complex(x) {
      if x > 0 {
        if x > 10 {
          return "big"
        }
        return "small"
      }
      return "zero"
    }`;
    const parsed = FunctionParser.parseProgram(source);

    expect(parsed.functionDefs[0].body).toContain('"big"');
    expect(parsed.functionDefs[0].body).toContain('"small"');
    expect(parsed.functionDefs[0].body).toContain('"zero"');
  });

  // ── Test 17: Parameter Preservation ──────────────────────────
  it('preserves all parameter names correctly', () => {
    const source = `fn multiParam(first, second, third, fourth, fifth) {
      return first + second
    }`;
    const parsed = FunctionParser.parseProgram(source);

    expect(parsed.functionDefs[0].params).toEqual([
      'first',
      'second',
      'third',
      'fourth',
      'fifth'
    ]);
  });

  // ── Test 18: Body Content Preservation ──────────────────────
  it('preserves function body content exactly', () => {
    const source = `fn calculate(a, b) {
      sum = a + b
      product = a * b
      result = sum * product
      return result
    }`;
    const parsed = FunctionParser.parseProgram(source);

    expect(parsed.functionDefs[0].body).toContain('sum = a + b');
    expect(parsed.functionDefs[0].body).toContain('product = a * b');
    expect(parsed.functionDefs[0].body).toContain('result = sum * product');
  });

  // ── Test 19: Registry Clear and Reset ───────────────────────
  it('clears and resets function registry', () => {
    const runner = new ProgramRunner();
    const registry = runner.getRegistry();

    registry.register({
      type: 'FunctionDefinition',
      name: 'test1',
      params: [],
      body: { type: 'NumberLiteral', value: 1 }
    });

    registry.register({
      type: 'FunctionDefinition',
      name: 'test2',
      params: [],
      body: { type: 'NumberLiteral', value: 2 }
    });

    expect(registry.count()).toBe(2);

    registry.clear();

    expect(registry.count()).toBe(0);
    expect(registry.exists('test1')).toBe(false);
    expect(registry.getNames()).toEqual([]);
  });

  // ── Test 20: Real-World Program Pattern ─────────────────────
  it('parses real-world program with multiple functions', () => {
    const source = `
      fn average(a, b) {
        return (a + b) / 2
      }

      fn max(a, b) {
        if a > b { return a }
        return b
      }

      fn min(a, b) {
        if a < b { return a }
        return b
      }

      fn factorial(n) {
        if n <= 1 { return 1 }
        return n * factorial(n - 1)
      }
    `;
    const parsed = FunctionParser.parseProgram(source);
    const runner = new ProgramRunner();
    const registry = runner.getRegistry();

    for (const fnDef of parsed.functionDefs) {
      registry.register({
        type: 'FunctionDefinition',
        name: fnDef.name,
        params: fnDef.params,
        body: { type: 'NumberLiteral', value: 0 }
      });
    }

    expect(registry.count()).toBe(4);
    expect(registry.getNames()).toEqual(['average', 'max', 'min', 'factorial']);
  });
});
