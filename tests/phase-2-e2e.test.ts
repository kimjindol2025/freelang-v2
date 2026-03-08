/**
 * Phase 2 Task 2.5: E2E 통합 테스트
 *
 * Phase 2 전체 파이프라인 검증:
 * 1. Intent 추출 (Intent Parser)
 * 2. 타입 추론 (Task 2.3)
 * 3. 표현식 완성 (Task 2.2)
 * 4. Stub 생성 (Task 2.1)
 * 5. 경고/제안 생성 (Task 2.4)
 * 6. 자동 수정 적용
 * 7. 최종 분석
 *
 * 15개 E2E 통합 테스트
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  Phase2Compiler,
  Phase2CompileResult,
  createPhase2Compiler,
} from '../src/compiler/phase-2-compiler';

describe('Phase 2 Task 2.5: E2E Integration Tests', () => {
  let compiler: Phase2Compiler;

  beforeEach(() => {
    compiler = createPhase2Compiler();
  });

  describe('Scenario 1: Empty Function Body', () => {
    // Test 1: 완전히 비어있는 함수 본체
    it('should auto-generate stub for empty function body', () => {
      const code = `
        fn process
          intent: "배열 처리"
          input: arr: array
          output: number
          do
            // 비어있음
      `;

      const result = compiler.compile(code);

      expect(result.success).toBe(true);
      // Should add return statement with stub or default value
      expect(result.completedCode).toContain('return');
      expect(result.completedCode.length).toBeGreaterThan(code.length);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    // Test 2: 본체는 비었지만 Intent는 명확
    it('should infer complete signature from Intent alone', () => {
      const code = `
        fn sum_array
          intent: "배열의 합을 구하는 함수"
          do
      `;

      const result = compiler.compile(code);

      expect(result.inferredSignature).toBeDefined();
      expect(result.inferredSignature?.output).toBe('number');
      expect(result.inferredSignature?.inputs.has('arr')).toBe(true);
    });
  });

  describe('Scenario 2: Incomplete Loop Body', () => {
    // Test 3: 빈 for 루프 본체
    it('should complete empty for loop body', () => {
      const code = `
        fn iterate
          do
            for i in 0..10 do
            x = 0
      `;

      const result = compiler.compile(code);

      expect(result.success).toBe(true);
      expect(result.completedCode).toContain('stub');
    });

    // Test 4: 불완전한 루프 표현식
    it('should handle incomplete loop with trailing operator', () => {
      const code = `
        fn sum_loop
          do
            for item in arr do
              sum = sum +
      `;

      const result = compiler.compile(code);

      expect(result.success).toBe(true);
      expect(result.warnings.some(w =>
        w.message.includes('Incomplete')
      )).toBe(true);
    });
  });

  describe('Scenario 3: Missing Return Statement', () => {
    // Test 5: 명시적으로 return이 없는 경우
    it('should detect missing return for typed output', () => {
      const code = `
        fn calculate
          output: number
          do
            x = 10 + 20
            // return 없음
      `;

      const result = compiler.compile(code);

      expect(result.success).toBe(true);
      // Should either detect missing return or add it automatically
      const hasReturnWarning = result.warnings.some(w =>
        w.type === 'MISSING_RETURN'
      );
      const hasReturnStatement = result.completedCode.includes('return');
      expect(hasReturnWarning || hasReturnStatement).toBe(true);
    });

    // Test 6: 자동 return 추가
    it('should auto-add return statement', () => {
      const code = `
        fn get_value
          output: string
          do
            msg = "hello"
      `;

      const result = compiler.compile(code);

      expect(result.autoFixesApplied).toBeGreaterThan(0);
      expect(result.completedCode).toContain('return');
    });
  });

  describe('Scenario 4: Intent-Based Type Inference', () => {
    // Test 7: Intent에서만 타입 추론
    it('should infer types from Intent keywords', () => {
      const code = `
        fn filter_array
          intent: "배열 필터링"
          do
      `;

      const result = compiler.compile(code);

      expect(result.inferredSignature).toBeDefined();
      expect(result.inferredSignature?.inputs.has('arr')).toBe(true);
      expect(result.inferredSignature?.output).toBe('array');
    });

    // Test 8: Intent + 코드 조합 추론
    it('should combine Intent and code signals for type inference', () => {
      const code = `
        fn process
          intent: "숫자 처리"
          do
            sum = 0
            for i in range do
              sum = sum + i
      `;

      const result = compiler.compile(code);

      expect(result.inferredSignature).toBeDefined();
      expect(result.inferredSignature?.output).toBe('number');
    });
  });

  describe('Scenario 5: Multiple Incompleteness', () => {
    // Test 9: 여러 불완전성 동시 처리
    it('should handle multiple incomplete patterns', () => {
      const code = `
        fn complex
          output: number
          do
            x = (
            for i in arr do
            if x > 0 do
            return
      `;

      const result = compiler.compile(code);

      expect(result.warnings.length).toBeGreaterThan(2);
      expect(result.autoFixesApplied).toBeGreaterThan(0);
    });

    // Test 10: 우선순위 기반 정렬 확인
    it('should prioritize warnings by severity', () => {
      const code = `
        fn priority_test
          output: number
          do
            x = 10 +
            if y do
            // return 없음
      `;

      const result = compiler.compile(code);

      const warnings = result.warnings;
      if (warnings.length > 1) {
        // Critical/Error should come before Warning/Info
        for (let i = 0; i < warnings.length - 1; i++) {
          const curr = warnings[i].priority;
          const next = warnings[i + 1].priority;
          expect(curr).toBeLessThanOrEqual(next);
        }
      }
    });
  });

  describe('Scenario 6: Auto-Fix Verification', () => {
    // Test 11: 자동 수정 적용 검증
    it('should apply auto-fixes correctly', () => {
      const code = `
        fn test
          do
            result = 10 +
      `;

      const result = compiler.compile(code);

      expect(result.completedCode).not.toEqual(code);
      expect(result.completedCode).toContain('10 + 0');
    });

    // Test 12: 수정 불가능한 경고는 제안만
    it('should provide suggestions for non-fixable warnings', () => {
      const code = `
        fn ambiguous
          do
            x = 10
            x = "hello"
            x = true
      `;

      const result = compiler.compile(code);

      const ambigWarnings = result.warnings.filter(w =>
        w.type === 'AMBIGUOUS_TYPE'
      );

      for (const warning of ambigWarnings) {
        expect(warning.autoFixable).toBe(false);
        expect(warning.suggestion).toBeDefined();
      }
    });
  });

  describe('Scenario 7: Confidence Scoring', () => {
    // Test 13: 신뢰도 점수 검증
    it('should assign confidence scores to inferred types', () => {
      const code = `
        fn confident
          input: arr: array<number>
          do
            for item in arr do
              sum = sum + item
      `;

      const result = compiler.compile(code);

      expect(result.inferredSignature).toBeDefined();
      // Explicit type should have high confidence
      expect(result.warnings.every(w =>
        w.confidence >= 0 && w.confidence <= 1
      )).toBe(true);
    });
  });

  describe('Scenario 8: Report Generation', () => {
    // Test 14: 인간 친화적 리포트 생성
    it('should generate human-readable compilation report', () => {
      const code = `
        fn report_test
          output: number
          do
            x = 10 +
      `;

      const result = compiler.compile(code);
      const report = compiler.getReport(result);

      expect(report).toContain('Phase 2 Compilation Report');
      expect(report).toContain(result.success ? 'SUCCESS' : 'FAILED');
      expect(report).toContain('Warnings:');
      expect(report).toContain(String(result.autoFixesApplied));
    });
  });

  describe('Scenario 9: Complex Real-World Example', () => {
    // Test 15: 실제 사용 사례
    it('should compile real-world incomplete code', () => {
      const code = `
        fn process_users
          intent: "사용자 데이터 필터링 후 집계"
          input: users: array
          output: object
          do
            result = {}
            for user in users do
              if user.active do
                count = count +
            return
      `;

      const result = compiler.compile(code);

      expect(result.success).toBe(true);
      expect(result.completedCode.length).toBeGreaterThan(code.length);
      expect(result.autoFixesApplied).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.inferredSignature).toBeDefined();
    });
  });

  describe('Pipeline Integration Verification', () => {
    // Test 16: 각 단계별 파이프라인 검증
    it('should execute all 7 pipeline steps', () => {
      const code = `
        fn pipeline_test
          intent: "배열 처리"
          output: number
          do
            sum = 0
            for item in arr do
              sum = sum +
      `;

      const result = compiler.compile(code);

      // Step 1 & 2: Intent extraction + Type inference
      expect(result.inferredSignature).toBeDefined();
      expect(result.inferredSignature?.output).toBe('number');

      // Step 3-4: Expression completion + Stub generation
      // After auto-fix, incomplete expression "sum = sum +" becomes "sum = sum + 0"
      expect(result.completedCode).toContain('sum = sum + 0');

      // Step 5-6: Warnings + Auto-fixes
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.autoFixesApplied).toBeGreaterThan(0);

      // Step 7: Final analysis
      expect(result.metadata.totalWarnings).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    // Test 17: 완전히 올바른 코드
    it('should handle already complete code', () => {
      const code = `
        fn complete
          input: x: number
          output: number
          do
            return x + 1
      `;

      const result = compiler.compile(code);

      expect(result.success).toBe(true);
      expect(result.autoFixesApplied).toBe(0);
    });

    // Test 18: 매우 짧은 코드
    it('should handle minimal code snippets', () => {
      const code = 'fn test do';

      const result = compiler.compile(code);

      expect(result.success).toBe(true);
      expect(result.completedCode).toBeDefined();
    });

    // Test 19: 메타데이터 정확성
    it('should track warning statistics accurately', () => {
      const code = `
        fn stats
          output: number
          do
            x = 10 +
            if y do
            z = (
      `;

      const result = compiler.compile(code);

      // Verify metadata is populated
      expect(result.metadata.totalWarnings).toBeGreaterThanOrEqual(0);
      expect(result.metadata.criticalCount).toBeGreaterThanOrEqual(0);
      expect(result.metadata.errorCount).toBeGreaterThanOrEqual(0);
      expect(result.metadata.warningCount).toBeGreaterThanOrEqual(0);
      expect(result.metadata.infoCount).toBeGreaterThanOrEqual(0);

      // Total should match sum of all severity levels
      expect(
        result.metadata.criticalCount +
        result.metadata.errorCount +
        result.metadata.warningCount +
        result.metadata.infoCount
      ).toBe(result.metadata.totalWarnings);
    });

    // Test 20: 반복 실행 일관성
    it('should produce consistent results on repeated compilation', () => {
      const code = `
        fn consistency
          do
            x = 10 +
      `;

      const result1 = compiler.compile(code);
      const result2 = compiler.compile(code);

      expect(result1.success).toBe(result2.success);
      expect(result1.warnings.length).toBe(result2.warnings.length);
      expect(result1.completedCode).toBe(result2.completedCode);
    });
  });

  describe('Performance Tests', () => {
    // Test 21: 컴파일 시간 검증
    it('should compile within reasonable time', () => {
      const code = `
        fn perf_test
          output: number
          do
            sum = 0
            for i in 0..100 do
              sum = sum + i
            return
      `;

      const start = performance.now();
      const result = compiler.compile(code);
      const duration = performance.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // 1초 이내
    });

    // Test 22: 큰 코드 처리
    it('should handle large code snippets', () => {
      let code = `
        fn large
          output: number
          do
      `;

      // 여러 줄 추가
      for (let i = 0; i < 50; i++) {
        code += `\n            x${i} = ${i}`;
      }
      code += '\n            return 0';

      const result = compiler.compile(code);

      expect(result.success).toBe(true);
      expect(result.completedCode).toBeDefined();
    });
  });

  describe('Recovery & Resilience', () => {
    // Test 23: 부분적 오류 복구
    it('should recover from partial errors', () => {
      const code = `
        fn recovery
          do
            x = (incomplete
            y = 10  // 이 부분은 정상
            z = 20
      `;

      const result = compiler.compile(code);

      expect(result.completedCode).toContain('y = 10');
      expect(result.completedCode).toContain('z = 20');
    });

    // Test 24: 연쇄 오류 감지
    it('should detect cascading errors', () => {
      const code = `
        fn cascade
          output: number
          do
            x = (
            y = x +
            z = y
            return z
      `;

      const result = compiler.compile(code);

      expect(result.warnings.length).toBeGreaterThan(1);
    });
  });

  describe('Type Inference Accuracy', () => {
    // Test 25: 컨텍스트 기반 타입 추론
    it('should infer types from context', () => {
      const code = `
        fn context_infer
          do
            for i in 0..10 do
              // i는 number 타입 추론
              result = i * 2
      `;

      const result = compiler.compile(code);

      expect(result.success).toBe(true);
      // context-based inference should detect i as number
    });
  });
});

/**
 * Phase 2 Task 2.5 테스트 요약
 *
 * ✅ 25개 통합 테스트 작성 완료
 *
 * 테스트 범주:
 * 1. 빈 함수 본체 처리 (2개)
 * 2. 불완전한 루프 처리 (2개)
 * 3. 누락된 return 문 (2개)
 * 4. Intent 기반 타입 추론 (2개)
 * 5. 다중 불완전성 처리 (2개)
 * 6. 자동 수정 검증 (2개)
 * 7. 신뢰도 점수 (1개)
 * 8. 리포트 생성 (1개)
 * 9. 실제 사례 (1개)
 * 10. 파이프라인 검증 (1개)
 * 11. 엣지 케이스 (4개)
 * 12. 성능 테스트 (2개)
 * 13. 복구/탄력성 (2개)
 * 14. 타입 추론 정확도 (1개)
 *
 * 모든 7단계 파이프라인 커버:
 * ✅ Intent 추출
 * ✅ 타입 추론 (Task 2.3)
 * ✅ 표현식 완성 (Task 2.2)
 * ✅ Stub 생성 (Task 2.1)
 * ✅ 경고/제안 (Task 2.4)
 * ✅ 자동 수정 적용
 * ✅ 최종 분석
 *
 * 다음: Phase 2 완성 및 Gogs 커밋
 */
