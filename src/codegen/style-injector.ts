/**
 * MOSS-Style: Static Style Injector
 *
 * 컴파일 타임에 StyleDeclaration AST를 분석하여
 * 정적 상수 데이터(GPU 버퍼 호환)로 변환.
 *
 * 런타임 오버헤드: 0
 * - CSS 파싱 없음
 * - 클래스명 룩업 없음
 * - 스타일 계산 없음
 *
 * 출력: 바이너리 임베딩용 상수 배열 (RGBA, 좌표, 크기)
 */

import { StyleDeclaration, StyleProperty } from '../parser/ast';

/** GPU 정점 데이터 (16바이트 정렬, SIMD 호환) */
export interface StyleConstant {
  name: string;
  backgroundColor: [number, number, number, number];  // RGBA (0-255)
  padding: [number, number, number, number];           // top, right, bottom, left (px)
  borderRadius: [number, number, number, number];      // top-left, top-right, bottom-right, bottom-left
  fontSize: number;                                     // px
  fontWeight: number;                                   // 100-900
  color: [number, number, number, number];              // RGBA
  margin: [number, number, number, number];             // top, right, bottom, left
  width: number;                                        // px (0 = auto)
  height: number;                                       // px (0 = auto)
  opacity: number;                                      // 0.0-1.0
  display: number;                                      // 0=block, 1=flex, 2=grid, 3=inline, 4=none
  rawProperties: Map<string, string>;                   // 비표준 속성 보존
}

/** 스타일 레지스트리 (컴파일 타임 전역) */
export class StyleRegistry {
  private styles: Map<string, StyleConstant> = new Map();

  /** StyleDeclaration AST → StyleConstant 변환 */
  inject(decl: StyleDeclaration): StyleConstant {
    // extends 처리: 부모 스타일 복사 후 오버라이드
    let base = this.createDefault(decl.name);
    if (decl.extends) {
      const parent = this.styles.get(decl.extends);
      if (parent) {
        base = { ...parent, name: decl.name, rawProperties: new Map(parent.rawProperties) };
      }
    }

    // 속성 주입
    for (const prop of decl.properties) {
      this.applyProperty(base, prop);
    }

    this.styles.set(decl.name, base);
    return base;
  }

  /** 스타일 조회 */
  get(name: string): StyleConstant | undefined {
    return this.styles.get(name);
  }

  /** 전체 스타일 상수 배열 (바이너리 임베딩용) */
  toConstantBuffer(): Float32Array {
    const constants: number[] = [];
    for (const style of this.styles.values()) {
      // 16-float 정렬 블록 (64바이트, GPU 캐시라인 호환)
      constants.push(
        ...style.backgroundColor.map(v => v / 255),  // RGBA normalized
        ...style.padding,                              // padding TRBL
        ...style.borderRadius,                         // border-radius
        style.fontSize,                                // font-size
        style.fontWeight / 900,                        // font-weight normalized
        style.opacity,                                 // opacity
        style.display                                  // display enum
      );
    }
    return new Float32Array(constants);
  }

  /** C 코드 생성 (네이티브 빌드용) */
  toCSource(): string {
    const lines: string[] = [
      '/* MOSS-Style: Auto-generated style constants */',
      '/* Zero-runtime: all values computed at compile time */',
      '#pragma once',
      '#include <stdint.h>',
      '',
      'typedef struct {',
      '    float bg_color[4];      /* RGBA normalized */  ',
      '    float padding[4];       /* top, right, bottom, left */  ',
      '    float border_radius[4]; /* corners */  ',
      '    float font_size;',
      '    float font_weight;',
      '    float opacity;',
      '    float display;',
      '} MossStyleConst __attribute__((aligned(64)));',
      ''
    ];

    for (const [name, style] of this.styles) {
      const bg = style.backgroundColor.map(v => (v / 255).toFixed(4));
      const pd = style.padding.map(v => v.toFixed(1));
      const br = style.borderRadius.map(v => v.toFixed(1));

      lines.push(
        `static const MossStyleConst STYLE_${name.toUpperCase()} = {`,
        `    .bg_color = {${bg.join(', ')}},`,
        `    .padding = {${pd.join(', ')}},`,
        `    .border_radius = {${br.join(', ')}},`,
        `    .font_size = ${style.fontSize.toFixed(1)}f,`,
        `    .font_weight = ${(style.fontWeight / 900).toFixed(4)}f,`,
        `    .opacity = ${style.opacity.toFixed(4)}f,`,
        `    .display = ${style.display.toFixed(1)}f`,
        `};`,
        ''
      );
    }

    return lines.join('\n');
  }

