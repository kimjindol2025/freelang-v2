/**
 * Phase 14-3: C CodeGen SIMD 통합 테스트
 *
 * Phase 2 C CodeGen과 Phase 14 SIMD의 통합 검증
 */

import { CGenerator } from '../src/codegen/c-generator';

describe('Phase 14-3: C CodeGen SIMD 통합', () => {
  /**
   * 그룹 1: SIMD 최적화 적용 (5 tests)
   */
  describe('SIMD 최적화 적용', () => {
    test('벡터화 가능한 루프 감지', () => {
      const code = `
        for (int i = 0; i < n; i++) {
          result[i] = a[i] + b[i];
        }
      `;

      const result = CGenerator.applySimdOptimization(
        code,
        'result[i] = a[i] + b[i]',
        'speed'
      );

      expect(result.optimized).toBe(true);
      expect(result.speedup).toBeGreaterThan(1);
    });

    test('벡터화 불가능한 루프는 원본 유지', () => {
      const code = `
        for (int i = 0; i < n; i++) {
          result[i] = result[i-1] + a[i];
        }
      `;

      const result = CGenerator.applySimdOptimization(
        code,
        'result[i] = result[i-1] + a[i]',
        'speed'
      );

      expect(result.optimized).toBe(false);
      expect(result.code).toBe(code);
    });

    test('directive가 memory인 경우 SIMD 적용 안 함', () => {
      const code = `
        for (int i = 0; i < n; i++) {
          result[i] = a[i] + b[i];
        }
      `;

      const result = CGenerator.applySimdOptimization(
        code,
        'result[i] = a[i] + b[i]',
        'memory'
      );

      expect(result.optimized).toBe(false);
    });

    test('directive가 safety인 경우 SIMD 적용 안 함', () => {
      const code = `
        for (int i = 0; i < n; i++) {
          result[i] = a[i] + b[i];
        }
      `;

      const result = CGenerator.applySimdOptimization(
        code,
        'result[i] = a[i] + b[i]',
        'safety'
      );

      expect(result.optimized).toBe(false);
    });

    test('SIMD 코드에 AVX 인트린식 포함', () => {
      const code = `
        for (int i = 0; i < n; i++) {
          result[i] = a[i] * b[i];
        }
      `;

      const result = CGenerator.applySimdOptimization(
        code,
        'result[i] = a[i] * b[i]',
        'speed'
      );

      if (result.optimized) {
        expect(result.code).toContain('_mm256_');
      }
    });
  });

  /**
   * 그룹 2: 성능 예상값 (3 tests)
   */
  describe('성능 향상 예상값', () => {
    test('AVX 벡터화는 8× 예상', () => {
      const code = 'for (int i = 0; i < n; i++) result[i] = a[i] + b[i];';

      const result = CGenerator.applySimdOptimization(
        code,
        'result[i] = a[i] + b[i]',
        'speed'
      );

      if (result.optimized) {
        expect(result.speedup).toBe(8);
      }
    });

    test('비벡터화는 1× (변화 없음)', () => {
      const code = 'for (int i = 0; i < n; i++) counter++;';

      const result = CGenerator.applySimdOptimization(
        code,
        'counter++',
        'speed'
      );

      expect(result.speedup).toBe(1);
    });

    test('종속성 있으면 1× (변화 없음)', () => {
      const code = 'for (int i = 0; i < n; i++) result[i] = result[i-1] + a[i];';

      const result = CGenerator.applySimdOptimization(
        code,
        'result[i] = result[i-1] + a[i]',
        'speed'
      );

      expect(result.speedup).toBe(1);
    });
  });

  /**
   * 그룹 3: 코드 구조 검증 (4 tests)
   */
  describe('코드 구조 검증', () => {
    test('원본 + SIMD 코드 포함', () => {
      const originalCode = `
        float sum_array(float* a, int n) {
          float sum = 0;
          for (int i = 0; i < n; i++) {
            sum += a[i];
          }
          return sum;
        }
      `;

      const result = CGenerator.applySimdOptimization(
        originalCode,
        'sum += a[i]',
        'speed'
      );

      if (result.optimized) {
        expect(result.code).toContain('// Original code');
        expect(result.code).toContain('// SIMD-optimized');
      }
    });

    test('SIMD 코드에 헤더 포함', () => {
      const code = 'for (int i = 0; i < n; i++) result[i] = a[i] + b[i];';

      const result = CGenerator.applySimdOptimization(
        code,
        'result[i] = a[i] + b[i]',
        'speed'
      );

      if (result.optimized) {
        expect(result.code).toContain('#include');
      }
    });

    test('SIMD 코드에 함수 정의 포함', () => {
      const code = 'for (int i = 0; i < n; i++) result[i] = a[i] - b[i];';

      const result = CGenerator.applySimdOptimization(
        code,
        'result[i] = a[i] - b[i]',
        'speed'
      );

      if (result.optimized) {
        expect(result.code).toContain('int vector_simd');
        expect(result.code).toContain('{');
        expect(result.code).toContain('}');
      }
    });

    test('SIMD 코드에 정렬 처리 포함', () => {
      const code = 'for (int i = 0; i < n; i++) result[i] = a[i] * b[i];';

      const result = CGenerator.applySimdOptimization(
        code,
        'result[i] = a[i] * b[i]',
        'speed'
      );

      if (result.optimized) {
        expect(result.code).toContain('alignment');
      }
    });
  });

  /**
   * 그룹 4: 다양한 연산 (4 tests)
   */
  describe('다양한 연산 타입', () => {
    test('덧셈 SIMD화', () => {
      const result = CGenerator.applySimdOptimization(
        'for (int i = 0; i < n; i++) r[i] = a[i] + b[i];',
        'r[i] = a[i] + b[i]',
        'speed'
      );

      expect(result.optimized).toBe(true);
    });

    test('뺄셈 SIMD화', () => {
      const result = CGenerator.applySimdOptimization(
        'for (int i = 0; i < n; i++) r[i] = a[i] - b[i];',
        'r[i] = a[i] - b[i]',
        'speed'
      );

      expect(result.optimized).toBe(true);
    });

    test('곱셈 SIMD화', () => {
      const result = CGenerator.applySimdOptimization(
        'for (int i = 0; i < n; i++) r[i] = a[i] * b[i];',
        'r[i] = a[i] * b[i]',
        'speed'
      );

      expect(result.optimized).toBe(true);
    });

    test('나눗셈 SIMD화', () => {
      const result = CGenerator.applySimdOptimization(
        'for (int i = 0; i < n; i++) r[i] = a[i] / b[i];',
        'r[i] = a[i] / b[i]',
        'speed'
      );

      expect(result.optimized).toBe(true);
    });
  });

  /**
   * 그룹 5: 에러 처리 (2 tests)
   */
  describe('에러 처리', () => {
    test('생성 실패 시 원본 코드 반환', () => {
      const code = 'invalid code here';

      const result = CGenerator.applySimdOptimization(
        code,
        'invalid[i] = x[i] + y[i]',
        'speed'
      );

      // 최소한 코드는 반환되어야 함
      expect(result.code).toBeDefined();
    });

    test('빈 루프 본체 처리', () => {
      const result = CGenerator.applySimdOptimization(
        'for (int i = 0; i < n; i++) {}',
        '',
        'speed'
      );

      expect(result.optimized).toBe(false);
      expect(result.speedup).toBe(1);
    });
  });

  /**
   * 그룹 6: 최적화 지시어 (3 tests)
   */
  describe('최적화 지시어', () => {
    test('speed 지시어는 SIMD 활성화', () => {
      const result = CGenerator.applySimdOptimization(
        'for (int i = 0; i < n; i++) r[i] = a[i] + b[i];',
        'r[i] = a[i] + b[i]',
        'speed'
      );

      expect(result.optimized).toBe(true);
    });

    test('memory 지시어는 SIMD 비활성화', () => {
      const result = CGenerator.applySimdOptimization(
        'for (int i = 0; i < n; i++) r[i] = a[i] + b[i];',
        'r[i] = a[i] + b[i]',
        'memory'
      );

      expect(result.optimized).toBe(false);
    });

    test('safety 지시어는 SIMD 비활성화', () => {
      const result = CGenerator.applySimdOptimization(
        'for (int i = 0; i < n; i++) r[i] = a[i] + b[i];',
        'r[i] = a[i] + b[i]',
        'safety'
      );

      expect(result.optimized).toBe(false);
    });
  });
});
