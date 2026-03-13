#!/bin/bash

# ============================================================================
# FreeLang 3-서버 배포 시스템 - 전체 시작 스크립트
# ============================================================================

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  🚀 FreeLang 3-서버 배포 시스템 시작                     ║"
echo "║     npm 의존성 0 · 완전 독립적 웹 애플리케이션          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# 권한 설정
chmod +x "$ROOT_DIR/server-1-http.sh" 2>/dev/null
chmod +x "$ROOT_DIR/server-2-api.sh" 2>/dev/null
chmod +x "$ROOT_DIR/server-3-proxy.sh" 2>/dev/null

# 포트 확인
echo "🔍 포트 가용성 확인..."
for port in 8000 8001 9000; do
    if netstat -ln 2>/dev/null | grep -q ":$port "; then
        echo "❌ 포트 $port 이미 사용 중"
        exit 1
    fi
done
echo "✅ 포트 8000, 8001, 9000 가용"
echo ""

# 서버 시작
echo "🎯 서버 시작 순서:"
echo "  1️⃣  HTTP 서버 (정적 파일)   - 포트 8000"
echo "  2️⃣  API 서버 (REST API)     - 포트 8001"
echo "  3️⃣  프록시 서버 (로드 밸런서) - 포트 9000"
echo ""

echo "⏳ 서버 시작 중..."
echo ""

# 백그라운드에서 3개 서버 시작
(
    cd "$ROOT_DIR"
    bash server-1-http.sh
) &
HTTP_PID=$!
echo "✅ HTTP 서버 시작됨 (PID: $HTTP_PID)"

sleep 1

(
    cd "$ROOT_DIR"
    bash server-2-api.sh
) &
API_PID=$!
echo "✅ API 서버 시작됨 (PID: $API_PID)"

sleep 1

(
    cd "$ROOT_DIR"
    bash server-3-proxy.sh
) &
PROXY_PID=$!
echo "✅ 프록시 서버 시작됨 (PID: $PROXY_PID)"

sleep 2

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║             ✨ 모든 서버 준비 완료!                      ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

echo "🌐 접속 가능한 주소:"
echo "  1️⃣  HTTP:   http://localhost:8000/blog.html"
echo "  2️⃣  API:    http://localhost:8001/api/posts"
echo "  3️⃣  프록시: http://localhost:9000"
echo ""

echo "📊 실행 중인 프로세스:"
echo "  PID $HTTP_PID  - HTTP 서버"
echo "  PID $API_PID   - API 서버"
echo "  PID $PROXY_PID - 프록시 서버"
echo ""

echo "📚 테스트 명령어:"
echo "  curl http://localhost:8000/blog.html      # 블로그 페이지"
echo "  curl http://localhost:8001/api/posts      # 블로그 목록"
echo "  curl http://localhost:8001/api/health     # 상태 확인"
echo "  curl http://localhost:9000/api/posts      # 프록시 (로드 밸런싱)"
echo ""

echo "🔧 서버 제어:"
echo "  kill $HTTP_PID  # HTTP 서버 중지"
echo "  kill $API_PID   # API 서버 중지"
echo "  kill $PROXY_PID # 프록시 서버 중지"
echo ""

echo "⌨️  Ctrl+C로 모든 서버 종료"
echo ""

# 메인 프로세스 유지
cleanup() {
    echo ""
    echo "🛑 서버 종료 중..."
    kill $HTTP_PID 2>/dev/null
    kill $API_PID 2>/dev/null
    kill $PROXY_PID 2>/dev/null
    echo "✅ 모든 서버 중지됨"
}

trap cleanup EXIT INT TERM

# 프로세스 대기
wait
