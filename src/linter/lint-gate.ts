/**
 * FreeLang v2 Native-Linter: Lint-Gate
 *
 * ESLint 완전 대체 (외부 의존성 0%)
 * @lint(...) 어노테이션 기반 컴파일 시점 코드 품질 강제
 *
 * 지원 규칙:
 *   no_unused       - 미사용 변수 감지 (error | warn | off)
 *   shadowing_check - 변수 섀도잉 감지 (error | warn | off)
 *   strict_pointers - 포인터 안전성 강제 (true | false)
 *
 * 사용 예:
 *   @lint(no_unused: error, shadowing_check: warn, strict_pointers: true)
 *   fn main() { ... }
 */

import { Module } from '../parser/ast';
import { LintViolation, checkNoUnused } from './rules/no-unused';
import { checkShadowing } from './rules/no-shadowing';
import { checkStrictPointers } from './rules/strict-pointers';

export type { LintViolation };

export interface LintResult {
  passed: boolean;           // 에러 0개면 true
  violations: LintViolation[];
  errorCount: number;
  warnCount: number;
  rulesApplied: string[];    // 적용된 규칙 이름 목록
}

/**
 * 모듈 AST에 Lint-Gate 실행
 *
 * @param module 파싱된 모듈 AST
 * @returns LintResult (에러 있으면 passed=false)
 */
export function runLintGate(module: Module): LintResult {
  const config = module.lintConfig;

  // @lint 어노테이션 없으면 통과
  if (!config) {
    return { passed: true, violations: [], errorCount: 0, warnCount: 0, rulesApplied: [] };
  }

  const allStatements = module.statements;
  const violations: LintViolation[] = [];
  const rulesApplied: string[] = [];

  // Rule 1: no_unused
  if (config.no_unused && config.no_unused !== 'off') {
    rulesApplied.push('no_unused');
    const v = checkNoUnused(allStatements, config.no_unused);
    violations.push(...v);
  }

  // Rule 2: shadowing_check
  if (config.shadowing_check && config.shadowing_check !== 'off') {
    rulesApplied.push('shadowing_check');
    const v = checkShadowing(allStatements, config.shadowing_check);
    violations.push(...v);
  }

  // Rule 3: strict_pointers
  if (config.strict_pointers === true) {
    rulesApplied.push('strict_pointers');
    const v = checkStrictPointers(allStatements);
    violations.push(...v);
  }

  const errorCount = violations.filter(v => v.severity === 'error').length;
  const warnCount = violations.filter(v => v.severity === 'warn').length;

  return {
    passed: errorCount === 0,
    violations,
    errorCount,
    warnCount,
    rulesApplied,
  };
}

/**
 * LintResult를 사람이 읽기 쉬운 형식으로 출력
 */
export function formatLintResult(result: LintResult, filePath?: string): string {
  const lines: string[] = [];
  const prefix = filePath ? `[lint] ${filePath}` : '[lint]';

  if (result.violations.length === 0) {
    lines.push(`${prefix} ✓ 0 violations — rules: ${result.rulesApplied.join(', ')}`);
    return lines.join('\n');
  }

  for (const v of result.violations) {
    const icon = v.severity === 'error' ? '✘' : '⚠';
    lines.push(`${prefix}:${v.line}:${v.column} ${icon} [${v.rule}] ${v.message}`);
  }

  const summary = `${result.errorCount} error(s), ${result.warnCount} warning(s) — rules: ${result.rulesApplied.join(', ')}`;
  lines.push(`${prefix} ${summary}`);

  return lines.join('\n');
}

/**
 * 컴파일 파이프라인 통합용: 에러가 있으면 예외 throw
 */
export function assertLintPassed(result: LintResult, filePath?: string): void {
  if (!result.passed) {
    const msg = formatLintResult(result, filePath);
    throw new Error(`[Lint-Gate] Build blocked by ${result.errorCount} error(s):\n${msg}`);
  }
}
