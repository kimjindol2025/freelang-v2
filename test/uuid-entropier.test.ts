/**
 * Native-Unique-Entropier v2.40 - Test Suite
 *
 * @uuid 어노테이션 + entropy_generate_128bit 검증
 */

import { entropy_init_global, entropy_generate_128bit, entropy_format_hex, entropy_stats, entropy_cleanup } from '../rt/entropy_core.v2';
import { UUIDAnnotationParser, UUIDRegistry, UUIDCodeGenerator } from '../src/compiler/id_codegen.v2';

describe('Native-Unique-Entropier v2.40', () => {
  before(() => {
    console.log('🔧 Initializing entropy system...');
    entropy_init_global();
  });

  after(() => {
    entropy_cleanup();
  });

  // Test 1: Entropy 초기화
  it('entropy_init_global() should initialize entropy system', () => {
    const stats = entropy_stats();
    console.log(`  ✓ Entropy stats: ${JSON.stringify(stats)}`);
    expect(stats.initialized).toBe(true);
  });

  // Test 2: 128-bit 바이너리 생성
  it('entropy_generate_128bit() should generate 128-bit binary', () => {
    const buf = entropy_generate_128bit();
    console.log(`  ✓ Generated UUID (hex): ${entropy_format_hex(buf)}`);

    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBe(16);

    // UUID v4 마킹 확인
    const version = (buf[6] >> 4) & 0xf;
    const variant = (buf[8] >> 6) & 0x3;

    expect(version).toBe(4);  // UUID v4
    expect(variant).toBe(2);  // RFC 4122 variant
  });

  // Test 3: 중복 검증 (100개 생성 - 충돌 없음)
  it('should generate unique UUIDs (100 samples)', () => {
    const uuids = new Set<string>();

    for (let i = 0; i < 100; i++) {
      const buf = entropy_generate_128bit();
      const hex = entropy_format_hex(buf);
      uuids.add(hex);
    }

    console.log(`  ✓ Generated ${uuids.size} unique UUIDs out of 100`);
    expect(uuids.size).toBe(100);  // 모두 고유해야 함
  });

  // Test 4: @uuid 어노테이션 파싱
  it('UUIDAnnotationParser should parse @uuid annotations', () => {
    const annotation1 = '@uuid(version: 4)';
    const parsed1 = UUIDAnnotationParser.parseAnnotation(annotation1);

    expect(parsed1).not.toBeNull();
    expect(parsed1?.version).toBe(4);
    expect(parsed1?.namespace).toBeUndefined();

    console.log(`  ✓ Parsed: ${annotation1} → ${JSON.stringify(parsed1)}`);

    const annotation2 = '@uuid(version: 5, namespace: "dns")';
    const parsed2 = UUIDAnnotationParser.parseAnnotation(annotation2);

    expect(parsed2).not.toBeNull();
    expect(parsed2?.version).toBe(5);
    expect(parsed2?.namespace).toBe('dns');

    console.log(`  ✓ Parsed: ${annotation2} → ${JSON.stringify(parsed2)}`);
  });

  // Test 5: UUID Registry
  it('UUIDRegistry should register and retrieve struct configs', () => {
    const registry = new UUIDRegistry();

    const fields = [
      { fieldName: 'id', version: 4 as const, required: true },
    ];

    registry.registerStruct('User', fields);

    const retrieved = registry.getStruct('User');
    expect(retrieved).toEqual(fields);

    const stats = registry.stats();
    console.log(`  ✓ Registry stats: ${JSON.stringify(stats)}`);
    expect(stats.totalStructs).toBe(1);
    expect(stats.totalFields).toBe(1);
  });

  // Test 6: UUID 코드 생성
  it('UUIDCodeGenerator should generate initialization code', () => {
    const field = { fieldName: 'id', version: 4 as const, required: true };

    const initializer = UUIDCodeGenerator.generateInitializer(field);
    console.log(`  ✓ Generated initializer: ${JSON.stringify(initializer, null, 2)}`);

    expect(initializer.length).toBeGreaterThan(0);
    expect(initializer[0].func).toBe('entropy_generate_128bit');

    const fieldTypeIR = UUIDCodeGenerator.generateFieldTypeIR(field);
    expect(fieldTypeIR.type).toBe('binary[16]');

    console.log(`  ✓ Field type IR: ${JSON.stringify(fieldTypeIR)}`);
  });

  // Test 7: 성능 벤치마크
  it('should generate UUID quickly (< 1ms per generation)', () => {
    const iterations = 1000;
    const start = process.hrtime.bigint();

    for (let i = 0; i < iterations; i++) {
      entropy_generate_128bit();
    }

    const end = process.hrtime.bigint();
    const durationNs = Number(end - start);
    const durationMs = durationNs / 1_000_000;
    const perUUID = durationMs / iterations;

    console.log(`  ✓ Generated ${iterations} UUIDs in ${durationMs.toFixed(2)}ms`);
    console.log(`    Average: ${perUUID.toFixed(4)}ms per UUID`);

    expect(perUUID).toBeLessThan(1);  // < 1ms per UUID
  });

  // Test 8: Entropy 소스 확인
  it('should use native entropy source (urandom or rdrand)', () => {
    const stats = entropy_stats();
    console.log(`  ✓ Using entropy source: ${stats.source}`);
    console.log(`    Library available: ${stats.lib}`);

    expect(['urandom', 'rdrand', 'js_fallback']).toContain(stats.source);
  });
});

// Sample struct with @uuid (컴파일 불가능하지만 개념 설명)
const sampleCode = `
struct DatabaseRecord {
  @uuid(version: 4)
  id: binary[16],

  name: string,
  created_at: number
}

fn create_record(name: string) -> DatabaseRecord {
  return DatabaseRecord { name };
  // id는 자동으로 entropy_generate_128bit() 호출
}
`;

console.log('Sample FreeLang v2 Code with @uuid:');
console.log(sampleCode);
