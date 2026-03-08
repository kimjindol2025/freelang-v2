// FreeLang v2 VM - Stack-based IR interpreter
// Extended: Now supports strings for Project Ouroboros (Self-Hosting)
// Phase 19: Now supports user-defined functions
// Phase 21: Now supports type-safe execution with runtime validation
// Phase J: Now supports async/await with SimplePromise

import { Op, Inst, VMResult, VMError } from './types';
import { Iterator, IteratorEngine } from './engine/iterator';
import { FunctionRegistry, LocalScope } from './parser/function-registry';
import { FunctionTypeChecker } from './analyzer/type-checker';
import { TypeParser } from './cli/type-parser';
import { NativeFunctionRegistry, NativeFunctionConfig } from './vm/native-function-registry';
import { IRGenerator } from './codegen/ir-generator';
import { registerStdlibFunctions } from './stdlib-builtins';
import { registerTCPFunctions } from './stdlib/net/tcp-native';
import { registerSystemExtendedFunctions } from './stdlib-system-extended';
import { registerSQLiteNativeFunctions } from './stdlib/sqlite-native';
import { registerFsExtendedFunctions } from './stdlib-fs-extended';
import { trackFunctionCall, isHotFunction, generateHotspotReport } from './phase-jit/hotspot-detector';
import { SimplePromise } from './runtime/simple-promise';
import { registerInsightFunctions } from './stdlib/insight-builtins';
import { registerProfilerFunctions } from './stdlib/profiler-builtins';
import { registerORMNativeFunctions } from './stdlib/orm-native';
import {
  registerNativeQueryFunctions,
  cacheQueryBefore,
  cacheQueryAfter,
  CachedQueryConfig,
} from './stdlib-native-query';

const MAX_CYCLES = 100_000;
const MAX_STACK  = 10_000;

export interface TypeWarning {
  functionName: string;
  message: string;
  timestamp: Date;
  paramName?: string;
  expectedType?: string;
  receivedType?: string;
}

export class VM {
  private stack: (number | Iterator | string | number[] | object)[] = [];
  private vars: Map<string, number | number[] | Iterator | string | object> = new Map();
  private pc = 0;
  private cycles = 0;
  private callStack: number[] = [];  // for CALL/RET
  private callbackRegistry: Map<number, Inst[]> = new Map();  // callback_id -> bytecode
  private nextCallbackId = 0;
  private functionRegistry?: FunctionRegistry;  // Phase 19: user-defined functions
  private currentScope?: LocalScope;  // Phase 19: variable scoping
  private typeChecker = new FunctionTypeChecker();  // Phase 21: type-safe execution
  private typeWarnings: TypeWarning[] = [];  // Phase 21: track type warnings
  private nativeFunctionRegistry = new NativeFunctionRegistry();  // Phase 3: FFI native functions
  private tryStack: Array<{ catchOffset: number; errorVar: string }> = [];  // Phase I: Exception handling

  // Performance optimization (Phase C): Hot path instruction handlers
  private instructionHandlers = new Map<Op, (inst: Inst, program: Inst[]) => void>();
  private hotPathOps = new Set<Op>([Op.PUSH, Op.POP, Op.ADD, Op.SUB, Op.MUL, Op.DIV, Op.LOAD, Op.STORE]);
  private handlersInitialized = false;

  constructor(functionRegistry?: FunctionRegistry) {
    this.functionRegistry = functionRegistry;
    // Register stdlib functions (math, string, array, map, io, etc.)
    registerStdlibFunctions(this.nativeFunctionRegistry);
    // Phase 3 Level 3: Register TCP native functions
    registerTCPFunctions(this.nativeFunctionRegistry);
    // Phase C: Register system extended functions (event, logging, scheduler, cache, validation, config)
    registerSystemExtendedFunctions(this.nativeFunctionRegistry);
    // Phase D: Register SQLite native functions
    registerSQLiteNativeFunctions(this.nativeFunctionRegistry);
    // Phase D: Register file system extended functions
    registerFsExtendedFunctions(this.nativeFunctionRegistry);
    // Phase 26: Set VM reference for higher-order functions
    this.nativeFunctionRegistry.setVM(this);
    // Self-Monitoring Kernel: insight_enter/exit/report/json/dashboard/gogs
    registerInsightFunctions(this.nativeFunctionRegistry);
    // Self-Profiling Runtime: profiler_enter/exit/report/flame_json/send_gogs
    registerProfilerFunctions(this.nativeFunctionRegistry);
    // Compile-Time-ORM: orm_table_init/insert/find_all/find_one/update/delete/count
    registerORMNativeFunctions(this.nativeFunctionRegistry);
    // Native-State-Hydration: query_cache_get/set/del/fresh/stale/stats/clear
    registerNativeQueryFunctions(this.nativeFunctionRegistry);
  }

  /**
   * Phase 21: Infer type of a value
   */
  private inferType(value: any): string {
    return TypeParser.inferType(value);
  }

  /**
   * Phase 21: Infer types of stack top N values
   */
  private inferStackTypes(count: number): string[] {
    const types: string[] = [];
    const startIdx = Math.max(0, this.stack.length - count);
    for (let i = startIdx; i < this.stack.length; i++) {
      types.push(this.inferType(this.stack[i]));
    }
    return types;
  }

  /**
   * Phase 21: Check type compatibility and generate warnings
   */
  private checkTypeCompatibility(funcName: string, argTypes: string[], expectedParams: Record<string, string>, paramNames: string[]): boolean {
    const result = this.typeChecker.checkFunctionCall(
      funcName,
      argTypes,
      expectedParams,
      paramNames
    );

    if (!result.compatible) {
      this.typeWarnings.push({
        functionName: funcName,
        message: result.message,
        timestamp: new Date(),
        paramName: result.details?.paramName,
        expectedType: result.details?.expected,
        receivedType: result.details?.received
      });
      console.warn(`Type warning in '${funcName}': ${result.message}`);
    }

    return result.compatible;
  }

  /**
   * Phase 21: Get type warnings
   */
  getTypeWarnings(): TypeWarning[] {
    return [...this.typeWarnings];
  }

  /**
   * Phase 21: Clear type warnings
   */
  clearTypeWarnings(): void {
    this.typeWarnings = [];
  }

  /**
   * Phase 21: Get warning count
   */
  getWarningCount(): number {
    return this.typeWarnings.length;
  }

