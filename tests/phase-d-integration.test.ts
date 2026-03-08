/**
 * FreeLang Phase D - Integration Tests
 * Agent 3 통합 테스트 (52개)
 */

import { NativeFunctionRegistry } from '../src/vm/native-function-registry';
import { registerStdlibFunctions } from '../src/stdlib-builtins';

describe('Phase D-E: Integration Tests', () => {
  let registry: NativeFunctionRegistry;

  beforeAll(() => {
    registry = new NativeFunctionRegistry();
    registerStdlibFunctions(registry);
  });

  describe('Group 1: 기본 함수 (10개)', () => {
    test('D1.1: 문자열 변환', () => {
      const func = registry.get('str');
      const result = func!.executor([123]);
      expect(typeof result).toBe('string');
    });

    test('D1.2: 정수 변환', () => {
      const func = registry.get('int');
      const result = func!.executor(['123']);
      expect(result).toBe(123);
    });

    test('D1.3: 부동소수 변환', () => {
      const func = registry.get('float');
      const result = func!.executor(['123.45']);
      expect(result).toBe(123.45);
    });

    test('D1.4: 불린 변환', () => {
      const func = registry.get('bool');
      const result = func!.executor([1]);
      expect(result).toBe(true);
    });

    test('D1.5: typeof 연산자', () => {
      const func = registry.get('typeof');
      const result = func!.executor([123]);
      expect(result).toBe('number');
    });

    test('D1.6: 제곱근', () => {
      const func = registry.get('sqrt');
      const result = func!.executor([16]);
      expect(result).toBe(4);
    });

    test('D1.7: 거듭제곱', () => {
      const func = registry.get('pow');
      const result = func!.executor([2, 3]);
      expect(result).toBe(8);
    });

    test('D1.8: 사인 함수', () => {
      const func = registry.get('sin');
      const result = func!.executor([0]);
      expect(result).toBe(0);
    });

    test('D1.9: 로그 함수', () => {
      const func = registry.get('log');
      expect(func).toBeDefined();
    });

    test('D1.10: 랜덤 함수', () => {
      const func = registry.get('random');
      expect(func).toBeDefined();
    });
  });

  describe('Group 2: 문자열 함수 (10개)', () => {
    test('D2.1: 문자열 길이', () => {
      const func = registry.get('strlen');
      const result = func!.executor(['hello']);
      expect(result).toBe(5);
    });

    test('D2.2: 대문자 변환', () => {
      const func = registry.get('toupper');
      const result = func!.executor(['hello']);
      expect(result).toBe('HELLO');
    });

    test('D2.3: 소문자 변환', () => {
      const func = registry.get('tolower');
      const result = func!.executor(['HELLO']);
      expect(result).toBe('hello');
    });

    test('D2.4: 부분 문자열', () => {
      const func = registry.get('substring');
      const result = func!.executor(['hello', 1, 4]);
      expect(result).toBe('ell');
    });

    test('D2.5: 문자열 분할', () => {
      const func = registry.get('split');
      const result = func!.executor(['a,b,c', ',']);
      expect(Array.isArray(result)).toBe(true);
    });

    test('D2.6: 문자열 포함 여부', () => {
      const func = registry.get('includes');
      const result = func!.executor(['hello world', 'world']);
      expect(result).toBe(true);
    });

    test('D2.7: 시작 문자 확인', () => {
      const func = registry.get('startswith');
      const result = func!.executor(['hello', 'he']);
      expect(result).toBe(true);
    });

    test('D2.8: 종료 문자 확인', () => {
      const func = registry.get('endswith');
      const result = func!.executor(['hello', 'lo']);
      expect(result).toBe(true);
    });

    test('D2.9: 문자열 치환', () => {
      const func = registry.get('replace');
      const result = func!.executor(['hello world', 'world', 'javascript']);
      expect(result).toContain('javascript');
    });

    test('D2.10: 문자열 트림', () => {
      const func = registry.get('trim');
      const result = func!.executor(['  hello  ']);
      expect(result).toBe('hello');
    });
  });

  describe('Group 3: 배열 함수 (10개)', () => {
    test('D3.1: 배열 길이', () => {
      const func = registry.get('arr_len');
      const result = func!.executor([[1, 2, 3]]);
      expect(result).toBe(3);
    });

    test('D3.2: 배열 푸시', () => {
      const func = registry.get('arr_push');
      const arr = [1, 2, 3];
      func!.executor([arr, 4]);
      expect(arr.length).toBe(4);
    });

    test('D3.3: 배열 팝', () => {
      const func = registry.get('arr_pop');
      const arr = [1, 2, 3];
      const result = func!.executor([arr]);
      expect(result).toBe(3);
    });

    test('D3.4: 배열 시프트', () => {
      const func = registry.get('arr_shift');
      const arr = [1, 2, 3];
      const result = func!.executor([arr]);
      expect(result).toBe(1);
    });

    test('D3.5: 배열 언시프트', () => {
      const func = registry.get('arr_unshift');
      const arr = [2, 3];
      func!.executor([arr, 1]);
      expect(arr[0]).toBe(1);
    });

    test('D3.6: 배열 슬라이스', () => {
      const func = registry.get('arr_slice');
      const result = func!.executor([[1, 2, 3, 4, 5], 1, 3]);
      expect(Array.isArray(result)).toBe(true);
    });

    test('D3.7: 배열 포함 여부', () => {
      const func = registry.get('arr_includes');
      const result = func!.executor([[1, 2, 3], 2]);
      expect(result).toBe(true);
    });

    test('D3.8: 배열 인덱스', () => {
      const func = registry.get('arr_indexof');
      const result = func!.executor([[1, 2, 3], 2]);
      expect(result).toBe(1);
    });

    test('D3.9: 배열 역순', () => {
      const func = registry.get('arr_reverse');
      const arr = [1, 2, 3];
      func!.executor([arr]);
      expect(arr[0]).toBe(3);
    });

    test('D3.10: 배열 연결', () => {
      const func = registry.get('arr_concat');
      const result = func!.executor([[1, 2], [3, 4]]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Group 4: 성능 테스트 (10개)', () => {
    test('D4.1: 10,000회 호출', () => {
      const func = registry.get('int');
      const start = Date.now();
      for (let i = 0; i < 10000; i++) {
        func!.executor(['123']);
      }
      const elapsed = Date.now() - start;
      console.log(`  📊 D4.1: 10,000회 = ${elapsed}ms`);
      expect(elapsed).toBeLessThan(5000);
    });

    test('D4.2: 5,000회 문자열 호출', () => {
      const func = registry.get('toupper');
      const start = Date.now();
      for (let i = 0; i < 5000; i++) {
        func!.executor(['hello']);
      }
      const elapsed = Date.now() - start;
      console.log(`  📊 D4.2: 5,000회 = ${elapsed}ms`);
      expect(elapsed).toBeLessThan(3000);
    });

    test('D4.3: 5,000회 배열 호출', () => {
      const func = registry.get('arr_len');
      const arr = [1, 2, 3, 4, 5];
      const start = Date.now();
      for (let i = 0; i < 5000; i++) {
        func!.executor([arr]);
      }
      const elapsed = Date.now() - start;
      console.log(`  📊 D4.3: 5,000회 = ${elapsed}ms`);
      expect(elapsed).toBeLessThan(3000);
    });

    test('D4.4: 3,000회 수학 연산', () => {
      const func = registry.get('sqrt');
      const start = Date.now();
      for (let i = 0; i < 3000; i++) {
        func!.executor([16]);
      }
      const elapsed = Date.now() - start;
      console.log(`  📊 D4.4: 3,000회 = ${elapsed}ms`);
      expect(elapsed).toBeLessThan(2000);
    });

    test('D4.5: 메모리 안정성', () => {
      const memBefore = process.memoryUsage().heapUsed;
      const func = registry.get('str');
      for (let i = 0; i < 1000; i++) {
        func!.executor([i]);
      }
      const memAfter = process.memoryUsage().heapUsed;
      const memUsed = (memAfter - memBefore) / 1024 / 1024;
      console.log(`  📊 D4.5: 메모리 = ${memUsed.toFixed(2)}MB`);
      expect(memUsed).toBeLessThan(50);
    });

    test('D4.6: 병렬 호출 (100개)', async () => {
      const func = registry.get('int');
      const promises = [];
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        promises.push(Promise.resolve(func!.executor(['123'])));
      }

      await Promise.all(promises);
      const elapsed = Date.now() - start;
      console.log(`  📊 D4.6: 병렬 = ${elapsed}ms`);
      expect(elapsed).toBeLessThan(1000);
    });

    test('D4.7: 함수 체이닝', () => {
      const strFunc = registry.get('str');
      const lenFunc = registry.get('strlen');
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        const str = strFunc!.executor([i]);
        lenFunc!.executor([str]);
      }

      const elapsed = Date.now() - start;
      console.log(`  📊 D4.7: 체이닝 = ${elapsed}ms`);
      expect(elapsed).toBeLessThan(2000);
    });

    test('D4.8: 복잡 연산', () => {
      const func = registry.get('pow');
      const start = Date.now();
      for (let i = 0; i < 2000; i++) {
        func!.executor([2, 10]);
      }
      const elapsed = Date.now() - start;
      console.log(`  📊 D4.8: 복잡연산 = ${elapsed}ms`);
      expect(elapsed).toBeLessThan(2000);
    });

    test('D4.9: 레지스트리 조회', () => {
      const start = Date.now();
      for (let i = 0; i < 10000; i++) {
        registry.get('str');
        registry.get('int');
        registry.get('float');
      }
      const elapsed = Date.now() - start;
      console.log(`  📊 D4.9: 조회 = ${elapsed}ms`);
      expect(elapsed).toBeLessThan(500);
    });

    test('D4.10: 다양한 함수 호출', () => {
      const functions = ['str', 'int', 'float', 'bool', 'typeof', 'sin', 'sqrt', 'pow', 'toupper', 'arr_len'];
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        for (const fname of functions) {
          const func = registry.get(fname);
          if (func) {
            func.executor([i]);
          }
        }
      }

      const elapsed = Date.now() - start;
      console.log(`  📊 D4.10: 혼합 = ${elapsed}ms`);
      expect(elapsed).toBeLessThan(3000);
    });
  });

  describe('Group 5: 호환성 (5개)', () => {
    test('D5.1: 함수 executor 필드', () => {
      const functions = ['str', 'int', 'float', 'bool', 'typeof'];
      functions.forEach(fname => {
        const func = registry.get(fname);
        expect(func).toBeDefined();
        expect(func!.executor).toBeDefined();
        expect(typeof func!.executor).toBe('function');
      });
    });

    test('D5.2: 반환값 타입', () => {
      const func = registry.get('str');
      const result = func!.executor([123]);
      expect(typeof result).toBe('string');
    });

    test('D5.3: 에러 안전성', () => {
      const func = registry.get('int');
      expect(() => {
        func!.executor(['abc']);
      }).not.toThrow();
    });

    test('D5.4: null 처리', () => {
      const func = registry.get('str');
      expect(() => {
        func!.executor([null]);
      }).not.toThrow();
    });

    test('D5.5: undefined 처리', () => {
      const func = registry.get('typeof');
      const result = func!.executor([undefined]);
      expect(result).toBe('undefined');
    });
  });

  describe('Group 6: 통합 시나리오 (5개)', () => {
    test('D6.1: 타입 변환 체인', () => {
      const strFunc = registry.get('str');
      const intFunc = registry.get('int');

      const result1 = strFunc!.executor([123]);
      expect(typeof result1).toBe('string');

      const result2 = intFunc!.executor([result1]);
      expect(typeof result2).toBe('number');
    });

    test('D6.2: 문자열 처리 파이프라인', () => {
      const trimFunc = registry.get('trim');
      const upperFunc = registry.get('toupper');
      const lenFunc = registry.get('strlen');

      const str = '  hello  ';
      const trimmed = trimFunc!.executor([str]);
      const upper = upperFunc!.executor([trimmed]);
      const len = lenFunc!.executor([upper]);

      expect(len).toBe(5);
    });

    test('D6.3: 배열 처리', () => {
      const arr = [5, 2, 8, 1, 9];
      const lenFunc = registry.get('arr_len');
      const maxFunc = registry.get('max');

      const len = lenFunc!.executor([arr]);
      const max = maxFunc!.executor(arr);

      expect(len).toBe(5);
      expect(max).toBe(9);
    });

    test('D6.4: 수학 연산', () => {
      const sqrtFunc = registry.get('sqrt');
      const powFunc = registry.get('pow');

      const result1 = powFunc!.executor([2, 4]);
      const result2 = sqrtFunc!.executor([result1]);

      expect(result2).toBe(4);
    });

    test('D6.5: 혼합 데이터 처리', () => {
      const typeFunc = registry.get('typeof');
      const testValues = [123, 'hello', true, null, [1, 2, 3]];
      const results = [];

      for (const val of testValues) {
        results.push(typeFunc!.executor([val]));
      }

      expect(results.length).toBe(5);
    });
  });
});
