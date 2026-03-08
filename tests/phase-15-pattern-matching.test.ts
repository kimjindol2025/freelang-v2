/**
 * Phase 15: Pattern Matching Tests
 *
 * Rust 스타일의 match 표현식 테스트
 * - 리터럴 매칭
 * - 변수 바인딩
 * - Guard 절
 * - 배열/구조체 패턴
 */

import { Parser } from '../src/parser/parser';
import { Lexer, TokenBuffer } from '../src/lexer/lexer';
import {
  MatchExpression,
  LiteralPattern,
  VariablePattern,
  WildcardPattern,
  MatchArm
} from '../src/parser/ast';

describe('Phase 15: Pattern Matching', () => {
  /**
   * Helper: 코드를 파싱하고 Match 표현식 반환
   */
  function parseMatch(code: string): MatchExpression {
    const lexer = new Lexer(code);
    const tokenBuffer = new TokenBuffer(lexer);
    const parser = new Parser(tokenBuffer);
    const expr = parser.parseExpression();

    if (expr.type !== 'match') {
      throw new Error(`Expected match expression, got ${expr.type}`);
    }

    return expr as MatchExpression;
  }

  /**
   * Test 1: 리터럴 매칭 (Literal Pattern)
   *
   * 형식:
   *   match 1 {
   *     | 1 => "one"
   *     | 2 => "two"
   *     | _ => "other"
   *   }
   */
  test('T1: Literal pattern matching', () => {
    const code = `match 1 {
      | 1 => "one"
      | 2 => "two"
      | _ => "other"
    }`;

    const match = parseMatch(code);

    // Scrutinee 확인
    expect(match.scrutinee.type).toBe('literal');
    expect((match.scrutinee as any).value).toBe(1);

    // Arms 확인
    expect(match.arms).toHaveLength(3);

    // Arm 1: 1 => "one"
    const arm1 = match.arms[0];
    expect(arm1.pattern.type).toBe('literal');
    expect((arm1.pattern as LiteralPattern).value).toBe(1);
    expect(arm1.body.type).toBe('literal');
    expect((arm1.body as any).value).toBe('one');

    // Arm 3: _ => "other"
    const arm3 = match.arms[2];
    expect(arm3.pattern.type).toBe('wildcard');
  });

  /**
   * Test 2: 변수 바인딩 (Variable Binding)
   *
   * 형식:
   *   match value {
   *     | x => x + 1
   *   }
   */
  test('T2: Variable binding pattern', () => {
    const code = `match value {
      | x => x
    }`;

    const match = parseMatch(code);

    // Scrutinee: identifier 'value'
    expect(match.scrutinee.type).toBe('identifier');
    expect((match.scrutinee as any).name).toBe('value');

    // Pattern: variable 'x'
    const arm = match.arms[0];
    expect(arm.pattern.type).toBe('variable');
    expect((arm.pattern as VariablePattern).name).toBe('x');

    // Body: identifier 'x'
    expect(arm.body.type).toBe('identifier');
    expect((arm.body as any).name).toBe('x');
  });

  /**
   * Test 3: Guard 절 (Guard Clause)
   *
   * 형식:
   *   match x {
   *     | n if n > 0 => "positive"
   *     | n if n < 0 => "negative"
   *     | _ => "zero"
   *   }
   */
  test('T3: Guard clause with if condition', () => {
    const code = `match x {
      | n if n > 0 => "positive"
      | n if n < 0 => "negative"
      | _ => "zero"
    }`;

    const match = parseMatch(code);

    // Arm 1: n if n > 0
    const arm1 = match.arms[0];
    expect(arm1.pattern.type).toBe('variable');
    expect(arm1.guard).toBeDefined();
    expect(arm1.guard?.type).toBe('binary');

    // Arm 2: n if n < 0
    const arm2 = match.arms[1];
    expect(arm2.guard).toBeDefined();

    // Arm 3: _ (no guard)
    const arm3 = match.arms[2];
    expect(arm3.guard).toBeUndefined();
  });

  /**
   * Test 4: 배열 패턴 (Array Pattern)
   *
   * 형식:
   *   match arr {
   *     | [] => "empty"
   *     | [x] => "one: " + x
   *     | [x, y, ...rest] => "many"
   *   }
   */
  test('T4: Array pattern matching', () => {
    const code = `match arr {
      | [] => "empty"
      | [x] => "one"
    }`;

    const match = parseMatch(code);

    // Arm 1: [] => "empty"
    const arm1 = match.arms[0];
    expect(arm1.pattern.type).toBe('array');
    const arrayPattern1 = arm1.pattern as any;
    expect(arrayPattern1.elements).toHaveLength(0);

    // Arm 2: [x] => "one"
    const arm2 = match.arms[1];
    expect(arm2.pattern.type).toBe('array');
    const arrayPattern2 = arm2.pattern as any;
    expect(arrayPattern2.elements).toHaveLength(1);
    expect(arrayPattern2.elements[0].type).toBe('variable');
  });

  /**
   * Test 5: 구조체 패턴 (Struct Pattern)
   *
   * 형식:
   *   match user {
   *     | {name: n, age: a} => n + " is " + a
   *   }
   */
  test('T5: Struct pattern matching', () => {
    const code = `match user {
      | {name: n, age: a} => n
    }`;

    const match = parseMatch(code);

    const arm = match.arms[0];
    expect(arm.pattern.type).toBe('struct');
    const structPattern = arm.pattern as any;
    expect(structPattern.fields).toBeDefined();
    expect(structPattern.fields.name).toBeDefined();
    expect(structPattern.fields.age).toBeDefined();
  });

  /**
   * Test 6: 와일드카드 패턴 (Wildcard Pattern)
   */
  test('T6: Wildcard pattern', () => {
    const code = `match x {
      | 1 => "one"
      | _ => "other"
    }`;

    const match = parseMatch(code);
    const arm = match.arms[1];
    expect(arm.pattern.type).toBe('wildcard');
  });

  /**
   * Test 7: 다중 arm 처리
   */
  test('T7: Multiple match arms', () => {
    const code = `match num {
      | 0 => "zero"
      | 1 => "one"
      | 2 => "two"
      | 3 => "three"
      | _ => "other"
    }`;

    const match = parseMatch(code);
    expect(match.arms).toHaveLength(5);

    // 각 arm이 올바르게 파싱되었는지 확인
    for (let i = 0; i < 4; i++) {
      expect(match.arms[i].pattern.type).toBe('literal');
    }
    expect(match.arms[4].pattern.type).toBe('wildcard');
  });

  /**
   * Test 8: 함수 호출을 scrutinee로 사용
   */
  test('T8: Function call as scrutinee', () => {
    const code = `match getValue() {
      | x => x
    }`;

    const match = parseMatch(code);
    expect(match.scrutinee.type).toBe('call');
    expect((match.scrutinee as any).callee).toBe('getValue');
  });

  /**
   * Test 9: 식별자를 scrutinee로 사용
   */
  test('T9: Identifier as scrutinee', () => {
    const code = `match status {
      | "ok" => true
      | "error" => false
      | _ => null
    }`;

    const match = parseMatch(code);
    expect(match.scrutinee.type).toBe('identifier');
    expect((match.scrutinee as any).name).toBe('status');
  });

  /**
   * Test 10: 문자열 리터럴 매칭
   */
  test('T10: String literal pattern', () => {
    const code = `match msg {
      | "hello" => "greeting"
      | "goodbye" => "farewell"
      | _ => "unknown"
    }`;

    const match = parseMatch(code);
    const arm1 = match.arms[0];
    expect(arm1.pattern.type).toBe('literal');
    expect((arm1.pattern as LiteralPattern).value).toBe('hello');
  });

  /**
   * Test 11: 불린 리터럴 매칭
   */
  test('T11: Boolean literal pattern', () => {
    const code = `match enabled {
      | true => "on"
      | false => "off"
    }`;

    const match = parseMatch(code);
    const arm1 = match.arms[0];
    expect(arm1.pattern.type).toBe('literal');
    expect((arm1.pattern as LiteralPattern).value).toBe(true);

    const arm2 = match.arms[1];
    expect((arm2.pattern as LiteralPattern).value).toBe(false);
  });

  /**
   * Test 12: 부동소수 리터럴 매칭
   */
  test('T12: Float literal pattern', () => {
    const code = `match price {
      | 9.99 => "sale"
      | 19.99 => "regular"
      | _ => "unknown"
    }`;

    const match = parseMatch(code);
    const arm1 = match.arms[0];
    expect(arm1.pattern.type).toBe('literal');
    expect((arm1.pattern as LiteralPattern).value).toBe(9.99);
  });

  /**
   * Test 13: Match expression 타입 검증
   */
  test('T13: Match expression type validation', () => {
    const code = `match x {
      | 1 => "one"
    }`;

    const match = parseMatch(code);
    expect(match.type).toBe('match');
    expect(match.scrutinee).toBeDefined();
    expect(match.arms).toBeDefined();
    expect(Array.isArray(match.arms)).toBe(true);
  });

  /**
   * Test 14: Guard와 body 모두 파싱
   */
  test('T14: Guard and body together', () => {
    const code = `match n {
      | x if x > 0 => x + 1
    }`;

    const match = parseMatch(code);
    const arm = match.arms[0];

    // Guard 확인
    expect(arm.guard).toBeDefined();
    expect(arm.guard?.type).toBe('binary');

    // Body 확인
    expect(arm.body.type).toBe('binary');
  });

  /**
   * Test 15: 공백 처리
   */
  test('T15: Whitespace handling', () => {
    const code = `
    match   value   {
      |   1   =>   "one"
      |   _   =>   "other"
    }
    `;

    const match = parseMatch(code);
    expect(match.arms).toHaveLength(2);
    expect(match.scrutinee.type).toBe('identifier');
  });

  /**
   * Test 16: 배열 리터럴을 scrutinee로 사용
   */
  test('T16: Array as scrutinee', () => {
    const code = `match [1, 2, 3] {
      | [] => "empty"
      | [x] => "single"
      | _ => "multiple"
    }`;

    const match = parseMatch(code);
    expect(match.scrutinee.type).toBe('array');
    expect((match.scrutinee as any).elements).toHaveLength(3);
  });

  /**
   * Test 17: 함수 호출 결과를 body로 사용
   */
  test('T17: Function call in match body', () => {
    const code = `match x {
      | 1 => process(x)
      | _ => default_val()
    }`;

    const match = parseMatch(code);
    const arm1 = match.arms[0];
    expect(arm1.body.type).toBe('call');
    expect((arm1.body as any).callee).toBe('process');
  });

  /**
   * Test 18: 중첩된 match (nested)
   */
  test('T18: Nested match patterns', () => {
    const code = `match outer {
      | [[x]] => x
      | _ => 0
    }`;

    const match = parseMatch(code);
    const arm = match.arms[0];
    expect(arm.pattern.type).toBe('array');
    const outerArray = arm.pattern as any;
    expect(outerArray.elements).toHaveLength(1);
    expect(outerArray.elements[0].type).toBe('array');
  });

  /**
   * Test 19: 여러 Guard 조건들
   */
  test('T19: Multiple guards comparison', () => {
    const code = `match x {
      | a if a == 1 => "one"
      | b if b > 10 => "big"
      | c if c < 0 => "negative"
      | _ => "unknown"
    }`;

    const match = parseMatch(code);
    expect(match.arms).toHaveLength(4);

    // 각 guard가 있는지 확인
    for (let i = 0; i < 3; i++) {
      expect(match.arms[i].guard).toBeDefined();
    }
    expect(match.arms[3].guard).toBeUndefined();
  });

  /**
   * Test 20: 구조체 패턴에서 여러 필드
   */
  test('T20: Struct pattern with multiple fields', () => {
    const code = `match person {
      | {name: n, age: a, city: c} => n
    }`;

    const match = parseMatch(code);
    const arm = match.arms[0];
    const structPattern = arm.pattern as any;

    expect(Object.keys(structPattern.fields)).toHaveLength(3);
    expect(structPattern.fields.name).toBeDefined();
    expect(structPattern.fields.age).toBeDefined();
    expect(structPattern.fields.city).toBeDefined();
  });
});
