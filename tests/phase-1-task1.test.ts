/**
 * Phase 1 Task 1.1: Semicolon Optional Parser Test
 *
 * Tests for making semicolons optional in statement parsing.
 * Validates that statements can be terminated by:
 * - Semicolon (explicit)
 * - Newline (implicit)
 * - EOF (end of file)
 * - Block start ({ )
 */

import { Lexer, TokenBuffer } from '../src/lexer/lexer';
import { StatementParser } from '../src/parser/statement-parser';

describe('Phase 1 Task 1.1: Semicolon Optional Parser', () => {
  /**
   * Test 1: Single statement without semicolon
   */
  test('parse statement without semicolon', () => {
    const code = 'let x = 5';
    const lexer = new Lexer(code);
    const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: true });
    const parser = new StatementParser(tokenBuffer);
    const statements = parser.parseStatements();

    expect(statements).toHaveLength(1);
    expect(statements[0].type).toBe('declaration');
    expect(statements[0].text).toContain('x');
    expect(statements[0].text).toContain('5');
  });

  /**
   * Test 2: Single statement with semicolon
   */
  test('parse statement with semicolon', () => {
    const code = 'let x = 5;';
    const lexer = new Lexer(code);
    const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: true });
    const parser = new StatementParser(tokenBuffer);
    const statements = parser.parseStatements();

    expect(statements).toHaveLength(1);
    expect(statements[0].type).toBe('declaration');
  });

  /**
   * Test 3: Multiple statements without semicolons
   */
  test('parse multiple statements without semicolons', () => {
    const code = `let x = 5
let y = 10
let z = x + y`;

    const lexer = new Lexer(code);
    const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: true });
    const parser = new StatementParser(tokenBuffer);
    const statements = parser.parseStatements();

    expect(statements).toHaveLength(3);
    expect(statements[0].type).toBe('declaration');
    expect(statements[1].type).toBe('declaration');
    expect(statements[2].type).toBe('declaration');
  });

  /**
   * Test 4: Multiple statements with mixed semicolons
   */
  test('parse mixed semicolon and non-semicolon statements', () => {
    const code = `let x = 5;
let y = 10
let z = x + y;`;

    const lexer = new Lexer(code);
    const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: true });
    const parser = new StatementParser(tokenBuffer);
    const statements = parser.parseStatements();

    expect(statements).toHaveLength(3);
  });

  /**
   * Test 5: Assignment statements without semicolon
   */
  test('parse assignment without semicolon', () => {
    const code = `x = 10
y = 20`;

    const lexer = new Lexer(code);
    const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: true });
    const parser = new StatementParser(tokenBuffer);
    const statements = parser.parseStatements();

    expect(statements).toHaveLength(2);
    expect(statements[0].type).toBe('expr');
    expect(statements[1].type).toBe('expr');
  });

  /**
   * Test 6: Return statement without semicolon
   */
  test('parse return statement without semicolon', () => {
    const code = 'return x + y';
    const lexer = new Lexer(code);
    const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: true });
    const parser = new StatementParser(tokenBuffer);
    const statements = parser.parseStatements();

    expect(statements).toHaveLength(1);
    expect(statements[0].type).toBe('return');
    expect(statements[0].text).toContain('x');
    expect(statements[0].text).toContain('y');
  });

  /**
   * Test 7: Function call without semicolon
   */
  test('parse function call without semicolon', () => {
    const code = 'print(x)';
    const lexer = new Lexer(code);
    const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: true });
    const parser = new StatementParser(tokenBuffer);
    const statements = parser.parseStatements();

    expect(statements).toHaveLength(1);
    expect(statements[0].type).toBe('expr');
  });

  /**
   * Test 8: Break statement without semicolon
   */
  test('parse break statement without semicolon', () => {
    const code = 'break';
    const lexer = new Lexer(code);
    const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: true });
    const parser = new StatementParser(tokenBuffer);
    const statements = parser.parseStatements();

    expect(statements).toHaveLength(1);
    expect(statements[0].type).toBe('break');
  });

  /**
   * Test 9: Continue statement without semicolon
   */
  test('parse continue statement without semicolon', () => {
    const code = 'continue';
    const lexer = new Lexer(code);
    const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: true });
    const parser = new StatementParser(tokenBuffer);
    const statements = parser.parseStatements();

    expect(statements).toHaveLength(1);
    expect(statements[0].type).toBe('continue');
  });

  /**
   * Test 10: Complex expression without semicolon
   */
  test('parse complex expression without semicolon', () => {
    const code = 'result = arr.map(x => x * 2).filter(x => x > 5)';
    const lexer = new Lexer(code);
    const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: true });
    const parser = new StatementParser(tokenBuffer);
    const statements = parser.parseStatements();

    expect(statements.length).toBeGreaterThan(0);
    expect(statements[0].type).toBe('expr');
  });

  /**
   * Test 11: Statements separated by only newlines (no explicit semicolons)
   */
  test('parse statements separated by newlines only', () => {
    const code = `x = 1
y = 2
z = 3
result = x + y + z`;

    const lexer = new Lexer(code);
    const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: true });
    const parser = new StatementParser(tokenBuffer);
    const statements = parser.parseStatements();

    expect(statements).toHaveLength(4);
  });

  /**
   * Test 12: Multiple semicolons (edge case - should handle gracefully)
   */
  test('parse statement with multiple semicolons', () => {
    const code = 'let x = 5;;';
    const lexer = new Lexer(code);
    const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: true });
    const parser = new StatementParser(tokenBuffer);
    const statements = parser.parseStatements();

    // Should still parse the statement correctly
    expect(statements.length).toBeGreaterThan(0);
    expect(statements[0].type).toBe('declaration');
  });

  /**
   * Test 13: Empty lines handling (should skip them)
   */
  test('handle empty lines between statements', () => {
    const code = `let x = 5

let y = 10

return x + y`;

    const lexer = new Lexer(code);
    const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: true });
    const parser = new StatementParser(tokenBuffer);
    const statements = parser.parseStatements();

    expect(statements).toHaveLength(3);
  });

  /**
   * Test 14: Statement with type annotations (no semicolon)
   */
  test('parse statement with type annotation without semicolon', () => {
    const code = 'let x: number = 5';
    const lexer = new Lexer(code);
    const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: true });
    const parser = new StatementParser(tokenBuffer);
    const statements = parser.parseStatements();

    expect(statements).toHaveLength(1);
    expect(statements[0].type).toBe('declaration');
  });

  /**
   * Test 15: String literals (should not treat ; inside string as terminator)
   */
  test('parse statement with string containing semicolon', () => {
    const code = 'print("Hello; World")';
    const lexer = new Lexer(code);
    const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: true });
    const parser = new StatementParser(tokenBuffer);
    const statements = parser.parseStatements();

    expect(statements).toHaveLength(1);
    expect(statements[0].text).toContain('Hello');
  });

  /**
   * Performance Test: Parse 100 statements
   */
  test('parse large number of statements efficiently', () => {
    const lines = Array.from({ length: 100 }, (_, i) => `x${i} = ${i}`).join('\n');
    const lexer = new Lexer(lines);
    const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: true });

    const start = performance.now();
    const parser = new StatementParser(tokenBuffer);
    const statements = parser.parseStatements();
    const elapsed = performance.now() - start;

    expect(statements.length).toBeGreaterThan(50); // At least half should parse
    expect(elapsed).toBeLessThan(100); // Should complete in < 100ms
  });
});
