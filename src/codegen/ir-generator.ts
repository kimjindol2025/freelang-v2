/**
 * Phase 18: IR Generator
 * Transforms AST → IR instruction array for VM execution
 *
 * Day 1-2 MVP: Literals + Arithmetic operations
 */

import { Inst, Op, AIIntent } from '../types';
import { Module, ImportStatement, ExportStatement, FunctionStatement, VariableDeclaration } from '../parser/ast';
import { ImmutabilityCodegen } from '../compiler/immutability_codegen.v2';

export interface ASTNode {
  type: string;
  [key: string]: any;
}

/**
 * Phase 4 Step 5: Module linking context
 * 모듈 간 심볼 연결을 위한 컨텍스트
 */
export interface ModuleLinkContext {
  importedSymbols: Map<string, string>;  // 심볼명 → 임포트 경로
  exportedSymbols: Map<string, string>;  // 심볼명 → 타입
  moduleResolver?: any;                   // ModuleResolver 인스턴스
}

export class IRGenerator {
  private indexVarCounter = 0;  // For generating unique index variables
  private tempVarCounter = 0;   // For generating temporary array variables
  private moduleLinkContext?: ModuleLinkContext;  // Phase 4 Step 5: Module linking
  private localScope: Set<string> = new Set();  // Function parameter scope tracking
  private immutabilityCodegen: ImmutabilityCodegen;  // v2.39: Native Immutable COW engine
  private loopStack: Array<{ startAddr: number; breakJumps: number[] }> = [];  // break/continue support

  /**
   * AST → IR instructions
   * Example: BinaryOp('+', 1, 2) → [PUSH 1, PUSH 2, ADD, HALT]
   *
   * @param ast AST node to compile
   * @param localScope Optional array of parameter names for function scope
   */
  /**
   * Self-Monitoring Kernel: @monitor 어노테이션 함수 body IR 래핑
   *
   * 동작:
   * 1. PUSH fnName → CALL insight_enter  (함수 진입 기록)
   * 2. 원본 body IR (RET 직전에 insight_exit 주입)
   * 3. 마지막 HALT 앞 insight_exit 보장
   *
   * 오버헤드: PUSH + CALL 2개 = ~50ns (TSC 측정 자체보다 낮음)
   */
  wrapWithMonitoring(bodyIR: Inst[], fnName: string): Inst[] {
    const result: Inst[] = [];

    // 진입 기록: insight_enter(fnName)
    // insight_enter는 null 반환 → VM이 스택에 push하지 않음 → POP 불필요
    result.push({ op: Op.STR_NEW, arg: fnName });
    result.push({ op: Op.CALL, arg: 'insight_enter' });

    // 원본 IR에서 RET/HALT 직전마다 insight_exit 주입
    for (let i = 0; i < bodyIR.length; i++) {
      const inst = bodyIR[i];
      if (inst.op === Op.RET) {
        // RET 전에 exit 기록. 반환값이 스택 top에 있으므로 건드리지 않음
        result.push({ op: Op.STR_NEW, arg: fnName });
        result.push({ op: Op.CALL, arg: 'insight_exit' });
        result.push(inst);  // RET
      } else if (inst.op === Op.HALT) {
        // HALT 전에 exit 기록 (암묵적 return 없는 함수)
        result.push({ op: Op.STR_NEW, arg: fnName });
        result.push({ op: Op.CALL, arg: 'insight_exit' });
        result.push(inst);  // HALT
      } else {
        result.push(inst);
      }
    }

    return result;
  }

  generateIR(ast: ASTNode, localScope?: string[]): Inst[] {
    const instructions: Inst[] = [];

    // v2.39: Initialize Immutability Codegen
    if (!this.immutabilityCodegen) {
      this.immutabilityCodegen = new ImmutabilityCodegen();
    }

    // CRITICAL FIX: Initialize localScope from function parameters
    // This allows traverse() to know which variables are function parameters
    if (localScope && Array.isArray(localScope)) {
      this.localScope = new Set(localScope);
    } else {
      this.localScope.clear();
    }

    if (process.env.DEBUG_TRAVERSE) {
      console.log(`[DEBUG] generateIR initialized localScope:`, Array.from(this.localScope));
    }

    if (!ast) {
      instructions.push({ op: Op.PUSH, arg: 0 });
      instructions.push({ op: Op.HALT });
      return instructions;
    }

    this.traverse(ast, instructions);
    instructions.push({ op: Op.HALT });
    return instructions;
  }

