# core 모듈 - 테스트 계획 및 가이드

**목표**: core 모듈 테스트 커버리지 80%+ 달성
**기간**: Day 3-4 (2026-03-02 ~ 2026-03-03)
**모듈 수**: 51개 C 파일, 16,675 LOC

---

## 📋 모듈 분석

### 핵심 5개 모듈 선정

| 모듈 | 파일 | LOC | 우선순위 | 테스트 수 |
|------|------|-----|---------|---------|
| **JSON** | json.c | 15,694 | 🔴 매우 높음 | 25 |
| **Socket** | socket.c | 16,688 | 🔴 매우 높음 | 20 |
| **HTTP** | http.c | 17,365 | 🔴 매우 높음 | 20 |
| **Hash** | hash.c | 8,429 | 🟡 높음 | 15 |
| **SSL/TLS** | ssl.c | 14,990 | 🟡 높음 | 15 |
| **합계** | - | **73,166** | - | **95** |

### 추가 모듈들 (선택)

| 모듈 | 파일 | LOC | 용도 |
|------|------|-----|------|
| base64.c | 7,808 | 인코딩 |
| sql.c | 13,282 | 데이터베이스 |
| csv.c | 9,406 | 데이터 파싱 |
| yaml.c | 12,938 | YAML 파싱 |
| url.c | 14,014 | URL 파싱 |
| websocket.c | 17,866 | WebSocket |

---

## 🧪 테스트 카테고리별 계획

### 1️⃣ JSON (json.c) - 25개 테스트

#### Parser Tests (12개)
```c
✓ parse_null() - null 값 파싱
✓ parse_bool() - true/false 파싱
✓ parse_number() - 정수, 부동소수점 파싱
✓ parse_string() - 문자열 파싱, 이스케이프 처리
✓ parse_array() - 배열 파싱
✓ parse_object() - 객체 파싱
✓ parse_nested_structure() - 중첩 구조
✓ parse_whitespace_handling() - 공백 처리
✓ parse_unicode_escape() - Unicode 이스케이프
✓ parse_error_handling() - 에러 처리
✓ parse_line_tracking() - 라인/컬럼 추적
✓ parse_large_json() - 큰 JSON 처리
```

#### Serializer Tests (10개)
```c
✓ serialize_null() - null 직렬화
✓ serialize_bool() - 불린 직렬화
✓ serialize_number() - 숫자 직렬화
✓ serialize_string() - 문자열 직렬화, 이스케이프
✓ serialize_array() - 배열 직렬화
✓ serialize_object() - 객체 직렬화
✓ serialize_nested() - 중첩 직렬화
✓ serialize_pretty_print() - 포맷된 출력
✓ serialize_compact() - 컴팩트 출력
✓ serialize_roundtrip() - 파싱 후 직렬화 검증
```

#### Utility Tests (3개)
```c
✓ escape_string() - 문자열 이스케이프
✓ unescape_string() - 문자열 언이스케이프
✓ json_path_query() - JSON Path 쿼리
```

---

### 2️⃣ Socket (socket.c) - 20개 테스트

#### Connection Tests (8개)
```c
✓ socket_create() - 소켓 생성
✓ socket_bind() - 바인드
✓ socket_listen() - 리스닝
✓ socket_connect() - 연결
✓ socket_accept() - 수용
✓ socket_close() - 종료
✓ socket_shutdown() - 셧다운
✓ socket_fd_management() - FD 관리
```

#### Send/Recv Tests (8개)
```c
✓ send_data() - 데이터 전송
✓ recv_data() - 데이터 수신
✓ send_large_data() - 대용량 전송
✓ send_partial() - 부분 전송
✓ recv_timeout() - 타임아웃
✓ recv_non_blocking() - 논블로킹
✓ send_recv_interleaved() - 교대 송수신
✓ send_recv_error_handling() - 에러 처리
```

