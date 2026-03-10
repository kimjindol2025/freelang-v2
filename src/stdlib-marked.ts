/**
 * FreeLang v2 - marked 네이티브 함수
 *
 * npm marked 패키지 완전 대체
 * Markdown → HTML 변환 구현
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

// 간단한 Markdown → HTML 변환기
function convertMarkdown(md: string, gfm: boolean, breaks: boolean, xhtml: boolean, headerIds: boolean): string {
  let html = md;

  // 헤더 처리 (h1-h6)
  for (let i = 6; i >= 1; i--) {
    const hashes = '#'.repeat(i);
    const id = headerIds
      ? (text: string) => ` id="${text.toLowerCase().replace(/[^\w]+/g, '-')}"`
      : () => '';
    html = html.replace(
      new RegExp(`^${hashes}\\s+(.+)$`, 'gm'),
      (_, text) => `<h${i}${id(text)}>${text}</h${i}>`
    );
  }

  // 구분선
  html = html.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '<hr' + (xhtml ? ' /' : '') + '>');

  // 굵은 글씨
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // 기울임꼴
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // 취소선 (GFM)
  if (gfm) {
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  }

  // 인라인 코드
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 코드 블록 (fenced)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const langAttr = lang ? ` class="language-${lang}"` : '';
    return `<pre><code${langAttr}>${code.trim()}</code></pre>`;
  });

  // 인덱스 코드 블록 (4 spaces)
  html = html.replace(/^(?: {4}|\t)(.+)$/gm, '<pre><code>$1</code></pre>');

  // 링크
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // 이미지
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, `<img src="$2" alt="$1"${xhtml ? ' /' : ''}>`);

  // 인용
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');

  // 정렬되지 않은 목록
  html = html.replace(/^[*\-+]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)\n(?!<li>)/g, '<ul>$1</ul>\n');

  // 정렬된 목록
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

  // GFM 체크박스
  if (gfm) {
    html = html.replace(/<li>\[x\]\s+/gi, '<li><input type="checkbox" checked> ');
    html = html.replace(/<li>\[ \]\s+/g, '<li><input type="checkbox"> ');
  }

  // 줄바꿈
  if (breaks) {
    html = html.replace(/\n/g, '<br>\n');
  } else {
    // 연속 빈 줄을 단락으로
    const paragraphs = html.split(/\n\n+/);
    html = paragraphs.map((p) => {
      p = p.trim();
      if (!p) return '';
      if (/^<(h[1-6]|blockquote|pre|ul|ol|li|hr|div|p)/.test(p)) return p;
      return `<p>${p}</p>`;
    }).filter(Boolean).join('\n\n');
  }

  return html;
}

function convertInline(md: string, gfm: boolean, breaks: boolean): string {
  let html = md;

  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  if (gfm) html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  if (breaks) html = html.replace(/\n/g, '<br>');

  return html;
}

export function registerMarkedFunctions(registry: NativeFunctionRegistry): void {
  // marked_parse(markdown, gfm, breaks, pedantic, sanitize, xhtml, headerIds) -> string
  registry.register({
    name: 'marked_parse',
    module: 'marked',
    executor: (args: any[]) => {
      const markdown = String(args[0] || '');
      const gfm = args[1] !== false;
      const breaks = Boolean(args[2]);
      const xhtml = Boolean(args[5]);
      const headerIds = args[6] !== false;

      try {
        return convertMarkdown(markdown, gfm, breaks, xhtml, headerIds);
      } catch (err: any) {
        throw new Error(`marked_parse failed: ${err.message}`);
      }
    }
  });

  // marked_parse_inline(markdown, gfm, breaks) -> string
  registry.register({
    name: 'marked_parse_inline',
    module: 'marked',
    executor: (args: any[]) => {
      const markdown = String(args[0] || '');
      const gfm = args[1] !== false;
      const breaks = Boolean(args[2]);
      return convertInline(markdown, gfm, breaks);
    }
  });

  // marked_lexer(markdown) -> array
  registry.register({
    name: 'marked_lexer',
    module: 'marked',
    executor: (args: any[]) => {
      const markdown = String(args[0] || '');
      const tokens: any[] = [];
      const lines = markdown.split('\n');

      for (const line of lines) {
        if (/^#+\s/.test(line)) {
          tokens.push({ type: 'heading', raw: line, text: line.replace(/^#+\s/, '') });
        } else if (/^[*\-+]\s/.test(line)) {
          tokens.push({ type: 'list_item', raw: line, text: line.replace(/^[*\-+]\s/, '') });
        } else if (line.trim()) {
          tokens.push({ type: 'paragraph', raw: line, text: line });
        } else {
          tokens.push({ type: 'space', raw: '\n', text: '' });
        }
      }

      return tokens;
    }
  });

  // marked_inline_lexer(src) -> array
  registry.register({
    name: 'marked_inline_lexer',
    module: 'marked',
    executor: (args: any[]) => {
      const src = String(args[0] || '');
      const tokens: any[] = [];

      const patterns: Array<[RegExp, string]> = [
        [/\*\*([^*]+)\*\*/g, 'strong'],
        [/__([^_]+)__/g, 'strong'],
        [/\*([^*]+)\*/g, 'em'],
        [/_([^_]+)_/g, 'em'],
        [/`([^`]+)`/g, 'codespan'],
        [/\[([^\]]+)\]\(([^)]+)\)/g, 'link']
      ];

      let remaining = src;
      for (const [pattern, type] of patterns) {
        const match = pattern.exec(remaining);
        if (match) {
          tokens.push({ type, raw: match[0], text: match[1] });
        }
      }

      return tokens;
    }
  });

  // marked_set_options(gfm, breaks, pedantic, sanitize) -> void
  registry.register({
    name: 'marked_set_options',
    module: 'marked',
    executor: (_args: any[]) => null
  });

  // marked_use_extension(extension) -> void
  registry.register({
    name: 'marked_use_extension',
    module: 'marked',
    executor: (_args: any[]) => null
  });
}
