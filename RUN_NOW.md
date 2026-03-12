# 🚀 FreeLang 서버 실행하기

## ✅ 현재 상태

모든 파일이 준비되어 있습니다:

```
총 2,400줄 FreeLang 코드
├── Core System: 465줄 (types, state, storage)
├── HTTP Engine: 1,309줄 (socket, parser, handler, server)
├── HTTP API: 340줄 (request routing)
├── 데이터: 71줄 (3개 샘플 블로그)
└── 문서 & 테스트: 215줄
```

## 🎯 실행 방법

### 1️⃣ 자동 설정 & 실행

```bash
bash setup-freelang.sh --start
```

**이 스크립트가 하는 일**:
1. ✅ FreeLang 컴파일러 확인
2. ✅ 프로젝트 파일 검증 (8개 필수 파일)
3. ✅ 서버 컴파일 (`bin/freelang-server` 생성)
4. ✅ 서버 자동 시작 (포트 5020)

### 2️⃣ 수동 실행 (이미 컴파일된 경우)

```bash
./bin/freelang-server
```

### 3️⃣ 직접 컴파일 & 실행

```bash
# 컴파일
freelang compile freelang/main.free -o bin/freelang-server

# 실행
./bin/freelang-server
```

## 📊 기대 출력

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 FreeLang Standalone Web Server                      ║
║   (HTTP Engine: TCP + HTTP/1.1 Parser)                   ║
║   자립형 언어 - Node.js/TypeScript/npm 불필요            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

📊 시스템 정보:
  • 언어: FreeLang
  • 버전: 2.8.0
  • 모드: Standalone (자립형)
  • 배포: 단일 바이너리

🔌 HTTP Engine 시작 중...
✅ 서버 정상 종료
```

## 🌐 접근 가능한 엔드포인트

### 즉시 테스트 (다른 터미널)

```bash
# 카운터 조회
curl http://localhost:5020/api/counter
# 응답: {"status": "success", "data": {"count": 0}}

# 블로그 목록
curl http://localhost:5020/api/blogs
# 응답: {"status": "success", "data": {"blogs": [...], "count": 2}}

# 웹 UI
curl http://localhost:5020/
# → 카운터 데모 HTML

curl http://localhost:5020/blog.html
# → 블로그 목록 HTML
```

## ⚠️ 미리 준비하기

### FreeLang 컴파일러가 필요합니다

**설치하지 않았다면**:

```bash
# npm 사용 (권장)
npm install -g freelang

# 또는 brew (macOS)
brew install freelang

# 또는 소스 빌드
git clone https://github.com/freelang/freelang
cd freelang && make install
```

**설치 확인**:
```bash
which freelang
# 또는
freelang --version
```

## 📝 실행 후 할 일

### 1단계: API 테스트
```bash
./test-api.sh http://localhost:5020
```

### 2단계: 블로그 기능 확인
```bash
# 블로그 발행 (DRAFT → PUBLISHED)
curl -X POST http://localhost:5020/api/blogs/3/publish

# 새 블로그 생성
curl -X POST http://localhost:5020/api/blogs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Blog",
    "slug": "my-blog",
    "content": "Content...",
    "summary": "Summary...",
    "author": "Author",
    "category": "Category",
    "tags": ["tag1", "tag2"]
  }'
```

### 3단계: 성능 확인
```bash
# 간단한 부하 테스트
for i in {1..100}; do
  curl -s http://localhost:5020/api/counter > /dev/null
done
echo "100개 요청 완료"

# 메모리 사용량 확인
ps aux | grep freelang-server
```

## 🎯 목표

| 항목 | 예상 | 실제 |
|------|------|------|
| 시작 시간 | <1초 | ⏳ 테스트 중 |
| 메모리 | ~10MB | ⏳ 테스트 중 |
| 첫 응답 | <10ms | ⏳ 테스트 중 |
| 처리량 | >100 req/s | ⏳ 테스트 중 |

## 💾 프로젝트 파일

```
freelang-hybrid/
├── setup-freelang.sh          ← 이 파일로 실행!
├── RUN_NOW.md                 ← 이 가이드
│
├── freelang/
│   ├── main.free              (98줄, 진입점)
│   ├── core/
│   │   ├── types.free         (136줄, 타입)
│   │   └── state.free         (231줄, CRUD)
│   ├── server/
│   │   └── http-engine.free   (340줄, 라우팅)
│   └── engine/
│       ├── tcp_socket.fl      (312줄)
│       ├── http_parser.fl     (364줄)
│       ├── http_handler.fl    (322줄)
│       └── server.fl          (311줄)
│
├── data/
│   └── db.json                (3개 샘플 블로그)
│
├── blog-posts/
│   └── 001-freelang-http-server.md (215줄, 첫 포스트)
│
└── bin/
    └── freelang-server        (컴파일 후 생성)
```

## 🆘 문제 해결

### "freelang: command not found"
```bash
npm install -g freelang
# 또는
sudo npm install -g freelang  # 권한 필요 시
```

### 포트 5020이 이미 사용 중
```bash
# 포트 사용 확인
lsof -i :5020

# 다른 포트로 실행 (코드 수정 필요)
# freelang/main.free의 http_server_main(..., 5020, ...) 수정
```

### 컴파일 에러
```bash
# 파일 문법 확인
freelang check freelang/main.free

# 상세 에러 보기
freelang compile freelang/main.free --verbose
```

## 📚 다음 문서

- **BLOG_LAUNCH.md**: 블로그 시스템 설명
- **README.md**: API 사용 가이드
- **ARCHITECTURE.md**: 시스템 구조
- **PROJECT_STATUS.md**: 진행 상황

---

**준비 완료!** 아래 명령으로 시작하세요:

```bash
bash setup-freelang.sh --start
```

또는 FreeLang이 이미 설치되어 있다면:

```bash
freelang compile freelang/main.free -o bin/freelang-server && \
./bin/freelang-server
```

