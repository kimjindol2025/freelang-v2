/**
 * Phase 5: v1 코드 통합 테스트
 *
 * .free 파일 파싱 → HeaderProposal → Pipeline 통합
 */
import { Lexer, TokenBuffer } from '../src/lexer/lexer';
import { parseMinimalFunction } from '../src/parser/parser';
import { astToProposal, proposalToString } from '../src/bridge/ast-to-proposal';

/**
 * Helper: 코드를 파싱하여 HeaderProposal 반환
 */
function parseAndPropose(code: string) {
  const lexer = new Lexer(code);
  const buffer = new TokenBuffer(lexer);
  const ast = parseMinimalFunction(buffer);
  return astToProposal(ast);
}

describe('Phase 5: v1 코드 통합 (.free 파일 파싱)', () => {
  // ============================================================================
  // PART 1: Lexer 토큰 확장 테스트
  // ============================================================================
  describe('Lexer: INPUT, OUTPUT, INTENT 토큰', () => {
    test('INPUT 키워드 인식', () => {
      const lexer = new Lexer('input');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe('INPUT');
    });

    test('OUTPUT 키워드 인식', () => {
      const lexer = new Lexer('output');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe('OUTPUT');
    });

    test('INTENT 키워드 인식', () => {
      const lexer = new Lexer('intent');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe('INTENT');
    });

    test('기본 .free 파일 토큰화', () => {
      const code = `
        fn sum
        input: array<number>
        output: number
        intent: "배열 합산"
      `;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // FN, IDENT, INPUT, COLON, IDENT, LT, IDENT, GT,
      // OUTPUT, COLON, IDENT, INTENT, COLON, STRING, EOF
      const types = tokens.map((t) => t.type);

      expect(types).toContain('FN');
      expect(types).toContain('INPUT');
      expect(types).toContain('OUTPUT');
      expect(types).toContain('INTENT');
      expect(types[types.length - 1]).toBe('EOF');
    });
  });

  // ============================================================================
  // PART 2: Parser 기본 파싱 테스트
  // ============================================================================
  describe('Parser: .free 파일 파싱', () => {
    test('최소 .free 형식 파싱', () => {
      const code = `fn sum
input: array<number>
output: number`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.fnName).toBe('sum');
      expect(ast.inputType).toBe('array<number>');
      expect(ast.outputType).toBe('number');
      expect(ast.intent).toBeUndefined();
    });

    test('Phase 5: 한 줄 형식 파싱 (세미콜론/줄바꿈 선택적)', () => {
      // Phase 5 AI-First: 한 줄에 모든 것을 쓸 수 있게
      const code = `fn sum input: array<number> output: number intent: "배열 합산"`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.fnName).toBe('sum');
      expect(ast.inputType).toBe('array<number>');
      expect(ast.outputType).toBe('number');
      expect(ast.intent).toBe('배열 합산');
    });

    test('Phase 5: 데코레이터 + 한 줄 형식', () => {
      const code = `@minimal fn sum input: array<number> output: number`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.decorator).toBe('minimal');
      expect(ast.fnName).toBe('sum');
      expect(ast.inputType).toBe('array<number>');
      expect(ast.outputType).toBe('number');
    });

    test('intent 포함한 .free 파싱', () => {
      const code = `fn average
input: array<number>
output: number
intent: "배열 평균 계산"`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.fnName).toBe('average');
      expect(ast.inputType).toBe('array<number>');
      expect(ast.outputType).toBe('number');
      expect(ast.intent).toBe('배열 평균 계산');
    });

    test('@minimal decorator 파싱', () => {
      const code = `@minimal
fn sum
input: array<number>
output: number`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.decorator).toBe('minimal');
      expect(ast.fnName).toBe('sum');
    });

    test('제네릭 타입 파싱 (map)', () => {
      const code = `fn transform
input: array<number>
output: array<number>`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.fnName).toBe('transform');
      expect(ast.inputType).toBe('array<number>');
      expect(ast.outputType).toBe('array<number>');
    });

    test('중첩 제너릭 타입 파싱 (nested generics)', () => {
      const code = `fn matrixSum
input: array<array<number>>
output: number`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.fnName).toBe('matrixSum');
      expect(ast.inputType).toBe('array<array<number>>');
      expect(ast.outputType).toBe('number');
    });

    test('배열 타입 축약형 파싱', () => {
      const code = `fn count
input: [number]
output: int`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.inputType).toBe('[number]');
    });

    test('Phase 5 Stage 3: input keyword optional (fn present, input omitted)', () => {
      // With Stage 3, input keyword is optional
      // fn sum output: number → parses with empty input type
      const code = `fn sum
output: number`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);

      const ast = parseMinimalFunction(buffer);
      expect(ast.fnName).toBe('sum');
      expect(ast.inputType).toBe(''); // Input type omitted (will be inferred)
      expect(ast.outputType).toBe('number');
    });

    test('Phase 5 Stage 3: output keyword optional (fn present, output omitted)', () => {
      // With Stage 3, output keyword is optional
      // fn sum input: array<number> → parses with empty output type
      const code = `fn sum
input: array<number>`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);

      const ast = parseMinimalFunction(buffer);
      expect(ast.fnName).toBe('sum');
      expect(ast.inputType).toBe('array<number>');
      expect(ast.outputType).toBe(''); // Output type omitted (will be inferred)
    });
  });

  // ============================================================================
  // PART 3: AST to HeaderProposal 브릿지 테스트
  // ============================================================================
  describe('Bridge: AST → HeaderProposal', () => {
    test('기본 변환', () => {
      const code = `fn sum
input: array<number>
output: number
intent: "배열 합산"`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      expect(proposal.fn).toBe('sum');
      expect(proposal.input).toBe('array<number>');
      expect(proposal.output).toBe('number');
      expect(proposal.confidence).toBe(0.98); // v1 파서이므로 매우 높음
    });

    test('동작 추론: intent에서', () => {
      const code = `fn foo
input: array<number>
output: number
intent: "배열 최대값 찾기"`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      expect(proposal.matched_op).toBeDefined();
    });

    test('지시어 추론: 속도 최적화', () => {
      const code = `fn sort
input: array<number>
output: array<number>
intent: "빠른 정렬 알고리즘"`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      expect(proposal.directive).toBe('speed');
    });

    test('지시어 추론: 메모리 효율성', () => {
      const code = `fn filter
input: array<number>
output: array<number>
intent: "메모리 효율적 필터링"`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      expect(proposal.directive).toBe('memory');
    });

    test('지시어 추론: 안전성', () => {
      const code = `fn validate
input: array<number>
output: bool
intent: "안전한 범위 검사"`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      expect(proposal.directive).toBe('safety');
    });

    test('proposalToString 포맷팅', () => {
      const code = `fn sum
input: array<number>
output: number
intent: "배열 합산"`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);
      const str = proposalToString(proposal);

      expect(str).toContain('fn sum');
      expect(str).toContain('array<number>');
      expect(str).toContain('98%');
    });
  });

  // ============================================================================
  // PART 4: E2E 통합 테스트
  // ============================================================================
  describe('E2E: .free 파일 → Pipeline 준비', () => {
    test('sum.free E2E', () => {
      const freeCode = `@minimal
fn sum
input: array<number>
output: number
intent: "배열의 모든 요소 합산"`;

      // 1. 렉스
      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);

      // 2. 파싱
      const ast = parseMinimalFunction(buffer);
      expect(ast.fnName).toBe('sum');

      // 3. 브릿지
      const proposal = astToProposal(ast);
      expect(proposal.fn).toBe('sum');
      expect(proposal.confidence).toBe(0.98);

      // 4. 파이프라인 준비
      expect(proposal.input).toBe('array<number>');
      expect(proposal.output).toBe('number');
      expect(proposal.fn).toBe('sum');
    });

    test('average.free E2E', () => {
      const freeCode = `fn average
input: array<number>
output: number
intent: "배열 요소의 평균값 계산"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      expect(proposal.fn).toBe('average');
      expect(proposal.confidence).toBe(0.98);
      expect(proposal.output).toBe('number');
    });

    test('filter.free E2E', () => {
      const freeCode = `fn filter
input: array<number>
output: array<number>
intent: "메모리 효율적 필터 구현"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      expect(proposal.fn).toBe('filter');
      expect(proposal.directive).toBe('memory');
      expect(proposal.input).toBe('array<number>');
      expect(proposal.output).toBe('array<number>');
    });

    test('다양한 타입 지원', () => {
      const freeCode = `fn process
input: array<string>
output: string
intent: "문자열 배열 처리"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      expect(proposal.input).toBe('array<string>');
      expect(proposal.output).toBe('string');
    });
  });

  // ============================================================================
  // PART 5: 성능 및 메모리 테스트
  // ============================================================================
  describe('성능: TokenBuffer 메모리 효율', () => {
    test('TokenBuffer 메모리 사용량', () => {
      const freeCode = `fn sum
input: array<number>
output: number
intent: "배열 합산"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);

      const usage = buffer.memoryUsage();
      expect(usage.bufferSize).toBeLessThan(100); // BUFFER_SIZE = 100
      expect(usage.position).toBeGreaterThanOrEqual(0);
    });

    test('대용량 .free 파일 파싱 (성능)', () => {
      // 반복 코드로 큰 파일 시뮬레이션
      let code = '';
      for (let i = 0; i < 50; i++) {
        code += `fn func${i}\ninput: array<number>\noutput: number\n`;
      }

      const startTime = Date.now();
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const elapsed = Date.now() - startTime;

      // 50개 함수 선언 토큰화: < 50ms
      expect(elapsed).toBeLessThan(50);
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // PART 6: v1 호환성 테스트
  // ============================================================================
  describe('v1 호환성', () => {
    test('v1 lexer 토큰들 유지', () => {
      const code = 'fn sum let const if for async await';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const types = tokens.map((t) => t.type);
      expect(types).toContain('FN');
      expect(types).toContain('LET');
      expect(types).toContain('CONST');
      expect(types).toContain('IF');
      expect(types).toContain('FOR');
      expect(types).toContain('ASYNC');
      expect(types).toContain('AWAIT');
    });

    test('v1 operator 파싱', () => {
      const code = '== != <= >= && || + - * /';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const types = tokens.map((t) => t.type);
      expect(types).toContain('EQ');
      expect(types).toContain('NE');
      expect(types).toContain('LE');
      expect(types).toContain('GE');
    });
  });

  // ============================================================================
  // PART 7: Phase 5 Task 2 - 타입 생략 with Intent-based 추론
  // ============================================================================
  describe('Phase 5 Task 2: 타입 생략 및 intent 기반 추론', () => {
    test('타입 생략: sum 연산', () => {
      const freeCode = `fn process
input:
output:
intent: "배열 합산"`; // 타입 완전 생략

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      // 타입이 없었으므로 intent에서 추론됨
      expect(proposal.input).toBe('array<number>');
      expect(proposal.output).toBe('number');
      expect(proposal.fn).toBe('process');
    });

    test('타입 부분 생략: input만 지정, output 추론', () => {
      const freeCode = `fn filter
input: array
output:
intent: "필터링"`; // output만 생략

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      // input은 "array" 그대로, output은 intent에서 추론
      expect(proposal.input).toBe('array');
      expect(proposal.output).toBe('array<number>');
    });

    test('타입 부분 생략: output만 지정, input 추론', () => {
      const freeCode = `fn count
input:
output: int
intent: "배열 개수"`; // input만 생략

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      // input은 intent에서 추론, output은 "int" 그대로
      expect(proposal.input).toBe('array<number>');
      expect(proposal.output).toBe('int');
    });

    test('Intent 기반 타입 추론: 평균', () => {
      const freeCode = `fn avg
input:
output:
intent: "배열 평균 계산"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      expect(proposal.input).toBe('array<number>');
      expect(proposal.output).toBe('number');
    });

    test('Intent 기반 타입 추론: 정렬', () => {
      const freeCode = `fn sort
input:
output:
intent: "배열 정렬"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      expect(proposal.input).toBe('array<number>');
      expect(proposal.output).toBe('array<number>');
    });

    test('Intent 기반 타입 추론: 문자열 필터', () => {
      const freeCode = `fn filterText
input:
output:
intent: "배열 문자열 필터링"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      expect(proposal.input).toBe('array<string>');
      expect(proposal.output).toBe('array<string>');
    });

    test('Intent 기반 타입 추론: 검색 (find)', () => {
      const freeCode = `fn search
input:
output:
intent: "배열에서 찾기"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      // find는 배열을 받아 단일 원소 반환
      expect(proposal.input).toBe('array<number>');
      expect(proposal.output).toBe('number');
    });

    test('타입 전부 명시: 추론 안 함', () => {
      const freeCode = `fn customOp
input: custom_type
output: result_type
intent: "복잡한 연산"`; // 타입 전부 명시

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      // 명시된 타입 사용
      expect(proposal.input).toBe('custom_type');
      expect(proposal.output).toBe('result_type');
    });

    test('Intent 없이 타입 생략: 기본값 사용', () => {
      const freeCode = `fn unknown
input:
output:`; // intent 없이 타입 생략

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      // 기본값 사용
      expect(proposal.input).toBe('array<number>');
      expect(proposal.output).toBe('result');
    });

    test('복합 시나리오: 한 줄 형식 + 타입 생략', () => {
      const freeCode = `@minimal fn flatten input: output: intent: "배열 평탄화"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      expect(ast.decorator).toBe('minimal');
      expect(proposal.input).toBe('array<number>');
      expect(proposal.output).toBe('array<number>'); // flatten은 배열 반환
    });
  });

  // ============================================================================
  // PART 8: Phase 5 Task 3 - Colon Optional (콜론 제거 가능)
  // ============================================================================
  describe('Phase 5 Task 3: Colon Optional (콜론 선택적 지원)', () => {
    test('콜론 제거: input 없음', () => {
      const freeCode = `fn sum
input array<number>
output number`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.fnName).toBe('sum');
      expect(ast.inputType).toBe('array<number>');
      expect(ast.outputType).toBe('number');
    });

    test('콜론 제거: output 없음', () => {
      const freeCode = `fn process
input array<string>
output array<string>`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.inputType).toBe('array<string>');
      expect(ast.outputType).toBe('array<string>');
    });

    test('콜론 제거: intent 있음 (콜론 없음)', () => {
      const freeCode = `fn filter
input array<number>
output array<number>
intent "필터링"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.intent).toBe('필터링');
    });

    test('콜론 제거: 모든 키워드에서', () => {
      const freeCode = `fn sort
input array<number>
output array<number>
intent "정렬"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.fnName).toBe('sort');
      expect(ast.inputType).toBe('array<number>');
      expect(ast.outputType).toBe('array<number>');
      expect(ast.intent).toBe('정렬');
    });

    test('콜론 혼합 사용: 일부만 제거', () => {
      const freeCode = `fn process
input: array<number>
output array<number>`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.inputType).toBe('array<number>');
      expect(ast.outputType).toBe('array<number>');
    });

    test('콜론 혼합 사용: output과 intent에만 사용', () => {
      const freeCode = `fn transform
input array<string>
output: array<string>
intent: "변환"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.intent).toBe('변환');
    });

    test('한 줄 형식 + 콜론 제거: 완전 자유형', () => {
      const freeCode = `fn sum input array<number> output number intent "배열 합산"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      expect(ast.fnName).toBe('sum');
      expect(ast.inputType).toBe('array<number>');
      expect(ast.outputType).toBe('number');
      expect(ast.intent).toBe('배열 합산');
      expect(proposal.confidence).toBe(0.98);
    });

    test('한 줄 형식 + 콜론 혼합: 형식 완전 자유화', () => {
      const freeCode = `@minimal fn filter input: array<number> output array<number> intent "필터"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.decorator).toBe('minimal');
      expect(ast.fnName).toBe('filter');
      expect(ast.inputType).toBe('array<number>');
      expect(ast.outputType).toBe('array<number>');
    });

    test('데코레이터 + 콜론 제거 + 한 줄', () => {
      const freeCode = `@minimal fn max input array<number> output number intent "최댓값"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.decorator).toBe('minimal');
      expect(ast.fnName).toBe('max');
      expect(ast.inputType).toBe('array<number>');
      expect(ast.outputType).toBe('number');
    });

    test('콜론 제거 + 타입 생략: Task 2와 Task 3 조합', () => {
      const freeCode = `fn unknown
input
output
intent "배열 정렬"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      // intent에서 타입 추론
      expect(proposal.input).toBe('array<number>');
      expect(proposal.output).toBe('array<number>');
    });

    test('극한 자유형: 최소 형식 + 최대 유연성', () => {
      const freeCode = `fn flatten input output intent "배열 평탄화"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      // 모든 것이 생략: 타입도 intent에서 추론
      expect(ast.inputType).toBe('');
      expect(ast.outputType).toBe('');
      expect(proposal.input).toBe('array<number>');
      expect(proposal.output).toBe('array<number>'); // flatten은 배열 반환
    });
  });

  // ============================================================================
  // PART 9: Phase 5 Task 4 - 함수 본체 파싱 (Dynamic Interpretation)
  // ============================================================================
  describe('Phase 5 Task 4: 함수 본체 파싱', () => {
    test('본체 없는 형식: 기존 호환성 유지', () => {
      const freeCode = `fn sum
input: array<number>
output: number
intent: "배열 합산"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.fnName).toBe('sum');
      expect(ast.body).toBeUndefined();
    });

    test('기본 본체 파싱', () => {
      const freeCode = `fn sum input array<number> output number {
        return 0;
      }`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.fnName).toBe('sum');
      expect(ast.body).toBeDefined();
      expect(ast.body).toContain('return');
    });

    test('복잡한 본체 (루프 포함)', () => {
      const freeCode = `fn sum input array<number> output number {
        let result = 0;
        for i in 0..arr.len() {
          result += arr[i];
        }
        return result;
      }`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.body).toBeDefined();
      expect(ast.body).toContain('for');
      expect(ast.body).toContain('result');
    });

    test('중첩 중괄호 처리', () => {
      const freeCode = `fn nested input array<number> output number {
        for i in 0..10 {
          if i > 5 {
            return i;
          }
        }
      }`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.body).toBeDefined();
      expect(ast.body).toContain('if');
      expect(ast.body).toContain('return');
    });

    test('빈 본체', () => {
      const freeCode = `fn empty input number output number { }`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.body).toBe('');
    });

    test('본체 + 모든 선택사항', () => {
      const freeCode = `@minimal fn process input array<string> output array<string> intent "변환" {
        let result = [];
        for item in input {
          result.push(item.to_upper());
        }
        return result;
      }`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.decorator).toBe('minimal');
      expect(ast.fnName).toBe('process');
      expect(ast.intent).toBe('변환');
      expect(ast.body).toBeDefined();
      expect(ast.body).toContain('to_upper');
    });

    test('본체만 있고 intent 없음', () => {
      const freeCode = `fn calculate input number output number {
        return input * 2;
      }`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.intent).toBeUndefined();
      expect(ast.body).toBeDefined();
    });

    test('에러: 닫지 않은 중괄호', () => {
      const freeCode = `fn broken input number output number {
        return 42;`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);

      expect(() => parseMinimalFunction(buffer)).toThrow('Unclosed brace');
    });

    test('본체 내 주석 포함 (주석도 수집)', () => {
      const freeCode = `fn commented input number output number {
        // This is a comment
        return input + 1;
      }`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.body).toBeDefined();
      // 렉서에서 주석을 토큰으로 제공하면 body에 포함됨
    });

    test('극한: 최소 선언 + 복잡한 본체', () => {
      const freeCode = `fn x input output {
        for i in 0..100 {
          for j in 0..100 {
            if i == j {
              return i;
            }
          }
        }
      }`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.fnName).toBe('x');
      expect(ast.inputType).toBe('');
      expect(ast.outputType).toBe('');
      expect(ast.body).toBeDefined();
    });
  });

  // ============================================================================
  // PART 10: 신뢰도 조정 (Confidence Adjustment)
  // ============================================================================
  describe('신뢰도 조정: 명시적 vs 추론 타입', () => {
    test('명시적 타입: 신뢰도 0.98 (높음)', () => {
      const freeCode = `fn sum
input: array<number>
output: number
intent: "배열 합산"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      // 타입이 명시되었으므로 높은 신뢰도
      expect(proposal.confidence).toBe(0.98);
    });

    test('추론 타입: 신뢰도 0.833 (중간)', () => {
      const freeCode = `fn sum
input:
output:
intent: "배열 합산"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      // 타입이 생략되어 추론되었으므로 감소된 신뢰도
      expect(proposal.confidence).toBeCloseTo(0.833, 3);
    });

    test('부분 추론: input만 추론 (신뢰도 0.833)', () => {
      const freeCode = `fn count
input:
output: number
intent: "배열 개수"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      // input이 추론되었으므로 감소된 신뢰도
      expect(proposal.confidence).toBeCloseTo(0.833, 3);
    });

    test('부분 추론: output만 추론 (신뢰도 0.833)', () => {
      const freeCode = `fn transform
input: array<string>
output:
intent: "변환"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      // output이 추론되었으므로 감소된 신뢰도
      expect(proposal.confidence).toBeCloseTo(0.833, 3);
    });

    test('신뢰도 계산 공식: 0.98 × 0.85 = 0.833', () => {
      const EXPLICIT = 0.98;
      const PENALTY = 0.85;
      const EXPECTED = EXPLICIT * PENALTY;

      expect(EXPECTED).toBeCloseTo(0.833, 3);
    });
  });
});

