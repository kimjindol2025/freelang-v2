/**
 * FreeLang Standard Library: std/xml
 *
 * XML parsing and generation utilities
 */

export interface XMLNode {
  tag: string;
  attrs: Record<string, string>;
  children: (XMLNode | string)[];
}

/**
 * Parse simple XML string to object
 * @param xml XML string
 * @returns Parsed XML object
 */
export function parse(xml: string): any {
  const stack: any[] = [];
  let current: any = null;
  let text = '';

  // Simple regex-based parser
  const tagRegex = /<([^/>]+)((?:\s+[^=]+="[^"]*")*)\s*\/?>/g;
  const closeTagRegex = /<\/([^>]+)>/g;
  const attrRegex = /(\w+)="([^"]*)"/g;

  let lastIndex = 0;
  let match;

  // Split by tags
  const parts = xml.split(/(<[^>]+>)/);

  for (const part of parts) {
    if (part.startsWith('<')) {
      if (part.startsWith('</')) {
        // Closing tag
        const tagName = part.match(/<\/(\w+)>/)?.[1];
        if (current && text.trim()) {
          current.text = text.trim();
        }
        if (stack.length > 0) {
          const parent = stack[stack.length - 1];
          parent.children.push(current);
          current = stack.pop();
        }
        text = '';
      } else {
        // Opening tag
        const tagMatch = part.match(/<(\w+)((?:\s+[^=]+="[^"]*")*)\s*\/?>/);
        if (tagMatch) {
          const tagName = tagMatch[1];
          const attrStr = tagMatch[2] || '';
          const attrs: Record<string, string> = {};

          const attrMatches = [...attrStr.matchAll(attrRegex)];
          for (const attr of attrMatches) {
            attrs[attr[1]] = attr[2];
          }

          if (current) {
            stack.push(current);
          }

          current = {
            tag: tagName,
            attrs,
            children: []
          };
        }
      }
    } else if (part.trim()) {
      text += part;
    }
  }

  return current;
}

/**
 * Convert object to XML string
 * @param obj Object to convert
 * @param indent Indentation level
 * @returns XML string
 */
export function stringify(obj: any, indent: number = 0): string {
  const spaces = '  '.repeat(indent);
  const nextSpaces = '  '.repeat(indent + 1);

  if (typeof obj === 'string') {
    return obj;
  }

  if (!obj.tag) {
    return '';
  }

  const attrPairs: string[] = [];
  for (const [key, value] of Object.entries(obj.attrs || {})) {
    attrPairs.push(`${key}="${value}"`);
  }
  const attrs = attrPairs.join(' ');

  const attrStr = attrs ? ` ${attrs}` : '';
  const hasChildren = obj.children && obj.children.length > 0;

  if (!hasChildren && !obj.text) {
    return `${spaces}<${obj.tag}${attrStr} />`;
  }

  let xml = `${spaces}<${obj.tag}${attrStr}>`;

  if (obj.text) {
    xml += obj.text;
  }

  if (hasChildren) {
    xml += '\n';
    for (const child of obj.children) {
      if (typeof child === 'string') {
        xml += `${nextSpaces}${child}\n`;
      } else {
        xml += stringify(child, indent + 1) + '\n';
      }
    }
    xml += spaces;
  }

  xml += `</${obj.tag}>`;

  return xml;
}

/**
 * Escape XML special characters
 * @param str String to escape
 * @returns Escaped string
 */
export function escape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Unescape XML special characters
 * @param str String to unescape
 * @returns Unescaped string
 */
export function unescape(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}
