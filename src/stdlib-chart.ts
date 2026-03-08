/**
 * FreeLang v2 - Native-Chart Engine
 *
 * Chart.js 완전 대체 - 외부 의존성 0%
 * 순수 SVG 생성 기반 차트 엔진
 *
 * 제공 함수:
 *   chart_bar(data, labels, title?, color?)   → SVG string
 *   chart_line(data, labels, title?, color?)  → SVG string
 *   chart_pie(data, labels, title?)           → SVG string
 *   chart_scatter(xData, yData, title?)       → SVG string
 *   chart_sparkline(data, color?)             → 미니 SVG string
 *   chart_render_html(svg, title?)            → 완전한 HTML 페이지
 *   chart_save(svg, path)                     → 파일 저장
 *   chart_multi(charts)                       → 복합 대시보드 SVG
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';
import * as fs from 'fs';

// ── 내부 유틸 ────────────────────────────────────────────────────────────────

const PALETTE = [
  '#4e79a7', '#f28e2b', '#e15759', '#76b7b2',
  '#59a14f', '#edc948', '#b07aa1', '#ff9da7',
  '#9c755f', '#bab0ac'
];

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toNumArr(v: unknown): number[] {
  if (Array.isArray(v)) return v.map(Number);
  if (v instanceof Map) return Array.from(v.values()).map(Number);
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return []; }
  }
  return [];
}

function toStrArr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (v instanceof Map) return Array.from(v.values()).map(String);
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return []; }
  }
  return [];
}

// ── 막대 차트 ────────────────────────────────────────────────────────────────

export function svgBarChart(
  data: number[],
  labels: string[],
  title = '',
  color = PALETTE[0]
): string {
  const W = 600, H = 400;
  const pad = { top: 50, right: 30, bottom: 80, left: 60 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const max = Math.max(...data, 1);
  const barW = chartW / data.length;
  const gap = barW * 0.15;

  let bars = '';
  let xLabels = '';
  let yLines = '';

  // Y축 격자선 5개
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + chartH - (chartH * i / 5);
    const val = ((max * i) / 5).toFixed(1);
    yLines += `<line x1="${pad.left}" y1="${y}" x2="${pad.left + chartW}" y2="${y}" stroke="#e0e0e0" stroke-width="1"/>`;
    yLines += `<text x="${pad.left - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#666">${val}</text>`;
  }

  for (let i = 0; i < data.length; i++) {
    const barH = (data[i] / max) * chartH;
    const x = pad.left + i * barW + gap / 2;
    const y = pad.top + chartH - barH;
    const w = barW - gap;

    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${barH.toFixed(1)}" fill="${escapeXml(color)}" rx="2" opacity="0.85">`;
    bars += `<title>${escapeXml(labels[i] ?? String(i))}: ${data[i]}</title></rect>`;
    bars += `<text x="${(x + w / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="#333">${data[i]}</text>`;

    const labelX = (x + w / 2).toFixed(1);
    const labelY = pad.top + chartH + 18;
    const lbl = escapeXml((labels[i] ?? String(i)).substring(0, 12));
    xLabels += `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="11" fill="#555" transform="rotate(-25,${labelX},${labelY})">${lbl}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#fafafa" rx="8"/>
  ${title ? `<text x="${W / 2}" y="28" text-anchor="middle" font-size="16" font-weight="bold" fill="#222">${escapeXml(title)}</text>` : ''}
  ${yLines}
  <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + chartH}" stroke="#999" stroke-width="1.5"/>
  <line x1="${pad.left}" y1="${pad.top + chartH}" x2="${pad.left + chartW}" y2="${pad.top + chartH}" stroke="#999" stroke-width="1.5"/>
  ${bars}
  ${xLabels}
</svg>`;
}

// ── 선 차트 ────────────────────────────────────────────────────────────────

export function svgLineChart(
  data: number[],
  labels: string[],
  title = '',
  color = PALETTE[0]
): string {
  const W = 600, H = 380;
  const pad = { top: 50, right: 30, bottom: 70, left: 60 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = pad.left + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = pad.top + chartH - ((v - min) / range) * chartH;
    return { x, y, v };
  });

  let yLines = '';
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + chartH - (chartH * i / 5);
    const val = (min + (range * i / 5)).toFixed(1);
    yLines += `<line x1="${pad.left}" y1="${y}" x2="${pad.left + chartW}" y2="${y}" stroke="#e0e0e0" stroke-width="1"/>`;
    yLines += `<text x="${pad.left - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#666">${val}</text>`;
  }

  // 영역 채우기 (gradient)
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = pathD
    + ` L${pts[pts.length - 1].x.toFixed(1)},${(pad.top + chartH).toFixed(1)}`
    + ` L${pts[0].x.toFixed(1)},${(pad.top + chartH).toFixed(1)} Z`;

  const dots = pts.map(p =>
    `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${escapeXml(color)}" stroke="#fff" stroke-width="2"><title>${p.v}</title></circle>`
  ).join('');

  const xLabels = pts.map((p, i) => {
    const lbl = escapeXml((labels[i] ?? String(i)).substring(0, 10));
    return `<text x="${p.x.toFixed(1)}" y="${pad.top + chartH + 18}" text-anchor="middle" font-size="11" fill="#555" transform="rotate(-20,${p.x.toFixed(1)},${(pad.top + chartH + 18).toFixed(1)})">${lbl}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${escapeXml(color)}" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="${escapeXml(color)}" stop-opacity="0.02"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#fafafa" rx="8"/>
  ${title ? `<text x="${W / 2}" y="28" text-anchor="middle" font-size="16" font-weight="bold" fill="#222">${escapeXml(title)}</text>` : ''}
  ${yLines}
  <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + chartH}" stroke="#999" stroke-width="1.5"/>
  <line x1="${pad.left}" y1="${pad.top + chartH}" x2="${pad.left + chartW}" y2="${pad.top + chartH}" stroke="#999" stroke-width="1.5"/>
  <path d="${areaD}" fill="url(#lg)"/>
  <path d="${pathD}" fill="none" stroke="${escapeXml(color)}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
  ${dots}
  ${xLabels}
</svg>`;
}

// ── 파이 차트 ────────────────────────────────────────────────────────────────

export function svgPieChart(
  data: number[],
  labels: string[],
  title = ''
): string {
  const W = 500, H = 400;
  const cx = 190, cy = 190, r = 150;
  const total = data.reduce((s, v) => s + v, 0) || 1;

  let startAngle = -Math.PI / 2;
  let slices = '';
  let legend = '';

  for (let i = 0; i < data.length; i++) {
    const frac = data[i] / total;
    const endAngle = startAngle + frac * 2 * Math.PI;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const large = frac > 0.5 ? 1 : 0;
    const col = PALETTE[i % PALETTE.length];
    const pct = (frac * 100).toFixed(1);
    const lbl = escapeXml(labels[i] ?? String(i));

    slices += `<path d="M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z" fill="${col}" stroke="#fff" stroke-width="2" opacity="0.88"><title>${lbl}: ${pct}%</title></path>`;

    // 범례
    const ly = 50 + i * 22;
    legend += `<rect x="360" y="${ly}" width="14" height="14" fill="${col}" rx="3"/>`;
    legend += `<text x="380" y="${ly + 11}" font-size="12" fill="#444">${lbl} (${pct}%)</text>`;

    startAngle = endAngle;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#fafafa" rx="8"/>
  ${title ? `<text x="${cx}" y="22" text-anchor="middle" font-size="16" font-weight="bold" fill="#222">${escapeXml(title)}</text>` : ''}
  ${slices}
  ${legend}
</svg>`;
}

// ── 산점도 ────────────────────────────────────────────────────────────────

export function svgScatterChart(
  xData: number[],
  yData: number[],
  title = '',
  color = PALETTE[0]
): string {
  const W = 600, H = 400;
  const pad = { top: 50, right: 30, bottom: 60, left: 60 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const xMax = Math.max(...xData, 1);
  const xMin = Math.min(...xData, 0);
  const yMax = Math.max(...yData, 1);
  const yMin = Math.min(...yData, 0);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  let grid = '';
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + chartH - (chartH * i / 5);
    const x = pad.left + (chartW * i / 5);
    const yVal = (yMin + (yRange * i / 5)).toFixed(1);
    const xVal = (xMin + (xRange * i / 5)).toFixed(1);
    grid += `<line x1="${pad.left}" y1="${y}" x2="${pad.left + chartW}" y2="${y}" stroke="#e8e8e8" stroke-width="1"/>`;
    grid += `<line x1="${x}" y1="${pad.top}" x2="${x}" y2="${pad.top + chartH}" stroke="#e8e8e8" stroke-width="1"/>`;
    grid += `<text x="${pad.left - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="#666">${yVal}</text>`;
    grid += `<text x="${x}" y="${pad.top + chartH + 16}" text-anchor="middle" font-size="10" fill="#666">${xVal}</text>`;
  }

  const dots = xData.map((xv, i) => {
    const px = pad.left + ((xv - xMin) / xRange) * chartW;
    const py = pad.top + chartH - ((yData[i] - yMin) / yRange) * chartH;
    return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="5" fill="${escapeXml(color)}" opacity="0.7"><title>(${xv}, ${yData[i]})</title></circle>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#fafafa" rx="8"/>
  ${title ? `<text x="${W / 2}" y="28" text-anchor="middle" font-size="16" font-weight="bold" fill="#222">${escapeXml(title)}</text>` : ''}
  ${grid}
  <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + chartH}" stroke="#999" stroke-width="1.5"/>
  <line x1="${pad.left}" y1="${pad.top + chartH}" x2="${pad.left + chartW}" y2="${pad.top + chartH}" stroke="#999" stroke-width="1.5"/>
  ${dots}
</svg>`;
}

// ── 스파크라인 (미니 라인 차트) ────────────────────────────────────────────

export function svgSparkline(data: number[], color = PALETTE[0]): string {
  const W = 120, H = 40;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = 2 + (i / Math.max(data.length - 1, 1)) * (W - 4);
    const y = 2 + (1 - (v - min) / range) * (H - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <polyline points="${pts.join(' ')}" fill="none" stroke="${escapeXml(color)}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
</svg>`;
}

// ── HTML 래퍼 ────────────────────────────────────────────────────────────────

export function renderHtml(svg: string, title = 'FreeLang Native Chart'): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeXml(title)}</title>
  <style>
    body { margin: 0; background: #f0f2f5; display: flex; flex-direction: column; align-items: center; padding: 32px; font-family: system-ui, sans-serif; }
    h1 { color: #333; margin-bottom: 24px; font-size: 1.4rem; }
    .chart-box { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); padding: 24px; }
    .badge { margin-top: 16px; font-size: 11px; color: #aaa; }
  </style>
</head>
<body>
  <h1>${escapeXml(title)}</h1>
  <div class="chart-box">${svg}</div>
  <p class="badge">Generated by FreeLang v2 Native-Chart Engine (Chart.js 0%)</p>
</body>
</html>`;
}

// ── 복합 대시보드 ────────────────────────────────────────────────────────────

export function svgDashboard(charts: string[], cols = 2): string {
  const cellW = 640, cellH = 440;
  const rows = Math.ceil(charts.length / cols);
  const W = cellW * cols;
  const H = cellH * rows;

  let cells = '';
  for (let i = 0; i < charts.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    // foreignObject로 내장 SVG 삽입
    cells += `<g transform="translate(${col * cellW},${row * cellH})">
      <rect width="${cellW}" height="${cellH}" fill="#fff" stroke="#e0e0e0" stroke-width="1"/>
      ${charts[i]}
    </g>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#f0f2f5"/>
  ${cells}
</svg>`;
}

// ── 레지스트리 등록 ──────────────────────────────────────────────────────────

export function registerNativeChartFunctions(registry: NativeFunctionRegistry): void {

  // chart_bar(data, labels, title?, color?) → SVG string
  registry.register({
    name: 'chart_bar',
    module: 'chart',
    signature: {
      name: 'chart_bar',
      returnType: 'string',
      parameters: [
        { name: 'data', type: 'any' },
        { name: 'labels', type: 'any' },
        { name: 'title', type: 'string' },
        { name: 'color', type: 'string' }
      ],
      category: 'visualization'
    },
    executor: (args) => {
      const data = toNumArr(args[0]);
      const labels = toStrArr(args[1]);
      const title = args[2] ? String(args[2]) : '';
      const color = args[3] ? String(args[3]) : PALETTE[0];
      return svgBarChart(data, labels, title, color);
    }
  });

  // chart_line(data, labels, title?, color?) → SVG string
  registry.register({
    name: 'chart_line',
    module: 'chart',
    signature: {
      name: 'chart_line',
      returnType: 'string',
      parameters: [
        { name: 'data', type: 'any' },
        { name: 'labels', type: 'any' },
        { name: 'title', type: 'string' },
        { name: 'color', type: 'string' }
      ],
      category: 'visualization'
    },
    executor: (args) => {
      const data = toNumArr(args[0]);
      const labels = toStrArr(args[1]);
      const title = args[2] ? String(args[2]) : '';
      const color = args[3] ? String(args[3]) : PALETTE[0];
      return svgLineChart(data, labels, title, color);
    }
  });

  // chart_pie(data, labels, title?) → SVG string
  registry.register({
    name: 'chart_pie',
    module: 'chart',
    signature: {
      name: 'chart_pie',
      returnType: 'string',
      parameters: [
        { name: 'data', type: 'any' },
        { name: 'labels', type: 'any' },
        { name: 'title', type: 'string' }
      ],
      category: 'visualization'
    },
    executor: (args) => {
      const data = toNumArr(args[0]);
      const labels = toStrArr(args[1]);
      const title = args[2] ? String(args[2]) : '';
      return svgPieChart(data, labels, title);
    }
  });

  // chart_scatter(xData, yData, title?, color?) → SVG string
  registry.register({
    name: 'chart_scatter',
    module: 'chart',
    signature: {
      name: 'chart_scatter',
      returnType: 'string',
      parameters: [
        { name: 'xData', type: 'any' },
        { name: 'yData', type: 'any' },
        { name: 'title', type: 'string' },
        { name: 'color', type: 'string' }
      ],
      category: 'visualization'
    },
    executor: (args) => {
      const xData = toNumArr(args[0]);
      const yData = toNumArr(args[1]);
      const title = args[2] ? String(args[2]) : '';
      const color = args[3] ? String(args[3]) : PALETTE[0];
      return svgScatterChart(xData, yData, title, color);
    }
  });

  // chart_sparkline(data, color?) → 미니 SVG string
  registry.register({
    name: 'chart_sparkline',
    module: 'chart',
    signature: {
      name: 'chart_sparkline',
      returnType: 'string',
      parameters: [
        { name: 'data', type: 'any' },
        { name: 'color', type: 'string' }
      ],
      category: 'visualization'
    },
    executor: (args) => {
      const data = toNumArr(args[0]);
      const color = args[1] ? String(args[1]) : PALETTE[0];
      return svgSparkline(data, color);
    }
  });

  // chart_render_html(svg, title?) → 완전한 HTML
  registry.register({
    name: 'chart_render_html',
    module: 'chart',
    signature: {
      name: 'chart_render_html',
      returnType: 'string',
      parameters: [
        { name: 'svg', type: 'string' },
        { name: 'title', type: 'string' }
      ],
      category: 'visualization'
    },
    executor: (args) => {
      const svg = String(args[0] ?? '');
      const title = args[1] ? String(args[1]) : 'FreeLang Native Chart';
      return renderHtml(svg, title);
    }
  });

  // chart_save(svg, path) → void (파일 저장)
  registry.register({
    name: 'chart_save',
    module: 'chart',
    signature: {
      name: 'chart_save',
      returnType: 'void',
      parameters: [
        { name: 'content', type: 'string' },
        { name: 'path', type: 'string' }
      ],
      category: 'visualization'
    },
    executor: (args) => {
      const content = String(args[0] ?? '');
      const path = String(args[1] ?? 'chart.svg');
      fs.writeFileSync(path, content, 'utf-8');
      return `saved:${path}`;
    }
  });

  // chart_multi(charts[], cols?) → 대시보드 SVG
  registry.register({
    name: 'chart_multi',
    module: 'chart',
    signature: {
      name: 'chart_multi',
      returnType: 'string',
      parameters: [
        { name: 'charts', type: 'any' },
        { name: 'cols', type: 'number' }
      ],
      category: 'visualization'
    },
    executor: (args) => {
      const charts = Array.isArray(args[0])
        ? args[0].map(String)
        : (args[0] instanceof Map ? Array.from((args[0] as Map<unknown, unknown>).values()).map(String) : []);
      const cols = args[1] ? Number(args[1]) : 2;
      return svgDashboard(charts, cols);
    }
  });

  // chart_palette(index) → 색상 코드
  registry.register({
    name: 'chart_palette',
    module: 'chart',
    signature: {
      name: 'chart_palette',
      returnType: 'string',
      parameters: [{ name: 'index', type: 'number' }],
      category: 'visualization'
    },
    executor: (args) => {
      const idx = Number(args[0] ?? 0);
      return PALETTE[Math.abs(idx) % PALETTE.length];
    }
  });
}
