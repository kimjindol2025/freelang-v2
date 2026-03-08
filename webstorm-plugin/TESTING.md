# FreeLang Plugin - Testing Guide

Comprehensive testing strategy for FreeLang WebStorm plugin covering unit tests, integration tests, and manual QA.

## Test Categories

### 1. Unit Tests

Run Kotlin unit tests:

```bash
./gradlew test
```

#### Test Classes

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `FreeLangLexerTest.kt` | 10 | Tokenization logic |
| `FreeLangFileTypeTest.kt` | 5 | File type registration |
| `FreeLangTokenTypesTest.kt` | 6 | Token type definitions |

#### Test Cases

**FreeLangLexerTest**:
- ✅ Keywords recognition (fn, let, trait, impl, etc.)
- ✅ Identifier tokenization
- ✅ Type name detection (uppercase first letter)
- ✅ Number literal parsing (integers and floats)
- ✅ String literal handling (double and single quotes)
- ✅ Line comment tokenization (//)
- ✅ Block comment tokenization (/* */)
- ✅ Operator tokenization (+, -, *, /, ==, etc.)
- ✅ Arrow operators (-> and =>)
- ✅ Parentheses/braces/brackets tokenization
- ✅ Complex expression parsing

**FreeLangFileTypeTest**:
- ✅ File type instance exists
- ✅ File type name is "FreeLang"
- ✅ File type description is correct
- ✅ File type language is FreeLang
- ✅ Default extension is "fl"

**FreeLangTokenTypesTest**:
- ✅ All 14 keywords exist
- ✅ All 15 operators exist
- ✅ All 12 punctuation marks exist
- ✅ Keyword set is complete and accurate
- ✅ Literals (string, number) exist
- ✅ Comments (line, block) exist
- ✅ Identifiers and type names exist

### 2. Integration Tests

#### Pre-requisites

```bash
# Build the plugin
./gradlew build

# Copy LSP server
npm run build  # (in parent directory)
```

#### Run Integration Test Script

```bash
./test-lsp-integration.sh
```

**Verification Points**:
- ✅ Node.js 18+ is available
- ✅ LSP server file exists
- ✅ Plugin resources are organized correctly
- ✅ All required Kotlin source files present
- ✅ All dependencies resolved

### 3. Manual Testing

#### Setup

1. **Build plugin**:
   ```bash
   ./gradlew build
   ```
   Output: `build/distributions/freelang-0.1.0.zip`

2. **Install in WebStorm**:
   - Open WebStorm
   - Settings → Plugins → ⚙️ → "Install Plugin from Disk"
   - Select `build/distributions/freelang-0.1.0.zip`
   - Restart WebStorm

3. **Create test file**:
   ```bash
   # Create example.fl in any WebStorm project
   cat > example.fl << 'EOF'
   // FreeLang test file
   fn main() {
       let x: Int = 42
       let msg: String = "Hello, FreeLang!"
       println(msg)
   }

   trait Animal {
       fn speak() -> String
   }

   impl Animal for Dog {
       fn speak() -> String {
           "Woof!"
       }
   }
   EOF
   ```

#### Test Checklist

##### 3.1 File Type Recognition

- [ ] Open `example.fl` in WebStorm
- [ ] Verify file icon shows FreeLang icon (not generic text)
- [ ] Verify tab shows "FreeLang" language indicator
- [ ] Create new file with `.fl` extension - should auto-detect as FreeLang

##### 3.2 Syntax Highlighting

Verify colors for each token type:

- [ ] **Keywords** (blue): `fn`, `let`, `trait`, `impl`, `if`, `else`, `while`, `for`, `return`, `type`, `break`, `continue`, `where`, `extends`
- [ ] **Type Names** (class color): `Int`, `String`, `Animal`, `Dog`, `Bool`
- [ ] **Strings** (orange): `"Hello, FreeLang!"`, `"Woof!"`
- [ ] **Numbers** (green): `42`
- [ ] **Identifiers** (normal): `x`, `msg`, `main`, `println`, `speak`
- [ ] **Operators** (red/operation color): `=`, `->`, `:`
- [ ] **Punctuation** (operation color): `()`, `{}`, `[]`, `,`
- [ ] **Comments** (gray): `// FreeLang test file`

##### 3.3 Lexer Accuracy

Create additional test patterns:

```freelang
// Test negative numbers
let neg: Int = -42

// Test float numbers
let pi: Float = 3.14

// Test escaped strings
let escaped: String = "Hello \"World\""

// Test multi-word identifiers
let my_variable: String = "test"

// Test block comments with special chars
/* This is a comment with @#$% special chars */

// Test operators
if x == 42 && y != 0 || z > 10 {
    x = x + 1
}
```

Verify all are tokenized correctly (check with keyboard shortcut: View → Developer → Lexer):
- [ ] Numbers (negative and decimal)
- [ ] Escaped string characters
- [ ] Underscored identifiers
- [ ] Special characters in comments
- [ ] Chained operators (&&, ||, ==, !=)

##### 3.4 LSP Features

**Prerequisite**: Verify LSP server starts:
- Check: Help → Show Log in Explorer
- Look for: `FreeLang Language Server started`
- No errors about Node.js or missing server

**4.4.1 Hover Information**:
- [ ] Hover over `x` - should show type `Int`
- [ ] Hover over `msg` - should show type `String`
- [ ] Hover over `main` - should show function signature
- [ ] Hover over `speak` - should show trait method

**4.4.2 Go to Definition**:
- [ ] Ctrl+click on `Animal` - should navigate to trait definition
- [ ] Ctrl+click on `Dog` - should navigate to impl block
- [ ] Ctrl+click on `main` - should highlight/navigate to main function

**4.4.3 Code Completion**:
- [ ] Type `pr` → should suggest `println`
- [ ] Type `fn` → should auto-complete to `fn`
- [ ] After `.` in object → should show available methods
- [ ] After `:` in type annotation → should show type suggestions

**4.4.4 Diagnostics**:
Create intentional errors:

```freelang
// Undefined variable error
fn test() {
    println(undefined_var)  // ← should show red squiggle
}

// Type mismatch error
fn typed_test() {
    let x: Int = "not a number"  // ← should show error
}

// Missing semicolon/syntax error
fn syntax_error() {
    let x: Int = 42
    let y: String = "oops"
}
```

- [ ] Undefined variables show red wavy underline
- [ ] Type mismatches highlighted in red
- [ ] Hover on error shows error message
- [ ] Error list shows all issues

##### 3.5 Settings Configuration

- [ ] Settings → Languages → FreeLang exists
- [ ] Can enter custom Node.js path
- [ ] Can toggle "Enable Diagnostics"
- [ ] Can toggle "Completion on dot"
- [ ] Settings persist after restart

##### 3.6 Multi-file Project

Create a project with multiple FreeLang files:

```
FreeLangProject/
├── main.fl
├── utils.fl
└── models.fl
```

- [ ] All files recognized as FreeLang
- [ ] Syntax highlighting works in all files
- [ ] Cross-file go-to-definition works
- [ ] Project-level diagnostics show all issues

##### 3.7 Edge Cases

Test boundary conditions:

```freelang
// Empty file
// (should not crash)

// Very long line (>500 chars)
let very_long_string: String = "Lorem ipsum dolor sit amet..."

// Nested structures
fn outer() {
    fn inner() {
        fn innermost() {
            42
        }
    }
}

// Unicode in comments
// 你好 FreeLang 🚀

// No newline at EOF
fn final() { "done" }
```

- [ ] Empty file doesn't crash IDE
- [ ] Long lines handled correctly
- [ ] Deep nesting doesn't cause issues
- [ ] Unicode comments work
- [ ] Missing EOF newline handled

### 4. Performance Tests

#### Lexing Performance

```freeing
// Test with large file (>10,000 lines)
// Should complete in <500ms
```

Measure with:
- File → Properties → check "Last modified" time
- Edit file → observe response time
- Should be instant (no lag)

#### IDE Responsiveness

- [ ] Typing should feel responsive (no lag)
- [ ] Completion popup appears within 200ms
- [ ] Hover info appears within 300ms
- [ ] No noticeable IDE freezes

### 5. Compatibility Testing

#### IDE Versions

Test on multiple IDE versions:
- [ ] WebStorm 2023.1 (minimum)
- [ ] WebStorm 2023.3
- [ ] WebStorm 2024.1 (if available)
- [ ] IntelliJ IDEA 2023.1+ (should work)

#### Operating Systems

- [ ] macOS (Intel & Apple Silicon)
- [ ] Linux (Ubuntu, Fedora)
- [ ] Windows (10, 11)

#### Node.js Versions

- [ ] Node.js 18 (minimum)
- [ ] Node.js 20
- [ ] Node.js 21

### 6. Build & Distribution

#### Plugin Build

```bash
./gradlew buildPlugin
```

- [ ] Build completes without errors
- [ ] Output: `build/distributions/freelang-0.1.0.zip`
- [ ] ZIP file is valid and extractable
- [ ] Contains all required files:
  - [ ] plugin.xml
  - [ ] Kotlin classes (compiled)
  - [ ] Resources (icons, LSP server)

#### Installation Methods

- [ ] Install from disk (.zip) works
- [ ] Manual install in WebStorm works
- [ ] Restart triggers proper plugin initialization
- [ ] Uninstall removes all plugin files cleanly

---

## Test Results Template

```
=== FreeLang Plugin Test Report ===
Date: YYYY-MM-DD
IDE: WebStorm XXX
OS: [macOS/Linux/Windows]
Node.js: vXX.XX.X

Unit Tests:     ✅ XX/XX passed
Integration:    ✅ All checks passed
Manual Tests:   ✅ XX/XX passed
Performance:    ✅ All <500ms
Compatibility:  ✅ Verified

Issues Found:
- (none or list issues)

Verdict: ✅ READY FOR RELEASE
```

---

## Debugging

### Enable Verbose Logging

Add to IDE settings (`idea.properties`):
```
idea.log.debug=com.freelang
idea.log.debug=com.redhat.devtools.lsp4ij
```

### Common Issues

**Problem**: "LSP server not found in plugin resources"
**Solution**:
1. Rebuild plugin: `./gradlew build`
2. Ensure LSP server exists: `ls ../dist/lsp/server.js`
3. Delete plugin and reinstall

**Problem**: "Node.js not found"
**Solution**:
1. Verify Node.js: `node --version`
2. Check PATH: `echo $PATH`
3. Configure custom path in FreeLang settings

**Problem**: "No syntax highlighting"
**Solution**:
1. Verify plugin installed: Help → About → Plugins
2. Check settings: Settings → Languages → FreeLang
3. Restart IDE completely

**Problem**: LSP features (hover, completion) not working
**Solution**:
1. Check IDE logs: Help → Show Log in Explorer
2. Look for errors mentioning "FreeLang"
3. Verify LSP server started: should see `"FreeLang Language Server started"`
4. Check firewall/security settings

---

## Continuous Integration

GitHub Actions (when repo public):

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
        with:
          java-version: '17'
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Build LSP
        run: npm run build
      - name: Run unit tests
        run: cd webstorm-plugin && ./gradlew test
      - name: Run integration tests
        run: cd webstorm-plugin && ./test-lsp-integration.sh
      - name: Build plugin
        run: cd webstorm-plugin && ./gradlew build
```

---

## Sign-off

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Manual testing checklist complete
- [ ] No critical issues found
- [ ] Performance acceptable
- [ ] Cross-platform compatibility verified
- [ ] Plugin ready for release

**Tester**: ________________________
**Date**: ________________________
**Version**: 0.1.0
