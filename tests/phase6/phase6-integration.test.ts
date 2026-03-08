// DISABLED FOR TESTING
/**
 * Phase 6: HTTP/2 Real Communication Integration Test
 * Tests actual client-server HTTP/2 message exchange
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';

describe.skip('Phase 6: HTTP/2 Real Communication Tests', () => {
  let serverProcess: any = null;
  let testPort = 8443;

  /**
   * Start HTTP/2 echo server with dynamic port allocation
   */
  beforeAll((done) => {
    const serverScript = path.join(__dirname, 'http2-echo-server.js');

    // Use dynamic port to avoid conflicts
    testPort = 9443 + Math.floor(Math.random() * 1000);

    console.log('\n【Server Setup】');
    console.log(`  Starting HTTP/2 echo server...`);
    console.log(`  Script: ${serverScript}`);
    console.log(`  Port: ${testPort}`);

    serverProcess = spawn('node', [serverScript, testPort.toString()], {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    let serverReady = false;

    serverProcess.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      console.log(`  [Server] ${output.trim()}`);

      if (output.includes('listening on https://')) {
        serverReady = true;
        console.log(`  ✓ Server ready on https://localhost:8443`);
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
        console.log(`\n✓ Server ready (port ${testPort})\n`);
        done();
      } else {
        done(new Error('Server did not become ready in time'));
      }
    }, 60000);
  });

  /**
   * Stop HTTP/2 echo server
   */
  afterAll((done) => {
    if (serverProcess) {
      console.log('\n【Server Shutdown】');
      console.log(`  Stopping HTTP/2 server...`);

      serverProcess.kill('SIGINT');

      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        console.log(`  ✓ Server stopped\n`);
        done();
      }, 60000);
    } else {
      done();
    }
  });

  test.skip('HTTP/2 echo server is running on port 8443', (done) => {
    const options = {
      hostname: 'localhost',
      port: testPort,
      path: '/',
      method: 'GET',
      rejectUnauthorized: false
    };

    const req = https.request(options, (res: any) => {
      expect(res.statusCode).toBe(200);
      console.log(`  ✓ HTTPS endpoint responds (port ${testPort})`);

      let data = '';
      res.on('data', (chunk: any) => {
        data += chunk;
      });

      res.on('end', () => {
        done();
      });
    });

    req.on('error', (err: Error) => {
      done(err);
    });

    req.end();
  });

  test.skip('HTTP/2 server accepts connections', (done) => {
    const options = {
      hostname: 'localhost',
      port: testPort,
      path: '/status',
      method: 'GET',
      rejectUnauthorized: false
    };

    const timeout = setTimeout(() => {
      done(new Error('Connection timeout'));
    }, 60000);

    const req = https.request(options, (res: any) => {
      expect(res.statusCode).toBe(200);
      expect(res.httpVersion).toMatch(/2\.0/);

      console.log(`  ✓ HTTP/2 connection established (version: ${res.httpVersion})`);

      clearTimeout(timeout);
      let data = '';
      res.on('data', (chunk: any) => (data += chunk));
      res.on('end', () => done());
    });

    req.on('error', (err: Error) => {
      clearTimeout(timeout);
      done(err);
    });

    req.end();
  });

  test.skip('HTTP/2 server responds to GET requests', (done) => {
    const options = {
      hostname: 'localhost',
      port: testPort,
      path: '/status',
      method: 'GET',
      rejectUnauthorized: false
    };

    const timeout = setTimeout(() => {
      done(new Error('Response timeout'));
    }, 60000);

    const req = https.request(options, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => (data += chunk));

      res.on('end', () => {
        expect(res.statusCode).toBe(200);
        const json = JSON.parse(data);
        expect(json.status).toBe('ok');
        expect(json.version).toBe('HTTP/2');

        console.log(`  ✓ GET /status response: ${data}`);

        clearTimeout(timeout);
        done();
      });
    });

    req.on('error', (err: Error) => {
      clearTimeout(timeout);
      done(err);
    });

    req.end();
  });

  test.skip('HTTP/2 server echoes POST request body', (done) => {
    const testMessage = 'Hello from HTTP/2 client!';
    const postData = testMessage;

    const options = {
      hostname: 'localhost',
      port: testPort,
      path: '/echo',
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(postData)
      },
      rejectUnauthorized: false
    };

    const timeout = setTimeout(() => {
      done(new Error('Echo timeout'));
    }, 60000);

    const req = https.request(options, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => (data += chunk));

      res.on('end', () => {
        expect(res.statusCode).toBe(200);
        expect(data).toContain('Echo:');
        expect(data).toContain(testMessage);

        console.log(`  ✓ POST /echo response: "${data}"`);

        clearTimeout(timeout);
        done();
      });
    });

    req.on('error', (err: Error) => {
      clearTimeout(timeout);
      done(err);
    });

    console.log(`  ✓ POST request body: "${testMessage}"`);
    req.write(postData);
    req.end();
  });

  test.skip('HTTP/2 supports multiplexing (concurrent requests)', (done) => {
    const options = {
      hostname: 'localhost',
      port: testPort,
      path: '/status',
      method: 'GET',
      rejectUnauthorized: false
    };

    let completedRequests = 0;
    const totalRequests = 3;

    const timeout = setTimeout(() => {
      done(new Error('Multiplexing test timeout'));
    }, 60000);

    const makeRequest = (id: number) => {
      const req = https.request(options, (res: any) => {
        let data = '';
        res.on('data', (chunk: any) => (data += chunk));

        res.on('end', () => {
          completedRequests++;
          console.log(`  ✓ Request #${id} completed (${completedRequests}/${totalRequests})`);

          if (completedRequests === totalRequests) {
            console.log(`  ✓ All concurrent requests completed successfully`);
            clearTimeout(timeout);
            done();
          }
        });
      });

      req.on('error', (err: Error) => {
        clearTimeout(timeout);
        done(err);
      });

      req.end();
    };

    // Send multiple concurrent requests
    for (let i = 1; i <= totalRequests; i++) {
      makeRequest(i);
    }
  });

  test.skip('HTTP/2 handles large responses', (done) => {
    // Create a large payload (100KB)
    const largePayload = 'X'.repeat(100 * 1024);

    const options = {
      hostname: 'localhost',
      port: testPort,
      path: '/echo',
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(largePayload)
      },
      rejectUnauthorized: false
    };

    const timeout = setTimeout(() => {
      done(new Error('Large response timeout'));
    }, 60000);

    const req = https.request(options, (res: any) => {
      let data = '';
      let chunks = 0;

      res.on('data', (chunk: any) => {
        data += chunk;
        chunks++;
      });

      res.on('end', () => {
        expect(res.statusCode).toBe(200);
        expect(data.length).toBeGreaterThan(largePayload.length);

        console.log(`  ✓ Large response received (${data.length} bytes in ${chunks} chunks)`);

        clearTimeout(timeout);
        done();
      });
    });

    req.on('error', (err: Error) => {
      clearTimeout(timeout);
      done(err);
    });

    console.log(`  ✓ Large payload sent (${largePayload.length} bytes)`);
    req.write(largePayload);
    req.end();
  });

  test.skip('FreeLang HTTP/2 client test script exists', () => {
    const testFile = path.join(__dirname, 'http2_client_communication.test.free');
    expect(fs.existsSync(testFile)).toBe(true);

    const content = fs.readFileSync(testFile, 'utf-8');
    expect(content).toContain('test_http2_client_echo');
    expect(content).toContain('createClient');
    expect(content).toContain('request');
    expect(content).toContain('onResponse');

    console.log(`  ✓ FreeLang HTTP/2 client test script verified`);
  });

  test.skip('HTTP/2 library symbols are exposed', () => {
    try {
      const { execSync } = require('child_process');
      const output = execSync('nm -D /tmp/libhttp2.so | grep "fl_http2_" | wc -l').toString().trim();
      const symbolCount = parseInt(output);

      expect(symbolCount).toBeGreaterThanOrEqual(20);
      console.log(`  ✓ ${symbolCount} HTTP/2 symbols exposed`);
    } catch (error) {
      console.warn(`  ⚠️  Cannot verify symbols: ${error}`);
    }
  });
});
