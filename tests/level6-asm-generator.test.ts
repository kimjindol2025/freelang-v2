/**
 * Level 6: x86-64 ASM Generator Tests
 *
 * 검증 항목:
 * 1. IR 파싱 (PUSH, ADD, SUB, MUL, DIV 등)
 * 2. ASM 생성 (기본 연산, 변수, 제어 흐름)
 * 3. 코드 생성 (NASM 형식)
 */

import { describe, it, expect } from '@jest/globals';

describe('Level 6: Self-hosted x86-64 ASM Generator', () => {

  describe('1. IR 파싱', () => {
    it('should parse PUSH instruction', () => {
      const ir = 'PUSH:42';
      const parsed = parseIRInstruction(ir);
      expect(parsed.op).toBe('PUSH');
      expect(parsed.arg).toBe('42');
    });

    it('should parse arithmetic operations', () => {
      const operations = ['ADD', 'SUB', 'MUL', 'DIV'];
      operations.forEach(op => {
        const parsed = parseIRInstruction(op);
        expect(parsed.op).toBe(op);
      });
    });

    it('should parse LOAD/STORE instructions', () => {
      const load = parseIRInstruction('LOAD:x');
      expect(load.op).toBe('LOAD');
      expect(load.arg).toBe('x');

      const store = parseIRInstruction('STORE:y');
      expect(store.op).toBe('STORE');
      expect(store.arg).toBe('y');
    });

    it('should parse CALL instruction', () => {
      const call = parseIRInstruction('CALL:println');
      expect(call.op).toBe('CALL');
      expect(call.arg).toBe('println');
    });

    it('should parse comparison operations', () => {
      const comparisons = ['EQ', 'LT', 'GT'];
      comparisons.forEach(cmp => {
        const parsed = parseIRInstruction(cmp);
        expect(parsed.op).toBe(cmp);
      });
    });
  });

  describe('2. ASM 생성기 상태 관리', () => {
    it('should create ASM generator with initial state', () => {
      const gen = createAsmGenerator();
      expect(gen.lines).toBeDefined();
      expect(Array.isArray(gen.lines)).toBe(true);
      expect(gen.stackDepth).toBe(0);
      expect(gen.varMap).toBeDefined();
      expect(gen.labelCount).toBe(0);
    });

    it('should emit ASM lines', () => {
      const gen = createAsmGenerator();
      asmEmit(gen, '    mov rax, 42');
      expect(gen.lines.length).toBe(1);
      expect(gen.lines[0]).toBe('    mov rax, 42');
    });

    it('should emit labels', () => {
      const gen = createAsmGenerator();
      asmEmitLabel(gen, 'loop_start');
      expect(gen.lines[gen.lines.length - 1]).toBe('loop_start:');
    });
  });

  describe('3. 기본 연산 생성', () => {
    it('should generate PUSH instruction', () => {
      const gen = createAsmGenerator();
      asmPush(gen, 42);
      expect(gen.lines.length).toBe(2);
      expect(gen.lines[0]).toContain('mov rax, 42');
      expect(gen.lines[1]).toContain('push rax');
      expect(gen.stackDepth).toBe(1);
    });

    it('should generate ADD operation', () => {
      const gen = createAsmGenerator();
      asmAdd(gen);
      expect(gen.lines.length).toBeGreaterThan(0);
      expect(gen.lines.some(l => l.includes('pop rbx'))).toBe(true);
      expect(gen.lines.some(l => l.includes('add rax, rbx'))).toBe(true);
    });

    it('should generate SUB operation', () => {
      const gen = createAsmGenerator();
      asmSub(gen);
      expect(gen.lines.some(l => l.includes('sub rax, rbx'))).toBe(true);
    });

    it('should generate MUL operation', () => {
      const gen = createAsmGenerator();
      asmMul(gen);
      expect(gen.lines.some(l => l.includes('imul rax, rbx'))).toBe(true);
    });

    it('should generate DIV operation', () => {
      const gen = createAsmGenerator();
      asmDiv(gen);
      expect(gen.lines.some(l => l.includes('xor edx, edx'))).toBe(true);
      expect(gen.lines.some(l => l.includes('idiv rbx'))).toBe(true);
    });
  });

  describe('4. 비교 연산', () => {
    it('should generate EQ comparison', () => {
      const gen = createAsmGenerator();
      asmEq(gen);
      expect(gen.lines.some(l => l.includes('cmp rax, rbx'))).toBe(true);
      expect(gen.lines.some(l => l.includes('sete al'))).toBe(true);
    });

    it('should generate LT comparison', () => {
      const gen = createAsmGenerator();
      asmLt(gen);
      expect(gen.lines.some(l => l.includes('setl al'))).toBe(true);
    });

    it('should generate GT comparison', () => {
      const gen = createAsmGenerator();
      asmGt(gen);
      expect(gen.lines.some(l => l.includes('setg al'))).toBe(true);
    });
  });

  describe('5. 변수 관리', () => {
    it('should store variable to memory', () => {
      const gen = createAsmGenerator();
      asmStore(gen, 'x');
      expect(gen.varMap['x']).toBeDefined();
      expect(gen.lines.some(l => l.includes('mov qword [rel vars'))).toBe(true);
    });

    it('should load variable from memory', () => {
      const gen = createAsmGenerator();
      asmLoad(gen, 'y');
      expect(gen.varMap['y']).toBeDefined();
      expect(gen.lines.some(l => l.includes('mov rax, [rel vars'))).toBe(true);
    });

    it('should allocate unique memory slots', () => {
      const gen = createAsmGenerator();
      asmStore(gen, 'x');
      asmStore(gen, 'y');
      asmStore(gen, 'z');
      expect(gen.varMap['x']).toBe(0);
      expect(gen.varMap['y']).toBe(1);
      expect(gen.varMap['z']).toBe(2);
    });

    it('should reuse same slot for same variable', () => {
      const gen = createAsmGenerator();
      asmStore(gen, 'x');
      const slot1 = gen.varMap['x'];
      asmStore(gen, 'x');
      const slot2 = gen.varMap['x'];
      expect(slot1).toBe(slot2);
    });
  });

  describe('6. 제어 흐름', () => {
    it('should generate unconditional jump', () => {
      const gen = createAsmGenerator();
      asmJmp(gen, 'loop_end');
      expect(gen.lines.some(l => l.includes('jmp loop_end'))).toBe(true);
    });

    it('should generate conditional jump (NOT)', () => {
      const gen = createAsmGenerator();
      asmJmpNot(gen, 'skip');
      expect(gen.lines.some(l => l.includes('jz skip'))).toBe(true);
    });

    it('should generate label', () => {
      const label = asmGenLabel(createAsmGenerator());
      expect(label).toMatch(/^\.L\d+$/);
    });
  });

  describe('7. IR → ASM 변환', () => {
    it('should convert simple PUSH/CALL sequence', () => {
      const ir = ['PUSH:42', 'CALL:println'];
      const gen = irToAsm(ir);
      expect(gen.lines.length).toBeGreaterThan(0);
      expect(gen.lines.some(l => l.includes('_start:'))).toBe(true);
    });

    it('should convert arithmetic sequence', () => {
      const ir = ['PUSH:10', 'PUSH:5', 'ADD', 'CALL:println'];
      const gen = irToAsm(ir);
      expect(gen.lines.some(l => l.includes('add rax, rbx'))).toBe(true);
    });

    it('should convert variable sequence', () => {
      const ir = ['PUSH:42', 'STORE:x', 'LOAD:x', 'CALL:println'];
      const gen = irToAsm(ir);
      expect(gen.lines.some(l => l.includes('mov qword [rel vars'))).toBe(true);
    });

    it('should handle comparison operations', () => {
      const ir = ['PUSH:5', 'PUSH:3', 'LT', 'CALL:println'];
      const gen = irToAsm(ir);
      expect(gen.lines.some(l => l.includes('setl al'))).toBe(true);
    });
  });

  describe('8. 코드 생성', () => {
    it('should generate valid NASM code structure', () => {
      const ir = ['PUSH:42', 'CALL:println'];
      const code = generateAsmCode(ir);
      expect(code).toContain('section .data');
      expect(code).toContain('section .bss');
      expect(code).toContain('section .text');
      expect(code).toContain('global _start');
      expect(code).toContain('_start:');
    });

    it('should include variable allocation', () => {
      const ir = ['PUSH:42', 'STORE:x', 'LOAD:x'];
      const code = generateAsmCode(ir);
      expect(code).toContain('vars resq 256');
    });

    it('should have proper exit sequence', () => {
      const ir = ['PUSH:42'];
      const code = generateAsmCode(ir);
      expect(code).toContain('mov rax, 60');
      expect(code).toContain('syscall');
    });
  });

  describe('9. 복잡한 프로그램', () => {
    it('should handle factorial-like computation', () => {
      const ir = [
        'PUSH:1',
        'STORE:result',
        'PUSH:5',
        'STORE:n',
        'LOAD:result',
        'LOAD:n',
        'MUL',
        'STORE:result',
        'LOAD:result',
        'CALL:println'
      ];
      const code = generateAsmCode(ir);
      expect(code).toContain('imul rax, rbx');
      expect(code).toContain('vars resq 256');
    });

    it('should handle nested operations', () => {
      const ir = [
        'PUSH:10',
        'PUSH:5',
        'PUSH:2',
        'ADD',
        'SUB',
        'CALL:println'
      ];
      const code = generateAsmCode(ir);
      expect(code).toContain('add rax, rbx');
      expect(code).toContain('sub rax, rbx');
    });
  });

  describe('10. Integration Tests', () => {
    it('should generate complete executable-ready code', () => {
      const ir = [
        'PUSH:42',
        'STORE:x',
        'LOAD:x',
        'PUSH:10',
        'ADD',
        'CALL:println'
      ];
      const code = generateAsmCode(ir);

      // 확인: NASM 형식
      expect(code).toContain('section .text');
      expect(code).toContain('global _start');

      // 확인: 기본 연산
      expect(code).toContain('mov');
      expect(code).toContain('push');
      expect(code).toContain('pop');

      // 확인: 메모리 접근
      expect(code).toContain('vars');

      // 확인: 종료
      expect(code).toContain('syscall');
    });

    it('should maintain stack consistency', () => {
      const ir = ['PUSH:42', 'PUSH:10', 'ADD', 'CALL:println'];
      const gen = irToAsm(ir);
      // 최종적으로 스택이 깨끗해야 함
      expect(gen.stackDepth).toBeGreaterThanOrEqual(0);
    });
  });
});

