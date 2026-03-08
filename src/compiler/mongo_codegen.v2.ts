/**
 * Native-Mongo-Vault v2.42 - Code Generator
 *
 * MongoDB 저장을 위한 BSON 바이너리 커널
 * connect-mongo의 모든 런타임 오버헤드 제거 (Zero-copy streaming)
 *
 * @mongo_store 어노테이션으로 세션/데이터 구조체를 MongoDB에 직접 저장
 *
 * 컴파일 타임 처리:
 * 1. 구조체의 메모리 레이아웃을 BSON 문서로 변환
 * 2. 필드별로 BSON 인코딩 IR 생성 (타입별)
 * 3. MongoDB 프로토콜 메시지 생성 IR
 *
 * 런타임 처리:
 * - rt/mongo_vault.v2.c: BSON 직렬화 + TCP 스트리밍
 * - Zero-copy: 메모리 → BSON 바이너리 → 네트워크 (중간 변환 없음)
 */

import { MongoStoreConfig } from '../parser/ast';

/**
 * MongoDB 문서의 BSON 메모리 레이아웃
 */
export interface MongoDocumentLayout {
  documentName: string;
  mongoUri: string;
  collection: string;
  totalBsonSize: number;  // BSON 문서 전체 크기 (헤더 포함)
  fields: Array<{
    name: string;
    type: string;
    bsonType: string;  // BSON 타입 (0x01=double, 0x02=string, 0x03=document, etc)
    offset: number;    // 메모리 오프셋
    bsonOffset: number;  // BSON 문서 내 오프셋
    size: number;      // 필드 크기
    encodingIR: string;  // BSON 인코딩 IR 명령어
  }>;
}

/**
 * FreeLang 타입을 BSON 타입으로 매핑
 */
export function mapToBsonType(freelangType: string): { bsonType: number; typeName: string } {
  const mapping: { [key: string]: { bsonType: number; typeName: string } } = {
    'f64': { bsonType: 0x01, typeName: 'double' },
    'f32': { bsonType: 0x01, typeName: 'double' },  // 32bit float → 64bit double
    'u64': { bsonType: 0x12, typeName: 'int64' },
    'i64': { bsonType: 0x12, typeName: 'int64' },
    'u32': { bsonType: 0x10, typeName: 'int32' },
    'i32': { bsonType: 0x10, typeName: 'int32' },
    'u16': { bsonType: 0x10, typeName: 'int32' },
    'i16': { bsonType: 0x10, typeName: 'int32' },
    'u8': { bsonType: 0x10, typeName: 'int32' },
    'i8': { bsonType: 0x10, typeName: 'int32' },
    'bool': { bsonType: 0x08, typeName: 'boolean' },
    'string': { bsonType: 0x02, typeName: 'string' },
    'json': { bsonType: 0x03, typeName: 'document' },
    'timestamp': { bsonType: 0x09, typeName: 'date' },
    'bytes': { bsonType: 0x05, typeName: 'binary' },
  };

  const result = mapping[freelangType];
  if (!result) {
    throw new Error(`Unsupported type for MongoDB: ${freelangType}`);
  }
  return result;
}

/**
 * FreeLang 필드 크기 계산 (메모리 레이아웃용)
 */
function calculateFieldSize(type: string): number {
  if (type === 'f64' || type === 'u64' || type === 'i64' || type === 'timestamp') return 8;
  if (type === 'f32' || type === 'u32' || type === 'i32' || type === 'u16' || type === 'i16') return 4;
  if (type === 'u8' || type === 'i8' || type === 'bool') return 1;

  // string[N] 형식
  const stringMatch = type.match(/string\[(\d+)\]/);
  if (stringMatch) return Number(stringMatch[1]) + 4; // +4 for BSON length prefix

  return 8; // 기본값: 포인터 크기
}

/**
 * BSON 필드 크기 계산 (BSON 레이아웃용)
 * BSON 형식: [1 byte type] [null-terminated key] [typed value]
 */
function calculateBsonFieldSize(fieldName: string, type: string, bsonType: number): number {
  let size = 1; // type byte
  size += fieldName.length + 1; // field name + null terminator

  // 타입별 값 크기
  switch (bsonType) {
    case 0x01: size += 8; break;  // double
    case 0x02: size += 4; break;  // string length prefix (값은 별도)
    case 0x08: size += 1; break;  // boolean
    case 0x09: size += 8; break;  // date
    case 0x0A: size += 0; break;  // null
    case 0x10: size += 4; break;  // int32
    case 0x12: size += 8; break;  // int64
    case 0x03: size += 4; break;  // embedded document length prefix
    case 0x05: size += 5; break;  // binary subtype(1) + length(4)
    default: size += 8;
  }

  return size;
}

