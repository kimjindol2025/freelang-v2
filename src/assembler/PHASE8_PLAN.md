# Phase 8: Assembler - 상세 계획

**기간**: 2026-03-20 ~ 2026-03-26 (Week 3)
**기반**: phase-7.2-advanced (Phase 7 완성)
**목표**: ASM → Machine code → Object file (ELF)

---

## 📋 Phase 8 개요

### 역할
```
Phase 7 Output            Phase 8 (Assembler)          Phase 9 Output
x86-64 Assembly -----→ Tokenize ----→ Parse ----→ Encode ----→ Object File
    (.s)              Instruction    Symbol    Machine         (.o)
                      Definition     Table     Code         (ELF format)
```

### 핵심 책임
1. **Lexer**: ASM 코드 → 토큰
2. **Parser**: 토큰 → 명령어 AST
3. **Encoder**: AST → 기계어 (binary)
4. **Symbol Manager**: 심볼 테이블 관리
5. **Relocation Manager**: 재배치 정보 생성
6. **ELF Writer**: 목적 파일 작성

---

## 🗓️ 주간 스케줄

### Day 15 (Mon): Lexer + Parser
- [ ] x86-64 ASM 토큰화
- [ ] 명령어 파싱
- [ ] 피연산자 해석 (register, memory, immediate)
- [ ] 테스트: 5개

**코드**: ~200줄 (assembler.free)

### Day 16-17 (Tue-Wed): Encoder
- [ ] ModR/M 바이트 생성
- [ ] REX prefix 처리
- [ ] 즉시값 인코딩
- [ ] 상대 주소 (RIP-relative)
- [ ] 테스트: 10개

**코드**: ~300줄 (encoder.free)

### Day 18-19 (Thu-Fri): Symbol & Relocation
- [ ] Symbol table 관리
- [ ] Relocation entry 생성
- [ ] GOT (Global Offset Table) 처리
- [ ] PLT (Procedure Linkage Table) 준비
- [ ] 테스트: 10개

**코드**: ~250줄 (symbol_manager.free)

### Day 20-21 (Sat-Sun): ELF & Integration
- [ ] ELF 헤더 작성
- [ ] 섹션 생성 (.text, .data, .reloc, .symtab)
- [ ] E2E 통합 테스트 (10개)
- [ ] 최종 문서화

**코드**: ~300줄 (elf_writer.free) + ~150줄 (asm_tests.free)

---

## 📐 기술 명세

### 1. x86-64 ASM Format (AT&T Syntax)

```asm
; Label
main:
  push rbp
  mov rbp, rsp
  mov rax, 42        ; immediate
  mov rbx, [rdi]     ; indirect addressing
  add rax, rbx       ; register-to-register
  lea rcx, [rel ...] ; RIP-relative
  call printf
  mov rsp, rbp
  pop rbp
  ret
```

### 2. Instruction Encoding

```
Instruction Format (최대 15바이트):
[Prefix (1-4)] [Opcode (1-3)] [ModR/M] [SIB] [Displacement] [Immediate]

예시:
mov rax, 0x1234567890abcdef
├─ REX.W = 1 (64-bit operand)
├─ Opcode = b8 (MOV r64, imm64)
├─ Operand = RAX
└─ Immediate = 0x1234567890abcdef
```

### 3. Symbol Table

```
Symbol Entry:
{
  name: "main",
  offset: 0x0000,          ; 섹션 내 오프셋
  size: 42,                ; 심볼 크기
  binding: STB_GLOBAL,     ; 외부 참조 가능
  type: STT_FUNC,          ; 함수
  section: .text,
  value: 0x0000            ; 실행 파일에서의 주소
}
```

### 4. Relocation Entry

```
Relocation Entry:
{
  offset: 0x0015,                ; 재배치 위치
  type: R_X86_64_PC32,           ; 재배치 타입
  symbol: "printf",             ; 참조 심볼
  addend: -4,                    ; 가산값 (RELA format)
}

주요 타입:
- R_X86_64_64: 절대 64비트 주소
- R_X86_64_PC32: 32비트 RIP-relative
- R_X86_64_GOT64: GOT 항목
- R_X86_64_PLT32: PLT 항목
```

