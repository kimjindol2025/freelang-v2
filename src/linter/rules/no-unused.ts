/**
 * Native-Linter Rule: no_unused
 *
 * 미사용 변수 감지 규칙
 * - let x = 5 선언 후 x를 전혀 사용하지 않으면 위반
 * - 함수 파라미터도 추적
 *
 * ESLint `no-unused-vars` 대체 (외부 의존성 0%)
 */

import { Statement, Expression } from '../../parser/ast';

export interface LintViolation {
  rule: string;
  severity: 'error' | 'warn';
  message: string;
  line: number;
  column: number;
}

interface SymbolEntry {
  name: string;
  line: number;
  column: number;
  used: boolean;
  kind: 'variable' | 'parameter';
}

/**
 * 표현식에서 참조된 식별자 이름 수집
 */
function collectRefs(expr: Expression | undefined | null, refs: Set<string>): void {
  if (!expr) return;
  const e = expr as any;
  switch (e.type) {
    case 'identifier':
      refs.add(e.name);
      break;
    case 'binary':
      collectRefs(e.left, refs);
      collectRefs(e.right, refs);
      break;
    case 'call':
      collectRefs(e.callee, refs);
      for (const arg of e.arguments ?? []) collectRefs(arg, refs);
      break;
    case 'member':
      collectRefs(e.object, refs);
      break;
    case 'lambda':
      // lambda body는 Expression 하나 (BlockStatement가 아님)
      collectRefs(e.body, refs);
      break;
    case 'array':
      for (const el of e.elements ?? []) collectRefs(el, refs);
      break;
    case 'await':
      collectRefs(e.argument, refs);
      break;
  }
}

/**
 * 문장 목록에서 참조된 식별자 이름 수집
 */
function collectRefsInStatements(stmts: Statement[], refs: Set<string>): void {
  for (const stmt of stmts) {
    const s = stmt as any;
    switch (s.type) {
      case 'expression':
        collectRefs(s.expression, refs);
        break;
      case 'variable':
        collectRefs(s.value, refs);
        break;
      case 'return':
        collectRefs(s.argument, refs);    // ReturnStatement.argument
        break;
      case 'if':
        collectRefs(s.condition, refs);
        collectRefsInStatements(s.consequent?.body ?? [], refs);
        if (s.alternate) collectRefsInStatements(s.alternate.body ?? [], refs);
        break;
      case 'for':
        // ForStatement: variable(이터레이터), iterable, body: BlockStatement
        refs.add(s.variable);
        collectRefs(s.iterable, refs);
        collectRefsInStatements(s.body?.body ?? [], refs);
        break;
      case 'forOf':
        refs.add(s.variable);
        collectRefs(s.iterable, refs);
        collectRefsInStatements(s.body?.body ?? [], refs);
        break;
      case 'while':
        collectRefs(s.condition, refs);
        collectRefsInStatements(s.body?.body ?? [], refs);
        break;
      case 'block':
        collectRefsInStatements(s.body ?? [], refs);
        break;
      case 'try':
        // TryStatement.body: BlockStatement, catchClauses?: CatchClause[], finallyBody?: BlockStatement
        collectRefsInStatements(s.body?.body ?? [], refs);
        for (const cc of s.catchClauses ?? []) {
          collectRefsInStatements(cc.body?.body ?? [], refs);
        }
        collectRefsInStatements(s.finallyBody?.body ?? [], refs);
        break;
      case 'throw':
        collectRefs(s.argument, refs);
        break;
      case 'function':
        // FunctionStatement (not in Statement union but pushed at runtime)
        collectRefsInStatements(s.body?.body ?? [], refs);
        break;
    }
  }
}

/**
 * no_unused 규칙 검사
 *
 * @param stmts 검사할 문장 목록
 * @param severity 위반 심각도
 * @returns 위반 목록
 */
export function checkNoUnused(
  stmts: Statement[],
  severity: 'error' | 'warn'
): LintViolation[] {
  const violations: LintViolation[] = [];

  // 선언된 심볼 수집
  const symbols: SymbolEntry[] = [];
  for (const stmt of stmts) {
    const s = stmt as any;
    if (s.type === 'variable') {
      symbols.push({
        name: s.name,
        line: s.line ?? 0,
        column: s.column ?? 0,
        used: false,
        kind: 'variable',
      });
    } else if (s.type === 'function') {
      // 함수 파라미터 추적
      for (const param of s.params ?? []) {
        symbols.push({
          name: param.name,
          line: s.source?.line ?? 0,
          column: 0,
          used: false,
          kind: 'parameter',
        });
      }
      // 함수 본체 내부도 재귀 검사
      const inner = checkNoUnused(s.body?.body ?? [], severity);
      violations.push(...inner);
    }
  }

  // 사용 참조 수집
  const refs = new Set<string>();
  collectRefsInStatements(stmts, refs);

  // 미사용 심볼 찾기
  for (const sym of symbols) {
    if (!refs.has(sym.name)) {
      violations.push({
        rule: 'no_unused',
        severity,
        message: `'${sym.name}' is declared but never used (${sym.kind})`,
        line: sym.line,
        column: sym.column,
      });
    }
  }

  return violations;
}
