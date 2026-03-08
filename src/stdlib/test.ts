/**
 * FreeLang Standard Library: std/test
 *
 * Testing framework for FreeLang
 * - test() for test cases
 * - describe() for test suites
 * - assert() for assertions
 * - expect() for fluent assertions
 */

// Color codes for terminal output
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

/**
 * Test case result
 */
export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number; // milliseconds
}

/**
 * Test suite result
 */
export interface SuiteResult {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  total: number;
  duration: number;
}

/**
 * Global test registry
 */
let currentSuite: TestContext | null = null;
let allSuites: Map<string, TestContext> = new Map();

interface TestContext {
  name: string;
  tests: Array<{ name: string; fn: () => void | Promise<void> }>;
  beforeEachFns: Array<() => void | Promise<void>>;
  afterEachFns: Array<() => void | Promise<void>>;
  results: TestResult[];
}

/**
 * Define a test suite
 * @param name Suite name
 * @param fn Function containing test() calls
 */
export function describe(name: string, fn: () => void): void {
  const suite: TestContext = {
    name,
    tests: [],
    beforeEachFns: [],
    afterEachFns: [],
    results: []
  };

  const previousSuite = currentSuite;
  currentSuite = suite;

  try {
    fn();
  } finally {
    currentSuite = previousSuite;
    allSuites.set(name, suite);
  }
}

/**
 * Define a test case
 * @param name Test name
 * @param fn Test function
 */
export function test(name: string, fn: () => void | Promise<void>): void {
  if (!currentSuite) {
    throw new Error('test() must be called within describe()');
  }

  currentSuite.tests.push({ name, fn });
}

/**
 * Setup hook (before each test)
 * @param fn Setup function
 */
export function beforeEach(fn: () => void | Promise<void>): void {
  if (!currentSuite) {
    throw new Error('beforeEach() must be called within describe()');
  }

  currentSuite.beforeEachFns.push(fn);
}

/**
 * Teardown hook (after each test)
 * @param fn Teardown function
 */
export function afterEach(fn: () => void | Promise<void>): void {
  if (!currentSuite) {
    throw new Error('afterEach() must be called within describe()');
  }

  currentSuite.afterEachFns.push(fn);
}

/**
 * Assert condition
 * @param condition Condition to check
 * @param message Error message
 */
export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Expect-style assertions
 */
export interface ExpectAssertion {
  toBe(expected: any): void;
  toEqual(expected: any): void;
  toStrictEqual(expected: any): void;
  toNotBe(expected: any): void;
  toNotEqual(expected: any): void;
  toBeDefined(): void;
  toBeUndefined(): void;
  toBeNull(): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
  toContain(expected: any): void;
  toHaveLength(expected: number): void;
  toThrow(expectedError?: string | Error): void;
}

/**
 * Create expectation
 * @param value Value to test
 * @returns Expectation object
 */
export function expect(value: any): ExpectAssertion {
  return {
    toBe: (expected: any) => {
      if (value !== expected) {
        throw new Error(`Expected ${JSON.stringify(value)} to be ${JSON.stringify(expected)}`);
      }
    },

    toEqual: (expected: any) => {
      if (JSON.stringify(value) !== JSON.stringify(expected)) {
        throw new Error(
          `Expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`
        );
      }
    },

    toStrictEqual: (expected: any) => {
      if (value !== expected) {
        throw new Error(
          `Expected ${JSON.stringify(value)} to strictly equal ${JSON.stringify(expected)}`
        );
      }
    },

    toNotBe: (expected: any) => {
      if (value === expected) {
        throw new Error(`Expected ${JSON.stringify(value)} not to be ${JSON.stringify(expected)}`);
      }
    },

    toNotEqual: (expected: any) => {
      if (JSON.stringify(value) === JSON.stringify(expected)) {
        throw new Error(
          `Expected ${JSON.stringify(value)} not to equal ${JSON.stringify(expected)}`
        );
      }
    },

    toBeDefined: () => {
      if (value === undefined) {
        throw new Error('Expected value to be defined');
      }
    },

    toBeUndefined: () => {
      if (value !== undefined) {
        throw new Error(`Expected ${JSON.stringify(value)} to be undefined`);
      }
    },

    toBeNull: () => {
      if (value !== null) {
        throw new Error(`Expected ${JSON.stringify(value)} to be null`);
      }
    },

    toBeTruthy: () => {
      if (!value) {
        throw new Error(`Expected ${JSON.stringify(value)} to be truthy`);
      }
    },

    toBeFalsy: () => {
      if (value) {
        throw new Error(`Expected ${JSON.stringify(value)} to be falsy`);
      }
    },

    toBeGreaterThan: (expected: number) => {
      if (!(value > expected)) {
        throw new Error(`Expected ${value} to be greater than ${expected}`);
      }
    },

    toBeGreaterThanOrEqual: (expected: number) => {
      if (!(value >= expected)) {
        throw new Error(`Expected ${value} to be greater than or equal to ${expected}`);
      }
    },

    toBeLessThan: (expected: number) => {
      if (!(value < expected)) {
        throw new Error(`Expected ${value} to be less than ${expected}`);
      }
    },

    toBeLessThanOrEqual: (expected: number) => {
      if (!(value <= expected)) {
        throw new Error(`Expected ${value} to be less than or equal to ${expected}`);
      }
    },

    toContain: (expected: any) => {
      if (Array.isArray(value)) {
        if (!value.includes(expected)) {
          throw new Error(`Expected array to contain ${JSON.stringify(expected)}`);
        }
      } else if (typeof value === 'string') {
        if (!value.includes(expected)) {
          throw new Error(`Expected "${value}" to contain "${expected}"`);
        }
      } else {
        throw new Error('toContain() only works with arrays and strings');
      }
    },

    toHaveLength: (expected: number) => {
      if (!value || typeof value.length !== 'number') {
        throw new Error('Expected value to have length property');
      }
      if (value.length !== expected) {
        throw new Error(`Expected length ${value.length} to be ${expected}`);
      }
    },

    toThrow: (expectedError?: string | Error) => {
      if (typeof value !== 'function') {
        throw new Error('toThrow() only works with functions');
      }

      try {
        value();
        throw new Error('Expected function to throw');
      } catch (e: any) {
        if (expectedError) {
          const errorMessage = e.message || String(e);
          const expectedMsg =
            typeof expectedError === 'string' ? expectedError : expectedError.message;

          if (!errorMessage.includes(expectedMsg)) {
            throw new Error(
              `Expected error message "${errorMessage}" to include "${expectedMsg}"`
            );
          }
        }
      }
    }
  };
}

