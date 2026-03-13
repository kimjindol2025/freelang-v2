#!/usr/bin/env node

/**
 * FreeLang Production System - Phase 1-2: HTTP Server + Database
 * Real TCP Sockets + Database CRUD
 */

const net = require('net');
const fs = require('fs');
const path = require('path');
const url = require('url');
const db = require('../core/database');

const HTTP_SERVER_CONFIG = {
  host: '127.0.0.1',
  port: 8000,
  maxConnections: 128,
  timeout: 30000,
};

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

    let rawRequest = '';
    socket.on('data', (buffer) => {
      rawRequest += buffer.toString();
      serverStats.totalBytes += buffer.length;

      if (rawRequest.includes('\r\n\r\n')) {
        handleHTTPRequest(socket, rawRequest, clientInfo);
        rawRequest = '';
      }
    });

    socket.on('error', (err) => {
      console.error(`❌ 소켓 에러: ${err.message}`);
      socket.destroy();
    });

    socket.on('end', () => {
      serverStats.activeConnections--;
    });

    socket.setTimeout(HTTP_SERVER_CONFIG.timeout);
  });

  return server;
}

function handleHTTPRequest(socket, rawRequest, clientInfo) {
  serverStats.requestCount++;

  const lines = rawRequest.split('\r\n');
  const requestLine = lines[0];

  if (!requestLine) {
    sendErrorResponse(socket, 400, 'Bad Request');
    return;
  }

  const [method, pathname, httpVersion] = requestLine.split(' ');

  const urlObj = new URL(pathname, `http://${HTTP_SERVER_CONFIG.host}`);
  const path_only = urlObj.pathname;

  console.log(`📨 요청 #${serverStats.requestCount}: ${method} ${path_only} (${clientInfo})`);

  const headers = {};
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '') break;
    const [key, value] = lines[i].split(': ');
    if (key) headers[key.toLowerCase()] = value;
  }

  if (method === 'GET') {
    handleGETRequest(socket, path_only, headers, clientInfo);
  } else if (method === 'POST') {
    const parts = rawRequest.split('\r\n\r\n');
    const body = parts[1] || '';
    handlePOSTRequest(socket, path_only, headers, body, clientInfo);
  } else if (method === 'PUT') {
    const parts = rawRequest.split('\r\n\r\n');
    const body = parts[1] || '';
    handlePUTRequest(socket, path_only, headers, body, clientInfo);
  } else if (method === 'DELETE') {
    handleDELETERequest(socket, path_only, clientInfo);
  } else {
    sendErrorResponse(socket, 405, 'Method Not Allowed');
  }
}

function handleGETRequest(socket, pathname, headers, clientInfo) {
  if (pathname === '/' || pathname === '/index.html') {
    serveStaticFile(socket, './public/index.html', clientInfo);
  } else if (pathname === '/status') {
    const status = {
      server: {
        uptime: Math.floor((Date.now() - serverStats.startTime) / 1000),
        totalRequests: serverStats.requestCount,
        activeConnections: serverStats.activeConnections,
      },
      database: db.getStatus()
    };
    sendJSONResponse(socket, 200, status);
  } else if (pathname === '/api/blogs') {
    // 모든 블로그 조회 (Phase 2: SELECT all)
    const blogs = db.getAllBlogs();
    sendJSONResponse(socket, 200, { blogs, count: blogs.length });
  } else if (pathname.startsWith('/api/blogs/')) {
    // 특정 블로그 조회 (Phase 2: SELECT by ID)
    const id = pathname.split('/')[3];
    const blog = db.getBlog(id);
    if (blog) {
      sendJSONResponse(socket, 200, blog);
    } else {
      sendErrorResponse(socket, 404, 'Blog Not Found');
    }
  } else if (pathname.startsWith('/api/search?q=')) {
    // 블로그 검색
    const query = decodeURIComponent(pathname.split('q=')[1]);
    const results = db.searchBlogs(query);
    sendJSONResponse(socket, 200, { query, results, count: results.length });
  } else {
    serveStaticFile(socket, `./public${pathname}`, clientInfo);
  }
}

function handlePOSTRequest(socket, pathname, headers, body, clientInfo) {
  if (pathname === '/api/blogs') {
    // 블로그 생성 (Phase 2: INSERT)
    const data = tryParseJSON(body);
    if (!data.title || !data.content) {
      sendErrorResponse(socket, 400, 'Missing title or content');
      return;
    }

    const blog = db.insertBlog(
      data.title,
      data.content,
      data.author || 'Anonymous'
    );

    if (blog) {
      sendJSONResponse(socket, 201, {
        message: 'Blog created',
        blog
      });
    } else {
      sendErrorResponse(socket, 500, 'Failed to create blog');
    }
  } else {
    sendErrorResponse(socket, 404, 'Not Found');
  }
}

