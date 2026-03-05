/**
 * FreeLang v2 Phase 5 - Minimal Parser
 *
 * .free 파일 형식의 함수 선언만 파싱
 *
 * Phase 5 Task 1: One-line format (줄바꿈 생략)
 * Phase 5 Task 2: Type omission (타입 추론)
 * Phase 5 Task 3: Colon optional (콜론 제거 가능) ← NEW
 *
 * 지원 형식:
 *   [@minimal]                              <- optional decorator
 *   fn <name>
 *   input [: ] <type>                       <- 콜론 선택적
 *   output [: ] <type>                      <- 콜론 선택적
 *   [intent [: ] "<string>"]                <- 콜론 선택적
 *
 * 예시 (Task 3):
 *   @minimal
 *   fn sum
 *   input: array<number>
 *   output: number
 *   intent: "배열 합산"
 *
 *   fn sum
 *   input array<number>
 *   output number
 *   intent "배열 합산"
 *
 *   fn sum input array<number> output number intent "배열 합산"
 */
import { Token, TokenType } from '../lexer/token';
import { TokenBuffer } from '../lexer/lexer';
import {
  MinimalFunctionAST,
  ParseError,
  Expression,
  Pattern,
  MatchExpression,
  MatchArm,
  IdentifierExpression,
  LiteralExpression,
  BinaryOpExpression,
  CallExpression,
  ArrayExpression,
  LambdaExpression,  // Phase 3 Step 3: Lambda expressions
  AwaitExpression,   // Phase J: async/await support
  LiteralPattern,
  VariablePattern,
  WildcardPattern,
  StructPattern,
  ArrayPattern,
  Statement,
  ExpressionStatement,
  VariableDeclaration,
  IfStatement,
  ForStatement,
  ForOfStatement,  // Phase 2: for...of loop support
  WhileStatement,
  ReturnStatement,
  BlockStatement,
  Parameter,  // Phase 3 Step 3: Lambda parameters
  ImportStatement,  // Phase 4 Step 2: Module System
  ImportSpecifier,  // Phase 4 Step 2: Module System
  ExportStatement,  // Phase 4 Step 2: Module System
  FunctionStatement,  // Phase 4 Step 2: Function exports
  Module,  // Phase 1: Full program parsing
  TryStatement,  // Phase I: Exception Handling
  CatchClause,   // Phase I: Exception Handling
  ThrowStatement,  // Phase I: Exception Handling
  StructDeclaration,  // Phase 16: Struct support
  EnumDeclaration,    // Phase 16: Enum support
  BreakStatement,     // Phase 16: Break support
  ContinueStatement   // Phase 16: Continue support
} from './ast';

/**
 * Minimal Parser - .free 파일 형식만 파싱
 *
 * Performance Optimizations (Phase C):
 * 1. Operator precedence cache (95%+ hit rate)
 * 2. Token lookahead buffer (current + next cached)
 * 3. AST node pool for allocation reuse
 */
export class Parser {
  private tokens: TokenBuffer;

  // Performance optimization: operator precedence cache
  private precedenceCache = new Map<string, number>();
  private cachedOperators: Set<string> = new Set([
    '||', '&&', '|', '^', '&',
    '==', '!=', '<', '>', '<=', '>=',
    '<<', '>>',
    '+', '-',
    '*', '/', '%'
  ]);

  // Performance optimization: lookahead buffer
  private lookaheadCurrent: Token | null = null;
  private lookaheadNext: Token | null = null;

  // Performance optimization: AST node pool
  private nodePool: any[] = [];
  private poolIndex = 0;
  private readonly POOL_SIZE = 10000;

  constructor(tokens: TokenBuffer) {
    this.tokens = tokens;
    this.initializePrecedenceCache();
    this.initializeNodePool();
  }

  /**
   * Initialize precedence cache with common operators
   */
  private initializePrecedenceCache(): void {
    // Logical operators
    this.precedenceCache.set('||', 1);
    this.precedenceCache.set('&&', 2);

    // Bitwise operators
    this.precedenceCache.set('|', 3);
    this.precedenceCache.set('^', 4);
    this.precedenceCache.set('&', 5);

    // Comparison operators
    this.precedenceCache.set('==', 6);
    this.precedenceCache.set('!=', 6);
    this.precedenceCache.set('<', 7);
    this.precedenceCache.set('>', 7);
    this.precedenceCache.set('<=', 7);
    this.precedenceCache.set('>=', 7);

    // Shift operators
    this.precedenceCache.set('<<', 8);
    this.precedenceCache.set('>>', 8);

    // Additive
    this.precedenceCache.set('+', 9);
    this.precedenceCache.set('-', 9);

    // Multiplicative
    this.precedenceCache.set('*', 10);
    this.precedenceCache.set('/', 10);
    this.precedenceCache.set('%', 10);
  }

  /**
   * Initialize AST node pool for memory reuse
   */
  private initializeNodePool(): void {
    for (let i = 0; i < this.POOL_SIZE; i++) {
      this.nodePool.push({
        type: '',
        value: undefined,
        children: [],
        operator: '',
        left: null,
        right: null,
        target: null,
        body: null,
        test: null,
        consequent: null,
        alternate: null,
        params: [],
        returnType: undefined,
        import: null,
        arguments: []
      });
    }
  }

  /**
   * Get operator precedence from cache
   */
  private getOperatorPrecedence(op: string): number {
    return this.precedenceCache.get(op) ?? 0;
  }

  /**
   * Allocate AST node from pool
   */
  private allocateNode(type: string): any {
    if (this.poolIndex >= this.nodePool.length) {
      // Pool exhausted, create new node
      return { type };
    }
    const node = this.nodePool[this.poolIndex];
    node.type = type;
    this.poolIndex++;
    return node;
  }

  /**
   * Reset node pool for next parse
   */
  private resetNodePool(): void {
    this.poolIndex = 0;
  }

  /**
   * 현재 토큰 반환 (캐시된 lookahead 활용)
   */
  private current(): Token {
    if (this.lookaheadCurrent === null) {
      this.lookaheadCurrent = this.tokens.current();
    }
    return this.lookaheadCurrent;
  }

  /**
   * 다음 토큰 반환 (캐시된 lookahead 활용)
   */
  private peek(offset: number = 1): Token {
    if (offset === 1) {
      if (this.lookaheadNext === null) {
        this.lookaheadNext = this.tokens.peek(1);
      }
      return this.lookaheadNext;
    }
    return this.tokens.peek(offset);
  }

