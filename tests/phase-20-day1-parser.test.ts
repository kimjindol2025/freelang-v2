/**
 * Phase 20 Day 1: Function Parser Implementation
 * Parse fn keyword and function definitions from text
 */

import { describe, it, expect } from '@jest/globals';

// Simple function parser for Phase 20
class FunctionParser {
  /**
   * Parse function definitions from source code
   * Uses brace counting to handle nested braces correctly
   */
  static parseFunctionDefinitions(source: string) {
    const functions: any[] = [];

    // Find all fn keyword positions
    const fnPattern = /fn\s+(\w+)\s*\((.*?)\)\s*\{/g;
    let match;

    while ((match = fnPattern.exec(source)) !== null) {
      const name = match[1];
      const paramsStr = match[2];

      // Find the opening brace position
      const openBracePos = match.index + match[0].length - 1;

      // Count braces to find matching closing brace
      let braceCount = 1;
      let pos = openBracePos + 1;

      while (pos < source.length && braceCount > 0) {
        if (source[pos] === '{') braceCount++;
        else if (source[pos] === '}') braceCount--;
        pos++;
      }

      // Extract body (between opening and closing braces)
      const bodyStr = source.substring(openBracePos + 1, pos - 1);

      // Parse parameters
      const params = paramsStr
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      functions.push({
        type: 'FunctionDefinition',
        name,
        params,
        body: bodyStr.trim()
      });
    }

    return functions;
  }

  /**
   * Check if source contains function definitions
   */
  static hasFunctionDefinitions(source: string): boolean {
    return /fn\s+\w+\s*\(.*?\)\s*\{/m.test(source);
  }

  /**
   * Get function names from source
   */
  static getFunctionNames(source: string): string[] {
    const functions = this.parseFunctionDefinitions(source);
    return functions.map(f => f.name);
  }

  /**
   * Extract all parameters across functions
   */
  static getAllParameters(source: string): Record<string, string[]> {
    const functions = this.parseFunctionDefinitions(source);
    const result: Record<string, string[]> = {};
    for (const fn of functions) {
      result[fn.name] = fn.params;
    }
    return result;
  }
}

describe('Phase 20 Day 1: Function Parser', () => {
  // ── Test 1: Parse Simple Function ──────────────────────────
  it('parses simple function definition', () => {
    const source = `fn add(a, b) {
      return a + b
    }`;

    const functions = FunctionParser.parseFunctionDefinitions(source);

    expect(functions).toHaveLength(1);
    expect(functions[0].name).toBe('add');
    expect(functions[0].params).toEqual(['a', 'b']);
    expect(functions[0].body).toContain('return');
  });

  // ── Test 2: Parse Function with No Parameters ─────────────
  it('parses function with no parameters', () => {
    const source = `fn getValue() {
      return 42
    }`;

    const functions = FunctionParser.parseFunctionDefinitions(source);

    expect(functions).toHaveLength(1);
    expect(functions[0].name).toBe('getValue');
    expect(functions[0].params).toEqual([]);
  });

  // ── Test 3: Parse Function with Multiple Parameters ──────
  it('parses function with multiple parameters', () => {
    const source = `fn sum3(a, b, c) {
      return a + b + c
    }`;

    const functions = FunctionParser.parseFunctionDefinitions(source);

    expect(functions[0].params).toEqual(['a', 'b', 'c']);
  });

  // ── Test 4: Parse Multiple Functions ───────────────────────
  it('parses multiple function definitions', () => {
    const source = `
      fn add(a, b) { return a + b }
      fn subtract(a, b) { return a - b }
      fn multiply(a, b) { return a * b }
    `;

    const functions = FunctionParser.parseFunctionDefinitions(source);

    expect(functions).toHaveLength(3);
    expect(functions[0].name).toBe('add');
    expect(functions[1].name).toBe('subtract');
    expect(functions[2].name).toBe('multiply');
  });

  // ── Test 5: Parse Function with Return Statement ─────────
  it('parses function body with return statement', () => {
    const source = `fn double(x) {
      return x * 2
    }`;

    const functions = FunctionParser.parseFunctionDefinitions(source);

    expect(functions[0].body).toContain('return');
    expect(functions[0].body).toContain('x * 2');
  });

  // ── Test 6: Parse Function with Conditional ──────────────
  it('parses function with if statement', () => {
    const source = `fn isPositive(x) {
      if x > 0 { return 1 }
      return 0
    }`;

    const functions = FunctionParser.parseFunctionDefinitions(source);

    expect(functions[0].body).toContain('if');
    expect(functions[0].body).toContain('>');
  });

  // ── Test 7: Parse Recursive Function ───────────────────────
  it('parses recursive function definition', () => {
    const source = `fn factorial(n) {
      if n <= 1 { return 1 }
      return n * factorial(n - 1)
    }`;

    const functions = FunctionParser.parseFunctionDefinitions(source);

    expect(functions[0].name).toBe('factorial');
    expect(functions[0].body).toContain('factorial');
  });

  // ── Test 8: Parse Function with Whitespace ────────────────
  it('handles variable whitespace in function definition', () => {
    const source = `fn   add   (   a  ,  b  )  {
      return a + b
    }`;

    const functions = FunctionParser.parseFunctionDefinitions(source);

    expect(functions[0].name).toBe('add');
    expect(functions[0].params).toEqual(['a', 'b']);
  });

  // ── Test 9: Detect Function Definitions ──────────────────
  it('detects presence of function definitions', () => {
    const withFunctions = `fn add(a, b) { return a + b }`;
    const withoutFunctions = `result = 5 + 3`;

    expect(FunctionParser.hasFunctionDefinitions(withFunctions)).toBe(true);
    expect(FunctionParser.hasFunctionDefinitions(withoutFunctions)).toBe(false);
  });

  // ── Test 10: Get Function Names ─────────────────────────────
  it('extracts function names from source', () => {
    const source = `
      fn add(a, b) { return a + b }
      fn subtract(a, b) { return a - b }
      fn multiply(a, b) { return a * b }
    `;

    const names = FunctionParser.getFunctionNames(source);

    expect(names).toEqual(['add', 'subtract', 'multiply']);
  });

  // ── Test 11: Parse Function with Loop ──────────────────────
  it('parses function with loop body', () => {
    const source = `fn sumToN(n) {
      sum = 0
      for i in range(1, n) {
        sum = sum + i
      }
      return sum
    }`;

    const functions = FunctionParser.parseFunctionDefinitions(source);

    expect(functions[0].body).toContain('for');
    expect(functions[0].body).toContain('range');
  });

  // ── Test 12: Parse Function with String ────────────────────
  it('parses function with string operations', () => {
    const source = `fn greet(name) {
      return "Hello, " + name
    }`;

    const functions = FunctionParser.parseFunctionDefinitions(source);

    expect(functions[0].body).toContain('"');
    expect(functions[0].body).toContain('Hello');
  });

  // ── Test 13: Parse Mixed Program ───────────────────────────
  it('parses functions from mixed program (functions + statements)', () => {
    const source = `
      fn add(a, b) { return a + b }

      result = add(5, 3)
      print(result)

      fn multiply(a, b) { return a * b }

      product = multiply(2, 3)
    `;

    const functions = FunctionParser.parseFunctionDefinitions(source);

    expect(functions).toHaveLength(2);
    expect(functions[0].name).toBe('add');
    expect(functions[1].name).toBe('multiply');
  });

  // ── Test 14: Parse All Parameters ──────────────────────────
  it('extracts all function parameters', () => {
    const source = `
      fn add(a, b) { return a + b }
      fn greet(first, last) { return first + last }
      fn getValue() { return 42 }
    `;

    const params = FunctionParser.getAllParameters(source);

    expect(params['add']).toEqual(['a', 'b']);
    expect(params['greet']).toEqual(['first', 'last']);
    expect(params['getValue']).toEqual([]);
  });

  // ── Test 15: Parse Complex Nested Body ─────────────────────
  it('parses function with nested braces in body', () => {
    const source = `fn complex(x) {
      if x > 0 {
        if x > 10 {
          return "big"
        }
        return "small"
      }
      return "zero"
    }`;

    const functions = FunctionParser.parseFunctionDefinitions(source);

    expect(functions[0].body).toContain('big');
    expect(functions[0].body).toContain('small');
    expect(functions[0].body).toContain('zero');
  });

  // ── Test 16: Parameter Parsing Edge Cases ───────────────────
  it('handles various parameter formats', () => {
    const sources = [
      'fn f(a) { return a }',
      'fn f(a,b) { return a + b }',
      'fn f(a , b , c) { return a + b + c }',
      'fn f(aVeryLongParameterName) { return aVeryLongParameterName }'
    ];

    for (const source of sources) {
      const functions = FunctionParser.parseFunctionDefinitions(source);
      expect(functions).toHaveLength(1);
      expect(functions[0].name).toBe('f');
      expect(functions[0].params.length).toBeGreaterThan(0);
    }
  });

  // ── Test 17: Empty Function Body ────────────────────────────
  it('parses function with minimal body', () => {
    const source = `fn id(x) { x }`;

    const functions = FunctionParser.parseFunctionDefinitions(source);

    expect(functions[0].body).toBe('x');
  });

  // ── Test 18: Function Names with Underscores ────────────────
  it('parses function names with underscores and numbers', () => {
    const source = `
      fn _private() { return 1 }
      fn func2() { return 2 }
      fn get_value_2() { return 3 }
    `;

    const functions = FunctionParser.parseFunctionDefinitions(source);
    const names = functions.map(f => f.name);

    expect(names).toEqual(['_private', 'func2', 'get_value_2']);
  });

  // ── Test 19: Preserve Function Body Formatting ──────────────
  it('preserves function body content exactly', () => {
    const source = `fn calculate(a, b) {
      sum = a + b
      product = a * b
      return sum * product
    }`;

    const functions = FunctionParser.parseFunctionDefinitions(source);
    const body = functions[0].body;

    expect(body).toContain('sum = a + b');
    expect(body).toContain('product = a * b');
  });

  // ── Test 20: Parse Large Program with Many Functions ──────
  it('parses large program with many functions', () => {
    let source = '';
    for (let i = 0; i < 20; i++) {
      source += `fn func${i}(x) { return x + ${i} }\n`;
    }

    const functions = FunctionParser.parseFunctionDefinitions(source);

    expect(functions).toHaveLength(20);
    for (let i = 0; i < 20; i++) {
      expect(functions[i].name).toBe(`func${i}`);
    }
  });
});
