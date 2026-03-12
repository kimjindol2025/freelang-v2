## 🚀 프로덕션 서버 배포

**FreeLang Standalone Web Server를 원격 서버에 배포**

---

## 📋 배포 전 체크리스트

- [ ] FreeLang 컴파일러 설치 (로컬)
- [ ] 로컬에서 `make build` 성공 확인
- [ ] SSH 접속 가능한 원격 서버 준비
- [ ] 서버에 포트 3000, 3001 개방
- [ ] 서버에 1GB 이상의 디스크 공간

---

## 🏗️ 배포 단계

### 1단계: 로컬에서 빌드

```bash
cd freelang-hybrid

# 최적화 빌드 (권장)
make native

# 또는 기본 빌드
make build

# 생성 확인
ls -lh bin/freelang-server
# -rwxr-xr-x  1 user  staff  8.5M Mar 12 22:15 bin/freelang-server
```

### 2단계: 서버로 전송

```bash
# SCP로 바이너리 전송
scp bin/freelang-server user@server.com:/home/user/

# 또는 Git으로 푸시 + 서버에서 빌드
git push origin master
ssh user@server.com "cd ~/freelang-hybrid && git pull && make build"
```

### 3단계: 서버에서 실행

```bash
# SSH 접속
ssh user@server.com

# 디렉토리 이동
cd ~/freelang-hybrid

# 바이너리 실행 (포그라운드)
./bin/freelang-server

# 또는 백그라운드 + PM2
pm2 start bin/freelang-server --name "freelang"
pm2 save
pm2 startup
```

### 4단계: 접속 확인

```bash
# 로컬에서
curl http://server.com:3000
# 또는
curl http://server-ip:3000
```

---

## 🔧 배포 스크립트

### deploy.sh (로컬)

```bash
#!/bin/bash
set -e

TARGET_HOST="${1:-user@server.com}"
TARGET_DIR="/home/user/freelang-hybrid"

echo "🚀 FreeLang 배포 시작..."
echo "대상: $TARGET_HOST:$TARGET_DIR"
echo ""

# 1. 로컬 빌드
echo "📦 로컬에서 빌드 중..."
make native

if [ ! -f "bin/freelang-server" ]; then
    echo "❌ 빌드 실패"
    exit 1
fi

echo "✅ 빌드 완료"
echo ""

# 2. 서버에 전송
echo "📤 바이너리 전송 중..."
scp bin/freelang-server "$TARGET_HOST:$TARGET_DIR/"

echo "✅ 전송 완료"
echo ""

# 3. 서버에서 실행 준비
echo "🔧 서버에서 준비 중..."
ssh "$TARGET_HOST" << 'REMOTE_SCRIPT'
    cd ~/freelang-hybrid

    # 데이터 디렉토리 확인
    mkdir -p data backups

    # 기존 프로세스 중지 (있으면)
    pkill -f "bin/freelang-server" || true
    sleep 2

    # 권한 설정
    chmod +x bin/freelang-server

    echo "✅ 서버 준비 완료"
REMOTE_SCRIPT

echo ""
echo "🎉 배포 완료!"
echo "접속: http://$TARGET_HOST:3000"
echo ""
```

사용법:
```bash
chmod +x deploy.sh
./deploy.sh user@server.com
```

---

## 🐳 Docker로 배포 (권장)

Docker를 사용하면 더 간단합니다.

### 1단계: Docker 이미지 빌드

```bash
docker build -t freelang-server:latest .
```

### 2단계: Docker Hub에 푸시 (선택)

```bash
docker tag freelang-server:latest username/freelang-server:latest
docker push username/freelang-server:latest
```

### 3단계: 서버에서 실행

```bash
# 직접 실행
docker run -d \
  --name freelang \
  -p 3000:3000 \
  -v /home/user/data:/app/data \
  freelang-server:latest

# 또는 docker-compose
docker-compose up -d
```

---

## 🔒 보안 설정

### Nginx 리버스 프록시 (권장)

