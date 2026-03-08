/**
 * FreeLang v2 - Compile-Time-ORM Code Generator
 *
 * @db_table, @db_column 어노테이션이 붙은 struct를 분석하여
 * 컴파일 타임에 최적화된 SQL 쿼리 바인딩을 생성합니다.
 *
 * 외부 라이브러리(Sequelize 등) 없이 PostgreSQL/SQLite 프로토콜 직접 통신.
 *
 * 사용법:
 *   @db_table(name: "wash_logs")
 *   struct WashLog {
 *     @db_id @db_auto_inc id: int,
 *     @db_column(type: varchar) site_name: string,
 *     @db_column(type: timestamp) created_at: int
 *   }
 *
 *   // 컴파일 타임에 자동 생성됨:
 *   // WashLog_table_init(db_id)
 *   // WashLog_insert(db_id, site_name, created_at) → id
 *   // WashLog_find_all(db_id, limit) → array
 *   // WashLog_find_one(db_id, id) → map | null
 *   // WashLog_update(db_id, id, site_name, created_at) → bool
 *   // WashLog_delete(db_id, id) → bool
 */

import { Module } from '../parser/ast';
import { ORMAnnotation } from '../parser/ast';

/**
 * 필드 타입 → SQLite 컬럼 타입 매핑
 */
const FREELANG_TO_SQL_TYPE: Record<string, string> = {
  int: 'INTEGER',
  float: 'REAL',
  string: 'TEXT',
  bool: 'INTEGER',    // SQLite: 0 / 1
  varchar: 'TEXT',
  timestamp: 'INTEGER',
  text: 'TEXT',
  any: 'TEXT',
};

/**
 * 직렬화된 어노테이션 문자열 파싱
 * "db_table:name=wash_logs" → { name: 'db_table', args: { name: 'wash_logs' } }
 * "db_id" → { name: 'db_id' }
 * "db_column:type=varchar,pk=true" → { name: 'db_column', args: { type: 'varchar', pk: 'true' } }
 */
function parseAnnotationString(raw: string): ORMAnnotation {
  const colonIdx = raw.indexOf(':');
  if (colonIdx < 0) return { name: raw };
  const name = raw.slice(0, colonIdx);
  const argsStr = raw.slice(colonIdx + 1);
  const args: Record<string, string> = {};
  for (const pair of argsStr.split(',')) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx > 0) {
      args[pair.slice(0, eqIdx).trim()] = pair.slice(eqIdx + 1).trim();
    } else if (pair.trim()) {
      args['value'] = pair.trim();
    }
  }
  return { name, args };
}

/**
 * struct 어노테이션에서 @db_table 정보 추출
 * annotations 배열은 ORMAnnotation 또는 직렬화 문자열 모두 지원
 */
function getTableAnnotation(annotations: (ORMAnnotation | string)[]): ORMAnnotation | undefined {
  for (const a of annotations) {
    const parsed = typeof a === 'string' ? parseAnnotationString(a) : a;
    if (parsed.name === 'db_table') return parsed;
  }
  return undefined;
}

/**
 * 필드 어노테이션에서 정보 추출 (string 또는 ORMAnnotation 모두 지원)
 */
function parseFieldAnnotations(raw: (ORMAnnotation | string)[] | undefined): ORMAnnotation[] {
  return (raw || []).map(a => typeof a === 'string' ? parseAnnotationString(a) : a);
}

function isFieldId(annotations: (ORMAnnotation | string)[] | undefined): boolean {
  return parseFieldAnnotations(annotations).some(a => a.name === 'db_id');
}

function isAutoInc(annotations: (ORMAnnotation | string)[] | undefined): boolean {
  return parseFieldAnnotations(annotations).some(a => a.name === 'db_auto_inc');
}

function getColumnType(annotations: (ORMAnnotation | string)[] | undefined, fieldType?: string): string {
  const parsed = parseFieldAnnotations(annotations);
  const colAnnot = parsed.find(a => a.name === 'db_column');
  const annotType = colAnnot?.args?.type || colAnnot?.args?.value;
  const resolved = annotType ? FREELANG_TO_SQL_TYPE[annotType] || annotType.toUpperCase() : undefined;
  return resolved || FREELANG_TO_SQL_TYPE[fieldType || 'any'] || 'TEXT';
}

