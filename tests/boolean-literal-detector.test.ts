/**
 * Phase 3.5 Task 1: BooleanLiteralDetector Tests
 */

import { describe, it, expect } from '@jest/globals';
import { BooleanLiteralDetector } from '../src/analyzer/boolean-literal-detector';
import { MinimalFunctionAST } from '../src/parser/ast';

describe('BooleanLiteralDetector - Boolean Literal Detection', () => {
  /**
   * Test 1: 단순 true 리터럴
   */
  it('should detect simple true literal', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'isValid',
        inputType: 'number',
        outputType: 'boolean',
        body: 'return true',
      },
    ];

    const detector = new BooleanLiteralDetector();
    const results = detector.build(functions);

    const info = results.get('isValid');
    expect(info).toBeDefined();
    expect(info!.hasBooleanReturn).toBe(true);
    expect(info!.inferredType).toBe('boolean');
    expect(info!.booleanLiterals.length).toBe(1);
    expect(info!.booleanLiterals[0].value).toBe(true);
    expect(info!.confidence).toBe(0.95);
  });

  /**
   * Test 2: 단순 false 리터럴
   */
  it('should detect simple false literal', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'isEmpty',
        inputType: 'string',
        outputType: 'boolean',
        body: 'return false',
      },
    ];

    const detector = new BooleanLiteralDetector();
    const results = detector.build(functions);

    const info = results.get('isEmpty');
    expect(info!.hasBooleanReturn).toBe(true);
    expect(info!.booleanLiterals[0].value).toBe(false);
  });

  /**
   * Test 3: 다중 return (첫 번째만 감지)
   */
  it('should detect multiple returns with boolean literals', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'validate',
        inputType: 'number',
        outputType: 'boolean',
        body: 'if (x > 10) return true; else return false',
      },
    ];

    const detector = new BooleanLiteralDetector();
    const results = detector.build(functions);

    const info = results.get('validate');
    expect(info!.booleanLiterals.length).toBe(2);
    expect(info!.booleanLiterals[0].value).toBe(true);
    expect(info!.booleanLiterals[1].value).toBe(false);
  });

  /**
   * Test 4: Boolean 리터럴 없음
   */
  it('should handle functions with no boolean literals', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'getValue',
        inputType: 'number',
        outputType: 'number',
        body: 'return x + 1',
      },
    ];

    const detector = new BooleanLiteralDetector();
    const results = detector.build(functions);

    const info = results.get('getValue');
    expect(info!.hasBooleanReturn).toBe(false);
    expect(info!.inferredType).toBe('unknown');
    expect(info!.booleanLiterals.length).toBe(0);
  });

  /**
   * Test 5: 대소문자 관계없이 인식 (case-insensitive)
   */
  it('should recognize true/false case-insensitively', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'func1',
        inputType: 'number',
        outputType: 'boolean',
        body: 'return TRUE', // 대문자도 인식 됨
      },
      {
        fnName: 'func2',
        inputType: 'number',
        outputType: 'boolean',
        body: 'return true', // 소문자도 인식 됨
      },
      {
        fnName: 'func3',
        inputType: 'number',
        outputType: 'boolean',
        body: 'return False', // 혼합 케이스도 인식 됨
      },
    ];

    const detector = new BooleanLiteralDetector();
    const results = detector.build(functions);

    const info1 = results.get('func1');
    expect(info1!.booleanLiterals.length).toBe(1);
    expect(info1!.booleanLiterals[0].value).toBe(true); // TRUE → true

    const info2 = results.get('func2');
    expect(info2!.booleanLiterals.length).toBe(1);

    const info3 = results.get('func3');
    expect(info3!.booleanLiterals.length).toBe(1);
    expect(info3!.booleanLiterals[0].value).toBe(false); // False → false
  });

  /**
   * Test 6: 공백 처리
   */
  it('should handle whitespace variations', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'func1',
        inputType: 'number',
        outputType: 'boolean',
        body: 'return  true', // 두 칸 공백
      },
      {
        fnName: 'func2',
        inputType: 'number',
        outputType: 'boolean',
        body: 'return\ttrue', // 탭
      },
      {
        fnName: 'func3',
        inputType: 'number',
        outputType: 'boolean',
        body: 'return   \n   true', // 여러 공백과 개행
      },
    ];

    const detector = new BooleanLiteralDetector();
    const results = detector.build(functions);

    expect(results.get('func1')!.booleanLiterals.length).toBe(1);
    expect(results.get('func2')!.booleanLiterals.length).toBe(1);
    expect(results.get('func3')!.booleanLiterals.length).toBe(1);
  });

  /**
   * Test 7: 단어 경계 확인 (returnTrue는 감지 안 됨)
   */
  it('should respect word boundaries', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'bad1',
        inputType: 'number',
        outputType: 'boolean',
        body: 'returnTrue', // 단어 경계 없음
      },
      {
        fnName: 'bad2',
        inputType: 'number',
        outputType: 'boolean',
        body: 'return my_true', // true가 문자 일부
      },
      {
        fnName: 'good',
        inputType: 'number',
        outputType: 'boolean',
        body: 'return true', // 단어 경계 있음
      },
    ];

    const detector = new BooleanLiteralDetector();
    const results = detector.build(functions);

    expect(results.get('bad1')!.booleanLiterals.length).toBe(0);
    expect(results.get('bad2')!.booleanLiterals.length).toBe(0);
    expect(results.get('good')!.booleanLiterals.length).toBe(1);
  });

  /**
   * Test 8: 신뢰도 확인
   */
  it('should set confidence to 0.95 for boolean literals', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'isTrue',
        inputType: 'number',
        outputType: 'boolean',
        body: 'return true',
      },
    ];

    const detector = new BooleanLiteralDetector();
    const results = detector.build(functions);

    const info = results.get('isTrue');
    expect(info!.booleanLiterals[0].confidence).toBe(0.95);
    expect(info!.confidence).toBe(0.95);
  });

  /**
   * Test 9: Boolean 반환 함수 조회
   */
  it('should get boolean returning functions', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'isValid',
        inputType: 'number',
        outputType: 'boolean',
        body: 'return true',
      },
      {
        fnName: 'getValue',
        inputType: 'number',
        outputType: 'number',
        body: 'return x + 1',
      },
      {
        fnName: 'isEmpty',
        inputType: 'string',
        outputType: 'boolean',
        body: 'return false',
      },
    ];

    const detector = new BooleanLiteralDetector();
    detector.build(functions);

    const booleanFuncs = detector.getBooleanReturningFunctions();
    expect(booleanFuncs.length).toBe(2);
    expect(booleanFuncs.map((f) => f.functionName)).toContain('isValid');
    expect(booleanFuncs.map((f) => f.functionName)).toContain('isEmpty');
  });

  /**
   * Test 10: 모든 함수 정보 조회
   */
  it('should get all function boolean info', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'func1',
        inputType: 'number',
        outputType: 'boolean',
        body: 'return true',
      },
      {
        fnName: 'func2',
        inputType: 'number',
        outputType: 'number',
        body: 'return 42',
      },
    ];

    const detector = new BooleanLiteralDetector();
    detector.build(functions);

    const allInfo = detector.getAllFunctionBooleanInfo();
    expect(allInfo.length).toBe(2);
  });

  /**
   * Test 11: Boolean 감지율
   */
  it('should calculate boolean detection rate', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'isValid',
        inputType: 'number',
        outputType: 'boolean',
        body: 'return true',
      },
      {
        fnName: 'isEmpty',
        inputType: 'string',
        outputType: 'boolean',
        body: 'return false',
      },
      {
        fnName: 'getValue',
        inputType: 'number',
        outputType: 'number',
        body: 'return 42',
      },
    ];

    const detector = new BooleanLiteralDetector();
    detector.build(functions);

    const rate = detector.getBooleanDetectionRate();
    expect(rate).toBe(2 / 3); // 2개 boolean / 3개 전체
  });

  /**
   * Test 12: 특정 함수 정보 조회
   */
  it('should get specific function boolean info', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'verify',
        inputType: 'string',
        outputType: 'boolean',
        body: 'return true',
      },
    ];

    const detector = new BooleanLiteralDetector();
    detector.build(functions);

    const info = detector.getFunctionBooleanInfo('verify');
    expect(info).toBeDefined();
    expect(info!.hasBooleanReturn).toBe(true);

    const nonExistent = detector.getFunctionBooleanInfo('nonExistent');
    expect(nonExistent).toBeNull();
  });
});
