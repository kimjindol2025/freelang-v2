#!/usr/bin/env node
// ============================================================================
// FreeLang HTTP Server (Node.js 테스트 버전)
// 로컬 개발/테스트용
// ============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5020;
const HOST = '0.0.0.0';

// ──────────────────────────────────────────────────────────────────────────
// 상태 관리
// ──────────────────────────────────────────────────────────────────────────

let state = {
  counter: { id: 1, count: 0, name: 'Main Counter' },
  todos: [],
  blogs: [],
  nextBlogId: 1,
  events: []
};

// DB 파일
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const DATA_DIR = path.join(__dirname, 'data');

// ──────────────────────────────────────────────────────────────────────────
// 데이터베이스 로드/저장
// ──────────────────────────────────────────────────────────────────────────

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      state = { ...state, ...data };
      console.log('✓ 데이터베이스 로드 완료');
    }
  } catch (err) {
    console.log('⚠ 새 데이터베이스 생성:', err.message);
  }
}

function saveDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('❌ DB 저장 실패:', err.message);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Counter API
// ──────────────────────────────────────────────────────────────────────────

function handleCounterAPI(method, path, req, res) {
  if (method === 'GET' && path === '/api/counter') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      data: state.counter
    }));
  } else if (method === 'POST' && path === '/api/counter/increment') {
    state.counter.count++;
    saveDatabase();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      data: state.counter
    }));
  } else if (method === 'POST' && path === '/api/counter/decrement') {
    state.counter.count--;
    saveDatabase();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      data: state.counter
    }));
  } else if (method === 'POST' && path === '/api/counter/reset') {
    state.counter.count = 0;
    saveDatabase();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      data: state.counter
    }));
  } else {
    return false;
  }
  return true;
}

// ──────────────────────────────────────────────────────────────────────────
// Health Check
// ──────────────────────────────────────────────────────────────────────────

function handleHealth(method, path, req, res) {
  if (method === 'GET' && path === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        counters: 1,
        todos: state.todos.length,
        blogs: state.blogs.length,
        healthy: true
      }
    }));
    return true;
  }
  return false;
}

// ──────────────────────────────────────────────────────────────────────────
// 정적 파일
// ──────────────────────────────────────────────────────────────────────────

