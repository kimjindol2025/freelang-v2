/**
 * FreeLang v2 - ORM Native Runtime
 *
 * 컴파일 타임에 생성된 ORMTableMeta를 사용하여
 * SQLite와 직접 통신하는 런타임 함수를 등록합니다.
 *
 * Sequelize 대체 - 외부 ORM 의존성 0%
 *
 * 등록 함수:
 *   orm_table_init(db_id, struct_name) → bool
 *   orm_insert(db_id, struct_name, ...values) → last_insert_id
 *   orm_find_all(db_id, struct_name, limit?) → array<map>
 *   orm_find_one(db_id, struct_name, id) → map | null
 *   orm_update(db_id, struct_name, id, ...values) → bool
 *   orm_delete(db_id, struct_name, id) → bool
 *   orm_raw_sql(db_id, struct_name, action) → string  (pre-compiled SQL 반환)
 */

import { NativeFunctionRegistry } from '../vm/native-function-registry';
import { ORMTableMeta } from '../codegen/orm-codegen';
import { sqlitePool } from './sqlite-native';

// 전역 ORM 메타데이터 레지스트리 (컴파일 타임에 채워짐)
const ormRegistry = new Map<string, ORMTableMeta>();

/**
 * 컴파일 타임에 생성된 ORM 메타데이터를 등록합니다.
 * vm.ts에서 generateORMMeta() 결과를 전달합니다.
 */
export function registerORMMeta(metas: ORMTableMeta[]): void {
  for (const meta of metas) {
    ormRegistry.set(meta.structName, meta);
    if (process.env.DEBUG_ORM) {
      console.log(`[ORM-NATIVE] Registered: ${meta.structName} → ${meta.tableName}`);
    }
  }
}

function getDB(dbId: number): any {
  return sqlitePool.get(dbId) || null;
}

function getMeta(structName: string): ORMTableMeta | null {
  return ormRegistry.get(structName) || null;
}

/**
 * ORM 네이티브 함수 등록
 */
