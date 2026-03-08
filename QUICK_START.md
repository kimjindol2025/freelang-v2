# FreeLang v2.1.0 Quick Start Guide

> **5분 안에 시작하는 FreeLang**

## ⚡ 1분: 설치

### Option 1: npm으로 설치 (권장)

```bash
npm install -g v2-freelang-ai
freelang --version  # v2.1.0
```

### Option 2: KPM으로 설치

```bash
kpm install @freelang/core
freelang --version
```

### Option 3: 소스에서 빌드

```bash
git clone https://gogs.dclub.kr/kim/v2-freelang-ai.git
cd v2-freelang-ai
npm install
npm run build
npm link
```

---

## 🎯 2분: 첫 시작

### 대화형 모드 실행

```bash
freelang
```

**인터랙티브 프롬프트:**
```
Welcome to FreeLang v2.1.0!
> 배열 합산

Pattern matched: sum
Input: array<number>
Output: number
Confidence: 0.95

Generated function:
fn sum(arr: array<number>)
  arr.fold(0, |acc, x| acc + x)

Approve? (y/n/m/s): y ✓
```

### 빠른 분석

```bash
freelang analyze "배열 필터링"
```

---

## 📝 3분: 코드 예제

### 파이썬 같은 간단한 문법

```freelang
# 배열 합산
fn sum(arr: array<number>)
  arr.fold(0, |acc, x| acc + x)

# 배열 필터링
fn filter_positive(arr)
  arr.filter(|x| x > 0)

# 맵핑
fn double_all(arr)
  arr.map(|x| x * 2)

# 재귀 (타입 자동 추론)
fn fibonacci(n)
  if n <= 1
    n
  else
    fibonacci(n - 1) + fibonacci(n - 2)
```

### C 코드로 컴파일

```bash
freelang compile input.free --target c --output output.c
```

**생성된 C 코드:**
```c
int sum(int* arr, int arr_len) {
  int acc = 0;
  for (int i = 0; i < arr_len; i++) {
    acc = acc + arr[i];
  }
  return acc;
}
```

---

## 🚀 4분: 배치 처리

### 입력 파일 준비

**input.txt:**
```
배열 합산
배열 필터링
맵핑
```

### 배치 실행

```bash
freelang --batch input.txt --output results.json --format json
```

**결과 (results.json):**
```json
[
  {
    "intent": "배열 합산",
    "pattern": "sum",
    "function": "fn sum(arr: array<number>)\n  arr.fold(0, |acc, x| acc + x)",
    "confidence": 0.95,
    "type_inference": {
      "inputs": ["array<number>"],
      "output": "number"
    }
  },
  ...
]
```

---

## 📊 5분: 대시보드 및 통계

### 실시간 대시보드 시작

```bash
freelang dashboard --port 8000
```

**접속:**
```
URL: http://localhost:8000
- Dashboard: 실시간 메트릭
- API: /api/stats, /api/patterns, /api/health
```

### CLI 통계

```bash
freelang stats
```

**출력:**
```
📊 FreeLang Statistics
─────────────────────────────────────────
Total Patterns: 578
- High Confidence (0.9+): 465
- Medium Confidence (0.7-0.9): 98
- Low Confidence (<0.7): 15

Recent Patterns:
✓ sum (배열 합산) - 0.95
✓ filter (배열 필터링) - 0.92
✓ map (맵핑) - 0.91

Type Inference:
✓ Success Rate: 98.8%
✓ Avg Confidence: 0.94
```

---

## 🛠️ 프로그래밍 인터페이스

### TypeScript에서 사용

```typescript
import { parseMinimalFunction } from 'v2-freelang-ai/dist/parser/parser';
import { PipelineCompiler } from 'v2-freelang-ai/dist/compiler/pipeline-compiler';

// 코드 파싱
const code = `
  fn factorial(n: number)
    if n <= 1
      1
    else
      n * factorial(n - 1)
`;

const ast = parseMinimalFunction(code);

// 컴파일
const compiler = new PipelineCompiler();
const result = compiler.compile(code, {
  target: 'c',
  optimizations: 'basic'
});

console.log(result.code);
```

### JavaScript에서 사용

```javascript
const { parseMinimalFunction } = require('v2-freelang-ai/dist/parser/parser');

const ast = parseMinimalFunction('fn add(a, b) a + b');
console.log(ast.name);  // "add"
console.log(ast.params); // [{ name: 'a' }, { name: 'b' }]
```

---

## 📚 주요 명령어

```bash
# 도움말
freelang --help

# 버전 확인
freelang --version

# 대화형 모드
freelang

# 대화형 모드 (파일 입력)
freelang --input intents.txt

# 배치 처리
freelang --batch input.txt --output output.json

# 대시보드 시작
freelang dashboard --port 8000

# 통계 조회
freelang stats

# 패턴 목록
freelang patterns

# 개발 모드
freelang --dev

# 테스트 실행
freelang test
```

