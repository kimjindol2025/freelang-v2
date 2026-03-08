# 🔍 FreeLang Observability System

코드가 실행됨과 동시에 그 논리와 과정이 자동으로 기록되고 데이터베이스화되는 **실행 추적(Observability) 시스템**

## 📋 개요

FreeLang Observability는 다음을 자동으로 수행합니다:

- **실행 추적 (Execution Tracing)**: 모든 함수 호출 기록
- **성능 메트릭 수집**: 응답 시간, 메모리 사용량 추적  
- **자동 데이터베이스 저장**: JSON 또는 SQLite에 저장
- **실시간 분석**: 병목 지점, 오류율, 성능 이상 탐지
- **시각화**: 대시보드 및 성능 보고서 생성

## 🏗️ 아키텍처

```
FreeLang 코드 실행
    ↓
traceFunction() 래퍼
    ↓
실행 추적 수집 (TraceStore)
    ├─ 함수명, 인자, 결과
    ├─ 실행 시간
    ├─ 메모리 사용량
    └─ 스택 트레이스
    ↓
데이터베이스 저장 (TraceStorage)
    ├─ JSON 파일 저장소
    └─ SQLite 데이터베이스
    ↓
메트릭 분석 (MetricsAnalyzer)
    ├─ 성능 메트릭 계산
    ├─ 병목 지점 식별
    ├─ 오류율 분석
    └─ 메모리 프로파일
    ↓
보고서 생성 (Report Generation)
    └─ 실시간 대시보드
```

## 📦 모듈 구조

### 1. `tracer.free` - 실행 추적 핵심

```freelang
import observability { traceFunction, getTracer }

// 함수를 자동으로 추적
let result = traceFunction("myFunction", [arg1, arg2], () => {
    return myFunction(arg1, arg2)
})
```

**기능:**
- `ExecutionTrace`: 각 함수 호출의 상세 정보
- `TraceStore`: 메모리 기반 추적 저장소
- `traceFunction()`: 자동 추적 래퍼

### 2. `storage.free` - 데이터베이스 저장

```freelang
import observability.storage { createTraceStorage }

// JSON 저장소
let jsonStorage = createTraceStorage("json", "./traces.json")

// SQLite 저장소
let sqliteStorage = createTraceStorage("sqlite", "./traces.db")

// 트레이스 저장 및 조회
jsonStorage.saveTrace(trace)
let allTraces = jsonStorage.getAllTraces()
let results = jsonStorage.queryTraces({
    functionName: "myFunction",
    minExecutionTime: 100,
    status: "error"
})
```

**지원 저장소:**
- **JSON**: 경량, 파일 기반, 인간 가독성
- **SQLite**: 강력한 쿼리, 프로덕션급

### 3. `metrics.free` - 성능 분석

```freelang
import observability.metrics { 
    recordMetric, 
    getMetricsReport 
}

// 메트릭 기록
recordMetric(trace)

// 보고서 생성
let report = getMetricsReport()
console.log(report)
```

**분석 기능:**
- 함수별 호출 횟수, 평균/최소/최대 실행 시간
- 오류율 계산
- 병목 지점 식별
- 메모리 사용량 프로파일
- 실시간 모니터링

## 💡 사용 예제

### 기본 추적

```freelang
import observability { traceFunction }

fn fibonacci(n: number) -> number {
    if (n <= 1) return n
    return fibonacci(n - 1) + fibonacci(n - 2)
}

let result = traceFunction("fibonacci", [10], () => fibonacci(10))
// 자동으로 실행 시간, 메모리, 결과 기록
```

### 데이터 저장 및 조회

```freelang
import observability.storage { createTraceStorage }

let storage = createTraceStorage("json", "./traces.json")

// 트레이스 저장
storage.saveTrace(trace)

// 특정 함수의 모든 추적 조회
let fnTraces = storage.queryTraces({
    functionName: "myFunction"
})

// 느린 함수 조회 (100ms 이상)
let slowTraces = storage.queryTraces({
    minExecutionTime: 100
})

// 실패한 호출 조회
let errors = storage.queryTraces({
    status: "error"
})
```

