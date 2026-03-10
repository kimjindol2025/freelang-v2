/**
 * FreeLang v2 - jsdom 네이티브 함수
 *
 * npm jsdom 패키지 완전 대체
 * 서버사이드 DOM 에뮬레이션 구현 (경량 버전)
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

interface JsdomNode {
  type: 'element' | 'text' | 'comment' | 'document';
  tagName?: string;
  id?: string;
  className?: string;
  attributes: Record<string, string>;
  children: JsdomNode[];
  textContent?: string;
  innerHTML?: string;
  parent: JsdomNode | null;
}

interface JsdomInstance {
  root: JsdomNode;
  url: string;
}

const jsdomStore = new Map<string, JsdomInstance>();
let jsdomCounter = 0;

function parseHtmlToNode(html: string): JsdomNode {
  const root: JsdomNode = {
    type: 'document',
    attributes: {},
    children: [],
    parent: null
  };

  const stack: JsdomNode[] = [root];
  const tokenRegex = /(<!--[\s\S]*?-->|<\/?\s*[\w]+[^>]*\/?>|[^<]+)/g;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(html)) !== null) {
    const token = match[1];
    const parent = stack[stack.length - 1];

    if (token.startsWith('<!--')) {
      parent.children.push({ type: 'comment', attributes: {}, children: [], textContent: token.slice(4, -3), parent });
      continue;
    }

    if (token.startsWith('</')) {
      if (stack.length > 1) stack.pop();
      continue;
    }

    if (token.startsWith('<')) {
      const selfClosing = token.endsWith('/>');
      const inner = token.replace(/^<|\/?>$/g, '').trim();
      const spaceIdx = inner.search(/\s/);
      const tagName = (spaceIdx === -1 ? inner : inner.substring(0, spaceIdx)).toLowerCase();
      const attrsStr = spaceIdx === -1 ? '' : inner.substring(spaceIdx);

      const attributes: Record<string, string> = {};
      const attrRegex = /([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*)))?/g;
      let attrMatch: RegExpExecArray | null;
      while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
        if (!attrMatch[1] || attrMatch[1] === tagName) continue;
        attributes[attrMatch[1]] = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';
      }

      const node: JsdomNode = {
        type: 'element',
        tagName,
        id: attributes['id'] || '',
        className: attributes['class'] || '',
        attributes,
        children: [],
        parent
      };

      parent.children.push(node);

      const voidTags = new Set(['br', 'hr', 'img', 'input', 'link', 'meta', 'area', 'base', 'col', 'embed', 'param', 'source', 'track']);
      if (!selfClosing && !voidTags.has(tagName)) {
        stack.push(node);
      }
    } else {
      parent.children.push({
        type: 'text',
        attributes: {},
        children: [],
        textContent: token,
        parent
      });
    }
  }

  return root;
}

function getNodeText(node: JsdomNode): string {
  if (node.type === 'text') return node.textContent || '';
  return node.children.map(getNodeText).join('');
}

function getNodeHtml(node: JsdomNode): string {
  if (node.type === 'text') return node.textContent || '';
  if (node.type !== 'element') return '';
  const attrs = Object.entries(node.attributes)
    .map(([k, v]) => v !== undefined ? `${k}="${v}"` : k)
    .join(' ');
  const attrStr = attrs ? ' ' + attrs : '';
  const inner = node.children.map(getNodeHtml).join('');
  return `<${node.tagName}${attrStr}>${inner}</${node.tagName}>`;
}

function matchesCssSelector(node: JsdomNode, selector: string): boolean {
  if (node.type !== 'element') return false;
  const s = selector.trim();

  // 태그
  if (/^[a-z][a-z0-9]*$/i.test(s)) return node.tagName === s.toLowerCase();
  // #id
  if (s.startsWith('#')) return node.id === s.slice(1);
  // .class
  if (s.startsWith('.')) {
    const cls = s.slice(1);
    return (node.className || '').split(/\s+/).includes(cls);
  }
  // [attr=val]
  if (s.startsWith('[')) {
    const inner = s.slice(1, -1);
    if (inner.includes('=')) {
      const [k, v] = inner.split('=');
      return node.attributes[k.trim()] === v.trim().replace(/['"]/g, '');
    }
    return node.attributes[inner.trim()] !== undefined;
  }
  return false;
}

function querySelectorAll(root: JsdomNode, selector: string): JsdomNode[] {
  const parts = selector.trim().split(/\s+/);
  const results: JsdomNode[] = [];

  function traverse(node: JsdomNode, depth: number): void {
    if (matchesCssSelector(node, parts[depth])) {
      if (depth === parts.length - 1) {
        results.push(node);
      } else {
        node.children.forEach((child) => traverse(child, depth + 1));
      }
    } else {
      node.children.forEach((child) => traverse(child, depth));
    }
  }

  root.children.forEach((child) => traverse(child, 0));
  return results;
}

function nodeToObj(node: JsdomNode): any {
  return {
    tagName: node.tagName || '',
    id: node.id || '',
    className: node.className || '',
    textContent: getNodeText(node),
    innerHTML: node.children.map(getNodeHtml).join(''),
    attributes: node.attributes,
    children: node.children.filter((c) => c.type === 'element').map(nodeToObj)
  };
}

export function registerJsdomFunctions(registry: NativeFunctionRegistry): void {
  // jsdom_create(html, url, contentType, includeNodeLocations, runScripts, resources) -> id
  registry.register({
    name: 'jsdom_create',
    module: 'jsdom',
    executor: (args: any[]) => {
      const html = String(args[0] || '');
      const url = String(args[1] || 'about:blank');
      const id = `jsdom_${++jsdomCounter}`;
      const root = parseHtmlToNode(html);
      jsdomStore.set(id, { root, url });
      return id;
    }
  });

  // jsdom_get_window(id) -> object
  registry.register({
    name: 'jsdom_get_window',
    module: 'jsdom',
    executor: (args: any[]) => {
      const id = String(args[0] || '');
      const instance = jsdomStore.get(id);
      return instance ? { _domId: id, location: { href: instance.url } } : null;
    }
  });

  // jsdom_get_document(id) -> object
  registry.register({
    name: 'jsdom_get_document',
    module: 'jsdom',
    executor: (args: any[]) => {
      const id = String(args[0] || '');
      return { _domId: id, type: 'document' };
    }
  });

  // jsdom_query(id, selector) -> element
  registry.register({
    name: 'jsdom_query',
    module: 'jsdom',
    executor: (args: any[]) => {
      const id = String(args[0] || '');
      const selector = String(args[1] || '');
      const instance = jsdomStore.get(id);
      if (!instance) return null;

      const results = querySelectorAll(instance.root, selector);
      return results.length > 0 ? nodeToObj(results[0]) : null;
    }
  });

  // jsdom_query_all(id, selector) -> array
  registry.register({
    name: 'jsdom_query_all',
    module: 'jsdom',
    executor: (args: any[]) => {
      const id = String(args[0] || '');
      const selector = String(args[1] || '');
      const instance = jsdomStore.get(id);
      if (!instance) return [];

      return querySelectorAll(instance.root, selector).map(nodeToObj);
    }
  });

  // jsdom_get_text(el) -> string
  registry.register({
    name: 'jsdom_get_text',
    module: 'jsdom',
    executor: (args: any[]) => {
      const el = args[0];
      return el?.textContent || '';
    }
  });

  // jsdom_get_html(el) -> string
  registry.register({
    name: 'jsdom_get_html',
    module: 'jsdom',
    executor: (args: any[]) => {
      const el = args[0];
      return el?.innerHTML || '';
    }
  });

  // jsdom_get_attr(el, name) -> string
  registry.register({
    name: 'jsdom_get_attr',
    module: 'jsdom',
    executor: (args: any[]) => {
      const el = args[0];
      const name = String(args[1] || '');
      return el?.attributes?.[name] ?? null;
    }
  });

  // jsdom_get_all_attrs(el) -> map
  registry.register({
    name: 'jsdom_get_all_attrs',
    module: 'jsdom',
    executor: (args: any[]) => {
      const el = args[0];
      return el?.attributes || {};
    }
  });

  // jsdom_serialize(id) -> string
  registry.register({
    name: 'jsdom_serialize',
    module: 'jsdom',
    executor: (args: any[]) => {
      const id = String(args[0] || '');
      const instance = jsdomStore.get(id);
      if (!instance) return '';
      return instance.root.children.map(getNodeHtml).join('');
    }
  });
}