  run(program: Inst[]): VMResult {
    this.stack = [];
    this.vars = new Map();
    this.pc = 0;
    this.cycles = 0;
    this.callStack = [];
    this.tryStack = [];  // Phase I: Reset exception stack
    const t0 = performance.now();

    try {
      // Performance optimization: hot path execution
      while (this.pc < program.length) {
        if (this.cycles++ > MAX_CYCLES) {
          return this.fail(program[this.pc]?.op ?? Op.HALT, 1, 'cycle_limit');
        }
        const inst = program[this.pc];

        // Hot path: handle most common operations directly
        if (this.hotPathOps.has(inst.op)) {
          this.execHotPath(inst, program);
        } else {
          this.exec(inst, program);
        }

        if (inst.op === Op.HALT) break;
      }

      const value = this.stack.length > 0 ? this.stack[this.stack.length - 1] : undefined;
      return { ok: true, value, cycles: this.cycles, ms: performance.now() - t0 };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return this.fail(program[this.pc]?.op ?? Op.HALT, 99, msg, performance.now() - t0);
    }
  }

  /**
   * Hot path execution for most common operations
   * Performance optimization (Phase C): Avoid switch dispatch overhead
   */
  private execHotPath(inst: Inst, program: Inst[]): void {
    const op = inst.op;

    // PUSH: most common operation
    if (op === Op.PUSH) {
      this.guardStack();
      this.stack.push(inst.arg as number);
      this.pc++;
      return;
    }

    // POP
    if (op === Op.POP) {
      this.need(1);
      this.stack.pop();
      this.pc++;
      return;
    }

    // Binary arithmetic (hot operations in math-heavy code)
    if (op === Op.ADD) {
      this.binop((a, b) => a + b);
      return;
    }
    if (op === Op.SUB) {
      this.binop((a, b) => a - b);
      return;
    }
    if (op === Op.MUL) {
      this.binop((a, b) => a * b);
      return;
    }
    if (op === Op.DIV) {
      this.need(2);
      if (this.stack[this.stack.length - 1] === 0) {
        throw new Error('div_zero');
      }
      this.binop((a, b) => a / b);
      return;
    }

    // LOAD: common variable access
    if (op === Op.LOAD) {
      const varName = inst.arg as string;
      const v = this.vars.get(varName);
      if (process.env.DEBUG_STORE) {
        console.log(`[DEBUG LOAD] Getting vars["${varName}"]`);
        console.log(`[DEBUG LOAD] vars keys available:`, Array.from(this.vars.keys()));
        console.log(`[DEBUG LOAD] Result:`, v);
      }
      if (v === undefined) throw new Error('undef_var:' + varName);
      this.guardStack();
      this.stack.push(v);
      this.pc++;
      return;
    }

    // STORE: common variable assignment
    if (op === Op.STORE) {
      this.need(1);
      const varName = inst.arg as string;
      const value = this.stack.pop()!;
      if (process.env.DEBUG_STORE) {
        console.log(`[DEBUG STORE] Setting vars["${varName}"] = ${JSON.stringify(value)}`);
        console.log(`[DEBUG STORE] vars keys before:`, Array.from(this.vars.keys()));
      }
      this.vars.set(varName, value);
      if (process.env.DEBUG_STORE) {
        console.log(`[DEBUG STORE] vars keys after:`, Array.from(this.vars.keys()));
        console.log(`[DEBUG STORE] vars["${varName}"] =`, this.vars.get(varName));
      }
      this.pc++;
      return;
    }

    // Fallback to main exec for other hot path ops
    this.exec(inst, program);
  }

