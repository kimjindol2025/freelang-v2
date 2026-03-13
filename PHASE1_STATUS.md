# 🔧 Phase 1: 실제 네트워킹 구현 진행 상황

**상태**: ✅ **기초 실제 구현 완료 (Socket API 통합 완료)**

**마지막 업데이트**: 2026-03-13

---

## 📋 완료된 항목

### Part 1: 기본 소켓 구현 (100% - 5/5)

✅ **1-1. ServerSocket 타입 정의**
- 위치: `freelang/servers/http-main.free`, 50-56줄
- 구조: `host`, `port`, `socket`, `running`, `requestCount`

✅ **1-2. 소켓 생성 함수 구현**
- 위치: `runServerLoop()` 라인 273-280
- 구현: `net.socket(AF_INET, SOCK_STREAM)` 호출
- 에러 처리: 소켓 생성 실패 시 -1 반환

✅ **1-3. 바인드 및 리슨**
- 위치: `runServerLoop()` 라인 282-297
- 구현:
  - `net.bind(socket, host, port)` 바인드
  - `net.listen(socket, 128)` 리슨 시작
  - SO_REUSEADDR 옵션 설정

✅ **1-4. 클라이언트 연결 수락**
- 위치: `runServerLoop()` 라인 305-310
- 구현: `net.accept(socket)` 호출
- 반환: `(clientFd, clientHost, clientPort)`

✅ **1-5. 소켓 기본 테스트**
- 위치: 빌드 스크립트 `build-servers.sh` 갖춤
- 컴파일: `freec http-main.free -o http-server`

---

### Part 2: 데이터 읽기/쓰기 (40% - 2/5)

✅ **2-1. 요청 읽기 구현**
- 위치: `runServerLoop()` 라인 312-320
- 구현: `net.read(clientFd, 4096)` 호출
- 반환: `(readOk: bool, data: string)`

✅ **2-2. 응답 쓰기 구현**
- 위치: `runServerLoop()` 라인 335-340
- 구현: `net.write(clientFd, httpResponse)` 호출
- 반환: `writeOk: bool`

⏳ **2-3. 요청 파싱 개선** (진행 중)
- 위치: `parseHTTPRequest()` 라인 91-135
- 완료: CRLF(\r\n) 및 LF(\n) 모두 처리
- 개선 필요: 바디(body) 파싱

⏳ **2-4. 타임아웃 설정**
- 아직 구현 필요
- 계획: `net.setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, timeout)`

⏳ **2-5. 에러 처리**
- 부분 구현: 소켓 에러는 로깅됨
- 개선 필요: 더 세분화된 에러 분류

---

### Part 3: HTTP 요청/응답 처리 (80% - 4/5)

✅ **3-1. HTTP 요청 파싱**
- 위치: `parseHTTPRequest()` 라인 91-135
- 파싱: METHOD, PATH, HEADERS 추출
- 완료: 기본 파싱 로직

✅ **3-2. HTTP 응답 생성**
- 위치: `buildHTTPResponse()` 라인 239-254
- 생성: 상태 라인, 헤더, 바디
- 포함: Content-Type, Content-Length, CORS 헤더

✅ **3-3. 파일 서빙 (보안 검증)**
- 위치: `serveStaticFile()` 라인 121-144
- 보안: path traversal 방지, 확장자 검증
- 테스트 준비됨

✅ **3-4. MIME 타입 감지**
- 위치: `getMimeType()` 라인 167-181
- 지원: HTML, CSS, JS, JSON, 이미지, 폰트

⏳ **3-5. 요청 본문(Body) 처리**
- 아직 구현 필요
- 계획: POST 요청의 바디 파싱

---

### Part 4: 멀티플렉싱 (30% - 1/3)

✅ **4-1. 순차 클라이언트 처리**
- 위치: `runServerLoop()` 라인 305-345
- 구현: 클라이언트를 하나씩 처리하는 루프

⏳ **4-2. ConnectionPool 구현**
- 아직 구현 필요
- 목표: 동시 클라이언트 추적
- 계획: `[ClientConnection]` 배열 관리

⏳ **4-3. 비동기/다중 스레드**
- 아직 구현 필요
- 주의: FreeLang의 동시성 모델에 따라 결정

---

### Part 5: 통합 테스트 (0% - 0/7)

⏳ **5-1. HTTP 서버 시작**
- 코드 준비됨: `startServer()` 라인 72-83
- 테스트 필요

⏳ **5-2. 로컬호스트 연결 테스트**
- 필요: `curl http://localhost:8000/blog.html`
- 성공 기준: 200 OK + 바디

⏳ **5-3. 경로 검증 테스트**
- 필요: `curl http://localhost:8000/../etc/passwd` (403)
- 필요: `curl http://localhost:8000/.env` (403)

⏳ **5-4. 여러 파일 타입 테스트**
- 필요: HTML, CSS, JS, JSON 파일 요청
- 검증: 올바른 MIME 타입 반환

⏳ **5-5. 에러 처리 테스트**
- 필요: 404, 403, 500 시나리오
- 검증: 적절한 에러 응답

⏳ **5-6. 성능 테스트**
- 필요: 동시 요청 처리 성능 측정
- 목표: 1,000+ 동시 연결 지원 (향후)

