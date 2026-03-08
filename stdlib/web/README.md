# 🌐 WebResource Module - stdlib/web

**FreeLang v2 웹 리소스 관리 모듈**

HTML/CSS/JavaScript를 통합하여 관리하고 HTTP 응답으로 렌더링하는 모듈입니다.

---

## 📋 개요

```
┌─────────────────────────────────────┐
│  WebResource Module (stdlib/web)    │
│                                      │
│  ✅ HTML 콘텐츠 관리                │
│  ✅ CSS 스타일 통합                 │
│  ✅ JavaScript 코드 포함             │
│  ✅ URL 경로 기반 라우팅            │
│  ✅ HTTP 응답 렌더링                │
│  ✅ TCP 바이트 변환                 │
│                                      │
└─────────────────────────────────────┘
```

---

## 🚀 빠른 시작

### 1. 모듈 임포트

```freelang
import web from "stdlib/web"
```

### 2. WebResource 생성

```freelang
let resource = web.create_resource(
  "<h1>Hello FreeLang</h1>",                    // HTML
  "h1 { color: red; }",                          // CSS
  "console.log('Hello from FreeLang')"           // JavaScript
)
```

### 3. VMWeb 초기화

```freelang
let vm_web = web.init_web()
```

### 4. 리소스 등록

```freelang
web.add_resource(&mut vm_web, "/", resource)
web.add_resource_parts(&mut vm_web, "/about", html, css, js)
```

### 5. 요청 처리

```freelang
let response = web.handle_request(&vm_web, "/")
println(response)
```

---

## 📚 API 문서

### 구조체 (Structs)

#### `WebResource`
```freelang
struct WebResource {
  html: String           // HTML 마크업
  css: String            // CSS 스타일시트
  js: String             // JavaScript 코드
  content_type: String   // MIME 타입 (기본: "text/html")
}
```

#### `VMWeb`
```freelang
struct VMWeb {
  resources: Map<String, WebResource>     // URL → 리소스 맵
  default_resource: WebResource           // 404 기본 리소스
  mime_types: Map<String, String>         // MIME 타입 맵
}
```

---

### 초기화 함수

#### `create_resource(html, css, js) -> WebResource`
새로운 WebResource를 생성합니다.

```freelang
let resource = web.create_resource(
  "<h1>Title</h1>",
  "h1 { color: blue; }",
  "console.log('loaded')"
)
```

#### `create_empty_resource() -> WebResource`
빈 WebResource를 생성합니다.

```freelang
let empty = web.create_empty_resource()
```

#### `init_web() -> VMWeb`
새로운 VMWeb 인스턴스를 초기화합니다.

```freelang
let vm = web.init_web()
```

---

### 리소스 관리

#### `add_resource(vm, path, resource)`
단일 WebResource를 등록합니다.

```freelang
web.add_resource(&mut vm_web, "/", resource)
web.add_resource(&mut vm_web, "/about", about_resource)
```

#### `add_resource_parts(vm, path, html, css, js)`
HTML/CSS/JS를 분리하여 등록합니다.

```freelang
web.add_resource_parts(&mut vm_web, "/contact",
  "<form>...</form>",
  "form { margin: 20px; }",
  "console.log('Form loaded')"
)
```

#### `get_resource(vm, path) -> WebResource`
경로에 해당하는 리소스를 조회합니다.

```freelang
let resource = web.get_resource(&vm_web, "/")
```

#### `has_resource(vm, path) -> bool`
리소스 존재 여부를 확인합니다.

```freelang
if web.has_resource(&vm_web, "/") {
  println("Home page exists")
}
```

#### `remove_resource(vm, path)`
리소스를 삭제합니다.

```freelang
web.remove_resource(&mut vm_web, "/old-page")
```

#### `list_resources(vm) -> Array<String>`
모든 등록된 경로를 조회합니다.

```freelang
let paths = web.list_resources(&vm_web)
// ["/", "/about", "/contact"]
```

---

### HTTP 렌더링

#### `handle_request(vm, path) -> String`
URL 경로에 대한 HTTP 응답을 생성합니다.

```freelang
let response = web.handle_request(&vm_web, "/")
// HTTP/1.1 200 OK\r\n...
// <!DOCTYPE html>...
// <style>...</style>
// <h1>...</h1>
// <script>...</script>
```

#### `render_html(resource) -> String`
WebResource를 HTTP 응답으로 렌더링합니다.

```freelang
let html = web.render_html(resource)
println(html)
```

#### `to_bytes(resource) -> Array<int>`
WebResource를 ASCII 바이트 배열로 변환합니다. (TCP 전송용)

```freelang
let bytes = web.to_bytes(resource)
// TCP 소켓으로 전송
vm_net.send_socket(&mut vmnet, sock_id, bytes)
```

---

### 유틸리티 함수

#### `normalize_path(path) -> String`
경로를 정규화합니다.

```freelang
let normalized = web.normalize_path("/about?id=1")
// "/about"
```

#### `create_element(tag, content, attrs) -> String`
HTML 엘리먼트를 생성합니다.

```freelang
let button = web.create_element("button", "Click me", "class='btn'")
// <button class='btn'>Click me</button>
```

#### `create_table(headers, rows) -> String`
HTML 테이블을 생성합니다.

```freelang
let headers = ["이름", "나이", "직책"]
let rows = [
  ["Alice", "30", "개발자"],
  ["Bob", "28", "디자이너"]
]
let table = web.create_table(headers, rows)
```

