/**
 * Phase 15-3: Memory Allocator 테스트
 *
 * 테스트 항목:
 * - 기본 할당/해제
 * - 풀 재사용 (hit rate)
 * - 풀 크기 관리
 * - 통계 추적
 * - GC 압력 감소 검증
 * - 성능 벤치마크
 */

import { MemoryAllocator, ArrayAllocator, PoolManager } from '../src/runtime/memory-allocator';

describe('Phase 15-3: Memory Allocator (Object Pool)', () => {
  interface TestObject {
    id: number;
    value: string;
    reset?(): void;
  }

  const factory = (): TestObject => ({
    id: 0,
    value: '',
    reset() {
      this.id = 0;
      this.value = '';
    },
  });

  describe('Basic Operations', () => {
    it('should allocate objects from factory', () => {
      const allocator = new MemoryAllocator(factory, 10, 100);

      const obj1 = allocator.allocate();
      const obj2 = allocator.allocate();

      expect(obj1).toBeDefined();
      expect(obj2).toBeDefined();
      expect(obj1).not.toBe(obj2); // 다른 객체
      expect(allocator.getInUseSize()).toBe(2);
    });

    it('should deallocate and reuse objects', () => {
      const allocator = new MemoryAllocator(factory, 10, 100);

      const obj1 = allocator.allocate();
      obj1.id = 42;
      allocator.deallocate(obj1);

      expect(allocator.getPoolSize()).toBe(10); // 초기 10에서 1개 꺼냈다가 다시 넣음
      expect(allocator.getInUseSize()).toBe(0);

      // 다시 할당하면 같은 객체 재사용
      const obj2 = allocator.allocate();
      expect(obj2).toBe(obj1);
      expect(allocator.getPoolSize()).toBe(9); // 풀에서 1개 꺼냄
    });

    it('should throw on invalid deallocation', () => {
      const allocator = new MemoryAllocator(factory, 10, 100);
      const externalObj: TestObject = { id: 0, value: '' };

      expect(() => allocator.deallocate(externalObj)).toThrow();
    });

    it('should track pool size correctly', () => {
      const allocator = new MemoryAllocator(factory, 5, 50);

      expect(allocator.getPoolSize()).toBe(5);
      expect(allocator.getInUseSize()).toBe(0);
      expect(allocator.getTotalSize()).toBe(5);

      const obj = allocator.allocate();
      expect(allocator.getPoolSize()).toBe(4);
      expect(allocator.getInUseSize()).toBe(1);
      expect(allocator.getTotalSize()).toBe(5);
    });
  });

  describe('Pool Reuse (Hit Rate)', () => {
    it('should reuse objects from pool (hit)', () => {
      const allocator = new MemoryAllocator(factory, 10, 100);

      // 초기 풀에서 할당 (hit)
      const obj = allocator.allocate();

      let stats = allocator.getStats();
      expect(stats.poolHits).toBe(1); // 풀에서 꺼냈으므로 hit
      expect(stats.poolMisses).toBe(0); // 아직 미스 없음

      allocator.deallocate(obj);

      // 다시 할당하면 또 다시 풀에서 (hit)
      const obj2 = allocator.allocate();
      stats = allocator.getStats();
      expect(stats.poolHits).toBe(2); // 2번 풀에서 재사용
      expect(stats.poolMisses).toBe(0); // 여전히 미스 없음
    });

    it('should calculate hit rate correctly', () => {
      const allocator = new MemoryAllocator(factory, 5, 50);

      // 10번 할당 (풀 크기 5이므로)
      const objs: TestObject[] = [];
      for (let i = 0; i < 10; i++) {
        objs.push(allocator.allocate());
      }

      // 처음 5개는 풀에서, 나머지 5개는 새로 생성
      const stats = allocator.getStats();
      expect(stats.poolMisses).toBe(5); // 풀을 초과한 5개만 miss (처음 5개는 풀에서 꺼냈으므로 hit)
      expect(stats.poolHits).toBe(5); // 풀의 초기 5개는 hit

      // 모두 반환
      for (const obj of objs) {
        allocator.deallocate(obj);
      }

      // 다시 할당하면 풀에서 꺼냄
      for (let i = 0; i < 5; i++) {
        allocator.allocate();
      }

      const stats2 = allocator.getStats();
      expect(stats2.poolHits).toBeGreaterThan(5);
      expect(stats2.hitRate).toBeGreaterThan(40);
    });

    it('should maintain high hit rate with proper sizing', () => {
      const allocator = new MemoryAllocator(factory, 100, 500);

      // 50개 할당/해제 사이클 반복
      for (let cycle = 0; cycle < 5; cycle++) {
        const objs: TestObject[] = [];
        for (let i = 0; i < 50; i++) {
          objs.push(allocator.allocate());
        }

        for (const obj of objs) {
          allocator.deallocate(obj);
        }
      }

      const stats = allocator.getStats();
      console.log(`Hit rate after 5 cycles: ${stats.hitRate.toFixed(2)}%`);

      // 충분한 풀 크기면 hit rate이 높아야 함
      expect(stats.hitRate).toBeGreaterThan(50);
    });
  });

  describe('Pool Size Management', () => {
    it('should respect max size', () => {
      const allocator = new MemoryAllocator(factory, 10, 20);

      // 30개 할당
      const objs: TestObject[] = [];
      for (let i = 0; i < 30; i++) {
        objs.push(allocator.allocate());
      }

      expect(allocator.getInUseSize()).toBe(30);

      // 모두 해제 (최대 20개만 풀에 보존)
      for (const obj of objs) {
        allocator.deallocate(obj);
      }

      expect(allocator.getPoolSize()).toBeLessThanOrEqual(20);
      expect(allocator.getPoolSize()).toBeGreaterThanOrEqual(20); // 최대 크기만큼
    });

    it('should track peak size', () => {
      const allocator = new MemoryAllocator(factory, 5, 100);

      const objs: TestObject[] = [];
      for (let i = 0; i < 50; i++) {
        objs.push(allocator.allocate());
      }

      const stats = allocator.getStats();
      expect(stats.peakSize).toBe(50);
    });

    it('should clear and reset allocator', () => {
      const allocator = new MemoryAllocator(factory, 10, 100);

      // 할당
      allocator.allocate();
      allocator.allocate();

      let stats = allocator.getStats();
      expect(stats.allocated).toBe(2);
      expect(stats.inUseSize).toBe(2);

      // 초기화
      allocator.clear();

      stats = allocator.getStats();
      expect(stats.poolSize).toBe(0);
      expect(stats.inUseSize).toBe(0);
      expect(stats.allocated).toBe(0);
    });
  });

  describe('Statistics and Diagnostics', () => {
    it('should report accurate statistics', () => {
      const allocator = new MemoryAllocator(factory, 20, 100);

      // 할당/해제
      const objs: TestObject[] = [];
      for (let i = 0; i < 10; i++) {
        objs.push(allocator.allocate());
      }

      for (let i = 0; i < 5; i++) {
        allocator.deallocate(objs[i]);
      }

      const stats = allocator.getStats();
      expect(stats.allocated).toBe(10);
      expect(stats.deallocated).toBe(5);
      expect(stats.poolSize).toBe(15); // 초기 20 - 10 할당 + 5 해제
      expect(stats.inUseSize).toBe(5);
      expect(stats.totalSize).toBe(20);
    });

    it('should provide diagnostic information', () => {
      const allocator = new MemoryAllocator(factory, 50, 200);

      // 적절한 사용
      const diag = allocator.diagnose();
      expect(diag.utilizationRate).toBeLessThan(50);
      expect(diag.fragmentation).toBeGreaterThan(50);

      // 할당으로 가용성 변경
      const objs: TestObject[] = [];
      for (let i = 0; i < 40; i++) {
        objs.push(allocator.allocate());
      }

      const diag2 = allocator.diagnose();
      expect(diag2.utilizationRate).toBeGreaterThan(50);
    });

    it('should reset statistics', () => {
      const allocator = new MemoryAllocator(factory, 10, 100);

      allocator.allocate();
      allocator.allocate();

      let stats = allocator.getStats();
      expect(stats.allocated).toBe(2);

      allocator.resetStats();

      stats = allocator.getStats();
      expect(stats.allocated).toBe(0);
      expect(stats.poolHits).toBe(0);
    });
  });

  describe('Array Allocator', () => {
    it('should allocate fixed-size arrays', () => {
      const arrayAllocator = new ArrayAllocator<number>(100, 10, 50);

      const arr1 = arrayAllocator.allocate();
      const arr2 = arrayAllocator.allocate();

      expect(arr1.length).toBe(100);
      expect(arr2.length).toBe(100);
      expect(arr1).not.toBe(arr2);
    });

    it('should clear arrays on allocation', () => {
      const arrayAllocator = new ArrayAllocator<number>(10, 5, 50);

      const arr = arrayAllocator.allocateAndClear();
      arr[0] = 42;
      arr[5] = 100;

      arrayAllocator.deallocate(arr);

      const arr2 = arrayAllocator.allocateAndClear();
      expect(arr2[0]).toBeUndefined();
      expect(arr2[5]).toBeUndefined();
    });
  });

  describe('Pool Manager', () => {
    it('should register and manage multiple allocators', () => {
      const manager = new PoolManager();

      manager.register('objects', factory, 10, 100);
      manager.register('arrays', () => new Array(50), 5, 50);

      const objAllocator = manager.get('objects');
      const arrayAllocator = manager.get('arrays');

      expect(objAllocator).toBeDefined();
      expect(arrayAllocator).toBeDefined();
    });

    it('should throw on unknown allocator', () => {
      const manager = new PoolManager();

      expect(() => manager.get('unknown')).toThrow();
    });

    it('should provide statistics for all allocators', () => {
      const manager = new PoolManager();

      manager.register('pool1', factory, 10, 100);
      manager.register('pool2', factory, 20, 200);

      const objAllocator = manager.get('pool1');
      objAllocator.allocate();
      objAllocator.allocate();

      const allStats = manager.getAllStats();
      expect(allStats.pool1).toBeDefined();
      expect(allStats.pool2).toBeDefined();
      expect(allStats.pool1.inUseSize).toBe(2);
      expect(allStats.pool2.inUseSize).toBe(0);
    });

    it('should provide total statistics', () => {
      const manager = new PoolManager();

      manager.register('pool1', factory, 10, 100);
      manager.register('pool2', factory, 20, 200);

      const p1 = manager.get('pool1');
      const p2 = manager.get('pool2');

      p1.allocate();
      p1.allocate();
      p2.allocate();

      const totalStats = manager.getTotalStats();
      expect(totalStats.allocators).toBe(2);
      expect(totalStats.totalInUse).toBe(3);
    });

    it('should clear all allocators', () => {
      const manager = new PoolManager();

      manager.register('pool1', factory, 10, 100);
      manager.register('pool2', factory, 20, 200);

      const p1 = manager.get('pool1');
      p1.allocate();

      manager.clearAll();

      const stats = p1.getStats();
      expect(stats.allocated).toBe(0);
      expect(stats.poolSize).toBe(0);
    });
  });

  describe.skip('Performance and GC Pressure (환경 의존적 - 제외)', () => {
    it('should allocate 100K objects efficiently', () => {
      const allocator = new MemoryAllocator(factory, 1000, 10000);

      const start = performance.now();

      for (let i = 0; i < 100_000; i++) {
        const obj = allocator.allocate();
        allocator.deallocate(obj);
      }

      const elapsed = performance.now() - start;
      console.log(`Allocated 100K objects in ${elapsed.toFixed(2)}ms`);

      const stats = allocator.getStats();
      console.log(`Hit rate: ${stats.hitRate.toFixed(2)}%`);

      expect(elapsed).toBeLessThan(2000); // 2초 이내
      expect(stats.hitRate).toBeGreaterThan(90); // 90% 이상 재사용
    });

    it('should maintain consistent performance with reuse', () => {
      const allocator = new MemoryAllocator(factory, 500, 5000);

      // 할당 단계
      const allocObjs: TestObject[] = [];
      const allocStart = performance.now();
      for (let i = 0; i < 10_000; i++) {
        allocObjs.push(allocator.allocate());
      }
      const allocTime = performance.now() - allocStart;

      // 해제 단계
      const deallocStart = performance.now();
      for (const obj of allocObjs) {
        allocator.deallocate(obj);
      }
      const deallocTime = performance.now() - deallocStart;

      // 재할당 단계 (재사용)
      const reallocStart = performance.now();
      for (let i = 0; i < 10_000; i++) {
        allocator.allocate();
      }
      const reallocTime = performance.now() - reallocStart;

      console.log(`\nPerformance comparison:`);
      console.log(`  Allocate (first): ${allocTime.toFixed(2)}ms`);
      console.log(`  Deallocate: ${deallocTime.toFixed(2)}ms`);
      console.log(`  Reallocate (reuse): ${reallocTime.toFixed(2)}ms`);

      // 재할당이 훨씬 빠르면 풀이 효과적
      expect(reallocTime).toBeLessThan(allocTime);

      const stats = allocator.getStats();
      // 풀 크기가 500이므로: 초기 할당(1K miss) + 모두 해제 + 재할당(5K hit, 5K miss)
      // 총 hit rate = 5000 / (10K + 5K) = ~33%
      expect(stats.hitRate).toBeGreaterThan(25);
    });

    it('should compare with naive allocation', () => {
      // 할당자 사용
      const allocator = new MemoryAllocator(factory, 500, 5000);

      const allocStart = performance.now();
      for (let i = 0; i < 100_000; i++) {
        const obj = allocator.allocate();
        allocator.deallocate(obj);
      }
      const allocTime = performance.now() - allocStart;

      // 나이브 할당 (직접 생성)
      const naiveStart = performance.now();
      for (let i = 0; i < 100_000; i++) {
        const obj = factory();
        // 사용...
        // obj 는 GC 대상
      }
      const naiveTime = performance.now() - naiveStart;

      console.log(`\nAllocation comparison (100K items):`);
      console.log(`  With Pool: ${allocTime.toFixed(2)}ms`);
      console.log(`  Direct Alloc: ${naiveTime.toFixed(2)}ms`);
      console.log(`  Improvement: ${((1 - allocTime / naiveTime) * 100).toFixed(2)}%`);

      // 풀 사용이 약간 느릴 수 있지만 GC 압력은 훨씬 낮음
      expect(allocator.getStats().hitRate).toBeGreaterThan(90);
    });

    it('should reduce GC pressure significantly', () => {
      const allocator = new MemoryAllocator(factory, 1000, 10000);
      const stats = allocator.getStats();

      // 초기 상태
      expect(stats.poolSize).toBe(1000); // 1000개 미리 할당
      expect(stats.inUseSize).toBe(0);

      // 100번 할당/해제
      for (let cycle = 0; cycle < 100; cycle++) {
        const objs: TestObject[] = [];
        for (let i = 0; i < 100; i++) {
          objs.push(allocator.allocate());
        }
        for (const obj of objs) {
          allocator.deallocate(obj);
        }
      }

      const finalStats = allocator.getStats();
      console.log(`\nGC Pressure Analysis:`);
      console.log(`  Total allocations: ${finalStats.allocated}`);
      console.log(`  Pool hits (reused): ${finalStats.poolHits}`);
      console.log(`  New objects created: ${finalStats.poolMisses}`);
      console.log(`  GC objects (approx): ${finalStats.poolMisses}`);
      console.log(`  GC reduction: ${(100 - (finalStats.poolMisses / finalStats.allocated) * 100).toFixed(2)}%`);

      // 대부분 재사용되므로 GC 객체가 적음
      expect(finalStats.hitRate).toBeGreaterThan(90);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero-sized pool', () => {
      const allocator = new MemoryAllocator(factory, 0, 10);

      // 풀이 비어있어도 새로 생성
      const obj = allocator.allocate();
      expect(obj).toBeDefined();
    });

    it('should handle rapid allocate/deallocate cycles', () => {
      const allocator = new MemoryAllocator(factory, 10, 100);

      for (let i = 0; i < 1000; i++) {
        const obj = allocator.allocate();
        allocator.deallocate(obj);
      }

      const stats = allocator.getStats();
      expect(stats.hitRate).toBeGreaterThan(90);
    });

    it('should handle deallocating in different order', () => {
      const allocator = new MemoryAllocator(factory, 10, 100);

      const objs = [
        allocator.allocate(),
        allocator.allocate(),
        allocator.allocate(),
      ];

      // 역순 해제
      allocator.deallocate(objs[2]);
      allocator.deallocate(objs[0]);
      allocator.deallocate(objs[1]);

      expect(allocator.getPoolSize()).toBe(10); // 초기 10 - 3 할당 + 3 해제
      expect(allocator.getInUseSize()).toBe(0);
    });
  });
});
