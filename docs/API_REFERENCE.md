# 📚 FreeLang v2.1.0: API Reference

**버전**: v2.1.0
**마지막 업데이트**: 2026-03-05

> 모든 API, 함수, 타입, 설정에 대한 완전한 레퍼런스

---

## 목차

1. [CLI API](#cli-api)
2. [AutoHeaderEngine API](#autoheaderenine-api)
3. [Parser API](#parser-api)
4. [Feedback API](#feedback-api)
5. [Learning Engine API](#learning-engine-api)
6. [Dashboard API](#dashboard-api)
7. [Type Definitions](#type-definitions)
8. [Error Handling](#error-handling)

---

## CLI API

### 명령어 개요

FreeLang CLI는 다음 4가지 모드를 지원합니다:

| 모드 | 명령어 | 용도 |
|------|--------|------|
| 대화형 | `freelang` | 대화형 입력 |
| 배치 | `freelang --batch <file>` | 파일 입력 처리 |
| 버전 | `freelang --version` | 버전 정보 |
| 도움말 | `freelang --help` | 사용법 |

### 대화형 모드

```bash
freelang
```

**출력**:
```
Welcome to FreeLang v2.1.0!
Interactive mode - enter your intent (or 'quit' to exit)

> [대기 입력]
```

**입력 포맷**:
```
Intent 문자열
```

**예제**:
```
> 배열 합산
Pattern matched: sum
Input: array<number>
Output: number
Confidence: 0.95

> 최댓값 찾기
Pattern matched: max
Input: array<number>
Output: number
Confidence: 0.94
```

### 배치 모드

```bash
freelang --batch <input-file> [--output <output-file>] [--format <format>]
```

**옵션**:

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `--batch` | string | 필수 | 입력 파일 경로 |
| `--output` | string | `results.json` | 출력 파일 경로 |
| `--format` | string | `json` | 출력 형식 (`json`, `csv`) |

**예제**:
```bash
# JSON 형식 출력
freelang --batch inputs.txt --output results.json --format json

# CSV 형식 출력
freelang --batch inputs.txt --output results.csv --format csv

# 기본값 사용
freelang --batch inputs.txt
# → results.json 생성
```

**입력 파일 형식**:

**Plain Text** (한 줄에 하나의 Intent):
```
배열 합산
최댓값 찾기
평균 계산
```

**JSON**:
```json
[
  { "intent": "배열 합산", "tags": ["aggregation"] },
  { "intent": "최댓값 찾기", "tags": ["aggregation"] }
]
```

**출력 형식**:

**JSON**:
```json
[
  {
    "intent": "배열 합산",
    "pattern": "sum",
    "confidence": 0.95,
    "input": "array<number>",
    "output": "number",
    "examples": ["sum([1,2,3]) → 6"]
  }
]
```

**CSV**:
```csv
intent,pattern,confidence,input,output
배열 합산,sum,0.95,array<number>,number
최댓값 찾기,max,0.94,array<number>,number
```

### 버전 정보

```bash
freelang --version
```

**출력**:
```
FreeLang v2.1.0
```

### 도움말

```bash
freelang --help
```

**출력**:
```
📚 FreeLang v2 - CLI Tool

Usage:
  freelang                    # 대화형 모드 (기본값)
  freelang --batch <file>     # 배치 모드 (파일 입력)
  freelang --help             # 도움말
  freelang --version          # 버전 정보

Options:
  -b, --batch <file>         # 배치 파일 입력
  -o, --output <file>        # 출력 파일
  -f, --format <json|csv>    # 출력 형식
  -h, --help                 # 도움말
  -v, --version              # 버전
```

---

## AutoHeaderEngine API

### 개요

AutoHeaderEngine은 Intent를 패턴으로 변환하는 핵심 엔진입니다.

### 주요 기능

1. **Intent 인식**: 자연어 Intent 파싱
2. **패턴 매칭**: 100개 패턴과 비교
3. **신뢰도 계산**: 0.0 ~ 1.0 신뢰도 반환
4. **자동완성**: 유사 패턴 제안

### API

#### `matchIntent(intent: string): PatternMatch`

Intent를 패턴과 매칭합니다.

**파라미터**:
| 이름 | 타입 | 설명 |
|------|------|------|
| `intent` | `string` | 자연어 Intent |

**반환값**:
```typescript
interface PatternMatch {
  pattern: string;        // 패턴명 (e.g., "sum")
  confidence: number;     // 신뢰도 (0.0 ~ 1.0)
  input: string;          // 입력 타입
  output: string;         // 출력 타입
  examples: string[];     // 예제
  aliases: string[];      // 별칭
}
```

**예제**:
```typescript
const match = engine.matchIntent("배열 합산");
// {
//   pattern: "sum",
//   confidence: 0.95,
//   input: "array<number>",
//   output: "number",
//   examples: ["sum([1,2,3]) → 6"],
//   aliases: ["add", "total"]
// }
```

#### `suggestPatterns(intent: string, limit: number = 5): PatternMatch[]`

유사한 패턴을 여러 개 제안합니다.

**파라미터**:
| 이름 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `intent` | `string` | 필수 | 자연어 Intent |
| `limit` | `number` | 5 | 반환 패턴 수 |

**반환값**:
```typescript
PatternMatch[]  // 신뢰도 순 정렬
```

**예제**:
```typescript
const suggestions = engine.suggestPatterns("합계", 3);
// [
//   { pattern: "sum", confidence: 0.95, ... },
//   { pattern: "add", confidence: 0.88, ... },
//   { pattern: "total", confidence: 0.82, ... }
// ]
```

#### `getPatternInfo(patternName: string): PatternInfo`

특정 패턴의 상세 정보를 반환합니다.

**파라미터**:
| 이름 | 타입 | 설명 |
|------|------|------|
| `patternName` | `string` | 패턴명 (e.g., "sum") |

**반환값**:
```typescript
interface PatternInfo {
  op: string;             // 작업명
  input: string;          // 입력 타입
  output: string;         // 출력 타입
  aliases: string[];      // 별칭
  examples: string[];     // 예제
  tags: string[];         // 태그
  complexity: string;     // 복잡도 (O(n) 등)
  confidence: number;     // 현재 신뢰도
  usageCount: number;     // 사용 횟수
  approvalRate: number;   // 승인율 (0.0 ~ 1.0)
}
```

**예제**:
```typescript
const info = engine.getPatternInfo("sum");
// {
//   op: "sum",
//   input: "array<number>",
//   output: "number",
//   aliases: ["add", "total"],
//   examples: ["sum([1,2,3]) → 6"],
//   tags: ["aggregation", "math"],
//   complexity: "O(n)",
//   confidence: 0.95,
//   usageCount: 450,
//   approvalRate: 0.98
// }
```

#### `listPatterns(category?: string): PatternInfo[]`

패턴 목록을 반환합니다.

**파라미터**:
| 이름 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `category` | `string` | undefined | 카테고리 필터 (optional) |

**반환값**:
```typescript
PatternInfo[]  // 신뢰도 순 정렬
```

**예제**:
```typescript
// 모든 패턴
const allPatterns = engine.listPatterns();

// 특정 카테고리
const aggregationPatterns = engine.listPatterns("aggregation");
```

---

## Parser API

### 개요

Parser는 Intent를 구조화된 AST로 변환합니다.

### API

#### `parseIntent(intent: string): AST`

Intent를 AST로 파싱합니다.

**파라미터**:
| 이름 | 타입 | 설명 |
|------|------|------|
| `intent` | `string` | 자연어 Intent |

**반환값**:
```typescript
interface AST {
  type: "intent";
  text: string;           // 원본 텍스트
  tokens: string[];       // 토큰화된 단어
  keywords: string[];     // 키워드
  entities: Entity[];     // 추출된 엔티티
}

interface Entity {
  type: "noun" | "verb" | "adjective";
  text: string;
  position: number;
}
```

**예제**:
```typescript
const ast = parser.parseIntent("배열 합산");
// {
//   type: "intent",
//   text: "배열 합산",
//   tokens: ["배열", "합산"],
//   keywords: ["배열", "합산"],
//   entities: [
//     { type: "noun", text: "배열", position: 0 },
//     { type: "verb", text: "합산", position: 2 }
//   ]
// }
```

---

## Feedback API

### 개요

Feedback API는 사용자 피드백을 수집, 저장, 분석합니다.

### 주요 기능

1. **피드백 수집**: approve, reject, modify, suggest
2. **신뢰도 업데이트**: 자동 재계산
3. **통계 추적**: 승인율, 사용 횟수
4. **학습 기반**: 피드백으로 패턴 개선

### API

#### `recordFeedback(feedback: Feedback): void`

피드백을 기록합니다.

**파라미터**:
```typescript
interface Feedback {
  pattern: string;        // 패턴명
  action: "approve" | "reject" | "modify" | "suggest";
  timestamp: Date;        // 기록 시간
  user?: string;          // 사용자명 (optional)
  notes?: string;         // 추가 노트 (optional)
}
```

**예제**:
```typescript
engine.recordFeedback({
  pattern: "sum",
  action: "approve",
  timestamp: new Date()
});
```

#### `getFeedbackStats(pattern: string): FeedbackStats`

패턴의 피드백 통계를 반환합니다.

**파라미터**:
| 이름 | 타입 | 설명 |
|------|------|------|
| `pattern` | `string` | 패턴명 |

**반환값**:
```typescript
interface FeedbackStats {
  approveCount: number;   // 승인 수
  rejectCount: number;    // 거부 수
  modifyCount: number;    // 수정 수
  suggestCount: number;   // 제안 수
  approvalRate: number;   // 승인율 (0.0 ~ 1.0)
  totalFeedback: number;  // 총 피드백 수
  lastUpdated: Date;      // 마지막 업데이트
}
```

**예제**:
```typescript
const stats = engine.getFeedbackStats("sum");
// {
//   approveCount: 450,
//   rejectCount: 10,
//   modifyCount: 5,
//   suggestCount: 2,
//   approvalRate: 0.98,
//   totalFeedback: 467,
//   lastUpdated: 2026-03-05
// }
```

#### `updateConfidence(pattern: string, feedback: Feedback): number`

피드백 기반으로 신뢰도를 업데이트합니다.

**파라미터**:
| 이름 | 타입 | 설명 |
|------|------|------|
| `pattern` | `string` | 패턴명 |
| `feedback` | `Feedback` | 피드백 객체 |

**반환값**:
```typescript
number  // 업데이트된 신뢰도 (0.0 ~ 1.0)
```

**신뢰도 업데이트 규칙**:

| 액션 | 변화 | 범위 |
|------|------|------|
| approve | +2% | 최대 0.98 |
| reject | -5% | 최소 0.50 |
| modify | +1% | 최대 0.90 |
| suggest | +0.5% | 최대 0.85 |

**예제**:
```typescript
const oldConfidence = 0.90;
const newConfidence = engine.updateConfidence("sum", {
  pattern: "sum",
  action: "approve",
  timestamp: new Date()
});
// newConfidence = 0.92 (0.90 * 1.02)
```

---

## Learning Engine API

### 개요

Learning Engine은 피드백을 기반으로 패턴을 자동으로 개선합니다.

### API

#### `learnFromFeedback(): LearningReport`

수집된 피드백에서 학습합니다.

**반환값**:
```typescript
interface LearningReport {
  patternsUpdated: number;     // 업데이트된 패턴 수
  averageConfidenceChange: number;  // 평균 신뢰도 변화
  convergenceRate: number;     // 수렴율 (0.0 ~ 1.0)
  learningScore: number;       // 학습 점수 (0.0 ~ 1.0)
  duration: number;            // 실행 시간 (ms)
  timestamp: Date;             // 실행 시간
}
```

**예제**:
```typescript
const report = engine.learnFromFeedback();
// {
//   patternsUpdated: 45,
//   averageConfidenceChange: 0.032,
//   convergenceRate: 0.82,
//   learningScore: 0.84,
//   duration: 245,
//   timestamp: 2026-03-05T10:30:00Z
// }
```

#### `detectConvergence(pattern: string, window: number = 10): boolean`

패턴이 학습 수렴에 도달했는지 확인합니다.

**파라미터**:
| 이름 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `pattern` | `string` | 필수 | 패턴명 |
| `window` | `number` | 10 | 확인 윈도우 크기 |

**반환값**:
```typescript
boolean  // 수렴 여부
```

**수렴 조건**:
- 최근 `window` 개의 신뢰도 변화가 ±0.01 이내

**예제**:
```typescript
const converged = engine.detectConvergence("sum", 10);
// true: 신뢰도가 안정화됨
// false: 계속 변동 중
```

#### `getPatternHistory(pattern: string): ConfidenceHistory[]`

패턴의 신뢰도 변화 이력을 반환합니다.

**파라미터**:
| 이름 | 타입 | 설명 |
|------|------|------|
| `pattern` | `string` | 패턴명 |

**반환값**:
```typescript
interface ConfidenceHistory {
  timestamp: Date;        // 시간
  confidence: number;     // 신뢰도
  action: string;         // 피드백 액션
  change: number;         // 변화량
}
```

**예제**:
```typescript
const history = engine.getPatternHistory("sum");
// [
//   { timestamp: 2026-03-05T10:00:00Z, confidence: 0.90, action: "approve", change: 0.02 },
//   { timestamp: 2026-03-05T10:05:00Z, confidence: 0.92, action: "approve", change: 0.02 },
//   { timestamp: 2026-03-05T10:10:00Z, confidence: 0.94, action: "approve", change: 0.02 }
// ]
```

---

## Dashboard API

### 개요

Dashboard API는 시스템 메트릭과 통계를 제공합니다.

### API

#### `getMetrics(): Metrics`

현재 시스템 메트릭을 반환합니다.

**반환값**:
```typescript
interface Metrics {
  patternCount: number;         // 전체 패턴 수
  averageConfidence: number;    // 평균 신뢰도
  totalFeedback: number;        // 총 피드백 수
  approvalRate: number;         // 승인율 (0.0 ~ 1.0)
  learningScore: number;        // 학습 점수 (0.0 ~ 1.0)
  topPatterns: PatternInfo[];   // 상위 5개 패턴
  timestamp: Date;              // 기록 시간
}
```

**예제**:
```typescript
const metrics = dashboard.getMetrics();
// {
//   patternCount: 100,
//   averageConfidence: 0.85,
//   totalFeedback: 1250,
//   approvalRate: 0.78,
//   learningScore: 0.82,
//   topPatterns: [...],
//   timestamp: 2026-03-05T10:30:00Z
// }
```

#### `getTrends(period: "1h" | "24h" | "7d" = "24h"): Trend`

시간대별 추세를 반환합니다.

**파라미터**:
| 이름 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `period` | `string` | "24h" | 기간 ("1h", "24h", "7d") |

**반환값**:
```typescript
interface Trend {
  confidenceTrend: number;      // 신뢰도 변화 (%)
  usageTrend: number;           // 사용량 변화 (%)
  learningTrend: number;        // 학습 진행률 (%)
  feedbackRate: number;         // 피드백 비율
  timestamps: Date[];           // 시점 배열
}
```

**예제**:
```typescript
const trends = dashboard.getTrends("24h");
// {
//   confidenceTrend: 2.3,      // 신뢰도 +2.3%
//   usageTrend: 15,            // 사용량 +15%
//   learningTrend: 5,          // 학습 +5%
//   feedbackRate: 0.75,        // 피드백율 75%
//   timestamps: [...]
// }
```

#### `getReport(format: "text" | "json" | "html" = "text"): string`

대시보드 리포트를 생성합니다.

**파라미터**:
| 이름 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `format` | `string` | "text" | 형식 ("text", "json", "html") |

**반환값**:
```typescript
string  // 형식화된 리포트
```

**예제**:
```typescript
const report = dashboard.getReport("text");
console.log(report);
// FreeLang v2.1.0 Dashboard
// =========================
//
// 📊 Metrics
//   Pattern Count: 100
//   Average Confidence: 0.85
//   Total Feedback: 1,250
//   Approval Rate: 78%
//   Learning Score: 0.82
// ...
```

---

## Type Definitions

### PatternMatch

```typescript
interface PatternMatch {
  pattern: string;        // 패턴명
  confidence: number;     // 신뢰도
  input: string;          // 입력 타입
  output: string;         // 출력 타입
  examples: string[];     // 예제
  aliases: string[];      // 별칭
}
```

### PatternInfo

```typescript
interface PatternInfo {
  op: string;             // 작업명
  input: string;          // 입력 타입
  output: string;         // 출력 타입
  aliases: string[];      // 별칭
  examples: string[];     // 예제
  tags: string[];         // 태그
  complexity: string;     // 복잡도
  confidence: number;     // 신뢰도
  usageCount: number;     // 사용 횟수
  approvalRate: number;   // 승인율
  category?: string;      // 카테고리
}
```

### Feedback

```typescript
interface Feedback {
  pattern: string;        // 패턴명
  action: "approve" | "reject" | "modify" | "suggest";
  timestamp: Date;        // 기록 시간
  user?: string;          // 사용자명
  notes?: string;         // 추가 노트
}
```

### Metrics

```typescript
interface Metrics {
  patternCount: number;   // 패턴 수
  averageConfidence: number;  // 평균 신뢰도
  totalFeedback: number;  // 총 피드백
  approvalRate: number;   // 승인율
  learningScore: number;  // 학습 점수
  topPatterns: PatternInfo[];  // 상위 패턴
  timestamp: Date;        // 기록 시간
}
```

---

## Error Handling

### 에러 타입

```typescript
enum ErrorType {
  PATTERN_NOT_FOUND = "PATTERN_NOT_FOUND",
  INVALID_INPUT = "INVALID_INPUT",
  PARSE_ERROR = "PARSE_ERROR",
  CONFIDENCE_OUT_OF_RANGE = "CONFIDENCE_OUT_OF_RANGE",
  FEEDBACK_INVALID = "FEEDBACK_INVALID",
  LEARNING_ERROR = "LEARNING_ERROR"
}
```

### 에러 처리

```typescript
try {
  const match = engine.matchIntent("배열 합산");
} catch (error: FreeLangError) {
  console.error(`[${error.type}] ${error.message}`);
  // [PATTERN_NOT_FOUND] Pattern 'concat' not found
}
```

### 에러 예제

| 상황 | 에러 | 메시지 |
|------|------|--------|
| 패턴 없음 | `PATTERN_NOT_FOUND` | Pattern 'xxx' not found |
| 유효하지 않은 입력 | `INVALID_INPUT` | Input must be non-empty string |
| 파싱 실패 | `PARSE_ERROR` | Failed to parse intent |
| 신뢰도 범위 초과 | `CONFIDENCE_OUT_OF_RANGE` | Confidence must be 0.0 ~ 1.0 |
| 피드백 형식 오류 | `FEEDBACK_INVALID` | Invalid feedback format |
| 학습 오류 | `LEARNING_ERROR` | Learning engine error |

---

## 통합 예제

### 완전한 워크플로우

```typescript
import {
  AutoHeaderEngine,
  Parser,
  FeedbackCollector,
  LearningEngine,
  Dashboard
} from 'v2-freelang-ai';

// 1. 엔진 초기화
const engine = new AutoHeaderEngine();
const parser = new Parser();
const feedback = new FeedbackCollector();
const learning = new LearningEngine();
const dashboard = new Dashboard();

// 2. Intent 입력
const intent = "배열 합산";

// 3. 패턴 매칭
const match = engine.matchIntent(intent);
console.log(`Pattern: ${match.pattern}`);
console.log(`Confidence: ${match.confidence}`);

// 4. 파싱
const ast = parser.parseIntent(intent);
console.log(`Tokens: ${ast.tokens}`);

// 5. 피드백 수집
feedback.recordFeedback({
  pattern: match.pattern,
  action: "approve",
  timestamp: new Date()
});

// 6. 학습
const report = learning.learnFromFeedback();
console.log(`Patterns Updated: ${report.patternsUpdated}`);

// 7. 대시보드 표시
const metrics = dashboard.getMetrics();
console.log(`Average Confidence: ${metrics.averageConfidence}`);
```

---

## 성능 최적화

### 캐싱

```typescript
// 패턴 정보 캐싱 (추천)
const cache = new Map<string, PatternInfo>();

const getPatternInfoCached = (pattern: string) => {
  if (cache.has(pattern)) {
    return cache.get(pattern);
  }
  const info = engine.getPatternInfo(pattern);
  cache.set(pattern, info);
  return info;
};
```

### 배치 처리

```typescript
// 여러 Intent를 한 번에 처리
const intents = ["배열 합산", "최댓값 찾기", "필터링"];
const matches = intents.map(intent => engine.matchIntent(intent));
```

### 비동기 처리

```typescript
// Promise 사용
const processIntentAsync = async (intent: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(engine.matchIntent(intent));
    }, 0);
  });
};
```

---

## 버전 호환성

| 버전 | 상태 | API |
|------|------|-----|
| v2.0.0 | 베타 | 기본 기능 |
| v2.1.0 | ✅ 정식 | 완전 API |
| v2.2.0 | 계획 | 고급 기능 추가 |

---

## 추가 리소스

- **Getting Started**: [GETTING_STARTED.md](./GETTING_STARTED.md)
- **예제**: [examples/](../examples/)
- **테스트**: [tests/](../tests/)
- **GitHub**: https://gogs.dclub.kr/kim/v2-freelang-ai

---

**마지막 업데이트**: 2026-03-05
**작성**: Claude AI
**라이선스**: MIT
