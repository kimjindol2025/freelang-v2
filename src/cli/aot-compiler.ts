/**
 * FreeLang v2 AOT Compiler - Phase 5
 * FreeLang 소스 → IR → C 코드 → 바이너리
 */

import { readFileSync } from 'fs';
import { basename } from 'path';
import { Lexer, TokenBuffer } from '../lexer/lexer';
import { Parser } from '../parser/parser';
import { IRGenerator } from '../codegen/ir-generator';
import { IRToCGenerator } from '../codegen/ir-to-c';
import { Compiler } from '../compiler';

export interface AOTCompileResult {
  success: boolean;
  binaryPath?: string;
  error?: string;
  duration: number;
}

export class AOTCompiler {
  private gcc: Compiler;

  constructor(outDir?: string) {
    this.gcc = new Compiler(outDir);
  }

  compile(inputPath: string, outputPath: string): AOTCompileResult {
    const startTime = Date.now();

    try {
      const source = readFileSync(inputPath, 'utf-8');

      const lexer = new Lexer(source);
      const tokenBuffer = new TokenBuffer(lexer);

      const parser = new Parser(tokenBuffer);
      const ast = parser.parseModule() as any;  // Parse full module, not just function

      const irGen = new IRGenerator();
      const ir = irGen.generateModuleIR(ast);  // Use generateModuleIR for module-level IR

      const cCode = IRToCGenerator.generate(ir);

      const binName = basename(outputPath).replace(/[^a-z0-9_-]/gi, '_');
      const compileResult = this.gcc.compile(cCode, binName);

      if (!compileResult.ok || !compileResult.binary_path) {
        return {
          success: false,
          error: compileResult.error || 'GCC compilation failed',
          duration: Date.now() - startTime
        };
      }

      return {
        success: true,
        binaryPath: compileResult.binary_path,
        duration: Date.now() - startTime
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: msg,
        duration: Date.now() - startTime
      };
    }
  }
}

export function compileAOT(input: string, output: string): AOTCompileResult {
  const compiler = new AOTCompiler();
  return compiler.compile(input, output);
}
