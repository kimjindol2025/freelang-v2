/**
 * FreeLang v2 - Team B 문자열 & 수학 확장 함수 (35개 라이브러리)
 *
 * 담당: Text Diff, Search, Markdown, HTML Parser, Template
 *       Printf, Levenshtein, ANSI Strip, Word Break, Complex
 *       Fraction, Matrix, Linear Algebra, Statistics, Probability
 *       Interpolation, FFT, BigInt, Decimal, Polynomial
 *       Prime, Random Distribution, Geometry, Combinatorics, CSV Parser
 *       JSON Query, GroupBy, Aggregate, Distinct, Sort
 *       Filter Chain, Stream Process, Text Wrap, Word Frequency, String Utils
 *
 * 총 120개+ 함수 구현
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

/**
 * Team B 함수 등록
 */
export function registerTeamBFunctions(registry: NativeFunctionRegistry): void {
  // ════════════════════════════════════════════════════════════════
  // 섹션 1: Text Diff (텍스트 비교 - 5개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'text_diff',
    module: 'text-diff',
    executor: (args) => {
      const [old, newStr] = args;
      const oldLines = String(old).split('\n');
      const newLines = String(newStr).split('\n');
      const diffs: any[] = [];

      // 간단한 Levenshtein 기반 diff
      const maxLen = Math.max(oldLines.length, newLines.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < oldLines.length && i < newLines.length) {
          if (oldLines[i] !== newLines[i]) {
            diffs.push({ type: 'change', old: oldLines[i], new: newLines[i], line: i });
          }
        } else if (i >= newLines.length) {
          diffs.push({ type: 'delete', line: i, content: oldLines[i] });
        } else {
          diffs.push({ type: 'add', line: i, content: newLines[i] });
        }
      }
      return diffs;
    }
  });

  registry.register({
    name: 'text_patch',
    module: 'text-diff',
    executor: (args) => {
      const [original, diffs] = args;
      let result = String(original);

      if (!Array.isArray(diffs)) return result;

      diffs.sort((a: any, b: any) => (b.line || 0) - (a.line || 0));
      diffs.forEach((diff: any) => {
        if (diff.type === 'delete') {
          const lines = result.split('\n');
          if (diff.line < lines.length) lines.splice(diff.line, 1);
          result = lines.join('\n');
        }
      });

      return result;
    }
  });

  registry.register({
    name: 'text_similarity',
    module: 'text-diff',
    executor: (args) => {
      const [str1, str2] = args;
      const s1 = String(str1).toLowerCase();
      const s2 = String(str2).toLowerCase();

      let matches = 0;
      const minLen = Math.min(s1.length, s2.length);
      for (let i = 0; i < minLen; i++) {
        if (s1[i] === s2[i]) matches++;
      }

      const maxLen = Math.max(s1.length, s2.length);
      return maxLen > 0 ? matches / maxLen : 0;
    }
  });

  registry.register({
    name: 'text_diff_hunks',
    module: 'text-diff',
    executor: (args) => {
      const [old, newStr] = args;
      const oldLines = String(old).split('\n');
      const newLines = String(newStr).split('\n');

      // 3줄 context window로 hunks 생성
      const hunks: any[] = [];
      let inHunk = false;
      let hunkStart = -1;

      for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
        if (oldLines[i] !== newLines[i]) {
          if (!inHunk) {
            hunkStart = Math.max(0, i - 3);
            inHunk = true;
          }
        } else if (inHunk && i - hunkStart > 6) {
          hunks.push({ start: hunkStart, end: i });
          inHunk = false;
        }
      }

      if (inHunk) hunks.push({ start: hunkStart, end: Math.max(oldLines.length, newLines.length) });
      return hunks;
    }
  });

  registry.register({
    name: 'text_merge',
    module: 'text-diff',
    executor: (args) => {
      const [base, theirs, ours] = args;
      // 3-way merge: conflict 감지
      const baseLn = String(base).split('\n');
      const theirsLn = String(theirs).split('\n');
      const oursLn = String(ours).split('\n');

      const result: string[] = [];
      const maxLen = Math.max(baseLn.length, theirsLn.length, oursLn.length);

      for (let i = 0; i < maxLen; i++) {
        const b = baseLn[i] || '';
        const t = theirsLn[i] || '';
        const o = oursLn[i] || '';

        if (t === o) {
          result.push(t);
        } else if (t === b) {
          result.push(o);
        } else if (o === b) {
          result.push(t);
        } else {
          result.push(`<<<<<<< HEAD\n${o}\n=======\n${t}\n>>>>>>>`);
        }
      }

      return result.join('\n');
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 2: Text Search (텍스트 검색 - 5개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'text_search',
    module: 'text-search',
    executor: (args) => {
      const [text, pattern] = args;
      const txt = String(text);
      const pat = String(pattern);
      const results: number[] = [];

      let idx = 0;
      while ((idx = txt.indexOf(pat, idx)) !== -1) {
        results.push(idx);
        idx += pat.length;
      }

      return results;
    }
  });

  registry.register({
    name: 'text_search_regex',
    module: 'text-search',
    executor: (args) => {
      const [text, pattern] = args;
      try {
        const regex = new RegExp(String(pattern), 'g');
        const matches: any[] = [];
        let match;
        while ((match = regex.exec(String(text))) !== null) {
          matches.push({ index: match.index, text: match[0], groups: match.slice(1) });
        }
        return matches;
      } catch (e) {
        return [];
      }
    }
  });

  registry.register({
    name: 'text_search_kmp',
    module: 'text-search',
    executor: (args) => {
      const [text, pattern] = args;
      const txt = String(text);
      const pat = String(pattern);

      // KMP 알고리즘 구현
      const buildLPS = (p: string) => {
        const lps = Array(p.length).fill(0);
        let len = 0;
        let i = 1;
        while (i < p.length) {
          if (p[i] === p[len]) {
            lps[i++] = ++len;
          } else if (len !== 0) {
            len = lps[len - 1];
          } else {
            lps[i++] = 0;
          }
        }
        return lps;
      };

      const lps = buildLPS(pat);
      const results: number[] = [];
      let i = 0, j = 0;

      while (i < txt.length) {
        if (pat[j] === txt[i]) {
          i++;
          j++;
        }
        if (j === pat.length) {
          results.push(i - j);
          j = lps[j - 1];
        } else if (i < txt.length && pat[j] !== txt[i]) {
          if (j !== 0) {
            j = lps[j - 1];
          } else {
            i++;
          }
        }
      }

      return results;
    }
  });

  registry.register({
    name: 'text_search_fuzzy',
    module: 'text-search',
    executor: (args) => {
      const [text, pattern] = args;
      const txt = String(text).toLowerCase();
      const pat = String(pattern).toLowerCase();

      let patIdx = 0;
      let score = 0;

      for (let i = 0; i < txt.length && patIdx < pat.length; i++) {
        if (txt[i] === pat[patIdx]) {
          score += 10;
          patIdx++;
        }
      }

      return patIdx === pat.length ? score : -1;
    }
  });

  registry.register({
    name: 'text_search_bm',
    module: 'text-search',
    executor: (args) => {
      const [text, pattern] = args;
      const txt = String(text);
      const pat = String(pattern);

      // Boyer-Moore 간단 구현
      const badCharTable: Record<string, number> = {};
      for (let i = 0; i < pat.length - 1; i++) {
        badCharTable[pat[i]] = pat.length - 1 - i;
      }

      const results: number[] = [];
      let i = 0;

      while (i <= txt.length - pat.length) {
        let j = pat.length - 1;
        while (j >= 0 && txt[i + j] === pat[j]) j--;

        if (j < 0) {
          results.push(i);
          i += pat.length;
        } else {
          const shift = badCharTable[txt[i + j]] || pat.length;
          i += Math.max(1, shift);
        }
      }

      return results;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 3: Markdown (마크다운 - 5개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'markdown_parse',
    module: 'markdown',
    executor: (args) => {
      const md = String(args[0]);
      const lines = md.split('\n');
      const ast: any[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('# ')) {
          ast.push({ type: 'h1', text: line.substring(2) });
        } else if (line.startsWith('## ')) {
          ast.push({ type: 'h2', text: line.substring(3) });
        } else if (line.startsWith('### ')) {
          ast.push({ type: 'h3', text: line.substring(4) });
        } else if (line.startsWith('- ')) {
          ast.push({ type: 'li', text: line.substring(2) });
        } else if (line.startsWith('* ')) {
          ast.push({ type: 'li', text: line.substring(2) });
        } else if (line.match(/^\d+\. /)) {
          ast.push({ type: 'ol', text: line.substring(line.indexOf(' ') + 1) });
        } else if (line.trim() === '') {
          ast.push({ type: 'br' });
        } else if (line.startsWith('> ')) {
          ast.push({ type: 'blockquote', text: line.substring(2) });
        } else if (line.trim()) {
          ast.push({ type: 'p', text: line });
        }
      }

      return ast;
    }
  });

  registry.register({
    name: 'markdown_render',
    module: 'markdown',
    executor: (args) => {
      const ast = args[0];
      if (!Array.isArray(ast)) return '';

      const html = ast.map((node: any) => {
        switch (node.type) {
          case 'h1': return `<h1>${node.text}</h1>`;
          case 'h2': return `<h2>${node.text}</h2>`;
          case 'h3': return `<h3>${node.text}</h3>`;
          case 'li': return `<li>${node.text}</li>`;
          case 'ol': return `<ol><li>${node.text}</li></ol>`;
          case 'p': return `<p>${node.text}</p>`;
          case 'blockquote': return `<blockquote>${node.text}</blockquote>`;
          case 'br': return '<br>';
          default: return '';
        }
      }).join('\n');

      return html;
    }
  });

  registry.register({
    name: 'markdown_validate',
    module: 'markdown',
    executor: (args) => {
      const md = String(args[0]);
      const issues: any[] = [];

      // 기본 유효성 검사
      const openCode = (md.match(/```/g) || []).length;
      if (openCode % 2 !== 0) {
        issues.push({ line: -1, issue: 'Unclosed code block' });
      }

      const brackets = (md.match(/\[/g) || []).length;
      const closeBrackets = (md.match(/\]/g) || []).length;
      if (brackets !== closeBrackets) {
        issues.push({ line: -1, issue: 'Mismatched brackets' });
      }

      return { valid: issues.length === 0, issues };
    }
  });

  registry.register({
    name: 'markdown_toc',
    module: 'markdown',
    executor: (args) => {
      const md = String(args[0]);
      const lines = md.split('\n');
      const toc: any[] = [];

      lines.forEach((line, idx) => {
        if (line.startsWith('#')) {
          const level = line.match(/^#+/)[0].length;
          const text = line.substring(level).trim();
          toc.push({ level, text, line: idx });
        }
      });

      return toc;
    }
  });

  registry.register({
    name: 'markdown_extract_links',
    module: 'markdown',
    executor: (args) => {
      const md = String(args[0]);
      const links: any[] = [];

      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      while ((match = linkRegex.exec(md)) !== null) {
        links.push({ text: match[1], url: match[2] });
      }

      return links;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 4: HTML Parser (HTML 파싱 - 5개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'html_parse',
    module: 'html-parser',
    executor: (args) => {
      const html = String(args[0]);
      const ast: any[] = [];

      const tagRegex = /<([^>]+)>/g;
      let lastEnd = 0;
      let match;

      while ((match = tagRegex.exec(html)) !== null) {
        if (match.index > lastEnd) {
          const text = html.substring(lastEnd, match.index).trim();
          if (text) ast.push({ type: 'text', content: text });
        }

        const tagContent = match[1];
        if (tagContent.startsWith('/')) {
          ast.push({ type: 'close', tag: tagContent.substring(1).split(/\s/)[0] });
        } else {
          const [tag, ...attrs] = tagContent.split(/\s+/);
          ast.push({ type: 'open', tag, attrs });
        }

        lastEnd = match.index + match[0].length;
      }

      if (lastEnd < html.length) {
        const text = html.substring(lastEnd).trim();
        if (text) ast.push({ type: 'text', content: text });
      }

      return ast;
    }
  });

  registry.register({
    name: 'html_select',
    module: 'html-parser',
    executor: (args) => {
      const [ast, selector] = args;
      if (!Array.isArray(ast)) return [];

      const sel = String(selector);
      const results: any[] = [];

      ast.forEach((node: any) => {
        if (node.type === 'open' && node.tag === sel) {
          results.push(node);
        }
      });

      return results;
    }
  });

  registry.register({
    name: 'html_extract_text',
    module: 'html-parser',
    executor: (args) => {
      const ast = args[0];
      if (!Array.isArray(ast)) return '';

      return ast
        .filter((node: any) => node.type === 'text')
        .map((node: any) => node.content)
        .join(' ');
    }
  });

  registry.register({
    name: 'html_extract_attrs',
    module: 'html-parser',
    executor: (args) => {
      const node = args[0];
      const attrs: Record<string, any> = {};

      if (node && node.attrs && Array.isArray(node.attrs)) {
        node.attrs.forEach((attr: string) => {
          const [key, val] = attr.split('=');
          attrs[key] = val ? val.replace(/["']/g, '') : '';
        });
      }

      return attrs;
    }
  });

  registry.register({
    name: 'html_prettify',
    module: 'html-parser',
    executor: (args) => {
      const html = String(args[0]);
      let result = '';
      let indent = 0;

      const lines = html.replace(/></g, '>\n<').split('\n');
      lines.forEach((line) => {
        if (line.startsWith('</')) indent--;
        result += '  '.repeat(Math.max(0, indent)) + line + '\n';
        if (line.startsWith('<') && !line.startsWith('</') && !line.endsWith('/>')) {
          indent++;
        }
      });

      return result;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 5: Template (템플릿 - 4개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'template_render',
    module: 'template',
    executor: (args) => {
      const [tmpl, data] = args;
      let result = String(tmpl);

      if (typeof data === 'object' && data !== null) {
        Object.entries(data).forEach(([key, value]) => {
          result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), String(value));
        });
      }

      return result;
    }
  });

  registry.register({
    name: 'template_compile',
    module: 'template',
    executor: (args) => {
      const tmpl = String(args[0]);

      // 변수 추출
      const vars = new Set<string>();
      const varRegex = /\{\{\s*([a-zA-Z_]\w*)\s*\}\}/g;
      let match;
      while ((match = varRegex.exec(tmpl)) !== null) {
        vars.add(match[1]);
      }

      return {
        template: tmpl,
        variables: Array.from(vars),
        compile: (data: any) => {
          let result = tmpl;
          vars.forEach((key) => {
            result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), String(data[key] || ''));
          });
          return result;
        }
      };
    }
  });

  registry.register({
    name: 'template_if',
    module: 'template',
    executor: (args) => {
      const [tmpl, condition] = args;
      const result = String(tmpl);

      // {{#if condition}}...{{/if}}
      const ifRegex = /\{\{#if\s+(.+?)\}\}([\s\S]*?)\{\{\/if\}\}/g;
      return result.replace(ifRegex, (match, cond, content) => {
        return condition ? content : '';
      });
    }
  });

  registry.register({
    name: 'template_loop',
    module: 'template',
    executor: (args) => {
      const [tmpl, items] = args;
      let result = String(tmpl);

      if (!Array.isArray(items)) return result;

      // {{#each items}}...{{/each}}
      const loopRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
      result = result.replace(loopRegex, (match, varName, content) => {
        return items.map((item: any) => {
          let itemResult = content;
          if (typeof item === 'object') {
            Object.entries(item).forEach(([key, value]) => {
              itemResult = itemResult.replace(new RegExp(`\\{\\{${varName}\\.${key}\\}\\}`, 'g'), String(value));
            });
          }
          return itemResult;
        }).join('');
      });

      return result;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 6: Printf (포맷팅 - 4개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'printf_format',
    module: 'printf',
    executor: (args) => {
      const format = String(args[0]);
      let result = format;

      for (let i = 1; i < args.length; i++) {
        result = result.replace('%d', String(Math.floor(args[i])))
          .replace('%f', String(parseFloat(args[i]).toFixed(2)))
          .replace('%s', String(args[i]))
          .replace('%x', Number(args[i]).toString(16))
          .replace('%o', Number(args[i]).toString(8));
      }

      return result;
    }
  });

  registry.register({
    name: 'printf_sprintf',
    module: 'printf',
    executor: (args) => {
      const format = String(args[0]);
      const values = args.slice(1);
      let result = format;

      let idx = 0;
      result = result.replace(/%[-#0 +]?(\d+)?(?:\.(\d+))?[hlL]?[diouxXeEfFgGaAcspn%]/g, () => {
        if (idx >= values.length) return '';
        return String(values[idx++]);
      });

      return result;
    }
  });

  registry.register({
    name: 'printf_pad',
    module: 'printf',
    executor: (args) => {
      const [text, width, char] = args;
      const str = String(text);
      const w = Number(width);
      const c = String(char || ' ')[0];

      if (str.length >= w) return str;
      return c.repeat(w - str.length) + str;
    }
  });

  registry.register({
    name: 'printf_format_number',
    module: 'printf',
    executor: (args) => {
      const [num, precision] = args;
      const n = Number(num);
      const p = Number(precision) || 0;

      return n.toFixed(p);
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 7: Levenshtein (편집거리 - 3개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'levenshtein_distance',
    module: 'levenshtein',
    executor: (args) => {
      const [s1, s2] = args;
      const str1 = String(s1);
      const str2 = String(s2);

      const dp: number[][] = Array(str1.length + 1)
        .fill(null)
        .map(() => Array(str2.length + 1).fill(0));

      for (let i = 0; i <= str1.length; i++) dp[i][0] = i;
      for (let j = 0; j <= str2.length; j++) dp[0][j] = j;

      for (let i = 1; i <= str1.length; i++) {
        for (let j = 1; j <= str2.length; j++) {
          if (str1[i - 1] === str2[j - 1]) {
            dp[i][j] = dp[i - 1][j - 1];
          } else {
            dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
          }
        }
      }

      return dp[str1.length][str2.length];
    }
  });

  registry.register({
    name: 'levenshtein_similarity',
    module: 'levenshtein',
    executor: (args) => {
      const [s1, s2] = args;
      const str1 = String(s1);
      const str2 = String(s2);

      const distance = (() => {
        const dp: number[][] = Array(str1.length + 1)
          .fill(null)
          .map(() => Array(str2.length + 1).fill(0));

        for (let i = 0; i <= str1.length; i++) dp[i][0] = i;
        for (let j = 0; j <= str2.length; j++) dp[0][j] = j;

        for (let i = 1; i <= str1.length; i++) {
          for (let j = 1; j <= str2.length; j++) {
            if (str1[i - 1] === str2[j - 1]) {
              dp[i][j] = dp[i - 1][j - 1];
            } else {
              dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
          }
        }
        return dp[str1.length][str2.length];
      })();

      const maxLen = Math.max(str1.length, str2.length);
      return maxLen > 0 ? 1 - distance / maxLen : 1;
    }
  });

  registry.register({
    name: 'levenshtein_suggestions',
    module: 'levenshtein',
    executor: (args) => {
      const [word, dictionary] = args;
      const w = String(word);

      if (!Array.isArray(dictionary)) return [];

      const distances = dictionary.map((dict: any) => {
        const dw = String(dict);
        let distance = 0;
        const dp: number[][] = Array(w.length + 1)
          .fill(null)
          .map(() => Array(dw.length + 1).fill(0));

        for (let i = 0; i <= w.length; i++) dp[i][0] = i;
        for (let j = 0; j <= dw.length; j++) dp[0][j] = j;

        for (let i = 1; i <= w.length; i++) {
          for (let j = 1; j <= dw.length; j++) {
            if (w[i - 1] === dw[j - 1]) {
              dp[i][j] = dp[i - 1][j - 1];
            } else {
              dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
          }
        }

        return { word: dict, distance: dp[w.length][dw.length] };
      });

      return distances.sort((a, b) => a.distance - b.distance).slice(0, 5);
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 8: ANSI Strip (ANSI 코드 제거 - 3개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'ansi_strip',
    module: 'ansi-strip',
    executor: (args) => {
      const text = String(args[0]);
      // ANSI 이스케이프 시퀀스 제거
      return text.replace(/\u001b\[[0-9;]*m/g, '');
    }
  });

  registry.register({
    name: 'ansi_codes',
    module: 'ansi-strip',
    executor: (args) => {
      const text = String(args[0]);
      const codes: string[] = [];

      const regex = /\u001b\[([0-9;]*m)/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        codes.push(match[0]);
      }

      return codes;
    }
  });

  registry.register({
    name: 'ansi_color',
    module: 'ansi-strip',
    executor: (args) => {
      const [text, color] = args;
      const txt = String(text);
      const col = String(color).toLowerCase();

      const colors: Record<string, string> = {
        red: '\u001b[31m',
        green: '\u001b[32m',
        yellow: '\u001b[33m',
        blue: '\u001b[34m',
        magenta: '\u001b[35m',
        cyan: '\u001b[36m',
        reset: '\u001b[0m'
      };

      return (colors[col] || '') + txt + colors['reset'];
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 9: Word Break (단어 분리 - 3개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'word_break',
    module: 'word-break',
    executor: (args) => {
      const text = String(args[0]);
      const width = Number(args[1]) || 80;

      const lines: string[] = [];
      const words = text.split(' ');
      let currentLine = '';

      words.forEach((word) => {
        if ((currentLine + ' ' + word).length <= width) {
          currentLine += (currentLine ? ' ' : '') + word;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      });

      if (currentLine) lines.push(currentLine);
      return lines;
    }
  });

  registry.register({
    name: 'word_wrap',
    module: 'word-break',
    executor: (args) => {
      const text = String(args[0]);
      const width = Number(args[1]) || 80;

      const lines: string[] = [];
      const words = text.split(' ');
      let currentLine = '';

      words.forEach((word) => {
        if ((currentLine + ' ' + word).length <= width) {
          currentLine += (currentLine ? ' ' : '') + word;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      });

      if (currentLine) lines.push(currentLine);
      return lines.join('\n');
    }
  });

  registry.register({
    name: 'word_hyphenate',
    module: 'word-break',
    executor: (args) => {
      const text = String(args[0]);
      const width = Number(args[1]) || 80;

      const lines: string[] = [];
      let remaining = text;

      while (remaining.length > 0) {
        if (remaining.length <= width) {
          lines.push(remaining);
          break;
        }

        let splitPoint = width;
        if (remaining[width] !== ' ') {
          const lastSpace = remaining.lastIndexOf(' ', width);
          if (lastSpace > 0) {
            splitPoint = lastSpace;
          }
        }

        lines.push(remaining.substring(0, splitPoint));
        remaining = remaining.substring(splitPoint + 1);
      }

      return lines.join('\n');
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 10: Complex Numbers (복소수 - 5개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'complex_new',
    module: 'complex',
    executor: (args) => {
      const [real, imag] = args;
      return { real: Number(real), imag: Number(imag) };
    }
  });

  registry.register({
    name: 'complex_add',
    module: 'complex',
    executor: (args) => {
      const [c1, c2] = args;
      if (!c1 || !c2) return null;
      return { real: c1.real + c2.real, imag: c1.imag + c2.imag };
    }
  });

  registry.register({
    name: 'complex_multiply',
    module: 'complex',
    executor: (args) => {
      const [c1, c2] = args;
      if (!c1 || !c2) return null;

      const real = c1.real * c2.real - c1.imag * c2.imag;
      const imag = c1.real * c2.imag + c1.imag * c2.real;
      return { real, imag };
    }
  });

  registry.register({
    name: 'complex_magnitude',
    module: 'complex',
    executor: (args) => {
      const c = args[0];
      if (!c) return 0;
      return Math.sqrt(c.real * c.real + c.imag * c.imag);
    }
  });

  registry.register({
    name: 'complex_conjugate',
    module: 'complex',
    executor: (args) => {
      const c = args[0];
      if (!c) return null;
      return { real: c.real, imag: -c.imag };
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 11: Fraction (분수 - 4개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'fraction_new',
    module: 'fraction',
    executor: (args) => {
      const [num, denom] = args;
      const n = Number(num);
      const d = Number(denom) || 1;

      const gcd = (a: number, b: number): number => {
        while (b !== 0) [a, b] = [b, a % b];
        return a;
      };

      const g = gcd(Math.abs(n), Math.abs(d));
      return { numerator: n / g, denominator: d / g };
    }
  });

  registry.register({
    name: 'fraction_add',
    module: 'fraction',
    executor: (args) => {
      const [f1, f2] = args;
      if (!f1 || !f2) return null;

      const num = f1.numerator * f2.denominator + f2.numerator * f1.denominator;
      const denom = f1.denominator * f2.denominator;

      const gcd = (a: number, b: number): number => {
        while (b !== 0) [a, b] = [b, a % b];
        return a;
      };

      const g = gcd(Math.abs(num), Math.abs(denom));
      return { numerator: num / g, denominator: denom / g };
    }
  });

  registry.register({
    name: 'fraction_simplify',
    module: 'fraction',
    executor: (args) => {
      const f = args[0];
      if (!f) return null;

      const gcd = (a: number, b: number): number => {
        while (b !== 0) [a, b] = [b, a % b];
        return a;
      };

      const g = gcd(Math.abs(f.numerator), Math.abs(f.denominator));
      return { numerator: f.numerator / g, denominator: f.denominator / g };
    }
  });

  registry.register({
    name: 'fraction_to_decimal',
    module: 'fraction',
    executor: (args) => {
      const f = args[0];
      if (!f) return 0;
      return f.numerator / f.denominator;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 12: Matrix (행렬 - 5개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'matrix_create',
    module: 'matrix',
    executor: (args) => {
      const [rows, cols, value] = args;
      const r = Number(rows);
      const c = Number(cols);
      const v = Number(value) || 0;

      return Array(r).fill(null).map(() => Array(c).fill(v));
    }
  });

  registry.register({
    name: 'matrix_multiply',
    module: 'matrix',
    executor: (args) => {
      const [a, b] = args;
      if (!Array.isArray(a) || !Array.isArray(b)) return null;

      const result: number[][] = [];
      for (let i = 0; i < a.length; i++) {
        result[i] = [];
        for (let j = 0; j < b[0].length; j++) {
          let sum = 0;
          for (let k = 0; k < b.length; k++) {
            sum += (a[i][k] || 0) * (b[k][j] || 0);
          }
          result[i][j] = sum;
        }
      }
      return result;
    }
  });

  registry.register({
    name: 'matrix_transpose',
    module: 'matrix',
    executor: (args) => {
      const m = args[0];
      if (!Array.isArray(m)) return null;

      const result: any[][] = [];
      for (let j = 0; j < (m[0]?.length || 0); j++) {
        result[j] = [];
        for (let i = 0; i < m.length; i++) {
          result[j][i] = m[i][j];
        }
      }
      return result;
    }
  });

  registry.register({
    name: 'matrix_determinant',
    module: 'matrix',
    executor: (args) => {
      const m = args[0];
      if (!Array.isArray(m) || m.length === 0) return 0;

      const n = m.length;
      if (n === 1) return m[0][0];
      if (n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];

      let det = 0;
      for (let j = 0; j < n; j++) {
        const minor: number[][] = m
          .slice(1)
          .map((row) => [...row.slice(0, j), ...row.slice(j + 1)]);

        const minorDet = (() => {
          if (minor.length === 1) return minor[0][0];
          return minor[0][0] * (minor[1]?.[1] || 0) - minor[0][1] * (minor[1]?.[0] || 0);
        })();

        det += (j % 2 === 0 ? 1 : -1) * m[0][j] * minorDet;
      }
      return det;
    }
  });

  registry.register({
    name: 'matrix_inverse',
    module: 'matrix',
    executor: (args) => {
      const m = args[0];
      if (!Array.isArray(m) || m.length !== m[0].length) return null;

      const n = m.length;
      if (n === 2) {
        const det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
        if (det === 0) return null;

        return [
          [m[1][1] / det, -m[0][1] / det],
          [-m[1][0] / det, m[0][0] / det]
        ];
      }

      // 간단한 가우스 소거법 (2x2만 완전 지원)
      return null;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 13: Linear Algebra (선형대수 - 4개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'linalg_dot_product',
    module: 'linear-algebra',
    executor: (args) => {
      const [a, b] = args;
      if (!Array.isArray(a) || !Array.isArray(b)) return 0;

      let sum = 0;
      for (let i = 0; i < Math.min(a.length, b.length); i++) {
        sum += (Number(a[i]) || 0) * (Number(b[i]) || 0);
      }
      return sum;
    }
  });

  registry.register({
    name: 'linalg_cross_product',
    module: 'linear-algebra',
    executor: (args) => {
      const [a, b] = args;
      if (!Array.isArray(a) || !Array.isArray(b) || a.length < 3 || b.length < 3) {
        return [0, 0, 0];
      }

      return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
      ];
    }
  });

  registry.register({
    name: 'linalg_norm',
    module: 'linear-algebra',
    executor: (args) => {
      const v = args[0];
      if (!Array.isArray(v)) return 0;

      let sum = 0;
      for (let i = 0; i < v.length; i++) {
        const n = Number(v[i]) || 0;
        sum += n * n;
      }
      return Math.sqrt(sum);
    }
  });

  registry.register({
    name: 'linalg_normalize',
    module: 'linear-algebra',
    executor: (args) => {
      const v = args[0];
      if (!Array.isArray(v)) return [];

      let sum = 0;
      for (let i = 0; i < v.length; i++) {
        const n = Number(v[i]) || 0;
        sum += n * n;
      }
      const norm = Math.sqrt(sum);

      if (norm === 0) return v;
      return v.map((x) => (Number(x) || 0) / norm);
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 14: Statistics (통계 - 6개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'stat_mean',
    module: 'statistics',
    executor: (args) => {
      const data = args[0];
      if (!Array.isArray(data) || data.length === 0) return 0;

      const sum = data.reduce((acc: number, x: any) => acc + (Number(x) || 0), 0);
      return sum / data.length;
    }
  });

  registry.register({
    name: 'stat_median',
    module: 'statistics',
    executor: (args) => {
      const data = args[0];
      if (!Array.isArray(data) || data.length === 0) return 0;

      const sorted = data.map((x: any) => Number(x) || 0).sort((a, b) => a - b);
      const n = sorted.length;
      if (n % 2 === 0) {
        return (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
      } else {
        return sorted[Math.floor(n / 2)];
      }
    }
  });

  registry.register({
    name: 'stat_variance',
    module: 'statistics',
    executor: (args) => {
      const data = args[0];
      if (!Array.isArray(data) || data.length === 0) return 0;

      const mean = data.reduce((acc: number, x: any) => acc + (Number(x) || 0), 0) / data.length;
      const variance = data.reduce((acc: number, x: any) => {
        const diff = (Number(x) || 0) - mean;
        return acc + diff * diff;
      }, 0) / data.length;

      return variance;
    }
  });

  registry.register({
    name: 'stat_stdev',
    module: 'statistics',
    executor: (args) => {
      const data = args[0];
      if (!Array.isArray(data) || data.length === 0) return 0;

      const mean = data.reduce((acc: number, x: any) => acc + (Number(x) || 0), 0) / data.length;
      const variance = data.reduce((acc: number, x: any) => {
        const diff = (Number(x) || 0) - mean;
        return acc + diff * diff;
      }, 0) / data.length;

      return Math.sqrt(variance);
    }
  });

  registry.register({
    name: 'stat_covariance',
    module: 'statistics',
    executor: (args) => {
      const [x, y] = args;
      if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length) return 0;

      const meanX = x.reduce((a: number, v: any) => a + (Number(v) || 0), 0) / x.length;
      const meanY = y.reduce((a: number, v: any) => a + (Number(v) || 0), 0) / y.length;

      let cov = 0;
      for (let i = 0; i < x.length; i++) {
        cov += ((Number(x[i]) || 0) - meanX) * ((Number(y[i]) || 0) - meanY);
      }

      return cov / x.length;
    }
  });

  registry.register({
    name: 'stat_correlation',
    module: 'statistics',
    executor: (args) => {
      const [x, y] = args;
      if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length) return 0;

      const meanX = x.reduce((a: number, v: any) => a + (Number(v) || 0), 0) / x.length;
      const meanY = y.reduce((a: number, v: any) => a + (Number(v) || 0), 0) / y.length;

      let cov = 0, varX = 0, varY = 0;
      for (let i = 0; i < x.length; i++) {
        const dX = (Number(x[i]) || 0) - meanX;
        const dY = (Number(y[i]) || 0) - meanY;
        cov += dX * dY;
        varX += dX * dX;
        varY += dY * dY;
      }

      if (varX === 0 || varY === 0) return 0;
      return cov / Math.sqrt(varX * varY);
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 15: Probability (확률 - 5개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'prob_normal_cdf',
    module: 'probability',
    executor: (args) => {
      const [x, mean, stdev] = args;
      const z = ((Number(x) || 0) - (Number(mean) || 0)) / (Number(stdev) || 1);

      // Approximation: Abramowitz & Stegun
      const a1 = 0.254829592;
      const a2 = -0.284496736;
      const a3 = 1.421413741;
      const a4 = -1.453152027;
      const a5 = 1.061405429;
      const p = 0.3275911;

      const sign = z < 0 ? -1 : 1;
      const absZ = Math.abs(z);
      const t = 1.0 / (1.0 + p * absZ);

      const t2 = t * t;
      const t3 = t2 * t;
      const t4 = t3 * t;
      const t5 = t4 * t;

      const y = 1.0 - (((((a5 * t5 + a4 * t4) + a3 * t3) + a2 * t2) + a1 * t) * Math.exp(-z * z));
      return 0.5 * (1.0 + sign * y);
    }
  });

  registry.register({
    name: 'prob_binomial',
    module: 'probability',
    executor: (args) => {
      const [n, k, p] = args;
      const trials = Number(n);
      const successes = Number(k);
      const prob = Number(p);

      // C(n,k) * p^k * (1-p)^(n-k)
      const comb = (() => {
        let result = 1;
        for (let i = 0; i < successes; i++) {
          result *= (trials - i) / (i + 1);
        }
        return result;
      })();

      return comb * Math.pow(prob, successes) * Math.pow(1 - prob, trials - successes);
    }
  });

  registry.register({
    name: 'prob_poisson',
    module: 'probability',
    executor: (args) => {
      const [k, lambda] = args;
      const events = Number(k);
      const rate = Number(lambda);

      // e^(-λ) * λ^k / k!
      const fact = (() => {
        let f = 1;
        for (let i = 2; i <= events; i++) f *= i;
        return f;
      })();

      return (Math.exp(-rate) * Math.pow(rate, events)) / fact;
    }
  });

  registry.register({
    name: 'prob_geometric',
    module: 'probability',
    executor: (args) => {
      const [k, p] = args;
      const trial = Number(k);
      const prob = Number(p);

      // (1-p)^(k-1) * p
      return Math.pow(1 - prob, trial - 1) * prob;
    }
  });

  registry.register({
    name: 'prob_exponential',
    module: 'probability',
    executor: (args) => {
      const [x, lambda] = args;
      const val = Number(x);
      const rate = Number(lambda);

      // λ * e^(-λx)
      return rate * Math.exp(-rate * val);
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 16: Interpolation (보간 - 3개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'interp_linear',
    module: 'interpolation',
    executor: (args) => {
      const [x0, y0, x1, y1, x] = args;
      const xVal = Number(x);
      const x0Val = Number(x0);
      const y0Val = Number(y0);
      const x1Val = Number(x1);
      const y1Val = Number(y1);

      if (x0Val === x1Val) return y0Val;

      const t = (xVal - x0Val) / (x1Val - x0Val);
      return y0Val + t * (y1Val - y0Val);
    }
  });

  registry.register({
    name: 'interp_lagrange',
    module: 'interpolation',
    executor: (args) => {
      const [points, x] = args;
      if (!Array.isArray(points) || points.length === 0) return 0;

      const xVal = Number(x);
      let result = 0;

      for (let i = 0; i < points.length; i++) {
        let term = points[i].y;
        for (let j = 0; j < points.length; j++) {
          if (i !== j) {
            term *= (xVal - points[j].x) / (points[i].x - points[j].x);
          }
        }
        result += term;
      }

      return result;
    }
  });

  registry.register({
    name: 'interp_spline',
    module: 'interpolation',
    executor: (args) => {
      const [points, x] = args;
      if (!Array.isArray(points) || points.length < 2) return 0;

      const xVal = Number(x);

      // 가장 가까운 두 점 찾기
      for (let i = 0; i < points.length - 1; i++) {
        if (xVal >= points[i].x && xVal <= points[i + 1].x) {
          const x0 = points[i].x;
          const y0 = points[i].y;
          const x1 = points[i + 1].x;
          const y1 = points[i + 1].y;

          const t = (xVal - x0) / (x1 - x0);
          return y0 + t * (y1 - y0);
        }
      }

      return points[points.length - 1].y;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 17: FFT (Fast Fourier Transform - 3개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'fft_magnitude',
    module: 'fft',
    executor: (args) => {
      const data = args[0];
      if (!Array.isArray(data)) return [];

      // 간단한 DFT 구현 (실제 FFT는 더 복잡함)
      const result: number[] = [];
      for (let k = 0; k < data.length; k++) {
        let real = 0, imag = 0;
        for (let n = 0; n < data.length; n++) {
          const angle = (-2 * Math.PI * k * n) / data.length;
          real += (Number(data[n]) || 0) * Math.cos(angle);
          imag += (Number(data[n]) || 0) * Math.sin(angle);
        }
        result.push(Math.sqrt(real * real + imag * imag) / data.length);
      }
      return result;
    }
  });

  registry.register({
    name: 'fft_phase',
    module: 'fft',
    executor: (args) => {
      const data = args[0];
      if (!Array.isArray(data)) return [];

      const result: number[] = [];
      for (let k = 0; k < data.length; k++) {
        let real = 0, imag = 0;
        for (let n = 0; n < data.length; n++) {
          const angle = (-2 * Math.PI * k * n) / data.length;
          real += (Number(data[n]) || 0) * Math.cos(angle);
          imag += (Number(data[n]) || 0) * Math.sin(angle);
        }
        result.push(Math.atan2(imag, real));
      }
      return result;
    }
  });

  registry.register({
    name: 'fft_power',
    module: 'fft',
    executor: (args) => {
      const data = args[0];
      if (!Array.isArray(data)) return [];

      const result: number[] = [];
      for (let k = 0; k < data.length; k++) {
        let real = 0, imag = 0;
        for (let n = 0; n < data.length; n++) {
          const angle = (-2 * Math.PI * k * n) / data.length;
          real += (Number(data[n]) || 0) * Math.cos(angle);
          imag += (Number(data[n]) || 0) * Math.sin(angle);
        }
        result.push((real * real + imag * imag) / (data.length * data.length));
      }
      return result;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 18: BigInt (큰 정수 - 4개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'bigint_add',
    module: 'bigint',
    executor: (args) => {
      try {
        const a = BigInt(args[0]);
        const b = BigInt(args[1]);
        return String(a + b);
      } catch {
        return '0';
      }
    }
  });

  registry.register({
    name: 'bigint_multiply',
    module: 'bigint',
    executor: (args) => {
      try {
        const a = BigInt(args[0]);
        const b = BigInt(args[1]);
        return String(a * b);
      } catch {
        return '0';
      }
    }
  });

  registry.register({
    name: 'bigint_power',
    module: 'bigint',
    executor: (args) => {
      try {
        const base = BigInt(args[0]);
        const exp = Number(args[1]);
        let result = BigInt(1);
        for (let i = 0; i < exp; i++) {
          result *= base;
        }
        return String(result);
      } catch {
        return '1';
      }
    }
  });

  registry.register({
    name: 'bigint_gcd',
    module: 'bigint',
    executor: (args) => {
      try {
        let a = BigInt(Math.abs(Number(args[0])));
        let b = BigInt(Math.abs(Number(args[1])));
        while (b !== BigInt(0)) {
          [a, b] = [b, a % b];
        }
        return String(a);
      } catch {
        return '1';
      }
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 19: Decimal (고정소수점 - 3개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'decimal_round',
    module: 'decimal',
    executor: (args) => {
      const [num, places] = args;
      const n = Number(num);
      const p = Number(places) || 0;

      const factor = Math.pow(10, p);
      return Math.round(n * factor) / factor;
    }
  });

  registry.register({
    name: 'decimal_truncate',
    module: 'decimal',
    executor: (args) => {
      const [num, places] = args;
      const n = Number(num);
      const p = Number(places) || 0;

      const factor = Math.pow(10, p);
      return Math.trunc(n * factor) / factor;
    }
  });

  registry.register({
    name: 'decimal_format',
    module: 'decimal',
    executor: (args) => {
      const [num, places] = args;
      const n = Number(num);
      const p = Number(places) || 2;

      return n.toLocaleString('en-US', { minimumFractionDigits: p, maximumFractionDigits: p });
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 20: Polynomial (다항식 - 3개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'poly_eval',
    module: 'polynomial',
    executor: (args) => {
      const [coeffs, x] = args;
      if (!Array.isArray(coeffs)) return 0;

      let result = 0;
      const xVal = Number(x);

      for (let i = 0; i < coeffs.length; i++) {
        result += (Number(coeffs[i]) || 0) * Math.pow(xVal, i);
      }

      return result;
    }
  });

  registry.register({
    name: 'poly_derivative',
    module: 'polynomial',
    executor: (args) => {
      const coeffs = args[0];
      if (!Array.isArray(coeffs) || coeffs.length < 2) return [0];

      const result: number[] = [];
      for (let i = 1; i < coeffs.length; i++) {
        result.push(i * (Number(coeffs[i]) || 0));
      }

      return result.length > 0 ? result : [0];
    }
  });

  registry.register({
    name: 'poly_integral',
    module: 'polynomial',
    executor: (args) => {
      const coeffs = args[0];
      if (!Array.isArray(coeffs)) return [0];

      const result: number[] = [0]; // constant term
      for (let i = 0; i < coeffs.length; i++) {
        result.push((Number(coeffs[i]) || 0) / (i + 1));
      }

      return result;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 21: Prime Numbers (소수 - 3개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'prime_is_prime',
    module: 'prime',
    executor: (args) => {
      const n = Math.floor(Number(args[0]));
      if (n < 2) return false;
      if (n === 2) return true;
      if (n % 2 === 0) return false;

      for (let i = 3; i * i <= n; i += 2) {
        if (n % i === 0) return false;
      }

      return true;
    }
  });

  registry.register({
    name: 'prime_next',
    module: 'prime',
    executor: (args) => {
      let n = Math.floor(Number(args[0])) + 1;

      while (true) {
        if (n < 2) {
          n = 2;
          break;
        }
        if (n === 2) break;
        if (n % 2 === 0) {
          n++;
          continue;
        }

        let isPrime = true;
        for (let i = 3; i * i <= n; i += 2) {
          if (n % i === 0) {
            isPrime = false;
            break;
          }
        }

        if (isPrime) break;
        n += 2;
      }

      return n;
    }
  });

  registry.register({
    name: 'prime_factors',
    module: 'prime',
    executor: (args) => {
      let n = Math.abs(Math.floor(Number(args[0])));
      const factors: number[] = [];

      for (let i = 2; i * i <= n; i++) {
        while (n % i === 0) {
          factors.push(i);
          n /= i;
        }
      }

      if (n > 1) factors.push(n);
      return factors;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 22: Random Distribution (확률분포 - 4개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'random_uniform',
    module: 'random-dist',
    executor: (args) => {
      const [min, max] = args;
      const minVal = Number(min) || 0;
      const maxVal = Number(max) || 1;

      return minVal + Math.random() * (maxVal - minVal);
    }
  });

  registry.register({
    name: 'random_normal',
    module: 'random-dist',
    executor: (args) => {
      const [mean, stdev] = args;
      const m = Number(mean) || 0;
      const s = Number(stdev) || 1;

      // Box-Muller transform
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

      return m + z * s;
    }
  });

  registry.register({
    name: 'random_exponential',
    module: 'random-dist',
    executor: (args) => {
      const lambda = Number(args[0]) || 1;
      return -Math.log(Math.random()) / lambda;
    }
  });

  registry.register({
    name: 'random_poisson',
    module: 'random-dist',
    executor: (args) => {
      const lambda = Number(args[0]) || 1;
      let L = Math.exp(-lambda);
      let k = 0;
      let p = 1;

      do {
        k++;
        p *= Math.random();
      } while (p > L);

      return k - 1;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 23: Geometry (기하 - 4개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'geom_distance',
    module: 'geometry',
    executor: (args) => {
      const [p1, p2] = args;
      if (!p1 || !p2) return 0;

      const dx = (p2.x || 0) - (p1.x || 0);
      const dy = (p2.y || 0) - (p1.y || 0);
      const dz = (p2.z || 0) - (p1.z || 0);

      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  });

  registry.register({
    name: 'geom_angle',
    module: 'geometry',
    executor: (args) => {
      const [v1, v2] = args;
      if (!Array.isArray(v1) || !Array.isArray(v2)) return 0;

      let dot = 0, mag1 = 0, mag2 = 0;
      for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
        const a = Number(v1[i]) || 0;
        const b = Number(v2[i]) || 0;
        dot += a * b;
        mag1 += a * a;
        mag2 += b * b;
      }

      if (mag1 === 0 || mag2 === 0) return 0;
      return Math.acos(dot / (Math.sqrt(mag1) * Math.sqrt(mag2)));
    }
  });

  registry.register({
    name: 'geom_area_triangle',
    module: 'geometry',
    executor: (args) => {
      const [p1, p2, p3] = args;
      if (!p1 || !p2 || !p3) return 0;

      const ax = (p2.x || 0) - (p1.x || 0);
      const ay = (p2.y || 0) - (p1.y || 0);
      const bx = (p3.x || 0) - (p1.x || 0);
      const by = (p3.y || 0) - (p1.y || 0);

      return Math.abs(ax * by - ay * bx) / 2;
    }
  });

  registry.register({
    name: 'geom_centroid',
    module: 'geometry',
    executor: (args) => {
      const points = args[0];
      if (!Array.isArray(points) || points.length === 0) return { x: 0, y: 0 };

      let sumX = 0, sumY = 0;
      points.forEach((p: any) => {
        sumX += p.x || 0;
        sumY += p.y || 0;
      });

      return { x: sumX / points.length, y: sumY / points.length };
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 24: Combinatorics (조합론 - 4개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'comb_permutation',
    module: 'combinatorics',
    executor: (args) => {
      const [n, k] = args;
      const nVal = Math.floor(Number(n));
      const kVal = Math.floor(Number(k));

      if (kVal > nVal) return 0;

      let result = 1;
      for (let i = 0; i < kVal; i++) {
        result *= (nVal - i);
      }

      return result;
    }
  });

  registry.register({
    name: 'comb_combination',
    module: 'combinatorics',
    executor: (args) => {
      const [n, k] = args;
      const nVal = Math.floor(Number(n));
      const kVal = Math.floor(Number(k));

      if (kVal > nVal) return 0;

      let numerator = 1;
      let denominator = 1;

      for (let i = 0; i < kVal; i++) {
        numerator *= (nVal - i);
        denominator *= (i + 1);
      }

      return numerator / denominator;
    }
  });

  registry.register({
    name: 'comb_catalan',
    module: 'combinatorics',
    executor: (args) => {
      const n = Math.floor(Number(args[0]));

      // C(2n, n) / (n+1)
      let numerator = 1;
      let denominator = 1;

      for (let i = 0; i < n; i++) {
        numerator *= (2 * n - i);
        denominator *= (i + 1);
      }

      return numerator / (denominator * (n + 1));
    }
  });

  registry.register({
    name: 'comb_derangement',
    module: 'combinatorics',
    executor: (args) => {
      const n = Math.floor(Number(args[0]));

      if (n === 0) return 1;
      if (n === 1) return 0;

      // !n = n! * sum((-1)^k / k!) for k=0 to n
      let fact = 1;
      for (let i = 2; i <= n; i++) fact *= i;

      let sum = 0;
      let factorial = 1;
      for (let k = 0; k <= n; k++) {
        sum += Math.pow(-1, k) / factorial;
        if (k < n) factorial *= (k + 1);
      }

      return Math.round(fact * sum);
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 25: CSV Parser (CSV 파싱 - 4개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'csv_parse',
    module: 'csv-parser',
    executor: (args) => {
      const csv = String(args[0]);
      const lines = csv.split('\n');
      const rows: any[] = [];

      lines.forEach((line) => {
        if (line.trim()) {
          const fields = line.split(',').map((f) => f.trim());
          rows.push(fields);
        }
      });

      return rows;
    }
  });

  registry.register({
    name: 'csv_parse_objects',
    module: 'csv-parser',
    executor: (args) => {
      const csv = String(args[0]);
      const lines = csv.split('\n').filter((l) => l.trim());
      if (lines.length < 1) return [];

      const headers = lines[0].split(',').map((h) => h.trim());
      const rows: Record<string, any>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const fields = lines[i].split(',').map((f) => f.trim());
        const obj: Record<string, any> = {};

        headers.forEach((header, idx) => {
          obj[header] = fields[idx];
        });

        rows.push(obj);
      }

      return rows;
    }
  });

  registry.register({
    name: 'csv_stringify',
    module: 'csv-parser',
    executor: (args) => {
      const rows = args[0];
      if (!Array.isArray(rows)) return '';

      return rows
        .map((row: any) => {
          if (Array.isArray(row)) {
            return row.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(',');
          } else if (typeof row === 'object') {
            return Object.values(row)
              .map((f) => `"${String(f).replace(/"/g, '""')}"`
              ).join(',');
          }
          return '';
        })
        .join('\n');
    }
  });

  registry.register({
    name: 'csv_filter',
    module: 'csv-parser',
    executor: (args) => {
      const [csv, column, value] = args;
      const rows = String(csv).split('\n').filter((l) => l.trim());
      if (rows.length < 1) return [];

      const headers = rows[0].split(',').map((h) => h.trim());
      const colIdx = headers.indexOf(String(column));

      if (colIdx === -1) return [];

      const result = [rows[0]];
      const filterVal = String(value);

      for (let i = 1; i < rows.length; i++) {
        const fields = rows[i].split(',');
        if (fields[colIdx]?.trim() === filterVal) {
          result.push(rows[i]);
        }
      }

      return result.join('\n');
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 26: JSON Query (JSON 쿼리 - 4개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'jq_select',
    module: 'json-query',
    executor: (args) => {
      const [data, path] = args;
      const p = String(path).split('.').filter((s) => s);

      let current = data;
      for (const key of p) {
        if (current && typeof current === 'object') {
          current = current[key];
        } else {
          return null;
        }
      }

      return current;
    }
  });

  registry.register({
    name: 'jq_filter',
    module: 'json-query',
    executor: (args) => {
      const [data, predicate] = args;
      if (!Array.isArray(data)) return [];

      const pred = String(predicate);
      return data.filter((item: any) => {
        if (typeof item === 'object' && item !== null) {
          return Object.values(item).some((v) => String(v).includes(pred));
        }
        return String(item).includes(pred);
      });
    }
  });

  registry.register({
    name: 'jq_map',
    module: 'json-query',
    executor: (args) => {
      const [data, key] = args;
      if (!Array.isArray(data)) return [];

      const k = String(key);
      return data.map((item: any) => {
        if (typeof item === 'object' && item !== null) {
          return item[k];
        }
        return null;
      });
    }
  });

  registry.register({
    name: 'jq_group',
    module: 'json-query',
    executor: (args) => {
      const [data, key] = args;
      if (!Array.isArray(data)) return {};

      const k = String(key);
      const groups: Record<string, any[]> = {};

      data.forEach((item: any) => {
        if (typeof item === 'object' && item !== null) {
          const groupKey = String(item[k] || 'undefined');
          if (!groups[groupKey]) groups[groupKey] = [];
          groups[groupKey].push(item);
        }
      });

      return groups;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 27: GroupBy (그룹화 - 4개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'groupby_group',
    module: 'groupby',
    executor: (args) => {
      const [items, keyFn] = args;
      if (!Array.isArray(items)) return {};

      const groups: Record<string, any[]> = {};
      items.forEach((item: any) => {
        const key = String(keyFn ? keyFn(item) : item);
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      });

      return groups;
    }
  });

  registry.register({
    name: 'groupby_count',
    module: 'groupby',
    executor: (args) => {
      const [items, key] = args;
      if (!Array.isArray(items)) return {};

      const k = String(key);
      const counts: Record<string, number> = {};

      items.forEach((item: any) => {
        if (typeof item === 'object' && item !== null) {
          const groupKey = String(item[k] || 'undefined');
          counts[groupKey] = (counts[groupKey] || 0) + 1;
        }
      });

      return counts;
    }
  });

  registry.register({
    name: 'groupby_sum',
    module: 'groupby',
    executor: (args) => {
      const [items, groupKey, sumKey] = args;
      if (!Array.isArray(items)) return {};

      const gk = String(groupKey);
      const sk = String(sumKey);
      const sums: Record<string, number> = {};

      items.forEach((item: any) => {
        if (typeof item === 'object' && item !== null) {
          const key = String(item[gk] || 'undefined');
          const val = Number(item[sk]) || 0;
          sums[key] = (sums[key] || 0) + val;
        }
      });

      return sums;
    }
  });

  registry.register({
    name: 'groupby_avg',
    module: 'groupby',
    executor: (args) => {
      const [items, groupKey, avgKey] = args;
      if (!Array.isArray(items)) return {};

      const gk = String(groupKey);
      const ak = String(avgKey);
      const sums: Record<string, number> = {};
      const counts: Record<string, number> = {};

      items.forEach((item: any) => {
        if (typeof item === 'object' && item !== null) {
          const key = String(item[gk] || 'undefined');
          const val = Number(item[ak]) || 0;
          sums[key] = (sums[key] || 0) + val;
          counts[key] = (counts[key] || 0) + 1;
        }
      });

      const avgs: Record<string, number> = {};
      Object.keys(sums).forEach((key) => {
        avgs[key] = sums[key] / counts[key];
      });

      return avgs;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 28: Aggregate (집계 - 5개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'agg_sum',
    module: 'aggregate',
    executor: (args) => {
      const items = args[0];
      if (!Array.isArray(items)) return 0;

      return items.reduce((acc: number, x: any) => acc + (Number(x) || 0), 0);
    }
  });

  registry.register({
    name: 'agg_avg',
    module: 'aggregate',
    executor: (args) => {
      const items = args[0];
      if (!Array.isArray(items) || items.length === 0) return 0;

      const sum = items.reduce((acc: number, x: any) => acc + (Number(x) || 0), 0);
      return sum / items.length;
    }
  });

  registry.register({
    name: 'agg_min',
    module: 'aggregate',
    executor: (args) => {
      const items = args[0];
      if (!Array.isArray(items) || items.length === 0) return null;

      return items.reduce((min: number, x: any) => {
        const val = Number(x) || 0;
        return val < min ? val : min;
      }, Number.MAX_VALUE);
    }
  });

  registry.register({
    name: 'agg_max',
    module: 'aggregate',
    executor: (args) => {
      const items = args[0];
      if (!Array.isArray(items) || items.length === 0) return null;

      return items.reduce((max: number, x: any) => {
        const val = Number(x) || 0;
        return val > max ? val : max;
      }, Number.MIN_VALUE);
    }
  });

  registry.register({
    name: 'agg_count',
    module: 'aggregate',
    executor: (args) => {
      const items = args[0];
      if (!Array.isArray(items)) return 0;
      return items.length;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 29: Distinct (중복제거 - 3개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'distinct_values',
    module: 'distinct',
    executor: (args) => {
      const items = args[0];
      if (!Array.isArray(items)) return [];

      const seen = new Set<string>();
      const result: any[] = [];

      items.forEach((x) => {
        const key = JSON.stringify(x);
        if (!seen.has(key)) {
          seen.add(key);
          result.push(x);
        }
      });

      return result;
    }
  });

  registry.register({
    name: 'distinct_by',
    module: 'distinct',
    executor: (args) => {
      const [items, key] = args;
      if (!Array.isArray(items)) return [];

      const k = String(key);
      const seen = new Set<string>();
      const result: any[] = [];

      items.forEach((item: any) => {
        if (typeof item === 'object' && item !== null) {
          const val = String(item[k] || 'undefined');
          if (!seen.has(val)) {
            seen.add(val);
            result.push(item);
          }
        }
      });

      return result;
    }
  });

  registry.register({
    name: 'distinct_count',
    module: 'distinct',
    executor: (args) => {
      const items = args[0];
      if (!Array.isArray(items)) return 0;

      return new Set(items.map((x) => JSON.stringify(x))).size;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 30: Sort (정렬 - 4개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'sort_asc',
    module: 'sort',
    executor: (args) => {
      const items = args[0];
      if (!Array.isArray(items)) return [];

      return [...items].sort((a, b) => {
        const aVal = Number(a) || 0;
        const bVal = Number(b) || 0;
        return aVal - bVal;
      });
    }
  });

  registry.register({
    name: 'sort_desc',
    module: 'sort',
    executor: (args) => {
      const items = args[0];
      if (!Array.isArray(items)) return [];

      return [...items].sort((a, b) => {
        const aVal = Number(a) || 0;
        const bVal = Number(b) || 0;
        return bVal - aVal;
      });
    }
  });

  registry.register({
    name: 'sort_by',
    module: 'sort',
    executor: (args) => {
      const [items, key, order] = args;
      if (!Array.isArray(items)) return [];

      const k = String(key);
      const ord = String(order).toLowerCase() === 'desc' ? -1 : 1;

      return [...items].sort((a: any, b: any) => {
        const aVal = (a && typeof a === 'object' ? a[k] : a) || 0;
        const bVal = (b && typeof b === 'object' ? b[k] : b) || 0;

        const aNum = Number(aVal);
        const bNum = Number(bVal);

        return ord * (aNum - bNum);
      });
    }
  });

  registry.register({
    name: 'sort_custom',
    module: 'sort',
    executor: (args) => {
      const [items, compareFn] = args;
      if (!Array.isArray(items)) return [];

      return [...items].sort((a: any, b: any) => {
        if (typeof compareFn === 'function') {
          return compareFn(a, b);
        }
        return 0;
      });
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 31: Filter Chain (필터 체인 - 3개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'filter_chain',
    module: 'filter-chain',
    executor: (args) => {
      const items = args[0];
      if (!Array.isArray(items)) return [];

      let result = items;
      for (let i = 1; i < args.length; i++) {
        if (typeof args[i] === 'function') {
          result = result.filter((item) => args[i](item));
        }
      }

      return result;
    }
  });

  registry.register({
    name: 'filter_where',
    module: 'filter-chain',
    executor: (args) => {
      const [items, conditions] = args;
      if (!Array.isArray(items) || typeof conditions !== 'object') return [];

      return items.filter((item: any) => {
        if (typeof item !== 'object') return false;

        return Object.entries(conditions).every(([key, value]) => {
          return item[key] === value;
        });
      });
    }
  });

  registry.register({
    name: 'filter_map_reduce',
    module: 'filter-chain',
    executor: (args) => {
      const [items, filterFn, mapFn, reduceFn] = args;
      if (!Array.isArray(items)) return null;

      let result = items;

      if (typeof filterFn === 'function') {
        result = result.filter((item) => filterFn(item));
      }

      if (typeof mapFn === 'function') {
        result = result.map((item) => mapFn(item));
      }

      if (typeof reduceFn === 'function') {
        return result.reduce((acc, item) => reduceFn(acc, item));
      }

      return result;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 32: Stream Process (스트림 처리 - 3개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'stream_chunk',
    module: 'stream-process',
    executor: (args) => {
      const [items, size] = args;
      if (!Array.isArray(items)) return [];

      const chunkSize = Number(size) || 1;
      const chunks: any[] = [];

      for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
      }

      return chunks;
    }
  });

  registry.register({
    name: 'stream_batch',
    module: 'stream-process',
    executor: (args) => {
      const [items, size] = args;
      if (!Array.isArray(items)) return [];

      const batchSize = Number(size) || 10;
      const batches: any[] = [];

      for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
      }

      return batches;
    }
  });

  registry.register({
    name: 'stream_window',
    module: 'stream-process',
    executor: (args) => {
      const [items, windowSize, step] = args;
      if (!Array.isArray(items)) return [];

      const wSize = Number(windowSize) || 2;
      const sSize = Number(step) || 1;
      const windows: any[] = [];

      for (let i = 0; i <= items.length - wSize; i += sSize) {
        windows.push(items.slice(i, i + wSize));
      }

      return windows;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 33: Text Wrap (텍스트 줄바꿈 - 3개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'text_wrap',
    module: 'text-wrap-b',
    executor: (args) => {
      const [text, width, indent] = args;
      const txt = String(text);
      const w = Number(width) || 80;
      const ind = String(indent || '');

      const lines: string[] = [];
      const words = txt.split(/\s+/);
      let currentLine = ind;

      words.forEach((word) => {
        if ((currentLine + word).length <= w) {
          currentLine += (currentLine === ind ? '' : ' ') + word;
        } else {
          if (currentLine !== ind) lines.push(currentLine);
          currentLine = ind + word;
        }
      });

      if (currentLine !== ind) lines.push(currentLine);
      return lines.join('\n');
    }
  });

  registry.register({
    name: 'text_indent',
    module: 'text-wrap-b',
    executor: (args) => {
      const [text, spaces] = args;
      const txt = String(text);
      const sp = String(' ').repeat(Number(spaces) || 2);

      return txt.split('\n').map((line) => sp + line).join('\n');
    }
  });

  registry.register({
    name: 'text_dedent',
    module: 'text-wrap-b',
    executor: (args) => {
      const text = String(args[0]);
      const lines = text.split('\n');

      const minIndent = lines
        .filter((l) => l.trim())
        .reduce((min: number, l: string) => {
          const spaces = l.match(/^\s*/)?.[0].length || 0;
          return Math.min(min, spaces);
        }, Infinity);

      if (minIndent === Infinity) return text;

      return lines.map((line) => line.substring(minIndent)).join('\n');
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 34: Word Frequency (단어 빈도 - 3개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'word_freq_count',
    module: 'word-freq',
    executor: (args) => {
      const text = String(args[0]);
      const words = text.toLowerCase().split(/\W+/).filter((w) => w);
      const freq: Record<string, number> = {};

      words.forEach((word) => {
        freq[word] = (freq[word] || 0) + 1;
      });

      return freq;
    }
  });

  registry.register({
    name: 'word_freq_top',
    module: 'word-freq',
    executor: (args) => {
      const [text, n] = args;
      const txt = String(text);
      const topN = Number(n) || 10;

      const words = txt.toLowerCase().split(/\W+/).filter((w) => w);
      const freq: Record<string, number> = {};

      words.forEach((word) => {
        freq[word] = (freq[word] || 0) + 1;
      });

      return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([word, count]) => ({ word, count }));
    }
  });

  registry.register({
    name: 'word_freq_filter',
    module: 'word-freq',
    executor: (args) => {
      const [text, minCount] = args;
      const txt = String(text);
      const min = Number(minCount) || 1;

      const words = txt.toLowerCase().split(/\W+/).filter((w) => w);
      const freq: Record<string, number> = {};

      words.forEach((word) => {
        freq[word] = (freq[word] || 0) + 1;
      });

      const filtered: Record<string, number> = {};
      Object.entries(freq).forEach(([word, count]) => {
        if (count >= min) filtered[word] = count;
      });

      return filtered;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 35: String Utils (문자열 유틸 - 5개)
  // ════════════════════════════════════════════════════════════════

  registry.register({
    name: 'str_capitalize',
    module: 'string-utils',
    executor: (args) => {
      const text = String(args[0]);
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }
  });

  registry.register({
    name: 'str_title',
    module: 'string-utils',
    executor: (args) => {
      const text = String(args[0]);
      return text
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
  });

  registry.register({
    name: 'str_reverse',
    module: 'string-utils',
    executor: (args) => {
      const text = String(args[0]);
      return text.split('').reverse().join('');
    }
  });

  registry.register({
    name: 'str_slug',
    module: 'string-utils',
    executor: (args) => {
      const text = String(args[0]);
      return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    }
  });

  registry.register({
    name: 'str_camelcase',
    module: 'string-utils',
    executor: (args) => {
      const text = String(args[0]);
      return text
        .split(/[-_\s]+/)
        .map((word, idx) => {
          if (idx === 0) return word.toLowerCase();
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join('');
    }
  });
}
