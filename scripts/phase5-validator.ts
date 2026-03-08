#!/usr/bin/env ts-node
/**
 * Phase 5 함수 검증 도구
 *
 * 사용법:
 *   npx ts-node scripts/phase5-validator.ts [파일명]
 *   npx ts-node scripts/phase5-validator.ts --all    # 모든 테스트 실행
 *   npx ts-node scripts/phase5-validator.ts --report   # 검증 보고서 생성
 */

import { VMExecutor } from '../src/vm/vm-executor';
import { Parser } from '../src/parser/parser';
import { Lexer } from '../src/lexer/lexer';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

interface TestResult {
  name: string;
  file: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  expected: string | number;
  actual: string | number | null;
  error?: string;
  duration: number;
}

const TEST_CASES: { [key: string]: { file: string; expected: string } } = {
  fibonacci: {
    file: 'fibonacci.fl',
    expected: '55',
  },
  factorial: {
    file: 'factorial.fl',
    expected: '120',
  },
  ackermann: {
    file: 'ackermann.fl',
    expected: '61',
  },
  function_args: {
    file: 'function_args.fl',
    expected: '42\n11\n6\n15',
  },
  scope_test: {
    file: 'scope_test.fl',
    expected: '15\n25\n3\n100',
  },
  recursion_depth: {
    file: 'recursion_depth.fl',
    expected: '50',
  },
  edge_cases: {
    file: 'edge_cases.fl',
    expected: '60\n15\n-1\n0\n1',
  },
};

class Phase5Validator {
  private results: TestResult[] = [];
  private examplesDir: string;
  private startTime: number = 0;

  constructor() {
    this.examplesDir = path.join(__dirname, '../examples');
  }

