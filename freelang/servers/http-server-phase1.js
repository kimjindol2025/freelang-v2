#!/usr/bin/env node

/**
 * FreeLang Production System - Phase 1: HTTP Server
 * Pure Node.js implementation with real TCP socket operations
 * Status: 실제 작동하는 완전한 HTTP 서버
 */

const net = require('net');
const fs = require('fs');
const path = require('path');
const url = require('url');

// ============================================================================
// HTTP 서버 설정
// ============================================================================

const HTTP_SERVER_CONFIG = {
  host: '127.0.0.1',
  port: 8000,
  maxConnections: 128,
  timeout: 30000,
  staticRoot: './public',
};

// ============================================================================
// TCP 소켓 기반 HTTP 서버
// ============================================================================

let serverStats = {
  requestCount: 0,
  activeConnections: 0,
  totalBytes: 0,
  startTime: Date.now(),
};

function createHTTPServer() {
  const server = net.createServer();

  server.on('connection', (socket) => {
    serverStats.activeConnections++;
    const clientInfo = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`📍 클라이언트 연결: ${clientInfo} (활성: ${serverStats.activeConnections})`);

    // 1️⃣ 소켓 데이터 수신
    let rawRequest = '';
    socket.on('data', (buffer) => {
      rawRequest += buffer.toString();
      serverStats.totalBytes += buffer.length;

      // 2️⃣ HTTP 요청 완전성 확인
      if (rawRequest.includes('\r\n\r\n')) {
        handleHTTPRequest(socket, rawRequest, clientInfo);
        rawRequest = '';
      }
    });

    // 3️⃣ 에러 처리
    socket.on('error', (err) => {
      console.error(`❌ 소켓 에러 (${clientInfo}): ${err.message}`);
      socket.destroy();
    });

    // 4️⃣ 연결 종료
    socket.on('end', () => {
      serverStats.activeConnections--;
      console.log(`✅ 연결 종료: ${clientInfo} (남은 연결: ${serverStats.activeConnections})`);
    });

    // Timeout 설정
    socket.setTimeout(HTTP_SERVER_CONFIG.timeout);
  });

  server.on('error', (err) => {
    console.error(`❌ 서버 에러: ${err.message}`);
  });

  return server;
}

// ============================================================================
// HTTP 요청 처리
// ============================================================================

function handleHTTPRequest(socket, rawRequest, clientInfo) {
  serverStats.requestCount++;

  // 5️⃣ HTTP 요청 파싱
  const lines = rawRequest.split('\r\n');
  const requestLine = lines[0];

  if (!requestLine) {
    sendErrorResponse(socket, 400, 'Bad Request');
    return;
  }

  const [method, pathname, httpVersion] = requestLine.split(' ');

  // 6️⃣ 경로 파싱 (query string 제거)
  const urlObj = new URL(pathname, `http://${HTTP_SERVER_CONFIG.host}`);
  const path_only = urlObj.pathname;
  const query = urlObj.search;

  console.log(`📨 요청 #${serverStats.requestCount}: ${method} ${path_only}${query} (${clientInfo})`);

  // 7️⃣ 헤더 파싱
  const headers = {};
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '') break;
    const [key, value] = lines[i].split(': ');
    if (key) headers[key.toLowerCase()] = value;
  }

  // 8️⃣ 요청 처리
  if (method === 'GET') {
    handleGETRequest(socket, path_only, headers, clientInfo);
  } else if (method === 'POST') {
    handlePOSTRequest(socket, path_only, headers, rawRequest, clientInfo);
  } else {
    sendErrorResponse(socket, 405, 'Method Not Allowed');
  }
}

function handleGETRequest(socket, pathname, headers, clientInfo) {
  // 정적 파일 서빙
  if (pathname === '/' || pathname === '/index.html') {
    serveStaticFile(socket, './public/index.html', clientInfo);
  } else if (pathname === '/status') {
    sendJSONResponse(socket, 200, getServerStatus());
  } else if (pathname.startsWith('/api/')) {
    handleAPIRequest(socket, pathname, 'GET', {}, clientInfo);
  } else {
    serveStaticFile(socket, `./public${pathname}`, clientInfo);
  }
}

function handlePOSTRequest(socket, pathname, headers, rawRequest, clientInfo) {
  // 요청 바디 추출
  const parts = rawRequest.split('\r\n\r\n');
  const body = parts[1] || '';

  if (pathname.startsWith('/api/')) {
    const parsedBody = tryParseJSON(body);
    handleAPIRequest(socket, pathname, 'POST', parsedBody, clientInfo);
  } else {
    sendErrorResponse(socket, 405, 'POST Not Allowed');
  }
}

// ============================================================================
// 파일 서빙
// ============================================================================

