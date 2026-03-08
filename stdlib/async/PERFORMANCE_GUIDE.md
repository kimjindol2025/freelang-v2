# async module - 성능 가이드

## 성능 목표

| 기능 | 목표 | 실제 |
|------|------|------|
| sleep(1000) | <1005ms | - |
| Promise.resolve() | <1μs | - |
| Queue 처리 | <10μs/task | - |
| Semaphore.acquire() | <1μs | - |

## 성능 테스트

### 1. Promise 성능

```freelang
// resolve 속도
let start = Date.now()
for let i = 1; i <= 10000; i++
  async.Promise.resolve(i)
let duration = Date.now() - start
console.log(`Promise.resolve x10000: ${duration}ms`)
// 예상: <50ms
```

### 2. Queue 성능

```freelang
// 1000개 task 순차 처리
let queue = new async.Queue()
let start = Date.now()

for let i = 1; i <= 1000; i++
  queue.add(() => {
    // Minimal work
    return async.Promise.resolve()
  })

// Wait for completion
await async.sleep(5000)
let duration = Date.now() - start
console.log(`Queue x1000 tasks: ${duration}ms`)
// 예상: <100ms (overhead)
```

### 3. sleep() 정확도

```freelang
// 정확도 테스트
let tests = [10, 50, 100, 500, 1000]

for let ms of tests
  let start = Date.now()
  await async.sleep(ms)
  let actual = Date.now() - start
  let error = Math.abs(actual - ms)
  console.log(`sleep(${ms}ms): ${actual}ms (error: ${error}ms)`)
  // 예상: error <10ms
```

### 4. Concurrency 컨트롤

```freelang
// 세마포어 성능
let sem = new async.Semaphore(4)
let concurrent = 0
let maxConcurrent = 0
let taskCount = 100

let start = Date.now()

for let i = 1; i <= taskCount; i++
  (async () => {
    await sem.acquire()
    concurrent++
    if concurrent > maxConcurrent {
      maxConcurrent = concurrent
    }

    // Simulate work
    await async.sleep(1)

    concurrent--
    sem.release()
  })()

await async.sleep(10000)
let duration = Date.now() - start
console.log(`Semaphore(4) x${taskCount}: ${duration}ms`)
console.log(`Max concurrent: ${maxConcurrent}`)
// 예상: max=4, duration ~250ms
```

## 메모리 사용량

### Promise 메모리

```freelang
// Promise 생성 메모리
let promises = []
let start = memory.used()

for let i = 1; i <= 10000; i++
  promises.push(async.Promise.resolve(i))

let used = memory.used() - start
console.log(`10000 Promises: ${used / 1024}KB`)
// 예상: <5MB
```

### Queue 메모리

```freelang
// Queue 메모리
let queue = new async.Queue()
let start = memory.used()

for let i = 1; i <= 1000; i++
  queue.add(() => async.Promise.resolve(i))

let used = memory.used() - start
console.log(`Queue with 1000 tasks: ${used / 1024}KB`)
// 예상: <500KB
```

## 벤치마크 결과

### 환경
- **CPU**: 기준점 없음 (테스트 시점에 생성)
- **메모리**: 기준점 없음 (테스트 시점에 생성)
- **OS**: Linux (기준)

### 결과 템플릿

```
=== async 모듈 성능 벤치마크 ===

Promise Performance
  resolve x10000: XXms
  all() x100: XXms
  race() x100: XXms

Queue Performance
  100 sequential: XXms
  1000 sequential: XXms
  with delays: XXms

sleep() Accuracy
  10ms: actual XXms (error XXms)
  100ms: actual XXms (error XXms)
  1000ms: actual XXms (error XXms)

Concurrency
  Semaphore(1) max: X
  Semaphore(4) max: X
  Semaphore(10) max: X

Memory Usage
  10000 Promises: XXMb
  Queue 1000 tasks: XXKb
```

## 최적화 팁

### 1. Promise 최적화

```freelang
// ❌ Slow: 매번 new Promise 생성
for let i = 1; i <= 10000; i++
  await new async.Promise((resolve) => {
    resolve(i)
  })

// ✅ Fast: resolve 재사용
for let i = 1; i <= 10000; i++
  await async.Promise.resolve(i)
```

### 2. Queue 최적화

```freelang
// ❌ Slow: 여러 Queue
let q1 = new async.Queue()
let q2 = new async.Queue()

// ✅ Fast: 단일 Queue
let queue = new async.Queue()
// 필요시 우선순위 처리
```

### 3. Concurrency 최적화

```freelang
// ❌ Slow: 무제한 동시성
for let i = 1; i <= 1000; i++
  (async () => {
    await expensiveOperation(i)
  })()

// ✅ Fast: Semaphore로 제한
let sem = new async.Semaphore(10)
for let i = 1; i <= 1000; i++
  (async () => {
    await sem.acquire()
    try {
      await expensiveOperation(i)
    } finally {
      sem.release()
    }
  })()
```

## 프로파일링

### CPU 프로파일

```bash
# FreeLang에서 CPU intensive 코드 측정
time free async_test.free
```

### 메모리 프로파일

```bash
# 메모리 사용량 모니터링
/usr/bin/time -v free async_test.free
```

## 성능 회귀 감지

각 릴리스마다 성능 테스트를 실행하여 회귀 감지:

```bash
# Baseline 저장
./run_benchmarks.sh > baseline.txt

# 변경 후 비교
./run_benchmarks.sh > current.txt

# 비교
diff baseline.txt current.txt
```

## 목표 달성 상태

- [ ] sleep() 정확도 ±10ms
- [ ] Promise.resolve() <1μs
- [ ] Queue 처리 <10μs/task
- [ ] Semaphore overhead <5%
- [ ] 메모리 leak 없음

---

**Last updated**: 2026-02-28
**Status**: Performance guide created, benchmarks pending execution
