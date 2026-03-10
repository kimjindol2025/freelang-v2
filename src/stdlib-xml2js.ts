/**
 * FreeLang v2 - xml2js 네이티브 함수
 *
 * npm xml2js 패키지 완전 대체
 * XML ↔ JSON 변환 구현
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

// 간단한 XML 파서 (외부 의존성 없이 구현)
function parseXml(
  xml: string,
  explicitArray: boolean,
  mergeAttrs: boolean,
  trim: boolean,
  normalize: boolean,
  attrkey: string,
  charkey: string,
  ignoreAttrs: boolean
): any {
  const result: any = {};

  // XML 선언 및 주석 제거
  let content = xml
    .replace(/<\?[^?]*\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();

  function parseNode(xmlStr: string): any {
    const obj: any = {};
    const tagRegex = /<([^/>\s]+)([^>]*)>([\s\S]*?)<\/\1>|<([^/>\s]+)([^>]*?)\/>/g;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(xmlStr)) !== null) {
      const tagName = match[1] || match[4];
      const attrsStr = match[2] || match[5] || '';
      const innerContent = match[3] || '';

      // 속성 파싱
      const attrs: Record<string, string> = {};
      const attrRegex = /(\w[\w-]*)=["']([^"']*)["']/g;
      let attrMatch: RegExpExecArray | null;
      while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
        attrs[attrMatch[1]] = attrMatch[2];
      }

      let nodeValue: any;
      const hasChildren = /<[^>]+>/.test(innerContent);

      if (hasChildren) {
        nodeValue = parseNode(innerContent);
        if (Object.keys(attrs).length > 0 && !ignoreAttrs) {
          if (mergeAttrs) {
            Object.assign(nodeValue, attrs);
          } else {
            nodeValue[attrkey] = attrs;
          }
        }
      } else {
        const textContent = trim ? innerContent.trim() : innerContent;
        const normalizedText = normalize ? textContent.replace(/\s+/g, ' ').trim() : textContent;

        if (Object.keys(attrs).length > 0 && !ignoreAttrs) {
          nodeValue = { [charkey]: normalizedText };
          if (mergeAttrs) {
            Object.assign(nodeValue, attrs);
          } else {
            nodeValue[attrkey] = attrs;
          }
        } else {
          nodeValue = normalizedText;
        }
      }

      if (obj[tagName] !== undefined) {
        if (!Array.isArray(obj[tagName])) {
          obj[tagName] = [obj[tagName]];
        }
        obj[tagName].push(nodeValue);
      } else {
        obj[tagName] = explicitArray ? [nodeValue] : nodeValue;
      }
    }

    return obj;
  }

  return parseNode(content);
}

function buildXml(obj: any, indent: string = ''): string {
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }
  if (obj === null || obj === undefined) return '';

  let result = '';
  for (const [key, value] of Object.entries(obj)) {
    if (key === '$' || key === '_') continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        result += `${indent}<${key}>`;
        if (typeof item === 'object' && item !== null) {
          result += '\n' + buildXml(item, indent + '  ') + indent;
        } else {
          result += String(item ?? '');
        }
        result += `</${key}>\n`;
      }
    } else if (typeof value === 'object' && value !== null) {
      result += `${indent}<${key}>\n`;
      result += buildXml(value, indent + '  ');
      result += `${indent}</${key}>\n`;
    } else {
      result += `${indent}<${key}>${String(value ?? '')}</${key}>\n`;
    }
  }
  return result;
}

export function registerXml2jsFunctions(registry: NativeFunctionRegistry): void {
  // xml2js_parse(xml, explicitArray, mergeAttrs, trim, normalize, attrkey, charkey, explicitCharkey, ignoreAttrs) -> map
  registry.register({
    name: 'xml2js_parse',
    module: 'xml2js',
    executor: (args: any[]) => {
      const xml = String(args[0] || '');
      const explicitArray = args[1] !== false;
      const mergeAttrs = Boolean(args[2]);
      const trim = Boolean(args[3]);
      const normalize = Boolean(args[4]);
      const attrkey = String(args[5] || '$');
      const charkey = String(args[6] || '_');
      const ignoreAttrs = Boolean(args[8]);

      try {
        return parseXml(xml, explicitArray, mergeAttrs, trim, normalize, attrkey, charkey, ignoreAttrs);
      } catch (err: any) {
        throw new Error(`xml2js_parse failed: ${err.message}`);
      }
    }
  });

  // xml2js_build(obj, rootName, headless, cdata) -> string
  registry.register({
    name: 'xml2js_build',
    module: 'xml2js',
    executor: (args: any[]) => {
      const obj = args[0];
      const rootName = String(args[1] || 'root');
      const headless = Boolean(args[2]);

      try {
        let xml = '';
        if (!headless) {
          xml += '<?xml version="1.0" encoding="UTF-8"?>\n';
        }
        xml += `<${rootName}>\n`;
        xml += buildXml(obj, '  ');
        xml += `</${rootName}>`;
        return xml;
      } catch (err: any) {
        throw new Error(`xml2js_build failed: ${err.message}`);
      }
    }
  });
}