---

## 🎓 학습 경로

### Level 1: 기본 사용 (5분)
1. ✅ 설치
2. ✅ 대화형 모드 실행
3. ✅ 패턴 매칭 경험

### Level 2: 배치 처리 (15분)
1. 입력 파일 준비
2. 배치 모드 실행
3. 결과 해석

### Level 3: 프로그래밍 통합 (30분)
1. TypeScript/JavaScript 예제 학습
2. 파서 API 사용
3. 컴파일러 설정 조정

### Level 4: 고급 기능 (1시간+)
1. 패턴 데이터베이스 커스터마이징
2. 타입 추론 엔진 튜닝
3. 대시보드 통합

---

## ❓ FAQ

### Q1: 타입을 명시하지 않으면?

**A:** 자동으로 추론됩니다!

```freelang
# 명시적 타입
fn add_explicit(a: number, b: number) a + b

# 자동 추론 (동일)
fn add_inferred(a, b) a + b
```

### Q2: FreeLang에서 C로 어떻게 컴파일?

**A:** IR(중간 표현)을 거쳐 C 코드 생성:

```
FreeLang → AST → IR → C Code
```

### Q3: 외부 라이브러리를 사용할 수 있나?

**A:** 현재 표준 라이브러리만 지원합니다. Phase 2에서 FFI 추가 예정.

### Q4: 성능은?

**A:** 매우 빠릅니다!
- 패턴 검색: < 30ms (10K patterns)
- 컴파일: < 100ms (1K LOC)
- SSE 연결: < 50ms

### Q5: 라이선스는?

**A:** MIT 라이선스 - 자유로운 사용/수정/배포 가능

---

## 🔗 다음 단계

### 문서
- **[API_REFERENCE.md](./API_REFERENCE.md)** - 전체 API 문서
- **[README.md](./README.md)** - 프로젝트 개요
- **[FREELANG-LANGUAGE-SPEC.md](./FREELANG-LANGUAGE-SPEC.md)** - 언어 사양
- **[COMPREHENSIVE-ROADMAP-2026.md](./COMPREHENSIVE-ROADMAP-2026.md)** - 개발 로드맵

### 예제
- **[examples/](./examples/)** - 실행 가능한 예제 (준비 중)
- **[tests/](./tests/)** - 테스트 케이스 (3,540+ 테스트)

### 커뮤니티
- **GitHub Issues**: 버그 리포팅
- **Discussions**: 기능 제안
- **Gogs**: https://gogs.dclub.kr/kim/v2-freelang-ai

---

## 💡 팁

### 1. 배치 처리 가속화

```bash
# 병렬 처리 (기본값)
freelang --batch large_input.txt --parallel 8

# 진행 상황 표시
freelang --batch input.txt --verbose
```

### 2. 컴파일 최적화

```bash
# 공격적 최적화
freelang compile --target c --optimize aggressive

# 디버그 정보 포함
freelang compile --emit-debug-info
```

### 3. 성능 프로파일링

```bash
freelang analyze "배열 합산" --profile
```

**결과:**
```
⏱️ Profiling Results:
- Parsing: 1.2ms
- Analysis: 2.3ms
- Type Inference: 3.1ms
- Code Generation: 2.4ms
- Total: 9.0ms
```

---

## 🐛 문제 해결

### Issue: "command not found: freelang"

```bash
# npm link 다시 실행
npm link

# 또는 npm을 사용하여 설치
npm install -g v2-freelang-ai
```

### Issue: "타입 추론 실패"

```bash
# --strict 모드 비활성화
freelang --no-strict

# 또는 타입을 명시적으로 지정
fn func(a: number, b: string) ...
```

### Issue: "메모리 부족 (대용량 배치)"

```bash
# 청크 크기 조정
freelang --batch input.txt --chunk-size 100

# 또는 스트리밍 모드
freelang --batch input.txt --streaming
```

---

## 📊 성능 최적화

### 작은 파일 (< 1KB)
```bash
freelang compile input.free --target ts  # TypeScript 더 빠름
```

### 중간 파일 (1-100KB)
```bash
freelang compile input.free --target c --optimize basic
```

### 대용량 파일 (> 100KB)
```bash
freelang compile input.free \
  --target c \
  --optimize aggressive \
  --emit-ir  # IR 저장으로 재컴파일 가속
```

---

**🎉 축하합니다! 이제 FreeLang을 사용할 준비가 되었습니다!**

더 궁금한 점은 [API_REFERENCE.md](./API_REFERENCE.md)를 참고하세요.
