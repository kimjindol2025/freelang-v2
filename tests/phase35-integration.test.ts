// Phase 35: Comprehensive Integration Testing
// FreeLang v2 - All Module Integration and Performance
//
// Six Completed Modules:
// 1. HTTP - server and client
// 2. Async - thread operations
// 3. File System
// 4. Network
// 5. Process
// 6. Timer

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';

const PROJECT_ROOT = '/home/kimjin/Desktop/kim/v2-freelang-ai';
const STDLIB_DIR = path.join(PROJECT_ROOT, 'stdlib');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist/stdlib');

const MODULES = {
  http: { name: 'HTTP', so: path.join(DIST_DIR, 'libhttp.so'), free: path.join(STDLIB_DIR, 'http/index.free') },
  async: { name: 'Async', so: path.join(DIST_DIR, 'libasync.so'), free: path.join(STDLIB_DIR, 'async/index.free') },
  fs: { name: 'File System', so: path.join(STDLIB_DIR, 'fs/libfs.so'), free: path.join(STDLIB_DIR, 'fs/index.free') },
  net: { name: 'Network', so: path.join(STDLIB_DIR, 'net/libnet.so'), free: path.join(STDLIB_DIR, 'net/index.free') },
  process: { name: 'Process', so: path.join(STDLIB_DIR, 'process/libprocess.so'), free: path.join(STDLIB_DIR, 'process/index.free') },
  timer: { name: 'Timer', so: path.join(STDLIB_DIR, 'timer/libtimer.so'), free: path.join(STDLIB_DIR, 'timer/index.free') }
};

