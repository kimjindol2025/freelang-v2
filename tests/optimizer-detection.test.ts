/**
 * Phase 5 Step 1: Automatic Optimization Detection Tests
 *
 * AI-First 패러다임: IR 패턴을 자동으로 감지하고 최적화 제안
 * TypeScript로 최적화 로직을 하드코딩하지 않음
 * 대신, IR 분석을 통해 자동 발견
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { OptimizationDetector } from '../src/analyzer/optimization-detector';
import { Op } from '../src/types';

describe('OptimizationDetector - Automatic Optimization Detection (AI-First)', () => {
  let detector: OptimizationDetector;

  beforeEach(() => {
    detector = new OptimizationDetector();
  });

  // ============================================================================
  // 1. Constant Folding 감지 - 5개
  // ============================================================================
  describe('Constant Folding Detection', () => {
    it('should detect PUSH 10, PUSH 20, ADD pattern', () => {
      const ir = [
        { op: Op.PUSH, arg: 10 },
        { op: Op.PUSH, arg: 20 },
        { op: Op.ADD },
      ];

      const suggestions = detector.detectOptimizations(ir);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].type).toBe('constant_folding');
      expect(suggestions[0].confidence).toBe(0.95);
      expect(suggestions[0].after?.[0].arg).toBe(30);
    });

    it('should detect PUSH 100, PUSH 4, DIV pattern', () => {
      const ir = [
        { op: Op.PUSH, arg: 100 },
        { op: Op.PUSH, arg: 4 },
        { op: Op.DIV },
      ];

      const suggestions = detector.detectOptimizations(ir);

      const cfold = suggestions.find(s => s.type === 'constant_folding');
      expect(cfold).toBeDefined();
      expect(cfold?.after?.[0].arg).toBe(25);
    });

    it('should detect multiple constant folding opportunities in sequence', () => {
      const ir = [
        { op: Op.PUSH, arg: 2 },
        { op: Op.PUSH, arg: 3 },
        { op: Op.ADD }, // 5
        { op: Op.PUSH, arg: 4 },
        { op: Op.MUL }, // 20
      ];

      const suggestions = detector.detectOptimizations(ir);

      const cfolds = suggestions.filter(s => s.type === 'constant_folding');
      expect(cfolds.length).toBeGreaterThan(0);
    });

    it('should not propose folding with division by zero', () => {
      const ir = [
        { op: Op.PUSH, arg: 100 },
        { op: Op.PUSH, arg: 0 },
        { op: Op.DIV },
      ];

      const suggestions = detector.detectOptimizations(ir);

      const cfolds = suggestions.filter(s => s.type === 'constant_folding');
      expect(cfolds.length).toBe(0); // 안전하게 제안 안 함
    });

    it('should detect comparison folding PUSH 5, PUSH 10, LT', () => {
      const ir = [
        { op: Op.PUSH, arg: 5 },
        { op: Op.PUSH, arg: 10 },
        { op: Op.LT },
      ];

      const suggestions = detector.detectOptimizations(ir);

      const cfolds = suggestions.filter(s => s.type === 'constant_folding');
      expect(cfolds.length).toBeGreaterThan(0);
      expect(cfolds[0].after?.[0].arg).toBe(1); // 5 < 10 = true
    });
  });

  // ============================================================================
  // 2. Dead Code Elimination 감지 - 4개
  // ============================================================================
  describe('Dead Code Elimination Detection', () => {
    it('should detect unused variable: STORE x without LOAD x', () => {
      const ir = [
        { op: Op.PUSH, arg: 42 },
        { op: Op.STORE, arg: 'unused_var' },
        { op: Op.PUSH, arg: 10 },
        { op: Op.RET },
      ];

      const suggestions = detector.detectOptimizations(ir);

      const dce = suggestions.find(s => s.type === 'dce');
      expect(dce).toBeDefined();
      expect(dce?.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should not flag STORE with subsequent LOAD', () => {
      const ir = [
        { op: Op.PUSH, arg: 42 },
        { op: Op.STORE, arg: 'used_var' },
        { op: Op.LOAD, arg: 'used_var' },
        { op: Op.RET },
      ];

      const suggestions = detector.detectOptimizations(ir);

      const dce = suggestions.filter(s => s.type === 'dce');
      expect(dce.length).toBe(0); // 변수가 사용됨
    });

    it('should detect multiple unused variables', () => {
      const ir = [
        { op: Op.PUSH, arg: 1 },
        { op: Op.STORE, arg: 'x' },
        { op: Op.PUSH, arg: 2 },
        { op: Op.STORE, arg: 'y' },
        { op: Op.PUSH, arg: 3 },
        { op: Op.RET },
      ];

      const suggestions = detector.detectOptimizations(ir);

      const dce = suggestions.filter(s => s.type === 'dce');
      expect(dce.length).toBeGreaterThanOrEqual(2);
    });

    it('should prioritize DCE over other optimizations', () => {
      const ir = [
        { op: Op.PUSH, arg: 42 },
        { op: Op.STORE, arg: 'x' },
      ];

      const suggestions = detector.detectOptimizations(ir);

      if (suggestions.length > 0) {
        // 첫 번째 제안이 가장 높은 신뢰도를 가져야 함
        expect(suggestions[0].confidence).toBeGreaterThanOrEqual(0.85);
      }
    });
  });

  // ============================================================================
  // 3. Strength Reduction 감지 - 3개
  // ============================================================================
  describe('Strength Reduction Detection', () => {
    it('should detect multiply by power of 2: PUSH 4, MUL', () => {
      const ir = [
        { op: Op.PUSH, arg: 100 },
        { op: Op.PUSH, arg: 4 },
        { op: Op.MUL },
      ];

      const suggestions = detector.detectOptimizations(ir);

      const sr = suggestions.find(s => s.type === 'strength_reduction');
      expect(sr).toBeDefined();
      expect(sr?.expected_improvement).toBeGreaterThanOrEqual(15);
    });

    it('should detect divide by power of 2: PUSH 8, DIV', () => {
      const ir = [
        { op: Op.PUSH, arg: 256 },
        { op: Op.PUSH, arg: 8 },
        { op: Op.DIV },
      ];

      const suggestions = detector.detectOptimizations(ir);

      const sr = suggestions.find(s => s.type === 'strength_reduction');
      expect(sr).toBeDefined();
    });

    it('should not flag non-power-of-2 multiplications', () => {
      const ir = [
        { op: Op.PUSH, arg: 100 },
        { op: Op.PUSH, arg: 7 },
        { op: Op.MUL },
      ];

      const suggestions = detector.detectOptimizations(ir);

      const sr = suggestions.find(s => s.type === 'strength_reduction');
      expect(sr).toBeUndefined();
    });
  });

  // ============================================================================
  // 4. 종합 분석 - 3개
  // ============================================================================
  describe('Comprehensive Analysis', () => {
    it('should suggest multiple improvements for complex IR', () => {
      const ir = [
        { op: Op.PUSH, arg: 10 },
        { op: Op.PUSH, arg: 20 },
        { op: Op.ADD }, // constant folding
        { op: Op.PUSH, arg: 99 },
        { op: Op.STORE, arg: 'unused' }, // DCE
        { op: Op.PUSH, arg: 50 },
        { op: Op.PUSH, arg: 4 },
        { op: Op.MUL }, // strength reduction
        { op: Op.RET },
      ];

      const suggestions = detector.detectOptimizations(ir);

      expect(suggestions.length).toBeGreaterThanOrEqual(3);

      const types = new Set(suggestions.map(s => s.type));
      expect(types.size).toBeGreaterThan(1); // 다양한 종류의 최적화
    });

    it('should rank suggestions by confidence', () => {
      const ir = [
        { op: Op.PUSH, arg: 10 },
        { op: Op.PUSH, arg: 20 },
        { op: Op.ADD },
        { op: Op.PUSH, arg: 99 },
        { op: Op.STORE, arg: 'x' },
      ];

      const suggestions = detector.detectOptimizations(ir);

      if (suggestions.length > 1) {
        // 신뢰도가 내림차순이어야 함
        for (let i = 0; i < suggestions.length - 1; i++) {
          expect(suggestions[i].confidence).toBeGreaterThanOrEqual(suggestions[i + 1].confidence);
        }
      }
    });

    it('should provide readable summary', () => {
      const ir = [
        { op: Op.PUSH, arg: 5 },
        { op: Op.PUSH, arg: 10 },
        { op: Op.ADD },
      ];

      const suggestions = detector.detectOptimizations(ir);
      const summary = detector.summarize(suggestions);

      expect(summary).toContain('optimization');
      expect(summary.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // 5. 안전성 검증 - 3개
  // ============================================================================
  describe('Safety Validation', () => {
    it('should have high confidence for constant folding', () => {
      const ir = [
        { op: Op.PUSH, arg: 42 },
        { op: Op.PUSH, arg: 58 },
        { op: Op.ADD },
      ];

      const suggestions = detector.detectOptimizations(ir);

      const cfold = suggestions.find(s => s.type === 'constant_folding');
      expect(cfold?.confidence).toBe(0.95); // 매우 안전
    });

    it('should have high confidence for DCE', () => {
      const ir = [
        { op: Op.PUSH, arg: 42 },
        { op: Op.STORE, arg: 'x' },
        { op: Op.RET },
      ];

      const suggestions = detector.detectOptimizations(ir);

      const dce = suggestions.find(s => s.type === 'dce');
      expect(dce?.confidence).toBeGreaterThanOrEqual(0.85); // 안전
    });

    it('should have moderate confidence for strength reduction', () => {
      const ir = [
        { op: Op.PUSH, arg: 100 },
        { op: Op.PUSH, arg: 4 },
        { op: Op.MUL },
      ];

      const suggestions = detector.detectOptimizations(ir);

      const sr = suggestions.find(s => s.type === 'strength_reduction');
      expect(sr?.confidence).toBeLessThan(0.95);
      expect(sr?.confidence).toBeGreaterThan(0.70);
    });
  });

  // ============================================================================
  // 6. 성능 추정 - 2개
  // ============================================================================
  describe('Performance Estimation', () => {
    it('should estimate improvement percentage for constant folding', () => {
      const ir = [
        { op: Op.PUSH, arg: 1 },
        { op: Op.PUSH, arg: 2 },
        { op: Op.ADD },
      ];

      const suggestions = detector.detectOptimizations(ir);

      const cfold = suggestions.find(s => s.type === 'constant_folding');
      expect(cfold?.expected_improvement).toBeGreaterThan(0);
    });

    it('should estimate improvement for multiple optimizations', () => {
      const ir = [
        { op: Op.PUSH, arg: 10 },
        { op: Op.PUSH, arg: 20 },
        { op: Op.ADD },
        { op: Op.PUSH, arg: 99 },
        { op: Op.STORE, arg: 'unused' },
      ];

      const suggestions = detector.detectOptimizations(ir);

      const totalImprovement = suggestions.reduce((sum, s) => sum + s.expected_improvement, 0);
      expect(totalImprovement).toBeGreaterThan(0);
    });
  });
});