  /**
   * 다음 토큰으로 이동 (lookahead 버퍼 업데이트)
   */
  private advance(): Token {
    const prev = this.current();
    this.tokens.advance();
    // 버퍼 슬라이드
    this.lookaheadCurrent = this.lookaheadNext;
    this.lookaheadNext = null; // 다음 peek에서 새로 로드
    return prev;
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
   * Phase 5 Stage 3: Detect function structure
   *
   * Heuristic: Current IDENT followed by input/output types → function
   * Used when 'fn' keyword is omitted
   *
   * Uses lookahead (peek) instead of backtracking since TokenBuffer
   * doesn't support seeking. Pattern detection:
   *   - IDENT (current, name)
   *   - INPUT or type-like IDENT (peek 1)
   *
   * Examples:
   *   - sum input array<number> → true (name + INPUT keyword)
   *   - calculate array number → true (name + type patterns)
   *   - process do { ... } → false (body immediately after name)
   */
  private detectFunctionStructure(): boolean {
    // Must start with IDENT (function name)
    if (!this.check(TokenType.IDENT)) {
      return false;
    }

    // Look ahead to see if this looks like a function signature
    const nextToken = this.peek(1);

    // Pattern 1: IDENT INPUT ... → definitely a function
    if (nextToken.type === TokenType.INPUT) {
      return true;
    }

    // Pattern 2: IDENT OUTPUT ... → possibly function (edge case)
    if (nextToken.type === TokenType.OUTPUT) {
      return true;
    }

    // Pattern 3: IDENT + type-like IDENT
    // Common type names that indicate function signature
    if (nextToken.type === TokenType.IDENT) {
      const nextVal = nextToken.value.toLowerCase();
      const typePatterns = [
        'array',
        'number',
        'string',
        'boolean',
        'bool',
        'int',
        'float',
        'any',
        'unknown'
      ];

      // Check if it looks like a type
      if (typePatterns.some(t => nextVal === t || nextVal.startsWith(t + '<'))) {
        return true;
      }
    }

    // Pattern 4: IDENT LBRACKET ... (array syntax [type])
    if (nextToken.type === TokenType.LBRACKET) {
      return true;
    }

    // Otherwise, doesn't look like a function signature
    return false;
  }

  /**
   * Phase 1: Parse full program as Module
   *
   * Supports general FreeLang programs with:
   * - Multiple function definitions (fn ... { ... })
   * - Variable declarations (let ...)
   * - Control flow (if/while/for)
   * - Import/export statements
   * - Top-level expressions
   *
   * Returns Module with imports, exports, and statements
   */
  public parseModule(): Module {
    // Performance optimization: reset node pool for this parse
    this.resetNodePool();
    this.lookaheadCurrent = null;
    this.lookaheadNext = null;

    const imports: ImportStatement[] = [];
    const exports: ExportStatement[] = [];
    const statements: Statement[] = [];

    // Parse all statements until EOF
    while (!this.check(TokenType.EOF)) {
      try {
        // Phase J: Support async fn at top level
        const curToken = this.current();
        if (process.env.DEBUG_PARSER) {
          console.log(`[PARSER] Current token: type=${curToken.type}, value="${curToken.value}"`);
        }

        // Phase J: Check for async keyword
        let isAsync = false;
        if (this.check(TokenType.ASYNC)) {
          isAsync = true;
          this.advance();
        }

        if (this.check(TokenType.FN)) {
          if (process.env.DEBUG_PARSER) console.log(`[PARSER] Found ${isAsync ? 'ASYNC ' : ''}FN, parsing function declaration`);
          try {
            const fnStmt = this.parseFunctionDeclaration(isAsync);
            statements.push(fnStmt as any);
            if (process.env.DEBUG_PARSER) console.log('[PARSER] Function declaration parsed successfully');
          } catch (fnError) {
            if (process.env.DEBUG_PARSER) console.log('[PARSER] Function declaration error:', fnError instanceof Error ? fnError.message : String(fnError));
            throw fnError;  // Re-throw to be caught by outer catch
          }
          continue;
        } else if (isAsync) {
          // async without fn is an error
          throw new ParseError(curToken.line, curToken.column, 'Expected "fn" after "async"');
        }

        const stmt = this.parseStatement();

        // Separate imports/exports from other statements
        // Check statement type using type field
        if (stmt.type === 'import') {
          imports.push(stmt as ImportStatement);
        } else if (stmt.type === 'export') {
          exports.push(stmt as ExportStatement);
        } else {
          statements.push(stmt);
        }
      } catch (error) {
        // On parse error, skip to next statement or EOF
        if (process.env.DEBUG_PARSER) console.log('[PARSER] Outer catch, error:', error instanceof Error ? error.message : String(error));
        if (this.check(TokenType.EOF)) break;
        this.advance();
      }
    }

    return {
      path: 'program',
      imports,
      exports,
      statements
    };
  }

  /**
   * Phase 2: Parse function declaration at top level
   * Phase J: Support async functions
   *
   * Format: fn name(param1, param2, ...) { ... }
   *         async fn name(param1, param2, ...) { ... }
   */
  private parseFunctionDeclaration(isAsync: boolean = false): FunctionStatement {
    if (process.env.DEBUG_PARSER) console.log(`[parseFnDecl] Starting (async=${isAsync})`);
    this.expect(TokenType.FN);

    // Function name
    const nameToken = this.expect(TokenType.IDENT, 'Expected function name');
    const name = nameToken.value;
    if (process.env.DEBUG_PARSER) console.log(`[parseFnDecl] name=${name}`);

    // Parse type parameters (fn foo<T, U>(param1, param2) { ... })
    let typeParams: string[] = [];
    if (this.check(TokenType.LT)) {
      this.advance(); // consume '<'
      while (!this.check(TokenType.GT) && !this.check(TokenType.EOF)) {
        const paramName = this.expect(TokenType.IDENT, 'Expected type parameter name').value;
        typeParams.push(paramName);
        if (this.check(TokenType.COMMA)) {
          this.advance();
        } else {
          break;
        }
      }
      this.expect(TokenType.GT, 'Expected ">"');
    }

    // Parameters
    this.expect(TokenType.LPAREN, 'Expected ( after function name');
    const params: Parameter[] = [];

    if (!this.check(TokenType.RPAREN)) {
      do {
        const paramName = this.expect(TokenType.IDENT, 'Expected parameter name');
        params.push({
          name: paramName.value,
          paramType: undefined  // Type optional
        });
      } while (this.match(TokenType.COMMA));
    }

    this.expect(TokenType.RPAREN, 'Expected ) after parameters');
    if (process.env.DEBUG_PARSER) console.log(`[parseFnDecl] About to parse body, current=${this.current().type}`);

    // Function body
    const body = this.parseBlockStatement();
    if (process.env.DEBUG_PARSER) console.log(`[parseFnDecl] Body parsed, current=${this.current().type}`);

    return {
      type: 'function',
      name,
      ...(typeParams.length > 0 && { typeParams }),
      params,
      body,
      returnType: undefined,
      async: isAsync  // Phase J: Mark as async
    };
  }

  /**
   * 파일 전체 파싱 (탑 레벨)
   *
   * Phase 5 Stage 3: Support optional 'fn' keyword
   * - If 'fn' present: use traditional parsing
   * - If 'fn' absent but structure matches: parse as function
   * - Otherwise: error
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

    // Phase 5 Stage 3: Optional fn keyword
    if (this.check(TokenType.FN)) {
      // Traditional: fn keyword present
      this.advance();
    } else {
      // New: fn keyword absent - verify function structure
      if (!this.detectFunctionStructure()) {
        throw new ParseError(
          this.current().line,
          this.current().column,
          'Expected "fn" keyword or valid function structure (name + types)'
        );
      }
    }

    // Parse function name
    const nameToken = this.expect(TokenType.IDENT, 'Expected function name');
    const fnName = nameToken.value;

    // Phase 5 Task 5: Parse type parameters (fn foo<T, U>(...))
    let typeParams: string[] = [];
    if (this.check(TokenType.LT)) {
      this.advance(); // consume '<'
      while (!this.check(TokenType.GT) && !this.check(TokenType.EOF)) {
        const paramName = this.expect(TokenType.IDENT, 'Expected type parameter name').value;
        typeParams.push(paramName);
        if (this.check(TokenType.COMMA)) {
          this.advance();
        } else {
          break;
        }
      }
      this.expect(TokenType.GT, 'Expected ">"');
    }

    // Phase 5 Stage 3: Parse input type with optional keyword
    // Support both:
    //   - input: type or input type (keyword present)
    //   - type (keyword absent, positional)
    let inputType: string;
    if (this.check(TokenType.INPUT)) {
      // Traditional: input keyword present
      this.advance();
      this.match(TokenType.COLON); // Colon optional (Phase 5 Task 3)
      inputType = this.parseOptionalType();
    } else {
      // New: input keyword absent, parse type directly
      inputType = this.parseOptionalType();
    }

    // Phase 5 Stage 3: Parse output type with optional keyword
    // Support both:
    //   - output: type or output type (keyword present)
    //   - type (keyword absent, positional)
    let outputType: string;
    if (this.check(TokenType.OUTPUT)) {
      // Traditional: output keyword present
      this.advance();
      this.match(TokenType.COLON); // Colon optional (Phase 5 Task 3)
      outputType = this.parseOptionalType();
    } else {
      // New: output keyword absent, parse type directly
      outputType = this.parseOptionalType();
    }

    // Parse optional intent
    let intent: string | undefined;
    if (this.check(TokenType.INTENT)) {
      this.advance();
      // Phase 5 Task 3: Colon optional
      this.match(TokenType.COLON);
      if (this.check(TokenType.STRING)) {
        intent = this.current().value;
        this.advance();
      } else if (this.check(TokenType.IDENT)) {
        // 문자열 없이 identifier로 나올 수도 있음
        intent = this.current().value;
        this.advance();
      }
    }

    // Phase 5 Task 4: Parse optional function body
    let body: string | undefined;
    if (this.check(TokenType.LBRACE)) {
      body = this.parseBody();
    }

    // Expect EOF (또는 선택적 - 기존 형식도 지원)
    if (this.check(TokenType.EOF)) {
      this.advance();
    }

    return {
      decorator: decorator as 'minimal' | undefined,
      fnName,
      ...(typeParams.length > 0 && { typeParams }),
      inputType,
      outputType,
      intent,
      body
    };
  }

  /**
   * Phase 5 Task 4: 함수 본체 파싱
   *
   * 형식: { ... }
   *
   * 동작:
   *   1. LBRACE 만남 ({)
   *   2. 중괄호 깊이를 추적하며 토큰 수집
   *   3. RBRACE 만남 (})
   *   4. 본체 내용을 문자열로 반환
   *
   * 예시:
   *   { let x = 0; for i in 0..10 { x += i; } return x; }
   */
  private parseBody(): string {
    this.expect(TokenType.LBRACE, 'Expected "{"');

    const bodyTokens: string[] = [];
    let braceDepth = 1; // Opening brace이미 소비했으므로 1부터 시작

    while (braceDepth > 0 && !this.check(TokenType.EOF)) {
      if (this.check(TokenType.LBRACE)) {
        braceDepth++;
        bodyTokens.push('{');
        this.advance();
      } else if (this.check(TokenType.RBRACE)) {
        braceDepth--;
        if (braceDepth > 0) {
          bodyTokens.push('}');
        }
        this.advance();
      } else {
        // 모든 토큰을 문자열로 수집
        const token = this.current();
        bodyTokens.push(token.value || token.type);
        this.advance();
      }
    }

    if (braceDepth !== 0) {
      throw new ParseError(
        this.current().line,
        this.current().column,
        'Unclosed brace in function body'
      );
    }

    return bodyTokens.join(' ').trim();
  }

  /**
   * Phase 15: 표현식 파싱
   *
   * 기본 표현식들:
   *   - match 표현식
   *   - 리터럴 (숫자, 문자열, 불린)
   *   - 식별자
   *   - 함수 호출
   *   - 배열
   *   - 이항 연산
   */
  public parseExpression(): Expression {
    // match 표현식 확인
    if (this.check(TokenType.MATCH)) {
      return this.parseMatch();
    }

    // Assignment 표현식 (=)
    return this.parseAssignment();
  }

  /**
   * Assignment 표현식 파싱 (우측 결합)
   * x = y = z → x = (y = z)
   */
  private parseAssignment(): Expression {
    let left = this.parseComparison();

    if (this.check(TokenType.ASSIGN)) {
      this.advance(); // consume =
      const right = this.parseAssignment(); // 우측 결합
      return {
        type: 'assignment',
        target: left,
        value: right
      } as any;
    }

    return left;
  }

  /**
   * 이항 연산 파싱 (우선순위 순서)
   * 1. Comparison (==, !=, <, >, <=, >=)
   * 2. Additive (+, -)
   * 3. Multiplicative (*, /, %)
   */
  private parseComparison(): Expression {
    let left = this.parseAdditive();

    // 비교 연산자 처리 (==, !=, <, >, <=, >=)
    while (
      this.check(TokenType.EQ) ||
      this.check(TokenType.NE) ||
      this.check(TokenType.LT) ||
      this.check(TokenType.GT) ||
      this.check(TokenType.LE) ||
      this.check(TokenType.GE)
    ) {
      let operator: '==' | '!=' | '>' | '<' | '>=' | '<=' = '==';

      if (this.check(TokenType.EQ)) operator = '==';
      else if (this.check(TokenType.NE)) operator = '!=';
      else if (this.check(TokenType.LT)) operator = '<';
      else if (this.check(TokenType.GT)) operator = '>';
      else if (this.check(TokenType.LE)) operator = '<=';
      else if (this.check(TokenType.GE)) operator = '>=';

      this.advance();
      const right = this.parseAdditive();

      left = {
        type: 'binary',
        operator,
        left,
        right
      } as BinaryOpExpression;
    }

    return left;
  }

  /**
   * 덧셈/뺄셈 파싱 (+, -)
   */
  private parseAdditive(): Expression {
    let left = this.parseMultiplicative();

    while (this.check(TokenType.PLUS) || this.check(TokenType.MINUS)) {
      let operator: '+' | '-' = '+';

      if (this.check(TokenType.PLUS)) operator = '+';
      else if (this.check(TokenType.MINUS)) operator = '-';

      this.advance();
      const right = this.parseMultiplicative();

      left = {
        type: 'binary',
        operator,
        left,
        right
      } as BinaryOpExpression;
    }

    return left;
  }

  /**
   * 곱셈/나눗셈/나머지 파싱 (*, /, %)
   */
  private parseMultiplicative(): Expression {
    let left = this.parsePostfix();

    while (
      this.check(TokenType.STAR) ||
      this.check(TokenType.SLASH) ||
      this.check(TokenType.PERCENT)
    ) {
      let operator: '*' | '/' | '%' = '*';

      if (this.check(TokenType.STAR)) operator = '*';
      else if (this.check(TokenType.SLASH)) operator = '/';
      else if (this.check(TokenType.PERCENT)) operator = '%';

      this.advance();
      const right = this.parsePostfix();

      left = {
        type: 'binary',
        operator,
        left,
        right
      } as BinaryOpExpression;
    }

    return left;
  }

  /**
   * Postfix 연산 파싱: . (member access), [] (array indexing), () (method call)
   */
  private parsePostfix(): Expression {
    let left = this.parsePrimaryExpression();

    // Member access (obj.prop), array indexing (arr[index]), and method calls (obj.method())
    while (this.check(TokenType.DOT) || this.check(TokenType.LBRACKET) || this.check(TokenType.LPAREN)) {
      if (this.check(TokenType.DOT)) {
        this.advance(); // consume .
        const propName = this.expect(TokenType.IDENT, 'Expected property name').value;
        left = {
          type: 'member',
          object: left,
          property: { type: 'identifier', name: propName },
          computed: false
        } as any;

        // Check for method call: obj.method(args)
        if (this.check(TokenType.LPAREN)) {
          this.advance(); // consume (
          const args: Expression[] = [];
          while (!this.check(TokenType.RPAREN) && !this.check(TokenType.EOF)) {
            args.push(this.parseExpression());
            if (this.check(TokenType.COMMA)) {
              this.advance();
            }
          }
          this.expect(TokenType.RPAREN, 'Expected ")"');
          left = {
            type: 'call',
            callee: left,  // MemberExpression as callee
            arguments: args
          } as any;
        }
      } else if (this.check(TokenType.LBRACKET)) {
        this.advance(); // consume [
        const index = this.parseExpression();
        this.expect(TokenType.RBRACKET, 'Expected "]"');
        left = {
          type: 'member',
          object: left,
          property: index,
          computed: true
        } as any;
      } else if (this.check(TokenType.LPAREN) && typeof left === 'object' && (left as any).type === 'identifier') {
        // Regular function call (not method)
        this.advance(); // consume (
        const args: Expression[] = [];
        while (!this.check(TokenType.RPAREN) && !this.check(TokenType.EOF)) {
          args.push(this.parseExpression());
          if (this.check(TokenType.COMMA)) {
            this.advance();
          }
        }
        this.expect(TokenType.RPAREN, 'Expected ")"');
        left = {
          type: 'call',
          callee: (left as any).name,  // Extract function name from identifier
          arguments: args
        } as any;
      } else {
        break;
      }
    }

    return left;
  }

  /**
   * Phase 15: 기본 표현식 파싱
   * (리터럴, 식별자, 배열, 함수 호출)
   */
  private parsePrimaryExpression(): Expression {
    const token = this.current();

    // Phase J: await expression
    if (this.check(TokenType.AWAIT)) {
      this.advance(); // consume 'await'
      const argument = this.parsePrimaryExpression(); // Parse the promise/expression
      return {
        type: 'await',
        argument
      } as AwaitExpression;
    }

    // typeof operator (unary)
    if (token.value === 'typeof') {
      this.advance(); // consume 'typeof'
      const argument = this.parsePrimaryExpression(); // Recursively parse the next primary
      return {
        type: 'unary',
        operator: 'typeof',
        argument
      } as any;
    }

    // 리터럴 (숫자, 문자열, 불린)
    if (this.check(TokenType.NUMBER)) {
      const value = parseFloat(token.value);
      this.advance();
      return {
        type: 'literal',
        value,
        dataType: 'number'
      } as LiteralExpression;
    }

    if (this.check(TokenType.STRING)) {
      const value = token.value;
      this.advance();
      return {
        type: 'literal',
        value,
        dataType: 'string'
      } as LiteralExpression;
    }

    // 불린 리터럴
    if (this.check(TokenType.TRUE) || this.check(TokenType.FALSE)) {
      const value = this.check(TokenType.TRUE);
      this.advance();
      return {
        type: 'literal',
        value,
        dataType: 'bool'
      } as LiteralExpression;
    }

    // null 리터럴
    if (this.check(TokenType.NULL)) {
      this.advance();
      return {
        type: 'literal',
        value: null,
        dataType: 'string'  // 단순 표현용
      } as any;
    }

    // 배열 리터럴 [...]
    if (this.check(TokenType.LBRACKET)) {
      this.advance(); // [
      const elements: Expression[] = [];

      while (!this.check(TokenType.RBRACKET) && !this.check(TokenType.EOF)) {
        elements.push(this.parseExpression());
        if (this.check(TokenType.COMMA)) {
          this.advance();
        }
      }

      this.expect(TokenType.RBRACKET, 'Expected "]"');
      return {
        type: 'array',
        elements
      } as ArrayExpression;
    }

    // 객체 리터럴 {...}
    if (this.check(TokenType.LBRACE)) {
      this.advance(); // {
      const properties: Array<{ key: string; value: Expression }> = [];

      while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
        // Key (string 또는 identifier)
        let key: string;
        if (this.check(TokenType.STRING)) {
          key = this.current().value;
          this.advance();
        } else if (this.check(TokenType.IDENT)) {
          key = this.current().value;
          this.advance();
        } else {
          throw new ParseError(
            this.current().line,
            this.current().column,
            'Expected key in object literal'
          );
        }

        this.expect(TokenType.COLON, 'Expected ":" after key');
        const value = this.parseExpression();
        properties.push({ key, value });

        if (this.check(TokenType.COMMA)) {
          this.advance();
        }
      }

      this.expect(TokenType.RBRACE, 'Expected "}"');
      return {
        type: 'object',
        properties
      } as any;
    }

    // 식별자 또는 함수 호출
    if (this.check(TokenType.IDENT)) {
      const name = token.value;
      this.advance();

      // 함수 호출 (...)
      if (this.check(TokenType.LPAREN)) {
        this.advance(); // (
        const args: Expression[] = [];

        while (!this.check(TokenType.RPAREN) && !this.check(TokenType.EOF)) {
          args.push(this.parseExpression());
          if (this.check(TokenType.COMMA)) {
            this.advance();
          }
        }

        this.expect(TokenType.RPAREN, 'Expected ")"');
        return {
          type: 'call',
          callee: name,
          arguments: args
        } as CallExpression;
      }

      // 단순 식별자
      return {
        type: 'identifier',
        name
      } as IdentifierExpression;
    }

    // 괄호 표현식 (expression in parentheses)
    // Format: (expr) or (5) or (val + 2)
    if (this.check(TokenType.LPAREN)) {
      this.advance(); // consume (
      const expr = this.parseExpression();
      this.expect(TokenType.RPAREN, 'Expected ")" after expression');
      return expr;
    }

    // Phase 3 Step 3: Lambda Expression
    // Format: fn(param1: type1, param2: type2) -> returnType -> body
    // or: fn(param1, param2) -> body
    if (this.check(TokenType.FN)) {
      return this.parseLambda();
    }

    throw new ParseError(
      token.line,
      token.column,
      `Unexpected token in expression: ${token.type}`
    );
  }

