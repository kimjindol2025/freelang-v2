/**
 * FreeLang v2 VM Optimization (Phase C-3)
 *
 * Optimizations:
 * 1. Hot path separation
 * 2. Instruction dispatch optimization
 * 3. Stack operation batching
 */

export interface Instruction {
  op: string;
  args?: any[];
}

/**
 * VM with hot path optimization
 */
export class OptimizedVM {
  private stack: any[] = [];
  private registers: any[] = new Array(8);
  private memory: Uint32Array = new Uint32Array(4096);
  private pc: number = 0;

  // Performance counters
  private stats = {
    pushCount: 0,
    popCount: 0,
    addCount: 0,
    callCount: 0,
    otherCount: 0,
    totalInstructions: 0
  };

  /**
   * Execute bytecode with hot path optimization
   */
  execute(bytecode: Instruction[]): any {
    this.pc = 0;

    while (this.pc < bytecode.length) {
      const instr = bytecode[this.pc];
      const op = instr.op;

      // Hot path: separate most common operations
      if (op === 'push') {
        this.stack.push(instr.args?.[0]);
        this.stats.pushCount++;
        this.pc++;
      } else if (op === 'pop') {
        this.stack.pop();
        this.stats.popCount++;
        this.pc++;
      } else if (op === 'add') {
        const right = this.stack.pop();
        const left = this.stack.pop();
        this.stack.push(left + right);
        this.stats.addCount++;
        this.pc++;
      } else if (op === 'call') {
        this.handleCall(instr);
        this.stats.callCount++;
      } else {
        // Cold path: less common operations
        this.handleInstruction(instr);
        this.stats.otherCount++;
      }

      this.stats.totalInstructions++;
    }

    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  /**
   * Handle function call (cold path)
   */
  private handleCall(instr: Instruction): void {
    // Push return address
    this.stack.push(this.pc);
    this.pc = instr.args?.[0] ?? 0;
  }

  /**
   * Handle instruction (cold path - generic dispatch)
   */
  private handleInstruction(instr: Instruction): void {
    switch (instr.op) {
      case 'mov':
        this.registers[instr.args?.[0]] = instr.args?.[1];
        break;
      case 'sub':
        {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.stack.push(left - right);
        }
        break;
      case 'mul':
        {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.stack.push(left * right);
        }
        break;
      case 'div':
        {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.stack.push(left / right);
        }
        break;
      case 'load':
        this.stack.push(this.memory[instr.args?.[0] ?? 0]);
        break;
      case 'store':
        this.memory[instr.args?.[0] ?? 0] = this.stack.pop();
        break;
      case 'halt':
        this.pc = Number.MAX_SAFE_INTEGER;
        break;
      default:
        // Unknown instruction
        break;
    }

    this.pc++;
  }

  /**
   * Get execution statistics
   */
  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * Reset VM state
   */
  reset(): void {
    this.stack = [];
    this.registers = new Array(8);
    this.memory = new Uint32Array(4096);
    this.pc = 0;
    this.stats = {
      pushCount: 0,
      popCount: 0,
      addCount: 0,
      callCount: 0,
      otherCount: 0,
      totalInstructions: 0
    };
  }
}

/**
 * Threaded code dispatch VM (alternative approach)
 */
export class ThreadedVM {
  private stack: any[] = [];
  private registers: any[] = new Array(8);
  private memory: Uint32Array = new Uint32Array(4096);
  private pc: number = 0;

  // Jump table for dispatch
  private dispatchTable: Map<string, (instr: Instruction) => void> = new Map();

  constructor() {
    this.initializeDispatchTable();
  }

  /**
   * Initialize instruction dispatch table
   */
  private initializeDispatchTable(): void {
    this.dispatchTable.set('push', instr => {
      this.stack.push(instr.args?.[0]);
    });

    this.dispatchTable.set('pop', () => {
      this.stack.pop();
    });

    this.dispatchTable.set('add', () => {
      const right = this.stack.pop();
      const left = this.stack.pop();
      this.stack.push(left + right);
    });

    this.dispatchTable.set('sub', () => {
      const right = this.stack.pop();
      const left = this.stack.pop();
      this.stack.push(left - right);
    });

    this.dispatchTable.set('mul', () => {
      const right = this.stack.pop();
      const left = this.stack.pop();
      this.stack.push(left * right);
    });

    this.dispatchTable.set('div', () => {
      const right = this.stack.pop();
      const left = this.stack.pop();
      this.stack.push(left / right);
    });

    this.dispatchTable.set('load', instr => {
      this.stack.push(this.memory[instr.args?.[0] ?? 0]);
    });

    this.dispatchTable.set('store', instr => {
      this.memory[instr.args?.[0] ?? 0] = this.stack.pop();
    });

    this.dispatchTable.set('call', instr => {
      this.stack.push(this.pc);
      this.pc = instr.args?.[0] ?? 0;
    });

    this.dispatchTable.set('ret', () => {
      this.pc = this.stack.pop() ?? Number.MAX_SAFE_INTEGER;
    });

    this.dispatchTable.set('halt', () => {
      this.pc = Number.MAX_SAFE_INTEGER;
    });
  }