  private exec(inst: Inst, program: Inst[]): void {
    const { op, arg } = inst;

    switch (op) {
      // ── Stack ──
      case Op.PUSH:
        this.guardStack();
        this.stack.push(arg as number);
        this.pc++;
        break;

      case Op.PUSH_FLOAT:
        this.guardStack();
        this.stack.push(arg as number);  // JavaScript number is 64-bit float
        this.pc++;
        break;

      case Op.POP:
        this.need(1);
        this.stack.pop();
        this.pc++;
        break;

      case Op.DUP:
        this.need(1);
        this.guardStack();
        this.stack.push(this.stack[this.stack.length - 1]);
        this.pc++;
        break;

      // ── Arithmetic ──
      case Op.ADD: this.binop((a, b) => a + b); break;
      case Op.SUB: this.binop((a, b) => a - b); break;
      case Op.MUL: this.binop((a, b) => a * b); break;
      case Op.DIV:
        this.need(2);
        if (this.stack[this.stack.length - 1] === 0) {
          throw new Error('div_zero');
        }
        this.binop((a, b) => a / b);
        break;
      case Op.MOD: this.binop((a, b) => a % b); break;
      case Op.NEG:
        this.need(1);
        this.stack[this.stack.length - 1] = -this.stack[this.stack.length - 1];
        this.pc++;
        break;

      // ── Float Arithmetic (Phase 3 Level 3) ──
      case Op.FADD: this.binop((a, b) => a + b); break;  // Same as ADD (JavaScript number is f64)
      case Op.FSUB: this.binop((a, b) => a - b); break;
      case Op.FMUL: this.binop((a, b) => a * b); break;
      case Op.FDIV:
        this.need(2);
        if (this.stack[this.stack.length - 1] === 0) {
          throw new Error('fdiv_zero');
        }
        this.binop((a, b) => a / b);
        break;

      // ── Float Conversions ──
      case Op.F2I:  // float → int
        this.need(1);
        this.stack[this.stack.length - 1] = Math.trunc(this.stack[this.stack.length - 1] as number);
        this.pc++;
        break;
      case Op.I2F:  // int → float (no-op in JavaScript, but semantically correct)
        this.need(1);
        this.stack[this.stack.length - 1] = Number(this.stack[this.stack.length - 1] as number);
        this.pc++;
        break;

      // ── Comparison ──
      case Op.EQ:  this.binop((a, b) => a === b ? 1 : 0); break;
      case Op.NEQ: this.binop((a, b) => a !== b ? 1 : 0); break;
      case Op.LT:  this.binop((a, b) => a < b ? 1 : 0); break;
      case Op.GT:  this.binop((a, b) => a > b ? 1 : 0); break;
      case Op.LTE: this.binop((a, b) => a <= b ? 1 : 0); break;
      case Op.GTE: this.binop((a, b) => a >= b ? 1 : 0); break;

      // ── Logic ──
      case Op.AND: this.binop((a, b) => (a && b) ? 1 : 0); break;
      case Op.OR:  this.binop((a, b) => (a || b) ? 1 : 0); break;
      case Op.NOT:
        this.need(1);
        this.stack[this.stack.length - 1] = this.stack[this.stack.length - 1] ? 0 : 1;
        this.pc++;
        break;

      // ── Variables ──
      case Op.STORE:
        this.need(1);
        this.vars.set(arg as string, this.stack.pop()!);
        this.pc++;
        break;

      case Op.LOAD: {
        const v = this.vars.get(arg as string);
        if (v === undefined) throw new Error('undef_var:' + arg);
        // Push any value type to stack (number, string, array, object)
        this.guardStack();
        this.stack.push(v);
        this.pc++;
        break;
      }

      // ── Control ──
      case Op.JMP:
        this.pc = arg as number;
        break;

      case Op.JMP_IF:
        this.need(1);
        this.pc = this.stack.pop()! ? (arg as number) : this.pc + 1;
        break;

      case Op.JMP_NOT:
        this.need(1);
        this.pc = this.stack.pop()! ? this.pc + 1 : (arg as number);
        break;

      case Op.RET:
      case Op.HALT:
        this.pc = program.length; // exit
        break;

      // ── Array ──
      case Op.ARR_NEW:
        this.vars.set(arg as string, []);
        this.pc++;
        break;

      case Op.ARR_PUSH: {
        this.need(1);
        const arr = this.vars.get(arg as string);
        if (!Array.isArray(arr)) throw new Error('not_array:' + arg);
        arr.push(this.stack.pop() as number);
        this.pc++;
        break;
      }

      case Op.ARR_GET: {
        this.need(2);
        // If arg is provided, use variable-based access
        // Otherwise use stack-based access: stack = [... array/object, index/key]
        let container;
        let key;

        if (arg) {
          // Variable-based: container = vars[arg], key = stack.pop()
          container = this.vars.get(arg as string);
          if (!container || (typeof container !== 'object')) throw new Error('not_indexable:' + arg);
          key = this.stack.pop();
        } else {
          // Stack-based: pop key, then pop container (array or object)
          key = this.stack.pop();
          container = this.stack.pop();
          if (!container || typeof container !== 'object') throw new Error('not_indexable:stack');
        }

        // Handle both arrays and objects
        let value;
        if (Array.isArray(container)) {
          // Convert float indices to int (truncate)
          const idx = Math.floor(key as number);
          if (idx < 0 || idx >= container.length) throw new Error('oob:' + idx);
          value = container[idx];
        } else {
          // Object: use string key
          const strKey = String(key);
          value = (container as any)[strKey];
        }

        this.guardStack();
        this.stack.push(value);
        this.pc++;
        break;
      }

      case Op.ARR_SET: {
        this.need(2);
        const container = this.vars.get(arg as string);
        if (!container || typeof container !== 'object') throw new Error('not_indexable:' + arg);
        const val = this.stack.pop();
        const key = this.stack.pop();

        // Handle both arrays and objects
        if (Array.isArray(container)) {
          // Convert float indices to int (truncate)
          const idx = Math.floor(key as number);
          if (idx < 0 || idx >= container.length) throw new Error('oob:' + idx);
          container[idx] = val;
        } else {
          // Object: use string key
          const strKey = String(key);
          (container as any)[strKey] = val;
        }

        this.pc++;
        break;
      }

      case Op.ARR_LEN: {
        let value;
        if (arg) {
          // Variable-based: value = this.vars.get(arg)
          value = this.vars.get(arg as string);
        } else {
          // Stack-based: pop value from stack
          this.need(1);
          value = this.stack.pop();
        }

        // Support both arrays and strings
        if (value === null || value === undefined) {
          throw new Error('length_on_null');
        }

        // Get length property - works for arrays and strings
        const len = (value as any).length;
        if (typeof len !== 'number') {
          throw new Error('no_length_property');
        }

        this.guardStack();
        this.stack.push(len);
        this.pc++;
        break;
      }

      // ── Object Operations ──────────────────
      case Op.OBJ_NEW:
        this.vars.set(arg as string, {});
        this.pc++;
        break;

      case Op.OBJ_SET: {
        this.need(1);
        const argStr = arg as string;
        const colonIdx = argStr.indexOf(':');
        if (colonIdx === -1) throw new Error('invalid_obj_set:' + argStr);
        const varName = argStr.substring(0, colonIdx);
        const key = argStr.substring(colonIdx + 1);
        const obj = this.vars.get(varName);
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
          throw new Error('not_object:' + varName);
        }
        const val = this.stack.pop();
        (obj as any)[key] = val;
        this.pc++;
        break;
      }

      case Op.OBJ_GET: {
        this.need(2);
        const key = this.stack.pop() as string;
        const obj = this.stack.pop();
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
          throw new Error('not_object:stack');
        }
        this.guardStack();
        const result = (obj as any)[key];
        this.stack.push(result !== undefined ? result : null);
        this.pc++;
        break;
      }

      // ── Array Aggregate (AI shorthand) ──
      case Op.ARR_SUM: {
        const arr = this.getArr(arg as string);
        this.guardStack();
        this.stack.push(arr.reduce((s, x) => s + x, 0));
        this.pc++;
        break;
      }

      case Op.ARR_AVG: {
        const arr = this.getArr(arg as string);
        if (arr.length === 0) throw new Error('empty_arr_avg');
        this.guardStack();
        this.stack.push(arr.reduce((s, x) => s + x, 0) / arr.length);
        this.pc++;
        break;
      }

      case Op.ARR_MAX: {
        const arr = this.getArr(arg as string);
        if (arr.length === 0) throw new Error('empty_arr_max');
        this.guardStack();
        this.stack.push(Math.max(...arr));
        this.pc++;
        break;
      }

      case Op.ARR_MIN: {
        const arr = this.getArr(arg as string);
        if (arr.length === 0) throw new Error('empty_arr_min');
        this.guardStack();
        this.stack.push(Math.min(...arr));
        this.pc++;
        break;
      }

      case Op.ARR_SORT: {
        const arr = this.getArr(arg as string);
        arr.sort((a, b) => a - b);
        this.pc++;
        break;
      }

      case Op.ARR_REV: {
        const arr = this.getArr(arg as string);
        arr.reverse();
        this.pc++;
        break;
      }

