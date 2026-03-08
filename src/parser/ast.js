"use strict";
/**
 * FreeLang v2 Phase 5 - Minimal AST
 *
 * .free 파일 형식만 지원하는 축소된 AST
 *
 * 예시:
 *   @minimal
 *   fn sum
 *   input: array<number>
 *   output: number
 *   intent: "배열 합산"
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseError = void 0;
/**
 * Parse error
 */
class ParseError extends Error {
    constructor(line, column, message) {
        super(`[${line}:${column}] ${message}`);
        this.line = line;
        this.column = column;
        this.name = 'ParseError';
    }
}
exports.ParseError = ParseError;
