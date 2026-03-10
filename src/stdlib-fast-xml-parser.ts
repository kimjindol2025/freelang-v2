/**
 * FreeLang v2 - fast-xml-parser 네이티브 함수
 *
 * npm fast-xml-parser 패키지 완전 대체
 * 빠른 XML 파서/빌더 구현
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

// XML 검증 (기본 구조 확인)
function validateXml(xmlData: string): { valid: boolean; err?: string } {
  const trimmed = xmlData.trim();
  if (!trimmed) return { valid: false, err: 'Empty XML' };

  // 태그 균형 확인
  const openTags: string[] = [];
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9:]*)(?:\s[^>]*)?(?:\/)?>/g;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(trimmed)) !== null) {
    const tag = match[0];
    const tagName = match[1];

    if (tag.startsWith('</')) {
      const last = openTags.pop();
      if (last !== tagName) {
        return { valid: false, err: `Mismatched tags: expected </${last}> but found </${tagName}>` };
      }
    } else if (!tag.endsWith('/>')) {
      openTags.push(tagName);
    }
  }

  if (openTags.length > 0) {
    return { valid: false, err: `Unclosed tags: ${openTags.join(', ')}` };
  }

  return { valid: true };
}

// XML → 객체 파싱
function parseXml(
  xml: string,
  ignoreAttributes: boolean,
  attributeNamePrefix: string,
  parseAttributeValue: boolean,
  trimValues: boolean,
  cdataTagName: string,
  arrayMode: boolean
): any {
  const result: any = {};

  // XML 선언 및 주석 제거
  let content = xml
    .replace(/<\?[^?]*\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();

  // CDATA 처리
  content = content.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, data) => {
    return `<${cdataTagName}>${data}</${cdataTagName}>`;
  });

  function parseValue(str: string): any {
    if (!parseAttributeValue) return str;
    const num = Number(str);
    if (!isNaN(num) && str.trim() !== '') return num;
    if (str === 'true') return true;
    if (str === 'false') return false;
    return str;
  }

  function parseNode(xmlStr: string): any {
    const obj: any = {};

    const tagPattern = /<([a-zA-Z][a-zA-Z0-9_:-]*)([^>]*)>([\s\S]*?)<\/\1>|<([a-zA-Z][a-zA-Z0-9_:-]*)([^>]*?)\/>/g;
    let match: RegExpExecArray | null;

    while ((match = tagPattern.exec(xmlStr)) !== null) {
      const tagName = match[1] || match[4];
      const attrsStr = match[2] || match[5] || '';
      const innerContent = match[3] || '';

      // 속성 파싱
      let nodeAttrs: any = {};
      if (!ignoreAttributes) {
        const attrRegex = /([\w:-]+)=["']([^"']*)["']/g;
        let attrMatch: RegExpExecArray | null;
        while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
          nodeAttrs[`${attributeNamePrefix}${attrMatch[1]}`] = parseValue(attrMatch[2]);
        }
      }

      let nodeValue: any;
      const hasChildren = /<[^>]+>/.test(innerContent);

      if (hasChildren) {
        nodeValue = parseNode(innerContent);
        if (Object.keys(nodeAttrs).length > 0) {
          Object.assign(nodeValue, nodeAttrs);
        }
      } else {
        const text = trimValues ? innerContent.trim() : innerContent;
        const parsedText = parseValue(text);

        if (Object.keys(nodeAttrs).length > 0) {
          nodeValue = { '#text': parsedText, ...nodeAttrs };
        } else {
          nodeValue = parsedText;
        }
      }

      if (obj[tagName] !== undefined) {
        if (!Array.isArray(obj[tagName])) {
          obj[tagName] = [obj[tagName]];
        }
        obj[tagName].push(nodeValue);
      } else {
        obj[tagName] = arrayMode ? [nodeValue] : nodeValue;
      }
    }

    return obj;
  }

  return parseNode(content);
}

// 객체 → XML 빌드
function buildXml(obj: any, attrPrefix: string, format: boolean, indentBy: string, suppressEmpty: boolean, indent: string = ''): string {
  let result = '';

  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith(attrPrefix)) continue;
    if (key === '#text') continue;

    const items = Array.isArray(value) ? value : [value];

    for (const item of items) {
      if (suppressEmpty && (item === null || item === undefined || item === '')) continue;

      const newIndent = format ? indent + indentBy : '';
      const newline = format ? '\n' : '';

      if (typeof item === 'object' && item !== null) {
        // 속성 수집
        const attrs = Object.entries(item)
          .filter(([k]) => k.startsWith(attrPrefix))
          .map(([k, v]) => ` ${k.slice(attrPrefix.length)}="${v}"`)
          .join('');

        const text = item['#text'];
        const hasChildren = Object.keys(item).some((k) => !k.startsWith(attrPrefix) && k !== '#text');

        if (hasChildren) {
          result += `${indent}<${key}${attrs}>${newline}`;
          result += buildXml(item, attrPrefix, format, indentBy, suppressEmpty, newIndent);
          result += `${indent}</${key}>${newline}`;
        } else if (text !== undefined) {
          result += `${indent}<${key}${attrs}>${text}</${key}>${newline}`;
        } else {
          result += `${indent}<${key}${attrs}/>${newline}`;
        }
      } else {
        const strVal = String(item ?? '');
        if (suppressEmpty && !strVal) continue;
        result += `${indent}<${key}>${strVal}</${key}>${newline}`;
      }
    }
  }

  return result;
}

export function registerFastXmlParserFunctions(registry: NativeFunctionRegistry): void {
  // fxp_validate(xmlData) -> bool
  registry.register({
    name: 'fxp_validate',
    module: 'fast-xml-parser',
    executor: (args: any[]) => {
      const xml = String(args[0] || '');
      return validateXml(xml).valid;
    }
  });

  // fxp_validate_error(xmlData) -> error object
  registry.register({
    name: 'fxp_validate_error',
    module: 'fast-xml-parser',
    executor: (args: any[]) => {
      const xml = String(args[0] || '');
      const result = validateXml(xml);
      return result.err ? { message: result.err } : null;
    }
  });

  // fxp_parse(xmlData, ignoreAttributes, attributeNamePrefix, parseAttributeValue, trimValues, cdataTagName, parseTrueNumberOnly, arrayMode) -> map
  registry.register({
    name: 'fxp_parse',
    module: 'fast-xml-parser',
    executor: (args: any[]) => {
      const xml = String(args[0] || '');
      const ignoreAttributes = args[1] !== false;
      const attributeNamePrefix = String(args[2] || '@_');
      const parseAttributeValue = Boolean(args[3]);
      const trimValues = args[4] !== false;
      const cdataTagName = String(args[5] || '__cdata');
      const arrayMode = Boolean(args[7]);

      try {
        return parseXml(xml, ignoreAttributes, attributeNamePrefix, parseAttributeValue, trimValues, cdataTagName, arrayMode);
      } catch (err: any) {
        throw new Error(`fxp_parse failed: ${err.message}`);
      }
    }
  });

  // fxp_build(obj, attributeNamePrefix, cdataTagName, format, indentBy, ignoreAttributes, supressEmptyNode) -> string
  registry.register({
    name: 'fxp_build',
    module: 'fast-xml-parser',
    executor: (args: any[]) => {
      const obj = args[0];
      const attrPrefix = String(args[1] || '@_');
      const format = Boolean(args[3]);
      const indentBy = String(args[4] || '  ');
      const suppressEmpty = Boolean(args[6]);

      try {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>';
        if (format) xml += '\n';
        xml += buildXml(obj, attrPrefix, format, indentBy, suppressEmpty);
        return xml;
      } catch (err: any) {
        throw new Error(`fxp_build failed: ${err.message}`);
      }
    }
  });
}
