#!/bin/bash

# ============================================================================
# FreeLang 배포 스크립트
# 로컬에서 빌드 후 원격 서버에 배포
# ============================================================================

set -e

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 기본값
TARGET_HOST="${1:-}"
BUILD_TYPE="${2:-native}"  # native 또는 release

# ──────────────────────────────────────────────────────────────────────────
# 도움말
# ──────────────────────────────────────────────────────────────────────────

if [ -z "$TARGET_HOST" ]; then
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}FreeLang 배포 스크립트${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
    echo "사용법:"
    echo "  ./deploy.sh <user@host> [native|release]"
    echo ""
    echo "예시:"
    echo "  ./deploy.sh user@192.168.1.100"
    echo "  ./deploy.sh ubuntu@api.example.com native"
    echo ""
    exit 1
fi

# ──────────────────────────────────────────────────────────────────────────
# 1단계: 로컬 빌드
# ──────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📦 Step 1: 로컬 빌드${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

if [ ! -f "Makefile" ]; then
    echo -e "${RED}❌ 에러: Makefile을 찾을 수 없습니다${NC}"
    echo "   현재 디렉토리: $(pwd)"
    exit 1
fi

echo "빌드 유형: $BUILD_TYPE"
echo ""

# 빌드 실행
if [ "$BUILD_TYPE" = "native" ]; then
    echo -e "${YELLOW}⚡ 최적화 빌드 (LTO + -O3)...${NC}"
    make native
else
    echo -e "${YELLOW}📦 기본 빌드...${NC}"
    make build
fi

# 바이너리 확인
if [ ! -f "bin/freelang-server" ]; then
    echo -e "${RED}❌ 빌드 실패: bin/freelang-server를 찾을 수 없습니다${NC}"
    exit 1
fi

BINARY_SIZE=$(du -h bin/freelang-server | cut -f1)
echo -e "${GREEN}✅ 빌드 완료!${NC}"
echo "   파일: $(pwd)/bin/freelang-server"
echo "   크기: $BINARY_SIZE"
echo ""

# ──────────────────────────────────────────────────────────────────────────
# 2단계: 서버로 전송
# ──────────────────────────────────────────────────────────────────────────

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📤 Step 2: 서버로 전송${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

TARGET_DIR="freelang-hybrid"

echo "대상 서버: $TARGET_HOST"
echo "대상 디렉토리: ~/$TARGET_DIR"
echo ""

# SSH 연결 확인
echo -e "${YELLOW}🔍 SSH 연결 확인 중...${NC}"
if ! ssh -o ConnectTimeout=5 "$TARGET_HOST" "echo 'OK'" > /dev/null 2>&1; then
    echo -e "${RED}❌ SSH 연결 실패${NC}"
    echo "   확인사항:"
    echo "   1. 호스트명/IP가 맞는지 확인"
    echo "   2. SSH 키가 설정되었는지 확인"
    echo "   3. 방화벽에서 SSH(22)가 열려있는지 확인"
    exit 1
fi
echo -e "${GREEN}✅ SSH 연결 성공${NC}"
echo ""

# 바이너리 전송
echo -e "${YELLOW}📤 바이너리 전송 중...${NC}"
scp bin/freelang-server "$TARGET_HOST:~/"
echo -e "${GREEN}✅ 전송 완료${NC}"
echo ""

# ──────────────────────────────────────────────────────────────────────────
# 3단계: 서버 준비
# ──────────────────────────────────────────────────────────────────────────

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔧 Step 3: 서버 준비${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

ssh "$TARGET_HOST" << 'REMOTE_COMMANDS'
    set -e

    echo "📁 디렉토리 확인..."
    mkdir -p ~/freelang-hybrid/data
    mkdir -p ~/freelang-hybrid/backups

    echo "📝 바이너리 이동..."
    mv ~/freelang-server ~/freelang-hybrid/bin/ 2>/dev/null || mkdir -p ~/freelang-hybrid/bin && mv ~/freelang-server ~/freelang-hybrid/bin/

    echo "🔐 권한 설정..."
    chmod +x ~/freelang-hybrid/bin/freelang-server

    echo "🛑 기존 프로세스 중지..."
    pkill -f "bin/freelang-server" || true
    sleep 2

    echo "✅ 서버 준비 완료"
REMOTE_COMMANDS

echo -e "${GREEN}✅ 서버 준비 완료${NC}"
echo ""

# ──────────────────────────────────────────────────────────────────────────
# 4단계: 서버 시작
# ──────────────────────────────────────────────────────────────────────────

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 Step 4: 서버 시작${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

echo "시작 옵션:"
echo "  1. PM2로 시작 (자동 재시작, 모니터링)"
echo "  2. systemd로 시작 (시스템 서비스)"
echo "  3. 직접 실행 (포그라운드)"
echo ""
read -p "선택 (1-3, 기본: 1): " START_OPTION
START_OPTION=${START_OPTION:-1}

case $START_OPTION in
    1)
        echo -e "${YELLOW}PM2로 시작 중...${NC}"
        ssh "$TARGET_HOST" << 'PM2_START'
            cd ~/freelang-hybrid

            # PM2 설치 확인
            which pm2 > /dev/null || npm install -g pm2

            # 시작
            pm2 delete freelang || true
            pm2 start bin/freelang-server \
                --name "freelang" \
                --watch \
                --max-memory-restart "500M" \
                --log-date-format "YYYY-MM-DD HH:mm:ss Z"

            pm2 save
            pm2 startup

            echo ""
            echo "PM2 상태:"
            pm2 status

            echo ""
            echo "로그 확인:"
            pm2 logs freelang --lines 10
PM2_START
        ;;
    2)
        echo -e "${YELLOW}systemd로 시작 중...${NC}"
        ssh "$TARGET_HOST" << 'SYSTEMD_START'
            sudo tee /etc/systemd/system/freelang.service > /dev/null << 'EOF'
[Unit]
Description=FreeLang Standalone Web Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/home/$USER/freelang-hybrid
ExecStart=/home/$USER/freelang-hybrid/bin/freelang-server
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

            sudo systemctl daemon-reload
            sudo systemctl enable freelang
            sudo systemctl start freelang

            echo "systemd 상태:"
            sudo systemctl status freelang

            echo ""
            echo "로그 확인:"
            journalctl -u freelang -n 20 -f
SYSTEMD_START
        ;;
    3)
        echo -e "${YELLOW}직접 실행 중...${NC}"
        ssh "$TARGET_HOST" << 'DIRECT_START'
            cd ~/freelang-hybrid
            echo "🚀 서버 시작..."
            ./bin/freelang-server
DIRECT_START
        ;;
    *)
        echo -e "${RED}❌ 잘못된 선택${NC}"
        exit 1
        ;;
