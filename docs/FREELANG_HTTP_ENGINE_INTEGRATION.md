# 🌐 FreeLang HTTP Engine 통합 가이드

**목표**: FreeLang HTTP Engine (TCP/HTTP)을 freelang-hybrid와 통합하여 완전한 독립 실행 웹 서버 구현

---

## 📋 아키텍처

### Layer 1: HTTP Engine (TCP + HTTP Parser)
```
TCP Socket Layer
    ↓
HTTP/1.1 Parser (요청 파싱)
    ↓
Request Handler (라우팅)
    ↓
HTTP Response Builder
    ↓
TCP Socket Layer (응답 전송)
```

### Layer 2: Business Logic (freelang-hybrid)
```
State Management (Counter, Todo, Blog)
    ↓
Storage (JSON DB)
    ↓
Router (REST API)
    ↓
HTTP Engine (응답 직렬화)
```

---

## 🏗️ 파일 구조

### freelang-hybrid (현재)
```
freelang-hybrid/
├── freelang/
│   ├── main.free                      (진입점)
│   ├── core/
│   │   ├── state.free                 (상태 관리)
│   │   └── types.free                 (타입 정의)
│   └── server/
│       ├── http-server.free           (기존 HTTP 서버)
│       ├── http-engine.free           (새 HTTP 엔진 통합)
│       └── router.free                (라우팅)
└── docs/
    └── FREELANG_HTTP_ENGINE_INTEGRATION.md
```

### freelang-http-engine (별도)
```
freelang-http-engine/
├── src/
│   ├── tcp_socket.fl                  (TCP 관리)
│   ├── http_parser.fl                 (요청 파싱)
│   ├── http_handler.fl                (응답 생성)
│   ├── server.fl                      (서버 루프)
│   └── mod.fl                         (공개 API)
└── tests/
    ├── test_tcp_socket.fl
    ├── test_http_parser.fl
    └── benchmark.fl
```

---

## 🔄 통합 프로세스

### Step 1: 모듈 추출

`freelang-http-engine/src/*.fl` → `freelang-hybrid/freelang/engine/`

```bash
cp freelang-http-engine/src/tcp_socket.fl freelang-hybrid/freelang/engine/
cp freelang-http-engine/src/http_parser.fl freelang-hybrid/freelang/engine/
cp freelang-http-engine/src/http_handler.fl freelang-hybrid/freelang/engine/
cp freelang-http-engine/src/server.fl freelang-hybrid/freelang/engine/
cp freelang-http-engine/src/mod.fl freelang-hybrid/freelang/engine/
```

### Step 2: main.free 업데이트

```freelang
use "engine/server"
use "server/http-engine"

func main() {
  println("🚀 FreeLang Standalone Web Server (HTTP Engine)")

  loadFromDatabase()

  // HTTP Engine 시작
  match http_server_main("0.0.0.0", 5020, handleEngineRequest)
    Ok(_) => println("✅ 서버 정상 종료")
    Err(e) => println("❌ 서버 에러: \(e)")
  end
}

main()
```

### Step 3: 요청 핸들러 연결

```freelang
// freelang/server/http-engine.free
func handleEngineRequest(request: EngineRequest) -> EngineResponse {
  // 1. 요청 파싱
  let method = request.method
  let path = request.path

  // 2. 라우팅
  match (method, path) {
    ("GET", "/api/counter") => {
      let counter = getCounter()  // state.free에서
      return buildEngineResponse(200, headers, jsonBody)
    }
    ...
  }
}
```

---

## 📊 데이터 흐름

### 요청 경로
```
TCP Socket (읽기)
    ↓ (raw bytes)
HTTP Parser
    ↓ (parsed request)
handleEngineRequest()
    ↓
getCounter() / incrementCounter() (state.free)
    ↓
buildEngineResponse()
    ↓
serializeEngineResponse()
    ↓
TCP Socket (쓰기)
```

### 응답 예시
```
Request:
  GET /api/counter HTTP/1.1
  Host: localhost:5020

Response:
  HTTP/1.1 200 OK
  Content-Type: application/json
  Content-Length: 47

  {"status":"success","data":{"count":5}}
```

---

## 🎯 마이그레이션 체크리스트

- [ ] freelang-http-engine/src/*.fl 복사
- [ ] tcp_socket.fl 통합 (기본 제공 함수 확인)
- [ ] http_parser.fl 통합 (문법 호환성 확인)
- [ ] http_handler.fl 통합
- [ ] server.fl 통합
- [ ] main.free 업데이트
- [ ] http-engine.free 라우터 구현
- [ ] 테스트: curl http://localhost:5020/api/health
- [ ] 테스트: curl -X POST http://localhost:5020/api/counter/increment
- [ ] deploy.sh 검증
- [ ] GOGS 커밋

---

## 🔧 호환성 확인

### FreeLang 문법 호환성
```freelang
// http_parser.fl (체크 필요)
match parse_request(raw_bytes)
  Ok(request) => { ... }
  Err(e) => { ... }
end

// http_engine.free (통합)
match (method, path)
  ("GET", "/api/counter") => { ... }
  default => { ... }
end
```

### 기본 제공 함수
```freelang
// TCP Socket 함수 (커널 제공)
socket_create()      // OK
socket_bind()        // OK
socket_listen()      // OK
socket_accept()      // OK
socket_read()        // OK
socket_write()       // OK
socket_close()       // OK

// 문자열 함수
length()             // len()로 확인
substring_safe()     // 필요시 구현
starts_with()        // 필요시 구현
to_lower()           // 필요시 구현
```

---

## 📈 성능 개선

### Keep-Alive 지원
```freelang
// server.fl에서 구현됨
let keep_alive = true
while keep_alive && request_count < 100
  handle_request()
  keep_alive = check_connection_header()
end
```

### 멀티플렉싱 (선택)
```freelang
// 현재: 순차 처리
handle_client_connection(client_fd)

// 향후: 비동기 처리
async_handle(client_fd)
```

---

## 🧪 테스트 계획

### Unit Tests
```bash
# TCP Socket 테스트
freelang test tests/test_tcp_socket.fl

# HTTP Parser 테스트
freelang test tests/test_http_parser.fl

# 통합 테스트
freelang test tests/test_integration.fl
```

### Integration Tests
```bash
# Counter API
curl http://localhost:5020/api/counter
curl -X POST http://localhost:5020/api/counter/increment

# Health Check
curl http://localhost:5020/api/health

# Keep-Alive
curl -v http://localhost:5020/api/counter
```

### 성능 벤치마크
```bash
# Throughput
wrk -t4 -c100 -d30s http://localhost:5020/api/health

# Latency
ab -n 1000 -c 10 http://localhost:5020/api/counter
```

---

## 🚀 배포 후

### 확인 사항
```bash
# 서버 시작
./deploy.sh user@server.com native 5020

# API 테스트
curl http://server:5020/api/health

# Counter 동작
curl http://server:5020/api/counter
curl -X POST http://server:5020/api/counter/increment

# 블로그 조회
curl http://server:5020/blog.html
```

---

## 📚 참고 자료

- [freelang-http-engine](https://gogs.dclub.kr/kim/freelang-http-engine.git)
- [HTTP/1.1 RFC 7230](https://tools.ietf.org/html/rfc7230)
- [TCP Socket Programming](https://en.wikipedia.org/wiki/Network_socket#Socket_addresses)

---

**목표**: 단일 FreeLang 바이너리로 완전한 HTTP 웹 서버 구현 ✅
