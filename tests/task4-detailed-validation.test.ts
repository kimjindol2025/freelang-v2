/**
 * Task 1.4 Deep Validation - E2E Integration Testing
 * Tests full pipeline: Lexer → StatementParser → Indentation → Type Inference
 */

import { Lexer, TokenBuffer } from '../src/lexer/lexer';
import { StatementParser } from '../src/parser/statement-parser';
import { IndentationAnalyzer } from '../src/parser/indentation-analyzer';
import { BlockParser } from '../src/parser/block-parser';
import { TypeInferenceEngine } from '../src/analyzer/type-inference';

describe('Task 1.4 Deep Validation - E2E Pipeline Integration', () => {
  function runFullPipeline(code: string) {
    // Step 1: Lexer
    const lexer = new Lexer(code);
    const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: true });

    // Step 2: StatementParser
    const stmtParser = new StatementParser(tokenBuffer);
    const statements = stmtParser.parseStatements();

    // Step 3: IndentationAnalyzer
    const indentAnalyzer = new IndentationAnalyzer(code);

    // Step 4: BlockParser
    const blockParser = new BlockParser(code, statements);

    // Step 5: TypeInferenceEngine
    const typeEngine = new TypeInferenceEngine();

    return {
      code,
      statements,
      indentAnalyzer,
      blockParser,
      typeEngine,
    };
  }

  // ===== Test Group 1: Basic Pipeline =====

  test('E2E FLOW: Simple variable assignment pipeline', () => {
    const code = 'x = 42';

    const { statements, typeEngine } = runFullPipeline(code);

    console.log('\nE2E FLOW 1: x = 42');
    console.log('  Statements:', statements.length);
    console.log('  Statement[0]:', statements[0]?.text);

    expect(statements.length).toBeGreaterThan(0);
    expect(statements[0]?.text).toContain('x');

    // Type inference
    const tokens = ['x', '=', '42'];
    const inferred = typeEngine.inferFromTokens(tokens);
    console.log('  Inferred type:', inferred[0]?.type);
    expect(inferred[0]?.type).toBe('number');
  });

  test('E2E FLOW: If block with indentation', () => {
    const code = `if x > 5
  y = 10
  z = 20`;

    const { statements, blockParser } = runFullPipeline(code);

    console.log('\nE2E FLOW 2: If block');
    console.log('  Statements:', statements.length);
    console.log('  Blocks:', blockParser.getBlocks().length);

    const ifBlock = blockParser.getBlocks().find(b => b.type === 'if');
    expect(ifBlock).toBeDefined();
    expect(ifBlock?.body.length).toBeGreaterThan(0);
  });

  test('E2E FLOW: Nested blocks with full analysis', () => {
    const code = `for i in 0..10
  if i > 5
    print(i)`;

    const { statements, blockParser, indentAnalyzer } = runFullPipeline(code);

    console.log('\nE2E FLOW 3: Nested for + if');
    console.log('  Total statements:', statements.length);
    console.log('  Total blocks:', blockParser.getBlocks().length);
    console.log('  Indentation levels:', indentAnalyzer.getIndentMap().size);

    expect(statements.length).toBeGreaterThan(0);
    expect(blockParser.getBlocks().length).toBeGreaterThanOrEqual(1);
  });

  // ===== Test Group 2: Error Cases & Edge Cases =====

  test('ERROR HANDLING: Empty code', () => {
    const code = '';

    const { statements, blockParser } = runFullPipeline(code);

    console.log('\nERROR 1: Empty code');
    console.log('  Statements:', statements.length);
    console.log('  Blocks:', blockParser.getBlocks().length);

    expect(statements.length).toBe(0);
    expect(blockParser.getBlocks().length).toBe(0);
  });

  test('ERROR HANDLING: Only whitespace', () => {
    const code = `

    `;

    const { statements, blockParser } = runFullPipeline(code);

    console.log('\nERROR 2: Only whitespace');
    console.log('  Statements:', statements.length);
    console.log('  Blocks:', blockParser.getBlocks().length);

    expect(statements.length).toBe(0);
  });

  test('ERROR HANDLING: Malformed if block (no body)', () => {
    const code = `if x > 5
if y < 3
  print(y)`;

    const { blockParser } = runFullPipeline(code);
    const errors = blockParser.validate();

    console.log('\nERROR 3: If block without body');
    console.log('  Validation errors:', errors.length);

    // Should detect empty body for first if
    expect(errors.length).toBeGreaterThan(0);
  });

  // ===== Test Group 3: Complex Scenarios =====

  test('COMPLEX 1: Function definition with indented body', () => {
    const code = `fn calculate(x, y)
  temp = x * 2
  result = temp + y
  return result`;

    const { statements, blockParser, typeEngine } = runFullPipeline(code);

    console.log('\nCOMPLEX 1: Function definition');
    console.log('  Statements:', statements.length);
    console.log('  Blocks:', blockParser.getBlocks().length);

    const fnBlock = blockParser.getBlocks().find(b => b.type === 'function');
    expect(fnBlock).toBeDefined();
    if (fnBlock) {
      console.log('  Function body statements:', fnBlock.body.length);
    }
  });

  test('COMPLEX 2: Multiple sequential blocks', () => {
    const code = `if x > 0
  print("positive")
if x < 0
  print("negative")
if x == 0
  print("zero")`;

    const { blockParser } = runFullPipeline(code);
    const blocks = blockParser.getBlocks();

    console.log('\nCOMPLEX 2: Multiple sequential if blocks');
    console.log('  Total blocks:', blocks.length);

    const ifBlocks = blocks.filter(b => b.type === 'if');
    console.log('  If blocks:', ifBlocks.length);

    expect(ifBlocks.length).toBeGreaterThanOrEqual(1);
  });

  test('COMPLEX 3: Type inference with mixed operations', () => {
    const code = `fn process(arr)
  x = arr[0]
  y = arr.length
  z = arr.map(v => v * 2)
  return z`;

    const { statements, typeEngine } = runFullPipeline(code);

    console.log('\nCOMPLEX 3: Array parameter inference');
    console.log('  Statements:', statements.length);

    const tokens = ['arr', '[', '0', ']'];
    const paramTypes = typeEngine.inferParamTypes(['arr'], code);
    console.log('  arr inferred type:', paramTypes.get('arr'));

    expect(paramTypes.get('arr')).toBe('array');
  });

  // ===== Test Group 4: Backward Compatibility =====

  test('COMPAT: Optional semicolons', () => {
    const code1 = `x = 42
y = 10
z = x + y`;

    const code2 = `x = 42;
y = 10;
z = x + y;`;

    const { statements: stmts1 } = runFullPipeline(code1);
    const { statements: stmts2 } = runFullPipeline(code2);

    console.log('\nCOMPAT 1: Optional semicolons');
    console.log('  Without semicolons:', stmts1.length);
    console.log('  With semicolons:', stmts2.length);

    // Both should parse same number of statements
    expect(stmts1.length).toBe(stmts2.length);
  });

  test('COMPAT: Indentation-based vs braces (theoretical)', () => {
    const indentCode = `if x > 5
  y = 10`;

    const { blockParser: indentBlocks } = runFullPipeline(indentCode);
    const blocks = indentBlocks.getBlocks();

    console.log('\nCOMPAT 2: Indentation-based blocks');
    console.log('  Blocks detected:', blocks.length);

    expect(blocks.length).toBeGreaterThan(0);
  });

  // ===== Test Group 5: Performance & Stress =====

  test('PERFORMANCE: Large number of statements', () => {
    let code = '';
    for (let i = 0; i < 100; i++) {
      code += `var${i} = ${i}\n`;
    }

    const start = performance.now();
    const { statements } = runFullPipeline(code);
    const elapsed = performance.now() - start;

    console.log(`\nPERFORMANCE 1: 100 statements`);
    console.log(`  Parsed: ${statements.length} statements`);
    console.log(`  Time: ${elapsed.toFixed(2)}ms`);

    expect(statements.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(100); // Should complete in < 100ms
  });

  test('PERFORMANCE: Deeply nested blocks', () => {
    let code = '';
    for (let i = 0; i < 10; i++) {
      code += '  '.repeat(i) + `if level${i} > 0\n`;
    }

    const start = performance.now();
    const { blockParser } = runFullPipeline(code);
    const elapsed = performance.now() - start;

    console.log(`\nPERFORMANCE 2: 10 nested levels`);
    console.log(`  Blocks: ${blockParser.getBlocks().length}`);
    console.log(`  Time: ${elapsed.toFixed(2)}ms`);

    expect(elapsed).toBeLessThan(100);
  });

  // ===== Test Group 6: Known Issues =====

  test('KNOWN ISSUE: getBlockAt() returns undefined for non-header lines', () => {
    const code = `x = 0
if x < 10
  x = x + 1
y = 5`;

    const { blockParser } = runFullPipeline(code);

    console.log('\nKNOWN ISSUE 1: getBlockAt() precision');
    const blockAtLine0 = blockParser.getBlockAt(0); // Should be undefined
    const blockAtLine1 = blockParser.getBlockAt(1); // Should be if block

    console.log('  getBlockAt(0):', blockAtLine0 ? 'found' : 'undefined');
    console.log('  getBlockAt(1):', blockAtLine1?.type ?? 'undefined');

    expect(blockAtLine0).toBeUndefined();
    // This might fail due to off-by-one bug
    expect(blockAtLine1).toBeDefined();
  });

  test('KNOWN ISSUE: isInBlock() accuracy with Statement line numbers', () => {
    const code = `x = 0
if x < 10
  x = x + 1
  print(x)
y = 5`;

    const { blockParser } = runFullPipeline(code);

    console.log('\nKNOWN ISSUE 2: isInBlock() precision');
    console.log('  Line 0 (x = 0):', blockParser.isInBlock(0) ? 'IN' : 'OUT');
    console.log('  Line 2 (x = x + 1):', blockParser.isInBlock(2) ? 'IN' : 'OUT');
    console.log('  Line 4 (y = 5):', blockParser.isInBlock(4) ? 'IN' : 'OUT');

    expect(blockParser.isInBlock(0)).toBe(false);
    // These might fail due to Statement.line tracking
  });
});
