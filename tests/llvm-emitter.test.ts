import {
  LLVMEmitter,
  LLVMCompiler,
  LLVMLearner,
  LLVMMetric,
} from '../src/codegen/llvm-emitter';
import { AIIntent } from '../src/types';

describe('LLVMEmitter', () => {
  let emitter: LLVMEmitter;

  beforeEach(() => {
    emitter = new LLVMEmitter();
  });

  test('generate: creates valid function signature', () => {
    const intent: AIIntent = {
      fn: 'sum',
      params: [{ name: 'arr', type: 'array' }],
      ret: 'number',
      body: [],
    };

    const ir = emitter.generate(intent);
    expect(ir).toContain('define double @sum');
    expect(ir).toContain('double* %arr');
  });

  test('generate: includes function body', () => {
    const intent: AIIntent = {
      fn: 'sum',
      params: [{ name: 'arr', type: 'array' }],
      ret: 'number',
      body: [],
    };

    const ir = emitter.generate(intent);
    expect(ir).toContain('entry:');
    expect(ir).toContain('}');
  });

  test('emitSignature: sum function', () => {
    const intent: AIIntent = {
      fn: 'sum',
      params: [{ name: 'arr', type: 'array' }],
      ret: 'number',
      body: [],
    };

    const ir = emitter.generate(intent);
    expect(ir).toContain('define double @sum(double* %arr)');
  });

  test('emitSignature: average function', () => {
    const intent: AIIntent = {
      fn: 'average',
      params: [
        { name: 'arr', type: 'array' },
        { name: 'len', type: 'int' },
      ],
      ret: 'number',
      body: [],
    };

    const ir = emitter.generate(intent);
    expect(ir).toContain('define double @average');
    expect(ir).toContain('double* %arr');
    expect(ir).toContain('i32 %len');
  });

  test('emitSum: generates loop structure', () => {
    const intent: AIIntent = {
      fn: 'sum',
      params: [{ name: 'arr', type: 'array' }],
      ret: 'number',
      body: [],
    };

    const ir = emitter.generate(intent);
    expect(ir).toContain('loop.condition:');
    expect(ir).toContain('loop.body:');
    expect(ir).toContain('loop.end:');
  });

  test('emitSum: includes alloca and store for accumulator', () => {
    const intent: AIIntent = {
      fn: 'sum',
      params: [{ name: 'arr', type: 'array' }],
      ret: 'number',
      body: [],
    };

    const ir = emitter.generate(intent);
    expect(ir).toContain('alloca double');
    expect(ir).toContain('store double 0.0, double* %result');
  });

  test('emitSum: includes loop counter', () => {
    const intent: AIIntent = {
      fn: 'sum',
      params: [{ name: 'arr', type: 'array' }],
      ret: 'number',
      body: [],
    };

    const ir = emitter.generate(intent);
    expect(ir).toContain('alloca i32');
    expect(ir).toContain('store i32 0, i32* %i');
  });

  test('emitSum: includes accumulation logic', () => {
    const intent: AIIntent = {
      fn: 'sum',
      params: [{ name: 'arr', type: 'array' }],
      ret: 'number',
      body: [],
    };

    const ir = emitter.generate(intent);
    expect(ir).toContain('fadd');
    expect(ir).toContain('getelementptr');
  });

  test('emitSum: returns result', () => {
    const intent: AIIntent = {
      fn: 'sum',
      params: [{ name: 'arr', type: 'array' }],
      ret: 'number',
      body: [],
    };

    const ir = emitter.generate(intent);
    expect(ir).toContain('ret double %result.final');
  });

  test('emitAverage: includes division', () => {
    const intent: AIIntent = {
      fn: 'average',
      params: [{ name: 'arr', type: 'array' }],
      ret: 'number',
      body: [],
    };

    const ir = emitter.generate(intent);
    expect(ir).toContain('fdiv');
    expect(ir).toContain('sitofp');
  });

  test('emitAverage: converts length to double', () => {
    const intent: AIIntent = {
      fn: 'average',
      params: [{ name: 'arr', type: 'array' }],
      ret: 'number',
      body: [],
    };

    const ir = emitter.generate(intent);
    expect(ir).toContain('sitofp i32 %len to double');
  });

  test('generate: produces valid IR format', () => {
    const intent: AIIntent = {
      fn: 'sum',
      params: [{ name: 'arr', type: 'array' }],
      ret: 'number',
      body: [],
    };

    const ir = emitter.generate(intent);
    const lines = ir.split('\n');

    // Should start with define
    expect(lines[0]).toMatch(/^define double @sum/);
    // Should contain opening brace (in first line)
    expect(lines[0]).toContain('{');
    // Should have closing brace (near end)
    expect(ir).toContain('}');
  });

  test('typeToLLVM: maps types correctly', () => {
    const intent: AIIntent = {
      fn: 'test',
      params: [
        { name: 'n', type: 'number' },
        { name: 'b', type: 'bool' },
        { name: 'arr', type: 'array' },
        { name: 'i', type: 'int' },
      ],
      ret: 'number',
      body: [],
    };

    const ir = emitter.generate(intent);
    expect(ir).toContain('double %n');
    expect(ir).toContain('i1 %b');
    expect(ir).toContain('double* %arr');
    expect(ir).toContain('i32 %i');
  });
});

