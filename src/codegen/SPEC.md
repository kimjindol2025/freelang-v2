# Phase 7: Code Generator 설계 명세

## 목표
IR(Intermediate Representation)을 x86-64 어셈블리로 변환하는 Code Generator 구현

## 아키텍처

```
FreeLang IR (JSON)
    ↓
CodeGenerator (codegen.free)
    ├─ Opcode 정의 (10개)
    ├─ Register Allocator
    ├─ Stack Frame Manager
    └─ Instruction Selector
    ↓
x86-64 Assembly (.s)
    ↓
Assembler (nasm/as)
    ↓
Object File (.o)
```

## Phase 7 구현 범위

### Week 1: 기본 구현 (Day 1-7)
- ✅ 10개 기본 Opcode: PUSH, POP, ADD, SUB, MUL, DIV, LOAD, STORE, CALL, RET
- ✅ System V AMD64 ABI 호출 규약
- ✅ x86-64 레지스터 할당 (rax, rcx, rdx, rbx, rsi, rdi, r8-r15)
- ✅ Stack frame 관리
- ✅ 20개 테스트 케이스

### Week 2: 고급 기능
- Conditional jumps (JMP, JEQ, JNE, JLT, etc.)
- Loop 최적화
- Function prologue/epilogue
- Exception handling (try/catch → _err_N)

### Week 3: Assembler (Phase 8)
- Machine code generation
- Symbol table
- Relocation table

### Week 4: Linker (Phase 9)
- ELF object linking
- Library linking
- Executable generation

## Opcode 매핑

| IR Opcode | x86-64 | 예시 |
|-----------|--------|------|
| PUSH x | push rax | PUSH 42 → push 42 |
| POP dst | pop rax | POP rax → pop rax |
| ADD | add rax, rbx | ADD → add rax, rbx |
| SUB | sub rax, rbx | SUB → sub rax, rbx |
| MUL | imul rax, rbx | MUL → imul rax, rbx |
| DIV | idiv rbx | DIV → idiv rbx |
| LOAD addr | mov rax, [rbx] | LOAD → mov rax, [addr] |
| STORE addr | mov [rax], rbx | STORE → mov [addr], value |
| CALL fn | call fn | CALL foo → call foo |
| RET | ret | RET → ret |

## System V AMD64 ABI
- 첫 6개 정수 인자: RDI, RSI, RDX, RCX, R8, R9
- 반환값: RAX (64-bit)
- Caller-saved: RAX, RCX, RDX, RSI, RDI, R8-R11
- Callee-saved: RBX, RBP, RSP, R12-R15
- Red zone: RSP-128 (signal handler 안전)

## 파일 구조

```
src/codegen/
├── codegen.free       (~500줄) - CodeGenerator 구현
├── x86_64.free        (~300줄) - x86-64 opcode 테이블
├── tests.free         (~200줄) - 20개 테스트
├── README.md          - 사용 설명서
└── SPEC.md            - 이 파일
```

## Success Criteria
- [ ] 20개 테스트 모두 PASS
- [ ] ~500줄 코드
- [ ] IR → x86-64 ASM 변환 완료
- [ ] System V ABI 준수
- [ ] GOGS에 4-5개 커밋
