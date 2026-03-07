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

// Phase 16: Struct Declaration
export interface StructDeclaration {
  type: 'struct';
  name: string;
  fields: Array<{ name: string; fieldType?: string }>;
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
  | StyleDeclaration;  // MOSS-Style: 스타일 선언

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
