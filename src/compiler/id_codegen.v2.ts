/**
 * FreeLang v2.40 - UUID Code Generator (id_codegen.v2.ts)
 *
 * @uuid 어노테이션 처리:
 * - 컴파일 타임: 128-bit 바이너리 공간 예약
 * - 런타임: 엔트로피 코어에서 ID 즉시 할당
 * - 문자열 변환 없음 (pure binary)
 */

// IR Generator와 통합하기 위한 인터페이스 정의
export interface ASTNode {
  type: string;
  name?: string;
  body?: any[] | any;
  [key: string]: any;
}

export interface UUIDFieldConfig {
  fieldName: string;
  version: 4 | 5;  // UUID version
  namespace?: string;  // v5용
  required: boolean;
}

export interface UUIDAnnotation {
  type: 'uuid';
  version: 4 | 5;
  namespace?: string;
}

/**
 * @uuid 어노테이션 파서
 */
export class UUIDAnnotationParser {
  /**
   * parseAnnotation(annotation: string)
   * 예: "@uuid(version: 4)", "@uuid(version: 5, namespace: \"dns\")"
   */
  static parseAnnotation(annotationStr: string): UUIDAnnotation | null {
    const match = annotationStr.match(/@uuid\s*\(\s*([^)]*)\s*\)/);
    if (!match) return null;

    const params = match[1];
    const versionMatch = params.match(/version\s*:\s*(\d+)/);
    const namespaceMatch = params.match(/namespace\s*:\s*"([^"]*)"/);

    const version = versionMatch ? parseInt(versionMatch[1]) : 4;
    const namespace = namespaceMatch ? namespaceMatch[1] : undefined;

    if (version !== 4 && version !== 5) {
      throw new Error(`Invalid UUID version: ${version}. Supported: 4, 5`);
    }

    return { type: 'uuid', version, namespace };
  }

  /**
   * extractUUIDFields(structDef)
   * struct의 @uuid 필드 추출
   */
  static extractUUIDFields(node: ASTNode): UUIDFieldConfig[] {
    const fields: UUIDFieldConfig[] = [];

    if (!node.body) return fields;

    const body = node.body;
    for (const item of Array.isArray(body) ? body : [body]) {
      if (item.type !== 'VariableDeclaration') continue;

      const annotations = item.annotations || [];
      for (const annot of annotations) {
        if (annot.startsWith('@uuid')) {
          const parsedAnnot = this.parseAnnotation(annot);
          if (parsedAnnot) {
            fields.push({
              fieldName: item.name,
              version: parsedAnnot.version,
              namespace: parsedAnnot.namespace,
              required: true,
            });
          }
        }
      }
    }

    return fields;
  }
}

/**
 * UUID 코드 생성기
 */
export class UUIDCodeGenerator {
  /**
   * generateInitializer(field: UUIDFieldConfig)
   * 필드 초기화 IR 생성
   *
   * 출력 예:
   * [
   *   { op: 'CALL', func: 'entropy_generate_128bit', args: [] },
   *   { op: 'STORE_FIELD', field: 'id' },
   * ]
   */
  static generateInitializer(field: UUIDFieldConfig): any[] {
    return [
      {
        op: 'CALL_NATIVE',
        func: 'entropy_generate_128bit',
        args: [],
        resultType: 'binary[16]',
      },
      {
        op: 'STORE_FIELD',
        field: field.fieldName,
        type: 'binary[16]',
      },
    ];
  }

  /**
   * generateFieldTypeIR(field: UUIDFieldConfig)
   * struct 필드 타입 정의 IR
   */
  static generateFieldTypeIR(field: UUIDFieldConfig): any {
    return {
      name: field.fieldName,
      type: 'binary[16]',
      nullable: false,
      default: null,  // 런타임 초기화
      annotation: `@uuid(version: ${field.version})`,
    };
  }

  /**
   * generateConstructorBody(fields: UUIDFieldConfig[])
   * 생성자 본체 코드 생성
   */
  static generateConstructorBody(fields: UUIDFieldConfig[]): string {
    const lines: string[] = [
      '// UUID 필드 초기화 (자동 엔트로피)',
    ];

    for (const field of fields) {
      lines.push(`this.${field.fieldName} = entropy_generate_128bit();`);
    }

    return lines.join('\n');
  }

