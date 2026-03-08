/**
 * Phase 5 Stage 3.2: BodyAnalyzer Variable Type Inference Integration Tests
 *
 * Tests for integrating AdvancedTypeInferenceEngine into BodyAnalyzer
 * to infer variable types from function bodies.
 */

import { analyzeBody, BodyAnalysisResult } from '../src/analyzer/body-analysis';

describe('Phase 5 Stage 3.2: BodyAnalyzer Variable Type Inference', () => {
  /**
   * Test Group 1: Basic Variable Type Inference
   */
  describe('Basic Variable Inference', () => {
    test('infers number from literal assignment', () => {
      const body = 'total = 0';
      const result = analyzeBody(body);

      expect(result.inferredVariableTypes).toBeDefined();
      expect(result.inferredVariableTypes!.has('total')).toBe(true);

      const totalInfo = result.inferredVariableTypes!.get('total')!;
      expect(totalInfo.name).toBe('total');
      expect(totalInfo.inferredType).toBe('number');
      expect(totalInfo.confidence).toBeGreaterThan(0.85);
      expect(totalInfo.source).toBe('assignment');
    });

    test('infers string from literal assignment', () => {
      const body = 'msg = "hello"';
      const result = analyzeBody(body);

      expect(result.inferredVariableTypes!.has('msg')).toBe(true);
      const msgInfo = result.inferredVariableTypes!.get('msg')!;
      expect(msgInfo.inferredType).toBe('string');
      expect(msgInfo.confidence).toBeGreaterThan(0.85);
    });

    test('infers array from empty array literal', () => {
      const body = 'items = []';
      const result = analyzeBody(body);

      expect(result.inferredVariableTypes!.has('items')).toBe(true);
      const itemsInfo = result.inferredVariableTypes!.get('items')!;
      expect(itemsInfo.inferredType).toContain('array');
      expect(itemsInfo.confidence).toBeGreaterThan(0.80);
    });
  });

  /**
   * Test Group 2: Operation-Based Inference
   */
  describe('Operation-Based Type Inference', () => {
    test('infers number from arithmetic operation', () => {
      const body = 'x = 5\ny = x + 10';
      const result = analyzeBody(body);

      expect(result.inferredVariableTypes!.has('y')).toBe(true);
      const yInfo = result.inferredVariableTypes!.get('y')!;
      expect(yInfo.inferredType).toBe('number');
      // y is inferred through transitive inference (x + y → operation on number)
      expect(['operation', 'transitive']).toContain(yInfo.source);
    });

    test('infers string from concatenation', () => {
      const body = 'name = "Alice"\nfull = name + " Smith"';
      const result = analyzeBody(body);

      expect(result.inferredVariableTypes!.has('full')).toBe(true);
      const fullInfo = result.inferredVariableTypes!.get('full')!;
      expect(fullInfo.inferredType).toBe('string');
    });
  });

  /**
   * Test Group 3: Method Call Inference
   */
  describe('Method Call Type Inference', () => {
    test('detects array type from push method', () => {
      const body = 'arr = []\narr.push(5)';
      const result = analyzeBody(body);

      expect(result.inferredVariableTypes!.has('arr')).toBe(true);
      const arrInfo = result.inferredVariableTypes!.get('arr')!;
      expect(arrInfo.inferredType).toContain('array');
      expect(arrInfo.source).toBe('method');
    });

    test('detects array type from pop method', () => {
      const body = 'items = [1, 2, 3]\nitems.pop()';
      const result = analyzeBody(body);

      expect(result.inferredVariableTypes!.has('items')).toBe(true);
      const itemsInfo = result.inferredVariableTypes!.get('items')!;
      expect(itemsInfo.inferredType).toContain('array');
    });

    test('detects string type from length property', () => {
      const body = 'text = "hello"\nlen = text.length';
      const result = analyzeBody(body);

      expect(result.inferredVariableTypes!.has('text')).toBe(true);
      const textInfo = result.inferredVariableTypes!.get('text')!;
      expect(textInfo.inferredType).toBe('string');
    });
  });

  /**
   * Test Group 4: Multi-Variable Inference in Loop
   */
  describe('Loop Variable Inference', () => {
    test('infers loop variable type from range', () => {
      const body = 'for i in 0..10\n  total = total + i';
      const result = analyzeBody(body);

      // Loop variable 'i' should be inferred as number
      expect(result.inferredVariableTypes!.has('i')).toBe(true);
      const iInfo = result.inferredVariableTypes!.get('i')!;
      expect(iInfo.inferredType).toBe('number');
    });

    test('infers accumulator type from loop', () => {
      const body = 'total = 0\nfor i in 0..5\n  total = total + i';
      const result = analyzeBody(body);

      expect(result.inferredVariableTypes!.has('total')).toBe(true);
      const totalInfo = result.inferredVariableTypes!.get('total')!;
      expect(totalInfo.inferredType).toBe('number');
    });

    test('infers array iteration variable type', () => {
      const body = 'arr = [1, 2, 3]\nfor item in arr\n  x = item + 1';
      const result = analyzeBody(body);

      // 'item' should be inferred from array iteration
      expect(result.inferredVariableTypes!.has('item')).toBe(true);
      const itemInfo = result.inferredVariableTypes!.get('item')!;
      expect(itemInfo.inferredType).toBe('number');
    });
  });

  /**
   * Test Group 5: Transitive Inference
   */
  describe('Transitive Type Inference', () => {
    test('infers type through assignment chain', () => {
      const body = 'x = 5\ny = x\nz = y';
      const result = analyzeBody(body);

      // All should be number
      expect(result.inferredVariableTypes!.get('x')!.inferredType).toBe('number');
      expect(result.inferredVariableTypes!.get('y')!.inferredType).toBe('number');
      expect(result.inferredVariableTypes!.get('z')!.inferredType).toBe('number');
    });

    test('infers type through array assignment chain', () => {
      const body = 'arr = []\narr2 = arr';
      const result = analyzeBody(body);

      expect(result.inferredVariableTypes!.get('arr')!.inferredType).toContain('array');
      expect(result.inferredVariableTypes!.get('arr2')!.inferredType).toContain('array');
    });
  });

  /**
   * Test Group 6: Body Analysis Integration
   */
  describe('BodyAnalyzer Complete Analysis', () => {
    test('performs complete analysis with variable inference', () => {
      const body = `
        total = 0
        for i in 0..10
          total += i
      `;
      const result = analyzeBody(body);

      // Check loops analysis
      expect(result.loops.hasLoop).toBe(true);
      expect(result.loops.loopCount).toBeGreaterThan(0);

      // Check accumulation analysis (+= operator detected)
      expect(result.accumulation.hasAccumulation).toBe(true);

      // Check variable type inference
      expect(result.inferredVariableTypes).toBeDefined();
      expect(result.inferredVariableTypes!.size).toBeGreaterThan(0);
    });

    test('provides directive suggestion', () => {
      const body = `
        total = 0
        for i in 0..100
          total = total + i
      `;
      const result = analyzeBody(body);

      // Loop + accumulation suggests "speed"
      expect(['speed', 'memory', 'safety']).toContain(result.suggestedDirective);
    });

    test('calculates confidence score', () => {
      const body = 'x = 5\ny = x + 10';
      const result = analyzeBody(body);

      expect(result.confidence).toBeGreaterThanOrEqual(0.0);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  /**
   * Test Group 7: Edge Cases
   */
  describe('Edge Cases', () => {
    test('handles empty body gracefully', () => {
      const body = '';
      const result = analyzeBody(body);

      expect(result.inferredVariableTypes).toBeDefined();
      // Empty body should have no inferred types
      expect(result.inferredVariableTypes!.size).toBe(0);
    });

    test('handles body with no assignments', () => {
      const body = 'if true\n  x = 5';
      const result = analyzeBody(body);

      expect(result.inferredVariableTypes).toBeDefined();
      // Should still try to infer from conditional
    });

    test('handles complex expressions', () => {
      const body = 'result = (a + b) * 2';
      const result = analyzeBody(body);

      expect(result.inferredVariableTypes).toBeDefined();
    });

    test('infers from multiple operations', () => {
      const body = `
        arr = []
        arr.push(1)
        arr.push(2)
        total = 0
        for item in arr
          total = total + item
      `;
      const result = analyzeBody(body);

      expect(result.inferredVariableTypes!.has('arr')).toBe(true);
      expect(result.inferredVariableTypes!.has('total')).toBe(true);
      expect(result.inferredVariableTypes!.has('item')).toBe(true);
    });
  });

  /**
   * Test Group 8: Confidence Scoring
   */
  describe('Confidence Scoring in Variable Inference', () => {
    test('high confidence for literal assignments', () => {
      const body = 'x = 42';
      const result = analyzeBody(body);

      const xInfo = result.inferredVariableTypes!.get('x')!;
      expect(xInfo.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('lower confidence for complex operations', () => {
      const body = 'result = complex_function()';
      const result = analyzeBody(body);

      // Function call results have lower confidence (uncertain)
      if (result.inferredVariableTypes!.has('result')) {
        const resultInfo = result.inferredVariableTypes!.get('result')!;
        expect(resultInfo.confidence).toBeLessThanOrEqual(0.75);
      }
    });
  });

  /**
   * Test Group 9: Real-World Patterns
   */
  describe('Real-World Code Patterns', () => {
    test('sum accumulator pattern', () => {
      const body = `
        total = 0
        for num in numbers
          total += num
        return total
      `;
      const result = analyzeBody(body);

      expect(result.inferredVariableTypes!.has('total')).toBe(true);
      // Loop + accumulation (+=) suggests speed optimization
      expect(result.suggestedDirective).toBe('speed');
    });

    test('array filter pattern', () => {
      const body = `
        result = []
        for item in items
          if item > 0
            result.push(item)
      `;
      const result = analyzeBody(body);

      expect(result.loops.hasLoop).toBe(true);
      expect(result.inferredVariableTypes!.has('result')).toBe(true);
    });

    test('string concatenation pattern', () => {
      const body = `
        output = ""
        for char in chars
          output = output + char
      `;
      const result = analyzeBody(body);

      const outputInfo = result.inferredVariableTypes!.get('output')!;
      expect(outputInfo.inferredType).toBe('string');
    });
  });
});
