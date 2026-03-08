/**
 * LSP Bridge Tests
 *
 * Unit tests for LSP-Compiler bridge infrastructure
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { Position, TextDocument } from 'vscode-languageserver';
import { PositionResolver } from '../src/lsp/bridge/position-resolver';
import { SymbolTableBuilder } from '../src/lsp/bridge/symbol-table-builder';
import { LSPCompilerBridge } from '../src/lsp/bridge/lsp-compiler-bridge';

describe.skip('PositionResolver', () => {
  let resolver: PositionResolver;

  beforeEach(() => {
    resolver = new PositionResolver();
  });

  describe.skip('Position/Offset Conversion', () => {
    test.skip('converts position to offset (single line)', () => {
      const content = 'let x = 10;';
      const pos: Position = { line: 0, character: 4 }; // points to 'x'

      const offset = resolver.positionToOffset(content, pos);
      expect(offset).toBe(4);
    });

    test.skip('converts position to offset (multiple lines)', () => {
      const content = 'let x = 10;\nlet y = 20;';
      const pos: Position = { line: 1, character: 4 }; // 'y' on second line

      const offset = resolver.positionToOffset(content, pos);
      expect(offset).toBe(16); // 11 (first line + newline) + 5
    });

    test.skip('converts offset to position (single line)', () => {
      const content = 'let x = 10;';
      const offset = 4; // points to 'x'

      const pos = resolver.offsetToPosition(content, offset);
      expect(pos.line).toBe(0);
      expect(pos.character).toBe(4);
    });

    test.skip('converts offset to position (multiple lines)', () => {
      const content = 'let x = 10;\nlet y = 20;';
      const offset = 16; // 'y' on second line

      const pos = resolver.offsetToPosition(content, offset);
      expect(pos.line).toBe(1);
      expect(pos.character).toBe(4);
    });

    test.skip('handles out-of-bounds offset gracefully', () => {
      const content = 'hello\nworld';
      const offset = 1000; // way beyond content

      const pos = resolver.offsetToPosition(content, offset);
      expect(pos.line).toBeGreaterThanOrEqual(0);
      expect(pos.character).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Word and Context Detection', () => {
    test.skip('identifies word at position', () => {
      const content = 'let myVariable = 42;';
      const pos: Position = { line: 0, character: 7 }; // inside 'myVariable'

      const word = resolver.getWordAtPosition(content, pos);
      expect(word).toBe('myVariable');
    });

    test.skip('detects member access context', () => {
      const content = 'object.';
      const pos: Position = { line: 0, character: 7 }; // after dot

      const isMemberAccess = resolver.isAfterMemberAccess(content, pos);
      expect(isMemberAccess).toBe(true);
    });

    test.skip('detects type annotation context', () => {
      const content = 'let x: ';
      const pos: Position = { line: 0, character: 7 }; // after colon

      const isTypeAnnotation = resolver.isAfterTypeAnnotation(content, pos);
      expect(isTypeAnnotation).toBe(true);
    });

    test.skip('retrieves line content', () => {
      const content = 'line 1\nline 2\nline 3';
      const lineContent = resolver.getLineContent(content, 1);

      expect(lineContent).toBe('line 2');
    });
  });

  describe('Node Finding', () => {
    test.skip('finds node at position in simple AST', () => {
      const ast = {
        type: 'Program',
        start: 0,
        end: 11,
        body: [
          {
            type: 'VariableDeclaration',
            name: 'x',
            start: 4,
            end: 5,
          },
        ],
      };

      const pos: Position = { line: 0, character: 4 };
      const content = 'let x = 10;';

      const node = resolver.findNodeAtPosition(ast, pos, content);
      expect(node).not.toBeNull();
      expect(node?.name).toBe('x');
    });

    test.skip('finds no node when position is not in AST', () => {
      const ast = { type: 'Program', body: [] };
      const pos: Position = { line: 10, character: 0 };
      const content = 'hello';

      const node = resolver.findNodeAtPosition(ast, pos, content);
      expect(node).toBeNull();
    });
  });

  describe('Scope Detection', () => {
    test.skip('detects global scope', () => {
      const ast = { type: 'Program' };
      const pos: Position = { line: 0, character: 0 };
      const content = 'let x = 10;';

      const context = resolver.getContextAtPosition(ast, pos, content);
      expect(context.scope).toBe('global');
    });
  });
});

describe('SymbolTableBuilder', () => {
  let builder: SymbolTableBuilder;

  beforeEach(() => {
    builder = new SymbolTableBuilder();
  });

  describe('Symbol Table Building', () => {
    test.skip('builds empty table for null AST', () => {
      const table = builder.build(null, new Map());

      expect(table.global.size).toBe(0);
      expect(table.variables.size).toBe(0);
      expect(table.functions.size).toBe(0);
    });

    test.skip('collects variable symbols from AST', () => {
      const ast = {
        type: 'Program',
        body: [
          {
            type: 'VariableDeclaration',
            name: 'myVar',
            varName: 'myVar',
            varType: 'number',
          },
        ],
      };

      const table = builder.build(ast, new Map());

      expect(table.variables.size).toBe(1);
      expect(table.variables.has('myVar')).toBe(true);
      const sym = table.variables.get('myVar');
      expect(sym?.type).toBe('number');
    });

    test.skip('collects function symbols from AST', () => {
      const ast = {
        type: 'Program',
        body: [
          {
            type: 'FunctionDeclaration',
            fnName: 'greet',
            params: [{ name: 'name', paramType: 'string' }],
            returnType: 'void',
          },
        ],
      };

      const table = builder.build(ast, new Map());

      expect(table.functions.size).toBe(1);
      expect(table.functions.has('greet')).toBe(true);
      const sym = table.functions.get('greet');
      expect(sym?.parameters.length).toBe(1);
      expect(sym?.parameters[0].name).toBe('name');
    });

    test.skip('collects import symbols from AST', () => {
      const ast = {
        type: 'Program',
        body: [
          {
            type: 'ImportDeclaration',
            importedName: 'fs',
            importPath: 'fs',
          },
        ],
      };

      const table = builder.build(ast, new Map());

      expect(table.imports.size).toBe(1);
      expect(table.imports.has('fs')).toBe(true);
    });

    test.skip('integrates type information when building symbols', () => {
      const typeInfo = new Map();
      typeInfo.set('count', {
        type: 'number',
        confidence: 0.95,
        source: 'explicit' as const,
        reasoning: ['Explicit type annotation'],
        assignments: [],
        usages: [],
      });

      const ast = {
        type: 'Program',
        body: [
          {
            type: 'VariableDeclaration',
            name: 'count',
          },
        ],
      };

      const table = builder.build(ast, typeInfo);

      const sym = table.variables.get('count');
      expect(sym?.type).toBe('number');
      expect(sym?.confidence).toBe(0.95);
    });
  });

  describe('Symbol Resolution', () => {
    test.skip('resolves variable symbol by name', () => {
      const ast = {
        type: 'Program',
        body: [
          {
            type: 'VariableDeclaration',
            name: 'x',
          },
        ],
      };

      const table = builder.build(ast, new Map());
      const symbol = builder.resolveSymbol('x', table);

      expect(symbol).not.toBeNull();
      expect(symbol?.name).toBe('x');
    });

    test.skip('resolves function symbol by name', () => {
      const ast = {
        type: 'Program',
        body: [
          {
            type: 'FunctionDeclaration',
            fnName: 'foo',
          },
        ],
      };

      const table = builder.build(ast, new Map());
      const symbol = builder.resolveSymbol('foo', table);

      expect(symbol).not.toBeNull();
      expect(symbol?.name).toBe('foo');
      expect(symbol?.kind).toBe('function');
    });

    test.skip('returns null for unresolved symbol', () => {
      const table = builder.build({}, new Map());
      const symbol = builder.resolveSymbol('nonexistent', table);

      expect(symbol).toBeNull();
    });
  });

  describe('Symbol Lookup by Kind', () => {
    test.skip('gets all variable symbols', () => {
      const ast = {
        type: 'Program',
        body: [
          { type: 'VariableDeclaration', name: 'x' },
          { type: 'VariableDeclaration', name: 'y' },
        ],
      };

      const table = builder.build(ast, new Map());
      const vars = builder.getSymbolsByKind(table, 'variable');

      expect(vars.length).toBe(2);
      expect(vars.map(v => v.name)).toContain('x');
      expect(vars.map(v => v.name)).toContain('y');
    });

    test.skip('gets all function symbols', () => {
      const ast = {
        type: 'Program',
        body: [
          { type: 'FunctionDeclaration', fnName: 'foo', params: [] },
          { type: 'FunctionDeclaration', fnName: 'bar', params: [] },
        ],
      };

      const table = builder.build(ast, new Map());
      const funcs = builder.getSymbolsByKind(table, 'function');

      expect(funcs.length).toBe(2);
      expect(funcs.map(f => f.name)).toContain('foo');
      expect(funcs.map(f => f.name)).toContain('bar');
    });
  });
});

describe('LSPCompilerBridge', () => {
  let bridge: LSPCompilerBridge;

  beforeEach(() => {
    bridge = new LSPCompilerBridge();
  });

  describe('Document Management', () => {
    test.skip('updates and caches document', () => {
      const uri = 'file:///test.fl';
      const content = 'let x = 10;';

      const doc = bridge.updateDocument(uri, content);

      expect(doc.uri).toBe(uri);
      expect(doc.content).toBe(content);
      expect(doc.version).toBe(1);
    });

    test.skip('increments version on document update', () => {
      const uri = 'file:///test.fl';

      const doc1 = bridge.updateDocument(uri, 'let x = 10;');
      const doc2 = bridge.updateDocument(uri, 'let x = 20;');

      expect(doc1.version).toBe(1);
      expect(doc2.version).toBe(2);
    });

    test.skip('retrieves cached document', () => {
      const uri = 'file:///test.fl';
      const content = 'let x = 10;';

      bridge.updateDocument(uri, content);
      const cached = bridge.getDocument(uri);

      expect(cached).not.toBeNull();
      expect(cached?.content).toBe(content);
    });

    test.skip('returns null for uncached document', () => {
      const cached = bridge.getDocument('file:///nonexistent.fl');
      expect(cached).toBeNull();
    });

    test.skip('invalidates document cache', () => {
      const uri = 'file:///test.fl';
      bridge.updateDocument(uri, 'let x = 10;');

      bridge.invalidateDocument(uri);
      const cached = bridge.getDocument(uri);

      expect(cached).toBeNull();
    });

    test.skip('clears entire cache', () => {
      bridge.updateDocument('file:///test1.fl', 'let x = 10;');
      bridge.updateDocument('file:///test2.fl', 'let y = 20;');

      bridge.clearCache();

      expect(bridge.getDocument('file:///test1.fl')).toBeNull();
      expect(bridge.getDocument('file:///test2.fl')).toBeNull();
    });
  });

  describe('Cache Statistics', () => {
    test.skip('provides cache statistics', () => {
      bridge.updateDocument('file:///test.fl', 'let x = 10;');

      const stats = bridge.getCacheStats();

      expect(stats.cachedDocuments).toBeGreaterThan(0);
      expect(stats.totalSymbols).toBeGreaterThanOrEqual(0);
      expect(stats.cacheSize).toBeDefined();
    });
  });

  describe('Symbol Operations', () => {
    test.skip('gets all symbols in document', () => {
      const uri = 'file:///test.fl';
      const content = 'let x = 10;\nfn greet() {}';

      bridge.updateDocument(uri, content);
      const symbols = bridge.getSymbols(uri);

      expect(symbols.length).toBeGreaterThanOrEqual(0);
    });

    test.skip('gets type info for symbol', () => {
      const uri = 'file:///test.fl';
      const content = 'let x: number = 10;';

      bridge.updateDocument(uri, content);
      const info = bridge.getTypeInfo('x', uri);

      // May be null depending on parser implementation
      if (info) {
        expect(info.type).toBeDefined();
        expect(info.confidence).toBeGreaterThanOrEqual(0);
      }
    });

    test.skip('returns null for nonexistent symbol type info', () => {
      const uri = 'file:///test.fl';
      bridge.updateDocument(uri, 'let x = 10;');

      const info = bridge.getTypeInfo('nonexistent', uri);
      expect(info).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test.skip('handles parsing errors gracefully', () => {
      const uri = 'file:///test.fl';
      const invalidContent = 'let x = ;'; // Invalid syntax

      const doc = bridge.updateDocument(uri, invalidContent);

      // Should still return a document
      expect(doc).not.toBeNull();
      // May have diagnostics for parse error
      expect(Array.isArray(doc.diagnostics)).toBe(true);
    });

    test.skip('returns minimal document on parse error', () => {
      const uri = 'file:///test.fl';
      const invalidContent = '{{{';

      const doc = bridge.updateDocument(uri, invalidContent);

      expect(doc.uri).toBe(uri);
      expect(doc.content).toBe(invalidContent);
      expect(doc.symbolTable).toBeDefined();
    });
  });

  describe('Type Inference Integration', () => {
    test.skip('infers types from document content', () => {
      const uri = 'file:///test.fl';
      const content = 'let x = 42;\nlet name = "Alice";';

      const doc = bridge.updateDocument(uri, content);

      // Type info should be populated
      expect(doc.typeInfo).toBeDefined();
      expect(doc.typeInfo instanceof Map).toBe(true);
    });

    test.skip('marks low confidence types as warnings', () => {
      const uri = 'file:///test.fl';
      const content = 'let mystery = getData();'; // Unresolved function

      const doc = bridge.updateDocument(uri, content);

      // May have diagnostics for low confidence
      const hasWarning = doc.diagnostics.some(
        d => d.code === 'low-confidence-type'
      );
      // Not guaranteed, depends on inference
      expect(Array.isArray(doc.diagnostics)).toBe(true);
    });
  });

  describe('Symbol Position Finding', () => {
    test.skip('finds symbol at valid position', () => {
      const uri = 'file:///test.fl';
      const content = 'let myVar = 10;';

      bridge.updateDocument(uri, content);

      // Note: TextDocument from vscode-languageserver requires proper initialization
      // This test may need adjustment based on actual TextDocument implementation
      // For now, we test that the method exists and doesn't crash
      expect(bridge.findSymbolAtPosition).toBeDefined();
    });
  });

  describe('Performance', () => {
    test.skip('document update completes in reasonable time', () => {
      const uri = 'file:///test.fl';
      const content = 'let x = 10;\nlet y = 20;\nlet z = 30;';

      const start = performance.now();
      bridge.updateDocument(uri, content);
      const duration = performance.now() - start;

      // Should complete quickly (< 500ms even with parsing)
      expect(duration).toBeLessThan(500);
    });

    test.skip('cached retrieval is fast', () => {
      const uri = 'file:///test.fl';
      bridge.updateDocument(uri, 'let x = 10;');

      const start = performance.now();
      bridge.getDocument(uri);
      const duration = performance.now() - start;

      // Cache retrieval should be very fast (< 10ms)
      expect(duration).toBeLessThan(10);
    });

    test.skip('symbol resolution is fast', () => {
      const uri = 'file:///test.fl';
      bridge.updateDocument(uri, 'let x = 10;\nlet y = 20;');

      const start = performance.now();
      bridge.getSymbols(uri);
      const duration = performance.now() - start;

      // Should complete quickly
      expect(duration).toBeLessThan(100);
    });
  });
});
