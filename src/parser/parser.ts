/**
 * FreeLang v2 Phase 5 - Minimal Parser
 *
 * .free 파일 형식의 함수 선언만 파싱
 *
 * 형식:
 *   [@minimal]          <- optional decorator
 *   fn <name>
 *   input: <type>
 *   output: <type>
 *   [intent: "<string>"] <- optional
 *
 * 예시:
 *   @minimal
 *   fn sum
 *   input: array<number>
 *   output: number
 *   intent: "배열 합산"
 */
import { Token, TokenType } from '../lexer/token';
import { TokenBuffer } from '../lexer/lexer';
import { MinimalFunctionAST, ParseError } from './ast';

/**
 * Minimal Parser - .free 파일 형식만 파싱
 */
export class Parser {
  private tokens: TokenBuffer;

  constructor(tokens: TokenBuffer) {
    this.tokens = tokens;
  }

  /**
   * 현재 토큰 반환
   */
  private current(): Token {
    return this.tokens.current();
  }

  /**
   * 다음 토큰 반환
   */
  private peek(offset: number = 1): Token {
    return this.tokens.peek(offset);
  }

  /**
   * 다음 토큰으로 이동
   */
  private advance(): Token {
    return this.tokens.advance();
  }

  /**
   * 현재 토큰의 타입 확인
   */
  private check(type: TokenType): boolean {
    return this.current().type === type;
  }

  /**
   * 예상 토큰 확인 및 진행
   */
  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  /**
   * 예상 토큰 확인, 없으면 에러
   */
  private expect(type: TokenType, message?: string): Token {
    if (!this.check(type)) {
      const token = this.current();
      throw new ParseError(
        token.line,
        token.column,
        message || `Expected ${type}, got ${token.type}`
      );
    }
    const token = this.current();
    this.advance();
    return token;
  }

  /**
   * 파일 전체 파싱 (탑 레벨)
   */
  public parse(): MinimalFunctionAST {
    // Skip leading decorators or comments
    let decorator: string | undefined;

    // Check for @minimal decorator
    if (this.check(TokenType.AT)) {
      this.advance();
      if (this.check(TokenType.IDENT) && this.current().value === 'minimal') {
        decorator = 'minimal';
        this.advance();
      }
    }

    // Parse fn keyword
    this.expect(TokenType.FN, 'Expected "fn" keyword');

    // Parse function name
    const nameToken = this.expect(TokenType.IDENT, 'Expected function name');
    const fnName = nameToken.value;

    // Parse input type declaration
    this.expect(TokenType.INPUT, 'Expected "input:" keyword');
    this.expect(TokenType.COLON, 'Expected ":" after "input"');
    // Phase 5: 타입 생략 가능 (intent에서 추론)
    const inputType = this.parseOptionalType();

    // Parse output type declaration
    this.expect(TokenType.OUTPUT, 'Expected "output:" keyword');
    this.expect(TokenType.COLON, 'Expected ":" after "output"');
    // Phase 5: 타입 생략 가능 (intent에서 추론)
    const outputType = this.parseOptionalType();

    // Parse optional intent
    let intent: string | undefined;
    if (this.check(TokenType.INTENT)) {
      this.advance();
      this.expect(TokenType.COLON, 'Expected ":" after "intent"');
      if (this.check(TokenType.STRING)) {
        intent = this.current().value;
        this.advance();
      } else if (this.check(TokenType.IDENT)) {
        // 문자열 없이 identifier로 나올 수도 있음
        intent = this.current().value;
        this.advance();
      }
    }

    // Expect EOF
    this.expect(TokenType.EOF, 'Expected end of file');

    return {
      decorator: decorator as 'minimal' | undefined,
      fnName,
      inputType,
      outputType,
      intent
    };
  }

  /**
   * 선택적 타입 파싱 (Phase 5)
   *
   * 타입을 생략할 수 있으며, 이 경우 intent에서 추론
   * 예:
   *   - input: array<number>    → "array<number>" 반환
   *   - input: array            → "array" 반환
   *   - input: result           → "result" 반환
   *   - input: (output 바로)    → "" 반환 (타입 생략)
   */
  private parseOptionalType(): string {
    // intent나 output 또는 EOF를 만나면 타입 생략
    if (
      this.check(TokenType.INTENT) ||
      this.check(TokenType.OUTPUT) ||
      this.check(TokenType.INPUT) ||
      this.check(TokenType.EOF)
    ) {
      return ''; // 타입 생략됨
    }

    // 타입이 있으면 파싱
    return this.parseType();
  }

  /**
   * 타입 파싱 (array<number>, number, string 등)
   *
   * 형식:
   *   - IDENT                     : number, string, bool, int
   *   - IDENT < TYPE >            : array<number>, map<string, number>
   *   - IDENT < TYPE , TYPE ... > : 제네릭 타입
   *   - IDENT < IDENT < TYPE > >  : nested generics (Phase 4.5+)
   *
   * Phase 4.5에서 TokenBuffer가 SHR >> 토큰을 2개 GT > 토큰으로 자동 분해하므로
   * nested generics (array<array<number>>) 완벽 지원 ✅
   */
  private parseType(): string {
    let type = '';

    // 기본 타입명
    if (this.check(TokenType.IDENT)) {
      type = this.current().value;
      this.advance();
    } else if (this.check(TokenType.LBRACKET)) {
      // [타입] 형식 (배열)
      this.advance(); // [
      type = '[' + this.parseType() + ']';
      this.expect(TokenType.RBRACKET);
    } else {
      throw new ParseError(
        this.current().line,
        this.current().column,
        'Expected type name'
      );
    }

    // 제네릭 타입 처리 (< > 안의 타입)
    if (this.check(TokenType.LT)) {
      this.advance(); // <
      type += '<';

      // 첫 번째 타입 인자
      type += this.parseType();

      // 추가 타입 인자 (쉼표로 구분)
      while (this.check(TokenType.COMMA)) {
        this.advance(); // ,
        type += ', ';
        type += this.parseType();
      }

      // GT 또는 SHR (>>) 처리
      // >> 토큰은 일반적으로 두 개의 >로 나타나야 하는데,
      // 렉서에서 >> 를 SHR로 토큰화함
      if (this.check(TokenType.GT)) {
        this.advance();
        type += '>';
      } else if (this.check(TokenType.SHR)) {
        // >> 토큰: 첫 번째는 현재 제네릭 닫기, 두 번째는 부모에게 반환
        // 하지만 우리는 한 개만 소비해야 함. 지금은 SHR 전체를 소비하고
        // 파서 상태를 조정해야 하는데, 간단한 해결책으로 >> 를 하나의 >로 취급
        this.advance();
        type += '>';
        // 두 번째 >는 부모 파서에서 처리될 것
      } else {
        throw new ParseError(
          this.current().line,
          this.current().column,
          'Expected ">" after generic types'
        );
      }
    }

    return type;
  }
}

/**
 * Parse wrapper - 편리한 파싱 진입점
 *
 * 사용법:
 *   const ast = parseMinimalFunction(tokenBuffer);
 */
export function parseMinimalFunction(tokens: TokenBuffer): MinimalFunctionAST {
  const parser = new Parser(tokens);
  return parser.parse();
}