  /**
   * Phase 3 Step 3: Parse lambda expression
   * Format: fn(param1: type1, param2: type2) -> returnType -> body
   * or: fn(param1, param2) -> body
   */
  private parseLambda(): LambdaExpression {
    this.expect(TokenType.FN, 'Expected "fn"');
    this.expect(TokenType.LPAREN, 'Expected "(" after "fn"');

    // Parse parameters
    const params: Parameter[] = [];
    const paramTypes: string[] = [];

    while (!this.check(TokenType.RPAREN) && !this.check(TokenType.EOF)) {
      const paramName = this.expect(TokenType.IDENT, 'Expected parameter name').value;

      let paramType: string | undefined;
      if (this.match(TokenType.COLON)) {
        // Type annotation present
        paramType = this.parseType();
        paramTypes.push(paramType);
      } else {
        paramTypes.push('unknown');
      }

      params.push({
        name: paramName,
        paramType
      });

      if (this.check(TokenType.COMMA)) {
        this.advance();
      }
    }

    this.expect(TokenType.RPAREN, 'Expected ")" after parameters');

    // Parse optional return type
    let returnType: string | undefined;
    if (this.match(TokenType.ARROW)) {
      // This could be return type or body
      // Try to parse as type first
      if (this.check(TokenType.IDENT) || this.check(TokenType.LBRACKET)) {
        const typeStart = this.current();
        try {
          const possibleType = this.parseType();

          // If we see another arrow after the type, it's a return type annotation
          if (this.check(TokenType.ARROW)) {
            returnType = possibleType;
            this.advance(); // consume second arrow
          } else {
            // It was the body expression, not a type - we'll parse it below
            // For now, treat the first arrow as function body indicator
          }
        } catch (e) {
          // Not a valid type, treat arrow as function body indicator
        }
      }
    }

    // Parse body expression (must be present)
    const body = this.parseExpression();

    return {
      type: 'lambda',
      params,
      paramTypes: paramTypes.length > 0 ? paramTypes : undefined,
      body,
      returnType,
      capturedVars: []  // Will be filled by type checker
    } as LambdaExpression;
  }

