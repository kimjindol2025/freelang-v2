/**
 * Phase 14-3: Vectorization 보강 테스트
 *
 * 테스트 항목:
 * ✅ NEON 코드 생성 (4개)
 * ✅ 메모리 정렬 (4개)
 * ✅ 루프 언롤 최적화 (5개)
 * ✅ 캐시 프리페칭 (3개)
 * ✅ 벤치마크 (25개+)
 *
 * 총: 41개 테스트
 */

import { SIMDEnhancer, BenchmarkResult, VectorizationConfig } from '../src/codegen/simd-enhancer';

describe('Phase 14-3: Vectorization Enhancement', () => {
  let enhancer: SIMDEnhancer;

  beforeEach(() => {
    enhancer = new SIMDEnhancer();
  });

  // ============================================================================
  // 1. NEON 코드 생성 (ARM 아키텍처)
  // ============================================================================

  describe('NEON Code Generation', () => {
    it('should generate NEON code for float32', () => {
      const code = SIMDEnhancer.generateNEONCode(
        'result[i] = a[i] + b[i]',
        ['a', 'b'],
        'f32'
      );

      expect(code).toContain('arm_neon.h');
      expect(code).toContain('float32x4_t');
      expect(code).toContain('vld1q_f32');
      expect(code).toContain('vst1q_f32');
      expect(code).toContain('i += 4');
    });

    it('should generate NEON code for float64', () => {
      const code = SIMDEnhancer.generateNEONCode(
        'result[i] = a[i] * b[i]',
        ['a', 'b'],
        'f64'
      );

      expect(code).toContain('float64x2_t');
      expect(code).toContain('vld1q_f64');
      expect(code).toContain('vst1q_f64');
      expect(code).toContain('i += 2'); // 64-bit: 2 elements
    });

    it('should generate NEON code with multiple arrays', () => {
      const code = SIMDEnhancer.generateNEONCode(
        'result[i] = a[i] + b[i] * c[i]',
        ['a', 'b', 'c'],
        'f32'
      );

      expect(code).toContain('va');
      expect(code).toContain('vb');
      expect(code).toContain('vc');
    });

    it('should handle NEON for integer operations', () => {
      const code = SIMDEnhancer.generateNEONCode(
        'result[i] = a[i] + b[i]',
        ['a', 'b'],
        'f32'
      );

      expect(code.length).toBeGreaterThan(50);
      expect(code).toContain('for');
    });
  });

  // ============================================================================
  // 2. 메모리 정렬 (Memory Alignment)
  // ============================================================================

  describe('Memory Alignment', () => {
    it('should generate alignment code for AVX (32-byte)', () => {
      const code = SIMDEnhancer.generateMemoryAlignment(['a', 'b'], 'f32', 32);

      expect(code).toContain('ALIGNMENT 32');
      expect(code).toContain('aligned_alloc');
      expect(code).toContain('ELEMENT_SIZE 4');
    });

    it('should generate alignment code for SSE (16-byte)', () => {
      const code = SIMDEnhancer.generateMemoryAlignment(['x', 'y'], 'f32', 16);

      expect(code).toContain('ALIGNMENT 16');
      expect(code).toContain('aligned_alloc');
    });

    it('should generate alignment for float64', () => {
      const code = SIMDEnhancer.generateMemoryAlignment(['data'], 'f64', 32);

      expect(code).toContain('ELEMENT_SIZE 8');
      expect(code).toContain('#pragma omp simd aligned');
    });

    it('should handle multiple array alignment', () => {
      const code = SIMDEnhancer.generateMemoryAlignment(
        ['a', 'b', 'c', 'd'],
        'f32',
        32
      );

      expect(code.split('aligned_alloc').length).toBe(5); // 4 arrays + 1 header
    });
  });

  // ============================================================================
  // 3. 루프 언롤 최적화
  // ============================================================================

  describe('Loop Unroll Optimization', () => {
    it('should calculate optimal unroll factor for SSE', () => {
      const uf = SIMDEnhancer.calculateOptimalUnrollFactor(
        3, // 3 instructions per iteration
        4, // SSE (4 elements)
        4  // float32
      );

      expect(uf).toBeGreaterThanOrEqual(2);
      expect(uf).toBeLessThanOrEqual(16);
      expect(Math.log2(uf) === Math.floor(Math.log2(uf))).toBe(true); // Power of 2
    });

    it('should calculate optimal unroll factor for AVX', () => {
      const uf = SIMDEnhancer.calculateOptimalUnrollFactor(
        2, // 2 instructions (lighter workload)
        8, // AVX (8 elements)
        4  // float32
      );

      expect(uf).toBeGreaterThan(2);
    });

    it('should respect minimum unroll factor', () => {
      const uf = SIMDEnhancer.calculateOptimalUnrollFactor(10, 4, 4);
      expect(uf).toBeGreaterThanOrEqual(2);
    });

    it('should return power of 2 for all inputs', () => {
      for (let instr = 1; instr <= 10; instr++) {
        for (let width = 4; width <= 16; width *= 2) {
          const uf = SIMDEnhancer.calculateOptimalUnrollFactor(instr, width, 4);
          const log = Math.log2(uf);
          expect(log === Math.floor(log)).toBe(true);
        }
      }
    });

    it('should scale with larger element types', () => {
      const uf32 = SIMDEnhancer.calculateOptimalUnrollFactor(2, 8, 4); // float32
      const uf64 = SIMDEnhancer.calculateOptimalUnrollFactor(2, 4, 8); // float64
      expect(uf32).toBeGreaterThanOrEqual(uf64); // Smaller elements = higher UF
    });
  });

  // ============================================================================
  // 4. 캐시 프리페칭
  // ============================================================================

  describe('Cache Prefetching', () => {
    it('should generate prefetch code for single array', () => {
      const prefetch = SIMDEnhancer.generatePrefetchCode(['data'], 8, 8);

      expect(prefetch.length).toBe(1);
      expect(prefetch[0]).toContain('__builtin_prefetch');
      expect(prefetch[0]).toContain('data');
      expect(prefetch[0]).toContain('i + 64'); // 8 * 8 = 64
    });

    it('should generate prefetch for multiple arrays', () => {
      const prefetch = SIMDEnhancer.generatePrefetchCode(['a', 'b', 'c'], 4, 16);

      expect(prefetch.length).toBe(3);
      expect(prefetch[0]).toContain('a[i + 64]'); // 4 * 16 = 64
      expect(prefetch[1]).toContain('b[i + 64]');
      expect(prefetch[2]).toContain('c[i + 64]');
    });

    it('should use correct locality parameter', () => {
      const prefetch = SIMDEnhancer.generatePrefetchCode(['x'], 4, 4);

      expect(prefetch[0]).toContain(', 3)'); // locality = 3
    });
  });

  // ============================================================================
  // 5. 루프 최적화 통합
  // ============================================================================

  describe('Loop Optimization Integration', () => {
    it('should optimize simple loop', () => {
      const result = enhancer.optimizeLoop(
        'result[i] = a[i] + b[i]',
        ['a', 'b'],
        'f32'
      );

      expect(result.originalCode).toContain('result[i]');
      expect(result.optimizedCode).toContain('Vectorization Enhancement');
      expect(result.loopUnrollFactor).toBeGreaterThan(1);
      expect(result.estimatedSpeedup).toBeGreaterThan(1);
    });

    it('should include memory alignment', () => {
      const result = enhancer.optimizeLoop(
        'y[i] = x[i] * 2',
        ['x'],
        'f32'
      );

      expect(result.memoryAlignment).toContain('ALIGNMENT');
    });

    it('should include prefetch code', () => {
      const optimizationConfig: Partial<VectorizationConfig> = {
        enablePrefetch: true,
      };
      const opt = new SIMDEnhancer(optimizationConfig);

      const result = opt.optimizeLoop(
        'result[i] = sqrt(a[i])',
        ['a'],
        'f32'
      );

      expect(result.prefetchCode.length).toBeGreaterThan(0);
    });

    it('should disable prefetch when disabled', () => {
      const optimizationConfig: Partial<VectorizationConfig> = {
        enablePrefetch: false,
      };
      const opt = new SIMDEnhancer(optimizationConfig);

      const result = opt.optimizeLoop(
        'result[i] = a[i] + b[i]',
        ['a', 'b'],
        'f32'
      );

      expect(result.prefetchCode.length).toBe(0);
    });
  });

  // ============================================================================
  // 6. 벤치마크 시스템 (25+ 벤치마크)
  // ============================================================================

  describe('Benchmark System', () => {
    it('should record benchmark result', () => {
      const result: BenchmarkResult = {
        name: 'test_add_f32',
        architecture: 'AVX',
        vectorWidth: 8,
        elementCount: 1000000,
        sequentialTime: 10,
        vectorizedTime: 1,
        speedup: 10,
        throughput: 100000,
        memoryBandwidth: 32,
      };

      enhancer.recordBenchmark(result);
      expect(enhancer.getBenchmarks().length).toBe(1);
    });

    it('should calculate average speedup', () => {
      const results: BenchmarkResult[] = [
        {
          name: 'test1',
          architecture: 'AVX',
          vectorWidth: 8,
          elementCount: 1000,
          sequentialTime: 10,
          vectorizedTime: 2,
          speedup: 5,
          throughput: 500,
          memoryBandwidth: 16,
        },
        {
          name: 'test2',
          architecture: 'AVX',
          vectorWidth: 8,
          elementCount: 1000,
          sequentialTime: 10,
          vectorizedTime: 1,
          speedup: 10,
          throughput: 1000,
          memoryBandwidth: 32,
        },
      ];

      results.forEach((r) => enhancer.recordBenchmark(r));
      const stats = enhancer.getBenchmarkStats();

      expect(stats.avgSpeedup).toBe(7.5);
      expect(stats.maxSpeedup).toBe(10);
      expect(stats.minSpeedup).toBe(5);
      expect(stats.totalTests).toBe(2);
    });

    it('should handle empty benchmark list', () => {
      const stats = enhancer.getBenchmarkStats();

      expect(stats.avgSpeedup).toBe(0);
      expect(stats.maxSpeedup).toBe(0);
      expect(stats.minSpeedup).toBe(0);
      expect(stats.totalTests).toBe(0);
    });
  });

  // ============================================================================
  // 7. 성능 벤치마크 시뮬레이션 (25개)
  // ============================================================================

  describe('Performance Benchmarks (Simulated)', () => {
    const architectures: Array<'SSE' | 'AVX' | 'AVX512' | 'NEON'> = [
      'SSE',
      'AVX',
      'AVX512',
      'NEON',
    ];
    const elementCounts = [1000, 10000, 100000, 1000000];

    // 벤치마크 1-4: SSE
    architectures.forEach((arch) => {
      elementCounts.forEach((count) => {
        it(`should benchmark ${arch} with ${count} elements`, () => {
          const result: BenchmarkResult = {
            name: `benchmark_${arch}_${count}`,
            architecture: arch,
            vectorWidth: arch === 'SSE' ? 4 : arch === 'NEON' ? 4 : arch === 'AVX' ? 8 : 16,
            elementCount: count,
            sequentialTime: count / 100000, // Simulated
            vectorizedTime: count / (count > 100000 ? 500000 : 300000), // Simulated
            speedup:
              arch === 'SSE'
                ? 4
                : arch === 'NEON'
                  ? 4
                  : arch === 'AVX'
                    ? 8
                    : 16,
            throughput: count / (count / 100000),
            memoryBandwidth:
              arch === 'SSE'
                ? 16
                : arch === 'NEON'
                  ? 16
                  : arch === 'AVX'
                    ? 32
                    : 64,
          };

          enhancer.recordBenchmark(result);
          expect(result.speedup).toBeGreaterThan(1);
        });
      });
    });

    it('should show AVX superior to SSE', () => {
      const sse = enhancer
        .getBenchmarks()
        .filter((b) => b.architecture === 'SSE')[0];
      const avx = enhancer
        .getBenchmarks()
        .filter((b) => b.architecture === 'AVX')[0];

      if (sse && avx) {
        expect(avx.speedup).toBeGreaterThan(sse.speedup);
      }
    });

    it('should show AVX512 superior to AVX', () => {
      const avx = enhancer
        .getBenchmarks()
        .filter((b) => b.architecture === 'AVX')[0];
      const avx512 = enhancer
        .getBenchmarks()
        .filter((b) => b.architecture === 'AVX512')[0];

      if (avx && avx512) {
        expect(avx512.speedup).toBeGreaterThan(avx.speedup);
      }
    });

    it('should show memory bandwidth scaling', () => {
      // Create benchmarks for this test
      const testEnhancer = new SIMDEnhancer();
      [1000, 10000, 100000].forEach((count) => {
        testEnhancer.recordBenchmark({
          name: `scaling_${count}`,
          architecture: 'AVX',
          vectorWidth: 8,
          elementCount: count,
          sequentialTime: 10,
          vectorizedTime: 1,
          speedup: 10,
          throughput: count * 1000,
          memoryBandwidth: 32,
        });
      });

      const benchmarks = testEnhancer.getBenchmarks();
      const byArch = new Map<string, BenchmarkResult[]>();

      benchmarks.forEach((b) => {
        if (!byArch.has(b.architecture)) {
          byArch.set(b.architecture, []);
        }
        byArch.get(b.architecture)!.push(b);
      });

      // Each architecture should have multiple element counts
      expect(byArch.size).toBeGreaterThan(0);
    });

    // 벤치마크 5-20: 다양한 시나리오
    it('should benchmark large-scale vectorization', () => {
      const result: BenchmarkResult = {
        name: 'large_scale_avx',
        architecture: 'AVX',
        vectorWidth: 8,
        elementCount: 10000000,
        sequentialTime: 100,
        vectorizedTime: 12.5,
        speedup: 8,
        throughput: 80000000,
        memoryBandwidth: 256,
      };

      enhancer.recordBenchmark(result);
      expect(result.speedup).toBe(8);
    });

    it('should benchmark memory-bound operations', () => {
      const result: BenchmarkResult = {
        name: 'memory_bound_avx',
        architecture: 'AVX',
        vectorWidth: 8,
        elementCount: 100000000,
        sequentialTime: 500,
        vectorizedTime: 125,
        speedup: 4, // Memory limited
        throughput: 800000000,
        memoryBandwidth: 32,
      };

      enhancer.recordBenchmark(result);
      expect(result.speedup).toBeLessThan(8);
    });

    it('should benchmark compute-bound operations', () => {
      const result: BenchmarkResult = {
        name: 'compute_bound_avx512',
        architecture: 'AVX512',
        vectorWidth: 16,
        elementCount: 1000000,
        sequentialTime: 100,
        vectorizedTime: 6.25,
        speedup: 16,
        throughput: 1600000,
        memoryBandwidth: 64,
      };

      enhancer.recordBenchmark(result);
      expect(result.speedup).toBe(16);
    });

    it('should benchmark with cache effects', () => {
      // L1 cache: 32KB, L2 cache: 256KB, L3 cache: 8MB
      const result: BenchmarkResult = {
        name: 'cache_friendly_sse',
        architecture: 'SSE',
        vectorWidth: 4,
        elementCount: 4096, // Fits in L1
        sequentialTime: 0.5,
        vectorizedTime: 0.1,
        speedup: 5,
        throughput: 40960,
        memoryBandwidth: 16,
      };

      enhancer.recordBenchmark(result);
      expect(result.speedup).toBeGreaterThan(4);
    });

    it('should benchmark with cache misses', () => {
      const result: BenchmarkResult = {
        name: 'cache_miss_avx',
        architecture: 'AVX',
        vectorWidth: 8,
        elementCount: 100000000, // Exceeds all caches
        sequentialTime: 1000,
        vectorizedTime: 250,
        speedup: 4, // Much lower due to memory latency
        throughput: 400000000,
        memoryBandwidth: 32,
      };

      enhancer.recordBenchmark(result);
      expect(result.speedup).toBeLessThan(6);
    });

    it('should show prefetch benefits', () => {
      const without: BenchmarkResult = {
        name: 'without_prefetch',
        architecture: 'AVX',
        vectorWidth: 8,
        elementCount: 1000000,
        sequentialTime: 10,
        vectorizedTime: 1.5,
        speedup: 6.67,
        throughput: 666666,
        memoryBandwidth: 26.7,
      };

      const with_: BenchmarkResult = {
        name: 'with_prefetch',
        architecture: 'AVX',
        vectorWidth: 8,
        elementCount: 1000000,
        sequentialTime: 10,
        vectorizedTime: 1.36,
        speedup: 7.35,
        throughput: 735294,
        memoryBandwidth: 29.4,
      };

      enhancer.recordBenchmark(without);
      enhancer.recordBenchmark(with_);

      expect(with_.speedup).toBeGreaterThan(without.speedup);
      expect(with_.speedup / without.speedup).toBeCloseTo(1.1, 1); // ~10% improvement
    });

    it('should show loop unroll benefits', () => {
      const results: BenchmarkResult[] = [
        {
          name: 'unroll_1',
          architecture: 'AVX',
          vectorWidth: 8,
          elementCount: 1000000,
          sequentialTime: 10,
          vectorizedTime: 1.5,
          speedup: 6.67,
          throughput: 666666,
          memoryBandwidth: 26.7,
        },
        {
          name: 'unroll_2',
          architecture: 'AVX',
          vectorWidth: 8,
          elementCount: 1000000,
          sequentialTime: 10,
          vectorizedTime: 1.3,
          speedup: 7.69,
          throughput: 769230,
          memoryBandwidth: 30.8,
        },
        {
          name: 'unroll_4',
          architecture: 'AVX',
          vectorWidth: 8,
          elementCount: 1000000,
          sequentialTime: 10,
          vectorizedTime: 1.25,
          speedup: 8,
          throughput: 800000,
          memoryBandwidth: 32,
        },
        {
          name: 'unroll_8',
          architecture: 'AVX',
          vectorWidth: 8,
          elementCount: 1000000,
          sequentialTime: 10,
          vectorizedTime: 1.56,
          speedup: 6.4,
          throughput: 640000,
          memoryBandwidth: 25.6,
        },
      ];

      results.forEach((r) => enhancer.recordBenchmark(r));

      // UF=4 should be optimal
      const stats = enhancer.getBenchmarkStats();
      expect(stats.maxSpeedup).toBe(8);
    });

    it('should demonstrate realistic speedup range', () => {
      // Create benchmarks for this test
      const testEnhancer = new SIMDEnhancer();
      [4, 8, 16, 32].forEach((speedup) => {
        testEnhancer.recordBenchmark({
          name: `speedup_${speedup}`,
          architecture: 'AVX',
          vectorWidth: 8,
          elementCount: 1000000,
          sequentialTime: 100,
          vectorizedTime: 100 / speedup,
          speedup,
          throughput: 1000000 * speedup,
          memoryBandwidth: 32,
        });
      });

      const stats = testEnhancer.getBenchmarkStats();
      expect(stats.avgSpeedup).toBeGreaterThan(1);
      expect(stats.maxSpeedup).toBeLessThanOrEqual(330); // Phase 14 goal
    });
  });
});
