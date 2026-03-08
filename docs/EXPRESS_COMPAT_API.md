# Express-Compatible HTTP Framework for FreeLang

**목표**: Express.js의 직관적인 API를 FreeLang에서 제공하여 웹 서버 개발을 단순화

**현황**: ✅ Phase A 완성 (v1.0)

---

## 📖 소개

FreeLang의 Express-Compatible Framework는 Express.js의 강력한 API를 FreeLang으로 포팅한 웹 프레임워크입니다.

### 특징
- ✅ 직관적인 라우팅 (GET, POST, PUT, DELETE)
- ✅ 미들웨어 지원
- ✅ 경로 파라미터 (`:id` 문법)
- ✅ JSON 요청/응답 처리
- ✅ 쿼리 파라미터 및 헤더 접근
- ✅ 메서드 체인 지원

---

## 🚀 빠른 시작

```freelang
import { createApp, get, post, listen } from "./stdlib/express-compat"

// 앱 생성
let app = createApp()

// 라우트 정의
get(app, "/", fn(req, res) {
  respondJson(res, { message: "Hello World" })
})

post(app, "/users", fn(req, res) {
  let data = parseJson(req)
  respondJson(res, { userId: 1, name: data.name })
})

// 서버 시작
listen(app, 3000)
```

---

## 📝 Core API

### 1. 애플리케이션 생성

#### `createApp() -> App`

새로운 Express 애플리케이션 인스턴스를 생성합니다.

```freelang
let app = createApp()
// app.routes: []
// app.middlewares: []
// app.port: 0
// app.isListening: false
```

---

### 2. 라우팅

#### `get(app, path, handler) -> App`

GET 요청을 처리합니다. 메서드 체인 지원.

```freelang
get(app, "/users", fn(req, res) {
  respondJson(res, { users: [] })
})
```

#### `post(app, path, handler) -> App`

POST 요청을 처리합니다.

```freelang
post(app, "/users", fn(req, res) {
  let body = parseJson(req)
  respondJson(res, { id: 1, ...body })
})
```

#### `put(app, path, handler) -> App`

PUT 요청을 처리합니다.

```freelang
put(app, "/users/:id", fn(req, res) {
  let id = getParam(req, "id")
  respondJson(res, { updated: id })
})
```

#### `delete(app, path, handler) -> App`

DELETE 요청을 처리합니다.

```freelang
delete(app, "/users/:id", fn(req, res) {
  let id = getParam(req, "id")
  respondJson(res, { deleted: id })
})
```

#### `on(app, method, path, handler) -> App`

임의의 HTTP 메서드를 처리합니다.

```freelang
on(app, "PATCH", "/users/:id", fn(req, res) {
  // ...
})
```

#### 경로 파라미터

경로에 `:param` 문법으로 파라미터를 정의합니다.

```freelang
get(app, "/users/:userId/posts/:postId", fn(req, res) {
  let userId = getParam(req, "userId")      // "123"
  let postId = getParam(req, "postId")      // "456"
  respondJson(res, { userId, postId })
})

// GET /users/123/posts/456 → { userId: "123", postId: "456" }
```

---

### 3. Request 객체

#### 구조

```freelang
struct Request {
  method: string,        // "GET", "POST", "PUT", "DELETE"
  path: string,          // "/api/users"
  url: string,           // "/api/users?id=1"
  query: map,            // { "id": "1" }
  params: map,           // { "userId": "123" } from /users/:userId
  headers: map,          // { "content-type": "application/json" }
  body: string,          // Raw request body
  parsedBody: any,       // Parsed JSON body
  cookies: map,          // { "sessionId": "abc123" }
  ip: string,            // "192.168.1.100"
  userAgent: string      // "Mozilla/5.0..."
}
```

#### 메서드

##### `parseJson(req) -> any`

요청 본문을 JSON으로 파싱합니다.

```freelang
post(app, "/users", fn(req, res) {
  let body = parseJson(req)  // { name: "Alice", email: "alice@example.com" }
  respondJson(res, { created: body })
})
```

##### `getQuery(req, key) -> string`

쿼리 파라미터를 가져옵니다.

```freelang
get(app, "/search", fn(req, res) {
  let q = getQuery(req, "q")           // "freelang"
  let limit = getQuery(req, "limit")   // "10"
  respondJson(res, { query: q, limit: limit })
})

// GET /search?q=freelang&limit=10
```

##### `getParam(req, key) -> string`

경로 파라미터를 가져옵니다.

```freelang
get(app, "/users/:id", fn(req, res) {
  let id = getParam(req, "id")  // "123"
  respondJson(res, { userId: id })
})
```

##### `getHeader(req, key) -> string`

헤더를 가져옵니다. (대소문자 무시)

```freelang
post(app, "/api/data", fn(req, res) {
  let contentType = getHeader(req, "Content-Type")
  let auth = getHeader(req, "Authorization")
  respondJson(res, { contentType, auth })
})
```

