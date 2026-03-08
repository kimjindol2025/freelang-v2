/**
 * FreeLang VM Executor
 * 바이트코드 실행 (ISA v1.0 인터프리터)
 */

enum OpCode {
  NOP = 0,
  HALT = 1,
  MOV = 2,
  ADD = 3,
  SUB = 4,
  MUL = 5,
  DIV = 6,
  CMP = 7,
  JMP = 8,
  JMP_IF = 9,
  CALL = 10,
  RET = 11,
  PUSH = 12,
  POP = 13,
  LOAD = 14,
  STORE = 15,
  TRY_BEGIN = 16,
  TRY_END = 17,
  RAISE = 18,
  CATCH = 19,
  FOR_INIT = 20,
  FOR_NEXT = 21,
}

/**
 * FreeLang VM
 */
export class VM {
  // 레지스터 (8개, 각 32비트)
  private registers: number[] = new Array(8).fill(0);

  // 메모리 (4KB)
  private memory: number[] = new Array(4096).fill(0);

  // 스택 (1K 엔트리)
  private stack: number[] = [];

  // 프로그램 카운터
  private pc: number = 0;

  // 플래그
  private flags = {
    Z: false, // Zero
    C: false, // Carry
    S: false, // Sign
    E: false, // Equal
    L: false, // Less
  };

  // 예외 상태
  private exception: string | null = null;

  /**
   * VM 초기화
   */
  constructor() {
    this.registers = new Array(8).fill(0);
    this.memory = new Array(4096).fill(0);
    this.stack = [];
    this.pc = 0;
  }

  /**
   * 바이트코드 실행
   */
  run(bytecode: number[]): number {
    this.pc = 0;

    while (this.pc < bytecode.length) {
      const opcode = bytecode[this.pc];

      // 명령어 디코딩 및 실행
      switch (opcode) {
        case OpCode.NOP:
          this.pc++;
          break;

        case OpCode.HALT:
          return this.registers[0]; // R0의 값 반환

        case OpCode.MOV: {
          // MOV dest, const
          const dest = bytecode[this.pc + 1];
          const const_hi = bytecode[this.pc + 2];
          const const_lo = bytecode[this.pc + 3];
          const value = (const_hi << 8) | const_lo;

          this.registers[dest] = value;
          this.pc += 5;
          break;
        }

        case OpCode.ADD: {
          // ADD dest, src1, src2
          const dest = bytecode[this.pc + 1];
          const src1 = bytecode[this.pc + 2];
          const src2 = bytecode[this.pc + 3];

          this.registers[dest] =
            this.registers[src1] + this.registers[src2];
          this.updateFlags(this.registers[dest]);
          this.pc += 5;
          break;
        }

        case OpCode.SUB: {
          // SUB dest, src1, src2
          const dest = bytecode[this.pc + 1];
          const src1 = bytecode[this.pc + 2];
          const src2 = bytecode[this.pc + 3];

          this.registers[dest] =
            this.registers[src1] - this.registers[src2];
          this.updateFlags(this.registers[dest]);
          this.pc += 5;
          break;
        }

        case OpCode.MUL: {
          // MUL dest, src1, src2
          const dest = bytecode[this.pc + 1];
          const src1 = bytecode[this.pc + 2];
          const src2 = bytecode[this.pc + 3];

          this.registers[dest] =
            this.registers[src1] * this.registers[src2];
          this.updateFlags(this.registers[dest]);
          this.pc += 5;
          break;
        }

        case OpCode.DIV: {
          // DIV dest, src1, src2
          const dest = bytecode[this.pc + 1];
          const src1 = bytecode[this.pc + 2];
          const src2 = bytecode[this.pc + 3];

          if (this.registers[src2] === 0) {
            this.exception = 'Division by zero';
            return -1;
          }

          this.registers[dest] = Math.floor(
            this.registers[src1] / this.registers[src2]
          );
          this.updateFlags(this.registers[dest]);
          this.pc += 5;
          break;
        }

        case OpCode.LOAD: {
          // LOAD dest, addr
          const dest = bytecode[this.pc + 1];
          const addr_hi = bytecode[this.pc + 2];
          const addr_lo = bytecode[this.pc + 3];
          const addr = (addr_hi << 8) | addr_lo;

          if (addr < 0 || addr >= this.memory.length) {
            this.exception = `Memory access out of bounds: ${addr}`;
            return -1;
          }

          this.registers[dest] = this.memory[addr];
          this.pc += 5;
          break;
        }

        case OpCode.STORE: {
          // STORE src, addr
          const src = bytecode[this.pc + 1];
          const addr_hi = bytecode[this.pc + 2];
          const addr_lo = bytecode[this.pc + 3];
          const addr = (addr_hi << 8) | addr_lo;

          if (addr < 0 || addr >= this.memory.length) {
            this.exception = `Memory access out of bounds: ${addr}`;
            return -1;
          }

          this.memory[addr] = this.registers[src];
          this.pc += 5;
          break;
        }

        case OpCode.PUSH: {
          // PUSH src
          const src = bytecode[this.pc + 1];
          this.stack.push(this.registers[src]);
          this.pc += 5;
          break;
        }

        case OpCode.POP: {
          // POP dest
          const dest = bytecode[this.pc + 1];
          if (this.stack.length === 0) {
            this.exception = 'Stack underflow';
            return -1;
          }
          this.registers[dest] = this.stack.pop()!;
          this.pc += 5;
          break;
        }

        case OpCode.CMP: {
          // CMP src1, src2
          const src1 = bytecode[this.pc + 1];
          const src2 = bytecode[this.pc + 2];
          const val1 = this.registers[src1];
          const val2 = this.registers[src2];

          this.flags.E = val1 === val2;
          this.flags.L = val1 < val2;
          this.flags.Z = val1 === 0;
          this.flags.S = val1 < 0;

          this.pc += 5;
          break;
        }

        case OpCode.JMP: {
          // JMP addr
          const addr_hi = bytecode[this.pc + 1];
          const addr_lo = bytecode[this.pc + 2];
          const addr = (addr_hi << 8) | addr_lo;

          this.pc = addr;
          break;
        }

        case OpCode.JMP_IF: {
          // JMP_IF condition, addr
          const condition = bytecode[this.pc + 1];
          const addr_hi = bytecode[this.pc + 2];
          const addr_lo = bytecode[this.pc + 3];
          const addr = (addr_hi << 8) | addr_lo;

          let shouldJump = false;

          if (condition === 0) {
            // JMP_IF_ZERO
            shouldJump = this.flags.Z;
          } else if (condition === 1) {
            // JMP_IF_EQUAL
            shouldJump = this.flags.E;
          } else if (condition === 2) {
            // JMP_IF_LESS
            shouldJump = this.flags.L;
          }

          if (shouldJump) {
            this.pc = addr;
          } else {
            this.pc += 5;
          }
          break;
        }

        case OpCode.CALL: {
          // CALL addr
          const addr_hi = bytecode[this.pc + 1];
          const addr_lo = bytecode[this.pc + 2];
          const addr = (addr_hi << 8) | addr_lo;

          this.stack.push(this.pc + 5); // 반환 주소 저장
          this.pc = addr;
          break;
        }

        case OpCode.RET: {
          // RET
          if (this.stack.length === 0) {
            this.exception = 'Return without call';
            return -1;
          }
          this.pc = this.stack.pop()!;
          break;
        }

        default:
          this.exception = `Unknown opcode: ${opcode}`;
          return -1;
      }

      // 무한루프 방지
      if (this.pc > bytecode.length + 1000) {
        this.exception = 'Infinite loop detected';
        return -1;
      }
    }

    return this.registers[0];
  }

