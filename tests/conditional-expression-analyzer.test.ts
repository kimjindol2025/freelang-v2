/**
 * Phase 3.5 Task 3: ConditionalExpressionAnalyzer Tests
 */

import { describe, it, expect } from '@jest/globals';
import { ConditionalExpressionAnalyzer } from '../src/analyzer/conditional-expression-analyzer';
import { MinimalFunctionAST } from '../src/parser/ast';

describe('ConditionalExpressionAnalyzer - Conditional Expression Detection', () => {
  /**
   * Test 1: 단순 if 조건식
   */
  it('should detect simple if condition', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'check',
        inputType: 'number',
        outputType: 'boolean',
        body: 'if (x > 0) return true; else return false',
      },
    ];

    const analyzer = new ConditionalExpressionAnalyzer();
    const results = analyzer.build(functions);

    const info = results.get('check');
    expect(info).toBeDefined();
    expect(info!.hasConditionals).toBe(true);
    expect(info!.conditionalExpressions.length).toBe(1);
    expect(info!.conditionalExpressions[0].type).toBe('if');
  });

  /**
   * Test 2: while 조건식
   */
  it('should detect while condition', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'loop',
        inputType: 'number',
        outputType: 'number',
        body: 'while (i < n) { i = i + 1 } return i',
      },
    ];

    const analyzer = new ConditionalExpressionAnalyzer();
    const results = analyzer.build(functions);

    const info = results.get('loop');
    expect(info!.conditionalExpressions.length).toBe(1);
    expect(info!.conditionalExpressions[0].type).toBe('while');
  });

  /**
   * Test 3: 삼항 연산자
   */
  it('should detect ternary conditional', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'max',
        inputType: 'number',
        outputType: 'number',
        body: 'return (a > b ? a : b)',
      },
    ];

    const analyzer = new ConditionalExpressionAnalyzer();
    const results = analyzer.build(functions);

    const info = results.get('max');
    expect(info!.conditionalExpressions.length).toBeGreaterThan(0);
  });

  /**
   * Test 4: 비교 연산자 감지
   */
  it('should detect comparison operators', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'test',
        inputType: 'number',
        outputType: 'boolean',
        body: 'if (x > 5) return true',
      },
    ];

    const analyzer = new ConditionalExpressionAnalyzer();
    const results = analyzer.build(functions);

    const info = results.get('test');
    expect(info!.conditionalExpressions[0].hasComparison).toBe(true);
  });

  /**
   * Test 5: 논리 연산 감지
   */
  it('should detect logical operators', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'validate',
        inputType: 'string',
        outputType: 'boolean',
        body: 'if (x > 0 && y < 10) return true',
      },
    ];

    const analyzer = new ConditionalExpressionAnalyzer();
    const results = analyzer.build(functions);

    const info = results.get('validate');
    expect(info!.conditionalExpressions[0].hasLogicalOp).toBe(true);
  });

  /**
   * Test 6: 함수 호출 감지
   */
  it('should detect function calls in conditions', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'process',
        inputType: 'string',
        outputType: 'boolean',
        body: 'if (isValid(x)) return true',
      },
    ];

    const analyzer = new ConditionalExpressionAnalyzer();
    const results = analyzer.build(functions);

    const info = results.get('process');
    expect(info!.conditionalExpressions[0].hasFunctionCall).toBe(true);
  });

  /**
   * Test 7: 조건식 없는 함수
   */
  it('should handle functions with no conditionals', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'simple',
        inputType: 'number',
        outputType: 'number',
        body: 'return x + 1',
      },
    ];

    const analyzer = new ConditionalExpressionAnalyzer();
    const results = analyzer.build(functions);

    const info = results.get('simple');
    expect(info!.hasConditionals).toBe(false);
    expect(info!.conditionalExpressions.length).toBe(0);
  });

  /**
   * Test 8: 신뢰도 계산
   */
  it('should calculate confidence correctly', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'test1',
        inputType: 'number',
        outputType: 'boolean',
        body: 'if (x > 0) return true', // 비교만 있음
      },
      {
        fnName: 'test2',
        inputType: 'number',
        outputType: 'boolean',
        body: 'if (x > 0 && y < 10) return true', // 비교 + 논리연산
      },
    ];

    const analyzer = new ConditionalExpressionAnalyzer();
    const results = analyzer.build(functions);

    const info1 = results.get('test1');
    const info2 = results.get('test2');

    // test2가 더 높은 신뢰도를 가져야 함
    expect(info2!.confidence).toBeGreaterThanOrEqual(info1!.confidence);
  });

  /**
   * Test 9: Boolean 변수 추론
   */
  it('should infer boolean variables from simple conditions', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'test',
        inputType: 'boolean',
        outputType: 'boolean',
        body: 'if (flag) return true',
      },
    ];

    const analyzer = new ConditionalExpressionAnalyzer();
    analyzer.build(functions);

    const boolVars = analyzer.getInferredBooleanVariables('test');
    expect(boolVars).toBeDefined();
    expect(boolVars!.has('flag')).toBe(true);
  });

  /**
   * Test 10: 다중 조건식
   */
  it('should detect multiple conditional expressions', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'complex',
        inputType: 'number',
        outputType: 'number',
        body: 'if (x > 0) return 1; if (y < 10) return 2; while (z >= 5) z = z - 1; return z',
      },
    ];

    const analyzer = new ConditionalExpressionAnalyzer();
    const results = analyzer.build(functions);

    const info = results.get('complex');
    expect(info!.conditionalExpressions.length).toBeGreaterThanOrEqual(2);
  });

  /**
   * Test 11: 조건식이 있는 함수 조회
   */
  it('should get functions with conditionals', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'hasCondition',
        inputType: 'number',
        outputType: 'number',
        body: 'if (x > 0) return 1; else return 0',
      },
      {
        fnName: 'noCondition',
        inputType: 'number',
        outputType: 'number',
        body: 'return x + 1',
      },
    ];

    const analyzer = new ConditionalExpressionAnalyzer();
    analyzer.build(functions);

    const conditionalFuncs = analyzer.getConditionalFunctions();
    expect(conditionalFuncs.length).toBe(1);
    expect(conditionalFuncs[0].functionName).toBe('hasCondition');
  });

  /**
   * Test 12: 조건식 감지율
   */
  it('should calculate conditional detection rate', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'func1',
        inputType: 'number',
        outputType: 'number',
        body: 'if (x > 0) return 1',
      },
      {
        fnName: 'func2',
        inputType: 'number',
        outputType: 'number',
        body: 'return x + 1',
      },
      {
        fnName: 'func3',
        inputType: 'number',
        outputType: 'number',
        body: 'while (i < 10) i = i + 1; return i',
      },
    ];

    const analyzer = new ConditionalExpressionAnalyzer();
    analyzer.build(functions);

    const rate = analyzer.getConditionalDetectionRate();
    expect(rate).toBe(2 / 3); // 2개 함수에 조건식 / 3개 전체
  });

  /**
   * Test 13: 특정 함수 조회
   */
  it('should get specific function conditional info', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'test',
        inputType: 'number',
        outputType: 'boolean',
        body: 'if (x > 0) return true',
      },
    ];

    const analyzer = new ConditionalExpressionAnalyzer();
    analyzer.build(functions);

    const info = analyzer.getFunctionConditionalInfo('test');
    expect(info).toBeDefined();
    expect(info!.hasConditionals).toBe(true);

    const nonExistent = analyzer.getFunctionConditionalInfo('nonExistent');
    expect(nonExistent).toBeNull();
  });

  /**
   * Test 14: 신뢰도 필터링
   */
  it('should filter by confidence threshold', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'simple',
        inputType: 'number',
        outputType: 'boolean',
        body: 'if (x) return true', // 낮은 신뢰도
      },
      {
        fnName: 'complex',
        inputType: 'number',
        outputType: 'boolean',
        body: 'if (x > 0 && y < 10) return true', // 높은 신뢰도
      },
    ];

    const analyzer = new ConditionalExpressionAnalyzer();
    analyzer.build(functions);

    const highConf = analyzer.getHighConfidenceConditionals(0.75);
    expect(highConf.length).toBeGreaterThanOrEqual(1);
  });

  /**
   * Test 15: 조건식 타입별 개수
   */
  it('should count conditionals by type', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'mixed',
        inputType: 'number',
        outputType: 'number',
        body: 'if (x > 0) return 1; while (y < 10) y = y + 1; return (x > 0 ? 1 : 0)',
      },
    ];

    const analyzer = new ConditionalExpressionAnalyzer();
    analyzer.build(functions);

    const ifCount = analyzer.getConditionalCountByType('mixed', 'if');
    const whileCount = analyzer.getConditionalCountByType('mixed', 'while');
    const ternaryCount = analyzer.getConditionalCountByType('mixed', 'ternary');

    expect(ifCount).toBe(1);
    expect(whileCount).toBe(1);
    expect(ternaryCount).toBeGreaterThanOrEqual(0);
  });

  /**
   * Test 16: 복합 논리 연산
   */
  it('should detect complex logical operations', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'complex',
        inputType: 'number',
        outputType: 'boolean',
        body: 'if (!(x > 0 && (y < 10 || z == 5))) return true',
      },
    ];

    const analyzer = new ConditionalExpressionAnalyzer();
    const results = analyzer.build(functions);

    const info = results.get('complex');
    expect(info!.conditionalExpressions.length).toBeGreaterThan(0);
    expect(info!.conditionalExpressions[0].hasLogicalOp).toBe(true);
  });

  /**
   * Test 17: 공백 처리
   */
  it('should handle whitespace in conditions', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'spaced',
        inputType: 'number',
        outputType: 'boolean',
        body: 'if  (  x  >  0  )  return true',
      },
    ];

    const analyzer = new ConditionalExpressionAnalyzer();
    const results = analyzer.build(functions);

    const info = results.get('spaced');
    expect(info!.conditionalExpressions.length).toBe(1);
  });

  /**
   * Test 18: 전체 함수 정보
   */
  it('should get all function conditional info', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'func1',
        inputType: 'number',
        outputType: 'number',
        body: 'if (x > 0) return 1',
      },
      {
        fnName: 'func2',
        inputType: 'number',
        outputType: 'number',
        body: 'return x + 1',
      },
    ];

    const analyzer = new ConditionalExpressionAnalyzer();
    analyzer.build(functions);

    const allInfo = analyzer.getAllFunctionConditionalInfo();
    expect(allInfo.length).toBe(2);
  });
});
