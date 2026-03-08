# FreeLang Plugin - JetBrains Marketplace Publishing Guide

Complete guide for publishing FreeLang WebStorm plugin to JetBrains Marketplace.

## Pre-Publication Checklist

- [ ] Version bumped: `2.2.0` in `build.gradle.kts` and `plugin.xml`
- [ ] All tests pass: `./gradlew test`
- [ ] Plugin builds successfully: `./gradlew build`
- [ ] Integration tests pass: `./test-lsp-integration.sh`
- [ ] README.md complete and accurate
- [ ] TESTING.md complete and comprehensive
- [ ] CHANGELOG.md created
- [ ] Plugin icon added (if custom)
- [ ] No hardcoded paths or debug code
- [ ] Compatible with IntelliJ Platform 2023.1+

## Step 1: Prepare Plugin Distribution

### 1.1 Build the Plugin

```bash
cd /home/kimjin/Desktop/kim/v2-freelang-ai/webstorm-plugin

# Clean previous build
./gradlew clean

# Build plugin distribution
./gradlew buildPlugin
```

**Output**: `build/distributions/freelang-2.2.0.zip`

### 1.2 Verify Distribution

```bash
# Check archive contents
unzip -l build/distributions/freelang-2.2.0.zip | head -20

# Verify plugin JAR exists
unzip -l build/distributions/freelang-2.2.0.zip | grep -E "\.jar$"

# Verify size is reasonable (<50MB)
ls -lh build/distributions/freelang-2.2.0.zip
```

Expected structure:
```
freelang-2.2.0.zip
├── freelang/
│   ├── lib/
│   │   ├── freelang-2.2.0.jar  (main plugin)
│   │   ├── lsp4ij-*.jar        (dependency)
│   │   └── ...
│   ├── META-INF/
│   │   └── plugin.xml
│   └── resources/
│       └── lsp/
│           ├── server.js       (LSP server)
│           └── other-*.js      (LSP providers)
```

### 1.3 Test Installation Before Publishing

```bash
# 1. Backup current plugin (if any)
# 2. In WebStorm: Settings → Plugins → ⚙️ → Install Plugin from Disk
# 3. Select: build/distributions/freelang-2.2.0.zip
# 4. Restart WebStorm
# 5. Verify: All features work (see TESTING.md)
# 6. Uninstall if not satisfied
```

## Step 2: Create Marketplace Account

### 2.1 Register

1. Visit: https://plugins.jetbrains.com
2. Click "Sign in" (top right)
3. Use existing JetBrains account or create new one
4. Accept terms & conditions

### 2.2 Complete Profile

Once logged in:
1. Click profile icon → "Manage vendors"
2. Create new vendor (organization name)
   - **Vendor Name**: "FreeLang Contributors"
   - **Display Name**: "FreeLang Contributors"
   - **Website**: https://github.com/freelang/freelang
   - **Email**: team@freelang.dev (or your email)
3. Accept marketplace agreement

## Step 3: Prepare Marketplace Listing

### 3.1 Plugin Information

Gather the following:

**Title**:
```
FreeLang - Language Support
```

**Short Description** (1 line):
```
Professional IDE support for FreeLang programming language with LSP integration
```

**Full Description**:
```
## Features

✨ **Syntax Highlighting** - Color-coded FreeLang code
🎯 **Code Completion** - Intelligent suggestions
ℹ️ **Type Information** - Hover for details
🔗 **Go to Definition** - Navigate symbols
🐛 **Diagnostics** - Real-time error checking

## Requirements

- Node.js 18+ (auto-detects from PATH)
- WebStorm 2023.1+ or IntelliJ IDEA 2023.1+
- Java 17+

## Quick Start

1. Install plugin from marketplace
2. Create `example.fl` file:
   ```freelang
   fn main() {
       let x: Int = 42
       println(x)
   }
   ```
3. Observe syntax highlighting and LSP features

## Documentation

- **Getting Started**: See [README.md](https://github.com/freelang/freelang/tree/main/webstorm-plugin#readme)
- **Testing**: See [TESTING.md](https://github.com/freelang/freelang/tree/main/webstorm-plugin/TESTING.md)
- **Architecture**: See [README.md Architecture](https://github.com/freelang/freelang/tree/main/webstorm-plugin#architecture-diagram)

## Feedback

Report issues or request features:
- GitHub: https://github.com/freelang/freelang/issues
- Email: team@freelang.dev

---

**Version**: 2.2.0
**Author**: FreeLang Contributors
**License**: MIT
```

