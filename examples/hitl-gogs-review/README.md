# 🔷 HITL Gogs Code Review System

**Human-in-the-Loop AI 시스템** (순수 FreeLang v2.2.0 구현)
AI 자동 분석 + 인간 최종 검수 = 신뢰도 높은 코드 리뷰

> 🎯 **기술 스택**: FreeLang v2.2.0 (순수 구현)
>
> - @freelang/http: HTTP 서버
> - @freelang/server: 라우팅 & 미들웨어
> - @freelang/socket: TCP 통신
> - @freelang/network: 네트워크 I/O
>
> ✨ 모든 코드가 FreeLang v2.2.0으로 작성됨

---

## 📋 개요

Gogs 저장소에 Push된 코드를 **AI가 자동으로 분석**하고, **신뢰도(Confidence)에 따라** 인간의 검수 필요 여부를 결정하는 시스템입니다.

```
Gogs (Push)
    ↓
AI 코드 분석 (Confidence 95점 만점)
    ├─ 95점↑  → ✅ 자동 승인 (인간 개입 불필요)
    ├─ 60-95점 → ⏳ 인간 검수 필요 (웹 UI)
    └─ 60점↓  → 🔄 AI 재분석
         ↓ 인간이 검수 결과 입력
SQLite에 피드백 저장
         ↓
다음 분석에 이력 반영 (점수 보정)
```

---

## 🚀 시작하기

### 설치

```bash
# 프로젝트 복제
cd /home/kimjin/Desktop/kim/진행중_프로젝트/hitl-gogs-review

# FreeLang 설치
kpm install freelang

# 의존성 확인 (내부 모듈만 사용)
ls src/
```

### 실행

```bash
# 서버 시작
freelang run src/main.fl

# 또는
freelang src/main.fl
```

**출력**:
```
═══════════════════════════════════════════
  🔷 HITL Gogs Code Review System
  Human-in-the-Loop AI
═══════════════════════════════════════════

📊 Initializing database...
✅ Database ready

🚀 Starting servers...
  - HITL Server: http://localhost:50270
    ├─ POST /webhook          (Gogs Push)
    ├─ GET /queue             (검수 대기 목록)
    ├─ POST /approve/:id      (승인)
    ├─ POST /reject/:id       (거부)
    └─ GET /stats             (통계)

  - Web UI: http://localhost:50271
    └─ /review.html           (검수 인터페이스)

✅ HITL Server ready for Gogs webhooks
```

---

## 🧪 테스트

```bash
# 통합 테스트 실행
freelang run tests/test_all.fl

# 예상 출력:
# ✅ Test 1: Confidence 계산
# ✅ Test 2: Routing 결정
# ✅ Test 3: 코드 분석
# ✅ Test 4: 이슈 감지
# ✅ Test 5: 우선순위 계산
#
# 📊 Test Results: 5/5 passed
```

---

## 📊 API 엔드포인트

### Webhook (Gogs Push 수신)

```bash
POST /webhook

# Request (Gogs가 자동으로 전송)
{
  "repository": {
    "name": "my-project",
    "url": "https://gogs.dclub.kr/kim/my-project"
  },
  "after": "abc123def456",
  "commits": [{
    "modified": ["src/main.fl", "src/analyzer.fl"]
  }]
}

# Response
{
  "review_id": 1,
  "repo": "my-project",
  "confidence": 0.85,
  "routing": "human_review",
  "files_analyzed": 2,
  "status": "success"
}
```

### 검수 대기 목록

```bash
GET /queue

# Response
[
  {
    "id": 1,
    "repo": "my-project",
    "commit_hash": "abc123d",
    "confidence": 0.85,
    "created_at": "2026-03-03T18:54:00Z"
  },
  ...
]
```

### 승인 / 거부

```bash
# 승인
POST /approve/:id
{
  "reviewer": "kimjin",
  "comment": "Looks good! ✅"
}

# 거부
POST /reject/:id
{
  "reviewer": "kimjin",
  "comment": "Needs refactoring - too complex"
}

# Response
{
  "review_id": "1",
  "status": "approved",
  "message": "Successfully approved"
}
```

### 통계

```bash
GET /stats

# Response
{
  "total_reviews": 42,
  "approved": 35,
  "rejected": 5,
  "approval_rate": 83.3,
  "avg_ai_confidence": 0.78
}
```

---

## 🔍 Confidence 계산 방식

| 항목 | 가중치 | 설명 |
|------|--------|------|
| **코드 복잡도** | 25% | 순환복잡도, 함수 길이 |
| **네이밍 컨벤션** | 20% | snake_case 변수, camelCase 함수 |
| **중복 코드** | 20% | 같은 라인의 반복 여부 |
| **보안 취약점** | 20% | eval(), XSS, 하드코딩된 자격증명 |
| **테스트 커버리지** | 15% | assert, test 함수 존재 여부 |