  private executeFlFile(filename: string): { output: string; error?: string } {
    const filePath = path.join(this.examplesDir, filename);

    if (!fs.existsSync(filePath)) {
      return {
        output: '',
        error: `File not found: ${filePath}`,
      };
    }

    try {
      const code = fs.readFileSync(filePath, 'utf-8');
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const vm = new VMExecutor();
      const output: string[] = [];

      // Capture println output
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        output.push(args.join(' '));
      };

      try {
        vm.execute(ast);
      } finally {
        console.log = originalLog;
      }

      return { output: output.join('\n') };
    } catch (error) {
      return {
        output: '',
        error: String(error),
      };
    }
  }

  runTest(name: string, testCase: { file: string; expected: string }): TestResult {
    const startTime = Date.now();
    const { output, error } = this.executeFlFile(testCase.file);
    const duration = Date.now() - startTime;

    const result: TestResult = {
      name,
      file: testCase.file,
      status: 'PASS',
      expected: testCase.expected,
      actual: output,
      duration,
    };

    if (error) {
      result.status = 'ERROR';
      result.error = error;
    } else if (output.trim() !== testCase.expected.trim()) {
      result.status = 'FAIL';
    }

    this.results.push(result);
    return result;
  }

  runAllTests(): void {
    console.log(chalk.blue.bold('\n🧪 Phase 5 Function Validation Suite\n'));
    console.log(chalk.gray(`Examples directory: ${this.examplesDir}\n`));

    this.startTime = Date.now();

    for (const [name, testCase] of Object.entries(TEST_CASES)) {
      const result = this.runTest(name, testCase);
      this.printTestResult(result);
    }

    this.printSummary();
  }

  private printTestResult(result: TestResult): void {
    const statusIcon =
      result.status === 'PASS' ? chalk.green('✓') : result.status === 'FAIL' ? chalk.red('✗') : chalk.yellow('!');

    console.log(`${statusIcon} ${result.name.padEnd(20)} [${result.duration}ms]`);

    if (result.status !== 'PASS') {
      console.log(chalk.gray(`  File: ${result.file}`));
      console.log(chalk.gray(`  Expected: ${String(result.expected).replace(/\n/g, '\\n')}`));
      console.log(chalk.gray(`  Actual: ${String(result.actual).replace(/\n/g, '\\n')}`));
      if (result.error) {
        console.log(chalk.red(`  Error: ${result.error}`));
      }
    }
  }

  private printSummary(): void {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter((r) => r.status === 'PASS').length;
    const failed = this.results.filter((r) => r.status === 'FAIL').length;
    const errors = this.results.filter((r) => r.status === 'ERROR').length;
    const total = this.results.length;

    console.log(chalk.blue.bold('\n📊 Summary\n'));
    console.log(`Total Tests: ${total}`);
    console.log(chalk.green(`Passed: ${passed}`));
    console.log(chalk.red(`Failed: ${failed}`));
    console.log(chalk.yellow(`Errors: ${errors}`));
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(chalk.blue(`Success Rate: ${((passed / total) * 100).toFixed(2)}%\n`));

    if (passed === total) {
      console.log(chalk.green.bold('✅ ALL TESTS PASSED - Phase 5 Complete!\n'));
    }
  }

  generateReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      phase: 'Phase 5: Function Validation',
      status: this.results.every((r) => r.status === 'PASS') ? 'COMPLETE' : 'INCOMPLETE',
      summary: {
        total: this.results.length,
        passed: this.results.filter((r) => r.status === 'PASS').length,
        failed: this.results.filter((r) => r.status === 'FAIL').length,
        errors: this.results.filter((r) => r.status === 'ERROR').length,
      },
      coverage: {
        recursiveFunctions: ['fibonacci(10)=55', 'factorial(5)=120', 'ackermann(3,3)=61'],
        functionArguments: ['0 args', '1 arg', '3 args', '5 args'],
        scopeMemory: ['local variable isolation', 'global variable preservation', 'nested scope'],
        deepRecursion: ['depth 50'],
        edgeCases: ['nested functions', 'multiple return paths', 'global+local mixing'],
      },
      results: this.results,
    };

    const reportPath = path.join(__dirname, '../PHASE5_VALIDATION_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    const mdPath = path.join(__dirname, '../PHASE5_VALIDATION_REPORT.md');
    this.generateMarkdownReport(mdPath, report);

    console.log(`\n📄 Reports generated:`);
    console.log(`   - ${reportPath}`);
    console.log(`   - ${mdPath}\n`);
  }

  private generateMarkdownReport(
    filepath: string,
    report: { [key: string]: any }
  ): void {
    let md = `# Phase 5 Function Validation Report\n\n`;
    md += `**Timestamp**: ${report.timestamp}\n`;
    md += `**Status**: ${report.status}\n\n`;

    md += `## Summary\n\n`;
    md += `- Total Tests: ${report.summary.total}\n`;
    md += `- Passed: ${report.summary.passed}\n`;
    md += `- Failed: ${report.summary.failed}\n`;
    md += `- Errors: ${report.summary.errors}\n`;
    md += `- Success Rate: ${((report.summary.passed / report.summary.total) * 100).toFixed(2)}%\n\n`;

    md += `## Test Coverage\n\n`;
    md += `### Recursive Functions\n`;
    report.coverage.recursiveFunctions.forEach((test: string) => {
      md += `- ${test}\n`;
    });
    md += `\n### Function Arguments\n`;
    report.coverage.functionArguments.forEach((test: string) => {
      md += `- ${test}\n`;
    });
    md += `\n### Scope & Memory\n`;
    report.coverage.scopeMemory.forEach((test: string) => {
      md += `- ${test}\n`;
    });
    md += `\n### Deep Recursion\n`;
    report.coverage.deepRecursion.forEach((test: string) => {
      md += `- ${test}\n`;
    });
    md += `\n### Edge Cases\n`;
    report.coverage.edgeCases.forEach((test: string) => {
      md += `- ${test}\n`;
    });

    md += `\n## Test Results\n\n`;
    md += `| Test | File | Status | Duration |\n`;
    md += `|------|------|--------|----------|\n`;
    report.results.forEach((result: TestResult) => {
      const statusEmoji = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      md += `| ${result.name} | ${result.file} | ${statusEmoji} ${result.status} | ${result.duration}ms |\n`;
    });

    fs.writeFileSync(filepath, md);
  }
}

// Main
const args = process.argv.slice(2);
const validator = new Phase5Validator();

if (args.length === 0 || args[0] === '--all') {
  validator.runAllTests();
  validator.generateReport();
} else if (args[0] === '--report') {
  validator.generateReport();
} else {
  // Run specific test
  const testName = args[0];
  if (TEST_CASES[testName]) {
    const result = validator.runTest(testName, TEST_CASES[testName]);
    validator['printTestResult'](result);
  } else {
    console.log(`Unknown test: ${testName}`);
    console.log(`Available tests: ${Object.keys(TEST_CASES).join(', ')}`);
  }
}