  /**
   * generateHexFormatter(fieldName: string)
   * 바이너리 → 16진수 문자열 변환 함수 생성
   */
  static generateHexFormatter(fieldName: string): string {
    return `
/**
 * Get ${fieldName} as formatted UUID string
 * Example: "550e8400-e29b-41d4-a716-446655440000"
 */
get_${fieldName}_hex(): string {
  return entropy_format_hex(this.${fieldName});
}
    `.trim();
  }
}

/**
 * Module 레벨 UUID 레지스트리
 */
export class UUIDRegistry {
  private structs: Map<string, UUIDFieldConfig[]> = new Map();

  /**
   * registerStruct(structName: string, fields: UUIDFieldConfig[])
   */
  registerStruct(structName: string, fields: UUIDFieldConfig[]) {
    if (fields.length > 0) {
      this.structs.set(structName, fields);
    }
  }

  /**
   * getStruct(structName: string)
   */
  getStruct(structName: string): UUIDFieldConfig[] | undefined {
    return this.structs.get(structName);
  }

  /**
   * getAll()
   */
  getAll(): Map<string, UUIDFieldConfig[]> {
    return this.structs;
  }

  /**
   * stats()
   */
  stats(): { totalStructs: number; totalFields: number } {
    let totalFields = 0;
    for (const fields of this.structs.values()) {
      totalFields += fields.length;
    }
    return { totalStructs: this.structs.size, totalFields };
  }
}

/**
 * UUID Patch Generator
 * 기존 struct 정의에 UUID 필드 추가
 */
export class UUIDPatchGenerator {
  /**
   * patchStructDefinition(structAst, uuidFields)
   * 기존 struct AST에 UUID 초기화 코드 삽입
   */
  static patchStructDefinition(
    structAst: ASTNode,
    uuidFields: UUIDFieldConfig[]
  ): ASTNode {
    if (!structAst.body) {
      structAst.body = [];
    }

    const body = Array.isArray(structAst.body) ? structAst.body : [structAst.body];

    // 기존 constructor 찾기 또는 생성
    let constructor = body.find((item: any) => item.type === 'FunctionStatement' && item.name === 'constructor');

    if (!constructor) {
      constructor = {
        type: 'FunctionStatement',
        name: 'constructor',
        params: [],
        body: [],
        annotations: [],
      };
      body.push(constructor);
    }

    // UUID 초기화 코드 추가
    const constructorBody = constructor.body || [];
    for (const field of uuidFields) {
      constructorBody.push({
        type: 'ExpressionStatement',
        expression: {
          type: 'AssignmentExpression',
          left: {
            type: 'MemberExpression',
            object: { type: 'ThisExpression' },
            property: { type: 'Identifier', name: field.fieldName },
          },
          right: {
            type: 'CallExpression',
            callee: { type: 'Identifier', name: 'entropy_generate_128bit' },
            arguments: [],
          },
        },
      });
    }

    constructor.body = constructorBody;

    return structAst;
  }
}

/**
 * Phase 4c: UUID 코드젠 통합
 * ir-generator.ts에서 호출될 예정
 */
export function integrateUUIDCodegen(irGenerator: any) {
  // UUID 레지스트리 초기화
  const uuidRegistry = new UUIDRegistry();

  // IRGenerator에 UUID 처리 추가
  const originalTraverse = irGenerator.traverse;

  irGenerator.traverse = function (node: ASTNode, instructions: any[]) {
    // Struct 정의 처리
    if (node.type === 'StructDeclaration') {
      const uuidFields = UUIDAnnotationParser.extractUUIDFields(node);
      if (uuidFields.length > 0) {
        uuidRegistry.registerStruct(node.name, uuidFields);

        // Struct 정의에 UUID 초기화 코드 패치
        const patched = UUIDPatchGenerator.patchStructDefinition(node, uuidFields);
        return originalTraverse.call(this, patched, instructions);
      }
    }

    return originalTraverse.call(this, node, instructions);
  };

  // UUID 레지스트리를 IRGenerator에 연결
  (irGenerator as any).uuidRegistry = uuidRegistry;

  return irGenerator;
}
