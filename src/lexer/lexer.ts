/**
 * FreeLang v2 Lexer (v1 기반, 거의 변경 없음)
 *
 * Tokenizes FreeLang source code including:
 * - v1 기본 토큰들
 * - Phase 5 추가 토큰들 (INPUT, OUTPUT, INTENT)
 */
import { Token, TokenType, getKeyword } from './token';

/**
 * Lexer - Tokenizes FreeLang source code
 */
export class Lexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 0;
  private current: string = '';
  private lastTokenType: TokenType = TokenType.EOF;  // Track last token for regex disambiguation

  constructor(input: string) {
    this.input = input;
    this.readChar();
  }

  /**
   * Read next character
   */
  private readChar(): void {
    if (this.position >= this.input.length) {
      this.current = '\0';
    } else {
      this.current = this.input[this.position];
    }
    this.position++;
    this.column++;
  }

  /**
   * Peek at next character without consuming
   */
  private peekChar(): string {
    if (this.position >= this.input.length) {
      return '\0';
    }
    return this.input[this.position];
  }

  /**
   * Skip whitespace
   */
  private skipWhitespace(): void {
    while (this.current === ' ' || this.current === '\t' || this.current === '\r') {
      this.readChar();
    }
  }

  /**
   * Skip single-line comment
   */
  private skipComment(): void {
    // Skip //
    this.readChar();
    this.readChar();

    // Read until newline
    while (this.current !== '\n' && this.current !== '\0') {
      this.readChar();
    }
  }

  /**
   * Skip multi-line comment
   */
  private skipMultiLineComment(): void {
    // Skip /*
    this.readChar();
    this.readChar();

    while (true) {
      if (this.current === '\0') {
        break;
      }

      if (this.current === '\n') {
        this.line++;
        this.column = 0;
      }

      if (this.current === '*' && this.peekChar() === '/') {
        this.readChar(); // *
        this.readChar(); // /
        break;
      }

      this.readChar();
    }
  }

  /**
   * Read identifier or keyword
   */
  private readIdentifier(): string {
    const start = this.position - 1;
    while (this.isIdentifierChar(this.current)) {
      this.readChar();
    }
    return this.input.substring(start, this.position - 1);
  }

  /**
   * Read number
   */
  private readNumber(): string {
    const start = this.position - 1;

    // Integer part
    while (this.isDigit(this.current)) {
      this.readChar();
    }

    // Decimal part
    if (this.current === '.' && this.isDigit(this.peekChar())) {
      this.readChar(); // .
      while (this.isDigit(this.current)) {
        this.readChar();
      }
    }

    // Exponent
    if (this.current === 'e' || this.current === 'E') {
      this.readChar();
      const sign: string = this.current;
      if (sign === '+' || sign === '-') {
        this.readChar();
      }
      while (this.isDigit(this.current)) {
        this.readChar();
      }
    }

    return this.input.substring(start, this.position - 1);
  }

  /**
   * Read string literal
   */
  private readString(): string {
    const quote = this.current;
    this.readChar(); // skip opening quote

    let result = '';
    while (this.current !== quote && this.current !== '\0') {
      if (this.current === '\\') {
        this.readChar();
        // Handle escape sequences
        const escapeChar: string = this.current;
        switch (escapeChar) {
          case 'n': result += '\n'; break;
          case 't': result += '\t'; break;
          case 'r': result += '\r'; break;
          case '\\': result += '\\'; break;
          case quote: result += quote; break;
          case '0': result += '\0'; break;
          default: result += escapeChar;
        }
      } else {
        result += this.current;
      }
      this.readChar();
    }

    if (this.current === quote) {
      this.readChar(); // skip closing quote
    }

    return result;
  }

  /**
   * Read char literal (single character in single quotes)
   */
  private readChar_Literal(): string {
    this.readChar(); // skip opening quote

    let result = '';
    if (this.current === '\\') {
      this.readChar();
      // Handle escape sequences
      const escapeChar: string = this.current;
      switch (escapeChar) {
        case 'n': result = '\n'; break;
        case 't': result = '\t'; break;
        case 'r': result = '\r'; break;
        case '\\': result = '\\'; break;
        case "'": result = "'"; break;
        case '0': result = '\0'; break;
        default: result = escapeChar;
      }
      this.readChar();
    } else {
      result = this.current;
      this.readChar();
    }

    if (this.current === "'") {
      this.readChar(); // skip closing quote
    }

    return result;
  }

  /**
   * Read regex literal: /pattern/flags
   *
   * Regex 형식:
   * - /pattern/flags 형식
   * - pattern: 정규표현식 패턴
   * - flags: g(global), i(ignore case), m(multiline) 등 선택적
   *
   * 예: /[0-9]+/g, /test/i, /^hello$/
   */
  private readRegex(): string {
    this.readChar(); // skip opening /

    let pattern = '';
    while (this.current !== '/' && this.current !== '\0') {
      if (this.current === '\\') {
        pattern += this.current;
        this.readChar();
        if (this.position < this.input.length) {
          pattern += this.current;
          this.readChar();
        }
      } else {
        pattern += this.current;
        this.readChar();
      }
    }

    if (this.current === '/') {
      this.readChar(); // skip closing /
    }

    // Read flags (g, i, m, s, u, y, etc.)
    let flags = '';
    while (this.isLetter(this.current)) {
      flags += this.current;
      this.readChar();
    }

    // Return pattern/flags combined
    return pattern + (flags ? '/' + flags : '');
  }

  /**
   * Check if character is letter or underscore
   */
  private isLetter(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
  }

  /**
   * Check if character is digit
   */
  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  /**
   * Check if character can be part of identifier
   */
  private isIdentifierChar(ch: string): boolean {
    return this.isLetter(ch) || this.isDigit(ch);
  }

  /**
   * Create token and track last token type
   */
  private makeToken(type: TokenType, value: string): Token {
    this.lastTokenType = type;
    return {
      type,
      value,
      line: this.line,
      column: this.column - value.length
    };
  }

  /**
   * Check if regex literal can appear in current context
   * Regex can follow: =, (, [, {, return, throw, :, ,, ;, &&, ||, !, ?, etc.
   */
  private isRegexContext(): boolean {
    // Regex can appear at start or after certain token types
    switch (this.lastTokenType) {
      // After assignment/operators
      case TokenType.ASSIGN:
      case TokenType.PLUS_ASSIGN:
      case TokenType.MINUS_ASSIGN:
      case TokenType.STAR_ASSIGN:
      case TokenType.SLASH_ASSIGN:
      case TokenType.PERCENT_ASSIGN:
      // After delimiters
      case TokenType.LPAREN:
      case TokenType.LBRACKET:
      case TokenType.LBRACE:
      case TokenType.COMMA:
      case TokenType.SEMICOLON:
      case TokenType.COLON:
      // After keywords
      case TokenType.RETURN:
      case TokenType.THROW:
      case TokenType.IF:
      case TokenType.WHILE:
      case TokenType.FOR:
      // After logical operators
      case TokenType.AND:
      case TokenType.OR:
      case TokenType.NOT:
      // After comparison operators
      case TokenType.EQ:
      case TokenType.NE:
      case TokenType.LT:
      case TokenType.GT:
      case TokenType.LE:
      case TokenType.GE:
      // At start
      case TokenType.EOF:
      // After keywords that accept expression
      case TokenType.LET:
      case TokenType.CONST:
        return true;
      default:
        return false;
    }
  }

  /**
   * Get next token
   */
  public nextToken(): Token {
    this.skipWhitespace();

    // Handle newline
    if (this.current === '\n') {
      const token = this.makeToken(TokenType.NEWLINE, '\\n');
      this.readChar();
      this.line++;
      this.column = 1;
      return token;
    }

    // Handle comments
    if (this.current === '/' && this.peekChar() === '/') {
      this.skipComment();
      return this.nextToken();
    }

    if (this.current === '/' && this.peekChar() === '*') {
      this.skipMultiLineComment();
      return this.nextToken();
    }

    // Handle regex literals: /pattern/flags
    // Regex can appear after: =, (, [, {, return, throw, :, ,, ;, &&, ||, !, ?, etc.
    if (this.current === '/' && this.isRegexContext()) {
      const value = this.readRegex();
      const token = this.makeToken(TokenType.REGEX, value);
      this.lastTokenType = TokenType.REGEX;
      return token;
    }

    // EOF
    if (this.current === '\0') {
      return this.makeToken(TokenType.EOF, '');
    }

    // String (double quotes)
    if (this.current === '"') {
      const value = this.readString();
      return this.makeToken(TokenType.STRING, value);
    }

    // Char literal (single quotes)
    if (this.current === "'") {
      const value = this.readChar_Literal();
      return this.makeToken(TokenType.CHAR, value);
    }

    // Number
    if (this.isDigit(this.current)) {
      const value = this.readNumber();
      return this.makeToken(TokenType.NUMBER, value);
    }

    // Identifier or Keyword
    if (this.isLetter(this.current)) {
      const value = this.readIdentifier();
      const type = getKeyword(value);
      return this.makeToken(type, value);
    }

    // Two-character operators
    const twoChar = this.current + this.peekChar();
    switch (twoChar) {
      case '==':
        this.readChar(); this.readChar();
        return this.makeToken(TokenType.EQ, '==');
      case '!=':
        this.readChar(); this.readChar();
        return this.makeToken(TokenType.NE, '!=');
      case '<=':
        this.readChar(); this.readChar();
        return this.makeToken(TokenType.LE, '<=');
      case '>=':
        this.readChar(); this.readChar();
        return this.makeToken(TokenType.GE, '>=');
      case '&&':
        this.readChar(); this.readChar();
        return this.makeToken(TokenType.AND, '&&');
      case '||':
        this.readChar(); this.readChar();
        return this.makeToken(TokenType.OR, '||');
      case '<<':
        this.readChar(); this.readChar();
        return this.makeToken(TokenType.SHL, '<<');
      case '>>':
        this.readChar(); this.readChar();
        return this.makeToken(TokenType.SHR, '>>');
      case '+=':
        this.readChar(); this.readChar();
        return this.makeToken(TokenType.PLUS_ASSIGN, '+=');
      case '-=':
        this.readChar(); this.readChar();
        return this.makeToken(TokenType.MINUS_ASSIGN, '-=');
      case '*=':
        this.readChar(); this.readChar();
        return this.makeToken(TokenType.STAR_ASSIGN, '*=');
      case '/=':
        this.readChar(); this.readChar();
        return this.makeToken(TokenType.SLASH_ASSIGN, '/=');
      case '%=':
        this.readChar(); this.readChar();
        return this.makeToken(TokenType.PERCENT_ASSIGN, '%=');
      case '->':
        this.readChar(); this.readChar();
        return this.makeToken(TokenType.ARROW, '->');
      case '=>':
        this.readChar(); this.readChar();
        return this.makeToken(TokenType.FAT_ARROW, '=>');
      case '::':
        this.readChar(); this.readChar();
        return this.makeToken(TokenType.COLON_COLON, '::');
      case '**':
        this.readChar(); this.readChar();
        return this.makeToken(TokenType.POWER, '**');
      case '..':
        this.readChar(); this.readChar();
        if (this.current === '=') {
          this.readChar();
          return this.makeToken(TokenType.RANGE_INC, '..=');
        }
        return this.makeToken(TokenType.RANGE, '..');
      case '|>':
        this.readChar(); this.readChar();
        return this.makeToken(TokenType.PIPE_GT, '|>');
    }

    // Single-character tokens
    const ch = this.current;
    this.readChar();

    switch (ch) {
      case '+': return this.makeToken(TokenType.PLUS, '+');
      case '-': return this.makeToken(TokenType.MINUS, '-');
      case '*': return this.makeToken(TokenType.STAR, '*');
      case '/': return this.makeToken(TokenType.SLASH, '/');
      case '%': return this.makeToken(TokenType.PERCENT, '%');
      case '<': return this.makeToken(TokenType.LT, '<');
      case '>': return this.makeToken(TokenType.GT, '>');
      case '!': return this.makeToken(TokenType.NOT, '!');
      case '&': return this.makeToken(TokenType.BIT_AND, '&');
      case '|': return this.makeToken(TokenType.BIT_OR, '|');
      case '^': return this.makeToken(TokenType.BIT_XOR, '^');
      case '~': return this.makeToken(TokenType.BIT_NOT, '~');
      case '=': return this.makeToken(TokenType.ASSIGN, '=');
      case '.': return this.makeToken(TokenType.DOT, '.');
      case '?': return this.makeToken(TokenType.QUESTION, '?');
      case '(': return this.makeToken(TokenType.LPAREN, '(');
      case ')': return this.makeToken(TokenType.RPAREN, ')');
      case '[': return this.makeToken(TokenType.LBRACKET, '[');
      case ']': return this.makeToken(TokenType.RBRACKET, ']');
      case '{': return this.makeToken(TokenType.LBRACE, '{');
      case '}': return this.makeToken(TokenType.RBRACE, '}');
      case ',': return this.makeToken(TokenType.COMMA, ',');
      case ';': return this.makeToken(TokenType.SEMICOLON, ';');
      case ':': return this.makeToken(TokenType.COLON, ':');
      case '@': return this.makeToken(TokenType.AT, '@');
      case '#': return this.makeToken(TokenType.HASH, '#');
      default:
        return this.makeToken(TokenType.ILLEGAL, ch);
    }
  }

  /**
   * Tokenize entire input
   */
  public tokenize(): Token[] {
    const tokens: Token[] = [];
    let token = this.nextToken();

    while (token.type !== TokenType.EOF) {
      // Skip newlines for now (can be significant later)
      if (token.type !== TokenType.NEWLINE) {
        tokens.push(token);
      }
      token = this.nextToken();
    }

    tokens.push(token); // Add EOF
    return tokens;
  }

  /**
   * Tokenize with newlines preserved
   *
   * Used by Phase 1 StatementParser for semicolon-optional parsing
   * Newlines are significant as statement terminators
   */
  public tokenizeWithNewlines(): Token[] {
    const tokens: Token[] = [];
    let token = this.nextToken();

    while (token.type !== TokenType.EOF) {
      // Keep all tokens including NEWLINE
      tokens.push(token);
      token = this.nextToken();
    }

    tokens.push(token); // Add EOF
    return tokens;
  }

  /**
   * Self-Formatting Compiler: Trivia-Tracking 토크나이저
   *
   * 주석(// ..., /* ... *\/)과 빈 줄을 버리지 않고 TriviaToken으로 반환.
   * pretty-printer가 AST를 역직렬화할 때 원본 주석을 재삽입하는 데 사용됨.
   *
   * 반환 타입: TriviaToken[]
   *   - kind: 'code'    → 일반 토큰
   *   - kind: 'comment' → 라인/블록 주석 원문
   *   - kind: 'blank'   → 빈 줄 (연속된 \n 묶음)
   */
  public tokenizeWithTrivia(): TriviaToken[] {
    const result: TriviaToken[] = [];

    while (true) {
      // 공백(스페이스/탭/CR)은 건너뜀 - 라인 기준만 보존
      while (this.current === ' ' || this.current === '\t' || this.current === '\r') {
        this.readChar();
      }

      // 빈 줄 수집 (연속 \n → blank trivia)
      if (this.current === '\n') {
        let blanks = 0;
        while (this.current === '\n') {
          blanks++;
          this.readChar();
          this.line++;
          this.column = 1;
        }
        if (blanks > 1) {
          // 2개 이상 연속 \n = 의미 있는 빈 줄 구분자
          result.push({ kind: 'blank', text: '\n'.repeat(blanks - 1), line: this.line, column: 1 });
        }
        continue;
      }

      // 라인 주석 // ... → comment trivia
      if ((this.current as string) === '/' && this.peekChar() === '/') {
        const startLine = this.line;
        let text = '';
        this.readChar(); this.readChar(); // skip //
        while ((this.current as string) !== '\n' && (this.current as string) !== '\0') {
          text += this.current;
          this.readChar();
        }
        result.push({ kind: 'comment', text: '//' + text, line: startLine, column: 1 });
        continue;
      }

      // 블록 주석 /* ... */ → comment trivia
      if ((this.current as string) === '/' && this.peekChar() === '*') {
        const startLine = this.line;
        let text = '/*';
        this.readChar(); this.readChar(); // skip /*
        while (!((this.current as string) === '*' && this.peekChar() === '/') && (this.current as string) !== '\0') {
          if ((this.current as string) === '\n') { this.line++; this.column = 0; }
          text += this.current;
          this.readChar();
        }
        if ((this.current as string) !== '\0') {
          this.readChar(); this.readChar(); // skip */
          text += '*/';
        }
        result.push({ kind: 'comment', text, line: startLine, column: 1 });
        continue;
      }

      // EOF
      if (this.current === '\0') {
        result.push({ kind: 'code', token: this.makeToken(TokenType.EOF, ''), line: this.line, column: this.column });
        break;
      }

      // 일반 코드 토큰 (nextToken 로직 재호출 대신 직접 추출)
      const tok = this.nextToken();
      if (tok.type === TokenType.NEWLINE) continue; // nextToken 내부에서 나온 newline 무시
      result.push({ kind: 'code', token: tok, line: tok.line, column: tok.column });

      if (tok.type === TokenType.EOF) break;
    }

    return result;
  }
}

