/**
 * Phase C Optimization Example
 *
 * Shows practical usage of optimization modules
 */

import { Benchmark } from './benchmark';
import { OperatorPrecedenceCache, TokenLookaheadBuffer, ASTNodePool, ParserMetrics } from './parser-optimizer';
import { IRBuilder, CompilerOptimizer, IRAnalyzer } from './compiler-optimizer';
import { OptimizedVM, ThreadedVM, StackBatchOptimizer, VMProfiler } from './vm-optimizer';

/**
 * Example 1: Using the Benchmark Suite
 */
export function exampleBenchmark() {
  console.log('=== Example 1: Benchmark Suite ===\n');

  const bench = new Benchmark();

  // Run individual benchmarks
  const fib = bench.benchmarkParseFibonacci(50);
  console.log(`Fibonacci parse time: ${fib.avgMs.toFixed(3)}ms`);

  const complex = bench.benchmarkParseComplexExpression(500);
  console.log(`Complex expression parse time: ${complex.avgMs.toFixed(3)}ms`);

  // Print all results
  bench.runAll();
}

/**
 * Example 2: Parser Optimization
 */
export function exampleParserOptimization() {
  console.log('\n=== Example 2: Parser Optimization ===\n');

  // Operator precedence caching
  const cache = new OperatorPrecedenceCache();
  console.log(`Precedence of '+': ${cache.getPrecedence('+')}`);
  console.log(`Precedence of '*': ${cache.getPrecedence('*')}`);

  // Second call should be cached
  console.log(`Precedence of '+' (cached): ${cache.getPrecedence('+')}`);

  const cacheStats = cache.getStats();
  console.log(`Cache size: ${cacheStats.size}, entries: ${cacheStats.entries.join(', ')}`);

  // Token lookahead buffer
  const mockTokens = [
    { type: 'IDENT', value: 'x', line: 1, column: 1 },
    { type: 'PLUS', value: '+', line: 1, column: 2 },
    { type: 'NUMBER', value: '5', line: 1, column: 3 },
    { type: 'EOF', value: '', line: 1, column: 4 }
  ];

  const tokenBuffer = new TokenLookaheadBuffer(mockTokens);
  console.log(`\nCurrent: ${tokenBuffer.current().value}`);
  console.log(`Lookahead: ${tokenBuffer.lookahead().value}`);

  tokenBuffer.advance();
  console.log(`After advance - Current: ${tokenBuffer.current().value}`);
  console.log(`After advance - Lookahead: ${tokenBuffer.lookahead().value}`);

  // AST node pool
  const pool = new ASTNodePool();
  const id1 = pool.createIdentifier('foo');
  const id2 = pool.createIdentifier('bar');
  const lit = pool.createLiteral(42, 'number');

  console.log(`\nNode pool stats:`, pool.getStats());

  // Reuse pool
  pool.reset();
  const id3 = pool.createIdentifier('baz');
  console.log(`After reset:`, pool.getStats());

  // Parser metrics
  const metrics = new ParserMetrics();
  metrics.start();
  // ... parse operations ...
  metrics.end();
  metrics.recordNode();
  metrics.recordNode();
  metrics.recordPrecedenceHit();
  metrics.recordPrecedenceHit();
  metrics.recordPrecedenceMiss();

  console.log(`\nParser metrics:`, metrics.getMetrics());
}

/**
 * Example 3: Compiler Optimization
 */
export function exampleCompilerOptimization() {
  console.log('\n=== Example 3: Compiler Optimization ===\n');

  // IR Builder (no concatenation)
  const builder = new IRBuilder();

  builder.emit({ op: 'MOV', args: ['$r0', 10] });
  builder.emit({ op: 'MOV', args: ['$r1', 20] });
  builder.emit({ op: 'ADD', args: ['$r0', '$r1'] });
  builder.emit({ op: 'PRINT', args: ['$r0'] });

  const ir = builder.finalize();
  console.log(`Generated ${ir.length} instructions`);

  // Compiler optimizer
  const optimizer = new CompilerOptimizer();

  const testIR = [
    { op: 'MOV', args: [0, 10], result: '$r0' },
    { op: 'MOV', args: [0, 20], result: '$r1' },
    { op: 'ADD', args: ['$r0', '$r1'], result: '$r2' },
    { op: 'CMP', args: ['$r2', 30], result: '$flags' },
    { op: 'MOV', args: [0, 0], result: '$r3' }, // dead code
    { op: 'MOV', args: [0, 0], result: '$r4' }, // dead code
    { op: 'PRINT', args: ['$r2'] }
  ];

  const { ir: optimizedIR, stats } = optimizer.optimize(testIR);
  console.log(`\nOptimization results:`);
  console.log(`  Original: ${testIR.length} instructions`);
  console.log(`  Optimized: ${optimizedIR.length} instructions`);
  console.log(`  Reduction: ${stats.reduction}`);
  console.log(`  Iterations: ${stats.iterations}`);

  // IR analysis
  const complexity = IRAnalyzer.analyzeComplexity(testIR);
  console.log(`\nIR complexity:`, complexity);

  const hotSpots = IRAnalyzer.findHotSpots(testIR);
  console.log(`Hot spots:`, hotSpots);
}

