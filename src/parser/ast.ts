/**
 * FreeLang v2 Phase 5 - Minimal AST
 *
 * .free 파일 형식만 지원하는 축소된 AST
 *
 * 예시:
 *   @minimal
 *   fn sum
 *   input: array<number>
 *   output: number
 *   intent: "배열 합산"
 */

/**
 * Minimal Function AST
 *
 * .free 파일의 함수 선언을 나타내는 최소 구조
 *
 * Phase 5 Tasks:
 *   Task 1-3: 헤더만 (decorator, fnName, types, intent)
 *   Task 4: 본체 지원 (body 필드)
 */
export interface MinimalFunctionAST {
  // 선언 타입
  decorator?: 'minimal'; // @minimal 있으면 'minimal'

  // 함수 정보
  fnName: string;        // 함수명
  typeParams?: string[]; // 타입 매개변수 (예: ["T", "U"])  - Phase 5 Task 5
  inputType: string;     // 입력 타입 (예: "array<number>")
  outputType: string;    // 출력 타입 (예: "number")

  // 의도 및 설명
  intent?: string;       // 의도 (예: "배열 합산")
  reason?: string;       // 추가 설명 (선택사항)

  // Phase 5 Task 4: 함수 본체 (선택사항)
  body?: string;         // 함수 본체 코드 (예: "return arr.reduce(...)")

  // 원본 정보
  source?: {
    line: number;
    column: number;
  };
}

/**
 * Parse error
 */
export class ParseError extends Error {
  constructor(
    public line: number,
    public column: number,
    message: string
  ) {
    super(`[${line}:${column}] ${message}`);
    this.name = 'ParseError';
  }
}

/**
 * Phase 2: Full AST Support
 * Task 2.1-2.3에서 필요한 완전한 AST 타입들
 */

// 표현식 (Expression)
export type Expression =
  | LiteralExpression
  | IdentifierExpression
  | BinaryOpExpression
  | CallExpression
  | ArrayExpression
  | MemberExpression
  | MatchExpression
  | LambdaExpression
  | AwaitExpression;  // Phase J: await expression

export interface LiteralExpression {
  type: 'literal';
  value: string | number | boolean;
  dataType: 'number' | 'string' | 'bool';
}

export interface IdentifierExpression {
  type: 'identifier';
  name: string;
}

export interface BinaryOpExpression {
  type: 'binary';
  operator: '+' | '-' | '*' | '/' | '%' | '==' | '!=' | '>' | '<' | '>=' | '<=';
  left: Expression;
  right: Expression;
}

export interface CallExpression {
  type: 'call';
  callee: string;
  arguments: Expression[];
}

export interface ArrayExpression {
  type: 'array';
  elements: Expression[];
}

export interface MemberExpression {
  type: 'member';
  object: Expression;
  property: string;
}

/**
 * Phase 3 Step 3: Lambda Expression (Functions & Closures)
 * Supports anonymous functions with parameter types and closure capture
 */
export interface LambdaExpression {
  type: 'lambda';
  params: Parameter[];        // Parameter definitions
  paramTypes?: string[];      // Optional type annotations for params
  body: Expression;           // Lambda body expression
  returnType?: string;        // Optional return type annotation
  capturedVars?: string[];    // Variables captured from enclosing scope
}

/**
 * Phase J: Await Expression
 * Pauses execution until a Promise resolves
 * Only valid inside async functions
 */
export interface AwaitExpression {
  type: 'await';
  argument: Expression;  // Expression that returns a Promise<T>
}

/**
 * Phase 4 Step 1: Module System - Import/Export Support
 * Enables multi-file projects with type-safe imports and exports
 */

// Import specifier (what to import)
export interface ImportSpecifier {
  name: string;               // Original export name in source module
  alias?: string;             // Renamed as (optional)
}

// Import statement
export interface ImportStatement {
  type: 'import';
  imports: ImportSpecifier[];  // Named imports
  from: string;                // Module path (relative or absolute)
  isNamespace?: boolean;       // import * as name
  namespace?: string;          // Namespace name if isNamespace
}

// Export statement
export interface ExportStatement {
  type: 'export';
  declaration: FunctionStatement | VariableDeclaration;  // What to export
}