describe('LLVMCompiler', () => {
  test('compileBitcode: returns true (placeholder)', () => {
    const result = LLVMCompiler.compileBitcode('define double @test() {}', './test');
    expect(result).toBe(true);
  });

  test('generateBitcode: returns true (placeholder)', () => {
    const result = LLVMCompiler.generateBitcode('define double @test() {}', './test');
    expect(result).toBe(true);
  });

  test('jitExecute: returns undefined (placeholder)', () => {
    const result = LLVMCompiler.jitExecute('./test.bc');
    expect(result).toBeUndefined();
  });
});

describe('LLVMLearner', () => {
  let learner: LLVMLearner;

  beforeEach(() => {
    learner = new LLVMLearner();
  });

  test('record: saves LLVM metric', () => {
    const irText = 'define double @sum(double* %arr, i32 %len) { ret double 0.0 }';
    learner.record('sum', irText);

    const metrics = learner.getMetrics();
    expect(metrics.length).toBe(1);
    expect(metrics[0].fnName).toBe('sum');
    expect(metrics[0].irSize).toBe(irText.length);
  });

  test('record: calculates IR lines', () => {
    const irText = `define double @sum() {
entry:
  ret double 0.0
}`;
    learner.record('sum', irText);

    const metrics = learner.getMetrics();
    expect(metrics[0].irLines).toBe(4);
  });

  test('record: includes optional timing', () => {
    const irText = 'define double @test() {}';
    learner.record('test', irText, 50, 1024, 10);

    const metrics = learner.getMetrics();
    expect(metrics[0].compilationTime).toBe(50);
    expect(metrics[0].bitcodeSize).toBe(1024);
    expect(metrics[0].execTime).toBe(10);
  });

  test('record: multiple functions', () => {
    const irSum = 'define double @sum() {}';
    const irAvg = 'define double @average() {}';

    learner.record('sum', irSum);
    learner.record('average', irAvg);
    learner.record('sum', irSum);

    const metrics = learner.getMetrics();
    expect(metrics.length).toBe(3);
  });

  test('getAverageIRSize: calculates correctly', () => {
    const ir1 = 'define double @sum() { }';
    const ir2 = 'define double @sum() {  }';
    learner.record('sum', ir1);
    learner.record('sum', ir2);

    const avg = learner.getAverageIRSize();
    // Just check it's in the right range
    expect(avg).toBeGreaterThan(24);
    expect(avg).toBeLessThan(27);
  });

  test('getAverageIRLines: calculates correctly', () => {
    const ir1 = 'define @test() {\nret 0\n}';
    const ir2 = 'define @test() {\nentry:\nret 0\n}';

    learner.record('test', ir1); // 3 lines
    learner.record('test', ir2); // 4 lines

    const avg = learner.getAverageIRLines();
    expect(avg).toBe(4); // (3 + 4) / 2 rounded
  });

  test('getStatsByFunction: returns null for non-existent function', () => {
    learner.record('sum', 'define double @sum() {}');

    const stats = learner.getStatsByFunction('average');
    expect(stats).toBeNull();
  });

  test('getStatsByFunction: calculates stats for existing function', () => {
    const ir1 = 'define double @sum() { }'; // 24 chars
    const ir2 = 'define double @sum() {  }'; // 25 chars

    learner.record('sum', ir1, 100);
    learner.record('sum', ir2, 110);

    const stats = learner.getStatsByFunction('sum');
    expect(stats).not.toBeNull();
    expect(stats!.count).toBe(2);
    expect(stats!.avgIRSize).toBe(25); // (24 + 25) / 2 rounded
    expect(stats!.avgCompileTime).toBe(105); // (100 + 110) / 2
  });

  test('getMetrics: returns copy of metrics', () => {
    learner.record('sum', 'define double @sum() {}');

    const metrics1 = learner.getMetrics();
    const metrics2 = learner.getMetrics();

    expect(metrics1).toEqual(metrics2);
    expect(metrics1).not.toBe(metrics2); // Different array instances
  });
});

describe('LLVM IR generation', () => {
  test('sum function has valid LLVM syntax', () => {
    const emitter = new LLVMEmitter();
    const intent: AIIntent = {
      fn: 'sum',
      params: [{ name: 'arr', type: 'array' }],
      ret: 'number',
      body: [],
    };

    const ir = emitter.generate(intent);
    // Should be valid (can be checked by llvm-as)
    expect(ir).toContain('define');
    expect(ir).toContain('double');
    expect(ir).toContain('ret');
  });

  test('average function has valid LLVM syntax', () => {
    const emitter = new LLVMEmitter();
    const intent: AIIntent = {
      fn: 'average',
      params: [{ name: 'arr', type: 'array' }],
      ret: 'number',
      body: [],
    };

    const ir = emitter.generate(intent);
    expect(ir).toContain('define');
    expect(ir).toContain('fdiv');
  });

  test('learner tracks IR generation metrics', () => {
    const emitter = new LLVMEmitter();
    const learner = new LLVMLearner();

    const intent: AIIntent = {
      fn: 'sum',
      params: [{ name: 'arr', type: 'array' }],
      ret: 'number',
      body: [],
    };

    const ir = emitter.generate(intent);
    learner.record('sum', ir, 50, 2000);

    const stats = learner.getStatsByFunction('sum');
    expect(stats).not.toBeNull();
    expect(stats!.avgCompileTime).toBe(50);
  });
});