function handlePUTRequest(socket, pathname, headers, body, clientInfo) {
  if (pathname.startsWith('/api/blogs/')) {
    // 블로그 수정 (Phase 2: UPDATE)
    const id = pathname.split('/')[3];
    const data = tryParseJSON(body);

    const blog = db.updateBlog(id, data);
    if (blog) {
      sendJSONResponse(socket, 200, {
        message: 'Blog updated',
        blog
      });
    } else {
      sendErrorResponse(socket, 404, 'Blog Not Found');
    }
  } else {
    sendErrorResponse(socket, 404, 'Not Found');
  }
}

function handleDELETERequest(socket, pathname, clientInfo) {
  if (pathname.startsWith('/api/blogs/')) {
    // 블로그 삭제 (Phase 2: DELETE)
    const id = pathname.split('/')[3];
    const success = db.deleteBlog(id);

    if (success) {
      sendJSONResponse(socket, 200, {
        message: 'Blog deleted',
        id
      });
    } else {
      sendErrorResponse(socket, 404, 'Blog Not Found');
    }
  } else {
    sendErrorResponse(socket, 404, 'Not Found');
  }
}

function serveStaticFile(socket, filepath, clientInfo) {
  const resolvedPath = path.resolve(filepath);
  const rootPath = path.resolve('./public');

  if (!resolvedPath.startsWith(rootPath)) {
    sendErrorResponse(socket, 403, 'Forbidden');
    return;
  }

  fs.readFile(resolvedPath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        sendErrorResponse(socket, 404, 'Not Found');
      } else if (err.code === 'EISDIR') {
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

function sendResponse(socket, statusCode, statusText, contentType, body) {
  const headers = [
    `HTTP/1.1 ${statusCode} ${statusText}`,
    `Content-Type: ${contentType}`,
    `Content-Length: ${Buffer.byteLength(body)}`,
    'Connection: close',
    'Access-Control-Allow-Origin: *',
    'Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers: Content-Type',
    ''
  ];

  const httpResponse = headers.join('\r\n') + '\r\n' + body;
  socket.write(httpResponse);
  socket.end();
}

function sendJSONResponse(socket, statusCode, data) {
  const body = JSON.stringify(data);
  sendResponse(socket, statusCode, statusCode === 201 ? 'Created' : 'OK', 'application/json', body);
}

function sendErrorResponse(socket, statusCode, message) {
  const errorBody = {
    error: message,
    statusCode: statusCode,
    timestamp: new Date().toISOString()
  };
  sendJSONResponse(socket, statusCode, errorBody);
}

function getContentType(ext) {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
  };
  return types[ext] || 'application/octet-stream';
}

function tryParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return {};
  }
}

function startServer() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  🌐 FreeLang Production System - Phase 1-2         ║');
  console.log('║  HTTP Server + Database CRUD Operations            ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');

  // Phase 2: 데이터베이스 연결
  if (!db.connect()) {
    console.error('❌ 데이터베이스 연결 실패');
    process.exit(1);
  }

  // 초기 데이터 생성
  db.seedData();

  const server = createHTTPServer();

  server.listen(HTTP_SERVER_CONFIG.port, HTTP_SERVER_CONFIG.host, () => {
    console.log(`✅ 서버 시작됨`);
    console.log(`📍 주소: http://${HTTP_SERVER_CONFIG.host}:${HTTP_SERVER_CONFIG.port}`);
    console.log('');
    console.log('📚 API 엔드포인트:');
    console.log('  GET    /api/blogs              - 모든 블로그 조회');
    console.log('  GET    /api/blogs/:id          - 특정 블로그 조회');
    console.log('  POST   /api/blogs              - 블로그 생성');
    console.log('  PUT    /api/blogs/:id          - 블로그 수정');
    console.log('  DELETE /api/blogs/:id          - 블로그 삭제');
    console.log('  GET    /api/search?q=keyword   - 블로그 검색');
    console.log('  GET    /status                 - 서버 상태');
    console.log('');
    console.log('⌨️  Ctrl+C로 종료\n');
  });

  process.on('SIGINT', () => {
    console.log('\n\n🛑 서버 종료 중...');
    server.close(() => {
      console.log('✅ 서버 종료됨');
      console.log(`📊 최종 통계:`);
      console.log(`   - 총 요청: ${serverStats.requestCount}`);
      console.log(`   - 활성 연결: ${serverStats.activeConnections}`);
      process.exit(0);
    });
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { createHTTPServer, handleHTTPRequest };
