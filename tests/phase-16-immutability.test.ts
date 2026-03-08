/**
 * Phase 16: Basic Immutability Tests
 *
 * Rust 스타일의 let vs let mut 불변성
 * - 기본: 불변 (let x)
 * - 가변: 명시적 (let mut y)
 * - 할당 검증: 불변 변수에 재할당 시 컴파일 에러
 * - 멀티스레드 안전성: 기초
 */

import { Parser } from '../src/parser/parser';
import { Lexer, TokenBuffer } from '../src/lexer/lexer';
import {
  VariableDeclaration,
  BlockStatement,
  ExpressionStatement
} from '../src/parser/ast';

describe('Phase 16: Basic Immutability', () => {
  /**
   * Helper: 코드를 파싱하고 Statement 반환
   */
  function parseStatement(code: string) {
    const lexer = new Lexer(code);
    const tokenBuffer = new TokenBuffer(lexer);
    const parser = new Parser(tokenBuffer);
    return parser.parseStatement();
  }

  /**
   * Test 1: let 변수 선언 (불변, 기본)
   */
  test('T1: let x = 10 (immutable by default)', () => {
    const code = `let x = 10`;

    const stmt = parseStatement(code);
    expect(stmt.type).toBe('variable');

    const varDecl = stmt as VariableDeclaration;
    expect(varDecl.name).toBe('x');
    expect(varDecl.mutable).toBeFalsy();  // 기본값: false (불변)
    expect(varDecl.value).toBeDefined();
    expect(varDecl.value?.type).toBe('literal');
  });

  /**
   * Test 2: let mut y = 20 (가변)
   */
  test('T2: let mut y = 20 (mutable)', () => {
    const code = `let mut y = 20`;

    const stmt = parseStatement(code);
    expect(stmt.type).toBe('variable');

    const varDecl = stmt as VariableDeclaration;
    expect(varDecl.name).toBe('y');
    expect(varDecl.mutable).toBe(true);  // 명시적 가변
    expect(varDecl.value).toBeDefined();
    expect((varDecl.value as any).value).toBe(20);
  });

  /**
   * Test 3: 타입 어노테이션 (let x: number = 10)
   */
  test('T3: Type annotation with let', () => {
    const code = `let x: number = 10`;

    const stmt = parseStatement(code);
    const varDecl = stmt as VariableDeclaration;
    expect(varDecl.name).toBe('x');
    expect(varDecl.varType).toBe('number');
    expect(varDecl.mutable).toBeFalsy();
  });

  /**
   * Test 4: let mut with type annotation
   */
  test('T4: Type annotation with let mut', () => {
    const code = `let mut counter: number = 0`;

    const stmt = parseStatement(code);
    const varDecl = stmt as VariableDeclaration;
    expect(varDecl.name).toBe('counter');
    expect(varDecl.varType).toBe('number');
    expect(varDecl.mutable).toBe(true);
  });

  /**
   * Test 5: let without initialization
   */
  test('T5: let without initial value', () => {
    const code = `let x: number`;

    const stmt = parseStatement(code);
    const varDecl = stmt as VariableDeclaration;
    expect(varDecl.name).toBe('x');
    expect(varDecl.varType).toBe('number');
    expect(varDecl.value).toBeUndefined();
    expect(varDecl.mutable).toBeFalsy();
  });

  /**
   * Test 6: let mut without initialization
   */
  test('T6: let mut without initial value', () => {
    const code = `let mut x: number`;

    const stmt = parseStatement(code);
    const varDecl = stmt as VariableDeclaration;
    expect(varDecl.name).toBe('x');
    expect(varDecl.mutable).toBe(true);
    expect(varDecl.value).toBeUndefined();
  });

  /**
   * Test 7: 배열 초기값
   */
  test('T7: let with array initialization', () => {
    const code = `let numbers = [1, 2, 3]`;

    const stmt = parseStatement(code);
    const varDecl = stmt as VariableDeclaration;
    expect(varDecl.name).toBe('numbers');
    expect(varDecl.mutable).toBeFalsy();
    expect(varDecl.value?.type).toBe('array');
  });

  /**
   * Test 8: 가변 배열
   */
  test('T8: let mut with array initialization', () => {
    const code = `let mut list = [1, 2, 3]`;

    const stmt = parseStatement(code);
    const varDecl = stmt as VariableDeclaration;
    expect(varDecl.name).toBe('list');
    expect(varDecl.mutable).toBe(true);
    expect(varDecl.value?.type).toBe('array');
  });

  /**
   * Test 9: 함수 호출 초기값
   */
  test('T9: let with function call initialization', () => {
    const code = `let result = calculate()`;

    const stmt = parseStatement(code);
    const varDecl = stmt as VariableDeclaration;
    expect(varDecl.name).toBe('result');
    expect(varDecl.mutable).toBeFalsy();
    expect(varDecl.value?.type).toBe('call');
  });

  /**
   * Test 10: 문자열 초기값
   */
  test('T10: let with string initialization', () => {
    const code = `let name = "Alice"`;

    const stmt = parseStatement(code);
    const varDecl = stmt as VariableDeclaration;
    expect(varDecl.name).toBe('name');
    expect(varDecl.mutable).toBeFalsy();
    expect(varDecl.value?.type).toBe('literal');
    expect((varDecl.value as any).dataType).toBe('string');
  });

  /**
   * Test 11: 블록 문 { ... }
   */
  test('T11: Block statement', () => {
    const code = `{
      let x = 10;
      let mut y = 20;
    }`;

    const stmt = parseStatement(code);
    expect(stmt.type).toBe('block');

    const block = stmt as BlockStatement;
    expect(block.body).toHaveLength(2);
    expect((block.body[0] as VariableDeclaration).mutable).toBeFalsy();
    expect((block.body[1] as VariableDeclaration).mutable).toBe(true);
  });

  /**
   * Test 12: If 문 파싱
   */
  test('T12: If statement', () => {
    const code = `if x > 0 {
      let positive = true;
    }`;

    const stmt = parseStatement(code);
    expect(stmt.type).toBe('if');
    expect((stmt as any).condition).toBeDefined();
    expect((stmt as any).consequent.type).toBe('block');
  });

  /**
   * Test 13: If-else 문 파싱
   */
  test('T13: If-else statement', () => {
    const code = `if x > 0 {
      let positive = true;
    } else {
      let negative = true;
    }`;

    const stmt = parseStatement(code);
    expect(stmt.type).toBe('if');
    expect((stmt as any).alternate).toBeDefined();
    expect((stmt as any).alternate.type).toBe('block');
  });

  /**
   * Test 14: For 문 파싱
   */
  test('T14: For statement', () => {
    const code = `for i in range(10) {
      let value = i;
    }`;

    const stmt = parseStatement(code);
    expect(stmt.type).toBe('for');
    expect((stmt as any).variable).toBe('i');
    expect((stmt as any).iterable.type).toBe('call');
  });

  /**
   * Test 15: While 문 파싱
   */
  test('T15: While statement', () => {
    const code = `while counter < 10 {
      let x = 1;
    }`;

    const stmt = parseStatement(code);
    expect(stmt.type).toBe('while');
    expect((stmt as any).condition).toBeDefined();
    expect((stmt as any).body.type).toBe('block');
  });

  /**
   * Test 16: Return 문 파싱
   */
  test('T16: Return statement', () => {
    const code = `return 42`;

    const stmt = parseStatement(code);
    expect(stmt.type).toBe('return');
    expect((stmt as any).argument).toBeDefined();
    expect((stmt as any).argument.type).toBe('literal');
  });

  /**
   * Test 17: Return 없이 값
   */
  test('T17: Return without value', () => {
    const code = `return`;

    const stmt = parseStatement(code);
    expect(stmt.type).toBe('return');
    expect((stmt as any).argument).toBeUndefined();
  });

  /**
   * Test 18: 복잡한 표현식 초기값
   */
  test('T18: Complex expression initialization', () => {
    const code = `let result = x + y * 2`;

    const stmt = parseStatement(code);
    const varDecl = stmt as VariableDeclaration;
    expect(varDecl.name).toBe('result');
    expect(varDecl.mutable).toBeFalsy();
    expect(varDecl.value?.type).toBe('binary');
  });

  /**
   * Test 19: 불린 초기값
   */
  test('T19: Boolean initialization', () => {
    const code = `let enabled = true`;

    const stmt = parseStatement(code);
    const varDecl = stmt as VariableDeclaration;
    expect(varDecl.name).toBe('enabled');
    expect(varDecl.value?.type).toBe('literal');
    expect((varDecl.value as any).dataType).toBe('bool');
  });

  /**
   * Test 20: 표현식 문장 (expression statement)
   */
  test('T20: Expression statement', () => {
    const code = `x + 1`;

    const stmt = parseStatement(code);
    expect(stmt.type).toBe('expression');

    const exprStmt = stmt as ExpressionStatement;
    expect(exprStmt.expression.type).toBe('binary');
  });

  /**
   * Test 21: Let과 Mut 분리 (혼동 테스트)
   */
  test('T21: Distinguish immutable and mutable variables', () => {
    const code1 = `let x = 10`;
    const code2 = `let mut x = 10`;

    const stmt1 = parseStatement(code1) as VariableDeclaration;
    const stmt2 = parseStatement(code2) as VariableDeclaration;

    // 두 변수의 이름은 같지만, mutable은 다름
    expect(stmt1.name).toBe(stmt2.name);
    expect(stmt1.mutable).not.toBe(stmt2.mutable);
  });

  /**
   * Test 22: 여러 변수 선언
   */
  test('T22: Multiple variable declarations in block', () => {
    const code = `{
      let a = 1;
      let mut b = 2;
      let c: number = 3;
      let mut d: string = "hello";
    }`;

    const stmt = parseStatement(code) as BlockStatement;
    expect(stmt.body).toHaveLength(4);

    const varA = stmt.body[0] as VariableDeclaration;
    const varB = stmt.body[1] as VariableDeclaration;
    const varC = stmt.body[2] as VariableDeclaration;
    const varD = stmt.body[3] as VariableDeclaration;

    expect(varA.mutable).toBeFalsy();
    expect(varB.mutable).toBe(true);
    expect(varC.varType).toBe('number');
    expect(varD.varType).toBe('string');
  });

  /**
   * Test 23: 중첩 블록
   */
  test('T23: Nested blocks', () => {
    const code = `{
      let x = 1;
      {
        let y = 2;
      }
    }`;

    const stmt = parseStatement(code) as BlockStatement;
    expect(stmt.body).toHaveLength(2);
    expect(stmt.body[0].type).toBe('variable');
    expect(stmt.body[1].type).toBe('block');

    const innerBlock = stmt.body[1] as BlockStatement;
    expect(innerBlock.body).toHaveLength(1);
    expect((innerBlock.body[0] as VariableDeclaration).name).toBe('y');
  });

  /**
   * Test 24: Null 초기값
   */
  test('T24: Null initialization', () => {
    const code = `let value = null`;

    const stmt = parseStatement(code);
    const varDecl = stmt as VariableDeclaration;
    expect(varDecl.name).toBe('value');
    expect(varDecl.value?.type).toBe('literal');
    expect((varDecl.value as any).value).toBeNull();
  });

  /**
   * Test 25: Mutable 변수의 타입과 값 모두 명시
   */
  test('T25: let mut with full type and value', () => {
    const code = `let mut count: number = 0`;

    const stmt = parseStatement(code);
    const varDecl = stmt as VariableDeclaration;

    expect(varDecl.name).toBe('count');
    expect(varDecl.mutable).toBe(true);
    expect(varDecl.varType).toBe('number');
    expect(varDecl.value).toBeDefined();
    expect((varDecl.value as any).value).toBe(0);
  });
});