/**
 * 필드별 BSON 인코딩 IR 생성
 *
 * @param fieldName 필드명
 * @param type FreeLang 타입
 * @param memoryOffset 메모리 오프셋
 * @param bsonOffset BSON 문서 내 오프셋
 * @returns BSON 인코딩 IR 명령어
 */
function generateBsonFieldEncodingIR(
  fieldName: string,
  type: string,
  memoryOffset: number,
  bsonOffset: number
): string {
  const { bsonType, typeName } = mapToBsonType(type);

  // IR: bson_encode_field(fieldName, bsonType, memOffset, bsonOffset, length?)
  let ir = `# BSON field: "${fieldName}" (${typeName})`;
  ir += `\n  call bson_encode_${typeName}("${fieldName}", ${bsonType}, ${memoryOffset}, ${bsonOffset}`;

  if (type.includes('[')) {
    const lenMatch = type.match(/\[(\d+)\]/);
    if (lenMatch) {
      ir += `, ${lenMatch[1]}`;
    }
  }
  ir += ')';

  return ir;
}

/**
 * MongoDB 문서의 전체 BSON 메모리 레이아웃 계산
 *
 * BSON 형식:
 * [4 bytes: document length] [fields...] [1 byte: 0x00 (end marker)]
 *
 * @param config @mongo_store 어노테이션 설정
 * @returns BSON 레이아웃
 */
export function computeMongoLayout(config: MongoStoreConfig): MongoDocumentLayout {
  let memoryOffset = 0;
  let bsonOffset = 4; // BSON 문서는 길이 4바이트로 시작
  const fields: MongoDocumentLayout['fields'] = [];

  for (const field of config.fields) {
    const memSize = calculateFieldSize(field.type);
    const { bsonType } = mapToBsonType(field.type);
    const bsonSize = calculateBsonFieldSize(field.name, field.type, bsonType);

    const encodingIR = generateBsonFieldEncodingIR(
      field.name,
      field.type,
      memoryOffset,
      bsonOffset
    );

    fields.push({
      name: field.name,
      type: field.type,
      bsonType: bsonType.toString(16).padStart(2, '0'),
      offset: memoryOffset,
      bsonOffset: bsonOffset,
      size: memSize,
      encodingIR
    });

    memoryOffset += memSize;
    bsonOffset += bsonSize;
  }

  // +1 for BSON end marker (0x00)
  const totalBsonSize = bsonOffset + 1;

  return {
    documentName: config.name,
    mongoUri: config.uri,
    collection: config.collection,
    totalBsonSize,
    fields
  };
}

/**
 * MongoDB 연결 초기화 IR 생성
 *
 * 컴파일 타임에 다음을 생성:
 * 1. mongo_connect() - 접속 풀 초기화
 * 2. mongo_collection_register() - 컬렉션 등록
 * 3. 인덱스 생성 (있으면)
 */
export function generateMongoInitIR(config: MongoStoreConfig, layout: MongoDocumentLayout): string[] {
  const ir: string[] = [];

  ir.push(
    `# === Native-Mongo-Vault v2.42 Initialization ===`,
    `# Document: ${config.name}`,
    `# Collection: ${config.collection}`,
    `# URI: ${config.uri}`,
    ``
  );

  // 1. MongoDB 연결 초기화
  ir.push(
    `call mongo_connect("${config.uri}", ${config.maxConnections || 10}, ${config.poolTimeout || 5000})`
  );

  // 2. 컬렉션 등록
  ir.push(
    `call mongo_collection_register("${config.collection}", "${config.name}", ${layout.totalBsonSize})`
  );

  // 3. 인덱스 생성 (있으면)
  if (config.indexes && config.indexes.length > 0) {
    for (const index of config.indexes) {
      const fields = index.fields.join(',');
      ir.push(
        `call mongo_create_index("${config.collection}", "${fields}", ${index.unique ? '1' : '0'})`
      );
    }
  }

  ir.push('');

  return ir;
}

/**
 * 저장 작업 IR 생성
 *
 * @param documentName 문서명
 * @param layout BSON 레이아웃
 * @param operation 'insert' | 'update' | 'delete'
 * @param queryFilter 쿼리 필터 (선택)
 * @returns IR 명령어
 */