// ============================================================================
// PART 8: Phase 5 Task 4.3 - Dynamic Optimization (Directive 동적 조정)
// ============================================================================

describe('Phase 5 Task 4.3: Dynamic Optimization - Directive 동적 조정', () => {
  test('body 분석으로 directive 변경: intent→memory, body→speed', () => {
    // intent: "배열" (기본 → memory)
    // body: 루프 + 누적 (→ speed)
    // 예상: body 신뢰도 높으므로 speed로 변경
    const code = `fn sum
input: array<number>
output: number
intent: "배열 합산"
{ for i in 0..arr.len() { sum += arr[i]; } return sum; }`;

    const proposal = parseAndPropose(code);

    expect(proposal.directive).toBe('speed');
    expect(proposal.confidence).toBeGreaterThan(0.75); // body 신뢰도 높음
  });

  test('intent와 body directive 일치: 신뢰도 상승', () => {
    // intent: "빠른 정렬" (→ speed)
    // body: 중첩 루프 + 누적 (→ speed)
    // 예상: 두 신호가 일치하므로 신뢰도 높음
    const code = `fn quickSort
input: array<number>
output: array<number>
intent: "빠른 정렬"
{ for i in 0..n { for j in 0..n-1 { x += i; } } }`;

    const proposal = parseAndPropose(code);

    expect(proposal.directive).toBe('speed');
    // 0.98(타입) × 0.8(directive) = 0.784
    expect(proposal.confidence).toBeGreaterThan(0.75); // 일치하므로 높은 신뢰도
  });

  test('body 신뢰도 낮을 때 intent 우선: conservative 접근', () => {
    // intent: "안전한 검사" (→ safety)
    // body: 단순 변수 선언 (→ 신뢰도 낮음)
    // 예상: body 신뢰도 낮으므로 intent 유지
    const code = `fn validate
input: array<string>
output: boolean
intent: "안전한 검사"
{ let x = 0; }`;

    const proposal = parseAndPropose(code);

    // intent 기반 directive 유지
    expect(proposal.directive).toBe('safety');
    // body 신뢰도 낮으므로 신뢰도 감소 (0.7)
    expect(proposal.confidence).toBeLessThan(0.8);
  });

  test('body만 있고 intent 없을 때: body directive 사용', () => {
    // intent 없음 (기본 → memory)
    // body: 루프 + 누적 (→ speed)
    // 예상: body 신뢰도 높으므로 speed 선택
    const code = `fn calculate
input: array<number>
output: number
{ let result = 0; for i in 0..n { result += arr[i]; } return result; }`;

    const proposal = parseAndPropose(code);

    expect(proposal.directive).toBe('speed');
    expect(proposal.confidence).toBeGreaterThan(0.75);
  });

  test('intent 기본값이지만 body가 명확한 패턴 제시', () => {
    // intent 없음 (기본 → memory)
    // body: 루프 + 누적 (→ speed)
    // 예상: body 분석이 명확하므로 speed로 변경
    const code = `fn filterArray
input: array<number>
output: array<number>
{ let filtered = []; for item in data { result += item; } }`;

    const proposal = parseAndPropose(code);

    // body에 루프 + 누적이 있으므로 directive는 speed
    expect(proposal.directive).toBe('speed');
  });

  test('신뢰도 계산: 타입 신뢰도 × directive 신뢰도', () => {
    // 타입 명시 (0.98) × body 신뢰도 높음 (0.8+)
    // 예상: 0.98 × 0.8 ≈ 0.784
    const code = `fn sum
input: array<number>
output: number
intent: "합산"
{ for i in 0..10 { sum += arr[i]; } }`;

    const proposal = parseAndPropose(code);

    // 타입 명시(0.98) × body directive(0.8+) = 0.784+
    expect(proposal.confidence).toBeGreaterThan(0.75);
    expect(proposal.confidence).toBeLessThanOrEqual(0.98);
  });
});