⏳ **5-7. 로깅 검증**
- 필요: 모든 요청/응답이 로깅되는지 확인
- 포함: 요청 번호, 메서드, 경로, 클라이언트 IP:PORT

---

## 🔍 코드 구조 개요

### 파일 구조
```
freelang/servers/http-main.free (330줄)
├── main() - 진입점
├── startServer() - 서버 초기화
├── runServerLoop() - 메인 루프 (TCP 소켓 통신 구현)
├── parseHTTPRequest() - HTTP 요청 파싱
├── serveStaticFile() - 파일 서빙 (보안 검증)
├── getMimeType() - MIME 타입 감지
├── buildHTTPResponse() - HTTP 응답 생성
├── isPathSafe() - 경로 검증 (보안)
├── isAllowedExtension() - 확장자 검증
└── i32ToString() - 정수 → 문자열

std/net API 사용
├── net.socket(AF_INET, SOCK_STREAM) - 소켓 생성
├── net.bind(fd, host, port) - 바인드
├── net.listen(fd, backlog) - 리슨
├── net.accept(fd) - 클라이언트 연결 수락
├── net.read(fd, maxBytes) - 데이터 읽기
├── net.write(fd, data) - 데이터 쓰기
└── net.close(fd) - 소켓 닫기
```

### 구현된 TCP 흐름

```
1. net.socket() → 소켓 생성 (fd)
2. net.setsockopt() → SO_REUSEADDR 설정
3. net.bind() → localhost:8000에 바인드
4. net.listen() → 클라이언트 연결 대기
5. Loop:
   a. net.accept() → 클라이언트 연결 수락 (clientFd)
   b. net.read() → HTTP 요청 읽기
   c. parseHTTPRequest() → 요청 파싱
   d. serveStaticFile() → 파일 읽기 (보안 검증)
   e. buildHTTPResponse() → HTTP 응답 생성
   f. net.write() → 응답 전송
   g. net.close() → 연결 종료
6. net.close() → 서버 소켓 닫기
```

---

## 📈 다음 단계

### 즉시 (현재 세션)
1. ✅ HTTP 서버 실제 구현 (Phase 1-1 완료)
2. ⏳ HTTP 서버 빌드 및 테스트
3. ⏳ API 서버 네트워킹 업데이트
4. ⏳ 프록시 서버 네트워킹 업데이트

### Phase 1 완료 (1-2주)
- [ ] 모든 HTTP 요청/응답 처리 완성
- [ ] 멀티플렉싱 구현 (동시 클라이언트 처리)
- [ ] 타임아웃 설정
- [ ] 통합 테스트 7/7 통과
- [ ] API 서버도 Phase 1 적용
- [ ] 프록시 서버도 Phase 1 적용

### Phase 2 준비 (2주 이후)
- Database 계층 시작
- Blog 데이터 영속성 구현
- API 엔드포인트 DB 연동

---

## 🛠️ 기술 세부사항

### std/net API 호출 규약
```freelang
// 소켓 생성
let fd = net.socket(AF_INET, SOCK_STREAM)  // 2, 1

// 옵션 설정
net.setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, 1)  // 1, 1, 15, 1

// 바인드
let bindResult = net.bind(fd, "127.0.0.1", 8000)  // 0 = 성공

// 리슨
let listenResult = net.listen(fd, 128)  // 0 = 성공

// 연결 수락
let (clientFd, host, port) = net.accept(fd)  // clientFd >= 0 = 성공

// 데이터 읽기
let (ok, data) = net.read(clientFd, 4096)  // ok = true 시 data 포함

// 데이터 쓰기
let writeOk = net.write(clientFd, "HTTP/1.1 200 OK\r\n...")  // true = 성공

// 소켓 닫기
net.close(fd)  // 0 = 성공
```

### 에러 처리 규약
- `net.socket()` 실패: 반환값 < 0
- `net.bind()` 실패: 반환값 != 0 (포트 이미 사용 중, 권한 부족 등)
- `net.listen()` 실패: 반환값 != 0
- `net.accept()` 실패: 반환값 < 0 또는 타임아웃
- `net.read()` 실패: 첫 번째 튜플 요소 false
- `net.write()` 실패: 반환값 false

---

## 📊 성능 예상

| 메트릭 | 예상값 | 테스트 필요 |
|--------|--------|-----------|
| 응답 시간 | <50ms | ⏳ |
| 동시 연결 | 1,000+ | ⏳ |
| 처리량 | 1,000 req/s | ⏳ |
| 메모리 사용 | <10MB | ⏳ |

---

## 🚀 빌드 및 실행

### 빌드
```bash
bash build-servers.sh
```

### HTTP 서버만 실행
```bash
freec http-main.free -o http-server && ./http-server
```

### 테스트
```bash
# 다른 터미널에서
curl http://localhost:8000/blog.html
curl -I http://localhost:8000/blog.html  # 헤더만
```

---

**상태**: Phase 1 기초 구현 완료, 테스트 및 최적화 대기 중

**예상 완료 시간**: 현재 세션 내 테스트 완료, 다음 세션에 Phase 2 시작