  /**
   * 플래그 업데이트
   */
  private updateFlags(value: number): void {
    this.flags.Z = value === 0;
    this.flags.S = value < 0;
    this.flags.C = value > 0xFFFFFFFF;
  }

  /**
   * 레지스터 값 조회
   */
  getRegister(index: number): number {
    return this.registers[index];
  }

  /**
   * 메모리 값 조회
   */
  getMemory(address: number): number {
    return this.memory[address];
  }

  /**
   * 예외 조회
   */
  getException(): string | null {
    return this.exception;
  }

  /**
   * 플래그 조회
   */
  getFlags() {
    return this.flags;
  }
}

/**
 * 바이트코드 디버거
 */
export class VMDebugger {
  /**
   * 바이트코드를 보기 좋게 출력
   */
  static printBytecode(bytecode: number[]): void {
    let i = 0;
    console.log('Bytecode:');
    while (i < bytecode.length) {
      const opcode = bytecode[i];
      let instruction = '';

      switch (opcode) {
        case OpCode.HALT:
          instruction = `HALT`;
          i++;
          break;
        case OpCode.MOV:
          instruction = `MOV r${bytecode[i + 1]}, 0x${(
            (bytecode[i + 2] << 8) |
            bytecode[i + 3]
          )
            .toString(16)
            .padStart(4, '0')}`;
          i += 5;
          break;
        case OpCode.ADD:
          instruction = `ADD r${bytecode[i + 1]}, r${bytecode[i + 2]}, r${bytecode[i + 3]}`;
          i += 5;
          break;
        case OpCode.STORE:
          instruction = `STORE r${bytecode[i + 1]}, [0x${(
            (bytecode[i + 2] << 8) |
            bytecode[i + 3]
          )
            .toString(16)
            .padStart(4, '0')}]`;
          i += 5;
          break;
        default:
          instruction = `0x${opcode.toString(16).padStart(2, '0')}`;
          i++;
      }

      console.log(`  0x${(i - 1).toString(16).padStart(4, '0')}: ${instruction}`);
    }
  }

  /**
   * VM 상태 출력
   */
  static printVMState(vm: VM): void {
    console.log('VM State:');
    for (let i = 0; i < 8; i++) {
      console.log(`  R${i} = ${vm.getRegister(i)}`);
    }
    console.log(`  Flags: Z=${vm.getFlags().Z}, E=${vm.getFlags().E}, L=${vm.getFlags().L}`);
    if (vm.getException()) {
      console.log(`  Exception: ${vm.getException()}`);
    }
  }
}

export { OpCode };