### 5. ELF 파일 구조

```
ELF Header (64 바이트)
├─ e_magic = 0x7F454C46 ("\x7fELF")
├─ e_class = 2 (64-bit)
├─ e_machine = 0x3E (x86-64)
├─ e_type = 1 (relocatable, .o)
└─ e_entry = 0 (object file)

Program Headers (선택사항, .o에는 불필요)

Section Headers
├─ .text (코드)
├─ .data (초기화된 데이터)
├─ .bss (초기화되지 않은 데이터)
├─ .rela.text (텍스트 재배치)
├─ .symtab (심볼 테이블)
├─ .strtab (문자열 테이블)
└─ 기타 섹션

String Table
├─ 섹션 이름
├─ 심볼 이름
└─ 재배치 정보

Symbol Table
├─ 로컬 심볼
├─ 전역 심볼
└─ undefined 심볼

Relocation Table
└─ 재배치 항목들
```

---

## 🔧 구현 전략

### Phase 1: Lexer/Parser (Day 15)

```free
component Assembler {
  // ASM 토큰 정의
  let tokens = []
  let position = 0

  // Tokenizer
  fn tokenize(asmCode) -> array {
    let lines = asmCode.split("\n")
    let tokens = []

    for (let i = 0; i < lines.length; i = i + 1) {
      let line = trim(lines[i])
      if (line == "" || startsWith(line, ";")) {
        continue  // 빈 줄, 주석 무시
      }

      // 토큰 분해
      let parts = split(line, " ")
      for (let j = 0; j < parts.length; j = j + 1) {
        if (parts[j] != "") {
          tokens = tokens + [parts[j]]
        }
      }
    }

    return tokens
  }

  // Parser: 명령어 해석
  fn parseInstruction(tokens) -> object {
    let instr = {
      mnemonic: tokens[0],    // "mov", "add", etc
      operands: [],
      opcode: nil,
      bytes: nil
    }

    // 피연산자 파싱
    for (let i = 1; i < tokens.length; i = i + 1) {
      instr.operands = instr.operands + [parseOperand(tokens[i])]
    }

    return instr
  }

  // 피연산자 파싱
  fn parseOperand(operandStr) -> object {
    // "rax", "0x1000", "[rdi]", "[rel main]" 등 해석
    if (isRegister(operandStr)) {
      return { type: "register", name: operandStr }
    } else if (isMemory(operandStr)) {
      return { type: "memory", address: operandStr }
    } else if (isImmediate(operandStr)) {
      return { type: "immediate", value: operandStr }
    } else if (isLabel(operandStr)) {
      return { type: "label", name: operandStr }
    }
  }
}
```

### Phase 2: Encoder (Day 16-17)

```free
component InstructionEncoder {
  // x86-64 명령어 인코딩

  fn encodeInstruction(instr) -> string {
    let bytes = ""

    // 1. Prefix 결정
    let prefix = determinePrefixes(instr)
    bytes = bytes + prefix

    // 2. Opcode
    let opcode = lookupOpcode(instr.mnemonic, instr.operands)
    bytes = bytes + opcode

    // 3. ModR/M + SIB (필요시)
    if (needsModRM(instr)) {
      let modrm = encodeModRM(instr)
      bytes = bytes + modrm
    }

    // 4. 피연산자 (Immediate, Displacement)
    let operandBytes = encodeOperands(instr)
    bytes = bytes + operandBytes

    return bytes
  }

  fn encodeModRM(instr) -> string {
    let mod = getMod(instr)
    let reg = getRegCode(instr.operands[0])
    let rm = getRmCode(instr.operands[1])

    let byte = (mod << 6) | (reg << 3) | rm
    return toHex(byte, 2)
  }

  fn encodeSIB(instr) -> string {
    // Scale, Index, Base 인코딩
    let scale = getScale(instr)
    let index = getIndexReg(instr)
    let base = getBaseReg(instr)

    let byte = (scale << 6) | (index << 3) | base
    return toHex(byte, 2)
  }
}
```

### Phase 3: Symbol & Relocation (Day 18-19)