// Module (top-level container for a .fl file)
export interface Module {
  path: string;                // File path or module name
  imports: ImportStatement[];  // Import statements at top
  exports: ExportStatement[];  // Export statements
  statements: Statement[];     // Other statements (functions, variables, etc.)
  lintConfig?: LintConfig;     // Native-Linter: @lint(...) 어노테이션
  allowOrigins?: string[];     // Hardware-CORS: @allow_origin("https://...") 도메인 화이트리스트
  cspPolicy?: string;          // Native-CSP-Shield: @csp_policy(...) 직렬화 문자열
}

/**
 * Native-Linter: @lint(...) 어노테이션 설정
 *
 * 예시:
 *   @lint(no_unused: error, shadowing_check: warn, strict_pointers: true)
 */
export interface LintConfig {
  no_unused?: 'error' | 'warn' | 'off';      // 미사용 변수 감지
  shadowing_check?: 'error' | 'warn' | 'off'; // 변수 섀도잉 감지
  strict_pointers?: boolean;                  // 포인터 안전성 강제
  line: number;   // 어노테이션 소스 위치
  column: number;
}

/**
 * Phase 15: Pattern Matching
 * Rust 스타일의 match 표현식 지원
 */

// Pattern 타입 (5가지 패턴)
export type Pattern =
  | LiteralPattern
  | VariablePattern
  | WildcardPattern
  | StructPattern
  | ArrayPattern;

export interface LiteralPattern {
  type: 'literal';
  value: string | number | boolean;
}

export interface VariablePattern {
  type: 'variable';
  name: string;
}

export interface WildcardPattern {
  type: 'wildcard';
}

export interface StructPattern {
  type: 'struct';
  fields: Record<string, Pattern>;
}

export interface ArrayPattern {
  type: 'array';
  elements: Pattern[];
}

// Match arm (패턴 → 표현식)
export interface MatchArm {
  pattern: Pattern;
  guard?: Expression;  // if 조건 (선택사항)
  body: Expression;
}

// Match 표현식
export interface MatchExpression {
  type: 'match';
  scrutinee: Expression;  // 매칭할 값
  arms: MatchArm[];
}

// Reified-Type-System: 제네릭 타입 파라미터
// struct User<T: Printable> → typeParams: [{ name: 'T', constraint: 'Printable' }]
export interface GenericTypeParam {
  name: string;           // 'T', 'U', 'K', 'V' 등
  constraint?: string;    // 'Printable', 'Comparable' 등 (선택)
}

// Compile-Time-ORM: @db_table / @db_column 어노테이션 타입
export interface ORMAnnotation {
  name: string;                     // 'db_table' | 'db_column' | 'db_id' | 'db_auto_inc'
  args?: Record<string, string>;    // 예: { name: 'wash_logs' } or { type: 'varchar(255)' }
}

// Compile-Time-Validator: @check(min:N, max:N, pattern:"...") 어노테이션
// @check(min: 3, max: 20)           → 길이/크기 범위 검증
// @check(pattern: "^[a-z]+$")       → 정규표현식 검증 (SIMD 가속)
// @check(min: 0, max: 100, pattern: "^\\d+$") → 복합 검증
export interface CheckConstraint {
  min?: number;      // string: 최소 길이, number: 최솟값
  max?: number;      // string: 최대 길이, number: 최댓값
  pattern?: string;  // 정규표현식 패턴 (SIMD-accelerated matching)
  required?: boolean; // 필수 필드 여부 (기본 true)
}

// Phase 16: Struct Declaration
// Reified-Type-System: typeParams 추가 → struct User<T> { id: T, name: string }
// Compile-Time-ORM: annotations 추가 → @db_table(name: "wash_logs") struct WashLog { ... }
// Compile-Time-Validator: checkConstraints 추가 → @check(min:3, max:20) username: string
export interface StructDeclaration {
  type: 'struct';
  name: string;
  typeParams?: GenericTypeParam[];   // Reified-Type-System: 제네릭 파라미터
  fields: Array<{
    name: string;
    fieldType?: string;
    annotations?: ORMAnnotation[];       // Compile-Time-ORM: @db_id, @db_column(type: .varchar)
    checkConstraints?: CheckConstraint;  // Compile-Time-Validator: @check(...) 검증 규칙
  }>;
  annotations?: ORMAnnotation[];     // Compile-Time-ORM: @db_table(name: "...") 등
  secureToken?: SecureTokenAnnotation; // Native-Auth-Token: @secure_token(...)
}

