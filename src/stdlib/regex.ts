/**
 * FreeLang Standard Library: std/regex
 *
 * Regular expression utilities for pattern matching, validation, and text processing
 */

/**
 * Compiled regular expression with utilities
 */
export interface CompiledRegex {
  pattern: string;
  regex: RegExp;
  flags: string;
}

/**
 * Match result with position information
 */
export interface MatchResult {
  match: string;
  index: number;
  groups?: string[];
}

/**
 * Create a compiled regex from pattern
 * @param pattern Regex pattern string
 * @param flags Optional flags (g, i, m, s, u, y)
 * @returns Compiled regex object
 */
export function compile(pattern: string, flags: string = ''): CompiledRegex {
  try {
    const regex = new RegExp(pattern, flags);
    return {
      pattern,
      regex,
      flags
    };
  } catch (error) {
    throw new Error(`Invalid regex pattern: ${pattern}`);
  }
}

/**
 * Test if string matches pattern
 * @param str Input string
 * @param pattern Regex pattern string
 * @param flags Optional flags
 * @returns true if matches
 */
export function test(str: string, pattern: string, flags: string = ''): boolean {
  try {
    const regex = new RegExp(pattern, flags);
    return regex.test(str);
  } catch (error) {
    throw new Error(`Invalid regex pattern: ${pattern}`);
  }
}

/**
 * Find first match in string
 * @param str Input string
 * @param pattern Regex pattern string
 * @param flags Optional flags
 * @returns Match result or undefined
 */
export function match(str: string, pattern: string, flags: string = ''): MatchResult | undefined {
  try {
    const regex = new RegExp(pattern, flags);
    const result = regex.exec(str);

    if (!result) return undefined;

    return {
      match: result[0],
      index: result.index,
      groups: result.slice(1)
    };
  } catch (error) {
    throw new Error(`Invalid regex pattern: ${pattern}`);
  }
}

/**
 * Find all matches in string
 * @param str Input string
 * @param pattern Regex pattern string
 * @param flags Optional flags
 * @returns Array of match results
 */
export function matchAll(str: string, pattern: string, flags: string = 'g'): MatchResult[] {
  try {
    // Ensure global flag is set
    const finalFlags = flags.includes('g') ? flags : flags + 'g';
    const regex = new RegExp(pattern, finalFlags);
    const results: MatchResult[] = [];
    let match;

    while ((match = regex.exec(str)) !== null) {
      results.push({
        match: match[0],
        index: match.index,
        groups: match.slice(1)
      });
    }

    return results;
  } catch (error) {
    throw new Error(`Invalid regex pattern: ${pattern}`);
  }
}

/**
 * Split string by regex pattern
 * @param str Input string
 * @param pattern Regex pattern string
 * @param limit Maximum number of parts
 * @returns Array of parts
 */
export function split(str: string, pattern: string, limit?: number): string[] {
  try {
    const regex = new RegExp(pattern);
    return str.split(regex, limit);
  } catch (error) {
    throw new Error(`Invalid regex pattern: ${pattern}`);
  }
}

/**
 * Replace first match
 * @param str Input string
 * @param pattern Regex pattern string
 * @param replacement Replacement string
 * @returns Modified string
 */
export function replace(str: string, pattern: string, replacement: string): string {
  try {
    const regex = new RegExp(pattern);
    return str.replace(regex, replacement);
  } catch (error) {
    throw new Error(`Invalid regex pattern: ${pattern}`);
  }
}

/**
 * Replace all matches
 * @param str Input string
 * @param pattern Regex pattern string
 * @param replacement Replacement string
 * @returns Modified string
 */
export function replaceAll(str: string, pattern: string, replacement: string): string {
  try {
    const flags = 'g';
    const regex = new RegExp(pattern, flags);
    return str.replace(regex, replacement);
  } catch (error) {
    throw new Error(`Invalid regex pattern: ${pattern}`);
  }
}

/**
 * Escape special regex characters in string
 * @param str Input string
 * @returns Escaped string safe for regex
 */
