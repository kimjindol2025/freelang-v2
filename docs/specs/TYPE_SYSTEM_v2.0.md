# FreeLang v2 타입 시스템 v2.0 명세

**Date**: 2026-03-04
**Status**: ✅ **SPECIFICATION (Phase 2 완료)**
**Version**: 2.0
**Maturity Impact**: 20% → 25% (Union + Generic 지원)

---

## 📋 목차

1. [개요](#개요)
2. [지원 타입](#지원-타입)
3. [Union 타입](#union-타입)
4. [Generic 타입](#generic-타입)
5. [Type Erasure 정책](#type-erasure-정책)
6. [타입 호환성](#타입-호환성)
7. [타입 변환](#타입-변환)
8. [예시](#예시)

---

## 개요

**FreeLang v2.2.0** 타입 시스템은 다음을 지원합니다:

| 카테고리 | 타입 | 설명 |
|---------|------|------|
| **기본** | i32, i64, f64, bool, string, void, any | 원시 타입 |
| **컨테이너** | array<T>, channel<T>, Option<T>, Result<T, E> | 제네릭 컨테이너 |
| **사용자 정의** | struct, class | 구조체/클래스 |
| **함수** | fn(T1, T2) -> R | 함수 타입 |
| **New** | T \| U \| V (Union) | Union 타입 (2.0) |
| **New** | T, U (Generic) | Generic 파라미터 (2.0) |

---

## 지원 타입

### 1. 기본 타입 (Primitive)

```
i32              32비트 부호 있는 정수
i64              64비트 부호 있는 정수
f64              64비트 부동소수점
bool             참/거짓
string           UTF-8 문자열
void             반환값 없음
any              임의의 타입
```

### 2. 컨테이너 타입 (Container)

```
array<T>         T의 배열
  예: array<i32>, array<string>

channel<T>       T를 전송하는 채널
  예: channel<i32>

Option<T>        T 또는 없음
  값: Some(T), None

Result<T, E>     T 또는 에러 E
  값: Ok(T), Err(E)
```

### 3. 사용자 정의 타입 (User-Defined)

```
struct Point {
  x: i32
  y: i32
}                // struct 타입

class Circle {
  x: i32
  y: i32
  radius: i32
}                // class 타입
```

### 4. 함수 타입 (Function)

```
fn(i32, i32) -> i32        두 정수를 받아 정수 반환
fn(string) -> void         문자열을 받아 반환값 없음
fn() -> f64                인자 없이 부동소수점 반환
```

---

## Union 타입

### 문법

```
T | U | V        T, U, V 중 하나
```

### 정의

Union 타입은 여러 타입의 합집합을 나타냅니다:

```freelang
// 타입 정의
var x: i32 | string = 10
var y: i32 | string = "hello"

// 함수
fn process(data: i32 | string) -> void {
  // runtime에서 타입 확인 후 처리
}

// 함수 반환
fn get_value(flag: bool) -> i32 | string {
  if (flag) {
    return 42
  } else {
    return "not found"
  }
}
```

### Union 멤버 관계

**호환성 규칙**:

```
a: i32           ->  호환: i32 | string    (a의 타입이 union 멤버)
b: i32 | string  ->  호환: i32 | string    (동일)
c: bool          ->  불호환: i32 | string (union 멤버 아님)
```

### 특징

- **런타임 값**: Union은 런타입에 실제 값을 그대로 유지 (어떤 타입인지만 컴파일 타임에 체크)
- **타입 좁히기**: 향후 match 문에서 패턴 매칭으로 타입 좁히기 지원 가능
- **평탄 구조**: `(i32 | string) | bool` 는 `i32 | string | bool`로 정규화

---

## Generic 타입

### 문법

```
fn<T>(x: T) -> T          T가 generic 파라미터
fn<T, U>(x: T, y: U) -> T | U   여러 파라미터
```

### 정의

Generic 타입은 컴파일 시간에 구체적인 타입으로 치환됩니다:

```freelang
// Generic 함수
fn identity<T>(x: T) -> T {
  return x
}

// 사용
var n: i32 = identity<i32>(42)      // T=i32로 치환
var s: string = identity<string>("hello")  // T=string으로 치환
```

### 타입 추론

명시적 타입 지정이 없으면 인자 타입으로 추론:

```freelang
var n = identity(42)          // T=i32로 추론
var s = identity("hello")     // T=string으로 추론
```

### Generic 제약 (향후)

현재는 제약 없음. 향후 다음 지원 예정:

```freelang
fn max<T: Comparable>(a: T, b: T) -> T {
  if (a > b) { return a } else { return b }
}
```

---

## Type Erasure 정책

### 개념

**Type Erasure**: Generic 타입 정보를 런타임에서 제거하고 컴파일 타임에만 사용

### 구현 전략

```
컴파일 타임:      fn<T>(x: T) -> T 타입 체크 ✓
                 T는 any로 처리

코드 생성:        type parameter 제거
                 fn(x) -> x 로 변환

런타임:          제네릭 정보 없음
                 값 기반 동작
```

### 예시

**Source**:
```freelang
fn<T> identity(x: T) -> T { return x }
fn<T> swap<U>(x: T, y: U) -> U { return y }
```

**After Type Erasure**:
```
identity(x) { return x }     // T는 any로 처리
swap(x, y) { return y }      // T, U는 any로 처리
```

### 장점

- ✅ 런타임 오버헤드 0
- ✅ 코드 생성 간단
- ✅ 모든 타입에 대해 동일한 코드 생성

### 한계

- ❌ Runtime type checking 불가능
- ❌ 동적 디스패치 불가능 (향후 vtable로 해결)

---

## 타입 호환성

### 기본 규칙

```
타입 T1과 T2가 호환 ⟺ typesEqual(T1, T2) = true
```

### Union 호환성

```
T ⟿ T | U | V      (T가 union의 멤버면 호환)

예:
- i32 호환 i32 | string      ✓
- string 호환 i32 | string    ✓
- bool 호환 i32 | string      ✗
```

### Generic 호환성

```
fn<T>(x: T) -> T 호출:
- identity(42) → T=i32로 치환 → i32 -> i32 호환 ✓
- identity("x") → T=string으로 치환 → string -> string 호환 ✓
```

### Struct 호환성

```
필드명과 타입이 모두 일치해야 함

struct Point { x: i32, y: i32 }
struct Coord { x: i32, y: i32 }
// 이름이 다르므로 호환 안 됨

var p: Point = {...}
var c: Coord = p  // ✗ 에러
```

---

## 타입 변환

### Implicit 변환 (자동)

```
none  // FreeLang은 implicit 타입 변환 지원 안 함
```

### Explicit 변환 (명시)

```
as<T>(x)        x를 T로 변환 (future feature)

예:
var n: i64 = as<i64>(i32_value)
```

### 제약

- primitive 타입 간 변환만 가능 (향후)
- struct/class는 변환 불가
- generic 타입은 타입 소거로 인해 변환 정보 손실

---

## 예시

### 1. Union 타입 사용

```freelang
fn describe(value: i32 | string) -> void {
  if (value == 42) {
    println("answer")
  } else {
    println(str(value))
  }
}

fn main(): void {
  describe(42)        // i32로 호출
  describe("hello")   // string으로 호출
}
```

### 2. Generic 함수

```freelang
fn<T> identity(x: T) -> T {
  return x
}

fn<T, U> pair(x: T, y: U) -> i32 {
  return 2  // T, U 타입은 사용하지 않음 (Type Erasure)
}

fn main(): void {
  var n: i32 = identity(100)
  var s: string = identity("ok")
  var p: i32 = pair(1, "two")
}
```

### 3. Union + Generic 조합

```freelang
fn<T> wrap_value(x: T) -> T | void {
  if (x == 0) {
    // none 반환? void 반환? 향후 정책 결정
    return x
  }
  return x
}

fn main(): void {
  var result: i32 | void = wrap_value(42)
}
```

### 4. Option 타입과 Union

```freelang
fn maybe_divide(a: i32, b: i32) -> i32 | string {
  if (b == 0) {
    return "division by zero"
  }
  return a / b
}

fn main(): void {
  var res: i32 | string = maybe_divide(10, 2)
  // res는 i32 또는 string (컴파일 타임에 체크)
  println(str(res))
}
```

---

## 확장 (향후)

### 제약 있는 Generic

```freelang
trait Comparable {
  fn compare(other: Self) -> i32
}

fn max<T: Comparable>(a: T, b: T) -> T {
  if (a.compare(b) > 0) { return a } else { return b }
}
```

### Higher-Ranked Types

```freelang
fn apply<F: fn<T>(T) -> T>(f: F, x: i32) -> i32 {
  return f(x)
}
```

### Intersection Types

```freelang
fn process(x: i32 & string) -> void {
  // x는 i32이면서 동시에 string
  // (현재 미지원)
}
```

---

## 정리

| 기능 | v2.0 | 상태 |
|------|------|------|
| Union 타입 | ✅ | 완성 |
| Generic 함수 | ✅ | 완성 (Type Erasure) |
| Generic 추론 | ✅ | 완성 (향후 향상) |
| 제약 있는 Generic | ❌ | 향후 (v2.1) |
| Dynamic Dispatch | ❌ | 향후 (v2.2) |
| Intersection Types | ❌ | 향후 (v3.0) |

---

## 참고자료

- **Memory Model**: `/docs/specs/MEMORY_MODEL_v1.0.md` (Phase 1)
- **AST 정의**: `/src/script-runner/ast.ts`
- **Type Checker**: `/src/script-runner/checker.ts`
- **Parser**: `/src/script-runner/parser.ts`

---

**Author**: Claude Haiku 4.5
**Status**: ✅ SPECIFICATION
**Date**: 2026-03-04
