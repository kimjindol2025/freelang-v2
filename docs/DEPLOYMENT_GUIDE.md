# FreeLang 배포 가이드

**목표**: PM2를 이용한 프로덕션 배포 및 모니터링
**상태**: Phase D 구현
**지원 환경**: Linux (232, 73 서버)

---

## 🚀 빠른 시작

### 1단계: PM2 설치

```bash
npm install -g pm2

# 자동 시작 설정
pm2 startup
pm2 save
```

### 2단계: 애플리케이션 배포

```bash
cd /home/kimjin/Desktop/kim/v2-freelang-ai

# 빌드
npm install
npm run build

# PM2 시작
pm2 start pm2-freelang-config.js --env production

# 상태 확인
pm2 status
pm2 logs
```

### 3단계: 모니터링

```bash
# 실시간 모니터링
pm2 monit

# 로그 확인
pm2 logs freelang-api
pm2 logs freelang-db-manager
```

---

## 📋 PM2 설정 상세

### 애플리케이션 정의

```javascript
{
  name: "freelang-api",
  script: "./dist/cli/index.js",
  args: "run ./examples/rest-api-server.fl",
  instances: "max",        // 모든 CPU 코어 사용
  exec_mode: "cluster",    // 클러스터 모드 (부하 분산)
  watch: true,             // 파일 변경시 자동 재시작
  max_memory_restart: "500M",
  error_file: "./logs/api-error.log",
  out_file: "./logs/api-out.log",
  env: {
    NODE_ENV: "development",
    PORT: 3000
  },
  env_production: {
    NODE_ENV: "production",
    PORT: 3000
  }
}
```

### 주요 옵션 설명

| 옵션 | 의미 | 용도 |
|------|------|------|
| `instances` | "max" = CPU 코어 수 | 자동 부하 분산 |
| `exec_mode` | "cluster" | 여러 프로세스로 확장 |
| `watch` | true | 파일 변경 감지 자동 재시작 |
| `max_memory_restart` | "500M" | 메모리 초과시 자동 재시작 |
| `error_file` | 에러 로그 경로 | 문제 디버깅 용 |
| `env_production` | 프로덕션 환경변수 | 본 환경에서만 적용 |

---

## 📜 배포 스크립트 (deploy-freelang.sh)

### 기능

```bash
./deploy-freelang.sh [production|staging]
```

1. ✅ 환경 확인 (PM2, npm, git)
2. ✅ 코드 업데이트 (git pull)
3. ✅ 의존성 설치 (npm ci)
4. ✅ 빌드 (npm run build)
5. ✅ 테스트 (npm run test)
6. ✅ PM2 서비스 재시작
7. ✅ 헬스체크 (자동 재시도)
8. ✅ 배포 완료 알림

### 사용 예시

```bash
# Production 배포
./deploy-freelang.sh production

# Staging 배포
./deploy-freelang.sh staging

# 실시간 로그 확인
tail -f /var/log/freelang-deploy.log
```

### 롤백

배포 중 헬스체크 실패시:
```
⚠️  Automatic rollback triggered
↓
pm2 resurrect  (이전 상태로 복구)
↓
Health check passed → Deployment reverted
```

---

## 🔧 PM2 명령어

### 상태 확인

```bash
# 프로세스 목록
pm2 status

# 상세 정보
pm2 describe freelang-api

# CPU/메모리 사용률
pm2 monit

# 전체 통계
pm2 info
```

### 로그 관리

```bash
# 실시간 로그
pm2 logs freelang-api

# 특정 라인 수만
pm2 logs freelang-api --lines 100

# 에러만 확인
pm2 logs freelang-api --err

# 로그 삭제
pm2 flush freelang-api
```

### 프로세스 제어

```bash
# 재시작
pm2 restart freelang-api

# 리로드 (무중단 재시작)
pm2 reload freelang-api

# 일시 중지
pm2 stop freelang-api

# 재개
pm2 start freelang-api

# 모두 재시작
pm2 restart all

# 모두 종료
pm2 stop all
```

### 설정 업데이트

```bash
# 설정 변경 후
pm2 reload pm2-freelang-config.js

# 환경 변경 (production)
pm2 reload pm2-freelang-config.js --env production

# 저장
pm2 save
```

---

## 🔄 무중단 배포

### 시나리오: 새 버전 배포

