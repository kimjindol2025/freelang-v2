#!/usr/bin/env node

/**
 * WebSocket Echo Server (for Phase 5.1 testing)
 *
 * Usage:
 *   node ws-echo-server.js [port]
 *
 * Default port: 9001
 */

const WebSocket = require('ws');
const http = require('http');

const PORT = process.argv[2] || 9001;

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket Echo Server\n');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

let clientCounter = 0;

wss.on('connection', (ws, req) => {
  const clientId = ++clientCounter;
  const clientIp = req.socket.remoteAddress;

  console.log(`\n【Connection】Client #${clientId} connected from ${clientIp}`);
  console.log(`  ├─ URL: ${req.url}`);
  console.log(`  ├─ Headers: ${JSON.stringify(req.headers)}`);
  console.log(`  └─ State: OPEN`);

  // Handle incoming messages
  ws.on('message', (data, isBinary) => {
    const message = isBinary ? data : data.toString();
    console.log(`\n【Message】Client #${clientId} → Server`);
    console.log(`  ├─ Type: ${isBinary ? 'BINARY' : 'TEXT'}`);
    console.log(`  ├─ Size: ${data.length} bytes`);
    console.log(`  ├─ Content: "${message}"`);
    console.log(`  └─ Time: ${new Date().toISOString()}`);

    // Send echo back
    const response = `Echo: ${message}`;
    console.log(`\n【Response】Server → Client #${clientId}`);
    console.log(`  ├─ Type: TEXT`);
    console.log(`  ├─ Size: ${response.length} bytes`);
    console.log(`  ├─ Content: "${response}"`);
    console.log(`  └─ Time: ${new Date().toISOString()}`);

    ws.send(response, (err) => {
      if (err) {
        console.error(`  ✗ Send failed: ${err.message}`);
      } else {
        console.log(`  ✓ Sent`);
      }
    });
  });

  // Handle close
  ws.on('close', (code, reason) => {
    console.log(`\n【Close】Client #${clientId}`);
    console.log(`  ├─ Code: ${code}`);
    console.log(`  ├─ Reason: ${reason}`);
    console.log(`  └─ Connections remaining: ${wss.clients.size}`);
  });

  // Handle error
  ws.on('error', (error) => {
    console.error(`\n【Error】Client #${clientId}: ${error.message}`);
  });

  // Send welcome message
  const welcome = `Welcome! You are client #${clientId}`;
  ws.send(welcome, (err) => {
    if (!err) {
      console.log(`\n✓ Welcome message sent to client #${clientId}`);
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
  console.log(`║      WebSocket Echo Server (Phase 5.1)        ║`);
  console.log(`╚════════════════════════════════════════════════╝\n`);

  console.log(`📡 Server listening on ws://localhost:${PORT}`);
  console.log(`📊 WebSocket server ready for connections\n`);

  console.log(`Endpoints:`);
  console.log(`  • ws://localhost:${PORT}/          (default)`);
  console.log(`  • ws://localhost:${PORT}/chat      (chat path)`);
  console.log(`  • ws://localhost:${PORT}/api       (API path)\n`);

  console.log(`Features:`);
  console.log(`  ✓ Echoes all incoming messages`);
  console.log(`  ✓ Logs connection/disconnection events`);
  console.log(`  ✓ Handles binary and text frames`);
  console.log(`  ✓ Reports message size and content\n`);

  console.log(`Ctrl+C to stop server\n`);
  console.log(`────────────────────────────────────────────────\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n📛 Shutting down server...');
  console.log(`💤 Closing ${wss.clients.size} connection(s)...`);

  wss.clients.forEach((ws) => {
    ws.close(1000, 'Server shutdown');
  });

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