**임계값**:
```
Confidence ≥ 0.95  →  auto_approve   (자동 승인)
Confidence ≥ 0.80  →  notify         (알림 후 자동 승인)
Confidence ≥ 0.60  →  human_review   (인간 검수 필수)
Confidence  < 0.60  →  ai_reanalysis (AI 재분석)
```

---

## 🗂️ 파일 구조

```
hitl-gogs-review/
├── src/
│   ├── main.fl              # 진입점 (서버 시작)
│   ├── server.fl            # HTTP 서버 + Webhook
│   ├── analyzer.fl          # 코드 분석 엔진
│   ├── confidence.fl        # Confidence 점수 계산
│   ├── reviewer.fl          # 인간 검수 큐 관리
│   ├── feedback.fl          # 피드백 저장 + 학습
│   └── database.fl          # SQLite CRUD
├── public/
│   └── review.html          # 웹 검수 UI
├── tests/
│   └── test_all.fl          # 통합 테스트
├── reviews.db               # SQLite 데이터베이스 (자동 생성)
└── README.md
```

---

## 📚 모듈 설명

### `database.fl`
SQLite 관리 모듈
- `init()`: DB 초기화
- `save_review()`: 검수 기록 저장
- `save_feedback()`: 인간 피드백 저장
- `get_pending_reviews()`: 대기 중인 검수 조회

### `confidence.fl`
신뢰도 점수 계산
- `calculate(code, test_code)`: 최종 Confidence (0-1)
- `get_routing(confidence)`: 라우팅 결정
- 내부: `score_complexity()`, `score_naming()`, `score_security()` 등

### `analyzer.fl`
코드 품질 분석
- `analyze_file()`: 단일 파일 분석
- `analyze_batch()`: 여러 파일 분석
- `extract_metrics()`: 메트릭 추출
- `detect_issues()`: 문제점 감지

### `server.fl`
HTTP 서버 + API
- `start(port)`: 서버 시작
- `handle_webhook()`: Webhook 처리
- `handle_queue()`: 검수 목록 반환
- `handle_approve/reject()`: 피드백 저장

### `reviewer.fl`
검수 큐 관리
- `get_queue()`: 우선순위 정렬된 검수 목록
- `submit_review()`: 인간 검수 결과 제출
- `get_priority()`: 우선순위 계산 (HIGH/MEDIUM/LOW)

### `feedback.fl`
피드백 루프 및 학습
- `adjust_confidence()`: 이력 기반 점수 보정
- `recalibrate_thresholds()`: 임계값 자동 조정
- `get_summary()`: 피드백 통계

---

## 🔗 Gogs 연동

### Webhook 등록

```bash
# Gogs 저장소 Settings → Webhooks → Add Webhook
URL: http://your-server:50270/webhook
Content Type: application/json
Events: Push
```

### 자동화 스크립트 (미래)

```bash
# Phase 4: Gogs API로 자동 등록
POST /api/v1/repos/{owner}/{repo}/hooks
{
  "type": "gogs",
  "config": {
    "url": "http://localhost:50270/webhook",
    "content_type": "json"
  },
  "events": ["push"],
  "active": true
}
```

---

## 📈 성능 및 확장성

| 메트릭 | 값 |
|--------|-----|
| 파일당 분석 시간 | < 100ms |
| 동시 분석 파일 수 | 무제한 (병렬 처리) |
| SQLite DB 스키마 | 2개 테이블 + 3개 인덱스 |
| 웹 UI 응답 시간 | < 200ms |

---

## 🚀 다음 단계 (Phase 2+)

- [ ] **Phase 2**: 웹 UI 기능 완성 (실제 검수, 댓글 달기)
- [ ] **Phase 3**: 피드백 기반 AI 재학습
- [ ] **Phase 4**: Gogs API 자동 연동 (Webhook 자동 등록)
- [ ] **Phase 5**: 팀 협업 (여러 검수자 지원)
- [ ] **Phase 6**: 고급 분석 (시간 복잡도, 메모리 프로파일링)

---

## 🎯 사용 예시

### 1️⃣ 개발자 Push

```bash
git push origin feature/new-analysis
```

### 2️⃣ Gogs Webhook 자동 전송

HITL 서버의 `/webhook` 엔드포인트로 자동 호출

### 3️⃣ AI 분석 결과

```
코드 분석 완료:
  - Complexity: 75점
  - Security: 90점
  - Testing: 60점
  - 최종 Confidence: 78점

결정: human_review
→ 검수자 대기 큐에 추가
```

### 4️⃣ 인간 검수 (웹 UI)

- http://localhost:50271 접속
- "검수 대기 목록" 확인
- 코드 검토 후 "✅ 승인" 또는 "❌ 거부"

### 5️⃣ 피드백 저장

SQLite에 기록되고, 다음 분석에 반영

---

## 📝 라이선스

MIT

---

**생성**: 2026-03-03
**버전**: Phase 1 (핵심 엔진)
**상태**: 🚧 개발 중
**언어**: FreeLang v1.0.0