#### Socket Options Tests (4개)
```c
✓ setsockopt_bufsize() - 버퍼 크기 설정
✓ getsockopt_read_data() - 소켓 옵션 읽기
✓ set_nonblocking() - 논블로킹 설정
✓ set_reusaddr() - 주소 재사용 설정
```

---

### 3️⃣ HTTP (http.c) - 20개 테스트

#### Request Tests (8개)
```c
✓ http_request_create() - HTTP 요청 생성
✓ http_request_set_method() - 메서드 설정 (GET/POST/PUT/DELETE)
✓ http_request_set_header() - 헤더 설정
✓ http_request_set_body() - 바디 설정
✓ http_request_serialize() - 요청 직렬화
✓ http_request_parse() - 요청 파싱
✓ http_request_chunked() - 청크 인코딩
✓ http_request_multipart() - 멀티파트 폼
```

#### Response Tests (8개)
```c
✓ http_response_create() - HTTP 응답 생성
✓ http_response_set_status() - 상태 코드 설정
✓ http_response_set_header() - 헤더 설정
✓ http_response_set_body() - 바디 설정
✓ http_response_serialize() - 응답 직렬화
✓ http_response_parse() - 응답 파싱
✓ http_response_compression() - 압축 (gzip)
✓ http_response_cache_control() - 캐시 제어
```

#### HTTP Protocol Tests (4개)
```c
✓ http_keep_alive() - Keep-Alive 연결
✓ http_redirect_handling() - 리다이렉트 (301/302)
✓ http_auth_basic() - Basic 인증
✓ http_content_negotiation() - 콘텐츠 협상
```

---

### 4️⃣ Hash (hash.c) - 15개 테스트

#### FNV-1a Tests (4개)
```c
✓ fnv1a_32_empty() - 빈 데이터
✓ fnv1a_32_data() - 일반 데이터
✓ fnv1a_64_empty() - 64비트 빈 데이터
✓ fnv1a_64_data() - 64비트 데이터
```

#### MurmurHash3 Tests (4개)
```c
✓ murmur3_32_empty() - 빈 데이터
✓ murmur3_32_data() - 일반 데이터
✓ murmur3_32_seed() - 시드 값
✓ murmur3_avalanche() - Avalanche 특성
```

#### Hash Quality Tests (4개)
```c
✓ hash_distribution() - 해시값 분포 균등성
✓ hash_collision_rate() - 충돌률 측정
✓ hash_sensitivity() - 입력 민감성
✓ hash_performance() - 성능 벤치마크
```

#### Hash Table Tests (3개)
```c
✓ hashtable_insert() - 삽입
✓ hashtable_lookup() - 조회
✓ hashtable_resize() - 동적 리사이징
```

---

### 5️⃣ SSL/TLS (ssl.c) - 15개 테스트

#### Connection Tests (6개)
```c
✓ ssl_context_create() - SSL 컨텍스트 생성
✓ ssl_context_config() - 인증서/키 설정
✓ ssl_connect() - TLS 핸드셰이크
✓ ssl_accept() - 서버 수용
✓ ssl_shutdown() - 정상 종료
✓ ssl_error_handling() - 에러 처리
```

#### Encryption Tests (5개)
```c
✓ ssl_write() - 암호화된 쓰기
✓ ssl_read() - 암호화된 읽기
✓ ssl_cipher_suite() - 암호 스위트 협상
✓ ssl_protocol_version() - TLS 버전 (1.2/1.3)
✓ ssl_cert_verification() - 인증서 검증
```

#### Security Tests (4개)
```c
✓ ssl_perfect_forward_secrecy() - PFS
✓ ssl_vulnerability_mitigation() - 취약점 완화
✓ ssl_revocation_check() - 인증서 폐기 확인
✓ ssl_session_resumption() - 세션 재개
```

---

## 📅 Day 3 세부 계획

### 오전 (3시간)

#### 1️⃣ 모듈 분석 (30분)
- [ ] json.c 헤더 파일 분석
- [ ] socket.c 주요 함수 확인
- [ ] http.c API 문서화

