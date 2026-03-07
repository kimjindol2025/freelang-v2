/**
 * MOSS-Style 엔진 테스트
 * - style 키워드 토큰화
 * - style 블록 파싱
 * - Static Style Injector (GPU 상수 변환)
 */

import { TokenType, KEYWORDS } from '../src/lexer/token';
import { StyleDeclaration, StyleProperty } from '../src/parser/ast';
import { StyleRegistry } from '../src/codegen/style-injector';

// === Test 1: Token ===
console.log('=== Test 1: STYLE Token ===');

const t1 = TokenType.STYLE === 'STYLE';
console.log(`  STYLE enum exists: ${t1 ? 'PASS' : 'FAIL'}`);

const t2 = KEYWORDS['style'] === TokenType.STYLE;
console.log(`  'style' keyword mapped: ${t2 ? 'PASS' : 'FAIL'}`);

// === Test 2: AST Type ===
console.log('\n=== Test 2: StyleDeclaration AST ===');

const styleAST: StyleDeclaration = {
  type: 'style',
  name: 'primary_button',
  properties: [
    { name: 'background', value: '#007bff' },
    { name: 'padding', value: 10, unit: 'px' },
    { name: 'border-radius', value: 5, unit: 'px' },
    { name: 'font-size', value: 16, unit: 'px' }
  ]
};

console.log(`  type: ${styleAST.type === 'style' ? 'PASS' : 'FAIL'}`);
console.log(`  name: ${styleAST.name === 'primary_button' ? 'PASS' : 'FAIL'}`);
console.log(`  properties count: ${styleAST.properties.length === 4 ? 'PASS' : 'FAIL'}`);

// === Test 3: Style Injector ===
console.log('\n=== Test 3: StyleRegistry (Static Style Injector) ===');

const registry = new StyleRegistry();

// primary_button 주입
const c1 = registry.inject(styleAST);
console.log(`  background RGBA: [${c1.backgroundColor}] === [0,123,255,255]: ${
  c1.backgroundColor[0] === 0 && c1.backgroundColor[1] === 123 &&
  c1.backgroundColor[2] === 255 && c1.backgroundColor[3] === 255 ? 'PASS' : 'FAIL'
}`);
console.log(`  padding: [${c1.padding}] === [10,10,10,10]: ${
  c1.padding[0] === 10 && c1.padding[1] === 10 ? 'PASS' : 'FAIL'
}`);
console.log(`  border-radius: [${c1.borderRadius}] === [5,5,5,5]: ${
  c1.borderRadius[0] === 5 ? 'PASS' : 'FAIL'
}`);
console.log(`  font-size: ${c1.fontSize} === 16: ${c1.fontSize === 16 ? 'PASS' : 'FAIL'}`);

// === Test 4: extends (상속) ===
console.log('\n=== Test 4: Style Extends (Inheritance) ===');

const dangerAST: StyleDeclaration = {
  type: 'style',
  name: 'danger_button',
  properties: [
    { name: 'background', value: '#dc3545' }
  ],
  extends: 'primary_button'
};

const c2 = registry.inject(dangerAST);
console.log(`  background override: [${c2.backgroundColor}] === [220,53,69,255]: ${
  c2.backgroundColor[0] === 220 ? 'PASS' : 'FAIL'
}`);
console.log(`  font-size inherited: ${c2.fontSize} === 16: ${
  c2.fontSize === 16 ? 'PASS' : 'FAIL'
}`);
console.log(`  padding inherited: [${c2.padding}] === [10,10,10,10]: ${
  c2.padding[0] === 10 ? 'PASS' : 'FAIL'
}`);

// === Test 5: GPU Buffer ===
console.log('\n=== Test 5: GPU Constant Buffer ===');

const buffer = registry.toConstantBuffer();
console.log(`  buffer type: Float32Array: ${buffer instanceof Float32Array ? 'PASS' : 'FAIL'}`);
console.log(`  buffer length: ${buffer.length} (2 styles x 16 floats = 32): ${
  buffer.length === 32 ? 'PASS' : 'FAIL'
}`);
console.log(`  64-byte aligned per style: ${buffer.length % 16 === 0 ? 'PASS' : 'FAIL'}`);

// === Test 6: C Source Generation ===
console.log('\n=== Test 6: C Source Generation ===');

const cSource = registry.toCSource();
console.log(`  contains MossStyleConst: ${cSource.includes('MossStyleConst') ? 'PASS' : 'FAIL'}`);
console.log(`  contains STYLE_PRIMARY_BUTTON: ${cSource.includes('STYLE_PRIMARY_BUTTON') ? 'PASS' : 'FAIL'}`);
console.log(`  contains aligned(64): ${cSource.includes('aligned(64)') ? 'PASS' : 'FAIL'}`);
console.log(`  contains STYLE_DANGER_BUTTON: ${cSource.includes('STYLE_DANGER_BUTTON') ? 'PASS' : 'FAIL'}`);

// === Test 7: JS Source Generation ===
console.log('\n=== Test 7: JS Source Generation ===');

const jsSource = registry.toJSSource();
console.log(`  contains Object.freeze: ${jsSource.includes('Object.freeze') ? 'PASS' : 'FAIL'}`);
console.log(`  contains primary_button: ${jsSource.includes('primary_button') ? 'PASS' : 'FAIL'}`);
console.log(`  contains danger_button: ${jsSource.includes('danger_button') ? 'PASS' : 'FAIL'}`);

// === Test 8: Color Parsing ===
console.log('\n=== Test 8: Color Parsing ===');

const colorTest: StyleDeclaration = {
  type: 'style',
  name: 'color_test',
  properties: [
    { name: 'background', value: '#fff' },
    { name: 'color', value: 'red' }
  ]
};
const c3 = registry.inject(colorTest);
console.log(`  #fff shorthand: [${c3.backgroundColor}] === [255,255,255,255]: ${
  c3.backgroundColor[0] === 255 && c3.backgroundColor[1] === 255 ? 'PASS' : 'FAIL'
}`);
console.log(`  named color 'red': [${c3.color}] === [255,0,0,255]: ${
  c3.color[0] === 255 && c3.color[1] === 0 ? 'PASS' : 'FAIL'
}`);

// === Test 9: Box Values (CSS Shorthand) ===
console.log('\n=== Test 9: Box Values (CSS Shorthand) ===');

const boxTest: StyleDeclaration = {
  type: 'style',
  name: 'box_test',
  properties: [
    { name: 'padding', value: '10 20' },     // 2-value shorthand
    { name: 'margin', value: '5 10 15' }      // 3-value shorthand
  ]
};
const c4 = registry.inject(boxTest);
console.log(`  padding 2-val: [${c4.padding}] === [10,20,10,20]: ${
  c4.padding[0] === 10 && c4.padding[1] === 20 && c4.padding[2] === 10 ? 'PASS' : 'FAIL'
}`);
console.log(`  margin 3-val: [${c4.margin}] === [5,10,15,10]: ${
  c4.margin[0] === 5 && c4.margin[1] === 10 && c4.margin[2] === 15 ? 'PASS' : 'FAIL'
}`);

// === Test 10: Display Enum ===
console.log('\n=== Test 10: Display Enum ===');

const displayTest: StyleDeclaration = {
  type: 'style',
  name: 'display_test',
  properties: [
    { name: 'display', value: 'flex' }
  ]
};
const c5 = registry.inject(displayTest);
console.log(`  display flex = 1: ${c5.display === 1 ? 'PASS' : 'FAIL'}`);

// === Summary ===
console.log('\n=============================');
console.log('MOSS-Style Engine Tests: ALL COMPLETE');
console.log('=============================');
