/**
 * FreeLang v2 Native-Linter
 *
 * Public API
 */
export { runLintGate, formatLintResult, assertLintPassed } from './lint-gate';
export type { LintResult, LintViolation } from './lint-gate';
export { checkNoUnused } from './rules/no-unused';
export { checkShadowing } from './rules/no-shadowing';
export { checkStrictPointers } from './rules/strict-pointers';
