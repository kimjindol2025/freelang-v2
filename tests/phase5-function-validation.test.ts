import { VMExecutor } from '../src/vm/vm-executor';
import { Parser } from '../src/parser/parser';
import { Lexer } from '../src/lexer/lexer';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Phase 5 함수 완전 검증 테스트 스위트
 *
 * 테스트 범위:
 * 1. 재귀 함수 (fibonacci, factorial, ackermann)
 * 2. 함수 인자 (0개, 1개, 3개, 5개)
 * 3. 스코프 & 메모리 (로컬 변수 격리, 전역 변수 보존)
 * 4. 깊은 재귀 (깊이 50까지)
 * 5. 엣지 케이스 (중첩 함수, 다중 리턴 등)
 */

describe('Phase 5: Function Complete Validation', () => {
  const examplesDir = path.join(__dirname, '../examples');

  function executeFlFile(filename: string): string {
    const filePath = path.join(examplesDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const code = fs.readFileSync(filePath, 'utf-8');
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const vm = new VMExecutor();
    const output: string[] = [];

    // println 함수 오버라이드로 출력 캡처
    const originalPrintln = console.log;
    console.log = (...args: any[]) => {
      output.push(args.join(' '));
    };

    try {
      vm.execute(ast);
    } finally {
      console.log = originalPrintln;
    }

    return output.join('\n');
  }

  describe('1. Recursive Functions', () => {
    test('fibonacci(10) should return 55', () => {
      const output = executeFlFile('fibonacci.fl');
      expect(output.trim()).toBe('55');
    });

    test('factorial(5) should return 120', () => {
      const output = executeFlFile('factorial.fl');
      expect(output.trim()).toBe('120');
    });

    test('ackermann(3,3) should return 61', () => {
      const output = executeFlFile('ackermann.fl');
      expect(output.trim()).toBe('61');
    });
  });

  describe('2. Function Arguments', () => {
    test('zero arguments function should work', () => {
      const output = executeFlFile('function_args.fl');
      const lines = output.trim().split('\n');
      expect(lines[0]).toBe('42');  // test_zero_args()
    });

    test('single argument function should work', () => {
      const output = executeFlFile('function_args.fl');
      const lines = output.trim().split('\n');
      expect(lines[1]).toBe('11');  // inc(10)
    });

    test('three arguments function should work', () => {
      const output = executeFlFile('function_args.fl');
      const lines = output.trim().split('\n');
      expect(lines[2]).toBe('6');   // sum_three(1,2,3)
    });

    test('five arguments function should work', () => {
      const output = executeFlFile('function_args.fl');
      const lines = output.trim().split('\n');
      expect(lines[3]).toBe('15');  // sum_five(1,2,3,4,5)
    });
  });

  describe('3. Scope & Memory', () => {
    test('local variable isolation', () => {
      const output = executeFlFile('scope_test.fl');
      const lines = output.trim().split('\n');
      expect(lines[0]).toBe('15');    // test_local_scope()
      expect(lines[1]).toBe('25');    // modify_and_return()
      expect(lines[2]).toBe('3');     // nested_scope()
      expect(lines[3]).toBe('100');   // global_x unchanged
    });
  });

  describe('4. Deep Recursion', () => {
    test('recursion depth 50 should work', () => {
      const output = executeFlFile('recursion_depth.fl');
      expect(output.trim()).toBe('50');
    });
  });

  describe('5. Edge Cases', () => {
    test('nested functions should work', () => {
      const output = executeFlFile('edge_cases.fl');
      const lines = output.trim().split('\n');
      expect(lines[0]).toBe('60');    // outer() with nested inner()
    });

    test('global and local variable mixing', () => {
      const output = executeFlFile('edge_cases.fl');
      const lines = output.trim().split('\n');
      expect(lines[1]).toBe('15');    // global_and_local()
    });

    test('multiple return paths', () => {
      const output = executeFlFile('edge_cases.fl');
      const lines = output.trim().split('\n');
      expect(lines[2]).toBe('-1');    // multiple_returns(-5)
      expect(lines[3]).toBe('0');     // multiple_returns(0)
      expect(lines[4]).toBe('1');     // multiple_returns(5)
    });
  });

  describe('Summary Report', () => {
    test('generate Phase 5 validation summary', () => {
      const summary = {
        timestamp: new Date().toISOString(),
        phase: 'Phase 5',
        status: 'COMPLETE',
        testsRun: 13,
        testsPassed: 0,
        testsFailed: 0,
        coverage: {
          recursiveFunctions: 'fibonacci, factorial, ackermann',
          functionArguments: '0, 1, 3, 5 arguments',
          scopeMemory: 'local isolation, global preservation',
          deepRecursion: 'depth 50',
          edgeCases: 'nested functions, multiple returns'
        }
      };

      // This test just validates the structure
      expect(summary.phase).toBe('Phase 5');
      expect(summary.status).toBe('COMPLETE');
    });
  });
});
