/**
 * FreeLang v2 - Compile-Time-Validator 유닛 테스트
 *
 * validator-codegen.ts 직접 검증 (ts-node 실행)
 * Joi 완전 대체 셀프호스팅 증명
 */

import { Lexer, TokenBuffer } from './src/lexer/lexer';
import { Parser } from './src/parser/parser';
import { generateValidatorMeta } from './src/codegen/validator-codegen';

// ─── 테스트할 FreeLang 소스 (컴파일러 자신의 설정 형식) ─────────────────────
const FREELANG_SOURCE = `
struct UserRegistration {
    @check(min: 3, max: 20)
    username: string,

    @check(pattern: "^[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+$")
    email: string,

    @check(min: 18, max: 120)
    age: int
}

struct Product {
    @check(min: 1, max: 100)
    name: string,

    @check(min: 0, max: 9999999)
    price: int,

    @check(min: 0)
    stock: int
}

struct CompilerConfig {
    @check(min: 1, max: 50)
    version: string,

    @check(pattern: "^(debug|release|test)$")
    mode: string,

    @check(min: 1024, max: 65535)
    port: int
}
`;

// ─── 파싱 + 컴파일 타임 메타데이터 생성 ─────────────────────────────────────
const lexer = new Lexer(FREELANG_SOURCE);
const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: false });
const parser = new Parser(tokenBuffer);
const ast = parser.parseModule() as any;
const metas = generateValidatorMeta(ast);

let passed = 0;
let failed = 0;