  /**
   * Phase 4 Step 5: Module IR 생성
   *
   * 모듈 전체를 IR로 변환:
   * 1. Import 심볼 바인딩
   * 2. Export 심볼 수집
   * 3. 모듈 본체 IR 생성
   *
   * @param module 파싱된 Module
   * @returns Module IR 지시사항
   */
  public generateModuleIR(module: Module): Inst[] {
    const instructions: Inst[] = [];

    // v2.39: Initialize Immutability Codegen for module
    if (!this.immutabilityCodegen) {
      this.immutabilityCodegen = new ImmutabilityCodegen();
    }

    // Step 1: Import 컨텍스트 구축
    this.moduleLinkContext = {
      importedSymbols: new Map(),
      exportedSymbols: new Map()
    };

    // Step 2: Import 처리 - 심볼 바인딩
    for (const importStmt of module.imports) {
      this.generateImportIR(importStmt, instructions);
    }

    // Step 3: Export 심볼 수집
    for (const exportStmt of module.exports) {
      this.collectExportedSymbol(exportStmt);
    }

    // Step 4: Hardware-CORS - @allow_origin 있으면 CORS 화이트리스트 초기화 IR 주입
    if (module.allowOrigins && module.allowOrigins.length > 0) {
      instructions.push({ op: Op.PUSH, arg: module.allowOrigins.join(',') });
      instructions.push({ op: Op.CALL, arg: 'http_cors_set_origins' });
      instructions.push({ op: Op.POP });
    }

    // Step 4b: Native-CSP-Shield - @csp_policy 있으면 글로벌 정책 초기화 IR 주입
    if (module.cspPolicy && module.cspPolicy.trim()) {
      instructions.push({ op: Op.PUSH, arg: module.cspPolicy });
      instructions.push({ op: Op.CALL, arg: 'csp_policy_set' });
      instructions.push({ op: Op.POP });
    }

    // Step 4c: Native-Request-Validator - @validate_schema 있으면 스키마 등록 IR 주입
    // validate_schema_register(name, schema_str) 호출을 프로그램 시작 시 자동 실행
    if (module.validateSchemas && module.validateSchemas.length > 0) {
      for (const vs of module.validateSchemas) {
        instructions.push({ op: Op.PUSH, arg: vs.schema });
        instructions.push({ op: Op.PUSH, arg: vs.name });
        instructions.push({ op: Op.CALL, arg: 'validate_schema_register' });
        instructions.push({ op: Op.POP });
      }
    }

    // Step 4d: Native-JSON-Vault - @local_vault 있으면 vault_open IR 주입
    // vault_open(path, autosave) → 파일 로드 + WAL crash recovery
    if (module.localVault) {
      instructions.push({ op: Op.PUSH, arg: String(module.localVault.autosave) });
      instructions.push({ op: Op.PUSH, arg: module.localVault.path });
      instructions.push({ op: Op.CALL, arg: 'vault_open' });
      instructions.push({ op: Op.POP });
    }

    // Step 4e: Native-Env-Shield - @require_env 있으면 스펙 등록 + boot_check IR 주입
    // env_define(key, constraints_str) 호출 → env_boot_check() 호출 (유저 코드 실행 전)
    if (module.envSpecs && module.envSpecs.length > 0) {
      for (const spec of module.envSpecs) {
        instructions.push({ op: Op.PUSH, arg: spec.constraints });
        instructions.push({ op: Op.PUSH, arg: spec.key });
        instructions.push({ op: Op.CALL, arg: 'env_define' });
        instructions.push({ op: Op.POP });
      }
      // 모든 스펙 등록 후 boot_check 자동 실행
      instructions.push({ op: Op.CALL, arg: 'env_boot_check' });
      instructions.push({ op: Op.POP });
    }

    // Step 4f: Native-State-Atom v2.35 - @state 있으면 반응형 상태 객체 초기화 IR 주입
    // state_atom_create(name, fields_json) 호출 → REACTIVE_SECTION에 할당 + observer 등록 준비
    if (module.stateAtoms && module.stateAtoms.length > 0) {
      for (const atom of module.stateAtoms) {
        // 필드 정보를 JSON 문자열로 직렬화
        // 형식: [{"name":"count","type":"int","init":0},{"name":"status","type":"string","init":"idle"}]
        const fieldsJson = JSON.stringify(
          atom.fields.map(f => ({
            name: f.name,
            type: f.type,
            init: f.initialValue ?? (f.type === 'int' ? 0 : f.type === 'bool' ? false : '')
          }))
        );

        // state_atom_create(atomName, fieldsJson, isDirtyTracking)
        instructions.push({ op: Op.PUSH, arg: String(atom.isDirtyTracking ?? true) });
        instructions.push({ op: Op.PUSH, arg: fieldsJson });
        instructions.push({ op: Op.PUSH, arg: atom.name });
        instructions.push({ op: Op.CALL, arg: 'state_atom_create' });
        instructions.push({ op: Op.POP });  // 반환값 버림 (또는 변수에 저장)

        if (process.env.DEBUG_CODEGEN) {
          console.log(`[CODEGEN] @state atom initialized: ${atom.name} with ${atom.fields.length} fields`);
        }
      }
    }

    // Step 4g: Native-Session-Vault v2.37 - @session_context 있으면 커널 SHM 세션 초기화
    // session_init(sessionName, shmKey, totalSize, encrypt, ttl) 호출
    if (module.sessionContexts && module.sessionContexts.length > 0) {
      for (const session of module.sessionContexts) {
        // 필드 정보를 JSON으로 직렬화
        const fieldsJson = JSON.stringify(
          session.fields.map(f => ({
            name: f.name,
            type: f.type,
            offset: f.offset,
            size: f.size
          }))
        );

        // SHM 키 계산 (세션명 기반 해시)
        let shmKey = 0;
        for (let i = 0; i < session.name.length; i++) {
          shmKey = ((shmKey << 5) - shmKey) + session.name.charCodeAt(i);
          shmKey = shmKey & shmKey;
        }
        shmKey = Math.abs(shmKey) % 2147483647;

        // session_init(sessionName, shmKey, totalSize, fieldsJson, encrypt, ttl)
        instructions.push({ op: Op.PUSH, arg: String(session.ttl ?? 3600) });
        instructions.push({ op: Op.PUSH, arg: session.encrypt ? '1' : '0' });
        instructions.push({ op: Op.PUSH, arg: fieldsJson });
        instructions.push({ op: Op.PUSH, arg: String(session.fields.reduce((sum, f) => sum + (f.size || 8), 0)) });
        instructions.push({ op: Op.PUSH, arg: String(shmKey) });
        instructions.push({ op: Op.PUSH, arg: session.name });
        instructions.push({ op: Op.CALL, arg: 'session_init' });
        instructions.push({ op: Op.POP });  // 반환값 버림

        if (process.env.DEBUG_CODEGEN) {
          console.log(`[CODEGEN] @session_context initialized: ${session.name} (store=${session.store}, shmKey=${shmKey})`);
        }
      }
    }

    // Step 4h: v2.39 Native-Immutable-Forge - @immutable 있으면 COW 구조체 등록 + 초기화
    // rt_cow_init() 호출 + 각 @immutable 구조체를 immutabilityCodegen에 등록
    if (module.immutableStructs && module.immutableStructs.length > 0) {
      // COW 런타임 초기화
      instructions.push({ op: Op.CALL, arg: 'rt_cow_init' });
      instructions.push({ op: Op.POP });

      // 각 @immutable 구조체를 codegen에 등록
      for (const structDef of module.immutableStructs) {
        if (this.immutabilityCodegen) {
          const fieldMap = new Map<string, string>();
          for (const field of structDef.fields) {
            fieldMap.set(field.name, field.type);
          }
          this.immutabilityCodegen.registerImmutableStruct(structDef.name, fieldMap);

          if (process.env.DEBUG_CODEGEN) {
            console.log(`[CODEGEN] @immutable struct registered: ${structDef.name} with ${structDef.fields.length} fields`);
          }
        }
      }
    }

    // Step 5: 모듈 본체 IR 생성
    for (const stmt of module.statements) {
      this.traverse(stmt, instructions);
    }

    // Step 5b: main() 함수 자동 호출 (톱레벨에 명시적 main() 호출이 없는 경우)
    const hasMainFn = module.statements.some(
      (s: any) => s?.type === 'function' && s?.name === 'main'
    );
    const hasExplicitMainCall = module.statements.some(
      (s: any) => s?.type === 'expression' && s?.expression?.type === 'call' && s?.expression?.name === 'main'
    );
    if (hasMainFn && !hasExplicitMainCall) {
      instructions.push({ op: Op.CALL, arg: 'main' });
      instructions.push({ op: Op.POP });
    }

    // Step 6: HALT 추가
    instructions.push({ op: Op.HALT });

    return instructions;
  }

  /**
   * Phase 4 Step 5: Import 문의 IR 생성
   *
   * Import 심볼을 IR에서 사용 가능하도록 바인딩
   *
   * @param importStmt Import 문
   * @param out IR 지시사항 배열
   */
  private generateImportIR(importStmt: ImportStatement, out: Inst[]): void {
    // 임포트된 각 심볼을 컨텍스트에 등록
    if (importStmt.isNamespace && importStmt.namespace) {
      // import * as math from "./math.fl"
      // → math.add, math.multiply 등을 바인딩

      // Note: 실제 바인딩은 Module Resolver가 처리
      // 여기서는 로드 지시사항만 생성
      out.push({
        op: Op.COMMENT,  // 주석 같은 메타데이터 (구현 가능)
        arg: `Namespace import: ${importStmt.namespace} from ${importStmt.from}`
      } as any);

      if (this.moduleLinkContext) {
        this.moduleLinkContext.importedSymbols.set(
          importStmt.namespace,
          importStmt.from
        );
      }
    } else {
      // import { add, multiply } from "./math.fl"
      // → add, multiply를 바인딩
      for (const spec of importStmt.imports) {
        const bindName = spec.alias || spec.name;

        out.push({
          op: Op.COMMENT,
          arg: `Import: ${spec.name} as ${bindName} from ${importStmt.from}`
        } as any);

        if (this.moduleLinkContext) {
          this.moduleLinkContext.importedSymbols.set(
            bindName,
            `${importStmt.from}#${spec.name}`
          );
        }
      }
    }
  }

