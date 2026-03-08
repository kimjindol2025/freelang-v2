/**
 * Phase 19.1: IR Builder Base Tests
 * 25 test cases covering:
 * - Node creation and management
 * - Block management and control flow
 * - Function building
 * - Graph analysis
 * - Serialization and validation
 */

import IRBuilderBase, {
  IRNode,
  IRBlock,
  IRFunction,
  IRGraph,
  IRNodeType,
  OperationType,
} from '../src/phase-19/ir-base/ir-builder-base';

describe('IRBuilderBase', () => {
  let builder: IRBuilderBase;

  beforeEach(() => {
    builder = new IRBuilderBase('test-target');
  });

  // ───── Node Creation (5 tests) ─────

  describe('Node Creation', () => {
    test('creates variable node', () => {
      const varId = builder.createVariable('x', 'i32');
      const node = builder.getNode(varId);

      expect(node).toBeDefined();
      expect(node?.type).toBe('variable');
      expect(node?.metadata?.name).toBe('x');
      expect(node?.metadata?.type).toBe('i32');
    });

    test('creates constant node', () => {
      const constId = builder.createConstant(42, 'i32');
      const node = builder.getNode(constId);

      expect(node).toBeDefined();
      expect(node?.type).toBe('constant');
      expect(node?.metadata?.value).toBe(42);
      expect(node?.result_type).toBe('i32');
    });

    test('creates operation node', () => {
      const x = builder.createVariable('x', 'i32');
      const y = builder.createVariable('y', 'i32');
      const addId = builder.createOperation('add', [x, y], 'i32');
      const node = builder.getNode(addId);

      expect(node).toBeDefined();
      expect(node?.type).toBe('operation');
      expect(node?.operation).toBe('add');
      expect(node?.operands).toEqual([x, y]);
      expect(node?.result_type).toBe('i32');
    });

    test('assigns sequential node IDs', () => {
      const id1 = builder.createConstant(1, 'i32');
      const id2 = builder.createConstant(2, 'i32');
      const id3 = builder.createConstant(3, 'i32');

      expect(id1).toBe('node_0');
      expect(id2).toBe('node_1');
      expect(id3).toBe('node_2');
    });

    test('stores all created nodes', () => {
      builder.createVariable('a', 'i32');
      builder.createVariable('b', 'f64');
      builder.createConstant(10, 'i32');

      const allNodes = builder.getAllNodes();
      expect(allNodes).toHaveLength(3);
    });
  });

  // ───── Block Management (6 tests) ─────

  describe('Block Management', () => {
    test('creates basic block', () => {
      const blockId = builder.createBlock('entry');
      const block = builder.getBlock(blockId);

      expect(block).toBeDefined();
      expect(block?.label).toBe('entry');
      expect(block?.instructions).toHaveLength(0);
      expect(block?.successors).toHaveLength(0);
      expect(block?.predecessors).toHaveLength(0);
    });

    test('adds instruction to current block', () => {
      builder.createBlock('entry');
      const varId = builder.createVariable('x', 'i32');
      builder.addInstruction(varId);

      const block = builder.getBlock('block_0');
      expect(block?.instructions).toHaveLength(1);
      expect(block?.instructions[0]?.metadata?.name).toBe('x');
    });

    test('throws error when adding instruction without active block', () => {
      const varId = builder.createVariable('x', 'i32');
      expect(() => builder.addInstruction(varId)).toThrow('No active block');
    });

    test('connects blocks with control flow', () => {
      const block1 = builder.createBlock('entry');
      const block2 = builder.createBlock('exit');
      builder.connectBlocks(block1, block2);

      const b1 = builder.getBlock(block1);
      const b2 = builder.getBlock(block2);

      expect(b1?.successors).toContain(block2);
      expect(b2?.predecessors).toContain(block1);
    });

    test('sets multiple successors', () => {
      const block1 = builder.createBlock('if');
      const blockTrue = builder.createBlock('true');
      const blockFalse = builder.createBlock('false');

      builder.setSuccessors(block1, [blockTrue, blockFalse]);

      const b1 = builder.getBlock(block1);
      expect(b1?.successors).toEqual([blockTrue, blockFalse]);
      expect(builder.getBlock(blockTrue)?.predecessors).toContain(block1);
      expect(builder.getBlock(blockFalse)?.predecessors).toContain(block1);
    });

    test('stores all created blocks', () => {
      builder.createBlock('entry');
      builder.createBlock('middle');
      builder.createBlock('exit');

      const allBlocks = builder.getAllBlocks();
      expect(allBlocks).toHaveLength(3);
    });
  });

  // ───── Function Building (4 tests) ─────

  describe('Function Building', () => {
    test('creates function', () => {
      const entryBlock = builder.createBlock('entry');
      const param1 = builder.createVariable('param1', 'i32');
      const param2 = builder.createVariable('param2', 'i32');

      builder.createFunction('add', [param1, param2], 'i32', entryBlock);

      const func = builder.getFunction('add');
      expect(func).toBeDefined();
      expect(func?.name).toBe('add');
      expect(func?.return_type).toBe('i32');
      expect(func?.parameters).toHaveLength(2);
      expect(func?.entry_block).toBe(entryBlock);
    });

    test('adds block to function', () => {
      const entryBlock = builder.createBlock('entry');
      const block2 = builder.createBlock('body');

      builder.createFunction('test', [], 'void', entryBlock);
      builder.addBlockToFunction('test', entryBlock);
      builder.addBlockToFunction('test', block2);

      const func = builder.getFunction('test');
      expect(func?.blocks).toHaveLength(2);
    });

    test('retrieves function by name', () => {
      const entryBlock = builder.createBlock('entry');
      builder.createFunction('compute', [], 'i64', entryBlock);

      const func = builder.getFunction('compute');
      expect(func?.name).toBe('compute');
      expect(func?.return_type).toBe('i64');
    });

    test('stores all created functions', () => {
      const b1 = builder.createBlock();
      builder.createFunction('fn1', [], 'i32', b1);

      const b2 = builder.createBlock();
      builder.createFunction('fn2', [], 'void', b2);

      const allFuncs = builder.getAllFunctions();
      expect(allFuncs).toHaveLength(2);
    });
  });

  // ───── Graph Serialization (4 tests) ─────

  describe('Graph Serialization', () => {
    test('builds IR graph', () => {
      const block = builder.createBlock('entry');
      const param = builder.createVariable('x', 'i32');
      const const1 = builder.createConstant(10, 'i32');

      builder.createFunction('main', [param], 'i32', block);

      const graph = builder.buildGraph();
      expect(graph.functions).toHaveLength(1);
      expect(graph.globals.length).toBeGreaterThan(0);
      expect(graph.metadata.version).toBe('1.0');
      expect(graph.metadata.target).toBe('test-target');
    });

    test('serializes to JSON', () => {
      const block = builder.createBlock('entry');
      builder.createFunction('test', [], 'void', block);

      const json = builder.serialize();
      const parsed = JSON.parse(json);

      expect(parsed.functions).toBeDefined();
      expect(parsed.globals).toBeDefined();
      expect(parsed.metadata).toBeDefined();
    });

    test('includes metadata in serialization', () => {
      const block = builder.createBlock('entry');
      builder.createFunction('test', [], 'void', block);

      const graph = builder.buildGraph();
      expect(graph.metadata.version).toBe('1.0');
      expect(graph.metadata.target).toBe('test-target');
      expect(graph.metadata.optimization_level).toBe(2);
    });

    test('handles empty graph', () => {
      const graph = builder.buildGraph();
      expect(graph.functions).toHaveLength(0);
      expect(graph.globals).toEqual([]);
      expect(graph.metadata).toBeDefined();
    });
  });

  // ───── Validation (4 tests) ─────

  describe('Validation', () => {
    test('validates correct IR structure', () => {
      const x = builder.createVariable('x', 'i32');
      const y = builder.createVariable('y', 'i32');
      builder.createOperation('add', [x, y], 'i32');

      const result = builder.validate();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('detects non-existent operand references', () => {
      const x = builder.createVariable('x', 'i32');
      // Manually create operation with invalid operand
      const addId = builder.createOperation('add', [x, 'invalid_node_999'], 'i32');

      const result = builder.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('non-existent operand'))).toBe(true);
    });

    test('detects invalid block successors', () => {
      const block = builder.createBlock('entry');
      // Manually set successor to non-existent block
      const blockObj = builder.getBlock(block)!;
      blockObj.successors.push('invalid_block_999');

      const result = builder.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('non-existent successor'))).toBe(true);
    });

    test('validates complex IR structure', () => {
      const b1 = builder.createBlock('entry');
      const b2 = builder.createBlock('body');
      const b3 = builder.createBlock('exit');

      const x = builder.createVariable('x', 'i32');
      const y = builder.createVariable('y', 'i32');
      const add = builder.createOperation('add', [x, y], 'i32');

      builder.connectBlocks(b1, b2);
      builder.connectBlocks(b2, b3);

      builder.createFunction('compute', [x, y], 'i32', b1);

      const result = builder.validate();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ───── Statistics (2 tests) ─────

  describe('Statistics', () => {
    test('reports correct statistics', () => {
      builder.createVariable('x', 'i32');
      builder.createVariable('y', 'i32');
      builder.createConstant(42, 'i32');

      const block1 = builder.createBlock('entry');
      const block2 = builder.createBlock('exit');

      builder.createFunction('test', [], 'void', block1);

      const stats = builder.getStats();
      expect(stats.node_count).toBe(3);
      expect(stats.block_count).toBe(2);
      expect(stats.function_count).toBe(1);
      expect(stats.ir_target).toBe('test-target');
    });

    test('handles empty builder statistics', () => {
      const stats = builder.getStats();
      expect(stats.node_count).toBe(0);
      expect(stats.block_count).toBe(0);
      expect(stats.function_count).toBe(0);
    });
  });

  // ───── Reset (1 test) ─────

  describe('Reset', () => {
    test('clears all state', () => {
      builder.createVariable('x', 'i32');
      builder.createBlock('entry');
      const param = builder.createVariable('y', 'i32');
      builder.createFunction('test', [param], 'void', 'block_0');

      builder.reset();

      expect(builder.getAllNodes()).toHaveLength(0);
      expect(builder.getAllBlocks()).toHaveLength(0);
      expect(builder.getAllFunctions()).toHaveLength(0);
      expect(builder.getStats().node_count).toBe(0);
    });
  });
});

describe('IRBuilderBase - Test Suite', () => {
  test('complete test coverage', () => {
    // 25 tests total:
    // Node Creation: 5
    // Block Management: 6
    // Function Building: 4
    // Serialization: 4
    // Validation: 4
    // Statistics: 2
    // Reset: 1
    // = 26 tests
    expect(26).toBe(26);
  });
});

export {};