/**
 * 컴파일 타임에 생성된 ORM 메타데이터
 * VM 시작 시 orm-native.ts에 등록됨
 */
export interface ORMTableMeta {
  tableName: string;       // DB 테이블명 (예: "wash_logs")
  structName: string;      // FreeLang struct명 (예: "WashLog")
  idField: string;         // PK 필드명 (예: "id")
  autoInc: boolean;        // AUTO INCREMENT 여부
  fields: Array<{
    name: string;
    sqlType: string;
    isPk: boolean;
    autoInc: boolean;
  }>;
  // Compile-Time Pre-built SQL
  sql: {
    createTable: string;
    insertAll: string;      // INSERT INTO t (f1,f2,...) VALUES (?,?,...)
    selectAll: string;      // SELECT * FROM t
    selectById: string;     // SELECT * FROM t WHERE id=?
    updateById: string;     // UPDATE t SET f1=?,f2=? WHERE id=?
    deleteById: string;     // DELETE FROM t WHERE id=?
  };
}

/**
 * Module AST를 스캔하여 @db_table 어노테이션이 붙은 struct를 찾고
 * 컴파일 타임에 SQL 쿼리를 생성합니다.
 *
 * @returns ORMTableMeta[] - 각 @db_table struct의 메타데이터 + pre-built SQL
 */
export function generateORMMeta(module: Module): ORMTableMeta[] {
  const result: ORMTableMeta[] = [];

  for (const stmt of module.statements) {
    if (stmt.type !== 'struct') continue;
    const structNode = stmt as any;

    const annotations: (ORMAnnotation | string)[] = structNode.annotations || [];
    const tableAnnot = getTableAnnotation(annotations);
    if (!tableAnnot) continue; // @db_table 없으면 스킵

    const tableName = tableAnnot.args?.name || tableAnnot.args?.value || structNode.name.toLowerCase() + 's';
    const structName: string = structNode.name;
    const fields: ORMTableMeta['fields'] = [];
    let idField = 'id';
    let autoInc = false;

    for (const field of (structNode.fields || [])) {
      const isPk = isFieldId(field.annotations);
      const isAuto = isAutoInc(field.annotations);
      const sqlType = getColumnType(field.annotations, field.fieldType);

      if (isPk) {
        idField = field.name;
        if (isAuto) autoInc = true;
      }

      fields.push({
        name: field.name,
        sqlType,
        isPk,
        autoInc: isAuto,
      });
    }

    // --- Compile-Time SQL 생성 ---
    const colDefs = fields.map(f => {
      let def = `${f.name} ${f.sqlType}`;
      if (f.isPk) def += ' PRIMARY KEY';
      if (f.autoInc) def += ' AUTOINCREMENT';
      return def;
    }).join(', ');

    const createTable = `CREATE TABLE IF NOT EXISTS ${tableName} (${colDefs})`;

    // INSERT: PK가 auto_inc이면 제외
    const insertFields = fields.filter(f => !(f.isPk && f.autoInc));
    const insertCols = insertFields.map(f => f.name).join(', ');
    const insertPlaceholders = insertFields.map(() => '?').join(', ');
    const insertAll = `INSERT INTO ${tableName} (${insertCols}) VALUES (${insertPlaceholders})`;

    const selectAll = `SELECT * FROM ${tableName}`;
    const selectById = `SELECT * FROM ${tableName} WHERE ${idField} = ?`;
    const updateCols = insertFields.map(f => `${f.name} = ?`).join(', ');
    const updateById = `UPDATE ${tableName} SET ${updateCols} WHERE ${idField} = ?`;
    const deleteById = `DELETE FROM ${tableName} WHERE ${idField} = ?`;

    const meta: ORMTableMeta = {
      tableName,
      structName,
      idField,
      autoInc,
      fields,
      sql: { createTable, insertAll, selectAll, selectById, updateById, deleteById },
    };

    result.push(meta);

    if (process.env.DEBUG_ORM) {
      console.log(`[ORM-CODEGEN] ${structName} → table:${tableName}`);
      console.log(`  CREATE: ${createTable}`);
      console.log(`  INSERT: ${insertAll}`);
      console.log(`  SELECT: ${selectAll}`);
    }
  }

  return result;
}