/**
 * Run all tests
 * @returns Results
 */
export async function run(): Promise<void> {
  console.log(
    `\n${COLORS.cyan}╔════════════════════════════════════════╗${COLORS.reset}`
  );
  console.log(
    `${COLORS.cyan}║   FreeLang Test Runner v1.0            ║${COLORS.reset}`
  );
  console.log(
    `${COLORS.cyan}╚════════════════════════════════════════╝${COLORS.reset}\n`
  );

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  const totalStartTime = performance.now();

  for (const [suiteName, suite] of allSuites) {
    const suiteStartTime = performance.now();
    let suitePassed = 0;
    let suiteFailed = 0;

    console.log(`${COLORS.cyan}${suiteName}${COLORS.reset}`);

    for (const testCase of suite.tests) {
      const testStartTime = performance.now();
      let testPassed = false;
      let errorMessage = '';

      try {
        // Run beforeEach hooks
        for (const beforeFn of suite.beforeEachFns) {
          const result = beforeFn();
          if (result instanceof Promise) {
            await result;
          }
        }

        // Run test
        const result = testCase.fn();
        if (result instanceof Promise) {
          await result;
        }

        // Run afterEach hooks
        for (const afterFn of suite.afterEachFns) {
          const result = afterFn();
          if (result instanceof Promise) {
            await result;
          }
        }

        testPassed = true;
      } catch (error: any) {
        errorMessage = error.message || String(error);
      }

      const duration = performance.now() - testStartTime;
      suite.results.push({
        name: testCase.name,
        passed: testPassed,
        error: errorMessage,
        duration
      });

      if (testPassed) {
        console.log(
          `  ${COLORS.green}✓${COLORS.reset} ${testCase.name} ${COLORS.gray}(${duration.toFixed(1)}ms)${COLORS.reset}`
        );
        suitePassed++;
        totalPassed++;
      } else {
        console.log(
          `  ${COLORS.red}✕${COLORS.reset} ${testCase.name} ${COLORS.gray}(${duration.toFixed(1)}ms)${COLORS.reset}`
        );
        console.log(`    ${COLORS.red}${errorMessage}${COLORS.reset}`);
        suiteFailed++;
        totalFailed++;
      }

      totalTests++;
    }

    const suiteDuration = performance.now() - suiteStartTime;
    console.log(
      `  ${COLORS.gray}${suitePassed} passed, ${suiteFailed} failed in ${suiteDuration.toFixed(1)}ms${COLORS.reset}\n`
    );
  }

  const totalDuration = performance.now() - totalStartTime;

  // Print summary
  console.log(
    `${COLORS.cyan}════════════════════════════════════════${COLORS.reset}`
  );

  if (totalFailed === 0) {
    console.log(
      `${COLORS.green}✓ All ${totalTests} tests passed${COLORS.reset} ${COLORS.gray}(${totalDuration.toFixed(1)}ms)${COLORS.reset}`
    );
  } else {
    console.log(
      `${COLORS.red}✕ ${totalFailed} of ${totalTests} tests failed${COLORS.reset}`
    );
    console.log(
      `  ${COLORS.green}${totalPassed} passed${COLORS.reset}, ${COLORS.red}${totalFailed} failed${COLORS.reset} ${COLORS.gray}(${totalDuration.toFixed(1)}ms)${COLORS.reset}`
    );
  }

  console.log(
    `${COLORS.cyan}════════════════════════════════════════${COLORS.reset}\n`
  );

  // Exit with error code if any tests failed
  if (totalFailed > 0) {
    process.exit(1);
  }
}

/**
 * Get test results
 * @returns All test results
 */
export function getResults(): SuiteResult[] {
  return Array.from(allSuites.values()).map((suite) => ({
    name: suite.name,
    tests: suite.results,
    passed: suite.results.filter((r) => r.passed).length,
    failed: suite.results.filter((r) => !r.passed).length,
    total: suite.results.length,
    duration: suite.results.reduce((sum, r) => sum + r.duration, 0)
  }));
}

/**
 * Reset all tests (for rerunning)
 */
export function reset(): void {
  currentSuite = null;
  allSuites.clear();
}

/**
 * Only run tests matching pattern
 * @param pattern Pattern to match
 */
export function only(pattern: string | RegExp): void {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

  for (const suite of allSuites.values()) {
    suite.tests = suite.tests.filter((t) => regex.test(t.name));
  }
}

/**
 * Skip tests matching pattern
 * @param pattern Pattern to match
 */
export function skip(pattern: string | RegExp): void {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

  for (const suite of allSuites.values()) {
    suite.tests = suite.tests.filter((t) => !regex.test(t.name));
  }
}
