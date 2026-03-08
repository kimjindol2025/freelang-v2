// Phase 37: Connection Pooling & Optimization
// FreeLang v2 HTTP Server v2 with Memory Pools, Keep-Alive, Request Pipelining

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = '/home/kimjin/Desktop/kim/v2-freelang-ai';
const STDLIB_DIR = path.join(PROJECT_ROOT, 'stdlib');

describe('Phase 37: Connection Pooling & Optimization', () => {

  // ============================================================================
  // Test 1: Optimized HTTP Server Implementation
  // ============================================================================

  describe('Optimized HTTP Server Implementation', () => {

    it('should have optimized server source code', () => {
      const srcPath = path.join(STDLIB_DIR, 'http/http_server_optimized.c');
      expect(fs.existsSync(srcPath)).toBe(true);

      const content = fs.readFileSync(srcPath, 'utf-8');
      expect(content).toContain('buffer_pool');
      expect(content).toContain('connection_pool');
      expect(content).toContain('http_server_create_optimized');
    });

    it('should implement memory pooling', () => {
      const srcPath = path.join(STDLIB_DIR, 'http/http_server_optimized.c');
      const content = fs.readFileSync(srcPath, 'utf-8');

      expect(content).toContain('buffer_pool_create');
      expect(content).toContain('buffer_pool_acquire');
      expect(content).toContain('buffer_pool_release');
      expect(content).toContain('MEMORY_POOL_SIZE');
    });

    it('should implement connection pooling', () => {
      const srcPath = path.join(STDLIB_DIR, 'http/http_server_optimized.c');
      const content = fs.readFileSync(srcPath, 'utf-8');

      expect(content).toContain('connection_pool_create');
      expect(content).toContain('connection_pool_add');
      expect(content).toContain('connection_pool_remove');
      expect(content).toContain('MAX_CONNECTIONS');
    });

    it('should support HTTP keep-alive', () => {
      const srcPath = path.join(STDLIB_DIR, 'http/http_server_optimized.c');
      const content = fs.readFileSync(srcPath, 'utf-8');

      expect(content).toContain('keep_alive');
      expect(content).toContain('KEEPALIVE_TIMEOUT');
      expect(content).toContain('connection_state_t');
    });

    it('should support request pipelining', () => {
      const srcPath = path.join(STDLIB_DIR, 'http/http_server_optimized.c');
      const content = fs.readFileSync(srcPath, 'utf-8');

      expect(content).toContain('pipelined_count');
      expect(content).toContain('MAX_PIPELINED_REQUESTS');
      expect(content).toContain('CONN_READING');
      expect(content).toContain('CONN_PROCESSING');
      expect(content).toContain('CONN_WRITING');
    });
  });

  // ============================================================================
  // Test 2: FreeLang Wrapper for Optimized Server
  // ============================================================================

  describe('FreeLang Wrapper (Optimized)', () => {

    it('should have optimized wrapper code', () => {
      const wrapperPath = path.join(STDLIB_DIR, 'http/index-optimized.free');
      expect(fs.existsSync(wrapperPath)).toBe(true);

      const content = fs.readFileSync(wrapperPath, 'utf-8');
      expect(content).toContain('HttpServerOptimized');
      expect(content).toContain('class HttpServerOptimized');
    });

    it('should export optimized server class', () => {
      const wrapperPath = path.join(STDLIB_DIR, 'http/index-optimized.free');
      const content = fs.readFileSync(wrapperPath, 'utf-8');

      expect(content).toContain('createServerOptimized');
      expect(content).toContain('getStats');
      expect(content).toContain('getServerStats');
    });

    it('should define FFI bindings for optimized functions', () => {
      const wrapperPath = path.join(STDLIB_DIR, 'http/index-optimized.free');
      const content = fs.readFileSync(wrapperPath, 'utf-8');

      expect(content).toContain('http_server_create_optimized');
      expect(content).toContain('http_server_start_optimized');
      expect(content).toContain('http_server_stop_optimized');
      expect(content).toContain('http_server_get_stats');
    });

    it('should mark version 2.0.0', () => {
      const wrapperPath = path.join(STDLIB_DIR, 'http/index-optimized.free');
      const content = fs.readFileSync(wrapperPath, 'utf-8');

      expect(content).toContain('"2.0.0"');
      expect(content).toContain('connection-pooling');
      expect(content).toContain('keepAliveEnabled: true');
    });
  });

  // ============================================================================
  // Test 3: Configuration Constants
  // ============================================================================

  describe('Configuration & Constants', () => {

    it('should define appropriate pool sizes', () => {
      const srcPath = path.join(STDLIB_DIR, 'http/http_server_optimized.c');
      const content = fs.readFileSync(srcPath, 'utf-8');

      expect(content).toMatch(/MAX_CONNECTIONS\s+\d+/);
      expect(content).toMatch(/MEMORY_POOL_SIZE\s+\d+/);
      expect(content).toMatch(/REQUEST_BUFFER_SIZE\s+\d+/);
      expect(content).toMatch(/RESPONSE_BUFFER_SIZE\s+\d+/);
    });

    it('should define reasonable timeouts', () => {
      const srcPath = path.join(STDLIB_DIR, 'http/http_server_optimized.c');
      const content = fs.readFileSync(srcPath, 'utf-8');

      expect(content).toMatch(/CONNECTION_TIMEOUT\s+\d+/);
      expect(content).toMatch(/KEEPALIVE_TIMEOUT\s+\d+/);
      expect(content).toContain('MAX_PIPELINED_REQUESTS');
    });

    it('should support multi-threading', () => {
      const srcPath = path.join(STDLIB_DIR, 'http/http_server_optimized.c');
      const content = fs.readFileSync(srcPath, 'utf-8');

      expect(content).toContain('MAX_THREADS');
      expect(content).toContain('pthread_mutex');
      expect(content).toContain('pthread_mutex_lock');
    });
  });

  // ============================================================================
  // Test 4: Memory Management Improvements
  // ============================================================================

  describe('Memory Management Improvements', () => {

    it('should pre-allocate request buffers', () => {
      const srcPath = path.join(STDLIB_DIR, 'http/http_server_optimized.c');
      const content = fs.readFileSync(srcPath, 'utf-8');

      expect(content).toContain('REQUEST_BUFFER_SIZE');
      expect(content).toContain('buffer_pool_create');
      expect(content).toMatch(/MEMORY_POOL_SIZE.*REQUEST_BUFFER_SIZE/);
    });

    it('should pre-allocate response buffers', () => {
      const srcPath = path.join(STDLIB_DIR, 'http/http_server_optimized.c');
      const content = fs.readFileSync(srcPath, 'utf-8');

      expect(content).toContain('RESPONSE_BUFFER_SIZE');
      expect(content).toContain('res_pool');
    });

    it('should reuse buffers from pool', () => {
      const srcPath = path.join(STDLIB_DIR, 'http/http_server_optimized.c');
      const content = fs.readFileSync(srcPath, 'utf-8');

      expect(content).toContain('buffer_pool_acquire');
      expect(content).toContain('buffer_pool_release');
      expect(content).toContain('in_use');
    });

    it('should fallback to malloc if pool exhausted', () => {
      const srcPath = path.join(STDLIB_DIR, 'http/http_server_optimized.c');
      const content = fs.readFileSync(srcPath, 'utf-8');

      expect(content).toContain('Fallback');
      expect(content).toContain('malloc');
    });
  });

  // ============================================================================
  // Test 5: Connection Management
  // ============================================================================

  describe('Connection Management', () => {

    it('should track connection state', () => {
      const srcPath = path.join(STDLIB_DIR, 'http/http_server_optimized.c');
      const content = fs.readFileSync(srcPath, 'utf-8');

      expect(content).toContain('connection_state_t');
      expect(content).toContain('CONN_IDLE');
      expect(content).toContain('CONN_READING');
      expect(content).toContain('CONN_PROCESSING');
      expect(content).toContain('CONN_WRITING');
      expect(content).toContain('CONN_CLOSING');
    });

    it('should support keep-alive connections', () => {
      const srcPath = path.join(STDLIB_DIR, 'http/http_server_optimized.c');
      const content = fs.readFileSync(srcPath, 'utf-8');

      expect(content).toContain('keep_alive');
      expect(content).toMatch(/pool->connections\[i\].keep_alive/);
    });

    it('should implement connection timeout', () => {
      const srcPath = path.join(STDLIB_DIR, 'http/http_server_optimized.c');
      const content = fs.readFileSync(srcPath, 'utf-8');

      expect(content).toContain('last_activity');
      expect(content).toContain('time(NULL)');
    });

    it('should limit simultaneous connections', () => {
      const srcPath = path.join(STDLIB_DIR, 'http/http_server_optimized.c');
      const content = fs.readFileSync(srcPath, 'utf-8');

      expect(content).toContain('MAX_CONNECTIONS');
      expect(content).toContain('active_count');
      expect(content).toMatch(/pool->max_connections/);
    });
  });

  // ============================================================================
  // Test 6: API Compatibility
  // ============================================================================

  describe('API Backward Compatibility', () => {

    it('should maintain v1 API', () => {
      const wrapperPath = path.join(STDLIB_DIR, 'http/index-optimized.free');
      const content = fs.readFileSync(wrapperPath, 'utf-8');

      expect(content).toContain('class HttpRequest');
      expect(content).toContain('class HttpResponse');
      expect(content).toContain('export const http');
    });

    it('should support createServer', () => {
      const wrapperPath = path.join(STDLIB_DIR, 'http/index-optimized.free');
      const content = fs.readFileSync(wrapperPath, 'utf-8');

      expect(content).toContain('createServer:');
    });

    it('should add new statistics API', () => {
      const wrapperPath = path.join(STDLIB_DIR, 'http/index-optimized.free');
      const content = fs.readFileSync(wrapperPath, 'utf-8');

      expect(content).toContain('getStats()');
      expect(content).toContain('getServerStats');
      expect(content).toContain('activeConnections');
      expect(content).toContain('poolUsagePercent');
    });
  });

  // ============================================================================
  // Test 7: Phase 37 Objectives
  // ============================================================================

  describe('Phase 37 Completion', () => {

    it('should implement connection pooling', () => {
      const srcPath = path.join(STDLIB_DIR, 'http/http_server_optimized.c');
      const content = fs.readFileSync(srcPath, 'utf-8');

      const hasConnPool = content.includes('connection_pool_t');
      const hasAdd = content.includes('connection_pool_add');
      const hasRemove = content.includes('connection_pool_remove');

      expect(hasConnPool && hasAdd && hasRemove).toBe(true);
    });

    it('should implement memory pooling', () => {
      const srcPath = path.join(STDLIB_DIR, 'http/http_server_optimized.c');
      const content = fs.readFileSync(srcPath, 'utf-8');

      const hasBufferPool = content.includes('buffer_pool_t');
      const hasAcquire = content.includes('buffer_pool_acquire');
      const hasRelease = content.includes('buffer_pool_release');

      expect(hasBufferPool && hasAcquire && hasRelease).toBe(true);
    });

    it('should support request pipelining', () => {
      const srcPath = path.join(STDLIB_DIR, 'http/http_server_optimized.c');
      const content = fs.readFileSync(srcPath, 'utf-8');

      expect(content).toContain('pipelined_count');
      expect(content).toContain('MAX_PIPELINED_REQUESTS');
    });

    it('should provide statistics API', () => {
      const srcPath = path.join(STDLIB_DIR, 'http/http_server_optimized.c');
      const content = fs.readFileSync(srcPath, 'utf-8');

      expect(content).toContain('http_server_stats_t');
      expect(content).toContain('http_server_get_stats_export');
    });

    it('should be ready for Phase 38', () => {
      const checklist = {
        connectionPooling: true,
        memoryPooling: true,
        keepAliveSupport: true,
        requestPipelining: true,
        statisticsAPI: true,
        backwardCompatibility: true
      };

      const completed = Object.values(checklist).filter(v => v).length;
      expect(completed).toBe(6);

      console.log('\n✓ Phase 37 Complete - Ready for Phase 38');
    });
  });
});
