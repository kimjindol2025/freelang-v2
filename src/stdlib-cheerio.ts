/**
 * FreeLang v2 - cheerio 네이티브 함수
 *
 * npm cheerio 패키지 완전 대체
 * 서버사이드 jQuery 구현 (htmlparser2 기반)
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

// 내부 DOM 노드 타입
interface DomNode {
  type: 'tag' | 'text' | 'comment' | 'root';
  name?: string;
  data?: string;
  attribs?: Record<string, string>;
  children?: DomNode[];
  parent?: DomNode | null;
  next?: DomNode | null;
  prev?: DomNode | null;
}

// 간단한 HTML 파서
function parseHtml(html: string): DomNode {
  const root: DomNode = { type: 'root', children: [], parent: null };
  const stack: DomNode[] = [root];

  const tagRegex = /(<\/?[^>]+>|[^<]+)/g;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html)) !== null) {
    const chunk = match[1];
    const current = stack[stack.length - 1];

    if (chunk.startsWith('</')) {
      // 닫는 태그
      if (stack.length > 1) stack.pop();
    } else if (chunk.startsWith('<')) {
      // 열리는 태그
      const selfClosing = chunk.endsWith('/>');
      const inner = chunk.replace(/^<|\/?>$/g, '').trim();
      const spaceIdx = inner.search(/\s/);
      const tagName = spaceIdx === -1 ? inner : inner.substring(0, spaceIdx);
      const attrsStr = spaceIdx === -1 ? '' : inner.substring(spaceIdx);

      // 속성 파싱
      const attribs: Record<string, string> = {};
      const attrRegex = /([\w-]+)(?:=["']([^"']*)["'])?/g;
      let attrMatch: RegExpExecArray | null;
      while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
        if (attrMatch[1] !== tagName) {
          attribs[attrMatch[1]] = attrMatch[2] !== undefined ? attrMatch[2] : '';
        }
      }

      const node: DomNode = {
        type: 'tag',
        name: tagName.toLowerCase(),
        attribs,
        children: [],
        parent: current,
        next: null,
        prev: null
      };

      // 형제 노드 연결
      const siblings = current.children || [];
      if (siblings.length > 0) {
        const prevNode = siblings[siblings.length - 1];
        prevNode.next = node;
        node.prev = prevNode;
      }

      if (!current.children) current.children = [];
      current.children.push(node);

      if (!selfClosing && !['br', 'hr', 'img', 'input', 'link', 'meta'].includes(tagName.toLowerCase())) {
        stack.push(node);
      }
    } else {
      // 텍스트 노드
      const textNode: DomNode = {
        type: 'text',
        data: chunk,
        parent: current,
        next: null,
        prev: null
      };
      if (!current.children) current.children = [];
      current.children.push(textNode);
    }
  }

  return root;
}

// CSS 선택자 매칭 (기본 구현)
function matchesSelector(node: DomNode, selector: string): boolean {
  if (node.type !== 'tag') return false;
  const s = selector.trim();

  // 태그명
  if (/^[a-z][a-z0-9]*$/i.test(s)) {
    return node.name === s.toLowerCase();
  }
  // #id
  if (s.startsWith('#')) {
    return node.attribs?.['id'] === s.slice(1);
  }
  // .class
  if (s.startsWith('.')) {
    const cls = s.slice(1);
    const classes = (node.attribs?.['class'] || '').split(/\s+/);
    return classes.includes(cls);
  }
  // [attr]
  if (s.startsWith('[') && s.endsWith(']')) {
    const attr = s.slice(1, -1);
    if (attr.includes('=')) {
      const [k, v] = attr.split('=');
      return node.attribs?.[k.trim()] === v.trim().replace(/['"]/g, '');
    }
    return k => node.attribs?.[attr] !== undefined;
  }
  return false;
}

function findAll(node: DomNode, selector: string): DomNode[] {
  const results: DomNode[] = [];

  function traverse(n: DomNode): void {
    if (matchesSelector(n, selector)) results.push(n);
    if (n.children) n.children.forEach(traverse);
  }

  if (node.children) node.children.forEach(traverse);
  return results;
}

function getNodeText(node: DomNode): string {
  if (node.type === 'text') return node.data || '';
  if (node.children) return node.children.map(getNodeText).join('');
  return '';
}

function getNodeHtml(node: DomNode): string {
  if (node.type === 'text') return node.data || '';
  if (node.type !== 'tag') return '';

  const attrs = Object.entries(node.attribs || {})
    .map(([k, v]) => v ? `${k}="${v}"` : k)
    .join(' ');
  const attrStr = attrs ? ' ' + attrs : '';
  const inner = (node.children || []).map(getNodeHtml).join('');
  return `<${node.name}${attrStr}>${inner}</${node.name}>`;
}

// 노드 저장소
const domStore = new Map<string, DomNode>();
let domIdCounter = 0;

function storeDom(node: DomNode): string {
  const id = `dom_${++domIdCounter}`;
  domStore.set(id, node);
  return id;
}

function nodeToRef(node: DomNode): any {
  const id = storeDom(node);
  return { _domId: id, tagName: node.name, text: getNodeText(node) };
}

function resolveNode(ref: any): DomNode | null {
  if (!ref) return null;
  if (ref._domId) return domStore.get(ref._domId) || null;
  return null;
}

export function registerCheeriofunctions(registry: NativeFunctionRegistry): void {
  // cheerio_load(html, xml, decodeEntities) -> root
  registry.register({
    name: 'cheerio_load',
    module: 'cheerio',
    executor: (args: any[]) => {
      const html = String(args[0] || '');
      const root = parseHtml(html);
      return nodeToRef(root);
    }
  });

  // cheerio_find(root, selector) -> array
  registry.register({
    name: 'cheerio_find',
    module: 'cheerio',
    executor: (args: any[]) => {
      const rootRef = args[0];
      const selector = String(args[1] || '');
      const root = resolveNode(rootRef);
      if (!root) return [];

      // 복합 선택자 처리 (공백으로 구분된 계층)
      const parts = selector.trim().split(/\s+/);
      if (parts.length === 1) {
        return findAll(root, selector).map(nodeToRef);
      }

      // 간단한 계층 선택자
      let nodes = findAll(root, parts[0]);
      for (let i = 1; i < parts.length; i++) {
        const nextPart = parts[i];
        const nextNodes: DomNode[] = [];
        for (const node of nodes) {
          nextNodes.push(...findAll(node, nextPart));
        }
        nodes = nextNodes;
      }
      return nodes.map(nodeToRef);
    }
  });

  // cheerio_text(el) -> string
  registry.register({
    name: 'cheerio_text',
    module: 'cheerio',
    executor: (args: any[]) => {
      const elRef = args[0];
      if (Array.isArray(elRef)) {
        return elRef.map((r: any) => {
          const node = resolveNode(r);
          return node ? getNodeText(node) : '';
        }).join('');
      }
      const node = resolveNode(elRef);
      return node ? getNodeText(node) : '';
    }
  });

  // cheerio_html(el) -> string
  registry.register({
    name: 'cheerio_html',
    module: 'cheerio',
    executor: (args: any[]) => {
      const elRef = args[0];
      const node = resolveNode(elRef);
      if (!node) return '';
      return (node.children || []).map(getNodeHtml).join('');
    }
  });

  // cheerio_inner_html(el) -> string
  registry.register({
    name: 'cheerio_inner_html',
    module: 'cheerio',
    executor: (args: any[]) => {
      const elRef = args[0];
      const node = resolveNode(elRef);
      if (!node) return '';
      return (node.children || []).map(getNodeHtml).join('');
    }
  });

  // cheerio_outer_html(el) -> string
  registry.register({
    name: 'cheerio_outer_html',
    module: 'cheerio',
    executor: (args: any[]) => {
      const elRef = args[0];
      const node = resolveNode(elRef);
      return node ? getNodeHtml(node) : '';
    }
  });

  // cheerio_attr(el, name) -> string
  registry.register({
    name: 'cheerio_attr',
    module: 'cheerio',
    executor: (args: any[]) => {
      const elRef = args[0];
      const name = String(args[1] || '');
      const node = resolveNode(elRef);
      return node?.attribs?.[name] ?? null;
    }
  });

  // cheerio_add_class(el, cls) -> void
  registry.register({
    name: 'cheerio_add_class',
    module: 'cheerio',
    executor: (args: any[]) => {
      const elRef = args[0];
      const cls = String(args[1] || '');
      const node = resolveNode(elRef);
      if (node && node.attribs) {
        const current = node.attribs['class'] || '';
        const classes = current.split(/\s+/).filter(Boolean);
        if (!classes.includes(cls)) {
          node.attribs['class'] = [...classes, cls].join(' ');
        }
      }
      return null;
    }
  });

  // cheerio_remove_class(el, cls) -> void
  registry.register({
    name: 'cheerio_remove_class',
    module: 'cheerio',
    executor: (args: any[]) => {
      const elRef = args[0];
      const cls = String(args[1] || '');
      const node = resolveNode(elRef);
      if (node && node.attribs) {
        const current = node.attribs['class'] || '';
        node.attribs['class'] = current.split(/\s+/).filter((c) => c !== cls).join(' ');
      }
      return null;
    }
  });

  // cheerio_toggle_class(el, cls) -> void
  registry.register({
    name: 'cheerio_toggle_class',
    module: 'cheerio',
    executor: (args: any[]) => {
      const elRef = args[0];
      const cls = String(args[1] || '');
      const node = resolveNode(elRef);
      if (node && node.attribs) {
        const current = node.attribs['class'] || '';
        const classes = current.split(/\s+/).filter(Boolean);
        const idx = classes.indexOf(cls);
        if (idx === -1) classes.push(cls);
        else classes.splice(idx, 1);
        node.attribs['class'] = classes.join(' ');
      }
      return null;
    }
  });

  // cheerio_parent(el) -> el
  registry.register({
    name: 'cheerio_parent',
    module: 'cheerio',
    executor: (args: any[]) => {
      const elRef = args[0];
      const node = resolveNode(elRef);
      return node?.parent ? nodeToRef(node.parent) : null;
    }
  });

  // cheerio_children(el) -> array
  registry.register({
    name: 'cheerio_children',
    module: 'cheerio',
    executor: (args: any[]) => {
      const elRef = args[0];
      const node = resolveNode(elRef);
      return (node?.children || []).filter((c) => c.type === 'tag').map(nodeToRef);
    }
  });

  // cheerio_siblings(el) -> array
  registry.register({
    name: 'cheerio_siblings',
    module: 'cheerio',
    executor: (args: any[]) => {
      const elRef = args[0];
      const node = resolveNode(elRef);
      if (!node?.parent) return [];
      return (node.parent.children || [])
        .filter((c) => c !== node && c.type === 'tag')
        .map(nodeToRef);
    }
  });

  // cheerio_next(el) -> el
  registry.register({
    name: 'cheerio_next',
    module: 'cheerio',
    executor: (args: any[]) => {
      const elRef = args[0];
      const node = resolveNode(elRef);
      let next = node?.next;
      while (next && next.type !== 'tag') next = next.next || null;
      return next ? nodeToRef(next) : null;
    }
  });

  // cheerio_prev(el) -> el
  registry.register({
    name: 'cheerio_prev',
    module: 'cheerio',
    executor: (args: any[]) => {
      const elRef = args[0];
      const node = resolveNode(elRef);
      let prev = node?.prev;
      while (prev && prev.type !== 'tag') prev = prev.prev || null;
      return prev ? nodeToRef(prev) : null;
    }
  });

  // cheerio_closest(el, selector) -> el
  registry.register({
    name: 'cheerio_closest',
    module: 'cheerio',
    executor: (args: any[]) => {
      const elRef = args[0];
      const selector = String(args[1] || '');
      let node = resolveNode(elRef);
      while (node) {
        if (matchesSelector(node, selector)) return nodeToRef(node);
        node = node.parent || null;
      }
      return null;
    }
  });
}
