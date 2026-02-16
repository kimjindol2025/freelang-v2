/**
 * Phase 2 Task 2.3: Stub Generator Tests
 *
 * Tests stub generation from intent descriptions:
 * - Function name extraction
 * - Parameter type inference
 * - Return type inference
 * - Body generation
 */

import { StubGenerator, GeneratedStub } from '../src/generator/stub-generator';

describe('Phase 2 Task 2.3: Stub Generator', () => {
  let generator: StubGenerator;

  beforeEach(() => {
    generator = new StubGenerator();
  });

  /**
   * Test 1: Generate stub from simple intent
   */
  test('Generate stub from simple intent', () => {
    const intent = '배열의 합을 구하는 함수';
    const stub = generator.generateFromIntent(intent);

    expect(stub).toBeDefined();
    expect(stub.functionName).toBeDefined();
    expect(stub.fullCode).toBeDefined();
  });

  /**
   * Test 2: Extract function name from intent
   */
  test('Extract function name from intent', () => {
    const intent = '배열의 합을 구하는 함수';
    const stub = generator.generateFromIntent(intent);

    expect(stub.functionName).toBeDefined();
    expect(stub.functionName.length).toBeGreaterThan(0);
  });

  /**
   * Test 3: Infer parameters from intent
   */
  test('Infer parameters from intent', () => {
    const intent = '배열의 합을 구하는 함수';
    const stub = generator.generateFromIntent(intent);

    expect(stub.parameters).toBeDefined();
    expect(stub.parameters.length).toBeGreaterThan(0);
  });

  /**
   * Test 4: Infer parameter types
   */
  test('Infer parameter types correctly', () => {
    const intent = '문자열 배열에서 길이가 5 이상인 것들을 필터링';
    const stub = generator.generateFromIntent(intent);

    expect(stub.parameters.length).toBeGreaterThan(0);
    const arrayParam = stub.parameters.find(p => p.type === 'array');
    expect(arrayParam).toBeDefined();
  });

  /**
   * Test 5: Infer return type
   */
  test('Infer return type from intent', () => {
    const intent = '두 숫자의 합을 구하는 함수';
    const stub = generator.generateFromIntent(intent);

    expect(stub.returnType).toBe('number');
  });

  /**
   * Test 6: Generate summation body
   */
  test('Generate summation body for sum intent', () => {
    const intent = '배열의 합을 구하는 함수';
    const stub = generator.generateFromIntent(intent);

    expect(stub.body).toContain('total');
    expect(stub.body).toContain('for i in');
  });

  /**
   * Test 7: Generate filter body
   */
  test('Generate filter body for filtering intent', () => {
    const intent = '배열에서 특정 값을 필터링하는 함수';
    const stub = generator.generateFromIntent(intent);

    expect(stub.body).toContain('result');
    expect(stub.body).toContain('condition');
  });

  /**
   * Test 8: Generate search body
   */
  test('Generate search body for finding intent', () => {
    const intent = '배열에서 조건을 만족하는 첫 번째 요소를 찾기';
    const stub = generator.generateFromIntent(intent);

    expect(stub.body).toContain('for');
    expect(stub.body).toContain('return');
  });

  /**
   * Test 9: Include documentation comment
   */
  test('Include documentation comment when enabled', () => {
    const intent = '두 숫자를 곱하는 함수';
    const stub = generator.generateFromIntent(intent, { includeDocumentation: true });

    expect(stub.fullCode).toContain('//');
    expect(stub.fullCode).toContain(intent);
  });

  /**
   * Test 10: Format with proper code structure
   */
  test('Format code with proper function structure', () => {
    const intent = '두 숫자를 곱하는 함수';
    const stub = generator.generateFromIntent(intent, { includeDocumentation: false });

    // Should contain function definition
    expect(stub.fullCode).toContain('fn ');
    expect(stub.fullCode).toContain('(');
    expect(stub.fullCode).toContain(')');
  });

  /**
   * Test 11: Include TODO comments
   */
  test('Include TODO comments when appropriate', () => {
    const intent = '뭔가 알 수 없는 처리';
    const stub = generator.generateFromIntent(intent, { includeTodos: true });

    expect(stub.body).toContain('TODO');
  });

  /**
   * Test 12: Confidence score calculation
   */
  test('Calculate confidence score', () => {
    const intent = '배열의 합을 구하는 함수';
    const stub = generator.generateFromIntent(intent);

    expect(stub.confidence).toBeGreaterThan(0);
    expect(stub.confidence).toBeLessThanOrEqual(1);
  });

  /**
   * Test 13: Higher confidence for clear intent
   */
  test('Higher confidence for clear intents', () => {
    const clearIntent = '배열의 합을 구하는 함수';
    const vagueIntent = '뭔가 처리하는 함수';

    const clearStub = generator.generateFromIntent(clearIntent);
    const vagueStub = generator.generateFromIntent(vagueIntent);

    expect(clearStub.confidence).toBeGreaterThan(vagueStub.confidence);
  });

  /**
   * Test 14: Generate quick stub (minimal)
   */
  test('Generate quick stub', () => {
    const intent = '배열의 합을 구하는 함수';
    const quick = generator.generateQuickStub(intent);

    expect(quick).toBeDefined();
    expect(quick).toContain('fn');
  });

  /**
   * Test 15: Generate full stub (maximum documentation)
   */
  test('Generate full stub with documentation', () => {
    const intent = '배열의 합을 구하는 함수';
    const full = generator.generateFullStub(intent);

    expect(full).toBeDefined();
    expect(full).toContain('//');
    expect(full).toContain('fn');
  });
});
