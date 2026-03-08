# FreeLang WebStorm Plugin

Professional IDE support for FreeLang programming language in WebStorm and all JetBrains IDEs.

## Features

✅ **Syntax Highlighting** - Color-coded FreeLang syntax
✅ **Code Completion** - Intelligent code suggestions
✅ **Hover Information** - Type information on hover
✅ **Go to Definition** - Navigate to symbol definitions
✅ **Real-time Diagnostics** - Inline error detection

## Architecture

### Components

1. **LSP Server** (`src/lsp/server.ts`)
   - Node.js-based Language Server Protocol implementation
   - Provides language features via stdio transport
   - Features: hover, completion, definition, diagnostics

2. **WebStorm Plugin** (Kotlin)
   - FreeLang language registration
   - File type association (.fl)
   - Lexer & syntax highlighting
   - LSP4IJ integration for server communication
   - Project settings configuration

### Build Process

```
FreeLang v2.2.0 (TypeScript + Kotlin)
├── src/lsp/server.ts → npm build → dist/lsp/server.js
└── webstorm-plugin/
    ├── src/main/kotlin/ (Kotlin sources)
    └── build.gradle.kts → gradlew build → freelang-2.2.0.zip
```

## Installation & Testing

### Prerequisites

- Node.js 18+
- WebStorm 2023.1+ (or IntelliJ IDEA 2023.1+)
- Gradle 7.4+
- Java 17+

### Step 1: Build LSP Server

```bash
cd /home/kimjin/Desktop/kim/v2-freelang-ai
npm install
npm run build
# Output: dist/lsp/server.js
```

### Step 2: Build WebStorm Plugin

```bash
cd webstorm-plugin

# Download gradle wrapper (if not present)
gradle wrapper

# Build plugin
./gradlew build

# Output: build/distributions/freelang-2.2.0.zip
```

### Step 3: Install Plugin in WebStorm

1. Open WebStorm
2. Settings → Plugins → ⚙️ → "Install Plugin from Disk"
3. Select `build/distributions/freelang-2.2.0.zip`
4. Restart WebStorm

### Step 4: Test the Plugin

Create a test file `example.fl`:

```freelang
fn main() {
    let x: Int = 42
    let msg: String = "Hello, FreeLang!"
    println(msg)
}
```

Verify:
- ✅ Syntax highlighting (keywords in blue, strings in orange)
- ✅ Hover over `main` shows function signature
- ✅ Type of `x` displays as `Int`
- ✅ Completion shows `println` suggestion
- ✅ Errors appear as you type

## Configuration

Settings → Languages → FreeLang:
- **Node.js Path** - Auto-detect or specify manually
- **Enable Diagnostics** - Real-time error checking
- **Completion on dot** - Show completion after `.` character

## Files Overview

### Kotlin Source Files

| File | Purpose | Lines |
|------|---------|-------|
| `FreeLangLanguage.kt` | Language definition | 10 |
| `FreeLangFileType.kt` | .fl file association | 40 |
| `FreeLangLexer.kt` | Tokenizer | 265 |
| `FreeLangTokenTypes.kt` | Token definitions | 82 |
| `FreeLangSyntaxHighlighter.kt` | Color mapping | 128 |
| `FreeLangParserDefinition.kt` | PSI definition | 56 |
| `FreeLangLSPServerFactory.kt` | LSP server launcher | 72 |
| `FreeLangProjectService.kt` | Settings storage | 30 |
| `FreeLangSettingsConfigurable.kt` | Settings UI | 68 |

**Total**: 751 LOC (Kotlin)

### Build Files

| File | Purpose |
|------|---------|
| `build.gradle.kts` | Gradle build configuration |
| `gradle.properties` | Gradle settings |
| `settings.gradle.kts` | Project settings |
| `plugin.xml` | Plugin descriptor |

## Development Workflow

### Making Changes

1. **Kotlin Sources** → modify `.kt` files
2. **Plugin Descriptor** → modify `plugin.xml`
3. **Build** → `./gradlew build`
4. **Test** → Install and restart WebStorm

### Running Tests

```bash
# Run integration tests
./test-lsp-integration.sh

# Run unit tests (when added)
./gradlew test
```

## Troubleshooting

### "Node.js not found" Error
- **Fix**: Install Node.js 18+ from https://nodejs.org
- Verify: `node --version`

### "LSP server not found in plugin resources" Error
- **Fix**: Rebuild plugin with LSP bundled
- Run: `npm run build` in parent directory
- Then: `./gradlew build` in plugin directory

### Plugin doesn't recognize .fl files
- **Fix**: Restart WebStorm completely
- Check: Settings → File Types → FreeLang

### Completion/Hover not working
- **Check**: Enable Diagnostics in FreeLang settings
- **Verify**: LSP server starts without errors
- **Log**: Check IDE logs (Help → Show Log in Explorer)

## Distribution

### Release Package

```bash
./gradlew buildPlugin
# Output: build/distributions/freelang-2.2.0.zip
```

### JetBrains Marketplace

1. Create account: https://plugins.jetbrains.com
2. Upload: `freelang-2.2.0.zip`
3. Wait for approval (~1-2 days)

### Private Installation

Users can install manually:
1. Download `.zip`
2. Settings → Plugins → ⚙️ → "Install Plugin from Disk"

## Architecture Diagram

```
┌─────────────────────────────────────────┐
│         WebStorm/IntelliJ IDE           │
├─────────────────────────────────────────┤
│      FreeLang Plugin (Kotlin)           │
│  ┌──────────────────────────────────┐  │
│  │  FreeLangLSPServerFactory        │  │
│  │  - Finds Node.js executable      │  │
│  │  - Starts LSP server process     │  │
│  │  - Manages stdio connection      │  │
│  └────────────┬─────────────────────┘  │
│  ┌────────────▼─────────────────────┐  │
│  │  LSP4IJ (Language Server Client) │  │
│  │  - Sends requests (hover, etc)   │  │
│  │  - Receives responses            │  │
│  └────────────┬─────────────────────┘  │
│  ┌────────────▼─────────────────────┐  │
│  │  FreeLangLexer                   │  │
│  │  - Tokenizes .fl files           │  │
│  │  - Maps to FreeLangTokenTypes    │  │
│  └────────────┬─────────────────────┘  │
│  ┌────────────▼─────────────────────┐  │
│  │  FreeLangSyntaxHighlighter       │  │
│  │  - Maps tokens to IDE colors     │  │
│  │  - Applies text attributes       │  │
│  └──────────────────────────────────┘  │
├─────────────────────────────────────────┤
│              stdio/pipe                 │
├─────────────────────────────────────────┤
│   FreeLang LSP Server (Node.js)        │
│  ┌──────────────────────────────────┐  │
│  │  HoverProvider                   │  │
│  │  CompletionProvider              │  │
│  │  DefinitionProvider              │  │
│  │  DiagnosticsEngine               │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Phase Timeline

| Phase | Name | Status | LOC |
|-------|------|--------|-----|
| 1-2 | LSP Server Protocol | ✅ Complete | 260 |
| 3 | Plugin Skeleton | ✅ Complete | 230 |
| 4 | Syntax Highlighting | ✅ Complete | 360 |
| 5-6 | LSP Client Integration | ✅ Complete | 230 |
| 7 | Testing | ⏳ Next | - |
| 8 | Package & Publish | 📅 Planned | - |

## Support

For issues, questions, or contributions:
- GitHub: https://github.com/freelang/freelang
- Email: team@freelang.dev
- Documentation: https://freelang.dev/docs

---

**Version**: 2.2.0
**License**: MIT
**Author**: FreeLang Contributors
