# Phase 7 Week 2: Advanced Features 계획

**기간**: 2026-03-13 ~ 2026-03-19
**기반**: phase-7-codegen (Week 1 완료)
**목표**: 50개+ Opcode, 50개+ 테스트, 2,500+ 줄 코드

---

## 📅 주간 스케줄

### Day 8 (Mon): Exception Handling
- [ ] Try-catch EH frame 생성
- [ ] 예외 전파 (exception propagation)
- [ ] Unwinding 메커니즘
- [ ] 테스트: 5개

**추정 코드**: +150줄 (codegen.free)

### Day 9-10 (Tue-Wed): Switch Optimization
- [ ] Jump table 생성
- [ ] Switch-case 최적화
- [ ] Pattern matching 통합
- [ ] 테스트: 10개

**추정 코드**: +200줄 (codegen.free) + 100줄 (x86_64.free)

### Day 11-12 (Thu-Fri): Vector Instructions
- [ ] SSE 명령어 추가
- [ ] AVX 명령어 추가
- [ ] SIMD 연산 지원
- [ ] 테스트: 10개

**추정 코드**: +100줄 (x86_64.free) + 150줄 (tests)

### Day 13-14 (Sat-Sun): Integration & Polish
- [ ] E2E 통합 테스트 (10개)
- [ ] 성능 벤치마크
- [ ] 문서화
- [ ] 최종 커밋

**추정 코드**: +150줄 (integration_tests)

---

## 🎯 주요 기능

### 1. Exception Handling (Day 8)

#### 현재 상태 (Week 1)
```free
fn genTryCatch(tryBlock, catchLabel) -> string {
  let asm = ""
  for (let i = 0; i < tryBlock.length; i = i + 1) {
    asm = asm + genInstruction(tryBlock[i])
  }
  asm = asm + "; try-catch frame set\n"
  return asm
}
```

#### 개선 목표
```free
// 1. EH (Exception Handling) Frame 생성
fn genEHFrame(tryBlockSize, catchBlockSize) -> object {
  return {
    offset: 0,
    size: tryBlockSize,
    catchOffset: tryBlockSize,
    catchSize: catchBlockSize,
    personality: "__gxx_personality_v0"  // GCC 호환
  }
}

// 2. Unwinding 코드 생성
fn genUnwindingCode(registers, frameSize) -> string {
  let asm = ""
  // CFA (Canonical Frame Address) 계산
  asm = asm + "; DW_CFA_def_cfa rsp, " + str(frameSize) + "\n"
  asm = asm + "; DW_CFA_register rax, <offset>\n"
  return asm
}

// 3. LSDA (Language-Specific Data Area) 테이블
fn genLSDATable(tryBlocks) -> object {
  return {
    callSites: [],  // try 블록들
    typeFilters: [], // catch 타입들
    actionTable: []  // 예외 처리 액션
  }
}
```

#### 새로운 Opcode
- `TRY_BEGIN`: try 블록 시작
- `TRY_END`: try 블록 종료
- `CATCH_LABEL`: catch 블록 시작
- `THROW`: 예외 throw
- `FINALLY`: finally 블록

---

### 2. Jump Table Generation (Day 9-10)

#### 문제점
```free
// 현재: 순차적 조건 분기 (느림)
if (x == 1) { ... }
else if (x == 2) { ... }
else if (x == 3) { ... }
else if (x == 100) { ... }

// Generated ASM: 100개의 cmp/je 명령어!
cmp eax, 1
je case_1
cmp eax, 2
je case_2
...
cmp eax, 100
je case_100
```

#### 해결책: Jump Table
```free
// Jump table 기반 (O(1) lookup)
fn genJumpTable(cases) -> object {
  let table = {
    minValue: getMin(cases),
    maxValue: getMax(cases),
    entries: [],
    defaultLabel: "default_case"
  }

  for (let i = table.minValue; i <= table.maxValue; i = i + 1) {
    let caseLabel = findCaseLabel(cases, i)
    if (caseLabel != nil) {
      table.entries = table.entries + [caseLabel]
    } else {
      table.entries = table.entries + [table.defaultLabel]
    }
  }

  return table
}

// Generated ASM:
// lea rax, [rel .L__jump_table]
// mov rcx, [rax + rbx*8]
// jmp rcx
// .L__jump_table:
//   dq .L_case_1
//   dq .L_case_2
//   ...
//   dq .L_case_100
```

#### 새로운 Opcode
- `SWITCH`: switch 문 시작
- `CASE`: 케이스 라벨
- `DEFAULT`: 기본 케이스
- `JUMP_TABLE`: 점프 테이블 선언
- `JUMP_INDIRECT`: 간접 점프