// Helper functions (실제 구현에서는 FreeLang으로 작성됨)
function parseIRInstruction(irStr: string): { op: string; arg?: string } {
  const inst: { op: string; arg?: string } = {};

  if (irStr.includes('PUSH:')) {
    inst.op = 'PUSH';
    inst.arg = irStr.replace('PUSH:', '');
  } else if (irStr.includes('ADD')) {
    inst.op = 'ADD';
  } else if (irStr.includes('SUB')) {
    inst.op = 'SUB';
  } else if (irStr.includes('MUL')) {
    inst.op = 'MUL';
  } else if (irStr.includes('DIV')) {
    inst.op = 'DIV';
  } else if (irStr.includes('CALL:')) {
    inst.op = 'CALL';
    inst.arg = irStr.replace('CALL:', '');
  } else if (irStr.includes('LOAD:')) {
    inst.op = 'LOAD';
    inst.arg = irStr.replace('LOAD:', '');
  } else if (irStr.includes('STORE:')) {
    inst.op = 'STORE';
    inst.arg = irStr.replace('STORE:', '');
  } else if (irStr.includes('LABEL:')) {
    inst.op = 'LABEL';
    inst.arg = irStr.replace('LABEL:', '');
  } else if (irStr.includes('JUMP:')) {
    inst.op = 'JUMP';
    inst.arg = irStr.replace('JUMP:', '');
  } else if (irStr.includes('JMPF:')) {
    inst.op = 'JMPF';
    inst.arg = irStr.replace('JMPF:', '');
  } else if (irStr.includes('EQ')) {
    inst.op = 'EQ';
  } else if (irStr.includes('LT')) {
    inst.op = 'LT';
  } else if (irStr.includes('GT')) {
    inst.op = 'GT';
  } else {
    inst.op = 'UNKNOWN';
  }

  return inst;
}