function serveStaticFile(socket, filepath, clientInfo) {
  // 9️⃣ 보안 검사: Path Traversal 방지
  const resolvedPath = path.resolve(filepath);
  const rootPath = path.resolve('./public');

  if (!resolvedPath.startsWith(rootPath)) {
    console.warn(`🚫 Path Traversal 시도: ${filepath} (${clientInfo})`);
    sendErrorResponse(socket, 403, 'Forbidden');
    return;
  }

  // 1️⃣0️⃣ 파일 읽기
  fs.readFile(resolvedPath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        sendErrorResponse(socket, 404, 'Not Found');
      } else if (err.code === 'EISDIR') {
        // 디렉토리면 index.html 시도
        serveStaticFile(socket, filepath + '/index.html', clientInfo);
      } else {
        sendErrorResponse(socket, 500, 'Internal Server Error');
      }
      return;
    }

    const ext = path.extname(resolvedPath);
    const contentType = getContentType(ext);
    sendResponse(socket, 200, 'OK', contentType, data.toString());
    console.log(`✅ 응답: 200 (${Math.round(data.length / 1024)}KB)`);
  });
}

// ============================================================================
// API 요청 처리
// ============================================================================

function handleAPIRequest(socket, pathname, method, body, clientInfo) {
  if (pathname === '/api/hello') {
    sendJSONResponse(socket, 200, {
      message: 'Hello from Phase 1 HTTP Server',
      timestamp: new Date().toISOString(),
      method: method
    });
    console.log(`✅ 응답: 200 /api/hello`);
  } else if (pathname === '/api/echo') {
    sendJSONResponse(socket, 200, {
      received: body,
      echo: 'Echo Phase 1 working'
    });
    console.log(`✅ 응답: 200 /api/echo`);
  } else {
    sendErrorResponse(socket, 404, 'API Endpoint Not Found');
  }
}

// ============================================================================
// HTTP 응답 생성
// ============================================================================

function sendResponse(socket, statusCode, statusText, contentType, body) {
  const headers = [
    `HTTP/1.1 ${statusCode} ${statusText}`,
    `Content-Type: ${contentType}`,
    `Content-Length: ${Buffer.byteLength(body)}`,
    'Connection: close',
    'Access-Control-Allow-Origin: *',
    ''
  ];

  const httpResponse = headers.join('\r\n') + '\r\n' + body;

  // 1️⃣1️⃣ 응답 전송
  socket.write(httpResponse);
  socket.end();
}

function sendJSONResponse(socket, statusCode, data) {
  const body = JSON.stringify(data);
  sendResponse(socket, statusCode, 'OK', 'application/json', body);
}

function sendErrorResponse(socket, statusCode, message) {
  const errorBody = {
    error: message,
    statusCode: statusCode,
    timestamp: new Date().toISOString()
  };
  sendJSONResponse(socket, statusCode, errorBody);
  console.log(`❌ 응답: ${statusCode} ${message}`);
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

function getContentType(ext) {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain',
  };
  return types[ext] || 'application/octet-stream';
}

function tryParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return { raw: str };
  }
}

function getServerStatus() {
  const uptime = Math.floor((Date.now() - serverStats.startTime) / 1000);
  return {
    status: 'running',
    uptime: uptime,
    totalRequests: serverStats.requestCount,
    activeConnections: serverStats.activeConnections,
    totalBytesReceived: serverStats.totalBytes,
    host: HTTP_SERVER_CONFIG.host,
    port: HTTP_SERVER_CONFIG.port
  };
}

// ============================================================================
// 서버 시작
// ============================================================================

function startServer() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  🌐 FreeLang Production System - Phase 1 HTTP Server ║');
  console.log('║  Real TCP Socket Operations (Node.js)                 ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');

  const server = createHTTPServer();

  server.listen(HTTP_SERVER_CONFIG.port, HTTP_SERVER_CONFIG.host, () => {
    console.log(`✅ 서버 시작됨`);
    console.log(`📍 주소: http://${HTTP_SERVER_CONFIG.host}:${HTTP_SERVER_CONFIG.port}`);
    console.log(`⚙️  백로그: ${HTTP_SERVER_CONFIG.maxConnections}`);
    console.log(`⏱️  타임아웃: ${HTTP_SERVER_CONFIG.timeout}ms`);
    console.log('');
    console.log('📚 엔드포인트:');
    console.log('  GET  /               - 홈페이지');
    console.log('  GET  /status         - 서버 상태');
    console.log('  GET  /api/hello      - API 테스트');
    console.log('  POST /api/echo       - Echo 테스트');
    console.log('');
    console.log('⌨️  Ctrl+C로 종료\n');
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 서버 종료 중...');
    server.close(() => {
      console.log('✅ 서버 종료됨');
      console.log(`📊 최종 통계:`);
      console.log(`   - 총 요청: ${serverStats.requestCount}`);
      console.log(`   - 총 바이트: ${serverStats.totalBytes}`);
      process.exit(0);
    });
  });

  return server;
}

// ============================================================================
// 시작
// ============================================================================

if (require.main === module) {
  startServer();
}

module.exports = { createHTTPServer, handleHTTPRequest };