**Change Notes** (for this release):
```
## 2.2.0 - Initial Release

### Features
- Language Server Protocol (LSP) integration
- Syntax highlighting for FreeLang code
- Code completion with suggestions
- Hover type information
- Go to definition navigation
- Real-time error diagnostics
- Project-level settings configuration
- Support for all JetBrains IDEs

### Compatibility
- Minimum: WebStorm 2023.1 (IntelliJ Platform 231)
- Requires: Node.js 18+, Java 17+

### Known Limitations
- Initial release - more features coming soon
- LSP server must be built from source
```

### 3.2 Select Categories

Choose up to 3:
1. **Languages** ← Required for FreeLang
2. **Code Editors**
3. **Integration** (optional)

### 3.3 Add Plugin Icon

Optional but recommended:

Create `icon.png`:
- Size: 40x40 pixels (minimum)
- Format: PNG with transparency
- Content: FreeLang logo

Place in: `/home/kimjin/Desktop/kim/v2-freelang-ai/webstorm-plugin/icon.png`

Include in plugin by updating `plugin.xml`:
```xml
<name>FreeLang</name>
<icon>/icon.png</icon>
```

## Step 4: Upload Plugin

### 4.1 On Marketplace Website

1. Login: https://plugins.jetbrains.com
2. Click "My Plugins" (top right)
3. Click "Upload Plugin" (green button)
4. Select: `build/distributions/freelang-2.2.0.zip`

### 4.2 Fill Plugin Details

Form fields to complete:

| Field | Value |
|-------|-------|
| Plugin Name | FreeLang |
| Plugin ID | freelang-intellij |
| Vendor | FreeLang Contributors |
| Plugin Type | IDE Plugin |
| Min IDE Version | 2023.1 |
| Max IDE Version | 2024.* |
| Category | Languages |

### 4.3 Fill Marketplace Info

| Field | Value |
|-------|-------|
| Title | FreeLang - Language Support |
| Description | (use full description from Step 3.1) |
| Change Notes | (use change notes from Step 3.1) |
| Vendor Website | https://github.com/freelang/freelang |
| Plugin Homepage | https://github.com/freelang/freelang |
| Documentation | https://github.com/freelang/freelang/tree/main/webstorm-plugin |
| Bug Tracker | https://github.com/freelang/freelang/issues |
| Source Code | https://github.com/freelang/freelang |

### 4.4 Select License

- License: MIT
- Accept legal agreement

### 4.5 Review and Submit

1. Review all information
2. Check "I agree to the..."
3. Click "Upload and Publish"

## Step 5: Wait for Approval

### 5.1 Review Process

- **Duration**: 1-3 business days
- **Check Status**: https://plugins.jetbrains.com/my → View Status
- **Communication**: Email notifications at each stage

### 5.2 Review Criteria

JetBrains checks:
- ✅ Plugin functionality
- ✅ No malware or security issues
- ✅ Proper LSP4IJ usage
- ✅ Documentation quality
- ✅ Error handling

### 5.3 If Rejected

If rejection occurs:
1. Read rejection reason email
2. Fix identified issues
3. Update version: `0.1.1`
4. Rebuild and re-upload

## Step 6: Post-Publication

### 6.1 Announce Release

