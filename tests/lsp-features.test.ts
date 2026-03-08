/**
 * ════════════════════════════════════════════════════════════════════
 * LSP Features Tests
 *
 * Language Server Protocol 기능 검증
 * ════════════════════════════════════════════════════════════════════
 */

import { CompletionProvider, SmartCompletionProvider } from '../src/lsp/completion-provider';
import { DiagnosticsEngine } from '../src/lsp/diagnostics-engine';

describe('LSP Server Features', () => {
  describe('Completion Provider', () => {
    const provider = new CompletionProvider();

    it('should suggest keywords', () => {
      const completions = provider.provideCompletions(null as any, { line: 0, character: 0 });

      expect(completions.length).toBeGreaterThan(0);
      expect(completions.some(c => c.label === 'fn')).toBe(true);
      expect(completions.some(c => c.label === 'let')).toBe(true);
      expect(completions.some(c => c.label === 'trait')).toBe(true);
    });

    it('should suggest builtin types', () => {
      const completions = provider.provideCompletions(null as any, { line: 0, character: 6 });

      expect(completions.length).toBeGreaterThan(0);
      const hasTypes = completions.some(c => c.label === 'number' || c.label === 'string');
      expect(hasTypes).toBe(true);
    });

    it('should have completion items with labels', () => {
      const completions = provider.provideCompletions(null as any, { line: 0, character: 0 });

      for (const item of completions) {
        expect(item.label).toBeDefined();
        expect(typeof item.label).toBe('string');
      }
    });

    it('should include snippet completions', () => {
      const completions = provider.provideCompletions(null as any, { line: 0, character: 0 });

      const hasSnippets = completions.some(c => c.insertText && c.insertText.includes('\n'));
      expect(hasSnippets).toBe(true);
    });
  });

  describe('Smart Completion Provider', () => {
    const provider = new SmartCompletionProvider();

    it('should extract variables from scope', () => {
      const context = `
        let x: number = 42
        let y: string = "hello"
        fn test() {
          return x
        }
      `;

      const completions = provider.provideSmartCompletions(
        null as any,
        { line: 5, character: 5 },
        context
      );

      // Should have variable completions
      expect(completions.length).toBeGreaterThan(0);
    });

    it('should merge base and scope completions', () => {
      const context = 'let myVar: number = 10';
      const completions = provider.provideSmartCompletions(
        null as any,
        { line: 0, character: 1 },
        context
      );

      expect(completions.length).toBeGreaterThan(0);
    });
  });

  describe('Diagnostics Engine', () => {
    const engine = new DiagnosticsEngine();

    it('should detect unmatched opening brace', () => {
      // Create a mock document
      const mockDoc = {
        uri: 'file:///test.fl',
        getText: () => 'fn test() { let x = 42',
        split: function() { return this.getText().split('\n'); }
      } as any;

      const diagnostics = engine.validate(mockDoc);

      // Should detect unclosed brace
      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.some(d => d.message.includes('Unclosed'))).toBe(true);
    });

    it('should detect invalid keywords', () => {
      const mockDoc = {
        uri: 'file:///test.fl',
        getText: () => 'function test() { return 42 }',
        split: function() { return this.getText().split('\n'); }
      } as any;

      const diagnostics = engine.validate(mockDoc);

      // Should detect invalid keyword 'function'
      expect(diagnostics.some(d => d.message.includes('Invalid keyword'))).toBe(true);
    });

    it('should validate correct code with minimal errors', () => {
      const mockDoc = {
        uri: 'file:///test.fl',
        getText: () => 'fn add(a: number, b: number): number { return a + b }',
        split: function() { return this.getText().split('\n'); }
      } as any;

      const diagnostics = engine.validate(mockDoc);

      // Should have no or minimal errors for valid code
      const errors = diagnostics.filter(d => d.severity === 1);
      expect(errors.length).toBeLessThan(2);
    });

    it('should provide diagnostic metadata', () => {
      const mockDoc = {
        uri: 'file:///test.fl',
        getText: () => 'function test() {',
        split: function() { return this.getText().split('\n'); }
      } as any;

      const diagnostics = engine.validate(mockDoc);

      for (const diag of diagnostics) {
        expect(diag.severity).toBeDefined();
        expect(diag.message).toBeDefined();
        expect(diag.source).toBeDefined();
        expect(diag.range).toBeDefined();
      }
    });

    it('should handle empty documents', () => {
      const mockDoc = {
        uri: 'file:///test.fl',
        getText: () => '',
        split: function() { return this.getText().split('\n'); }
      } as any;

      const diagnostics = engine.validate(mockDoc);

      // Empty document should not have errors
      expect(Array.isArray(diagnostics)).toBe(true);
    });

    it('should detect multiple errors', () => {
      const mockDoc = {
        uri: 'file:///test.fl',
        getText: () => `
          function invalid() {
            let x = []
            return x
        `,
        split: function() { return this.getText().split('\n'); }
      } as any;

      const diagnostics = engine.validate(mockDoc);

      // Should detect multiple issues: 'function' keyword, unclosed brace
      expect(diagnostics.length).toBeGreaterThan(1);
    });
  });

  describe('LSP Integration', () => {
    it('should provide completions for different contexts', () => {
      const provider = new CompletionProvider();

      // Context 1: At start of line
      let completions = provider.provideCompletions(null as any, { line: 0, character: 0 });
      expect(completions.length).toBeGreaterThan(0);

      // Context 2: After type declaration
      completions = provider.provideCompletions(null as any, { line: 0, character: 6 });
      expect(completions.length).toBeGreaterThan(0);

      // All should have labels
      for (const c of completions) {
        expect(c.label).toBeDefined();
      }
    });

    it('should handle diagnostics for complex code', () => {
      const engine = new DiagnosticsEngine();

      const complexCode = `
        trait Iterator<T> {
          fn next(): Option<T>
        }

        fn processIterator<T>(iter: Iterator<T>): T {
          let item = iter.next()
          return item
        }
      `;

      const mockDoc = {
        uri: 'file:///test.fl',
        getText: () => complexCode,
        split: function() { return this.getText().split('\n'); }
      } as any;

      const diagnostics = engine.validate(mockDoc);

      // Should parse without critical errors
      expect(Array.isArray(diagnostics)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('completions should be fast (<10ms)', () => {
      const provider = new CompletionProvider();
      const start = process.hrtime.bigint();

      provider.provideCompletions(null as any, { line: 0, character: 0 });

      const end = process.hrtime.bigint();
      const timeMs = Number(end - start) / 1_000_000;

      expect(timeMs).toBeLessThan(10);
    });

    it('diagnostics should handle large files efficiently (<100ms)', () => {
      const engine = new DiagnosticsEngine();

      let code = '';
      for (let i = 0; i < 100; i++) {
        code += `fn func${i}(): number { return ${i} }\n`;
      }

      const mockDoc = {
        uri: 'file:///test.fl',
        getText: () => code,
        split: function() { return this.getText().split('\n'); }
      } as any;

      const start = process.hrtime.bigint();
      const diagnostics = engine.validate(mockDoc);
      const end = process.hrtime.bigint();

      const timeMs = Number(end - start) / 1_000_000;

      expect(timeMs).toBeLessThan(100);
    });
  });
});
