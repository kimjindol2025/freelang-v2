# Code Generator (Phase 7)

FreeLang IR을 x86-64 어셈블리로 변환합니다.

## 사용법

```free
import CodeGenerator from './codegen.free'

// IR 로드
let ir = {
  instructions: [
    { opcode: "PUSH", arg: 42 },
    { opcode: "ADD", arg1: "rax", arg2: "rbx" },
    { opcode: "RET" }
  ]
}

// Code 생성
let asm = CodeGenerator.generate(ir)
println(asm)

// 출력:
// push 42
// add rax, rbx
// ret
```

## Opcode 지원 (Week 1)

### 스택 연산
- `PUSH value` - 값을 스택에 푸시
- `POP register` - 스택에서 레지스터로 팝

### 산술 연산
- `ADD src, dst` - 더하기
- `SUB src, dst` - 빼기
- `MUL src, dst` - 곱하기
- `DIV src, dst` - 나누기

### 메모리 연산
- `LOAD addr` - 메모리에서 값 로드
- `STORE addr` - 메모리에 값 저장

### 제어 흐름
- `CALL function` - 함수 호출
- `RET` - 함수 반환

## 구현 세부사항

### Register Allocator
- 16개 x86-64 범용 레지스터 관리
- Caller-saved / Callee-saved 분류
- 스택 spill 처리

### Stack Frame Manager
- Function prologue: `push rbp; mov rbp, rsp`
- Function epilogue: `mov rsp, rbp; pop rbp; ret`
- Red zone 고려 (RSP-128 안전)

### ABI Compliance
System V AMD64 ABI 준수:
- 첫 6개 정수 인자: rdi, rsi, rdx, rcx, r8, r9
- 반환값: rax
- 64비트 정렬

## 테스트

```bash
npm test -- codegen.test.ts
```

## 다음 단계 (Week 2)
- [ ] Conditional jumps (jmp, je, jne, jlt, jgt, jle, jge)
- [ ] Loop 최적화 (peephole)
- [ ] Exception handling
- [ ] Switch/match 최적화 (점프 테이블)
