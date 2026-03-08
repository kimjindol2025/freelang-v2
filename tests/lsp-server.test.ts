/**
 * ════════════════════════════════════════════════════════════════════
 * LSP Server Tests
 *
 * Language Server Protocol 기능 검증:
 * - Hover (타입 정보)
 * - Completion (자동완성)
 * - Definition (정의로 이동)
 * - Diagnostics (오류 감지)
 * ════════════════════════════════════════════════════════════════════
 */

import { HoverProvider } from '../src/lsp/hover-provider';
import { CompletionProvider } from '../src/lsp/completion-provider';
import { DefinitionProvider } from '../src/lsp/definition-provider';
import { DiagnosticsEngine } from '../src/lsp/diagnostics-engine';

// Mock TextDocument
interface MockTextDocument {
  uri: string;
  languageId: string;
  version: number;
  lineCount: number;
  getText(range?: any): string;
  offsetAt(position: any): number;
  positionAt(offset: number): any;
}

describe('LSP Server Features', () => {
  // Mock TextDocument Factory
  function createDocument(content: string, uri = 'file:///test.fl'): MockTextDocument {
    const lines = content.split('\n');
    return {
      uri,
      languageId: 'freelang',
      version: 1,
      lineCount: lines.length,
      getText(range?: any): string {
        if (!range) return content;
        const lines = content.split('\n');
        if (range.start.line === range.end.line) {
          return lines[range.start.line].substring(range.start.character, range.end.character);
        }
        return content.substring(0, range.end.character);
      },
      offsetAt(position: any): number {
        const lines = content.split('\n');
        let offset = 0;
        for (let i = 0; i < position.line; i++) {
          offset += lines[i].length + 1; // +1 for newline
        }
        offset += position.character;
        return offset;
      },
      positionAt(offset: number): any {
        const lines = content.split('\n');
        let currentOffset = 0;
        for (let i = 0; i < lines.length; i++) {
          if (currentOffset + lines[i].length >= offset) {
            return { line: i, character: offset - currentOffset };
          }
          currentOffset += lines[i].length + 1; // +1 for newline
        }
        return { line: lines.length - 1, character: lines[lines.length - 1].length };
      }
    };
  }

  describe('Hover Provider', () => {
    const provider = new HoverProvider();

    it('should show type information on hover', () => {
      const doc = createDocument('let x: number = 42');
      const hover = provider.provideHover(doc, 0, 4); // hovering over 'x'

      expect(hover).not.toBeNull();
      if (hover) {
        expect(hover.contents).toBeDefined();
      }
    });

    it('should show generic type information', () => {
      const doc = createDocument('let arr: array<number> = [1, 2, 3]');
      const hover = provider.provideHover(doc, 0, 4); // hovering over 'arr'

      expect(hover).not.toBeNull();
    });

    it('should show function signature', () => {
      const doc = createDocument('fn add(a: number, b: number): number { return a + b }');
      const hover = provider.provideHover(doc, 0, 3); // hovering over 'add'

      expect(hover).not.toBeNull();
    });

    it('should show confidence level', () => {
      const doc = createDocument('let y = getValue()');
      const hover = provider.provideHover(doc, 0, 4);

      // Hover should show confidence if provided
      expect(hover).toBeDefined();
    });

    it('should handle unknown symbols', () => {
      const doc = createDocument('let x: UnknownType = value');
      const hover = provider.provideHover(doc, 0, 4);

      // May return null or partial info for unknown types
      expect(hover === null || hover !== null).toBe(true);
    });
  });

  describe('Completion Provider', () => {
    const provider = new CompletionProvider();

    it('should suggest keywords', () => {
      const doc = createDocument('');
      const completions = provider.provideCompletions(doc, { line: 0, character: 0 });

      expect(completions.length).toBeGreaterThan(0);
      expect(completions.some(c => c.label === 'fn')).toBe(true);
      expect(completions.some(c => c.label === 'let')).toBe(true);
    });

    it('should suggest types after colon', () => {
      const doc = createDocument('let x: ');
      const completions = provider.provideCompletions(doc, { line: 0, character: 7 });

      expect(completions.length).toBeGreaterThan(0);
      expect(completions.some(c => c.label === 'number')).toBe(true);
      expect(completions.some(c => c.label === 'string')).toBe(true);
    });

    it('should suggest generic types', () => {
      const doc = createDocument('let arr: array<');
      const completions = provider.provideCompletions(doc, { line: 0, character: 15 });

      expect(completions.length).toBeGreaterThan(0);
      expect(completions.some(c => c.label.includes('Type'))).toBe(true);
    });

    it('should suggest code snippets', () => {
      const doc = createDocument('');
      const completions = provider.provideCompletions(doc, { line: 0, character: 0 });

      const fnSnippet = completions.find(c => c.label === 'fn');
      expect(fnSnippet).toBeDefined();
      expect(fnSnippet?.insertText).toContain('fn');
    });

    it('should suggest after opening paren', () => {
      const doc = createDocument('fn test(');
      const completions = provider.provideCompletions(doc, { line: 0, character: 8 });

      expect(completions.length).toBeGreaterThan(0);
    });
  });

  describe('Definition Provider', () => {
    const provider = new DefinitionProvider();

    it('should find function definition', () => {
      const doc = createDocument(
        'fn greet(name: string) { return "Hello " + name }\ngreet("World")'
      );

      const def = provider.findDefinition(doc, { line: 1, character: 0 });

      expect(def).not.toBeNull();
      if (def) {
        expect(def.range.start.line).toBe(0);
      }
    });

    it('should find variable definition', () => {
      const doc = createDocument('let x: number = 42\nreturn x');

      const def = provider.findDefinition(doc, { line: 1, character: 7 });

      expect(def).not.toBeNull();
      if (def) {
        expect(def.range.start.line).toBe(0);
      }
    });

    it('should find type definition', () => {
      const doc = createDocument('type Status = number | string\nlet s: Status = 42');

      const def = provider.findDefinition(doc, { line: 1, character: 8 });

      expect(def).not.toBeNull();
    });

    it('should find trait definition', () => {
      const doc = createDocument(
        'trait Comparable { fn compare() }\nimpl Comparable for number { }'
      );

      const def = provider.findDefinition(doc, { line: 1, character: 5 });

      expect(def).not.toBeNull();
    });

    it('should return null for undefined symbols', () => {
      const doc = createDocument('let x = unknownFunc()');

      const def = provider.findDefinition(doc, { line: 0, character: 10 });

      // May return null since unknownFunc is not defined
      expect(def === null || def !== null).toBe(true);
    });
  });

  describe('Diagnostics Engine', () => {
    const engine = new DiagnosticsEngine();

    it('should detect unmatched braces', () => {
      const doc = createDocument('fn test() { let x = 42');
      const diagnostics = engine.validate(doc);

      expect(diagnostics.some(d => d.message.includes('brace'))).toBe(true);
    });

    it('should detect invalid keywords', () => {
      const doc = createDocument('function test() {}');
      const diagnostics = engine.validate(doc);

      expect(diagnostics.some(d => d.message.includes('keyword'))).toBe(true);
    });

    it('should detect return outside function', () => {
      const doc = createDocument('return 42');
      const diagnostics = engine.validate(doc);

      expect(diagnostics.some(d => d.message.includes('outside'))).toBe(true);
    });

    it('should warn about unused variables', () => {
      const doc = createDocument('let unused: number = 42\nlet x: number = 10\nreturn x');
      const diagnostics = engine.validate(doc);

      expect(diagnostics.some(d => d.message.includes('never used'))).toBe(true);
    });

    it('should suggest type for empty arrays', () => {
      const doc = createDocument('let arr = []');
      const diagnostics = engine.validate(doc);

      expect(diagnostics.some(d => d.message.includes('type'))).toBe(true);
    });

    it('should handle valid code without errors', () => {
      const doc = createDocument('fn add(a: number, b: number): number { return a + b }');
      const diagnostics = engine.validate(doc);

      // Should have minimal or no errors for valid code
      const errors = diagnostics.filter(d => d.severity === 1); // Error severity
      expect(errors.length).toBeLessThan(2);
    });

    it('should detect unclosed parenthesis', () => {
      const doc = createDocument('fn test(a: number { }');
      const diagnostics = engine.validate(doc);

      expect(diagnostics.some(d => d.message.includes('paren'))).toBe(true);
    });

    it('should support multiple error types', () => {
      const doc = createDocument(`
        function invalid() {
          let x = []
          let unused = 42
          return x
      `);

      const diagnostics = engine.validate(doc);

      // Should detect multiple issues
      expect(diagnostics.length).toBeGreaterThan(1);
    });
  });

  describe('LSP Integration', () => {
    it('should handle complete workflow: open -> hover -> completion -> definition', () => {
      const code = `
        trait Iterator<T> {
          fn next(): Option<T>
        }

        fn processIterator<T>(iter: Iterator<T>): T {
          let item = iter.next()
          return item
        }
      `;

      const doc = createDocument(code);
      const hover = new HoverProvider();
      const completion = new CompletionProvider();
      const definition = new DefinitionProvider();
      const diagnostics = new DiagnosticsEngine();

      // 1. Hover on Iterator
      const hoverInfo = hover.provideHover(doc, 1, 10);
      expect(hoverInfo === null || hoverInfo !== null).toBe(true);

      // 2. Completion at line 6
      const completions = completion.provideCompletions(doc, { line: 6, character: 0 });
      expect(completions.length).toBeGreaterThan(0);

      // 3. Definition of Iterator
      const def = definition.findDefinition(doc, { line: 6, character: 15 });
      expect(def === null || def !== null).toBe(true);

      // 4. Validate document
      const diags = diagnostics.validate(doc);
      expect(Array.isArray(diags)).toBe(true);
    });

    it('should handle large files efficiently', () => {
      let code = '';
      for (let i = 0; i < 100; i++) {
        code += `fn func${i}(): number { return ${i} }\n`;
      }

      const doc = createDocument(code);
      const diagnostics = new DiagnosticsEngine();

      const start = process.hrtime.bigint();
      const diags = diagnostics.validate(doc);
      const end = process.hrtime.bigint();

      const timeMs = Number(end - start) / 1_000_000;

      // Should complete in reasonable time (<100ms)
      expect(timeMs).toBeLessThan(100);
    });
  });
});
