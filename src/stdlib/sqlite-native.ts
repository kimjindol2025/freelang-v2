/**
 * FreeLang v2 - SQLite Native Functions
 * Phase H: SQLite database driver via better-sqlite3
 *
 * Provides database operations:
 * - db_open(path) → db_id
 * - db_query(db_id, sql, params) → results array
 * - db_exec(db_id, sql, params) → success/failure
 * - db_close(db_id)
 * - db_all(db_id, sql, params) → all rows
 * - db_one(db_id, sql, params) → first row or null
 */

import Database from 'better-sqlite3';
import { NativeFunctionRegistry } from '../vm/native-function-registry';
import { FFIFunctionSignature } from '../ffi/type-bindings';

/**
 * SQLite 데이터베이스 풀 관리
 * Map<db_id: number, db: Database>
 * Compile-Time-ORM: orm-native.ts가 참조할 수 있도록 export
 */
export const sqlitePool = new Map<number, Database.Database>();
let nextDbId = 1000;

/**
 * Register SQLite native functions
 */
export function registerSQLiteNativeFunctions(registry: NativeFunctionRegistry): void {
  // ────────────────────────────────────────────────────────────
  // DB_OPEN: 데이터베이스 연결 (경로)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'db_open',
    module: 'sqlite',
    executor: (args) => {
      try {
        const dbPath = String(args[0]);
        const db = new Database(dbPath);
        const dbId = nextDbId++;
        sqlitePool.set(dbId, db);
        return dbId;
      } catch (error) {
        console.error('db_open error:', error);
        return -1; // 실패 시 -1 반환
      }
    },
  });

  // ────────────────────────────────────────────────────────────
  // DB_EXEC: SQL 실행 (INSERT/UPDATE/DELETE)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'db_exec',
    module: 'sqlite',
    executor: (args) => {
      try {
        const dbId = args[0] as number;
        const sql = String(args[1]);
        const params = (args[2] as any[]) || [];

        const db = sqlitePool.get(dbId);
        if (!db) {
          console.error(`db_exec: Database ${dbId} not found`);
          return false;
        }

        const stmt = db.prepare(sql);
        const result = stmt.run(...params);
        return result.changes > 0;
      } catch (error) {
        console.error('db_exec error:', error);
        return false;
      }
    },
    signature: {
      name: 'db_exec',
      returnType: 'boolean',
      parameters: [
        { name: 'db_id', type: 'number' },
        { name: 'sql', type: 'string' },
        { name: 'params', type: 'array' }
      ],
      category: 'event'
    } as FFIFunctionSignature
  });

  // ────────────────────────────────────────────────────────────
  // DB_QUERY: SQL SELECT 실행 (모든 행)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'db_query',
    module: 'sqlite',
    executor: (args) => {
      try {
        const dbId = args[0] as number;
        const sql = String(args[1]);
        const params = (args[2] as any[]) || [];

        const db = sqlitePool.get(dbId);
        if (!db) {
          console.error(`db_query: Database ${dbId} not found`);
          return [];
        }

        const stmt = db.prepare(sql);
        const rows = stmt.all(...params);
        return rows as any[];
      } catch (error) {
        console.error('db_query error:', error);
        return [];
      }
    },
    signature: {
      name: 'db_query',
      returnType: 'array',
      parameters: [
        { name: 'db_id', type: 'number' },
        { name: 'sql', type: 'string' },
        { name: 'params', type: 'array' }
      ],
      category: 'event'
    } as FFIFunctionSignature
  });

  // ────────────────────────────────────────────────────────────
  // DB_ONE: SQL SELECT 실행 (첫 행만)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'db_one',
    module: 'sqlite',
    executor: (args) => {
      try {
        const dbId = args[0] as number;
        const sql = String(args[1]);
        const params = (args[2] as any[]) || [];

        const db = sqlitePool.get(dbId);
        if (!db) {
          console.error(`db_one: Database ${dbId} not found`);
          return null;
        }

        const stmt = db.prepare(sql);
        const row = stmt.get(...params);
        return row || null;
      } catch (error) {
        console.error('db_one error:', error);
        return null;
      }
    },
    signature: {
      name: 'db_one',
      returnType: 'object',
      parameters: [
        { name: 'db_id', type: 'number' },
        { name: 'sql', type: 'string' },
        { name: 'params', type: 'array' }
      ],
      category: 'event'
    } as FFIFunctionSignature
  });

  // ────────────────────────────────────────────────────────────
  // DB_ALL: SQL SELECT 실행 (배열 반환)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'db_all',
    module: 'sqlite',
    executor: (args) => {
      try {
        const dbId = args[0] as number;
        const sql = String(args[1]);
        const params = (args[2] as any[]) || [];

        const db = sqlitePool.get(dbId);
        if (!db) {
          console.error(`db_all: Database ${dbId} not found`);
          return [];
        }

        const stmt = db.prepare(sql);
        return stmt.all(...params) as any[];
      } catch (error) {
        console.error('db_all error:', error);
        return [];
      }
    },
  });

  // ────────────────────────────────────────────────────────────
  // DB_CLOSE: 데이터베이스 연결 종료
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'db_close',
    module: 'sqlite',
    executor: (args) => {
      try {
        const dbId = args[0] as number;
        const db = sqlitePool.get(dbId);
        if (!db) {
          console.error(`db_close: Database ${dbId} not found`);
          return false;
        }

        db.close();
        sqlitePool.delete(dbId);
        return true;
      } catch (error) {
        console.error('db_close error:', error);
        return false;
      }
    },
  });

  // ────────────────────────────────────────────────────────────
  // DB_COUNT: 행 개수 조회
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'db_count',
    module: 'sqlite',
    executor: (args) => {
      try {
        const dbId = args[0] as number;
        const sql = String(args[1]);
        const params = (args[2] as any[]) || [];

        const db = sqlitePool.get(dbId);
        if (!db) {
          console.error(`db_count: Database ${dbId} not found`);
          return 0;
        }

        const stmt = db.prepare(sql);
        const result = stmt.get(...params) as any;
        return result?.count || result?.[Object.keys(result)[0]] || 0;
      } catch (error) {
        console.error('db_count error:', error);
        return 0;
      }
    },
  });

  // ────────────────────────────────────────────────────────────
  // DB_LAST_INSERT_ROWID: 마지막 INSERT의 rowid
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'db_last_insert_rowid',
    module: 'sqlite',
    executor: (args) => {
      try {
        const dbId = args[0] as number;
        const db = sqlitePool.get(dbId);
        if (!db) {
          console.error(`db_last_insert_rowid: Database ${dbId} not found`);
          return 0;
        }

        return db.exec('SELECT last_insert_rowid() as id')[0].id || 0;
      } catch (error) {
        console.error('db_last_insert_rowid error:', error);
        return 0;
      }
    },
  });

  process.stderr.write('✅ SQLite native functions registered (Phase H)\n');
}
