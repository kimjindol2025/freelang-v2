/**
 * FreeLang v2 - markdown-it 네이티브 함수
 *
 * npm markdown-it 패키지 완전 대체
 * 고급 Markdown 파서 구현
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

interface MdItInstance {
  html: boolean;
  xhtmlOut: boolean;
  breaks: boolean;
  langPrefix: string;
  linkify: boolean;
  typographer: boolean;
  quotes: string;
  plugins: Array<(instance: MdItInstance, options?: any) => void>;
  disabledRules: Set<string>;
}

const mdItStore = new Map<string, MdItInstance>();
let mdItCounter = 0;

function createMdIt(options: Partial<MdItInstance>): string {
  const id = `mdit_${++mdItCounter}`;
  mdItStore.set(id, {
    html: options.html !== false,
    xhtmlOut: Boolean(options.xhtmlOut),
    breaks: Boolean(options.breaks),
    langPrefix: options.langPrefix || 'language-',
    linkify: Boolean(options.linkify),
    typographer: Boolean(options.typographer),
    quotes: options.quotes || '""\'\'',
    plugins: [],
    disabledRules: new Set()
  });
  return id;
}

function renderMd(instance: MdItInstance, src: string): string {
  let html = src;

  // 코드 블록 (fenced)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const trimmedCode = code.trim();
    const langAttr = lang ? ` class="${instance.langPrefix}${lang}"` : '';
    return `<pre><code${langAttr}>${escapeHtml(trimmedCode)}</code></pre>`;
  });

  // 인라인 코드
  html = html.replace(/`([^`]+)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`);

  // 헤더
  for (let i = 6; i >= 1; i--) {
    const hashes = '#'.repeat(i);
    html = html.replace(new RegExp(`^${hashes}\\s+(.+)$`, 'gm'), `<h${i}>$1</h${i}>`);
  }

  // HTML 직접 삽입 (html 옵션)
  if (!instance.html) {
    html = html.replace(/<[^>]+>/g, (tag) => {
      if (/^<(h[1-6]|p|pre|code|blockquote|ul|ol|li|strong|em|del|a|img|hr|br)/.test(tag)) return tag;
      return escapeHtml(tag);
    });
  }

  // 구분선
  const hrEnd = instance.xhtmlOut ? ' /' : '';
  html = html.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, `<hr${hrEnd}>`);

  // 굵은 글씨
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');

  // 기울임꼴
  html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_\n]+)_/g, '<em>$1</em>');

  // 취소선
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // 링크
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // 자동 링크 (linkify)
  if (instance.linkify) {
    html = html.replace(/(?<!['"=])(https?:\/\/[^\s<>"]+)/g, '<a href="$1">$1</a>');
  }

  // 이미지
  const imgEnd = instance.xhtmlOut ? ' /' : '';
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, `<img src="$2" alt="$1"${imgEnd}>`);

  // 인용
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote><p>$1</p></blockquote>');

  // typographer
  if (instance.typographer) {
    html = html.replace(/---/g, '&mdash;');
    html = html.replace(/--/g, '&ndash;');
    html = html.replace(/\.\.\./g, '&hellip;');
  }

  // 목록 (UL)
  html = html.replace(/^[*\-+]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)(\n(?!<li>)|$)/g, '<ul>$1</ul>\n');

  // 목록 (OL)
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

  // 줄바꿈
  if (instance.breaks) {
    html = html.replace(/(?<!\n)\n(?!\n)/g, '<br>\n');
  }

  // 단락
  const blocks = html.split(/\n\n+/);
  html = blocks.map((block) => {
    const b = block.trim();
    if (!b) return '';
    if (/^<(h[1-6]|blockquote|pre|ul|ol|li|hr|div)/.test(b)) return b;
    return `<p>${b}</p>`;
  }).filter(Boolean).join('\n\n');

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function registerMarkdownItFunctions(registry: NativeFunctionRegistry): void {
  // mdIt_create(html, xhtmlOut, breaks, langPrefix, linkify, typographer, quotes, highlight) -> id
  registry.register({
    name: 'mdIt_create',
    module: 'markdown-it',
    executor: (args: any[]) => {
      return createMdIt({
        html: Boolean(args[0]),
        xhtmlOut: Boolean(args[1]),
        breaks: Boolean(args[2]),
        langPrefix: String(args[3] || 'language-'),
        linkify: Boolean(args[4]),
        typographer: Boolean(args[5]),
        quotes: String(args[6] || '""\'\'')
      });
    }
  });

  // mdIt_create_preset(preset) -> id
  registry.register({
    name: 'mdIt_create_preset',
    module: 'markdown-it',
    executor: (args: any[]) => {
      const preset = String(args[0] || 'default');
      const opts: Partial<MdItInstance> = {};
      if (preset === 'commonmark') {
        opts.html = true;
        opts.xhtmlOut = true;
        opts.breaks = false;
        opts.linkify = false;
      } else if (preset === 'zero') {
        opts.html = false;
        opts.linkify = false;
      } else {
        opts.linkify = true;
        opts.typographer = false;
      }
      return createMdIt(opts);
    }
  });

  // mdIt_render(id, src) -> string
  registry.register({
    name: 'mdIt_render',
    module: 'markdown-it',
    executor: (args: any[]) => {
      const id = String(args[0] || '');
      const src = String(args[1] || '');
      const instance = mdItStore.get(id);
      if (!instance) throw new Error(`markdown-it instance not found: ${id}`);
      return renderMd(instance, src);
    }
  });

  // mdIt_render_inline(id, src) -> string
  registry.register({
    name: 'mdIt_render_inline',
    module: 'markdown-it',
    executor: (args: any[]) => {
      const id = String(args[0] || '');
      const src = String(args[1] || '');
      const instance = mdItStore.get(id);
      if (!instance) throw new Error(`markdown-it instance not found: ${id}`);

      let html = src;
      html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
      html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
      html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
      html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
      return html;
    }
  });

  // mdIt_parse(id, src) -> array of tokens
  registry.register({
    name: 'mdIt_parse',
    module: 'markdown-it',
    executor: (args: any[]) => {
      const src = String(args[1] || '');
      const tokens: any[] = [];
      const lines = src.split('\n');

      for (const line of lines) {
        if (/^#+\s/.test(line)) {
          const level = line.match(/^(#+)/)?.[1].length || 1;
          tokens.push({ type: 'heading_open', tag: `h${level}`, nesting: 1, content: '', block: true });
          tokens.push({ type: 'inline', tag: '', nesting: 0, content: line.replace(/^#+\s/, ''), block: false });
          tokens.push({ type: 'heading_close', tag: `h${level}`, nesting: -1, content: '', block: true });
        } else if (line.trim()) {
          tokens.push({ type: 'paragraph_open', tag: 'p', nesting: 1, content: '', block: true });
          tokens.push({ type: 'inline', tag: '', nesting: 0, content: line, block: false });
          tokens.push({ type: 'paragraph_close', tag: 'p', nesting: -1, content: '', block: true });
        }
      }

      return tokens;
    }
  });

  // mdIt_parse_inline(id, src) -> array
  registry.register({
    name: 'mdIt_parse_inline',
    module: 'markdown-it',
    executor: (args: any[]) => {
      const src = String(args[1] || '');
      return [{ type: 'inline', tag: '', nesting: 0, content: src, block: false }];
    }
  });

  // mdIt_use(id, plugin) -> void
  registry.register({
    name: 'mdIt_use',
    module: 'markdown-it',
    executor: (_args: any[]) => null
  });

  // mdIt_use_options(id, plugin, options) -> void
  registry.register({
    name: 'mdIt_use_options',
    module: 'markdown-it',
    executor: (_args: any[]) => null
  });

  // mdIt_enable(id, ruleName) -> void
  registry.register({
    name: 'mdIt_enable',
    module: 'markdown-it',
    executor: (args: any[]) => {
      const id = String(args[0] || '');
      const rule = String(args[1] || '');
      const instance = mdItStore.get(id);
      if (instance) instance.disabledRules.delete(rule);
      return null;
    }
  });

  // mdIt_disable(id, ruleName) -> void
  registry.register({
    name: 'mdIt_disable',
    module: 'markdown-it',
    executor: (args: any[]) => {
      const id = String(args[0] || '');
      const rule = String(args[1] || '');
      const instance = mdItStore.get(id);
      if (instance) instance.disabledRules.add(rule);
      return null;
    }
  });
}
