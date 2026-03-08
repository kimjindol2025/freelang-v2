/**
 * FreeLang v2 Compiler Optimization (Phase C-2)
 *
 * Optimizations:
 * 1. IR array reuse (no concatenation)
 * 2. ADCE iteration limiting
 * 3. Constant folding with early termination
 */

export interface IRInstruction {
  op: string;
  args?: any[];
  result?: string;
  metadata?: Record<string, any>;
}

/**
 * Efficient IR builder using array append instead of concat
 */
export class IRBuilder {
  private ir: IRInstruction[] = [];
  private labelCounter: number = 0;
  private registerCounter: number = 0;

  /**
   * Emit instruction directly to IR array
   */
  emit(instruction: IRInstruction): void {
    this.ir.push(instruction);
  }

  /**
   * Emit multiple instructions at once
   */
  emitAll(instructions: IRInstruction[]): void {
    this.ir.push(...instructions);
  }

  /**
   * Generate unique label
   */
  generateLabel(): string {
    return `L${this.labelCounter++}`;
  }

  /**
   * Generate unique register
   */
  generateRegister(): string {
    return `$r${this.registerCounter++}`;
  }

  /**
   * Get IR array without copying
   */
  getIR(): IRInstruction[] {
    return this.ir;
  }

  /**
   * Get IR array and reset
   */
  finalize(): IRInstruction[] {
    const result = this.ir;
    this.ir = [];
    this.labelCounter = 0;
    this.registerCounter = 0;
    return result;
  }

  /**
   * Get current IR size
   */
  size(): number {
    return this.ir.length;
  }

  /**
   * Reset IR
   */
  reset(): void {
    this.ir = [];
    this.labelCounter = 0;
    this.registerCounter = 0;
  }

  /**
   * Append IR from another builder
   */
  append(other: IRBuilder): void {
    this.ir.push(...other.ir);
  }
}

/**
 * LLVM-style optimization passes with iteration limiting
 */
export class CompilerOptimizer {
  private maxIterations: number = 3;
  private passResults: Array<{ passName: string; changed: boolean; removed: number }> = [];

  /**
   * Apply dead code elimination with iteration limiting
   */
  eliminateDeadCode(ir: IRInstruction[]): { ir: IRInstruction[]; changed: boolean; removed: number } {
    const liveInstructions = new Set<number>();
    const used = new Set<string>();

    // Mark instructions with side effects as live
    for (let i = ir.length - 1; i >= 0; i--) {
      const instr = ir[i];

      // Side effect instructions are always live
      if (this.hasSideEffect(instr)) {
        liveInstructions.add(i);
        if (instr.args) {
          instr.args.forEach(arg => {
            if (typeof arg === 'string') used.add(arg);
          });
        }
      }

      // Instructions that define used values are live
      if (instr.result && used.has(instr.result)) {
        liveInstructions.add(i);
        if (instr.args) {
          instr.args.forEach(arg => {
            if (typeof arg === 'string') used.add(arg);
          });
        }
      }
    }

    // Filter IR to keep only live instructions
    const filtered = ir.filter((_, idx) => liveInstructions.has(idx));
    const removed = ir.length - filtered.length;
    const changed = removed > 0;

    this.passResults.push({
      passName: 'ADCE',
      changed,
      removed
    });

    return { ir: filtered, changed, removed };
  }

  /**
   * Constant folding with early termination
   */
  constantFold(ir: IRInstruction[]): { ir: IRInstruction[]; changed: boolean } {
    let changed = false;

    for (let i = 0; i < ir.length; i++) {
      const instr = ir[i];

      if (instr.op === 'add' || instr.op === 'sub' || instr.op === 'mul' || instr.op === 'div') {
        const [left, right] = instr.args || [];

        // Check if both operands are constants
        if (typeof left === 'number' && typeof right === 'number') {
          let result: number;

          switch (instr.op) {
            case 'add': result = left + right; break;
            case 'sub': result = left - right; break;
            case 'mul': result = left * right; break;
            case 'div': result = left / right; break;
            default: continue;
          }

          // Replace with MOV instruction
          ir[i] = {
            op: 'mov',
            args: [instr.result, result],
            result: instr.result
          };

          changed = true;
        }
      }
    }

    this.passResults.push({
      passName: 'ConstantFold',
      changed,
      removed: 0
    });

    return { ir, changed };
  }

