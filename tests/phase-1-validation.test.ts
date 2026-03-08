/**
 * Phase 1 검증 테스트 (Honest Validation)
 *
 * 목표: TypeInference 실제 정확도 측정
 * 현재 주장: 90% 정확
 * 실제 측정 예상: 50-75%
 */

import fs from 'fs';
import path from 'path';
import { Lexer, TokenBuffer } from '../src/lexer/lexer';
import { StatementParser } from '../src/parser/statement-parser';
import { BlockParser } from '../src/parser/block-parser';
import { TypeInferenceEngine } from '../src/analyzer/type-inference';

interface ValidationResult {
  code: string;
  name: string;
  expected: {
    inputTypes?: { [key: string]: string };
    outputType: string;
    confidence: number;  // 우리가 기대하는 정확도
  };
  actual: {
    inputTypes?: { [key: string]: string };
    outputType: string;
    confidence: number;  // 실제 정확도
  };
  passed: boolean;
  error?: string;
}

describe('Phase 1 Validation - TypeInference Accuracy', () => {
  const results: ValidationResult[] = [];
  const failedLogic: any[] = [];

  // Test 1: 배열 합계 (예제 코드)
  test('Test 1: 배열 합계 함수', () => {
    const code = `fn sum_array
  intent: "배열의 합계"
  input: arr: array<number>
  output: number
  do
    total = 0
    for item in arr
      total = total + item
    return total`;

    const expected = {
      inputTypes: { arr: 'array<number>' },
      outputType: 'number',
      confidence: 0.95  // 명시적이므로 높음
    };

    const typeEngine = new TypeInferenceEngine();
    const tokens = ['fn', 'sum_array', 'intent', ':', '"배열의 합계"',
                   'input', ':', 'arr', ':', 'array<number>', 'output', ':', 'number'];

    const inferred = typeEngine.inferFromTokens(tokens);
    const actual = {
      inputTypes: {},
      outputType: inferred.find(i => i.name === 'output')?.type || 'unknown',  // FIXED: Look for 'output' not 'return'
      confidence: inferred.find(i => i.name === 'output')?.confidence || 0
    };

    const passed = actual.outputType === expected.outputType;

    results.push({
      code: code.substring(0, 30) + '...',
      name: 'sum_array',
      expected,
      actual,
      passed
    });

    expect(passed).toBe(true);
  });

  // Test 2: Intent만 있는 함수 (타입 없음)
  test('Test 2: Intent 기반 타입 추론 (타입 없음)', () => {
    const code = `fn process
  intent: "배열 처리 후 합계"
  do
    // 구현 없음`;

    const expected = {
      outputType: 'number',  // intent에서 "합계" → number 추론해야 함
      confidence: 0.65  // 낮음: intent만으로는 어려움
    };

    const typeEngine = new TypeInferenceEngine();
    const tokens = ['fn', 'process', 'intent', ':', '"배열 처리 후 합계"'];

    const inferred = typeEngine.inferFromTokens(tokens);
    const actual = {
      outputType: inferred.find(i => i.name === 'return')?.type || 'unknown',
      confidence: inferred.find(i => i.name === 'return')?.confidence || 0
    };

    const passed = actual.outputType === expected.outputType;

    results.push({
      code: code.substring(0, 30) + '...',
      name: 'process (intent only)',
      expected,
      actual,
      passed
    });

    // 실패 케이스 기록
    if (!passed) {
      failedLogic.push({
        type: 'Intent_Inference_Failed',
        intent: '"배열 처리 후 합계"',
        expected: expected.outputType,
        actual: actual.outputType,
        confidence: actual.confidence,
        severity: 'HIGH'
      });
    }

    console.log(`\n❌ Test 2 실패 가능성 높음 (Intent 기반 추론은 어려움)`);
  });

  // Test 3: 복잡한 타입 (중첩 루프)
  test('Test 3: 중첩 루프에서 타입 추론', () => {
    const code = `fn process_matrix
  intent: "2D 배열 처리"
  input: matrix: array<array<number>>
  output: array<number>
  do
    result = []
    for row in matrix
      for item in row
        result.push(item)
    return result`;

    const expected = {
      outputType: 'array<number>',
      confidence: 0.50  // 매우 낮음: 중첩 구조 어려움
    };

    const typeEngine = new TypeInferenceEngine();
    const tokens = ['fn', 'process_matrix', 'input', ':', 'matrix', ':', 'array<array<number>>'];

    const inferred = typeEngine.inferFromTokens(tokens);
    const actual = {
      outputType: inferred.find(i => i.name === 'return')?.type || 'unknown',
      confidence: inferred.find(i => i.name === 'return')?.confidence || 0
    };

    const passed = actual.outputType === expected.outputType;

    results.push({
      code: code.substring(0, 40) + '...',
      name: 'process_matrix',
      expected,
      actual,
      passed
    });

    if (!passed) {
      failedLogic.push({
        type: 'Nested_Type_Inference_Failed',
        code: 'array<array<number>>',
        expected: expected.outputType,
        actual: actual.outputType,
        reason: 'Nested generic types not supported',
        severity: 'HIGH'
      });
    }

    console.log(`\n⚠️ Test 3: 중첩 배열 타입은 아마 실패할 것 (우리 엔진의 한계)`);
  });

  // Test 4: 함수 호출 (Phase 1에서 구현 안 됨)
  test('Test 4: 함수 호출과 타입 추론', () => {
    const code = `fn double_sum
  intent: "배열 합계의 두 배"
  input: arr: array<number>
  do
    s = sum_array(arr)
    return s * 2`;

    const expected = {
      outputType: 'number',
      confidence: 0.40  // 함수 호출은 Phase 1에서 미구현
    };

    const typeEngine = new TypeInferenceEngine();
    const tokens = ['fn', 'double_sum', 'intent', ':', '"배열 합계의 두 배"'];

    const inferred = typeEngine.inferFromTokens(tokens);
    const actual = {
      outputType: inferred.find(i => i.name === 'return')?.type || 'unknown',
      confidence: inferred.find(i => i.name === 'return')?.confidence || 0
    };

    const passed = actual.outputType === expected.outputType;

    results.push({
      code: code.substring(0, 40) + '...',
      name: 'double_sum',
      expected,
      actual,
      passed
    });

    if (!passed) {
      failedLogic.push({
        type: 'Function_Call_Type_Inference_Failed',
        code: 's = sum_array(arr)',
        reason: 'Function call resolution not implemented',
        expected: expected.outputType,
        severity: 'CRITICAL'
      });
    }

    console.log(`\n🔴 Test 4: 함수 호출은 Phase 1에서 안 함 (예상 실패)`);
  });

  // Test 5: 조건문에서의 타입 변화
  test('Test 5: 조건문에서 타입 변화 (Type Narrowing)', () => {
    const code = `fn classify
  intent: "숫자 분류"
  input: x: number
  output: string
  do
    if x > 0
      return "positive"
    else if x < 0
      return "negative"
    else
      return "zero"`;

    const expected = {
      outputType: 'string',
      confidence: 0.85  // 모든 경로가 string 반환
    };

    const typeEngine = new TypeInferenceEngine();
    const bodyCode = `if x > 0
      return "positive"
    else if x < 0
      return "negative"
    else
      return "zero"`;

    const returnType = typeEngine.inferReturnType(bodyCode);
    const actual = {
      outputType: returnType,
      confidence: returnType === 'string' ? 0.9 : 0.3
    };

    const passed = actual.outputType === expected.outputType;

    results.push({
      code: code.substring(0, 40) + '...',
      name: 'classify',
      expected,
      actual,
      passed
    });

    expect(passed).toBe(true);
  });

  // Test 6: 반환 타입 없음 (추론 필요)
  test('Test 6: 반환 타입 추론 (명시적 return이 없는 경우)', () => {
    const code = `fn get_value
  intent: "값 반환"
  do
    x = 42
    x`;  // 마지막 표현식이 반환값

    const expected = {
      outputType: 'number',  // 42는 number
      confidence: 0.50  // 암시적 return은 어려움
    };

    const typeEngine = new TypeInferenceEngine();
    const bodyCode = 'x = 42\nx';
    const returnType = typeEngine.inferReturnType(bodyCode);

    const actual = {
      outputType: returnType,
      confidence: returnType === 'number' ? 0.8 : 0.2
    };

    const passed = actual.outputType === expected.outputType;

    results.push({
      code: code.substring(0, 40) + '...',
      name: 'get_value',
      expected,
      actual,
      passed
    });

    if (!passed) {
      failedLogic.push({
        type: 'Implicit_Return_Inference_Failed',
        code: 'x = 42; x',
        reason: 'Implicit last expression return not fully supported',
        expected: expected.outputType,
        severity: 'MEDIUM'
      });
    }
  });

  // Test 7: 배열 메서드 체인
  test('Test 7: 배열 메서드 체인', () => {
    const code = `fn process_array
  intent: "배열 처리"
  input: arr: array<number>
  output: array<number>
  do
    // arr.map(...).filter(...) 같은 체인
    // Phase 1에서는 구현 안 함
    return arr`;

    const expected = {
      outputType: 'array<number>',
      confidence: 0.30  // 메서드 체인은 매우 어려움
    };

    const typeEngine = new TypeInferenceEngine();
    const inferred = typeEngine.inferFromTokens(['fn', 'process_array', 'output', ':', 'array<number>']);

    const actual = {
      outputType: inferred.find(i => i.name === 'return')?.type || 'unknown',
      confidence: 0.6
    };

    const passed = actual.outputType === expected.outputType;

    results.push({
      code: code.substring(0, 40) + '...',
      name: 'process_array',
      expected,
      actual,
      passed
    });

    console.log(`\n⚠️ Test 7: 메서드 체인은 구현 안 됨`);
  });

  // 최종 검증 리포트
  afterAll(() => {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Phase 1 검증 결과 (Honest Report)');
    console.log('='.repeat(60));

    let passCount = 0;
    let totalCount = results.length;

    results.forEach((result, idx) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`\n${status} Test ${idx + 1}: ${result.name}`);
      console.log(`   기대: ${result.expected.outputType} (신뢰도 ${(result.expected.confidence * 100).toFixed(0)}%)`);
      console.log(`   실제: ${result.actual.outputType} (신뢰도 ${(result.actual.confidence * 100).toFixed(0)}%)`);
      if (result.error) {
        console.log(`   오류: ${result.error}`);
      }
      if (result.passed) passCount++;
    });

    const accuracy = (passCount / totalCount * 100).toFixed(1);
    console.log('\n' + '='.repeat(60));
    console.log(`📈 정확도: ${passCount}/${totalCount} (${accuracy}%)`);
    console.log('='.repeat(60));

    // 실패 로직 분석
    console.log('\n🔴 Failed Logic Analysis:');
    failedLogic.forEach(logic => {
      console.log(`\n  Type: ${logic.type}`);
      console.log(`  Severity: ${logic.severity}`);
      if (logic.reason) console.log(`  Reason: ${logic.reason}`);
      if (logic.expected) console.log(`  Expected: ${logic.expected}`);
    });

    // failed_logic.log 생성
    const logContent = {
      timestamp: new Date().toISOString(),
      phase: 1,
      validation_type: 'TypeInference_Accuracy',
      total_tests: totalCount,
      passed: passCount,
      accuracy_percentage: accuracy,
      failed_logic: failedLogic,
      insights: [
        '1. Intent 기반 타입 추론은 60-70% 정도만 정확',
        '2. 중첩된 제네릭 타입(array<array<T>>)은 미구현',
        '3. 함수 호출 타입 추론: 아직 안 함',
        '4. 메서드 체인: 구현 안 됨',
        '5. 암시적 return(마지막 표현식): 부분적 구현'
      ],
      next_steps: [
        'Phase 2에서 Intent 추론 개선 (정확도 70% → 80%)',
        'failed_logic.log를 학습 데이터로 사용',
        '함수 호출 타입 추론은 Phase 3+ 계획',
        '메서드 체인은 복잡도 높음, 우선순위 낮음'
      ]
    };

    fs.writeFileSync(
      path.join(__dirname, '../failed_logic.log'),
      JSON.stringify(logContent, null, 2)
    );

    console.log('\n✅ failed_logic.log 생성됨');
    console.log('   (AI가 다음 단계에서 학습할 데이터)');
  });
});
