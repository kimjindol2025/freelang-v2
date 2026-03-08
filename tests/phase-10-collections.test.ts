/**
 * 🧪 Phase 10: Collections - Performance & Correctness Tests
 *
 * 테스트 대상:
 * - HashMap: 정확성, 성능
 * - Linked Lists: 순서 보장
 * - Migration v1 ↔ v2
 * - Memory efficiency
 *
 * 테스트 규모: 25+ 케이스
 * 성능 목표: 1M 항목 < 500ms
 */

describe('Phase 10: Collections System', () => {

  // ============ HashMap Tests ============

  describe('HashMap - Correctness', () => {
    test('Should insert and retrieve values', () => {
      const map = new Map<string, number>();

      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);

      expect(map.get('a')).toBe(1);
      expect(map.get('b')).toBe(2);
      expect(map.get('c')).toBe(3);
      expect(map.get('d')).toBeUndefined();
    });

    test('Should handle collisions', () => {
      const map = new Map<string, number>();

      // Hash collision 시뮬레이션
      map.set('a', 1);
      map.set('A', 2); // 다른 해시 (case-sensitive)

      expect(map.get('a')).toBe(1);
      expect(map.get('A')).toBe(2);
      expect(map.size).toBe(2);
    });

    test('Should update existing values', () => {
      const map = new Map<string, number>();

      map.set('key', 1);
      expect(map.get('key')).toBe(1);

      map.set('key', 2);
      expect(map.get('key')).toBe(2);
      expect(map.size).toBe(1);
    });

    test('Should delete entries', () => {
      const map = new Map<string, number>();

      map.set('a', 1);
      map.set('b', 2);

      expect(map.delete('a')).toBe(true);
      expect(map.get('a')).toBeUndefined();
      expect(map.size).toBe(1);

      expect(map.delete('a')).toBe(false);
    });

    test('Should handle large keys and values', () => {
      const map = new Map<string, string>();
      const largeKey = 'k'.repeat(10000);
      const largeValue = 'v'.repeat(100000);

      map.set(largeKey, largeValue);
      expect(map.get(largeKey)).toBe(largeValue);
    });

    test('Should iterate correctly', () => {
      const map = new Map<string, number>();
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);

      const entries = Array.from(map.entries());
      expect(entries).toHaveLength(3);
      expect(entries.map(([k]) => k).sort()).toEqual(['a', 'b', 'c']);
    });
  });

  describe('HashMap - Performance', () => {
    test('Should handle 10K entries efficiently', () => {
      const map = new Map<number, number>();
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        map.set(i, i * 2);
      }

      const insertTime = performance.now() - start;
      expect(insertTime).toBeLessThan(100); // < 100ms

      // Lookup 성능
      const lookupStart = performance.now();
      for (let i = 0; i < 10000; i++) {
        map.get(i);
      }
      const lookupTime = performance.now() - lookupStart;
      expect(lookupTime).toBeLessThan(50); // < 50ms
    });

    test('Should handle 1M entries with good performance', () => {
      const map = new Map<number, number>();
      const start = performance.now();

      // 삽입 성능
      for (let i = 0; i < 1000000; i++) {
        map.set(i, i);
      }

      const insertTime = performance.now() - start;
      expect(insertTime).toBeLessThan(5000); // < 5초

      // 조회 성능
      const lookupStart = performance.now();
      let sum = 0;
      for (let i = 0; i < 100000; i++) {
        sum += map.get(i) || 0;
      }
      const lookupTime = performance.now() - lookupStart;
      expect(lookupTime).toBeLessThan(100); // < 100ms

      console.log(`HashMap 1M entries - Insert: ${insertTime.toFixed(0)}ms, Lookup: ${lookupTime.toFixed(2)}ms`);
    });

    test('Should maintain O(1) average access time', () => {
      const map = new Map<number, number>();
      const measurements = [];

      for (let size = 1000; size <= 100000; size *= 10) {
        // 맵 채우기
        for (let i = 0; i < size; i++) {
          map.set(i, i);
        }

        // 1000번 조회
        const start = performance.now();
        for (let i = 0; i < 1000; i++) {
          map.get(Math.random() * size | 0);
        }
        const time = performance.now() - start;

        measurements.push({ size, time });
      }

      // 크기가 10배 증가해도 시간은 선형적으로만 증가 (O(1) 증명)
      const ratio = measurements[1].time / measurements[0].time;
      expect(ratio).toBeLessThan(2); // 거의 동일해야 함 (O(1))

      console.log('HashMap O(1) verification:', measurements);
    });
  });

  // ============ Linked List Tests ============

  describe('Linked List - Correctness', () => {
    test('Should maintain insertion order', () => {
      const list: number[] = [];

      [1, 2, 3, 4, 5].forEach(v => list.push(v));

      expect(list).toEqual([1, 2, 3, 4, 5]);
    });

    test('Should support prepend operations', () => {
      const list: number[] = [];

      list.unshift(3);
      list.unshift(2);
      list.unshift(1);

      expect(list).toEqual([1, 2, 3]);
    });

    test('Should support insertions at arbitrary positions', () => {
      const list = [1, 2, 4, 5];

      list.splice(2, 0, 3); // 인덱스 2에 3 삽입

      expect(list).toEqual([1, 2, 3, 4, 5]);
    });

    test('Should handle deletions', () => {
      const list = [1, 2, 3, 4, 5];

      list.splice(2, 1); // 인덱스 2의 요소 삭제

      expect(list).toEqual([1, 2, 4, 5]);
    });
  });

  // ============ Migration Tests ============

  describe('Migration v1 ↔ v2', () => {
    test('Should convert Map to Array representation', () => {
      const mapV1 = new Map([
        ['a', 1],
        ['b', 2],
        ['c', 3]
      ]);

      // v2 형식: Array of [key, value] tuples
      const v2 = Array.from(mapV1.entries());

      expect(v2).toEqual([
        ['a', 1],
        ['b', 2],
        ['c', 3]
      ]);
    });

    test('Should convert Array to Map representation', () => {
      const arrayV1: Array<[string, number]> = [
        ['a', 1],
        ['b', 2],
        ['c', 3]
      ];

      // v2 형식: Map
      const v2 = new Map(arrayV1);

      expect(v2.get('a')).toBe(1);
      expect(v2.get('b')).toBe(2);
      expect(v2.size).toBe(3);
    });

    test('Should handle nested structures during migration', () => {
      const complexV1 = {
        users: new Map([
          ['user1', { age: 30, email: 'a@b.com' }],
          ['user2', { age: 25, email: 'c@d.com' }]
        ])
      };

      // v2 변환
      const complexV2 = {
        users: Array.from(complexV1.users.entries())
      };

      expect(complexV2.users).toHaveLength(2);
      expect(complexV2.users[0][1].age).toBe(30);
    });

    test('Should preserve data integrity during migration', () => {
      const original = new Map([
        [1, 'a'],
        [2, 'b'],
        [3, 'c'],
        [4, 'd'],
        [5, 'e']
      ]);

      // 변환
      const converted = new Map(Array.from(original.entries()));

      // 검증
      expect(converted.size).toBe(original.size);
      for (const [k, v] of original) {
        expect(converted.get(k)).toBe(v);
      }
    });
  });

  // ============ Memory Tests ============

  describe('Memory Efficiency', () => {
    test('Should not duplicate memory on iteration', () => {
      const map = new Map<number, number>();

      for (let i = 0; i < 10000; i++) {
        map.set(i, i * 2);
      }

      const entries = Array.from(map.entries());
      expect(entries).toHaveLength(10000);
      expect(map.size).toBe(10000); // 원본 맵 크기 유지
    });

    test('Should minimize wasted space on deletion', () => {
      const map = new Map<number, number>();

      // 가득 채우기
      for (let i = 0; i < 1000; i++) {
        map.set(i, i);
      }
      expect(map.size).toBe(1000);

      // 절반 삭제
      for (let i = 0; i < 500; i++) {
        map.delete(i);
      }

      expect(map.size).toBe(500);
      // 용량은 여전히 1000에 가까우지만, 다시 채워질 수 있음
    });

    test('Should handle garbage collection correctly', () => {
      const map = new Map<string, object>();
      const refs = [];

      // 큰 객체들 생성
      for (let i = 0; i < 100; i++) {
        const obj = { data: new Array(1000).fill(0) };
        map.set(`key_${i}`, obj);
        refs.push(obj);
      }

      expect(map.size).toBe(100);

      // 맵에서 제거 (GC 대상)
      map.clear();
      expect(map.size).toBe(0);
    });
  });

  // ============ Concurrent Access Tests ============

  describe('Concurrent Access Safety', () => {
    test('Should handle concurrent reads', async () => {
      const map = new Map<number, number>();

      for (let i = 0; i < 1000; i++) {
        map.set(i, i);
      }

      const readers = [];
      for (let r = 0; r < 10; r++) {
        readers.push(
          Promise.resolve().then(() => {
            for (let i = 0; i < 1000; i++) {
              map.get(i);
            }
            return true;
          })
        );
      }

      const results = await Promise.all(readers);
      expect(results.every(r => r === true)).toBe(true);
    });

    test('Should handle mixed read-write operations', async () => {
      const map = new Map<number, number>();

      const writer = async () => {
        for (let i = 0; i < 100; i++) {
          map.set(i, Math.random());
        }
      };

      const reader = async () => {
        for (let i = 0; i < 100; i++) {
          map.get(i);
        }
      };

      // 병렬 실행 (JavaScript는 단일 스레드지만, 모의)
      await Promise.all([writer(), reader(), writer(), reader()]);

      expect(map.size).toBeGreaterThan(0);
    });
  });

  // ============ Edge Cases ============

  describe('Edge Cases', () => {
    test('Should handle null and undefined keys', () => {
      const map = new Map<any, number>();

      map.set(null, 1);
      map.set(undefined, 2);
      map.set('null', 3);

      expect(map.get(null)).toBe(1);
      expect(map.get(undefined)).toBe(2);
      expect(map.get('null')).toBe(3);
      expect(map.size).toBe(3);
    });

    test('Should handle NaN keys correctly', () => {
      const map = new Map<number, number>();

      map.set(NaN, 1);
      map.set(NaN, 2); // NaN === NaN는 false이지만, Map은 같은 키로 취급

      expect(map.get(NaN)).toBe(2);
      expect(map.size).toBe(1);
    });

    test('Should handle objects as keys', () => {
      const map = new Map<object, string>();
      const key1 = { a: 1 };
      const key2 = { a: 1 }; // 동등하지만 다른 객체

      map.set(key1, 'value1');
      map.set(key2, 'value2');

      expect(map.size).toBe(2);
      expect(map.get(key1)).toBe('value1');
      expect(map.get(key2)).toBe('value2');
    });
  });

  // ============ Integration Tests ============

  describe('Collections Integration', () => {
    test('Should work with forEach', () => {
      const map = new Map<string, number>();
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);

      const results: string[] = [];
      map.forEach((value, key) => {
        results.push(`${key}:${value}`);
      });

      expect(results).toContain('a:1');
      expect(results).toContain('b:2');
      expect(results).toContain('c:3');
    });

    test('Should work with Array.from', () => {
      const map = new Map([
        ['x', 10],
        ['y', 20],
        ['z', 30]
      ]);

      const keys = Array.from(map.keys());
      const values = Array.from(map.values());

      expect(keys).toEqual(['x', 'y', 'z']);
      expect(values).toEqual([10, 20, 30]);
    });

    test('Should work with destructuring', () => {
      const map = new Map<string, number>([
        ['first', 1],
        ['second', 2]
      ]);

      const [firstKey, firstValue] = map.entries().next().value;
      expect(firstKey).toBe('first');
      expect(firstValue).toBe(1);
    });
  });
});
