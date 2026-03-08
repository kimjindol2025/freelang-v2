/**
 * Phase 2 Task 2.1: Partial Parser Tests
 *
 * Tests incomplete/malformed code parsing:
 * - Missing closing parentheses
 * - Missing closing braces
 * - Incomplete statements
 * - Syntax errors with recovery
 */

import { PartialParser, PartialToken } from '../src/parser/partial-parser';

describe('Phase 2 Task 2.1: Partial Parser', () => {
  let parser: PartialParser;

  beforeEach(() => {
    parser = new PartialParser();
  });

  /**
   * Helper: Convert code string to tokens
   */
  const tokenize = (code: string): PartialToken[] => {
    const lines = code.split('\n');
    const tokens: PartialToken[] = [];
    let tokenId = 0;

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      const words = line.match(/\S+/g) || [];

      for (const word of words) {
        const type = classifyToken(word);
        tokens.push({
          type,
          value: word,
          line: lineNum,
          column: line.indexOf(word),
        });
        tokenId++;
      }

      // Add NEWLINE (except last line)
      if (lineNum < lines.length - 1) {
        tokens.push({
          type: 'NEWLINE',
          value: '\n',
          line: lineNum,
          column: line.length,
        });
      }
    }

    tokens.push({ type: 'EOF', value: '', line: lines.length, column: 0 });
    return tokens;
  };

  /**
   * Classify token type
   */
  const classifyToken = (word: string): string => {
    if (word === 'fn') return 'FN';
    if (word === 'if') return 'IF';
    if (word === 'for') return 'FOR';
    if (word === 'return') return 'RETURN';
    if (word === 'const') return 'CONST';
    if (word === 'type') return 'TYPE';
    if (word === 'in') return 'IN';
    if (word === '(') return 'LPAREN';
    if (word === ')') return 'RPAREN';
    if (word === '{') return 'LBRACE';
    if (word === '}') return 'RBRACE';
    if (word === '[') return 'LBRACKET';
    if (word === ']') return 'RBRACKET';
    if (word === '.') return 'DOT';
    if (word === ',') return 'COMMA';
    if (word === '=') return 'EQUALS';
    if (word === '==') return 'EQEQ';
    if (word === '+') return 'PLUS';
    if (word === '-') return 'MINUS';
    if (word === '*') return 'STAR';
    if (word === '/') return 'SLASH';
    if (word === ';') return 'SEMICOLON';
    if (word === '..') return 'RANGE';
    if (/^\d+$/.test(word)) return 'NUMBER';
    if (/^".*"$/.test(word) || /^'.*'$/.test(word)) return 'STRING';
    return 'IDENT';
  };

  /**
   * Test 1: Parse returns valid AST
   */
  test('Parse returns valid AST structure', () => {
    const code = `fn add(x, y)
  x + y`;

    const tokens = tokenize(code);
    const ast = parser.parse(tokens);

    expect(ast).toBeDefined();
    expect(ast.type).toBe('PROGRAM');
    expect(ast.children).toBeDefined();
    expect(ast.isComplete !== undefined).toBe(true);
  });

  /**
   * Test 2: Parser handles missing tokens gracefully
   */
  test('Parse handles missing tokens without crashing', () => {
    const code = `fn sum(x, y
  x + y`;

    const tokens = tokenize(code);
    const ast = parser.parse(tokens);

    expect(ast).toBeDefined();
    expect(ast.type).toBe('PROGRAM');
  });

  /**
   * Test 3: Missing function body
   */
  test('Parse function with missing body', () => {
    const code = `fn incomplete(x)`;

    const tokens = tokenize(code);
    const ast = parser.parse(tokens);

    expect(ast).toBeDefined();
    expect(ast.children).toBeDefined();
  });

  /**
   * Test 4: Parser handles incomplete expressions
   */
  test('Parse incomplete assignment', () => {
    const code = `fn process(data)
  result = data.map(`;

    const tokens = tokenize(code);
    const ast = parser.parse(tokens);

    expect(ast).toBeDefined();
  });

  /**
   * Test 5: Parser handles missing braces
   */
  test('Parse with missing closing brace', () => {
    const code = `fn test()
  {
    x = 1`;

    const tokens = tokenize(code);
    const ast = parser.parse(tokens);

    expect(ast).toBeDefined();
  });

  /**
   * Test 6: If statement without body
   */
  test('Parse if statement without body', () => {
    const code = `fn check(x)
  if x > 5`;

    const tokens = tokenize(code);
    const ast = parser.parse(tokens);

    expect(ast).toBeDefined();
    expect(ast.children).toBeDefined();
  });

  /**
   * Test 7: Parser handles incomplete loops
   */
  test('Parse for loop with incomplete range', () => {
    const code = `fn loop()
  for i in`;

    const tokens = tokenize(code);
    const ast = parser.parse(tokens);

    expect(ast).toBeDefined();
  });

  /**
   * Test 8: Parser handles multiple statements
   */
  test('Parse multiple statements with one incomplete', () => {
    const code = `fn complex()
  x = 1
  y = x.method(
  z = 3`;

    const tokens = tokenize(code);
    const ast = parser.parse(tokens);

    expect(ast).toBeDefined();
  });

  /**
   * Test 9: Return statement without value
   */
  test('Parse return without value', () => {
    const code = `fn early_return()
  if true
    return`;

    const tokens = tokenize(code);
    const ast = parser.parse(tokens);

    expect(ast).toBeDefined();
  });

  /**
   * Test 10: Parser handles const definitions
   */
  test('Parse incomplete const definition', () => {
    const code = `const MAX_SIZE =`;

    const tokens = tokenize(code);
    const ast = parser.parse(tokens);

    expect(ast).toBeDefined();
  });

  /**
   * Test 11: Parser handles nested function calls
   */
  test('Parse nested function calls with missing paren', () => {
    const code = `fn nested()
  result = func1(func2(x)`;

    const tokens = tokenize(code);
    const ast = parser.parse(tokens);

    expect(ast).toBeDefined();
  });

  /**
   * Test 12: Array access incomplete
   */
  test('Parse array access with missing bracket', () => {
    const code = `fn array_access()
  first = arr[0
  second = arr[1]`;

    const tokens = tokenize(code);
    const ast = parser.parse(tokens);

    expect(ast).toBeDefined();
  });

  /**
   * Test 13: Parser handles multiple errors
   */
  test('Parse code with multiple errors', () => {
    const code = `fn errors()
  result = func(
  x = arr[
  y = 42`;

    const tokens = tokenize(code);
    const ast = parser.parse(tokens);

    expect(ast).toBeDefined();
  });

  /**
   * Test 14: Completion percentage
   */
  test('Calculate completion percentage', () => {
    const code = `fn test(x)
  x + 1`;

    const tokens = tokenize(code);
    const ast = parser.parse(tokens);
    const completion = parser.getCompletionPercentage();

    expect(completion).toBeGreaterThan(0);
    expect(completion).toBeLessThanOrEqual(100);
  });

  /**
   * Test 15: Parser recovers from errors
   */
  test('Parse with error recovery', () => {
    const code = `fn recovery()
  x = 1
  ; ; ;
  y = 2
  z = 3`;

    const tokens = tokenize(code);
    const ast = parser.parse(tokens);

    // Should recover and produce valid AST
    expect(ast).toBeDefined();
    expect(ast.type).toBe('PROGRAM');
  });
});
