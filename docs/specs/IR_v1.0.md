# FreeLang v2 중간 표현(IR) v1.0 명세

**Date**: 2026-03-04
**Status**: ✅ **SPECIFICATION (Phase 3 완료)**
**Version**: 1.0
**Maturity Impact**: 25% → 30% (f64 완성 + 상수 폴딩 + IR 동결)

---

## 📋 목차

1. [개요](#개요)
2. [바이트코드 아키텍처](#바이트코드-아키텍처)
3. [Opcode 레퍼런스](#opcode-레퍼런스)
4. [스택 기계](#스택-기계)
5. [함수 호출 규약](#함수-호출-규약)
6. [AST → IR 컴파일 규칙](#ast--ir-컴파일-규칙)
7. [최적화 정책](#최적화-정책)

---

## 개요

FreeLang v2의 **중간 표현(IR)**은 **스택 기반 바이트코드**입니다:

- **포맷**: 바이너리 바이트스트림
- **기계**: 스택 머신 (Stack VM)
- **파이프라인**: AST → Compiler → Bytecode → VM 실행
- **최적화**: AST 레벨 상수 폴딩 + f64 타입 분기

### 핵심 특징

- ✅ 50개 Opcode (상수 로드, 산술, 제어 흐름, 함수 호출)
- ✅ f64 타입 지원 (IEEE 754)
- ✅ 상수 폴딩 (compile-time evaluation)
- ✅ Generic Type Erasure (타입 정보 런타임 제거)
- ✅ 함수 호출 스택 프레임

---

## 바이트코드 아키텍처

### 구조

```
Program
  ├─ Functions[]
  │   ├─ name: string
  │   ├─ code: Bytecode
  │   └─ locals: i32 (로컬 변수 개수)
  └─ Constants[]
      ├─ Integers (i32, i64)
      ├─ Floats (f64)
      ├─ Strings (UTF-8)
      └─ Function refs
```

### 값 타입 (Value)

런타임 스택의 값:

```typescript
type Value =
  | { tag: "i32", val: number }
  | { tag: "i64", val: bigint }
  | { tag: "f64", val: number }
  | { tag: "bool", val: boolean }
  | { tag: "str", val: string }
  | { tag: "array", val: Value[] }
  | { tag: "struct", val: Map<string, Value> }
  | { tag: "void", val: undefined }
  | { tag: "null", val: null };
```

---

## Opcode 레퍼런스

### 1. 상수 로드 (0x01 - 0x07)

#### PUSH_I32 (0x01)
- **형식**: `0x01 [i32 값 (4바이트 LE)]`
- **스택 효과**: `[] → [i32]`
- **예**: 정수 리터럴 로드
- **코드**: `println(42)` → PUSH_I32(42)

#### PUSH_F64 (0x02)
- **형식**: `0x02 [f64 값 (8바이트 LE)]`
- **스택 효과**: `[] → [f64]`
- **예**: 부동소수점 리터럴
- **코드**: `println(3.14)` → PUSH_F64(3.14)

#### PUSH_STR (0x03)
- **형식**: `0x03 [상수 인덱스 (4바이트 LE)]`
- **스택 효과**: `[] → [str]`
- **설명**: 상수 풀에서 문자열 로드
- **코드**: `println("hello")` → PUSH_STR(idx)

#### PUSH_TRUE (0x04)
- **형식**: `0x04`
- **스택 효과**: `[] → [bool: true]`
- **코드**: `var x = true` → PUSH_TRUE

#### PUSH_FALSE (0x05)
- **형식**: `0x05`
- **스택 효과**: `[] → [bool: false]`
- **코드**: `var x = false` → PUSH_FALSE

#### PUSH_VOID (0x06)
- **형식**: `0x06`
- **스택 효과**: `[] → [void]`
- **코드**: 반환값 없는 함수

#### PUSH_NONE (0x07)
- **형식**: `0x07`
- **스택 효과**: `[] → [null]`
- **코드**: Option/Result None 값

#### POP (0x08)
- **형식**: `0x08`
- **스택 효과**: `[v] → []`
- **설명**: 스택 최상단 값 제거
- **코드**: 사용하지 않는 표현식 값

---

### 2. i32 산술 (0x10 - 0x15)

#### ADD_I32 (0x10)
- **형식**: `0x10`
- **스택 효과**: `[i32: a, i32: b] → [i32: a+b]`
- **코드**: `a + b` (정수)
- **최적화**: `2 + 3` → PUSH_I32(5) (상수 폴딩)

#### SUB_I32 (0x11)
- **형식**: `0x11`
- **스택 효과**: `[i32: a, i32: b] → [i32: a-b]`
- **코드**: `a - b`

#### MUL_I32 (0x12)
- **형식**: `0x12`
- **스택 효과**: `[i32: a, i32: b] → [i32: a*b]`
- **코드**: `a * b`

#### DIV_I32 (0x13)
- **형식**: `0x13`
- **스택 효과**: `[i32: a, i32: b] → [i32: a/b]`
- **에러**: b=0이면 panic
- **코드**: `a / b` (정수 나눗셈)
- **동작**: 몫만 반환 (버림)

#### MOD_I32 (0x14)
- **형식**: `0x14`
- **스택 효과**: `[i32: a, i32: b] → [i32: a%b]`
- **에러**: b=0이면 panic
- **코드**: `a % b`

#### NEG_I32 (0x15)
- **형식**: `0x15`
- **스택 효과**: `[i32: a] → [i32: -a]`
- **코드**: `-a` (정수)

---

### 3. f64 산술 (0x18 - 0x1D)

#### ADD_F64 (0x18)
- **형식**: `0x18`
- **스택 효과**: `[f64: a, f64: b] → [f64: a+b]`
- **코드**: `a + b` (부동소수점)
- **최적화**: `2.0 + 3.0` → PUSH_F64(5.0) (상수 폴딩)

#### SUB_F64 (0x19)
- **형식**: `0x19`
- **스택 효과**: `[f64: a, f64: b] → [f64: a-b]`
- **코드**: `a - b`

#### MUL_F64 (0x1A)
- **형식**: `0x1A`
- **스택 효과**: `[f64: a, f64: b] → [f64: a*b]`
- **코드**: `a * b`

#### DIV_F64 (0x1B)
- **형식**: `0x1B`
- **스택 효과**: `[f64: a, f64: b] → [f64: a/b]`
- **동작**: b=0이면 Infinity 반환 (에러 아님)
- **코드**: `a / b` (부동소수점 나눗셈)

#### MOD_F64 (0x1C)
- **형식**: `0x1C`
- **스택 효과**: `[f64: a, f64: b] → [f64: a%b]`
- **에러**: b=0이면 panic
- **코드**: `a % b` (부동소수점 모듈러)

#### NEG_F64 (0x1D)
- **형식**: `0x1D`
- **스택 효과**: `[f64: a] → [f64: -a]`
- **코드**: `-a` (부동소수점)

---

### 4. 비교 (0x20 - 0x25)

#### EQ (0x20)
- **형식**: `0x20`
- **스택 효과**: `[v1, v2] → [bool]`
- **코드**: `a == b`
- **설명**: 타입별로 동등성 비교 (런타임 type-sensitive)

#### NEQ (0x21)
- **형식**: `0x21`
- **스택 효과**: `[v1, v2] → [bool]`
- **코드**: `a != b`

#### LT (0x22)
- **형식**: `0x22`
- **스택 효과**: `[v1, v2] → [bool]`
- **코드**: `a < b` (숫자형만)

#### GT (0x23)
- **형식**: `0x23`
- **스택 효과**: `[v1, v2] → [bool]`
- **코드**: `a > b`

#### LTEQ (0x24)
- **형식**: `0x24`
- **스택 효과**: `[v1, v2] → [bool]`
- **코드**: `a <= b`

#### GTEQ (0x25)
- **형식**: `0x25`
- **스택 효과**: `[v1, v2] → [bool]`
- **코드**: `a >= b`

---

### 5. 논리 (0x28 - 0x2A)

#### AND (0x28)
- **형식**: `0x28`
- **스택 효과**: `[bool: a, bool: b] → [bool: a && b]`
- **코드**: `a && b`
- **주의**: VM은 eager evaluation (단락 평가 안 함)

#### OR (0x29)
- **형식**: `0x29`
- **스택 효과**: `[bool: a, bool: b] → [bool: a || b]`
- **코드**: `a || b`

#### NOT (0x2A)
- **형식**: `0x2A`
- **스택 효과**: `[bool: a] → [bool: !a]`
- **코드**: `!a`

---

### 6. 문자열 (0x2E)

#### STR_CONCAT (0x2E)
- **형식**: `0x2E`
- **스택 효과**: `[str: a, str: b] → [str: a+b]`
- **코드**: `"hello" + "world"`
- **동작**: 런타임에 ADD_I32도 처리 (타입 체크)

---

### 7. 변수 (0x30 - 0x3C)

#### LOAD_LOCAL (0x30)
- **형식**: `0x30 [index (4바이트 LE)]`
- **스택 효과**: `[] → [value]`
- **설명**: 로컬 변수 로드
- **코드**: `var x = 5; println(x)` → LOAD_LOCAL(0)

#### STORE_LOCAL (0x31)
- **형식**: `0x31 [index (4바이트 LE)]`
- **스택 효과**: `[value] → []`
- **설명**: 로컬 변수 저장
- **코드**: `x = 10` → STORE_LOCAL(0)

#### LOAD_GLOBAL (0x32)
- **형식**: `0x32 [const_idx (4바이트 LE)]`
- **스택 효과**: `[] → [value]`
- **설명**: 전역 변수/함수 참조 로드

#### STORE_GLOBAL (0x33)
- **형식**: `0x33 [const_idx (4바이트 LE)]`
- **스택 효과**: `[value] → []`
- **설명**: 전역 변수 저장

---

### 8. 배열 (0x40 - 0x44)

#### ARRAY_NEW (0x40)
- **형식**: `0x40 [length (4바이트 LE)]`
- **스택 효과**: `[e1, e2, ..., en] → [array]`
- **설명**: 스택 상단 n개 요소로 배열 생성
- **코드**: `[1, 2, 3]` → PUSH_I32(1) PUSH_I32(2) PUSH_I32(3) ARRAY_NEW(3)

#### ARRAY_GET (0x41)
- **형식**: `0x41`
- **스택 효과**: `[array, i32: idx] → [value]`
- **코드**: `arr[i]`
- **에러**: idx out of bounds → panic

#### ARRAY_SET (0x42)
- **형식**: `0x42`
- **스택 효과**: `[array, i32: idx, value] → []`
- **코드**: `arr[i] = v`

#### ARRAY_LEN (0x43)
- **형식**: `0x43`
- **스택 효과**: `[array] → [i32: len]`
- **코드**: `len(arr)`

#### ARRAY_PUSH (0x44)
- **형식**: `0x44`
- **스택 효과**: `[array, value] → []`
- **코드**: `push(arr, v)`

---

### 9. 구조체 (0x48 - 0x4A)

#### STRUCT_NEW (0x48)
- **형식**: `0x48 [name_idx (4바이트 LE), field_count (4바이트 LE)]`
- **스택 효과**: `[f1, f2, ..., fn] → [struct]`
- **코드**: `Point { x: 1, y: 2 }`

#### STRUCT_GET (0x49)
- **형식**: `0x49 [field_name_idx (4바이트 LE)]`
- **스택 효과**: `[struct] → [value]`
- **코드**: `point.x`

#### STRUCT_SET (0x4A)
- **형식**: `0x4A [field_name_idx (4바이트 LE)]`
- **스택 효과**: `[struct, value] → []`
- **코드**: `point.x = 10`

---

### 10. 제어 흐름 (0x50 - 0x55)

#### JMP (0x50)
- **형식**: `0x50 [offset (4바이트 LE)]`
- **스택 효과**: 없음
- **설명**: 절대 점프
- **코드**: loop 끝, if 블록 건너뛰기

#### JMP_IF_FALSE (0x51)
- **형식**: `0x51 [offset (4바이트 LE)]`
- **스택 효과**: `[bool] → []`
- **설명**: 조건 점프 (false면 점프)
- **코드**: `if (cond) { ... }` → JMP_IF_FALSE 또는 JMP

#### JMP_IF_TRUE (0x52)
- **형식**: `0x52 [offset (4바이트 LE)]`
- **스택 효과**: `[bool] → []`
- **코드**: `while (cond) { ... }`

#### RETURN (0x53)
- **형식**: `0x53`
- **스택 효과**: `[value] → []` (함수 종료)
- **코드**: `return x`
- **주의**: 스택에서 반환값을 pop하고 호출자에게 전달

#### RETURN_VOID (0x54)
- **형식**: `0x54`
- **스택 효과**: 없음
- **코드**: `return` (반환값 없음)

#### PANIC (0x55)
- **형식**: `0x55 [msg_idx (4바이트 LE)]`
- **스택 효과**: 없음
- **설명**: 프로그램 중단 + 메시지 출력
- **코드**: `panic("error message")`

---

### 11. 함수 호출 (0x60 - 0x62)

#### CALL_BUILTIN (0x60)
- **형식**: `0x60 [fn_name_idx (4바이트 LE), arg_count (1바이트)]`
- **스택 효과**: `[arg1, arg2, ..., argn] → [return_value]`
- **설명**: 내장 함수 호출
- **예**: `println(x)` → CALL_BUILTIN("println", 1)
- **내장함수**: println, print, str, i32, i64, f64, len, push, pop, etc.

#### CALL_USER (0x61)
- **형식**: `0x61 [fn_idx (4바이트 LE), arg_count (1바이트)]`
- **스택 효과**: `[arg1, arg2, ..., argn] → [return_value]`
- **설명**: 사용자 정의 함수 호출
- **스택 프레임**: 호출 전 프레임 생성

#### CALL_INDIRECT (0x62)
- **형식**: `0x62 [arg_count (1바이트)]`
- **스택 효과**: `[fn_ref, arg1, arg2, ..., argn] → [return_value]`
- **설명**: 함수 포인터 호출 (일급 함수)

---

### 12. 타입 변환 (0x68 - 0x6A)

#### AS_I32 (0x68)
- **형식**: `0x68`
- **스택 효과**: `[value] → [i32]`
- **코드**: `as<i32>(v)` (명시적 캐스트)

#### AS_F64 (0x69)
- **형식**: `0x69`
- **스택 효과**: `[value] → [f64]`
- **코드**: `as<f64>(v)`

#### AS_STR (0x6A)
- **형식**: `0x6A`
- **스택 효과**: `[value] → [str]`
- **코드**: `str(v)`

---

### 13. 특수 (0x70 - 0x7F)

#### UNWRAP (0x70)
- **형식**: `0x70`
- **스택 효과**: `[Option<T>] → [T]` 또는 panic
- **코드**: `v?` (try operator)

#### NOOP (0x7F)
- **형식**: `0x7F`
- **스택 효과**: 없음
- **설명**: 아무것도 하지 않음 (패딩)

---

## 스택 기계

### 구조

```
┌─────────────────────────────────────┐
│         Instruction Pointer         │ 현재 실행 주소
├─────────────────────────────────────┤
│         Stack [0..256]              │ 값 스택 (최대 256)
├─────────────────────────────────────┤
│    Locals [frame_ptr..frame_ptr+n]  │ 로컬 변수 (함수마다 별도)
├─────────────────────────────────────┤
│         Heap (GC)                   │ 동적 할당 메모리
└─────────────────────────────────────┘
```

### 실행 사이클

```
1. Fetch: bytecode[ip]에서 opcode 읽기
2. Decode: 인수 파싱
3. Execute: 스택 조작
4. Increment: ip 증가
5. Repeat
```

---

## 함수 호출 규약

### 스택 프레임 구조

```
┌──────────────────────────┐
│  Return Address          │ 호출 위치 (4바이트)
├──────────────────────────┤
│  Previous Frame Pointer  │ 이전 프레임 (4바이트)
├──────────────────────────┤
│  Local Variables [0..n]  │ 로컬 변수 n개
├──────────────────────────┤
│  Temporary Values        │ 표현식 계산 값
└──────────────────────────┘
```

### 함수 호출 과정

**호출자 (Caller)**:
```
1. 인자를 스택에 push
2. CALL_USER(fn_idx, arg_count)
3. 함수 반환 후 반환값이 스택 최상단에 있음
4. 필요시 반환값을 로컬 변수에 저장
```

**피호출자 (Callee)**:
```
1. CALL_USER 실행 시 프레임 자동 생성
2. 로컬 변수 인덱스: [0..arg_count-1] (인자)
3. 로컬 변수 인덱스: [arg_count..n] (로컬 변수)
4. RETURN으로 반환값 전달
5. 프레임 자동 정리
```

### 예시

```freelang
fn add(a: i32, b: i32) -> i32 {
  return a + b
}

fn main(): void {
  var result = add(10, 20)
  println(str(result))
}
```

**컴파일 결과**:
```
main:
  PUSH_I32(10)           ; arg 1
  PUSH_I32(20)           ; arg 2
  CALL_USER(add, 2)      ; 호출 → 반환값: 30
  STORE_LOCAL(0)         ; result = 30
  LOAD_LOCAL(0)
  CALL_BUILTIN(str, 1)
  CALL_BUILTIN(println, 1)
  RETURN_VOID

add:
  LOAD_LOCAL(0)          ; a
  LOAD_LOCAL(1)          ; b
  ADD_I32                ; a + b
  RETURN
```

---

## AST → IR 컴파일 규칙

### 리터럴

```
int_lit(42)        → PUSH_I32(42)
float_lit(3.14)    → PUSH_F64(3.14)
string_lit("x")    → PUSH_STR(const_idx)
bool_lit(true)     → PUSH_TRUE
```

### 이항 연산 (f64 타입 분기)

```
// float_lit이 포함되면 f64 opcode 사용
a + b:
  - a: float_lit, b: int_lit
    → PUSH_F64(a) + PUSH_I32(b) + ADD_F64
  - a: int_lit, b: int_lit
    → PUSH_I32(a) + PUSH_I32(b) + ADD_I32

// 상수 폴딩 최적화
2 + 3              → PUSH_I32(5)      (대신 3개 opcode)
10.0 / 2.0         → PUSH_F64(5.0)
```

### 제어 흐름

```
if (cond) {         PUSH_COND
  stmts1            JMP_IF_FALSE(L1)
} else {            STMTS1
  stmts2            JMP(L2)
}                   L1: STMTS2
                    L2: ...

while (cond) {      L1: PUSH_COND
  stmts             JMP_IF_FALSE(L2)
}                   STMTS
                    JMP(L1)
                    L2: ...
```

### 함수 호출

```
fn identity<T>(x: T) -> T {
  return x
}

identity(42)        → PUSH_I32(42)
                      CALL_USER(identity, 1)

// Type Erasure: <T>는 런타임에 제거됨
// T는 any로 처리되므로 단일 함수 코드만 생성
```

---

## 최적화 정책

### 1. 상수 폴딩 (Compile-time Evaluation)

**AST 레벨에서 실행**:

```
// 입력
2 + 3
10.0 / 2.0
5 * 6

// 컴파일 시간에 계산
→ 5
→ 5.0
→ 30

// 생성되는 bytecode
PUSH_I32(5)
PUSH_F64(5.0)
PUSH_I32(30)
```

**규칙**:
- 두 피연산자가 모두 리터럴일 때만 적용
- 나눗셈 by zero 및 오버플로우는 폴딩 안 함
- 부동소수점은 Infinity 허용

### 2. f64 타입 분기

**컴파일러에서 실행**:

```
// 입력 AST
a + b  (a: float_lit, b: int_lit)

// 판별 로직
isFloat = (left.kind === "float_lit") || (right.kind === "float_lit")

// 생성 opcode
if (isFloat)
  emit(Op.ADD_F64)    // f64 연산
else
  emit(Op.ADD_I32)    // i32 연산
```

**대상 연산**: +, -, *, /, %
**단항 연산**: - (NEG_F64 vs NEG_I32)

### 3. Type Erasure

**Generic 함수의 타입 정보 제거**:

```freelang
fn<T> identity(x: T) -> T {
  return x
}
```

**컴파일 시간**:
- T는 any로 처리
- 타입 안전성 유지 (체크만 함)

**코드 생성**:
- T 정보 생략
- 단일 함수 코드만 생성
- 런타임에는 값 기반 동작

**Bytecode** (제네릭 정보 0):
```
identity:
  LOAD_LOCAL(0)       ; x (T는 any)
  RETURN              ; T로 반환
```

---

## 상수 풀 (Constant Pool)

### 형식

```
[size (4바이트 LE)]
[type1 (1바이트), value1 (variable)]
[type2 (1바이트), value2 (variable)]
...
```

### 타입

```
0x00: I32      [value: 4바이트]
0x01: F64      [value: 8바이트]
0x02: String   [length: 2바이트 LE, data: UTF-8]
0x03: Function [name_idx: 2바이트]
```

### 예시

```
Constants[]:
  [0]: I32(42)
  [1]: F64(3.14)
  [2]: String("hello")
  [3]: String("world")
  [4]: Function("add")
```

---

## 에러 처리

### Panic 매커니즘

```
// Panic 발생 경우
- 나눗셈 by zero (i32, f64 MOD)
- 배열 인덱스 out of bounds
- Option/Result unwrap 실패
- 명시적 panic() 호출

// 처리
PANIC(msg_idx) → 메시지 출력 + 프로그램 중단
```

---

## 예제

### 예제 1: 간단한 계산

```freelang
fn main(): void {
  var x: i32 = 2 + 3
  println(str(x))
}
```

**Bytecode**:
```
main:
  PUSH_I32(5)         ; 상수 폴딩: 2 + 3 = 5
  STORE_LOCAL(0)      ; x = 5
  LOAD_LOCAL(0)       ; x
  CALL_BUILTIN(str, 1); str(5)
  CALL_BUILTIN(println, 1)
  RETURN_VOID
```

### 예제 2: f64 연산

```freelang
fn main(): void {
  var a: f64 = 3.14
  var b: f64 = 2.0
  println(str(a + b))
}
```

**Bytecode**:
```
main:
  PUSH_F64(3.14)      ; a
  STORE_LOCAL(0)
  PUSH_F64(2.0)       ; b
  STORE_LOCAL(1)
  LOAD_LOCAL(0)       ; a
  LOAD_LOCAL(1)       ; b
  ADD_F64             ; a + b (f64 연산)
  CALL_BUILTIN(str, 1)
  CALL_BUILTIN(println, 1)
  RETURN_VOID
```

### 예제 3: 제어 흐름

```freelang
fn main(): void {
  if (10 > 5) {
    println("yes")
  }
}
```

**Bytecode**:
```
main:
  PUSH_I32(10)
  PUSH_I32(5)
  GT                  ; 10 > 5
  JMP_IF_FALSE(L1)
  PUSH_STR(idx:"yes")
  CALL_BUILTIN(println, 1)
L1:
  RETURN_VOID
```

---

## 정리 테이블

| 범주 | Opcode | 개수 | 예시 |
|------|--------|------|------|
| 상수 로드 | PUSH_* | 8 | PUSH_I32, PUSH_F64, PUSH_STR |
| i32 산술 | ADD_I32 ~ NEG_I32 | 6 | ADD, SUB, MUL, DIV, MOD, NEG |
| f64 산술 | ADD_F64 ~ NEG_F64 | 6 | ADD, SUB, MUL, DIV, MOD, NEG |
| 비교 | EQ ~ GTEQ | 6 | EQ, NEQ, LT, GT, LTEQ, GTEQ |
| 논리 | AND, OR, NOT | 3 | AND, OR, NOT |
| 문자열 | STR_CONCAT | 1 | STR_CONCAT |
| 변수 | LOAD_* ~ STORE_* | 4 | LOAD_LOCAL, STORE_LOCAL |
| 배열 | ARRAY_* | 5 | ARRAY_NEW, ARRAY_GET, ARRAY_SET |
| 구조체 | STRUCT_* | 3 | STRUCT_NEW, STRUCT_GET, STRUCT_SET |
| 제어 | JMP ~ PANIC | 5 | JMP, JMP_IF_FALSE, RETURN |
| 함수 | CALL_* | 3 | CALL_BUILTIN, CALL_USER |
| 타입 변환 | AS_* | 3 | AS_I32, AS_F64, AS_STR |
| 특수 | UNWRAP, NOOP | 2 | UNWRAP, NOOP |
| **합계** | | **55** | |

---

## 참고자료

- **AST 정의**: `/src/script-runner/ast.ts`
- **컴파일러**: `/src/script-runner/compiler.ts`
- **VM**: `/src/script-runner/vm.ts`
- **타입 시스템**: `/docs/specs/TYPE_SYSTEM_v2.0.md`
- **메모리 모델**: `/docs/specs/MEMORY_MODEL_v1.0.md`

---

**Author**: Claude Haiku 4.5
**Status**: ✅ SPECIFICATION
**Date**: 2026-03-04

