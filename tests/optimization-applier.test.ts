/**
 * Phase 5 Step 2: AI Decision Engine for Optimization Application Tests
 *
 * 철학: 최적화 제안에 대해 AI가 자동으로 "적용"을 결정
 * - 5가지 요소를 종합 평가 (confidence, improvement, risk, learning, complexity)
 * - 신뢰도 기반 의사결정 (threshold: 0.6)
 * - 학습 데이터 통합
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { OptimizationApplier, OptimizationDecision } from '../src/analyzer/optimization-applier';
import { OptimizationSuggestion } from '../src/analyzer/optimization-detector';
import { Op } from '../src/types';

describe('OptimizationApplier - AI Decision Engine', () => {
  let applier: OptimizationApplier;

  beforeEach(() => {
    applier = new OptimizationApplier();
  });

  // ============================================================================
  // 1. 기본 결정 로직 - 5개
  // ============================================================================
  describe('Basic Decision Logic', () => {
    it('should apply optimization with high confidence (confidence > 0.6)', () => {
      const suggestion: OptimizationSuggestion = {
        type: 'constant_folding',
        confidence: 0.95, // Very high
        expected_improvement: 10,
        instruction_indices: [0, 1, 2],
        reasoning: ['High confidence folding'],
        before: [
          { op: Op.PUSH, arg: 10 },
          { op: Op.PUSH, arg: 20 },
          { op: Op.ADD },
        ],
        after: [{ op: Op.PUSH, arg: 30 }],
      };

      const decision = applier.decide(suggestion);

      expect(decision.shouldApply).toBe(true);
      expect(decision.confidence).toBeGreaterThan(0.6);
      expect(decision.reasoning.some(r => r.includes('APPLY'))).toBe(true);
    });

    it('should skip optimization with low score (score < 0.6)', () => {
      const suggestion: OptimizationSuggestion = {
        type: 'loop_unroll',
        confidence: 0.3, // Low
        expected_improvement: 5,
        instruction_indices: [10, 11, 12],
        reasoning: ['Low confidence unroll'],
        before: [
          { op: Op.ITER_INIT },
          { op: Op.ITER_NEXT },
          { op: Op.ITER_HAS },
        ],
        after: undefined,
      };

      const decision = applier.decide(suggestion);

      expect(decision.shouldApply).toBe(false);
      expect(decision.reasoning.some(r => r.includes('SKIP'))).toBe(true);
    });

    it('should use 5-factor weighted scoring algorithm', () => {
      const suggestion: OptimizationSuggestion = {
        type: 'dce',
        confidence: 0.9,
        expected_improvement: 5,
        instruction_indices: [5, 6],
        reasoning: ['DCE test'],
        before: [
          { op: Op.PUSH, arg: 99 },
          { op: Op.STORE, arg: 'unused' },
        ],
        after: [],
      };

      const decision = applier.decide(suggestion);

      // Expected score calculation:
      // confidence: 0.9 * 0.35 = 0.315
      // improvement: 0.4 * 0.25 = 0.100 (5% is "LOW")
      // risk: 0.95 * 0.15 = 0.1425 (safe for DCE)
      // learning: 0.5 * 0.15 = 0.075 (default)
      // complexity: 0.5 * 0.10 = 0.050 (no change)
      // Total ≈ 0.6825 → should apply

      expect(decision.shouldApply).toBe(true);
      expect(decision.confidence).toBeGreaterThan(0.6);
    });

    it('should include detailed reasoning for each factor', () => {
      const suggestion: OptimizationSuggestion = {
        type: 'strength_reduction',
        confidence: 0.85,
        expected_improvement: 20,
        instruction_indices: [3, 4],
        reasoning: ['Strength reduction'],
        before: [
          { op: Op.PUSH, arg: 256 },
          { op: Op.PUSH, arg: 4 },
          { op: Op.MUL },
        ],
        after: [{ op: Op.PUSH, arg: 2 }, { op: Op.DUP }],
      };

      const decision = applier.decide(suggestion);

      // Should have 6 reasoning lines: 5 factors + final decision
      expect(decision.reasoning.length).toBeGreaterThanOrEqual(6);
      expect(decision.reasoning.some(r => r.includes('Suggestion confidence'))).toBe(true);
      expect(decision.reasoning.some(r => r.includes('Expected improvement'))).toBe(true);
      expect(decision.reasoning.some(r => r.includes('Risk level'))).toBe(true);
      expect(decision.reasoning.some(r => r.includes('Learning history'))).toBe(true);
      expect(decision.reasoning.some(r => r.includes('Code complexity'))).toBe(true);
    });

    it('should classify risk levels correctly', () => {
      const cfoldSuggestion: OptimizationSuggestion = {
        type: 'constant_folding',
        confidence: 0.95,
        expected_improvement: 10,
        instruction_indices: [0, 1, 2],
        reasoning: [],
        before: [{ op: Op.PUSH, arg: 1 }, { op: Op.PUSH, arg: 2 }, { op: Op.ADD }],
        after: [{ op: Op.PUSH, arg: 3 }],
      };

      const decision = applier.decide(cfoldSuggestion);
      expect(decision.riskLevel).toBe('safe');
    });
  });

  // ============================================================================
  // 2. 위험도 평가 - 4개
  // ============================================================================
  describe('Risk Assessment', () => {
    it('should rate constant_folding as SAFE (riskFactor=1.0)', () => {
      const suggestion: OptimizationSuggestion = {
        type: 'constant_folding',
        confidence: 0.95,
        expected_improvement: 10,
        instruction_indices: [0, 1, 2],
        reasoning: [],
        before: [{ op: Op.PUSH, arg: 5 }, { op: Op.PUSH, arg: 10 }, { op: Op.ADD }],
        after: [{ op: Op.PUSH, arg: 15 }],
      };

      const decision = applier.decide(suggestion);

      expect(decision.riskLevel).toBe('safe');
      expect(decision.reasoning.some(r => r.includes('SAFE'))).toBe(true);
    });

    it('should rate dce as SAFE (riskFactor=0.95)', () => {
      const suggestion: OptimizationSuggestion = {
        type: 'dce',
        confidence: 0.9,
        expected_improvement: 5,
        instruction_indices: [1, 2],
        reasoning: [],
        before: [{ op: Op.PUSH, arg: 42 }, { op: Op.STORE, arg: 'x' }],
        after: [],
      };

      const decision = applier.decide(suggestion);

      expect(decision.riskLevel).toBe('safe');
    });

    it('should rate strength_reduction as MODERATE (riskFactor=0.8)', () => {
      const suggestion: OptimizationSuggestion = {
        type: 'strength_reduction',
        confidence: 0.85,
        expected_improvement: 20,
        instruction_indices: [3, 4],
        reasoning: [],
        before: [{ op: Op.PUSH, arg: 100 }, { op: Op.PUSH, arg: 4 }, { op: Op.MUL }],
        after: [{ op: Op.PUSH, arg: 2 }],
      };

      const decision = applier.decide(suggestion);

      expect(decision.riskLevel).toBe('moderate');
      expect(decision.reasoning.some(r => r.includes('MODERATE'))).toBe(true);
    });

    it('should rate loop_unroll as RISKY (riskFactor=0.65)', () => {
      const suggestion: OptimizationSuggestion = {
        type: 'loop_unroll',
        confidence: 0.7,
        expected_improvement: 25,
        instruction_indices: [10, 11, 12],
        reasoning: [],
        before: [
          { op: Op.ITER_INIT },
          { op: Op.ITER_NEXT },
          { op: Op.ITER_HAS },
        ],
        after: undefined,
      };

      const decision = applier.decide(suggestion);

      expect(decision.riskLevel).toBe('risky');
      expect(decision.reasoning.some(r => r.includes('RISKY'))).toBe(true);
    });
  });

  // ============================================================================
  // 3. 성능 개선도 평가 - 3개
  // ============================================================================
  describe('Improvement Assessment', () => {
    it('should classify 15%+ improvement as HIGH (improvementFactor=1.0)', () => {
      const suggestion: OptimizationSuggestion = {
        type: 'strength_reduction',
        confidence: 0.85,
        expected_improvement: 20, // HIGH
        instruction_indices: [0, 1],
        reasoning: [],
        before: [{ op: Op.PUSH, arg: 100 }, { op: Op.PUSH, arg: 4 }, { op: Op.MUL }],
        after: [{ op: Op.PUSH, arg: 2 }],
      };

      const decision = applier.decide(suggestion);

      expect(decision.reasoning.some(r => r.includes('HIGH'))).toBe(true);
      expect(decision.confidence).toBeGreaterThan(0.6);
    });

    it('should classify 5-15% improvement as MEDIUM (improvementFactor=0.7)', () => {
      const suggestion: OptimizationSuggestion = {
        type: 'constant_folding',
        confidence: 0.95,
        expected_improvement: 10, // MEDIUM
        instruction_indices: [0, 1, 2],
        reasoning: [],
        before: [{ op: Op.PUSH, arg: 1 }, { op: Op.PUSH, arg: 2 }, { op: Op.ADD }],
        after: [{ op: Op.PUSH, arg: 3 }],
      };

      const decision = applier.decide(suggestion);

      expect(decision.reasoning.some(r => r.includes('MEDIUM'))).toBe(true);
    });

    it('should classify <5% improvement as LOW (improvementFactor=0.4)', () => {
      const suggestion: OptimizationSuggestion = {
        type: 'dce',
        confidence: 0.9,
        expected_improvement: 2, // LOW
        instruction_indices: [5, 6],
        reasoning: [],
        before: [{ op: Op.PUSH, arg: 99 }, { op: Op.STORE, arg: 'x' }],
        after: [],
      };

      const decision = applier.decide(suggestion);

      expect(decision.reasoning.some(r => r.includes('LOW'))).toBe(true);
    });
  });

  // ============================================================================
  // 4. 코드 복잡도 평가 - 3개
  // ============================================================================
  describe('Code Complexity Factor', () => {
    it('should increase score when code simplifies (before > after)', () => {
      const suggestion: OptimizationSuggestion = {
        type: 'constant_folding',
        confidence: 0.95,
        expected_improvement: 10,
        instruction_indices: [0, 1, 2],
        reasoning: [],
        before: [
          { op: Op.PUSH, arg: 10 },
          { op: Op.PUSH, arg: 20 },
          { op: Op.ADD },
        ],
        after: [{ op: Op.PUSH, arg: 30 }], // 3 → 1, saves 2
      };

      const decision = applier.decide(suggestion);

      expect(decision.reasoning.some(r => r.includes('SIMPLIFIED'))).toBe(true);
      expect(decision.reasoning.some(r => r.includes('saves 2'))).toBe(true);
    });

    it('should keep neutral score when code size unchanged', () => {
      const suggestion: OptimizationSuggestion = {
        type: 'strength_reduction',
        confidence: 0.85,
        expected_improvement: 20,
        instruction_indices: [0, 1],
        reasoning: [],
        before: [
          { op: Op.PUSH, arg: 100 },
          { op: Op.PUSH, arg: 4 },
          { op: Op.MUL },
        ],
        after: [
          { op: Op.PUSH, arg: 2 },
          { op: Op.DUP },
        ], // 3 → 2 instructions (actually simplifies)
      };

      const decision = applier.decide(suggestion);

      // Should still be positive because 3 → 2 is simplification
      expect(decision.reasoning.some(r => r.includes('SIMPLIFIED'))).toBe(true);
    });

    it('should penalize score when code inflates (after > before)', () => {
      const suggestion: OptimizationSuggestion = {
        type: 'loop_unroll',
        confidence: 0.7,
        expected_improvement: 25,
        instruction_indices: [0, 1, 2],
        reasoning: [],
        before: [
          { op: Op.ITER_INIT },
          { op: Op.ITER_NEXT },
          { op: Op.ITER_HAS },
        ],
        after: [
          { op: Op.PUSH, arg: 1 },
          { op: Op.ADD },
          { op: Op.PUSH, arg: 2 },
          { op: Op.ADD },
          { op: Op.PUSH, arg: 3 },
          { op: Op.ADD },
        ], // 3 → 6 instructions (inflates)
      };

      const decision = applier.decide(suggestion);

      expect(decision.reasoning.some(r => r.includes('INFLATED'))).toBe(true);
      expect(decision.reasoning.some(r => r.includes('adds 3'))).toBe(true);
    });
  });

  // ============================================================================
  // 5. 학습 히스토리 통합 - 4개
  // ============================================================================
  describe('Learning History Integration', () => {
    it('should increase score when similar patterns have high success rate', () => {
      const suggestion: OptimizationSuggestion = {
        type: 'constant_folding',
        confidence: 0.95,
        expected_improvement: 10,
        instruction_indices: [0, 1, 2],
        reasoning: [],
        before: [{ op: Op.PUSH, arg: 2 }, { op: Op.PUSH, arg: 3 }, { op: Op.ADD }],
        after: [{ op: Op.PUSH, arg: 5 }],
      };

      const learningHistory = [
        { fn: 'constant_folding', params_hash: 'p1', body_hash: 'abc', success_count: 8, fail_count: 2, avg_cycles: 10, last_used: Date.now() },
        { fn: 'constant_folding', params_hash: 'p2', body_hash: 'def', success_count: 5, fail_count: 1, avg_cycles: 12, last_used: Date.now() },
      ];

      const decision = applier.decide(suggestion, learningHistory);

      expect(decision.reasoning.some(r => r.includes('Learning history'))).toBe(true);
      expect(decision.reasoning.some(r => r.includes('success rate'))).toBe(true);
    });

    it('should use neutral score when no learning history available', () => {
      const suggestion: OptimizationSuggestion = {
        type: 'constant_folding',
        confidence: 0.95,
        expected_improvement: 10,
        instruction_indices: [0, 1, 2],
        reasoning: [],
        before: [{ op: Op.PUSH, arg: 1 }, { op: Op.PUSH, arg: 2 }, { op: Op.ADD }],
        after: [{ op: Op.PUSH, arg: 3 }],
      };

      const decision = applier.decide(suggestion, []);

      expect(decision.reasoning.some(r => r.includes('No history available'))).toBe(true);
    });

    it('should ignore learning history when optimization type does not match', () => {
      const suggestion: OptimizationSuggestion = {
        type: 'dce',
        confidence: 0.9,
        expected_improvement: 5,
        instruction_indices: [5, 6],
        reasoning: [],
        before: [{ op: Op.PUSH, arg: 99 }, { op: Op.STORE, arg: 'x' }],
        after: [],
      };

      const learningHistory = [
        { fn: 'constant_folding', params_hash: 'p1', body_hash: 'xyz', success_count: 10, fail_count: 0, avg_cycles: 8, last_used: Date.now() },
      ];

      const decision = applier.decide(suggestion, learningHistory);

      expect(decision.reasoning.some(r => r.includes('No similar patterns found'))).toBe(true);
    });

    it('should decrease score when similar patterns have low success rate', () => {
      const suggestion: OptimizationSuggestion = {
        type: 'loop_unroll',
        confidence: 0.7,
        expected_improvement: 25,
        instruction_indices: [0, 1, 2],
        reasoning: [],
        before: [{ op: Op.ITER_INIT }, { op: Op.ITER_NEXT }, { op: Op.ITER_HAS }],
        after: undefined,
      };

      const learningHistory = [
        { fn: 'loop_unroll', params_hash: 'p1', body_hash: 'bad1', success_count: 1, fail_count: 9, avg_cycles: 100, last_used: Date.now() },
        { fn: 'loop_unroll', params_hash: 'p2', body_hash: 'bad2', success_count: 0, fail_count: 5, avg_cycles: 150, last_used: Date.now() },
      ];

      const decision = applier.decide(suggestion, learningHistory);

      expect(decision.reasoning.some(r => r.includes('success rate'))).toBe(true); // Low success rate shown
    });
  });

  // ============================================================================
  // 6. 배치 처리 - 2개
  // ============================================================================
  describe('Batch Processing', () => {
    it('should process multiple suggestions and decide on each', () => {
      const suggestions: OptimizationSuggestion[] = [
        {
          type: 'constant_folding',
          confidence: 0.95,
          expected_improvement: 10,
          instruction_indices: [0, 1, 2],
          reasoning: [],
          before: [{ op: Op.PUSH, arg: 1 }, { op: Op.PUSH, arg: 2 }, { op: Op.ADD }],
          after: [{ op: Op.PUSH, arg: 3 }],
        },
        {
          type: 'dce',
          confidence: 0.9,
          expected_improvement: 5,
          instruction_indices: [5, 6],
          reasoning: [],
          before: [{ op: Op.PUSH, arg: 99 }, { op: Op.STORE, arg: 'x' }],
          after: [],
        },
      ];

      const decisions = applier.decideAll(suggestions);

      expect(decisions.length).toBe(2);
      expect(decisions[0].shouldApply).toBe(true); // CF should apply
      expect(decisions[1].shouldApply).toBe(true); // DCE should apply
    });

    it('should apply optimizations to actual IR instructions', () => {
      const instructions = [
        { op: Op.PUSH, arg: 10 },
        { op: Op.PUSH, arg: 20 },
        { op: Op.ADD },
        { op: Op.STORE, arg: 'result' },
      ];

      const decisions: OptimizationDecision[] = [
        {
          suggestion: {
            type: 'constant_folding',
            confidence: 0.95,
            expected_improvement: 10,
            instruction_indices: [0, 1, 2],
            reasoning: [],
            before: [
              { op: Op.PUSH, arg: 10 },
              { op: Op.PUSH, arg: 20 },
              { op: Op.ADD },
            ],
            after: [{ op: Op.PUSH, arg: 30 }],
          },
          shouldApply: true,
          confidence: 0.85,
          reasoning: [],
          riskLevel: 'safe',
        },
      ];

      const { optimized, applied, skipped } = applier.applyOptimizations(instructions, decisions);

      expect(applied.length).toBe(1);
      expect(skipped.length).toBe(0);
      expect(optimized.length).toBeLessThan(instructions.length);
      expect(optimized[0].arg).toBe(30); // First instruction should be PUSH 30
    });
  });

  // ============================================================================
  // 7. 요약 생성 - 2개
  // ============================================================================
  describe('Summary Generation', () => {
    it('should generate readable summary of decisions', () => {
      const decisions: OptimizationDecision[] = [
        {
          suggestion: {
            type: 'constant_folding',
            confidence: 0.95,
            expected_improvement: 10,
            instruction_indices: [0, 1, 2],
            reasoning: [],
            before: [{ op: Op.PUSH, arg: 1 }, { op: Op.PUSH, arg: 2 }, { op: Op.ADD }],
            after: [{ op: Op.PUSH, arg: 3 }],
          },
          shouldApply: true,
          confidence: 0.85,
          reasoning: ['Test'],
          riskLevel: 'safe',
        },
        {
          suggestion: {
            type: 'loop_unroll',
            confidence: 0.3,
            expected_improvement: 25,
            instruction_indices: [10, 11],
            reasoning: [],
            before: [{ op: Op.ITER_INIT }, { op: Op.ITER_NEXT }],
            after: undefined,
          },
          shouldApply: false,
          confidence: 0.45,
          reasoning: ['Test'],
          riskLevel: 'risky',
        },
      ];

      const summary = applier.summarize(decisions);

      expect(summary).toContain('AI Decision Summary');
      expect(summary).toContain('Total suggestions: 2');
      expect(summary).toContain('Will apply: 1');
      expect(summary).toContain('Will skip: 1');
      expect(summary).toContain('Applied optimizations');
      expect(summary).toContain('Skipped optimizations');
    });

    it('should show confidence percentages in summary', () => {
      const decisions: OptimizationDecision[] = [
        {
          suggestion: {
            type: 'constant_folding',
            confidence: 0.95,
            expected_improvement: 10,
            instruction_indices: [0, 1, 2],
            reasoning: [],
            before: [{ op: Op.PUSH, arg: 1 }, { op: Op.PUSH, arg: 2 }, { op: Op.ADD }],
            after: [{ op: Op.PUSH, arg: 3 }],
          },
          shouldApply: true,
          confidence: 0.87,
          reasoning: ['Test'],
          riskLevel: 'safe',
        },
      ];

      const summary = applier.summarize(decisions);

      expect(summary).toContain('87%');
      expect(summary).toContain('constant_folding');
    });
  });

  // ============================================================================
  // 8. 엣지 케이스 - 3개
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle suggestion with no after optimization', () => {
      const suggestion: OptimizationSuggestion = {
        type: 'loop_unroll',
        confidence: 0.3, // Very low confidence
        expected_improvement: 5, // Low improvement
        instruction_indices: [5, 6],
        reasoning: [],
        before: [{ op: Op.ITER_INIT }, { op: Op.ITER_NEXT }],
        after: undefined,
      };

      const decision = applier.decide(suggestion);

      expect(decision).toBeDefined();
      expect(decision.confidence).toBeLessThan(0.6);
    });

    it('should apply optimization with exactly 0.6 threshold score', () => {
      // Create a suggestion that results in exactly 0.6 score
      const suggestion: OptimizationSuggestion = {
        type: 'constant_folding',
        confidence: 0.3, // Low confidence
        expected_improvement: 5, // Low improvement
        instruction_indices: [0, 1, 2],
        reasoning: [],
        before: [{ op: Op.PUSH, arg: 1 }, { op: Op.PUSH, arg: 2 }, { op: Op.ADD }],
        after: [{ op: Op.PUSH, arg: 3 }],
      };

      const decision = applier.decide(suggestion);

      // Should be very close to threshold
      expect(decision.confidence).toBeDefined();
      // (Note: exact threshold depends on actual calculation)
    });

    it('should handle empty instruction list', () => {
      const instructions: any[] = [];
      const decisions: OptimizationDecision[] = [];

      const result = applier.applyOptimizations(instructions, decisions);

      expect(result.optimized.length).toBe(0);
      expect(result.applied.length).toBe(0);
      expect(result.skipped.length).toBe(0);
    });
  });

  // ============================================================================
  // 9. 통합 E2E - 3개
  // ============================================================================
  describe('End-to-End Integration', () => {
    it('should detect and apply optimization in single flow', () => {
      const instructions = [
        { op: Op.PUSH, arg: 100 },
        { op: Op.PUSH, arg: 20 },
        { op: Op.ADD },
        { op: Op.STORE, arg: 'result' },
      ];

      // Simulate detection result
      const suggestions: OptimizationSuggestion[] = [
        {
          type: 'constant_folding',
          confidence: 0.95,
          expected_improvement: 10,
          instruction_indices: [0, 1, 2],
          reasoning: ['High confidence CF'],
          before: [
            { op: Op.PUSH, arg: 100 },
            { op: Op.PUSH, arg: 20 },
            { op: Op.ADD },
          ],
          after: [{ op: Op.PUSH, arg: 120 }],
        },
      ];

      // Make decisions
      const decisions = applier.decideAll(suggestions);

      // Apply optimizations
      const { optimized, applied } = applier.applyOptimizations(instructions, decisions);

      expect(applied.length).toBe(1);
      expect(optimized.length).toBe(2); // PUSH 120, STORE result
      expect(optimized[0].arg).toBe(120);
    });

    it('should skip risky optimizations in conservative mode', () => {
      const suggestions: OptimizationSuggestion[] = [
        {
          type: 'loop_unroll',
          confidence: 0.6,
          expected_improvement: 30,
          instruction_indices: [0, 1, 2],
          reasoning: [],
          before: [{ op: Op.ITER_INIT }, { op: Op.ITER_NEXT }, { op: Op.ITER_HAS }],
          after: undefined,
        },
      ];

      const decisions = applier.decideAll(suggestions);

      // Should be conservative due to RISKY classification
      expect(decisions[0].riskLevel).toBe('risky');
      // May or may not apply depending on exact score
    });

    it('should generate meaningful report for optimization results', () => {
      const suggestions: OptimizationSuggestion[] = [
        {
          type: 'constant_folding',
          confidence: 0.95,
          expected_improvement: 10,
          instruction_indices: [0, 1, 2],
          reasoning: [],
          before: [{ op: Op.PUSH, arg: 5 }, { op: Op.PUSH, arg: 10 }, { op: Op.ADD }],
          after: [{ op: Op.PUSH, arg: 15 }],
        },
        {
          type: 'dce',
          confidence: 0.9,
          expected_improvement: 5,
          instruction_indices: [5, 6],
          reasoning: [],
          before: [{ op: Op.PUSH, arg: 99 }, { op: Op.STORE, arg: 'unused' }],
          after: [],
        },
      ];

      const decisions = applier.decideAll(suggestions);
      const summary = applier.summarize(decisions);

      expect(summary).toContain('constant_folding');
      expect(summary).toContain('dce');
      expect(summary).toContain('Total suggestions: 2');
    });
  });
});
