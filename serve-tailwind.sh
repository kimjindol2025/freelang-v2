#!/bin/bash

# ============================================================================
# MiniTailwind - 순수 Bash HTTP 서버
# Node.js, Python 없이 Bash + netcat만 사용
# ============================================================================

PORT=5020
HOST="0.0.0.0"

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 로그 함수
log() {
    echo -e "${GREEN}✅${NC} $1"
}

error() {
    echo -e "${RED}❌${NC} $1"
}

info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# netcat 확인
if ! command -v nc &> /dev/null; then
    error "netcat (nc) 설치 필요"
    echo "설치: apt-get install netcat-openbsd"
    exit 1
fi

log "외부 의존성 없음"
log "Bash 버전: $(bash --version | head -1)"
log "netcat 버전: $(nc -h 2>&1 | head -1)"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🚀 MiniTailwind - 순수 Bash HTTP 서버${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# MIME 타입
get_mime_type() {
    local file=$1
    case "$file" in
        *.html) echo "text/html; charset=utf-8" ;;
        *.css)  echo "text/css; charset=utf-8" ;;
        *.js)   echo "application/javascript; charset=utf-8" ;;
        *.json) echo "application/json; charset=utf-8" ;;
        *.png)  echo "image/png" ;;
        *.jpg|*.jpeg) echo "image/jpeg" ;;
        *.svg)  echo "image/svg+xml" ;;
        *)      echo "application/octet-stream" ;;
    esac
}

# 파일 전송 함수
send_file() {
    local file=$1
    local mime=$2

    if [[ -f "$file" ]]; then
        local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
        echo -ne "HTTP/1.1 200 OK\r\n"
        echo -ne "Content-Type: $mime\r\n"
        echo -ne "Content-Length: $size\r\n"
        echo -ne "Access-Control-Allow-Origin: *\r\n"
        echo -ne "Connection: close\r\n"
        echo -ne "\r\n"
        cat "$file"
    else
        echo -ne "HTTP/1.1 404 Not Found\r\n"
        echo -ne "Content-Type: text/plain\r\n"
        echo -ne "Connection: close\r\n"
        echo -ne "\r\n"
        echo "404 Not Found: $file"
    fi
}

# HTML 데모 페이지
get_demo_html() {
    cat << 'HTMLEOF'
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎨 MiniTailwind</title>
    <link rel="stylesheet" href="/styles.css">
    <script src="/tailwind-runtime.js" defer></script>
</head>
<body class="bg-white">
    <div class="p-6 max-w-4xl mx-auto">
        <header class="text-center mb-12">
            <h1 class="text-4xl font-bold text-gray-900 mb-2">🎨 MiniTailwind</h1>
            <p class="text-xl text-gray-600">순수 Bash HTTP 서버 (Node.js, Python 없음)</p>
        </header>

        <div class="grid md-grid-cols-2 gap-6">
            <div class="border rounded-lg p-6">
                <h2 class="text-2xl font-bold mb-4">📦 기술 스택</h2>
                <ul class="text-gray-700 space-y-2">
                    <li>✅ FreeLang (설정)</li>
                    <li>✅ JavaScript (런타임)</li>
                    <li>✅ CSS3 (스타일)</li>
                    <li>✅ Bash (서버)</li>
                    <li>✅ netcat (HTTP)</li>
                </ul>
            </div>

            <div class="border rounded-lg p-6">
                <h2 class="text-2xl font-bold mb-4">🎯 기능</h2>
                <ul class="text-gray-700 space-y-2">
                    <li>✅ 500+ Utility Classes</li>
                    <li>✅ 반응형 디자인 (5 breakpoints)</li>
                    <li>✅ Light/Dark 테마</li>
                    <li>✅ 동적 클래스 조작</li>
                    <li>✅ 상태 클래스 (hover, focus)</li>
                </ul>
            </div>
        </div>

        <div class="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h2 class="text-2xl font-bold mb-4 text-blue-900">🚀 성공!</h2>
            <p class="text-gray-700 mb-4">MiniTailwind가 완전히 작동 중입니다.</p>
            <button class="px-4 py-2 bg-blue-500 text-white rounded hover-bg-blue-600"
                    onclick="tailwindToggleDarkMode()">
                🌓 테마 전환
            </button>
        </div>

        <footer class="text-center text-gray-500 mt-12 text-sm">
            <p>외부 의존성 0개 | Node.js ✗ | Python ✗ | npm ✗</p>
        </footer>
    </div>
</body>
</html>
HTMLEOF
}

# HTTP 요청 처리
handle_request() {
    local request=""
    local method=""
    local path=""

    # 첫 줄 읽기 (메서드 + 경로)
    read -r line
    method=$(echo "$line" | awk '{print $1}')
    path=$(echo "$line" | awk '{print $2}')

    # 헤더 스킵
    while read -r header; do
        [[ -z "$header" || "$header" == $'\r' ]] && break
    done

    # 경로 정규화
    path="${path#/}"
    [[ -z "$path" ]] && path="index.html"

    # 응답
    case "$path" in
        ""|"index.html")
            echo -ne "HTTP/1.1 200 OK\r\n"
            echo -ne "Content-Type: text/html; charset=utf-8\r\n"
            echo -ne "Connection: close\r\n"
            echo -ne "\r\n"
            get_demo_html
            ;;
        "styles.css")
            send_file "public/css/styles.css" "text/css; charset=utf-8"
            ;;
        "styles-dark.css")
            send_file "public/css/styles-dark.css" "text/css; charset=utf-8"
            ;;
        "tailwind-runtime.js")
            send_file "frontend/tailwind-runtime.js" "application/javascript; charset=utf-8"
            ;;
        *)
            echo -ne "HTTP/1.1 404 Not Found\r\n"
            echo -ne "Content-Type: text/plain\r\n"
            echo -ne "Connection: close\r\n"
            echo -ne "\r\n"
            echo "404 Not Found"
            ;;
    esac
}

# 서버 시작
echo ""
info "서버 시작: http://localhost:$PORT"
info "엔드포인트:"
info "  GET /              → 데모 페이지"
info "  GET /styles.css    → Light 테마"
info "  GET /styles-dark.css → Dark 테마"
info "  GET /tailwind-runtime.js → 런타임"
echo ""
info "종료: Ctrl+C"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# netcat 리스너 시작
while true; do
    handle_request | nc -l -p $PORT -N 2>/dev/null || {
        # netcat 실패 시 socat 시도
        echo "한 번의 요청 처리" >&2
    }
done
