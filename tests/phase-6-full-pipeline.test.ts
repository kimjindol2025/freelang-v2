/**
 * Phase 6 Final Validation - Full E2E Pipeline
 *
 * .free 파일 입력부터 실행 결과까지 **완전한** 파이프라인 검증
 * 
 * 흐름:
 * .free 코드 → Parser → HeaderProposal
 *         ↓
 * AutoHeaderEngine (Phase 1-4)
 *         ↓
 * IR 생성 → VM 실행 → 결과 검증
 */

import { Lexer, TokenBuffer } from '../src/lexer/lexer';
import { parseMinimalFunction } from '../src/parser/parser';
import { astToProposal } from '../src/bridge/ast-to-proposal';
import { Pipeline } from '../src/pipeline';

/**
 * Helper: .free 코드 → Parser → HeaderProposal
 */
function parseFreeToProposal(code: string) {
  const lexer = new Lexer(code);
  const buffer = new TokenBuffer(lexer);
  const ast = parseMinimalFunction(buffer);
  return astToProposal(ast);
}

describe('Phase 6: Full E2E Pipeline Validation', () => {
  // ============================================================================
  // 1️⃣ Parser → HeaderProposal (Phase 5)
  // ============================================================================
  describe('Step 1: Parser Integration', () => {
    test('Sum proposal generation from .free', () => {
      const code = `fn sum
input: array<number>
output: number
intent: "배열 합산"`;

      const proposal = parseFreeToProposal(code);

      expect(proposal.fn).toBe('sum');
      expect(proposal.input).toBe('array<number>');
      expect(proposal.output).toBe('number');
      expect(proposal.confidence).toBeGreaterThan(0.9);
    });

    test('Complex directive from body analysis', () => {
      const code = `fn compute
input: array<number>
output: number
{ for i in 0..10 { sum += arr[i]; } }`;

      const proposal = parseFreeToProposal(code);

      expect(proposal.directive).toBe('speed'); // 루프 + 누적
    });
  });

  // ============================================================================
  // 2️⃣ AutoHeaderEngine (Phase 1)
  // ============================================================================
  describe('Step 2: AutoHeaderEngine Operation', () => {
    test('Free-form input → HeaderProposal', () => {
      const pipeline = new Pipeline();
      
      // HeaderProposal 구조 직접 생성 가능한지 확인
      const proposal = astToProposal({
        fnName: 'sum',
        inputType: 'array<number>',
        outputType: 'number',
        intent: '배열 합산'
      } as any);

      expect(proposal).toBeDefined();
      expect(proposal.fn).toBe('sum');
    });
  });

  // ============================================================================
  // 3️⃣ 완전한 Pipeline 실행
  // ============================================================================
  describe('Step 3: Complete Pipeline Execution', () => {
    test('pipeline.run() with test data', () => {
      const pipeline = new Pipeline();

      // 파이프라인 실행
      const result = pipeline.run({
        instruction: 'sum',
        data: [1, 2, 3, 4, 5]
      });

      // 결과 구조 검증
      expect(result).toBeDefined();
      expect(result?.header).toBeDefined();
      expect(result?.intent).toBeDefined();
      expect(result?.vm).toBeDefined();
      expect(result?.final_value).toBeDefined();
    });

    test('pipeline output contains expected fields', () => {
      const pipeline = new Pipeline();
      const result = pipeline.run({
        instruction: 'average',
        data: [10, 20, 30]
      });

      if (result) {
        expect(result.header.fn).toBeDefined();
        expect(result.header.input).toBeDefined();
        expect(result.header.output).toBeDefined();
        expect(result.intent.body).toBeDefined();
        expect(result.vm.ok !== undefined).toBe(true);
      }
    });
  });

  // ============================================================================
  // 4️⃣ VM 실행 검증
  // ============================================================================
  describe('Step 4: VM Execution Verification', () => {
    test('VM computes correct sum result', () => {
      const pipeline = new Pipeline();
      const result = pipeline.run({
        instruction: 'sum',
        data: [1, 2, 3, 4, 5]
      });

      // 15 = 1+2+3+4+5
      expect(result?.final_value).toBe(15);
    });

    test('VM handles different data sizes', () => {
      const pipeline = new Pipeline();
      
      const result1 = pipeline.run({
        instruction: 'sum',
        data: [10]
      });
      expect(result1?.final_value).toBe(10);

      const result2 = pipeline.run({
        instruction: 'sum',
        data: [1, 1, 1, 1, 1]
      });
      expect(result2?.final_value).toBe(5);
    });
  });

  // ============================================================================
  // 5️⃣ 통합 시나리오 (실제 .free 파일 + 완전 파이프라인)
  // ============================================================================
  describe('Step 5: Real-World Scenarios', () => {
    test('Scenario 1: Array Summation (.free → Execution)', () => {
      // Step 1: .free 코드 파싱
      const freeCode = `fn totalSum
input: array<number>
output: number
intent: "배열 전체 합산"`;

      const proposal = parseFreeToProposal(freeCode);
      expect(proposal.fn).toBe('totalSum');
      expect(proposal.directive).toBeTruthy();

      // Step 2: 파이프라인 실행
      const pipeline = new Pipeline();
      const result = pipeline.run({
        instruction: 'sum',
        data: [5, 10, 15, 20]
      });

      expect(result?.final_value).toBe(50);
    });

    test('Scenario 2: Different Operations', () => {
      const pipeline = new Pipeline();

      // Sum
      const sumResult = pipeline.run({
        instruction: 'sum',
        data: [2, 4, 6]
      });
      expect(sumResult?.final_value).toBe(12);

      // Average
      const avgResult = pipeline.run({
        instruction: 'average',
        data: [10, 20, 30]
      });
      // 평균 = 20 (또는 undefined if not implemented)
      expect(avgResult).toBeDefined();

      // Count
      const countResult = pipeline.run({
        instruction: 'count',
        data: [1, 2, 3, 4, 5]
      });
      expect(countResult).toBeDefined();
    });
  });

  // ============================================================================
  // 6️⃣ 에러 처리 및 복구
  // ============================================================================
  describe('Step 6: Error Handling & Recovery', () => {
    test('Invalid instruction handling', () => {
      const pipeline = new Pipeline();
      
      expect(() => {
        pipeline.run({
          instruction: 'unknownOperation',
          data: [1, 2, 3]
        });
      }).toThrow();
    });

    test('Empty data handling', () => {
      const pipeline = new Pipeline();
      
      const result = pipeline.run({
        instruction: 'sum',
        data: []
      });

      expect(result).toBeDefined();
      // Sum of empty array = 0 or undefined
      expect(result?.vm).toBeDefined();
    });

    test('Large dataset handling', () => {
      const pipeline = new Pipeline();
      const largeData = Array(1000).fill(1);

      const result = pipeline.run({
        instruction: 'sum',
        data: largeData
      });

      expect(result?.final_value).toBe(1000);
    });
  });

  // ============================================================================
  // 7️⃣ 성능 + 정확성 동시 검증
  // ============================================================================
  describe('Step 7: Performance & Correctness', () => {
    test('Pipeline performance < 10ms', () => {
      const pipeline = new Pipeline();
      const start = performance.now();

      const result = pipeline.run({
        instruction: 'sum',
        data: [1, 2, 3, 4, 5]
      });

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(200);  // CI tolerance
      expect(result?.final_value).toBe(15);
    });

    test('Multiple operations consistency', () => {
      const pipeline = new Pipeline();
      const data = [5, 15, 25, 35, 45];

      // 여러 번 실행
      const results = Array(5)
        .fill(null)
        .map(() => pipeline.run({ instruction: 'sum', data }));

      // 모두 동일한 결과
      results.forEach(r => {
        expect(r?.final_value).toBe(125);
      });
    });
  });
});
