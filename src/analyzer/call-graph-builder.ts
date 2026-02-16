/**
 * Phase 3.4: Call Graph Builder
 *
 * 함수 호출 관계를 분석하여 directed graph 생성
 * - 어느 함수가 어느 함수를 호출하는가?
 * - 함수 간 데이터 흐름 추적의 기초
 *
 * 입력: MinimalFunctionAST 배열 (이미 파싱된 함수들)
 * 출력: CallGraph (directed graph of function calls)
 */

import { MinimalFunctionAST } from '../parser/ast';

/**
 * 함수 호출 정보
 */
export interface FunctionCall {
  caller: string;           // 호출하는 함수명
  callee: string;           // 호출되는 함수명
  line: number;
  confidence: number;       // 0.0-1.0 (빌트인 vs 사용자 정의)
}

/**
 * Call Graph 노드
 */
export interface CallGraphNode {
  name: string;             // 함수명
  isDefined: boolean;        // 정의되어 있는가?
  callsTo: string[];         // 호출하는 함수들
  calledBy: string[];        // 호출되는 함수들
  isBuiltin: boolean;        // 빌트인인가? (console.log, Array.push 등)
}

/**
 * Call Graph (directed graph)
 */
export interface CallGraph {
  nodes: Map<string, CallGraphNode>;
  edges: FunctionCall[];
  rootFunctions: string[];   // 정의되었지만 호출되지 않은 함수들
  unreachableFunctions: string[]; // 정의되었지만 도달 불가능한 함수들
}

/**
 * 빌트인 함수 목록 (기초)
 */
const BUILTIN_FUNCTIONS = new Set([
  'console.log',
  'console.error',
  'console.warn',
  'Array.push',
  'Array.pop',
  'Array.shift',
  'Array.unshift',
  'String.length',
  'Math.max',
  'Math.min',
  'Math.abs',
  'parseInt',
  'parseFloat',
  'toString',
]);

/**
 * CallGraphBuilder: 함수 호출 관계 분석
 */
export class CallGraphBuilder {
  private callGraph: CallGraph = {
    nodes: new Map(),
    edges: [],
    rootFunctions: [],
    unreachableFunctions: [],
  };

  private currentFunction: string = 'global';
  private functionsInScope: Set<string> = new Set();

  /**
   * Step 1: 함수 정의 수집
   */
  collectFunctionDefinitions(statements: Statement[]): void {
    for (const stmt of statements) {
      if (stmt.type === 'FunctionDeclaration') {
        const fn = stmt as FunctionDeclaration;
        const fnName = fn.name.value;

        if (!this.callGraph.nodes.has(fnName)) {
          this.callGraph.nodes.set(fnName, {
            name: fnName,
            isDefined: true,
            callsTo: [],
            calledBy: [],
            isBuiltin: false,
          });
        }
        this.functionsInScope.add(fnName);
      }
    }
  }

  /**
   * Step 2: 함수 본문에서 호출 추적
   */
  analyzeFunctionCalls(statements: Statement[]): void {
    for (const stmt of statements) {
      this.analyzeStatement(stmt, this.currentFunction);
    }
  }

  /**
   * 재귀적으로 Statement 분석
   */
  private analyzeStatement(stmt: Statement, callerFn: string): void {
    if (!stmt) return;

    if (stmt.type === 'FunctionDeclaration') {
      const fn = stmt as FunctionDeclaration;
      const prevFunction = this.currentFunction;
      this.currentFunction = fn.name.value;

      // 함수 본문 분석
      if (fn.body && fn.body.statements) {
        for (const bodystmt of fn.body.statements) {
          this.analyzeStatement(bodystmt, this.currentFunction);
        }
      }

      this.currentFunction = prevFunction;
    }
    else if (stmt.type === 'ExpressionStatement') {
      if (stmt.expression && stmt.expression.type === 'CallExpression') {
        this.analyzeCallExpression(stmt.expression as CallExpression, callerFn);
      }
    }
    else if (stmt.type === 'VariableDeclaration') {
      if (stmt.value && stmt.value.type === 'CallExpression') {
        this.analyzeCallExpression(stmt.value as CallExpression, callerFn);
      }
    }
    else if (stmt.type === 'ReturnStatement') {
      if (stmt.value && stmt.value.type === 'CallExpression') {
        this.analyzeCallExpression(stmt.value as CallExpression, callerFn);
      }
    }
    else if (stmt.type === 'IfStatement') {
      const ifStmt = stmt as any;
      if (ifStmt.consequent && Array.isArray(ifStmt.consequent.statements)) {
        for (const s of ifStmt.consequent.statements) {
          this.analyzeStatement(s, callerFn);
        }
      }
      if (ifStmt.alternate && Array.isArray(ifStmt.alternate.statements)) {
        for (const s of ifStmt.alternate.statements) {
          this.analyzeStatement(s, callerFn);
        }
      }
    }
    else if (stmt.type === 'ForStatement') {
      const forStmt = stmt as any;
      if (forStmt.body && Array.isArray(forStmt.body.statements)) {
        for (const s of forStmt.body.statements) {
          this.analyzeStatement(s, callerFn);
        }
      }
    }
  }

