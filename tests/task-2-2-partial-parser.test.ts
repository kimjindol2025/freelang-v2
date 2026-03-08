/**
 * Phase 2 Task 2.2 Tests: Partial Parser Extension
 *
 * 20개 테스트로 불완전한 표현식/블록 처리 검증
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  ExpressionCompleter,
  CompletionType,
  createExpressionCompleter,
} from '../src/parser/expression-completer';

// Token interface for testing
interface Token {
  type: string;
  value: string;
  line: number;
  column: number;
}

describe('Task 2.2: Partial Parser Extension', () => {
  let completer: ExpressionCompleter;

  beforeEach(() => {
    completer = createExpressionCompleter();
  });

  describe('Incomplete Expression Detection (8개)', () => {
    // Test 1: Trailing binary operator detection
    it('should detect trailing binary operator', () => {
      const tokens: Token[] = [
        { type: 'IDENT', value: 'x', line: 1, column: 1 },
        { type: 'PLUS', value: '+', line: 1, column: 3 },
        { type: 'NEWLINE', value: '\n', line: 1, column: 4 },
      ];

      const result = completer.parseIncompleteExpression(tokens);
      expect(result.isComplete).toBe(false);
      expect(result.missingParts).toContain('right_operand');
    });

    // Test 2: Unclosed parenthesis detection
    it('should detect unclosed parenthesis', () => {
      const tokens: Token[] = [
        { type: 'IDENT', value: 'foo', line: 1, column: 1 },
        { type: 'LPAREN', value: '(', line: 1, column: 4 },
        { type: 'IDENT', value: 'x', line: 1, column: 5 },
        { type: 'NEWLINE', value: '\n', line: 1, column: 6 },
      ];

      const result = completer.parseIncompleteExpression(tokens);
      expect(result.isComplete).toBe(false);
      expect(result.missingParts).toContain('closing_paren');
    });

    // Test 3: Unclosed bracket detection
    it('should detect unclosed bracket', () => {
      const tokens: Token[] = [
        { type: 'IDENT', value: 'arr', line: 1, column: 1 },
        { type: 'LBRACKET', value: '[', line: 1, column: 4 },
        { type: 'IDENT', value: 'i', line: 1, column: 5 },
        { type: 'NEWLINE', value: '\n', line: 1, column: 6 },
      ];

      const result = completer.parseIncompleteExpression(tokens);
      expect(result.isComplete).toBe(false);
      expect(result.missingParts.length).toBeGreaterThan(0);
    });

    // Test 4: Trailing member access detection
    it('should detect incomplete member access', () => {
      const tokens: Token[] = [
        { type: 'IDENT', value: 'obj', line: 1, column: 1 },
        { type: 'DOT', value: '.', line: 1, column: 4 },
        { type: 'NEWLINE', value: '\n', line: 1, column: 5 },
      ];

      const result = completer.parseIncompleteExpression(tokens);
      expect(result.isComplete).toBe(false);
      expect(result.missingParts).toContain('member_name');
    });

    // Test 5: Assignment without value
    it('should detect assignment without value', () => {
      const tokens: Token[] = [
        { type: 'IDENT', value: 'x', line: 1, column: 1 },
        { type: 'ASSIGN', value: '=', line: 1, column: 3 },
        { type: 'NEWLINE', value: '\n', line: 1, column: 4 },
      ];

      const result = completer.parseIncompleteExpression(tokens);
      expect(result.isComplete).toBe(false);
    });

    // Test 6: Multiple missing parts
    it('should detect multiple missing parts', () => {
      const tokens: Token[] = [
        { type: 'IDENT', value: 'arr', line: 1, column: 1 },
        { type: 'LBRACKET', value: '[', line: 1, column: 4 },
        { type: 'NEWLINE', value: '\n', line: 1, column: 5 },
      ];

      const result = completer.parseIncompleteExpression(tokens);
      expect(result.missingParts.length).toBeGreaterThan(1);
    });

    // Test 7: Complete expression detection
    it('should detect complete expressions', () => {
      const tokens: Token[] = [
        { type: 'IDENT', value: 'x', line: 1, column: 1 },
        { type: 'PLUS', value: '+', line: 1, column: 3 },
        { type: 'NUMBER', value: '5', line: 1, column: 5 },
      ];

      const result = completer.parseIncompleteExpression(tokens);
      expect(result.isComplete).toBe(true);
      expect(result.missingParts.length).toBe(0);
    });

    // Test 8: Nested parentheses
    it('should handle nested parentheses', () => {
      const tokens: Token[] = [
        { type: 'LPAREN', value: '(', line: 1, column: 1 },
        { type: 'IDENT', value: 'foo', line: 1, column: 2 },
        { type: 'LPAREN', value: '(', line: 1, column: 5 },
        { type: 'IDENT', value: 'x', line: 1, column: 6 },
        { type: 'RPAREN', value: ')', line: 1, column: 7 },
        // Missing outer )
      ];

      const result = completer.parseIncompleteExpression(tokens);
      expect(result.isComplete).toBe(false);
    });
  });

  describe('Empty Block Handling (6개)', () => {
    // Test 9: Empty if block
    it('should detect empty if block', () => {
      const tokens: Token[] = [
        { type: 'IF', value: 'if', line: 1, column: 1 },
        { type: 'IDENT', value: 'condition', line: 1, column: 4 },
        { type: 'DO', value: 'do', line: 1, column: 13 },
        { type: 'NEWLINE', value: '\n', line: 1, column: 15 },
      ];

      const result = completer.handleEmptyBlock(tokens);
      expect(result.isEmpty).toBe(true);
      expect(result.suggestion).toContain('stub');
    });

    // Test 10: Empty for loop
    it('should detect empty for loop', () => {
      const tokens: Token[] = [
        { type: 'FOR', value: 'for', line: 1, column: 1 },
        { type: 'IDENT', value: 'i', line: 1, column: 5 },
        { type: 'IN', value: 'in', line: 1, column: 7 },
        { type: 'IDENT', value: 'arr', line: 1, column: 10 },
        { type: 'DO', value: 'do', line: 1, column: 13 },
        { type: 'NEWLINE', value: '\n', line: 1, column: 15 },
      ];

      const result = completer.handleEmptyBlock(tokens);
      expect(result.isEmpty).toBe(true);
    });

    // Test 11: Empty while loop
    it('should detect empty while loop', () => {
      const tokens: Token[] = [
        { type: 'WHILE', value: 'while', line: 1, column: 1 },
        { type: 'IDENT', value: 'condition', line: 1, column: 7 },
        { type: 'DO', value: 'do', line: 1, column: 16 },
        { type: 'RBRACE', value: '}', line: 2, column: 1 },
      ];

      const result = completer.handleEmptyBlock(tokens);
      expect(result.isEmpty).toBe(true);
    });

    // Test 12: Non-empty if block
    it('should not flag non-empty block as empty', () => {
      const tokens: Token[] = [
        { type: 'IF', value: 'if', line: 1, column: 1 },
        { type: 'IDENT', value: 'x', line: 1, column: 4 },
        { type: 'DO', value: 'do', line: 1, column: 5 },
        { type: 'IDENT', value: 'foo', line: 2, column: 1 },
        { type: 'LPAREN', value: '(', line: 2, column: 4 },
        { type: 'RPAREN', value: ')', line: 2, column: 5 },
      ];

      const result = completer.handleEmptyBlock(tokens);
      expect(result.isEmpty).toBe(false);
    });

    // Test 13: Block without do keyword
    it('should handle block without do keyword', () => {
      const tokens: Token[] = [
        { type: 'IF', value: 'if', line: 1, column: 1 },
        { type: 'IDENT', value: 'x', line: 1, column: 4 },
        { type: 'LBRACE', value: '{', line: 1, column: 5 },
        { type: 'RBRACE', value: '}', line: 1, column: 6 },
      ];

      const result = completer.handleEmptyBlock(tokens);
      expect(result.isEmpty).toBe(true);
    });

    // Test 14: Detect insert point for stub
    it('should identify correct insertion point', () => {
      const tokens: Token[] = [
        { type: 'IF', value: 'if', line: 1, column: 1 },
        { type: 'IDENT', value: 'x', line: 1, column: 4 },
        { type: 'DO', value: 'do', line: 1, column: 5 },
        { type: 'NEWLINE', value: '\n', line: 1, column: 7 },
      ];

      const result = completer.handleEmptyBlock(tokens);
      expect(result.insertPoint).toBeGreaterThan(-1);
    });
  });

  describe('Token Auto-Completion (4개)', () => {
    // Test 15: Auto-complete missing closing paren
    it('should auto-complete missing closing parenthesis', () => {
      const tokens: Token[] = [
        { type: 'IDENT', value: 'foo', line: 1, column: 1 },
        { type: 'LPAREN', value: '(', line: 1, column: 4 },
        { type: 'IDENT', value: 'x', line: 1, column: 5 },
      ];

      const completed = completer.autoCompleteTokens(tokens);
      expect(completed.length).toBeGreaterThan(tokens.length);
      expect(completed[completed.length - 1].type).toBe('RPAREN');
    });

    // Test 16: Auto-complete missing closing bracket
    it('should auto-complete missing closing bracket', () => {
      const tokens: Token[] = [
        { type: 'IDENT', value: 'arr', line: 1, column: 1 },
        { type: 'LBRACKET', value: '[', line: 1, column: 4 },
        { type: 'NUMBER', value: '0', line: 1, column: 5 },
      ];

      const completed = completer.autoCompleteTokens(tokens);
      expect(completed[completed.length - 1].type).toBe('RBRACKET');
    });

    // Test 17: Multiple unmatched tokens
    it('should handle multiple unmatched tokens', () => {
      const tokens: Token[] = [
        { type: 'LPAREN', value: '(', line: 1, column: 1 },
        { type: 'LBRACKET', value: '[', line: 1, column: 2 },
        { type: 'IDENT', value: 'x', line: 1, column: 3 },
      ];

      const completed = completer.autoCompleteTokens(tokens);
      // Should add both ] and )
      expect(completed.length).toBe(tokens.length + 2);
    });

    // Test 18: Already complete tokens
    it('should not modify already complete tokens', () => {
      const tokens: Token[] = [
        { type: 'IDENT', value: 'foo', line: 1, column: 1 },
        { type: 'LPAREN', value: '(', line: 1, column: 4 },
        { type: 'RPAREN', value: ')', line: 1, column: 5 },
      ];

      const completed = completer.autoCompleteTokens(tokens);
      expect(completed.length).toBe(tokens.length);
    });
  });

  describe('Full Analysis and Completion (2개)', () => {
    // Test 19: Complete analysis workflow
    it('should perform full completion analysis', () => {
      const tokens: Token[] = [
        { type: 'IDENT', value: 'x', line: 1, column: 1 },
        { type: 'PLUS', value: '+', line: 1, column: 3 },
        { type: 'LPAREN', value: '(', line: 1, column: 5 },
        { type: 'IDENT', value: 'y', line: 1, column: 6 },
      ];

      const result = completer.analyzeAndComplete(tokens);
      expect(result.hadErrors).toBe(true);
      expect(result.completions.length).toBeGreaterThan(0);
      expect(result.modifiedTokens.length).toBeGreaterThanOrEqual(tokens.length);
    });

    // Test 20: Completion result structure
    it('should return proper completion result structure', () => {
      const tokens: Token[] = [
        { type: 'IDENT', value: 'x', line: 1, column: 1 },
        { type: 'PLUS', value: '+', line: 1, column: 3 },
      ];

      const result = completer.analyzeAndComplete(tokens);
      expect(result).toHaveProperty('completions');
      expect(result).toHaveProperty('modifiedTokens');
      expect(result).toHaveProperty('modifiedText');
      expect(result).toHaveProperty('hadErrors');
      expect(Array.isArray(result.completions)).toBe(true);
      expect(Array.isArray(result.modifiedTokens)).toBe(true);
      expect(typeof result.modifiedText).toBe('string');
    });
  });

  describe('Edge Cases (additional coverage)', () => {
    it('should handle empty token list', () => {
      const tokens: Token[] = [];
      const result = completer.analyzeAndComplete(tokens);
      expect(Array.isArray(result.completions)).toBe(true);
    });

    it('should handle deeply nested parentheses', () => {
      const tokens: Token[] = [
        { type: 'LPAREN', value: '(', line: 1, column: 1 },
        { type: 'LPAREN', value: '(', line: 1, column: 2 },
        { type: 'LPAREN', value: '(', line: 1, column: 3 },
        { type: 'IDENT', value: 'x', line: 1, column: 4 },
      ];

      const result = completer.analyzeAndComplete(tokens);
      expect(result.completions.length).toBeGreaterThan(0);
    });

    it('should handle mixed operators and operands', () => {
      const tokens: Token[] = [
        { type: 'NUMBER', value: '1', line: 1, column: 1 },
        { type: 'PLUS', value: '+', line: 1, column: 2 },
        { type: 'NUMBER', value: '2', line: 1, column: 3 },
        { type: 'MULTIPLY', value: '*', line: 1, column: 4 },
      ];

      const result = completer.analyzeAndComplete(tokens);
      expect(result.hadErrors).toBe(true);
    });

    it('should preserve token order', () => {
      const tokens: Token[] = [
        { type: 'IDENT', value: 'a', line: 1, column: 1 },
        { type: 'PLUS', value: '+', line: 1, column: 2 },
        { type: 'IDENT', value: 'b', line: 1, column: 3 },
      ];

      const result = completer.analyzeAndComplete(tokens);
      // First 3 tokens should be in same order
      expect(result.modifiedTokens.slice(0, 3)).toEqual(tokens);
    });
  });
});

/**
 * Phase 2 Task 2.2 Test Summary
 *
 * ✅ 20개 테스트 작성 완료
 *
 * 테스트 카테고리:
 * 1. Incomplete Expression Detection (8개)
 *    - Binary operators, parentheses, brackets, member access, assignment, multiple missing parts, complete expr, nested
 *
 * 2. Empty Block Handling (6개)
 *    - if/for/while loops, non-empty blocks, blocks without do, insert point detection
 *
 * 3. Token Auto-Completion (4개)
 *    - Closing paren, closing bracket, multiple tokens, already complete
 *
 * 4. Full Analysis (2개)
 *    - Complete workflow, result structure
 *
 * 목표 달성도:
 * - 불완전한 표현식 감지: ✅ 완성
 * - 빈 블록 처리: ✅ 완성
 * - 토큰 자동 완성: ✅ 완성
 * - 전체 분석 워크플로우: ✅ 완성
 *
 * 다음 단계: Task 2.3 타입 추론 개선
 */
