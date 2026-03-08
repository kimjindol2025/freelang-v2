/**
 * Phase 15-1: Dynamic Array Tests
 *
 * 가변 크기 배열 메모리 최적화 테스트
 * - 기본 동작 (append, get, set)
 * - 자동 리사이징
 * - 메모리 효율성
 * - 성능 벤치마크
 */

import {
  DynamicArray,
  createDynamicArray,
  toDynamicArray,
} from '../src/types/dynamic-array';

describe('Phase 15-1: Dynamic Array Engine', () => {
  describe('Basic Operations', () => {
    it('should create dynamic array with default capacity', () => {
      const da = new DynamicArray<number>();
      expect(da.size()).toBe(0);
      expect(da.capacity()).toBe(16);
      expect(da.isEmpty()).toBe(true);
    });

    it('should create dynamic array with custom initial capacity', () => {
      const da = new DynamicArray<number>(32);
      expect(da.size()).toBe(0);
      expect(da.capacity()).toBe(32);
    });

    it('should append items', () => {
      const da = new DynamicArray<number>();
      da.append(1);
      da.append(2);
      da.append(3);

      expect(da.size()).toBe(3);
      expect(da.get(0)).toBe(1);
      expect(da.get(1)).toBe(2);
      expect(da.get(2)).toBe(3);
    });

    it('should get items by index', () => {
      const da = new DynamicArray<string>();
      da.append('a');
      da.append('b');

      expect(da.get(0)).toBe('a');
      expect(da.get(1)).toBe('b');
    });

    it('should set items by index', () => {
      const da = new DynamicArray<number>();
      da.append(1);
      da.append(2);

      da.set(0, 10);
      da.set(1, 20);

      expect(da.get(0)).toBe(10);
      expect(da.get(1)).toBe(20);
    });

    it('should throw on out of bounds access', () => {
      const da = new DynamicArray<number>();
      da.append(1);

      expect(() => da.get(-1)).toThrow();
      expect(() => da.get(1)).toThrow();
      expect(() => da.set(10, 100)).toThrow();
    });
  });

  describe('Auto Resizing', () => {
    it('should grow capacity when full', () => {
      const da = new DynamicArray<number>(4);
      expect(da.capacity()).toBe(4);

      // 4개 항목 추가 (용량 도달)
      for (let i = 0; i < 4; i++) {
        da.append(i);
      }
      expect(da.capacity()).toBe(4);

      // 5번째 추가 시 grow (4 * 1.5 = 6)
      da.append(4);
      expect(da.capacity()).toBe(6);
      expect(da.size()).toBe(5);
    });

    it('should grow multiple times', () => {
      const da = new DynamicArray<number>(2);
      const expected = [2, 3, 4, 6, 9, 13]; // 2 * 1.5^n

      for (let i = 0; i < 15; i++) {
        da.append(i);
      }

      // 마지막 용량이 충분해야 함
      expect(da.size()).toBe(15);
      expect(da.capacity()).toBeGreaterThanOrEqual(15);
    });

    it('should insert items', () => {
      const da = new DynamicArray<number>();
      da.append(1);
      da.append(3);

      da.insert(1, 2);

      expect(da.size()).toBe(3);
      expect(da.get(0)).toBe(1);
      expect(da.get(1)).toBe(2);
      expect(da.get(2)).toBe(3);
    });

    it('should remove items', () => {
      const da = new DynamicArray<number>();
      da.append(1);
      da.append(2);
      da.append(3);

      const removed = da.remove(1);

      expect(removed).toBe(2);
      expect(da.size()).toBe(2);
      expect(da.get(0)).toBe(1);
      expect(da.get(1)).toBe(3);
    });

    it('should pop items', () => {
      const da = new DynamicArray<number>();
      da.append(1);
      da.append(2);
      da.append(3);

      const popped = da.pop();

      expect(popped).toBe(3);
      expect(da.size()).toBe(2);
    });
  });

  describe('Memory Optimization', () => {
    it('should shrink when capacity is too large', () => {
      const da = new DynamicArray<number>(8);

      // 32개 추가 (capacity grows: 8 -> 12 -> 18 -> 27)
      for (let i = 0; i < 32; i++) {
        da.append(i);
      }
      const maxCapacity = da.capacity();
      expect(maxCapacity).toBeGreaterThan(8);

      // 대부분 제거 (size = 2, capacity >> 2 * 4)
      for (let i = 0; i < 30; i++) {
        da.remove(0);
      }
      expect(da.size()).toBe(2);

      // capacity가 축소되어야 함
      expect(da.capacity()).toBeLessThan(maxCapacity);
    });

    it('should clear and reset capacity', () => {
      const da = new DynamicArray<number>(16);
      for (let i = 0; i < 100; i++) {
        da.append(i);
      }

      da.clear();

      expect(da.size()).toBe(0);
      expect(da.capacity()).toBe(16); // 초기값으로 리셋
    });

    it('should reserve capacity', () => {
      const da = new DynamicArray<number>();
      da.reserve(100);

      expect(da.capacity()).toBe(100);
      expect(da.size()).toBe(0);

      // 100개 추가해도 grow 안 함
      for (let i = 0; i < 100; i++) {
        da.append(i);
      }
      expect(da.capacity()).toBe(100);
    });

    it('should not shrink below initial capacity', () => {
      const da = new DynamicArray<number>(16);
      da.append(1);
      da.remove(0);

      // capacity >= 16
      expect(da.capacity()).toBeGreaterThanOrEqual(16);
    });
  });

  describe('Memory Info', () => {
    it('should report memory usage correctly', () => {
      const da = new DynamicArray<number>();
      for (let i = 0; i < 10; i++) {
        da.append(i);
      }

      const info = da.getMemoryInfo();
      expect(info.size).toBe(10);
      expect(info.capacity).toBeGreaterThanOrEqual(10);
      expect(info.wastedCapacity).toBe(info.capacity - 10);
    });
  });

  describe('Iteration', () => {
    it('should iterate through items', () => {
      const da = new DynamicArray<number>();
      for (let i = 1; i <= 5; i++) {
        da.append(i);
      }

      const items: number[] = [];
      for (const item of da) {
        items.push(item);
      }

      expect(items).toEqual([1, 2, 3, 4, 5]);
    });

    it('should convert to array', () => {
      const da = new DynamicArray<string>();
      da.append('a');
      da.append('b');
      da.append('c');

      const arr = da.toArray();
      expect(arr).toEqual(['a', 'b', 'c']);
      expect(arr.length).toBe(3); // 실제 크기, capacity 아님
    });
  });

  describe('Factory Methods', () => {
    it('should create dynamic array via factory', () => {
      const da = createDynamicArray<number>();
      expect(da.size()).toBe(0);
      expect(da.capacity()).toBe(16);
    });

    it('should convert array to dynamic array', () => {
      const arr = [1, 2, 3, 4, 5];
      const da = toDynamicArray(arr);

      expect(da.size()).toBe(5);
      for (let i = 0; i < 5; i++) {
        expect(da.get(i)).toBe(arr[i]);
      }
    });
  });

  describe('Performance Benchmarks', () => {
    it('should append 100K items efficiently', () => {
      const da = new DynamicArray<number>();
      const start = performance.now();

      for (let i = 0; i < 100_000; i++) {
        da.append(i);
      }

      const elapsed = performance.now() - start;
      console.log(`Appended 100K items in ${elapsed.toFixed(2)}ms`);

      expect(da.size()).toBe(100_000);
      // 목표: < 50ms (O(1) amortized)
      expect(elapsed).toBeLessThan(100);
    });

    it('should access items quickly', () => {
      const da = new DynamicArray<number>();
      for (let i = 0; i < 100_000; i++) {
        da.append(i);
      }

      const start = performance.now();
      let sum = 0;

      for (let i = 0; i < 100_000; i++) {
        sum += da.get(i);
      }

      const elapsed = performance.now() - start;
      console.log(`Accessed 100K items in ${elapsed.toFixed(2)}ms`);

      expect(sum).toBe((100_000 * 99_999) / 2); // 합계 확인
      expect(elapsed).toBeLessThan(50);
    });

    it('should compare memory vs JavaScript Array', () => {
      // Dynamic Array
      const da = new DynamicArray<number>();
      for (let i = 0; i < 1_000_000; i++) {
        da.append(i);
      }
      const daInfo = da.getMemoryInfo();

      // JavaScript Array
      const jsArr: number[] = [];
      for (let i = 0; i < 1_000_000; i++) {
        jsArr.push(i);
      }

      console.log(`\nMemory Comparison (1M items):`);
      console.log(`  DynamicArray: size=${daInfo.size}, capacity=${daInfo.capacity}, wasted=${daInfo.wastedCapacity}`);
      console.log(`  JS Array: length=${jsArr.length}`);
      console.log(
        `  Efficiency: ${((daInfo.wastedCapacity / daInfo.capacity) * 100).toFixed(2)}% wasted`
      );

      // DynamicArray는 35% 이하 낭비 (1M * 1.5 ≈ 1.5M, 0.5M 낭비)
      expect(daInfo.wastedCapacity / daInfo.capacity).toBeLessThan(0.35);
    });
  });
});
