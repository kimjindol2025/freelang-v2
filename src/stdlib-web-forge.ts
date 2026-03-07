/**
 * FreeLang v2 - Native-Web-Forge Engine
 *
 * Next.js 완전 대체 - 외부 의존성 0%
 * Node.js 내장 http 모듈 기반 SSG/SSR 엔진
 *
 * API (고정 파라미터 수 - VM paramCount 호환):
 *   html_tag(tag, attrs, inner)          → HTML 요소 문자열
 *   html_text(content)                   → 이스케이프된 텍스트
 *   html_page(title, body, css, js)      → 완전한 HTML 문서
 *   html_static_build(path, html)        → 정적 파일 저장 (SSG)
 *   html_component(name, renderFn)       → 컴포넌트 등록
 *   html_render(name, props)             → 등록된 컴포넌트 렌더링
 *   ssr_render(template, data)           → 데이터 주입 SSR
 *   web_app_new()                        → 앱 인스턴스 생성
 *   web_app_get(app, path, handler)      → GET 라우트 등록
 *   web_app_post(app, path, handler)     → POST 라우트 등록
 *   web_app_route(app, method, path, handler) → 라우트 등록
 *   web_app_static(app, urlPath, dir)    → 정적 파일 서빙
 *   web_app_start(app, port)             → 서버 시작
 *   web_app_stop(app)                    → 서버 중지
 *   web_response_html(res, html, status) → HTML 응답
 *   web_response_json(res, data, status) → JSON 응답
 *   web_response_redirect(res, url)      → 리다이렉트
 *   page_registry_add(path, html)        → @page 런타임 등록
 *   page_build_all(outDir)              → 전체 SSG 빌드
 *   html_attrs(key, value)               → attrs Map (2 params)
 *   html_attrs_add(attrs, key, value)    → attrs에 키 추가 (3 params)
 *   html_style(css)                      → style Map
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as url from 'url';

// ── 내부 유틸 ────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function attrsToString(attrs: unknown): string {
  if (!attrs || typeof attrs !== 'object') return '';
  const obj = attrs instanceof Map
    ? Object.fromEntries(attrs)
    : (attrs as Record<string, unknown>);
  return Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && v !== false)
    .map(([k, v]) => v === true ? ` ${k}` : ` ${k}="${escapeHtml(String(v))}"`)
    .join('');
}

const SELF_CLOSING = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

// ── HTML 빌더 ─────────────────────────────────────────────────────────────────

export function htmlTag(tag: string, attrs: unknown, inner: unknown): string {
  const attrStr = attrsToString(attrs);
  const tagLower = tag.toLowerCase();
  if (SELF_CLOSING.has(tagLower)) {
    return `<${tagLower}${attrStr}>`;
  }
  return `<${tagLower}${attrStr}>${String(inner ?? '')}</${tagLower}>`;
}

export function htmlPage(
  title: string,
  body: string,
  css: string,
  js: string
): string {
  const cssBlock = css && css.trim()
    ? `<style>${css}</style>`
    : '<style>*{box-sizing:border-box}body{font-family:system-ui,sans-serif;margin:0;padding:16px;line-height:1.6}</style>';
  const jsBlock = js && js.trim() ? `<script>${js}</script>` : '';
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
${cssBlock}
</head>
<body>
${body}
${jsBlock}
</body>
</html>`;
}

export function ssrRender(template: string, data: unknown): string {
  const obj = data instanceof Map
    ? Object.fromEntries(data)
    : (typeof data === 'object' && data !== null ? data as Record<string, unknown> : {});
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = (obj as Record<string, unknown>)[key];
    return val !== undefined ? escapeHtml(String(val)) : '';
  });
}

// ── 컴포넌트 레지스트리 (전역) ────────────────────────────────────────────────

const componentRegistry = new Map<string, (props: Record<string, unknown>) => string>();
const pageRegistry = new Map<string, string>();

// ── WebApp 앱 객체 ────────────────────────────────────────────────────────────

interface RouteEntry {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: (req: unknown, res: unknown) => void;
}

interface StaticEntry {
  urlPrefix: string;
  dir: string;
}

interface WebApp {
  __type: 'WebApp';
  routes: RouteEntry[];
  statics: StaticEntry[];
  server?: http.Server;
}

function compilePath(p: string): { pattern: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const regexStr = p
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    })
    .replace(/\*/g, '(.*)');
  return { pattern: new RegExp(`^${regexStr}$`), paramNames };
}