/**
 * Self-Formatting Compiler: Trivia Token
 *
 * - kind='code'    : 일반 코드 토큰 (token 필드 있음)
 * - kind='comment' : 주석 원문 (text 필드)
 * - kind='blank'   : 빈 줄 구분자 (text = '\n' 반복)
 */
export interface TriviaToken {
  kind: 'code' | 'comment' | 'blank';
  token?: Token;   // kind='code' 일 때
  text?: string;   // kind='comment'|'blank' 일 때
  line: number;
  column: number;
}

/**
 * TokenBuffer - 메모리 효율적인 토큰 관리
 *
 * 문제: Parser가 모든 토큰을 메모리에 저장 (대용량 파일에서 O(n) 메모리)
 * 해결: 최근 토큰만 버퍼에 유지 (O(1) 메모리)
 *
 * 특징:
 * - 지연(lazy) 토큰 생성: 필요할 때만 렉서에서 가져옴
 * - 순환 버퍼: 오래된 토큰은 자동 제거
 * - API: current(), peek(offset), advance() - Parser와 호환
 */
export class TokenBuffer {
  private buffer: Token[] = [];
  private position: number = 0;
  private readonly BUFFER_SIZE = 100; // 최대 100개 토큰 유지
  private readonly CLEANUP_THRESHOLD = this.BUFFER_SIZE / 2; // 50% 도달 시 정리
  private lexer: Lexer;
  private isEOF: boolean = false;
  private preserveNewlines: boolean = false;