      case Op.ARR_MAP: {
        const arr = this.getArr(arg as string);
        if (!inst.sub) throw new Error('arr_map_no_sub');
        const result: number[] = [];
        for (const elem of arr) {
          const savedStack = this.stack;
          this.stack = [elem];
          this.runSub(inst.sub);
          const mappedVal = (this.stack.length > 0 ? this.stack[0] : 0) as number;
          result.push(mappedVal);
          this.stack = savedStack;
        }
        this.vars.set(arg as string, result);
        this.pc++;
        break;
      }

      case Op.ARR_FILTER: {
        const arr = this.getArr(arg as string);
        if (!inst.sub) throw new Error('arr_filter_no_sub');
        const result: number[] = [];
        for (const elem of arr) {
          const savedStack = this.stack;
          this.stack = [elem];
          this.runSub(inst.sub);
          const cond = this.stack.length > 0 ? this.stack[0] : 0;
          if (cond) result.push(elem);
          this.stack = savedStack;
        }
        this.vars.set(arg as string, result);
        this.pc++;
        break;
      }

      case Op.CALL: {
        // Phase 19: Support both user-defined functions and legacy sub-programs
        // Phase 21: Add type checking and validation
        // Phase 3 FFI: Support native functions (C FFI)
        // Phase J: Support async functions
        const funcName = inst.arg as string;

        // Try user-defined function first
        if (this.functionRegistry && funcName && this.functionRegistry.exists(funcName)) {
          const fn = this.functionRegistry.lookup(funcName);
          if (!fn) throw new Error('function_not_found:' + funcName);

          // Get arguments from stack (right-to-left, so reverse)
          const args: any[] = [];
          for (let i = 0; i < fn.params.length; i++) {
            if (this.stack.length === 0) throw new Error('stack_underflow');
            args.unshift(this.stack.pop());
          }

          // Phase 21: Type checking if function has type annotations
          if (this.functionRegistry.hasTypes(funcName)) {
            const types = this.functionRegistry.getTypes(funcName);
            const argTypes = args.map(arg => this.inferType(arg));

            // Check type compatibility (warnings, not errors)
            this.checkTypeCompatibility(funcName, argTypes, types!.params, fn.params);
          }

          // Phase J: If function is async, return a Promise
          if (fn.async) {
            const promise = new SimplePromise((resolve) => {
              // Create function scope with parameters
              const savedVars = this.vars;
              this.vars = new Map(savedVars);
              for (let i = 0; i < fn.params.length; i++) {
                this.vars.set(fn.params[i], args[i]);
              }

              // Execute function body
              const gen = new IRGenerator();
              let returnValue: any = undefined;

              if (!fn.body) {
                throw new Error('function_body_undefined:' + funcName);
              }

              const bodyNode = fn.body || { type: 'block', statements: [] };
              if (!bodyNode.type) {
                bodyNode.type = 'block';
              }

              // Pass function parameters as local scope to IR generator
              const bodyIR = gen.generateIR(bodyNode, fn.params);

              const isMonitoredAsync = fn.annotations && fn.annotations.includes('monitor');
              if (isMonitoredAsync && this.nativeFunctionRegistry.exists('insight_enter')) {
                this.nativeFunctionRegistry.call('insight_enter', [funcName]);
              }

              if (process.env.DEBUG_FUNC_BODY) {
                console.log(`[DEBUG] Async Function ${funcName} body IR (${bodyIR.length} instructions):`);
                bodyIR.forEach((inst, idx) => {
                  const opName = Object.entries(Op).find(([_, v]) => v === inst.op)?.[0] || `Op(${inst.op})`;
                  console.log(`  [${idx}] ${opName} ${inst.arg !== undefined ? inst.arg : ''}`);
                });
              }

              const bodyResult = this.runProgram(bodyIR);
              returnValue = bodyResult.value;

              if (isMonitoredAsync && this.nativeFunctionRegistry.exists('insight_exit')) {
                this.nativeFunctionRegistry.call('insight_exit', [funcName]);
              }

              // Restore caller's variables
              this.vars = savedVars;

              // Resolve promise with return value
              resolve(returnValue);
            });

            this.stack.push(promise);
            this.functionRegistry!.trackCall(funcName);
            if (funcName) {
              trackFunctionCall(funcName);
            }
            this.pc++;
          } else {
            // Normal (sync) function execution
            // Create function scope with parameters
            const savedVars = this.vars;
            this.vars = new Map(savedVars);
            for (let i = 0; i < fn.params.length; i++) {
              this.vars.set(fn.params[i], args[i]);
            }

            // Execute function body - Process statements individually
            // This ensures proper variable scoping for each statement
            const gen = new IRGenerator();
            let returnValue: any = undefined;

            if (!fn.body) {
              throw new Error('function_body_undefined:' + funcName);
            }

            // Execute entire function body as a block
            // Treat fn.body as a block-type node and process all statements together
            const bodyNode = fn.body || { type: 'block', statements: [] };

            // Ensure it has type 'block' for proper IR generation
            if (!bodyNode.type) {
              bodyNode.type = 'block';
            }

            // Generate IR for the entire block (all statements at once)
            // CRITICAL FIX: Pass function parameters to IR generator for proper scoping
            const bodyIR = gen.generateIR(bodyNode, fn.params);

            // Native-State-Hydration: @cached_query(ttl: Xs, stale_time: Ys) 처리
            // annotation 형태: "cached_query:ttl=300000,stale=30000"
            // 함수 실행 전 LRU 캐시 조회 → 히트 시 바디 스킵 + 캐시 값 즉시 반환
            const cachedQueryAnnot = fn.annotations?.find(
              (a: string) => a === 'cached_query' || a.startsWith('cached_query:')
            );
            let _cqKey: string | null = null;
            let _cqCfg: CachedQueryConfig | null = null;
            if (cachedQueryAnnot) {
              const cqResult = cacheQueryBefore(funcName, args, cachedQueryAnnot);
              if (cqResult.hit === true) {
                // 캐시 히트: 함수 바디 실행 스킵
                returnValue = cqResult.value;
                this.vars = savedVars;
                if (returnValue !== undefined) this.stack.push(returnValue);
                this.functionRegistry!.trackCall(funcName);
                if (funcName) trackFunctionCall(funcName);
                this.pc++;
                break;
              } else {
                // 캐시 미스: 실행 후 저장 예약
                _cqKey = cqResult.key;
                _cqCfg = cqResult.cfg;
              }
            }

            // Native-Rate-Shield: @rate_limit(window: Xms, max: N, burst: M) 처리
            // annotation 형태: "rate_limit:window=1000,max=10,burst=10"
            // 함수 실행 전에 Token Bucket 체크 → 차단 시 바디 스킵 + 429 반환
            const rateLimitAnnot = fn.annotations?.find(
              (a: string) => a === 'rate_limit' || a.startsWith('rate_limit:')
            );
            if (rateLimitAnnot && this.nativeFunctionRegistry.exists('shield_check')) {
              const shieldKey = `__shield_${funcName}`;
              // shield_init: 최초 1회만 실행 (idempotent)
              if (this.nativeFunctionRegistry.exists('shield_init')) {
                const paramStr = rateLimitAnnot.includes(':') ? rateLimitAnnot.slice(rateLimitAnnot.indexOf(':') + 1) : '';
                const params: Record<string, number> = {};
                paramStr.split(',').forEach(kv => {
                  const [k, v] = kv.split('=');
                  if (k && v) params[k.trim()] = Number(v.trim());
                });
                this.nativeFunctionRegistry.call('shield_init', [
                  shieldKey,
                  params['window'] ?? 1000,
                  params['max']    ?? 10,
                  params['burst']  ?? (params['max'] ?? 10),
                ]);
              }
              // 클라이언트 키: 첫 번째 인자가 request map이면 IP 추출, 아니면 'global'
              const reqArg = args[0];
              let clientKey = 'global';
              if (reqArg && typeof reqArg === 'object') {
                clientKey = reqArg['x_forwarded_for']
                  ?? reqArg['remote_addr']
                  ?? reqArg['ip']
                  ?? 'global';
              }
              const allowed = this.nativeFunctionRegistry.call('shield_check', [shieldKey, clientKey]);
              if (!allowed) {
                returnValue = {
                  __rate_limited: true,
                  status:  429,
                  headers: { 'Retry-After': '1', 'X-Rate-Limit-By': 'native-rate-shield' },
                  body:    'Too Many Requests',
                };
                // 바디 실행 스킵 → vars 복원 후 리턴
                this.vars = savedVars;
                if (returnValue !== undefined) this.stack.push(returnValue);
                this.functionRegistry!.trackCall(funcName);
                if (funcName) trackFunctionCall(funcName);
                this.pc++;
                break; // inner switch case 탈출
              }
            }

            // Native-Log-Streamer: @log_policy 어노테이션 처리
            // annotation 형태: "log_policy:max_size=104857600,backups=5,compress=gzip,target=/var/log/app.log"
            // 함수명 기반 채널 자동 설정 (최초 1회만)
            const logPolicyAnnot = fn.annotations?.find(
              (a: string) => a === 'log_policy' || a.startsWith('log_policy:')
            );
            if (logPolicyAnnot && this.nativeFunctionRegistry.exists('log_configure')) {
              const lpKey = `__lp_init_${funcName}`;
              if (!(this as any)[lpKey]) {
                (this as any)[lpKey] = true;
                const paramStr = logPolicyAnnot.includes(':')
                  ? logPolicyAnnot.slice(logPolicyAnnot.indexOf(':') + 1)
                  : '';
                const lpParams: Record<string, string> = {};
                paramStr.split(',').forEach(kv => {
                  const eq = kv.indexOf('=');
                  if (eq > 0) lpParams[kv.slice(0, eq).trim()] = kv.slice(eq + 1).trim();
                });
                const lpTarget  = lpParams['target'] || `/tmp/freelang-${funcName}.log`;
                const lpMax     = parseInt(lpParams['max_size'] || '104857600', 10);
                const lpBackups = parseInt(lpParams['backups']  || '3', 10);
                const lpCompress = lpParams['compress'] || 'none';
                this.nativeFunctionRegistry.call('log_configure', [
                  funcName, lpTarget, lpMax, lpBackups, lpCompress
                ]);
              }
              // 함수 진입 시 info 로그 자동 기록 (ch_log_info: 채널 기반 2-arg)
              if (this.nativeFunctionRegistry.exists('ch_log_info')) {
                this.nativeFunctionRegistry.call('ch_log_info', [
                  funcName,
                  `fn ${funcName} called (args=${args.length})`
                ]);
              }
            }

            // Self-Monitoring Kernel: @monitor 어노테이션 → 실행 레벨 주입
            // IR 레벨 삽입 대신 runProgram 전후에 직접 enter/exit 호출
            // → JMP 절대 주소가 깨지는 문제 원천 방지
            const isMonitored = fn.annotations && fn.annotations.includes('monitor');
            if (isMonitored) {
              const insightReg = this.nativeFunctionRegistry;
              if (insightReg.exists('insight_enter')) {
                insightReg.call('insight_enter', [funcName]);
              }
            }

            // Self-Profiling Runtime: @profile(sampling_rate: N, output: .X) 처리
            // annotation 형태: "profile:rate=10,output=flame_graph"
            const profileAnnot = fn.annotations?.find((a: string) => a === 'profile' || a.startsWith('profile:'));
            let isProfiled = false;
            if (profileAnnot) {
              isProfiled = true;
              // 최초 호출 시 프로파일러 활성화 (rate 파싱)
              const rateMatch = profileAnnot.match(/rate=(\d+)/);
              const rateMs = rateMatch ? parseInt(rateMatch[1]) : 10;
              if (this.nativeFunctionRegistry.exists('profiler_enable')) {
                this.nativeFunctionRegistry.call('profiler_enable', [rateMs]);
              }
              if (this.nativeFunctionRegistry.exists('profiler_enter')) {
                this.nativeFunctionRegistry.call('profiler_enter', [funcName]);
              }
            }

            // DEBUG: Log generated IR
            if (process.env.DEBUG_STORE) {
              console.log(`\n[DEBUG] Function ${funcName} body IR (${bodyIR.length} instructions):`);
              bodyIR.forEach((inst, idx) => {
                const opName = Object.entries(Op).find(([_, v]) => v === inst.op)?.[0] || `Op(${inst.op})`;
                console.log(`  [${idx}] ${opName} ${inst.arg !== undefined ? inst.arg : ''}`);
              });
            }

            // DEBUG: Log bodyIR for inspection
            if (process.env.DEBUG_FUNC_BODY) {
              console.log(`[DEBUG] Function ${funcName} body IR (${bodyIR.length} instructions):`);
              bodyIR.forEach((inst, idx) => {
                const opName = Object.entries(Op).find(([_, v]) => v === inst.op)?.[0] || `Op(${inst.op})`;
                console.log(`  [${idx}] ${opName} ${inst.arg !== undefined ? inst.arg : ''}`);
              });
              console.log(`[DEBUG] Current vars before execution:`, Array.from(this.vars.keys()));
            }

            // Execute the body IR
            const bodyResult = this.runProgram(bodyIR);
            returnValue = bodyResult.value;

            // Native-State-Hydration: @cached_query → 결과를 LRU 캐시에 저장
            if (_cqKey && _cqCfg && returnValue !== undefined) {
              cacheQueryAfter(_cqKey, returnValue, _cqCfg);
            }

            // Self-Monitoring Kernel: @monitor → 함수 종료 기록
            if (isMonitored) {
              const insightReg = this.nativeFunctionRegistry;
              if (insightReg.exists('insight_exit')) {
                insightReg.call('insight_exit', [funcName]);
              }
            }

            // Self-Profiling Runtime: @profile → 함수 종료 기록
            if (isProfiled) {
              if (this.nativeFunctionRegistry.exists('profiler_exit')) {
                this.nativeFunctionRegistry.call('profiler_exit', [funcName]);
              }
            }

            // Restore caller's variables
            this.vars = savedVars;

            // Native-CSP-Shield: 응답 객체에 CSP 헤더 자동 주입
            // 함수가 map/object를 반환하면 headers.Content-Security-Policy 삽입
            if (
              returnValue !== null &&
              returnValue !== undefined &&
              typeof returnValue === 'object' &&
              !Array.isArray(returnValue) &&
              this.nativeFunctionRegistry.exists('csp_policy_active')
            ) {
              const cspHeader = this.nativeFunctionRegistry.call('csp_policy_active', []) as string;
              if (cspHeader && cspHeader !== "default-src 'self'" || (cspHeader && (returnValue as any)['__csp_inject'] !== false)) {
                // headers 필드가 없으면 생성
                if (!(returnValue as any).headers) {
                  (returnValue as any).headers = {};
                }
                // 이미 수동으로 설정된 경우 덮어쓰지 않음
                if (!(returnValue as any).headers['Content-Security-Policy']) {
                  (returnValue as any).headers['Content-Security-Policy'] = cspHeader;
                }
              }
            }

            // Push return value (skip if undefined)
            if (returnValue !== undefined) {
              this.stack.push(returnValue);
            }
            this.functionRegistry!.trackCall(funcName);
            // Phase 4: Track function call for JIT hotspot detection
            if (funcName) {
              trackFunctionCall(funcName);
            }
            this.pc++;
          }
        }
        // Phase 3 FFI: Try native function (C FFI)
        else if (funcName && this.nativeFunctionRegistry.exists(funcName)) {
          const nativeFunc = this.nativeFunctionRegistry.get(funcName);
          if (!nativeFunc) throw new Error('native_function_not_found:' + funcName);

          // Get arguments from stack
          const args: any[] = [];
          let paramCount = 0;

          if (nativeFunc.paramCount !== undefined) {
            // 명시적 paramCount 우선 (executor.length 오버라이드)
            paramCount = nativeFunc.paramCount;
          } else if (nativeFunc.signature) {
            paramCount = nativeFunc.signature.parameters.length;
          } else if (nativeFunc.executor) {
            // Use function length if signature is not available
            paramCount = nativeFunc.executor.length;
          }

          for (let i = 0; i < paramCount; i++) {
            if (this.stack.length === 0) throw new Error('stack_underflow');
            args.unshift(this.stack.pop());
          }

          // Call native function and push result
          try {
            const result = this.nativeFunctionRegistry.call(funcName, args);
            // undefined → push null so STORE/consumers don't see stale stack values
            this.guardStack();
            this.stack.push(result !== undefined ? result : null);
          } catch (e: unknown) {
            const err = e instanceof Error ? e.message : String(e);
            throw new Error('native_call_error:' + err);
          }
          // Phase 4: Track native function call for JIT hotspot detection
          trackFunctionCall(funcName);
          this.pc++;
        }
        else if (inst.sub) {
          // Legacy sub-program support
          const subResult = this.runSub(inst.sub);
          if (!subResult.ok) throw new Error('call_failed:' + subResult.error?.detail);
          this.pc++;
        } else {
          throw new Error('call_no_sub');
        }
        break;
      }

