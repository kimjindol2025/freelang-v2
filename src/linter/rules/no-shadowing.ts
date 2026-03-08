/**
 * Native-Linter Rule: shadowing_check
 *
 * 변수 섀도잉 감지 규칙
 * - 외부 스코프와 동일한 이름의 변수를 내부 스코프에서 재선언하면 위반
 * - 함수 파라미터와 동일한 이름의 let 선언도 감지
 *
 * ESLint `no-shadow` 대체 (외부 의존성 0%)
 */

import { Statement } from '../../parser/ast';
import { LintViolation } from './no-unused';

/**
 * 스코프 체인 (변수 이름 → 선언 위치)
 */
type ScopeEntry = { line: number; column: number };
type ScopeChain = Map<string, ScopeEntry>[];

/**
 * 현재 스코프 체인에서 이름이 이미 선언되었는지 확인 (현재 스코프 제외)
 */
function isInOuterScope(name: string, chain: ScopeChain): ScopeEntry | null {
  for (let i = chain.length - 2; i >= 0; i--) {
    const entry = chain[i].get(name);
    if (entry) return entry;
  }
  return null;
}

/**
 * 문장 목록을 스캔하여 섀도잉 위반 찾기
 * - stmt를 any로 처리: FunctionStatement는 Statement 유니온 외부에 있음
 */
function scanStatements(
  stmts: Statement[],
  chain: ScopeChain,
  severity: 'error' | 'warn',
  violations: LintViolation[]
): void {
  const currentScope = chain[chain.length - 1];

  for (const stmt of stmts) {
    const s = stmt as any;

    if (s.type === 'variable') {
      const outer = isInOuterScope(s.name, chain);
      if (outer) {
        violations.push({
          rule: 'shadowing_check',
          severity,
          message: `'${s.name}' shadows outer variable declared at line ${outer.line}`,
          line: s.line ?? 0,
          column: s.column ?? 0,
        });
      }
      currentScope.set(s.name, { line: s.line ?? 0, column: s.column ?? 0 });

    } else if (s.type === 'function') {
      // FunctionStatement (런타임에 statements 배열에 포함됨)
      if (s.name) {
        const outer = isInOuterScope(s.name, chain);
        if (outer) {
          violations.push({
            rule: 'shadowing_check',
            severity,
            message: `function '${s.name}' shadows outer declaration at line ${outer.line}`,
            line: s.source?.line ?? 0,
            column: 0,
          });
        }
        currentScope.set(s.name, { line: s.source?.line ?? 0, column: 0 });
      }

      // 함수 스코프 생성 (파라미터 포함)
      const fnScope = new Map<string, ScopeEntry>();
      for (const param of s.params ?? []) {
        fnScope.set(param.name, { line: s.source?.line ?? 0, column: 0 });
      }
      // body: BlockStatement → body.body: Statement[]
      scanStatements(s.body?.body ?? [], [...chain, fnScope], severity, violations);

    } else if (s.type === 'if') {
      const ifScope = new Map<string, ScopeEntry>();
      scanStatements(s.consequent?.body ?? [], [...chain, ifScope], severity, violations);
      if (s.alternate) {
        const elseScope = new Map<string, ScopeEntry>();
        scanStatements(s.alternate.body ?? [], [...chain, elseScope], severity, violations);
      }

    } else if (s.type === 'for') {
      // ForStatement: variable(이터레이터 변수), iterable, body: BlockStatement
      const loopScope = new Map<string, ScopeEntry>();
      if (s.variable) {
        const outer = isInOuterScope(s.variable, chain);
        if (outer) {
          violations.push({
            rule: 'shadowing_check',
            severity,
            message: `loop variable '${s.variable}' shadows outer variable at line ${outer.line}`,
            line: s.line ?? 0,
            column: 0,
          });
        }
        loopScope.set(s.variable, { line: s.line ?? 0, column: 0 });
      }
      scanStatements(s.body?.body ?? [], [...chain, loopScope], severity, violations);

    } else if (s.type === 'forOf') {
      // ForOfStatement: variable, iterable, body: BlockStatement
      const loopScope = new Map<string, ScopeEntry>();
      if (s.variable) {
        const outer = isInOuterScope(s.variable, chain);
        if (outer) {
          violations.push({
            rule: 'shadowing_check',
            severity,
            message: `loop variable '${s.variable}' shadows outer variable at line ${outer.line}`,
            line: s.line ?? 0,
            column: 0,
          });
        }
        loopScope.set(s.variable, { line: s.line ?? 0, column: 0 });
      }
      scanStatements(s.body?.body ?? [], [...chain, loopScope], severity, violations);

    } else if (s.type === 'while') {
      const loopScope = new Map<string, ScopeEntry>();
      scanStatements(s.body?.body ?? [], [...chain, loopScope], severity, violations);

    } else if (s.type === 'block') {
      const blockScope = new Map<string, ScopeEntry>();
      scanStatements(s.body ?? [], [...chain, blockScope], severity, violations);

    } else if (s.type === 'try') {
      // TryStatement.body: BlockStatement, catchClauses?: CatchClause[], finallyBody?: BlockStatement
      const tryScope = new Map<string, ScopeEntry>();
      scanStatements(s.body?.body ?? [], [...chain, tryScope], severity, violations);
      for (const cc of s.catchClauses ?? []) {
        const catchScope = new Map<string, ScopeEntry>();
        if (cc.parameter) catchScope.set(cc.parameter, { line: 0, column: 0 });
        scanStatements(cc.body?.body ?? [], [...chain, catchScope], severity, violations);
      }
      if (s.finallyBody) {
        const finallyScope = new Map<string, ScopeEntry>();
        scanStatements(s.finallyBody.body ?? [], [...chain, finallyScope], severity, violations);
      }
    }
  }
}

/**
 * shadowing_check 규칙 검사
 *
 * @param stmts 검사할 문장 목록
 * @param severity 위반 심각도
 * @param globalScope 전역 심볼 (선택사항)
 * @returns 위반 목록
 */
export function checkShadowing(
  stmts: Statement[],
  severity: 'error' | 'warn',
  globalScope?: Map<string, ScopeEntry>
): LintViolation[] {
  const violations: LintViolation[] = [];
  const rootScope = globalScope ?? new Map<string, ScopeEntry>();
  const chain: ScopeChain = [rootScope, new Map()];
  scanStatements(stmts, chain, severity, violations);
  return violations;
}
