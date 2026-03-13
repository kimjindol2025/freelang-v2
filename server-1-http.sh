#!/bin/bash
# ============================================================================
# FreeLang 서버 1: HTTP 정적 파일 서버 (포트 8000)
# ============================================================================

PORT=8000
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  🌐 FreeLang HTTP 서버 (정적 파일)                 ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "📍 포트: $PORT"
echo "📁 루트: $ROOT_DIR"
echo "📄 기본 페이지: blog.html"
echo ""

# 간단한 HTTP 서버 (Python 사용)
if command -v python3 &> /dev/null; then
    echo "✅ Python 3 감지됨"
    echo ""
    echo "🚀 서버 시작..."
    echo "🌐 http://localhost:$PORT/blog.html"
    echo ""
    echo "⌨️  Ctrl+C로 종료"
    echo ""

    cd "$ROOT_DIR"
    python3 -m http.server $PORT --directory "$ROOT_DIR" 2>&1

elif command -v python &> /dev/null; then
    echo "✅ Python 2 감지됨"
    echo ""
    echo "🚀 서버 시작..."
    echo "🌐 http://localhost:$PORT/blog.html"
    echo ""
    echo "⌨️  Ctrl+C로 종료"
    echo ""

    cd "$ROOT_DIR"
    python -m SimpleHTTPServer $PORT 2>&1

else
    echo "❌ Python을 찾을 수 없습니다"
    echo ""
    echo "Bash netcat 대체 방식을 사용합니다..."
    echo ""

    # Bash + netcat 방식
    while true; do
        {
            read -r line
            METHOD=$(echo "$line" | awk '{print $1}')
            PATH=$(echo "$line" | awk '{print $2}')

            [[ "$PATH" == "/" ]] && PATH="/blog.html"
            PATH="${PATH#/}"

            FILE="$ROOT_DIR/$PATH"

            if [[ -f "$FILE" ]]; then
                MIME="text/html"
                [[ "$FILE" =~ \.css$ ]] && MIME="text/css"
                [[ "$FILE" =~ \.js$ ]] && MIME="application/javascript"

                SIZE=$(stat -f%z "$FILE" 2>/dev/null || stat -c%s "$FILE" 2>/dev/null)

                echo -ne "HTTP/1.1 200 OK\r\n"
                echo -ne "Content-Type: $MIME; charset=utf-8\r\n"
                echo -ne "Content-Length: $SIZE\r\n"
                echo -ne "Connection: close\r\n"
                echo -ne "\r\n"
                cat "$FILE"
            else
                echo -ne "HTTP/1.1 404 Not Found\r\n"
                echo -ne "Content-Type: text/html\r\n"
                echo -ne "Connection: close\r\n"
                echo -ne "\r\n"
                echo "<h1>404 Not Found</h1>"
            fi
        } | nc -l -p $PORT -q 1
    done
fi