  /**
   * Phase 4 Step 5: Export된 심볼 수집
   *
   * @param exportStmt Export 문
   */
  private collectExportedSymbol(exportStmt: ExportStatement): void {
    if (!this.moduleLinkContext) return;

    const decl = exportStmt.declaration;
    if (decl.type === 'function') {
      const fn = decl as FunctionStatement;
      this.moduleLinkContext.exportedSymbols.set(
        fn.name,
        'function'
      );
    } else if (decl.type === 'variable') {
      const varDecl = decl as VariableDeclaration;
      this.moduleLinkContext.exportedSymbols.set(
        varDecl.name,
        varDecl.varType || 'unknown'
      );
    }
  }

  /**
   * Phase 4 Step 5: Module 링크 컨텍스트 설정
   *
   * @param context Module linking context
   */
  public setModuleLinkContext(context: ModuleLinkContext): void {
    this.moduleLinkContext = context;
  }

  /**
   * Phase 1: Normalize node type from parser lowercase to internal uppercase
   *
   * Parser generates lowercase types (e.g., 'identifier', 'binary', 'literal')
   * But traverse() expects original case (e.g., 'Identifier', 'BinaryOp', 'NumberLiteral')
   *
   * This method maps between them for compatibility.
   */
  private normalizeNodeType(type: string): string {
    const typeMap: Record<string, string> = {
      'identifier': 'Identifier',
      'binary': 'BinaryOp',
      'call': 'CallExpression',
      'array': 'ArrayLiteral',
      'member': 'MemberExpression',
      'literal': 'NumberLiteral',  // Generic, will be handled
      'match': 'MatchExpression',
      'lambda': 'lambda',  // Keep as-is
      'import': 'import',
      'export': 'export',
      'variable': 'variable',
      'expression': 'expression',
      'if': 'IfStatement',
      'for': 'ForStatement',
      'forOf': 'ForOfStatement',
      'while': 'WhileStatement',
      'return': 'return',
      'block': 'Block',
      'function': 'FunctionStatement',
      // Reified-Type-System 노드
      'typeAlias': 'typeAlias',
      'staticAssert': 'staticAssert'
    };

    // Return mapped type or original if not found
    return typeMap[type] || type;
  }

  /**
   * Phase 4 Step 5: 임포트된 심볼인지 확인
   *
   * @param name 심볼명
   * @returns 임포트된 심볼이면 true
   */
  private isImportedSymbol(name: string): boolean {
    return this.moduleLinkContext?.importedSymbols.has(name) ?? false;
  }

  /**
   * Phase 4 Step 5: Export된 심볼인지 확인
   *
   * @param name 심볼명
   * @returns Export된 심볼이면 true
   */
  private isExportedSymbol(name: string): boolean {
    return this.moduleLinkContext?.exportedSymbols.has(name) ?? false;
  }

  /**
   * Phase 4 Step 5: Module 문맥에서 함수 호출명 해석
   *
   * 예:
   * - math.add → ./math.fl#add
   * - add → add (로컬 함수)
   *
   * @param callee 함수명 (로컬 또는 qualified)
   * @returns 해석된 함수명
   */
  private resolveCalleeForModule(callee: string): string {
    // Qualified name 처리 (math.add 형태)
    if (callee.includes('.')) {
      const [namespace, funcName] = callee.split('.');
      if (this.moduleLinkContext?.importedSymbols.has(namespace)) {
        // namespace가 import된 namespace인 경우
        const modulePath = this.moduleLinkContext.importedSymbols.get(namespace);
        return `${modulePath}#${funcName}`;
      }
    }

    // 로컬 함수
    return callee;
  }

  /**
   * Recursive traverse of AST nodes
   */
  private traverse(node: ASTNode, out: Inst[]): void {
    if (!node) return;

    // Normalize node type (lowercase to uppercase mapping)
    const normalizedType = this.normalizeNodeType(node.type);

    // DEBUG: 모든 노드 타입 로깅
    if (process.env.DEBUG_TRAVERSE) {
      console.log(`[DEBUG TRAVERSE] node.type="${node.type}" → normalizedType="${normalizedType}"`);
      if ((node as any).name) console.log(`  → name="${(node as any).name}"`);
      if ((node as any).value) console.log(`  → has value expression`);
    }

    switch (normalizedType) {
      // ── Literals ────────────────────────────────────────────
      case 'NumberLiteral':
      case 'number':
        // Distinguish between int and float
        if (typeof node.value === 'number' && !Number.isInteger(node.value)) {
          out.push({ op: Op.PUSH_FLOAT, arg: node.value });  // Float literal
        } else {
          out.push({ op: Op.PUSH, arg: node.value });  // Integer or generic number
        }
        break;

      case 'StringLiteral':
      case 'string':
        out.push({ op: Op.STR_NEW, arg: node.value });
        break;

      // Generic 'literal' from parser (detect type from value)
      case 'literal':
        if (typeof node.value === 'number') {
          // Phase 3: Distinguish int from float
          if (!Number.isInteger(node.value)) {
            out.push({ op: Op.PUSH_FLOAT, arg: node.value });
          } else {
            out.push({ op: Op.PUSH, arg: node.value });
          }
        } else if (typeof node.value === 'string') {
          out.push({ op: Op.STR_NEW, arg: node.value });
        } else if (typeof node.value === 'boolean') {
          out.push({ op: Op.PUSH, arg: node.value ? 1 : 0 });
        } else {
          out.push({ op: Op.PUSH, arg: node.value });
        }
        break;

      case 'BoolLiteral':
      case 'boolean':
        out.push({ op: Op.PUSH, arg: node.value ? 1 : 0 });
        break;

      // ── Binary Operations ───────────────────────────────────
      case 'BinaryOp':
      case 'binary':
        this.traverse(node.left, out);
        this.traverse(node.right, out);

        // Special handling for string operations
        const isStringOp =
          node.operator === '+' &&
          (node.left.type === 'StringLiteral' || node.right.type === 'StringLiteral');

        const opMap: Record<string, Op> = {
          '+': isStringOp ? Op.STR_CONCAT : Op.ADD,
          '-': Op.SUB,
          '*': Op.MUL,
          '/': Op.DIV,
          '%': Op.MOD,
          '==': node.left.type === 'StringLiteral' ? Op.STR_EQ : Op.EQ,
          '!=': node.left.type === 'StringLiteral' ? Op.STR_NEQ : Op.NEQ,
          '<': Op.LT,
          '>': Op.GT,
          '<=': Op.LTE,
          '>=': Op.GTE,
          '&&': Op.AND,
          '||': Op.OR,
        };

        const op = opMap[node.operator];
        if (op !== undefined) {
          out.push({ op });
        } else {
          throw new Error(`Unknown binary operator: ${node.operator}`);
        }
        break;

      // ── Unary Operations ────────────────────────────────────
      case 'UnaryOp':
      case 'unary':
        if (node.operator === 'typeof') {
          // typeof is a function call: typeof(argument)
          this.traverse(node.argument, out);
          out.push({ op: Op.CALL, arg: 'typeof' });
        } else {
          this.traverse(node.argument || node.operand, out);
          if (node.operator === '-') {
            out.push({ op: Op.NEG });
          } else if (node.operator === '!') {
            out.push({ op: Op.NOT });
          } else {
            throw new Error(`Unknown unary operator: ${node.operator}`);
          }
        }
        break;

      // ── Variables ───────────────────────────────────────────
      case 'Identifier':
        out.push({ op: Op.LOAD, arg: node.name });
        break;

      case 'Assignment':
      case 'assignment':
        // Support both old (node.name) and new (node.target) formats
        let varName: string;
        if (node.target) {
          // New format: { type: 'assignment', target: identifier, value: expr }
          if (node.target.type === 'identifier' && node.target.name) {
            varName = node.target.name;
          } else {
            throw new Error('Assignment target must be an identifier');
          }
        } else if (node.name) {
          // Old format: { type: 'assignment', name: string, value: expr }
          varName = node.name;
        } else {
          throw new Error('Assignment must have a target or name');
        }

        // v2.39: Check if immutable struct (ImmutabilityCodegen hook)
        const isImmutableStruct = this.immutabilityCodegen &&
          this.immutabilityCodegen.isImmutableStruct(varName);

        // Evaluate the value expression
        this.traverse(node.value, out);

        // v2.39: If @immutable struct, wrap with rt_cow_copy()
        if (isImmutableStruct) {
          out.push({ op: Op.CALL, arg: 'rt_cow_copy' });
        }

        // Store in variable
        out.push({ op: Op.STORE, arg: varName });
        break;

      // ── Member Expression (obj.property, obj[index]) ──────────
      case 'MemberExpression':
      case 'member':
        // Evaluate the object
        this.traverse(node.object, out);

        // Check if it's computed (obj[prop]) or not (obj.prop)
        if (node.computed) {
          // obj[index]: push the index value
          this.traverse(node.property, out);
          // Stack: [obj, index] → use ARR_GET or member access
          out.push({ op: Op.ARR_GET });
        } else {
          // obj.property: property is a simple identifier
          const propName = node.property?.name || node.property;
          if (propName === 'length') {
            // Special case: .length property
            out.push({ op: Op.ARR_LEN });
          } else {
            // Generic property access (for objects/maps)
            // Treat as map lookup: push property name, then OBJ_GET
            out.push({ op: Op.PUSH, arg: propName });
            out.push({ op: Op.OBJ_GET });
          }
        }
        break;

      // ── Block (multiple statements) ─────────────────────────
      case 'Block':
      case 'block':
        // Support both node.statements and node.body (parser compatibility)
        const statements = node.statements || node.body || [];
        if (Array.isArray(statements)) {
          for (const stmt of statements) {
            this.traverse(stmt, out);
          }
        }
        break;

      // ── Control Flow (Basic) ────────────────────────────────
      case 'IfStatement':
        this.traverse(node.condition, out);
        const ifJmpIdx = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 }); // placeholder for false jump