  /**
   * Parse type annotation
   * Handles: number, string, bool, array<T>, fn(T)->U, etc.
   */
  private parseType(): string {
    if (!this.check(TokenType.IDENT) && !this.check(TokenType.LBRACKET)) {
      throw new ParseError(
        this.current().line,
        this.current().column,
        'Expected type annotation'
      );
    }

    let type = '';

    if (this.check(TokenType.LBRACKET)) {
      // Array type: [type] or array<type>
      this.advance(); // [
      type = '[' + this.parseType() + ']';
      this.expect(TokenType.RBRACKET, 'Expected "]"');
      return type;
    }

    // Parse identifier part
    type = this.expect(TokenType.IDENT, 'Expected type').value;

    // Handle generics: type<T, U>
    if (this.check(TokenType.LT)) {
      this.advance(); // <
      type += '<';

      while (!this.check(TokenType.GT) && !this.check(TokenType.EOF)) {
        type += this.parseType();
        if (this.check(TokenType.COMMA)) {
          this.advance();
          type += ', ';
        }
      }

      this.expect(TokenType.GT, 'Expected ">"');
      type += '>';
    }

    return type;
  }

  /**
   * Phase 15: Match 표현식 파싱
   *
   * 형식:
   *   match <scrutinee> {
   *     | <pattern> [if <guard>] → <body>
   *     | <pattern> [if <guard>] → <body>
   *     ...
   *   }
   */
  private parseMatch(): MatchExpression {
    // consume 'match'
    this.expect(TokenType.MATCH, 'Expected "match"');

    // Parse scrutinee (매칭할 값)
    const scrutinee = this.parseExpression();

    // Expect {
    this.expect(TokenType.LBRACE, 'Expected "{"');

    const arms: MatchArm[] = [];

    // Parse match arms
    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      // Pipe 토큰 (| - BIT_OR로 토큰화됨)
      if (this.check(TokenType.BIT_OR)) {
        this.advance();
      }

      // Pattern 파싱
      const pattern = this.parsePattern();

      // Guard 파싱 (if 조건)
      let guard: Expression | undefined;
      if (this.check(TokenType.IF)) {
        this.advance();
        guard = this.parseExpression();
      }

      // Arrow (=> FAT_ARROW)
      if (this.check(TokenType.FAT_ARROW)) {
        this.advance();
      } else {
        throw new ParseError(
          this.current().line,
          this.current().column,
          'Expected "=>" in match arm'
        );
      }

      // Body 파싱
      const body = this.parseExpression();

      arms.push({ pattern, guard, body });

      // Optional comma
      if (this.check(TokenType.COMMA)) {
        this.advance();
      }
    }

