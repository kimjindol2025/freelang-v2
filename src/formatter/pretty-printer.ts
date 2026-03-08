/**
 * FreeLang v2 - Self-Formatting Compiler: Pretty-Printer
 *
 * AST를 순회하여 정규화된 FreeLang 소스 코드로 역직렬화합니다.
 * 외부 Prettier 없이 컴파일러 자체가 코드 스타일을 강제합니다.
 *
 * @format 어노테이션으로 파일별 정책 재정의 가능:
 *   @format(indent: 4, semi: true, single_quote: false)
 *
 * 기본 정책:
 *   - 들여쓰기: 4칸 스페이스
 *   - 세미콜론: 없음 (FreeLang 스타일)
 *   - 인용부호: 큰따옴표
 *   - 후행 쉼표: 없음
 *   - 연산자 앞뒤 공백: 있음
 *   - 중괄호: 같은 줄 open, 새 줄 close
 */

import {
  Module,
  Statement,
  Expression,
  FunctionStatement,
  VariableDeclaration,
  IfStatement,
  ForStatement,
  ForOfStatement,
  WhileStatement,
  ReturnStatement,
  BlockStatement,
  ExpressionStatement,
  ImportStatement,
  ExportStatement,
  TryStatement,
  ThrowStatement,
  StructDeclaration,
  EnumDeclaration,
  StyleDeclaration,
  TestBlock,
  LiteralExpression,
  IdentifierExpression,
  BinaryOpExpression,
  CallExpression,
  ArrayExpression,
  MemberExpression,
  MatchExpression,
  LambdaExpression,
  AwaitExpression,
} from '../parser/ast';

// ─────────────────────────────────────────────────────────────────
// 포맷 정책 (FormatOptions)
// ─────────────────────────────────────────────────────────────────

export interface FormatOptions {
  indent: number;          // 들여쓰기 칸 수 (기본: 4)
  semi: boolean;           // 세미콜론 사용 여부 (기본: false)
  singleQuote: boolean;    // 작은따옴표 사용 여부 (기본: false)
  trailingComma: boolean;  // 후행 쉼표 (기본: false)
  maxWidth: number;        // 최대 줄 길이 (기본: 100)
}

export const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  indent: 4,
  semi: false,
  singleQuote: false,
  trailingComma: false,
  maxWidth: 100,
};

/**
 * @format(indent: N, semi: true|false, ...) 어노테이션 파싱
 */
export function parseFormatAnnotation(src: string): Partial<FormatOptions> {
  const match = src.match(/@format\s*\(([^)]+)\)/);
  if (!match) return {};

  const opts: Partial<FormatOptions> = {};
  const pairs = match[1].split(',');

  for (const pair of pairs) {
    const [key, val] = pair.split(':').map(s => s.trim());
    switch (key) {
      case 'indent':   opts.indent = parseInt(val, 10); break;
      case 'semi':     opts.semi = val === 'true'; break;
      case 'single_quote': opts.singleQuote = val === 'true'; break;
      case 'trailing_comma': opts.trailingComma = val === 'true'; break;
      case 'max_width': opts.maxWidth = parseInt(val, 10); break;
    }
  }

  return opts;
}

// ─────────────────────────────────────────────────────────────────
// FreeLangPrettyPrinter
// ─────────────────────────────────────────────────────────────────

export class FreeLangPrettyPrinter {
  private opts: FormatOptions;
  private indentStr: string;
  private quote: string;
  private semi: string;

  constructor(options?: Partial<FormatOptions>) {
    this.opts = { ...DEFAULT_FORMAT_OPTIONS, ...options };
    this.indentStr = ' '.repeat(this.opts.indent);
    this.quote = this.opts.singleQuote ? "'" : '"';
    this.semi = this.opts.semi ? ';' : '';
  }

  // ── 공개 진입점 ────────────────────────────────────────────────

  /**
   * Module AST 전체를 소스 코드로 역직렬화합니다.
   */
  printModule(module: Module): string {
    const parts: string[] = [];

    // import 먼저
    for (const imp of module.imports) {
      parts.push(this.printImport(imp));
    }
    if (module.imports.length > 0) parts.push('');

    // 나머지 문장
    for (const stmt of module.statements) {
      parts.push(this.printStatement(stmt, 0));
    }

    return parts.join('\n').trimEnd() + '\n';
  }

