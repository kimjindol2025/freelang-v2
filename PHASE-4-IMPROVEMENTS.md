# Phase 4: 개선 기반 CodeGen + 확장

**목표**: v1 좋은 패턴을 활용하며 v2만의 개선사항 구현

**기간**: 2-3주 예상

---

## 🎯 Phase 4 작업 계획

### 1️⃣ Builtin 선언적 레지스트리 (우선순위: ★★★★★)

**파일**: `src/engine/builtins.ts` (새로 생성)

```typescript
// 단일 진실 공급원
interface BuiltinSpec {
  name: string;
  params: Param[];
  return: string;
  c_name: string;
  headers: string[];
  impl?: Function;  // interpreter용
}

// 한 번 선언
const BUILTINS: Record<string, BuiltinSpec> = {
  sum: {
    name: 'sum',
    params: [{ name: 'arr', type: 'array<number>' }],
    return: 'number',
    c_name: 'sum_array',
    headers: ['stdlib.h'],
    impl: (arr) => arr.reduce((a, b) => a + b, 0),
  },
  // ... 더 추가
};

// 3곳에서 자동 사용
export function getBuiltinC(name: string): string { ... }
export function getBuiltinInterp(name: string): Function { ... }
export function getBuiltinType(name: string): { input, output } { ... }
```

**테스트**:
- sum, avg, max, min 에 대해 3곳 모두 같은 결과 ✓

---

### 2️⃣ directive 기반 stdlib 자동 생성 (★★★★☆)

**파일**: `src/codegen/library-resolver.ts` (새로 생성)

```typescript
interface LibraryResolver {
  resolve(directive: string): string[]  // ["stdio.h", "math.h"]
}

// directive → 필요한 헤더 자동 결정
const directives: Record<string, string[]> = {
  'memory_efficient': ['stdlib.h'],
  'speed': ['math.h', 'stdio.h'],
  'safety': ['stdlib.h', 'assert.h'],
};
```

**효과**: 새 함수 추가할 때마다 매핑 DB 자동 성장

---

### 3️⃣ directive 기반 메모리 전략 (★★★☆☆)

**파일**: `src/codegen/memory-strategy.ts` (새로 생성)

```typescript
interface MemoryStrategy {
  emit_free(varName: string): string;
  emit_init(): string;
}

class SpeedStrategy implements MemoryStrategy {
  // arena allocator 사용
  emit_free() { return 'arena_dealloc_all();' }
}

class MemoryEfficientStrategy implements MemoryStrategy {
  // 즉시 free
  emit_free(v) { return `free(${v});` }
}

class SafetyStrategy implements MemoryStrategy {
  // free + NULL 초기화
  emit_free(v) { return `free(${v}); ${v} = NULL;` }
}
```

**CEmitter 개선**:
```typescript
// Before: 배열만 특수 처리
if (varInfo.cType === 'DoubleArray') emit(`free(...)`);

// After: directive 기반 전략
const strategy = this.getMemoryStrategy(directive);
emit(strategy.emit_free(varName));
```

---

### 4️⃣ 이터레이터 프로토콜 (Range → Iterator) (★★★☆☆)

**파일**: `src/engine/patterns.ts` + `src/types.ts` 개선

```typescript
// 새 opcode 추가
export enum Op {
  // ... 기존
  ITER_INIT   = 0x80,  // 이터레이터 초기화
  ITER_NEXT   = 0x81,  // 다음 값
  ITER_HAS    = 0x82,  // 더 있는지
}

// IR 생성 개선
generateIntent() {
  if (op === 'range') {
    // Range [0..10] → lazy iterator IR
    body.push(
      { op: Op.PUSH, arg: 0 },
      { op: Op.PUSH, arg: 10 },
      { op: Op.ITER_INIT, arg: 'iter' },
    );
  }
}
```

**VM 구현**:
```typescript
case Op.ITER_INIT: {
  const end = this.stack.pop();
  const start = this.stack.pop();
  this.vars.set(arg, { kind: 'iterator', current: start, end });
  break;
}
case Op.ITER_NEXT: {
  const iter = this.vars.get(arg);
  if (iter.current < iter.end) {
    this.stack.push(iter.current++);
  }
}
```

---

### 5️⃣ LLVM 백엔드 스켈레톤 (★★☆☆☆)

**파일**: `src/codegen/llvm-emitter.ts` (새로 생성)

```typescript
export class LLVMEmitter {
  generate(intent: AIIntent): string {
    let ll = `; ModuleID = '${intent.fn}'\n`;
    ll += `define i64 @${intent.fn}(...) {\n`;

    for (const inst of intent.body) {
      ll += this.emitInst(inst);
    }

    ll += `ret i64 0\n}\n`;
    return ll;
  }
}
```

**테스트**: sum을 LLVM IR로 생성 가능한가?

---

## 📊 Phase 4 완성 기준

| 항목 | 완성 조건 |
|------|---------|
| Builtin 레지스트리 | 10개 함수가 3곳 모두 작동 ✓ |
| stdlib 자동 생성 | 3가지 directive에 따라 다른 헤더 ✓ |
| 메모리 전략 | 3가지 directive 테스트 ✓ |
| 이터레이터 | for i in 0..10 lazy 평가 ✓ |
| LLVM 백엔드 | sum의 LLVM IR 생성 ✓ |
| 테스트 | 80+ 테스트 (현재 63개 + 20개 신규) |

---

## 🚀 예상 효과

### 코드 품질
- 중복 제거 (Builtin 레지스트리)
- 확장성 증대 (자동 stdlib)
- 유지보수 용이 (메모리 전략 중앙화)

### 성능
- 메모리: directive별 최적화 선택 가능
- 속도: LLVM JIT 추가로 극적 향상 가능
- 캐시: 이터레이터 lazy 평가

### 학습
- 에러 패턴 수집 → 자동 수정 데이터 확충
- directive 사용 패턴 → 최적 선택 학습
- stdlib 매핑 자동 성장

---

## 📝 주의사항

이 개선사항들은:
- ✅ v1 좋은 패턴 기반
- ✅ v1 미흡한 부분 개선
- ✅ v2의 AI 학습 루프 강화
- ❌ 완벽함 추구 아님 (실수 당연)

각 항목을 구현하면서 버그 나올 수 있음. 그것은 배움의 과정.