        // Execute consequent (true branch)
        this.traverse(node.consequent, out);

        // If we have an else block, we need to jump over it after the consequent
        let elseJmpIdx = -1;
        if (node.alternate) {
          elseJmpIdx = out.length;
          out.push({ op: Op.JMP, arg: 0 }); // placeholder for end jump
        }

        // Patch the JMP_NOT to point to here (else block or end)
        out[ifJmpIdx].arg = out.length;

        // Execute alternate (else branch) if present
        if (node.alternate) {
          this.traverse(node.alternate, out);
          // Patch the final JMP to point to here (after else)
          out[elseJmpIdx].arg = out.length;
        }
        break;

      case 'WhileStatement': {
        const loopStart = out.length;
        const breakJumps: number[] = [];
        this.loopStack.push({ startAddr: loopStart, breakJumps });

        this.traverse(node.condition, out);
        const whileJmpIdx = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 }); // placeholder

        this.traverse(node.body, out);
        out.push({ op: Op.JMP, arg: loopStart });
        out[whileJmpIdx].arg = out.length; // patch jump target

        // Patch all break jumps to loop exit
        for (const bj of breakJumps) {
          out[bj].arg = out.length;
        }
        this.loopStack.pop();
        break;
      }

      // ── Array Operations ────────────────────────────────────
      case 'ArrayLiteral':
      case 'array':
        // Create array in temporary variable
        const tmpVar = `__tmp_arr_${this.tempVarCounter++}`;
        out.push({ op: Op.ARR_NEW, arg: tmpVar });
        if (node.elements && Array.isArray(node.elements)) {
          for (const elem of node.elements) {
            this.traverse(elem, out);
            out.push({ op: Op.ARR_PUSH, arg: tmpVar });
          }
        }
        // Load the array onto stack
        out.push({ op: Op.LOAD, arg: tmpVar });
        break;

      // ── Object Operations ────────────────────────────────────
      case 'ObjectLiteral':
      case 'object':
        // Create object in temporary variable
        const tmpObjVar = `__tmp_obj_${this.tempVarCounter++}`;
        out.push({ op: Op.OBJ_NEW, arg: tmpObjVar });
        if (node.properties && Array.isArray(node.properties)) {
          for (const prop of node.properties) {
            // Evaluate the value expression
            this.traverse(prop.value, out);
            // Store it as a property (key, stack_value) → tmpObjVar[key] = stack_value
            out.push({ op: Op.OBJ_SET, arg: `${tmpObjVar}:${prop.key}` });
          }
        }
        // Load the object onto stack
        out.push({ op: Op.LOAD, arg: tmpObjVar });
        break;

      case 'IndexAccess':
        this.traverse(node.array, out);
        this.traverse(node.index, out);
        out.push({ op: Op.ARR_GET });
        break;

      // ── Phase 3 Step 3: Lambda Expression ─────────────────
      case 'lambda':
        this.generateLambdaIR(node, out);
        break;

      // ── Function Call ───────────────────────────────────────
      case 'CallExpression':
      case 'call':
        // Check if this is a method call (obj.method(...))
        if (node.callee && typeof node.callee === 'object' && node.callee.type === 'member') {
          // Method call: obj.method(args)
          const memberExpr = node.callee as any;
          const methodName = memberExpr.property?.name || memberExpr.property;

          // Push object as first argument
          this.traverse(memberExpr.object, out);

          // Push other arguments
          // Phase 26: For higher-order functions (map, filter, reduce), if argument is an identifier,
          // convert it to a string (function name) so the native function can call it via VM
          if (node.arguments && Array.isArray(node.arguments)) {
            for (const arg of node.arguments) {
              // Check if this is a high-order method (map, filter, reduce, find) and arg is an identifier
              if ((methodName === 'map' || methodName === 'filter' || methodName === 'reduce' || methodName === 'find') &&
                  arg && arg.type === 'identifier') {
                // Push function name as a string
                out.push({ op: Op.STR_NEW, arg: arg.name });
              } else {
                // Normal argument
                this.traverse(arg, out);
              }
            }
          }

          // Convert method call to VM instruction based on method name
          switch (methodName) {
            // String methods
            case 'slice':
            case 'substring':
            case 'substr':
              // obj.slice(start, end) → STR_SUB
              out.push({ op: Op.STR_SUB });
              break;
            case 'length':
              // obj.length → STR_LEN or ARR_LEN (handled in MemberExpression for properties)
              out.push({ op: Op.STR_LEN });
              break;
            case 'charAt':
            case 'charCodeAt':
              // obj.charAt(index) → STR_AT
              out.push({ op: Op.STR_AT });
              break;
            case 'concat':
              // obj.concat(other) → STR_CONCAT
              out.push({ op: Op.STR_CONCAT });
              break;

            // Array methods
            case 'push':
              out.push({ op: Op.ARR_PUSH, arg: '__return_val' });
              break;
            case 'reverse':
              out.push({ op: Op.ARR_REV });
              break;
            case 'sort':
              out.push({ op: Op.ARR_SORT });
              break;

            // Higher-order array methods (map, filter, reduce, find)
            case 'map':
            case 'filter':
            case 'reduce':
            case 'find':
              // Higher-order functions: argument is a function name (string)
              const builtinMethodName = `__method_${methodName}`;
              out.push({ op: Op.CALL, arg: builtinMethodName, sub: [] });
              break;

            default:
              // Unknown method: fallback to function call
              const unknownMethodName = `__method_${methodName}`;
              out.push({ op: Op.CALL, arg: unknownMethodName, sub: [] });
              break;
          }
        } else {
          // Regular function call
          if (node.arguments && Array.isArray(node.arguments)) {
            for (const arg of node.arguments) {
              this.traverse(arg, out);
            }
          }

          // Phase 4 Step 5: Cross-module function call support
          // 예: math.add(1, 2) → qualified name으로 처리
          const calleeNameWithContext = this.resolveCalleeForModule(node.callee);
          out.push({ op: Op.CALL, arg: calleeNameWithContext, sub: [] });
        }
        break;

      // ── Range/Iterator (Lazy Evaluation) ─────────────────────
      case 'RangeLiteral':
        this.traverse(node.start, out);
        this.traverse(node.end, out);
        out.push({ op: Op.ITER_INIT });
        break;

      // ── For Statement (Iterator-based Loop) ──────────────────
      case 'ForStatement':
      case 'for': {
        // for...in loop: array iteration

        // 1. Initialize index variable with 0
        const forIdxVar = `_idx_${this.indexVarCounter++}`;
        out.push({ op: Op.PUSH, arg: 0 });
        out.push({ op: Op.STORE, arg: forIdxVar });

        // 2. Evaluate and store array
        this.traverse(node.iterable, out);
        const forArrVar = `_arr_${this.indexVarCounter++}`;
        out.push({ op: Op.STORE, arg: forArrVar });

        // 3. Loop condition check
        const forLoopStartAddr = out.length;
        const forBreakJumps: number[] = [];
        this.loopStack.push({ startAddr: forLoopStartAddr, breakJumps: forBreakJumps });

        out.push({ op: Op.LOAD, arg: forIdxVar });
        out.push({ op: Op.ARR_LEN, arg: forArrVar });
        out.push({ op: Op.LT });
        const forJmpIdx = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 }); // patch later

        // 4. Load element and store in loop variable
        out.push({ op: Op.LOAD, arg: forArrVar });
        out.push({ op: Op.LOAD, arg: forIdxVar });
        out.push({ op: Op.ARR_GET });
        out.push({ op: Op.STORE, arg: node.variable });

        // 5. Execute body
        this.traverse(node.body, out);

        // 6. Increment index
        out.push({ op: Op.LOAD, arg: forIdxVar });
        out.push({ op: Op.PUSH, arg: 1 });
        out.push({ op: Op.ADD });
        out.push({ op: Op.STORE, arg: forIdxVar });

        // 7. Jump back
        out.push({ op: Op.JMP, arg: forLoopStartAddr });

        // 8. Patch exit jump
        out[forJmpIdx].arg = out.length;

        // Patch all break jumps
        for (const bj of forBreakJumps) {
          out[bj].arg = out.length;
        }
        this.loopStack.pop();
        break;
      }

      // ── For...Of Statement (Array iteration with index) ────────
      // Phase 2: Convert for...of to index-based while loop
      // for item of array { body }  →  let _idx = 0; while _idx < array.length { ... }
      case 'ForOfStatement':
      case 'forOf': {
        // 1. Generate unique index variable
        const indexVar = `_for_idx_${this.indexVarCounter++}`;

        // 2. Initialize index to 0
        out.push({ op: Op.PUSH, arg: 0 });
        out.push({ op: Op.STORE, arg: indexVar });

        // 3. Evaluate array expression (left on stack)
        this.traverse(node.iterable, out);

        // 4. Store array in temporary variable for reuse
        const arrayVar = `_for_array_${this.indexVarCounter}`;
        out.push({ op: Op.STORE, arg: arrayVar });

        // 5. Loop start: check if index < array.length
        const forOfLoopStart = out.length;
        const forOfBreakJumps: number[] = [];
        this.loopStack.push({ startAddr: forOfLoopStart, breakJumps: forOfBreakJumps });

        // Load index
        out.push({ op: Op.LOAD, arg: indexVar });

        // Get array length using variable-based ARR_LEN
        out.push({ op: Op.ARR_LEN, arg: arrayVar });

        // Compare: index < length
        out.push({ op: Op.LT });

        // Jump if condition false (exit loop)
        const forOfJmpNotIdx = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 }); // placeholder

        // 6. Get element: array[index]
        out.push({ op: Op.LOAD, arg: arrayVar });
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.ARR_GET });

        // Store in loop variable
        out.push({ op: Op.STORE, arg: node.variable });

        // 7. Execute loop body
        this.traverse(node.body, out);

        // 8. Increment index: index = index + 1
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.PUSH, arg: 1 });
        out.push({ op: Op.ADD });
        out.push({ op: Op.STORE, arg: indexVar });

        // 9. Jump back to loop condition
        out.push({ op: Op.JMP, arg: forOfLoopStart });

        // 10. Patch JMP_NOT to point here (loop end)
        out[forOfJmpNotIdx].arg = out.length;

        // Patch all break jumps
        for (const bj of forOfBreakJumps) {
          out[bj].arg = out.length;
        }
        this.loopStack.pop();
        break;
      }

      // ── Array Method Calls (Phase 3 Step 2) ──────────────────────
      // object.method(args) → evaluate and call
      case 'MethodCall':
      case 'methodCall':
        // Evaluate the object
        this.traverse(node.object, out);

        // Store object temporarily
        const methodObjVar = `_method_obj_${this.indexVarCounter++}`;
        out.push({ op: Op.STORE, arg: methodObjVar });

        // Evaluate arguments and generate method-specific IR
        this.generateMethodCallIR(node.method, node.args, methodObjVar, out);
        break;

      // ── Phase 4 Step 5: Import Statement ───────────────────────
      case 'import':
      case 'ImportStatement':
        // Import는 컨텍스트에서 처리됨
        // IR 지시사항은 이미 generateImportIR에서 생성됨
        break;

      // ── Phase 4 Step 5: Export Statement ───────────────────────
      case 'export':
      case 'ExportStatement':
        // Export는 선언만 처리 (함수나 변수 선언)
        const exportStmt = node as ExportStatement;
        this.traverse(exportStmt.declaration, out);
        break;

      // ── Function Statement (from Phase 4 Step 5) ─────────────────
      case 'function':
      case 'FunctionStatement':
        // Phase 2: Functions are registered at module level (runner.ts)
        // No need to generate FUNC_DEF IR since registration happens before execution
        // Just skip the function definition here
        break;

      // ── Expression Statement (evaluate and discard result) ────
      case 'expression':
        if (node.expression) {
          this.traverse(node.expression, out);
        }
        break;

      // ── Variable Declaration (let) ──────────────────────────
      case 'variable':
        if (process.env.DEBUG_TRAVERSE) {
          console.log(`[DEBUG TRAVERSE] ✅ REACHED variable case! name="${(node as any).name}"`);
        }
        // Generate code for value expression
        if (node.value) {
          this.traverse(node.value, out);
        } else {
          // No initializer: push undefined (or 0)
          out.push({ op: Op.PUSH, arg: 0 });
        }
        // Store in variable
        if (process.env.DEBUG_TRAVERSE) {
          console.log(`[DEBUG TRAVERSE] Generating STORE for "${(node as any).name}"`);
        }
        out.push({ op: Op.STORE, arg: node.name });
        break;

      // ── Secret-Link: 보안 변수 선언 (암호화 메모리) ─────────
      case 'secret':
        if (node.source === 'config') {
          // Config.load("KEY") → 빌드 타임에 .flconf에서 주입된 값 로드
          out.push({ op: Op.LOAD_SECRET, arg: node.configKey || node.name });
        } else if (node.value) {
          // 리터럴 값 → 암호화 저장
          this.traverse(node.value, out);
        } else {
          out.push({ op: Op.PUSH, arg: 0 });
        }
        // 보안 영역에 저장 (일반 STORE가 아닌 STORE_SECRET)
        out.push({ op: Op.STORE_SECRET, arg: node.name });
        break;

      // ── Return Statement ────────────────────────────────────
      case 'ReturnStatement':
      case 'return':
        // Support both node.value and node.argument (parser compatibility)
        const returnValue = node.value || node.argument;
        if (returnValue) {
          this.traverse(returnValue, out);
        } else {
          out.push({ op: Op.PUSH, arg: 0 });
        }
        out.push({ op: Op.RET });
        break;

      // ── Try-Catch-Finally Statement (Phase I) ───────────────
      case 'TryStatement':
      case 'try':
        {
          // Structure:
          // TRY_START catch_offset
          // [try body]
          // JMP finally_or_end
          // [catch blocks]
          // [finally block]
          // ...

          const tryStartIdx = out.length;
          out.push({ op: Op.TRY_START, arg: 0 }); // Patch catch offset later

          // Generate try body
          if (node.body && node.body.body) {
            for (const stmt of node.body.body) {
              this.traverse(stmt, out);
            }
          }

          // Jump over catch blocks (if they exist)
          const jumpOverCatchIdx = out.length;
          out.push({ op: Op.JMP, arg: 0 }); // Patch offset later

          // Patch try_start to point to catch block
          const catchBlockStart = out.length;
          out[tryStartIdx].arg = catchBlockStart;

          // Generate catch blocks
          if (node.catchClauses && node.catchClauses.length > 0) {
            for (const catchClause of node.catchClauses) {
              // CATCH_START with error variable name
              out.push({
                op: Op.CATCH_START,
                arg: catchClause.parameter || '_error'
              });

              // Generate catch body
              if (catchClause.body && catchClause.body.body) {
                for (const stmt of catchClause.body.body) {
                  this.traverse(stmt, out);
                }
              }

              // CATCH_END (marks end of catch block)
              out.push({ op: Op.CATCH_END });
            }
          }

          // Patch jump-over-catch to point to finally (or end)
          out[jumpOverCatchIdx].arg = out.length;

          // Generate finally block if it exists
          if (node.finallyBody && node.finallyBody.body) {
            for (const stmt of node.finallyBody.body) {
              this.traverse(stmt, out);
            }
          }
        }
        break;

      // ── Throw Statement (Phase I) ────────────────────────────
      case 'ThrowStatement':
      case 'throw':
        {
          // Evaluate the expression (usually a string or variable)
          this.traverse(node.argument, out);
          // Throw the error
          out.push({ op: Op.THROW });
        }
        break;

      // ── Struct Declaration (Phase 16) ───────────────────────
      case 'struct':
      case 'StructDeclaration':
        // Struct declaration: pure type metadata, no runtime effect
        // struct instances are created via object literals { field: value }
        break;

      // ── Reified-Type-System: 타입 별칭 선언 ──────────────────
      // type UserID = int | string → TYPE_DECL 명령어로 컴파일 타임 레지스트리 등록
      // 런타임 오버헤드: 0 (메타데이터 전용, VM이 execute 시 skip)
      case 'typeAlias':
        {
          const { alias, definition, isUnion, members } = node;

          // TYPE_DECL: "alias=definition" 형태로 인코딩
          // 예: "UserID=int|string" 또는 "Callback=fn(int)->bool"
          const encoded = isUnion && members
            ? `${alias}=${members.join('|')}`
            : `${alias}=${definition}`;

          out.push({ op: Op.TYPE_DECL, arg: encoded });
        }
        break;

      // ── Reified-Type-System: 컴파일 타임 크기 검증 ──────────
      // @static_assert_size<User<int>, 24> → STATIC_ASSERT 명령어
      // VM이 타입 레지스트리에서 실제 크기를 계산하여 불일치 시 컴파일 에러
      case 'staticAssert':
        {
          const { targetType, expectedSize } = node;
          // arg 형식: "TypeName:expectedBytes"
          out.push({ op: Op.STATIC_ASSERT, arg: `${targetType}:${expectedSize}` });
        }
        break;

      // ── Self-Testing Compiler: test 블록 ──────────────────────
      // 릴리즈 빌드에서 test 블록은 완전히 제거 (0바이트)
      // --test 플래그 빌드는 test-runner.ts가 별도로 처리
      case 'test':
        break;  // NOP: 릴리즈 빌드에서 0바이트 제거

      // ── Self-Testing Compiler: expect 어서션 ─────────────────
      // expect(actual).to.be.equal(expected) 형식 → assert_* 함수 호출로 컴파일
      // test-runner.ts가 test 블록을 fn으로 래핑할 때 PROOF_TESTER_STDLIB과 함께 실행
      // 릴리즈: test 블록 자체가 0바이트 → 내부의 assert도 자동 제거
      case 'assert':
        {
          const { kind, actual, expected, sourceDesc } = node;

          if (kind === 'equal') {
            // assert_eq(actual, expected, sourceDesc)
            this.traverse(actual, out);
            this.traverse(expected, out);
            out.push({ op: Op.STR_NEW, arg: sourceDesc });
            out.push({ op: Op.CALL, arg: 'assert_eq' });
          } else if (kind === 'notEqual') {
            // assert_ne(actual, expected, sourceDesc)
            this.traverse(actual, out);
            this.traverse(expected, out);
            out.push({ op: Op.STR_NEW, arg: sourceDesc });
            out.push({ op: Op.CALL, arg: 'assert_ne' });
          } else if (kind === 'true') {
            // assert_true(actual, sourceDesc)
            this.traverse(actual, out);
            out.push({ op: Op.STR_NEW, arg: sourceDesc });
            out.push({ op: Op.CALL, arg: 'assert_true' });
          } else if (kind === 'false') {
            // assert_false(actual, sourceDesc)
            this.traverse(actual, out);
            out.push({ op: Op.STR_NEW, arg: sourceDesc });
            out.push({ op: Op.CALL, arg: 'assert_false' });
          } else if (kind === 'exists') {
            // assert(actual, sourceDesc)  — assert가 falsy이면 실패
            this.traverse(actual, out);
            out.push({ op: Op.STR_NEW, arg: sourceDesc });
            out.push({ op: Op.CALL, arg: 'assert' });
          }
        }
        break;

      // ── Break/Continue ─────────────────────────────────────
      case 'break':
      case 'BreakStatement':
        if (this.loopStack.length > 0) {
          const breakJumpIdx = out.length;
          out.push({ op: Op.JMP, arg: 0 }); // placeholder, patched at loop exit
          this.loopStack[this.loopStack.length - 1].breakJumps.push(breakJumpIdx);
        }
        break;

      case 'continue':
      case 'ContinueStatement':
        if (this.loopStack.length > 0) {
          out.push({ op: Op.JMP, arg: this.loopStack[this.loopStack.length - 1].startAddr });
        }
        break;

      // ── Default (unknown node type) ─────────────────────────
      default:
        throw new Error(`Unknown AST node type: ${node.type}`);
    }
  }

  /**
   * Phase 3 Step 2: Generate IR for array method calls
   * Handles: map, filter, reduce, find, any, all, forEach, flatten, concat, sort
   */
  private generateMethodCallIR(
    method: string,
    args: ASTNode[],
    objVar: string,
    out: Inst[]
  ): void {
    const resultVar = `_method_result_${this.indexVarCounter++}`;
    const indexVar = `_method_idx_${this.indexVarCounter++}`;
    const elemVar = `_method_elem_${this.indexVarCounter++}`;

    switch (method) {
      // ── map: fn<T, U>(array<T>, fn(T) -> U) -> array<U> ──────────
      case 'map':
        if (args.length < 1) throw new Error('map() requires a function argument');

        // Create result array
        out.push({ op: Op.PUSH, arg: 0 }); // Empty array
        out.push({ op: Op.ARR_NEW });
        out.push({ op: Op.STORE, arg: resultVar });

        // Initialize index
        out.push({ op: Op.PUSH, arg: 0 });
        out.push({ op: Op.STORE, arg: indexVar });

        // Loop: while index < array.length
        const mapLoopStart = out.length;
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.ARR_LEN });
        out.push({ op: Op.LT });

        const mapJmpOut = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 }); // Patch later

        // Get element
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.ARR_GET });
        out.push({ op: Op.STORE, arg: elemVar });

        // Call function on element
        this.traverse(args[0], out); // Function expression
        out.push({ op: Op.LOAD, arg: elemVar });
        out.push({ op: Op.CALL }); // Call the function

        // Push result to array
        out.push({ op: Op.LOAD, arg: resultVar });
        out.push({ op: Op.SWAP });
        out.push({ op: Op.ARR_PUSH });

        // Increment index
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.PUSH, arg: 1 });
        out.push({ op: Op.ADD });
        out.push({ op: Op.STORE, arg: indexVar });

        // Jump back
        out.push({ op: Op.JMP, arg: mapLoopStart });
        out[mapJmpOut].arg = out.length;

        // Load result
        out.push({ op: Op.LOAD, arg: resultVar });
        break;

      // ── filter: fn<T>(array<T>, fn(T) -> bool) -> array<T> ──────
      case 'filter':
        if (args.length < 1) throw new Error('filter() requires a predicate function');

        // Create result array
        out.push({ op: Op.PUSH, arg: 0 });
        out.push({ op: Op.ARR_NEW });
        out.push({ op: Op.STORE, arg: resultVar });

        // Initialize index
        out.push({ op: Op.PUSH, arg: 0 });
        out.push({ op: Op.STORE, arg: indexVar });

        // Loop
        const filterLoopStart = out.length;
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.ARR_LEN });
        out.push({ op: Op.LT });

        const filterJmpOut = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 });

        // Get element
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.ARR_GET });
        out.push({ op: Op.STORE, arg: elemVar });

        // Call predicate
        this.traverse(args[0], out);
        out.push({ op: Op.LOAD, arg: elemVar });
        out.push({ op: Op.CALL });

        // Check result
        const filterSkip = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 });

        // Push if true
        out.push({ op: Op.LOAD, arg: resultVar });
        out.push({ op: Op.LOAD, arg: elemVar });
        out.push({ op: Op.ARR_PUSH });

        out[filterSkip].arg = out.length;

        // Increment index
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.PUSH, arg: 1 });
        out.push({ op: Op.ADD });
        out.push({ op: Op.STORE, arg: indexVar });

        // Jump back
        out.push({ op: Op.JMP, arg: filterLoopStart });
        out[filterJmpOut].arg = out.length;

        // Load result
        out.push({ op: Op.LOAD, arg: resultVar });
        break;

      // ── reduce: fn<T, U>(array<T>, fn(U, T) -> U, U) -> U ────────
      case 'reduce':
        if (args.length < 2) throw new Error('reduce() requires reducer function and initial value');

        // Initialize accumulator
        const accumVar = `_accum_${this.indexVarCounter++}`;
        this.traverse(args[1], out); // Initial value
        out.push({ op: Op.STORE, arg: accumVar });

        // Initialize index
        out.push({ op: Op.PUSH, arg: 0 });
        out.push({ op: Op.STORE, arg: indexVar });

        // Loop
        const reduceLoopStart = out.length;
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.ARR_LEN });
        out.push({ op: Op.LT });

        const reduceJmpOut = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 });

        // Get element
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.ARR_GET });
        out.push({ op: Op.STORE, arg: elemVar });

        // Call reducer: fn(accumulator, element)
        this.traverse(args[0], out);
        out.push({ op: Op.LOAD, arg: accumVar });
        out.push({ op: Op.LOAD, arg: elemVar });
        out.push({ op: Op.CALL });

        // Store result
        out.push({ op: Op.STORE, arg: accumVar });

        // Increment index
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.PUSH, arg: 1 });
        out.push({ op: Op.ADD });
        out.push({ op: Op.STORE, arg: indexVar });

        // Jump back
        out.push({ op: Op.JMP, arg: reduceLoopStart });
        out[reduceJmpOut].arg = out.length;

        // Load accumulator (result)
        out.push({ op: Op.LOAD, arg: accumVar });
        break;

      // ── find: fn<T>(array<T>, fn(T) -> bool) -> T ────────────────
      case 'find':
        if (args.length < 1) throw new Error('find() requires a predicate function');

        // Initialize index
        out.push({ op: Op.PUSH, arg: 0 });
        out.push({ op: Op.STORE, arg: indexVar });

        // Loop
        const findLoopStart = out.length;
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.ARR_LEN });
        out.push({ op: Op.LT });

        const findJmpOut = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 });

        // Get element
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.ARR_GET });
        out.push({ op: Op.STORE, arg: elemVar });

        // Call predicate
        this.traverse(args[0], out);
        out.push({ op: Op.LOAD, arg: elemVar });
        out.push({ op: Op.CALL });

        // If found, return element
        const findFound = out.length;
        out.push({ op: Op.JMP_IF, arg: 0 }); // Patch later

        // Increment and continue
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.PUSH, arg: 1 });
        out.push({ op: Op.ADD });
        out.push({ op: Op.STORE, arg: indexVar });
        out.push({ op: Op.JMP, arg: findLoopStart });

        // Found: patch here
        out[findFound].arg = out.length;
        out.push({ op: Op.LOAD, arg: elemVar });
        out[findJmpOut].arg = out.length;
        break;

      // ── concat: fn<T>(array<T>, array<T>) -> array<T> ──────────
      case 'concat':
        if (args.length < 1) throw new Error('concat() requires an array argument');

        // Create result array (copy of first)
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.ARR_DUP });
        out.push({ op: Op.STORE, arg: resultVar });

        // Evaluate second array
        this.traverse(args[0], out);
        out.push({ op: Op.STORE, arg: `_other_array_${this.indexVarCounter++}` });

        // Initialize index for second array
        out.push({ op: Op.PUSH, arg: 0 });
        out.push({ op: Op.STORE, arg: indexVar });

        // Loop through second array
        const concatLoopStart = out.length;
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.LOAD, arg: `_other_array_${this.indexVarCounter - 1}` });
        out.push({ op: Op.ARR_LEN });
        out.push({ op: Op.LT });

        const concatJmpOut = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 });

        // Get element from second array
        out.push({ op: Op.LOAD, arg: `_other_array_${this.indexVarCounter - 1}` });
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.ARR_GET });

        // Push to result
        out.push({ op: Op.LOAD, arg: resultVar });
        out.push({ op: Op.SWAP });
        out.push({ op: Op.ARR_PUSH });

        // Increment index
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.PUSH, arg: 1 });
        out.push({ op: Op.ADD });
        out.push({ op: Op.STORE, arg: indexVar });

        out.push({ op: Op.JMP, arg: concatLoopStart });
        out[concatJmpOut].arg = out.length;

        out.push({ op: Op.LOAD, arg: resultVar });
        break;

      // ── flatten: fn<T>(array<array<T>>) -> array<T> ────────────
      case 'flatten':
        // Create result array
        out.push({ op: Op.PUSH, arg: 0 });
        out.push({ op: Op.ARR_NEW });
        out.push({ op: Op.STORE, arg: resultVar });

        // Initialize index
        out.push({ op: Op.PUSH, arg: 0 });
        out.push({ op: Op.STORE, arg: indexVar });

        // Loop through outer array
        const flattenLoopStart = out.length;
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.ARR_LEN });
        out.push({ op: Op.LT });

        const flattenJmpOut = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 });

        // Get inner array
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.ARR_GET });

        // Merge into result (simplified: just push all elements)
        // Real implementation would loop through inner array
        out.push({ op: Op.LOAD, arg: resultVar });
        out.push({ op: Op.SWAP });
        out.push({ op: Op.ARR_CONCAT });
        out.push({ op: Op.STORE, arg: resultVar });

        // Increment index
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.PUSH, arg: 1 });
        out.push({ op: Op.ADD });
        out.push({ op: Op.STORE, arg: indexVar });

        out.push({ op: Op.JMP, arg: flattenLoopStart });
        out[flattenJmpOut].arg = out.length;

        out.push({ op: Op.LOAD, arg: resultVar });
        break;

      // ── any/all: fn<T>(array<T>, fn(T) -> bool) -> bool ─────────
      case 'any':
        if (args.length < 1) throw new Error('any() requires a predicate function');

        out.push({ op: Op.PUSH, arg: 0 }); // false
        out.push({ op: Op.STORE, arg: resultVar });

        out.push({ op: Op.PUSH, arg: 0 });
        out.push({ op: Op.STORE, arg: indexVar });

        const anyLoopStart = out.length;
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.ARR_LEN });
        out.push({ op: Op.LT });

        const anyJmpOut = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 });

        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.ARR_GET });
        out.push({ op: Op.STORE, arg: elemVar });

        this.traverse(args[0], out);
        out.push({ op: Op.LOAD, arg: elemVar });
        out.push({ op: Op.CALL });

        const anyFound = out.length;
        out.push({ op: Op.JMP_IF, arg: 0 });

        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.PUSH, arg: 1 });
        out.push({ op: Op.ADD });
        out.push({ op: Op.STORE, arg: indexVar });
        out.push({ op: Op.JMP, arg: anyLoopStart });

        out[anyFound].arg = out.length;
        out.push({ op: Op.PUSH, arg: 1 }); // true
        out.push({ op: Op.STORE, arg: resultVar });
        out[anyJmpOut].arg = out.length;

        out.push({ op: Op.LOAD, arg: resultVar });
        break;

      case 'all':
        if (args.length < 1) throw new Error('all() requires a predicate function');

        out.push({ op: Op.PUSH, arg: 1 }); // true
        out.push({ op: Op.STORE, arg: resultVar });

        out.push({ op: Op.PUSH, arg: 0 });
        out.push({ op: Op.STORE, arg: indexVar });

        const allLoopStart = out.length;
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.ARR_LEN });
        out.push({ op: Op.LT });

        const allJmpOut = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 });

        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.ARR_GET });
        out.push({ op: Op.STORE, arg: elemVar });

        this.traverse(args[0], out);
        out.push({ op: Op.LOAD, arg: elemVar });
        out.push({ op: Op.CALL });

        const allFail = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 });

        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.PUSH, arg: 1 });
        out.push({ op: Op.ADD });
        out.push({ op: Op.STORE, arg: indexVar });
        out.push({ op: Op.JMP, arg: allLoopStart });

        out[allFail].arg = out.length;
        out.push({ op: Op.PUSH, arg: 0 }); // false
        out.push({ op: Op.STORE, arg: resultVar });
        out[allJmpOut].arg = out.length;

        out.push({ op: Op.LOAD, arg: resultVar });
        break;

      default:
        throw new Error(`Unknown array method: ${method}`);
    }
  }

  /**
   * Phase 3 Step 3: Generate IR for lambda expression
   * Creates a closure object with captured variables
   *
   * **FIX v2.35**: Lambda parameters must be added to localScope before compiling body
   */
  private generateLambdaIR(lambda: any, out: Inst[]): void {
    // Lambda is represented as:
    // 1. Create function object with closure variables
    // 2. Capture variables from outer scope
    // 3. Load onto stack as a callable object

    // Create lambda function object
    out.push({ op: Op.LAMBDA_NEW });

    // Add closure variables (if any)
    if (lambda.capturedVars && lambda.capturedVars.length > 0) {
      for (const varName of lambda.capturedVars) {
        out.push({ op: Op.LOAD, arg: varName });
        out.push({ op: Op.LAMBDA_CAPTURE, arg: varName });
      }
    }

    // Extract parameter names for proper variable binding
    const paramNames = lambda.params?.map((p: any) =>
      typeof p === 'string' ? p : (p.name || '')
    ) || [];

    // 🔧 FIX v2.35: Save outer scope and add lambda parameters to localScope
    // This ensures that lambda parameters are recognized as local variables
    // when compiling the lambda body
    const savedLocalScope = this.localScope;
    this.localScope = new Set(savedLocalScope);

    // Add all lambda parameters to the local scope
    for (const paramName of paramNames) {
      this.localScope.add(paramName);
    }

    // Store lambda body as instructions
    // Now localScope includes parameters: fn(req) { req.method } will find 'req'
    const bodyInstructions: Inst[] = [];
    this.traverse(lambda.body, bodyInstructions);

    // Restore outer scope
    this.localScope = savedLocalScope;

    out.push({
      op: Op.LAMBDA_SET_BODY,
      arg: lambda.params.length,
      sub: bodyInstructions,
      params: paramNames  // Include parameter names for VM to bind
    });
  }

  /**
   * Build AIIntent from AST (used by compiler pipeline)
   */
  buildIntent(functionName: string, params: string[], ast: ASTNode): AIIntent {
    const instructions = this.generateIR(ast);

    return {
      fn: functionName,
      params: params.map(name => ({ name, type: 'number' })),
      ret: 'number',
      body: instructions,
      meta: { generated_at: Date.now() }
    };
  }
}