##### `getCookie(req, name) -> string`

쿠키를 가져옵니다.

```freelang
get(app, "/", fn(req, res) {
  let sessionId = getCookie(req, "sessionId")
  respondJson(res, { sessionId })
})
```

---

### 4. Response 객체 & 메서드

#### 구조

```freelang
struct Response {
  status: int,              // HTTP 상태 코드 (200, 404, 500 등)
  headers: map,             // HTTP 헤더
  body: string,             // 응답 본문
  jsonData: any,            // JSON 데이터 (자동 직렬화)
  isSent: bool              // 응답 전송 완료 여부
}
```

#### 상태 코드 설정

##### `setStatus(res, code) -> Response`

HTTP 상태 코드를 설정합니다. (체인 가능)

```freelang
post(app, "/users", fn(req, res) {
  setStatus(res, 201)
  respondJson(res, { message: "Created" })
})
```

#### 응답 전송

##### `respondJson(res, data) -> Response`

JSON 응답을 전송합니다.

```freelang
get(app, "/api/users", fn(req, res) {
  respondJson(res, {
    success: true,
    data: [{ id: 1, name: "Alice" }]
  })
})

// Content-Type: application/json
// Body: {"success":true,"data":[{"id":1,"name":"Alice"}]}
```

##### `respondText(res, text) -> Response`

텍스트 응답을 전송합니다.

```freelang
get(app, "/plain", fn(req, res) {
  respondText(res, "Hello World")
})

// Content-Type: text/plain
// Body: Hello World
```

##### `respondHtml(res, html) -> Response`

HTML 응답을 전송합니다.

```freelang
get(app, "/", fn(req, res) {
  respondHtml(res, "<h1>Welcome</h1>")
})

// Content-Type: text/html
// Body: <h1>Welcome</h1>
```

##### `redirect(res, url) -> Response`

리다이렉트를 수행합니다.

```freelang
get(app, "/old-path", fn(req, res) {
  redirect(res, "/new-path")
})

// Status: 302
// Location: /new-path
```

##### `sendFile(res, filePath) -> Response`

파일을 응답으로 전송합니다.

```freelang
get(app, "/download", fn(req, res) {
  sendFile(res, "/path/to/file.pdf")
})
```

##### `send(res, code) -> Response`

상태 코드만 전송합니다.

```freelang
get(app, "/", fn(req, res) {
  send(res, 204)  // No Content
})
```

---

### 5. 헤더 및 설정

##### `setHeader(res, key, value) -> Response`

응답 헤더를 설정합니다.

```freelang
get(app, "/api", fn(req, res) {
  setHeader(res, "X-Custom-Header", "value")
  setHeader(res, "Cache-Control", "no-cache")
  respondJson(res, { data: "test" })
})
```

---

### 6. 미들웨어

#### `use(app, middleware) -> App`

미들웨어를 등록합니다. (체인 가능)

```freelang
type Middleware = fn(Request, Response) -> bool
// true = 다음 미들웨어 실행
// false = 요청 처리 중단
```

#### 예제: 로깅 미들웨어

```freelang
fn loggingMiddleware(req, res) {
  println("[LOG]", req.method, req.path)
  return true  // 다음 미들웨어 실행
}

use(app, loggingMiddleware)
get(app, "/api", fn(req, res) {
  respondJson(res, { message: "Hello" })
})

// 출력: [LOG] GET /api
```

#### 예제: 인증 미들웨어

```freelang
fn authMiddleware(req, res) {
  let token = getHeader(req, "Authorization")

  if token == null || token == "" {
    setStatus(res, 401)
    respondJson(res, { error: "Unauthorized" })
    return false  // 요청 처리 중단
  }

  return true  // 다음 미들웨어 실행
}

use(app, authMiddleware)

get(app, "/protected", fn(req, res) {
  respondJson(res, { message: "Access granted" })
})

// Authorization 헤더 없음 → 401 반환
```

#### 예제: CORS 미들웨어

```freelang
fn corsMiddleware(req, res) {
  setHeader(res, "Access-Control-Allow-Origin", "*")
  setHeader(res, "Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")
  setHeader(res, "Access-Control-Allow-Headers", "Content-Type")
  return true
}

use(app, corsMiddleware)
```

---

### 7. 서버 제어

#### `listen(app, port) -> void`

서버를 시작합니다.

```freelang
listen(app, 3000)
// [Express-Compat] Server listening on port 3000
```

#### `close(app) -> void`

서버를 종료합니다.

```freelang
close(app)
// [Express-Compat] Server closed
```

---

## 📚 고급 예제

### REST API 서버