export function escape(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if email is valid
 * @param email Email address
 * @returns true if valid email format
 */
export function isEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if string is valid URL
 * @param url URL string
 * @returns true if valid URL format
 */
export function isUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if string contains only alphanumeric characters
 * @param str Input string
 * @returns true if alphanumeric only
 */
export function isAlphanumeric(str: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(str);
}

/**
 * Extract email addresses from text
 * @param text Input text
 * @returns Array of found email addresses
 */
export function extractEmails(text: string): string[] {
  const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
  return text.match(emailRegex) || [];
}

/**
 * Extract URLs from text
 * @param text Input text
 * @returns Array of found URLs
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s]+/g;
  return text.match(urlRegex) || [];
}

/**
 * Named capture groups result
 */
export interface NamedCaptureResult {
  [groupName: string]: string | undefined;
}

/**
 * Extended match result with all details
 */
export interface ExtendedMatchResult {
  text: string;
  index: number;
  length: number;
  groups?: string[];
  named?: NamedCaptureResult;
  input: string;
}

/**
 * Execute regex on string with detailed results
 * @param regex Compiled regex or pattern string
 * @param str Input string
 * @returns Extended match result or null
 */
export function exec(regex: string | CompiledRegex, str: string): ExtendedMatchResult | null {
  try {
    const regexObj = typeof regex === 'string' ? new RegExp(regex) : regex.regex;
    const result = regexObj.exec(str);

    if (!result) return null;

    return {
      text: result[0],
      index: result.index,
      length: result[0].length,
      groups: result.slice(1),
      input: str
    };
  } catch (error) {
    throw new Error(`Invalid regex or input: ${error}`);
  }
}

/**
 * Find first match with full details
 * @param str Input string
 * @param pattern Regex pattern
 * @returns Extended match result or null
 */
export function findFirst(str: string, pattern: string): ExtendedMatchResult | null {
  return exec(pattern, str);
}

/**
 * Find all matches with full details
 * @param str Input string
 * @param pattern Regex pattern
 * @returns Array of extended match results
 */
export function findAll(str: string, pattern: string): ExtendedMatchResult[] {
  try {
    const finalFlags = pattern.includes('g') ? pattern : pattern + 'g';
    const regex = new RegExp(pattern, finalFlags);
    const results: ExtendedMatchResult[] = [];
    let match;

    while ((match = regex.exec(str)) !== null) {
      results.push({
        text: match[0],
        index: match.index,
        length: match[0].length,
        groups: match.slice(1),
        input: str
      });
    }

    return results;
  } catch (error) {
    throw new Error(`Invalid regex pattern: ${error}`);
  }
}

/**
 * Named capture groups support
 * Note: Uses numbered groups as fallback for named group mapping
 * @param str Input string
 * @param pattern Regex pattern with named groups (?<name>...)
 * @param groupNames Array of group names in order
 * @returns Result with named groups
 */
export function captureNamed(
  str: string,
  pattern: string,
  groupNames: string[]
): NamedCaptureResult | null {
  try {
    const regex = new RegExp(pattern);
    const result = regex.exec(str);

    if (!result) return null;

    const named: NamedCaptureResult = {};

    // Modern JS engines support named groups directly
    if (result.groups) {
      return result.groups;
    }

    // Fallback: map groupNames to captured groups
    for (let i = 0; i < groupNames.length; i++) {
      named[groupNames[i]] = result[i + 1];
    }

    return named;
  } catch (error) {
    throw new Error(`Named capture failed: ${error}`);
  }
}

/**
 * Test multiple patterns against string
 * @param str Input string
 * @param patterns Array of patterns to test
 * @returns Object with pattern results
 */
export function testMultiple(str: string, patterns: { [key: string]: string }): { [key: string]: boolean } {
  const results: { [key: string]: boolean } = {};

  for (const [name, pattern] of Object.entries(patterns)) {
    try {
      results[name] = new RegExp(pattern).test(str);
    } catch (error) {
      results[name] = false;
    }
  }

  return results;
}

/**
 * Extract and group matches
 * @param str Input string
 * @param pattern Regex pattern
 * @returns Object with all matches grouped by match text
 */
export function groupMatches(str: string, pattern: string): { [key: string]: number } {
  try {
    const finalFlags = 'g';
    const regex = new RegExp(pattern, finalFlags);
    const groups: { [key: string]: number } = {};
    let match;

    while ((match = regex.exec(str)) !== null) {
      const text = match[0];
      groups[text] = (groups[text] || 0) + 1;
    }

    return groups;
  } catch (error) {
    throw new Error(`Grouping failed: ${error}`);
  }
}

/**
 * Export all regex functions as default object
 */
export const regex = {
  compile,
  test,
  match,
  matchAll,
  split,
  replace,
  replaceAll,
  escape,
  isEmail,
  isUrl,
  isAlphanumeric,
  extractEmails,
  extractUrls,
  exec,
  findFirst,
  findAll,
  captureNamed,
  testMultiple,
  groupMatches
};
