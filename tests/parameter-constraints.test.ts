/**
 * Phase 3.4: ParameterConstraints Tests
 * Task 4 검증: 파라미터 타입 제약 + 도메인 강제
 */

import { describe, it, expect } from '@jest/globals';
import { ParameterConstraintsEngine } from '../src/analyzer/parameter-constraints';
import { MinimalFunctionAST } from '../src/parser/ast';

describe('ParameterConstraints - Parameter Type Validation', () => {

  /**
   * Test 1: 파라미터 수집 (입력 타입)
   */
  it('should collect parameters from inputType', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'add',
        inputType: 'number',
        outputType: 'number',
        body: 'return input + 10',
      },
    ];

    const engine = new ParameterConstraintsEngine();
    const results = engine.build(functions);

    const info = results.get('add');
    expect(info).toBeDefined();
    expect(info!.parameters.length).toBeGreaterThan(0);
    expect(info!.parameters[0].name).toBe('input');
    expect(info!.parameters[0].type).toBe('number');
  });

  /**
   * Test 2: 도메인 추론 - finance (가격, 세금)
   */
  it('should infer finance domain for price/tax functions', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'calculateTax',
        inputType: 'number',
        outputType: 'number',
        body: 'return input * 0.1',
      },
    ];

    const engine = new ParameterConstraintsEngine();
    const results = engine.build(functions);

    const info = results.get('calculateTax');
    expect(info!.parameters[0].domain).toBe('finance');
  });

  /**
   * Test 3: 도메인 추론 - web (이메일, URL)
   */
  it('should infer web domain for email/url functions', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'validateEmail',
        inputType: 'string',
        outputType: 'boolean',
        body: 'return input.includes("@")',
      },
    ];

    const engine = new ParameterConstraintsEngine();
    const results = engine.build(functions);

    const info = results.get('validateEmail');
    expect(info!.parameters[0].domain).toBe('web');
  });

  /**
   * Test 4: 파라미터 사용 추적 (산술 연산)
   */
  it('should track parameter usage in arithmetic operations', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'double',
        inputType: 'number',
        outputType: 'number',
        body: 'return input * 2',
      },
    ];

    const engine = new ParameterConstraintsEngine();
    const results = engine.build(functions);

    const info = results.get('double');
    const param = info!.parameters[0];
    const arithmeticUsage = param.usage.find((u) => u.location === 'arithmetic');
    expect(arithmeticUsage).toBeDefined();
  });

  /**
   * Test 5: 파라미터 사용 추적 (문자 연산)
   */
  it('should track parameter usage in string operations', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'getLength',
        inputType: 'string',
        outputType: 'number',
        body: 'return input.length',
      },
    ];

    const engine = new ParameterConstraintsEngine();
    const results = engine.build(functions);

    const info = results.get('getLength');
    const param = info!.parameters[0];
    const stringUsage = param.usage.find((u) => u.location === 'string');
    expect(stringUsage).toBeDefined();
  });

  /**
   * Test 6: 도메인 제약 - 타입 호환성
   */
  it('should validate domain constraint: finance expects number type', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'calculatePrice',
        inputType: 'number',
        outputType: 'number',
        body: 'return input',
      },
    ];

    const engine = new ParameterConstraintsEngine();
    const results = engine.build(functions);

    const info = results.get('calculatePrice');
    const domainConstraint = info!.parameters[0].constraints.find((c) => c.type === 'domain');
    expect(domainConstraint).toBeDefined();
    expect(domainConstraint!.violated).toBe(false);
  });

  /**
   * Test 7: 제약 위반 - 타입 불일치
   */
  it('should detect constraint violation: type mismatch', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'addNumbers',
        inputType: 'string',  // finance 도메인 기대: number
        outputType: 'number',
        body: 'return input + 10',
      },
    ];

    const engine = new ParameterConstraintsEngine();
    const results = engine.build(functions);

    const info = results.get('addNumbers');
    expect(info!.violatedConstraints).toBeGreaterThan(0);
  });

  /**
   * Test 8: 기본 타입 제약
   */
  it('should enforce basic type constraints', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'process',
        inputType: 'unknown',
        outputType: 'unknown',
        body: 'return input',
      },
    ];

    const engine = new ParameterConstraintsEngine();
    const results = engine.build(functions);

    const info = results.get('process');
    const typeConstraint = info!.parameters[0].constraints.find((c) => c.type === 'type');
    expect(typeConstraint).toBeDefined();
  });

  /**
   * Test 9: 전체 신뢰도 계산
   */
  it('should calculate overall confidence for function parameters', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'processNumber',
        inputType: 'number',
        outputType: 'number',
        body: 'return input',
      },
    ];

    const engine = new ParameterConstraintsEngine();
    const results = engine.build(functions);

    const info = results.get('processNumber');
    expect(info!.overallConfidence).toBeGreaterThan(0.0);
    expect(info!.overallConfidence).toBeLessThanOrEqual(1.0);
  });

  /**
   * Test 10: 제약 위반 함수 조회
   */
  it('should get functions with violated constraints', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'goodFunction',
        inputType: 'number',
        outputType: 'number',
        body: 'return input',
      },
      {
        fnName: 'badFunction',
        inputType: 'string',
        outputType: 'number',
        body: 'return input + 10',  // 타입 불일치
      },
    ];

    const engine = new ParameterConstraintsEngine();
    engine.build(functions);

    const violated = engine.getViolatedFunctions();
    expect(violated.length).toBeGreaterThan(0);
  });

  /**
   * Test 11: 도메인 검증
   */
  it('should validate parameter domain', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'calculateTax',
        inputType: 'number',
        outputType: 'number',
        body: 'return input * 0.1',
      },
    ];

    const engine = new ParameterConstraintsEngine();
    engine.build(functions);

    const isValid = engine.validateParameterDomain('calculateTax', 'input', 'number');
    expect(isValid).toBe(true);

    const isInvalid = engine.validateParameterDomain('calculateTax', 'input', 'string');
    expect(isInvalid).toBe(false);
  });

  /**
   * Test 12: 신뢰도 높은 함수 조회
   */
  it('should get functions with high confidence', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'goodFunction',
        inputType: 'number',
        outputType: 'number',
        body: 'return input * 2',
      },
    ];

    const engine = new ParameterConstraintsEngine();
    engine.build(functions);

    const highConfidence = engine.getHighConfidenceFunctions(0.5);
    expect(highConfidence.length).toBeGreaterThan(0);
  });

  /**
   * Test 13: 모든 파라미터 정보 조회
   */
  it('should get all function parameters', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'func1',
        inputType: 'number',
        outputType: 'number',
        body: 'return input',
      },
      {
        fnName: 'func2',
        inputType: 'string',
        outputType: 'string',
        body: 'return input',
      },
    ];

    const engine = new ParameterConstraintsEngine();
    engine.build(functions);

    const allParams = engine.getAllFunctionParameters();
    expect(allParams.length).toBe(2);
  });

  /**
   * Test 14: 파라미터 필수 여부
   */
  it('should mark parameters as required', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'requiresInput',
        inputType: 'number',
        outputType: 'number',
        body: 'return input + 1',
      },
    ];

    const engine = new ParameterConstraintsEngine();
    const results = engine.build(functions);

    const info = results.get('requiresInput');
    expect(info!.parameters[0].isRequired).toBe(true);
  });

  /**
   * Test 15: 복합 시나리오 (모든 도메인)
   */
  it('should handle complex scenario with multiple domains', () => {
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
      {
        fnName: 'filterVector',
        inputType: 'array<number>',
        outputType: 'array<number>',
        body: 'return input',
      },
      {
        fnName: 'hashString',
        inputType: 'string',
        outputType: 'string',
        body: 'return input',
      },
      {
        fnName: 'readSensor',
        inputType: 'number',
        outputType: 'number',
        body: 'return input',
      },
    ];

    const engine = new ParameterConstraintsEngine();
    const results = engine.build(functions);

    // 모든 함수가 처리되었는가?
    expect(results.size).toBe(5);

    // 각 도메인 확인
    const priceInfo = results.get('calculatePrice');
    expect(priceInfo!.parameters[0].domain).toBe('finance');

    const emailInfo = results.get('validateEmail');
    expect(emailInfo!.parameters[0].domain).toBe('web');

    const vectorInfo = results.get('filterVector');
    expect(vectorInfo!.parameters[0].domain).toBe('data-science');

    const hashInfo = results.get('hashString');
    expect(hashInfo!.parameters[0].domain).toBe('crypto');

    const sensorInfo = results.get('readSensor');
    expect(sensorInfo!.parameters[0].domain).toBe('iot');
  });
});
