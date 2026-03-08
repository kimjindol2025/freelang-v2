/**
 * Phase 5 Stage 3.3.4: E2E Integration Tests
 *
 * Full end-to-end tests for skeleton function detection, stub generation,
 * and integration into the compilation pipeline.
 *
 * Complete flow:
 * 1. Parse skeleton function (header only)
 * 2. SkeletonDetector identifies it as skeleton
 * 3. StubGenerator creates placeholder implementation
 * 4. CodeFormatter/Pipeline outputs complete function
 */

import { SkeletonDetector } from '../src/analyzer/skeleton-detector';
import { StubGenerator } from '../src/codegen/stub-generator';
import { SkeletonContext } from '../src/learning/skeleton-context';
import { MinimalFunctionAST } from '../src/parser/ast';

describe('Phase 5 Stage 3.3.4: E2E Integration - Skeleton Functions', () => {
  const detector = new SkeletonDetector();
  const generator = new StubGenerator();
  const context = new SkeletonContext();

  /**
   * Test Group 1: Full Pipeline Integration
   */
  describe('Full Skeleton-to-Complete Pipeline', () => {
    test('processes skeleton header and generates complete function', () => {
      // Step 1: Parse skeleton (header only)
      const skeletonAST: MinimalFunctionAST = {
        fnName: 'calculate_total',
        inputType: 'array<number>',
        outputType: 'number',
        intent: 'Calculate sum of all numbers'
        // no body = skeleton
      };

      // Step 2: Detect skeleton
      const skeletonInfo = detector.detect(skeletonAST);

      expect(skeletonInfo.isSkeleton).toBe(true);
      expect(skeletonInfo.functionName).toBe('calculate_total');

      // Step 3: Generate stub
      const stub = generator.generate(skeletonInfo);

      expect(stub.code).toBeDefined();
      expect(stub.code.length).toBeGreaterThan(0);
      expect(stub.confidence).toBeGreaterThan(0.5);

      // Step 4: Verify stub is appropriate for domain
      const domain = detector.classifyDomain(skeletonInfo);
      expect(domain).toBe('math');

      // Step 5: Complexity estimation
      const complexity = detector.estimateComplexity(skeletonInfo);
      expect(['simple', 'moderate', 'complex']).toContain(complexity);
    });

    test('complete workflow: tax calculation skeleton', () => {
      const skeleton: MinimalFunctionAST = {
        fnName: 'calculate_tax',
        inputType: 'number',
        outputType: 'number',
        intent: 'Calculate income tax at 15% rate'
      };

      // Detect
      const info = detector.detect(skeleton);
      expect(info.isSkeleton).toBe(true);

      // Classify
      const domain = detector.classifyDomain(info);
      expect(domain).toBe('math');

      // Generate stub
      const stub = generator.generate(info, { generateComments: true });
      expect(stub.code).toContain('0.15');  // tax rate extracted

      // Estimate complexity
      const complexity = detector.estimateComplexity(info);
      expect(complexity).toBe('simple');

      // Get suggestions for completion
      expect(info.suggestions.length).toBeGreaterThan(0);
    });

    test('complete workflow: array filter skeleton', () => {
      const skeleton: MinimalFunctionAST = {
        fnName: 'filter_positive_numbers',
        inputType: 'array<number>',
        outputType: 'array<number>',
        intent: 'Keep only positive numbers'
      };

      // Detect
      const info = detector.detect(skeleton);
      expect(info.isSkeleton).toBe(true);

      // Classify
      const domain = detector.classifyDomain(info);
      expect(domain).toBe('array');

      // Generate stub
      const stub = generator.generate(info);
      expect(stub.code).toContain('filter');
      expect(stub.code).toContain('>');

      // Estimate complexity
      const complexity = detector.estimateComplexity(info);
      expect(complexity).toBe('moderate');

      // Check confidence
      expect(stub.confidence).toBeGreaterThan(0.6);
    });
  });

  /**
   * Test Group 2: Learning Integration
   */
  describe('Context-Based Learning', () => {
    test('finds similar function from context', () => {
      const skeleton: MinimalFunctionAST = {
        fnName: 'sum_array',
        inputType: 'array<number>',
        outputType: 'number',
        intent: 'Sum array elements'
      };

      const info = detector.detect(skeleton);

      // Find similar
      const similar = context.getSimilar('sum_array');
      expect(similar.length).toBeGreaterThan(0);

      // Get suggestion
      const suggestion = context.suggestImplementation(
        'sum_array',
        'array<number>',
        'number',
        'Sum array elements'
      );

      expect(suggestion).not.toBeNull();
    });

    test('uses context when available', () => {
      const skeleton: MinimalFunctionAST = {
        fnName: 'uppercase_text',
        inputType: 'string',
        outputType: 'string',
        intent: 'Convert to uppercase'
      };

      const info = detector.detect(skeleton);

      // Try context suggestion first
      const contextSuggestion = context.suggestImplementation(
        'uppercase_text',
        'string',
        'string',
        'Convert to uppercase'
      );

      // Fall back to generator if not found
      const generatedStub = generator.generate(info);

      // Both should work
      expect(contextSuggestion || generatedStub.code).toBeTruthy();
    });
  });

  /**
   * Test Group 3: Multiple Skeletons
   */
  describe('Multiple Skeletons in Single File', () => {
    test('processes multiple skeleton functions', () => {
      const skeletons: MinimalFunctionAST[] = [
        {
          fnName: 'sum',
          inputType: 'array<number>',
          outputType: 'number',
          intent: 'Sum all numbers'
        },
        {
          fnName: 'count',
          inputType: 'array<unknown>',
          outputType: 'number',
          intent: 'Count items'
        },
        {
          fnName: 'uppercase',
          inputType: 'string',
          outputType: 'string',
          intent: 'Convert to uppercase'
        }
      ];

      const results = skeletons.map(skeleton => {
        const info = detector.detect(skeleton);
        const stub = generator.generate(info);
        return {
          name: skeleton.fnName,
          isSkeleton: info.isSkeleton,
          domain: detector.classifyDomain(info),
          complexity: detector.estimateComplexity(info),
          stubCode: stub.code,
          confidence: stub.confidence
        };
      });

      // All should be detected as skeletons
      expect(results.every(r => r.isSkeleton)).toBe(true);

      // All should have stubs
      expect(results.every(r => r.stubCode.length > 0)).toBe(true);

      // Domains should be classified correctly
      expect(results[0].domain).toBe('math');        // sum
      expect(results[1].domain).toBe('array');       // count
      expect(results[2].domain).toBe('string');      // uppercase
    });

    test('generates appropriate stubs for different types', () => {
      const multiSkeletons = [
        {
          name: 'math_op',
          ast: {
            fnName: 'multiply',
            inputType: 'number',
            outputType: 'number',
            intent: 'Multiply by factor'
          },
          expectedDomain: 'math'
        },
        {
          name: 'string_op',
          ast: {
            fnName: 'reverse_string',
            inputType: 'string',
            outputType: 'string',
            intent: 'Reverse string'
          },
          expectedDomain: 'string'
        },
        {
          name: 'array_op',
          ast: {
            fnName: 'sort_numbers',
            inputType: 'array<number>',
            outputType: 'array<number>',
            intent: 'Sort in ascending order'
          },
          expectedDomain: 'array'
        }
      ];

      for (const multi of multiSkeletons) {
        const info = detector.detect(multi.ast as MinimalFunctionAST);
        const stub = generator.generate(info);
        const domain = detector.classifyDomain(info);

        expect(stub.code).toBeDefined();
        expect(stub.reasoning).toBeDefined();
        expect(domain).toBe(multi.expectedDomain);
      }
    });
  });

  /**
   * Test Group 4: Error Handling and Edge Cases
   */
  describe('Edge Cases and Robustness', () => {
    test('handles skeleton with only name', () => {
      const minimal: MinimalFunctionAST = {
        fnName: 'process',
        inputType: 'unknown',
        outputType: 'unknown'
        // no intent
      };

      const info = detector.detect(minimal);
      expect(info.isSkeleton).toBe(true);

      const stub = generator.generate(info);
      expect(stub.code).toBeDefined();
    });

    test('handles skeleton with decorators', () => {
      const decorated: MinimalFunctionAST = {
        fnName: 'minimal_func',
        inputType: 'number',
        outputType: 'number',
        decorator: 'minimal'
      };

      const info = detector.detect(decorated);
      expect(info.decorator).toBe('minimal');

      // Completeness should be reduced
      expect(info.completeness).toBeLessThan(0.3);

      const stub = generator.generate(info);
      expect(stub.code).toBeDefined();
    });

    test('generates valid code for all output types', () => {
      const outputTypes = ['number', 'string', 'array<number>', 'boolean', 'unknown'];

      for (const outputType of outputTypes) {
        const skeleton: MinimalFunctionAST = {
          fnName: 'test_func',
          inputType: 'unknown',
          outputType: outputType
        };

        const info = detector.detect(skeleton);
        const stub = generator.generate(info);

        expect(stub.code).toContain('return');
        expect(stub.code.length).toBeGreaterThan(0);
      }
    });

    test('handles very long intent strings', () => {
      const longIntent = 'This is a very long intent description that explains in great detail what this function should do when called with various inputs and expected outputs based on the semantics of the operation ' +
        'and the mathematical properties of the algorithm being implemented which should be as efficient as possible while maintaining correctness and clarity for the developer';

      const skeleton: MinimalFunctionAST = {
        fnName: 'complex_operation',
        inputType: 'array<number>',
        outputType: 'number',
        intent: longIntent
      };

      const info = detector.detect(skeleton);
      const stub = generator.generate(info);

      expect(stub.confidence).toBeGreaterThan(0.6);
      expect(stub.code).toBeDefined();
    });
  });

  /**
   * Test Group 5: Integration Verification
   */
  describe('Pipeline Integration Verification', () => {
    test('skeleton detection preserves function signature', () => {
      const skeleton: MinimalFunctionAST = {
        fnName: 'my_function',
        inputType: 'array<string>',
        outputType: 'string',
        intent: 'Process array',
        decorator: 'minimal'
      };

      const info = detector.detect(skeleton);

      // Verify all metadata preserved
      expect(info.functionName).toBe(skeleton.fnName);
      expect(info.inputType).toBe(skeleton.inputType);
      expect(info.outputType).toBe(skeleton.outputType);
      expect(info.intent).toBe(skeleton.intent);
      expect(info.decorator).toBe(skeleton.decorator);
    });

    test('stub generation is deterministic', () => {
      const skeleton: MinimalFunctionAST = {
        fnName: 'deterministic_func',
        inputType: 'number',
        outputType: 'number',
        intent: 'Test determinism'
      };

      const info = detector.detect(skeleton);
      const stub1 = generator.generate(info);
      const stub2 = generator.generate(info);

      // Same input should produce same stub
      expect(stub1.code).toBe(stub2.code);
      expect(stub1.reasoning).toBe(stub2.reasoning);
      expect(stub1.confidence).toBe(stub2.confidence);
    });

    test('confidence correlates with completeness', () => {
      const minimal: MinimalFunctionAST = {
        fnName: 'test1',
        inputType: 'unknown',
        outputType: 'unknown'
      };

      const detailed: MinimalFunctionAST = {
        fnName: 'test2',
        inputType: 'array<number>',
        outputType: 'number',
        intent: 'Calculate total sum of array elements'
      };

      const infoMinimal = detector.detect(minimal);
      const infoDetailed = detector.detect(detailed);

      const stubMinimal = generator.generate(infoMinimal);
      const stubDetailed = generator.generate(infoDetailed);

      // More complete skeleton should have higher stub confidence
      expect(stubDetailed.confidence).toBeGreaterThan(stubMinimal.confidence);
    });
  });
});
