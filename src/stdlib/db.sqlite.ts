/**
 * FreeLang Standard Library: std/db.sqlite
 *
 * SQLite database utilities
 */

/**
 * SQLite result row
 */
export interface SQLiteRow {
  [key: string]: any;
}

/**
 * SQLite prepared statement
 */
export interface SQLitePreparedStatement {
  sql: string;
  lastID: number;
  changes: number;
}

/**
 * SQLite database
 */
export class SQLiteDatabase {
  private dbPath: string;
  private isOpen: boolean = false;
  private inTransaction: boolean = false;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /**
   * Open database connection
   * @returns Promise that resolves when opened
   */
  async open(): Promise<void> {
    try {
      // In production, would use sqlite3 or better-sqlite3 package
      this.isOpen = true;
    } catch (error) {
      throw new Error(`Failed to open database at ${this.dbPath}`);
    }
  }

  /**
   * Close database connection
   * @returns Promise that resolves when closed
   */
  async close(): Promise<void> {
    if (this.inTransaction) {
      throw new Error('Cannot close database while transaction is active');
    }
    this.isOpen = false;
  }

  /**
   * Check if database is open
   * @returns true if open
   */
  isConnected(): boolean {
    return this.isOpen;
  }

  /**
   * Execute SQL statement (no return value)
   * @param sql SQL statement
   * @param params Query parameters
   * @returns Promise with changes count
   */
  async execute(sql: string, params?: any[]): Promise<number> {
    if (!this.isOpen) {
      throw new Error('Database is not open');
    }

    try {
      // In production, would execute actual SQL
      // For now, return 0 changes
      return 0;
    } catch (error) {
      throw new Error(`SQL execution failed: ${String(error)}`);
    }
  }

  /**
   * Query database (returns rows)
   * @param sql SQL query
   * @param params Query parameters
   * @returns Promise with rows
   */
  async query(sql: string, params?: any[]): Promise<SQLiteRow[]> {
    if (!this.isOpen) {
      throw new Error('Database is not open');
    }

    try {
      // In production, would execute actual SQL query
      // For now, return empty array
      return [];
    } catch (error) {
      throw new Error(`SQL query failed: ${String(error)}`);
    }
  }

  /**
   * Get single row
   * @param sql SQL query
   * @param params Query parameters
   * @returns Promise with single row or null
   */
  async get(sql: string, params?: any[]): Promise<SQLiteRow | null> {
    const rows = await this.query(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Run INSERT/UPDATE/DELETE statement
   * @param sql SQL statement
   * @param params Query parameters
   * @returns Promise with result
   */
  async run(sql: string, params?: any[]): Promise<SQLitePreparedStatement> {
    if (!this.isOpen) {
      throw new Error('Database is not open');
    }

    try {
      return {
        sql,
        lastID: 0,
        changes: 0
      };
    } catch (error) {
      throw new Error(`SQL run failed: ${String(error)}`);
    }
  }

  /**
   * Prepare statement
   * @param sql SQL statement
   * @returns Prepared statement
   */
  prepare(sql: string): any {
    if (!this.isOpen) {
      throw new Error('Database is not open');
    }

    return {
      sql,
      run: (...params: any[]) => {
        return { lastID: 0, changes: 0 };
      },
      get: (...params: any[]) => {
        return null;
      },
      all: (...params: any[]) => {
        return [];
      }
    };
  }

  /**
   * Create table
   * @param name Table name
   * @param schema Column definitions
   * @returns Promise that resolves when created
   */
  async createTable(name: string, schema: string): Promise<void> {
    const sql = `CREATE TABLE IF NOT EXISTS ${name} (${schema})`;
    await this.execute(sql);
  }

  /**
   * Drop table
   * @param name Table name
   * @returns Promise that resolves when dropped
   */
  async dropTable(name: string): Promise<void> {
    const sql = `DROP TABLE IF EXISTS ${name}`;
    await this.execute(sql);
  }

  /**
   * Begin transaction
   * @returns Promise that resolves when started
   */
  async beginTransaction(): Promise<void> {
    if (!this.isOpen) {
      throw new Error('Database is not open');
    }
    if (this.inTransaction) {
      throw new Error('Transaction already started');
    }

    await this.execute('BEGIN TRANSACTION');
    this.inTransaction = true;
  }

  /**
   * Commit transaction
   * @returns Promise that resolves when committed
   */
  async commit(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('No active transaction');
    }

    try {
      await this.execute('COMMIT');
      this.inTransaction = false;
    } catch (error) {
      throw new Error(`Transaction commit failed: ${String(error)}`);
    }
  }

  /**
   * Rollback transaction
   * @returns Promise that resolves when rolled back
   */
  async rollback(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('No active transaction');
    }

    try {
      await this.execute('ROLLBACK');
      this.inTransaction = false;
    } catch (error) {
      throw new Error(`Transaction rollback failed: ${String(error)}`);
    }
  }