      case Op.RET: {
        this.pc = program.length; // exit sub-program
        break;
      }

      // ── Iterator (lazy evaluation) ──
      case Op.ITER_INIT: {
        // stack: [start, end] → [iterator]
        this.need(2);
        const end = this.stack.pop() as number;
        const start = this.stack.pop() as number;
        const iter = IteratorEngine.init(start, end);
        this.guardStack();
        this.stack.push(iter);
        this.pc++;
        break;
      }

      case Op.ITER_HAS: {
        // stack: [iterator] → [bool]
        this.need(1);
        const iter = this.stack[this.stack.length - 1] as Iterator;
        if (!iter || typeof iter !== 'object' || !('current' in iter)) {
          throw new Error('not_iterator');
        }
        const hasMore = IteratorEngine.has(iter);
        this.stack[this.stack.length - 1] = hasMore ? 1 : 0;
        this.pc++;
        break;
      }

      case Op.ITER_NEXT: {
        // stack: [iterator] → [value, iterator]
        this.need(1);
        const iter = this.stack.pop() as Iterator;
        if (!iter || typeof iter !== 'object' || !('current' in iter)) {
          throw new Error('not_iterator');
        }
        const { value, iterator: nextIter } = IteratorEngine.next(iter);
        this.guardStack();
        this.stack.push(value);
        this.guardStack();
        this.stack.push(nextIter);
        this.pc++;
        break;
      }