```free
component SymbolManager {
  let symbols = []
  let relocations = []

  // 심볼 추가
  fn addSymbol(name, offset, size, binding, type) -> void {
    let symbol = {
      name: name,
      offset: offset,
      size: size,
      binding: binding,  // STB_LOCAL, STB_GLOBAL
      type: type,        // STT_FUNC, STT_OBJECT, STT_NOTYPE
      section: ".text",
      value: 0           // 링커가 최종 값 결정
    }
    symbols = symbols + [symbol]
  }

  // 재배치 추가
  fn addRelocation(offset, type, symbol, addend) -> void {
    let reloc = {
      offset: offset,
      type: type,           // R_X86_64_PC32 등
      symbol: symbol,
      addend: addend
    }
    relocations = relocations + [reloc]
  }

  // 심볼 찾기
  fn findSymbol(name) -> object {
    for (let i = 0; i < symbols.length; i = i + 1) {
      if (symbols[i].name == name) {
        return symbols[i]
      }
    }
    return nil
  }
}
```

### Phase 4: ELF Writer (Day 20-21)

```free
component ELFWriter {
  fn writeELFFile(filename, sections, symbols, relocations) -> void {
    let elf = {
      header: createELFHeader(),
      sections: sections,
      symbols: symbols,
      relocations: relocations
    }

    // 1. ELF Header 쓰기
    writeELFHeader(filename, elf.header)

    // 2. Section Headers 쓰기
    writeSectionHeaders(filename, elf.sections)

    // 3. 섹션 데이터 쓰기
    writeSectionData(filename, elf.sections)

    // 4. Symbol Table 쓰기
    writeSymbolTable(filename, elf.symbols)

    // 5. Relocation Table 쓰기
    writeRelocationTable(filename, elf.relocations)

    // 6. String Table 쓰기
    writeStringTable(filename)
  }

  fn createELFHeader() -> object {
    return {
      e_magic: 0x7F454C46,    // "\x7fELF"
      e_class: 2,             // 64-bit
      e_data: 1,              // little-endian
      e_version: 1,
      e_osabi: 0,             // Unix System V ABI
      e_abiversion: 0,
      e_type: 1,              // ET_REL (relocatable)
      e_machine: 0x3E,        // EM_X86_64
      e_version: 1,
      e_entry: 0,             // .o 파일은 entry point 없음
      e_phoff: 0,             // program header offset
      e_shoff: 64,            // section header offset
      e_flags: 0,
      e_ehsize: 64,           // ELF header size
      e_phentsize: 0,
      e_phnum: 0,
      e_shentsize: 64,        // section header entry size
      e_shnum: 0,             // section count
      e_shstrndx: 0           // string table section index
    }
  }
}
```

---

## 📊 목표 메트릭

| 항목 | Week 2 | Week 3 | 증가 |
|------|--------|--------|------|
| 코드 (줄) | 2,090 | 3,000+ | +910 |
| 테스트 | 25 | 35 | +10 |
| 커밋 | 2 | 4-5 | +2-3 |

---

## ✅ 완료 체크리스트

### Day 15: Lexer/Parser
- [ ] 토큰화 함수
- [ ] 명령어 파싱
- [ ] 피연산자 해석
- [ ] 5개 테스트

### Day 16-17: Encoder
- [ ] ModR/M 인코딩
- [ ] REX prefix
- [ ] Immediate 값
- [ ] RIP-relative 주소
- [ ] 10개 테스트

### Day 18-19: Symbol/Relocation
- [ ] 심볼 테이블
- [ ] 재배치 항목
- [ ] GOT 준비
- [ ] 10개 테스트

### Day 20-21: ELF & Integration
- [ ] ELF 헤더
- [ ] 섹션 생성
- [ ] E2E 테스트 (10개)
- [ ] 문서화

---

## 🎯 성공 기준

- ✅ ASM 파일 읽기 및 파싱
- ✅ x86-64 기계어 생성
- ✅ Symbol table 관리
- ✅ 재배치 정보 생성
- ✅ ELF 목적 파일 생성
- ✅ 35+ 테스트 PASS
- ✅ 기본 명령어 인코딩 (50+)
- ✅ 문서화 완성

---

**Status**: Ready for Week 3 Execution
**Start Date**: 2026-03-20
**Target Completion**: 2026-03-26
