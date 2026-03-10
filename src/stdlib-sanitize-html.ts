/**
 * FreeLang v2 - sanitize-html 네이티브 함수
 *
 * npm sanitize-html 패키지 완전 대체
 * HTML 정화 (XSS 방지) 구현
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

const DEFAULT_ALLOWED_TAGS = new Set([
  'h1','h2','h3','h4','h5','h6','blockquote','p','a','ul','ol','li',
  'b','i','strong','em','strike','s','del','code','pre','hr','br',
  'div','span','table','thead','tbody','tr','th','td','caption','img'
]);

function sanitizeHtml(
  html: string,
  allowedTags: string[],
  allowedAttributes: Record<string, string[]>,
  allowedSchemes: string[],
  allowProtocolRelative: boolean
): string {
  const tagSet = new Set(allowedTags.map((t) => t.toLowerCase()));
  const schemeSet = new Set(allowedSchemes);

  // 위험한 태그 제거 (script, style, on* 이벤트 핸들러)
  let result = html;

  // script/style 태그와 내용 제거
  result = result.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  result = result.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');

  // 허용되지 않은 태그 제거 (내용은 유지)
  result = result.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (match, tagName, attrs) => {
    const lowerTag = tagName.toLowerCase();
    if (!tagSet.has(lowerTag)) return '';

    // 속성 필터링
    const allowedAttrs = allowedAttributes[lowerTag] || allowedAttributes['*'] || [];
    const allowedAttrSet = new Set(allowedAttrs.map((a: string) => a.toLowerCase()));

    // on* 이벤트 핸들러 제거
    let filteredAttrs = attrs.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');

    // javascript: URL 제거
    filteredAttrs = filteredAttrs.replace(
      /\s+(href|src)\s*=\s*["']?\s*javascript:[^"'\s>]*/gi,
      ''
    );

    // 허용되지 않은 속성 제거
    if (allowedAttrs.length > 0) {
      filteredAttrs = filteredAttrs.replace(
        /\s+([\w-]+)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/g,
        (attrMatch: string, attrName: string) => {
          if (allowedAttrSet.has(attrName.toLowerCase()) || allowedAttrs.includes('*')) {
            return attrMatch;
          }
          return '';
        }
      );
    }

    // URL scheme 검증
    if (!allowProtocolRelative) {
      filteredAttrs = filteredAttrs.replace(
        /\s+(href|src)\s*=\s*["']?\/\/[^"'\s>]*/gi,
        ''
      );
    }

    return match.startsWith('</') ? `</${lowerTag}>` : `<${lowerTag}${filteredAttrs}>`;
  });

  return result;
}

function stripAllTags(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

function stripExceptTags(html: string, allowedTags: string[]): string {
  const tagSet = new Set(allowedTags.map((t) => t.toLowerCase()));
  return html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tagName) => {
    return tagSet.has(tagName.toLowerCase()) ? match : '';
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function unescapeHtml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, '\u00A0');
}

export function registerSanitizeHtmlFunctions(registry: NativeFunctionRegistry): void {
  // sanitize_html(html, allowedTags, allowedAttributes, allowedSchemes, allowProtocolRelative) -> string
  registry.register({
    name: 'sanitize_html',
    module: 'sanitize-html',
    executor: (args: any[]) => {
      const html = String(args[0] || '');
      const allowedTags = Array.isArray(args[1]) ? args[1] as string[] : Array.from(DEFAULT_ALLOWED_TAGS);
      const allowedAttributes = (typeof args[2] === 'object' && args[2] !== null) ? args[2] as Record<string, string[]> : {};
      const allowedSchemes = Array.isArray(args[3]) ? args[3] as string[] : ['http', 'https'];
      const allowProtocolRelative = args[4] !== false;

      return sanitizeHtml(html, allowedTags, allowedAttributes, allowedSchemes, allowProtocolRelative);
    }
  });

  // sanitize_strip_tags(html) -> string
  registry.register({
    name: 'sanitize_strip_tags',
    module: 'sanitize-html',
    executor: (args: any[]) => {
      return stripAllTags(String(args[0] || ''));
    }
  });

  // sanitize_strip_except(html, allowedTags) -> string
  registry.register({
    name: 'sanitize_strip_except',
    module: 'sanitize-html',
    executor: (args: any[]) => {
      const html = String(args[0] || '');
      const allowed = Array.isArray(args[1]) ? args[1] as string[] : [];
      return stripExceptTags(html, allowed);
    }
  });

  // sanitize_escape_html(text) -> string
  registry.register({
    name: 'sanitize_escape_html',
    module: 'sanitize-html',
    executor: (args: any[]) => {
      return escapeHtml(String(args[0] || ''));
    }
  });

  // sanitize_unescape_html(text) -> string
  registry.register({
    name: 'sanitize_unescape_html',
    module: 'sanitize-html',
    executor: (args: any[]) => {
      return unescapeHtml(String(args[0] || ''));
    }
  });

  // sanitize_is_valid_url(url, allowedSchemes) -> bool
  registry.register({
    name: 'sanitize_is_valid_url',
    module: 'sanitize-html',
    executor: (args: any[]) => {
      const url = String(args[0] || '');
      const schemes = Array.isArray(args[1]) ? args[1] as string[] : ['http', 'https'];
      try {
        const parsed = new URL(url);
        const scheme = parsed.protocol.replace(':', '');
        return schemes.includes(scheme);
      } catch {
        // 상대 URL은 허용
        return url.startsWith('/') || url.startsWith('./') || url.startsWith('../');
      }
    }
  });
}