  /**
   * 단일 Statement(또는 FunctionStatement)를 depth 깊이로 역직렬화합니다.
   * FunctionStatement는 공식 Statement 유니온 밖이므로 any 허용.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  printStatement(stmt: Statement | any, depth: number): string {
    const s = stmt as any;
    switch (s.type as string) {
      case 'function':    return this.printFunction(s as FunctionStatement, depth);
      case 'variable':    return this.printVariable(s as VariableDeclaration, depth);
      case 'if':          return this.printIf(s as IfStatement, depth);
      case 'for':         return this.printFor(s as ForStatement, depth);
      case 'forOf':       return this.printForOf(s as ForOfStatement, depth);
      case 'while':       return this.printWhile(s as WhileStatement, depth);
      case 'return':      return this.printReturn(s as ReturnStatement, depth);
      case 'expression':  return this.printExprStmt(s as ExpressionStatement, depth);
      case 'import':      return this.printImport(s as ImportStatement);
      case 'export':      return this.printExport(s as ExportStatement, depth);
      case 'try':         return this.printTry(s as TryStatement, depth);
      case 'throw':       return this.printThrow(s as ThrowStatement, depth);
      case 'struct':      return this.printStruct(s as StructDeclaration, depth);
      case 'enum':        return this.printEnum(s as EnumDeclaration, depth);
      case 'break':       return this.ind(depth) + 'break' + this.semi;
      case 'continue':    return this.ind(depth) + 'continue' + this.semi;
      case 'style':       return this.printStyle(s as StyleDeclaration, depth);
      case 'test':        return this.printTest(s as TestBlock, depth);
      case 'assert':      return this.printAssert(s, depth);
      default:            return this.ind(depth) + '/* unknown statement */';
    }
  }

  // ── 문장 프린터들 ──────────────────────────────────────────────

  private printFunction(fn: FunctionStatement, depth: number): string {
    const ind = this.ind(depth);
    const asyncKw = fn.async ? 'async ' : '';
    const typeParams = fn.typeParams?.length
      ? `<${fn.typeParams.join(', ')}>`
      : '';

    const params = fn.params
      .map(p => p.paramType ? `${p.name}: ${p.paramType}` : p.name)
      .join(', ');

    const retType = fn.returnType ? ` -> ${fn.returnType}` : '';
    const intent = fn.intent ? `\n${ind}// intent: ${this.quote}${fn.intent}${this.quote}` : '';
    const body = this.printBlock(fn.body, depth);

    return `${intent}${ind}${asyncKw}fn ${fn.name}${typeParams}(${params})${retType} ${body}`;
  }

  private printVariable(v: VariableDeclaration, depth: number): string {
    const ind = this.ind(depth);
    const kw = v.mutable ? 'let mut' : 'let';
    const typeAnnot = v.varType ? `: ${v.varType}` : '';
    const value = v.value ? ` = ${this.printExpr(v.value)}` : '';
    return `${ind}${kw} ${v.name}${typeAnnot}${value}${this.semi}`;
  }

  private printIf(stmt: IfStatement, depth: number): string {
    const ind = this.ind(depth);
    const cond = this.printExpr(stmt.condition);
    const cons = this.printBlock(stmt.consequent, depth);
    const alt = stmt.alternate
      ? ` else ${this.printBlock(stmt.alternate, depth)}`
      : '';
    return `${ind}if ${cond} ${cons}${alt}`;
  }

  private printFor(stmt: ForStatement, depth: number): string {
    const ind = this.ind(depth);
    const iter = this.printExpr(stmt.iterable);
    const body = this.printBlock(stmt.body, depth);
    return `${ind}for ${stmt.variable} in ${iter} ${body}`;
  }

  private printForOf(stmt: ForOfStatement, depth: number): string {
    const ind = this.ind(depth);
    const letKw = stmt.isLet ? 'let ' : '';
    const typeAnnot = stmt.variableType ? `: ${stmt.variableType}` : '';
    const iter = this.printExpr(stmt.iterable);
    const body = this.printBlock(stmt.body, depth);
    return `${ind}for ${letKw}${stmt.variable}${typeAnnot} of ${iter} ${body}`;
  }

  private printWhile(stmt: WhileStatement, depth: number): string {
    const ind = this.ind(depth);
    const cond = this.printExpr(stmt.condition);
    const body = this.printBlock(stmt.body, depth);
    return `${ind}while ${cond} ${body}`;
  }

  private printReturn(stmt: ReturnStatement, depth: number): string {
    const ind = this.ind(depth);
    const arg = stmt.argument ? ` ${this.printExpr(stmt.argument)}` : '';
    return `${ind}return${arg}${this.semi}`;
  }

  private printExprStmt(stmt: ExpressionStatement, depth: number): string {
    return `${this.ind(depth)}${this.printExpr(stmt.expression)}${this.semi}`;
  }

  private printImport(stmt: ImportStatement): string {
    if (stmt.isNamespace) {
      return `import * as ${stmt.namespace} from ${this.quote}${stmt.from}${this.quote}${this.semi}`;
    }
    const specs = stmt.imports
      .map(s => s.alias ? `${s.name} as ${s.alias}` : s.name)
      .join(', ');
    return `import { ${specs} } from ${this.quote}${stmt.from}${this.quote}${this.semi}`;
  }

  private printExport(stmt: ExportStatement, depth: number): string {
    return `export ${this.printStatement((stmt as any).declaration, depth).trimStart()}`;
  }

  private printTry(stmt: TryStatement, depth: number): string {
    const ind = this.ind(depth);
    let out = `${ind}try ${this.printBlock(stmt.body, depth)}`;
    for (const clause of stmt.catchClauses ?? []) {
      const param = clause.parameter ? `(${clause.parameter})` : '';
      out += ` catch${param} ${this.printBlock(clause.body, depth)}`;
    }
    if (stmt.finallyBody) {
      out += ` finally ${this.printBlock(stmt.finallyBody, depth)}`;
    }
    return out;
  }

  private printThrow(stmt: ThrowStatement, depth: number): string {
    return `${this.ind(depth)}throw ${this.printExpr(stmt.argument)}${this.semi}`;
  }

  private printStruct(stmt: StructDeclaration, depth: number): string {
    const ind = this.ind(depth);
    const inner = this.ind(depth + 1);
    const fields = stmt.fields
      .map(f => `${inner}${f.name}${f.fieldType ? ': ' + f.fieldType : ''}`)
      .join(',\n');
    return `${ind}struct ${stmt.name} {\n${fields}\n${ind}}`;
  }

  private printEnum(stmt: EnumDeclaration, depth: number): string {
    const ind = this.ind(depth);
    const inner = this.ind(depth + 1);
    const fields = Object.entries(stmt.fields)
      .map(([k, v]) => `${inner}${k} = ${v}`)
      .join(',\n');
    return `${ind}enum ${stmt.name} {\n${fields}\n${ind}}`;
  }

  private printStyle(stmt: StyleDeclaration, depth: number): string {
    const ind = this.ind(depth);
    const inner = this.ind(depth + 1);
    const ext = stmt.extends ? ` extends ${stmt.extends}` : '';
    const props = stmt.properties
      .map(p => {
        const val = typeof p.value === 'string' ? `${this.quote}${p.value}${this.quote}` : String(p.value);
        const unit = p.unit ? p.unit : '';
        return `${inner}${p.name}: ${val}${unit}`;
      })
      .join('\n');
    return `${ind}style ${stmt.name}${ext} {\n${props}\n${ind}}`;
  }

  private printTest(stmt: TestBlock, depth: number): string {
    const ind = this.ind(depth);
    const modifier = stmt.modifier ? `.${stmt.modifier}` : '';
    const body = stmt.body.map(s => this.printStatement(s, depth + 1)).join('\n');
    return `${ind}test${modifier} ${this.quote}${stmt.name}${this.quote} {\n${body}\n${ind}}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private printAssert(stmt: any, depth: number): string {
    const ind = this.ind(depth);
    const actual = this.printExpr(stmt.actual);
    switch (stmt.kind) {
      case 'equal':    return `${ind}expect(${actual}).to.be.equal(${this.printExpr(stmt.expected!)})${this.semi}`;
      case 'notEqual': return `${ind}expect(${actual}).to.be.notEqual(${this.printExpr(stmt.expected!)})${this.semi}`;
      case 'true':     return `${ind}expect(${actual}).to.be.true()${this.semi}`;
      case 'false':    return `${ind}expect(${actual}).to.be.false()${this.semi}`;
      case 'exists':   return `${ind}expect(${actual}).to.be.exists()${this.semi}`;
      default:         return `${ind}expect(${actual})${this.semi}`;
    }
  }

  // ── 블록 프린터 ────────────────────────────────────────────────

  private printBlock(block: BlockStatement, depth: number): string {
    if (block.body.length === 0) return '{}';

    const inner = block.body
      .map(s => this.printStatement(s, depth + 1))
      .join('\n');
    const ind = this.ind(depth);
    return `{\n${inner}\n${ind}}`;
  }

  // ── 표현식 프린터 ──────────────────────────────────────────────

  printExpr(expr: Expression): string {
    switch (expr.type) {
      case 'literal':    return this.printLiteral(expr as LiteralExpression);
      case 'identifier': return (expr as IdentifierExpression).name;
      case 'binary':     return this.printBinary(expr as BinaryOpExpression);
      case 'call':       return this.printCall(expr as CallExpression);
      case 'array':      return this.printArray(expr as ArrayExpression);
      case 'member':     return this.printMember(expr as MemberExpression);
      case 'match':      return this.printMatch(expr as MatchExpression);
      case 'lambda':     return this.printLambda(expr as LambdaExpression);
      case 'await':      return `await ${this.printExpr((expr as AwaitExpression).argument)}`;
      default:           return '/* ? */';
    }
  }

  private printLiteral(lit: LiteralExpression): string {
    if (lit.dataType === 'string') {
      return `${this.quote}${lit.value}${this.quote}`;
    }
    if (lit.dataType === 'bool') {
      return String(lit.value);
    }
    return String(lit.value);
  }

  private printBinary(expr: BinaryOpExpression): string {
    const left = this.wrapIfNeeded(expr.left, expr.operator);
    const right = this.wrapIfNeeded(expr.right, expr.operator);
    return `${left} ${expr.operator} ${right}`;
  }

  private printCall(expr: CallExpression): string {
    const args = expr.arguments.map(a => this.printExpr(a)).join(', ');
    return `${expr.callee}(${args})`;
  }

  private printArray(expr: ArrayExpression): string {
    if (expr.elements.length === 0) return '[]';
    const items = expr.elements.map(e => this.printExpr(e)).join(', ');
    const trail = this.opts.trailingComma && expr.elements.length > 0 ? ',' : '';
    return `[${items}${trail}]`;
  }

  private printMember(expr: MemberExpression): string {
    return `${this.printExpr(expr.object)}.${expr.property}`;
  }

  private printMatch(expr: MatchExpression): string {
    const scrutinee = this.printExpr(expr.scrutinee);
    const arms = expr.arms
      .map(arm => {
        const pat = this.printPattern(arm);
        const guard = arm.guard ? ` if ${this.printExpr(arm.guard)}` : '';
        const body = this.printExpr(arm.body);
        return `    ${pat}${guard} => ${body}`;
      })
      .join(',\n');
    return `match ${scrutinee} {\n${arms}\n}`;
  }

  private printPattern(arm: any): string {
    const p = arm.pattern;
    switch (p.type) {
      case 'literal':  return String(p.value);
      case 'variable': return p.name;
      case 'wildcard': return '_';
      case 'struct': {
        const fields = Object.entries(p.fields)
          .map(([k, v]) => `${k}: ${this.printPattern({ pattern: v })}`)
          .join(', ');
        return `{ ${fields} }`;
      }
      case 'array': {
        const elems = p.elements.map((e: any) => this.printPattern({ pattern: e })).join(', ');
        return `[${elems}]`;
      }
      default: return '_';
    }
  }

  private printLambda(expr: LambdaExpression): string {
    const params = expr.params
      .map((p, i) => {
        const t = expr.paramTypes?.[i];
        return t ? `${p.name}: ${t}` : p.name;
      })
      .join(', ');
    const ret = expr.returnType ? ` -> ${expr.returnType}` : '';
    const body = this.printExpr(expr.body);
    return `(${params})${ret} => ${body}`;
  }

  // ── 헬퍼 ──────────────────────────────────────────────────────

  /** 연산자 우선순위에 따라 자식 표현식을 괄호로 감쌉니다. */
  private wrapIfNeeded(expr: Expression, parentOp: string): string {
    const PREC: Record<string, number> = {
      '||': 1, '&&': 2,
      '|': 3, '^': 4, '&': 5,
      '==': 6, '!=': 6,
      '<': 7, '>': 7, '<=': 7, '>=': 7,
      '<<': 8, '>>': 8,
      '+': 9, '-': 9,
      '*': 10, '/': 10, '%': 10,
    };
    const str = this.printExpr(expr);
    if (expr.type === 'binary') {
      const childPrec = PREC[(expr as BinaryOpExpression).operator] ?? 0;
      const parentPrec = PREC[parentOp] ?? 0;
      if (childPrec < parentPrec) return `(${str})`;
    }
    return str;
  }

  /** 들여쓰기 문자열 반환 */
  private ind(depth: number): string {
    return this.indentStr.repeat(depth);
  }
}