    this.expect(TokenType.RBRACE, 'Expected "}"');

    return {
      type: 'match',
      scrutinee,
      arms
    };
  }

  /**
   * Phase 15: Pattern 파싱
   *
   * 지원하는 패턴:
   *   - 리터럴: 1, 2.5, "string", true
   *   - 와일드카드: _
   *   - 변수 바인딩: x, count, value
   *   - 구조체: {field1: pattern1, field2: pattern2}
   *   - 배열: [pattern1, pattern2, ...]
   */
  private parsePattern(): Pattern {
    const token = this.current();

    // 와일드카드 _
    if (this.check(TokenType.IDENT) && token.value === '_') {
      this.advance();
      return { type: 'wildcard' } as WildcardPattern;
    }

    // 리터럴
    if (this.check(TokenType.NUMBER)) {
      const value = parseFloat(token.value);
      this.advance();
      return {
        type: 'literal',
        value
      } as LiteralPattern;
    }

    if (this.check(TokenType.STRING)) {
      const value = token.value;
      this.advance();
      return {
        type: 'literal',
        value
      } as LiteralPattern;
    }

    // 불린 리터럴
    if (this.check(TokenType.TRUE) || this.check(TokenType.FALSE)) {
      const value = this.check(TokenType.TRUE);
      this.advance();
      return {
        type: 'literal',
        value
      } as LiteralPattern;
    }

    // 배열 패턴 [...]
    if (this.check(TokenType.LBRACKET)) {
      this.advance(); // [
      const elements: Pattern[] = [];

      while (!this.check(TokenType.RBRACKET) && !this.check(TokenType.EOF)) {
        elements.push(this.parsePattern());
        if (this.check(TokenType.COMMA)) {
          this.advance();
        }
      }

      this.expect(TokenType.RBRACKET, 'Expected "]"');
      return {
        type: 'array',
        elements
      } as ArrayPattern;
    }

    // 구조체 패턴 {...} 또는 변수 바인딩
    if (this.check(TokenType.LBRACE)) {
      this.advance(); // {

      const fields: Record<string, Pattern> = {};
      let isStruct = false;

      // 필드가 있는지 확인
      if (!this.check(TokenType.RBRACE)) {
        const firstToken = this.current();

        // field: pattern 형식 확인
        if (this.check(TokenType.IDENT) && this.peek(1).type === TokenType.COLON) {
          isStruct = true;

          while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
            const fieldName = this.expect(TokenType.IDENT, 'Expected field name').value;
            this.expect(TokenType.COLON, 'Expected ":"');
            const fieldPattern = this.parsePattern();
            fields[fieldName] = fieldPattern;

            if (this.check(TokenType.COMMA)) {
              this.advance();
            }
          }
        }
      }

      this.expect(TokenType.RBRACE, 'Expected "}"');

      if (isStruct) {
        return {
          type: 'struct',
          fields
        } as StructPattern;
      }
    }

    // 변수 바인딩 (식별자)
    if (this.check(TokenType.IDENT)) {
      const name = token.value;
      this.advance();
      return {
        type: 'variable',
        name
      } as VariablePattern;
    }

    throw new ParseError(
      token.line,
      token.column,
      `Unexpected token in pattern: ${token.type}`
    );
  }

  /**
   * Phase 16: Statement 파싱 (변수 선언, if, for 등)
   *
   * 지원하는 문장:
   *   - let 변수 선언
   *   - let mut 가변 변수 선언
   *   - if 조건문
   *   - for 반복문
   *   - while 반복문
   *   - return 반환문
   *   - 표현식 문장
   */
  public parseStatement(): Statement {
    // Phase J: async fn 함수 선언 (지원)
    let isAsync = false;
    if (this.check(TokenType.ASYNC)) {
      this.advance();  // consume 'async'
      isAsync = true;
    }

    // Phase 2: fn 함수 선언 (지원)
    if (this.check(TokenType.FN)) {
      const stmt = this.parseFunctionDeclaration(isAsync) as any;
      return stmt;
    }

    // If 'async' was present but no 'fn' follows, it's an error
    if (isAsync) {
      throw new ParseError(
        this.current().line,
        this.current().column,
        'Expected "fn" after "async"'
      );
    }

    // Phase 4 Step 2: import 문
    if (this.check(TokenType.IMPORT)) {
      return this.parseImportStatement();
    }

    // Phase 4 Step 2: export 문
    if (this.check(TokenType.EXPORT)) {
      return this.parseExportStatement();
    }

    // let 변수 선언
    if (this.check(TokenType.LET)) {
      return this.parseVariableDeclaration();
    }

    // if 문
    if (this.check(TokenType.IF)) {
      return this.parseIfStatement();
    }

    // for 문
    if (this.check(TokenType.FOR)) {
      return this.parseForStatement();
    }

    // while 문
    if (this.check(TokenType.WHILE)) {
      return this.parseWhileStatement();
    }

    // return 문
    if (this.check(TokenType.RETURN)) {
      return this.parseReturnStatement();
    }

    // Phase 16: break 문
    if (this.check(TokenType.BREAK)) {
      this.advance();
      this.match(TokenType.SEMICOLON);
      return { type: 'break' } as BreakStatement;
    }

    // Phase 16: continue 문
    if (this.check(TokenType.CONTINUE)) {
      this.advance();
      this.match(TokenType.SEMICOLON);
      return { type: 'continue' } as ContinueStatement;
    }

    // Phase 16: struct 선언
    if (this.check(TokenType.STRUCT)) {
      return this.parseStructDeclaration();
    }

    // Phase 16: enum 선언
    if (this.check(TokenType.ENUM)) {
      return this.parseEnumDeclaration();
    }

    // Phase I: try 문
    if (this.check(TokenType.TRY)) {
      return this.parseTryStatement();
    }

    // Phase I: throw 문
    if (this.check(TokenType.THROW)) {
      return this.parseThrowStatement();
    }

    // 블록 문
    if (this.check(TokenType.LBRACE)) {
      return this.parseBlockStatement();
    }

    // 표현식 문장
    const expr = this.parseExpression();
    // 선택적 세미콜론 처리 (expression statement)
    this.match(TokenType.SEMICOLON);
    return {
      type: 'expression',
      expression: expr
    } as ExpressionStatement;
  }

  /**
   * Phase 16: 변수 선언 파싱
   *
   * 형식:
   *   let x = 10
   *   let mut y = 20
   *   let name: string = "Alice"
   *   let mut count: number = 0
   */
  private parseVariableDeclaration(): VariableDeclaration {
    this.expect(TokenType.LET, 'Expected "let"');

    // 가변성 검사 (let mut)
    let mutable = false;
    if (this.check(TokenType.MUT)) {
      mutable = true;
      this.advance();
    }

    // 변수 이름
    const nameToken = this.expect(TokenType.IDENT, 'Expected variable name');
    const name = nameToken.value;

    // 선택적 타입 어노테이션 (: type)
    let varType: string | undefined;
    if (this.check(TokenType.COLON)) {
      this.advance();
      varType = this.parseType();
    }

    // 선택적 초기값 (= value)
    let value: Expression | undefined;
    if (this.check(TokenType.ASSIGN)) {
      this.advance();
      value = this.parseExpression();
    }

    // 선택적 세미콜론
    this.match(TokenType.SEMICOLON);

    return {
      type: 'variable',
      name,
      varType,
      value,
      mutable
    };
  }

  /**
   * Phase 16: If 문 파싱
   */
  private parseIfStatement(): IfStatement {
    this.expect(TokenType.IF, 'Expected "if"');
    const condition = this.parseExpression();

    const consequent = this.parseBlockStatement();

    let alternate: BlockStatement | undefined;
    if (this.check(TokenType.ELSE)) {
      this.advance();
      alternate = this.parseBlockStatement();
    }

    return {
      type: 'if',
      condition,
      consequent,
      alternate
    };
  }

  /**
   * Phase 2: For/ForOf 문 파싱
   *
   * 지원 형식:
   *   - for i in range(10) { ... }           (전통적)
   *   - for i of array { ... }               (for...of)
   *   - for let i of array { ... }           (명시적 let)
   *   - for (let i of array) { ... }         (괄호 포함)
   *
   * 구현:
   *   - in 키워드: ForStatement (범위 반복)
   *   - of 키워드: ForOfStatement (배열 요소 반복)
   */
  private parseForStatement(): ForStatement | ForOfStatement {
    this.expect(TokenType.FOR, 'Expected "for"');

    // 선택적 괄호: for (
    const hasParens = this.match(TokenType.LPAREN);

    // 선택적 let 키워드: for [let] i
    const isLet = this.match(TokenType.LET);

    // 변수 이름: for i
    const variable = this.expect(TokenType.IDENT, 'Expected loop variable').value;

    // 선택적 타입 어노테이션: for i: array<string>
    let variableType: string | undefined;
    if (this.check(TokenType.COLON)) {
      this.advance();
      variableType = this.parseType();
    }

    // 구분: in vs of
    if (this.match(TokenType.IN)) {
      // Traditional for...in loop (range-based)
      const iterable = this.parseExpression();

      if (hasParens) {
        this.expect(TokenType.RPAREN, 'Expected ")"');
      }

      const body = this.parseBlockStatement();

      return {
        type: 'for',
        variable,
        iterable,
        body
      };
    } else if (this.match(TokenType.OF)) {
      // for...of loop (array iteration)
      const iterable = this.parseExpression();

      if (hasParens) {
        this.expect(TokenType.RPAREN, 'Expected ")"');
      }

      const body = this.parseBlockStatement();

      return {
        type: 'forOf',
        variable,
        variableType,
        iterable,
        body,
        isLet
      };
    } else {
      throw new ParseError(
        this.current().line,
        this.current().column,
        'Expected "in" or "of" in for statement'
      );
    }
  }

  /**
   * Phase 16: While 문 파싱
   */
  private parseWhileStatement(): WhileStatement {
    this.expect(TokenType.WHILE, 'Expected "while"');
    const condition = this.parseExpression();
    const body = this.parseBlockStatement();

    return {
      type: 'while',
      condition,
      body
    };
  }

  /**
   * Phase 16: Return 문 파싱
   */
  private parseReturnStatement(): ReturnStatement {
    this.expect(TokenType.RETURN, 'Expected "return"');

    let argument: Expression | undefined;
    if (!this.check(TokenType.SEMICOLON) && !this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      argument = this.parseExpression();
    }

    this.match(TokenType.SEMICOLON);

    return {
      type: 'return',
      argument
    };
  }

  /**
   * Phase I: Try-Catch-Finally 문 파싱
   *
   * 형식:
   *   try { ... } catch (err) { ... } finally { ... }
   *   try { ... } catch { ... }
   *   try { ... } finally { ... }
   */
  private parseTryStatement(): TryStatement {
    this.expect(TokenType.TRY, 'Expected "try"');

    // try 블록 파싱
    const body = this.parseBlockStatement();

    // catch 블록 파싱 (0개 이상)
    const catchClauses: CatchClause[] = [];
    while (this.check(TokenType.CATCH)) {
      this.advance(); // consume 'catch'

      // Optional: (err) 파라미터
      let parameter: string | undefined;
      if (this.check(TokenType.LPAREN)) {
        this.advance(); // consume '('
        if (this.check(TokenType.IDENT)) {
          parameter = this.current().value;
          this.advance();
        }
        this.expect(TokenType.RPAREN, 'Expected ")"');
      }

      // catch 블록
      const catchBody = this.parseBlockStatement();

      catchClauses.push({
        parameter,
        body: catchBody
      });
    }

    // finally 블록 파싱 (선택사항)
    let finallyBody: BlockStatement | undefined;
    if (this.check(TokenType.FINALLY)) {
      this.advance(); // consume 'finally'
      finallyBody = this.parseBlockStatement();
    }

    // 최소한 catch 또는 finally는 있어야 함
    if (catchClauses.length === 0 && !finallyBody) {
      throw new ParseError(
        this.current().line,
        this.current().column,
        'Try statement must have at least one catch or finally block'
      );
    }

    return {
      type: 'try',
      body,
      catchClauses: catchClauses.length > 0 ? catchClauses : undefined,
      finallyBody
    };
  }

  /**
   * Phase I: Throw 문 파싱
   *
   * 형식:
   *   throw "error message"
   *   throw error_var
   */
  private parseThrowStatement(): ThrowStatement {
    this.expect(TokenType.THROW, 'Expected "throw"');

    // throw 할 표현식
    const argument = this.parseExpression();
    this.match(TokenType.SEMICOLON); // 선택적 세미콜론

    return {
      type: 'throw',
      argument
    };
  }

  /**
   * Phase 16: 블록 문 파싱 { ... }
   */
  private parseBlockStatement(): BlockStatement {
    this.expect(TokenType.LBRACE, 'Expected "{"');

    const body: Statement[] = [];
    let count = 0;
    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      if (process.env.DEBUG_PARSER) console.log(`[parseBlock] Statement ${++count}, current=${this.current().type}`);
      try {
        body.push(this.parseStatement());
        if (process.env.DEBUG_PARSER) console.log(`[parseBlock] Statement ${count} parsed, new current=${this.current().type}`);
      } catch (err) {
        if (process.env.DEBUG_PARSER) console.log(`[parseBlock] Statement ${count} error:`, err instanceof Error ? err.message : String(err));
        throw err;
      }
    }

    this.expect(TokenType.RBRACE, 'Expected "}"');

    return {
      type: 'block',
      body
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
   *   - input: (본체 바로)       → "" 반환 (Phase 5 Task 4)
   */
  private parseOptionalType(): string {
    // intent, output, 본체({), 또는 EOF를 만나면 타입 생략
    // Phase 5 Task 4: LBRACE는 함수 본체의 시작
    if (
      this.check(TokenType.INTENT) ||
      this.check(TokenType.OUTPUT) ||
      this.check(TokenType.INPUT) ||
      this.check(TokenType.LBRACE) ||
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

  /**
   * Phase 4 Step 2: Import 문 파싱
   *
   * 형식:
   *   import { add, multiply } from "./math.fl"
   *   import { add as sum } from "./math.fl"
   *   import * as math from "./math.fl"
   *   import "./config.fl"
   */
  private parseImportStatement(): ImportStatement {
    this.expect(TokenType.IMPORT, 'Expected "import"');

    let imports: ImportSpecifier[] = [];
    let isNamespace = false;
    let namespace: string | undefined;

    // import * as name 형식
    if (this.check(TokenType.STAR)) {
      this.advance();  // * 소비
      this.expect(TokenType.AS, 'Expected "as" after "*"');
      namespace = this.expect(TokenType.IDENT, 'Expected namespace name').value;
      isNamespace = true;
    }
    // import { name1, name2, ... } 형식
    else if (this.check(TokenType.LBRACE)) {
      this.advance();  // { 소비

      while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
        // 임포트할 이름
        const nameToken = this.expect(TokenType.IDENT, 'Expected import name');
        const name = nameToken.value;

        let alias: string | undefined;

        // as로 별칭 제공
        if (this.check(TokenType.AS)) {
          this.advance();
          const aliasToken = this.expect(TokenType.IDENT, 'Expected alias name');
          alias = aliasToken.value;
        }

        imports.push({ name, alias });

        // 다음 항목이 있으면 쉼표 필요
        if (!this.check(TokenType.RBRACE)) {
          this.expect(TokenType.COMMA, 'Expected "," between imports');
        }
      }

      this.expect(TokenType.RBRACE, 'Expected "}"');
    }

    // from 키워드와 모듈 경로
    this.expect(TokenType.FROM, 'Expected "from"');
    const fromToken = this.expect(TokenType.STRING, 'Expected module path');
    const from = fromToken.value;

    return {
      type: 'import',
      imports,
      from,
      isNamespace,
      namespace
    };
  }

  /**
   * Phase 4 Step 2: Export 문 파싱
   *
   * 형식:
   *   export fn add(a: number, b: number) -> number { ... }
   *   export let PI = 3.14159
   *   export let VERSION = "1.0"
   */
  private parseExportStatement(): ExportStatement {
    this.expect(TokenType.EXPORT, 'Expected "export"');

    let declaration: FunctionStatement | VariableDeclaration;

    // export fn ... 형식
    if (this.check(TokenType.FN)) {
      this.advance();  // fn 소비

      // 함수 이름
      const nameToken = this.expect(TokenType.IDENT, 'Expected function name');
      const fnName = nameToken.value;

      // 매개변수 파싱
      this.expect(TokenType.LPAREN, 'Expected "("');
      const params = this.parseParameters();
      this.expect(TokenType.RPAREN, 'Expected ")"');

      // 반환 타입 (선택적)
      let returnType: string | undefined;
      if (this.check(TokenType.ARROW)) {
        this.advance();
        returnType = this.parseType();
      }

      // 함수 본체
      const body = this.parseBlockStatement();

      declaration = {
        type: 'function',
        name: fnName,
        params,
        returnType,
        body
      };
    }
    // export let ... 형식
    else if (this.check(TokenType.LET)) {
      this.advance();  // let 소비

      // 변수 이름
      const nameToken = this.expect(TokenType.IDENT, 'Expected variable name');
      const varName = nameToken.value;

      let varType: string | undefined;
      let value: Expression | undefined;

      // 타입 표기법 (선택적)
      if (this.check(TokenType.COLON)) {
        this.advance();
        varType = this.parseType();
      }

      // 초기값 (선택적)
      if (this.check(TokenType.ASSIGN)) {
        this.advance();
        value = this.parseExpression();
      }

      declaration = {
        type: 'variable',
        name: varName,
        varType,
        value
      };
    } else {
      throw new ParseError(
        this.current().line,
        this.current().column,
        'Expected function or variable declaration after "export"'
      );
    }

    return {
      type: 'export',
      declaration
    };
  }

  /**
   * Phase 16: Struct 선언 파싱
   *
   * 형식:
   *   struct Point {
   *     x: number,
   *     y: number,
   *     z: number
   *   }
   */
  private parseStructDeclaration(): StructDeclaration {
    this.expect(TokenType.STRUCT, 'Expected "struct"');

    const nameToken = this.expect(TokenType.IDENT, 'Expected struct name');
    const name = nameToken.value;

    this.expect(TokenType.LBRACE, 'Expected "{"');

    const fields: Array<{ name: string; fieldType?: string }> = [];

    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      const fieldNameToken = this.expect(TokenType.IDENT, 'Expected field name');
      const fieldName = fieldNameToken.value;

      let fieldType: string | undefined;

      // 타입 표기 (선택적 콜론)
      if (this.check(TokenType.COLON)) {
        this.advance();
        fieldType = this.parseType();
      }

      fields.push({ name: fieldName, fieldType });

      // 필드 구분자 (쉼표, 선택적)
      if (this.check(TokenType.COMMA)) {
        this.advance();
      } else if (!this.check(TokenType.RBRACE)) {
        // 쉼표나 닫기 괄호가 없으면 오류
        throw new ParseError(
          this.current().line,
          this.current().column,
          'Expected "," or "}" in struct declaration'
        );
      }
    }

    this.expect(TokenType.RBRACE, 'Expected "}"');

    return {
      type: 'struct',
      name,
      fields
    };
  }

  /**
   * Phase 16: Enum 선언 파싱
   *
   * 형식:
   *   enum Color {
   *     Red,
   *     Green = 10,
   *     Blue = 20
   *   }
   */
  private parseEnumDeclaration(): EnumDeclaration {
    this.expect(TokenType.ENUM, 'Expected "enum"');

    const nameToken = this.expect(TokenType.IDENT, 'Expected enum name');
    const name = nameToken.value;

    this.expect(TokenType.LBRACE, 'Expected "{"');

    const fields: { [key: string]: number } = {};
    let counter = 0;

    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      const fieldNameToken = this.expect(TokenType.IDENT, 'Expected enum field name');
      const fieldName = fieldNameToken.value;

      // 값 지정 (선택적)
      if (this.check(TokenType.ASSIGN)) {
        this.advance();
        const valueToken = this.expect(TokenType.NUMBER, 'Expected number value');
        const value = parseInt(valueToken.value, 10);
        fields[fieldName] = value;
        counter = value + 1;
      } else {
        fields[fieldName] = counter++;
      }

      // 필드 구분자 (쉼표, 선택적)
      if (this.check(TokenType.COMMA)) {
        this.advance();
      } else if (!this.check(TokenType.RBRACE)) {
        // 쉼표나 닫기 괄호가 없으면 오류
        throw new ParseError(
          this.current().line,
          this.current().column,
          'Expected "," or "}" in enum declaration'
        );
      }
    }

    this.expect(TokenType.RBRACE, 'Expected "}"');

    return {
      type: 'enum',
      name,
      fields
    };
  }

  /**
   * Phase 3: 매개변수 파싱
   * 형식: (x, y: number, z: string)
   */
  private parseParameters(): Parameter[] {
    const params: Parameter[] = [];

    while (!this.check(TokenType.RPAREN) && !this.check(TokenType.EOF)) {
      const nameToken = this.expect(TokenType.IDENT, 'Expected parameter name');
      const name = nameToken.value;

      let paramType: string | undefined;

      // 타입 표기법 (선택적)
      if (this.check(TokenType.COLON)) {
        this.advance();
        paramType = this.parseType();
      }

      params.push({ name, paramType });

      // 다음 매개변수가 있으면 쉼표 필요
      if (!this.check(TokenType.RPAREN)) {
        this.expect(TokenType.COMMA, 'Expected "," between parameters');
      }
    }

    return params;
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
