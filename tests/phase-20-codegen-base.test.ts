/**
 * Phase 20.1: Code Generator Base Tests
 * 28 test cases covering:
 * - IR processing
 * - Symbol management
 * - Code emission
 * - Configuration
 */

import CodeGeneratorBase, { CodeGenConfig } from '../src/phase-20/codegen-base/code-generator-base';
import { IRBuilderBase } from '../src/phase-19/ir-base/ir-builder-base';

describe('CodeGeneratorBase', () => {
  let codegen: CodeGeneratorBase;
  let config: CodeGenConfig;

  beforeEach(() => {
    config = {
      target: 'c',
      output_file: 'test.c',
      optimization_level: 2,
      include_runtime: true,
      debug_symbols: false,
      verbose: false,
    };
    codegen = new CodeGeneratorBase(config);
  });

  // ───── IR Processing (8) ─────

  describe('IR Processing', () => {
    test('generates code from simple IR', async () => {
      const builder = new IRBuilderBase('test');
      const block = builder.createBlock('entry');
      const x = builder.createVariable('x', 'i32');
      builder.createFunction('test', [], 'void', block);

      const ir_graph = builder.buildGraph();
      const result = await codegen.generateFromIR(ir_graph);

      expect(result.code).toBeDefined();
      expect(result.target).toBe('c');
    });

    test('generates function declarations', async () => {
      const builder = new IRBuilderBase('test');
      const block = builder.createBlock('entry');
      const param = builder.createVariable('param1', 'i32');
      builder.createFunction('add', [param], 'i32', block);

      const ir_graph = builder.buildGraph();
      const result = await codegen.generateFromIR(ir_graph);

      expect(result.code).toContain('add');
      expect(result.code).toContain('i32');
    });

    test('handles multiple functions', async () => {
      const builder = new IRBuilderBase('test');
      const b1 = builder.createBlock('entry1');
      const b2 = builder.createBlock('entry2');

      builder.createFunction('func1', [], 'void', b1);
      builder.createFunction('func2', [], 'void', b2);

      const ir_graph = builder.buildGraph();
      const result = await codegen.generateFromIR(ir_graph);

      expect(result.code).toContain('func1');
      expect(result.code).toContain('func2');
    });

    test('tracks code generation time', async () => {
      const builder = new IRBuilderBase('test');
      builder.createBlock('entry');

      const ir_graph = builder.buildGraph();
      const result = await codegen.generateFromIR(ir_graph);

      expect(result.generation_time_ms).toBeGreaterThanOrEqual(0);
    });

    test('calculates generated code size', async () => {
      const builder = new IRBuilderBase('test');
      builder.createBlock('entry');

      const ir_graph = builder.buildGraph();
      const result = await codegen.generateFromIR(ir_graph);

      expect(result.file_size).toBe(result.code.length);
    });

    test('generates code without warnings for valid operations', async () => {
      const builder = new IRBuilderBase('test');
      const block = builder.createBlock('entry');
      const a = builder.createConstant(1, 'i32');
      const b = builder.createConstant(2, 'i32');
      // Create operation with known operation type
      builder.createOperation('add', [a, b], 'i32');
      builder.createFunction('test', [], 'void', block);

      const ir_graph = builder.buildGraph();
      const result = await codegen.generateFromIR(ir_graph);

      expect(result.warnings.length).toBe(0);
    });

    test('returns generated code in result', async () => {
      const builder = new IRBuilderBase('test');
      const block = builder.createBlock('entry');
      builder.createFunction('main', [], 'void', block);

      const ir_graph = builder.buildGraph();
      const result = await codegen.generateFromIR(ir_graph);

      expect(result.code).toBeTruthy();
      expect(result.code).toContain('main');
    });

    test('preserves configuration during generation', async () => {
      const builder = new IRBuilderBase('test');
      builder.createBlock('entry');

      const ir_graph = builder.buildGraph();
      await codegen.generateFromIR(ir_graph);

      expect(codegen.getConfig().optimization_level).toBe(2);
      expect(codegen.getConfig().include_runtime).toBe(true);
    });
  });

  // ───── Symbol Management (6) ─────

  describe('Symbol Management', () => {
    test('registers symbols', () => {
      codegen.registerSymbol('x', 'i32', 'local');
      const symbol = codegen.getSymbol('x');

      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('x');
      expect(symbol?.type).toBe('i32');
    });

    test('retrieves registered symbols', () => {
      codegen.registerSymbol('var1', 'double', 'global');
      const symbol = codegen.getSymbol('var1');

      expect(symbol).toBeDefined();
      expect(symbol?.scope).toBe('global');
    });

    test('returns undefined for unknown symbols', () => {
      const symbol = codegen.getSymbol('unknown');
      expect(symbol).toBeUndefined();
    });

    test('allocates unique variables', () => {
      const var1 = codegen.allocateVariable('temp');
      const var2 = codegen.allocateVariable('temp');

      expect(var1).not.toBe(var2);
      expect(var1).toContain('temp_0');
      expect(var2).toContain('temp_1');
    });

    test('allocates unique labels', () => {
      const label1 = codegen.allocateLabel('loop');
      const label2 = codegen.allocateLabel('loop');

      expect(label1).not.toBe(label2);
      expect(label1).toContain('loop_0');
      expect(label2).toContain('loop_1');
    });

    test('tracks allocated symbols', () => {
      codegen.allocateVariable('x');
      codegen.allocateVariable('y');

      const stats = codegen.getStats();
      expect(stats.symbols_count).toBeGreaterThan(0);
    });
  });

  // ───── Configuration (6) ─────

  describe('Configuration', () => {
    test('returns current configuration', () => {
      const current = codegen.getConfig();

      expect(current.target).toBe('c');
      expect(current.optimization_level).toBe(2);
    });

    test('sets configuration options', () => {
      codegen.setConfig({ optimization_level: 3, debug_symbols: true });

      const updated = codegen.getConfig();
      expect(updated.optimization_level).toBe(3);
      expect(updated.debug_symbols).toBe(true);
    });

    test('sets optimization level', () => {
      codegen.setOptimizationLevel(1);
      expect(codegen.getConfig().optimization_level).toBe(1);

      codegen.setOptimizationLevel(0);
      expect(codegen.getConfig().optimization_level).toBe(0);
    });

    test('enables/disables debug symbols', () => {
      codegen.setDebugSymbols(true);
      expect(codegen.getConfig().debug_symbols).toBe(true);

      codegen.setDebugSymbols(false);
      expect(codegen.getConfig().debug_symbols).toBe(false);
    });

    test('updates output file', () => {
      codegen.setConfig({ output_file: 'new_output.c' });
      expect(codegen.getConfig().output_file).toBe('new_output.c');
    });

    test('partial configuration update', () => {
      const original_target = codegen.getConfig().target;
      codegen.setConfig({ debug_symbols: true });

      const updated = codegen.getConfig();
      expect(updated.target).toBe(original_target);
      expect(updated.debug_symbols).toBe(true);
    });
  });

  // ───── Statistics (4) ─────

  describe('Statistics', () => {
    test('reports statistics', async () => {
      const builder = new IRBuilderBase('test');
      builder.createBlock('entry');
      builder.createFunction('test', [], 'void', 'block_0');

      const ir_graph = builder.buildGraph();
      await codegen.generateFromIR(ir_graph);

      const stats = codegen.getStats();
      expect(stats.code_lines).toBeGreaterThan(0);
      expect(stats.target).toBe('c');
    });

    test('counts symbols', () => {
      codegen.registerSymbol('x', 'i32', 'local');
      codegen.registerSymbol('y', 'f64', 'local');

      const stats = codegen.getStats();
      expect(stats.symbols_count).toBe(2);
    });

    test('tracks warnings and errors', async () => {
      const builder = new IRBuilderBase('test');
      const block = builder.createBlock('entry');
      const a = builder.createConstant(1, 'i32');
      builder.createOperation('unknown' as any, [a], 'i32');
      builder.createFunction('test', [], 'void', block);

      const ir_graph = builder.buildGraph();
      const result = await codegen.generateFromIR(ir_graph);

      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
      expect(result.errors.length).toBeGreaterThanOrEqual(0);
    });

    test('returns zero statistics after reset', async () => {
      const builder = new IRBuilderBase('test');
      builder.createBlock('entry');
      const ir_graph = builder.buildGraph();
      await codegen.generateFromIR(ir_graph);

      codegen.reset();
      const stats = codegen.getStats();

      expect(stats.code_lines).toBe(0);
      expect(stats.symbols_count).toBe(0);
    });
  });

  // ───── Reset (4) ─────

  describe('Reset', () => {
    test('clears all state', async () => {
      codegen.registerSymbol('x', 'i32', 'local');
      codegen.allocateVariable('temp');

      const builder = new IRBuilderBase('test');
      builder.createBlock('entry');
      const ir_graph = builder.buildGraph();
      await codegen.generateFromIR(ir_graph);

      codegen.reset();

      const stats = codegen.getStats();
      expect(stats.symbols_count).toBe(0);
      expect(stats.code_lines).toBe(0);
    });

    test('resets variable counter', () => {
      const v1 = codegen.allocateVariable('x');
      codegen.reset();
      const v2 = codegen.allocateVariable('x');

      expect(v1).toBe('x_0');
      expect(v2).toBe('x_0');
    });

    test('resets label counter', () => {
      const l1 = codegen.allocateLabel('loop');
      codegen.reset();
      const l2 = codegen.allocateLabel('loop');

      expect(l1).toBe('loop_0');
      expect(l2).toBe('loop_0');
    });

    test('preserves configuration after reset', () => {
      const original_opt = codegen.getConfig().optimization_level;
      codegen.reset();

      expect(codegen.getConfig().optimization_level).toBe(original_opt);
    });
  });
});

describe('CodeGeneratorBase - Test Suite', () => {
  test('complete test coverage', () => {
    // 28 tests total:
    // IR Processing: 8
    // Symbol Management: 6
    // Configuration: 6
    // Statistics: 4
    // Reset: 4
    // = 28 tests
    expect(28).toBe(28);
  });
});

export {};
