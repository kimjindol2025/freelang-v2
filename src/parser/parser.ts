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
  CheckConstraint,    // Compile-Time-Validator: @check 제약 조건
  StructDeclaration,  // Phase 16: Struct support
  EnumDeclaration,    // Phase 16: Enum support
  BreakStatement,     // Phase 16: Break support
  ContinueStatement,  // Phase 16: Continue support
  SecretDeclaration,  // Secret-Link: 보안 변수
  StyleDeclaration,   // MOSS-Style: 스타일 선언
  StyleProperty,      // MOSS-Style: 스타일 속성
  TestBlock,          // Self-Testing Compiler: 내장 테스트 블록
  AssertStatement,    // Self-Testing Compiler: expect 어서션
  LintConfig,         // Native-Linter: @lint(...) 어노테이션
  LocalVaultConfig,   // Native-JSON-Vault: @local_vault(...) 설정
  TypeAliasDeclaration,   // Reified-Type-System: type X = A | B
  StaticAssertDeclaration, // Reified-Type-System: @static_assert_size<T, N>
  GenericTypeParam        // Reified-Type-System: 제네릭 타입 파라미터
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
  private _cachedOperators: Set<string> = new Set([
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
  private _getOperatorPrecedence(op: string): number {
    return this.precedenceCache.get(op) ?? 0;
  }

  /**
   * Allocate AST node from pool
   */
  private _allocateNode(type: string): any {
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
  /**
   * Native-Linter: @lint(no_unused: error, shadowing_check: warn, strict_pointers: true) 파싱
   *
   * 호출 시점: AT 토큰을 확인한 직후, 다음 토큰이 'lint'인 경우
   */
  private parseLintAnnotation(): LintConfig {
    const atToken = this.current();
    // AT는 이미 소비됨 - 'lint' 식별자를 기대
    const identToken = this.expect(TokenType.IDENT, 'Expected "lint" after "@"');
    if (identToken.value !== 'lint') {
      throw new ParseError(identToken.line, identToken.column, `Expected "lint", got "${identToken.value}"`);
    }

    const config: LintConfig = { line: atToken.line, column: atToken.column };

    // '(' 소비
    if (!this.check(TokenType.LPAREN)) {
      return config;  // 인자 없는 @lint → 빈 설정
    }
    this.advance(); // '('

    // 키=값 쌍 파싱: no_unused: error, shadowing_check: warn, strict_pointers: true
    while (!this.check(TokenType.RPAREN) && !this.check(TokenType.EOF)) {
      // 키 이름
      const keyToken = this.expect(TokenType.IDENT, 'Expected lint rule name');
      const key = keyToken.value;

      // ':' 구분자
      if (this.check(TokenType.COLON)) this.advance();

      // 값
      let value = '';
      if (this.check(TokenType.IDENT)) {
        value = this.advance().value;
      } else if (this.check(TokenType.STRING)) {
        value = this.advance().value;
      }

      // 규칙 적용
      if (key === 'no_unused') {
        config.no_unused = (value as 'error' | 'warn' | 'off') || 'warn';
      } else if (key === 'shadowing_check') {
        config.shadowing_check = (value as 'error' | 'warn' | 'off') || 'warn';
      } else if (key === 'strict_pointers') {
        config.strict_pointers = value === 'true' || value === '1';
      }

      // ',' 구분자 (선택적)
      if (this.check(TokenType.COMMA)) this.advance();
    }

    if (this.check(TokenType.RPAREN)) this.advance(); // ')'

    return config;
  }

  public parseModule(): Module {
    // Performance optimization: reset node pool for this parse
    this.resetNodePool();
    this.lookaheadCurrent = null;
    this.lookaheadNext = null;

    const imports: ImportStatement[] = [];
    const exports: ExportStatement[] = [];
    const statements: Statement[] = [];
    let lintConfig: LintConfig | undefined;
    let allowOrigins: string[] | undefined;  // Hardware-CORS: @allow_origin(...)
    let cspPolicy: string | undefined;       // Native-CSP-Shield: @csp_policy(...)
    const validateSchemas: Array<{ name: string; schema: string }> = [];  // Native-Request-Validator: @validate_schema(...)
    let localVault: LocalVaultConfig | undefined; // Native-JSON-Vault: @local_vault(...)
    const envSpecs: Array<{ key: string; constraints: string }> = []; // Native-Env-Shield: @require_env(...)
    const secureHashSpecs: Array<{ field: string; algo: string; rounds?: number; isFunction?: boolean }> = []; // Native-Secure-Hasher: @secure_hash(...)
    const stateAtoms: Array<any> = [];  // Native-State-Atom v2.35: @state(...) Zustand 대체
    const sessionContexts: Array<any> = [];  // Native-Session-Vault v2.37: @session_context(...) express-session 대체
    const immutableStructs: Array<{ name: string; fields: Array<{ name: string; type: string }> }> = [];  // v2.39: @immutable (...) immer 대체

    // Native-Linter: 파일 최상단 @lint 어노테이션 파싱
    // Self-Monitoring Kernel: @monitor 등 기타 어노테이션도 여기서 수집
    const topLevelAnnotations: string[] = [];
    while (this.check(TokenType.AT)) {
      this.advance(); // '@' 소비
      if (this.check(TokenType.IDENT) && this.current().value === 'lint') {
        lintConfig = this.parseLintAnnotation();
        if (process.env.DEBUG_PARSER) {
          console.log('[PARSER] @lint annotation parsed:', JSON.stringify(lintConfig));
        }
      } else if (this.check(TokenType.IDENT) && this.current().value === 'allow_origin') {
        // Hardware-CORS: @allow_origin("https://dclub.kr", "https://*.washpark.com")
        // → 도메인 목록을 파싱하여 module.allowOrigins에 저장
        this.advance(); // 'allow_origin' 소비
        const domains: string[] = [];
        if (this.check(TokenType.LPAREN)) {
          this.advance(); // '(' 소비
          while (!this.check(TokenType.RPAREN) && !this.check(TokenType.EOF)) {
            if (this.check(TokenType.STRING)) {
              const raw = String(this.advance().value);
              // 따옴표 제거 ("https://dclub.kr" → https://dclub.kr)
              domains.push(raw.replace(/^["']|["']$/g, ''));
            } else if (this.check(TokenType.COMMA)) {
              this.advance(); // ',' 소비
            } else {
              this.advance(); // 예상치 못한 토큰 스킵
            }
          }
          if (this.check(TokenType.RPAREN)) this.advance(); // ')' 소비
        }
        // 여러 @allow_origin 어노테이션 지원
        if (!allowOrigins) {
          allowOrigins = [];
        }
        allowOrigins.push(...domains);
        if (process.env.DEBUG_PARSER) {
          console.log('[PARSER] @allow_origin parsed:', JSON.stringify(allowOrigins), 'total:', allowOrigins.length);
        }
      } else if (this.check(TokenType.IDENT) && this.current().value === 'csp_policy') {
        // Native-CSP-Shield: @csp_policy(default_src: [.self], script_src: [.self, "https://trusted.dclub.kr"], report_uri: "/api/security/report")
        // 파싱 결과: "default_src=self,script_src=self|https://trusted.dclub.kr,report_uri=/api/security/report"
        this.advance(); // 'csp_policy' 소비
        const policyKv: string[] = [];
        if (this.check(TokenType.LPAREN)) {
          this.advance(); // '(' 소비
          let depth = 1;
          while (depth > 0 && !this.check(TokenType.EOF)) {
            if (this.check(TokenType.LPAREN)) { depth++; this.advance(); continue; }
            if (this.check(TokenType.RPAREN)) {
              depth--;
              if (depth === 0) break;
              this.advance(); continue;
            }
            // key: [value1, value2] 또는 key: "value" 파싱
            if (this.check(TokenType.IDENT)) {
              const key = this.advance().value;
              if (this.check(TokenType.COLON)) this.advance(); // ':' 소비
              const values: string[] = [];
              if (this.check(TokenType.LBRACKET)) {
                // [ .self, "https://..." ] 형태
                this.advance(); // '[' 소비
                while (!this.check(TokenType.RBRACKET) && !this.check(TokenType.EOF)) {
                  if (this.check(TokenType.DOT)) {
                    // .self, .none, .unsafe_inline 등 DOT+IDENT 또는 DOT+SELF(키워드)
                    this.advance();
                    if (this.check(TokenType.IDENT)) values.push(this.advance().value);
                    else if (this.check(TokenType.SELF)) { values.push('self'); this.advance(); }
                  } else if (this.check(TokenType.SELF)) {
                    // self 키워드 (DOT 없이)
                    values.push('self');
                    this.advance();
                  } else if (this.check(TokenType.STRING)) {
                    values.push(this.advance().value.replace(/^["']|["']$/g, ''));
                  } else if (this.check(TokenType.IDENT)) {
                    values.push(this.advance().value);
                  } else if (this.check(TokenType.COMMA)) {
                    this.advance();
                  } else {
                    this.advance();
                  }
                }
                if (this.check(TokenType.RBRACKET)) this.advance(); // ']' 소비
              } else if (this.check(TokenType.STRING)) {
                // key: "/api/security/report" 형태 (report_uri 등)
                values.push(this.advance().value.replace(/^["']|["']$/g, ''));
              } else if (this.check(TokenType.DOT)) {
                // key: .self 형태 (단일 DOT 값)
                this.advance();
                if (this.check(TokenType.IDENT)) values.push(this.advance().value);
                else if (this.check(TokenType.SELF)) { values.push('self'); this.advance(); }
              } else if (this.check(TokenType.IDENT)) {
                values.push(this.advance().value);
              }
              if (key && values.length > 0) {
                policyKv.push(`${key}=${values.join('|')}`);
              }
            } else if (this.check(TokenType.COMMA)) {
              this.advance();
            } else {
              this.advance();
            }
          }
          if (this.check(TokenType.RPAREN)) this.advance(); // ')' 소비
        }
        cspPolicy = policyKv.join(',');
        if (process.env.DEBUG_PARSER) {
          console.log('[PARSER] @csp_policy parsed:', cspPolicy);
        }
      } else if (this.check(TokenType.IDENT) && this.current().value === 'validate_schema') {
        // Native-Request-Validator: @validate_schema(name: "register", schema: "email:string:required|email,password:string:required|min=8|max=32")
        // → validateSchemas 배열에 { name, schema } push
        this.advance(); // 'validate_schema' 소비
        let vsName = '';
        let vsSchema = '';
        if (this.check(TokenType.LPAREN)) {
          this.advance(); // '(' 소비
          let depth = 1;
          while (depth > 0 && !this.check(TokenType.EOF)) {
            if (this.check(TokenType.LPAREN)) { depth++; this.advance(); continue; }
            if (this.check(TokenType.RPAREN)) { depth--; if (depth === 0) break; this.advance(); continue; }
            if (this.check(TokenType.IDENT)) {
              const kw = this.advance().value;
              if (this.check(TokenType.COLON)) this.advance();
              if (kw === 'name') {
                if (this.check(TokenType.STRING)) vsName = String(this.advance().value).replace(/^["']|["']$/g, '');
                else if (this.check(TokenType.IDENT)) vsName = this.advance().value;
              } else if (kw === 'schema') {
                if (this.check(TokenType.STRING)) vsSchema = String(this.advance().value).replace(/^["']|["']$/g, '');
              }
            } else if (this.check(TokenType.COMMA)) { this.advance(); } else { this.advance(); }
          }
          if (this.check(TokenType.RPAREN)) this.advance(); // ')' 소비
        }
        if (vsName && vsSchema) {
          validateSchemas.push({ name: vsName, schema: vsSchema });
          if (process.env.DEBUG_PARSER) {
            console.log('[PARSER] @validate_schema parsed:', vsName, vsSchema);
          }
        }
      } else if (this.check(TokenType.IDENT) && this.current().value === 'local_vault') {
        // Native-JSON-Vault: @local_vault(path: "./data/config.json", autosave: true)
        // → LocalVaultConfig { path, autosave, line, column }
        const vaultAnnotToken = this.current(); // 'local_vault' 토큰 (line/column 추출용)
        this.advance(); // 'local_vault' 소비
        let vaultPath = './data/vault.json';
        let autosave = true;
        if (this.check(TokenType.LPAREN)) {
          this.advance(); // '(' 소비
          let depth = 1;
          while (depth > 0 && !this.check(TokenType.EOF)) {
            if (this.check(TokenType.LPAREN)) { depth++; this.advance(); continue; }
            if (this.check(TokenType.RPAREN)) {
              depth--;
              if (depth === 0) break;
              this.advance(); continue;
            }
            if (this.check(TokenType.IDENT)) {
              const key = this.advance().value;
              if (this.check(TokenType.COLON)) this.advance();
              if (key === 'path' && this.check(TokenType.STRING)) {
                vaultPath = String(this.advance().value).replace(/^["']|["']$/g, '');
              } else if (key === 'autosave') {
                if (this.check(TokenType.IDENT)) {
                  const boolVal = this.advance().value;
                  autosave = boolVal !== 'false';
                } else if (this.check(TokenType.NUMBER)) {
                  autosave = Number(this.advance().value) !== 0;
                }
              } else {
                this.advance(); // unknown key value 스킵
              }
            } else if (this.check(TokenType.COMMA)) {
              this.advance();
            } else {
              this.advance();
            }
          }
          if (this.check(TokenType.RPAREN)) this.advance(); // ')' 소비
        }
        localVault = {
          path: vaultPath,
          autosave,
          line: vaultAnnotToken.line,
          column: vaultAnnotToken.column,
        };
        if (process.env.DEBUG_PARSER) {
          console.log('[PARSER] @local_vault parsed:', JSON.stringify(localVault));
        }
      } else if (this.check(TokenType.IDENT) && this.current().value === 'require_env') {
        // Native-Env-Shield: @require_env(key: "DATABASE_URL", pattern: "^postgres://.*", secret: true, default: "info")
        // → envSpecs 배열에 { key, constraints } push
        // constraints: "required|pattern=^postgres://.*|secret|default=info"
        this.advance(); // 'require_env' 소비
        let reKey = '';
        let rePattern = '';
        let reSecret = false;
        let reDefault = '';
        if (this.check(TokenType.LPAREN)) {
          this.advance(); // '(' 소비
          let depth = 1;
          while (depth > 0 && !this.check(TokenType.EOF)) {
            if (this.check(TokenType.LPAREN)) { depth++; this.advance(); continue; }
            if (this.check(TokenType.RPAREN)) { depth--; if (depth === 0) break; this.advance(); continue; }
            if (this.check(TokenType.IDENT)) {
              const kw = this.advance().value;
              if (this.check(TokenType.COLON)) this.advance();
              if (kw === 'key') {
                if (this.check(TokenType.STRING)) reKey = String(this.advance().value).replace(/^["']|["']$/g, '');
                else if (this.check(TokenType.IDENT)) reKey = this.advance().value;
              } else if (kw === 'pattern') {
                if (this.check(TokenType.STRING)) rePattern = String(this.advance().value).replace(/^["']|["']$/g, '');
                else if (this.check(TokenType.IDENT)) rePattern = this.advance().value;
              } else if (kw === 'secret') {
                if (this.check(TokenType.IDENT)) {
                  reSecret = this.advance().value !== 'false';
                } else {
                  reSecret = true;
                }
              } else if (kw === 'default') {
                if (this.check(TokenType.STRING)) reDefault = String(this.advance().value).replace(/^["']|["']$/g, '');
                else if (this.check(TokenType.IDENT)) reDefault = this.advance().value;
                else if (this.check(TokenType.NUMBER)) reDefault = String(this.advance().value);
              } else {
                // unknown key → 스킵
              }
            } else if (this.check(TokenType.COMMA)) {
              this.advance();
            } else {
              this.advance();
            }
          }
          if (this.check(TokenType.RPAREN)) this.advance(); // ')' 소비
        }
        if (reKey) {
          const constraints: string[] = ['required'];
          if (rePattern) constraints.push(`pattern=${rePattern}`);
          if (reSecret) constraints.push('secret');
          if (reDefault) constraints.push(`default=${reDefault}`);
          envSpecs.push({ key: reKey, constraints: constraints.join('|') });
          if (process.env.DEBUG_PARSER) {
            console.log('[PARSER] @require_env parsed:', reKey, constraints.join('|'));
          }
        }
      } else if (this.check(TokenType.IDENT) && this.current().value === 'secure_hash') {
        // Native-Secure-Hasher: @secure_hash(field: "password_hash", algo: .bcrypt, rounds: 12)
        // 또는 함수 레벨: @secure_hash(algo: .bcrypt, rounds: 12) → isFunction: true
        // → secureHashSpecs 배열에 { field, algo, rounds, isFunction } push
        this.advance(); // 'secure_hash' 소비
        let shField = '';
        let shAlgo = 'bcrypt';
        let shRounds = 12;
        let shIsFunction = false;
        if (this.check(TokenType.LPAREN)) {
          this.advance(); // '(' 소비
          let depth = 1;
          while (depth > 0 && !this.check(TokenType.EOF)) {
            if (this.check(TokenType.LPAREN)) { depth++; this.advance(); continue; }
            if (this.check(TokenType.RPAREN)) { depth--; if (depth === 0) break; this.advance(); continue; }
            if (this.check(TokenType.IDENT)) {
              const kw = this.advance().value;
              if (this.check(TokenType.COLON)) this.advance();
              if (kw === 'field') {
                if (this.check(TokenType.STRING)) shField = String(this.advance().value).replace(/^["']|["']$/g, '');
                else if (this.check(TokenType.IDENT)) shField = this.advance().value;
              } else if (kw === 'algo') {
                if (this.check(TokenType.DOT)) {
                  this.advance();
                  if (this.check(TokenType.IDENT)) shAlgo = this.advance().value;
                } else if (this.check(TokenType.STRING)) {
                  shAlgo = String(this.advance().value).replace(/^["']|["']$/g, '');
                }
              } else if (kw === 'rounds') {
                if (this.check(TokenType.NUMBER)) shRounds = Number(this.advance().value);
              } else if (kw === 'isFunction') {
                if (this.check(TokenType.IDENT)) {
                  shIsFunction = this.advance().value !== 'false';
                } else {
                  shIsFunction = true;
                }
              }
            } else if (this.check(TokenType.COMMA)) {
              this.advance();
            } else {
              this.advance();
            }
          }
          if (this.check(TokenType.RPAREN)) this.advance(); // ')' 소비
        }
        // 함수 레벨 어노테이션 (field 없으면)
        if (!shField) shIsFunction = true;
        if (shField || shIsFunction) {
          secureHashSpecs.push({
            field: shField || 'fn_return',
            algo: shAlgo,
            rounds: shRounds,
            isFunction: shIsFunction
          });
          if (process.env.DEBUG_PARSER) {
            console.log('[PARSER] @secure_hash parsed:', { field: shField || 'fn_return', algo: shAlgo, rounds: shRounds, isFunction: shIsFunction });
          }
        }
      } else if (this.check(TokenType.IDENT) && this.current().value === 'state') {
        // Native-State-Atom v2.35: @state 어노테이션 (Zustand 대체)
        // 형식: @state struct StoreName { field: type = initial, ... }
        this.advance(); // 'state' 소비

        // @state 뒤에 struct 키워드 기대
        if (this.check(TokenType.IDENT) && this.current().value === 'struct') {
          this.advance(); // 'struct' 소비

          if (this.check(TokenType.IDENT)) {
            const atomName = this.advance().value;  // StoreName
            const atomFields: Array<{ name: string; type: string; initialValue?: any }> = [];

            // { field1: type1 = init1, field2: type2, ... }
            if (this.check(TokenType.LBRACE)) {
              this.advance(); // '{' 소비

              while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
                if (this.check(TokenType.IDENT)) {
                  const fieldName = this.advance().value;
                  let fieldType = 'any';  // 기본값
                  let initialValue: any = undefined;

                  // : type 파싱
                  if (this.check(TokenType.COLON)) {
                    this.advance(); // ':' 소비
                    if (this.check(TokenType.IDENT)) {
                      fieldType = this.advance().value;
                    }
                  }

                  // = initialValue 파싱 (선택사항)
                  if (this.check(TokenType.ASSIGN)) {
                    this.advance(); // '=' 소비
                    if (this.check(TokenType.NUMBER)) {
                      initialValue = this.advance().value;
                    } else if (this.check(TokenType.STRING)) {
                      initialValue = this.advance().value;
                    }
                  }

                  atomFields.push({ name: fieldName, type: fieldType, initialValue });

                  // , 또는 } 체크
                  if (this.check(TokenType.COMMA)) {
                    this.advance(); // ',' 소비
                  }
                } else {
                  this.advance();  // 예상치 못한 토큰 스킵
                }
              }

              if (this.check(TokenType.RBRACE)) {
                this.advance(); // '}' 소비
              }
            }

            stateAtoms.push({
              name: atomName,
              fields: atomFields,
              isDirtyTracking: true,  // 기본값: dirty tracking 활성화
              line: this.current().line,
              column: this.current().column
            });

            if (process.env.DEBUG_PARSER) {
              console.log('[PARSER] @state atom parsed:', atomName, atomFields);
            }
          }
        }
      } else if (this.check(TokenType.IDENT) && this.current().value === 'immutable') {
        // v2.39: @immutable 어노테이션 (immer 대체)
        // 형식: @immutable struct StructName { field: type, ... }
        this.advance(); // 'immutable' 소비

        // @immutable 뒤에 struct 키워드 기대
        if (this.check(TokenType.IDENT) && this.current().value === 'struct') {
          this.advance(); // 'struct' 소비

          if (this.check(TokenType.IDENT)) {
            const structName = this.advance().value;
            const structFields: Array<{ name: string; type: string }> = [];

            // { field1: type1, field2: type2, ... }
            if (this.check(TokenType.LBRACE)) {
              this.advance(); // '{' 소비

              while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
                if (this.check(TokenType.IDENT)) {
                  const fieldName = this.advance().value;
                  let fieldType = 'any';

                  // : type 파싱
                  if (this.check(TokenType.COLON)) {
                    this.advance(); // ':' 소비
                    if (this.check(TokenType.IDENT)) {
                      fieldType = this.advance().value;
                    }
                  }

                  structFields.push({ name: fieldName, type: fieldType });

                  // , 또는 } 체크
                  if (this.check(TokenType.COMMA)) {
                    this.advance(); // ',' 소비
                  }
                } else {
                  this.advance();  // 예상치 못한 토큰 스킵
                }
              }

              if (this.check(TokenType.RBRACE)) {
                this.advance(); // '}' 소비
              }
            }

            immutableStructs.push({
              name: structName,
              fields: structFields
            });

            if (process.env.DEBUG_PARSER) {
              console.log('[PARSER] @immutable struct parsed:', structName, structFields);
            }
          }
        }
      } else if (this.check(TokenType.IDENT) && this.current().value === 'session_context') {
        // Native-Session-Vault v2.37: @session_context 어노테이션
        // 형식: @session_context(store: .shm, encrypt: true) struct UserSession { field: type, ... }
        this.advance(); // 'session_context' 소비

        let store = 'shm';
        let encrypt = true;
        let ttl = 3600;

        // (store: .shm, encrypt: true, ttl: 3600) 파싱
        if (this.check(TokenType.LPAREN)) {
          this.advance(); // '(' 소비

          while (!this.check(TokenType.RPAREN) && !this.check(TokenType.EOF)) {
            if (this.check(TokenType.IDENT)) {
              const paramName = this.advance().value;

              if (this.check(TokenType.COLON)) {
                this.advance(); // ':' 소비

                if (paramName === 'store') {
                  // .shm | .memory | .file
                  if (this.check(TokenType.DOT)) {
                    this.advance(); // '.' 소비
                    if (this.check(TokenType.IDENT)) {
                      store = this.advance().value;
                    }
                  }
                } else if (paramName === 'encrypt') {
                  // true | false
                  if (this.check(TokenType.IDENT)) {
                    const val = this.advance().value;
                    encrypt = val === 'true';
                  }
                } else if (paramName === 'ttl') {
                  // number
                  if (this.check(TokenType.NUMBER)) {
                    ttl = Number(this.advance().value);
                  }
                }
              }

              // , 체크
              if (this.check(TokenType.COMMA)) {
                this.advance();
              }
            } else {
              this.advance();
            }
          }

          if (this.check(TokenType.RPAREN)) {
            this.advance(); // ')' 소비
          }
        }

        // struct 키워드 기대
        if (this.check(TokenType.IDENT) && this.current().value === 'struct') {
          this.advance(); // 'struct' 소비

          if (this.check(TokenType.IDENT)) {
            const sessionName = this.advance().value;
            const sessionFields: Array<{ name: string; type: string; offset?: number; size?: number }> = [];

            // { field1: type1, field2: type2, ... }
            if (this.check(TokenType.LBRACE)) {
              this.advance(); // '{' 소비

              let offset = 0;
              while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
                if (this.check(TokenType.IDENT)) {
                  const fieldName = this.advance().value;
                  let fieldType = 'any';

                  // : type 파싱
                  if (this.check(TokenType.COLON)) {
                    this.advance(); // ':' 소비
                    if (this.check(TokenType.IDENT)) {
                      fieldType = this.advance().value;
                    }
                  }

                  // 필드 크기 계산 (간단한 버전)
                  let fieldSize = 8; // 기본: 8 바이트
                  if (fieldType === 'u64' || fieldType === 'i64') fieldSize = 8;
                  else if (fieldType === 'u32' || fieldType === 'i32') fieldSize = 4;
                  else if (fieldType === 'u16' || fieldType === 'i16') fieldSize = 2;
                  else if (fieldType === 'u8' || fieldType === 'i8') fieldSize = 1;
                  else if (fieldType === 'timestamp') fieldSize = 8;
                  else if (fieldType.startsWith('string[')) {
                    const match = fieldType.match(/string\[(\d+)\]/);
                    fieldSize = match ? Number(match[1]) : 256;
                  }

                  sessionFields.push({
                    name: fieldName,
                    type: fieldType,
                    offset: offset,
                    size: fieldSize
                  });

                  offset += fieldSize;

                  // , 또는 } 체크
                  if (this.check(TokenType.COMMA)) {
                    this.advance();
                  }
                } else {
                  this.advance();
                }
              }

              if (this.check(TokenType.RBRACE)) {
                this.advance(); // '}' 소비
              }
            }

            sessionContexts.push({
              name: sessionName,
              store: store,
              encrypt: encrypt,
              ttl: ttl,
              fields: sessionFields,
              line: this.current().line,
              column: this.current().column
            });

            if (process.env.DEBUG_PARSER) {
              console.log('[PARSER] @session_context parsed:', sessionName, store, sessionFields);
            }
          }
        }
      } else if (this.check(TokenType.IDENT)) {
        // @monitor, @api 등 → 이름 수집 후 다음 fn에 적용
        const annotName = this.advance().value;
        if (annotName === 'profile' && this.check(TokenType.LPAREN)) {
          // @profile(sampling_rate: N, output: .X) → "profile:rate=N,output=X"
          this.advance();
          let rateValue = '10'; let outputValue = 'both'; let depth = 1;
          while (depth > 0 && !this.check(TokenType.EOF)) {
            if (this.check(TokenType.LPAREN)) { depth++; this.advance(); continue; }
            if (this.check(TokenType.RPAREN)) { depth--; if (depth === 0) break; this.advance(); continue; }
            if (this.check(TokenType.IDENT) && this.current().value === 'sampling_rate') {
              this.advance();
              if (this.check(TokenType.COLON)) this.advance();
              if (this.check(TokenType.NUMBER)) { rateValue = String(this.current().value); this.advance(); continue; }
            }
            if (this.check(TokenType.IDENT) && this.current().value === 'output') {
              this.advance();
              if (this.check(TokenType.COLON)) this.advance();
              if (this.check(TokenType.DOT)) { this.advance(); if (this.check(TokenType.IDENT)) { outputValue = this.current().value; this.advance(); continue; } }
            }
            this.advance();
          }
          if (this.check(TokenType.RPAREN)) this.advance();
          topLevelAnnotations.push(`profile:rate=${rateValue},output=${outputValue}`);
        } else if (annotName === 'rate_limit' && this.check(TokenType.LPAREN)) {
          // Native-Rate-Shield: @rate_limit(window: 1s, max: 10, burst: 5)
          // → "rate_limit:window=1000,max=10,burst=5"
          this.advance(); // '(' 소비
          let rlWindowMs = 1000; let rlMax = 10; let rlBurst = 0; let depth = 1;
          while (depth > 0 && !this.check(TokenType.EOF)) {
            if (this.check(TokenType.LPAREN)) { depth++; this.advance(); continue; }
            if (this.check(TokenType.RPAREN)) { depth--; if (depth === 0) break; this.advance(); continue; }
            if (this.check(TokenType.IDENT)) {
              const kw = this.advance().value;
              if (this.check(TokenType.COLON)) this.advance();
              if (kw === 'window') {
                if (this.check(TokenType.NUMBER)) {
                  const num = Number(this.advance().value);
                  if (this.check(TokenType.IDENT)) { const u = this.current().value; this.advance(); rlWindowMs = u === 's' ? num * 1000 : num; }
                  else { rlWindowMs = num < 100 ? num * 1000 : num; }
                }
              } else if (kw === 'max') {
                if (this.check(TokenType.NUMBER)) rlMax = Number(this.advance().value);
              } else if (kw === 'burst') {
                if (this.check(TokenType.NUMBER)) rlBurst = Number(this.advance().value);
              }
            } else if (this.check(TokenType.COMMA)) { this.advance(); } else { this.advance(); }
          }
          if (this.check(TokenType.RPAREN)) this.advance();
          const rlEffBurst = rlBurst > 0 ? rlBurst : rlMax;
          topLevelAnnotations.push(`rate_limit:window=${rlWindowMs},max=${rlMax},burst=${rlEffBurst}`);
        } else if (annotName === 'log_policy' && this.check(TokenType.LPAREN)) {
          // Native-Log-Streamer: @log_policy(max_size: 100mb, backups: 5, compress: .zstd, target: "/var/log/app.log")
          // → "log_policy:max_size=104857600,backups=5,compress=gzip,target=/var/log/app.log"
          this.advance(); // '(' 소비
          let tlMaxSize  = '104857600';
          let tlBackups  = '3';
          let tlCompress = 'none';
          let tlTarget   = '';
          let depth = 1;
          while (depth > 0 && !this.check(TokenType.EOF)) {
            if (this.check(TokenType.LPAREN)) { depth++; this.advance(); continue; }
            if (this.check(TokenType.RPAREN)) { depth--; if (depth === 0) break; this.advance(); continue; }
            if (this.check(TokenType.IDENT)) {
              const kw = this.advance().value;
              if (this.check(TokenType.COLON)) this.advance();
              if (kw === 'max_size') {
                if (this.check(TokenType.NUMBER)) {
                  const num = Number(this.advance().value);
                  if (this.check(TokenType.IDENT)) {
                    const unit = this.current().value.toLowerCase(); this.advance();
                    if (unit.startsWith('gb')) tlMaxSize = String(num * 1024 * 1024 * 1024);
                    else if (unit.startsWith('mb')) tlMaxSize = String(num * 1024 * 1024);
                    else if (unit.startsWith('kb')) tlMaxSize = String(num * 1024);
                    else tlMaxSize = String(num);
                  } else { tlMaxSize = String(num); }
                }
              } else if (kw === 'backups') {
                if (this.check(TokenType.NUMBER)) tlBackups = String(this.advance().value);
              } else if (kw === 'compress') {
                if (this.check(TokenType.DOT)) this.advance();
                if (this.check(TokenType.IDENT)) {
                  const cv = this.advance().value.toLowerCase();
                  tlCompress = (cv === 'gzip' || cv === 'zstd' || cv === 'gz') ? 'gzip' : 'none';
                }
              } else if (kw === 'target') {
                if (this.check(TokenType.STRING)) tlTarget = String(this.advance().value);
              }
            } else if (this.check(TokenType.COMMA)) { this.advance(); } else { this.advance(); }
          }
          if (this.check(TokenType.RPAREN)) this.advance();
          topLevelAnnotations.push(
            `log_policy:max_size=${tlMaxSize},backups=${tlBackups},compress=${tlCompress},target=${tlTarget}`
          );
        } else {
          topLevelAnnotations.push(annotName);
          // @monitor(level: .detailed) 형태 파라미터 스킵
          if (this.check(TokenType.LPAREN)) {
            this.advance();
            let depth = 1;
            while (depth > 0 && !this.check(TokenType.EOF)) {
              if (this.check(TokenType.LPAREN)) depth++;
              else if (this.check(TokenType.RPAREN)) depth--;
              this.advance();
            }
          }
        }
      } else {
        // '@' 뒤에 IDENT가 없는 경우 → 무시
        break;
      }
    }

    // Parse all statements until EOF
    while (!this.check(TokenType.EOF)) {
      try {
        // Phase J: Support async fn at top level
        const curToken = this.current();
        if (process.env.DEBUG_PARSER) {
          console.log(`[PARSER] Current token: type=${curToken.type}, value="${curToken.value}"`);
        }

        // Self-Monitoring Kernel: @monitor 등 어노테이션 수집 (함수 선언 앞)
        // topLevelAnnotations: 루프 전에 수집된 어노테이션 (첫 fn에 적용 후 클리어)
        const pendingAnnotations: string[] = [...topLevelAnnotations];
        topLevelAnnotations.length = 0;  // 첫 번째 fn에 소비
        while (this.check(TokenType.AT)) {
          this.advance(); // '@' 소비
          if (this.check(TokenType.IDENT)) {
            const annotName = this.current().value;
            this.advance();
            // Commit-Gate: @git_hook(event: .pre_commit) 파라미터 캡처
            // git_hook 어노테이션은 이벤트 타입을 추출하여 "git_hook:pre_commit" 형태로 저장
            if (this.check(TokenType.LPAREN)) {
              this.advance();
              if (annotName === 'git_hook') {
                // event: .pre_commit 또는 event: .pre_push 추출
                let eventValue = '';
                let depth = 1;
                while (depth > 0 && !this.check(TokenType.EOF)) {
                  if (this.check(TokenType.LPAREN)) depth++;
                  else if (this.check(TokenType.RPAREN)) { depth--; if (depth === 0) break; }
                  // DOT 뒤 IDENT → 이벤트 이름 (e.g. .pre_commit → pre_commit)
                  if (this.check(TokenType.DOT)) {
                    this.advance();
                    if (this.check(TokenType.IDENT)) eventValue = this.current().value;
                  }
                  this.advance();
                }
                this.advance(); // ')' 소비
                pendingAnnotations.push(eventValue ? `git_hook:${eventValue}` : 'git_hook');
              } else if (annotName === 'profile') {
                // Self-Profiling Runtime: @profile(sampling_rate: 1000, output: .flame_graph)
                // → "profile:rate=1000,output=flame_graph" 형태로 직렬화
                let rateValue = '10';    // 기본 10ms
                let outputValue = 'both';
                let depth = 1;
                while (depth > 0 && !this.check(TokenType.EOF)) {
                  if (this.check(TokenType.LPAREN)) { depth++; this.advance(); continue; }
                  if (this.check(TokenType.RPAREN)) { depth--; if (depth === 0) break; this.advance(); continue; }
                  // sampling_rate: 숫자
                  if (this.check(TokenType.IDENT) && this.current().value === 'sampling_rate') {
                    this.advance(); // 'sampling_rate' 소비
                    if (this.check(TokenType.COLON)) this.advance(); // ':' 소비
                    if (this.check(TokenType.NUMBER)) { rateValue = String(this.current().value); this.advance(); continue; }
                  }
                  // output: .flame_graph | .report | .both
                  if (this.check(TokenType.IDENT) && this.current().value === 'output') {
                    this.advance(); // 'output' 소비
                    if (this.check(TokenType.COLON)) this.advance(); // ':' 소비
                    if (this.check(TokenType.DOT)) {
                      this.advance(); // '.' 소비
                      if (this.check(TokenType.IDENT)) { outputValue = this.current().value; this.advance(); continue; }
                    }
                  }
                  this.advance();
                }
                if (this.check(TokenType.RPAREN)) this.advance(); // ')' 소비
                pendingAnnotations.push(`profile:rate=${rateValue},output=${outputValue}`);
              } else if (annotName === 'secure_token') {
                // Native-Auth-Token: @secure_token(algo: .hmac_sha256, expires: 3600)
                // → "secure_token:algo=hmac_sha256,expires=3600"
                let algoValue   = 'hmac_sha256';
                let expiresValue = '3600';
                let depth = 1;
                while (depth > 0 && !this.check(TokenType.EOF)) {
                  if (this.check(TokenType.LPAREN)) { depth++; this.advance(); continue; }
                  if (this.check(TokenType.RPAREN)) { depth--; if (depth === 0) break; this.advance(); continue; }
                  if (this.check(TokenType.IDENT)) {
                    const kw = this.advance().value;
                    if (this.check(TokenType.COLON)) this.advance();
                    if (kw === 'algo') {
                      if (this.check(TokenType.DOT)) this.advance(); // .hmac_sha256
                      if (this.check(TokenType.IDENT)) { algoValue = this.advance().value; continue; }
                    } else if (kw === 'expires') {
                      if (this.check(TokenType.NUMBER)) { expiresValue = String(this.advance().value); continue; }
                    }
                  } else {
                    this.advance();
                  }
                }
                if (this.check(TokenType.RPAREN)) this.advance();
                pendingAnnotations.push(`secure_token:algo=${algoValue},expires=${expiresValue}`);
              } else if (annotName === 'cached_query') {
                // Native-State-Hydration: @cached_query(ttl: 300s, stale_time: 30s)
                // → "cached_query:ttl=300000,stale=30000" (ms 단위로 직렬화)
                let cqTtlMs   = 300_000; // 기본 5분
                let cqStaleMs = 30_000;  // 기본 30초
                let depth = 1;
                while (depth > 0 && !this.check(TokenType.EOF)) {
                  if (this.check(TokenType.LPAREN)) { depth++; this.advance(); continue; }
                  if (this.check(TokenType.RPAREN)) { depth--; if (depth === 0) break; this.advance(); continue; }
                  if (this.check(TokenType.IDENT)) {
                    const kw = this.advance().value;
                    if (this.check(TokenType.COLON)) this.advance();
                    if (kw === 'ttl' || kw === 'stale_time') {
                      if (this.check(TokenType.NUMBER)) {
                        const num = Number(this.advance().value);
                        let ms = num;
                        if (this.check(TokenType.IDENT)) {
                          const unit = this.current().value;
                          this.advance();
                          ms = unit === 's' ? num * 1000 : (unit === 'm' ? num * 60_000 : num);
                        } else {
                          ms = num < 1000 ? num * 1000 : num;
                        }
                        if (kw === 'ttl') cqTtlMs = ms;
                        else cqStaleMs = ms;
                      }
                    }
                  } else if (this.check(TokenType.COMMA)) {
                    this.advance();
                  } else {
                    this.advance();
                  }
                }
                if (this.check(TokenType.RPAREN)) this.advance();
                pendingAnnotations.push(`cached_query:ttl=${cqTtlMs},stale=${cqStaleMs}`);
              } else if (annotName === 'rate_limit') {
                // Native-Rate-Shield: @rate_limit(window: 1s, max: 10, burst: 5)
                // → "rate_limit:window=1000,max=10,burst=5"
                let windowMs = 1000;
                let maxReq   = 10;
                let burst    = 0; // 0 → burst=max로 처리
                let depth = 1;
                while (depth > 0 && !this.check(TokenType.EOF)) {
                  if (this.check(TokenType.LPAREN)) { depth++; this.advance(); continue; }
                  if (this.check(TokenType.RPAREN)) { depth--; if (depth === 0) break; this.advance(); continue; }
                  if (this.check(TokenType.IDENT)) {
                    const kw = this.advance().value;
                    if (this.check(TokenType.COLON)) this.advance();
                    if (kw === 'window') {
                      if (this.check(TokenType.NUMBER)) {
                        const num = Number(this.advance().value);
                        // 단위: s → ×1000, ms(기본)
                        if (this.check(TokenType.IDENT)) {
                          const unit = this.current().value;
                          this.advance();
                          windowMs = unit === 's' ? num * 1000 : num;
                        } else {
                          windowMs = num < 100 ? num * 1000 : num;
                        }
                      }
                    } else if (kw === 'max') {
                      if (this.check(TokenType.NUMBER)) { maxReq = Number(this.advance().value); }
                    } else if (kw === 'burst') {
                      if (this.check(TokenType.NUMBER)) { burst = Number(this.advance().value); }
                    }
                  } else if (this.check(TokenType.COMMA)) {
                    this.advance();
                  } else {
                    this.advance();
                  }
                }
                if (this.check(TokenType.RPAREN)) this.advance();
                const effectiveBurst = burst > 0 ? burst : maxReq;
                pendingAnnotations.push(`rate_limit:window=${windowMs},max=${maxReq},burst=${effectiveBurst}`);
              } else if (annotName === 'log_policy') {
                // Native-Log-Streamer: @log_policy(max_size: 100mb, backups: 5, compress: .zstd, target: "/var/log/app.log")
                // → "log_policy:max_size=104857600,backups=5,compress=gzip,target=/var/log/app.log"
                let lpMaxSize  = '104857600'; // 100MB 기본
                let lpBackups  = '3';
                let lpCompress = 'none';
                let lpTarget   = '';
                let depth = 1;
                while (depth > 0 && !this.check(TokenType.EOF)) {
                  if (this.check(TokenType.LPAREN)) { depth++; this.advance(); continue; }
                  if (this.check(TokenType.RPAREN)) { depth--; if (depth === 0) break; this.advance(); continue; }
                  if (this.check(TokenType.IDENT)) {
                    const kw = this.advance().value;
                    if (this.check(TokenType.COLON)) this.advance();
                    if (kw === 'max_size') {
                      // 숫자 + 단위 (100mb, 50kb, 1gb, 순수 숫자)
                      if (this.check(TokenType.NUMBER)) {
                        const num = Number(this.advance().value);
                        if (this.check(TokenType.IDENT)) {
                          const unit = this.current().value.toLowerCase();
                          this.advance();
                          if (unit.startsWith('gb')) lpMaxSize = String(num * 1024 * 1024 * 1024);
                          else if (unit.startsWith('mb')) lpMaxSize = String(num * 1024 * 1024);
                          else if (unit.startsWith('kb')) lpMaxSize = String(num * 1024);
                          else lpMaxSize = String(num);
                        } else {
                          lpMaxSize = String(num);
                        }
                      }
                    } else if (kw === 'backups') {
                      if (this.check(TokenType.NUMBER)) { lpBackups = String(this.advance().value); }
                    } else if (kw === 'compress') {
                      if (this.check(TokenType.DOT)) this.advance(); // .gzip / .zstd / .none
                      if (this.check(TokenType.IDENT)) {
                        const cv = this.advance().value.toLowerCase();
                        lpCompress = (cv === 'gzip' || cv === 'zstd' || cv === 'gz') ? 'gzip' : 'none';
                      }
                    } else if (kw === 'target') {
                      if (this.check(TokenType.STRING)) { lpTarget = String(this.advance().value); }
                    }
                  } else if (this.check(TokenType.COMMA)) {
                    this.advance();
                  } else {
                    this.advance();
                  }
                }
                if (this.check(TokenType.RPAREN)) this.advance();
                pendingAnnotations.push(
                  `log_policy:max_size=${lpMaxSize},backups=${lpBackups},compress=${lpCompress},target=${lpTarget}`
                );
              } else if (annotName.startsWith('db_')) {
                // Compile-Time-ORM: @db_table(name: "wash_logs") → "db_table:name=wash_logs"
                // @db_column(type: varchar) → "db_column:type=varchar"
                const kv: string[] = [];
                let depth = 1;
                while (depth > 0 && !this.check(TokenType.EOF)) {
                  if (this.check(TokenType.LPAREN)) { depth++; this.advance(); continue; }
                  if (this.check(TokenType.RPAREN)) { depth--; if (depth === 0) break; this.advance(); continue; }
                  // key: value 파싱
                  if (this.check(TokenType.IDENT)) {
                    const key = this.advance().value;
                    let val = '';
                    if (this.check(TokenType.COLON)) this.advance();
                    if (this.check(TokenType.DOT)) this.advance(); // .enum_val
                    if (this.check(TokenType.IDENT)) val = this.advance().value;
                    else if (this.check(TokenType.STRING)) val = this.advance().value;
                    else if (this.check(TokenType.NUMBER)) val = String(this.advance().value);
                    if (key) kv.push(`${key}=${val}`);
                  } else if (this.check(TokenType.COMMA)) {
                    this.advance();
                  } else {
                    this.advance();
                  }
                }
                if (this.check(TokenType.RPAREN)) this.advance();
                const serialized = kv.length > 0 ? `${annotName}:${kv.join(',')}` : annotName;
                pendingAnnotations.push(serialized);
              } else {
                // 기타 어노테이션: 파라미터 스킵
                let depth = 1;
                while (depth > 0 && !this.check(TokenType.EOF)) {
                  if (this.check(TokenType.LPAREN)) depth++;
                  else if (this.check(TokenType.RPAREN)) depth--;
                  this.advance();
                }
                pendingAnnotations.push(annotName);
              }
            } else {
              pendingAnnotations.push(annotName);
            }
          }
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
            // Self-Monitoring Kernel: 수집된 어노테이션 주입
            if (pendingAnnotations.length > 0) {
              (fnStmt as any).annotations = pendingAnnotations;
            }
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

        // Compile-Time-ORM + Native-Auth-Token: struct 선언에 수집된 어노테이션 주입
        if (stmt.type === 'struct' && pendingAnnotations.length > 0) {
          // Native-Auth-Token: @secure_token → secureToken 필드로 분리
          const nonAuthAnnotations: string[] = [];
          for (const a of pendingAnnotations) {
            if (a.startsWith('secure_token:')) {
              // "secure_token:algo=hmac_sha256,expires=3600" 파싱
              const params: Record<string, string> = {};
              a.slice('secure_token:'.length).split(',').forEach(kv => {
                const [k, v] = kv.split('=');
                if (k && v !== undefined) params[k.trim()] = v.trim();
              });
              (stmt as any).secureToken = {
                algo: (params['algo'] === 'sha256' ? 'sha256' : 'hmac_sha256'),
                expires: parseInt(params['expires'] ?? '3600', 10) || 3600,
              };
            } else {
              nonAuthAnnotations.push(a);
            }
          }
          if (nonAuthAnnotations.length > 0) {
            (stmt as any).annotations = nonAuthAnnotations.map((a: string) => {
              const colonIdx = a.indexOf(':');
              if (colonIdx > 0) {
                return { name: a.slice(0, colonIdx), args: { value: a.slice(colonIdx + 1) } };
              }
              return { name: a };
            });
          }
        }

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
      statements,
      lintConfig,     // Native-Linter: @lint(...) 어노테이션 설정
      allowOrigins,   // Hardware-CORS: @allow_origin(...) 도메인 화이트리스트
      cspPolicy,      // Native-CSP-Shield: @csp_policy(...) 정책 문자열
      validateSchemas: validateSchemas.length > 0 ? validateSchemas : undefined,  // Native-Request-Validator: @validate_schema(...)
      localVault,     // Native-JSON-Vault: @local_vault(...) 설정
      envSpecs: envSpecs.length > 0 ? envSpecs : undefined,  // Native-Env-Shield: @require_env(...)
      secureHashSpecs: secureHashSpecs.length > 0 ? secureHashSpecs : undefined,  // Native-Secure-Hasher: @secure_hash(...)
      stateAtoms: stateAtoms.length > 0 ? stateAtoms : undefined,  // Native-State-Atom v2.35: @state(...) Zustand 대체
      sessionContexts: sessionContexts.length > 0 ? sessionContexts : undefined,  // Native-Session-Vault v2.37: @session_context(...) express-session 대체
      immutableStructs: immutableStructs.length > 0 ? immutableStructs : undefined,  // v2.39: @immutable(...) immer 대체
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
        let paramType: string | undefined;
        // Self-Formatting Compiler: 파라미터 타입 어노테이션 지원 (name: type)
        if (this.check(TokenType.COLON)) {
          this.advance(); // consume ':'
          paramType = this.parseType();
        }
        params.push({ name: paramName.value, paramType });
      } while (this.match(TokenType.COMMA));
    }

    this.expect(TokenType.RPAREN, 'Expected ) after parameters');

    // Self-Formatting Compiler: 반환 타입 지원 (-> returnType)
    let returnType: string | undefined;
    if (this.check(TokenType.ARROW)) {
      this.advance(); // consume '->'
      returnType = this.parseType();
    }

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
      returnType,
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
    let left = this.parseLogical();

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
   * 논리 연산 파싱 (&&, ||)
   */
  private parseLogical(): Expression {
    let left = this.parseComparison();

    while (this.check(TokenType.AND) || this.check(TokenType.OR)) {
      const operator = this.check(TokenType.AND) ? '&&' : '||';
      this.advance();
      const right = this.parseComparison();
      left = {
        type: 'binary',
        operator,
        left,
        right
      } as unknown as BinaryOpExpression;
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
      } as unknown as BinaryOpExpression;
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
      } as unknown as BinaryOpExpression;
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
      } as unknown as BinaryOpExpression;
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

    // Parse body: block statement { ... } or expression
    const body = this.check(TokenType.LBRACE)
      ? this.parseBlockStatement()
      : this.parseExpression();

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

    // Reified-Type-System: Nullable type → string? = string | null
    // T? 는 "T | null"로 내부 정규화됨
    if (this.check(TokenType.QUESTION)) {
      this.advance(); // ?
      type = type + '?';  // 'string?' 형태로 보존 (ReifiedTypeRegistry가 해석)
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

    // Reified-Type-System: type 별칭 선언
    // type UserID = int | string
    if (this.check(TokenType.TYPE)) {
      return this.parseTypeAliasDeclaration();
    }

    // Phase I: try 문
    if (this.check(TokenType.TRY)) {
      return this.parseTryStatement();
    }

    // Phase I: throw 문
    if (this.check(TokenType.THROW)) {
      return this.parseThrowStatement();
    }

    // Secret-Link: secret 선언
    if (this.check(TokenType.SECRET)) {
      return this.parseSecretDeclaration();
    }

    // MOSS-Style: style 선언
    if (this.check(TokenType.STYLE)) {
      return this.parseStyleDeclaration();
    }

    // Self-Testing Compiler: test 블록
    // 릴리즈 모드에서는 IR Generator가 skip, --test 모드에서만 실행
    if (this.check(TokenType.TEST)) {
      return this.parseTestBlock();
    }

    // Self-Testing Compiler: expect 어서션
    // expect(actual).to.be.equal(expected) 형식
    if (this.check(TokenType.EXPECT)) {
      return this.parseAssertStatement();
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

    // Reified-Type-System: 제네릭 파라미터 파싱
    // struct User<T> { ... }  또는  struct Map<K, V: Comparable> { ... }
    let typeParams: GenericTypeParam[] | undefined;
    if (this.check(TokenType.LT)) {
      this.advance(); // <
      typeParams = [];

      while (!this.check(TokenType.GT) && !this.check(TokenType.EOF)) {
        const paramNameToken = this.expect(TokenType.IDENT, 'Expected type parameter name');
        const paramName = paramNameToken.value;

        // 제약 조건: T: Printable
        let constraint: string | undefined;
        if (this.check(TokenType.COLON)) {
          this.advance(); // :
          constraint = this.expect(TokenType.IDENT, 'Expected type constraint').value;
        }

        typeParams.push({ name: paramName, constraint });

        if (this.check(TokenType.COMMA)) {
          this.advance(); // ,
        }
      }

      this.expect(TokenType.GT, 'Expected ">" after type parameters');
    }

    this.expect(TokenType.LBRACE, 'Expected "{"');

    const fields: Array<{ name: string; fieldType?: string }> = [];

    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      // Compile-Time-ORM: 필드 앞 어노테이션 수집 (@db_id, @db_auto_inc, @db_column(...))
      // Compile-Time-Validator: @check(min:N, max:N, pattern:"...") 어노테이션도 수집
      const fieldAnnotations: Array<{ name: string; args?: Record<string, string> }> = [];
      let checkConstraint: CheckConstraint | undefined;

      while (this.check(TokenType.AT)) {
        this.advance(); // '@' 소비
        if (this.check(TokenType.IDENT)) {
          const annotName = this.advance().value;
          const annotArgs: Record<string, string> = {};
          // 괄호 안 key: value 파라미터 파싱: @db_column(type: .varchar, pk: true)
          if (this.check(TokenType.LPAREN)) {
            this.advance(); // '('
            while (!this.check(TokenType.RPAREN) && !this.check(TokenType.EOF)) {
              const key = this.check(TokenType.IDENT) ? this.advance().value : '';
              if (this.check(TokenType.COLON)) this.advance();
              let val = '';
              if (this.check(TokenType.DOT)) { this.advance(); }
              if (this.check(TokenType.IDENT)) val = this.advance().value;
              else if (this.check(TokenType.STRING)) {
                // 따옴표 포함 문자열 그대로 저장 → 나중에 제거
                val = String(this.advance().value);
              }
              else if (this.check(TokenType.NUMBER)) val = String(this.advance().value);
              if (key) annotArgs[key] = val;
              if (this.check(TokenType.COMMA)) this.advance();
            }
            if (this.check(TokenType.RPAREN)) this.advance(); // ')'
          }
          // Compile-Time-Validator: @check 어노테이션을 CheckConstraint로 변환
          if (annotName === 'check') {
            const constraint: CheckConstraint = {};
            if ('min' in annotArgs) constraint.min = Number(annotArgs['min']);
            if ('max' in annotArgs) constraint.max = Number(annotArgs['max']);
            if ('pattern' in annotArgs) {
              // 따옴표 제거: "^[a-z]+$" → ^[a-z]+$
              constraint.pattern = annotArgs['pattern'].replace(/^["']|["']$/g, '');
            }
            if ('required' in annotArgs) {
              constraint.required = annotArgs['required'] !== 'false';
            }
            checkConstraint = constraint;
          } else {
            fieldAnnotations.push({ name: annotName, args: Object.keys(annotArgs).length > 0 ? annotArgs : undefined });
          }
        }
      }

      const fieldNameToken = this.expect(TokenType.IDENT, 'Expected field name');
      const fieldName = fieldNameToken.value;

      let fieldType: string | undefined;

      // 타입 표기 (선택적 콜론)
      if (this.check(TokenType.COLON)) {
        this.advance();
        fieldType = this.parseType();
      }

      fields.push({
        name: fieldName,
        fieldType,
        ...(fieldAnnotations.length > 0 ? { annotations: fieldAnnotations } : {}),
        ...(checkConstraint ? { checkConstraints: checkConstraint } : {})
      });

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
      ...(typeParams && { typeParams }),
      fields
    };
  }

  /**
   * Reified-Type-System: 타입 별칭 선언 파싱
   *
   * 지원 형식:
   *   type UserID = int | string
   *   type Callback = fn(int) -> bool
   *   type Point = struct { x: number, y: number }
   */
  private parseTypeAliasDeclaration(): TypeAliasDeclaration {
    const startToken = this.current();
    this.expect(TokenType.TYPE, 'Expected "type"');

    const aliasToken = this.expect(TokenType.IDENT, 'Expected type alias name');
    const alias = aliasToken.value;

    this.expect(TokenType.ASSIGN, 'Expected "=" in type alias declaration');

    // 정의 파싱: 현재 토큰부터 줄끝 또는 세미콜론까지 수집
    const definitionParts: string[] = [];
    let isUnion = false;
    const members: string[] = [];

    // 첫 번째 타입 파싱
    const firstType = this.parseType();
    definitionParts.push(firstType);
    members.push(firstType);

    // 유니온 멤버 파싱: type X = A | B | C
    while (this.check(TokenType.BIT_OR)) {
      isUnion = true;
      this.advance(); // |
      const memberType = this.parseType();
      definitionParts.push(memberType);
      members.push(memberType);
    }

    const definition = definitionParts.join(' | ');

    // 선택적 세미콜론
    this.match(TokenType.SEMICOLON);

    return {
      type: 'typeAlias',
      alias,
      definition,
      isUnion,
      members: isUnion ? members : undefined,
      line: startToken.line,
      column: startToken.column
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

  // ── Secret-Link: 보안 변수 선언 파싱 ──────────────────────────
  // 문법:
  //   secret NAME = Config.load("KEY");   // .flconf에서 로드
  //   secret NAME = "literal_value";      // 리터럴 (빌드 타임 암호화)
  /**
   * MOSS-Style: 스타일 선언 파싱
   *
   * 형식:
   *   style primary_button {
   *       background: #007bff;
   *       padding: 10px 20px;
   *       border-radius: 5px;
   *       font-size: 16px;
   *   }
   *
   *   style danger_button extends primary_button {
   *       background: #dc3545;
   *   }
   */
  private parseStyleDeclaration(): StyleDeclaration {
    this.advance(); // consume 'style'

    const name = this.current().value;
    this.expect(TokenType.IDENT, 'Expected style name');

    // 선택적 extends
    let extendsName: string | undefined;
    if (this.check(TokenType.IDENT) && this.current().value === 'extends') {
      this.advance(); // consume 'extends'
      extendsName = this.current().value;
      this.expect(TokenType.IDENT, 'Expected parent style name after "extends"');
    }

    this.expect(TokenType.LBRACE, 'Expected "{" after style name');

    const properties: StyleProperty[] = [];

    // 속성 파싱 (} 만날 때까지)
    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      // 줄바꿈 건너뛰기
      while (this.match(TokenType.NEWLINE)) {}
      if (this.check(TokenType.RBRACE)) break;

      // 속성명 파싱 (하이픈 포함 가능: font-size, border-radius 등)
      let propName = this.current().value;
      this.advance();

      // 하이픈(-) 연결된 속성명 처리 (font-size → font-size)
      while (this.check(TokenType.MINUS)) {
        this.advance(); // consume '-'
        propName += '-' + this.current().value;
        this.advance();
      }

      // 콜론 (선택적)
      this.match(TokenType.COLON);

      // 값 파싱: 세미콜론/줄바꿈/} 전까지 토큰 수집
      let propValue: string | number = '';
      let unit: string | undefined;

      // 첫 번째 값 토큰
      if (this.check(TokenType.HASH)) {
        // #hex 색상값
        this.advance(); // consume '#'
        propValue = '#' + this.current().value;
        this.advance();
      } else if (this.check(TokenType.NUMBER)) {
        const numVal = parseFloat(this.current().value);
        this.advance();
        // 단위 확인 (px, em, rem, % 등)
        if (this.check(TokenType.IDENT)) {
          unit = this.current().value;
          this.advance();
          propValue = numVal;
        } else if (this.check(TokenType.PERCENT)) {
          unit = '%';
          this.advance();
          propValue = numVal;
        } else {
          propValue = numVal;
        }
      } else if (this.check(TokenType.STRING)) {
        propValue = this.current().value;
        this.advance();
      } else if (this.check(TokenType.IDENT)) {
        propValue = this.current().value;
        this.advance();
      } else {
        // 기타 토큰 → 문자열로 수집
        propValue = this.current().value;
        this.advance();
      }

      // 추가 값 토큰 수집 (padding: 10px 20px 같은 복합 값)
      while (!this.check(TokenType.SEMICOLON) && !this.check(TokenType.NEWLINE) &&
             !this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
        const extra = this.current().value;
        this.advance();
        // 숫자 뒤의 단위는 붙여서 처리
        if (typeof propValue === 'string') {
          propValue += ' ' + extra;
        } else {
          propValue = String(propValue) + (unit || '') + ' ' + extra;
          unit = undefined;
        }
      }

      // 세미콜론/줄바꿈 소비
      this.match(TokenType.SEMICOLON);
      while (this.match(TokenType.NEWLINE)) {}

      properties.push({ name: propName, value: propValue, unit });
    }

    this.expect(TokenType.RBRACE, 'Expected "}" to close style block');

    const result: StyleDeclaration = {
      type: 'style',
      name,
      properties
    };
    if (extendsName) {
      result.extends = extendsName;
    }
    return result;
  }

  private parseSecretDeclaration(): SecretDeclaration {
    this.advance(); // consume 'secret'

    const name = this.current().value;
    this.expect(TokenType.IDENT, 'Expected secret variable name');

    let source: 'config' | 'literal' = 'literal';
    let value: Expression | undefined;
    let configKey: string | undefined;

    if (this.match(TokenType.ASSIGN)) {
      // Config.load("KEY") 패턴 감지
      if (this.check(TokenType.IDENT) && this.current().value === 'Config') {
        this.advance(); // consume 'Config'
        if (this.match(TokenType.DOT)) {
          if (this.check(TokenType.IDENT) && this.current().value === 'load') {
            this.advance(); // consume 'load'
            this.expect(TokenType.LPAREN, 'Expected "(" after Config.load');
            configKey = this.current().value;
            this.expect(TokenType.STRING, 'Expected string key for Config.load');
            this.expect(TokenType.RPAREN, 'Expected ")" after Config.load key');
            source = 'config';
          }
        }
      } else {
        // 리터럴 값 (빌드 타임에 암호화됨)
        value = this.parseExpression();
        source = 'literal';
      }
    }

    this.match(TokenType.SEMICOLON);

    return {
      type: 'secret',
      name,
      source,
      value,
      configKey
    };
  }

  /**
   * Self-Testing Compiler: expect 어서션 파싱
   *
   * 문법:
   *   expect(actual).to.be.equal(expected)
   *   expect(actual).to.be.notEqual(expected)
   *   expect(actual).to.be.true()
   *   expect(actual).to.be.false()
   *   expect(actual).to.be.exists()
   *
   * 컴파일:
   *   - test 모드: assert_eq / assert_ne / assert_true / assert_false / assert 호출
   *   - 릴리즈: test 블록 자체가 0바이트이므로 자동으로 제거됨
   */
  private parseAssertStatement(): AssertStatement {
    const startToken = this.current();
    this.advance(); // consume 'expect'

    // expect( 파싱
    this.expect(TokenType.LPAREN, 'Expected "(" after "expect"');
    const actual = this.parseExpression();
    this.expect(TokenType.RPAREN, 'Expected ")" after expect argument');

    // .to 파싱
    this.expect(TokenType.DOT, 'Expected ".to" after expect(...)');
    const toToken = this.current();
    if (!this.check(TokenType.IDENT) || toToken.value !== 'to') {
      throw new ParseError(toToken.line, toToken.column,
        `Expected "to" after ".", got "${toToken.value}"`);
    }
    this.advance(); // consume 'to'

    // .be 파싱
    this.expect(TokenType.DOT, 'Expected ".be" after ".to"');
    const beToken = this.current();
    if (!this.check(TokenType.IDENT) || beToken.value !== 'be') {
      throw new ParseError(beToken.line, beToken.column,
        `Expected "be" after ".to.", got "${beToken.value}"`);
    }
    this.advance(); // consume 'be'

    // .method 파싱
    this.expect(TokenType.DOT, 'Expected assertion method after ".to.be"');
    if (!this.check(TokenType.IDENT)) {
      throw new ParseError(this.current().line, this.current().column,
        'Expected assertion method: equal, notEqual, true, false, exists');
    }
    const methodToken = this.current();
    const method = methodToken.value;
    this.advance(); // consume method name

    let kind: AssertStatement['kind'];
    let expected: Expression | undefined;

    if (method === 'equal' || method === 'notEqual') {
      this.expect(TokenType.LPAREN, `Expected "(" after "${method}"`);
      expected = this.parseExpression();
      this.expect(TokenType.RPAREN, `Expected ")" after ${method} argument`);
      kind = method as 'equal' | 'notEqual';
    } else if (method === 'true' || method === 'false') {
      this.expect(TokenType.LPAREN, `Expected "()" after "${method}"`);
      this.expect(TokenType.RPAREN, `Expected ")" to close "${method}()"`);
      kind = method as 'true' | 'false';
    } else if (method === 'exists') {
      this.expect(TokenType.LPAREN, 'Expected "()" after "exists"');
      this.expect(TokenType.RPAREN, 'Expected ")" to close "exists()"');
      kind = 'exists';
    } else {
      throw new ParseError(methodToken.line, methodToken.column,
        `Unknown assertion method: "${method}". Use equal, notEqual, true, false, exists`);
    }

    this.match(TokenType.SEMICOLON);

    const sourceDesc = `[${startToken.line}:${startToken.column}] expect(...).to.be.${method}(...)`;

    return {
      type: 'assert',
      kind,
      actual,
      expected,
      sourceDesc,
      line: startToken.line,
      column: startToken.column
    } as AssertStatement;
  }

  /**
   * Self-Testing Compiler: test 블록 파싱
   *
   * 문법:
   *   test "테스트 이름" { statements... }
   *   test.skip "건너뛸 테스트" { ... }
   *   test.only "단독 실행" { ... }
   *
   * 컴파일 모드:
   *   - 릴리즈: IR Generator가 skip → 0바이트
   *   - --test: fn으로 래핑하여 실행
   */
  private parseTestBlock(): TestBlock {
    const startToken = this.current();
    this.advance(); // consume 'test'

    // test.skip / test.only 처리
    let modifier: 'skip' | 'only' | undefined;
    if (this.check(TokenType.DOT)) {
      this.advance(); // consume '.'
      if (this.check(TokenType.IDENT)) {
        const mod = this.current().value;
        if (mod === 'skip') {
          modifier = 'skip';
          this.advance();
        } else if (mod === 'only') {
          modifier = 'only';
          this.advance();
        } else {
          throw new ParseError(startToken.line, startToken.column,
            `Unknown test modifier: "${mod}". Use test.skip or test.only`);
        }
      }
    }

    // 테스트 이름 (문자열 필수)
    const nameToken = this.expect(TokenType.STRING, 'Expected test name string after "test"');
    const name = nameToken.value;

    // 블록 본문 파싱
    this.expect(TokenType.LBRACE, 'Expected "{" after test name');
    const body: Statement[] = [];

    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      body.push(this.parseStatement());
    }

    this.expect(TokenType.RBRACE, 'Expected "}" to close test block');

    return {
      type: 'test',
      name,
      body,
      modifier,
      line: startToken.line,
      column: startToken.column
    } as TestBlock;
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