  constructor(lexer: Lexer, options?: { preserveNewlines?: boolean }) {
    this.lexer = lexer;
    this.preserveNewlines = options?.preserveNewlines ?? false;
    if (this.preserveNewlines) {
      this.fillBufferWithNewlines();
    } else {
      this.fillBuffer();
    }
  }

  /**
   * 버퍼를 BUFFER_SIZE까지 채우기
   *
   * 특별 처리: SHR (>>) 토큰을 2개의 GT (>) 토큰으로 분해
   * 이유: nested generics (array<array<number>>) 파싱을 위해
   * >> 를 generic close >> 로 해석하는 대신 > > 로 분해
   */
  private fillBuffer(): void {
    while (this.buffer.length < this.BUFFER_SIZE && !this.isEOF) {
      const token = this.lexer.nextToken();

      // NEWLINE 스킵 (Parser의 기존 동작과 동일)
      if (token.type !== TokenType.NEWLINE) {
        // SHR (>>) 토큰을 GT 두 개로 분해 (nested generics 지원)
        if (token.type === TokenType.SHR) {
          // SHR >> 를 GT > 두 개로 분해
          this.buffer.push({
            type: TokenType.GT,
            value: '>',
            line: token.line,
            column: token.column,
          });
          this.buffer.push({
            type: TokenType.GT,
            value: '>',
            line: token.line,
            column: token.column + 1,
          });
        } else {
          this.buffer.push(token);
        }
      }

      if (token.type === TokenType.EOF) {
        this.isEOF = true;
      }
    }
  }