      // ── String Operations (Project Ouroboros) ──
      case Op.STR_NEW:
        // arg: string → push to stack
        this.guardStack();
        this.stack.push(arg as string);
        this.pc++;
        break;

      case Op.STR_LEN: {
        // stack: [str] → [length]
        this.need(1);
        const str = this.stack[this.stack.length - 1];
        if (typeof str !== 'string') throw new Error('not_string');
        this.stack[this.stack.length - 1] = str.length;
        this.pc++;
        break;
      }

      case Op.STR_AT: {
        // stack: [str, index] → [char]
        this.need(2);
        const idx = this.stack.pop() as number;
        const str = this.stack.pop() as string;
        if (typeof str !== 'string') throw new Error('not_string');
        this.guardStack();
        this.stack.push(str[Math.floor(idx)] || '');
        this.pc++;
        break;
      }

      case Op.STR_SUB: {
        // stack: [str, start, end] → [substr]
        this.need(3);
        const end = this.stack.pop() as number;
        const start = this.stack.pop() as number;
        const str = this.stack.pop() as string;
        if (typeof str !== 'string') throw new Error('not_string');
        this.guardStack();
        this.stack.push(str.substring(Math.floor(start), Math.floor(end)));
        this.pc++;
        break;
      }

      case Op.STR_CONCAT: {
        // stack: [str1, str2] → [str1+str2]
        this.need(2);
        const str2 = this.stack.pop();
        const str1 = this.stack.pop();
        if (typeof str1 !== 'string' || typeof str2 !== 'string') {
          throw new Error('not_string');
        }
        this.guardStack();
        this.stack.push(str1 + str2);
        this.pc++;
        break;
      }

