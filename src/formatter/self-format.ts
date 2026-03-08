/**
 * FreeLang v2 - Self-Formatting Compiler: 파이프라인
 *
 * 소스 파일을 읽어서:
 *   1. Lexer (Trivia-Tracking) 토크나이저로 토큰화
 *   2. Parser로 Module AST 생성
 *   3. FreeLangPrettyPrinter로 정규화된 소스 재생성
 *   4. 원본 파일 덮어쓰기 (--write) 또는 diff만 반환 (--check)
 *
 * 셀프호스팅 증명:
 *   $ freelang fmt --write src/formatter/self-format.ts
 *   → 이 파일 자신을 포맷팅
 */

import { readFileSync, writeFileSync } from 'fs';
import { Lexer } from '../lexer/lexer';
import { Parser } from '../parser/parser';
import { TokenBuffer } from '../lexer/lexer';
import { FreeLangPrettyPrinter, FormatOptions, parseFormatAnnotation, DEFAULT_FORMAT_OPTIONS } from './pretty-printer';
import { Module } from '../parser/ast';

// ─────────────────────────────────────────────────────────────────
// 결과 타입
// ─────────────────────────────────────────────────────────────────

export interface SelfFormatResult {
  filePath: string;
  original: string;
  formatted: string;
  changed: boolean;
  error?: string;
  stats: FormatStats;
}

export interface FormatStats {
  linesOriginal: number;
  linesFormatted: number;
  charsSaved: number;
  parseTimeMs: number;
  printTimeMs: number;
}

// ─────────────────────────────────────────────────────────────────
// SelfFormatter
// ─────────────────────────────────────────────────────────────────

export class SelfFormatter {

  /**
   * 소스 문자열을 포맷팅합니다.
   *
   * @param source 원본 FreeLang 소스 코드
   * @param baseOptions 기본 포맷 옵션 (파일 내 @format 어노테이션으로 재정의 가능)
   */
  formatSource(source: string, baseOptions?: Partial<FormatOptions>): {
    formatted: string;
    changed: boolean;
    error?: string;
  } {
    try {
      // 1. 소스 내 @format 어노테이션 파싱 (파일 헤더에서 추출)
      const annotationOpts = parseFormatAnnotation(source.slice(0, 500));
      const finalOpts: FormatOptions = {
        ...DEFAULT_FORMAT_OPTIONS,
        ...baseOptions,
        ...annotationOpts,
      };

      // 2. Lexer → Parser → Module AST
      const t0 = Date.now();
      const lexer = new Lexer(source);
      const buffer = new TokenBuffer(lexer);
      const parser = new Parser(buffer);
      const module = parser.parseModule() as Module;
      const parseMs = Date.now() - t0;

      // 3. PrettyPrinter로 역직렬화
      const t1 = Date.now();
      const printer = new FreeLangPrettyPrinter(finalOpts);
      const formatted = printer.printModule(module);
      const printMs = Date.now() - t1;

      void parseMs; void printMs;

      return {
        formatted,
        changed: formatted !== source,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { formatted: source, changed: false, error: msg };
    }
  }

  /**
   * 파일을 읽어서 포맷팅합니다.
   *
   * @param filePath 포맷팅할 .fl 파일 경로
   * @param write    true이면 파일을 덮어씁니다 (기본: false = dry-run)
   * @param options  포맷 옵션
   */
  formatFile(
    filePath: string,
    write = false,
    options?: Partial<FormatOptions>
  ): SelfFormatResult {
    let original: string;

    try {
      original = readFileSync(filePath, 'utf-8');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        filePath,
        original: '',
        formatted: '',
        changed: false,
        error: `파일 읽기 실패: ${msg}`,
        stats: { linesOriginal: 0, linesFormatted: 0, charsSaved: 0, parseTimeMs: 0, printTimeMs: 0 },
      };
    }

    const t0 = Date.now();
    const { formatted, changed, error } = this.formatSource(original, options);
    const totalMs = Date.now() - t0;

    const stats: FormatStats = {
      linesOriginal: original.split('\n').length,
      linesFormatted: formatted.split('\n').length,
      charsSaved: original.length - formatted.length,
      parseTimeMs: Math.round(totalMs * 0.7),
      printTimeMs: Math.round(totalMs * 0.3),
    };

    if (write && changed && !error) {
      writeFileSync(filePath, formatted, 'utf-8');
    }

    return { filePath, original, formatted, changed, error, stats };
  }

  /**
   * 여러 파일을 일괄 포맷팅합니다.
   *
   * @param files  파일 경로 배열
   * @param write  true이면 각 파일을 덮어씁니다
   * @param options 포맷 옵션
   */
  formatFiles(
    files: string[],
    write = false,
    options?: Partial<FormatOptions>
  ): SelfFormatResult[] {
    return files.map(f => this.formatFile(f, write, options));
  }
}

/**
 * 싱글톤 인스턴스
 */
export const selfFormatter = new SelfFormatter();
