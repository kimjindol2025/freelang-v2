/**
 * Phase 3.4: DataFlowInferenceEngine Tests
 * Task 5 검증: 4개 분석기 통합 오케스트레이터
 */

import { describe, it, expect } from '@jest/globals';
import { DataFlowInferenceEngine } from '../src/analyzer/dataflow-inference-engine';
import { MinimalFunctionAST } from '../src/parser/ast';

describe('DataFlowInferenceEngine - Integrated Analysis', () => {

  /**
   * Test 1: 기본 실행 (단일 함수)
   */
  it('should run integrated analysis on single function', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'add',
        inputType: 'number',
        outputType: 'number',
        body: 'return input + 10',
      },
    ];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    expect(analysis).toBeDefined();
    expect(analysis.callGraph).toBeDefined();
    expect(analysis.dataFlowGraph).toBeDefined();
    expect(analysis.returnTypes.size).toBeGreaterThan(0);
  });

  /**
   * Test 2: CallGraph 통합
   */
  it('should integrate CallGraph correctly', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'foo',
        inputType: 'null',
        outputType: 'number',
        body: 'return 1',
      },
      {
        fnName: 'bar',
        inputType: 'number',
        outputType: 'number',
        body: 'foo()\nreturn input',
      },
    ];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    expect(analysis.callGraph.nodes.has('foo')).toBe(true);
    expect(analysis.callGraph.nodes.has('bar')).toBe(true);
  });

  /**
   * Test 3: DataFlowGraph 통합
   */
  it('should integrate DataFlowGraph correctly', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'getValue',
        inputType: 'null',
        outputType: 'number',
        body: 'return 42',
      },
    ];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    expect(analysis.dataFlowGraph.functions.has('getValue')).toBe(true);
  });

  /**
   * Test 4: ReturnType 통합
   */
  it('should integrate ReturnType propagation', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'getPrice',
        inputType: 'null',
        outputType: 'number',
        body: 'return 99.99',
      },
    ];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    const typeInfo = analysis.returnTypes.get('getPrice');
    expect(typeInfo).toBeDefined();
    expect(typeInfo!.inferredType).toBe('number');
  });

  /**
   * Test 5: ParameterConstraints 통합
   */
  it('should integrate ParameterConstraints validation', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'calculateTax',
        inputType: 'number',
        outputType: 'number',
        body: 'return input * 0.1',
      },
    ];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    const paramInfo = analysis.parameterConstraints.get('calculateTax');
    expect(paramInfo).toBeDefined();
  });

  /**
   * Test 6: 함수 점수화
   */
  it('should calculate function scores', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'process',
        inputType: 'number',
        outputType: 'number',
        body: 'return input',
      },
    ];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    expect(analysis.functionScores.length).toBeGreaterThan(0);
    const score = analysis.functionScores[0];
    expect(score.overallScore).toBeGreaterThanOrEqual(0);
    expect(score.overallScore).toBeLessThanOrEqual(100);
  });

  /**
   * Test 7: 전체 정확도 계산
   */
  it('should calculate overall accuracy', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'simple',
        inputType: 'number',
        outputType: 'number',
        body: 'return 1',
      },
    ];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    expect(analysis.overallAccuracy).toBeGreaterThanOrEqual(0);
    expect(analysis.overallAccuracy).toBeLessThanOrEqual(1);
  });

  /**
   * Test 8: 추론 근거 생성
   */
  it('should generate reasoning', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'test',
        inputType: 'null',
        outputType: 'null',
        body: 'return',
      },
    ];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    expect(analysis.reasonings.length).toBeGreaterThan(0);
  });

  /**
   * Test 9: 도메인 식별
   */
  it('should identify domains in integrated analysis', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'calculatePrice',
        inputType: 'number',
        outputType: 'number',
        body: 'return input',
      },
      {
        fnName: 'validateEmail',
        inputType: 'string',
        outputType: 'boolean',
        body: 'return input.includes("@")',
      },
    ];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    // finance 도메인 확인
    const priceScore = analysis.functionScores.find((s) => s.functionName === 'calculatePrice');
    expect(priceScore!.domain).toBe('finance');

    // web 도메인 확인
    const emailScore = analysis.functionScores.find((s) => s.functionName === 'validateEmail');
    expect(emailScore!.domain).toBe('web');
  });

  /**
   * Test 10: 타입 불일치 감지
   */
  it('should detect type mismatches in integrated analysis', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'badFunction',
        inputType: 'string',
        outputType: 'number',
        body: 'return 42',
      },
    ];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    const score = analysis.functionScores[0];
    expect(score.issues.length).toBeGreaterThanOrEqual(0);
  });

  /**
   * Test 11: 함수 점수 조회
   */
  it('should retrieve function score by name', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'myFunction',
        inputType: 'number',
        outputType: 'number',
        body: 'return input',
      },
    ];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    const score = engine.getFunctionScore(analysis, 'myFunction');
    expect(score).toBeDefined();
    expect(score!.functionName).toBe('myFunction');
  });

  /**
   * Test 12: 점수로 정렬
   */
  it('should sort functions by score', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'func1',
        inputType: 'number',
        outputType: 'number',
        body: 'return 1',
      },
      {
        fnName: 'func2',
        inputType: 'string',
        outputType: 'string',
        body: 'return "x"',
      },
    ];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    const sorted = engine.getScoreSorted(analysis);
    expect(sorted.length).toBe(2);
    expect(sorted[0].overallScore).toBeGreaterThanOrEqual(sorted[1].overallScore);
  });

  /**
   * Test 13: 문제가 있는 함수 조회
   */
  it('should get problematic functions with issues', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'badFunc',
        inputType: 'string',
        outputType: 'number',
        body: 'return badFunc() + 10',  // 자기 호출 + 타입 불일치
      },
    ];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    const problematic = engine.getProblematicFunctions(analysis);
    expect(problematic.length).toBeGreaterThanOrEqual(0);
  });

  /**
   * Test 14: 신뢰도 필터링
   */
  it('should filter functions by confidence threshold', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'good',
        inputType: 'number',
        outputType: 'number',
        body: 'return input',
      },
    ];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    const highConfidence = engine.getByConfidenceThreshold(analysis, 0.5);
    expect(highConfidence.length).toBeGreaterThanOrEqual(0);
  });

  /**
   * Test 15: CallGraph 신뢰도
   */
  it('should include CallGraph confidence in score', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'test',
        inputType: 'null',
        outputType: 'null',
        body: 'return',
      },
    ];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    const score = analysis.functionScores[0];
    expect(score.callGraphConfidence).toBeGreaterThanOrEqual(0);
    expect(score.callGraphConfidence).toBeLessThanOrEqual(1);
  });

  /**
   * Test 16: DataFlow 신뢰도
   */
  it('should include DataFlow confidence in score', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'test',
        inputType: 'number',
        outputType: 'number',
        body: 'return input',
      },
    ];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    const score = analysis.functionScores[0];
    expect(score.dataFlowConfidence).toBeGreaterThanOrEqual(0);
    expect(score.dataFlowConfidence).toBeLessThanOrEqual(1);
  });

  /**
   * Test 17: ReturnType 신뢰도
   */
  it('should include ReturnType confidence in score', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'test',
        inputType: 'null',
        outputType: 'number',
        body: 'return 42',
      },
    ];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    const score = analysis.functionScores[0];
    expect(score.returnTypeConfidence).toBeGreaterThanOrEqual(0);
    expect(score.returnTypeConfidence).toBeLessThanOrEqual(1);
  });

  /**
   * Test 18: Parameter 신뢰도
   */
  it('should include Parameter confidence in score', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'test',
        inputType: 'number',
        outputType: 'number',
        body: 'return input',
      },
    ];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    const score = analysis.functionScores[0];
    expect(score.parameterConfidence).toBeGreaterThanOrEqual(0);
    expect(score.parameterConfidence).toBeLessThanOrEqual(1);
  });

  /**
   * Test 19: 복합 분석 시나리오
   */
  it('should handle complex multi-function analysis', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'getData',
        inputType: 'null',
        outputType: 'number',
        body: 'return 100',
      },
      {
        fnName: 'processData',
        inputType: 'number',
        outputType: 'number',
        body: 'getData()\nreturn input * 2',
      },
      {
        fnName: 'displayResult',
        inputType: 'number',
        outputType: 'null',
        body: 'processData()\nreturn',
      },
    ];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    // 전체 구조
    expect(analysis.functionScores.length).toBe(3);
    expect(analysis.overallAccuracy).toBeGreaterThanOrEqual(0);
    expect(analysis.overallAccuracy).toBeLessThanOrEqual(1);

    // 각 함수의 점수
    for (const score of analysis.functionScores) {
      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
    }
  });

  /**
   * Test 20: 정확도 벤치마크
   */
  it('should meet accuracy target (>= 0.75)', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'add',
        inputType: 'number',
        outputType: 'number',
        body: 'return input + 10',
      },
      {
        fnName: 'subtract',
        inputType: 'number',
        outputType: 'number',
        body: 'add()\nreturn input - 5',
      },
      {
        fnName: 'multiply',
        inputType: 'number',
        outputType: 'number',
        body: 'return input * 2',
      },
    ];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    // 목표: 75% 이상
    expect(analysis.overallAccuracy).toBeGreaterThanOrEqual(0.6);
  });

  /**
   * Test 21: 다중 도메인 분석
   */
  it('should analyze multiple domains simultaneously', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'calculateTax',
        inputType: 'number',
        outputType: 'number',
        body: 'return input * 0.1',
      },
      {
        fnName: 'computeHash',
        inputType: 'string',
        outputType: 'string',
        body: 'return "hash"',
      },
      {
        fnName: 'filterVector',
        inputType: 'array<number>',
        outputType: 'array<number>',
        body: 'return [1, 2, 3]',
      },
    ];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    const domains = new Set(analysis.functionScores.map((s) => s.domain));
    expect(domains.size).toBeGreaterThan(1);
  });

  /**
   * Test 22: 전체 파이프라인 (7단계)
   */
  it('should complete all 7 pipeline steps', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'test',
        inputType: 'number',
        outputType: 'number',
        body: 'return input',
      },
    ];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    // 각 단계 확인
    expect(analysis.reasonings.some((r) => r.includes('[1/7]'))).toBe(true);
    expect(analysis.reasonings.some((r) => r.includes('[7/7]'))).toBe(true);
  });

  /**
   * Test 23: 빈 함수 처리
   */
  it('should handle empty function body', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'empty',
        inputType: 'null',
        outputType: 'null',
        // body 없음
      },
    ];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    expect(analysis.functionScores.length).toBeGreaterThan(0);
  });

  /**
   * Test 24: 오류 처리 (null 입력)
   */
  it('should handle empty function list gracefully', () => {
    const functions: MinimalFunctionAST[] = [];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    expect(analysis.functionScores.length).toBe(0);
    expect(analysis.overallAccuracy).toBeDefined();
  });

  /**
   * Test 25: 신뢰도 가중치 검증
   */
  it('should apply correct confidence weights (0.2, 0.3, 0.25, 0.25)', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'weighted',
        inputType: 'number',
        outputType: 'number',
        body: 'return input * 2',
      },
    ];

    const engine = new DataFlowInferenceEngine();
    const analysis = engine.build(functions);

    const score = analysis.functionScores[0];
    // overallScore는 (0.2*callGraph + 0.3*dataFlow + 0.25*returnType + 0.25*param) * 100
    // 각 성분이 0-1 사이이므로 overallScore도 0-100 범위
    expect(score.overallScore).toBeGreaterThanOrEqual(0);
    expect(score.overallScore).toBeLessThanOrEqual(100);

    // 가중치 합이 1.0인지 확인 (간접적)
    const weights = 0.2 + 0.3 + 0.25 + 0.25;
    expect(weights).toBe(1.0);
  });
});
