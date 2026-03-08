/**
 * FreeLang v2 Performance Benchmark Suite (Phase C)
 *
 * Measures parser, compiler, and VM execution performance
 * Target: 10x improvement across all components
 */

import { Lexer } from '../lexer/lexer';
import { TokenBuffer } from '../lexer/lexer';
import { Parser } from '../parser/parser';

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
}

export class Benchmark {
  private results: BenchmarkResult[] = [];

  /**
   * Run a benchmark test with timing
   */
  private measureTime(fn: () => void, iterations: number = 1): { totalMs: number; avgMs: number; minMs: number; maxMs: number } {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      fn();
      const end = performance.now();
      times.push(end - start);
    }

    const totalMs = times.reduce((a, b) => a + b, 0);
    const avgMs = totalMs / iterations;
    const minMs = Math.min(...times);
    const maxMs = Math.max(...times);

    return { totalMs, avgMs, minMs, maxMs };
  }

  /**
   * Benchmark 1: Parse fibonacci(10) function definition
   */
  benchmarkParseFibonacci(iterations: number = 100): BenchmarkResult {
    const code = `
      fn fib(n) {
        if (n <= 1) {
          return n
        }
        return fib(n - 1) + fib(n - 2)
      }
    `;

    const { totalMs, avgMs, minMs, maxMs } = this.measureTime(() => {
      const lexer = new Lexer(code);
      const tokens = new TokenBuffer(lexer);
      const parser = new Parser(tokens);
      parser.parseModule();
    }, iterations);

    const result: BenchmarkResult = {
      name: 'Parse fibonacci(10)',
      iterations,
      totalMs,
      avgMs,
      minMs,
      maxMs
    };

    this.results.push(result);
    return result;
  }

  /**
   * Benchmark 2: Parse complex binary expression
   */
  benchmarkParseComplexExpression(iterations: number = 1000): BenchmarkResult {
    const code = `
      fn calculate() {
        return 2 + 3 * 4 + 5 * 6 * 7 + 8 - 9 / 10
      }
    `;

    const { totalMs, avgMs, minMs, maxMs } = this.measureTime(() => {
      const lexer = new Lexer(code);
      const tokens = new TokenBuffer(lexer);
      const parser = new Parser(tokens);
      parser.parseModule();
    }, iterations);

    const result: BenchmarkResult = {
      name: 'Parse complex expression',
      iterations,
      totalMs,
      avgMs,
      minMs,
      maxMs
    };

    this.results.push(result);
    return result;
  }

  /**
   * Benchmark 3: Parse deeply nested expressions
   */
  benchmarkParseNestedExpressions(iterations: number = 500): BenchmarkResult {
    const code = `
      fn nested() {
        return ((((2 + 3) * 4) + 5) * (6 * (7 + 8))) + (9 * (10 + (11 * (12 + 13))))
      }
    `;

    const { totalMs, avgMs, minMs, maxMs } = this.measureTime(() => {
      const lexer = new Lexer(code);
      const tokens = new TokenBuffer(lexer);
      const parser = new Parser(tokens);
      parser.parseModule();
    }, iterations);

    const result: BenchmarkResult = {
      name: 'Parse nested expressions',
      iterations,
      totalMs,
      avgMs,
      minMs,
      maxMs
    };

    this.results.push(result);
    return result;
  }

  /**
   * Benchmark 4: Parse multiple function definitions
   */
  benchmarkParseMultipleFunctions(iterations: number = 100): BenchmarkResult {
    const code = `
      fn foo() { return 1 }
      fn bar() { return 2 }
      fn baz() { return 3 }
      fn qux() { return 4 }
      fn quux() { return 5 }
    `;

    const { totalMs, avgMs, minMs, maxMs } = this.measureTime(() => {
      const lexer = new Lexer(code);
      const tokens = new TokenBuffer(lexer);
      const parser = new Parser(tokens);
      parser.parseModule();
    }, iterations);

    const result: BenchmarkResult = {
      name: 'Parse multiple functions',
      iterations,
      totalMs,
      avgMs,
      minMs,
      maxMs
    };

    this.results.push(result);
    return result;
  }

  /**
   * Benchmark 5: Parse with control flow
   */
  benchmarkParseControlFlow(iterations: number = 200): BenchmarkResult {
    const code = `
      fn process(x) {
        if (x > 10) {
          for (let i = 0; i < 10; i = i + 1) {
            while (i > 0) {
              i = i - 1
            }
          }
        } else {
          return 0
        }
      }
    `;

    const { totalMs, avgMs, minMs, maxMs } = this.measureTime(() => {
      const lexer = new Lexer(code);
      const tokens = new TokenBuffer(lexer);
      const parser = new Parser(tokens);
      parser.parseModule();
    }, iterations);

    const result: BenchmarkResult = {
      name: 'Parse control flow',
      iterations,
      totalMs,
      avgMs,
      minMs,
      maxMs
    };

    this.results.push(result);
    return result;
  }

  /**
   * Run all benchmarks
   */
  runAll(): void {
    console.log('\n=== FreeLang v2 Performance Benchmark ===\n');

    console.log('Running benchmarks...\n');
    this.benchmarkParseFibonacci(100);
    this.benchmarkParseComplexExpression(1000);
    this.benchmarkParseNestedExpressions(500);
    this.benchmarkParseMultipleFunctions(100);
    this.benchmarkParseControlFlow(200);

    this.printResults();
  }

  /**
   * Print benchmark results
   */
  printResults(): void {
    console.log('\n=== Benchmark Results ===\n');
    console.log('Test Name'.padEnd(35) + 'Iterations'.padEnd(12) + 'Avg (ms)'.padEnd(12) + 'Min'.padEnd(10) + 'Max'.padEnd(10));
    console.log('-'.repeat(80));

    for (const result of this.results) {
      console.log(
        `${result.name.substring(0, 35).padEnd(35)} ` +
        `${result.iterations.toString().padEnd(12)} ` +
        `${result.avgMs.toFixed(3).padEnd(12)} ` +
        `${result.minMs.toFixed(3).padEnd(10)} ` +
        `${result.maxMs.toFixed(3).padEnd(10)}`
      );
    }

    console.log('\n=== Analysis ===\n');
    const slowest = this.results.reduce((a, b) => a.avgMs > b.avgMs ? a : b);
    const fastest = this.results.reduce((a, b) => a.avgMs < b.avgMs ? a : b);

    console.log(`Slowest: ${slowest.name} (${slowest.avgMs.toFixed(3)}ms)`);
    console.log(`Fastest: ${fastest.name} (${fastest.avgMs.toFixed(3)}ms)`);
    console.log(`\nTarget: All tests <10ms (10x improvement)`);
  }
}

// Run benchmarks if executed directly
if (require.main === module) {
  const bench = new Benchmark();
  bench.runAll();
}