```bash
# Update GitHub
git add webstorm-plugin/
git commit -m "Phase 8: WebStorm plugin v2.2.0 released

- Syntax highlighting
- LSP integration
- Code completion
- Hover information
- Diagnostics

Available on: https://plugins.jetbrains.com/plugin/..."

git tag v2.2.0
git push origin main --tags
```

### 6.2 Monitor Ratings and Feedback

- Check marketplace for user ratings
- Monitor GitHub issues for bug reports
- Respond to user feedback promptly

### 6.3 Plan Next Release

Upcoming features for 0.2.0:
- [ ] Refactoring support
- [ ] Quick fixes for common errors
- [ ] Code folding
- [ ] Breadcrumbs navigation
- [ ] Custom code formatter
- [ ] Debug configuration

## Troubleshooting

### Upload Fails with "Invalid Plugin"

**Causes**:
- plugin.xml malformed
- Missing LSP server jar
- Incompatible IntelliJ Platform version
- Kotlin version mismatch

**Fix**:
1. Verify plugin.xml: `xmllint build/distributions/freelang-2.2.0.zip`
2. Check IntelliJ version: `grep "2023.1" plugin.xml`
3. Rebuild: `./gradlew clean buildPlugin`

### "Requires newer IDE version"

**Fix**:
1. Update `intellij.version` in build.gradle.kts
2. Rebuild plugin
3. Re-upload

### Plugin appears as "Incompatible"

**Fix**:
1. Check IDE version compatibility
2. Verify Java 17 requirement
3. Test in actual IDE before publishing

## Version Management

### Current Version History

| Version | Date | Status |
|---------|------|--------|
| 2.2.0 | 2026-02-18 | 🎉 Released |
| 0.2.0 | TBD | 📅 Planned |
| 1.0.0 | TBD | 🎯 Long term |

### Versioning Strategy

- **0.1.x**: Initial features, bug fixes
- **0.2.x**: Advanced features
- **1.0.0**: Stable, feature-complete

### Update Procedure

For each release:
1. Update version in `build.gradle.kts`
2. Update version in `plugin.xml`
3. Add change notes to `CHANGELOG.md`
4. Build: `./gradlew buildPlugin`
5. Upload to marketplace
6. Tag release: `git tag v0.1.x`
7. Create GitHub release

## Legal

### License

FreeLang Plugin is licensed under the MIT License. See LICENSE file for details.

### Marketplace Terms

By publishing on JetBrains Marketplace:
- You agree to marketplace terms of service
- Plugin must not:
  - Contain malware or spyware
  - Violate intellectual property rights
  - Transmit data without disclosure
  - Implement payment schemes
  - Be abandoned (must support for 6 months)

## Marketing

### Channels to Announce

1. **GitHub Releases**: https://github.com/freelang/freelang/releases
2. **Social Media**: Twitter, Reddit (r/programming, r/freelang)
3. **Community Forums**: Language community boards
4. **Developer News**: Hacker News, Dev.to (if permitted)

### Messaging Example

```
🎉 Excited to announce: FreeLang WebStorm Plugin v2.2.0 is now available!

Professional IDE support for #FreeLang with:
✅ Syntax highlighting
✅ Code completion
✅ LSP integration
✅ Real-time diagnostics

Install: https://plugins.jetbrains.com/plugin/...
Docs: https://github.com/freelang/freelang

Special thanks to everyone who contributed!
#IDE #WebStorm #JetBrains #Programming
```

## Support

### User Support Channels

1. **GitHub Issues**: https://github.com/freelang/freelang/issues
2. **Marketplace Reviews**: https://plugins.jetbrains.com/plugin/...
3. **Email**: team@freelang.dev
4. **Discord** (if applicable): [invite link]

### Response SLA

- **Critical bugs**: 24 hours
- **Features**: 1 week
- **Support questions**: 48 hours

---

**Document Version**: 1.0
**Last Updated**: 2026-02-18
**Status**: Ready for publication