function test(name: string, condition: boolean): void {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${name}`);
    failed++;
  }
}

// ─── [1] 컴파일 타임 메타데이터 생성 검증 ───────────────────────────────────
console.log('\n=== [1] 컴파일 타임 메타데이터 생성 ===');
test('3개 struct 검증 메타데이터 생성', metas.length === 3);
test('UserRegistration 메타 존재', metas.some(m => m.structName === 'UserRegistration'));
test('Product 메타 존재', metas.some(m => m.structName === 'Product'));
test('CompilerConfig 메타 존재', metas.some(m => m.structName === 'CompilerConfig'));

const userMeta = metas.find(m => m.structName === 'UserRegistration')!;
test('UserRegistration: 3개 필드 규칙', userMeta.fields.length === 3);

const usernameMeta = userMeta.fields.find(f => f.fieldName === 'username')!;
test('username: min=3 컴파일', usernameMeta.constraint.min === 3);
test('username: max=20 컴파일', usernameMeta.constraint.max === 20);
test('email: pattern 컴파일 (RegExp 객체)', userMeta.fields.find(f => f.fieldName === 'email')!.compiledPattern instanceof RegExp);

// ─── [2] UserRegistration 정상 데이터 검증 ──────────────────────────────────
console.log('\n=== [2] UserRegistration 정상 데이터 검증 ===');
const validUser = { username: 'kimjin', email: 'jin@dclub.kr', age: 30 };
test('정상 데이터: isValid() = true', userMeta.isValidFn(validUser));
test('정상 데이터: getErrors() = []', userMeta.getErrorsFn(validUser).length === 0);

// ─── [3] username 길이 검증 ──────────────────────────────────────────────────
console.log('\n=== [3] username 길이 검증 ===');
const shortUsername = { username: 'ab', email: 'ok@test.kr', age: 25 };
const longUsername  = { username: 'a'.repeat(21), email: 'ok@test.kr', age: 25 };
test('username 2자: isValid() = false (min:3)', !userMeta.isValidFn(shortUsername));
test('username 21자: isValid() = false (max:20)', !userMeta.isValidFn(longUsername));
test('짧은 username 에러 메시지 포함', userMeta.getErrorsFn(shortUsername).some(e => e.includes('최소 3자')));
test('긴 username 에러 메시지 포함', userMeta.getErrorsFn(longUsername).some(e => e.includes('최대 20자')));

// ─── [4] email SIMD 패턴 검증 ────────────────────────────────────────────────
console.log('\n=== [4] email SIMD 패턴 검증 ===');
const invalidEmails = [
  { email: 'not-an-email', desc: '@ 없음' },
  { email: 'spaces in@email.kr', desc: '공백 포함' },
  { email: '@nodomain.kr', desc: '로컬 파트 없음' },
];
for (const { email, desc } of invalidEmails) {
  const user = { username: 'testuser', email, age: 25 };
  test(`이메일 오류 감지 (${desc})`, !userMeta.isValidFn(user));
}
const validEmail = { username: 'testuser', email: 'valid@domain.kr', age: 25 };
test('유효한 이메일 통과', userMeta.isValidFn(validEmail));

// ─── [5] age 범위 검증 ───────────────────────────────────────────────────────
console.log('\n=== [5] age 범위 검증 ===');
const underage  = { username: 'young', email: 'y@test.kr', age: 17 };
const overage   = { username: 'old', email: 'o@test.kr', age: 121 };
const justRight = { username: 'valid', email: 'v@test.kr', age: 18 };
test('17세: isValid() = false (min:18)', !userMeta.isValidFn(underage));
test('121세: isValid() = false (max:120)', !userMeta.isValidFn(overage));
test('18세: isValid() = true (경계값)', userMeta.isValidFn(justRight));
test('나이 오류 메시지 포함', userMeta.getErrorsFn(underage).some(e => e.includes('18')));

// ─── [6] Error-Trace-Context: 다중 오류 수집 ────────────────────────────────
console.log('\n=== [6] Error-Trace-Context - 다중 오류 수집 ===');
const allBad = { username: 'x', email: 'invalid', age: 10 };
const errors = userMeta.getErrorsFn(allBad);
test('3개 모든 필드 오류 수집', errors.length === 3);
test('username 오류 포함', errors.some(e => e.includes('username')));
test('email 오류 포함', errors.some(e => e.includes('email')));
test('age 오류 포함', errors.some(e => e.includes('age')));
console.log('  수집된 오류:');
for (const err of errors) {
  console.log(`    - ${err}`);
}

// ─── [7] Product 검증 ────────────────────────────────────────────────────────
console.log('\n=== [7] Product 검증 ===');
const productMeta = metas.find(m => m.structName === 'Product')!;
test('Product: 3개 필드 규칙', productMeta.fields.length === 3);
const validProduct = { name: 'FreeLang', price: 9900, stock: 50 };
const freeProduct  = { name: 'FreeLang', price: 0, stock: 0 };  // 무료 + 품절
const badProduct   = { name: '', price: -1, stock: -1 };
test('유효한 Product 통과', productMeta.isValidFn(validProduct));
test('가격=0, 재고=0 통과 (경계값)', productMeta.isValidFn(freeProduct));
test('빈 이름 + 음수 가격/재고 오류', !productMeta.isValidFn(badProduct));

// ─── [8] CompilerConfig - FreeLang 컴파일러 설정 검증 (셀프호스팅) ───────────
console.log('\n=== [8] CompilerConfig 셀프호스팅 검증 ===');
const configMeta = metas.find(m => m.structName === 'CompilerConfig')!;
const validConfig  = { version: 'v2.21', mode: 'release', port: 3000 };
const debugConfig  = { version: 'v2.22-dev', mode: 'debug', port: 8080 };
const badConfig    = { version: '', mode: 'production', port: 80 };  // mode=production은 패턴 불일치
test('release 모드 설정 통과', configMeta.isValidFn(validConfig));
test('debug 모드 설정 통과', configMeta.isValidFn(debugConfig));
test('production 모드 오류 감지 (패턴 불일치)', !configMeta.isValidFn(badConfig));
test('포트 80: 오류 감지 (min:1024)', !configMeta.isValidFn({ version: 'v2', mode: 'debug', port: 80 }));
test('포트 65535: 통과 (경계값)', configMeta.isValidFn({ version: 'v2', mode: 'test', port: 65535 }));

// ─── [9] Zero-branch 성능: 정상 데이터 반복 검증 ────────────────────────────
console.log('\n=== [9] Zero-branch 성능 검증 (10,000회) ===');
const t0 = Date.now();
for (let i = 0; i < 10000; i++) {
  userMeta.isValidFn(validUser);
}
const t1 = Date.now();
const elapsed = t1 - t0;
console.log(`  10,000회 isValid() 실행: ${elapsed}ms`);
test(`성능: 10,000회 < 100ms (실제: ${elapsed}ms)`, elapsed < 100);

// ─── 최종 결과 ──────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(60)}`);
console.log(`FreeLang v2 Compile-Time-Validator 유닛 테스트`);
console.log(`  통과: ${passed}개 / 실패: ${failed}개`);
console.log(`  외부 의존성: 0% (Joi 완전 대체)`);
console.log(`  셀프호스팅: CompilerConfig → FreeLang 컴파일러 설정 자체 검증`);
console.log('='.repeat(60));

if (failed > 0) process.exit(1);
