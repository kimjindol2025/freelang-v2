/**
 * FreeLang v3 - Database Drivers
 *
 * Phase F: SQLite, PostgreSQL, MySQL + ORM support
 * 30+ database functions
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

/**
 * 데이터베이스 드라이버 함수 등록
 */
export function registerDatabaseFunctions(registry: NativeFunctionRegistry): void {

  // ────────────────────────────────────────────────────────────
  // Phase F-1: SQLite 드라이버 (10개)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'db_open_sqlite',
    module: 'sqlite',
    executor: (args) => {
      const path = String(args[0]);
      const Database = require('better-sqlite3');
      return new Database(path);
    }
  });

  registry.register({
    name: 'db_execute',
    module: 'sqlite',
    executor: (args) => {
      const db = args[0] as any;
      const query = String(args[1]);
      return db.exec(query);
    }
  });

  registry.register({
    name: 'db_query',
    module: 'sqlite',
    executor: (args) => {
      const db = args[0] as any;
      const sql = String(args[1]);
      const params = args[2] || [];
      const stmt = db.prepare(sql);
      return stmt.all(...(Array.isArray(params) ? params : [params]));
    }
  });

  registry.register({
    name: 'db_query_one',
    module: 'sqlite',
    executor: (args) => {
      const db = args[0] as any;
      const sql = String(args[1]);
      const params = args[2] || [];
      const stmt = db.prepare(sql);
      return stmt.get(...(Array.isArray(params) ? params : [params])) || null;
    }
  });

  registry.register({
    name: 'db_insert',
    module: 'sqlite',
    executor: (args) => {
      const db = args[0] as any;
      const table = String(args[1]);
      const data = args[2] as any;
      const keys = Object.keys(data);
      const values = keys.map((k) => data[k]);
      const placeholders = keys.map(() => '?').join(',');
      const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;
      const stmt = db.prepare(sql);
      const result = stmt.run(...values);
      return result.lastID;
    }
  });

  registry.register({
    name: 'db_update',
    module: 'sqlite',
    executor: (args) => {
      const db = args[0] as any;
      const table = String(args[1]);
      const where = args[2] as any;
      const data = args[3] as any;
      const keys = Object.keys(data);
      const setClause = keys.map((k) => `${k}=?`).join(',');
      const values = keys.map((k) => data[k]);
      const whereKeys = Object.keys(where);
      const whereClause = whereKeys.map((k) => `${k}=?`).join(' AND ');
      const whereValues = whereKeys.map((k) => where[k]);
      const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
      const stmt = db.prepare(sql);
      const result = stmt.run(...values, ...whereValues);
      return result.changes;
    }
  });

  registry.register({
    name: 'db_delete',
    module: 'sqlite',
    executor: (args) => {
      const db = args[0] as any;
      const table = String(args[1]);
      const where = args[2] as any;
      const whereKeys = Object.keys(where);
      const whereClause = whereKeys.map((k) => `${k}=?`).join(' AND ');
      const whereValues = whereKeys.map((k) => where[k]);
      const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
      const stmt = db.prepare(sql);
      const result = stmt.run(...whereValues);
      return result.changes;
    }
  });

  registry.register({
    name: 'db_transaction',
    module: 'sqlite',
    executor: (args) => {
      const db = args[0] as any;
      const fn = args[1] as Function;
      const transaction = db.transaction(fn);
      return transaction();
    }
  });

  registry.register({
    name: 'db_close',
    module: 'sqlite',
    executor: (args) => {
      const db = args[0] as any;
      db.close();
      return null;
    }
  });

  registry.register({
    name: 'db_backup',
    module: 'sqlite',
    executor: (args) => {
      const db = args[0] as any;
      const backupPath = String(args[1]);
      db.backup(backupPath);
      return null;
    }
  });

  // ────────────────────────────────────────────────────────────
  // Phase F-2: PostgreSQL 드라이버 (10개)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'pg_connect',
    module: 'postgresql',
    executor: (args) => {
      const config = args[0] as any;
      const Client = require('pg').Client;
      const client = new Client(config);
      return client.connect().then(() => client);
    }
  });

  registry.register({
    name: 'pg_query',
    module: 'postgresql',
    executor: (args) => {
      const db = args[0] as any;
      const sql = String(args[1]);
      const params = args[2] || [];
      return db.query(sql, params).then((res: any) => res.rows);
    }
  });

  registry.register({
    name: 'pg_query_one',
    module: 'postgresql',
    executor: (args) => {
      const db = args[0] as any;
      const sql = String(args[1]);
      const params = args[2] || [];
      return db.query(sql, params).then((res: any) => res.rows[0] || null);
    }
  });

  registry.register({
    name: 'pg_insert',
    module: 'postgresql',
    executor: (args) => {
      const db = args[0] as any;
      const table = String(args[1]);
      const data = args[2] as any;
      const keys = Object.keys(data);
      const values = keys.map((k) => data[k]);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(',');
      const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders}) RETURNING id`;
      return db.query(sql, values).then((res: any) => res.rows[0]?.id);
    }
  });

  registry.register({
    name: 'pg_update',
    module: 'postgresql',
    executor: (args) => {
      const db = args[0] as any;
      const table = String(args[1]);
      const where = args[2] as any;
      const data = args[3] as any;
      const keys = Object.keys(data);
      const values = keys.map((k) => data[k]);
      const setClause = keys.map((k, i) => `${k}=$${i + 1}`).join(',');
      const whereKeys = Object.keys(where);
      const whereValues = whereKeys.map((k) => where[k]);
      const whereClause = whereKeys.map((k, i) => `${k}=$${keys.length + i + 1}`).join(' AND ');
      const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
      return db.query(sql, [...values, ...whereValues]).then((res: any) => res.rowCount);
    }
  });

  registry.register({
    name: 'pg_delete',
    module: 'postgresql',
    executor: (args) => {
      const db = args[0] as any;
      const table = String(args[1]);
      const where = args[2] as any;
      const whereKeys = Object.keys(where);
      const whereValues = whereKeys.map((k) => where[k]);
      const whereClause = whereKeys.map((k, i) => `${k}=$${i + 1}`).join(' AND ');
      const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
      return db.query(sql, whereValues).then((res: any) => res.rowCount);
    }
  });

  registry.register({
    name: 'pg_pool_create',
    module: 'postgresql',
    executor: (args) => {
      const config = args[0] as any;
      const Pool = require('pg').Pool;
      return new Pool(config);
    }
  });

  registry.register({
    name: 'pg_transaction',
    module: 'postgresql',
    executor: (args) => {
      const db = args[0] as any;
      const fn = args[1] as Function;
      return db.query('BEGIN')
        .then(() => fn(db))
        .then((result: any) => db.query('COMMIT').then(() => result))
        .catch((e: any) => db.query('ROLLBACK').then(() => { throw e; }));
    }
  });

  registry.register({
    name: 'pg_close',
    module: 'postgresql',
    executor: (args) => {
      const db = args[0] as any;
      return db.end();
    }
  });

  // ────────────────────────────────────────────────────────────
  // Phase F-3: MySQL 드라이버 + ORM (10개)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'mysql_connect',
    module: 'mysql',
    executor: (args) => {
      const config = args[0] as any;
      const mysql = require('mysql2/promise');
      return mysql.createConnection(config);
    }
  });

  registry.register({
    name: 'mysql_query',
    module: 'mysql',
    executor: (args) => {
      const db = args[0] as any;
      const sql = String(args[1]);
      const params = args[2] || [];
      return db.query(sql, params).then((res: any) => res[0]);
    }
  });

  registry.register({
    name: 'mysql_insert_bulk',
    module: 'mysql',
    executor: (args) => {
      const db = args[0] as any;
      const table = String(args[1]);
      const rows = args[2] as any[];
      const keys = rows.length > 0 ? Object.keys(rows[0]) : [];
      const values = rows.map((row) => keys.map((k) => row[k]));
      const placeholders = values.map(() => `(${keys.map(() => '?').join(',')})`).join(',');
      const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES ${placeholders}`;
      const flatValues = values.flat();
      return db.query(sql, flatValues).then((res: any) =>
        Array.from({ length: res[0].affectedRows }, (_, i) => res[0].insertId + i)
      );
    }
  });

  registry.register({
    name: 'mysql_create_table',
    module: 'mysql',
    executor: (args) => {
      const db = args[0] as any;
      const table = String(args[1]);
      const schema = String(args[2]);
      const sql = `CREATE TABLE IF NOT EXISTS ${table} (${schema})`;
      return db.query(sql);
    }
  });

  registry.register({
    name: 'mysql_drop_table',
    module: 'mysql',
    executor: (args) => {
      const db = args[0] as any;
      const table = String(args[1]);
      const sql = `DROP TABLE IF EXISTS ${table}`;
      return db.query(sql);
    }
  });

  registry.register({
    name: 'orm_define',
    module: 'orm',
    executor: (args) => {
      const name = String(args[0]);
      const schema = args[1] as any;
      return { name, schema, tableName: name.toLowerCase() };
    }
  });

  registry.register({
    name: 'orm_find',
    module: 'orm',
    executor: (args) => {
      const model = args[0] as any;
      const db = args[1] as any;
      const where = args[2] as any;
      const whereKeys = Object.keys(where || {});
      const whereClause = whereKeys.length > 0
        ? `WHERE ${whereKeys.map((k) => `${k}=?`).join(' AND ')}`
        : '';
      const whereValues = whereKeys.map((k) => where[k]);
      const sql = `SELECT * FROM ${model.tableName} ${whereClause}`;
      return db.query(sql, whereValues);
    }
  });

  registry.register({
    name: 'orm_create',
    module: 'orm',
    executor: (args) => {
      const model = args[0] as any;
      const db = args[1] as any;
      const data = args[2] as any;
      const keys = Object.keys(data);
      const values = keys.map((k) => data[k]);
      const placeholders = keys.map(() => '?').join(',');
      const sql = `INSERT INTO ${model.tableName} (${keys.join(',')}) VALUES (${placeholders})`;
      return db.query(sql, values);
    }
  });

  registry.register({
    name: 'orm_update',
    module: 'orm',
    executor: (args) => {
      const model = args[0] as any;
      const db = args[1] as any;
      const id = args[2];
      const data = args[3] as any;
      const keys = Object.keys(data);
      const values = keys.map((k) => data[k]);
      const setClause = keys.map((k) => `${k}=?`).join(',');
      const sql = `UPDATE ${model.tableName} SET ${setClause} WHERE id=?`;
      return db.query(sql, [...values, id]);
    }
  });

  // Silent registration (no console output)
}
