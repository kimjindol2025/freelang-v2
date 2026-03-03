# FreeLang Memory Model v1.0

**Version**: 1.0
**Status**: Stable
**Date**: 2026-03-04
**Phase**: Phase 1 (Memory Model Definition)

---

## 목차

1. [개요](#개요)
2. [메모리 구조](#메모리-구조)
3. [Value 타입 태깅](#value-타입-태깅)
4. [힙 레이아웃](#힙-레이아웃)
5. [Call Stack](#call-stack)
6. [Garbage Collection](#garbage-collection)
7. [메모리 정책](#메모리-정책)

---

## 개요

FreeLang v2의 메모리 모델은 다음 원칙을 따릅니다:

- **Stack-based VM**: 함수 매개변수와 로컬 변수는 스택에 저장
- **Heap-allocated Objects**: 배열, 구조체, 문자열은 힙에 할당
- **Generational GC**: Young/Old 세대 분리로 효율적인 메모리 관리
- **Reference Counting 부분 지원**: Write Barrier를 통한 세대 간 참조 추적

---

## 메모리 구조

```
┌─────────────────────────────────┐
│      Stack (1MB)                │  ← 함수 호출, 로컬 변수
├─────────────────────────────────┤
│      Call Stack Frames          │  ← 함수 호출 정보
├─────────────────────────────────┤
│      Heap                       │
│      ├─ Young Generation        │  ← 최근 할당, 자주 수집
│      └─ Old Generation          │  ← 오래된 객체, 드물게 수집
├─────────────────────────────────┤
│      Global Variables           │  ← 전역 변수 저장
└─────────────────────────────────┘
```

### 메모리 할당 정책

| 타입 | 위치 | 관리 방식 |
|------|------|---------|
| **i32** | Stack/Inline | 직접 저장 (4바이트) |
| **f64** | Stack/Inline | 직접 저장 (8바이트) |
| **bool** | Stack/Inline | 직접 저장 (1바이트) |
| **string** | Heap | GC 관리 (가변 크기) |
| **array** | Heap | GC 관리 (동적 크기) |
| **struct** | Heap | GC 관리 (고정 + 필드 크기) |

---

## Value 타입 태깅

FreeLang의 모든 런타임 값은 `Value` 타입으로 표현됩니다:

```typescript
type Value =
  | { tag: "i32"; val: number }           // 32-bit signed integer
  | { tag: "f64"; val: number }           // 64-bit IEEE 754 float
  | { tag: "str"; val: string }           // Unicode string
  | { tag: "bool"; val: boolean }         // Boolean
  | { tag: "arr"; val: Value[] }          // Array of Values
  | { tag: "struct"; fields: Map<...> }   // Struct with named fields
  | { tag: "ok"; val: Value }             // Result::Ok
  | { tag: "err"; val: Value }            // Result::Err
  | { tag: "some"; val: Value }           // Option::Some
  | { tag: "none" }                       // Option::None
  | { tag: "void" }                       // Unit type
  | { tag: "chan"; id: number }           // Channel reference
```

### 태그 바이너리 표현 (향후 바이너리 직렬화용)

```
Tag      Binary    크기    설명
────────────────────────────────────
i32      0x01      4B      부호 있는 32비트 정수
f64      0x02      8B      64비트 부동소수점
string   0x03      가변    가변 길이 문자열
bool     0x04      1B      부울 값 (0x00 또는 0x01)
array    0x05      가변    배열 요소들의 순열
struct   0x06      가변    구조체 필드들
ok       0x07      가변    성공 값 (Option/Result)
err      0x08      가변    오류 값
some     0x09      가변    일부 값
none     0x0A      0B      없음
void     0x0B      0B      빈 값
channel  0x0C      4B      채널 ID 참조
```

---

## 힙 레이아웃

### 일반 힙 객체 헤더

```
Offset  크기  필드           설명
──────────────────────────────────
0       4B    GC_ID         GC 추적용 객체 ID
4       2B    SIZE          객체 크기 (바이트)
6       1B    GENERATION    세대 (0=Young, 1=Old)
7       1B    FLAGS         마킹 플래그 (bit 0: marked)
8       가변   PAYLOAD       실제 데이터
```

### String 객체 레이아웃

```
헤더 (8B)
├─ GC_ID (4B)
├─ SIZE (2B): 문자열 길이 + 1 (null terminator)
├─ GENERATION (1B)
└─ FLAGS (1B)

데이터 (SIZE)
└─ UTF-8 문자열 + null terminator
```

**예시**: "hello" (5문자)
```
GC_ID=12345  | SIZE=6  | GEN=0  | FLAGS=0x00 | h e l l o \0
  (4B)       |  (2B)   | (1B)   |  (1B)      |  (6B)
             총 14바이트
```

### Array 객체 레이아웃

```
헤더 (8B)
├─ GC_ID (4B)
├─ SIZE (2B): 배열의 바이트 크기
├─ GENERATION (1B)
└─ FLAGS (1B)

데이터 (요소)
└─ Value[] (각 요소는 가변 크기)
```

**예시**: `[1, 2, 3]` (i32 배열)
```
GC_ID=12346  | SIZE=36 | GEN=0  | FLAGS=0x00 | {tag,val} {tag,val} {tag,val}
  (4B)       | (2B)    | (1B)   | (1B)       |  (12B) + (12B) + (12B) = 36B
             총 44바이트
```

### Struct 객체 레이아웃

```
헤더 (8B)
├─ GC_ID (4B)
├─ SIZE (2B): 구조체의 바이트 크기
├─ GENERATION (1B)
└─ FLAGS (1B)

필드 개수 (2B)
└─ count

필드 맵 (필드마다)
├─ 필드명 길이 (2B)
├─ 필드명 (문자열)
└─ Value (가변)
```

**예시**: `{ x: 10, y: 20 }`
```
GC_ID=12347 | SIZE=... | GEN=0 | FLAGS=0x00 | count=2 | "x" | {i32,10} | "y" | {i32,20}
```

---

## Call Stack

### CallFrame 구조

```typescript
type CallFrame = {
  returnAddr: number;    // 리턴할 주소 (바이트코드 offset)
  baseSlot: number;      // 스택 베이스 (로컬 변수 시작)
  locals: Value[];       // 로컬 변수 + 매개변수
};
```

### 스택 프레임 레이아웃 (함수 호출)

```
┌────────────────────────────────┐  ← 이전 함수의 로컬 변수
│ Frame N-1: locals[0..n-1]      │
├────────────────────────────────┤  ← baseSlot = 스택 크기
│ Frame N: 새로운 함수           │
│ ├─ param0, param1, ...         │  ← 매개변수들
│ ├─ local0, local1, ...         │  ← 로컬 변수들
│ └─ temp0, temp1, ...           │  ← 임시 값들
└────────────────────────────────┘  ← 스택 상단
```

### 함수 호출 과정

```
1. CALL fnIdx, argCount 실행
   ├─ 스택에서 인자 argCount개 pop
   ├─ 새 CallFrame 생성
   │  ├─ returnAddr = 다음 명령어
   │  ├─ baseSlot = 현재 스택 크기
   │  └─ locals = [arg0, arg1, ..., undefined, ...]
   └─ IP = 함수 위치로 이동

2. 함수 내부에서:
   ├─ LOAD_LOCAL slot → locals[slot] push
   ├─ STORE_LOCAL slot → pop 후 locals[slot] 저장

3. RETURN 실행
   ├─ 반환값 pop
   ├─ CallFrame pop
   ├─ 스택을 baseSlot로 정리
   └─ IP = returnAddr로 복귀
```

### 최대 스택 깊이

- **최대 함수 호출 깊이**: 256 (스택 오버플로우 방지)
- **최대 로컬 변수**: 함수당 1,000개
- **최대 스택 크기**: 1MB

---

## Garbage Collection

### 수집 정책

#### Minor GC (Young Generation만)

```
조건:
- 함수 호출이 1,000회에 도달할 때마다 자동 실행
- Young generation의 객체만 대상

과정:
1. Mark: Young generation의 루트부터 시작 (DFS)
2. Sweep: 미마킹 객체 삭제
3. Promote: Age >= 2인 객체를 Old generation으로 승격

성능: 매우 빠름 (대부분의 객체가 Young에서 수집)
```

#### Major GC (전체 힙)

```
조건:
- 10회 minor GC마다 자동 실행
- 또는 힙이 10MB를 초과할 때

과정:
1. Mark: 모든 루트부터 시작 (DFS)
2. Sweep: 전체 힙에서 미마킹 객체 삭제
3. Compaction: 선택사항 (현재 미지원)

성능: 느림 (전체 탐색), 하지만 철저함
```

#### Incremental GC (16ms 시간 예산)

```
목적: UI/게임 같은 저지연 애플리케이션을 위한 점진적 수집

특징:
- 1회 step() 호출 시 최대 16ms만 실행
- Mark 단계와 Sweep 단계를 나누어 실행
- RememberedSet을 통한 세대 간 참조 추적

사용:
- 게임이나 인터랙티브 애플리케이션
- 고빈도 minor GC 환경
```

### GC Root

GC가 추적하는 루트:

```
1. Stack Frame의 로컬 변수들
2. 전역 변수들
3. Actor 채널 참조들
```

### Write Barrier (Old → Young 참조)

```typescript
// Old generation의 객체가 Young generation을 참조할 때 호출
writeBarrier(old_obj_id, young_obj_id);

// RememberedSet에 추가되어 minor GC 시 추적됨
```

### GC 통계

```typescript
interface GCStats {
  heapUsedBefore: number;      // GC 전 힙 객체 수
  heapUsedAfter: number;       // GC 후 힙 객체 수
  heapFreed: number;           // 수집된 객체 수
  objectsCollected: number;    // 수집된 개별 객체 수
  timeMs: number;              // GC 소요 시간 (ms)
  type: 'minor' | 'major' | 'incremental';
}
```

---

## 메모리 정책

### 메모리 최적화

#### 1. Value Inlining
```
작은 값(i32, f64, bool)은 직접 스택에 저장되어 힙 할당 없음
→ GC 부하 감소, 캐시 효율 증대
```

#### 2. 세대별 수집 빈도
```
Young: 함수 호출 1,000회마다
Old: 10회 minor GC마다 (약 10,000회 함수 호출)
```

#### 3. 문자열 풀 (향후)
```
동일한 문자열은 1개만 힙에 저장 (String Interning)
현재: 미지원 (v2.3.0에서 추가 예정)
```

### 메모리 제한

| 항목 | 제한 | 설명 |
|------|------|------|
| **힙 크기** | 512MB | 최대 할당 가능 메모리 |
| **스택 크기** | 1MB | 함수 호출 스택 |
| **문자열 길이** | 1MB | 한 문자열의 최대 길이 |
| **배열 크기** | 10M elements | 배열의 최대 요소 개수 |
| **함수 깊이** | 256 | 최대 호출 스택 깊이 |

### 메모리 오류 처리

```
상황                          예외              처리
────────────────────────────────────────────────────
스택 오버플로우              panic: stack overflow  프로세스 종료
힙 부족                      panic: out of memory   프로세스 종료
배열 인덱스 범위 초과        panic: index out of bounds
구조체 필드 불일치           panic: no such field
분할 나누기 0                panic: division by zero
```

---

## 예시: 메모리 할당 추적

### 예제 1: 배열 생성

```freelang
fn main(): void {
  var arr: [i32] = [1, 2, 3]
  println(str(arr))
}
```

**메모리 변화**:

```
1. fn main() 호출
   Stack: [CallFrame(returnAddr=0, baseSlot=0, locals=[])]
   Heap: empty
   GC: autoCollect() 호출 준비

2. [1, 2, 3] 평가
   ARRAY_NEW 3 실행
   Stack에서 3, 2, 1 pop
   GC: gc.allocate(3*32=96) → GC_ID=1
   Heap: [GC_ID=1 (Young, size=96, marked=false)]

3. arr 변수에 할당
   Stack: [CallFrame(..., locals=[{tag:"arr", val:[...]}])]

4. CALL builtin print
   callCount++ → 1
   (1 < 1000이므로 GC 미실행)

5. RETURN
   CallFrame pop, actor.state="done"
   HALT 실행 → gc.fullCollect()
   Heap 정리 → GC_ID=1 삭제
```

### 예제 2: 1000회 함수 호출

```freelang
fn loop(n: i32): void {
  if n <= 0 { return }
  var arr: [i32] = [n]
  loop(n - 1)
}

fn main(): void {
  loop(1000)
}
```

**GC 동작**:

```
1~999회 호출: 각 arr 할당 → Young generation
1000회 호출: callCount >= 1000 → gc.autoCollect()
  ├─ markYoung(): 현재 활성 arr만 마킹
  ├─ sweepYoung(): 반환된 arr들 삭제
  └─ 대부분의 배열이 수집됨

다음 함수 호출부터 힙이 정리된 상태에서 시작
```

---

## 향후 계획 (v2.3.0+)

- ☐ 압축 (Compaction)
- ☐ 문자열 인턴(String Interning)
- ☐ 약한 참조 (Weak References)
- ☐ Finalizer 지원
- ☐ 바이너리 직렬화 (GC_ID 기반)

---

## 참고

- **GC Engine**: `src/gc/gc-engine.ts`
- **VM 구현**: `src/script-runner/vm.ts`
- **Value 정의**: `src/script-runner/vm.ts` (Line 11-23)

---

**Author**: FreeLang Core Team
**License**: MIT
**Last Updated**: 2026-03-04
