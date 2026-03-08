#!/usr/bin/env node

/**
 * FreeLang Command Line Executable
 * Entry point for CLI invocation
 */

import { main } from '../src/cli/cli';

// Get command line arguments (skip node and script path)
const args = process.argv.slice(2);

// Run CLI
main(args);
