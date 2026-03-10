/**
 * FreeLang v2 - xss 네이티브 함수
 *
 * npm xss 패키지 완전 대체
 * XSS 방어 필터 구현
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

function escapeHtmlEntities(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function isValidUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  // javascript: 프로토콜 차단
  if (/^javascript:/i.test(trimmed)) return false;
  if (/^vbscript:/i.test(trimmed)) return false;
  if (/^data:text\/html/i.test(trimmed)) return false;
  return true;
}

function filterXss(
  html: string,
  whiteList: Record<string, string[]>,
  allowCommentTag: boolean,
  stripIgnoreTag: boolean,
  stripIgnoreTagBody: string[]
): string {
  const stripBodySet = new Set(stripIgnoreTagBody.map((t) => t.toLowerCase()));
  let result = '';
  let i = 0;
  let inStripBody = false;
  let stripBodyTag = '';

  while (i < html.length) {
    if (html[i] !== '<') {
      result += html[i];
      i++;
      continue;
    }

    // 태그 시작
    const tagEnd = html.indexOf('>', i);
    if (tagEnd === -1) {
      result += escapeHtmlEntities(html.slice(i));
      break;
    }

    const fullTag = html.slice(i, tagEnd + 1);

    // 주석 처리
    if (fullTag.startsWith('<!--')) {
      if (allowCommentTag) {
        result += fullTag;
      }
      i = tagEnd + 1;
      continue;
    }

    const isClosing = fullTag.startsWith('</');
    const inner = fullTag.replace(/^<\/?|\/?>$/g, '').trim();
    const spaceIdx = inner.search(/[\s/]/);
    const tagName = (spaceIdx === -1 ? inner : inner.substring(0, spaceIdx)).toLowerCase();

    // stripIgnoreTagBody 처리
    if (stripBodySet.has(tagName)) {
      if (!isClosing) {
        inStripBody = true;
        stripBodyTag = tagName;
      } else if (inStripBody && tagName === stripBodyTag) {
        inStripBody = false;
        stripBodyTag = '';
      }
      i = tagEnd + 1;
      continue;
    }

    if (inStripBody) {
      i = tagEnd + 1;
      continue;
    }

    // 화이트리스트 확인
    if (!whiteList.hasOwnProperty(tagName)) {
      if (stripIgnoreTag) {
        // 태그 제거 (내용 유지)
      } else {
        result += escapeHtmlEntities(fullTag);
      }
      i = tagEnd + 1;
      continue;
    }

    // 허용된 태그의 속성 필터링
    const allowedAttrs = new Set((whiteList[tagName] || []).map((a: string) => a.toLowerCase()));
    const attrsStr = spaceIdx === -1 ? '' : inner.substring(spaceIdx);
    let filteredAttrs = '';

    const attrRegex = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))|(\w[\w-]*)/g;
    let attrMatch: RegExpExecArray | null;

    while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
      const attrName = (attrMatch[1] || attrMatch[5] || '').toLowerCase();
      if (!attrName || attrName === tagName) continue;

      // on* 이벤트 핸들러 차단
      if (attrName.startsWith('on')) continue;

      if (!allowedAttrs.has(attrName)) continue;

      const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';

      // URL 속성 검증
      if (['href', 'src', 'action'].includes(attrName)) {
        if (!isValidUrl(attrValue)) continue;
      }

      filteredAttrs += ` ${attrName}="${escapeAttr(attrValue)}"`;
    }

    if (isClosing) {
      result += `</${tagName}>`;
    } else {
      const selfClose = fullTag.endsWith('/>') ? ' /' : '';
      result += `<${tagName}${filteredAttrs}${selfClose}>`;
    }

    i = tagEnd + 1;
  }

  return result;
}

export function registerXssFunctions(registry: NativeFunctionRegistry): void {
  // xss_filter(html, whiteList, allowCommentTag, stripIgnoreTag, stripIgnoreTagBody) -> string
  registry.register({
    name: 'xss_filter',
    module: 'xss',
    executor: (args: any[]) => {
      const html = String(args[0] || '');
      const whiteList = (typeof args[1] === 'object' && args[1] !== null) ? args[1] as Record<string, string[]> : {};
      const allowCommentTag = Boolean(args[2]);
      const stripIgnoreTag = Boolean(args[3]);
      const stripIgnoreTagBody = Array.isArray(args[4]) ? args[4] as string[] : [];

      return filterXss(html, whiteList, allowCommentTag, stripIgnoreTag, stripIgnoreTagBody);
    }
  });

  // xss_escape(str) -> string
  registry.register({
    name: 'xss_escape',
    module: 'xss',
    executor: (args: any[]) => {
      return escapeHtmlEntities(String(args[0] || ''));
    }
  });

  // xss_escape_attr(str) -> string
  registry.register({
    name: 'xss_escape_attr',
    module: 'xss',
    executor: (args: any[]) => {
      return escapeAttr(String(args[0] || ''));
    }
  });

  // xss_is_valid_url(url) -> bool
  registry.register({
    name: 'xss_is_valid_url',
    module: 'xss',
    executor: (args: any[]) => {
      return isValidUrl(String(args[0] || ''));
    }
  });
}
