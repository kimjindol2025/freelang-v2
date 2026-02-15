/**
 * Phase 5: v1 코드 통합 테스트
 *
 * .free 파일 파싱 → HeaderProposal → Pipeline 통합
 */
import { Lexer, TokenBuffer } from '../src/lexer/lexer';
import { parseMinimalFunction } from '../src/parser/parser';
import { astToProposal, proposalToString } from '../src/bridge/ast-to-proposal';

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

    test('파싱 에러: missing input', () => {
      const code = `fn sum
output: number`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);

      expect(() => parseMinimalFunction(buffer)).toThrow('Expected "input" keyword');
    });

    test('파싱 에러: missing output', () => {
      const code = `fn sum
input: array<number>`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);

      expect(() => parseMinimalFunction(buffer)).toThrow('Expected "output" keyword');
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
  // PART 9: 신뢰도 조정 (Confidence Adjustment)
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
