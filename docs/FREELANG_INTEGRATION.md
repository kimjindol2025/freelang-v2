## 📊 FreeLang + JavaScript 통합 구조

### 3가지 통합 방식

```
┌─────────────────────────────────────────────────────────────────┐
│                     브라우저 (HTML + JS)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  index.html (임베드)                                            │
│  ├─ <div id="counter">0</div>  (상태 표시)                     │
│  ├─ <button id="btn-increment"> (UI 요소)                     │
│  └─ <script src="main.js">                                     │
│                                                                 │
│  main.js (임베드)                                              │
│  ├─ 이벤트 리스너: btn.click → API 호출                        │
│  ├─ 상태 동기화: response.data → DOM                           │
│  └─ 통신: window.freelang.counter.increment()                 │
│                                                                 │
│  freelang-bridge.js (임베드)                                  │
│  └─ window.freelang 객체: API 클라이언트                       │
│                                                                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP/JSON
                          │ (Fetch API)
          ┌───────────────▼───────────────┐
          │  POST /api/counter/increment │
          │  ← {count: 3}                │
          └───────────────┬───────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                   FreeLang Server (로컬/바이너리)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  HTTP 서버 (http-server.free)                                  │
│  ├─ 포트 3000 바인드                                            │
│  ├─ 요청 파싱: method, path, headers, body                    │
│  └─ 정적 파일 서빙: HTML/CSS/JS 임베드                        │
│                                                                 │
│  라우터 (router.free)                                          │
│  ├─ Counter API                                                │
│  │  ├─ GET /api/counter → getCounter()                        │
│  │  ├─ POST /api/counter/increment → incrementCounter()       │
│  │  ├─ POST /api/counter/decrement → decrementCounter()       │
│  │  └─ POST /api/counter/reset → resetCounter()               │
│  ├─ Todo API                                                   │
│  │  ├─ GET /api/todos → getTodos()                            │
│  │  ├─ POST /api/todos → addTodo()                            │
│  │  ├─ PUT /api/todos/:id → updateTodo()                      │
│  │  └─ DELETE /api/todos/:id → deleteTodo()                   │
│  └─ Health: GET /api/health → getSystemHealth()               │
│                                                                 │
│  상태 관리 (state.free)                                        │
│  ├─ global.counter: {id, count, createdAt, updatedAt}        │
│  ├─ global.todos: [{id, text, done, priority, ...}]          │
│  ├─ global.history: [StateEvent, ...]  (이벤트 로그)           │
│  └─ 함수: increment(), decrement(), addTodo(), ...            │
│                                                                 │
│  타입 정의 (types.free)                                        │
│  ├─ record Counter { ... }                                     │
│  ├─ record Todo { ... }                                        │
│  ├─ record ApiResponse<T> { ... }                              │
│  └─ enum EventType { ... }                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 실행 흐름 (단계별)

#### Step 1: 초기 로드

```
사용자 방문: http://127.0.0.1:3000
       ↓
브라우저: GET / (HTTP 요청)
       ↓
FreeLang HTTP Server 수신
       ↓
라우터: "/" → handleApiRequest()
       ↓
정적 파일: getEmbeddedFile("/index.html")
       ↓
응답: HTML 페이지 (200 OK)
       ↓
브라우저: HTML 파싱 + 초기화
  ├─ DOM 구성
  ├─ freelang-bridge.js 로드
  ├─ main.js 로드
  └─ 이벤트 리스너 등록
       ↓
초기 상태: Counter 표시 (count: 0)
```

#### Step 2: 사용자 상호작용

```
사용자: +1 버튼 클릭
       ↓
JS (main.js):
  ├─ 이벤트 캐치: btn-increment.click()
  ├─ 로딩 상태 표시
  ├─ API 호출: window.freelang.counter.increment()
  └─ 요청: POST /api/counter/increment
       ↓
프리랭 HTTP 서버: 요청 수신 + 파싱
  ├─ method: "POST"
  ├─ path: "/api/counter/increment"
  ├─ headers: {...}
  └─ body: ""
       ↓
라우터 (router.free):
  ├─ 매칭: ("POST", "/api/counter/increment")
  └─ 핸들러 실행
       ↓
상태 변경 (state.free):
  ├─ incrementCounter() 호출
  ├─ global.counter.count += 1  (0 → 1)
  ├─ global.counter.updatedAt = now()
  ├─ recordEvent(COUNTER_INCREMENTED, {...})
  └─ return global.counter
       ↓
응답 생성 (router.free):
  ├─ Status: 200 OK
  ├─ Body: {
  │   "status": "success",
  │   "statusCode": 200,
  │   "data": {
  │     "id": "main",
  │     "count": 1,
  │     "name": "Main Counter",
  │     "createdAt": "...",
  │     "updatedAt": "..."
  │   }
  │ }
  └─ 발송
       ↓
JS (main.js): 응답 수신
  ├─ JSON 파싱
  ├─ result.data.count === 1 확인
  ├─ DOM 업데이트: document.getElementById('counter').innerText = 1
  ├─ 통계 갱신: requests++, status = "증가됨"
  └─ 로딩 상태 제거
       ↓
브라우저 화면: "1" 표시 ✅
```

---

### 파일 흐름도

```
사용자 입력
   │
   ▼
┌─────────────────┐
│ main.js        │ (브라우저)
│ ├─ click 처리   │
│ └─ API 호출     │
└────────┬────────┘
         │ Fetch API
         │ POST /api/counter/...
         ▼
┌──────────────────────┐
│ freelang-bridge.js   │ (브라우저)
│ ├─ 요청 생성          │
│ └─ fetch(...).send() │
└────────┬─────────────┘
         │ HTTP JSON
         │
         ▼
