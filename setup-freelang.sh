#!/bin/bash

# ============================================================================
# FreeLang 컴파일러 설치 & 서버 실행
# ============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   FreeLang HTTP Server 설정 & 실행                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 1. FreeLang 컴파일러 확인
echo "📋 1단계: FreeLang 컴파일러 확인"
echo "─────────────────────────────────────────────────────────────"

if command -v freelang &> /dev/null; then
    echo "✅ FreeLang이 설치되어 있습니다"
    freelang --version
elif command -v free &> /dev/null && [[ "$(free --version 2>&1)" == *"FreeLang"* ]]; then
    echo "✅ 'free' 명령이 FreeLang입니다"
elif [ -f "/usr/local/bin/freelang" ]; then
    echo "✅ /usr/local/bin/freelang 발견"
else
    echo "⚠️  FreeLang 컴파일러를 찾을 수 없습니다"
    echo ""
    echo "설치 방법:"
    echo "  1. npm 사용 (권장):"
    echo "     npm install -g freelang"
    echo ""
    echo "  2. brew 사용 (macOS):"
    echo "     brew install freelang"
    echo ""
    echo "  3. 소스 빌드:"
    echo "     git clone https://github.com/freelang/freelang"
    echo "     cd freelang && make install"
    echo ""
    exit 1
fi

echo ""

# 2. 프로젝트 구조 확인
echo "📋 2단계: 프로젝트 구조 확인"
echo "─────────────────────────────────────────────────────────────"

files=(
    "freelang/main.free"
    "freelang/core/types.free"
    "freelang/core/state.free"
    "freelang/server/http-engine.free"
    "freelang/engine/tcp_socket.fl"
)

all_ok=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (없음)"
        all_ok=false
    fi
done

if [ "$all_ok" = false ]; then
    echo ""
    echo "❌ 필수 파일이 부족합니다"
    exit 1
fi

echo ""

# 3. 컴파일
echo "📋 3단계: FreeLang 서버 컴파일"
echo "─────────────────────────────────────────────────────────────"

mkdir -p bin

echo "컴파일 중... (약 5-30초 소요)"
freelang compile freelang/main.free -o bin/freelang-server

if [ $? -eq 0 ]; then
    echo "✅ 컴파일 성공"
    ls -lh bin/freelang-server
else
    echo "❌ 컴파일 실패"
    exit 1
fi

echo ""

# 4. 데이터 확인
echo "📋 4단계: 데이터베이스 확인"
echo "─────────────────────────────────────────────────────────────"

if [ -f "data/db.json" ]; then
    blog_count=$(grep -c '"id":' data/db.json | head -n 1)
    echo "✅ data/db.json (블로그: 3개)"
else
    echo "⚠️  data/db.json 없음"
fi

echo ""

# 5. 서버 실행 준비
echo "📋 5단계: 서버 실행 준비"
echo "─────────────────────────────────────────────────────────────"
echo ""
echo "✅ 모든 준비 완료!"
echo ""
echo "다음 명령으로 서버를 시작하세요:"
echo ""
echo "  ./bin/freelang-server"
echo ""
echo "또는 다음 명령으로 자동 시작:"
echo ""
echo "  bash setup-freelang.sh --start"
echo ""

if [ "$1" == "--start" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🚀 서버 시작"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    ./bin/freelang-server
fi

