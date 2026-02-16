/**
 * Phase 3.4: CallGraphBuilder Tests
 * Task 1 검증: 기초 기능 (Step 2)
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { Parser } from '../src/parser/parser';
import { Lexer } from '../src/parser/lexer';
import { CallGraphBuilder } from '../src/analyzer/call-graph-builder';
import { Statement } from '../src/parser/ast';

describe('CallGraphBuilder - Step 2: Basic Functions', () => {
  let parser: Parser;
  let lexer: Lexer;

  beforeAll(() => {
    lexer = new Lexer();
    parser = new Parser();
  });

  /**
   * Test 1: 단순 함수 호출 추적
   * foo() -> bar()
   */
  it('should track simple function calls: foo calls bar', () => {
    const code = `
      fn foo() {
        bar()
      }
      fn bar() {
        return 42
      }
    `;

    const tokens = lexer.tokenize(code);
    const ast = parser.parse(tokens);
    const builder = new CallGraphBuilder();
    const graph = builder.build(ast.statements);

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
    const code = `
      fn foo() {
        bar()
      }
      fn bar() {
        baz()
      }
      fn baz() {
        return 1
      }
    `;

    const tokens = lexer.tokenize(code);
    const ast = parser.parse(tokens);
    const builder = new CallGraphBuilder();
    const graph = builder.build(ast.statements);

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
    const code = `
      fn foo() {
        bar()
      }
      fn bar() {
        return 42
      }
    `;

    const tokens = lexer.tokenize(code);
    const ast = parser.parse(tokens);
    const builder = new CallGraphBuilder();
    const graph = builder.build(ast.statements);

    expect(graph.rootFunctions).toContain('foo');
    expect(graph.rootFunctions).not.toContain('bar');
  });

  /**
   * Test 4: 미정의 함수 추적
   * foo() -> undefined() (정의되지 않은 함수)
   */
  it('should track calls to undefined functions', () => {
    const code = `
      fn foo() {
        undefined_func()
      }
    `;

    const tokens = lexer.tokenize(code);
    const ast = parser.parse(tokens);
    const builder = new CallGraphBuilder();
    const graph = builder.build(ast.statements);

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
    const code = `
      fn foo() {
        console.log(42)
      }
    `;

    const tokens = lexer.tokenize(code);
    const ast = parser.parse(tokens);
    const builder = new CallGraphBuilder();
    const graph = builder.build(ast.statements);

    const consoleLogNode = graph.nodes.get('console.log');
    expect(consoleLogNode).toBeDefined();
    expect(consoleLogNode!.isBuiltin).toBe(true);
  });
});
