# 📚 FreeLang v2 API Reference

## Overview

Complete API documentation for FreeLang v2 compiler and runtime.

**Version**: v2.2.0
**Status**: Production Ready (99.89% test coverage)

---

## 📖 Sections

### 1. Core Language API
- [Lexer](./lexer.md) - Tokenization and zero-copy processing
- [Parser](./parser.md) - AST generation with one-pass optimization
- [Type System](./type-system.md) - Type checking, inference, and validation
- [Semantic Analyzer](./semantic-analyzer.md) - Scope tracking and context analysis

### 2. Compiler Pipeline
- [Compiler](./compiler.md) - Main compilation entry point
- [Code Generator](./code-generator.md) - IR and bytecode generation
- [Optimizer](./optimizer.md) - Performance optimization passes

### 3. Runtime API
- [Virtual Machine](./vm.md) - Bytecode execution engine
- [Memory Management](./memory.md) - Allocation and GC
- [Module System](./modules.md) - Import/export and module loading

### 4. Standard Library (stdlib)
- [Collections](./stdlib/collections.md) - Array, Map, Set, etc.
- [File I/O](./stdlib/file-io.md) - File operations
- [HTTP Client](./stdlib/http.md) - Network requests
- [Async/Await](./stdlib/async.md) - Concurrency primitives
- [Math Functions](./stdlib/math.md) - Mathematical operations

### 5. IDE & Developer Tools
- [LSP Protocol](./lsp.md) - Language Server Protocol implementation
- [Debug Protocol](./debug.md) - Debugging interface
- [Profiler API](./profiler.md) - Performance profiling

---

## 🚀 Quick Links

- [Getting Started Guide](../guides/getting-started.md)
- [API Examples](../examples/)
- [Troubleshooting FAQ](../faq/troubleshooting.md)
- [Contributing Guide](../../.github/CONTRIBUTING.md)

---

## 📊 API Statistics

```
Total Public APIs:  150+
Core Functions:     109
stdlib Functions:   60+
Classes:            25+
Interfaces:         30+
```

---

## 🔗 Related Documentation

- [Architecture Overview](../ARCHITECTURE.md)
- [Compiler Pipeline Design](../COMPILER-PIPELINE.md)
- [Type System Specification](../IR-SPECIFICATION.md)

---

**Last Updated**: 2026-02-18
**Maintainer**: FreeLang Core Team