export function registerORMNativeFunctions(registry: NativeFunctionRegistry): void {

  // ── orm_table_init(db_id, struct_name) → bool ──────────────
  // 컴파일 타임에 생성된 CREATE TABLE IF NOT EXISTS 실행
  registry.register({
    name: 'orm_table_init',
    module: 'orm',
    executor: (args) => {
      try {
        const dbId = args[0] as number;
        const structName = String(args[1]);
        const meta = getMeta(structName);
        if (!meta) {
          console.error(`[ORM] struct "${structName}" not registered (missing @db_table?)`);
          return false;
        }
        const db = getDB(dbId);
        if (!db) {
          console.error(`[ORM] db_id=${dbId} not found`);
          return false;
        }
        // 컴파일 타임 SQL 그대로 실행 - 런타임 SQL 파싱 0
        db.prepare(meta.sql.createTable).run();
        return true;
      } catch (e) {
        console.error('[ORM] orm_table_init error:', e);
        return false;
      }
    },
  });

  // ── orm_insert(db_id, struct_name, ...values) → last_insert_id ──
  // INSERT INTO t (f1,f2,...) VALUES (?,?,...)
  // values: auto_inc PK를 제외한 필드 순서대로
  registry.register({
    name: 'orm_insert',
    module: 'orm',
    executor: (args) => {
      try {
        const dbId = args[0] as number;
        const structName = String(args[1]);
        const values = args.slice(2);
        const meta = getMeta(structName);
        if (!meta) return -1;
        const db = getDB(dbId);
        if (!db) return -1;
        const stmt = db.prepare(meta.sql.insertAll);
        const result = stmt.run(...values);
        return result.lastInsertRowid;
      } catch (e) {
        console.error('[ORM] orm_insert error:', e);
        return -1;
      }
    },
  });

  // ── orm_find_all(db_id, struct_name, limit?) → array<map> ──
  // SELECT * FROM t [LIMIT ?]
  registry.register({
    name: 'orm_find_all',
    module: 'orm',
    executor: (args) => {
      try {
        const dbId = args[0] as number;
        const structName = String(args[1]);
        const limit = args[2] !== undefined ? Number(args[2]) : undefined;
        const meta = getMeta(structName);
        if (!meta) return [];
        const db = getDB(dbId);
        if (!db) return [];
        const sql = limit !== undefined
          ? `${meta.sql.selectAll} LIMIT ?`
          : meta.sql.selectAll;
        const rows = limit !== undefined
          ? db.prepare(sql).all(limit)
          : db.prepare(sql).all();
        return rows as any[];
      } catch (e) {
        console.error('[ORM] orm_find_all error:', e);
        return [];
      }
    },
  });

  // ── orm_find_one(db_id, struct_name, id) → map | null ──────
  // SELECT * FROM t WHERE pk = ?
  registry.register({
    name: 'orm_find_one',
    module: 'orm',
    executor: (args) => {
      try {
        const dbId = args[0] as number;
        const structName = String(args[1]);
        const id = args[2];
        const meta = getMeta(structName);
        if (!meta) return null;
        const db = getDB(dbId);
        if (!db) return null;
        const row = db.prepare(meta.sql.selectById).get(id);
        return row || null;
      } catch (e) {
        console.error('[ORM] orm_find_one error:', e);
        return null;
      }
    },
  });

  // ── orm_update(db_id, struct_name, id, ...values) → bool ───
  // UPDATE t SET f1=?,f2=? WHERE pk=?
  registry.register({
    name: 'orm_update',
    module: 'orm',
    executor: (args) => {
      try {
        const dbId = args[0] as number;
        const structName = String(args[1]);
        const id = args[2];
        const values = args.slice(3);
        const meta = getMeta(structName);
        if (!meta) return false;
        const db = getDB(dbId);
        if (!db) return false;
        const result = db.prepare(meta.sql.updateById).run(...values, id);
        return result.changes > 0;
      } catch (e) {
        console.error('[ORM] orm_update error:', e);
        return false;
      }
    },
  });

  // ── orm_delete(db_id, struct_name, id) → bool ──────────────
  // DELETE FROM t WHERE pk=?
  registry.register({
    name: 'orm_delete',
    module: 'orm',
    executor: (args) => {
      try {
        const dbId = args[0] as number;
        const structName = String(args[1]);
        const id = args[2];
        const meta = getMeta(structName);
        if (!meta) return false;
        const db = getDB(dbId);
        if (!db) return false;
        const result = db.prepare(meta.sql.deleteById).run(id);
        return result.changes > 0;
      } catch (e) {
        console.error('[ORM] orm_delete error:', e);
        return false;
      }
    },
  });

  // ── orm_raw_sql(db_id, struct_name, action) → string ───────
  // 컴파일 타임에 생성된 SQL 문자열 반환 (디버깅/셀프호스팅 증명용)
  // action: 'create' | 'insert' | 'select_all' | 'select_one' | 'update' | 'delete'
  registry.register({
    name: 'orm_raw_sql',
    module: 'orm',
    executor: (args) => {
      const structName = String(args[0]);
      const action = String(args[1]);
      const meta = getMeta(structName);
      if (!meta) return '';
      switch (action) {
        case 'create':     return meta.sql.createTable;
        case 'insert':     return meta.sql.insertAll;
        case 'select_all': return meta.sql.selectAll;
        case 'select_one': return meta.sql.selectById;
        case 'update':     return meta.sql.updateById;
        case 'delete':     return meta.sql.deleteById;
        default:           return '';
      }
    },
  });

  // ── orm_count(db_id, struct_name) → int ────────────────────
  registry.register({
    name: 'orm_count',
    module: 'orm',
    executor: (args) => {
      try {
        const dbId = args[0] as number;
        const structName = String(args[1]);
        const meta = getMeta(structName);
        if (!meta) return 0;
        const db = getDB(dbId);
        if (!db) return 0;
        const row = db.prepare(`SELECT COUNT(*) as cnt FROM ${meta.tableName}`).get() as any;
        return row?.cnt ?? 0;
      } catch (e) {
        console.error('[ORM] orm_count error:', e);
        return 0;
      }
    },
  });
}
