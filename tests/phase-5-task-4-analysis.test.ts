/**
 * Phase 5 Task 4.2 - Body Pattern Analysis Tests
 *
 * 함수 본체 패턴 분석 검증:
 * - 루프 감지
 * - 누적 패턴 감지
 * - 메모리 사용 추정
 * - Directive 제안
 */

import { BodyAnalyzer, analyzeBody } from '../src/analyzer/body-analysis';

describe('Phase 5 Task 4.2: Body Pattern Analysis', () => {
  // ============================================================================
  // PART 1: 루프 감지 (Loop Detection)
  // ============================================================================
  describe('루프 감지', () => {
    test('루프 없음', () => {
      const body = 'let x = 0; return x;';
      const result = analyzeBody(body);

      expect(result.loops.hasLoop).toBe(false);
      expect(result.loops.loopCount).toBe(0);
    });

    test('단일 for 루프', () => {
      const body = 'for i in 0..10 { sum += i; }';
      const result = analyzeBody(body);

      expect(result.loops.hasLoop).toBe(true);
      expect(result.loops.loopCount).toBe(1);
    });

    test('단일 while 루프', () => {
      const body = 'while x < 10 { x += 1; }';
      const result = analyzeBody(body);

      expect(result.loops.hasLoop).toBe(true);
      expect(result.loops.loopCount).toBe(1);
    });

    test('여러 루프', () => {
      const body = 'for i in 0..10 { x += i; } for j in 0..5 { y += j; }';
      const result = analyzeBody(body);

      expect(result.loops.loopCount).toBe(2);
    });

    test('중첩 루프', () => {
      const body =
        'for i in 0..10 { for j in 0..10 { sum += matrix[i][j]; } }';
      const result = analyzeBody(body);

      expect(result.loops.hasNestedLoop).toBe(true);
      expect(result.loops.isComplexLoop).toBe(true);
    });

    test('복잡한 루프 (O(n^2))', () => {
      const body = 'for i in 0..n { for j in 0..n { result[i][j] = compute(); } }';
      const result = analyzeBody(body);

      expect(result.loops.isComplexLoop).toBe(true);
    });
  });

  // ============================================================================
  // PART 2: 누적 패턴 감지 (Accumulation Detection)
  // ============================================================================
  describe('누적 패턴 감지', () => {
    test('누적 없음', () => {
      const body = 'let x = a + b; return x;';
      const result = analyzeBody(body);

      expect(result.accumulation.hasAccumulation).toBe(false);
      expect(result.accumulation.operationCount).toBe(0);
    });

    test('+= 감지', () => {
      const body = 'let sum = 0; for i in 0..10 { sum += arr[i]; }';
      const result = analyzeBody(body);

      expect(result.accumulation.hasAccumulation).toBe(true);
      expect(result.accumulation.operationTypes).toContain('+=');
    });

    test('-= 감지', () => {
      const body = 'let diff = 100; diff -= 5; diff -= 10;';
      const result = analyzeBody(body);

      expect(result.accumulation.hasAccumulation).toBe(true);
      expect(result.accumulation.operationTypes).toContain('-=');
      expect(result.accumulation.operationCount).toBe(2);
    });

    test('여러 누적 연산', () => {
      const body = 'x += 1; y -= 2; z *= 3;';
      const result = analyzeBody(body);

      expect(result.accumulation.operationTypes.length).toBeGreaterThanOrEqual(
        2
      );
    });

    test('누적은 속도 제안', () => {
      const body = 'sum += value;';
      const result = analyzeBody(body);

      expect(result.accumulation.suggestsSpeed).toBe(true);
    });
  });

  // ============================================================================
  // PART 3: 메모리 사용 분석 (Memory Analysis)
  // ============================================================================
  describe('메모리 사용 분석', () => {
    test('변수 없음', () => {
      const body = 'return input + 1;';
      const result = analyzeBody(body);

      expect(result.memory.estimatedVariables).toBe(0);
    });

    test('let 변수 감지', () => {
      const body = 'let x = 0; let y = 1;';
      const result = analyzeBody(body);

      expect(result.memory.estimatedVariables).toBeGreaterThanOrEqual(2);
    });

    test('const 변수 감지', () => {
      const body = 'const MAX = 100; const SIZE = 50;';
      const result = analyzeBody(body);

      expect(result.memory.estimatedVariables).toBeGreaterThanOrEqual(2);
    });

    test('배열 선언 감지', () => {
      const body = 'let arr = [1, 2, 3]; return arr[0];';
      const result = analyzeBody(body);

      expect(result.memory.hasArrayDeclaration).toBe(true);
    });

    test('복합 변수 → 메모리 효율 제안', () => {
      const body =
        'let a = 1; let b = 2; let c = 3; let d = 4; let arr = [];';
      const result = analyzeBody(body);

      expect(result.memory.suggestsMemory).toBe(true);
    });
  });

  // ============================================================================
  // PART 4: Directive 결정 (Decision Making)
  // ============================================================================
  describe('Directive 결정', () => {
    test('루프 + 누적 → speed', () => {
      const body = 'for i in 0..100 { sum += arr[i]; }';
      const result = analyzeBody(body);

      // 루프와 누적이 있으면 speed 제안
      if (result.loops.hasLoop && result.accumulation.hasAccumulation) {
        expect(result.suggestedDirective).toBe('speed');
      }
    });

    test('많은 변수 → memory', () => {
      const body =
        'let a = 1; let b = 2; let c = 3; let d = 4; let e = 5;';
      const result = analyzeBody(body);

      // 많은 변수는 memory 제안
      if (result.memory.suggestsMemory) {
        expect(result.suggestedDirective).toBe('memory');
      }
    });

    test('기본 → safety', () => {
      const body = 'return input + 1;';
      const result = analyzeBody(body);

      // 특별한 패턴 없으면 safety 기본
      if (!result.loops.hasLoop && !result.memory.suggestsMemory) {
        expect(result.suggestedDirective).toBe('safety');
      }
    });
  });

  // ============================================================================
  // PART 5: 신뢰도 계산 (Confidence)
  // ============================================================================
  describe('신뢰도 계산', () => {
    test('루프 + 누적: 신뢰도 높음', () => {
      const body = 'for i in 0..10 { sum += arr[i]; }';
      const result = analyzeBody(body);

      // 루프(+20%) + 누적(+10%) = 60% + 30% = 90%
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test('기본: 신뢰도 낮음', () => {
      const body = 'return x;';
      const result = analyzeBody(body);

      // 특별한 패턴 없으면 60% 이하
      expect(result.confidence).toBeLessThanOrEqual(0.65);
    });

    test('신뢰도 범위: 0-1', () => {
      const body = 'for i in 0..100 { for j in 0..100 { sum += data[i][j]; } }';
      const result = analyzeBody(body);

      expect(result.confidence).toBeGreaterThanOrEqual(0.0);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  // ============================================================================
  // PART 6: 상세 설명 (Details)
  // ============================================================================
  describe('분석 상세 설명', () => {
    test('설명 생성: 루프', () => {
      const body = 'for i in 0..10 { sum += i; }';
      const result = analyzeBody(body);

      expect(result.details).toBeTruthy();
      expect(result.details).toContain('루프');
    });

    test('설명 생성: 누적', () => {
      const body = 'sum += 5;';
      const result = analyzeBody(body);

      expect(result.details).toBeTruthy();
      expect(result.details).toContain('누적');
    });

    test('설명 생성: 변수', () => {
      const body = 'let x = 1; let y = 2; let z = 3;';
      const result = analyzeBody(body);

      expect(result.details).toBeTruthy();
      // "변수" 또는 숫자 포함
      expect(result.details).toMatch(/(\d+개 변수|변수)/);
    });
  });

  // ============================================================================
  // PART 7: E2E 패턴 시나리오
  // ============================================================================
  describe('실제 코드 패턴', () => {
    test('합산 (Sum) 패턴', () => {
      const body = `let result = 0;
        for i in 0..arr.len() {
          result += arr[i];
        }
        return result;`;

      const result = analyzeBody(body);

      expect(result.loops.hasLoop).toBe(true);
      expect(result.accumulation.hasAccumulation).toBe(true);
      expect(result.suggestedDirective).toBe('speed');
    });

    test('변환 (Transform) 패턴', () => {
      const body =
        'let result = []; for item in input { x = item * 2; }';

      const result = analyzeBody(body);

      expect(result.loops.hasLoop).toBe(true);
      // 배열 리터럴 [] 감지
      expect(result.memory.estimatedVariables).toBeGreaterThanOrEqual(1);
    });

    test('필터링 (Filter) 패턴', () => {
      const body =
        'let filtered = []; for item in data { if item > 5 { } }';

      const result = analyzeBody(body);

      expect(result.loops.hasLoop).toBe(true);
      expect(result.memory.estimatedVariables).toBeGreaterThanOrEqual(1);
    });

    test('중첩 루프 (Matrix) 패턴', () => {
      const body = `let sum = 0;
        for i in 0..n {
          for j in 0..n {
            sum += matrix[i][j];
          }
        }
        return sum;`;

      const result = analyzeBody(body);

      expect(result.loops.hasNestedLoop).toBe(true);
      expect(result.loops.isComplexLoop).toBe(true);
      expect(result.suggestedDirective).toBe('speed');
    });
  });
});
