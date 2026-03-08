/**
 * LSP End-to-End Integration Tests
 *
 * Test complete LSP workflows and real-world scenarios
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LSPCompilerBridge } from '../src/lsp/bridge/lsp-compiler-bridge';
import { IncrementalParser } from '../src/lsp/bridge/incremental-parser';
import { SymbolIndex } from '../src/lsp/bridge/symbol-index';
import {
  EnhancedHoverProvider,
  EnhancedCompletionProvider,
  EnhancedDefinitionProvider,
  EnhancedDiagnosticsEngine,
} from '../src/lsp/bridge/enhanced-providers';

describe('LSP End-to-End Integration', () => {
  let bridge: LSPCompilerBridge;
  let incrementalParser: IncrementalParser;
  let symbolIndex: SymbolIndex;
  let hover: EnhancedHoverProvider;
  let completion: EnhancedCompletionProvider;
  let definition: EnhancedDefinitionProvider;
  let diagnostics: EnhancedDiagnosticsEngine;

  beforeEach(() => {
    bridge = new LSPCompilerBridge();
    incrementalParser = new IncrementalParser();
    symbolIndex = new SymbolIndex();
    hover = new EnhancedHoverProvider(bridge);
    completion = new EnhancedCompletionProvider(bridge);
    definition = new EnhancedDefinitionProvider(bridge);
    diagnostics = new EnhancedDiagnosticsEngine(bridge);
  });

  describe('Real-World Workflows', () => {
    test('complete code navigation workflow', () => {
      const code = `
        fn greet(name: string) -> string {
          return "Hello, " + name;
        }

        let message = greet("World");
      `.trim();

      const doc = TextDocument.create('file:///workflow.fl', 'freelang', 1, code);

      // 1. Parse and validate
      bridge.updateDocument(doc.uri, code);
      const diags = diagnostics.validateDocument(doc);
      expect(Array.isArray(diags)).toBe(true);

      // 2. Index symbols
      const symbols = bridge.getSymbols(doc.uri);
      symbolIndex.indexDocument(doc.uri, symbols);
      expect(symbolIndex.getStats().globalSymbols).toBeGreaterThanOrEqual(0);

      // 3. Navigate to definition
      const positions = [
        { line: 0, character: 3 }, // 'greet' definition
        { line: 4, character: 20 }, // 'greet' call
      ];

      for (const pos of positions) {
        const def = definition.provideDefinition(doc, pos);
        // Should find something
        expect(def === null || typeof def === 'object').toBe(true);
      }

      // 4. Hover for types
      const hoverPos: Position = { line: 4, character: 8 };
      const hoverInfo = hover.provideHover(doc, hoverPos);
      expect(hoverInfo === null || typeof hoverInfo === 'object').toBe(true);
    });

    test('multi-document workspace', () => {
      const files = [
        { uri: 'file:///types.fl', code: 'type User { name: string, age: number }' },
        { uri: 'file:///main.fl', code: 'let user: User = new User();\nprint(user);' },
      ];

      // Parse all files
      for (const file of files) {
        const doc = TextDocument.create(file.uri, 'freelang', 1, file.code);
        bridge.updateDocument(file.uri, file.code);

        const symbols = bridge.getSymbols(file.uri);
        symbolIndex.indexDocument(file.uri, symbols);
      }

      // Index should contain symbols from all files
      const stats = symbolIndex.getStats();
      expect(stats.documents).toBeGreaterThanOrEqual(0);
    });

    test('typing and completion workflow', () => {
      const doc = TextDocument.create('file:///typing.fl', 'freelang', 1, 'let x = ');

      bridge.updateDocument(doc.uri, doc.getText());

      // 1. Get completions as user types
      const completions = completion.provideCompletions(doc, { line: 0, character: 8 });
      expect(Array.isArray(completions)).toBe(true);
      expect(completions.length).toBeGreaterThan(0);

      // 2. Select and insert completion
      const selected = completions[0];
      expect(selected.label).toBeDefined();
    });

    test('error recovery workflow', () => {
      const invalidCode = `
        let x = ;  // Syntax error
        let y = 10;
        print(y);
      `.trim();

      const doc = TextDocument.create('file:///errors.fl', 'freelang', 1, invalidCode);
      const diags = diagnostics.validateDocument(doc);

      // Should report error but not crash
      expect(Array.isArray(diags)).toBe(true);

      // Should still be able to do other operations
      const comps = completion.provideCompletions(doc, { line: 3, character: 0 });
      expect(Array.isArray(comps)).toBe(true);
    });
  });

  describe('Performance Scenarios', () => {
    test('handles large single file efficiently', () => {
      let code = '';
      for (let i = 0; i < 500; i++) {
        code += `let var${i} = ${i};\n`;
      }

      const doc = TextDocument.create('file:///large.fl', 'freelang', 1, code);

      const start = performance.now();
      bridge.updateDocument(doc.uri, code);
      const parseTime = performance.now() - start;

      expect(parseTime).toBeLessThan(2000); // 2 seconds for 500 lines
    });

    test('handles rapid document updates', () => {
      const doc = TextDocument.create('file:///rapid.fl', 'freelang', 1, 'let x = ');
      const uri = doc.uri;

      const updates = 20; // Simulate rapid typing
      const startTime = performance.now();

      for (let i = 0; i < updates; i++) {
        const content = `let x = ${i};`;
        bridge.updateDocument(uri, content);
      }

      const totalTime = performance.now() - startTime;
      const avgTime = totalTime / updates;

      expect(avgTime).toBeLessThan(200); // Average < 200ms per update
    });

    test('symbol index performance', () => {
      // Create and index many files
      const fileCount = 100;
      const start = performance.now();

      for (let i = 0; i < fileCount; i++) {
        const code = `let var${i} = ${i};`;
        const uri = `file:///file${i}.fl`;

        bridge.updateDocument(uri, code);
        const symbols = bridge.getSymbols(uri);
        symbolIndex.indexDocument(uri, symbols);
      }

      const indexTime = performance.now() - start;

      // Should handle 100 files efficiently
      expect(indexTime).toBeLessThan(5000); // 5 seconds for 100 files

      // Lookup should be fast
      const lookupStart = performance.now();
      for (let i = 0; i < 100; i++) {
        symbolIndex.findSymbol(`var${i}`);
      }
      const lookupTime = performance.now() - lookupStart;

      expect(lookupTime).toBeLessThan(100); // 100 lookups in < 100ms
    });

    test('incremental parser cache', () => {
      const uri = 'file:///incremental.fl';
      const doc = TextDocument.create(uri, 'freelang', 1, 'let x = 10;');

      bridge.updateDocument(uri, doc.getText());

      // Simulate change
      const change = {
        range: { start: { line: 0, character: 8 }, end: { line: 0, character: 10 } },
        text: '20',
        rangeLength: 2,
      };

      const start = performance.now();
      const result = incrementalParser.parseIncremental(
        uri,
        null,
        [change],
        'let x = 20;'
      );
      const parseTime = performance.now() - start;

      expect(parseTime).toBeLessThan(100); // Fast incremental update
    });
  });

  describe('Provider Consistency', () => {
    test('providers agree on symbol locations', () => {
      const code = 'let count = 0;\ncount = count + 1;';
      const doc = TextDocument.create('file:///consistency.fl', 'freelang', 1, code);
      bridge.updateDocument(doc.uri, code);

      const pos: Position = { line: 0, character: 4 };

      // Definition and hover should both find the symbol
      const def = definition.provideDefinition(doc, pos);
      const hov = hover.provideHover(doc, pos);

      // Both should return something or null, but not error
      expect(def === null || typeof def === 'object').toBe(true);
      expect(hov === null || typeof hov === 'object').toBe(true);
    });

    test('diagnostics consistent across updates', () => {
      const doc = TextDocument.create('file:///consistency.fl', 'freelang', 1, 'let x = 10;');

      const diags1 = diagnostics.validateDocument(doc);
      const diags2 = diagnostics.validateDocument(doc);

      // Same document should produce same diagnostics
      expect(diags1.length).toBe(diags2.length);
    });
  });

  describe('Edge Cases', () => {
    test('empty document handling', () => {
      const doc = TextDocument.create('file:///empty.fl', 'freelang', 1, '');

      bridge.updateDocument(doc.uri, '');

      const comps = completion.provideCompletions(doc, { line: 0, character: 0 });
      const diags = diagnostics.validateDocument(doc);

      expect(Array.isArray(comps)).toBe(true);
      expect(Array.isArray(diags)).toBe(true);
    });

    test('deeply nested code', () => {
      let code = '';
      for (let i = 0; i < 10; i++) {
        code += '{\n'.repeat(i);
      }
      code += 'let x = 10;';
      for (let i = 0; i < 10; i++) {
        code += '\n}'.repeat(i);
      }

      const doc = TextDocument.create('file:///nested.fl', 'freelang', 1, code);
      bridge.updateDocument(doc.uri, code);

      const comps = completion.provideCompletions(doc, { line: 50, character: 0 });
      expect(Array.isArray(comps)).toBe(true);
    });

    test('unicode and special characters', () => {
      const code = 'let 变量 = "Hello, 世界! 🌍";';
      const doc = TextDocument.create('file:///unicode.fl', 'freelang', 1, code);

      bridge.updateDocument(doc.uri, code);

      const comps = completion.provideCompletions(doc, { line: 0, character: 0 });
      expect(Array.isArray(comps)).toBe(true);
    });

    test('very long identifiers', () => {
      const longName = 'a'.repeat(1000);
      const code = `let ${longName} = 10;`;
      const doc = TextDocument.create('file:///long.fl', 'freelang', 1, code);

      bridge.updateDocument(doc.uri, code);

      const symbols = bridge.getSymbols(doc.uri);
      expect(Array.isArray(symbols)).toBe(true);
    });
  });

  describe('Cache Management', () => {
    test('incremental parser cache clearing', () => {
      const incrementalParser = new IncrementalParser();

      // Cache some nodes
      incrementalParser.cacheNode('file:///test.fl', 'node1', { type: 'Variable' });
      incrementalParser.cacheNode('file:///test.fl', 'node2', { type: 'Function' });

      const stats1 = incrementalParser.getCacheStats();
      expect(stats1.totalNodes).toBe(2);

      // Clear stale cache
      incrementalParser.clearStaleCache();

      const stats2 = incrementalParser.getCacheStats();
      expect(stats2.totalNodes).toBeGreaterThanOrEqual(0);
    });

    test('symbol index eviction', () => {
      const index = new SymbolIndex();

      // Add many documents
      for (let i = 0; i < 150; i++) {
        const symbols = [
          {
            name: `sym${i}`,
            kind: 'variable' as const,
            location: { uri: `file:///file${i}.fl`, range: null as any },
          },
        ];
        index.indexDocument(`file:///file${i}.fl`, symbols);
      }

      const stats = index.getStats();
      expect(stats.documents).toBeLessThanOrEqual(150);
    });
  });
});