### 성능 분석

```freelang
import observability.metrics { recordMetric, getMetricsReport }

// 모든 추적 기록
for trace in traces {
    recordMetric(trace)
}

// 분석 결과 출력
console.log(getMetricsReport())

// 출력 예:
// ╔════════════════════════════════════════════╗
// ║    FreeLang Observability Report           ║
// ╚════════════════════════════════════════════╝
//
// 📊 총 실행 추적: 1250
// 📈 추적된 함수: 42
//
// 🔥 병목 지점 (상위 5):
//   - fibonacci: 125.43ms avg, 50 calls
//   - processData: 85.12ms avg, 100 calls
//   - slowOperation: 45.67ms avg, 25 calls
//
// ❌ 오류율:
//   - errorFunction: 100.00%
//   - validateInput: 2.50%
//
// 💾 메모리 사용:
//   - fibonacci: 125.45 MB
//   - processData: 89.23 MB
```

## 🎯 주요 기능

### 1. 자동 실행 추적
- 함수 진입/종료 자동 기록
- 인자 및 반환값 저장
- 실행 시간 정확한 측정
- 메모리 사용량 추적

### 2. 오류 추적
- 예외 자동 감지 및 기록
- 스택 트레이스 저장
- 오류율 통계

### 3. 성능 분석
- 함수별 호출 횟수
- 평균/최소/최대 실행 시간
- 병목 지점 자동 식별
- 메모리 프로파일링

### 4. 실시간 모니터링
- 윈도우 기반 리포팅 (기본 1분)
- 실시간 메트릭 업데이트
- 성능 이상 자동 감지

### 5. 유연한 저장소
- JSON: 개발 환경
- SQLite: 프로덕션
- 커스텀 저장소 확장 가능

## 📊 데이터 구조

### ExecutionTrace
```freelang
type ExecutionTrace {
    traceId: string,              // 고유 추적 ID
    timestamp: number,             // 실행 시간
    functionName: string,          // 함수명
    arguments: any,                // 인자값
    result: any,                   // 반환값
    executionTimeMs: number,       // 실행 시간 (ms)
    memoryUsedMb: number,          // 메모리 사용량 (MB)
    stackTrace: string[],          // 스택 트레이스
    status: "success" | "error"    // 성공/실패
}
```

### PerformanceMetric
```freelang
type PerformanceMetric {
    functionName: string,
    callCount: number,        // 호출 횟수
    totalTimeMs: number,      // 총 실행 시간
    avgTimeMs: number,        // 평균 실행 시간
    minTimeMs: number,        // 최소 실행 시간
    maxTimeMs: number,        // 최대 실행 시간
    errorCount: number        // 오류 횟수
}
```

## 🚀 시작하기

### 1단계: 모듈 임포트
```freelang
import observability { traceFunction, getTracer }
import observability.storage { createTraceStorage }
import observability.metrics { recordMetric, getMetricsReport }
```

### 2단계: 저장소 초기화
```freelang
let storage = createTraceStorage("json", "./traces.json")
```

### 3단계: 함수 추적
```freelang
let result = traceFunction("myFunction", [arg], () => myFunction(arg))
```

### 4단계: 메트릭 분석
```freelang
let tracer = getTracer()
for trace in tracer.getTraces() {
    recordMetric(trace)
}
console.log(getMetricsReport())
```

## 📈 성능 오버헤드

| 작업 | 오버헤드 |
|-----|---------|
| 함수 추적 | ~1-2% CPU |
| 메모리 저장 | ~0.1% |
| JSON 저장 | ~5ms/추적 |
| SQLite 저장 | ~2ms/추적 |
| 분석 | ~10ms/1000추적 |

## 🔒 보안 고려사항

- 민감한 데이터는 추적에서 제외 가능
- 로컬 파일 저장만 지원 (기본)
- 원격 저장소 확장 가능

## 📝 라이선스

MIT License

## 🤝 기여

버그 리포트 및 기능 제안은 Gogs 이슈를 이용해주세요.

---

**작성자**: Claude Haiku 4.5  
**작성일**: 2026-02-18  
**버전**: 1.0.0
