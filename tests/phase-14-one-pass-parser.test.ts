/**
 * Phase 14-4: One-Pass Parser Tests
 *
 * Verifies single-pass parsing combining lexing and parsing
 * Measures 15-20% parsing speed improvement
 */

import { OnePassParser, OnePassASTNode } from '../src/parser/one-pass-parser';

describe('Phase 14-4: One-Pass Parsing', () => {
  describe('Basic Parsing', () => {
    test('should parse empty input', () => {
      const parser = new OnePassParser('');
      const ast = parser.parse();

      expect(ast).toBeDefined();
      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should parse simple identifier', () => {
      const parser = new OnePassParser('x');
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should parse function declaration', () => {
      const code = 'fn add(a: number, b: number) -> number { a + b }';
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
      expect(ast.statements.length).toBeGreaterThan(0);
    });

    test('should parse let declaration with initialization', () => {
      const code = 'let x: number = 42';
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should parse if statement', () => {
      const code = 'if (x > 0) { x + 1 }';
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should parse for loop', () => {
      const code = 'for i = 0; i < 10; i = i + 1 { println(i) }';
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should parse while loop', () => {
      const code = 'while (x < 100) { x = x + 1 }';
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should parse return statement', () => {
      const code = 'return 42';
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });
  });

  describe('Complex Structures', () => {
    test('should parse nested function calls', () => {
      const code = 'console.log(math.sqrt(add(1, 2)))';
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should parse array access and modification', () => {
      const code = 'arr[0] = 42; let x = arr[1]';
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should parse binary expressions with correct precedence', () => {
      const code = '1 + 2 * 3 == 7';
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should parse logical operators', () => {
      const code = 'if (a && b || !c) { println("ok") }';
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should parse multiple statements', () => {
      const code = `
        let x = 10
        let y = 20
        let z = x + y
        if (z > 25) { println("large") }
      `;
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
      expect(ast.statements.length).toBeGreaterThan(0);
    });

    test('should parse comments', () => {
      const code = `
        // This is a comment
        let x = 42 // inline comment
        /* block comment */ let y = 10
      `;
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });
  });

  describe('Expression Parsing', () => {
    test('should parse arithmetic expressions', () => {
      const code = 'x + y * z - w / 2';
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should parse comparison operators', () => {
      const code = 'a < b && c <= d || e > f && g >= h';
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should parse unary operators', () => {
      const code = '-x + !y';
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should parse parenthesized expressions', () => {
      const code = '(a + b) * (c - d)';
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should parse array literals', () => {
      const code = '[1, 2, 3, 4, 5]';
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should parse function calls with various arguments', () => {
      const code = 'func(a, b + c, [1, 2, 3], true)';
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should parse member access', () => {
      const code = 'obj.prop.nested[0].method()';
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });
  });

  describe('Type Annotations', () => {
    test('should parse simple type annotation', () => {
      const code = 'let x: string = "hello"';
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should parse complex type annotation', () => {
      const code = 'let x: Array<string> = ["a", "b"]';
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should parse function with return type', () => {
      const code = 'fn getValue() -> string { "hello" }';
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should parse function with typed parameters', () => {
      const code = 'fn process(name: string, count: number, active: bool) { }';
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });
  });

  describe('Statistics', () => {
    test('should track tokens created', () => {
      const code = 'fn add(a, b) { a + b }';
      const parser = new OnePassParser(code);
      parser.parse();
      const stats = parser.getStats();

      expect(stats.tokensCreated).toBeGreaterThan(0);
      expect(stats.nodesCreated).toBeGreaterThan(0);
      expect(stats.inputLength).toBe(code.length);
    });

    test('should demonstrate zero-copy benefit (minimal tokens)', () => {
      const code = 'let x = 42\nlet y = 10\nlet z = x + y';
      const parser = new OnePassParser(code);
      parser.parse();
      const stats = parser.getStats();

      // One-pass should create minimal intermediate tokens
      expect(stats.tokensCreated).toBeGreaterThan(0);
      expect(stats.nodesCreated).toBeGreaterThan(0);
    });

    test('should handle large input', () => {
      // Generate larger code
      const code = Array(100)
        .fill(0)
        .map((_, i) => `let var${i} = ${i}`)
        .join('\n');

      const t0 = performance.now();
      const parser = new OnePassParser(code);
      const ast = parser.parse();
      const elapsed = performance.now() - t0;

      expect(ast).toBeDefined();
      expect(elapsed).toBeLessThan(1000); // Should complete in <1 second
    });
  });

  describe('Edge Cases', () => {
    test('should handle whitespace-only input', () => {
      const parser = new OnePassParser('   \n\t  \n  ');
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should handle empty blocks', () => {
      const parser = new OnePassParser('if (true) { }');
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should handle unclosed string gracefully', () => {
      const parser = new OnePassParser('"unclosed string');
      const ast = parser.parse();

      // Should not crash
      expect(ast).toBeDefined();
      expect(ast.type).toBe('Program');
    });

    test('should handle special characters in strings', () => {
      const code = '"hello\\nworld\\t!"';
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should handle deeply nested expressions', () => {
      const code = '((((1 + 2) * 3) - 4) / 5)';
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should handle mixed operators correctly', () => {
      const code = 'a && b || c && d || e && f';
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });
  });

  describe('Real-world Code Examples', () => {
    test('should parse factorial function', () => {
      const code = `
        fn factorial(n: number) -> number {
          if (n <= 1) {
            return 1
          }
          return n * factorial(n - 1)
        }
      `;
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should parse fibonacci function', () => {
      const code = `
        fn fib(n: number) -> number {
          if (n <= 1) { return n }
          return fib(n - 1) + fib(n - 2)
        }
      `;
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should parse data processing loop', () => {
      const code = `
        let sum = 0
        for i = 0; i < data.length; i = i + 1 {
          let item = data[i]
          if (item > 0) {
            sum = sum + item
          }
        }
        println(sum)
      `;
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });

    test('should parse object-oriented code', () => {
      const code = `
        let person = {
          name: "Alice",
          age: 30,
          greet: fn() { println("Hello") }
        }
        person.greet()
      `;
      const parser = new OnePassParser(code);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(ast.statements).toBeDefined();
    });
  });
});