export function generateMongoOperationIR(
  documentName: string,
  layout: MongoDocumentLayout,
  operation: 'insert' | 'update' | 'delete',
  queryFilter?: string
): string[] {
  const ir: string[] = [];

  ir.push(
    `# MongoDB ${operation.toUpperCase()} operation: ${documentName}`,
    ``
  );

  if (operation === 'insert') {
    ir.push(
      `call mongo_insert("${layout.collection}", buffer_ptr, ${layout.totalBsonSize})`
    );
  } else if (operation === 'update') {
    ir.push(
      `call mongo_update("${layout.collection}", "${queryFilter || '_id'}", buffer_ptr, ${layout.totalBsonSize})`
    );
  } else if (operation === 'delete') {
    ir.push(
      `call mongo_delete("${layout.collection}", "${queryFilter || '_id'}")`
    );
  }

  ir.push('');

  return ir;
}

/**
 * BSON 직렬화 IR 생성
 *
 * 메모리 버퍼 → BSON 바이너리 변환
 * 모든 필드를 순서대로 인코딩
 */
export function generateBsonSerializationIR(layout: MongoDocumentLayout): string[] {
  const ir: string[] = [];

  ir.push(
    `# === BSON Serialization (Zero-copy) ===`,
    `# Document: ${layout.documentName}`,
    `# Total BSON size: ${layout.totalBsonSize} bytes`,
    ``
  );

  // 1. 버퍼 할당 및 길이 설정
  ir.push(
    `call bson_buffer_alloc(${layout.totalBsonSize})`,
    `call bson_write_u32(0, ${layout.totalBsonSize})  # BSON document length`,
    ``
  );

  // 2. 필드별 인코딩
  for (const field of layout.fields) {
    ir.push(field.encodingIR);
  }

  // 3. BSON 종료 마커
  ir.push(
    `call bson_write_u8(${layout.totalBsonSize - 1}, 0x00)  # BSON end marker`,
    ``
  );

  return ir;
}

/**
 * @mongo_store 어노테이션의 전체 코드젠
 *
 * 컴파일 타임에 생성되는 IR:
 * 1. 초기화 IR (mongo_connect, mongo_collection_register)
 * 2. BSON 직렬화 IR
 * 3. 저장 작업 IR (insert/update/delete)
 */
export function generateFullMongoCodegen(
  moduleName: string,
  configs: MongoStoreConfig[]
): string[] {
  const allIR: string[] = [];

  allIR.push(
    '# === Native-Mongo-Vault v2.42 Complete Codegen ===',
    `# Module: ${moduleName}`,
    `# MongoDB stores: ${configs.length}`,
    ''
  );

  for (const config of configs) {
    const layout = computeMongoLayout(config);

    // 1. 초기화 IR
    const initIR = generateMongoInitIR(config, layout);
    allIR.push(...initIR);

    // 2. BSON 직렬화 IR
    const bsonIR = generateBsonSerializationIR(layout);
    allIR.push(...bsonIR);

    // 3. 저장 작업 IR (자동 주입)
    const insertIR = generateMongoOperationIR(
      config.name,
      layout,
      'insert'
    );
    allIR.push(...insertIR);
  }

  return allIR;
}

/**
 * 런타임 검증: BSON 문서 크기 체크
 *
 * MongoDB BSON 최대 크기: 16 MB
 * 경고: 문서가 너무 크면 청크 분할 제안
 */
export function validateMongoDocumentSize(layout: MongoDocumentLayout): {
  valid: boolean;
  warning?: string;
} {
  const MAX_BSON_SIZE = 16 * 1024 * 1024; // 16 MB
  const WARN_THRESHOLD = 10 * 1024 * 1024; // 10 MB

  if (layout.totalBsonSize > MAX_BSON_SIZE) {
    return {
      valid: false,
      warning: `BSON document size (${layout.totalBsonSize} bytes) exceeds MongoDB limit (16 MB)`
    };
  }

  if (layout.totalBsonSize > WARN_THRESHOLD) {
    return {
      valid: true,
      warning: `BSON document size (${layout.totalBsonSize} bytes) is large, consider chunking`
    };
  }

  return { valid: true };
}

/**
 * 문서 필드 접근 IR 생성
 *
 * @param documentName 문서명
 * @param fieldName 필드명
 * @param layout BSON 레이아웃
 * @param operation 'read' | 'write'
 * @returns IR 명령어
 */
export function generateMongoFieldAccessIR(
  documentName: string,
  fieldName: string,
  layout: MongoDocumentLayout,
  operation: 'read' | 'write'
): string {
  const field = layout.fields.find(f => f.name === fieldName);
  if (!field) {
    throw new Error(`Field '${fieldName}' not found in document '${documentName}'`);
  }

  const offset = field.offset;
  const size = field.size;

  if (operation === 'read') {
    return `call mongo_read_field("${documentName}", ${offset}, ${size})`;
  } else {
    return `call mongo_write_field("${documentName}", ${offset}, ${size}, value)`;
  }
}
