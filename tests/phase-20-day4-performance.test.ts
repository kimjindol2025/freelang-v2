/**
 * Phase 20 Day 4: Performance & Real-World Examples
 * Benchmark function performance and test real-world programs
 */

import { describe, it, expect } from '@jest/globals';
import { FunctionParser } from '../src/cli/parser';
import { FunctionRegistry } from '../src/parser/function-registry';

describe('Phase 20 Day 4: Performance & Real-World Examples', () => {
  // ── Test 1: Parse 100 Functions Performance ────────────────────
  it('parses 100 function definitions efficiently', () => {
    let source = '';
    for (let i = 0; i < 100; i++) {
      source += `fn func${i}(x) { return x + ${i} }\n`;
    }

    const start = performance.now();
    const parsed = FunctionParser.parseProgram(source);
    const duration = performance.now() - start;

    expect(parsed.functionDefs).toHaveLength(100);
    expect(duration).toBeLessThan(500); // < 500ms
  });

  // ── Test 2: Parse 1000 Functions Performance ──────────────────
  it('parses 1000 function definitions in reasonable time', () => {
    let source = '';
    for (let i = 0; i < 1000; i++) {
      source += `fn f${i}(x) { return x }\n`;
    }

    const start = performance.now();
    const parsed = FunctionParser.parseProgram(source);
    const duration = performance.now() - start;

    expect(parsed.functionDefs).toHaveLength(1000);
    expect(duration).toBeLessThan(2000); // < 2 seconds
  });

  // ── Test 3: Registry Registration Performance ─────────────────
  it('registers 100 functions efficiently', () => {
    const registry = new FunctionRegistry();

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      registry.register({
        type: 'FunctionDefinition',
        name: `func${i}`,
        params: ['x'],
        body: { type: 'NumberLiteral', value: i }
      });
    }
    const duration = performance.now() - start;

    expect(registry.count()).toBe(100);
    expect(duration).toBeLessThan(100); // < 100ms
  });

  // ── Test 4: Registry Lookup Performance ────────────────────────
  it('performs fast function lookups', () => {
    const registry = new FunctionRegistry();

    // Register 100 functions
    for (let i = 0; i < 100; i++) {
      registry.register({
        type: 'FunctionDefinition',
        name: `func${i}`,
        params: [],
        body: { type: 'NumberLiteral', value: i }
      });
    }

    // Benchmark lookups
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      registry.lookup(`func${i % 100}`);
    }
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50); // < 50ms for 1000 lookups
  });

  // ── Test 5: Mixed Function Signatures ──────────────────────────
  it('handles mixed function signatures efficiently', () => {
    const source = `
      fn noParams() { return 42 }
      fn oneParam(a) { return a + 1 }
      fn twoParams(a, b) { return a + b }
      fn threeParams(a, b, c) { return a + b + c }
      fn manyParams(a, b, c, d, e, f, g, h) { return a }
    `.repeat(20); // 100 functions total

    const parsed = FunctionParser.parseProgram(source);
    expect(parsed.functionDefs).toHaveLength(100);
  });

  // ── Test 6: Complex Nested Functions ──────────────────────────
  it('parses complex nested function definitions', () => {
    let source = '';
    for (let i = 0; i < 10; i++) {
      source += `
        fn complex${i}(x) {
          if x > 0 {
            if x > 10 {
              if x > 20 {
                return x * 2
              }
              return x
            }
            return x / 2
          }
          return 0
        }
      `;
    }

    const parsed = FunctionParser.parseProgram(source);
    expect(parsed.functionDefs).toHaveLength(10);

    // All functions should have complete bodies
    parsed.functionDefs.forEach(fn => {
      expect(fn.body).toContain('if');
      expect(fn.body.length).toBeGreaterThan(50);
    });
  });

  // ── Test 7: Calculator Program ─────────────────────────────────
  it('parses calculator function set', () => {
    const source = `
      fn add(a, b) { return a + b }
      fn subtract(a, b) { return a - b }
      fn multiply(a, b) { return a * b }
      fn divide(a, b) { return a / b }
      fn power(base, exp) { return base * exp }
      fn absolute(x) { if x < 0 { return 0 - x } return x }
      fn max(a, b) { if a > b { return a } return b }
      fn min(a, b) { if a < b { return a } return b }
    `;

    const parsed = FunctionParser.parseProgram(source);
    const registry = new FunctionRegistry();

    for (const fnDef of parsed.functionDefs) {
      registry.register({
        type: 'FunctionDefinition',
        name: fnDef.name,
        params: fnDef.params,
        body: { type: 'NumberLiteral', value: 0 }
      });
    }

    expect(registry.count()).toBe(8);
    expect(registry.getNames()).toContain('add');
    expect(registry.getNames()).toContain('divide');
    expect(registry.getNames()).toContain('power');
  });

  // ── Test 8: Statistics Functions ───────────────────────────────
  it('parses statistical function library', () => {
    const source = `
      fn sum(arr) { return arr }
      fn average(arr) { return arr }
      fn median(arr) { return arr }
      fn variance(arr) { return arr }
      fn stddev(arr) { return arr }
      fn min(arr) { return arr }
      fn max(arr) { return arr }
      fn range(arr) { return arr }
    `;

    const parsed = FunctionParser.parseProgram(source);
    expect(parsed.functionDefs).toHaveLength(8);
    expect(parsed.functionDefs.every(fn => fn.params.length === 1)).toBe(true);
  });

  // ── Test 9: String Processing Functions ────────────────────────
  it('parses string utility function set', () => {
    const source = `
      fn toUpper(s) { return s }
      fn toLower(s) { return s }
      fn reverse(s) { return s }
      fn trim(s) { return s }
      fn split(s, delim) { return s }
      fn join(arr, delim) { return arr }
      fn contains(s, substr) { return s }
      fn startsWith(s, prefix) { return s }
      fn endsWith(s, suffix) { return s }
      fn replace(s, old, new) { return s }
    `;

    const parsed = FunctionParser.parseProgram(source);
    expect(parsed.functionDefs).toHaveLength(10);
  });

  // ── Test 10: Array Processing Functions ────────────────────────
  it('parses array utility function library', () => {
    const source = `
      fn length(arr) { return arr }
      fn first(arr) { return arr }
      fn last(arr) { return arr }
      fn reverse(arr) { return arr }
      fn sort(arr) { return arr }
      fn filter(arr, predicate) { return arr }
      fn map(arr, transform) { return arr }
      fn reduce(arr, accumulator) { return arr }
      fn includes(arr, element) { return arr }
      fn indexOf(arr, element) { return arr }
    `;

    const parsed = FunctionParser.parseProgram(source);
    expect(parsed.functionDefs).toHaveLength(10);
  });

  // ── Test 11: Recursive Fibonacci Performance ──────────────────
  it('parses fibonacci recursive function', () => {
    const source = `
      fn fib(n) {
        if n <= 1 { return n }
        return fib(n - 1) + fib(n - 2)
      }
    `;

    const parsed = FunctionParser.parseProgram(source);
    expect(parsed.functionDefs).toHaveLength(1);
    expect(parsed.functionDefs[0].body).toContain('fib');
  });

  // ── Test 12: Factorial Recursion ──────────────────────────────
  it('parses factorial recursive function', () => {
    const source = `
      fn factorial(n) {
        if n <= 1 { return 1 }
        return n * factorial(n - 1)
      }
    `;

    const parsed = FunctionParser.parseProgram(source);
    expect(parsed.functionDefs[0].name).toBe('factorial');
    expect(parsed.functionDefs[0].body).toContain('factorial');
  });

  // ── Test 13: Mutual Recursion Performance ──────────────────────
  it('parses large mutual recursion functions', () => {
    const source = `
      fn isEven(n) { if n == 0 { return 1 } return isOdd(n - 1) }
      fn isOdd(n) { if n == 0 { return 0 } return isEven(n - 1) }
    `.repeat(5); // 10 functions total

    const parsed = FunctionParser.parseProgram(source);
    expect(parsed.functionDefs.length).toBeGreaterThan(0);
  });

  // ── Test 14: Large Body Preservation ──────────────────────────
  it('preserves large function bodies correctly', () => {
    let body = '';
    for (let i = 0; i < 100; i++) {
      body += `x = x + ${i}\n`;
    }

    const source = `fn largeFunc(x) {
${body}
      return x
    }`;

    const parsed = FunctionParser.parseProgram(source);
    expect(parsed.functionDefs[0].body).toContain('x = x + 0');
    expect(parsed.functionDefs[0].body).toContain('x = x + 99');
    expect(parsed.functionDefs[0].body).toContain('return x');
  });

  // ── Test 15: Parameter Count Performance ──────────────────────
  it('handles functions with many parameters', () => {
    const params = Array.from({ length: 20 }, (_, i) => `a${i}`).join(', ');
    const source = `fn manyParams(${params}) { return a0 }`;

    const parsed = FunctionParser.parseProgram(source);
    expect(parsed.functionDefs[0].params).toHaveLength(20);
  });

  // ── Test 16: Mixed Real-World Library ──────────────────────────
  it('parses complete real-world function library', () => {
    const source = `
      fn add(a, b) { return a + b }
      fn subtract(a, b) { return a - b }
      fn multiply(a, b) { return a * b }
      fn divide(a, b) { return a / b }

      fn average(a, b) { return (a + b) / 2 }
      fn max(a, b) { if a > b { return a } return b }
      fn min(a, b) { if a < b { return a } return b }

      fn absolute(x) { if x < 0 { return 0 - x } return x }
      fn square(x) { return x * x }
      fn cube(x) { return x * x * x }

      fn fibonacci(n) {
        if n <= 1 { return n }
        return fibonacci(n - 1) + fibonacci(n - 2)
      }

      fn factorial(n) {
        if n <= 1 { return 1 }
        return n * factorial(n - 1)
      }
    `;

    const parsed = FunctionParser.parseProgram(source);
    const registry = new FunctionRegistry();

    for (const fnDef of parsed.functionDefs) {
      registry.register({
        type: 'FunctionDefinition',
        name: fnDef.name,
        params: fnDef.params,
        body: { type: 'NumberLiteral', value: 0 }
      });
    }

    expect(registry.count()).toBeGreaterThanOrEqual(12);
    expect(registry.getNames()).toContain('add');
    expect(registry.getNames()).toContain('fibonacci');
    expect(registry.getNames()).toContain('factorial');
  });

  // ── Test 17: Statistical Functions Performance ────────────────
  it('parses complete statistics library', () => {
    const source = `
      fn sum(arr) { return arr }
      fn count(arr) { return arr }
      fn average(arr) { return arr }
      fn median(arr) { return arr }
      fn mode(arr) { return arr }
      fn variance(arr) { return arr }
      fn stddev(arr) { return arr }
      fn minVal(arr) { return arr }
      fn maxVal(arr) { return arr }
      fn range(arr) { return arr }
      fn quartile(arr, q) { return arr }
      fn percentile(arr, p) { return arr }
    `;

    const parsed = FunctionParser.parseProgram(source);
    expect(parsed.functionDefs).toHaveLength(12);
  });

  // ── Test 18: String Utility Library ────────────────────────────
  it('parses comprehensive string utility library', () => {
    const source = `
      fn length(s) { return s }
      fn charAt(s, i) { return s }
      fn substring(s, start, end) { return s }
      fn toUpperCase(s) { return s }
      fn toLowerCase(s) { return s }
      fn trim(s) { return s }
      fn trimStart(s) { return s }
      fn trimEnd(s) { return s }
      fn replace(s, search, replace) { return s }
      fn replaceAll(s, search, replace) { return s }
      fn split(s, delimiter) { return s }
      fn join(arr, separator) { return arr }
      fn contains(s, substring) { return s }
      fn startsWith(s, prefix) { return s }
      fn endsWith(s, suffix) { return s }
    `;

    const parsed = FunctionParser.parseProgram(source);
    expect(parsed.functionDefs).toHaveLength(15);
  });

  // ── Test 19: Array Processing Library ──────────────────────────
  it('parses complete array processing library', () => {
    const source = `
      fn len(arr) { return arr }
      fn get(arr, i) { return arr }
      fn set(arr, i, val) { return arr }
      fn push(arr, val) { return arr }
      fn pop(arr) { return arr }
      fn shift(arr) { return arr }
      fn unshift(arr, val) { return arr }
      fn slice(arr, start, end) { return arr }
      fn splice(arr, start, count) { return arr }
      fn reverse(arr) { return arr }
      fn sort(arr) { return arr }
      fn filter(arr, predicate) { return arr }
      fn map(arr, transform) { return arr }
      fn reduce(arr, initial, accumulator) { return arr }
      fn includes(arr, element) { return arr }
      fn indexOf(arr, element) { return arr }
      fn lastIndexOf(arr, element) { return arr }
      fn find(arr, predicate) { return arr }
      fn findIndex(arr, predicate) { return arr }
      fn every(arr, predicate) { return arr }
      fn some(arr, predicate) { return arr }
    `;

    const parsed = FunctionParser.parseProgram(source);
    expect(parsed.functionDefs).toHaveLength(21);
  });

  // ── Test 20: Production-Ready Program ──────────────────────────
  it('parses production-ready program with 50+ functions', () => {
    let source = '';

    // Math functions (10)
    for (let i = 0; i < 10; i++) {
      source += `fn math${i}(x) { return x * ${i} }\n`;
    }

    // String functions (10)
    for (let i = 0; i < 10; i++) {
      source += `fn str${i}(s) { return s }\n`;
    }

    // Array functions (10)
    for (let i = 0; i < 10; i++) {
      source += `fn arr${i}(a) { return a }\n`;
    }

    // Logic functions (10)
    for (let i = 0; i < 10; i++) {
      source += `fn logic${i}(x) { if x > 0 { return 1 } return 0 }\n`;
    }

    // Recursive functions (10)
    for (let i = 0; i < 10; i++) {
      source += `fn rec${i}(n) { if n <= 0 { return 1 } return rec${i}(n - 1) }\n`;
    }

    const parsed = FunctionParser.parseProgram(source);
    expect(parsed.functionDefs.length).toBeGreaterThanOrEqual(50);

    const registry = new FunctionRegistry();
    for (const fnDef of parsed.functionDefs) {
      registry.register({
        type: 'FunctionDefinition',
        name: fnDef.name,
        params: fnDef.params,
        body: { type: 'NumberLiteral', value: 0 }
      });
    }

    expect(registry.count()).toBeGreaterThanOrEqual(50);
  });
});
