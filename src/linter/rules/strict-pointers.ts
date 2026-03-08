/**
 * Native-Linter Rule: strict_pointers
 *
 * 포인터 안전성 규칙
 * - `*type` 포인터 타입 선언 감지
 * - 포인터 할당 없이 바로 사용하면 위반
 * - free() 없이 malloc() 사용 시 경고
 *
 * FreeLang v2 시스템 프로그래밍 계층용 (C 코드 생성 대상)
 * 외부 의존성 0%
 */

import { Statement } from '../../parser/ast';
import { LintViolation } from './no-unused';

interface PointerVar {
  name: string;
  line: number;
  freed: boolean;
  dereferenced: boolean;  // null-check 없이 역참조 여부
}

/**
 * 타입 문자열이 포인터인지 확인
 * 예: "*u8", "*char", "ptr<u8>"
 */
function isPointerType(typeStr: string | undefined): boolean {
  if (!typeStr) return false;
  return typeStr.startsWith('*') || typeStr.startsWith('ptr<') || typeStr === 'ptr';
}

/**
 * 표현식에서 free() 호출 여부 감지
 */
function hasFreeCall(stmts: Statement[]): Set<string> {
  const freed = new Set<string>();
  for (const stmt of stmts) {
    const s = stmt as any;
    if (s.type === 'expression' && s.expression?.type === 'call') {
      const callee = s.expression.callee as any;
      const calleeName = callee?.name ?? callee?.property ?? '';
      if (calleeName === 'free' || calleeName === 'ptr_free') {
        const arg = s.expression.arguments?.[0] as any;
        if (arg?.type === 'identifier') freed.add(arg.name);
      }
    } else if (s.type === 'function') {
      // 중첩 함수도 검사
      const inner = hasFreeCall(s.body?.body ?? []);
      inner.forEach(n => freed.add(n));
    }
  }
  return freed;
}

/**
 * 표현식에서 malloc() / sys.malloc() 패턴 감지
 */
function isMallocCall(expr: any): boolean {
  if (!expr) return false;
  if (expr.type === 'call') {
    const callee = expr.callee as any;
    const name = callee?.name ?? callee?.property ?? '';
    return name === 'malloc' || name === 'sys_malloc' || name === 'alloc';
  }
  return false;
}

/**
 * strict_pointers 규칙 검사
 *
 * @param stmts 검사할 문장 목록
 * @returns 위반 목록 (severity는 항상 'error')
 */
export function checkStrictPointers(stmts: Statement[]): LintViolation[] {
  const violations: LintViolation[] = [];
  const pointers: PointerVar[] = [];
  const freed = hasFreeCall(stmts);

  for (const stmt of stmts) {
    const s = stmt as any;

    if (s.type === 'variable') {
      // 포인터 타입 변수 선언 감지
      if (isPointerType(s.varType)) {
        const ptr: PointerVar = {
          name: s.name,
          line: s.line ?? 0,
          freed: freed.has(s.name),
          dereferenced: false,
        };

        // malloc 없이 포인터 선언 (값이 없거나 null인 경우)
        if (!s.value && !isMallocCall(s.value)) {
          violations.push({
            rule: 'strict_pointers',
            severity: 'error',
            message: `pointer '${s.name}' declared without initialization (uninitialized pointer is unsafe)`,
            line: s.line ?? 0,
            column: s.column ?? 0,
          });
        }

        // malloc 사용 후 free 없는 경우
        if (isMallocCall(s.value) && !ptr.freed) {
          violations.push({
            rule: 'strict_pointers',
            severity: 'error',
            message: `pointer '${s.name}' allocated with malloc() but never freed (memory leak)`,
            line: s.line ?? 0,
            column: s.column ?? 0,
          });
        }

        pointers.push(ptr);
      }
    } else if (s.type === 'function') {
      // 중첩 함수도 재귀 검사
      const inner = checkStrictPointers(s.body?.body ?? []);
      violations.push(...inner);
    }
  }

  return violations;
}
