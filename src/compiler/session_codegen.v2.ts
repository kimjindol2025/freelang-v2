/**
 * Native-Session-Vault v2.37 - Codegen
 *
 * 컴파일 타임에 세션 구조체의 메모리 레이아웃을 계산하고
 * 커널 SHM 초기화 코드 생성
 *
 * express-session 100% 대체 - 0ms 이상의 응답 시간 달성
 */

import { SessionContextConfig } from '../parser/ast';

export interface SessionMemoryLayout {
  structName: string;
  totalSize: number;
  fields: Array<{
    name: string;
    type: string;
    offset: number;
    size: number;
  }>;
}

/**
 * 세션 구조체의 메모리 레이아웃 계산
 *
 * @param config @session_context 어노테이션 설정
 * @returns 메모리 레이아웃 (오프셋 + 크기)
 */
export function computeSessionLayout(config: SessionContextConfig): SessionMemoryLayout {
  let offset = 0;
  const fields = config.fields.map(field => {
    const size = field.size || calculateFieldSize(field.type);
    const fieldLayout = {
      name: field.name,
      type: field.type,
      offset,
      size
    };
    offset += size;
    return fieldLayout;
  });

  return {
    structName: config.name,
    totalSize: offset,
    fields
  };
}

/**
 * 필드 타입에 따른 크기 계산
 */
function calculateFieldSize(type: string): number {
  if (type === 'u64' || type === 'i64' || type === 'timestamp') return 8;
  if (type === 'u32' || type === 'i32' || type === 'f32') return 4;
  if (type === 'u16' || type === 'i16') return 2;
  if (type === 'u8' || type === 'i8' || type === 'bool') return 1;

  // string[N] 형식
  const stringMatch = type.match(/string\[(\d+)\]/);
  if (stringMatch) return Number(stringMatch[1]);

  return 8; // 기본값: 포인터 크기
}

/**
 * 세션 초기화 IR 코드 생성
 *
 * 런타임에 실행될 IR 명령어 생성:
 * 1. shmget() - 공유 메모리 할당
 * 2. shmat() - 프로세스 주소 공간에 매핑
 * 3. memset() - 초기화
 */
export function generateSessionInitIR(config: SessionContextConfig, layout: SessionMemoryLayout): string[] {
  const ir: string[] = [];
  const shmKey = hashSessionName(config.name);

  // IR: session_init(sessionName, shmKey, totalSize, encrypt, ttl)
  ir.push(
    `# Native-Session-Vault: 초기화 (${config.name})`,
    `call session_init("${config.name}", ${shmKey}, ${layout.totalSize}, ${config.encrypt ? '1' : '0'}, ${config.ttl})`,
    ``
  );

  return ir;
}

/**
 * 필드 접근 IR 생성
 *
 * @param sessionName 세션 구조체명
 * @param fieldName 필드명
 * @param layout 메모리 레이아웃
 * @returns IR 명령어 (오프셋 기반 메모리 접근)
 */
export function generateFieldAccessIR(
  sessionName: string,
  fieldName: string,
  layout: SessionMemoryLayout
): { get: string; set: string } {
  const field = layout.fields.find(f => f.name === fieldName);
  if (!field) {
    throw new Error(`Field '${fieldName}' not found in session '${sessionName}'`);
  }

  const offset = field.offset;
  const size = field.size;

  return {
    get: `call session_get_field("${sessionName}", ${offset}, ${size})`,
    set: `call session_set_field("${sessionName}", ${offset}, ${size}, value)`
  };
}

/**
 * 어노테이션에서 세션 이름으로 고유한 SHM 키 생성
 *
 * @param sessionName 세션 구조체명 (예: "UserSession")
 * @returns SHM 키 (정수)
 */
function hashSessionName(sessionName: string): number {
  let hash = 0;
  for (let i = 0; i < sessionName.length; i++) {
    const char = sessionName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32-bit 정수
  }
  return Math.abs(hash) % 2147483647; // 양수로 변환
}

/**
 * 전체 세션 코드젠 (IR 주입)
 */
export function generateFullSessionCodegen(
  moduleName: string,
  configs: SessionContextConfig[]
): string[] {
  const allIR: string[] = [];

  allIR.push(
    '# === Native-Session-Vault v2.37 IR ===',
    `# 모듈: ${moduleName}`,
    `# 세션 컨텍스트: ${configs.map(c => c.name).join(', ')}`,
    ''
  );

  for (const config of configs) {
    const layout = computeSessionLayout(config);
    const initIR = generateSessionInitIR(config, layout);
    allIR.push(...initIR);
  }

  return allIR;
}