  /** JavaScript 상수 생성 (웹 빌드용) */
  toJSSource(): string {
    const lines: string[] = [
      '/* MOSS-Style: Zero-runtime style constants */',
      'export const MOSS_STYLES = Object.freeze({'
    ];

    for (const [name, style] of this.styles) {
      const bg = style.backgroundColor;
      lines.push(
        `  ${name}: Object.freeze({`,
        `    bg: [${bg.join(',')}],`,
        `    padding: [${style.padding.join(',')}],`,
        `    borderRadius: [${style.borderRadius.join(',')}],`,
        `    fontSize: ${style.fontSize},`,
        `    fontWeight: ${style.fontWeight},`,
        `    color: [${style.color.join(',')}],`,
        `    opacity: ${style.opacity},`,
        `    display: ${style.display}`,
        `  }),`
      );
    }

    lines.push('});');
    return lines.join('\n');
  }

  /** 기본값 생성 */
  private createDefault(name: string): StyleConstant {
    return {
      name,
      backgroundColor: [0, 0, 0, 0],
      padding: [0, 0, 0, 0],
      borderRadius: [0, 0, 0, 0],
      fontSize: 16,
      fontWeight: 400,
      color: [0, 0, 0, 255],
      margin: [0, 0, 0, 0],
      width: 0,
      height: 0,
      opacity: 1.0,
      display: 0,
      rawProperties: new Map()
    };
  }

  /** 속성 적용 */
  private applyProperty(style: StyleConstant, prop: StyleProperty): void {
    const val = prop.value;
    const numVal = typeof val === 'number' ? val : parseFloat(String(val));

    switch (prop.name) {
      case 'background':
      case 'background-color':
        style.backgroundColor = this.parseColor(String(val));
        break;

      case 'color':
        style.color = this.parseColor(String(val));
        break;

      case 'padding':
        style.padding = this.parseBoxValues(String(val), prop.unit);
        break;

      case 'padding-top':
        style.padding[0] = numVal;
        break;
      case 'padding-right':
        style.padding[1] = numVal;
        break;
      case 'padding-bottom':
        style.padding[2] = numVal;
        break;
      case 'padding-left':
        style.padding[3] = numVal;
        break;

      case 'margin':
        style.margin = this.parseBoxValues(String(val), prop.unit);
        break;

      case 'border-radius':
        style.borderRadius = this.parseBoxValues(String(val), prop.unit);
        break;

      case 'font-size':
        style.fontSize = numVal || 16;
        break;

      case 'font-weight':
        if (String(val) === 'bold') style.fontWeight = 700;
        else if (String(val) === 'normal') style.fontWeight = 400;
        else style.fontWeight = numVal || 400;
        break;

      case 'opacity':
        style.opacity = numVal;
        break;

      case 'width':
        style.width = numVal || 0;
        break;

      case 'height':
        style.height = numVal || 0;
        break;

      case 'display':
        style.display = this.parseDisplay(String(val));
        break;

      default:
        style.rawProperties.set(prop.name, String(val) + (prop.unit || ''));
        break;
    }
  }

  /** #hex → RGBA */
  private parseColor(val: string): [number, number, number, number] {
    if (val.startsWith('#')) {
      const hex = val.slice(1);
      if (hex.length === 3) {
        return [
          parseInt(hex[0] + hex[0], 16),
          parseInt(hex[1] + hex[1], 16),
          parseInt(hex[2] + hex[2], 16),
          255
        ];
      }
      if (hex.length === 6) {
        return [
          parseInt(hex.slice(0, 2), 16),
          parseInt(hex.slice(2, 4), 16),
          parseInt(hex.slice(4, 6), 16),
          255
        ];
      }
      if (hex.length === 8) {
        return [
          parseInt(hex.slice(0, 2), 16),
          parseInt(hex.slice(2, 4), 16),
          parseInt(hex.slice(4, 6), 16),
          parseInt(hex.slice(6, 8), 16)
        ];
      }
    }

    // Named colors
    const named: Record<string, [number, number, number, number]> = {
      'white': [255, 255, 255, 255],
      'black': [0, 0, 0, 255],
      'red': [255, 0, 0, 255],
      'green': [0, 128, 0, 255],
      'blue': [0, 0, 255, 255],
      'transparent': [0, 0, 0, 0]
    };
    return named[val.toLowerCase()] || [0, 0, 0, 255];
  }

  /** "10px 20px" → [10, 20, 10, 20] (CSS shorthand) */
  private parseBoxValues(val: string, unit?: string): [number, number, number, number] {
    const parts = String(val).split(/\s+/).map(p => parseFloat(p) || 0);
    if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
    if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
    if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
    return [parts[0], parts[1], parts[2], parts[3]];
  }

  /** display 값 → enum */
  private parseDisplay(val: string): number {
    const map: Record<string, number> = {
      'block': 0, 'flex': 1, 'grid': 2, 'inline': 3, 'none': 4,
      'inline-block': 5, 'inline-flex': 6
    };
    return map[val] ?? 0;
  }
}
