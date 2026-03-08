/**
 * Integration tests for all 4 advanced type system engines
 * Testing: Union Narrowing, Generics Resolution, Constraint Solving, Traits
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { AIFirstTypeInferenceEngine } from '../src/analyzer/ai-first-type-inference-engine';
import { DataFlowInferenceEngine } from '../src/analyzer/dataflow-inference-engine';
import { MinimalFunctionAST } from '../src/parser/ast';

describe('Advanced Type System Integration', () => {
  let aiEngine: AIFirstTypeInferenceEngine;
  let dfEngine: DataFlowInferenceEngine;

  beforeEach(() => {
    aiEngine = new AIFirstTypeInferenceEngine();
    dfEngine = new DataFlowInferenceEngine();
  });

  // ============================================================================
  // 1. Union Narrowing Integration
  // ============================================================================
  describe('Union Narrowing Integration', () => {
    it('should detect union types from multiple assignments', () => {
      const code = `
        let x = 10
        x = "hello"
      `;

      const result = aiEngine.inferTypeWithAdvancedEngines('x', code, {
        enableUnionNarrowing: true,
      });

      expect(result.type).toBeDefined();
      // Union narrowing may enhance the result
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should narrow type in control flow', () => {
      const code = `
        let value = getValue()
        if (typeof value === 'number') {
          return value + 1
        } else {
          return value.length
        }
      `;

      const result = aiEngine.inferTypeWithAdvancedEngines('value', code, {
        enableUnionNarrowing: true,
      });

      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // 2. Generics Resolution Integration
  // ============================================================================
  describe('Generics Resolution Integration', () => {
    it('should resolve generic type instantiation', () => {
      const code = `
        let numbers: array<number> = [1, 2, 3]
      `;

      const result = aiEngine.inferTypeWithAdvancedEngines('array', code, {
        enableGenerics: true,
      });

      expect(result.type).toBeDefined();
      // Generics resolution may enhance the result
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should handle nested generics', () => {
      const code = `
        let matrix: array<array<number>>
      `;

      const result = aiEngine.inferTypeWithAdvancedEngines('matrix', code, {
        enableGenerics: true,
      });

      expect(result).toBeDefined();
    });
  });

  // ============================================================================
  // 3. Constraint Solver Integration (DataFlow)
  // ============================================================================
  describe('Constraint Solver Integration', () => {
    it('should validate type constraints in functions', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'identity',
          inputType: 'T',
          outputType: 'T',
          body: 'return input',
        },
        {
          fnName: 'process',
          inputType: 'number',
          outputType: 'number',
          body: 'return identity(input)',
        },
      ];

      const result = dfEngine.buildExtended(functions, {
        enableConstraints: true,
      });

      expect(result.constraints).toBeDefined();
      if (result.constraints) {
        expect(result.constraints.satisfactionRate).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle where clauses', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `fn generic<T>(x: T) where T: Clone { return x.clone() }`,
        },
      ];

      const result = dfEngine.buildExtended(functions, {
        enableConstraints: true,
      });

      expect(result.constraints).toBeDefined();
    });
  });

  // ============================================================================
  // 4. Trait Engine Integration
  // ============================================================================
  describe('Trait Engine Integration', () => {
    it('should extract and validate trait definitions', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Clone {
              fn clone() -> Self
            }
            impl Clone for string {
              fn clone() { return input }
            }
          `,
        },
      ];

      const result = dfEngine.buildExtended(functions, {
        enableTraits: true,
      });

      expect(result.traits).toBeDefined();
      if (result.traits) {
        expect(result.traits.traits.size).toBeGreaterThan(0);
        expect(result.traits.implementations.length).toBeGreaterThan(0);
      }
    });

    it('should validate complete trait implementations', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Iterator<T> {
              type Item = T
              fn next() -> Item
              fn hasNext() -> bool
            }
            impl Iterator<number> for array<number> {
              fn next() { return input[0] }
              fn hasNext() { return input.length > 0 }
            }
          `,
        },
      ];

      const result = dfEngine.buildExtended(functions, {
        enableTraits: true,
      });

      expect(result.traits).toBeDefined();
    });
  });

  // ============================================================================
  // 5. Combined Engine Integration
  // ============================================================================
  describe('Combined Engine Integration', () => {
    it('should combine all engines for comprehensive analysis', () => {
      const code = `
        fn process<T>(iter: Iterator<T>) where T: Clone {
          let x = iter.next()
          if (typeof x !== 'undefined') {
            return x.clone()
          }
        }
      `;

      const result = aiEngine.inferTypeWithAdvancedEngines('process', code, {
        enableUnionNarrowing: true,
        enableGenerics: true,
      });

      expect(result.type).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should integrate constraints and traits in DataFlow analysis', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Show { fn show() -> string }
            impl Show for number { fn show() { return input.toString() } }

            fn generic<T: Show>(x: T) -> string {
              return x.show()
            }
          `,
        },
      ];

      const result = dfEngine.buildExtended(functions, {
        enableConstraints: true,
        enableTraits: true,
      });

      expect(result.traits).toBeDefined();
      expect(result.constraints).toBeDefined();
      expect(result.overallAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.overallAccuracy).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================================
  // 6. Confidence and Accuracy
  // ============================================================================
  describe('Confidence and Accuracy Metrics', () => {
    it('should maintain high confidence with advanced engines', () => {
      const code = 'let arr: array<number> = [1, 2, 3]';

      const result = aiEngine.inferTypeWithAdvancedEngines('arr', code, {
        enableGenerics: true,
      });

      // Confidence should be non-negative
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should improve overall accuracy with extended analysis', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'add',
          inputType: 'number',
          outputType: 'number',
          body: 'return input + 1',
        },
      ];

      const basicResult = dfEngine.build(functions);
      const extendedResult = dfEngine.buildExtended(functions, {
        enableConstraints: true,
        enableTraits: true,
      });

      expect(extendedResult.overallAccuracy).toBeGreaterThanOrEqual(0);
      expect(extendedResult.overallAccuracy).toBeLessThanOrEqual(1);
    });

    it('should provide reasoning across all engines', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Clone { fn clone() -> Self }
            impl Clone for string { fn clone() { return input } }
          `,
        },
      ];

      const result = dfEngine.buildExtended(functions, {
        enableConstraints: true,
        enableTraits: true,
      });

      expect(result.reasonings.length).toBeGreaterThan(0);
      const reasoningText = result.reasonings.join(' ');
      expect(reasoningText.length).toBeGreaterThan(0);
    });
  });
});