esac

# ──────────────────────────────────────────────────────────────────────────
# 5단계: 배포 완료
# ──────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 배포 완료!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

echo "📊 배포 정보:"
echo "  • 호스트: $TARGET_HOST"
echo "  • 경로: ~/freelang-hybrid"
echo "  • 바이너리: bin/freelang-server"
echo "  • 크기: $BINARY_SIZE"
echo ""

echo "🔗 접속 방법:"
echo "  • HTTP: http://$TARGET_HOST:3000"
echo "  • API: http://$TARGET_HOST:3000/api/health"
echo ""

echo "📝 관리 명령어:"
echo "  • 로그 확인: ssh $TARGET_HOST \"pm2 logs freelang\""
echo "  • 상태 확인: ssh $TARGET_HOST \"pm2 status\""
echo "  • 중지: ssh $TARGET_HOST \"pm2 stop freelang\""
echo "  • 재시작: ssh $TARGET_HOST \"pm2 restart freelang\""
echo ""

echo -e "${GREEN}✅ 배포가 완료되었습니다!${NC}"
echo ""

# ──────────────────────────────────────────────────────────────────────────
# 6단계: 헬스 체크
# ──────────────────────────────────────────────────────────────────────────

echo -e "${YELLOW}🔍 헬스 체크 중...${NC}"
sleep 3

if command -v curl > /dev/null; then
    # 서버 호스트/IP 추출
    SERVER_ADDR=$(echo "$TARGET_HOST" | cut -d@ -f2)

    if curl -s "http://$SERVER_ADDR:3000/api/health" | grep -q "healthy"; then
        echo -e "${GREEN}✅ 서버가 정상적으로 실행 중입니다!${NC}"
    else
        echo -e "${YELLOW}⚠️  서버 응답을 확인할 수 없습니다${NC}"
        echo "   나중에 수동으로 확인해주세요"
    fi
else
    echo -e "${YELLOW}⚠️  curl이 없어서 헬스 체크를 건너뜁니다${NC}"
fi

echo ""