```nginx
server {
    listen 80;
    server_name api.example.com;

    # HTTPS 리다이렉트
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    # 보안 헤더
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    # 프록시
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 방화벽 설정

```bash
# Ubuntu/Debian
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp  # 개발용 (선택)

# CentOS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 📊 성능 튜닝

### 시스템 리소스 설정

```bash
# 파일 디스크립터 증가
echo "fs.file-max = 2097152" | sudo tee -a /etc/sysctl.conf
echo "* soft nofile 100000" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 100000" | sudo tee -a /etc/security/limits.conf

sudo sysctl -p
```

### 프로세스 모니터링

```bash
# PM2로 자동 재시작
pm2 start bin/freelang-server \
  --name "freelang" \
  --watch \
  --max-memory-restart "500M" \
  --log-date-format "YYYY-MM-DD HH:mm:ss Z"

# 모니터링 활성화
pm2 web                    # http://localhost:9615
pm2 monit                  # 실시간 모니터링
```

---

## 🔍 배포 후 검증

### 헬스 체크

```bash
# 기본 응답 확인
curl -s http://server:3000 | head -c 100

# API 테스트
curl -s http://server:3000/api/health | jq .

# 카운터 테스트
curl -X POST http://server:3000/api/counter/increment | jq .

# 블로그 테스트
curl -s http://server:3000/api/blogs | jq .
```

### 로그 확인

```bash
# PM2 로그
pm2 logs freelang

# 시스템 로그
tail -f /var/log/syslog | grep freelang
```

---

## 📈 모니터링 및 관리

### 자동 백업

```bash
# crontab에 추가 (매일 자정)
0 0 * * * cd ~/freelang-hybrid && tar czf data/backup-$(date +%Y%m%d).tar.gz data/

# 또는 데이터베이스 백업
0 0 * * * cp data/db.json data/backups/db-$(date +%Y%m%d-%H%M%S).json
```

### 성능 모니터링

```bash
# CPU/메모리 사용률
ps aux | grep freelang-server

# 포트 확인
netstat -tlnp | grep 3000

# 데이터베이스 크기
du -sh data/db.json
du -sh data/backups/
```

---

## 🐛 문제 해결

### 서버가 시작되지 않음

```bash
# 로그 확인
./bin/freelang-server 2>&1 | head -50

# 포트 확인
lsof -i :3000

# 권한 확인
ls -l bin/freelang-server
chmod +x bin/freelang-server
```

### 느린 응답

```bash
# 데이터베이스 크기 확인
du -sh data/db.json

# 동시 연결 확인
netstat -an | grep :3000 | wc -l

# 메모리 부족
free -h
```

### 데이터 손실

```bash
# 백업에서 복구
cp data/backups/db-LATEST.json data/db.json

# 또는 Git에서
git pull && make build
```

---

## 🔄 배포 자동화 (CI/CD)

### GitHub Actions

```yaml
name: Deploy to Server

on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build
        run: |
          make native

      - name: Deploy
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
        run: |
          mkdir -p ~/.ssh
          echo "$DEPLOY_KEY" > ~/.ssh/key
          chmod 600 ~/.ssh/key
          scp -i ~/.ssh/key bin/freelang-server user@server.com:/home/user/
          ssh -i ~/.ssh/key user@server.com "pkill freelang; ./bin/freelang-server &"
```

---

## ✅ 배포 완료 확인

```bash
# 1. 접속 확인
curl http://server:3000/api/health
# {"status":"healthy", ...}

# 2. 데이터 확인
ls -la ~/freelang-hybrid/data/
# db.json, backups/ 폴더

# 3. 로그 확인
pm2 logs freelang
# ✅ 오류 없음

# 4. 성능 확인
ab -n 100 -c 10 http://server:3000/api/counter
# Requests per second: 1000+
```

---

## 📞 지원

문제 발생시:
1. 로그 확인: `pm2 logs freelang`
2. 서버 상태: `pm2 status`
3. 포트 확인: `lsof -i :3000`
4. 데이터베이스: `data/db.json` 확인

---

**생성**: 2026-03-12
**상태**: ✅ 배포 준비 완료