#### 최적화 기준
```
- 케이스 수 < 5: 순차 cmp/je
- 케이스 수 5-20: 범위 점프 테이블
- 케이스 수 > 20: 압축 점프 테이블
```

---

### 3. Vector Instructions (Day 11-12)

#### SSE 명령어 (Streaming SIMD Extensions)
```
- MOVDQA: 정렬된 128비트 이동
- PADDQ: 64비트 정수 더하기 (2개 병렬)
- PSUBQ: 64비트 정수 빼기 (2개 병렬)
- PMULQ: 64비트 정수 곱하기 (2개 병렬)
- PAND: 비트 AND (128비트)
- PXOR: 비트 XOR (128비트)
```

#### AVX 명령어 (Advanced Vector Extensions)
```
- VMOVDQA: 정렬된 256비트 이동
- VPADDQ: 64비트 정수 더하기 (4개 병렬)
- VPSUBQ: 64비트 정수 빼기 (4개 병렬)
- VPMULQ: 64비트 정수 곱하기 (4개 병렬)
- VPAND: 비트 AND (256비트)
- VPXOR: 비트 XOR (256비트)
```

#### 새로운 Opcode
- `SIMD_ADD`: SIMD 더하기
- `SIMD_SUB`: SIMD 빼기
- `SIMD_MUL`: SIMD 곱하기
- `SIMD_AND`: SIMD AND
- `SIMD_XOR`: SIMD XOR
- `SIMD_LOAD`: SIMD 로드
- `SIMD_STORE`: SIMD 저장

#### 활용 예시
```free
// 벡터화된 배열 연산
let arr1 = [1, 2, 3, 4]
let arr2 = [5, 6, 7, 8]
let result = simdAdd(arr1, arr2)  // [6, 8, 10, 12] (병렬 처리)
```

---

## 📊 목표 메트릭

| 항목 | Week 1 | Week 2 | 증가 |
|------|--------|--------|------|
| 코드 (줄) | 1,900 | 2,500+ | +600 |
| Opcode | 40 | 50+ | +10 |
| 테스트 | 40 | 50+ | +10 |
| 커밋 | 5 | 8-10 | +5 |

---

## 🔧 구현 우선순위

### 우선 (Day 8-10)
1. **Exception Handling** - 중요도: ⭐⭐⭐⭐⭐
   - Runtime safety 필수
   - C++ interop 요구

2. **Jump Table** - 중요도: ⭐⭐⭐⭐
   - Performance critical
   - Switch 문 최적화

### 중요 (Day 11-12)
3. **Vector Instructions** - 중요도: ⭐⭐⭐⭐
   - SIMD 성능 향상
   - 대규모 배열 처리
   - 미래 GKO 통합 준비

---

## 📝 파일 구조 (Week 2 추가)

```
src/codegen/
├── exception_handler.free      (150줄) NEW
├── jump_table_gen.free         (100줄) NEW
├── vector_instructions.free    (100줄) NEW
├── advanced_tests.free         (300줄) NEW
├── optimization_passes.free    (150줄) NEW
├── codegen.free                (개선)
├── x86_64.free                 (개선)
├── tests.free                  (개선)
├── integration_tests.free      (개선)
└── WEEK2_COMPLETION.md         (200줄) NEW
```

---

## ✅ 완료 체크리스트

### Day 8
- [ ] Exception Handling 기본 구현
- [ ] EH Frame 생성 함수
- [ ] TRY/CATCH Opcode 추가
- [ ] 5개 테스트

### Day 9-10
- [ ] Jump table 알고리즘
- [ ] Switch-case 최적화
- [ ] SWITCH/CASE Opcode 추가
- [ ] 10개 테스트

### Day 11-12
- [ ] SSE 명령어 테이블
- [ ] AVX 명령어 테이블
- [ ] SIMD Opcode 추가
- [ ] 10개 테스트

### Day 13-14
- [ ] E2E 통합 (10개)
- [ ] 성능 비교
- [ ] 최종 문서화
- [ ] PR/Merge 준비

---

## 🎯 성공 기준

- ✅ 50개+ Opcode 지원
- ✅ 50개+ 테스트 (모두 PASS)
- ✅ 2,500+ 줄 코드
- ✅ Exception handling 완전 지원
- ✅ Jump table 생성 최적화
- ✅ Vector instructions 기본 지원
- ✅ 4-5개 주요 커밋
- ✅ GOGS 완전 등록

---

**Status**: Ready for Week 2 Execution
**Start Date**: 2026-03-13
**Target Completion**: 2026-03-19
