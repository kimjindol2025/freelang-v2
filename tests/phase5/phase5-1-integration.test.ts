/**
 * Phase 5.1: WebSocket Real Communication Integration Test
 * Tests actual client-server message exchange
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

describe('Phase 5.1: WebSocket Real Communication Tests', () => {
  let serverProcess: any = null;

  /**
   * Start WebSocket echo server
   */
  beforeAll((done) => {
    const serverScript = path.join(__dirname, 'ws-echo-server.js');

    console.log('\n【Server Setup】');
    console.log(`  Starting WebSocket echo server...`);
    console.log(`  Script: ${serverScript}`);

    serverProcess = spawn('node', [serverScript, '9001'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    let serverReady = false;

    serverProcess.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      console.log(`  [Server] ${output.trim()}`);

      if (output.includes('listening on ws://')) {
        serverReady = true;
        console.log(`  ✓ Server ready on ws://localhost:9001`);
      }
    });

    serverProcess.stderr.on('data', (data: Buffer) => {
      console.error(`  [Server Error] ${data.toString().trim()}`);
    });

    serverProcess.on('error', (err: Error) => {
      console.error(`  ✗ Failed to start server: ${err.message}`);
      done(err);
    });

    // Wait for server to be ready
    setTimeout(() => {
      if (serverReady) {
        console.log(`\n✓ Server ready (port 9001)\n`);
        done();
      } else {
        done(new Error('Server did not become ready in time'));
      }
    }, 2000);
  });

  /**
   * Stop WebSocket echo server
   */
  afterAll((done) => {
    if (serverProcess) {
      console.log('\n【Server Shutdown】');
      console.log(`  Stopping WebSocket server...`);

      serverProcess.kill('SIGINT');

      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        console.log(`  ✓ Server stopped\n`);
        done();
      }, 1000);
    } else {
      done();
    }
  });

  test('WebSocket echo server is running on port 9001', (done) => {
    const http = require('http');

    http
      .get('http://localhost:9001', (res: any) => {
        expect(res.statusCode).toBe(200);
        console.log(`  ✓ HTTP endpoint responds (port 9001)`);
        done();
      })
      .on('error', (err: Error) => {
        done(err);
      });
  });

  test('WebSocket server accepts connections', (done) => {
    const WebSocket = require('ws');
    const ws = new WebSocket('ws://localhost:9001/');

    const timeout = setTimeout(() => {
      ws.close();
      done(new Error('Connection timeout'));
    }, 5000);

    ws.on('open', () => {
      console.log(`  ✓ WebSocket connection established`);
      clearTimeout(timeout);
      ws.close();
      done();
    });

    ws.on('error', (err: Error) => {
      clearTimeout(timeout);
      done(err);
    });
  });

  test('WebSocket server sends welcome message', (done) => {
    const WebSocket = require('ws');
    const ws = new WebSocket('ws://localhost:9001/');

    const timeout = setTimeout(() => {
      ws.close();
      done(new Error('Message timeout'));
    }, 5000);

    ws.on('message', (data: any) => {
      const message = data.toString();
      expect(message).toContain('Welcome');
      console.log(`  ✓ Welcome message received: "${message}"`);
      clearTimeout(timeout);
      ws.close();
      done();
    });

    ws.on('error', (err: Error) => {
      clearTimeout(timeout);
      done(err);
    });
  });

  test('WebSocket server echoes messages', (done) => {
    const WebSocket = require('ws');
    const ws = new WebSocket('ws://localhost:9001/');

    const testMessage = 'Hello from test!';
    let welcomed = false;

    const timeout = setTimeout(() => {
      ws.close();
      done(new Error('Echo timeout'));
    }, 5000);

    ws.on('open', () => {
      ws.send(testMessage);
      console.log(`  ✓ Test message sent: "${testMessage}"`);
    });

    ws.on('message', (data: any) => {
      const message = data.toString();

      if (message.includes('Welcome')) {
        welcomed = true;
        return;
      }

      if (welcomed && message.includes('Echo:')) {
        expect(message).toContain(testMessage);
        console.log(`  ✓ Echo received: "${message}"`);
        clearTimeout(timeout);
        ws.close();
        done();
      }
    });

    ws.on('error', (err: Error) => {
      clearTimeout(timeout);
      done(err);
    });
  });

  test('WebSocket server handles multiple messages', (done) => {
    const WebSocket = require('ws');
    const ws = new WebSocket('ws://localhost:9001/');

    const testMessages = ['Message 1', 'Message 2', 'Message 3'];
    let echoCount = 0;
    let welcomed = false;

    const timeout = setTimeout(() => {
      ws.close();
      done(new Error('Messages timeout'));
    }, 10000);

    ws.on('open', () => {
      testMessages.forEach((msg) => {
        ws.send(msg);
        console.log(`  ✓ Sent: "${msg}"`);
      });
    });

    ws.on('message', (data: any) => {
      const message = data.toString();

      if (!welcomed && message.includes('Welcome')) {
        welcomed = true;
        return;
      }

      if (welcomed && message.includes('Echo:')) {
        echoCount++;
        console.log(`  ✓ Echo #${echoCount}: "${message}"`);

        if (echoCount === testMessages.length) {
          clearTimeout(timeout);
          ws.close();
          done();
        }
      }
    });

    ws.on('error', (err: Error) => {
      clearTimeout(timeout);
      done(err);
    });
  });

  test('WebSocket server handles large messages', (done) => {
    const WebSocket = require('ws');
    const ws = new WebSocket('ws://localhost:9001/');

    // Create 10KB message
    const largeMessage = 'X'.repeat(10 * 1024);
    let welcomed = false;

    const timeout = setTimeout(() => {
      ws.close();
      done(new Error('Large message timeout'));
    }, 10000);

    ws.on('open', () => {
      ws.send(largeMessage);
      console.log(`  ✓ Large message sent (${largeMessage.length} bytes)`);
    });

    ws.on('message', (data: any) => {
      const message = data.toString();

      if (!welcomed && message.includes('Welcome')) {
        welcomed = true;
        return;
      }

      if (welcomed && message.includes('Echo:')) {
        expect(message.length).toBeGreaterThan(largeMessage.length);
        console.log(`  ✓ Large echo received (${message.length} bytes)`);
        clearTimeout(timeout);
        ws.close();
        done();
      }
    });

    ws.on('error', (err: Error) => {
      clearTimeout(timeout);
      done(err);
    });
  });

  test('FreeLang client test script exists', () => {
    const testFile = path.join(__dirname, 'ws_client_communication.test.free');
    expect(fs.existsSync(testFile)).toBe(true);

    const content = fs.readFileSync(testFile, 'utf-8');
    expect(content).toContain('test_ws_client_echo');
    expect(content).toContain('connect');
    expect(content).toContain('send');
    expect(content).toContain('onMessage');

    console.log(`  ✓ FreeLang client test script verified`);
  });
});