      case Op.STR_EQ: {
        // stack: [str1, str2] → [bool]
        this.need(2);
        const str2 = this.stack.pop();
        const str1 = this.stack.pop();
        if (typeof str1 !== 'string' || typeof str2 !== 'string') {
          throw new Error('not_string');
        }
        this.guardStack();
        this.stack.push(str1 === str2 ? 1 : 0);
        this.pc++;
        break;
      }

      case Op.STR_NEQ: {
        // stack: [str1, str2] → [bool]
        this.need(2);
        const str2 = this.stack.pop();
        const str1 = this.stack.pop();
        if (typeof str1 !== 'string' || typeof str2 !== 'string') {
          throw new Error('not_string');
        }
        this.guardStack();
        this.stack.push(str1 !== str2 ? 1 : 0);
        this.pc++;
        break;
      }

      case Op.CHAR_NEW:
        // arg: char → push to stack
        this.guardStack();
        this.stack.push((arg as string).charAt(0) || '');
        this.pc++;
        break;

      case Op.CHAR_CODE: {
        // stack: [char] → [code]
        this.need(1);
        const char = this.stack[this.stack.length - 1];
        if (typeof char !== 'string' || char.length === 0) {
          throw new Error('not_char');
        }
        this.stack[this.stack.length - 1] = char.charCodeAt(0);
        this.pc++;
        break;
      }

      case Op.CHAR_FROM: {
        // stack: [code] → [char]
        this.need(1);
        const code = this.stack[this.stack.length - 1] as number;
        this.stack[this.stack.length - 1] = String.fromCharCode(Math.floor(code));
        this.pc++;
        break;
      }

      // ── Exception Handling (Phase I) ──
      case Op.TRY_START: {
        // arg: catch block offset
        // Push try context to tryStack
        this.tryStack.push({
          catchOffset: arg as number,
          errorVar: '_error'  // default error variable name
        });
        this.pc++;
        break;
      }

      case Op.CATCH_START: {
        // arg: error variable name
        // Store the error message in the specified variable
        if (this.stack.length > 0) {
          const errorValue = this.stack[this.stack.length - 1];
          this.vars.set(arg as string, errorValue);
        }
        this.pc++;
        break;
      }

      case Op.CATCH_END: {
        // Pop try context from tryStack
        if (this.tryStack.length > 0) {
          this.tryStack.pop();
        }
        this.pc++;
        break;
      }

      case Op.THROW: {
        // stack: [error_message] → throw error
        this.need(1);
        const errorMsg = this.stack.pop();

        // Look for an active try block
        if (this.tryStack.length > 0) {
          // Push error to stack for catch block
          this.guardStack();
          this.stack.push(errorMsg!);
          // Jump to catch block
          const tryContext = this.tryStack[this.tryStack.length - 1];
          this.pc = tryContext.catchOffset;
        } else {
          // No try block, throw JavaScript error
          throw new Error('uncaught_exception:' + String(errorMsg));
        }
        break;
      }

      // ── Lambda / Closure (클로저 객체 생성 및 stack에 push) ──
      case Op.LAMBDA_NEW:
        // closure 객체 준비 (나중에 LAMBDA_SET_BODY에서 완성)
        this.pc++;
        break;

      case Op.LAMBDA_CAPTURE:
        // 캡처된 변수 - 현재는 skip (vm.vars에서 직접 참조)
        this.pc++;
        break;

      case Op.LAMBDA_SET_BODY: {
        // closure 객체 생성: params, body, 캡처된 변수들
        const closureObject: any = {
          type: 'lambda',                       // callClosure가 검사하는 필드
          params: (inst as any).params || [],  // 파라미터 이름 배열
          body: inst.sub || [],                 // body 명령어
          capturedVars: {}                      // 캡처 변수 (런타임에 채워짐)
        };

        // Stack에 closure 객체 push
        this.guardStack();
        this.stack.push(closureObject);
        this.pc++;
        break;
      }

      case Op.FUNC_DEF:
      case Op.COMMENT:
        this.pc++;
        break;

      // ── Debug ──
      case Op.DUMP:
        // AI reads this programmatically, no console.log
        this.pc++;
        break;

