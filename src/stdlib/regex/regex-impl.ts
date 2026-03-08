/**
 * FreeLang v2 - Regular Expression Implementation
 *
 * Phase L: Basic regex support using JavaScript RegExp
 *
 * Supported:
 * - Pattern: /pattern/flags 형식
 * - Methods: test, match, replace, split, exec
 * - Flags: g, i, m, s, u, y
 */

/**
 * RegexObject: JavaScript RegExp을 감싼 래퍼
 */
export class RegexObject {
  public pattern: RegExp;
  private patternString: string;

  constructor(patternStr: string) {
    // 입력 형식: "pattern/flags" 또는 "pattern"
    // 예: "[0-9]+/g" 또는 "[0-9]+" 또는 "HELLO/i"

    const lastSlash = patternStr.lastIndexOf('/');

    if (lastSlash > 0) {
      // "pattern/flags" 형식
      const pattern = patternStr.substring(0, lastSlash);
      const flags = patternStr.substring(lastSlash + 1);
      this.patternString = patternStr;
      this.pattern = new RegExp(pattern, flags);
    } else if (patternStr.startsWith('/') && patternStr.lastIndexOf('/') > 0) {
      // "/pattern/flags" 형식 (렉서에서 슬래시 제거됨)
      const lastSlash2 = patternStr.lastIndexOf('/');
      const pattern = patternStr.substring(1, lastSlash2);
      const flags = patternStr.substring(lastSlash2 + 1);
      this.patternString = patternStr;
      this.pattern = new RegExp(pattern, flags);
    } else {
      // "pattern" 또는 "/pattern/" 형식
      this.patternString = patternStr;
      if (patternStr.startsWith('/')) {
        const p = patternStr.substring(1, patternStr.lastIndexOf('/'));
        this.pattern = new RegExp(p);
      } else {
        this.pattern = new RegExp(patternStr);
      }
    }
  }

  /**
   * test(str) -> bool: 문자열이 패턴과 일치하는지 확인
   */
  test(str: string): boolean {
    this.pattern.lastIndex = 0; // Reset for global flag
    return this.pattern.test(str);
  }

  /**
   * match(str) -> string | null: 첫 번째 일치 결과 반환
   */
  match(str: string): string | null {
    const result = str.match(this.pattern);
    return result ? result[0] : null;
  }

  /**
   * replace(str, replacement) -> string: 일치하는 부분 치환
   */
  replace(str: string, replacement: string): string {
    return str.replace(this.pattern, replacement);
  }

  /**
   * split(str) -> string[]: 패턴을 기준으로 분할
   */
  split(str: string): string[] {
    return str.split(this.pattern);
  }

  /**
   * exec(str) -> any: 상세 일치 정보 반환
   */
  exec(str: string): any {
    this.pattern.lastIndex = 0; // Reset for global flag
    const result = this.pattern.exec(str);
    return result ? Array.from(result) : null;
  }

  /**
   * source: 패턴 소스 반환
   */
  get source(): string {
    return this.pattern.source;
  }

  /**
   * flags: 플래그 문자열 반환
   */
  get flags(): string {
    return this.pattern.flags;
  }

  /**
   * global: g 플래그 여부
   */
  get global(): boolean {
    return this.pattern.global;
  }

  /**
   * ignoreCase: i 플래그 여부
   */
  get ignoreCase(): boolean {
    return this.pattern.ignoreCase;
  }

  /**
   * multiline: m 플래그 여부
   */
  get multiline(): boolean {
    return this.pattern.multiline;
  }
}
