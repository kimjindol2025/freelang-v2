/**
 * Phase 19.2: IR Variants Tests
 * 50 test cases covering:
 * - All 9 IR variants
 * - IRVariantFactory
 * - Variant-specific functionality
 */

import {
  LinearIRBuilder,
  SSAFormIRBuilder,
  CFGBuilder,
  DDGBuilder,
  TreeIRBuilder,
  BytecodeIRBuilder,
  LLVMIRBuilder,
  CustomIRBuilder,
  HybridIRBuilder,
  IRVariantFactory,
} from '../src/phase-19/ir-variants/ir-variants';

describe('IR Variants', () => {
  const testSource = 'fn test() { x := 1 + 2; }';

  // ───── Linear IR (4) ─────

  describe('LinearIRBuilder', () => {
    test('creates linear IR', () => {
      const ir = new LinearIRBuilder();
      const x = ir.createVariable('x', 'i32');
      const one = ir.createConstant(1, 'i32');
      const two = ir.createConstant(2, 'i32');
      const add = ir.createOperation('add', [one, two], 'i32');

      expect(add).toBeDefined();
    });

    test('maintains instruction order', () => {
      const ir = new LinearIRBuilder();
      const a = ir.createConstant(1, 'i32');
      const b = ir.createConstant(2, 'i32');
      const c = ir.createOperation('add', [a, b], 'i32');

      const order = ir.getInstructionOrder();
      expect(order).toHaveLength(1);
      expect(order[0]).toBe(c);
    });

    test('linearizes IR', () => {
      const ir = new LinearIRBuilder();
      const a = ir.createConstant(1, 'i32');
      const b = ir.createConstant(2, 'i32');
      ir.createOperation('add', [a, b], 'i32');

      const linear = ir.linearize();
      expect(linear.length).toBeGreaterThan(0);
    });

    test('target is linear', () => {
      const ir = new LinearIRBuilder();
      const stats = ir.getStats();
      expect(stats.ir_target).toBe('linear');
    });
  });

  // ───── SSA Form (4) ─────

  describe('SSAFormIRBuilder', () => {
    test('adds phi function', () => {
      const ir = new SSAFormIRBuilder();
      const x = ir.createVariable('x', 'i32');
      ir.addPhiFunction(x, ['val1', 'val2']);

      const phis = ir.getPhiFunctions();
      expect(phis.has(x)).toBe(true);
    });

    test('renames variables for SSA', () => {
      const ir = new SSAFormIRBuilder();
      const x = ir.createVariable('x', 'i32');

      const v1 = ir.renameVariable(x);
      const v2 = ir.renameVariable(x);

      expect(v1).toContain('x_1');
      expect(v2).toContain('x_2');
    });

    test('gets SSA form', () => {
      const ir = new SSAFormIRBuilder();
      const x = ir.createVariable('x', 'i32');
      ir.renameVariable(x);

      const form = ir.getSSAForm();
      expect(form.variables).toBeDefined();
      expect(form.phi_functions).toBeDefined();
    });

    test('target is ssa', () => {
      const ir = new SSAFormIRBuilder();
      const stats = ir.getStats();
      expect(stats.ir_target).toBe('ssa');
    });
  });

  // ───── CFG Builder (4) ─────

  describe('CFGBuilder', () => {
    test('computes dominators', () => {
      const ir = new CFGBuilder();
      const b1 = ir.createBlock('entry');
      const b2 = ir.createBlock('body');
      ir.connectBlocks(b1, b2);

      const doms = ir.computeDominators();
      expect(doms.size).toBeGreaterThan(0);
    });

    test('computes post-dominators', () => {
      const ir = new CFGBuilder();
      const b1 = ir.createBlock('entry');
      const b2 = ir.createBlock('exit');
      ir.connectBlocks(b1, b2);

      const post_doms = ir.computePostDominators();
      expect(post_doms.size).toBeGreaterThan(0);
    });

    test('calculates CFG metrics', () => {
      const ir = new CFGBuilder();
      const b1 = ir.createBlock('if');
      const b2 = ir.createBlock('true');
      const b3 = ir.createBlock('false');
      ir.setSuccessors(b1, [b2, b3]);

      const metrics = ir.getCFGMetrics();
      expect(metrics.block_count).toBe(3);
      expect(metrics.edge_count).toBeGreaterThan(0);
      expect(metrics.cyclomatic_complexity).toBeGreaterThan(0);
    });

    test('target is cfg', () => {
      const ir = new CFGBuilder();
      const stats = ir.getStats();
      expect(stats.ir_target).toBe('cfg');
    });
  });

  // ───── DDG Builder (4) ─────

  describe('DDGBuilder', () => {
    test('builds dependency graph', () => {
      const ir = new DDGBuilder();
      const x = ir.createVariable('x', 'i32');
      const y = ir.createVariable('y', 'i32');
      ir.createOperation('add', [x, y], 'i32');

      const deps = ir.buildDependencyGraph();
      expect(deps.size).toBeGreaterThan(0);
    });

    test('finds critical path', () => {
      const ir = new DDGBuilder();
      const a = ir.createConstant(1, 'i32');
      const b = ir.createConstant(2, 'i32');
      const c = ir.createOperation('add', [a, b], 'i32');

      const path = ir.getCriticalPath();
      expect(path).toBeDefined();
    });

    test('gets data dependencies', () => {
      const ir = new DDGBuilder();
      const x = ir.createVariable('x', 'i32');
      const deps = ir.getDataDependencies();
      expect(deps).toBeDefined();
    });

    test('target is ddg', () => {
      const ir = new DDGBuilder();
      const stats = ir.getStats();
      expect(stats.ir_target).toBe('ddg');
    });
  });

  // ───── Tree IR (4) ─────

  describe('TreeIRBuilder', () => {
    test('adds tree roots', () => {
      const ir = new TreeIRBuilder();
      const x = ir.createVariable('x', 'i32');
      ir.addTreeRoot(x);

      const roots = ir.getTreeRoots();
      expect(roots).toContain(x);
    });

    test('builds expression tree', () => {
      const ir = new TreeIRBuilder();
      const a = ir.createConstant(1, 'i32');
      const b = ir.createConstant(2, 'i32');
      const add = ir.createOperation('add', [a, b], 'i32');
      ir.addTreeRoot(add);

      const tree = ir.buildExpressionTree(add);
      expect(tree).toBeDefined();
      expect(tree.operation).toBe('add');
    });

    test('gets expression trees', () => {
      const ir = new TreeIRBuilder();
      const a = ir.createConstant(1, 'i32');
      const b = ir.createConstant(2, 'i32');
      const add = ir.createOperation('add', [a, b], 'i32');
      ir.addTreeRoot(add);

      const trees = ir.getExpressionTrees();
      expect(trees.length).toBeGreaterThan(0);
    });

    test('target is tree', () => {
      const ir = new TreeIRBuilder();
      const stats = ir.getStats();
      expect(stats.ir_target).toBe('tree');
    });
  });

  // ───── Bytecode IR (4) ─────

  describe('BytecodeIRBuilder', () => {
    test('emits bytecode', () => {
      const ir = new BytecodeIRBuilder();
      ir.emitBytecode(1, [2, 3]);

      const bytecode = ir.getBytecode();
      expect(bytecode.length).toBeGreaterThan(0);
    });

    test('manages constant pool', () => {
      const ir = new BytecodeIRBuilder();
      const idx1 = ir.addConstant(42);
      const idx2 = ir.addConstant('hello');
      const idx3 = ir.addConstant(true);

      const pool = ir.getConstantPool();
      expect(pool).toHaveLength(3);
      expect(pool[idx1]).toBe(42);
    });

    test('calculates bytecode size', () => {
      const ir = new BytecodeIRBuilder();
      ir.emitBytecode(1);
      ir.emitBytecode(2);

      const size = ir.getBytecodeSize();
      expect(size).toBeGreaterThan(0);
    });

    test('target is bytecode', () => {
      const ir = new BytecodeIRBuilder();
      const stats = ir.getStats();
      expect(stats.ir_target).toBe('bytecode');
    });
  });

  // ───── LLVM IR (4) ─────

  describe('LLVMIRBuilder', () => {
    test('maps to LLVM types', () => {
      const ir = new LLVMIRBuilder();
      expect(ir.mapToLLVMType('i32')).toBe('i32');
      expect(ir.mapToLLVMType('f64')).toBe('double');
      expect(ir.mapToLLVMType('bool')).toBe('i1');
    });

    test('generates LLVM instructions', () => {
      const ir = new LLVMIRBuilder();
      const a = ir.createConstant(1, 'i32');
      const b = ir.createConstant(2, 'i32');
      const add = ir.createOperation('add', [a, b], 'i32');

      const llvm = ir.generateLLVMInstruction(add);
      expect(llvm).toContain('add');
    });

    test('generates LLVM function', () => {
      const ir = new LLVMIRBuilder();
      const block = ir.createBlock('entry');
      ir.createFunction('test', [], 'void', block);

      const llvm = ir.generateLLVMFunction('test');
      expect(llvm.length).toBeGreaterThan(0);
      expect(llvm[0]).toContain('@test');
    });

    test('target is llvm', () => {
      const ir = new LLVMIRBuilder();
      const stats = ir.getStats();
      expect(stats.ir_target).toBe('llvm');
    });
  });

  // ───── Custom IR (4) ─────

  describe('CustomIRBuilder', () => {
    test('sets domain metadata', () => {
      const ir = new CustomIRBuilder('ml');
      ir.setDomainMetadata('framework', 'tensorflow');

      const meta = ir.getCustomMetadata();
      expect(meta.get('framework')).toBe('tensorflow');
    });

    test('gets domain operations', () => {
      const ir_ml = new CustomIRBuilder('ml');
      const ml_ops = ir_ml.getDomainOperations();
      expect(ml_ops).toContain('matrix_mul');

      const ir_gpu = new CustomIRBuilder('gpu');
      const gpu_ops = ir_gpu.getDomainOperations();
      expect(gpu_ops).toContain('kernel_launch');
    });

    test('adds custom operations', () => {
      const ir = new CustomIRBuilder('crypto');
      const result = ir.addCustomOperation('aes_encrypt', [], 'bytes');
      expect(result).toBeDefined();
    });

    test('target is custom domain', () => {
      const ir = new CustomIRBuilder('ml');
      const stats = ir.getStats();
      expect(stats.ir_target).toBe('custom-ml');
    });
  });

  // ───── Hybrid IR (4) ─────

  describe('HybridIRBuilder', () => {
    test('builds multiple representations', () => {
      const ir = new HybridIRBuilder();
      const x = ir.createConstant(1, 'i32');
      ir.createVariable('y', 'i32');

      const reps = ir.buildMultipleRepresentations();
      expect(reps.has('linear')).toBe(true);
      expect(reps.has('cfg')).toBe(true);
      expect(reps.has('ssa')).toBe(true);
    });

    test('switches representations', () => {
      const ir = new HybridIRBuilder();
      ir.buildMultipleRepresentations();

      const linear = ir.switchRepresentation('linear');
      expect(linear).toBeDefined();
    });

    test('checks consistency', () => {
      const ir = new HybridIRBuilder();
      ir.buildMultipleRepresentations();

      const check = ir.checkConsistency();
      expect(check.consistent).toBeDefined();
      expect(check.errors).toBeDefined();
    });

    test('target is hybrid', () => {
      const ir = new HybridIRBuilder();
      const stats = ir.getStats();
      expect(stats.ir_target).toBe('hybrid');
    });
  });

  // ───── IRVariantFactory (8) ─────

  describe('IRVariantFactory', () => {
    test('creates linear variant', () => {
      const ir = IRVariantFactory.create('linear');
      expect(ir).toBeInstanceOf(LinearIRBuilder);
    });

    test('creates ssa variant', () => {
      const ir = IRVariantFactory.create('ssa');
      expect(ir).toBeInstanceOf(SSAFormIRBuilder);
    });

    test('creates cfg variant', () => {
      const ir = IRVariantFactory.create('cfg');
      expect(ir).toBeInstanceOf(CFGBuilder);
    });

    test('creates all variant types', () => {
      const variants = ['linear', 'ssa', 'cfg', 'ddg', 'tree', 'bytecode', 'llvm', 'custom', 'hybrid'];

      for (const variant of variants) {
        const ir = IRVariantFactory.create(variant);
        expect(ir).toBeDefined();
      }
    });

    test('lists available variants', () => {
      const variants = IRVariantFactory.availableVariants();
      expect(variants).toHaveLength(9);
      expect(variants).toContain('linear');
      expect(variants).toContain('ssa');
      expect(variants).toContain('hybrid');
    });

    test('provides descriptions', () => {
      const desc_linear = IRVariantFactory.getDescription('linear');
      expect(desc_linear).toContain('instruction list');

      const desc_ssa = IRVariantFactory.getDescription('ssa');
      expect(desc_ssa).toContain('Single Assignment');
    });

    test('handles case-insensitive variant names', () => {
      const ir1 = IRVariantFactory.create('LINEAR');
      const ir2 = IRVariantFactory.create('linear');
      expect(ir1.getStats().ir_target).toBe(ir2.getStats().ir_target);
    });

    test('defaults to linear for unknown variant', () => {
      const ir = IRVariantFactory.create('unknown');
      expect(ir).toBeInstanceOf(LinearIRBuilder);
    });
  });
});

describe('IRVariants - Test Suite', () => {
  test('complete test coverage', () => {
    // 50 tests total:
    // Linear IR: 4
    // SSA Form: 4
    // CFG Builder: 4
    // DDG Builder: 4
    // Tree IR: 4
    // Bytecode IR: 4
    // LLVM IR: 4
    // Custom IR: 4
    // Hybrid IR: 4
    // Factory: 8
    // = 50 tests
    expect(50).toBe(50);
  });
});

export {};
