/**
 * Phase 5 Stage 3.3.1: Skeleton Detector Tests
 *
 * Tests for detecting skeleton functions and extracting metadata
 */

import { SkeletonDetector, SkeletonInfo } from '../src/analyzer/skeleton-detector';
import { MinimalFunctionAST } from '../src/parser/ast';

describe('Phase 5 Stage 3.3.1: Skeleton Function Detector', () => {
  const detector = new SkeletonDetector();

  /**
   * Test Group 1: Basic Skeleton Detection
   */
  describe('Basic Skeleton Detection', () => {
    test('detects function without body as skeleton', () => {
      const ast: MinimalFunctionAST = {
        fnName: 'calculate',
        inputType: 'number',
        outputType: 'number',
        intent: 'Calculate something'
        // no body
      };

      const info = detector.detect(ast);

      expect(info.isSkeleton).toBe(true);
      expect(info.functionName).toBe('calculate');
      expect(info.inputType).toBe('number');
      expect(info.outputType).toBe('number');
    });

    test('detects function with empty body as skeleton', () => {
      const ast: MinimalFunctionAST = {
        fnName: 'process',
        inputType: 'string',
        outputType: 'string',
        body: ''  // empty body
      };

      const info = detector.detect(ast);

      expect(info.isSkeleton).toBe(true);
    });

    test('does not mark function with body as skeleton', () => {
      const ast: MinimalFunctionAST = {
        fnName: 'sum',
        inputType: 'array<number>',
        outputType: 'number',
        body: 'return input.reduce((a,b) => a+b, 0);'
      };

      const info = detector.detect(ast);

      expect(info.isSkeleton).toBe(false);
    });

    test('preserves all metadata', () => {
      const ast: MinimalFunctionAST = {
        fnName: 'tax_calc',
        inputType: 'number',
        outputType: 'number',
        intent: 'Calculate income tax at 15%',
        decorator: 'minimal'
      };

      const info = detector.detect(ast);

      expect(info.functionName).toBe('tax_calc');
      expect(info.intent).toBe('Calculate income tax at 15%');
      expect(info.decorator).toBe('minimal');
    });
  });

  /**
   * Test Group 2: Completeness Calculation
   */
  describe('Completeness Scoring', () => {
    test('skeleton function scores 0.2 (header only)', () => {
      const ast: MinimalFunctionAST = {
        fnName: 'func',
        inputType: 'number',
        outputType: 'number'
      };

      const info = detector.detect(ast);

      expect(info.completeness).toBeCloseTo(0.2, 1);
    });

    test('function with body scores 0.6', () => {
      const ast: MinimalFunctionAST = {
        fnName: 'func',
        inputType: 'number',
        outputType: 'number',
        body: 'return input * 2;'
      };

      const info = detector.detect(ast);

      expect(info.completeness).toBeCloseTo(0.6, 1);
    });

    test('function with body + intent scores 0.8', () => {
      const ast: MinimalFunctionAST = {
        fnName: 'func',
        inputType: 'number',
        outputType: 'number',
        intent: 'Double the input',
        body: 'return input * 2;'
      };

      const info = detector.detect(ast);

      expect(info.completeness).toBeCloseTo(0.8, 1);
    });

    test('@minimal decorator reduces completeness', () => {
      const ast1: MinimalFunctionAST = {
        fnName: 'func',
        inputType: 'number',
        outputType: 'number',
        intent: 'Double the input',
        body: 'return input * 2;'
      };

      const ast2: MinimalFunctionAST = {
        ...ast1,
        decorator: 'minimal'
      };

      const info1 = detector.detect(ast1);
      const info2 = detector.detect(ast2);

      expect(info2.completeness).toBeLessThan(info1.completeness);
    });
  });

  /**
   * Test Group 3: Suggestion Generation
   */
  describe('Suggestion Generation', () => {
    test('generates suggestions for skeleton', () => {
      const ast: MinimalFunctionAST = {
        fnName: 'calculate',
        inputType: 'number',
        outputType: 'number',
        intent: 'Calculate tax'
      };

      const info = detector.detect(ast);

      expect(info.suggestions.length).toBeGreaterThan(0);
      expect(info.suggestions.some(s => s.includes('TODO'))).toBe(true);
    });

    test('includes purpose suggestion', () => {
      const ast: MinimalFunctionAST = {
        fnName: 'sum_array',
        inputType: 'array<number>',
        outputType: 'number',
        intent: 'Sum all numbers in array'
      };

      const info = detector.detect(ast);

      const purposeSuggestion = info.suggestions.find(s => s.includes('Purpose'));
      expect(purposeSuggestion).toContain('Sum all numbers');
    });

    test('includes type hints', () => {
      const ast: MinimalFunctionAST = {
        fnName: 'filter_positive',
        inputType: 'array<number>',
        outputType: 'array<number>'
      };

      const info = detector.detect(ast);

      const typeSuggestion = info.suggestions.find(s => s.includes('Hint'));
      expect(typeSuggestion).toBeDefined();
    });

    test('suggests array operations', () => {
      const ast: MinimalFunctionAST = {
        fnName: 'process',
        inputType: 'array<number>',
        outputType: 'array<number>'
      };

      const info = detector.detect(ast);

      const hint = info.suggestions.find(s => s.includes('Hint'));
      expect(hint).toContain('map');
    });
  });

  /**
   * Test Group 4: Domain Classification
   */
  describe('Domain Classification', () => {
    test('classifies math domain', () => {
      const ast: MinimalFunctionAST = {
        fnName: 'calculate_tax',
        inputType: 'number',
        outputType: 'number',
        intent: 'Calculate tax percentage'
      };

      const info = detector.detect(ast);
      const domain = detector.classifyDomain(info);

      expect(domain).toBe('math');
    });

    test('classifies string domain', () => {
      const ast: MinimalFunctionAST = {
        fnName: 'uppercase',
        inputType: 'string',
        outputType: 'string',
        intent: 'Convert to uppercase'
      };

      const info = detector.detect(ast);
      const domain = detector.classifyDomain(info);

      expect(domain).toBe('string');
    });

    test('classifies array domain', () => {
      const ast: MinimalFunctionAST = {
        fnName: 'filter_items',
        inputType: 'array<number>',
        outputType: 'array<number>',
        intent: 'Filter items'
      };

      const info = detector.detect(ast);
      const domain = detector.classifyDomain(info);

      expect(domain).toBe('array');
    });

    test('classifies boolean domain', () => {
      const ast: MinimalFunctionAST = {
        fnName: 'is_valid',
        inputType: 'string',
        outputType: 'boolean',
        intent: 'Check if valid'
      };

      const info = detector.detect(ast);
      const domain = detector.classifyDomain(info);

      expect(domain).toBe('boolean');
    });

    test('defaults to general domain', () => {
      const ast: MinimalFunctionAST = {
        fnName: 'do_something',
        inputType: 'unknown',
        outputType: 'unknown'
      };

      const info = detector.detect(ast);
      const domain = detector.classifyDomain(info);

      expect(domain).toBe('general');
    });
  });

  /**
   * Test Group 5: Complexity Estimation
   */
  describe('Complexity Estimation', () => {
    test('estimates simple complexity for scalar operations', () => {
      const ast: MinimalFunctionAST = {
        fnName: 'double',
        inputType: 'number',
        outputType: 'number'
      };

      const info = detector.detect(ast);
      const complexity = detector.estimateComplexity(info);

      expect(complexity).toBe('simple');
    });

    test('estimates moderate complexity for type conversion', () => {
      const ast: MinimalFunctionAST = {
        fnName: 'to_string',
        inputType: 'number',
        outputType: 'string'
      };

      const info = detector.detect(ast);
      const complexity = detector.estimateComplexity(info);

      expect(complexity).toBe('moderate');
    });

    test('estimates moderate complexity for array to array', () => {
      const ast: MinimalFunctionAST = {
        fnName: 'filter',
        inputType: 'array<number>',
        outputType: 'array<number>'
      };

      const info = detector.detect(ast);
      const complexity = detector.estimateComplexity(info);

      expect(complexity).toBe('moderate');
    });

    test('estimates complex for array to scalar', () => {
      const ast: MinimalFunctionAST = {
        fnName: 'sum',
        inputType: 'array<number>',
        outputType: 'number'
      };

      const info = detector.detect(ast);
      const complexity = detector.estimateComplexity(info);

      expect(complexity).toBe('complex');
    });
  });

  /**
   * Test Group 6: Real-World Scenarios
   */
  describe('Real-World Scenarios', () => {
    test('detects tax calculation skeleton', () => {
      const ast: MinimalFunctionAST = {
        fnName: 'calculate_tax',
        inputType: 'number',
        outputType: 'number',
        intent: 'Calculate income tax at 15% rate'
      };

      const info = detector.detect(ast);

      expect(info.isSkeleton).toBe(true);
      expect(info.completeness).toBeLessThan(0.5);
      expect(detector.classifyDomain(info)).toBe('math');
    });

    test('detects array filter skeleton', () => {
      const ast: MinimalFunctionAST = {
        fnName: 'filter_positive',
        inputType: 'array<number>',
        outputType: 'array<number>',
        intent: 'Keep only positive numbers'
      };

      const info = detector.detect(ast);

      expect(info.isSkeleton).toBe(true);
      expect(detector.classifyDomain(info)).toBe('array');
      expect(detector.estimateComplexity(info)).toBe('moderate');
    });

    test('detects string processing skeleton', () => {
      const ast: MinimalFunctionAST = {
        fnName: 'format_name',
        inputType: 'string',
        outputType: 'string',
        intent: 'Format name to proper case'
      };

      const info = detector.detect(ast);

      expect(info.isSkeleton).toBe(true);
      expect(detector.classifyDomain(info)).toBe('string');
    });
  });
});
