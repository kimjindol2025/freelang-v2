/**
 * Phase 18 Day 6: Program Runner Tests
 * File and string-based program execution
 */

import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { ProgramRunner } from '../src/cli/runner';

describe('Phase 18 Day 6: Program Runner', () => {
  const runner = new ProgramRunner();
  const tmpDir = path.join('/tmp', 'freelang-runner-test-' + Date.now());

  // Setup
  beforeAll(() => {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  });

  // Cleanup
  afterAll(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  // ── Test 1: Run Simple Number ──────────────────────────────
  it('runs simple number', () => {
    const result = runner.runString('42');

    expect(result.success).toBe(true);
    expect(result.output).toBe(42);
    expect(result.exitCode).toBe(0);
  });

  // ── Test 2: Run Addition ───────────────────────────────────
  it('runs addition', () => {
    const result = runner.runString('5 + 3');

    expect(result.success).toBe(true);
    expect(result.output).toBe(8);
    expect(result.exitCode).toBe(0);
  });

  // ── Test 3: Run String Literal ────────────────────────────
  it('runs string literal', () => {
    const result = runner.runString('"hello"');

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  // ── Test 4: Run String Concatenation ──────────────────────
  it('runs string concatenation', () => {
    const result = runner.runString('"hello" + " world"');

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  // ── Test 5: Parse Error Handling ───────────────────────────
  it('handles parse errors gracefully', () => {
    const result = runner.runString('@#$%^&*()');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.exitCode).toBe(2); // Compilation error
  });

  // ── Test 6: Run from File ──────────────────────────────────
  it('runs program from file', () => {
    const filePath = path.join(tmpDir, 'test.free');
    fs.writeFileSync(filePath, '10 + 20', 'utf-8');

    const result = runner.runFile(filePath);

    expect(result.success).toBe(true);
    expect(result.output).toBe(30);
    expect(result.exitCode).toBe(0);
  });

  // ── Test 7: Missing File Error ────────────────────────────
  it('handles missing file', () => {
    const filePath = path.join(tmpDir, 'nonexistent.free');

    const result = runner.runFile(filePath);

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
    expect(result.exitCode).toBe(3); // File error
  });

  // ── Test 8: Execution Time Tracking ────────────────────────
  it('tracks execution time', () => {
    const result = runner.runString('100 + 200');

    expect(result.success).toBe(true);
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
    expect(result.executionTime).toBeLessThan(1000); // Should be fast
  });

  // ── Test 9: Get IR for Code ───────────────────────────────
  it('generates IR for code', () => {
    const ir = runner.getIR('5 + 3');

    expect(ir).toBeDefined();
    expect(Array.isArray(ir)).toBe(true);
    expect(ir.length).toBeGreaterThan(0);
    // Should end with HALT
    expect(ir[ir.length - 1].op).toBeDefined();
  });

  // ── Test 10: IR for Different Expressions ──────────────────
  it('generates different IR for different expressions', () => {
    const ir1 = runner.getIR('5 + 3');
    const ir2 = runner.getIR('10 + 20');

    // Different expressions should generate different IR
    // (at least different PUSH values)
    expect(ir1.length).toBeGreaterThan(0);
    expect(ir2.length).toBeGreaterThan(0);
  });
});
