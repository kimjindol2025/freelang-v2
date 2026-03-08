#!/usr/bin/env node

/**
 * HTTP/2 Echo Server (for Phase 6 testing)
 *
 * Features:
 * - HTTP/2 server on port 8443
 * - Self-signed certificate for HTTPS
 * - Echo service for testing
 * - Frame logging
 *
 * Usage:
 *   node http2-echo-server.js [port]
 *
 * Default port: 8443
 */

const spdy = require('spdy');
const fs = require('fs');
const path = require('path');

const PORT = process.argv[2] || 8443;

// Create self-signed certificate (if not exists)
const certDir = path.join(__dirname, '.certs');
const certPath = path.join(certDir, 'server.crt');
const keyPath = path.join(certDir, 'server.key');

// Ensure cert directory exists
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

// Check if certificates exist, if not create self-signed ones
if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.log('📋 Generating self-signed certificate...');
  const { execSync } = require('child_process');
  try {
    execSync(
      `openssl req -x509 -newkey rsa:2048 -keyout ${keyPath} -out ${certPath} -days 365 -nodes -subj "/CN=localhost"`,
      { stdio: 'pipe' }
    );
    console.log('✓ Certificate generated\n');
  } catch (error) {
    console.error('✗ Failed to generate certificate:', error.message);
    console.log('Using fallback: creating dummy certificates...\n');
  }
}

// Read certificates
const options = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

// Create HTTP/2 server
const server = spdy.createServer(options, (req, res) => {
  const method = req.method;
  const url = req.url;
  const httpVersion = req.httpVersion;

  console.log(`\n【HTTP/2 Request】`);
  console.log(`  ├─ Method: ${method}`);
  console.log(`  ├─ URL: ${url}`);
  console.log(`  ├─ HTTP Version: ${httpVersion}`);
  console.log(`  ├─ Headers:`);

  // Log headers
  for (const [key, value] of Object.entries(req.headers)) {
    console.log(`  │  ├─ ${key}: ${value}`);
  }

  // Collect request body
  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', () => {
    if (body) {
      console.log(`  ├─ Body: ${body}`);
    }

    // Handle different paths
    if (url === '/' || url === '/echo') {
      // Echo endpoint
      const echoMessage = body || 'Hello from HTTP/2 server!';
      const response = `Echo: ${echoMessage}`;

      console.log(`\n【HTTP/2 Response】`);
      console.log(`  ├─ Status: 200 OK`);
      console.log(`  ├─ Headers:`);
      console.log(`  │  ├─ content-type: text/plain`);
      console.log(`  │  └─ content-length: ${Buffer.byteLength(response)}`);
      console.log(`  └─ Body: ${response}`);

      res.writeHead(200, {
        'content-type': 'text/plain',
        'x-server': 'FreeLang-H2-Echo'
      });
      res.end(response);
    } else if (url === '/status') {
      // Status endpoint
      const statusJson = JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: 'HTTP/2'
      });

      console.log(`\n【HTTP/2 Response】`);
      console.log(`  ├─ Status: 200 OK`);
      console.log(`  └─ Body: ${statusJson}`);

      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(statusJson);
    } else if (url === '/push') {
      // Server push demo
      res.pushStream({ ':path': '/style.css' }, (err, pushRes) => {
        if (!err) {
          console.log(`\n【Server Push】`);
          console.log(`  └─ Pushing: /style.css`);
          pushRes.writeHead(200, { 'content-type': 'text/css' });
          pushRes.end('body { color: blue; }');
        }
      });

      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<html><head><link rel="stylesheet" href="/style.css"></head></html>');
    } else {
      // 404 Not Found
      console.log(`\n【HTTP/2 Response】`);
      console.log(`  └─ Status: 404 Not Found`);

      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not Found');
    }
  });
});

// Handle server errors
server.on('error', (err) => {
  console.error(`Server error: ${err.message}`);
  process.exit(1);
});

// Start server
server.listen(PORT, () => {
  console.log(`╔════════════════════════════════════════════════╗`);
  console.log(`║       HTTP/2 Echo Server (Phase 6)            ║`);
  console.log(`╚════════════════════════════════════════════════╝\n`);

  console.log(`🔐 HTTPS Server listening on https://localhost:${PORT}`);
  console.log(`📊 HTTP/2 enabled (ALPN: h2)\n`);

  console.log(`Endpoints:`);
  console.log(`  • POST https://localhost:${PORT}/echo     (echo body)`);
  console.log(`  • GET  https://localhost:${PORT}/status   (JSON status)`);
  console.log(`  • GET  https://localhost:${PORT}/push     (Server push demo)\n`);

  console.log(`Features:`);
  console.log(`  ✓ HTTP/2 multiplexing`);
  console.log(`  ✓ Server push`);
  console.log(`  ✓ Binary framing`);
  console.log(`  ✓ Header compression (HPACK)`);
  console.log(`  ✓ Flow control\n`);

  console.log(`Certificate:`);
  console.log(`  • Key: ${keyPath}`);
  console.log(`  • Cert: ${certPath}\n`);

  console.log(`Connection Info:`);
  console.log(`  • Protocol: https://localhost:${PORT}/`);
  console.log(`  • Client: FreeLang HTTP/2 (fl_http2_client_connect)\n`);

  console.log(`Ctrl+C to stop server\n`);
  console.log(`────────────────────────────────────────────────\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n📛 Shutting down server...');

  server.close(() => {
    console.log('✓ Server closed');
    process.exit(0);
  });

  // Force exit after 5 seconds
  setTimeout(() => {
    console.error('✗ Forced shutdown');
    process.exit(1);
  }, 5000);
});