      default:
        throw new Error('unknown_op:' + op);
    }
  }

  private binop(fn: (a: number, b: number) => number): void {
    this.need(2);
    const b = this.stack.pop() as number;
    const a = this.stack.pop() as number;
    this.guardStack();
    this.stack.push(fn(a, b));
    this.pc++;
  }

  private need(n: number): void {
    if (this.stack.length < n) {
      throw new Error('stack_underflow:need=' + n + ',have=' + this.stack.length);
    }
  }

  private guardStack(): void {
    if (this.stack.length >= MAX_STACK) {
      throw new Error('stack_overflow');
    }
  }

  private getArr(name: string): number[] {
    const arr = this.vars.get(name);
    if (!Array.isArray(arr)) throw new Error('not_array:' + name);
    return arr;
  }

  private runSub(subProgram: Inst[]): VMResult {
    const savedPc = this.pc;
    this.pc = 0;
    while (this.pc < subProgram.length) {
      if (this.cycles++ > 100_000) {
        const result = this.fail(Op.HALT, 1, 'cycle_limit');
        this.pc = savedPc;
        return result;
      }
      const inst = subProgram[this.pc];
      if (inst.op === Op.RET || inst.op === Op.HALT) {
        this.pc = savedPc;
        break;
      }
      this.exec(inst, subProgram);
    }
    this.pc = savedPc;
    return { ok: true, value: undefined, cycles: this.cycles, ms: 0 };
  }

  /**
   * Phase 19: Run a program IR and return its result
   * Used for function body execution
   */
  private runProgram(program: Inst[]): VMResult {
    const savedPc = this.pc;
    const savedStack = this.stack;  // Save reference, not copy
    this.stack = [];  // Isolated stack for this sub-program
    this.pc = 0;

    try {
      while (this.pc < program.length) {
        if (this.cycles++ > 100_000) {
          this.pc = savedPc;
          this.stack = savedStack;  // Restore stack before returning
          return this.fail(Op.HALT, 1, 'cycle_limit');
        }
        const inst = program[this.pc];
        if (inst.op === Op.RET || inst.op === Op.HALT) {
          break;
        }
        this.exec(inst, program);
      }

      // Get return value from stack
      const value = this.stack.length > 0 ? this.stack[this.stack.length - 1] : undefined;
      this.pc = savedPc;
      this.stack = savedStack;  // Restore stack before returning (was missing in success path!)
      return { ok: true, value, cycles: this.cycles, ms: 0 };
    } catch (e: unknown) {
      this.pc = savedPc;
      this.stack = savedStack;  // Restore stack on error
      const msg = e instanceof Error ? e.message : String(e);
      return this.fail(Op.HALT, 99, msg);
    }
  }

  /**
   * Phase 26: Execute user-defined function with arguments (for higher-order functions)
   * Used by map/filter/reduce callbacks
   */
  public callUserFunction(functionName: string, args: any[]): any {
    if (!this.functionRegistry || !this.functionRegistry.exists(functionName)) {
      throw new Error(`Function not found: ${functionName}`);
    }

    const fn = this.functionRegistry.lookup(functionName);
    if (!fn) throw new Error('function_lookup_failed:' + functionName);

    // Save current state
    const savedVars = this.vars;
    this.vars = new Map(savedVars);

    // Bind parameters
    for (let i = 0; i < fn.params.length; i++) {
      this.vars.set(fn.params[i], args[i]);
    }

    // Execute function body
    const gen = new IRGenerator();
    const bodyNode = fn.body || { type: 'block', body: [] };
    const bodyIR = gen.generateIR(bodyNode);

    let returnValue: any = undefined;
    const result = this.runProgram(bodyIR);
    returnValue = result.value;

    // Restore caller's variables
    this.vars = savedVars;

    return returnValue;
  }

  /**
   * Phase 7-D: Execute closure (lambda/anonymous function) with arguments
   * Closures can be passed as function values to higher-order functions like map/filter/reduce
   */
  public callClosure(closure: any, args: any[]): any {
    // Validate closure structure
    if (!closure || closure.type !== 'lambda') {
      throw new Error('invalid_closure:expected_lambda_object');
    }

    // Save current state and create new scope
    const savedVars = this.vars;
    this.vars = new Map(savedVars);

    // If closure has captured variables, restore them
    if (closure.capturedVars && Array.isArray(closure.capturedVars)) {
      for (const capturedVar of closure.capturedVars) {
        if (capturedVar.name && savedVars.has(capturedVar.name)) {
          this.vars.set(capturedVar.name, savedVars.get(capturedVar.name));
        }
      }
    }

    // Bind closure parameters
    const paramNames = closure.params || [];
    for (let i = 0; i < paramNames.length && i < args.length; i++) {
      const paramName = typeof paramNames[i] === 'string' ? paramNames[i] : paramNames[i].name;
      this.vars.set(paramName, args[i]);
    }

    // Execute closure body
    // Note: closure.body is already IR (instruction array), not AST
    const bodyIR = closure.body;
    if (!bodyIR || !Array.isArray(bodyIR)) {
      throw new Error('closure_body_must_be_ir_array');
    }

    let returnValue: any = undefined;

    try {
      const result = this.runProgram(bodyIR);
      returnValue = result.value;
    } catch (e) {
      // Restore variables before throwing
      this.vars = savedVars;
      throw e;
    }

    // Restore caller's variables
    this.vars = savedVars;

    return returnValue;
  }

  /**
   * Get native function registry (for registering callbacks)
   */
  public getNativeFunctionRegistry(): NativeFunctionRegistry {
    return this.nativeFunctionRegistry;
  }

  private fail(op: Op, code: number, detail: string, ms?: number): VMResult {
    return {
      ok: false,
      cycles: this.cycles,
      ms: ms ?? 0,
      error: {
        code,
        op,
        pc: this.pc,
        stack_depth: this.stack.length,
        detail,
      },
    };
  }

  // ── Callback Management (Phase 16-17) ──
  registerCallback(bytecode: Inst[]): number {
    const id = this.nextCallbackId++;
    this.callbackRegistry.set(id, bytecode);
    return id;
  }

  executeCallback(callbackId: number, _args?: any[]): VMResult {
    const bytecode = this.callbackRegistry.get(callbackId);
    if (!bytecode) {
      return this.fail(Op.HALT, 1, `callback_not_found:${callbackId}`);
    }

    // Execute callback bytecode in isolated context
    const savedStack = this.stack;
    const savedVars = this.vars;
    const savedPc = this.pc;

    this.stack = [];
    this.vars = new Map();
    this.pc = 0;

    const result = this.run(bytecode);

    this.stack = savedStack;
    this.vars = savedVars;
    this.pc = savedPc;

    return result;
  }

  /**
   * Phase 3 FFI: Register a native (C FFI) function
   */
  registerNativeFunction(config: NativeFunctionConfig): boolean {
    return this.nativeFunctionRegistry.register(config);
  }

  /**
   * Phase 3 FFI: Get statistics about registered native functions
   */
  getNativeFunctionStats(): { totalFunctions: number; modules: Record<string, number> } {
    return this.nativeFunctionRegistry.getStats();
  }

  /**
   * Phase 3 FFI: Check if a native function exists
   */
  hasNativeFunction(name: string): boolean {
    return this.nativeFunctionRegistry.exists(name);
  }

  /**
   * Phase 3 FFI: List all available native functions
   */
  listNativeFunctions(): string[] {
    return this.nativeFunctionRegistry.listAll();
  }

  // ── Phase 4: JIT Hotspot Detection ──
  /**
   * Get hotspot detection report
   */
  getHotspotReport(): string {
    return generateHotspotReport();
  }

  /**
   * Check if a function is "hot" (called >= 100 times)
   */
  isHotFunction(funcName: string): boolean {
    return isHotFunction(funcName);
  }

  // ── State inspection (for AI) ──
  getStack(): readonly unknown[] { return this.stack; }
  getVar(name: string): unknown { return this.vars.get(name); }
  getVarNames(): string[] { return [...this.vars.keys()]; }
}
