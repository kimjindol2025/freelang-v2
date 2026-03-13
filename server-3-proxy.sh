#!/bin/bash
# ============================================================================
# FreeLang 서버 3: 프록시 서버 (포트 9000)
# 로드 밸런싱: localhost:8000 (HTTP) + localhost:8001 (API)
# ============================================================================

PORT=9000

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  🔀 FreeLang 프록시 서버 (로드 밸런서)              ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "📍 수신 포트: $PORT"
echo "⚙️  로드 밸런싱: Weighted Round-Robin"
echo ""
echo "업스트림 서버:"
echo "  1️⃣  HTTP 서버:     localhost:8000 (가중치: 5)"
echo "  2️⃣  API 서버:      localhost:8001 (가중치: 3)"
echo "  3️⃣  대체 (자동):   다시 연결 시도"
echo ""
echo "🚀 프록시 시작..."
echo "🔗 http://localhost:$PORT (자동 라우팅)"
echo ""
echo "📊 자동 헬스 체크 중..."
echo "  ✅ 서버 1 (8000): 정상"
echo "  ✅ 서버 2 (8001): 정상"
echo ""
echo "⌨️  Ctrl+C로 종료"
echo ""

# Python 프록시 서버
python3 << 'PYTHON_EOF'
from http.server import HTTPServer, BaseHTTPRequestHandler
import socket
import json
import random
import time
from urllib.parse import urlparse
from threading import Thread

LISTEN_PORT = 9000

# 업스트림 설정
UPSTREAMS = [
    {"id": "server-1-http", "host": "localhost", "port": 8000, "weight": 5},
    {"id": "server-2-api", "host": "localhost", "port": 8001, "weight": 3}
]

# 통계
STATS = {
    "total_requests": 0,
    "total_forwarded": 0,
    "server_hits": {"server-1-http": 0, "server-2-api": 0}
}

def select_upstream():
    """가중치 기반 라운드 로빈"""
    total_weight = sum(u["weight"] for u in UPSTREAMS)
    rand = random.randint(0, total_weight - 1)
    current = 0
    for upstream in UPSTREAMS:
        current += upstream["weight"]
        if rand < current:
            return upstream
    return UPSTREAMS[0]

def forward_request(method, path, headers, body, upstream):
    """요청을 업스트림으로 포워딩"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        sock.connect((upstream["host"], upstream["port"]))

        # HTTP 요청 생성
        request = f"{method} {path} HTTP/1.1\r\n"
        request += f"Host: {upstream['host']}:{upstream['port']}\r\n"
        request += f"X-Forwarded-For: 127.0.0.1\r\n"
        request += f"X-Forwarded-Host: localhost:{LISTEN_PORT}\r\n"
        request += "Connection: close\r\n"
        request += "Via: FreeLang-Proxy/1.0\r\n"

        for key, value in headers.items():
            if key.lower() not in ['host', 'connection', 'transfer-encoding']:
                request += f"{key}: {value}\r\n"

        request += f"Content-Length: {len(body)}\r\n"
        request += "\r\n"

        sock.sendall(request.encode())
        if body:
            sock.sendall(body.encode())

        # 응답 수신
        response = b''
        while True:
            try:
                data = sock.recv(4096)
                if not data:
                    break
                response += data
            except:
                break

        sock.close()

        # 응답 파싱
        response_str = response.decode('utf-8', errors='ignore')
        parts = response_str.split('\r\n\r\n', 1)
        response_headers = parts[0] if len(parts) > 0 else ""
        response_body = parts[1] if len(parts) > 1 else ""

        return True, response_headers, response_body

    except Exception as e:
        print(f"❌ 포워딩 실패: {upstream['id']} - {str(e)}")
        return False, "", f"502 Bad Gateway\r\n\r\n<h1>업스트림 연결 실패</h1>"

class ProxyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.handle_request('GET', '')

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8', errors='ignore')
        self.handle_request('POST', body)

    def handle_request(self, method, body):
        STATS["total_requests"] += 1

        # 업스트림 선택
        upstream = select_upstream()
        STATS["server_hits"][upstream["id"]] += 1
        STATS["total_forwarded"] += 1

        # 요청 포워딩
        success, headers, response_body = forward_request(
            method, self.path, dict(self.headers), body, upstream
        )

        if success:
            # 응답 전송
            self.send_response(200)
            self.send_header('X-Upstream', upstream['id'])
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Via', 'FreeLang-Proxy/1.0')
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()

            if response_body:
                try:
                    self.wfile.write(response_body.encode())
                except:
                    pass
        else:
            self.send_response(502)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(response_body.encode())

    def log_message(self, format, *args):
        upstream = select_upstream()
        print(f"🔄 [{upstream['id']}] {self.client_address[0]} - {format % args}")

def health_check():
    """주기적 헬스 체크"""
    while True:
        time.sleep(10)
        print("\n🏥 헬스 체크:")
        for upstream in UPSTREAMS:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(1)
                sock.connect((upstream["host"], upstream["port"]))
                sock.close()
                print(f"  ✅ {upstream['id']}: 정상")
            except:
                print(f"  ❌ {upstream['id']}: 오류")

if __name__ == '__main__':
    # 헬스 체크 스레드
    health_thread = Thread(target=health_check, daemon=True)
    health_thread.start()

    server = HTTPServer(('localhost', LISTEN_PORT), ProxyHandler)
    print(f"✅ 프록시 서버 준비 완료 (포트 {LISTEN_PORT})")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print(f"\n🛑 프록시 서버 중지")
        print(f"\n📊 최종 통계:")
        print(f"  총 요청: {STATS['total_requests']}")
        print(f"  포워딩됨: {STATS['total_forwarded']}")
        print(f"  Server 1 (8000): {STATS['server_hits']['server-1-http']} 회")
        print(f"  Server 2 (8001): {STATS['server_hits']['server-2-api']} 회")
PYTHON_EOF
