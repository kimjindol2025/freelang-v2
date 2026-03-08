# Phase 5 Examples - FreeLang Package Manager

This directory contains example projects demonstrating the FreeLang v2 Package Manager system.

## Projects

### 1. my-app (Main Application)

A sample FreeLang application that uses multiple packages.

**Features:**
- Uses packages: `math-lib`, `utils`, `string-helpers`
- Demonstrates package imports
- Shows local module imports
- Contains example functions using package functionality

**Files:**
- `freelang.json` - Project manifest with dependencies
- `src/main.fl` - Main entry point with examples
- `src/helpers.fl` - Local helper module

**Dependencies:**
- math-lib@1.0.0
- utils@2.0.0
- string-helpers@1.0.0

### 2. math-lib (Math Package)

A library providing basic mathematical operations.

**Exported Functions:**
- `add(a, b)` - Addition
- `subtract(a, b)` - Subtraction
- `multiply(a, b)` - Multiplication
- `divide(a, b)` - Division (with zero-check)
- `power(base, exp)` - Exponentiation
- `abs(n)` - Absolute value
- `max(a, b)` - Maximum value
- `min(a, b)` - Minimum value

**Version:** 1.0.0

### 3. utils (Utility Package)

A library of common array and collection operations.

**Exported Functions:**
- `map(array, fn)` - Apply function to each element
- `filter(array, predicate)` - Filter elements by condition
- `reduce(array, fn, initial)` - Reduce to single value
- `reverse(array)` - Reverse array order
- `flatten(array)` - Flatten nested arrays
- `unique(array)` - Get unique elements
- `includes(array, value)` - Check if includes value
- `indexOf(array, value)` - Find index of value
- `join(array, separator)` - Join with separator

**Version:** 2.0.0

### 4. string-helpers (String Package)

A library for string manipulation and formatting.

**Exported Functions:**
- `toUpperCase(str)` - Convert to uppercase
- `toLowerCase(str)` - Convert to lowercase
- `trim(str)` - Remove whitespace
- `startsWith(str, prefix)` - Check prefix
- `endsWith(str, suffix)` - Check suffix
- `contains(str, substring)` - Check contains
- `replace(str, find, replace)` - Replace first occurrence
- `replaceAll(str, find, replace)` - Replace all occurrences
- `split(str, separator)` - Split into parts
- `join(parts, separator)` - Join parts
- `repeat(str, count)` - Repeat string
- `reverse(str)` - Reverse string
- `capitalize(str)` - Capitalize first letter
- `camelCase(str)` - Convert to camelCase
- `snakeCase(str)` - Convert to snake_case
- `format(template, values)` - Format template string

**Version:** 1.0.0

## Usage

### Setting up the Project

```bash
# 1. Navigate to my-app
cd my-app

# 2. Install dependencies
freelang install

# This should install:
# - ../math-lib
# - ../utils
# - ../string-helpers
```

### Running the Application

```bash
# Compile and run
freelang run src/main.fl

# Or just the main function
freelang run src/main.fl --function main
```

### Using Individual Packages

Each package can be used independently:

```bash
# Use math-lib
import { add, multiply } from "math-lib"

# Use utils
import { map, filter, reduce } from "utils"

# Use string-helpers
import { capitalize, format } from "string-helpers"
```

## Project Structure

```
phase-5/
├── my-app/
│   ├── freelang.json
│   └── src/
│       ├── main.fl
│       └── helpers.fl
│
├── math-lib/
│   ├── freelang.json
│   └── src/
│       └── index.fl
│
├── utils/
│   ├── freelang.json
│   └── src/
│       └── index.fl
│
└── string-helpers/
    ├── freelang.json
    └── src/
        └── index.fl
```

## Package Dependencies

```
my-app
├── math-lib (1.0.0)
├── utils (2.0.0)
└── string-helpers (1.0.0)
```

## Version Information

- **my-app:** 1.0.0
- **math-lib:** 1.0.0
- **utils:** 2.0.0
- **string-helpers:** 1.0.0

## CLI Commands

### Initialize a new project

```bash
freelang init my-project
```

### Install packages

```bash
# Install specific package
freelang install ../math-lib

# Install all dependencies from freelang.json
freelang install
```

### List installed packages

```bash
freelang list
```

### Search packages

```bash
freelang search math
```

### Remove packages

```bash
freelang uninstall math-lib
```

### Get help

```bash
freelang help
```

## Testing

To test the package manager with these examples:

```bash
# Run the integration tests
npm test -- phase-5-integration

# This will:
# 1. Initialize projects
# 2. Install packages
# 3. Verify imports work
# 4. Test all package operations
```

## Further Reading

- See `PHASE-5-COMPLETE.md` for the complete Package Manager documentation
- Check individual package `freelang.json` files for metadata
- Review source files for API details

## Notes

- All packages are independent and can be reused
- Packages follow semantic versioning
- Local files can be imported alongside packages
- The package manager handles dependency resolution automatically