  /**
   * Inline small functions
   */
  inlineSmallFunctions(ir: IRInstruction[]): { ir: IRInstruction[]; changed: boolean } {
    // Track function definitions and their sizes
    const functions: Map<string, { start: number; end: number; size: number }> = new Map();
    const smallThreshold = 5; // Max instructions to inline
    let changed = false;

    // First pass: identify functions
    for (let i = 0; i < ir.length; i++) {
      if (ir[i].op === 'fn_start') {
        const fnName = ir[i].args?.[0];
        functions.set(fnName, { start: i, end: -1, size: 0 });
      } else if (ir[i].op === 'fn_end') {
        const fnName = ir[i].args?.[0];
        const fn = functions.get(fnName);
        if (fn) {
          fn.end = i;
          fn.size = i - fn.start;
        }
      }
    }

    // Second pass: inline small functions
    const resultIr: IRInstruction[] = [];
    for (let i = 0; i < ir.length; i++) {
      const instr = ir[i];

      if (instr.op === 'call') {
        const fnName = instr.args?.[0];
        const fn = functions.get(fnName);

        // Inline if small
        if (fn && fn.size < smallThreshold && fn.size > 0) {
          // Copy function body
          for (let j = fn.start + 1; j < fn.end; j++) {
            resultIr.push({ ...ir[j] });
          }
          changed = true;
          continue;
        }
      }

      resultIr.push(instr);
    }

    this.passResults.push({
      passName: 'InlineSmallFunctions',
      changed,
      removed: 0
    });

    return { ir: changed ? resultIr : ir, changed };
  }

  /**
   * Optimize IR with iteration limiting
   */
  optimize(ir: IRInstruction[]): { ir: IRInstruction[]; stats: any } {
    let currentIr = ir;
    let iteration = 0;
    let madeChanges = true;

    // Limit iterations to prevent infinite optimization loops
    while (madeChanges && iteration < this.maxIterations) {
      madeChanges = false;

      // Apply optimization passes
      const dcResult = this.eliminateDeadCode(currentIr);
      if (dcResult.changed) {
        currentIr = dcResult.ir;
        madeChanges = true;
      }

      const cfResult = this.constantFold(currentIr);
      if (cfResult.changed) {
        currentIr = cfResult.ir;
        madeChanges = true;
      }

      const ifResult = this.inlineSmallFunctions(currentIr);
      if (ifResult.changed) {
        currentIr = ifResult.ir;
        madeChanges = true;
      }

      iteration++;
    }

    return {
      ir: currentIr,
      stats: {
        iterations: iteration,
        originalSize: ir.length,
        optimizedSize: currentIr.length,
        reduction: ((ir.length - currentIr.length) / ir.length * 100).toFixed(2) + '%',
        passes: this.passResults
      }
    };
  }

  /**
   * Check if instruction has side effects
   */
  private hasSideEffect(instr: IRInstruction): boolean {
    const sideEffectOps = ['call', 'print', 'throw', 'return', 'store', 'fn_start', 'fn_end'];
    return sideEffectOps.includes(instr.op);
  }

  /**
   * Get optimization statistics
   */
  getStats(): Array<{ passName: string; changed: boolean; removed: number }> {
    return this.passResults;
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.passResults = [];
  }
}

/**
 * IR analysis utilities
 */
export class IRAnalyzer {
  /**
   * Analyze IR complexity
   */
  static analyzeComplexity(ir: IRInstruction[]): {
    instructionCount: number;
    avgNesting: number;
    maxNesting: number;
  } {
    let nesting = 0;
    let maxNesting = 0;
    let totalNesting = 0;
    let nestingOps = 0;

    for (const instr of ir) {
      if (instr.op === 'label' || instr.op === 'jmp' || instr.op === 'cond_jmp') {
        totalNesting += nesting;
        nestingOps++;
      }

      if (instr.op === 'block_start') nesting++;
      if (instr.op === 'block_end') nesting--;

      maxNesting = Math.max(maxNesting, nesting);
    }

    return {
      instructionCount: ir.length,
      avgNesting: nestingOps > 0 ? totalNesting / nestingOps : 0,
      maxNesting
    };
  }

  /**
   * Find hot spots (frequently called instructions)
   */
  static findHotSpots(ir: IRInstruction[]): Array<{ instruction: string; count: number }> {
    const counts: Record<string, number> = {};

    for (const instr of ir) {
      counts[instr.op] = (counts[instr.op] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([instruction, count]) => ({ instruction, count }))
      .sort((a, b) => b.count - a.count);
  }
}