  /**
   * Execute bytecode with threaded dispatch
   */
  execute(bytecode: Instruction[]): any {
    this.pc = 0;

    while (this.pc < bytecode.length) {
      const instr = bytecode[this.pc];
      const handler = this.dispatchTable.get(instr.op);

      if (handler) {
        handler(instr);
      }

      this.pc++;
    }

    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  /**
   * Reset VM state
   */
  reset(): void {
    this.stack = [];
    this.registers = new Array(8);
    this.memory = new Uint32Array(4096);
    this.pc = 0;
  }
}

/**
 * Stack operation batching optimizer
 */
export class StackBatchOptimizer {
  /**
   * Optimize consecutive stack operations
   */
  static optimizeBytecode(bytecode: Instruction[]): Instruction[] {
    const optimized: Instruction[] = [];
    let i = 0;

    while (i < bytecode.length) {
      const instr = bytecode[i];

      // Batch push operations
      if (instr.op === 'push') {
        const batch = [instr];
        let j = i + 1;

        while (j < bytecode.length && bytecode[j].op === 'push') {
          batch.push(bytecode[j]);
          j++;
        }

        if (batch.length > 1) {
          // Emit batched push (if supported)
          optimized.push({
            op: 'push_batch',
            args: batch.map(b => b.args?.[0])
          });
          i = j;
        } else {
          optimized.push(instr);
          i++;
        }
      }
      // Eliminate push/pop pairs
      else if (instr.op === 'push' && i + 1 < bytecode.length && bytecode[i + 1].op === 'pop') {
        // Skip both push and pop
        i += 2;
      }
      // Combine adjacent arithmetic operations
      else if (this.isArithmetic(instr.op) && i + 1 < bytecode.length && this.isArithmetic(bytecode[i + 1].op)) {
        // Can be optimized further
        optimized.push(instr);
        i++;
      } else {
        optimized.push(instr);
        i++;
      }
    }

    return optimized;
  }

  /**
   * Check if operation is arithmetic
   */
  private static isArithmetic(op: string): boolean {
    return ['add', 'sub', 'mul', 'div'].includes(op);
  }

  /**
   * Calculate reduction stats
   */
  static getReductionStats(original: Instruction[], optimized: Instruction[]): {
    originalSize: number;
    optimizedSize: number;
    reduction: string;
  } {
    return {
      originalSize: original.length,
      optimizedSize: optimized.length,
      reduction: ((original.length - optimized.length) / original.length * 100).toFixed(2) + '%'
    };
  }
}

/**
 * VM performance profiler
 */
export class VMProfiler {
  private instructionCounts: Map<string, number> = new Map();
  private executionTimes: Map<string, number> = new Map();
  private totalTime: number = 0;

  /**
   * Record instruction execution
   */
  recordInstruction(op: string, duration: number): void {
    this.instructionCounts.set(op, (this.instructionCounts.get(op) ?? 0) + 1);
    this.executionTimes.set(op, (this.executionTimes.get(op) ?? 0) + duration);
    this.totalTime += duration;
  }

  /**
   * Get profiling report
   */
  getReport(): any {
    const report: any[] = [];

    for (const [op, count] of this.instructionCounts.entries()) {
      const duration = this.executionTimes.get(op) ?? 0;
      const percentage = (duration / this.totalTime * 100).toFixed(2);

      report.push({
        op,
        count,
        duration: duration.toFixed(3) + 'ms',
        percentage: percentage + '%'
      });
    }

    // Sort by duration descending
    report.sort((a, b) => parseFloat(b.duration) - parseFloat(a.duration));

    return {
      totalTime: this.totalTime.toFixed(3) + 'ms',
      instructions: report
    };
  }

  /**
   * Reset profiler
   */
  reset(): void {
    this.instructionCounts.clear();
    this.executionTimes.clear();
    this.totalTime = 0;
  }
}
