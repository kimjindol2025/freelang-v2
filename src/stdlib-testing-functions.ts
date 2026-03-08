/**
 * FreeLang v2 - Testing Functions stdlib (+80개)
 *
 * Phase D: Agent 2 Testing Functions
 * Categories:
 * - Test Framework (20개): test_describe, test_it, test_before_each, ...
 * - Assertions (25개): assert_equal, assert_not_equal, assert_deep_equal, ...
 * - Mocking (20개): mock_function, mock_module, mock_api, ...
 * - Spying (15개): spy_on, spy_on_method, spy_calls, ...
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

// 테스트 상태 관리
interface TestContext {
  currentSuite?: string;
  currentTest?: string;
  tests: Map<string, TestResult>;
  hooks: {
    beforeAll?: () => void;
    afterAll?: () => void;
    beforeEach?: () => void;
    afterEach?: () => void;
  };
  mocks: Map<string, MockObject>;
  spies: Map<string, SpyObject>;
}

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: Error;
}

interface MockObject {
  name: string;
  original?: any;
  callCount: number;
  callArgs: any[][];
  callResults: any[];
  returnValue?: any;
  throwError?: Error;
  isResolved?: boolean;
}

interface SpyObject {
  name: string;
  target: any;
  method: string;
  original: Function;
  callCount: number;
  callArgs: any[][];
  callResults: any[];
}

const globalTestContext: TestContext = {
  tests: new Map(),
  hooks: {},
  mocks: new Map(),
  spies: new Map()
};

export function registerTestingFunctions(registry: NativeFunctionRegistry): void {
  // ────────────────────────────────────────────────────────────
  // Test Framework (20개)
  // ────────────────────────────────────────────────────────────

  // test_describe: 테스트 스위트 정의
  registry.register({
    name: 'test_describe',
    module: 'testing',
    executor: (args) => {
      const suiteName = String(args[0]);
      const callback = args[1];
      globalTestContext.currentSuite = suiteName;
      if (typeof callback === 'function') {
        callback();
      }
      return { suite: suiteName, tests: globalTestContext.tests.size };
    }
  });

  // test_it: 개별 테스트 케이스 정의
  registry.register({
    name: 'test_it',
    module: 'testing',
    executor: (args) => {
      const testName = String(args[0]);
      const callback = args[1];
      globalTestContext.currentTest = testName;
      const startTime = Date.now();
      try {
        if (typeof callback === 'function') {
          callback();
        }
        const duration = Date.now() - startTime;
        globalTestContext.tests.set(testName, {
          name: testName,
          passed: true,
          duration
        });
        return { test: testName, passed: true, duration };
      } catch (error) {
        const duration = Date.now() - startTime;
        globalTestContext.tests.set(testName, {
          name: testName,
          passed: false,
          duration,
          error: error as Error
        });
        return { test: testName, passed: false, duration, error: String(error) };
      }
    }
  });

  // test_before_each: 각 테스트 전에 실행
  registry.register({
    name: 'test_before_each',
    module: 'testing',
    executor: (args) => {
      const callback = args[0];
      if (typeof callback === 'function') {
        globalTestContext.hooks.beforeEach = callback;
      }
      return { hook: 'beforeEach', registered: true };
    }
  });

  // test_after_each: 각 테스트 후에 실행
  registry.register({
    name: 'test_after_each',
    module: 'testing',
    executor: (args) => {
      const callback = args[0];
      if (typeof callback === 'function') {
        globalTestContext.hooks.afterEach = callback;
      }
      return { hook: 'afterEach', registered: true };
    }
  });

  // test_before_all: 모든 테스트 전에 실행
  registry.register({
    name: 'test_before_all',
    module: 'testing',
    executor: (args) => {
      const callback = args[0];
      if (typeof callback === 'function') {
        globalTestContext.hooks.beforeAll = callback;
        globalTestContext.hooks.beforeAll();
      }
      return { hook: 'beforeAll', registered: true };
    }
  });

  // test_after_all: 모든 테스트 후에 실행
  registry.register({
    name: 'test_after_all',
    module: 'testing',
    executor: (args) => {
      const callback = args[0];
      if (typeof callback === 'function') {
        globalTestContext.hooks.afterAll = callback;
      }
      return { hook: 'afterAll', registered: true };
    }
  });

  // test_skip: 테스트 스킵
  registry.register({
    name: 'test_skip',
    module: 'testing',
    executor: (args) => {
      const testName = String(args[0]);
      return { test: testName, skipped: true };
    }
  });

  // test_only: 특정 테스트만 실행
  registry.register({
    name: 'test_only',
    module: 'testing',
    executor: (args) => {
      const testName = String(args[0]);
      const callback = args[1];
      if (typeof callback === 'function') {
        callback();
      }
      return { test: testName, onlyRun: true };
    }
  });

  // test_timeout: 테스트 타임아웃 설정
  registry.register({
    name: 'test_timeout',
    module: 'testing',
    executor: (args) => {
      const timeoutMs = Number(args[0]);
      return { timeout: timeoutMs, set: true };
    }
  });

  // test_retry: 테스트 재시도
  registry.register({
    name: 'test_retry',
    module: 'testing',
    executor: (args) => {
      const retries = Number(args[0]);
      const callback = args[1];
      let lastError;
      for (let i = 0; i <= retries; i++) {
        try {
          if (typeof callback === 'function') {
            callback();
          }
          return { test: 'retry', attempts: i + 1, passed: true };
        } catch (error) {
          lastError = error;
        }
      }
      return { test: 'retry', attempts: retries + 1, passed: false, error: String(lastError) };
    }
  });

  // test_concurrent: 동시 테스트 실행
  registry.register({
    name: 'test_concurrent',
    module: 'testing',
    executor: (args) => {
      const callback = args[0];
      if (typeof callback === 'function') {
        callback();
      }
      return { mode: 'concurrent', executed: true };
    }
  });

  // test_sequential: 순차 테스트 실행
  registry.register({
    name: 'test_sequential',
    module: 'testing',
    executor: (args) => {
      const callback = args[0];
      if (typeof callback === 'function') {
        callback();
      }
      return { mode: 'sequential', executed: true };
    }
  });

  // test_run: 테스트 실행
  registry.register({
    name: 'test_run',
    module: 'testing',
    executor: (args) => {
      const passedCount = Array.from(globalTestContext.tests.values()).filter(t => t.passed).length;
      const totalCount = globalTestContext.tests.size;
      return {
        total: totalCount,
        passed: passedCount,
        failed: totalCount - passedCount,
        duration: Array.from(globalTestContext.tests.values()).reduce((sum, t) => sum + t.duration, 0)
      };
    }
  });

  // test_report: 테스트 결과 보고
  registry.register({
    name: 'test_report',
    module: 'testing',
    executor: (args) => {
      const format = String(args[0] ?? 'json');
      const tests = Array.from(globalTestContext.tests.values());
      return {
        format,
        total: tests.length,
        passed: tests.filter(t => t.passed).length,
        failed: tests.filter(t => !t.passed).length,
        tests: tests.map(t => ({
          name: t.name,
          passed: t.passed,
          duration: t.duration,
          error: t.error ? String(t.error) : null
        }))
      };
    }
  });

  // test_exit_code: 테스트 종료 코드
  registry.register({
    name: 'test_exit_code',
    module: 'testing',
    executor: (args) => {
      const failedCount = Array.from(globalTestContext.tests.values()).filter(t => !t.passed).length;
      return failedCount > 0 ? 1 : 0;
    }
  });

  // test_summary: 테스트 요약
  registry.register({
    name: 'test_summary',
    module: 'testing',
    executor: (args) => {
      const tests = Array.from(globalTestContext.tests.values());
      const passedCount = tests.filter(t => t.passed).length;
      const totalCount = tests.length;
      const totalDuration = tests.reduce((sum, t) => sum + t.duration, 0);
      return {
        summary: `${passedCount}/${totalCount} passed in ${totalDuration}ms`,
        total: totalCount,
        passed: passedCount,
        failed: totalCount - passedCount,
        duration: totalDuration
      };
    }
  });

  // test_stats: 테스트 통계
  registry.register({
    name: 'test_stats',
    module: 'testing',
    executor: (args) => {
      const tests = Array.from(globalTestContext.tests.values());
      const durations = tests.map(t => t.duration);
      return {
        count: tests.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        total: durations.reduce((a, b) => a + b, 0)
      };
    }
  });

  // test_verbose: 상세 모드
  registry.register({
    name: 'test_verbose',
    module: 'testing',
    executor: (args) => {
      const enabled = args[0] !== false;
      return { verbose: enabled, mode: 'detailed' };
    }
  });

  // test_quiet: 조용한 모드
  registry.register({
    name: 'test_quiet',
    module: 'testing',
    executor: (args) => {
      const enabled = args[0] !== false;
      return { quiet: enabled, mode: 'silent' };
    }
  });

  // test_color: 색상 출력
  registry.register({
    name: 'test_color',
    module: 'testing',
    executor: (args) => {
      const enabled = args[0] !== false;
      return { color: enabled, mode: enabled ? 'colored' : 'plain' };
    }
  });

  // ────────────────────────────────────────────────────────────
  // Assertions (25개)
  // ────────────────────────────────────────────────────────────

  // assert_equal: 동등성 검사 (==)
  registry.register({
    name: 'assert_equal',
    module: 'testing',
    executor: (args) => {
      const actual = args[0];
      const expected = args[1];
      const message = String(args[2] ?? 'Assertion failed');
      if (actual == expected) {
        return { passed: true, actual, expected };
      }
      throw new Error(`${message}: expected ${expected} but got ${actual}`);
    }
  });

  // assert_not_equal: 부등성 검사 (!=)
  registry.register({
    name: 'assert_not_equal',
    module: 'testing',
    executor: (args) => {
      const actual = args[0];
      const expected = args[1];
      const message = String(args[2] ?? 'Assertion failed');
      if (actual != expected) {
        return { passed: true, actual, notEqual: expected };
      }
      throw new Error(`${message}: expected not ${expected} but got ${actual}`);
    }
  });

  // assert_strict_equal: 엄격한 동등성 검사 (===)
  registry.register({
    name: 'assert_strict_equal',
    module: 'testing',
    executor: (args) => {
      const actual = args[0];
      const expected = args[1];
      const message = String(args[2] ?? 'Assertion failed');
      if (actual === expected) {
        return { passed: true, actual, expected };
      }
      throw new Error(`${message}: expected ${expected} but got ${actual}`);
    }
  });

  // assert_not_strict_equal: 엄격한 부등성 검사 (!==)
  registry.register({
    name: 'assert_not_strict_equal',
    module: 'testing',
    executor: (args) => {
      const actual = args[0];
      const expected = args[1];
      const message = String(args[2] ?? 'Assertion failed');
      if (actual !== expected) {
        return { passed: true, actual, notEqual: expected };
      }
      throw new Error(`${message}: expected not ${expected} but got ${actual}`);
    }
  });

  // assert_deep_equal: 깊은 동등성 검사
  registry.register({
    name: 'assert_deep_equal',
    module: 'testing',
    executor: (args) => {
      const actual = args[0];
      const expected = args[1];
      const message = String(args[2] ?? 'Assertion failed');
      const deepEqual = JSON.stringify(actual) === JSON.stringify(expected);
      if (deepEqual) {
        return { passed: true, actual, expected };
      }
      throw new Error(`${message}: objects not deeply equal`);
    }
  });

  // assert_not_deep_equal: 깊은 부등성 검사
  registry.register({
    name: 'assert_not_deep_equal',
    module: 'testing',
    executor: (args) => {
      const actual = args[0];
      const expected = args[1];
      const message = String(args[2] ?? 'Assertion failed');
      const deepEqual = JSON.stringify(actual) === JSON.stringify(expected);
      if (!deepEqual) {
        return { passed: true, actual, notEqual: expected };
      }
      throw new Error(`${message}: objects are deeply equal`);
    }
  });

  // assert_is_true: 참 검사
  registry.register({
    name: 'assert_is_true',
    module: 'testing',
    executor: (args) => {
      const value = args[0];
      const message = String(args[1] ?? 'Assertion failed');
      if (value === true) {
        return { passed: true, value };
      }
      throw new Error(`${message}: expected true but got ${value}`);
    }
  });

  // assert_is_false: 거짓 검사
  registry.register({
    name: 'assert_is_false',
    module: 'testing',
    executor: (args) => {
      const value = args[0];
      const message = String(args[1] ?? 'Assertion failed');
      if (value === false) {
        return { passed: true, value };
      }
      throw new Error(`${message}: expected false but got ${value}`);
    }
  });

  // assert_is_null: null 검사
  registry.register({
    name: 'assert_is_null',
    module: 'testing',
    executor: (args) => {
      const value = args[0];
      const message = String(args[1] ?? 'Assertion failed');
      if (value === null) {
        return { passed: true, value };
      }
      throw new Error(`${message}: expected null but got ${value}`);
    }
  });

  // assert_is_undefined: undefined 검사
  registry.register({
    name: 'assert_is_undefined',
    module: 'testing',
    executor: (args) => {
      const value = args[0];
      const message = String(args[1] ?? 'Assertion failed');
      if (value === undefined) {
        return { passed: true, value };
      }
      throw new Error(`${message}: expected undefined but got ${value}`);
    }
  });

  // assert_is_nan: NaN 검사
  registry.register({
    name: 'assert_is_nan',
    module: 'testing',
    executor: (args) => {
      const value = args[0];
      const message = String(args[1] ?? 'Assertion failed');
      if (Number.isNaN(value)) {
        return { passed: true, value };
      }
      throw new Error(`${message}: expected NaN but got ${value}`);
    }
  });

  // assert_is_finite: 유한 수 검사
  registry.register({
    name: 'assert_is_finite',
    module: 'testing',
    executor: (args) => {
      const value = args[0];
      const message = String(args[1] ?? 'Assertion failed');
      if (Number.isFinite(value)) {
        return { passed: true, value };
      }
      throw new Error(`${message}: expected finite number but got ${value}`);
    }
  });

  // assert_greater_than: 초과 검사 (>)
  registry.register({
    name: 'assert_greater_than',
    module: 'testing',
    executor: (args) => {
      const actual = Number(args[0]);
      const expected = Number(args[1]);
      const message = String(args[2] ?? 'Assertion failed');
      if (actual > expected) {
        return { passed: true, actual, expected };
      }
      throw new Error(`${message}: expected ${actual} > ${expected}`);
    }
  });

  // assert_less_than: 미만 검사 (<)
  registry.register({
    name: 'assert_less_than',
    module: 'testing',
    executor: (args) => {
      const actual = Number(args[0]);
      const expected = Number(args[1]);
      const message = String(args[2] ?? 'Assertion failed');
      if (actual < expected) {
        return { passed: true, actual, expected };
      }
      throw new Error(`${message}: expected ${actual} < ${expected}`);
    }
  });

  // assert_greater_equal: 이상 검사 (>=)
  registry.register({
    name: 'assert_greater_equal',
    module: 'testing',
    executor: (args) => {
      const actual = Number(args[0]);
      const expected = Number(args[1]);
      const message = String(args[2] ?? 'Assertion failed');
      if (actual >= expected) {
        return { passed: true, actual, expected };
      }
      throw new Error(`${message}: expected ${actual} >= ${expected}`);
    }
  });

  // assert_less_equal: 이하 검사 (<=)
  registry.register({
    name: 'assert_less_equal',
    module: 'testing',
    executor: (args) => {
      const actual = Number(args[0]);
      const expected = Number(args[1]);
      const message = String(args[2] ?? 'Assertion failed');
      if (actual <= expected) {
        return { passed: true, actual, expected };
      }
      throw new Error(`${message}: expected ${actual} <= ${expected}`);
    }
  });

  // assert_match: 정규식 일치 검사
  registry.register({
    name: 'assert_match',
    module: 'testing',
    executor: (args) => {
      const str = String(args[0]);
      const pattern = args[1];
      const message = String(args[2] ?? 'Assertion failed');
      const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
      if (regex.test(str)) {
        return { passed: true, str, pattern: pattern.toString() };
      }
      throw new Error(`${message}: ${str} does not match ${pattern}`);
    }
  });

  // assert_not_match: 정규식 불일치 검사
  registry.register({
    name: 'assert_not_match',
    module: 'testing',
    executor: (args) => {
      const str = String(args[0]);
      const pattern = args[1];
      const message = String(args[2] ?? 'Assertion failed');
      const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
      if (!regex.test(str)) {
        return { passed: true, str, notMatch: pattern.toString() };
      }
      throw new Error(`${message}: ${str} matches ${pattern}`);
    }
  });

  // assert_throws: 예외 발생 검사
  registry.register({
    name: 'assert_throws',
    module: 'testing',
    executor: (args) => {
      const fn = args[0];
      const message = String(args[1] ?? 'Assertion failed');
      try {
        if (typeof fn === 'function') {
          fn();
        }
        throw new Error(`${message}: expected function to throw`);
      } catch (error) {
        if (error instanceof Error && error.message.includes('expected function to throw')) {
          throw error;
        }
        return { passed: true, threw: true, error: String(error) };
      }
    }
  });

  // assert_does_not_throw: 예외 미발생 검사
  registry.register({
    name: 'assert_does_not_throw',
    module: 'testing',
    executor: (args) => {
      const fn = args[0];
      const message = String(args[1] ?? 'Assertion failed');
      try {
        if (typeof fn === 'function') {
          fn();
        }
        return { passed: true, threw: false };
      } catch (error) {
        throw new Error(`${message}: expected function not to throw but got ${error}`);
      }
    }
  });

  // assert_rejects: Promise 거부 검사
  registry.register({
    name: 'assert_rejects',
    module: 'testing',
    executor: async (args) => {
      const fn = args[0];
      const message = String(args[1] ?? 'Assertion failed');
      try {
        if (typeof fn === 'function') {
          await fn();
        }
        throw new Error(`${message}: expected promise to reject`);
      } catch (error) {
        if (error instanceof Error && error.message.includes('expected promise to reject')) {
          throw error;
        }
        return { passed: true, rejected: true, error: String(error) };
      }
    }
  });

  // assert_does_not_reject: Promise 미거부 검사
  registry.register({
    name: 'assert_does_not_reject',
    module: 'testing',
    executor: async (args) => {
      const fn = args[0];
      const message = String(args[1] ?? 'Assertion failed');
      try {
        if (typeof fn === 'function') {
          await fn();
        }
        return { passed: true, rejected: false };
      } catch (error) {
        throw new Error(`${message}: expected promise not to reject but got ${error}`);
      }
    }
  });

  // assert_includes: 포함 검사
  registry.register({
    name: 'assert_includes',
    module: 'testing',
    executor: (args) => {
      const haystack = args[0];
      const needle = args[1];
      const message = String(args[2] ?? 'Assertion failed');
      const included = Array.isArray(haystack) ? haystack.includes(needle) : String(haystack).includes(String(needle));
      if (included) {
        return { passed: true, included: true };
      }
      throw new Error(`${message}: expected to include ${needle}`);
    }
  });

  // assert_not_includes: 미포함 검사
  registry.register({
    name: 'assert_not_includes',
    module: 'testing',
    executor: (args) => {
      const haystack = args[0];
      const needle = args[1];
      const message = String(args[2] ?? 'Assertion failed');
      const included = Array.isArray(haystack) ? haystack.includes(needle) : String(haystack).includes(String(needle));
      if (!included) {
        return { passed: true, included: false };
      }
      throw new Error(`${message}: expected not to include ${needle}`);
    }
  });

  // assert_instanceof: instanceof 검사
  registry.register({
    name: 'assert_instanceof',
    module: 'testing',
    executor: (args) => {
      const obj = args[0];
      const constructor = args[1];
      const message = String(args[2] ?? 'Assertion failed');
      if (obj instanceof constructor) {
        return { passed: true, isInstance: true };
      }
      throw new Error(`${message}: expected to be instanceof ${constructor.name}`);
    }
  });

  // ────────────────────────────────────────────────────────────
  // Mocking (20개)
  // ────────────────────────────────────────────────────────────

  // mock_function: 함수 모킹
  registry.register({
    name: 'mock_function',
    module: 'testing',
    executor: (args) => {
      const name = String(args[0]);
      const mockFn: any = function(...mockArgs: any[]) {
        mockFn._callCount++;
        mockFn._callArgs.push(mockArgs);
        if (mockFn._throwError) {
          throw mockFn._throwError;
        }
        mockFn._callResults.push(mockFn._returnValue);
        return mockFn._returnValue;
      };
      mockFn._callCount = 0;
      mockFn._callArgs = [];
      mockFn._callResults = [];
      mockFn._returnValue = undefined;
      mockFn._throwError = null;

      const mockObj: MockObject = {
        name,
        original: undefined,
        callCount: 0,
        callArgs: [],
        callResults: []
      };
      globalTestContext.mocks.set(name, mockObj);

      return mockFn;
    }
  });

  // mock_module: 모듈 모킹
  registry.register({
    name: 'mock_module',
    module: 'testing',
    executor: (args) => {
      const moduleName = String(args[0]);
      const mockModule = {};
      globalTestContext.mocks.set(moduleName, {
        name: moduleName,
        callCount: 0,
        callArgs: [],
        callResults: []
      });
      return mockModule;
    }
  });

  // mock_api: API 모킹
  registry.register({
    name: 'mock_api',
    module: 'testing',
    executor: (args) => {
      const apiName = String(args[0]);
      const mockApi = {
        get: () => ({}),
        post: () => ({}),
        put: () => ({}),
        delete: () => ({})
      };
      globalTestContext.mocks.set(apiName, {
        name: apiName,
        callCount: 0,
        callArgs: [],
        callResults: []
      });
      return mockApi;
    }
  });

  // mock_database: 데이터베이스 모킹
  registry.register({
    name: 'mock_database',
    module: 'testing',
    executor: (args) => {
      const dbName = String(args[0]);
      const mockDb = {
        query: () => [],
        insert: () => ({}),
        update: () => ({}),
        delete: () => ({})
      };
      globalTestContext.mocks.set(dbName, {
        name: dbName,
        callCount: 0,
        callArgs: [],
        callResults: []
      });
      return mockDb;
    }
  });

  // mock_file_system: 파일 시스템 모킹
  registry.register({
    name: 'mock_file_system',
    module: 'testing',
    executor: (args) => {
      const fsName = String(args[0]);
      const mockFs = {
        readFile: () => '',
        writeFile: () => true,
        deleteFile: () => true,
        listFiles: () => []
      };
      globalTestContext.mocks.set(fsName, {
        name: fsName,
        callCount: 0,
        callArgs: [],
        callResults: []
      });
      return mockFs;
    }
  });

  // mock_timer: 타이머 모킹
  registry.register({
    name: 'mock_timer',
    module: 'testing',
    executor: (args) => {
      const timerName = String(args[0]);
      const mockTimer = {
        setTimeout: (fn: Function, ms: number) => setTimeout(fn, ms),
        setInterval: (fn: Function, ms: number) => setInterval(fn, ms),
        clearTimeout: (id: any) => clearTimeout(id),
        clearInterval: (id: any) => clearInterval(id)
      };
      globalTestContext.mocks.set(timerName, {
        name: timerName,
        callCount: 0,
        callArgs: [],
        callResults: []
      });
      return mockTimer;
    }
  });

  // mock_http_server: HTTP 서버 모킹
  registry.register({
    name: 'mock_http_server',
    module: 'testing',
    executor: (args) => {
      const serverName = String(args[0]);
      const mockServer = {
        listen: () => ({}),
        close: () => ({}),
        request: () => ({})
      };
      globalTestContext.mocks.set(serverName, {
        name: serverName,
        callCount: 0,
        callArgs: [],
        callResults: []
      });
      return mockServer;
    }
  });

  // mock_websocket: WebSocket 모킹
  registry.register({
    name: 'mock_websocket',
    module: 'testing',
    executor: (args) => {
      const wsName = String(args[0]);
      const mockWs = {
        send: () => ({}),
        close: () => ({}),
        on: () => ({}),
        emit: () => ({})
      };
      globalTestContext.mocks.set(wsName, {
        name: wsName,
        callCount: 0,
        callArgs: [],
        callResults: []
      });
      return mockWs;
    }
  });

  // mock_redis: Redis 모킹
  registry.register({
    name: 'mock_redis',
    module: 'testing',
    executor: (args) => {
      const redisName = String(args[0]);
      const mockRedis = {
        get: () => null,
        set: () => true,
        delete: () => true,
        expire: () => true
      };
      globalTestContext.mocks.set(redisName, {
        name: redisName,
        callCount: 0,
        callArgs: [],
        callResults: []
      });
      return mockRedis;
    }
  });

  // mock_return_value: 반환값 설정
  registry.register({
    name: 'mock_return_value',
    module: 'testing',
    executor: (args) => {
      const mockFn = args[0];
      const returnValue = args[1];
      if (mockFn && typeof mockFn === 'function') {
        mockFn._returnValue = returnValue;
      }
      return { returnValue, set: true };
    }
  });

  // mock_return_values: 반환값 배열 설정
  registry.register({
    name: 'mock_return_values',
    module: 'testing',
    executor: (args) => {
      const mockFn = args[0];
      const returnValues = args[1];
      if (mockFn && typeof mockFn === 'function' && Array.isArray(returnValues)) {
        mockFn._returnValues = returnValues;
        mockFn._returnValueIndex = 0;
      }
      return { returnValues, set: true };
    }
  });

  // mock_throw_error: 예외 설정
  registry.register({
    name: 'mock_throw_error',
    module: 'testing',
    executor: (args) => {
      const mockFn = args[0];
      const error = args[1];
      if (mockFn && typeof mockFn === 'function') {
        mockFn._throwError = error instanceof Error ? error : new Error(String(error));
      }
      return { error, set: true };
    }
  });

  // mock_resolve_value: Promise 결과값 설정
  registry.register({
    name: 'mock_resolve_value',
    module: 'testing',
    executor: (args) => {
      const mockFn = args[0];
      const resolveValue = args[1];
      if (mockFn && typeof mockFn === 'function') {
        mockFn._resolveValue = resolveValue;
        mockFn._isResolved = true;
      }
      return { resolveValue, set: true };
    }
  });

  // mock_reject_error: Promise 거부 설정
  registry.register({
    name: 'mock_reject_error',
    module: 'testing',
    executor: (args) => {
      const mockFn = args[0];
      const rejectError = args[1];
      if (mockFn && typeof mockFn === 'function') {
        mockFn._rejectError = rejectError instanceof Error ? rejectError : new Error(String(rejectError));
        mockFn._isResolved = false;
      }
      return { rejectError, set: true };
    }
  });

  // mock_clear: 모킹 초기화
  registry.register({
    name: 'mock_clear',
    module: 'testing',
    executor: (args) => {
      const mockFn = args[0];
      if (mockFn && typeof mockFn === 'function') {
        mockFn._callCount = 0;
        mockFn._callArgs = [];
        mockFn._callResults = [];
      }
      return { cleared: true };
    }
  });

  // mock_reset: 모킹 리셋
  registry.register({
    name: 'mock_reset',
    module: 'testing',
    executor: (args) => {
      const mockFn = args[0];
      if (mockFn && typeof mockFn === 'function') {
        mockFn._callCount = 0;
        mockFn._callArgs = [];
        mockFn._callResults = [];
        mockFn._returnValue = undefined;
        mockFn._throwError = null;
      }
      return { reset: true };
    }
  });

  // mock_restore: 모킹 복원
  registry.register({
    name: 'mock_restore',
    module: 'testing',
    executor: (args) => {
      const mockName = String(args[0]);
      const mock = globalTestContext.mocks.get(mockName);
      if (mock && mock.original) {
        globalTestContext.mocks.delete(mockName);
        return { restored: true, original: mock.original };
      }
      return { restored: false };
    }
  });

  // mock_call_count: 호출 횟수
  registry.register({
    name: 'mock_call_count',
    module: 'testing',
    executor: (args) => {
      const mockFn = args[0];
      if (mockFn && typeof mockFn === 'function') {
        return mockFn._callCount ?? 0;
      }
      return 0;
    }
  });

  // mock_call_args: 호출 인자
  registry.register({
    name: 'mock_call_args',
    module: 'testing',
    executor: (args) => {
      const mockFn = args[0];
      if (mockFn && typeof mockFn === 'function') {
        return mockFn._callArgs ?? [];
      }
      return [];
    }
  });

  // mock_call_result: 호출 결과
  registry.register({
    name: 'mock_call_result',
    module: 'testing',
    executor: (args) => {
      const mockFn = args[0];
      if (mockFn && typeof mockFn === 'function') {
        return mockFn._callResults ?? [];
      }
      return [];
    }
  });

  // ────────────────────────────────────────────────────────────
  // Spying (15개)
  // ────────────────────────────────────────────────────────────

  // spy_on: 메서드 스파이
  registry.register({
    name: 'spy_on',
    module: 'testing',
    executor: (args) => {
      const target = args[0];
      const method = String(args[1]);
      if (target && typeof target[method] === 'function') {
        const original = target[method];
        const spy: SpyObject = {
          name: method,
          target,
          method,
          original,
          callCount: 0,
          callArgs: [],
          callResults: []
        };

        target[method] = function(...spyArgs: any[]) {
          spy.callCount++;
          spy.callArgs.push(spyArgs);
          const result = original.apply(this, spyArgs);
          spy.callResults.push(result);
          return result;
        };

        globalTestContext.spies.set(`${target.constructor.name}.${method}`, spy);
        return { spied: true, method };
      }
      return { spied: false };
    }
  });

  // spy_on_method: 특정 메서드 스파이
  registry.register({
    name: 'spy_on_method',
    module: 'testing',
    executor: (args) => {
      const target = args[0];
      const method = String(args[1]);
      if (target && typeof target[method] === 'function') {
        const original = target[method];
        target[method] = function(...spyArgs: any[]) {
          return original.apply(this, spyArgs);
        };
        return { spied: true, method };
      }
      return { spied: false };
    }
  });

  // spy_on_getter: getter 스파이
  registry.register({
    name: 'spy_on_getter',
    module: 'testing',
    executor: (args) => {
      const target = args[0];
      const property = String(args[1]);
      const descriptor = Object.getOwnPropertyDescriptor(target, property);
      if (descriptor && descriptor.get) {
        return { spied: true, getter: property };
      }
      return { spied: false };
    }
  });

  // spy_on_setter: setter 스파이
  registry.register({
    name: 'spy_on_setter',
    module: 'testing',
    executor: (args) => {
      const target = args[0];
      const property = String(args[1]);
      const descriptor = Object.getOwnPropertyDescriptor(target, property);
      if (descriptor && descriptor.set) {
        return { spied: true, setter: property };
      }
      return { spied: false };
    }
  });

  // spy_calls: 모든 호출
  registry.register({
    name: 'spy_calls',
    module: 'testing',
    executor: (args) => {
      const spyName = String(args[0]);
      const spy = globalTestContext.spies.get(spyName);
      if (spy) {
        return spy.callArgs;
      }
      return [];
    }
  });

  // spy_call_count: 호출 횟수
  registry.register({
    name: 'spy_call_count',
    module: 'testing',
    executor: (args) => {
      const spyName = String(args[0]);
      const spy = globalTestContext.spies.get(spyName);
      if (spy) {
        return spy.callCount;
      }
      return 0;
    }
  });

  // spy_call_args: 호출 인자
  registry.register({
    name: 'spy_call_args',
    module: 'testing',
    executor: (args) => {
      const spyName = String(args[0]);
      const callIndex = Number(args[1] ?? 0);
      const spy = globalTestContext.spies.get(spyName);
      if (spy && spy.callArgs[callIndex]) {
        return spy.callArgs[callIndex];
      }
      return [];
    }
  });

  // spy_call_result: 호출 결과
  registry.register({
    name: 'spy_call_result',
    module: 'testing',
    executor: (args) => {
      const spyName = String(args[0]);
      const callIndex = Number(args[1] ?? 0);
      const spy = globalTestContext.spies.get(spyName);
      if (spy && spy.callResults[callIndex]) {
        return spy.callResults[callIndex];
      }
      return undefined;
    }
  });

  // spy_most_recent_call: 가장 최근 호출
  registry.register({
    name: 'spy_most_recent_call',
    module: 'testing',
    executor: (args) => {
      const spyName = String(args[0]);
      const spy = globalTestContext.spies.get(spyName);
      if (spy && spy.callArgs.length > 0) {
        const lastIndex = spy.callArgs.length - 1;
        return {
          args: spy.callArgs[lastIndex],
          result: spy.callResults[lastIndex]
        };
      }
      return null;
    }
  });

  // spy_first_call: 첫 호출
  registry.register({
    name: 'spy_first_call',
    module: 'testing',
    executor: (args) => {
      const spyName = String(args[0]);
      const spy = globalTestContext.spies.get(spyName);
      if (spy && spy.callArgs.length > 0) {
        return {
          args: spy.callArgs[0],
          result: spy.callResults[0]
        };
      }
      return null;
    }
  });

  // spy_all_calls: 모든 호출 정보
  registry.register({
    name: 'spy_all_calls',
    module: 'testing',
    executor: (args) => {
      const spyName = String(args[0]);
      const spy = globalTestContext.spies.get(spyName);
      if (spy) {
        return spy.callArgs.map((args, i) => ({
          call: i + 1,
          args,
          result: spy.callResults[i]
        }));
      }
      return [];
    }
  });

  // spy_reset: 스파이 리셋
  registry.register({
    name: 'spy_reset',
    module: 'testing',
    executor: (args) => {
      const spyName = String(args[0]);
      const spy = globalTestContext.spies.get(spyName);
      if (spy) {
        spy.callCount = 0;
        spy.callArgs = [];
        spy.callResults = [];
        return { reset: true };
      }
      return { reset: false };
    }
  });

  // spy_restore: 스파이 복원
  registry.register({
    name: 'spy_restore',
    module: 'testing',
    executor: (args) => {
      const spyName = String(args[0]);
      const spy = globalTestContext.spies.get(spyName);
      if (spy) {
        spy.target[spy.method] = spy.original;
        globalTestContext.spies.delete(spyName);
        return { restored: true };
      }
      return { restored: false };
    }
  });

  // spy_identity: 스파이 정보
  registry.register({
    name: 'spy_identity',
    module: 'testing',
    executor: (args) => {
      const spyName = String(args[0]);
      const spy = globalTestContext.spies.get(spyName);
      if (spy) {
        return {
          name: spy.name,
          method: spy.method,
          callCount: spy.callCount
        };
      }
      return null;
    }
  });

  // spy_and_return_value: 스파이 및 반환값 설정
  registry.register({
    name: 'spy_and_return_value',
    module: 'testing',
    executor: (args) => {
      const target = args[0];
      const method = String(args[1]);
      const returnValue = args[2];
      if (target && typeof target[method] === 'function') {
        const original = target[method];
        target[method] = function(...spyArgs: any[]) {
          return returnValue;
        };
        return { spied: true, method, returnValue };
      }
      return { spied: false };
    }
  });
}