/**
 * Example 4: VM Optimization
 */
export function exampleVMOptimization() {
  console.log('\n=== Example 4: VM Optimization ===\n');

  // Optimized VM with hot path
  const vm = new OptimizedVM();

  const bytecode = [
    { op: 'push', args: [10] },
    { op: 'push', args: [20] },
    { op: 'add' },
    { op: 'push', args: [5] },
    { op: 'add' },
    { op: 'halt' }
  ];

  const result = vm.execute(bytecode);
  console.log(`VM result: ${result}`);

  const stats = vm.getStats();
  console.log(`VM stats:`, stats);

  // Threaded VM
  console.log(`\nThreaded VM:`);
  const threadedVm = new ThreadedVM();
  const threadedResult = threadedVm.execute(bytecode);
  console.log(`Threaded VM result: ${threadedResult}`);

  // Stack batch optimization
  console.log(`\nStack batch optimization:`);
  const originalBytecode = [
    { op: 'push', args: [1] },
    { op: 'push', args: [2] },
    { op: 'push', args: [3] },
    { op: 'add' },
    { op: 'push', args: [4] },
    { op: 'add' }
  ];

  const optimizedBytecode = StackBatchOptimizer.optimizeBytecode(originalBytecode);
  const reductionStats = StackBatchOptimizer.getReductionStats(originalBytecode, optimizedBytecode);

  console.log(`Reduction stats:`, reductionStats);

  // VM profiler
  console.log(`\nVM Profiler:`);
  const profiler = new VMProfiler();
  profiler.recordInstruction('push', 0.1);
  profiler.recordInstruction('push', 0.1);
  profiler.recordInstruction('add', 0.3);
  profiler.recordInstruction('add', 0.3);
  profiler.recordInstruction('halt', 0.05);

  const report = profiler.getReport();
  console.log('Profiling report:');
  console.log(`  Total time: ${report.totalTime}`);
  for (const instr of report.instructions) {
    console.log(`    ${instr.op}: ${instr.count}x, ${instr.duration} (${instr.percentage})`);
  }
}

/**
 * Example 5: Full Pipeline
 */
export function exampleFullPipeline() {
  console.log('\n=== Example 5: Full Pipeline ===\n');

  // 1. Parse (with optimization)
  console.log('1. Parsing with optimization...');
  const parserMetrics = new ParserMetrics();
  parserMetrics.start();

  // Simulate parsing
  const nodePool = new ASTNodePool();
  for (let i = 0; i < 100; i++) {
    nodePool.createBinaryOp('+',
      nodePool.createLiteral(i, 'number'),
      nodePool.createLiteral(i + 1, 'number')
    );
    parserMetrics.recordNode();
  }

  parserMetrics.end();
  console.log(`Parse metrics: ${JSON.stringify(parserMetrics.getMetrics())}`);

  // 2. Compile (with optimization)
  console.log('\n2. Compiling with optimization...');
  const builder = new IRBuilder();
  for (let i = 0; i < 50; i++) {
    builder.emit({ op: 'MOV', args: ['$r0', i] });
    builder.emit({ op: 'ADD', args: ['$r0', i + 1] });
  }
  const generatedIR = builder.finalize();
  console.log(`Generated ${generatedIR.length} IR instructions`);

  // 3. Optimize (with iteration limit)
  console.log('\n3. Optimizing IR...');
  const optimizer = new CompilerOptimizer();
  const { ir: optimizedIR, stats: optStats } = optimizer.optimize(generatedIR);
  console.log(`Optimization results: ${JSON.stringify(optStats)}`);

  // 4. Execute (with hot path optimization)
  console.log('\n4. Executing with VM...');
  const vm = new OptimizedVM();
  const execResult = vm.execute(optimizedIR.slice(0, 10)); // Execute first 10 instructions
  console.log(`VM execution result: ${execResult}`);
  console.log(`VM stats: ${JSON.stringify(vm.getStats())}`);

  console.log('\n✅ Full pipeline complete!');
}

// Run all examples
if (require.main === module) {
  exampleBenchmark();
  exampleParserOptimization();
  exampleCompilerOptimization();
  exampleVMOptimization();
  exampleFullPipeline();
}