  /**
   * CallExpression 분석
   */
  private analyzeCallExpression(call: CallExpression, callerFn: string): void {
    if (!call.callee) return;

    let calleeName: string | null = null;
    let isBuiltin = false;

    // 간단한 식별자 호출: foo()
    if (call.callee.type === 'IdentifierExpression') {
      calleeName = (call.callee as IdentifierExpression).value;
    }
    // 멤버 호출: obj.method()
    else if (call.callee.type === 'MemberExpression') {
      const member = call.callee as any;
      if (member.object && member.property) {
        const objName = member.object.type === 'IdentifierExpression'
          ? (member.object as IdentifierExpression).value
          : 'unknown';
        const propName = member.property.type === 'IdentifierExpression'
          ? (member.property as IdentifierExpression).value
          : 'unknown';
        calleeName = `${objName}.${propName}`;

        if (BUILTIN_FUNCTIONS.has(calleeName)) {
          isBuiltin = true;
        }
      }
    }

    if (!calleeName) return;

    // Edge 추가
    const edge: FunctionCall = {
      caller: callerFn,
      callee: calleeName,
      line: call.line ?? 0,
      confidence: isBuiltin ? 0.9 : 0.95,
    };
    this.callGraph.edges.push(edge);

    // 노드 업데이트
    const callerNode = this.callGraph.nodes.get(callerFn);
    if (callerNode) {
      if (!callerNode.callsTo.includes(calleeName)) {
        callerNode.callsTo.push(calleeName);
      }
    }

    // 호출된 함수가 정의되지 않았으면 추가 (미정의)
    if (!this.callGraph.nodes.has(calleeName)) {
      this.callGraph.nodes.set(calleeName, {
        name: calleeName,
        isDefined: false,
        callsTo: [],
        calledBy: [],
        isBuiltin,
      });
    }

    const calleeNode = this.callGraph.nodes.get(calleeName);
    if (calleeNode && !calleeNode.calledBy.includes(callerFn)) {
      calleeNode.calledBy.push(callerFn);
    }
  }

  /**
   * Root Functions 계산 (정의되었지만 호출되지 않은 함수)
   */
  private computeRootFunctions(): void {
    this.callGraph.rootFunctions = [];
    for (const [fnName, node] of this.callGraph.nodes) {
      if (node.isDefined && node.calledBy.length === 0) {
        this.callGraph.rootFunctions.push(fnName);
      }
    }
  }

  /**
   * Unreachable Functions 계산 (도달 불가능한 함수)
   */
  private computeUnreachableFunctions(): void {
    this.callGraph.unreachableFunctions = [];

    // BFS로 root functions부터 도달 가능한 함수들 찾기
    const reachable = new Set<string>();
    const queue: string[] = [...this.callGraph.rootFunctions];

    while (queue.length > 0) {
      const fn = queue.shift()!;
      if (reachable.has(fn)) continue;
      reachable.add(fn);

      const node = this.callGraph.nodes.get(fn);
      if (node) {
        for (const callee of node.callsTo) {
          if (!reachable.has(callee)) {
            queue.push(callee);
          }
        }
      }
    }

    // root functions도 자신들끼리 호출 추적
    for (const root of this.callGraph.rootFunctions) {
      const node = this.callGraph.nodes.get(root);
      if (node) {
        for (const callee of node.callsTo) {
          if (!reachable.has(callee)) {
            queue.push(callee);
          }
        }
      }
    }

    // 정의되었지만 도달 불가능한 함수들
    for (const [fnName, node] of this.callGraph.nodes) {
      if (node.isDefined && !reachable.has(fnName)) {
        this.callGraph.unreachableFunctions.push(fnName);
      }
    }
  }

  /**
   * 최종 Call Graph 생성
   */
  build(statements: Statement[]): CallGraph {
    this.collectFunctionDefinitions(statements);
    this.analyzeFunctionCalls(statements);
    this.computeRootFunctions();
    this.computeUnreachableFunctions();

    return this.callGraph;
  }

  /**
   * Call Graph 조회
   */
  getGraph(): CallGraph {
    return this.callGraph;
  }

  /**
   * 특정 함수가 호출하는 함수들
   */
  getCallees(fnName: string): string[] {
    const node = this.callGraph.nodes.get(fnName);
    return node ? node.callsTo : [];
  }

  /**
   * 특정 함수를 호출하는 함수들
   */
  getCallers(fnName: string): string[] {
    const node = this.callGraph.nodes.get(fnName);
    return node ? node.calledBy : [];
  }

  /**
   * 두 함수 간 호출 경로 존재 여부
   */
  hasPath(from: string, to: string): boolean {
    const visited = new Set<string>();
    const queue: string[] = [from];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === to) return true;
      if (visited.has(current)) continue;

      visited.add(current);
      const node = this.callGraph.nodes.get(current);
      if (node) {
        queue.push(...node.callsTo);
      }
    }

    return false;
  }
}