```freelang
import { createApp, get, post, put, delete, listen } from "./stdlib/express-compat"

let app = createApp()

// 메모리 DB
let todos = [
  { id: 1, title: "Learn FreeLang", completed: false },
  { id: 2, title: "Build API", completed: false }
]
let nextId = 3

// GET /todos - 모든 TODO 조회
get(app, "/todos", fn(req, res) {
  respondJson(res, todos)
})

// GET /todos/:id - 특정 TODO 조회
get(app, "/todos/:id", fn(req, res) {
  let id = int(getParam(req, "id"))
  let i = 0
  while i < arr.length(todos) {
    if todos[i].id == id {
      respondJson(res, todos[i])
      return
    }
    i = i + 1
  }
  setStatus(res, 404)
  respondJson(res, { error: "Not found" })
})

// POST /todos - 새 TODO 생성
post(app, "/todos", fn(req, res) {
  let body = parseJson(req)
  let todo = { id: nextId, title: body.title, completed: false }
  arr.push(todos, todo)
  nextId = nextId + 1
  setStatus(res, 201)
  respondJson(res, todo)
})

// PUT /todos/:id - TODO 수정
put(app, "/todos/:id", fn(req, res) {
  let id = int(getParam(req, "id"))
  let body = parseJson(req)
  let i = 0
  while i < arr.length(todos) {
    if todos[i].id == id {
      todos[i].title = body.title
      todos[i].completed = body.completed
      respondJson(res, todos[i])
      return
    }
    i = i + 1
  }
  setStatus(res, 404)
  respondJson(res, { error: "Not found" })
})

// DELETE /todos/:id - TODO 삭제
delete(app, "/todos/:id", fn(req, res) {
  let id = int(getParam(req, "id"))
  // 실제 구현에서는 배열에서 삭제
  setStatus(res, 204)
  respondJson(res, { message: "Deleted" })
})

listen(app, 3000)
```

### 미들웨어 조합

```freelang
// 로깅
fn logger(req, res) {
  println("[" + req.method + "]", req.path)
  return true
}

// JSON 파싱
fn jsonParser(req, res) {
  if getHeader(req, "Content-Type") == "application/json" {
    parseJson(req)
  }
  return true
}

// 인증
fn requireAuth(req, res) {
  if getHeader(req, "Authorization") == null {
    setStatus(res, 401)
    respondJson(res, { error: "Unauthorized" })
    return false
  }
  return true
}

use(app, logger)
use(app, jsonParser)
use(app, requireAuth)

get(app, "/protected", fn(req, res) {
  respondJson(res, { message: "Authenticated" })
})
```

---

## 🔄 메서드 체인

Express-Compatible은 메서드 체인을 지원하여 더 간결한 코드를 작성할 수 있습니다.

```freelang
createApp()
  .get(app, "/", fn(req, res) { respondJson(res, { home: true }) })
  .get(app, "/about", fn(req, res) { respondJson(res, { about: "..." }) })
  .post(app, "/api/data", fn(req, res) { respondJson(res, { created: true }) })
  .listen(app, 3000)
```

---

## 🧪 테스트

단위 테스트 실행:

```bash
cd /home/kimjin/Desktop/kim/v2-freelang-ai
npm run build
node -e "
const { ProgramRunner } = require('./dist/cli/runner');
const r = new ProgramRunner();
const result = r.runFile('./tests/test-express-compat.fl');
console.log(result.output);
"
```

---

## 📊 성능 특성

| 기능 | 성능 |
|------|------|
| 라우팅 | O(n) (라우트 수에 비례) |
| 미들웨어 | O(m) (미들웨어 수에 비례) |
| 경로 파라미터 파싱 | O(p) (파라미터 수에 비례) |

---

## ✅ 구현 완료 사항

- ✅ 기본 라우팅 (GET, POST, PUT, DELETE)
- ✅ 경로 파라미터 지원
- ✅ 미들웨어 시스템
- ✅ JSON 요청/응답
- ✅ 쿼리 파라미터 및 헤더 접근
- ✅ 응답 빌더 패턴
- ✅ 메서드 체인
- ✅ 상태 코드 관리

---

## 🔮 향후 계획 (Phase B-D)

### Phase B: ORM (데이터베이스)
- SQLite/MySQL 쿼리 빌더
- 마이그레이션 시스템
- 관계 관리 (1:1, 1:N, N:N)
- 트랜잭션 지원

### Phase C: 인증
- JWT 토큰 생성/검증
- OAuth2 flow
- 세션 관리

### Phase D: 배포 도구
- PM2 FreeLang 통합
- 자동 재시작 및 모니터링
- GitHub to server 배포

---

## 📞 지원

문제 발생 시:
1. 테스트 코드 실행: `tests/test-express-compat.fl`
2. 로그 확인: `println()` 디버깅
3. 예제 참고: `examples/rest-api-server.fl`

---

**프로젝트**: FreeLang v2
**버전**: 1.0 (Phase A)
**마지막 업데이트**: 2026-03-06