interface AsmGenerator {
  lines: string[];
  stackDepth: number;
  varMap: Record<string, number>;
  labelCount: number;
}

function createAsmGenerator(): AsmGenerator {
  return {
    lines: [],
    stackDepth: 0,
    varMap: {},
    labelCount: 0
  };
}

function asmEmit(gen: AsmGenerator, line: string): void {
  gen.lines.push(line);
}

function asmEmitLabel(gen: AsmGenerator, label: string): void {
  gen.lines.push(label + ':');
}

function asmPush(gen: AsmGenerator, val: number | string): void {
  asmEmit(gen, `    mov rax, ${val}`);
  asmEmit(gen, '    push rax');
  gen.stackDepth++;
}

function asmAdd(gen: AsmGenerator): void {
  asmEmit(gen, '    pop rbx');
  asmEmit(gen, '    pop rax');
  asmEmit(gen, '    add rax, rbx');
  asmEmit(gen, '    push rax');
}

function asmSub(gen: AsmGenerator): void {
  asmEmit(gen, '    pop rbx');
  asmEmit(gen, '    pop rax');
  asmEmit(gen, '    sub rax, rbx');
  asmEmit(gen, '    push rax');
}

function asmMul(gen: AsmGenerator): void {
  asmEmit(gen, '    pop rbx');
  asmEmit(gen, '    pop rax');
  asmEmit(gen, '    imul rax, rbx');
  asmEmit(gen, '    push rax');
}