```bash
# 1️⃣  새 버전 코드 pull
git pull origin master

# 2️⃣  빌드
npm run build

# 3️⃣  무중단 리로드
pm2 reload freelang-api

# 4️⃣  헬스체크
curl http://localhost:3000/health
```

### Zero Downtime Deploy 원리

```
Old Process (Port 3000)
       ↓
New Process 시작 (Port 3001, 3002 ...)
       ↓
요청을 새 Process로 점진적 이동
       ↓
Old Process 종료
       ↓
New Process (Port 3000) 운영
```

---

## 📊 모니터링 & 알림

### PM2 웹 대시보드

```bash
# 웹 UI 시작 (포트 9615)
pm2 web

# 접근: http://localhost:9615
```

### 상태 모니터링

```javascript
// pm2-freelang-config.js에서
monitor: {
  memory: 500,     // MB
  cpu: 90          // %
}
```

### Slack 알림 (선택사항)

```bash
# 환경변수 설정
export SLACK_WEBHOOK_URL="https://hooks.slack.com/..."

# 배포 실행
./deploy-freelang.sh production

# 결과 → Slack으로 자동 전송
```

---

## 🛡️ 보안 체크리스트

### 배포 전

- [ ] NODE_ENV = "production" 설정
- [ ] 비밀키 관리 (환경변수)
- [ ] SSL/TLS 인증서 설치
- [ ] 방화벽 규칙 확인 (포트 3000)
- [ ] 백업 설정

### 배포 후

- [ ] 헬스체크 (HTTP 200)
- [ ] API 응답 테스트
- [ ] 로그 확인 (에러 없음)
- [ ] 메모리/CPU 정상
- [ ] 외부 접근 가능 확인

---

## 🚨 트러블슈팅

### 프로세스가 계속 재시작됨

```bash
# 로그 확인
pm2 logs --lines 50

# 에러 원인 파악 후
npm run build

# 재시작
pm2 restart freelang-api
```

### 메모리 누수

```bash
# 메모리 사용률 확인
pm2 monit

# 프로세스 메모리 제한 설정
pm2 start pm2-freelang-config.js
pm2 set max_memory_restart "500M"
pm2 save
```

### 포트 충돌

```bash
# 포트 사용 중인 프로세스 확인
lsof -i :3000

# 다른 포트로 변경
# pm2-freelang-config.js에서 PORT 수정
```

### 배포 실패

```bash
# 1. 로그 확인
tail -f /var/log/freelang-deploy.log

# 2. 수동 빌드 테스트
npm run build

# 3. PM2 상태 확인
pm2 status

# 4. 필요시 수동 롤백
pm2 resurrect
```

---

## 📈 성능 최적화

### 클러스터 모드

```javascript
{
  instances: "max",   // CPU 코어 수만큼 프로세스
  exec_mode: "cluster"
}

// 결과: 부하 분산, 높은 가용성
// - 4 코어 CPU → 4개 프로세스 실행
// - 자동 로드 밸런싱
```

### 메모리 최적화

```javascript
{
  max_memory_restart: "500M",  // 초과시 자동 재시작
  watch: false                 // 성능 중시시 비활성화
}
```

### 응답 시간 개선

```bash
# 1. 빌드 캐시 활용
npm ci  # (npm install 대신)

# 2. 프로덕션 모드
NODE_ENV=production npm start

# 3. 파일 감시 비활성화
watch: false
```

---

## 📝 배포 체크리스트

### 배포 전

- [ ] 모든 테스트 통과
- [ ] 설정 파일 검토
- [ ] 환경변수 설정
- [ ] 데이터베이스 마이그레이션 완료

### 배포 중

- [ ] `./deploy-freelang.sh production` 실행
- [ ] 빌드 성공 확인
- [ ] 헬스체크 통과

### 배포 후

- [ ] `pm2 status` 확인
- [ ] `pm2 logs` 에러 확인 없음
- [ ] API 응답 테스트
- [ ] 트래픽 모니터링
- [ ] 성능 지표 확인

---

## 🔗 관련 문서

- [EXPRESS_COMPAT_API.md](./EXPRESS_COMPAT_API.md) - 웹 프레임워크
- [ORM_DESIGN.md](./ORM_DESIGN.md) - 데이터베이스
- [pm2-freelang-config.js](../pm2-freelang-config.js) - 설정 파일
- [deploy-freelang.sh](../deploy-freelang.sh) - 배포 스크립트

---

**프로젝트**: FreeLang v2
**단계**: Phase D (배포)
**마지막 업데이트**: 2026-03-06
