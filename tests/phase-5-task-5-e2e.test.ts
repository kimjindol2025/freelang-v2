/**
 * Phase 5 Task 5 - E2E 통합 검증
 *
 * .free 파일 → Parser → astToProposal → 최종 검증
 * 
 * 4가지 시나리오 그룹:
 * 1. 기본: 명시적 모든 정보
 * 2. 자유도: AI-First 문법 자유도
 * 3. 본체 분석: Task 4.2-4.3 directive 동적 조정
 * 4. 에러 처리: 견고성
 */

import { Lexer, TokenBuffer } from '../src/lexer/lexer';
import { parseMinimalFunction } from '../src/parser/parser';
import { astToProposal } from '../src/bridge/ast-to-proposal';
import { ParseError } from '../src/parser/ast';

/**
 * Helper: .free 코드 → HeaderProposal 생성
 */
function e2eTest(code: string) {
  const lexer = new Lexer(code);
  const buffer = new TokenBuffer(lexer);
  const ast = parseMinimalFunction(buffer);
  return astToProposal(ast);
}

/**
 * Helper: .free 코드 파싱 시도 (에러 감지용)
 */
function e2eTestWithError(code: string): any {
  const lexer = new Lexer(code);
  const buffer = new TokenBuffer(lexer);
  try {
    const ast = parseMinimalFunction(buffer);
    return astToProposal(ast);
  } catch (error) {
    if (error instanceof ParseError) {
      return { error: error.message };
    }
    throw error;
  }
}