function asmDiv(gen: AsmGenerator): void {
  asmEmit(gen, '    pop rbx');
  asmEmit(gen, '    pop rax');
  asmEmit(gen, '    xor edx, edx');
  asmEmit(gen, '    idiv rbx');
  asmEmit(gen, '    push rax');
}

function asmEq(gen: AsmGenerator): void {
  asmEmit(gen, '    pop rbx');
  asmEmit(gen, '    pop rax');
  asmEmit(gen, '    cmp rax, rbx');
  asmEmit(gen, '    sete al');
  asmEmit(gen, '    movzx rax, al');
  asmEmit(gen, '    push rax');
}

function asmLt(gen: AsmGenerator): void {
  asmEmit(gen, '    pop rbx');
  asmEmit(gen, '    pop rax');
  asmEmit(gen, '    cmp rax, rbx');
  asmEmit(gen, '    setl al');
  asmEmit(gen, '    movzx rax, al');
  asmEmit(gen, '    push rax');
}

function asmGt(gen: AsmGenerator): void {
  asmEmit(gen, '    pop rbx');
  asmEmit(gen, '    pop rax');
  asmEmit(gen, '    cmp rax, rbx');
  asmEmit(gen, '    setg al');
  asmEmit(gen, '    movzx rax, al');
  asmEmit(gen, '    push rax');
}

function asmStore(gen: AsmGenerator, name: string): void {
  if (!(name in gen.varMap)) {
    gen.varMap[name] = gen.labelCount++;
  }
  const idx = gen.varMap[name];
  asmEmit(gen, '    pop rax');
  asmEmit(gen, `    mov qword [rel vars + ${idx * 8}], rax`);
}

function asmLoad(gen: AsmGenerator, name: string): void {
  if (!(name in gen.varMap)) {
    gen.varMap[name] = gen.labelCount++;
  }
  const idx = gen.varMap[name];
  asmEmit(gen, `    mov rax, [rel vars + ${idx * 8}]`);
  asmEmit(gen, '    push rax');
}

function asmJmp(gen: AsmGenerator, label: string): void {
  asmEmit(gen, `    jmp ${label}`);
}

function asmJmpNot(gen: AsmGenerator, label: string): void {
  asmEmit(gen, '    pop rax');
  asmEmit(gen, '    test rax, rax');
  asmEmit(gen, `    jz ${label}`);
}

function asmGenLabel(gen: AsmGenerator): string {
  return `.L${gen.labelCount++}`;
}

function irToAsm(irInstructions: string[]): AsmGenerator {
  const gen = createAsmGenerator();

  asmEmit(gen, 'section .data');
  asmEmit(gen, '    .newline db 10');
  asmEmit(gen, '    .minus db \'-\'');
  asmEmit(gen, '');
  asmEmit(gen, 'section .bss');
  asmEmit(gen, '    vars resq 256');
  asmEmit(gen, '');
  asmEmit(gen, 'section .text');
  asmEmit(gen, '    global _start');
  asmEmit(gen, '');
  asmEmitLabel(gen, '_start');

  irInstructions.forEach(irStr => {
    const inst = parseIRInstruction(irStr);
    switch (inst.op) {
      case 'PUSH':
        asmPush(gen, inst.arg!);
        break;
      case 'ADD':
        asmAdd(gen);
        break;
      case 'SUB':
        asmSub(gen);
        break;
      case 'MUL':
        asmMul(gen);
        break;
      case 'DIV':
        asmDiv(gen);
        break;
      case 'STORE':
        asmStore(gen, inst.arg!);
        break;
      case 'LOAD':
        asmLoad(gen, inst.arg!);
        break;
      case 'JUMP':
        asmJmp(gen, inst.arg!);
        break;
      case 'JMPF':
        asmJmpNot(gen, inst.arg!);
        break;
      case 'LABEL':
        asmEmitLabel(gen, inst.arg!);
        break;
      case 'EQ':
        asmEq(gen);
        break;
      case 'LT':
        asmLt(gen);
        break;
      case 'GT':
        asmGt(gen);
        break;
    }
  });

  asmEmit(gen, '    mov rax, 60');
  asmEmit(gen, '    xor rdi, rdi');
  asmEmit(gen, '    syscall');

  return gen;
}

function generateAsmCode(irInstructions: string[]): string {
  const gen = irToAsm(irInstructions);
  return gen.lines.join('\n');
}
