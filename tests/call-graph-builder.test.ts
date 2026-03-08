/**
 * Phase 3.4: CallGraphBuilder Tests
 * Task 1 검증: 기초 기능 (Step 2, 재설계)
 *
 * 입력: MinimalFunctionAST[] 직접 생성
 */

import { describe, it, expect } from '@jest/globals';
import { CallGraphBuilder } from '../src/analyzer/call-graph-builder';
import { MinimalFunctionAST } from '../src/parser/ast';

describe('CallGraphBuilder - Basic Functions (Redesigned)', () => {

  /**
   * Test 1: 단순 함수 호출 추적
   * foo() -> bar()
   */
  it('should track simple function calls: foo calls bar', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'foo',
        inputType: 'null',
        outputType: 'number',
        body: 'bar()',
      },
      {
        fnName: 'bar',
        inputType: 'null',
        outputType: 'number',
        body: 'return 42',
      },
    ];

    const builder = new CallGraphBuilder();
    const graph = builder.build(functions);

    // foo와 bar가 모두 정의되었는가?
    expect(graph.nodes.has('foo')).toBe(true);
    expect(graph.nodes.has('bar')).toBe(true);

    // foo가 bar를 호출하는가?
    const fooNode = graph.nodes.get('foo')!;
    expect(fooNode.callsTo).toContain('bar');

    // bar는 누가 호출하는가?
    const barNode = graph.nodes.get('bar')!;
    expect(barNode.calledBy).toContain('foo');
  });

  /**
   * Test 2: 체인 호출 추적
   * foo() -> bar() -> baz()
   */
  it('should track chained calls: foo -> bar -> baz', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'foo',
        inputType: 'null',
        outputType: 'number',
        body: 'bar()',
      },
      {
        fnName: 'bar',
        inputType: 'null',
        outputType: 'number',
        body: 'baz()',
      },
      {
        fnName: 'baz',
        inputType: 'null',
        outputType: 'number',
        body: 'return 1',
      },
    ];

    const builder = new CallGraphBuilder();
    const graph = builder.build(functions);

    expect(graph.nodes.get('foo')!.callsTo).toContain('bar');
    expect(graph.nodes.get('bar')!.callsTo).toContain('baz');
    expect(graph.nodes.get('baz')!.calledBy).toContain('bar');
  });

  /**
   * Test 3: Root Functions 계산
   * foo는 호출되지 않음 (entry point)
   * bar는 foo에서만 호출됨
   */
  it('should identify root functions (not called by anyone)', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'foo',
        inputType: 'null',
        outputType: 'number',
        body: 'bar()',
      },
      {
        fnName: 'bar',
        inputType: 'null',
        outputType: 'number',
        body: 'return 42',
      },
    ];

    const builder = new CallGraphBuilder();
    const graph = builder.build(functions);

    expect(graph.rootFunctions).toContain('foo');
    expect(graph.rootFunctions).not.toContain('bar');
  });

  /**
   * Test 4: 미정의 함수 추적
   * foo() -> undefined_func() (정의되지 않은 함수)
   */
  it('should track calls to undefined functions', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'foo',
        inputType: 'null',
        outputType: 'number',
        body: 'undefined_func()',
      },
    ];

    const builder = new CallGraphBuilder();
    const graph = builder.build(functions);

    expect(graph.nodes.has('undefined_func')).toBe(true);
    const undefNode = graph.nodes.get('undefined_func')!;
    expect(undefNode.isDefined).toBe(false);
    expect(undefNode.calledBy).toContain('foo');
  });

  /**
   * Test 5: 빌트인 함수 식별
   * foo() -> console.log() (빌트인)
   */
  it('should identify builtin functions (console.log)', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'foo',
        inputType: 'null',
        outputType: 'number',
        body: 'console.log(42)',
      },
    ];

    const builder = new CallGraphBuilder();
    const graph = builder.build(functions);

    const consoleLogNode = graph.nodes.get('console.log');
    expect(consoleLogNode).toBeDefined();
    expect(consoleLogNode!.isBuiltin).toBe(true);
  });
});
