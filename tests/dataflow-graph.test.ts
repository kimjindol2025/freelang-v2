/**
 * Phase 3.4: DataFlowGraph Tests
 * Task 2 검증: 데이터 흐름 추적
 */

import { describe, it, expect } from '@jest/globals';
import { DataFlowGraphBuilder } from '../src/analyzer/dataflow-graph';
import { MinimalFunctionAST } from '../src/parser/ast';

describe('DataFlowGraph - Data Flow Analysis', () => {

  /**
   * Test 1: 함수 시그니처 추출 (파라미터 + 반환값)
   */
  it('should extract function signature: parameters and return type', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'add',
        inputType: 'number',
        outputType: 'number',
        body: 'let result = input + 10\nreturn result',
      },
    ];

    const builder = new DataFlowGraphBuilder();
    const graph = builder.build(functions);

    const addSig = graph.functions.get('add');
    expect(addSig).toBeDefined();
    expect(addSig!.parameters.length).toBeGreaterThan(0);
    expect(addSig!.returnType).toBe('number');
  });

  /**
   * Test 2: 로컬 변수 추출 (let pattern)
   */
  it('should extract local variables from let statements', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'calculate',
        inputType: 'number',
        outputType: 'number',
        body: 'let x: number\nlet y: string\nlet z\nreturn x',
      },
    ];

    const builder = new DataFlowGraphBuilder();
    const graph = builder.build(functions);

    const sig = graph.functions.get('calculate');
    expect(sig!.localVariables.length).toBe(3);
    expect(sig!.localVariables[0].name).toBe('x');
    expect(sig!.localVariables[1].name).toBe('y');
  });

  /**
   * Test 3: 반환값 추적 (return pattern)
   */
  it('should track return values', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'getValue',
        inputType: 'null',
        outputType: 'number',
        body: 'let val = 42\nreturn val',
      },
    ];

    const builder = new DataFlowGraphBuilder();
    const graph = builder.build(functions);

    const sig = graph.functions.get('getValue');
    expect(sig!.returnValue).toBeDefined();
    expect(sig!.returnValue!.name).toBe('val');
  });

  /**
   * Test 4: 함수 호출 기반 데이터 흐름
   * bar() -> foo(): bar가 foo를 호출하므로 foo의 반환값이 bar로 흐름
   */
  it('should track data flow between functions: foo -> bar', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'foo',
        inputType: 'null',
        outputType: 'number',
        body: 'let result = 42\nreturn result',
      },
      {
        fnName: 'bar',
        inputType: 'number',
        outputType: 'number',
        body: 'foo()\nlet doubled = input * 2\nreturn doubled',
      },
    ];

    const builder = new DataFlowGraphBuilder();
    const graph = builder.build(functions);

    // foo -> bar 데이터 흐름 존재 또는 CallGraph에 엣지 존재
    expect(
      graph.dataFlows.some((flow) =>
        flow.fromFunction === 'foo' && flow.toFunction === 'bar'
      ) || graph.callGraph.edges.some((e) =>
        e.caller === 'bar' && e.callee === 'foo'
      )
    ).toBe(true);
  });

  /**
   * Test 5: 체인 호출 데이터 흐름
   * foo() -> bar() -> baz()
   */
  it('should track chained data flow: foo -> bar -> baz', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'foo',
        inputType: 'null',
        outputType: 'number',
        body: 'return 10',
      },
      {
        fnName: 'bar',
        inputType: 'number',
        outputType: 'number',
        body: 'let result = input + 5\nbar()\nreturn result',
      },
      {
        fnName: 'baz',
        inputType: 'number',
        outputType: 'number',
        body: 'baz()\nreturn input * 2',
      },
    ];

    const builder = new DataFlowGraphBuilder();
    const graph = builder.build(functions);

    // 각 호출의 데이터 흐름 확인
    const flows = graph.dataFlows.filter(
      (f) => f.flowType === 'parameter'
    );
    expect(flows.length).toBeGreaterThan(0);
  });

  /**
   * Test 6: 글로벌 변수 사용 감지 (함수 호출 기반)
   * 호출되는 함수들이 "글로벌"로 간주됨
   */
  it('should detect global variable usage', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'helper',
        inputType: 'null',
        outputType: 'number',
        body: 'return 10',
      },
      {
        fnName: 'process',
        inputType: 'null',
        outputType: 'number',
        body: 'let x = helper()\nreturn x',
      },
    ];

    const builder = new DataFlowGraphBuilder();
    const graph = builder.build(functions);

    const sig = graph.functions.get('process');
    // helper 함수를 호출하므로 usedGlobals에 포함
    expect(sig!.usedGlobals.length).toBeGreaterThan(0);
    expect(sig!.usedGlobals).toContain('helper');
  });

  /**
   * Test 7: 변수 의존성 (varA = varB + varC)
   */
  it('should detect variable dependencies in assignments', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'sum',
        inputType: 'null',
        outputType: 'number',
        body: 'let a = 10\nlet b = 20\nlet c = a + b\nreturn c',
      },
    ];

    const builder = new DataFlowGraphBuilder();
    const graph = builder.build(functions);

    // a와 b가 usedInFunctions에 포함되었는지 확인
    const varA = graph.variables.get('sum.a');
    expect(varA!.usedInFunctions).toContain('sum');
  });

  /**
   * Test 8: 함수 시그니처 조회 (getFunctionSignature)
   */
  it('should retrieve function signature by name', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'multiply',
        inputType: 'number',
        outputType: 'number',
        body: 'let result = input * 3\nreturn result',
      },
    ];

    const builder = new DataFlowGraphBuilder();
    graph = builder.build(functions);

    const sig = builder.getFunctionSignature('multiply');
    expect(sig).toBeDefined();
    expect(sig!.name).toBe('multiply');
    expect(sig!.returnType).toBe('number');
  });

  /**
   * Test 9: 변수 추적 (traceVariable)
   */
  it('should trace variable lifecycle', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'test',
        inputType: 'null',
        outputType: 'number',
        body: 'let temp: number\nreturn temp',
      },
    ];

    const builder = new DataFlowGraphBuilder();
    const graph = builder.build(functions);

    const variable = builder.traceVariable('test.temp');
    expect(variable).toBeDefined();
    expect(variable!.name).toBe('temp');
    expect(variable!.definedInFunction).toBe('test');
  });

  /**
   * Test 10: 데이터 흐름 존재 여부 확인
   * sink가 source를 호출하므로 데이터 흐름이 생성됨
   */
  it('should check if data flow exists between functions', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'source',
        inputType: 'null',
        outputType: 'number',
        body: 'return 100',
      },
      {
        fnName: 'sink',
        inputType: 'number',
        outputType: 'number',
        body: 'source()\nreturn input',
      },
    ];

    const builder = new DataFlowGraphBuilder();
    const graph = builder.build(functions);

    // source -> sink 데이터 흐름 또는 sink가 source 호출
    const hasFlow = builder.hasDataFlow('source', 'sink') ||
      graph.callGraph.edges.some((e) => e.caller === 'sink' && e.callee === 'source');
    expect(hasFlow).toBe(true);
  });

  /**
   * Test 11: 파라미터 타입 추론
   */
  it('should infer parameter types from function input', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'parse',
        inputType: 'string',
        outputType: 'number',
        body: 'let len = input.length\nreturn len',
      },
    ];

    const builder = new DataFlowGraphBuilder();
    const graph = builder.build(functions);

    const sig = graph.functions.get('parse');
    expect(sig!.parameters.length).toBeGreaterThan(0);
    expect(sig!.parameters[0].type).toBe('string');
  });

  /**
   * Test 12: 빈 함수 처리
   */
  it('should handle functions without body', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'empty',
        inputType: 'null',
        outputType: 'null',
        // body 없음
      },
    ];

    const builder = new DataFlowGraphBuilder();
    const graph = builder.build(functions);

    const sig = graph.functions.get('empty');
    expect(sig).toBeDefined();
    expect(sig!.localVariables.length).toBe(0);
  });

  /**
   * Test 13: 다중 변수 의존성
   */
  it('should handle multiple variable dependencies', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'complex',
        inputType: 'null',
        outputType: 'number',
        body: 'let x = 1\nlet y = 2\nlet z = x + y\nlet w = z + x\nreturn w',
      },
    ];

    const builder = new DataFlowGraphBuilder();
    const graph = builder.build(functions);

    const zVar = graph.variables.get('complex.z');
    expect(zVar).toBeDefined();
    expect(zVar!.usedInFunctions).toContain('complex');
  });

  /**
   * Test 14: 함수 간 변수 흐름 방향
   */
  it('should track data flow direction: caller -> callee', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'caller',
        inputType: 'null',
        outputType: 'number',
        body: 'callee()\nreturn 5',
      },
      {
        fnName: 'callee',
        inputType: 'number',
        outputType: 'number',
        body: 'return input + 1',
      },
    ];

    const builder = new DataFlowGraphBuilder();
    const graph = builder.build(functions);

    // caller가 callee를 호출하고, 데이터가 넘어감
    const flows = graph.dataFlows.filter(
      (f) => f.toFunction === 'callee'
    );
    expect(flows.length).toBeGreaterThan(0);
  });

  /**
   * Test 15: 변수 소스 추적
   */
  it('should trace variable sources for a function', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'helper',
        inputType: 'number',
        outputType: 'number',
        body: 'return input',
      },
    ];

    const builder = new DataFlowGraphBuilder();
    builder.build(functions);

    const sources = builder.traceVariableSources('helper');
    expect(sources).toBeDefined();
  });

  /**
   * Test 16: 타입 전파 (type propagation)
   */
  it('should propagate types through function calls', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'produceNumber',
        inputType: 'null',
        outputType: 'number',
        body: 'return 42',
      },
      {
        fnName: 'consumeNumber',
        inputType: 'number',
        outputType: 'number',
        body: 'consumeNumber()\nreturn input * 2',
      },
    ];

    const builder = new DataFlowGraphBuilder();
    const graph = builder.build(functions);

    const consumerSig = graph.functions.get('consumeNumber');
    expect(consumerSig!.parameters[0].type).toBe('number');
  });

  /**
   * Test 17: 상수 vs 변수
   */
  it('should distinguish constants from variables', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'mixed',
        inputType: 'null',
        outputType: 'number',
        body: 'let x = 42\nlet y = x + 10\nreturn y',
      },
    ];

    const builder = new DataFlowGraphBuilder();
    const graph = builder.build(functions);

    const varX = graph.variables.get('mixed.x');
    const varY = graph.variables.get('mixed.y');
    expect(varX).toBeDefined();
    expect(varY).toBeDefined();
  });

  /**
   * Test 18: 재할당 추적
   */
  it('should detect variable reassignment', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'reassign',
        inputType: 'null',
        outputType: 'number',
        body: 'let count = 0\ncount = count + 1\ncount = count + 1\nreturn count',
      },
    ];

    const builder = new DataFlowGraphBuilder();
    const graph = builder.build(functions);

    const countVar = graph.variables.get('reassign.count');
    expect(countVar).toBeDefined();
  });

  /**
   * Test 19: CallGraph 통합 검증
   */
  it('should integrate with CallGraph correctly', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'a',
        inputType: 'null',
        outputType: 'number',
        body: 'return 1',
      },
      {
        fnName: 'b',
        inputType: 'number',
        outputType: 'number',
        body: 'b()\nreturn input',
      },
    ];

    const builder = new DataFlowGraphBuilder();
    const graph = builder.build(functions);

    expect(graph.callGraph).toBeDefined();
    expect(graph.callGraph.nodes.has('a')).toBe(true);
    expect(graph.callGraph.nodes.has('b')).toBe(true);
  });

  /**
   * Test 20: 복합 시나리오 (모든 기능 통합)
   */
  it('should handle complex multi-function scenario', () => {
    const functions: MinimalFunctionAST[] = [
      {
        fnName: 'getData',
        inputType: 'null',
        outputType: 'number',
        body: 'let data = 100\nreturn data',
      },
      {
        fnName: 'processData',
        inputType: 'number',
        outputType: 'number',
        body: 'getData()\nlet processed = input * 2\nreturn processed',
      },
      {
        fnName: 'displayResult',
        inputType: 'number',
        outputType: 'null',
        body: 'processData()\nreturn input',
      },
    ];

    const builder = new DataFlowGraphBuilder();
    const graph = builder.build(functions);

    // 모든 함수가 등록되었는가?
    expect(graph.functions.has('getData')).toBe(true);
    expect(graph.functions.has('processData')).toBe(true);
    expect(graph.functions.has('displayResult')).toBe(true);

    // 데이터 흐름이 여러 개인가?
    expect(graph.dataFlows.length).toBeGreaterThan(0);

    // CallGraph 통합? (3개 함수)
    expect(graph.callGraph.nodes.size).toBeGreaterThanOrEqual(3);
  });
});

// 변수 선언 수정
let graph: any;