#### 2️⃣ 테스트 코드 기초 (90분)
- [ ] test_json.c 골격 작성
- [ ] JSON 파서 테스트 12개
- [ ] JSON 직렬화 테스트 10개

### 오후 (3시간)

#### 3️⃣ Socket 테스트 작성 (90분)
- [ ] test_socket.c 작성
- [ ] 연결 테스트 8개
- [ ] 송수신 테스트 8개
- [ ] 옵션 테스트 4개

#### 4️⃣ Makefile 업데이트 (30분)
- [ ] test 타겟 추가
- [ ] 컴파일 플래그 설정
- [ ] 링킹 설정

---

## 📅 Day 4 세부 계획

### 오전 (3시간)

#### 1️⃣ HTTP 테스트 (90분)
- [ ] test_http.c 작성
- [ ] 요청 테스트 8개
- [ ] 응답 테스트 8개
- [ ] 프로토콜 테스트 4개

#### 2️⃣ Hash 테스트 (30분)
- [ ] test_hash.c 작성 기초
- [ ] FNV-1a 테스트 4개
- [ ] MurmurHash3 테스트 4개

### 오후 (3시간)

#### 3️⃣ 통합 테스트 (90분)
- [ ] 모든 테스트 컴파일
- [ ] 테스트 실행 및 결과 분석
- [ ] 커버리지 리포트 생성

#### 4️⃣ 문서화 (30분)
- [ ] 테스트 결과 요약
- [ ] 커버리지 리포트
- [ ] 최종 커밋

---

## 🧪 테스트 작성 스타일 가이드

### C 테스트 함수 패턴

```c
#include <assert.h>
#include <stdio.h>
#include "json.h"

// 테스트 카운터
static int test_count = 0;
static int pass_count = 0;
static int fail_count = 0;

#define ASSERT(condition, message) \
  do { \
    test_count++; \
    if (condition) { \
      pass_count++; \
      printf("✓ %s\n", message); \
    } else { \
      fail_count++; \
      printf("✗ %s\n", message); \
    } \
  } while(0)

// 테스트 함수
void test_parse_null() {
  fl_json_value_t *val = fl_json_parse("null");
  ASSERT(val != NULL, "parse null value");
  ASSERT(val->type == FL_JSON_NULL, "null type check");
  fl_json_value_destroy(val);
}

void test_parse_true() {
  fl_json_value_t *val = fl_json_parse("true");
  ASSERT(val->type == FL_JSON_BOOL, "true type check");
  ASSERT(val->data.bool_val == 1, "true value check");
  fl_json_value_destroy(val);
}

// 메인 함수
int main() {
  printf("🧪 Running core module tests...\n\n");

  test_parse_null();
  test_parse_true();
  // ... more tests

  printf("\n📊 Results:\n");
  printf("  Total:  %d\n", test_count);
  printf("  Passed: %d ✅\n", pass_count);
  printf("  Failed: %d ❌\n", fail_count);

  return fail_count > 0 ? 1 : 0;
}
```

---

## 🎯 성공 기준

```
Day 3:
  ✓ JSON 테스트 25개 작성
  ✓ Socket 테스트 20개 작성
  ✓ test_json.c, test_socket.c 파일 생성
  ✓ Makefile 업데이트

Day 4:
  ✓ HTTP 테스트 20개 작성
  ✓ Hash 테스트 15개 작성
  ✓ SSL 테스트 15개 작성 (선택)
  ✓ 전체 95개 테스트 작성 완료
  ✓ 커버리지 80%+ 달성
  ✓ 모든 파일 커밋
```

---

## 📊 예상 결과

```
Before:  core 모듈 50% (코드만 있고 테스트 부족)
After:   core 모듈 80%+ (95개 테스트 + 문서화)

Files:   51개 → 51개 + test*.c (6개)
LOC:     16,675줄 → + 3,000줄 (테스트)
Tests:   0개 → 95개
Coverage: ~30% → 80%+
```

---

**생성일**: 2026-02-28
**상태**: 준비 완료
**다음**: Day 3 실행 (JSON 테스트 작성)
