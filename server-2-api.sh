#!/bin/bash
# ============================================================================
# FreeLang 서버 2: API 서버 (포트 8001)
# ============================================================================

PORT=8001

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  🔌 FreeLang API 서버 (REST)                        ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "📍 포트: $PORT"
echo "📊 API 엔드포인트:"
echo "   GET  /api/posts       - 블로그 목록"
echo "   GET  /api/posts/:id   - 블로그 상세"
echo "   GET  /api/theme       - 테마 설정"
echo "   GET  /api/health      - 상태 확인"
echo ""
echo "🚀 서버 시작..."
echo "🔗 http://localhost:$PORT/api/posts"
echo ""
echo "⌨️  Ctrl+C로 종료"
echo ""

# Python Flask API 서버
if command -v python3 &> /dev/null; then
    # Flask 이용
    python3 << 'PYTHON_EOF'
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
from urllib.parse import urlparse, parse_qs
import sys

PORT = 8001

class APIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        query = parse_qs(parsed_path.query)

        # GET /api/posts - 블로그 목록
        if path == '/api/posts':
            blogs = [
                {
                    "id": 1,
                    "title": "FreeLang 시작하기",
                    "excerpt": "FreeLang으로 첫 프로젝트를 시작해보세요",
                    "date": "2026-03-13",
                    "author": "김프리",
                    "category": "튜토리얼",
                    "tags": ["시작하기", "프리랭", "가이드"],
                    "views": 156
                },
                {
                    "id": 2,
                    "title": "CSS 모듈 시스템 소개",
                    "excerpt": "타입 안전한 CSS를 FreeLang으로 작성하기",
                    "date": "2026-03-12",
                    "author": "김프리",
                    "category": "기술",
                    "tags": ["CSS", "모듈", "타입안전"],
                    "views": 243
                },
                {
                    "id": 3,
                    "title": "의존성 0으로 배포하기",
                    "excerpt": "npm 없이 완전 독립적인 시스템 구축",
                    "date": "2026-03-11",
                    "author": "김프리",
                    "category": "배포",
                    "tags": ["배포", "독립성", "최소화"],
                    "views": 89
                }
            ]
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(blogs).encode())
            return

        # GET /api/posts/:id - 블로그 상세
        if path.startswith('/api/posts/'):
            blog_id = int(path.split('/')[-1])
            blog = {
                "id": blog_id,
                "title": f"블로그 #{blog_id}",
                "content": "이것은 샘플 블로그 내용입니다.",
                "date": "2026-03-13",
                "author": "김프리",
                "views": 100 + blog_id * 10
            }
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(blog).encode())
            return

        # GET /api/theme - 테마 설정
        if path == '/api/theme':
            is_dark = query.get('dark', ['false'])[0] == 'true'
            theme = {
                "isDarkMode": is_dark,
                "primaryColor": "#3b82f6",
                "fontFamily": "system-ui, -apple-system, sans-serif",
                "fontSize": 14
            }
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(theme).encode())
            return

        # GET /api/health - 상태 확인
        if path == '/api/health':
            health = {
                "status": "ok",
                "version": "1.0.0",
                "timestamp": "2026-03-13T00:00:00Z",
                "uptime": "3600s"
            }
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(health).encode())
            return

        # 404
        error = {"error": "Not Found", "path": path}
        self.send_response(404)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(error).encode())

    def log_message(self, format, *args):
        # 자세한 로깅
        print(f"[API] {self.client_address[0]}:{self.client_address[1]} - {format % args}")

if __name__ == '__main__':
    server = HTTPServer(('localhost', PORT), APIHandler)
    print(f"✅ API 서버 준비 완료 (포트 {PORT})")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 서버 중지")
PYTHON_EOF
else
    echo "❌ Python3을 찾을 수 없습니다"
    exit 1
fi