// Reified-Type-System: 타입 별칭 선언
// type UserID = int | string       → alias: 'UserID', definition: 'int | string', isUnion: true
// type Callback = fn(int) -> bool  → alias: 'Callback', definition: 'fn(int)->bool'
export interface TypeAliasDeclaration {
  type: 'typeAlias';
  alias: string;          // 타입 별칭명 (예: 'UserID')
  definition: string;     // 원본 타입 표현 (예: 'int | string')
  isUnion: boolean;       // 유니온 타입 여부
  members?: string[];     // 유니온 멤버들 (isUnion이 true일 때)
  line: number;
  column: number;
}

// Reified-Type-System: 컴파일 타임 크기 검증
// @static_assert_size<User<int>, 24>  → 런타임 오버헤드 없이 타입 레이아웃 검증
export interface StaticAssertDeclaration {
  type: 'staticAssert';
  targetType: string;     // 검증할 타입 (예: 'User<int>')
  expectedSize: number;   // 기대 바이트 크기 (예: 24)
  line: number;
  column: number;
}

// Phase 16: Enum Declaration
export interface EnumDeclaration {
  type: 'enum';
  name: string;
  fields: { [key: string]: number };
}

// Phase 16: Break Statement
export interface BreakStatement {
  type: 'break';
}

// Phase 16: Continue Statement
export interface ContinueStatement {
  type: 'continue';
}

// Native-Auth-Token: @secure_token 어노테이션이 붙은 구조체 메타데이터
// @secure_token(algo: .hmac_sha256, expires: 3600)
// struct AuthClaims { user_id: int, role: string }
export interface SecureTokenAnnotation {
  algo: 'hmac_sha256' | 'sha256';  // 서명 알고리즘
  expires: number;                  // 기본 만료 시간 (초)
}

// Secret-Link: 보안 변수 선언 (빌드 타임 주입 + 암호화 메모리)
export interface SecretDeclaration {
  type: 'secret';
  name: string;                    // 보안 변수명
  source?: 'config' | 'literal';   // 값 출처: .flconf 또는 리터럴
  value?: Expression;              // 리터럴 값 (빌드 타임에 암호화)
  configKey?: string;              // .flconf 키 (Config.load("KEY"))
}

// MOSS-Style: 제로-런타임 스타일 속성
export interface StyleProperty {
  name: string;           // background, padding, font-size 등
  value: string | number; // #007bff, 10, "bold" 등
  unit?: string;          // px, em, rem, % 등
}

// MOSS-Style: 제로-런타임 스타일 선언
export interface StyleDeclaration {
  type: 'style';
  name: string;           // 스타일 이름 (primary_button 등)
  properties: StyleProperty[];
  extends?: string;       // 상속할 스타일 이름 (선택)
}

// Self-Testing Compiler: 내장 테스트 블록
// - test 모드: 함수로 래핑하여 실행
// - 릴리즈 빌드: IR Generator가 완전히 skip (0바이트)
export interface TestBlock {
  type: 'test';
  name: string;        // test "이름"
  body: Statement[];   // 블록 내용
  modifier?: 'skip' | 'only';  // test.skip / test.only
  line: number;        // 소스 위치 (오류 추적용)
  column: number;
}

// Self-Testing Compiler: expect 어서션
// expect(actual).to.be.equal(expected) → assert_eq(actual, expected, desc) 호출로 컴파일
// - test 블록 내에서 사용 → 릴리즈에서는 test 블록 자체가 0바이트이므로 자동 제거
// - 지원 형식:
//     expect(x).to.be.equal(y)    → kind='equal'   (assert_eq)
//     expect(x).to.be.notEqual(y) → kind='notEqual' (assert_ne)
//     expect(x).to.be.true()      → kind='true'     (assert_true)
//     expect(x).to.be.false()     → kind='false'    (assert_false)
//     expect(x).to.be.exists()    → kind='exists'   (assert)
export interface AssertStatement {
  type: 'assert';
  kind: 'equal' | 'notEqual' | 'true' | 'false' | 'exists';
  actual: Expression;
  expected?: Expression;   // equal / notEqual에서 사용
  sourceDesc: string;      // "[line:col] expect(...).to.be.xxx(...)" - 에러 메시지용
  line: number;
  column: number;
}