function serveStaticFile(res: http.ServerResponse, filePath: string): void {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.wasm': 'application/wasm',
  };
  const mime = mimeMap[ext] || 'application/octet-stream';
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}

function toJsonSafe(v: unknown): unknown {
  if (v instanceof Map) return Object.fromEntries([...v].map(([k, val]) => [k, toJsonSafe(val)]));
  if (Array.isArray(v)) return v.map(toJsonSafe);
  return v;
}

// ── 등록 함수 ─────────────────────────────────────────────────────────────────

export function registerWebForgeFunctions(registry: NativeFunctionRegistry): void {

  // html_tag(tag, attrs, inner) → string
  // tag: 태그명, attrs: Map or null, inner: 자식 HTML 문자열
  registry.register({
    name: 'html_tag',
    module: 'web_forge',
    paramCount: 3,
    executor: (args) => htmlTag(String(args[0] ?? 'div'), args[1], args[2])
  });

  // html_text(content) → escaped string
  registry.register({
    name: 'html_text',
    module: 'web_forge',
    paramCount: 1,
    executor: (args) => escapeHtml(String(args[0] ?? ''))
  });

  // html_page(title, body, css, js) → full HTML document
  registry.register({
    name: 'html_page',
    module: 'web_forge',
    paramCount: 4,
    executor: (args) => htmlPage(
      String(args[0] ?? 'FreeLang App'),
      String(args[1] ?? ''),
      String(args[2] ?? ''),
      String(args[3] ?? '')
    )
  });

  // html_static_build(filePath, html) → { ok, path, bytes }
  registry.register({
    name: 'html_static_build',
    module: 'web_forge',
    paramCount: 2,
    executor: (args) => {
      const filePath = String(args[0]);
      const html = String(args[1] ?? '');
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, html, 'utf-8');
      return { ok: true, path: filePath, bytes: Buffer.byteLength(html) };
    }
  });

  // html_component(name, renderFn) → { ok, name }
  registry.register({
    name: 'html_component',
    module: 'web_forge',
    paramCount: 2,
    executor: (args) => {
      const name = String(args[0]);
      const fn = args[1];
      if (typeof fn !== 'function') return { ok: false, error: 'renderFn must be callable' };
      componentRegistry.set(name, fn as (props: Record<string, unknown>) => string);
      return { ok: true, name };
    }
  });

  // html_render(name, props) → HTML string
  registry.register({
    name: 'html_render',
    module: 'web_forge',
    paramCount: 2,
    executor: (args) => {
      const name = String(args[0]);
      const props = args[1] instanceof Map
        ? Object.fromEntries(args[1] as Map<string, unknown>)
        : (args[1] ?? {});
      const fn = componentRegistry.get(name);
      if (!fn) return `<!-- component "${escapeHtml(name)}" not found -->`;
      return fn(props as Record<string, unknown>);
    }
  });

  // ssr_render(template, data) → string ({{key}} 치환)
  registry.register({
    name: 'ssr_render',
    module: 'web_forge',
    paramCount: 2,
    executor: (args) => ssrRender(String(args[0] ?? ''), args[1])
  });

  // page_registry_add(routePath, html) → { ok, route }
  registry.register({
    name: 'page_registry_add',
    module: 'web_forge',
    paramCount: 2,
    executor: (args) => {
      const routePath = String(args[0]);
      const html = String(args[1] ?? '');
      pageRegistry.set(routePath, html);
      return { ok: true, route: routePath };
    }
  });

  // page_build_all(outDir) → { built, paths }
  registry.register({
    name: 'page_build_all',
    module: 'web_forge',
    paramCount: 1,
    executor: (args) => {
      const outDir = String(args[0] ?? './dist');
      fs.mkdirSync(outDir, { recursive: true });
      const built: string[] = [];
      for (const [routePath, html] of pageRegistry) {
        const fileName = routePath === '/' ? 'index.html' : `${routePath.replace(/^\//, '').replace(/\//g, '_')}.html`;
        const filePath = path.join(outDir, fileName);
        fs.writeFileSync(filePath, html, 'utf-8');
        built.push(filePath);
      }
      return { built: built.length, paths: built };
    }
  });

  // web_app_new() → WebApp
  registry.register({
    name: 'web_app_new',
    module: 'web_forge',
    paramCount: 0,
    executor: () => {
      const app: WebApp = { __type: 'WebApp', routes: [], statics: [] };
      return app;
    }
  });

  // web_app_get(app, path, handler) → app
  registry.register({
    name: 'web_app_get',
    module: 'web_forge',
    paramCount: 3,
    executor: (args) => {
      const app = args[0] as WebApp;
      if (!app || app.__type !== 'WebApp') return { error: 'Invalid app object' };
      const routePath = String(args[1] ?? '/');
      const handler = args[2];
      if (typeof handler !== 'function') return { error: 'handler must be a function' };
      const { pattern, paramNames } = compilePath(routePath);
      app.routes.push({ method: 'GET', pattern, paramNames, handler: handler as any });
      return app;
    }
  });

  // web_app_post(app, path, handler) → app
  registry.register({
    name: 'web_app_post',
    module: 'web_forge',
    paramCount: 3,
    executor: (args) => {
      const app = args[0] as WebApp;
      if (!app || app.__type !== 'WebApp') return { error: 'Invalid app object' };
      const routePath = String(args[1] ?? '/');
      const handler = args[2];
      if (typeof handler !== 'function') return { error: 'handler must be a function' };
      const { pattern, paramNames } = compilePath(routePath);
      app.routes.push({ method: 'POST', pattern, paramNames, handler: handler as any });
      return app;
    }
  });

  // web_app_route(app, method, path, handler) → app
  registry.register({
    name: 'web_app_route',
    module: 'web_forge',
    paramCount: 4,
    executor: (args) => {
      const app = args[0] as WebApp;
      if (!app || app.__type !== 'WebApp') return { error: 'Invalid app object' };
      const method = String(args[1] ?? 'GET').toUpperCase();
      const routePath = String(args[2] ?? '/');
      const handler = args[3];
      if (typeof handler !== 'function') return { error: 'handler must be a function' };
      const { pattern, paramNames } = compilePath(routePath);
      app.routes.push({ method, pattern, paramNames, handler: handler as any });
      return app;
    }
  });

  // web_app_static(app, urlPath, dir) → app
  registry.register({
    name: 'web_app_static',
    module: 'web_forge',
    paramCount: 3,
    executor: (args) => {
      const app = args[0] as WebApp;
      if (!app || app.__type !== 'WebApp') return { error: 'Invalid app object' };
      app.statics.push({
        urlPrefix: String(args[1] ?? '/static'),
        dir: String(args[2] ?? './public')
      });
      return app;
    }
  });

  // web_app_start(app, port) → { ok, port }
  registry.register({
    name: 'web_app_start',
    module: 'web_forge',
    paramCount: 2,
    executor: (args) => {
      const app = args[0] as WebApp;
      if (!app || app.__type !== 'WebApp') return { error: 'Invalid app object' };
      const port = Number(args[1] ?? 3000);

      // 등록된 @page 라우트를 app에 자동 추가
      for (const [routePath, html] of pageRegistry) {
        const { pattern, paramNames } = compilePath(routePath);
        const capturedHtml = html;
        app.routes.push({
          method: 'GET',
          pattern,
          paramNames,
          handler: (_req, res) => {
            (res as http.ServerResponse).writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            (res as http.ServerResponse).end(capturedHtml);
          }
        });
      }

      const server = http.createServer((req, res) => {
        const parsed = url.parse(req.url ?? '/', true);
        const pathname = parsed.pathname ?? '/';
        const method = (req.method ?? 'GET').toUpperCase();

        // 정적 파일 처리
        for (const entry of app.statics) {
          if (pathname.startsWith(entry.urlPrefix)) {
            const relPath = pathname.slice(entry.urlPrefix.length) || '/index.html';
            const filePath = path.join(entry.dir, relPath);
            serveStaticFile(res, filePath);
            return;
          }
        }

        // 동적 라우트 매칭
        for (const route of app.routes) {
          if (route.method !== method && route.method !== '*') continue;
          const matchResult = pathname.match(route.pattern);
          if (matchResult) {
            const params = new Map<string, string>();
            route.paramNames.forEach((name, i) => {
              params.set(name, matchResult[i + 1] ?? '');
            });
            const reqMap = new Map<string, unknown>([
              ['method', method],
              ['path', pathname],
              ['query', Object.fromEntries(Object.entries(parsed.query))],
              ['params', params],
              ['__raw', req],
            ]);
            const resWrapper = { __raw: res, __type: 'WebResponse' };
            try {
              route.handler(reqMap, resWrapper);
            } catch (e) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end(`Internal Server Error: ${e}`);
            }
            return;
          }
        }

        // 404
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlPage('404', '<h1>404 - Not Found</h1>', '', ''));
      });

      app.server = server;
      server.listen(port, () => {
        process.stdout.write(`[Native-Web-Forge] 서버 시작: http://localhost:${port}\n`);
      });
      return { ok: true, port };
    }
  });

  // web_serve_dir(dir, port) → { ok, port } (정적 디렉토리 서빙 - 콜백 불필요)
  registry.register({
    name: 'web_serve_dir',
    module: 'web_forge',
    paramCount: 2,
    executor: (args) => {
      const dir = String(args[0] ?? './dist');
      const port = Number(args[1] ?? 3000);

      // @page 등록된 HTML도 함께 서빙
      const pageHtmlMap = new Map(pageRegistry);

      const server = http.createServer((req, res) => {
        const parsed = url.parse(req.url ?? '/', true);
        const pathname = parsed.pathname ?? '/';

        // @page 등록 HTML 우선 서빙
        if (pageHtmlMap.has(pathname)) {
          const html = pageHtmlMap.get(pathname)!;
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(html);
          return;
        }

        // 정적 파일
        const relPath = pathname === '/' ? '/index.html' : pathname;
        const filePath = path.join(dir, relPath);
        serveStaticFile(res, filePath);
      });

      server.listen(port, () => {
        process.stdout.write(`[Native-Web-Forge] 정적 서버: http://localhost:${port} (dir: ${dir})\n`);
      });
      return { ok: true, port };
    }
  });

  // web_app_stop(app) → { ok }
  registry.register({
    name: 'web_app_stop',
    module: 'web_forge',
    paramCount: 1,
    executor: (args) => {
      const app = args[0] as WebApp;
      if (app?.server) {
        app.server.close();
        return { ok: true };
      }
      return { ok: false, error: 'server not running' };
    }
  });

  // web_response_html(res, html, status) → null
  registry.register({
    name: 'web_response_html',
    module: 'web_forge',
    paramCount: 3,
    executor: (args) => {
      const resWrapper = args[0] as { __raw: http.ServerResponse };
      const html = String(args[1] ?? '');
      const status = Number(args[2] ?? 200);
      if (resWrapper?.__raw) {
        resWrapper.__raw.writeHead(status, {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Length': Buffer.byteLength(html),
        });
        resWrapper.__raw.end(html);
      }
      return null;
    }
  });

  // web_response_json(res, data, status) → null
  registry.register({
    name: 'web_response_json',
    module: 'web_forge',
    paramCount: 3,
    executor: (args) => {
      const resWrapper = args[0] as { __raw: http.ServerResponse };
      const body = JSON.stringify(toJsonSafe(args[1]));
      const status = Number(args[2] ?? 200);
      if (resWrapper?.__raw) {
        resWrapper.__raw.writeHead(status, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(body),
        });
        resWrapper.__raw.end(body);
      }
      return null;
    }
  });

  // web_response_redirect(res, url) → null
  registry.register({
    name: 'web_response_redirect',
    module: 'web_forge',
    paramCount: 2,
    executor: (args) => {
      const resWrapper = args[0] as { __raw: http.ServerResponse };
      const location = String(args[1] ?? '/');
      if (resWrapper?.__raw) {
        resWrapper.__raw.writeHead(302, { Location: location });
        resWrapper.__raw.end();
      }
      return null;
    }
  });

  // html_attrs(key, value) → Map (2-arg 편의 함수)
  registry.register({
    name: 'html_attrs',
    module: 'web_forge',
    paramCount: 2,
    executor: (args) => {
      const m = new Map<string, unknown>();
      m.set(String(args[0]), args[1]);
      return m;
    }
  });

  // html_attrs_add(attrs, key, value) → attrs Map (attrs에 키/값 추가)
  registry.register({
    name: 'html_attrs_add',
    module: 'web_forge',
    paramCount: 3,
    executor: (args) => {
      let m = args[0] as Map<string, unknown>;
      if (!(m instanceof Map)) m = new Map();
      m.set(String(args[1]), args[2]);
      return m;
    }
  });

  // html_style(css_string) → Map { style: css }
  registry.register({
    name: 'html_style',
    module: 'web_forge',
    paramCount: 1,
    executor: (args) => {
      const m = new Map<string, string>();
      m.set('style', String(args[0] ?? ''));
      return m;
    }
  });
}
