/**
 * FreeLang v2 - IR to C Code Generator
 * Phase 5: AOT 컴파일을 위한 IR → C 코드 변환
 *
 * Stack-based bytecode를 C 코드로 변환
 */

import { Inst, Op } from '../types';

export class IRToCGenerator {
  private varIndexMap: Map<string, number> = new Map();
  private nextVarIndex = 0;

  private getVarIndex(varName: string): number {
    if (!this.varIndexMap.has(varName)) {
      this.varIndexMap.set(varName, this.nextVarIndex++);
    }
    return this.varIndexMap.get(varName)!;
  }

  static generate(instructions: Inst[]): string {
    const gen = new IRToCGenerator();
    return gen.generateProgram(instructions);
  }

  private generateProgram(instructions: Inst[]): string {
    let code = '#include <stdio.h>\n';
    code += '#include <stdlib.h>\n';
    code += '#include <string.h>\n';
    code += '#include <math.h>\n\n';

    code += 'int main() {\n';
    code += '  double stack[1024];\n';
    code += '  int sp = 0;\n';
    code += '  double vars[256];\n';
    code += '  memset(vars, 0, sizeof(vars));\n\n';

    for (let i = 0; i < instructions.length; i++) {
      const inst = instructions[i];
      code += this.generateInstruction(inst, i);
    }

    code += '\n  printf("%g\\n", stack[sp > 0 ? sp - 1 : 0]);\n';
    code += '  return 0;\n';
    code += '}\n';

    return code;
  }

  private generateInstruction(inst: Inst, _idx: number): string {
    const { op, arg } = inst;
    let code = '';

    switch (op) {
      case Op.PUSH:
      case Op.PUSH_FLOAT:
        code += `  stack[sp++] = ${arg};\n`;
        break;
      case Op.POP:
        code += `  sp--;\n`;
        break;
      case Op.ADD:
      case Op.FADD:
        code += `  stack[sp - 2] = stack[sp - 2] + stack[sp - 1];\n  sp--;\n`;
        break;
      case Op.SUB:
      case Op.FSUB:
        code += `  stack[sp - 2] = stack[sp - 2] - stack[sp - 1];\n  sp--;\n`;
        break;
      case Op.MUL:
      case Op.FMUL:
        code += `  stack[sp - 2] = stack[sp - 2] * stack[sp - 1];\n  sp--;\n`;
        break;
      case Op.DIV:
      case Op.FDIV:
        code += `  stack[sp - 2] = stack[sp - 2] / stack[sp - 1];\n  sp--;\n`;
        break;
      case Op.MOD:
        code += `  stack[sp - 2] = (long)stack[sp - 2] % (long)stack[sp - 1];\n  sp--;\n`;
        break;
      case Op.F2I:
        code += `  stack[sp - 1] = (double)(long)stack[sp - 1];\n`;
        break;
      case Op.I2F:
        code += `  stack[sp - 1] = (double)stack[sp - 1];\n`;
        break;
      case Op.EQ:
      case Op.LT:
      case Op.GT:
        code += `  stack[sp - 2] = (stack[sp - 2] ${this.getOpSymbol(op)} stack[sp - 1]) ? 1.0 : 0.0;\n  sp--;\n`;
        break;
      case Op.STORE:
        // STORE: pop from stack and store in variable
        const varIdx = this.getVarIndex(arg as string);
        code += `  vars[${varIdx}] = stack[--sp];\n`;
        break;
      case Op.LOAD:
        // LOAD: push variable onto stack
        const loadIdx = this.getVarIndex(arg as string);
        code += `  stack[sp++] = vars[${loadIdx}];\n`;
        break;
      case Op.HALT:
        // Don't emit return here, it will be added at the end
        code += `  /* halt */\n`;
        break;
    }

    return code;
  }

  private getOpSymbol(op: Op): string {
    switch (op) {
      case Op.EQ: return '==';
      case Op.LT: return '<';
      case Op.GT: return '>';
      default: return '';
    }
  }
}
