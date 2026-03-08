/**
 * Phase 5: Basic WebSocket Integration Test
 */

import { execSync } from 'child_process';
import * as fs from 'fs';

describe('Phase 5: WebSocket Integration Tests', () => {
  test('WebSocket library (libws.so) compiles successfully', () => {
    const wsPath = '/tmp/libws.so';
    expect(fs.existsSync(wsPath)).toBe(true);
  });

  test('WebSocket module exposes required symbols', () => {
    try {
      const output = execSync('nm -D /tmp/libws.so | grep "fl_ws_" | wc -l').toString().trim();
      const count = parseInt(output);
      expect(count).toBeGreaterThanOrEqual(16);
    } catch (error) {
      throw new Error(`Failed to check symbols: ${error}`);
    }
  });

  test('WebSocket symbols include server API', () => {
    try {
      const output = execSync('nm -D /tmp/libws.so | grep "fl_ws_server"').toString();
      expect(output).toContain('fl_ws_server_create');
      expect(output).toContain('fl_ws_server_listen');
      expect(output).toContain('fl_ws_server_close');
    } catch (error) {
      throw new Error(`Server API symbols missing: ${error}`);
    }
  });

  test('WebSocket symbols include client API', () => {
    try {
      const output = execSync('nm -D /tmp/libws.so | grep "fl_ws_client"').toString();
      expect(output).toContain('fl_ws_client_connect');
      expect(output).toContain('fl_ws_client_send');
      expect(output).toContain('fl_ws_client_close');
    } catch (error) {
      throw new Error(`Client API symbols missing: ${error}`);
    }
  });

  test('WebSocket symbols include callback API', () => {
    try {
      const output = execSync('nm -D /tmp/libws.so | grep "fl_ws_on"').toString();
      expect(output).toContain('fl_ws_on_message');
      expect(output).toContain('fl_ws_on_close');
      expect(output).toContain('fl_ws_on_error');
    } catch (error) {
      throw new Error(`Callback API symbols missing: ${error}`);
    }
  });

  test('HTTP/2 library (libhttp2.so) compiles successfully', () => {
    const http2Path = '/tmp/libhttp2.so';
    expect(fs.existsSync(http2Path)).toBe(true);
  });

  test('HTTP/2 module exposes required symbols', () => {
    try {
      const output = execSync('nm -D /tmp/libhttp2.so | grep "fl_http2_" | wc -l').toString().trim();
      const count = parseInt(output);
      expect(count).toBeGreaterThanOrEqual(20);
    } catch (error) {
      throw new Error(`Failed to check HTTP/2 symbols: ${error}`);
    }
  });

  test('FreeLang WebSocket module files exist', () => {
    const moduleFile = '/home/kimjin/Desktop/kim/v2-freelang-ai/stdlib/ws/index.free';
    expect(fs.existsSync(moduleFile)).toBe(true);

    const content = fs.readFileSync(moduleFile, 'utf-8');
    expect(content).toContain('createServer');
    expect(content).toContain('connect');
    expect(content).toContain('listen');
    expect(content).toContain('send');
  });

  test('Phase 5 test scripts are created', () => {
    const testFiles = [
      '/home/kimjin/Desktop/kim/v2-freelang-ai/tests/phase5/ws_client_basic.test.free',
      '/home/kimjin/Desktop/kim/v2-freelang-ai/tests/phase5/ws_server_basic.test.free',
      '/home/kimjin/Desktop/kim/v2-freelang-ai/tests/phase5/ws_integration.test.free'
    ];

    for (const file of testFiles) {
      expect(fs.existsSync(file)).toBe(true);
      const content = fs.readFileSync(file, 'utf-8');
      expect(content.length).toBeGreaterThan(100);
    }
  });
});
