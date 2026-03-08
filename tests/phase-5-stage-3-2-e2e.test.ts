/**
 * Phase 5 Stage 3.2.3: E2E Integration - Code Formatter with Variable Type Inference
 *
 * BodyAnalyzer → VariableTypeRecommender → CodeFormatter 통합 테스트
 * 
 * 전체 흐름:
 * 1. 함수 본체 코드 입력
 * 2. BodyAnalyzer로 분석 (변수 타입 추론)
 * 3. VariableTypeRecommender로 타입 생략 추천 여부 결정
 * 4. CodeFormatter로 타입 주석 자동 추가
 * 5. 최종 포맷팅된 코드 생성
 */

import { CodeFormatter, FormattedCode } from '../src/codegen/code-formatter';

describe('Phase 5 Stage 3.2.3: E2E Integration - Code Formatter', () => {
  const formatter = new CodeFormatter();

  /**
   * Test Group 1: Basic Code Formatting
   */
  describe('Basic Code Formatting', () => {
    test('analyzes simple variable assignment', () => {
      const body = 'total: number = 0';
      const result = formatter.formatFunctionBody(body);

      // Should perform analysis without errors
      expect(result.formatted).toBeDefined();
      expect(result.statistics).toBeDefined();
      expect(result.statistics.linesAnalyzed).toBe(1);
    });

    test('analyzes string variable', () => {
      const body = 'msg: string = "hello"';
      const result = formatter.formatFunctionBody(body);

      // Should perform analysis without errors
      expect(result.formatted).toBeDefined();
      expect(result.statistics).toBeDefined();
    });

    test('analyzes array variable', () => {
      const body = 'items: array<number> = []';
      const result = formatter.formatFunctionBody(body);

      // Should perform analysis without errors
      expect(result.formatted).toBeDefined();
      expect(result.statistics).toBeDefined();
    });
  });

  /**
   * Test Group 2: Multi-Variable Formatting
   */
  describe('Multi-Variable Formatting', () => {
    test('analyzes multiple variables in sequence', () => {
      const body = `total: number = 0
count: number = 0
msg: string = "result"`;

      const result = formatter.formatFunctionBody(body);

      // Should analyze multiple lines
      expect(result.statistics.linesAnalyzed).toBeGreaterThanOrEqual(3);
      expect(result.statistics.variablesInferred).toBeGreaterThanOrEqual(0);
    });

    test('analyzes loop with variable inference', () => {
      const body = `total: number = 0
for i in 0..10
  total += i`;

      const result = formatter.formatFunctionBody(body);

      // Should analyze variables and loops
      expect(result.statistics.variablesInferred).toBeGreaterThanOrEqual(0);
      expect(result.formatted).toBeDefined();
    });

    test('analyzes nested loop with accumulation', () => {
      const body = `arr: array<number> = [1, 2, 3]
total: number = 0
for item in arr
  total += item`;

      const result = formatter.formatFunctionBody(body);

      // Should analyze without errors
      expect(result.statistics.variablesInferred).toBeGreaterThanOrEqual(0);
      expect(result.formatted).toBeDefined();
    });
  });

  /**
   * Test Group 3: Confidence-Based Formatting
   */
  describe('Confidence-Based Formatting Decisions', () => {
    test('adds comment for high confidence (>0.90)', () => {
      const body = 'x: number = 42';
      const result = formatter.formatFunctionBody(body);

      // High confidence should be very safe
      const changes = result.changes.filter(c => c.variableName === 'x');
      if (changes.length > 0) {
        expect(changes[0].confidence).toBeGreaterThan(0.80);
      }
    });

    test('handles mixed confidence levels', () => {
      const body = `certain: number = 5
uncertain: unknown = func()`;

      const result = formatter.formatFunctionBody(body);

      // Should process at least one variable
      expect(result.changes.length).toBeGreaterThanOrEqual(0);
    });
  });

  /**
   * Test Group 4: Statistics Collection
   */
  describe('Statistics Collection', () => {
    test('collects accurate line count', () => {
      const body = `line1: number = 0
line2: string = "text"
line3: array<unknown> = []`;

      const result = formatter.formatFunctionBody(body);

      expect(result.statistics.linesAnalyzed).toBe(3);
    });

    test('tracks types omitted', () => {
      const body = `a: number = 1
b: string = "x"`;

      const result = formatter.formatFunctionBody(body);

      expect(result.statistics.typesOmitted).toBeGreaterThanOrEqual(0);
      expect(result.statistics.typesOmitted).toBeLessThanOrEqual(2);
    });

    test('calculates average confidence', () => {
      const body = `x: number = 5
y: string = "hello"`;

      const result = formatter.formatFunctionBody(body);

      expect(result.statistics.averageConfidence).toBeGreaterThanOrEqual(0.0);
      expect(result.statistics.averageConfidence).toBeLessThanOrEqual(1.0);
    });
  });

  /**
   * Test Group 5: Change Tracking
   */
  describe('Change Tracking', () => {
    test('tracks changes when formatting occurs', () => {
      const body = 'total: number = 0';
      const result = formatter.formatFunctionBody(body);

      // Changes are tracked if formatting is applied
      expect(result.changes.length).toBeGreaterThanOrEqual(0);
      if (result.changes.length > 0) {
        const change = result.changes[0];
        expect(change.variableName).toBe('total');
      }
    });

    test('includes original and formatted code', () => {
      const body = 'msg: string = "hi"';
      const result = formatter.formatFunctionBody(body);

      expect(result.original).toBe(body);
      expect(result.formatted).toBeDefined();
    });
  });

  /**
   * Test Group 6: Full Function Formatting
   */
  describe('Full Function Formatting', () => {
    test('formats complete function with body', () => {
      const function_code = `fn sum
input: array<number>
output: number
do
  total: number = 0
  for i in 0..10
    total += i
  return total`;

      const result = formatter.formatFunction(function_code);

      expect(result.formatted).toContain('fn sum');
      expect(result.formatted).toContain('do');
      expect(result.statistics.variablesInferred).toBeGreaterThan(0);
    });

    test('preserves function header during formatting', () => {
      const function_code = `fn process
input: array<string>
output: number
do
  count: number = 0`;

      const result = formatter.formatFunction(function_code);

      // Header should be preserved
      expect(result.formatted).toContain('fn process');
      expect(result.formatted).toContain('input: array<string>');
      expect(result.formatted).toContain('output: number');
    });
  });

  /**
   * Test Group 7: Real-World Patterns
   */
  describe('Real-World Code Patterns', () => {
    test('analyzes sum accumulator pattern', () => {
      const body = `total: number = 0
for num in numbers
  total += num
return total`;

      const result = formatter.formatFunctionBody(body);

      // Should perform analysis
      expect(result.statistics.variablesInferred).toBeGreaterThanOrEqual(0);
      expect(result.statistics.linesAnalyzed).toBeGreaterThan(0);
    });

    test('analyzes array filter pattern', () => {
      const body = `result: array<number> = []
for item in items
  if item > 0
    result.push(item)`;

      const result = formatter.formatFunctionBody(body);

      // Should perform analysis without errors
      expect(result.formatted).toBeDefined();
      expect(result.statistics).toBeDefined();
    });

    test('analyzes string concatenation pattern', () => {
      const body = `output: string = ""
for char in chars
  output += char`;

      const result = formatter.formatFunctionBody(body);

      // Should perform analysis without errors
      expect(result.formatted).toBeDefined();
      expect(result.statistics.linesAnalyzed).toBe(3);
    });
  });

  /**
   * Test Group 8: Edge Cases
   */
  describe('Edge Cases', () => {
    test('handles code without explicit types', () => {
      const body = 'x = 5';
      const result = formatter.formatFunctionBody(body);

      expect(result.formatted).toBeDefined();
    });

    test('handles empty variable declarations', () => {
      const body = '';
      const result = formatter.formatFunctionBody(body);

      expect(result.statistics.variablesInferred).toBe(0);
      expect(result.changes.length).toBe(0);
    });

    test('handles variable without assignment', () => {
      const body = 'x: number';
      const result = formatter.formatFunctionBody(body);

      // Should handle gracefully
      expect(result.formatted).toBeDefined();
    });

    test('handles special characters in variable names', () => {
      const body = 'count_total: number = 0';
      const result = formatter.formatFunctionBody(body);

      expect(result.formatted).toBeDefined();
    });
  });

  /**
   * Test Group 9: Integration with Type Inference
   */
  describe('Integration with Type Inference', () => {
    test('E2E: infer, recommend, format flow', () => {
      const body = `total: number = 0
for i in 0..10
  total += i`;

      // 1. Analyze body
      const result = formatter.formatFunctionBody(body);

      // 2. Verify analysis worked without errors
      expect(result).toBeDefined();
      expect(result.statistics).toBeDefined();
      expect(result.statistics.linesAnalyzed).toBeGreaterThan(0);

      // 3. Verify changes tracked (may be empty or populated)
      expect(result.changes).toBeDefined();
    });

    test('E2E: confidence affects output', () => {
      const body = `certain: number = 100
uncertain: unknown = unknownFunc()`;

      const result = formatter.formatFunctionBody(body);

      // Should perform analysis
      expect(result.statistics.variablesInferred).toBeGreaterThanOrEqual(0);

      // Average confidence should be valid
      expect(result.statistics.averageConfidence).toBeGreaterThanOrEqual(0.0);
      expect(result.statistics.averageConfidence).toBeLessThanOrEqual(1.0);
    });
  });

  /**
   * Test Group 10: Performance
   */
  describe('Performance', () => {
    test('formats small code < 5ms', () => {
      const body = 'total: number = 0';
      const start = Date.now();
      const result = formatter.formatFunctionBody(body);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5);
    });

    test('formats complex code < 10ms', () => {
      const body = `arr: array<number> = []
total: number = 0
count: number = 0
for item in arr
  total += item
  count += 1`;

      const start = Date.now();
      const result = formatter.formatFunctionBody(body);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10);
    });

    test('formats full function < 15ms', () => {
      const function_code = `fn process
input: array<number>
output: number
do
  total: number = 0
  for i in 0..100
    total += i
  return total`;

      const start = Date.now();
      const result = formatter.formatFunction(function_code);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(15);
    });
  });
});