#### `get_default_css(style_name) -> String`
기본 CSS 스타일을 가져옵니다.

| style_name | 설명 |
|-----------|------|
| "default" | 기본 스타일 |
| "dark" | 다크 테마 |
| "light" | 라이트 테마 |

```freelang
let css = web.get_default_css("dark")
```

#### `get_status(vm) -> String`
VMWeb의 상태 정보를 조회합니다.

```freelang
let status = web.get_status(&vm_web)
println(status)
// VMWeb Status:
// - Total Resources: 3
// - Registered Paths:
//   - /
//   - /about
//   - /contact
```

---

### 고급 기능

#### `add_resources_batch(vm, resources_map)`
여러 리소스를 한 번에 등록합니다.

```freelang
let resources = Map<String, Map<String, String>>()
resources["/"] = {
  "html": "<h1>Home</h1>",
  "css": "h1 { color: blue; }",
  "js": "console.log('home')"
}
resources["/about"] = {
  "html": "<h1>About</h1>",
  "css": "h1 { color: green; }",
  "js": "console.log('about')"
}

web.add_resources_batch(&mut vm_web, resources)
```

#### `set_spa_mode(vm, resource)`
SPA (Single Page Application) 모드를 활성화합니다.

```freelang
let spa_resource = web.create_resource(
  "<div id='app'></div>",
  "body { margin: 0; }",
  "console.log('SPA mode')"
)
web.set_spa_mode(&mut vm_web, spa_resource)
```

---

## 💡 실제 사용 예제

### HTTP 서버와 통합

```freelang
import web from "stdlib/web"
import "stdlib/net"  // TCP 소켓 통신

fn main() {
  // 1. WebResource 설정
  let vm_web = web.init_web()
  web.add_resource_parts(&mut vm_web, "/",
    "<h1>FreeLang Web Server</h1>",
    "h1 { color: #2196F3; }",
    "alert('Welcome to FreeLang')"
  )

  // 2. HTTP 서버 루프
  let port = 8080
  let sock_id = vm_net.create_socket(&mut vmnet, "0.0.0.0", port)
  vm_net.connect_socket(&mut vmnet, sock_id)

  println("HTTP Server listening on port: " + port)

  while true {
    let req = vm_net.receive_socket(&vmnet, sock_id)
    if req.length == 0 { continue }

    // URL 파싱 (간단한 예)
    let path = "/"

    // 응답 생성
    let response = web.handle_request(&vm_web, path)
    let bytes = web.to_bytes(response)

    // 클라이언트에 전송
    vm_net.send_socket(&mut vmnet, sock_id, bytes)
  }
}
```

### 동적 테이블 생성

```freelang
import web from "stdlib/web"

fn main() {
  // 데이터베이스에서 가져온 데이터
  let headers = ["ID", "이름", "상태"]
  let rows = [
    ["1", "Alice", "Active"],
    ["2", "Bob", "Inactive"],
    ["3", "Charlie", "Active"]
  ]

  // HTML 테이블 생성
  let table = web.create_table(headers, rows)

  // 페이지 생성
  let html = "<h1>사용자 목록</h1>" + table
  let resource = web.create_resource(
    html,
    web.get_default_css("light"),
    "console.log('User table loaded')"
  )

  // 서버에 등록
  let vm_web = web.init_web()
  web.add_resource(&mut vm_web, "/users", resource)
}
```

---

## 🔄 HTTP 응답 구조

`handle_request()` 함수는 다음과 같은 형식의 HTTP 응답을 생성합니다:

```
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Connection: close

<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    /* CSS 여기에 */
  </style>
</head>
<body>
  <!-- HTML 콘텐츠 여기에 -->

  <script>
    // JavaScript 코드 여기에
  </script>
</body>
</html>
```

---

## 📊 MIME 타입 지원

기본으로 다음 MIME 타입을 지원합니다:

| 확장자 | MIME 타입 |
|--------|----------|
| .html | text/html |
| .css | text/css |
| .js | text/javascript |
| .json | application/json |
| .txt | text/plain |
| .xml | application/xml |
| .png | image/png |
| .jpg | image/jpeg |
| .gif | image/gif |
| .svg | image/svg+xml |

---

## ✨ 특징

✅ **모듈식 설계**: 독립적인 웹 리소스 관리
✅ **HTML/CSS/JS 통합**: 한 번에 전체 페이지 렌더링
✅ **URL 라우팅**: 경로별 리소스 관리
✅ **HTTP 응답 생성**: 표준 HTTP 형식
✅ **바이트 변환**: TCP 소켓으로 직접 전송 가능
✅ **유틸리티 함수**: 테이블, 엘리먼트 생성 헬퍼
✅ **SPA 지원**: Single Page Application 모드
✅ **테마 지원**: Default/Dark/Light CSS 제공

---

## 🚧 향후 기능

- [ ] 파일 기반 리소스 로딩 (`.html`, `.css`, `.js` 파일)
- [ ] 템플릿 엔진 (변수 치환, 루프)
- [ ] JSON API 응답
- [ ] 정적 파일 서빙 (이미지, 폰트)
- [ ] 압축 (gzip)
- [ ] 캐싱 (ETag, Last-Modified)
- [ ] 보안 (CSP, CORS 헤더)

---

## 📄 라이선스

MIT

---

**작성자**: Claude AI
**버전**: 1.0.0
**상태**: Production Ready ✅