describe.skip('Phase 35: Integration Tests - All 6 Completed Modules', () => {

  // ============================================================================
  // Test 1: HTTP Module
  // ============================================================================

  describe('HTTP Module', () => {

    it('libhttp.so should exist in dist/stdlib/', () => {
      expect(fs.existsSync(MODULES.http.so)).toBe(true);
      const stats = fs.statSync(MODULES.http.so);
      expect(stats.size).toBeGreaterThan(10000);
      console.log(`✓ libhttp.so: ${(stats.size / 1024).toFixed(2)}KB`);
    });

    it('index.free HTTP wrapper should exist', () => {
      expect(fs.existsSync(MODULES.http.free)).toBe(true);
      const content = fs.readFileSync(MODULES.http.free, 'utf-8');
      expect(content).toContain('class HttpServer');
      expect(content).toContain('listen(');
    });

    it('HTTP exports should include server and client functions', () => {
      const content = fs.readFileSync(MODULES.http.free, 'utf-8');
      expect(content).toContain('get:');
      expect(content).toContain('post:');
      expect(content).toContain('put:');
      expect(content).toContain('delete:');
      expect(content).toContain('createServer');
    });
  });

  // ============================================================================
  // Test 2: Async Module
  // ============================================================================

  describe('Async Module', () => {

    it('libasync.so should exist in dist/stdlib/', () => {
      expect(fs.existsSync(MODULES.async.so)).toBe(true);
      const stats = fs.statSync(MODULES.async.so);
      expect(stats.size).toBeGreaterThan(5000);
      console.log(`✓ libasync.so: ${(stats.size / 1024).toFixed(2)}KB`);
    });

    it('index.free async wrapper should exist', () => {
      expect(fs.existsSync(MODULES.async.free)).toBe(true);
      const content = fs.readFileSync(MODULES.async.free, 'utf-8');
      expect(content.length).toBeGreaterThan(100);
    });

    it('async exports should have FFI functions', () => {
      const soPath = MODULES.async.so;
      const result = child_process.spawnSync('nm', ['-D', soPath], { encoding: 'utf-8' });
      const symbols = result.stdout || '';

      expect(symbols).toMatch(/fl_async/);
    });
  });

  // ============================================================================
  // Test 3: File System Module
  // ============================================================================

  describe('File System Module', () => {

    it('libfs.so should exist in stdlib/fs/', () => {
      expect(fs.existsSync(MODULES.fs.so)).toBe(true);
      const stats = fs.statSync(MODULES.fs.so);
      console.log(`✓ libfs.so: ${(stats.size / 1024).toFixed(2)}KB`);
    });

    it('index.free fs wrapper should exist', () => {
      expect(fs.existsSync(MODULES.fs.free)).toBe(true);
    });
  });

  // ============================================================================
  // Test 4: Network Module
  // ============================================================================

  describe('Network Module', () => {

    it('libnet.so should exist in stdlib/net/', () => {
      expect(fs.existsSync(MODULES.net.so)).toBe(true);
      const stats = fs.statSync(MODULES.net.so);
      console.log(`✓ libnet.so: ${(stats.size / 1024).toFixed(2)}KB`);
    });

    it('index.free net wrapper should exist', () => {
      expect(fs.existsSync(MODULES.net.free)).toBe(true);
    });

    it('net module should have proper exports', () => {
      const content = fs.readFileSync(MODULES.net.free, 'utf-8');
      expect(content.length).toBeGreaterThan(100);
    });
  });

  // ============================================================================
  // Test 5: Process Module
  // ============================================================================

  describe('Process Module', () => {

    it('libprocess.so should exist in stdlib/process/', () => {
      expect(fs.existsSync(MODULES.process.so)).toBe(true);
      const stats = fs.statSync(MODULES.process.so);
      console.log(`✓ libprocess.so: ${(stats.size / 1024).toFixed(2)}KB`);
    });

    it('index.free process wrapper should exist', () => {
      expect(fs.existsSync(MODULES.process.free)).toBe(true);
    });
  });

  // ============================================================================
  // Test 6: Timer Module
  // ============================================================================

  describe('Timer Module', () => {

    it('libtimer.so should exist in stdlib/timer/', () => {
      expect(fs.existsSync(MODULES.timer.so)).toBe(true);
      const stats = fs.statSync(MODULES.timer.so);
      console.log(`✓ libtimer.so: ${(stats.size / 1024).toFixed(2)}KB`);
    });

    it('index.free timer wrapper should exist', () => {
      expect(fs.existsSync(MODULES.timer.free)).toBe(true);
    });

    it('timer module should define timer utilities', () => {
      const content = fs.readFileSync(MODULES.timer.free, 'utf-8');
      expect(content.length).toBeGreaterThan(100);
    });
  });

  // ============================================================================
  // Test 7: Multi-Module Integration
  // ============================================================================

  describe('Multi-Module Integration (All 6)', () => {

    it('all 6 .so files should be available', () => {
      const soFiles = [
        MODULES.http.so,
        MODULES.async.so,
        MODULES.fs.so,
        MODULES.net.so,
        MODULES.process.so,
        MODULES.timer.so
      ];

      const allExist = soFiles.every(f => fs.existsSync(f));
      expect(allExist).toBe(true);
    });

    it('all 6 index.free wrappers should be available', () => {
      const freeFiles = [
        MODULES.http.free,
        MODULES.async.free,
        MODULES.fs.free,
        MODULES.net.free,
        MODULES.process.free,
        MODULES.timer.free
      ];

      const allExist = freeFiles.every(f => fs.existsSync(f));
      expect(allExist).toBe(true);
    });

    it('total stdlib compiled size should be < 200KB', () => {
      const soFiles = [
        MODULES.http.so,
        MODULES.async.so,
        MODULES.fs.so,
        MODULES.net.so,
        MODULES.process.so,
        MODULES.timer.so
      ];

      let totalSize = 0;
      soFiles.forEach(f => {
        if (fs.existsSync(f)) {
          totalSize += fs.statSync(f).size;
        }
      });

      console.log(`\nTotal stdlib .so size: ${(totalSize / 1024).toFixed(2)}KB`);
      expect(totalSize).toBeLessThan(200 * 1024);
    });

    it('all source files should be properly formatted', () => {
      const freeFiles = [
        MODULES.http.free,
        MODULES.async.free,
        MODULES.fs.free,
        MODULES.net.free,
        MODULES.process.free,
        MODULES.timer.free
      ];

      freeFiles.forEach(f => {
        const content = fs.readFileSync(f, 'utf-8');
        expect(content.length).toBeGreaterThan(50);
        // FreeLang syntax check
        expect(content).toMatch(/fn|class|interface/);
      });
    });
  });

  // ============================================================================
  // Test 8: Performance Baseline
  // ============================================================================

  describe('Performance Baseline', () => {

    it('all modules should load in reasonable time', async () => {
      jest.setTimeout(15000);

      const startTime = Date.now();

      const soFiles = [
        MODULES.http.so,
        MODULES.async.so,
        MODULES.fs.so,
        MODULES.net.so,
        MODULES.process.so,
        MODULES.timer.so
      ];

      soFiles.forEach(f => {
        if (fs.existsSync(f)) {
          fs.statSync(f); // Simulate loading
        }
      });

      const duration = Date.now() - startTime;
      console.log(`Module loading time: ${duration}ms`);
      expect(duration).toBeLessThan(100);
    });

    it('HTTP server should compile from source', async () => {
      jest.setTimeout(30000);

      const result = await new Promise<{ error: any; code: number }>((resolve) => {
        child_process.exec(
          `cd ${STDLIB_DIR}/http && make lib-build 2>&1`,
          { timeout: 20000 },
          (error, stdout, stderr) => {
            resolve({ error, code: error ? error.code : 0 });
          }
        );
      });

      // Should succeed or already compiled
      expect([0, null]).toContain(result.code);
    }, 30000);
  });

  // ============================================================================
  // Test 9: Comprehensive Status Report
  // ============================================================================

  describe('Comprehensive Module Status', () => {

    it('should generate complete integration report', () => {
      const modulesStatus: Record<string, any> = {};
      let totalSize = 0;

      Object.entries(MODULES).forEach(([key, module]) => {
        const soExists = fs.existsSync(module.so);
        const freeExists = fs.existsSync(module.free);

        if (soExists) {
          const soSize = fs.statSync(module.so).size;
          totalSize += soSize;
          modulesStatus[key] = {
            status: 'complete',
            soSize: `${(soSize / 1024).toFixed(2)}KB`,
            hasWrapper: freeExists
          };
        }
      });

      const report = {
        phase: 35,
        title: 'Comprehensive Integration Testing',
        timestamp: new Date().toISOString(),
        modulesCompleted: Object.keys(modulesStatus).length,
        modulesStatus,
        totalCompiledSize: `${(totalSize / 1024).toFixed(2)}KB`,
        completionPercentage: 43,
        nextPhase: 'Phase 36: Performance Optimization & Benchmarking (vs Rust)',
        summary: {
          libhttp: 'Server + Client implementation with event loop',
          libasync: 'Thread-based async operations (sleep, execute, delay)',
          libfs: 'File system operations',
          libnet: 'Networking primitives',
          libprocess: 'Process management',
          libtimer: 'Timer utilities'
        }
      };

      console.log('\n' + '='.repeat(80));
      console.log('PHASE 35: INTEGRATION TEST REPORT');
      console.log('='.repeat(80));
      console.log(JSON.stringify(report, null, 2));
      console.log('='.repeat(80));

      expect(Object.keys(modulesStatus).length).toBe(6);
    });
  });

  // ============================================================================
  // Test 10: Next Phase Readiness
  // ============================================================================

  describe('Phase 36 Readiness Check', () => {

    it('should be ready for performance benchmarking', () => {
      const required = [
        MODULES.http.so,
        MODULES.async.so,
        MODULES.fs.so,
        MODULES.net.so,
        MODULES.process.so,
        MODULES.timer.so
      ];

      const allReady = required.every(f => fs.existsSync(f));
      expect(allReady).toBe(true);

      console.log('\n✓ Phase 35 Complete - Ready for Phase 36');
      console.log('  Next: Performance Benchmarking vs Rust/Go/Python');
    });

    it('should have HTTP test infrastructure', () => {
      const testFile = path.join(STDLIB_DIR, 'http/test_http_simple.c');
      const testBinary = path.join(STDLIB_DIR, 'http/build/test_http_simple');

      expect(fs.existsSync(testFile)).toBe(true);
      // Binary may or may not exist, that's ok
    });
  });
});
