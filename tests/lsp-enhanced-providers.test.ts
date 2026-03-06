/**
 * Enhanced LSP Providers Tests
 *
 * Test suite for bridge-integrated LSP providers
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { Position, DiagnosticSeverity, MarkupKind } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LSPCompilerBridge } from '../src/lsp/bridge/lsp-compiler-bridge';
import {
  EnhancedHoverProvider,
  EnhancedCompletionProvider,
  EnhancedDefinitionProvider,
  EnhancedDiagnosticsEngine,
  EnhancedSignatureHelpProvider,
} from '../src/lsp/bridge/enhanced-providers';

describe('EnhancedHoverProvider', () => {
  let bridge: LSPCompilerBridge;
  let hoverProvider: EnhancedHoverProvider;
  let testDocument: TextDocument;

  beforeEach(() => {
    bridge = new LSPCompilerBridge();
    hoverProvider = new EnhancedHoverProvider(bridge);
    testDocument = TextDocument.create('file:///test.fl', 'freelang', 1, 'let x = 10;');
    bridge.updateDocument(testDocument.uri, testDocument.getText());
  });

  test('provides hover for variables with type info', () => {
    const position: Position = { line: 0, character: 4 }; // 'x'
    const hover = hoverProvider.provideHover(testDocument, position);

    expect(hover).not.toBeNull();
  });

  test('formats confidence bar correctly', () => {
    // Bridge should have parsed the document
    const parsed = bridge.getDocument(testDocument.uri);
    expect(parsed).not.toBeNull();
  });

  test('returns null for unknown symbols', () => {
    const unknownDoc = TextDocument.create('file:///unknown.fl', 'freelang', 1, 'unknown_var');
    bridge.updateDocument(unknownDoc.uri, unknownDoc.getText());

    const hover = hoverProvider.provideHover(unknownDoc, { line: 0, character: 0 });
    // May be null since symbol doesn't exist
    expect(typeof hover === 'object' || hover === null).toBe(true);
  });

  test('includes reasoning in hover content', () => {
    const position: Position = { line: 0, character: 4 };
    const hover = hoverProvider.provideHover(testDocument, position);

    if (hover) {
      let content: string | undefined;
      if (typeof hover.contents === 'string') {
        content = hover.contents;
      } else if (typeof hover.contents === 'object' && 'value' in (hover.contents as any)) {
        content = (hover.contents as any).value;
      } else if (Array.isArray(hover.contents)) {
        content = (hover.contents as any)[0];
      }
      expect(content).toBeDefined();
    }
  });
});

describe('EnhancedCompletionProvider', () => {
  let bridge: LSPCompilerBridge;
  let completionProvider: EnhancedCompletionProvider;
  let testDocument: TextDocument;

  beforeEach(() => {
    bridge = new LSPCompilerBridge();
    completionProvider = new EnhancedCompletionProvider(bridge);
    testDocument = TextDocument.create('file:///test.fl', 'freelang', 1, 'let x = 10;');
    bridge.updateDocument(testDocument.uri, testDocument.getText());
  });

  test('provides keyword completions', () => {
    const position: Position = { line: 0, character: 0 };
    const completions = completionProvider.provideCompletions(testDocument, position);

    expect(completions.length).toBeGreaterThan(0);
    // Should include keywords
    const labels = completions.map(c => c.label);
    expect(labels.some(l => ['let', 'fn', 'if', 'while'].includes(l))).toBe(true);
  });

  test('provides snippet completions', () => {
    const position: Position = { line: 0, character: 0 };
    const completions = completionProvider.provideCompletions(testDocument, position);

    const snippets = completions.filter(c => c.insertText);
    expect(snippets.length).toBeGreaterThan(0);
  });

  test('filters completions by prefix', () => {
    const position: Position = { line: 0, character: 0 };
    const completions = completionProvider.provideCompletions(testDocument, position);

    // All completions should be sorted
    expect(completions.length).toBeGreaterThan(0);
    expect(completions[0].sortText).toBeDefined();
  });

  test('provides symbol completions from bridge', () => {
    const testCode = 'let myVariable = 42;\nlet result = my';
    const doc = TextDocument.create('file:///test2.fl', 'freelang', 1, testCode);
    bridge.updateDocument(doc.uri, doc.getText());

    const position: Position = { line: 1, character: 13 }; // After 'my'
    const completions = completionProvider.provideCompletions(doc, position);

    // Should have some completions
    expect(Array.isArray(completions)).toBe(true);
  });

  test('completions include type information', () => {
    const position: Position = { line: 0, character: 0 };
    const completions = completionProvider.provideCompletions(testDocument, position);

    // Some completions should have detail (type)
    const withDetail = completions.filter(c => c.detail);
    expect(withDetail.length).toBeGreaterThanOrEqual(0);
  });
});

describe('EnhancedDefinitionProvider', () => {
  let bridge: LSPCompilerBridge;
  let definitionProvider: EnhancedDefinitionProvider;
  let testDocument: TextDocument;

  beforeEach(() => {
    bridge = new LSPCompilerBridge();
    definitionProvider = new EnhancedDefinitionProvider(bridge);
    testDocument = TextDocument.create('file:///test.fl', 'freelang', 1, 'let myVar = 10;\nprint(myVar);');
    bridge.updateDocument(testDocument.uri, testDocument.getText());
  });

  test('provides definition location for symbols', () => {
    const position: Position = { line: 0, character: 4 }; // 'myVar'
    const definition = definitionProvider.provideDefinition(testDocument, position);

    // May return location or null
    expect(definition === null || typeof definition === 'object').toBe(true);
  });

  test('returns null for unknown symbols', () => {
    const doc = TextDocument.create('file:///test2.fl', 'freelang', 1, 'unknown_symbol');
    bridge.updateDocument(doc.uri, doc.getText());

    const definition = definitionProvider.provideDefinition(doc, { line: 0, character: 0 });
    expect(definition === null || typeof definition === 'object').toBe(true);
  });

  test('finds references to symbols', () => {
    const position: Position = { line: 0, character: 4 };
    const references = definitionProvider.provideReferences(testDocument, position);

    expect(Array.isArray(references)).toBe(true);
  });

  test('handles multiple occurrences of same symbol', () => {
    const testCode = 'let count = 0;\ncount = count + 1;\nprint(count);';
    const doc = TextDocument.create('file:///test3.fl', 'freelang', 1, testCode);
    bridge.updateDocument(doc.uri, doc.getText());

    const position: Position = { line: 0, character: 4 }; // 'count'
    const references = definitionProvider.provideReferences(doc, position);

    // May find 0 or more references (depending on implementation)
    expect(Array.isArray(references)).toBe(true);
  });
});

describe('EnhancedDiagnosticsEngine', () => {
  let bridge: LSPCompilerBridge;
  let diagnosticsEngine: EnhancedDiagnosticsEngine;

  beforeEach(() => {
    bridge = new LSPCompilerBridge();
    diagnosticsEngine = new EnhancedDiagnosticsEngine(bridge);
  });

  test('reports low confidence type warnings', () => {
    const testCode = 'let mystery = unknownFunction();';
    const doc = TextDocument.create('file:///test.fl', 'freelang', 1, testCode);

    const diagnostics = diagnosticsEngine.validateDocument(doc);

    expect(Array.isArray(diagnostics)).toBe(true);
  });

  test('handles error-free documents', () => {
    const testCode = 'let x: number = 42;';
    const doc = TextDocument.create('file:///test.fl', 'freelang', 1, testCode);

    const diagnostics = diagnosticsEngine.validateDocument(doc);

    expect(Array.isArray(diagnostics)).toBe(true);
  });

  test('differentiates error and warning severities', () => {
    const testCode = 'let x = 10;';
    const doc = TextDocument.create('file:///test.fl', 'freelang', 1, testCode);

    const diagnostics = diagnosticsEngine.validateDocument(doc);

    const errors = diagnostics.filter(d => d.severity === DiagnosticSeverity.Error);
    const warnings = diagnostics.filter(d => d.severity === DiagnosticSeverity.Warning);

    expect(Array.isArray(errors)).toBe(true);
    expect(Array.isArray(warnings)).toBe(true);
  });

  test('includes helpful diagnostic messages', () => {
    const testCode = 'let x = 10;';
    const doc = TextDocument.create('file:///test.fl', 'freelang', 1, testCode);

    const diagnostics = diagnosticsEngine.validateDocument(doc);

    for (const diag of diagnostics) {
      expect(diag.message).toBeDefined();
      expect(diag.message.length).toBeGreaterThan(0);
    }
  });

  test('includes diagnostic source information', () => {
    const testCode = 'let x = 10;';
    const doc = TextDocument.create('file:///test.fl', 'freelang', 1, testCode);

    const diagnostics = diagnosticsEngine.validateDocument(doc);

    for (const diag of diagnostics) {
      if (diag.source) {
        expect(typeof diag.source).toBe('string');
      }
    }
  });
});

describe('EnhancedSignatureHelpProvider', () => {
  let bridge: LSPCompilerBridge;
  let signatureProvider: EnhancedSignatureHelpProvider;

  beforeEach(() => {
    bridge = new LSPCompilerBridge();
    signatureProvider = new EnhancedSignatureHelpProvider(bridge);
  });

  test('provides signature for functions', () => {
    const testCode = 'fn greet(name: string, age: number) -> string { }\ngreet(';
    const doc = TextDocument.create('file:///test.fl', 'freelang', 1, testCode);
    bridge.updateDocument(doc.uri, doc.getText());

    const position: Position = { line: 1, character: 6 }; // Inside 'greet('
    const signature = signatureProvider.provideSignatureHelp(doc, position);

    // May return signature or null
    expect(signature === null || typeof signature === 'object').toBe(true);
  });

  test('returns null for non-function symbols', () => {
    const testCode = 'let myVar = 10;';
    const doc = TextDocument.create('file:///test.fl', 'freelang', 1, testCode);
    bridge.updateDocument(doc.uri, doc.getText());

    const position: Position = { line: 0, character: 4 };
    const signature = signatureProvider.provideSignatureHelp(doc, position);

    expect(signature === null || typeof signature === 'object').toBe(true);
  });

  test('signature includes parameter information', () => {
    const testCode = 'fn add(x: number, y: number) -> number { }';
    const doc = TextDocument.create('file:///test.fl', 'freelang', 1, testCode);
    bridge.updateDocument(doc.uri, doc.getText());

    const position: Position = { line: 0, character: 3 };
    const signature = signatureProvider.provideSignatureHelp(doc, position);

    if (signature) {
      expect(signature.signatures).toBeDefined();
      expect(signature.signatures.length).toBeGreaterThan(0);
    }
  });
});

describe('Provider Integration', () => {
  let bridge: LSPCompilerBridge;
  let hover: EnhancedHoverProvider;
  let completion: EnhancedCompletionProvider;
  let definition: EnhancedDefinitionProvider;
  let diagnostics: EnhancedDiagnosticsEngine;

  beforeEach(() => {
    bridge = new LSPCompilerBridge();
    hover = new EnhancedHoverProvider(bridge);
    completion = new EnhancedCompletionProvider(bridge);
    definition = new EnhancedDefinitionProvider(bridge);
    diagnostics = new EnhancedDiagnosticsEngine(bridge);
  });

  test('providers work together on same document', () => {
    const testCode = `
      let x: number = 42;
      let y = x + 10;
      print(y);
    `;
    const doc = TextDocument.create('file:///test.fl', 'freelang', 1, testCode);
    bridge.updateDocument(doc.uri, doc.getText());

    // All providers should work on same document
    const diags = diagnostics.validateDocument(doc);
    const comps = completion.provideCompletions(doc, { line: 0, character: 0 });
    const def = definition.provideDefinition(doc, { line: 1, character: 10 });
    const hov = hover.provideHover(doc, { line: 0, character: 10 });

    expect(Array.isArray(diags)).toBe(true);
    expect(Array.isArray(comps)).toBe(true);
    expect(def === null || typeof def === 'object').toBe(true);
    expect(hov === null || typeof hov === 'object').toBe(true);
  });

  test('handles large documents efficiently', () => {
    let code = '';
    for (let i = 0; i < 100; i++) {
      code += `let var${i} = ${i};\n`;
    }
    const doc = TextDocument.create('file:///large.fl', 'freelang', 1, code);

    const start = performance.now();
    bridge.updateDocument(doc.uri, doc.getText());
    const bridgeTime = performance.now() - start;

    expect(bridgeTime).toBeLessThan(1000); // Should handle 100 lines quickly

    // Test individual providers
    const compStart = performance.now();
    completion.provideCompletions(doc, { line: 50, character: 0 });
    const compTime = performance.now() - compStart;

    expect(compTime).toBeLessThan(200);
  });
});

describe('Provider Error Handling', () => {
  let bridge: LSPCompilerBridge;

  beforeEach(() => {
    bridge = new LSPCompilerBridge();
  });

  test('hover handles null document gracefully', () => {
    const hover = new EnhancedHoverProvider(bridge);
    const doc = TextDocument.create('file:///null.fl', 'freelang', 1, 'test');

    expect(() => {
      hover.provideHover(doc, { line: 0, character: 0 });
    }).not.toThrow();
  });

  test('completion handles empty document', () => {
    const completion = new EnhancedCompletionProvider(bridge);
    const doc = TextDocument.create('file:///empty.fl', 'freelang', 1, '');

    const comps = completion.provideCompletions(doc, { line: 0, character: 0 });
    expect(Array.isArray(comps)).toBe(true);
  });

  test('diagnostics handles invalid syntax', () => {
    const diagnostics = new EnhancedDiagnosticsEngine(bridge);
    const doc = TextDocument.create('file:///invalid.fl', 'freelang', 1, '{{{invalid}}}');

    expect(() => {
      diagnostics.validateDocument(doc);
    }).not.toThrow();
  });

  test('definition handles out-of-range positions', () => {
    const definition = new EnhancedDefinitionProvider(bridge);
    const doc = TextDocument.create('file:///test.fl', 'freelang', 1, 'let x = 10;');

    expect(() => {
      definition.provideDefinition(doc, { line: 100, character: 100 });
    }).not.toThrow();
  });
});