// 문장 (Statement)
export type Statement =
  | ExpressionStatement
  | VariableDeclaration
  | IfStatement
  | ForStatement
  | ForOfStatement  // Phase 2: for...of loop support
  | WhileStatement
  | ReturnStatement
  | BlockStatement
  | ImportStatement  // Phase 4: Module System
  | ExportStatement  // Phase 4: Module System
  | TryStatement    // Phase I: Exception Handling
  | ThrowStatement  // Phase I: Exception Handling
  | StructDeclaration  // Phase 16: Struct support
  | EnumDeclaration    // Phase 16: Enum support
  | BreakStatement     // Phase 16: Break support
  | ContinueStatement  // Phase 16: Continue support
  | SecretDeclaration  // Secret-Link: 보안 변수
  | StyleDeclaration   // MOSS-Style: 스타일 선언
  | TestBlock               // Self-Testing Compiler: 내장 테스트 블록
  | AssertStatement         // Self-Testing Compiler: expect 어서션
  | TypeAliasDeclaration    // Reified-Type-System: type X = A | B
  | StaticAssertDeclaration; // Reified-Type-System: @static_assert_size<T, N>

export interface ExpressionStatement {
  type: 'expression';
  expression: Expression;
}

export interface VariableDeclaration {
  type: 'variable';
  name: string;
  varType?: string;
  value?: Expression;
  mutable?: boolean;  // Phase 16: let vs let mut
}

export interface IfStatement {
  type: 'if';
  condition: Expression;
  consequent: BlockStatement;
  alternate?: BlockStatement;
}

export interface ForStatement {
  type: 'for';
  variable: string;
  iterable: Expression;
  body: BlockStatement;
}

export interface ForOfStatement {
  type: 'forOf';  // Distinguish from 'for' (range-based)
  variable: string;
  variableType?: string;  // Phase 2: Optional type annotation
  iterable: Expression;
  body: BlockStatement;
  isLet?: boolean;  // Track if 'let' keyword was used
}

export interface WhileStatement {
  type: 'while';
  condition: Expression;
  body: BlockStatement;
}

export interface ReturnStatement {
  type: 'return';
  argument?: Expression;
}

export interface BlockStatement {
  type: 'block';
  body: Statement[];
}

// Phase I: Exception Handling - Try Statement
export interface TryStatement {
  type: 'try';
  body: BlockStatement;           // try block
  catchClauses?: CatchClause[];   // catch blocks (optional, can be multiple)
  finallyBody?: BlockStatement;   // finally block (optional)
}

// Phase I: Catch Clause
export interface CatchClause {
  parameter?: string;  // Error variable name (e.g., "err" in catch(err))
  body: BlockStatement;  // catch block body
}

// Phase I: Throw Statement
export interface ThrowStatement {
  type: 'throw';
  argument: Expression;  // Expression to throw (usually string)
}

// 함수 (FunctionStatement)
export interface FunctionStatement {
  type: 'function';
  name: string;
  typeParams?: string[];  // Type parameters (e.g., ["T", "U"]) - Phase 5 Task 5
  params: Parameter[];
  returnType?: string;
  body: BlockStatement;
  intent?: string;
  async?: boolean;  // Phase J: async function flag
  source?: {
    line: number;
    column: number;
  };
}

export interface Parameter {
  name: string;
  paramType?: string;
}

/**
 * Task B: Enhanced Type System
 *
 * Structured TypeAnnotation for better type checking
 * Supports: primitives, unions, generics, arrays, functions
 */

export interface TypeParameter {
  name: string;
  constraint?: TypeAnnotationObject;
  default?: TypeAnnotationObject;
}

// Structured type annotation (replaces string-based types)
export type TypeAnnotationObject =
  | PrimitiveType
  | UnionTypeObject
  | GenericTypeRef
  | ArrayTypeRef
  | FunctionTypeRef;

export interface PrimitiveType {
  kind: 'primitive';
  name: 'number' | 'string' | 'boolean' | 'any' | 'void' | 'never';
}

export interface UnionTypeObject {
  kind: 'union';
  members: TypeAnnotationObject[];
}

export interface GenericTypeRef {
  kind: 'generic';
  name: string;
  typeArguments: TypeAnnotationObject[];
}

export interface ArrayTypeRef {
  kind: 'array';
  element: TypeAnnotationObject;
}

export interface FunctionTypeRef {
  kind: 'function';
  paramTypes: TypeAnnotationObject[];
  returnType: TypeAnnotationObject;
}