┌──────────────────────────┐
│ http-server.free         │ (FreeLang)
│ ├─ parseHttpRequest()    │
│ └─ handleRequest()       │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ router.free              │ (FreeLang)
│ ├─ routeRequest()        │
│ └─ routeCounter()        │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ state.free               │ (FreeLang)
│ ├─ incrementCounter()    │
│ ├─ global.counter 변경   │
│ └─ recordEvent()         │
└────────┬─────────────────┘
         │ HttpResponse
         ├─ status: 200
         ├─ headers: {...}
         └─ body: JSON
         ▼
┌──────────────────────────┐
│ http-server.free         │ (FreeLang)
│ └─ buildHttpResponse()   │
└────────┬─────────────────┘
         │ HTTP 응답
         │ {status: "success", data: {...}}
         ▼
┌──────────────────────────┐
│ freelang-bridge.js       │ (브라우저)
│ └─ fetch 응답 처리       │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ main.js                  │ (브라우저)
│ ├─ updateCounter(1)      │
│ └─ DOM 업데이트          │
└────────┬─────────────────┘
         │
         ▼
     화면 갱신 ✅
```

---

### 타입 흐름

```
types.free (공유)
  ├─ record Counter {
  │    id: string
  │    count: number
  │    name: string
  │    createdAt: timestamp
  │    updatedAt: timestamp
  │  }
  ├─ record Todo { ... }
  ├─ record ApiResponse<T> { ... }
  └─ enum EventType { ... }
        ▲
        │ use "..shared/types"
        │
┌───────┴──────────────────────────┐
│                                  │
state.free (FreeLang)         main.js (JavaScript)
├─ incrementCounter() → Counter
├─ getTodos() → array<Todo>
└─ getSystemHealth() → SystemHealth
        │                    │
        │                    │ JSON 응답
        │                    ▼
        │           JSON 파싱
        │           result.data
        │
        └────────────────────────────→
             API 응답 매칭
```

---

### 통신 프로토콜

#### HTTP Request (브라우저 → FreeLang)

```
POST /api/counter/increment HTTP/1.1
Host: 127.0.0.1:3000
Content-Type: application/json
Content-Length: 0

(빈 바디)
```

#### HTTP Response (FreeLang → 브라우저)

```
HTTP/1.1 200 OK
Server: FreeLang/1.0
Connection: close
Content-Type: application/json
Access-Control-Allow-Origin: *
Content-Length: 142

{
  "status": "success",
  "statusCode": 200,
  "data": {
    "id": "main",
    "count": 1,
    "name": "Main Counter",
    "createdAt": "2026-03-12T00:00:00Z",
    "updatedAt": "2026-03-12T00:00:05Z"
  }
}
```

---

### 에러 흐름

```
사용자 요청
   ↓
API 호출
   ↓
FreeLang: 처리 시도
   ├─ 성공 → 200 + JSON
   │
   └─ 실패
      ├─ 400: Bad Request (잘못된 입력)
      ├─ 404: Not Found (엔드포인트 없음)
      └─ 500: Internal Server Error
         ↓
      응답: {
        "status": "error",
        "statusCode": 400,
        "code": "INVALID_INPUT",
        "message": "..."
      }
   ↓
JS: 에러 처리
   ├─ if (result.status === 'error')
   ├─ alert(result.message)
   └─ UI 복구
```

---

### 확장 연결 (향후)

```
현재:
  브라우저 ←→ FreeLang 메모리 상태

향후 1: 데이터베이스
  브라우저 ←→ FreeLang ←→ SQLite/PostgreSQL

향후 2: WebSocket
  브라우저 ←→ FreeLang WebSocket
         (양방향 실시간)

향후 3: 다중 서버
  브라우저 ←→ 로드밸런서 ←→ FreeLang 1
                       ├→ FreeLang 2
                       └→ FreeLang 3

향후 4: 분산 상태
  브라우저 ←→ FreeLang 1 ←→ Redis 공유 상태
         ↓
       FreeLang 2
```

---

## 핵심 요소

### 1. 타입 안정성

```freeLang
// state.free
func incrementCounter() -> Counter {
  // 입력 없음 (전역 상태 직접 수정)
  // 출력: Counter 타입 (명확함)
  // 컴파일 시 타입 체크
}
```

### 2. 단방향 데이터 흐름

```
브라우저 (UI 계층)
  ↓ 이벤트
FreeLang (로직 계층)
  ↓ 상태 변경
FreeLang 메모리
  ↓ 응답
브라우저 (UI 업데이트)
```

### 3. 느슨한 결합

- HTML: 순수 마크업 (로직 없음)
- JS: DOM 조작 + API 호출만 (비즈니스 로직 없음)
- FreeLang: 모든 로직 (상태, 검증, 계산)

### 4. 높은 응집도

- 모든 상태: FreeLang 중앙 관리
- 모든 API: 하나의 라우터
- 모든 타입: 하나의 types.free

---

## 성능 특성

| 지표 | 브라우저 | FreeLang | 합계 |
|------|---------|----------|------|
| 요청 생성 | 1ms | - | 1ms |
| 네트워크 | - | - | 1ms |
| 파싱 | - | 0.1ms | 0.1ms |
| 라우팅 | - | 0.05ms | 0.05ms |
| 비즈니스 로직 | - | 0.1ms | 0.1ms |
| JSON 응답 생성 | - | 0.2ms | 0.2ms |
| 브라우저 처리 | 1ms | - | 1ms |
| **합계** | **2ms** | **0.45ms** | **~4ms** |

---

**생성**: 2026-03-12
**상태**: ✅ 완료
**용도**: FreeLang + JavaScript 통합 명세서
