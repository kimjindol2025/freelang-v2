/**
 * Phase 2 Task 2.4 Tests: Suggestion Engine
 *
 * 20개 테스트로 통합 경고/제안 시스템 검증
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  SuggestionEngine,
  WarningType,
  SeverityLevel,
  CompileWarning,
  createSuggestionEngine,
} from '../src/compiler/suggestion-engine';

describe('Task 2.4: Suggestion Engine (Integrated Warnings & Suggestions)', () => {
  let engine: SuggestionEngine;

  beforeEach(() => {
    engine = createSuggestionEngine();
  });

  describe('Incomplete Expression Detection (4개)', () => {
    // Test 1: Trailing binary operator
    it('should warn about trailing binary operator', () => {
      const code = `
        fn calculate
          do
            result = 10
            sum = result +
      `;
      const warnings = engine.analyze(code);
      const incomplete = warnings.find(w => w.type === WarningType.INCOMPLETE_EXPR);
      expect(incomplete).toBeDefined();
      expect(incomplete?.severity).toBe(SeverityLevel.ERROR);
      expect(incomplete?.autoFixable).toBe(true);
    });

    // Test 2: Unclosed parenthesis
    it('should warn about unclosed parenthesis', () => {
      const code = `
        fn process
          do
            result = foo(
      `;
      const warnings = engine.analyze(code);
      const unclosed = warnings.find(w => w.message.includes('Unclosed'));
      expect(unclosed).toBeDefined();
      expect(unclosed?.confidence).toBeGreaterThan(0.9);
    });

    // Test 3: Multiple issues in one line
    it('should detect multiple incomplete patterns', () => {
      const code = `
        fn broken
          do
            x = (y +
      `;
      const warnings = engine.analyze(code);
      expect(warnings.length).toBeGreaterThan(0);
    });

    // Test 4: Auto-fix suggestion
    it('should provide auto-fixable suggestion', () => {
      const code = 'sum = value +';
      const warnings = engine.analyze(code);
      const warning = warnings[0];
      expect(warning?.autoFixable).toBe(true);
      expect(warning?.suggestion).toBeDefined();
    });
  });

  describe('Empty Block Detection (4개)', () => {
    // Test 5: Empty if block
    it('should warn about empty if block', () => {
      const code = `
        fn process
          do
            if condition do
            // ← empty
      `;
      const warnings = engine.analyze(code);
      const emptyBlock = warnings.find(w => w.type === WarningType.EMPTY_BLOCK);
      expect(emptyBlock).toBeDefined();
      expect(emptyBlock?.severity).toBe(SeverityLevel.WARNING);
    });

    // Test 6: Empty for loop
    it('should warn about empty for loop', () => {
      const code = `
        fn loop_test
          do
            for i in 0..10 do
            // ← empty loop body
      `;
      const warnings = engine.analyze(code);
      const emptyLoop = warnings.find(w => w.message.includes('Empty'));
      expect(emptyLoop).toBeDefined();
    });

    // Test 7: Non-empty block (no warning)
    it('should not warn about non-empty block', () => {
      const code = `
        fn process
          do
            if condition do
              result = 1
      `;
      const warnings = engine.analyze(code);
      const emptyWarning = warnings.find(w => w.type === WarningType.EMPTY_BLOCK);
      expect(emptyWarning).toBeUndefined();
    });

    // Test 8: Block suggestion
    it('should suggest stub for empty block', () => {
      const code = 'if x do';
      const warnings = engine.analyze(code);
      const warning = warnings.find(w => w.type === WarningType.EMPTY_BLOCK);
      expect(warning?.suggestion).toContain('stub');
    });
  });

  describe('Missing Return Detection (3개)', () => {
    // Test 9: Missing return for typed function
    it('should warn about missing return statement', () => {
      const code = `
        fn calculate
          output: number
          do
            result = 42
            // ← no return
      `;
      const warnings = engine.analyze(code);
      const missingReturn = warnings.find(w => w.type === WarningType.MISSING_RETURN);
      expect(missingReturn).toBeDefined();
      expect(missingReturn?.severity).toBe(SeverityLevel.ERROR);
    });

    // Test 10: Return exists (no warning)
    it('should not warn when return exists', () => {
      const code = `
        fn calculate
          output: number
          do
            result = 42
            return result
      `;
      const warnings = engine.analyze(code);
      const missingReturn = warnings.find(w => w.type === WarningType.MISSING_RETURN);
      expect(missingReturn).toBeUndefined();
    });

    // Test 11: Return suggestion based on type
    it('should suggest appropriate return value', () => {
      const code = `
        fn get_sum
          output: number
          do
            x = 0
      `;
      const warnings = engine.analyze(code);
      const warning = warnings.find(w => w.type === WarningType.MISSING_RETURN);
      expect(warning?.suggestion).toContain('number');
    });
  });

  describe('Type Analysis (3개)', () => {
    // Test 12: Ambiguous type detection
    it('should detect ambiguous type variables', () => {
      const code = `
        fn ambiguous
          do
            x = 10
            x = "hello"
            x = true
      `;
      const warnings = engine.analyze(code);
      const ambiguous = warnings.find(w => w.type === WarningType.AMBIGUOUS_TYPE);
      expect(ambiguous).toBeDefined();
    });

    // Test 13: Single type (no ambiguity)
    it('should not warn about consistent types', () => {
      const code = `
        fn consistent
          do
            x = 10
            x = 20
            x = 30
      `;
      const warnings = engine.analyze(code);
      const ambiguous = warnings.find(w => w.type === WarningType.AMBIGUOUS_TYPE);
      expect(ambiguous).toBeUndefined();
    });

    // Test 14: Type mismatch suggestion
    it('should suggest type declaration for ambiguous variables', () => {
      const code = 'x = 10\nx = "hello"';
      const warnings = engine.analyze(code);
      const warning = warnings.find(w => w.type === WarningType.AMBIGUOUS_TYPE);
      expect(warning?.suggestion).toContain(':');
    });
  });

  describe('Logic Issue Detection (2개)', () => {
    // Test 15: Unreachable code detection
    it('should warn about unreachable code after return', () => {
      const code = `
        fn logic_issue
          do
            return 42
            x = 100  // ← unreachable
      `;
      const warnings = engine.analyze(code);
      const unreachable = warnings.find(w => w.type === WarningType.POTENTIAL_BUG &&
                                             w.message.includes('Unreachable'));
      expect(unreachable).toBeDefined();
    });

    // Test 16: Normal flow (no unreachable warning)
    it('should not warn about normal code flow', () => {
      const code = `
        fn normal
          do
            x = 10
            if x > 5 do
              return x
            return 0
      `;
      const warnings = engine.analyze(code);
      const unreachable = warnings.find(w => w.message.includes('Unreachable'));
      expect(unreachable).toBeUndefined();
    });
  });

  describe('Auto-Fix Functionality (2개)', () => {
    // Test 17: Can auto-fix detection
    it('should identify auto-fixable warnings', () => {
      const code = 'x = 10 +';
      const warnings = engine.analyze(code);
      const warning = warnings[0];
      expect(engine.canAutoFix(warning)).toBe(true);
    });

    // Test 18: Apply auto-fix
    it('should apply auto-fix to code', () => {
      const code = 'x = 10 +';
      const warnings = engine.analyze(code);
      const warning = warnings[0];
      const fixed = engine.applyAutoFix(code, warning);
      expect(fixed).not.toEqual(code);
      expect(fixed).toContain('10 + 0');
    });
  });

  describe('Learning Feedback (2개)', () => {
    // Test 19: Record user feedback
    it('should record user feedback for learning', () => {
      engine.recordFeedback(
        WarningType.INCOMPLETE_EXPR,
        'x +',
        'x + 0',
        true // User accepted
      );
      const stats = engine.getLearningStats();
      expect(stats.totalEntries).toBe(1);
      expect(stats.acceptanceRate).toBe(1.0);
    });

    // Test 20: Learning statistics
    it('should track learning acceptance rate', () => {
      engine.recordFeedback(
        WarningType.INCOMPLETE_EXPR,
        'x +',
        'x + 0',
        true
      );
      engine.recordFeedback(
        WarningType.INCOMPLETE_EXPR,
        'y *',
        'y * 1',
        false
      );
      const stats = engine.getLearningStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.acceptanceRate).toBe(0.5);
    });
  });

  describe('Warning Organization (Additional coverage)', () => {
    it('should filter warnings by type', () => {
      const code = `
        fn test
          output: number
          do
            x =
      `;
      const warnings = engine.analyze(code);
      const incomplete = engine.getWarningsByType(WarningType.INCOMPLETE_EXPR);
      expect(incomplete.length).toBeGreaterThan(0);
    });

    it('should filter warnings by severity', () => {
      const code = `
        fn test
          output: number
          do
            if x do
      `;
      const warnings = engine.analyze(code);
      const errors = engine.getWarningsBySeverity(SeverityLevel.ERROR);
      const warnings_level = engine.getWarningsBySeverity(SeverityLevel.WARNING);
      expect(errors.length + warnings_level.length).toBeGreaterThan(0);
    });

    it('should get critical issues', () => {
      const code = `
        fn test
          output: number
          do
            x = 10 +
      `;
      const warnings = engine.analyze(code);
      const critical = engine.getCriticalIssues();
      expect(critical.length).toBeGreaterThan(0);
    });

    it('should count warnings', () => {
      const code = `
        fn test
          output: number
          do
            x = 10 +
            if y do
      `;
      const warnings = engine.analyze(code);
      expect(engine.getWarningCount()).toBeGreaterThan(0);
    });

    it('should clear warnings', () => {
      const code = 'x = 10 +';
      engine.analyze(code);
      expect(engine.getWarningCount()).toBeGreaterThan(0);
      engine.clearWarnings();
      expect(engine.getWarningCount()).toBe(0);
    });

    it('should prioritize warnings by severity', () => {
      const code = `
        fn test
          output: number
          do
            x = 10 +
      `;
      const warnings = engine.analyze(code);
      if (warnings.length > 1) {
        // Critical/Error should come before warnings
        expect(warnings[0].priority).toBeLessThanOrEqual(warnings[warnings.length - 1].priority);
      }
    });

    it('should provide reasoning for each warning', () => {
      const code = 'if x do';
      const warnings = engine.analyze(code);
      for (const warning of warnings) {
        expect(warning.reasoning).toBeDefined();
        expect(warning.reasoning.length).toBeGreaterThan(0);
      }
    });

    it('should include confidence scores', () => {
      const code = 'x = 10 +';
      const warnings = engine.analyze(code);
      for (const warning of warnings) {
        expect(typeof warning.confidence).toBe('number');
        expect(warning.confidence).toBeGreaterThanOrEqual(0);
        expect(warning.confidence).toBeLessThanOrEqual(1);
      }
    });
  });
});

/**
 * Phase 2 Task 2.4 Test Summary
 *
 * ✅ 20개 테스트 작성 완료
 *
 * 테스트 카테고리:
 * 1. Incomplete Expression Detection (4개)
 *    - Trailing operator, unclosed paren, multiple issues, auto-fix
 *
 * 2. Empty Block Detection (4개)
 *    - if/for blocks, non-empty filtering, stub suggestions
 *
 * 3. Missing Return Detection (3개)
 *    - Return requirement, existing return, type-based suggestion
 *
 * 4. Type Analysis (3개)
 *    - Ambiguous detection, type consistency, declaration suggestion
 *
 * 5. Logic Issue Detection (2개)
 *    - Unreachable code, normal flow
 *
 * 6. Auto-Fix Functionality (2개)
 *    - Fix identification, code application
 *
 * 7. Learning Feedback (2개)
 *    - Feedback recording, statistics tracking
 *
 * 목표 달성도:
 * - 경고 생성: ✅ 완성
 * - 제안 제공: ✅ 완성
 * - 자동 수정: ✅ 완성
 * - 피드백 학습: ✅ 완성
 * - 경고 정렬: ✅ 완성
 *
 * 다음 단계: Task 2.5 E2E 통합 테스트
 */