  /**
   * fillBuffer with newlines preserved
   * Used for StatementParser (Phase 1) where newlines are statement terminators
   */
  private fillBufferWithNewlines(): void {
    while (this.buffer.length < this.BUFFER_SIZE && !this.isEOF) {
      const token = this.lexer.nextToken();

      // Keep all tokens including NEWLINE
      // SHR (>>) 토큰을 GT 두 개로 분해 (nested generics 지원)
      if (token.type === TokenType.SHR) {
        // SHR >> 를 GT > 두 개로 분해
        this.buffer.push({
          type: TokenType.GT,
          value: '>',
          line: token.line,
          column: token.column,
        });
        this.buffer.push({
          type: TokenType.GT,
          value: '>',
          line: token.line,
          column: token.column + 1,
        });
      } else {
        this.buffer.push(token);
      }

      if (token.type === TokenType.EOF) {
        this.isEOF = true;
      }
    }
  }

  /**
   * 현재 토큰 반환
   */
  current(): Token {
    if (this.position >= this.buffer.length) {
      return this.buffer[this.buffer.length - 1]; // EOF
    }
    return this.buffer[this.position];
  }

  /**
   * Offset만큼 떨어진 토큰 반환 (1 = next, 2 = next-next, etc)
   */
  peek(offset: number = 1): Token {
    const targetIdx = this.position + offset;

    // 필요한 토큰이 버퍼에 없으면 채우기
    while (this.buffer.length <= targetIdx && !this.isEOF) {
      if (this.preserveNewlines) {
        this.fillBufferWithNewlines();
      } else {
        this.fillBuffer();
      }
    }

    if (targetIdx >= this.buffer.length) {
      return this.buffer[this.buffer.length - 1]; // EOF
    }

    return this.buffer[targetIdx];
  }

