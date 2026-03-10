/**
 * FreeLang v2 - htmlparser2 네이티브 함수
 *
 * npm htmlparser2 패키지 완전 대체
 * HTML/XML DOM 파서 구현
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

interface HP2Node {
  type: 'tag' | 'text' | 'comment' | 'root' | 'directive';
  name?: string;
  data?: string;
  attribs?: Record<string, string>;
  children: HP2Node[];
  parent: HP2Node | null;
  next: HP2Node | null;
  prev: HP2Node | null;
}

function parseHtml(
  html: string,
  xmlMode: boolean,
  decodeEntities: boolean,
  lowerCaseTags: boolean
): HP2Node {
  const root: HP2Node = { type: 'root', children: [], parent: null, next: null, prev: null };
  const stack: HP2Node[] = [root];

  const tokenRegex = /(<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->|<\/?\s*[\w:-]+[^>]*\/?>|[^<]+)/g;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(html)) !== null) {
    const token = match[1];
    const parent = stack[stack.length - 1];

    if (token.startsWith('<!--')) {
      const node: HP2Node = { type: 'comment', data: token.slice(4, -3), children: [], parent, next: null, prev: null };
      linkSibling(parent, node);
      parent.children.push(node);
    } else if (token.startsWith('</')) {
      if (stack.length > 1) stack.pop();
    } else if (token.startsWith('<')) {
      const selfClosingInput = token.endsWith('/>');
      const inner = token.replace(/^<|\/?>$/g, '').trim();
      const spaceMatch = inner.search(/[\s/]/);
      let tagName = spaceMatch === -1 ? inner : inner.substring(0, spaceMatch);
      if (lowerCaseTags) tagName = tagName.toLowerCase();

      const attrsStr = spaceMatch === -1 ? '' : inner.substring(spaceMatch);
      const attribs: Record<string, string> = {};

      const attrRegex = /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*)))?/g;
      let attrMatch: RegExpExecArray | null;
      while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
        if (!attrMatch[1] || attrMatch[1] === tagName) continue;
        attribs[attrMatch[1]] = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';
      }

      const node: HP2Node = {
        type: 'tag',
        name: tagName,
        attribs,
        children: [],
        parent,
        next: null,
        prev: null
      };

      linkSibling(parent, node);
      parent.children.push(node);

      const voidTags = new Set(['br', 'hr', 'img', 'input', 'link', 'meta', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr']);
      if (!selfClosingInput && !voidTags.has(tagName) && !xmlMode) {
        stack.push(node);
      } else if (xmlMode && selfClosingInput) {
        // self-closing in XML
      } else if (!voidTags.has(tagName)) {
        stack.push(node);
      }
    } else {
      // 텍스트 노드
      let data = token;
      if (decodeEntities) {
        data = data
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, '\u00A0');
      }
      const node: HP2Node = { type: 'text', data, children: [], parent, next: null, prev: null };
      linkSibling(parent, node);
      parent.children.push(node);
    }
  }

  return root;
}

function linkSibling(parent: HP2Node, node: HP2Node): void {
  if (parent.children.length > 0) {
    const prev = parent.children[parent.children.length - 1];
    prev.next = node;
    node.prev = prev;
  }
}

function findAllNodes(node: HP2Node, tagName: string): HP2Node[] {
  const results: HP2Node[] = [];
  function traverse(n: HP2Node): void {
    if (n.type === 'tag' && n.name === tagName) results.push(n);
    n.children.forEach(traverse);
  }
  node.children.forEach(traverse);
  return results;
}

function findByAttr(node: HP2Node, attr: string, value: string): HP2Node[] {
  const results: HP2Node[] = [];
  function traverse(n: HP2Node): void {
    if (n.type === 'tag') {
      const attrVal = n.attribs?.[attr] || '';
      if (attr === 'class') {
        if (attrVal.split(/\s+/).includes(value)) results.push(n);
      } else if (attrVal === value) {
        results.push(n);
      }
    }
    n.children.forEach(traverse);
  }
  node.children.forEach(traverse);
  return results;
}

function getNodeText(node: HP2Node): string {
  if (node.type === 'text') return node.data || '';
  return node.children.map(getNodeText).join('');
}

function getInnerHtml(node: HP2Node): string {
  return node.children.map(getOuterHtml).join('');
}

function getOuterHtml(node: HP2Node): string {
  if (node.type === 'text') return node.data || '';
  if (node.type === 'comment') return `<!--${node.data}-->`;
  if (node.type !== 'tag') return '';

  const attrs = Object.entries(node.attribs || {})
    .map(([k, v]) => v !== '' ? `${k}="${v}"` : k)
    .join(' ');
  const attrStr = attrs ? ' ' + attrs : '';
  const inner = node.children.map(getOuterHtml).join('');
  return `<${node.name}${attrStr}>${inner}</${node.name}>`;
}

function nodeToObj(node: HP2Node): any {
  return {
    type: node.type,
    name: node.name || '',
    data: node.data || '',
    attribs: node.attribs || {},
    children: node.children.map(nodeToObj),
    parent: null // 순환 참조 방지
  };
}

export function registerHtmlparser2Functions(registry: NativeFunctionRegistry): void {
  // htmlp2_parse(html, xmlMode, decodeEntities, lowerCaseTags, lowerCaseAttrNames, recognizeSelfClosing) -> DomDocument
  registry.register({
    name: 'htmlp2_parse',
    module: 'htmlparser2',
    executor: (args: any[]) => {
      const html = String(args[0] || '');
      const xmlMode = Boolean(args[1]);
      const decodeEntities = args[2] !== false;
      const lowerCaseTags = args[3] !== false;

      try {
        const root = parseHtml(html, xmlMode, decodeEntities, lowerCaseTags);
        return nodeToObj(root);
      } catch (err: any) {
        throw new Error(`htmlp2_parse failed: ${err.message}`);
      }
    }
  });

  // htmlp2_find_all(dom, tagName) -> array
  registry.register({
    name: 'htmlp2_find_all',
    module: 'htmlparser2',
    executor: (args: any[]) => {
      const dom = args[0];
      const tagName = String(args[1] || '').toLowerCase();

      function findInObj(obj: any): any[] {
        const results: any[] = [];
        if (obj.type === 'tag' && obj.name === tagName) results.push(obj);
        if (Array.isArray(obj.children)) {
          for (const child of obj.children) {
            results.push(...findInObj(child));
          }
        }
        return results;
      }

      return findInObj(dom);
    }
  });

  // htmlp2_find_one(dom, tagName) -> node
  registry.register({
    name: 'htmlp2_find_one',
    module: 'htmlparser2',
    executor: (args: any[]) => {
      const dom = args[0];
      const tagName = String(args[1] || '').toLowerCase();

      function findInObj(obj: any): any | null {
        if (obj.type === 'tag' && obj.name === tagName) return obj;
        if (Array.isArray(obj.children)) {
          for (const child of obj.children) {
            const found = findInObj(child);
            if (found) return found;
          }
        }
        return null;
      }

      return findInObj(dom);
    }
  });

  // htmlp2_find_by_attr(dom, attr, value) -> array
  registry.register({
    name: 'htmlp2_find_by_attr',
    module: 'htmlparser2',
    executor: (args: any[]) => {
      const dom = args[0];
      const attr = String(args[1] || '');
      const value = String(args[2] || '');

      function findInObj(obj: any): any[] {
        const results: any[] = [];
        if (obj.type === 'tag' && obj.attribs) {
          const attrVal = obj.attribs[attr] || '';
          if (attr === 'class') {
            if (attrVal.split(/\s+/).includes(value)) results.push(obj);
          } else if (attrVal === value) {
            results.push(obj);
          }
        }
        if (Array.isArray(obj.children)) {
          for (const child of obj.children) {
            results.push(...findInObj(child));
          }
        }
        return results;
      }

      return findInObj(dom);
    }
  });

  // htmlp2_get_text(node) -> string
  registry.register({
    name: 'htmlp2_get_text',
    module: 'htmlparser2',
    executor: (args: any[]) => {
      function getText(obj: any): string {
        if (!obj) return '';
        if (obj.type === 'text') return obj.data || '';
        if (Array.isArray(obj.children)) return obj.children.map(getText).join('');
        return '';
      }
      return getText(args[0]);
    }
  });

  // htmlp2_inner_html(node) -> string
  registry.register({
    name: 'htmlp2_inner_html',
    module: 'htmlparser2',
    executor: (args: any[]) => {
      function getHtml(obj: any): string {
        if (!obj) return '';
        if (obj.type === 'text') return obj.data || '';
        if (obj.type !== 'tag') return '';
        const attrs = Object.entries(obj.attribs || {}).map(([k, v]: [string, any]) => v ? `${k}="${v}"` : k).join(' ');
        const attrStr = attrs ? ' ' + attrs : '';
        const inner = (obj.children || []).map(getHtml).join('');
        return `<${obj.name}${attrStr}>${inner}</${obj.name}>`;
      }
      const node = args[0];
      return (node?.children || []).map(getHtml).join('');
    }
  });

  // htmlp2_outer_html(node) -> string
  registry.register({
    name: 'htmlp2_outer_html',
    module: 'htmlparser2',
    executor: (args: any[]) => {
      function getHtml(obj: any): string {
        if (!obj) return '';
        if (obj.type === 'text') return obj.data || '';
        if (obj.type !== 'tag') return '';
        const attrs = Object.entries(obj.attribs || {}).map(([k, v]: [string, any]) => v ? `${k}="${v}"` : k).join(' ');
        const attrStr = attrs ? ' ' + attrs : '';
        const inner = (obj.children || []).map(getHtml).join('');
        return `<${obj.name}${attrStr}>${inner}</${obj.name}>`;
      }
      return getHtml(args[0]);
    }
  });

  // htmlp2_get_attr(node, attr) -> string
  registry.register({
    name: 'htmlp2_get_attr',
    module: 'htmlparser2',
    executor: (args: any[]) => {
      const node = args[0];
      const attr = String(args[1] || '');
      return node?.attribs?.[attr] ?? null;
    }
  });

  // htmlp2_get_all_attrs(node) -> map
  registry.register({
    name: 'htmlp2_get_all_attrs',
    module: 'htmlparser2',
    executor: (args: any[]) => {
      const node = args[0];
      return node?.attribs || {};
    }
  });
}