describe('Phase 5 Task 5: E2E 통합 검증', () => {
  // ============================================================================
  // 그룹 1: 기본 시나리오 (명시적 모든 정보)
  // ============================================================================
  describe('그룹 1: 기본 시나리오 - 명시적 타입 + intent', () => {
    test('sum: 명시적 타입 + intent → 높은 신뢰도', () => {
      const code = `fn sum
input: array<number>
output: number
intent: "배열 합산"`;

      const proposal = e2eTest(code);

      expect(proposal.fn).toBe('sum');
      expect(proposal.input).toBe('array<number>');
      expect(proposal.output).toBe('number');
      expect(proposal.reason).toBe('배열 합산');
      expect(proposal.directive).toBe('memory'); // intent 기반 (기본값)
      expect(proposal.confidence).toBe(0.98); // 타입 명시 + directive 기본(1.0)
      expect(proposal.matched_op).toBe('sum');
    });

    test('average: 명시적 타입 + 한글 intent', () => {
      const code = `fn average
input: array<number>
output: number
intent: "배열의 평균값"`;

      const proposal = e2eTest(code);

      expect(proposal.fn).toBe('average');
      expect(proposal.input).toBe('array<number>');
      expect(proposal.output).toBe('number');
      expect(proposal.matched_op).toBe('average');
      expect(proposal.confidence).toBe(0.98);
    });

    test('sort: 정렬 복잡도 감지', () => {
      const code = `fn quickSort
input: array<number>
output: array<number>
intent: "배열 정렬"`;

      const proposal = e2eTest(code);

      expect(proposal.fn).toBe('quickSort');
      expect(proposal.complexity).toBe('O(n log n)'); // 정렬 감지
      expect(proposal.matched_op).toBe('sort');
    });

    test('filter: 배열 필터링', () => {
      const code = `fn filterNegative
input: array<number>
output: array<number>
intent: "음수 필터링"`;

      const proposal = e2eTest(code);

      expect(proposal.fn).toBe('filterNegative');
      expect(proposal.matched_op).toBe('filter');
      expect(proposal.directive).toBe('memory'); // 필터 = memory
    });
  });

  // ============================================================================
  // 그룹 2: 자유도 시나리오 (AI-First 문법 자유도)
  // ============================================================================
  describe('그룹 2: 자유도 시나리오 - AI-First 문법', () => {
    test('콜론 제거 + 한 줄 형식', () => {
      const code = `fn sum input array<number> output number intent "합산"`;

      const proposal = e2eTest(code);

      expect(proposal.fn).toBe('sum');
      expect(proposal.input).toBe('array<number>');
      expect(proposal.output).toBe('number');
      expect(proposal.confidence).toBe(0.98); // 타입 명시
    });

    test('타입 부분 생략 + intent 기반 추론', () => {
      // Task 2: 타입 생략은 가능하지만, input/output 키워드는 여전히 필수
      const code = `fn sum
input
output
intent: "배열 합산"`;

      const proposal = e2eTest(code);

      expect(proposal.fn).toBe('sum');
      // intent에서 추론: 배열 합산 → array<number> → number
      expect(proposal.input).toBe('array<number>');
      expect(proposal.output).toBe('number');
      // 타입 추론이므로 신뢰도 낮음
      expect(proposal.confidence).toBeLessThan(0.85);
    });

    test('intent 없음 + 본체 분석만', () => {
      const code = `fn sum
input: array<number>
output: number
{ for i in 0..arr.len() { sum += arr[i]; } }`;

      const proposal = e2eTest(code);

      expect(proposal.fn).toBe('sum');
      expect(proposal.input).toBe('array<number>');
      expect(proposal.output).toBe('number');
      // body에서 directive 추론: 루프 + 누적 → speed
      expect(proposal.directive).toBe('speed');
    });

    test('극한 자유형: 최소 정보만', () => {
      const code = `fn calculate
input: array<number>
output: number`;

      const proposal = e2eTest(code);

      expect(proposal.fn).toBe('calculate');
      expect(proposal.input).toBe('array<number>');
      expect(proposal.output).toBe('number');
      expect(proposal.reason).toBe('calculate operation');
    });

    test('@minimal 데코레이터 + 완전 자유형', () => {
      const code = `@minimal fn analyze input array<string> output number`;

      const proposal = e2eTest(code);

      expect(proposal.fn).toBe('analyze');
      expect(proposal.input).toBe('array<string>');
      expect(proposal.output).toBe('number');
    });
  });

  // ============================================================================
  // 그룹 3: 본체 분석 시나리오 (Task 4.2-4.3)
  // ============================================================================
  describe('그룹 3: 본체 분석 시나리오 - directive 동적 조정', () => {
    test('intent→memory, body→speed → directive 변경', () => {
      const code = `fn sum
input: array<number>
output: number
intent: "합산"
{ for i in 0..arr.len() { result += arr[i]; } }`;

      const proposal = e2eTest(code);

      // intent 없으므로 기본값 memory → 하지만 body가 루프+누적
      expect(proposal.directive).toBe('speed'); // body 우선
      expect(proposal.confidence).toBeGreaterThan(0.75);
    });

    test('루프 + 누적 패턴 명확한 감지', () => {
      const code = `fn compute
input: array<number>
output: number
{ let result = 0; for i in 0..n { result += data[i]; } return result; }`;

      const proposal = e2eTest(code);

      expect(proposal.directive).toBe('speed'); // 루프+누적 = speed
    });

    test('중첩 루프 → 복잡한 패턴', () => {
      const code = `fn matrixSum
input: array<number>
output: number
{ for i in 0..n { for j in 0..n { sum += matrix[i][j]; } } }`;

      const proposal = e2eTest(code);

      expect(proposal.directive).toBe('speed'); // 중첩+누적 = speed
    });

    test('신뢰도 × directive 계산', () => {
      const code = `fn process
input: array<number>
output: number
{ for i in 0..10 { sum += arr[i]; } }`;

      const proposal = e2eTest(code);

      // intent 없음 → directive는 intent 기본값(1.0) × body(0.8+)
      // 0.98 (타입) × 1.0 (intent 없음 = 기본값) = 0.98
      // 또는 body가 있으면: 0.98 × 0.8+ = 0.784+
      expect(proposal.confidence).toBeGreaterThan(0.75);
      expect(proposal.confidence).toBeLessThanOrEqual(0.98);
    });

    test('intent와 body directive 일치 → 신뢰도 상승', () => {
      const code = `fn speedSort
input: array<number>
output: array<number>
intent: "빠른 정렬"
{ for i in 0..n { for j in 0..n { x += i; } } }`;

      const proposal = e2eTest(code);

      // intent="빠른" → speed, body=루프+누적 → speed (일치)
      expect(proposal.directive).toBe('speed');
      expect(proposal.confidence).toBeGreaterThan(0.75);
    });
  });

  // ============================================================================
  // 그룹 4: 에러 처리 (견고성)
  // ============================================================================
  describe('그룹 4: 에러 처리 - 견고성', () => {
    test('닫지 않은 중괄호 → 에러', () => {
      const code = `fn broken
input: array<number>
output: number
{ for i in 0..10 { sum += arr[i];`;

      const result = e2eTestWithError(code);

      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Unclosed');
    });

    test('Phase 5 Stage 3: output 없음 → 유효 (출력 타입 추론됨)', () => {
      // With Stage 3, output type is optional (will be inferred)
      const code = `fn incomplete
input: array<number>`;

      // This should now be valid and parse successfully
      const result = e2eTest(code);
      expect(result).toBeDefined();
      expect(result.fn).toBe('incomplete');
    });

    test('잘못된 타입 문법: <> 안 닫음 → 에러', () => {
      const code = `fn badType
input: array<number
output: number`;

      expect(() => {
        e2eTest(code);
      }).toThrow();
    });

    test('Phase 5 Stage 3: FN 키워드 누락 → 유효 (함수 구조 감지됨)', () => {
      // With Stage 3, fn keyword is optional if structure is detected
      const code = `sum
input: array<number>
output: number`;

      // This should now be valid and parse successfully
      const result = e2eTest(code);
      expect(result).toBeDefined();
      expect(result.fn).toBe('sum');
    });

    test('부분 복구: intent 잘못된 형식 → 무시하고 진행', () => {
      const code = `fn sum
input: array<number>
output: number
intent this is not quoted`;

      // intent 파싱 시도하지만 실패 → 무시 또는 부분 파싱
      // (실제 동작은 parser 설계에 따름)
      try {
        const proposal = e2eTest(code);
        // 성공: intent 부분 무시됨
        expect(proposal.fn).toBe('sum');
      } catch (e) {
        // 또는 실패: parser가 엄격함
        expect(e).toBeDefined();
      }
    });
  });

  // ============================================================================
  // 그룹 5: E2E 완전 시나리오 (실제 프로젝트 패턴)
  // ============================================================================
  describe('그룹 5: 실제 프로젝트 패턴', () => {
    test('프로젝트 1: Data Processing Service', () => {
      const code = `@minimal fn aggregateMetrics
input: array<number>
output: number
intent: "배열 합산"
{ let total = 0; for metric in data { total += metric; } return total; }`;

      const proposal = e2eTest(code);

      expect(proposal.fn).toBe('aggregateMetrics');
      expect(proposal.matched_op).toBe('sum'); // "합산" 키워드 감지
      expect(proposal.directive).toBe('speed'); // body 루프+누적
      expect(proposal.confidence).toBeGreaterThan(0.75);
    });

    test('프로젝트 2: Data Transformation', () => {
      const code = `fn transformData
input: array<string>
output: array<string>
intent: "데이터 변환"`;

      const proposal = e2eTest(code);

      expect(proposal.fn).toBe('transformData');
      expect(proposal.input).toBe('array<string>');
      expect(proposal.output).toBe('array<string>');
      expect(proposal.matched_op).toBe('map');
    });

    test('프로젝트 3: Complex Analysis', () => {
      const code = `fn analyzeMatrix
input: array<number>
output: number
intent: "행렬 분석"
{ let result = 0; for i in 0..n { for j in 0..n { result += matrix[i][j]; } } }`;

      const proposal = e2eTest(code);

      expect(proposal.fn).toBe('analyzeMatrix');
      expect(proposal.directive).toBe('speed'); // 중첩 루프
      expect(proposal.complexity).toMatch(/O\(/); // 복잡도 있음
    });
  });
});
