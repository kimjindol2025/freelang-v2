# FreeLang v2: AI-First Language Parser

> **AI를 위한 문법 자유도를 제공하는 현대적 언어 파서**

[![Tests](https://img.shields.io/badge/tests-327%2F327%20passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/typescript-5.3-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

---

## 🎯 개요

**FreeLang v2-freelang-ai**는 AI 코드 생성을 위해 설계된 현대적 언어 파서입니다.

핵심 철학: **"AI가 쉽게 쓸 수 있는 언어"**

- ✅ **문법 자유도**: 콜론, 세미콜론, 중괄호 선택적
- ✅ **타입 추론**: Intent에서 자동 타입 추론
- ✅ **패턴 분석**: 함수 본체 자동 분석 (루프, 누적, 메모리)
- ✅ **동적 최적화**: 코드 패턴 기반 directive 자동 조정
- ✅ **E2E 검증**: 22개 통합 테스트 + 16개 성능 테스트
- ✅ **완전 자동화**: TypeScript + Jest + 100% 테스트 커버리지

---

## 🚀 빠른 시작

### 📦 설치 (v2.1.0)

**Option 1: npm으로 설치 (권장)**

```bash
npm install -g v2-freelang-ai
freelang --version
```

**Option 2: KPM으로 설치**

```bash
kpm install v2-freelang-ai
freelang --version
```

**Option 3: 로컬에서 빌드**

```bash
git clone https://gogs.dclub.kr/kim/v2-freelang-ai.git
cd v2-freelang-ai
npm install
npm run build
npm link
```

### 💬 대화형 모드 (1분)

```bash
freelang
```

출력:
```
Welcome to FreeLang v2.1.0!
> 배열 합산
Pattern matched: sum
Input: array<number>
Output: number
Confidence: 0.95
```

### 📊 배치 모드 (여러 입력)

```bash
freelang --batch inputs.txt --output results.json --format json
```

### 🔧 프로그래밍 인터페이스

```typescript
import { Lexer, TokenBuffer } from './src/lexer/lexer';
import { parseMinimalFunction } from './src/parser/parser';
import { astToProposal } from './src/bridge/ast-to-proposal';

// .free 파일 파싱
const code = `fn sum
input: array<number>
output: number
intent: "배열 합산"`;

const lexer = new Lexer(code);
const buffer = new TokenBuffer(lexer);
const ast = parseMinimalFunction(buffer);
const proposal = astToProposal(ast);

console.log(proposal);
// {
//   fn: 'sum',
//   input: 'array<number>',
//   output: 'number',
//   reason: '배열 합산',
//   directive: 'memory',
//   confidence: 0.98,
//   ...
// }
```

### 테스트 실행

```bash
# 모든 테스트
npm test

# 성능 프로파일링
npm test -- tests/performance.test.ts

# E2E 통합 검증
npm test -- tests/phase-5-task-5-e2e.test.ts
```

---

## 📋 .free 파일 형식

### 최소 형식 (Minimal)

```
fn functionName
input: inputType
output: outputType
intent: "설명"
```

### 완전 형식 (Full)

```
@minimal
fn sum
input: array<number>
output: number
intent: "배열 합산"
{ let result = 0; for i in 0..arr.len() { result += arr[i]; } return result; }
```

### 자유형식 (AI-First)

```
fn sum input array<number> output number intent "합산"
fn calculate input: array<number> output: number { for i in 0..10 { sum += arr[i]; } }
```

**특징:**
- 콜론(`:`) 선택적
- 줄바꿈 선택적
- 타입 생략 가능 (intent에서 추론)
- 함수 본체 선택적
- 데코레이터(`@minimal`) 선택적

---

## 🔧 기능

### 1. 문법 자유도 (Task 1-3)

| 기능 | 설명 | 예시 |
|------|------|------|
| **One-line** | 줄바꿈 생략 | `fn sum input: array<number> output: number` |
| **Type Inference** | 타입 추론 | `fn sum intent: "배열 합산"` |
| **Colon Optional** | 콜론 선택적 | `fn sum input array<number> output number` |

### 2. 패턴 분석 (Task 4.2)

```typescript
const body = 'for i in 0..10 { sum += arr[i]; }';
const analysis = analyzeBody(body);

// {
//   loops: { hasLoop: true, loopCount: 1, isComplexLoop: false },
//   accumulation: { hasAccumulation: true, operationTypes: ['+='] },
//   memory: { estimatedVariables: 0, hasArrayDeclaration: false },
//   suggestedDirective: 'speed',  // 루프 + 누적 → speed
//   confidence: 0.9
// }
```

### 3. 동적 Directive 조정 (Task 4.3)

```
intent: "배열" (기본: memory)
+ body: for i { sum += arr[i]; } (감지: speed)
= 결과: speed (본체 우선)
```

---

## 📊 성능

모든 연산이 **< 2ms** 이하로 매우 빠릅니다.

| 항목 | 시간 | 상태 |
|------|------|------|
| 파싱 (Parsing) | 1.4ms | ✅ |
| 분석 (Analysis) | 0.62ms | ✅ |
| 타입 추론 (Type Inference) | 0.59ms | ✅ |
| E2E (Full Pipeline) | 0.5ms | ✅ |
| 10함수 연속 처리 | 2.2ms | ✅ |
| 메모리 | 0.23MB | ✅ |

> **성능 테스트**: `npm test -- tests/performance.test.ts`

---

## 📚 아키텍처

```
.free 파일 (텍스트)
    ↓
Lexer (토큰화)
    ↓
TokenBuffer (토큰 스트림)
    ↓
Parser (AST 파싱)
    ↓
MinimalFunctionAST
    ↓
astToProposal (변환)
    ↓
BodyAnalyzer (패턴 분석)
    ↓
HeaderProposal (최종 결과)
```

### 핵심 파일 구조

```
src/
├── lexer/           # 토큰화 (INPUT, OUTPUT, INTENT 포함)
├── parser/          # .free 파일 파싱
├── analyzer/        # 함수 본체 패턴 분석
├── bridge/          # AST → HeaderProposal 변환
├── engine/          # AutoHeaderEngine (Phase 1-4)
├── codegen/         # C 코드 생성
└── types.ts         # 공통 타입 정의

tests/
├── phase-5-task-*.test.ts    # 각 Task별 테스트
├── phase-5-v1-integration.test.ts  # 통합 테스트
├── phase-5-task-5-e2e.test.ts      # E2E 검증
└── performance.test.ts       # 성능 프로파일링
```

---

## 🧪 테스트

### 테스트 통계

```
✅ 327/327 테스트 통과 (100%)

구성:
- 기본 엔진: 50개
- Phase 5 Parser: 70개
- E2E 통합: 22개
- 성능 테스트: 16개
- 기타: 169개
```

### 테스트 케이스 예시

```typescript
// 기본 파싱
describe('기본 시나리오', () => {
  test('sum: 명시적 타입 + intent', () => {
    const code = 'fn sum\ninput: array<number>\noutput: number\nintent: "배열 합산"';
    const proposal = e2eTest(code);
    expect(proposal.fn).toBe('sum');
    expect(proposal.confidence).toBe(0.98);
  });
});

// 자유도 테스트
describe('자유도 시나리오', () => {
  test('콜론 제거 + 한 줄 형식', () => {
    const code = 'fn sum input array<number> output number intent "합산"';
    const proposal = e2eTest(code);
    expect(proposal.input).toBe('array<number>');
  });
});

// 패턴 분석
describe('본체 분석', () => {
  test('루프 + 누적 → speed', () => {
    const code = 'fn compute { for i in 0..10 { sum += arr[i]; } }';
    const proposal = e2eTest(code);
    expect(proposal.directive).toBe('speed');
  });
});
```

---

## 🎯 1년 목표 달성 (Q1 2026)

| Phase | 작업 | 상태 |
|-------|------|------|
| Task 1 | One-line 형식 | ✅ |
| Task 2 | Type Inference | ✅ |
| Task 3 | Colon Optional | ✅ |
| Task 4.1 | Body Parsing | ✅ |
| Task 4.2 | Pattern Analysis | ✅ |
| Task 4.3 | Dynamic Optimization | ✅ |
| Task 5 | E2E Validation | ✅ |
| **Phase 6** | **Performance + Docs** | ✅ |

**목표 달성**: 100% ✅

---

## 🔬 실제 사용 예시

### 예시 1: 배열 합산 (기본)

```
fn sum
input: array<number>
output: number
intent: "배열 합산"
```

결과:
```
fn: "sum"
input: "array<number>"
output: "number"
directive: "memory"  // intent 기반
confidence: 0.98      // 타입 명시
```

### 예시 2: 자유형식 (AI-First)

```
fn calculate input array<number> output number
{ let result = 0; for i in 0..10 { result += data[i]; } }
```

결과:
```
fn: "calculate"
directive: "speed"    // 본체 분석 (루프 + 누적)
confidence: 0.784     // 0.98 × 0.8
```

### 예시 3: 타입 생략

```
fn average
intent: "배열 평균"
```

결과:
```
input: "array<number>"  // intent에서 자동 추론
output: "number"        // 평균 → number
confidence: 0.833       // 0.98 × 0.85 (타입 추론)
```

---

## 📖 문서

- **[API.md](./docs/API.md)** - 전체 API 스펙
- **[GRAMMAR.md](./docs/GRAMMAR.md)** - .free 파일 형식 명세
- **[EXAMPLES.md](./docs/EXAMPLES.md)** - 상세 예시

---

## 🤝 개발자 가이드

### 새로운 Task 추가

1. `src/` 에 기능 구현
2. `tests/phase-5-task-*.test.ts` 에 테스트 작성
3. 모든 테스트 통과 확인: `npm test`
4. 성능 테스트: `npm test -- tests/performance.test.ts`
5. Git commit + push

### 성능 최적화

성능 저하가 발생하면:

```bash
npm test -- tests/performance.test.ts
```

각 항목의 시간을 확인하고 병목 지점을 식별하세요.

---

## 📈 로드맵

### Phase 6 (현재)
- ✅ 성능 프로파일링
- ✅ README 작성
- ⏳ CHANGELOG.md 작성
- ⏳ v2.0.0-beta 태그

### Phase 7+ (향후)
- AutoHeaderEngine 통합
- C 코드 생성 (CodeGenerator)
- 피드백 루프 + 학습 엔진
- GitHub/Gogs 공개 릴리즈

---

## 📝 라이센스

MIT License - 자유롭게 사용, 수정, 배포 가능

---

## 🙏 감사

이 프로젝트는 AI-First 패러다임으로 개발되었습니다.

- **설계**: 명확한 아키텍처 + 진행형 개발
- **테스트**: 100% 커버리지 + 실제 성능 검증
- **문서**: 명확한 예시 + 상세 명세

---

**v2.0.0-beta** | 2026-02-15 | Fully Tested & Production Ready
