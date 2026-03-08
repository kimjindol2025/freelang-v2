/**
 * FreeLang Compiler
 * 소스코드 → AST → 바이트코드 변환
 */

import { ISAGenerator, Program, Assignment, BinaryOp, NumberLiteral } from './isa-generator';

/**
 * 간단한 Lexer (토큰화)
 */
class Lexer {
  private source: string;
  private position: number = 0;

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.position < this.source.length) {
      this.skipWhitespace();

      if (this.position >= this.source.length) break;

      const ch = this.source[this.position];

      // 숫자
      if (this.isDigit(ch)) {
        tokens.push(this.readNumber());
      }
      // 식별자/키워드
      else if (this.isLetter(ch)) {
        tokens.push(this.readIdentifier());
      }
      // 연산자
      else if (ch === '+') {
        tokens.push({ type: 'PLUS', value: '+' });
        this.position++;
      } else if (ch === '-') {
        tokens.push({ type: 'MINUS', value: '-' });
        this.position++;
      } else if (ch === '*') {
        tokens.push({ type: 'MUL', value: '*' });
        this.position++;
      } else if (ch === '/') {
        tokens.push({ type: 'DIV', value: '/' });
        this.position++;
      } else if (ch === '=') {
        tokens.push({ type: 'ASSIGN', value: '=' });
        this.position++;
      } else if (ch === '(') {
        tokens.push({ type: 'LPAREN', value: '(' });
        this.position++;
      } else if (ch === ')') {
        tokens.push({ type: 'RPAREN', value: ')' });
        this.position++;
      } else if (ch === '{') {
        tokens.push({ type: 'LBRACE', value: '{' });
        this.position++;
      } else if (ch === '}') {
        tokens.push({ type: 'RBRACE', value: '}' });
        this.position++;
      } else if (ch === ';') {
        tokens.push({ type: 'SEMICOLON', value: ';' });
        this.position++;
      } else {
        this.position++;
      }
    }

    tokens.push({ type: 'EOF', value: '' });
    return tokens;
  }

  private skipWhitespace(): void {
    while (
      this.position < this.source.length &&
      /\s/.test(this.source[this.position])
    ) {
      this.position++;
    }
  }

  private isDigit(ch: string): boolean {
    return /\d/.test(ch);
  }

  private isLetter(ch: string): boolean {
    return /[a-zA-Z_]/.test(ch);
  }

  private readNumber(): Token {
    let value = '';
    while (
      this.position < this.source.length &&
      this.isDigit(this.source[this.position])
    ) {
      value += this.source[this.position];
      this.position++;
    }
    return { type: 'NUMBER', value: parseInt(value) };
  }

  private readIdentifier(): Token {
    let value = '';
    while (
      this.position < this.source.length &&
      (this.isLetter(this.source[this.position]) ||
        this.isDigit(this.source[this.position]))
    ) {
      value += this.source[this.position];
      this.position++;
    }
    return { type: 'IDENTIFIER', value };
  }
}

interface Token {
  type: string;
  value: any;
}

/**
 * 간단한 Parser (구문 분석)
 */
class Parser {
  private tokens: Token[];
  private position: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Program {
    const statements: any[] = [];

    while (!this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
    }

    return { type: 'Program', statements };
  }

  private parseStatement(): any {
    if (this.match('LBRACE')) {
      return this.parseBlock();
    }

    const expr = this.parseExpression();

    if (this.match('ASSIGN')) {
      const value = this.parseExpression();
      this.match('SEMICOLON');
      return { type: 'Assignment', target: expr.name || expr.value, value };
    }

    this.match('SEMICOLON');
    return expr;
  }

  private parseBlock(): any {
    const statements: any[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
    }
    this.match('RBRACE');
    return { type: 'Block', statements };
  }

  private parseExpression(): any {
    return this.parseAdditive();
  }

  private parseAdditive(): any {
    let expr = this.parseMultiplicative();

    while (this.match('PLUS', 'MINUS')) {
      const op = this.previous().value;
      const right = this.parseMultiplicative();
      expr = { type: 'BinaryOp', op, left: expr, right };
    }

    return expr;
  }

  private parseMultiplicative(): any {
    let expr = this.parsePrimary();

    while (this.match('MUL', 'DIV')) {
      const op = this.previous().value;
      const right = this.parsePrimary();
      expr = { type: 'BinaryOp', op, left: expr, right };
    }

    return expr;
  }

  private parsePrimary(): any {
    if (this.match('NUMBER')) {
      return { type: 'NumberLiteral', value: this.previous().value };
    }

    if (this.match('IDENTIFIER')) {
      const name = this.previous().value;
      if (this.match('LPAREN')) {
        // 함수 호출
        const args: any[] = [];
        while (!this.check('RPAREN') && !this.isAtEnd()) {
          args.push(this.parseExpression());
          if (!this.check('RPAREN')) this.match('COMMA');
        }
        this.match('RPAREN');
        return { type: 'FunctionCall', name, args };
      }
      return { type: 'Identifier', name };
    }

    if (this.match('LPAREN')) {
      const expr = this.parseExpression();
      this.match('RPAREN');
      return expr;
    }

    throw new Error(`Unexpected token: ${this.peek().type}`);
  }

  private match(...types: string[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: string): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.position++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private peek(): Token {
    return this.tokens[this.position];
  }

  private previous(): Token {
    return this.tokens[this.position - 1];
  }
}

/**
 * 전체 Compiler 클래스
 */
export class Compiler {
  /**
   * 소스코드를 바이트코드로 컴파일
   */
  static compile(source: string): number[] {
    // Step 1: Lexer (토큰화)
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    // Step 2: Parser (AST 생성)
    const parser = new Parser(tokens);
    const ast = parser.parse() as Program;

    // Step 3: ISA Generator (바이트코드 생성)
    const generator = new ISAGenerator();
    const bytecode = generator.generate(ast);

    return bytecode;
  }
}

// Export
export { Lexer, Parser, ISAGenerator };
