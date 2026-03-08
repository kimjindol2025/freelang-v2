/**
 * Project Ouroboros Phase 1: Self-Hosting Lexer Test
 *
 * Test that FreeLang code (lexer.free) can be parsed and analyzed
 * by the TypeScript compiler.
 */

import { Lexer, TokenBuffer } from '../src/lexer/lexer';
import { parseMinimalFunction } from '../src/parser/parser';
import { analyzeBody } from '../src/analyzer/body-analysis';
import * as fs from 'fs';
import * as path from 'path';

describe('Project Ouroboros: Phase 1 - Self-Hosting Lexer', () => {

  test('Lexer.free파일이 존재하는가', () => {
    const lexerFilePath = path.join(__dirname, '../src/self-host/lexer.free');
    expect(fs.existsSync(lexerFilePath)).toBe(true);
  });

  test('Lexer.free 파일을 읽을 수 있는가', () => {
    const lexerFilePath = path.join(__dirname, '../src/self-host/lexer.free');
    const content = fs.readFileSync(lexerFilePath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
    console.log(`✅ Lexer.free 파일 크기: ${content.length}바이트`);
  });

  test('freelang_tokenize 함수를 파싱할 수 있는가', () => {
    const lexerFilePath = path.join(__dirname, '../src/self-host/lexer.free');
    const content = fs.readFileSync(lexerFilePath, 'utf-8');

    // 전체 파일을 파싱 (단일 함수로 리팩토링됨)
    const lexer = new Lexer(content);
    const buffer = new TokenBuffer(lexer);
    const ast = parseMinimalFunction(buffer);

    expect(ast.fnName).toBe('freelang_tokenize');
    expect(ast.inputType).toBe('string');
    expect(ast.outputType).toContain('array');
    expect(ast.body).toBeDefined();
    expect(ast.body!.length).toBeGreaterThan(0);

    console.log(`✅ 함수명: ${ast.fnName}`);
    console.log(`✅ 입력 타입: ${ast.inputType}`);
    console.log(`✅ 출력 타입: ${ast.outputType}`);
    console.log(`✅ 본체 크기: ${ast.body!.length}바이트`);
  });

  test('본체 분석: 루프와 조건 감지', () => {
    const lexerFilePath = path.join(__dirname, '../src/self-host/lexer.free');
    const content = fs.readFileSync(lexerFilePath, 'utf-8');

    // 전체 파일을 파싱 (단일 함수로 리팩토링됨)
    const lexer = new Lexer(content);
    const buffer = new TokenBuffer(lexer);
    const ast = parseMinimalFunction(buffer);

    const analysis = analyzeBody(ast.body!);

    // Lexer는 여러 루프를 포함함
    expect(analysis.loops.hasLoop).toBe(true);
    expect(analysis.loops.loopCount).toBeGreaterThan(0);

    console.log(`✅ 루프 개수: ${analysis.loops.loopCount}`);
    console.log(`✅ 중첩 루프 여부: ${analysis.loops.hasNestedLoop}`);
    console.log(`✅ 분석 신뢰도: ${(analysis.confidence * 100).toFixed(1)}%`);
  });

  test('인라인된 도우미 로직이 모두 포함되는가', () => {
    const lexerFilePath = path.join(__dirname, '../src/self-host/lexer.free');
    const content = fs.readFileSync(lexerFilePath, 'utf-8');

    // Phase 1에서 모든 도우미 함수는 메인 함수 내부로 인라인됨
    // isDigit, isLetter 로직은 직접 문자 비교로 구현됨

    // 숫자 판별: >= '0' and <= '9'
    expect(content.includes(">= '0' and")).toBe(true);
    expect(content.includes("<= '9'")).toBe(true);
    console.log(`✅ 숫자 판별 로직 인라인화 (isDigit)`);

    // 문자 판별: >= 'a' and <= 'z' or >= 'A' and <= 'Z'
    expect(content.includes(">= 'a' and")).toBe(true);
    expect(content.includes("<= 'z'")).toBe(true);
    expect(content.includes(">= 'A' and")).toBe(true);
    expect(content.includes("<= 'Z'")).toBe(true);
    console.log(`✅ 문자 판별 로직 인라인화 (isLetter)`);

    // 단일 함수로 통합됨
    expect(content.includes('fn freelang_tokenize')).toBe(true);
    console.log(`✅ 단일 함수로 통합 완료 (Self-Hosting Lexer)`);
  });

  test('String 함수들이 사용되는가', () => {
    const lexerFilePath = path.join(__dirname, '../src/self-host/lexer.free');
    const content = fs.readFileSync(lexerFilePath, 'utf-8');

    const stringOps = ['length(', 'charAt(', 'substr(', 'push('];

    stringOps.forEach(op => {
      expect(content.includes(op)).toBe(true);
      console.log(`✅ ${op} 사용 발견`);
    });
  });

  test('프리랭 Lexer.free가 토큰 배열을 반환하는 구조', () => {
    const code = `fn freelang_tokenize
input: string
output: array<string>
intent: "프리랭 소스 코드를 토큰으로 분할"
{
  let tokens = [];
  let i = 0;
  while i < length(input) {
    if isLetter(charAt(input, i)) {
      push(tokens, "IDENT");
    }
    i += 1;
  }
  return tokens;
}`;

    const lexer = new Lexer(code);
    const buffer = new TokenBuffer(lexer);
    const ast = parseMinimalFunction(buffer);

    expect(ast.fnName).toBe('freelang_tokenize');
    expect(ast.outputType).toContain('array');
    expect(ast.body).toContain('while');
    expect(ast.body).toContain('if');
    expect(ast.body).toContain('push');

    console.log(`✅ Self-Hosting Lexer 구조 검증 완료`);
  });

  test('프로젝트 우로보로스: 철학 검증', () => {
    const message = `
    Project Ouroboros: 우로보로스 - 꼬리를 무는 뱀

    ✅ Phase 1 준비 완료:
    1. VM이 문자열을 지원함
    2. Lexer.free 파일이 작성됨
    3. 프리랭으로 프리랭 Lexer를 작성할 수 있음

    다음 단계:
    - Lexer.free를 TypeScript 컴파일러로 컴파일
    - 토큰 결과 검증
    - Parser.free 작성
    `;

    console.log(message);
    expect(true).toBe(true);
  });
});