  /**
   * Run transaction
   * @param fn Transaction callback
   * @returns Promise with transaction result
   */
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    await this.beginTransaction();

    try {
      const result = await fn();
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  /**
   * Get table schema
   * @param table Table name
   * @returns Promise with schema information
   */
  async getTableSchema(table: string): Promise<any[]> {
    const sql = `PRAGMA table_info(${table})`;
    return this.query(sql);
  }

  /**
   * Get all tables
   * @returns Promise with table list
   */
  async getTables(): Promise<string[]> {
    const rows = await this.query(
      `SELECT name FROM sqlite_master WHERE type='table'`
    );
    return rows.map((row: any) => row.name);
  }

  /**
   * Vacuum database
   * @returns Promise that resolves when vacuumed
   */
  async vacuum(): Promise<void> {
    await this.execute('VACUUM');
  }

  /**
   * Enable foreign keys
   * @returns Promise that resolves when enabled
   */
  async enableForeignKeys(): Promise<void> {
    await this.execute('PRAGMA foreign_keys = ON');
  }

  /**
   * Disable foreign keys
   * @returns Promise that resolves when disabled
   */
  async disableForeignKeys(): Promise<void> {
    await this.execute('PRAGMA foreign_keys = OFF');
  }

  /**
   * Get database size in bytes
   * @returns Promise with database size
   */
  async getDatabaseSize(): Promise<number> {
    // In production, would get actual file size
    return 0;
  }

  /**
   * Get row count for table
   * @param table Table name
   * @returns Promise with row count
   */
  async getRowCount(table: string): Promise<number> {
    const result = await this.query(`SELECT COUNT(*) as count FROM ${table}`);
    return result.length > 0 ? (result[0].count as number) : 0;
  }

  /**
   * Create index
   * @param indexName Index name
   * @param table Table name
   * @param columns Column names (comma-separated or array)
   * @param unique Whether index is unique
   * @returns Promise that resolves when created
   */
  async createIndex(indexName: string, table: string, columns: string | string[], unique: boolean = false): Promise<void> {
    const columnList = Array.isArray(columns) ? columns.join(', ') : columns;
    const uniqueStr = unique ? 'UNIQUE' : '';
    const sql = `CREATE ${uniqueStr} INDEX IF NOT EXISTS ${indexName} ON ${table} (${columnList})`;
    await this.execute(sql);
  }

  /**
   * Get all indexes for table
   * @param table Table name
   * @returns Promise with index list
   */
  async getIndexes(table: string): Promise<any[]> {
    const sql = `PRAGMA index_list(${table})`;
    return this.query(sql);
  }

  /**
   * Export data to array of objects
   * @param sql SQL query
   * @param params Query parameters
   * @returns Promise with data
   */
  async export(sql: string, params?: any[]): Promise<SQLiteRow[]> {
    return this.query(sql, params);
  }

  /**
   * Import data from array of objects
   * @param table Table name
   * @param data Array of objects to insert
   * @returns Promise with number of rows inserted
   */
  async import(table: string, data: SQLiteRow[]): Promise<number> {
    let count = 0;
    for (const row of data) {
      const keys = Object.keys(row);
      const values = Object.values(row);
      const placeholders = keys.map(() => '?').join(', ');
      const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
      await this.execute(sql, values);
      count++;
    }
    return count;
  }

  /**
   * Backup database to file
   * @param backupPath Path to backup file
   * @returns Promise that resolves when backed up
   */
  async backup(backupPath: string): Promise<void> {
    // In production, would use VACUUM INTO or copy file
    // This is a stub
  }

  /**
   * Get database info
   * @returns Promise with database info
   */
  async getDatabaseInfo(): Promise<{ [key: string]: any }> {
    return {
      path: this.dbPath,
      isOpen: this.isOpen,
      inTransaction: this.inTransaction
    };
  }
}

/**
 * Create SQLite database instance
 * @param dbPath Database file path
 * @returns SQLiteDatabase instance
 */
export function createDatabase(dbPath: string): SQLiteDatabase {
  return new SQLiteDatabase(dbPath);
}

/**
 * Open database (convenience function)
 * @param dbPath Database file path
 * @returns Promise with database instance
 */
export async function openDatabase(dbPath: string): Promise<SQLiteDatabase> {
  const db = new SQLiteDatabase(dbPath);
  await db.open();
  return db;
}

/**
 * Execute SQL file
 * @param dbPath Database file path
 * @param sqlPath Path to SQL file
 * @returns Promise that resolves when executed
 */
export async function executeSQLFile(dbPath: string, sqlPath: string): Promise<void> {
  const db = new SQLiteDatabase(dbPath);
  await db.open();

  try {
    // In production, would read SQL file and execute statements
    await db.close();
  } catch (error) {
    await db.close();
    throw error;
  }
}