  /**
   * 다음 토큰으로 이동
   */
  advance(): Token {
    const currentToken = this.current();
    this.position++;

    // 메모리 정리: position이 threshold를 넘으면 오래된 토큰 제거
    if (this.position > this.CLEANUP_THRESHOLD) {
      const removeCount = Math.floor(this.CLEANUP_THRESHOLD / 2);
      this.buffer.splice(0, removeCount);
      this.position -= removeCount;

      // 버퍼 다시 채우기
      if (this.preserveNewlines) {
        this.fillBufferWithNewlines();
      } else {
        this.fillBuffer();
      }
    }

    return currentToken;
  }

  /**
   * 남은 토큰 개수 (대략)
   */
  remaining(): number {
    return Math.max(0, this.buffer.length - this.position);
  }

  /**
   * 현재 위치의 토큰 유형 확인
   */
  check(type: TokenType): boolean {
    return this.current().type === type;
  }

  /**
   * 다음 토큰의 유형 확인
   */
  checkPeek(type: TokenType): boolean {
    return this.peek(1).type === type;
  }

  /**
   * EOF 도달 여부
   */
  isAtEOF(): boolean {
    return this.current().type === TokenType.EOF;
  }

  /**
   * 메모리 사용량 추정 (디버깅용)
   */
  memoryUsage(): { bufferSize: number; position: number; remaining: number } {
    return {
      bufferSize: this.buffer.length,
      position: this.position,
      remaining: this.remaining()
    };
  }
}