function getIndexHtml() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>FreeLang + JS 통합 예제</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 40px;
            max-width: 500px;
            width: 100%;
        }

        h1 {
            color: #333;
            margin-bottom: 30px;
            text-align: center;
            font-size: 2em;
        }

        .counter-display {
            font-size: 3em;
            font-weight: bold;
            text-align: center;
            color: #667eea;
            margin: 30px 0;
            font-family: 'Monaco', monospace;
        }

        .button-group {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin: 30px 0;
        }

        button {
            padding: 12px 20px;
            font-size: 1em;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
        }

        .btn-primary {
            background: #667eea;
            color: white;
            grid-column: 1 / -1;
        }

        .btn-primary:hover {
            background: #5568d3;
            transform: translateY(-2px);
        }

        .btn-secondary {
            background: #f0f0f0;
            color: #333;
        }

        .btn-secondary:hover {
            background: #e0e0e0;
        }

        .stats {
            margin-top: 30px;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
        }

        .stat-item {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            font-size: 0.95em;
        }

        .stat-label {
            color: #666;
        }

        .stat-value {
            font-weight: bold;
            color: #667eea;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 FreeLang + JS</h1>

        <div class="counter-display" id="counter">0</div>

        <div class="button-group">
            <button class="btn-primary" id="btn-increment">+1 증가</button>
            <button class="btn-secondary" id="btn-decrement">-1 감소</button>
            <button class="btn-secondary" id="btn-reset">초기화</button>
        </div>

        <div class="stats">
            <div class="stat-item">
                <span class="stat-label">상태:</span>
                <span class="stat-value" id="status">준비됨</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">요청:</span>
                <span class="stat-value" id="requests">0</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">응답시간:</span>
                <span class="stat-value" id="response-time">-</span>
            </div>
        </div>
    </div>

    <script>
        let requestCount = 0;

        const freelang = {
            async request(method, path, data) {
                const startTime = performance.now();
                try {
                    const options = {
                        method: method,
                        headers: { 'Content-Type': 'application/json' }
                    };

                    if (data && method !== 'GET') {
                        options.body = JSON.stringify(data);
                    }

                    const response = await fetch(path, options);
                    const result = await response.json();

                    const duration = (performance.now() - startTime).toFixed(2);
                    console.log(\`[\${method}] \${path} - \${duration}ms\`);

                    return result;
                } catch (error) {
                    console.error('Request error:', error);
                    return { status: 'error', message: error.message };
                }
            },

            counter: {
                async get() {
                    return freelang.request('GET', '/api/counter');
                },
                async increment() {
                    return freelang.request('POST', '/api/counter/increment');
                },
                async decrement() {
                    return freelang.request('POST', '/api/counter/decrement');
                },
                async reset() {
                    return freelang.request('POST', '/api/counter/reset');
                }
            }
        };

        async function updateCounter() {
            const result = await freelang.counter.get();
            if (result.status === 'success') {
                document.getElementById('counter').innerText = result.data.count;
            }
        }

        async function handleIncrement() {
            const result = await freelang.counter.increment();
            if (result.status === 'success') {
                updateCounter();
                updateStats('증가됨');
            }
        }

        async function handleDecrement() {
            const result = await freelang.counter.decrement();
            if (result.status === 'success') {
                updateCounter();
                updateStats('감소됨');
            }
        }

        async function handleReset() {
            const result = await freelang.counter.reset();
            if (result.status === 'success') {
                updateCounter();
                updateStats('초기화됨');
            }
        }

        function updateStats(action) {
            requestCount++;
            document.getElementById('requests').innerText = requestCount;
            document.getElementById('status').innerText = action;
            document.getElementById('response-time').innerText = 'OK';
        }

        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('btn-increment').addEventListener('click', handleIncrement);
            document.getElementById('btn-decrement').addEventListener('click', handleDecrement);
            document.getElementById('btn-reset').addEventListener('click', handleReset);

            updateCounter();
            document.getElementById('status').innerText = '준비됨';
        });
    </script>
</body>
</html>`;
}

function getBlogHtml() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Blog - FreeLang</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 40px 20px; }
        .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        h1 { color: #333; margin-bottom: 30px; text-align: center; }
        .blog-item { padding: 20px; margin: 20px 0; background: #f9f9f9; border-radius: 8px; border-left: 4px solid #667eea; }
        .blog-title { font-size: 1.3em; color: #667eea; font-weight: bold; margin-bottom: 8px; }
        .blog-meta { font-size: 0.9em; color: #999; margin-bottom: 8px; }
        .blog-summary { color: #555; line-height: 1.6; }
        a { color: #667eea; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📝 FreeLang 블로그</h1>
        <p style="text-align: center; color: #999; margin-bottom: 30px;">아직 발행된 블로그가 없습니다.</p>
        <div style="text-align: center;">
            <a href="/">← 홈으로</a>
        </div>
    </div>
</body>
</html>`;
}

// ──────────────────────────────────────────────────────────────────────────
// 메인 서버
// ──────────────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const method = req.method;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 정적 파일
  if (method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getIndexHtml());
    return;
  }

  if (method === 'GET' && pathname === '/blog.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getBlogHtml());
    return;
  }

  // API 라우팅
  if (handleCounterAPI(method, pathname, req, res)) {
    return;
  }

  if (handleHealth(method, pathname, req, res)) {
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'error',
    statusCode: 404,
    message: 'Not Found'
  }));
});

// ──────────────────────────────────────────────────────────────────────────
// 서버 시작
// ──────────────────────────────────────────────────────────────────────────

loadDatabase();

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 FreeLang HTTP Server 시작');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log(`📍 주소: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`🔗 홈: http://localhost:${PORT}`);
  console.log(`📝 블로그: http://localhost:${PORT}/blog.html`);
  console.log(`💻 API: http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 명령어:');
  console.log('  Ctrl+C: 서버 중지');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
});

process.on('SIGINT', () => {
  console.log('');
  console.log('🛑 서버 종료 중...');
  saveDatabase();
  process.exit(0);
});
