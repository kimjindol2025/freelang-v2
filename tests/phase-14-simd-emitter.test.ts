/**
 * Phase 14-2: SIMD 코드 생성기 테스트
 *
 * SSE/AVX 명령어 생성 검증
 */

import { SIMDEmitter, SIMDCode } from '../src/codegen/simd-emitter';

describe('Phase 14-2: SIMD 코드 생성기', () => {
  /**
   * 그룹 1: 기본 코드 생성 (4 tests)
   */
  describe('기본 코드 생성', () => {
    test('AVX float32 덧셈 코드 생성', () => {
      const code = SIMDEmitter.generateSIMDCode(
        'result[i] = a[i] + b[i]',
        'a',
        'i',
        'AVX',
        'f32'
      );

      expect(code).toBeDefined();
      expect(code.header).toContain('#include <immintrin.h>');
      expect(code.setup).toContain('__m256');
      expect(code.loop).toContain('_mm256_add_ps');
      expect(code.cleanup).toBeDefined();
    });

    test('SSE float32 곱셈 코드 생성', () => {
      const code = SIMDEmitter.generateSIMDCode(
        'result[i] = a[i] * b[i]',
        'a',
        'i',
        'SSE',
        'f32'
      );

      expect(code.loop).toContain('_mm_mul_ps');
      expect(code.metadata.vectorWidth).toBe(4);
      expect(code.metadata.strategy).toBe('SSE');
    });

    test('AVX float64 뺄셈 코드 생성', () => {
      const code = SIMDEmitter.generateSIMDCode(
        'result[i] = a[i] - b[i]',
        'a',
        'i',
        'AVX',
        'f64'
      );

      expect(code.loop).toContain('_mm256_sub_pd');
      expect(code.metadata.elementType).toBe('f64');
      expect(code.metadata.vectorWidth).toBe(4);
    });

    test('SSE float64 나눗셈 코드 생성', () => {
      const code = SIMDEmitter.generateSIMDCode(
        'result[i] = a[i] / b[i]',
        'a',
        'i',
        'SSE',
        'f64'
      );

      expect(code.loop).toContain('_mm_div_pd');
      expect(code.metadata.vectorWidth).toBe(2);
    });
  });

  /**
   * 그룹 2: 헤더 생성 (2 tests)
   */
  describe('헤더 생성', () => {
    test('AVX 헤더 포함', () => {
      const code = SIMDEmitter.generateSIMDCode(
        'result[i] = a[i] + b[i]',
        'a',
        'i',
        'AVX',
        'f32'
      );

      expect(code.header).toContain('#include <immintrin.h>');
      expect(code.header).toContain('#include <avxintrin.h>');
    });

    test('SSE 헤더 포함', () => {
      const code = SIMDEmitter.generateSIMDCode(
        'result[i] = a[i] + b[i]',
        'a',
        'i',
        'SSE',
        'f32'
      );

      expect(code.header).toContain('#include <xmmintrin.h>');
      expect(code.header).toContain('#include <emmintrin.h>');
    });
  });

  /**
   * 그룹 3: 메타데이터 (3 tests)
   */
  describe('메타데이터', () => {
    test('AVX f32 메타데이터', () => {
      const code = SIMDEmitter.generateSIMDCode(
        'result[i] = a[i] + b[i]',
        'a',
        'i',
        'AVX',
        'f32'
      );

      expect(code.metadata.strategy).toBe('AVX');
      expect(code.metadata.vectorWidth).toBe(8);
      expect(code.metadata.estimatedSpeedup).toBe(8);
      expect(code.metadata.unrollFactor).toBe(8);
    });

    test('SSE f64 메타데이터', () => {
      const code = SIMDEmitter.generateSIMDCode(
        'result[i] = a[i] + b[i]',
        'a',
        'i',
        'SSE',
        'f64'
      );

      expect(code.metadata.strategy).toBe('SSE');
      expect(code.metadata.vectorWidth).toBe(2);
      expect(code.metadata.elementType).toBe('f64');
      expect(code.metadata.estimatedSpeedup).toBe(4);
    });

    test('명령어 수 계산', () => {
      const code = SIMDEmitter.generateSIMDCode(
        'result[i] = a[i] + b[i]',
        'a',
        'i',
        'AVX',
        'f32'
      );

      expect(code.metadata.instructionCount).toBeGreaterThan(0);
    });
  });

  /**
   * 그룹 4: C 래퍼 생성 (3 tests)
   */
  describe('C 래퍼 함수 생성', () => {
    test('기본 래퍼 생성', () => {
      const code = SIMDEmitter.generateSIMDCode(
        'result[i] = a[i] + b[i]',
        'a',
        'i',
        'AVX',
        'f32'
      );

      const wrapper = SIMDEmitter.generateCWrapper('vector_add', code, 'f32');

      expect(wrapper).toContain('#include <immintrin.h>');
      expect(wrapper).toContain('int vector_add');
      expect(wrapper).toContain('float* a, float* b');
      expect(wrapper).toContain('return 0;');
    });

    test('float64 래퍼', () => {
      const code = SIMDEmitter.generateSIMDCode(
        'result[i] = a[i] + b[i]',
        'a',
        'i',
        'AVX',
        'f64'
      );

      const wrapper = SIMDEmitter.generateCWrapper('vector_add_f64', code, 'f64');

      expect(wrapper).toContain('double* a, double* b');
      expect(wrapper).toContain('int vector_add_f64');
    });

    test('래퍼에 오류 검사 포함', () => {
      const code = SIMDEmitter.generateSIMDCode(
        'result[i] = a[i] + b[i]',
        'a',
        'i',
        'AVX',
        'f32'
      );

      const wrapper = SIMDEmitter.generateCWrapper('vector_add', code, 'f32');

      expect(wrapper).toContain('if (n <= 0 || !a || !b || !result)');
      expect(wrapper).toContain('return -1;');
    });
  });

  /**
   * 그룹 5: 정리 코드 (2 tests)
   */
  describe('정리 코드 (Scalar Cleanup)', () => {
    test('정리 코드 포함', () => {
      const code = SIMDEmitter.generateSIMDCode(
        'result[i] = a[i] + b[i]',
        'a',
        'i',
        'AVX',
        'f32'
      );

      expect(code.cleanup).toContain('remainder');
      expect(code.cleanup).toContain('for');
    });

    test('정리 루프 변수 대체', () => {
      const code = SIMDEmitter.generateSIMDCode(
        'result[i] = a[i] + b[i]',
        'a',
        'i',
        'AVX',
        'f32'
      );

      expect(code.cleanup).toContain('[i]');
      expect(code.cleanup).not.toContain('undefined');
    });
  });

  /**
   * 그룹 6: 최적화 (3 tests)
   */
  describe('최적화 옵션', () => {
    test('메모리 정렬 최적화', () => {
      const code = SIMDEmitter.generateSIMDCode(
        'result[i] = a[i] + b[i]',
        'a',
        'i',
        'AVX',
        'f32'
      );

      const optimized = SIMDEmitter.applyOptimizations(code, {
        useAlignment: true,
      });

      expect(optimized.setup).toContain('alignment');
    });

    test('루프 언롤 최적화', () => {
      const code = SIMDEmitter.generateSIMDCode(
        'result[i] = a[i] + b[i]',
        'a',
        'i',
        'AVX',
        'f32'
      );

      const optimized = SIMDEmitter.applyOptimizations(code, {
        unroll: 2,
      });

      expect(optimized.loop.length).toBeGreaterThan(code.loop.length);
    });

    test('프리페치 최적화', () => {
      const code = SIMDEmitter.generateSIMDCode(
        'result[i] = a[i] + b[i]',
        'a',
        'i',
        'AVX',
        'f32'
      );

      const optimized = SIMDEmitter.applyOptimizations(code, {
        prefetch: true,
      });

      expect(optimized.loop).toContain('_mm_prefetch');
    });
  });

  /**
   * 그룹 7: 성능 메트릭 (2 tests)
   */
  describe('성능 메트릭', () => {
    test('AVX 성능 메트릭', () => {
      const code = SIMDEmitter.generateSIMDCode(
        'result[i] = a[i] + b[i]',
        'a',
        'i',
        'AVX',
        'f32'
      );

      const metrics = SIMDEmitter.generateMetrics(code);

      expect(metrics.speedup).toBe('8×');
      expect(metrics.parallelism).toBe(8);
      expect(metrics.memoryBandwidth).toContain('32 bytes');
    });

    test('SSE 성능 메트릭', () => {
      const code = SIMDEmitter.generateSIMDCode(
        'result[i] = a[i] + b[i]',
        'a',
        'i',
        'SSE',
        'f32'
      );

      const metrics = SIMDEmitter.generateMetrics(code);

      expect(metrics.speedup).toBe('4×');
      expect(metrics.parallelism).toBe(4);
      expect(metrics.memoryBandwidth).toContain('16 bytes');
    });
  });

  /**
   * 그룹 8: 전체 코드 검증 (2 tests)
   */
  describe('전체 코드 검증', () => {
    test('AVX 전체 C 코드', () => {
      const code = SIMDEmitter.generateSIMDCode(
        'result[i] = a[i] + b[i]',
        'a',
        'i',
        'AVX',
        'f32'
      );

      const wrapper = SIMDEmitter.generateCWrapper('vector_add', code, 'f32');

      // 완전한 C 코드 검증
      expect(wrapper).toContain('#include');
      expect(wrapper).toContain('int vector_add');
      expect(wrapper).toContain('__m256');
      expect(wrapper).toContain('_mm256_');
      expect(wrapper).toContain('{');
      expect(wrapper).toContain('}');
      expect(wrapper).toMatch(/return\s+0;/);
    });

    test('SSE 전체 C 코드', () => {
      const code = SIMDEmitter.generateSIMDCode(
        'result[i] = a[i] * b[i]',
        'a',
        'i',
        'SSE',
        'f32'
      );

      const wrapper = SIMDEmitter.generateCWrapper('vector_mul', code, 'f32');

      expect(wrapper).toContain('int vector_mul');
      expect(wrapper).toContain('__m128');
      expect(wrapper).toContain('_mm_mul_ps');
    });
  });

  /**
   * 그룹 9: 엣지 케이스 (2 tests)
   */
  describe('엣지 케이스', () => {
    test('다양한 연산 타입 지원', () => {
      const ops: Array<[string, string]> = [
        ['result[i] = a[i] + b[i]', 'add'],
        ['result[i] = a[i] - b[i]', 'sub'],
        ['result[i] = a[i] * b[i]', 'mul'],
        ['result[i] = a[i] / b[i]', 'div'],
      ];

      ops.forEach(([loop, expected]) => {
        const code = SIMDEmitter.generateSIMDCode(loop, 'a', 'i', 'AVX', 'f32');
        expect(code.loop).toContain(`_mm256_${expected}_ps`);
      });
    });

    test('기본값 사용 (AVX, f32)', () => {
      const code = SIMDEmitter.generateSIMDCode(
        'result[i] = a[i] + b[i]',
        'a',
        'i'
      );

      expect(code.metadata.strategy).toBe('AVX');
      expect(code.metadata.elementType).toBe('f32');
      expect(code.loop).toContain('_mm256_add_ps');
    });
  });
});
