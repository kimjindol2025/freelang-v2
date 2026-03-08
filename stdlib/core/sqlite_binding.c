/**
 * FreeLang SQLite Binding - C Implementation
 * stdlib/core/sqlite_binding.c
 *
 * Provides FreeLang with SQLite3 database access
 * Implements actual query execution
 */

#include <sqlite3.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include "sql.h"

/* ===== SQLite Database Connection ===== */

typedef struct {
  sqlite3 *db;
  char *path;
  int is_open;
  char *last_error;
  int error_code;
} fl_sqlite_connection_t;

typedef struct {
  sqlite3_stmt *stmt;
  int column_count;
  char **column_names;
  int row_count;
  int current_row;
} fl_sqlite_result_t;

/* ===== Connection Management ===== */

/**
 * Open SQLite database connection
 * Returns: connection handle (or NULL on error)
 */
fl_sqlite_connection_t* fl_sqlite_open(const char *db_path) {
  if (!db_path) {
    fprintf(stderr, "[sqlite] Error: db_path is NULL\n");
    return NULL;
  }

  fl_sqlite_connection_t *conn = (fl_sqlite_connection_t*)malloc(sizeof(fl_sqlite_connection_t));
  if (!conn) {
    fprintf(stderr, "[sqlite] Error: malloc failed\n");
    return NULL;
  }

  int rc = sqlite3_open(db_path, &conn->db);

  if (rc) {
    fprintf(stderr, "[sqlite] Error opening database: %s\n", sqlite3_errmsg(conn->db));
    conn->is_open = 0;
    conn->error_code = rc;
    conn->last_error = (char*)sqlite3_errmsg(conn->db);
    return conn;
  }

  conn->path = (char*)malloc(strlen(db_path) + 1);
  strcpy(conn->path, db_path);
  conn->is_open = 1;
  conn->error_code = 0;
  conn->last_error = NULL;

  fprintf(stderr, "[sqlite] Database opened: %s\n", db_path);
  return conn;
}

/**
 * Close SQLite database connection
 */
int fl_sqlite_close(fl_sqlite_connection_t *conn) {
  if (!conn) return -1;

  if (!conn->is_open) {
    fprintf(stderr, "[sqlite] Warning: connection already closed\n");
    return 0;
  }

  int rc = sqlite3_close(conn->db);

  if (rc != SQLITE_OK) {
    fprintf(stderr, "[sqlite] Error closing database: %s\n", sqlite3_errmsg(conn->db));
    conn->error_code = rc;
    return rc;
  }

  conn->is_open = 0;
  free(conn->path);
  free(conn);

  fprintf(stderr, "[sqlite] Database closed\n");
  return SQLITE_OK;
}

/* ===== Query Execution ===== */

/**
 * Execute SQL query and return results
 * Returns: result set (or NULL on error)
 */
fl_sqlite_result_t* fl_sqlite_execute(fl_sqlite_connection_t *conn, const char *query) {
  if (!conn || !query) {
    fprintf(stderr, "[sqlite] Error: invalid arguments\n");
    return NULL;
  }

  if (!conn->is_open) {
    fprintf(stderr, "[sqlite] Error: connection not open\n");
    return NULL;
  }

  fprintf(stderr, "[sqlite] Executing: %s\n", query);

  sqlite3_stmt *stmt;
  int rc = sqlite3_prepare_v2(conn->db, query, -1, &stmt, NULL);

  if (rc != SQLITE_OK) {
    fprintf(stderr, "[sqlite] Error preparing statement: %s\n", sqlite3_errmsg(conn->db));
    conn->error_code = rc;
    conn->last_error = (char*)sqlite3_errmsg(conn->db);
    return NULL;
  }

  fl_sqlite_result_t *result = (fl_sqlite_result_t*)malloc(sizeof(fl_sqlite_result_t));
  if (!result) {
    fprintf(stderr, "[sqlite] Error: malloc failed\n");
    sqlite3_finalize(stmt);
    return NULL;
  }

  result->stmt = stmt;
  result->column_count = sqlite3_column_count(stmt);
  result->row_count = 0;
  result->current_row = 0;

  /* Allocate column names */
  result->column_names = (char**)malloc(result->column_count * sizeof(char*));
  for (int i = 0; i < result->column_count; i++) {
    const char *col_name = sqlite3_column_name(stmt, i);
    result->column_names[i] = (char*)malloc(strlen(col_name) + 1);
    strcpy(result->column_names[i], col_name);
    fprintf(stderr, "[sqlite] Column %d: %s\n", i, col_name);
  }

  /* Count rows by fetching all */
  while (sqlite3_step(stmt) == SQLITE_ROW) {
    result->row_count++;
  }

  /* Reset for reading */
  sqlite3_reset(stmt);

  fprintf(stderr, "[sqlite] Query returned %d rows, %d columns\n", result->row_count, result->column_count);
  return result;
}

/**
 * Fetch next row from result set
 * Returns: 1 if row fetched, 0 if no more rows, -1 on error
 */
int fl_sqlite_fetch_row(fl_sqlite_result_t *result) {
  if (!result || !result->stmt) {
    return -1;
  }

  int rc = sqlite3_step(result->stmt);

  if (rc == SQLITE_ROW) {
    result->current_row++;
    return 1;
  } else if (rc == SQLITE_DONE) {
    return 0;
  } else {
    fprintf(stderr, "[sqlite] Error fetching row: %d\n", rc);
    return -1;
  }
}

/**
 * Get column value from current row (as text)
 */
const char* fl_sqlite_get_column_text(fl_sqlite_result_t *result, int column_index) {
  if (!result || !result->stmt || column_index < 0 || column_index >= result->column_count) {
    return NULL;
  }

  return (const char*)sqlite3_column_text(result->stmt, column_index);
}

/**
 * Get column value from current row (as integer)
 */
int64_t fl_sqlite_get_column_int(fl_sqlite_result_t *result, int column_index) {
  if (!result || !result->stmt || column_index < 0 || column_index >= result->column_count) {
    return 0;
  }

  return sqlite3_column_int64(result->stmt, column_index);
}

/**
 * Get column value from current row (as float)
 */
double fl_sqlite_get_column_double(fl_sqlite_result_t *result, int column_index) {
  if (!result || !result->stmt || column_index < 0 || column_index >= result->column_count) {
    return 0.0;
  }

  return sqlite3_column_double(result->stmt, column_index);
}

/**
 * Get column count from result set
 */
int fl_sqlite_get_column_count(fl_sqlite_result_t *result) {
  if (!result) return 0;
  return result->column_count;
}

/**
 * Get column name by index
 */
const char* fl_sqlite_get_column_name(fl_sqlite_result_t *result, int column_index) {
  if (!result || column_index < 0 || column_index >= result->column_count) {
    return NULL;
  }

  return result->column_names[column_index];
}

/**
 * Get total row count from result set
 */
int fl_sqlite_get_row_count(fl_sqlite_result_t *result) {
  if (!result) return 0;
  return result->row_count;
}

/* ===== Result Set Management ===== */

/**
 * Free result set
 */
void fl_sqlite_result_free(fl_sqlite_result_t *result) {
  if (!result) return;

  if (result->stmt) {
    sqlite3_finalize(result->stmt);
  }

  if (result->column_names) {
    for (int i = 0; i < result->column_count; i++) {
      free(result->column_names[i]);
    }
    free(result->column_names);
  }

  free(result);
  fprintf(stderr, "[sqlite] Result set freed\n");
}

/* ===== Insert/Update/Delete Operations ===== */

/**
 * Execute INSERT/UPDATE/DELETE query
 * Returns: number of rows affected, -1 on error
 */
int fl_sqlite_execute_update(fl_sqlite_connection_t *conn, const char *query) {
  if (!conn || !query) {
    fprintf(stderr, "[sqlite] Error: invalid arguments\n");
    return -1;
  }

  if (!conn->is_open) {
    fprintf(stderr, "[sqlite] Error: connection not open\n");
    return -1;
  }

  fprintf(stderr, "[sqlite] Executing UPDATE: %s\n", query);

  char *err_msg = NULL;
  int rc = sqlite3_exec(conn->db, query, NULL, NULL, &err_msg);

  if (rc != SQLITE_OK) {
    fprintf(stderr, "[sqlite] Error executing update: %s\n", err_msg);
    conn->error_code = rc;
    conn->last_error = err_msg;
    sqlite3_free(err_msg);
    return -1;
  }

  int changes = sqlite3_changes(conn->db);
  fprintf(stderr, "[sqlite] Rows affected: %d\n", changes);
  return changes;
}

/* ===== Transaction Support ===== */

/**
 * Begin transaction
 */
int fl_sqlite_begin(fl_sqlite_connection_t *conn) {
  if (!conn || !conn->is_open) return -1;

  fprintf(stderr, "[sqlite] BEGIN TRANSACTION\n");
  char *err_msg = NULL;
  int rc = sqlite3_exec(conn->db, "BEGIN TRANSACTION", NULL, NULL, &err_msg);

  if (rc != SQLITE_OK) {
    fprintf(stderr, "[sqlite] Error: %s\n", err_msg);
    sqlite3_free(err_msg);
    return -1;
  }

  return SQLITE_OK;
}

/**
 * Commit transaction
 */
int fl_sqlite_commit(fl_sqlite_connection_t *conn) {
  if (!conn || !conn->is_open) return -1;

  fprintf(stderr, "[sqlite] COMMIT\n");
  char *err_msg = NULL;
  int rc = sqlite3_exec(conn->db, "COMMIT", NULL, NULL, &err_msg);

  if (rc != SQLITE_OK) {
    fprintf(stderr, "[sqlite] Error: %s\n", err_msg);
    sqlite3_free(err_msg);
    return -1;
  }

  return SQLITE_OK;
}

/**
 * Rollback transaction
 */
int fl_sqlite_rollback(fl_sqlite_connection_t *conn) {
  if (!conn || !conn->is_open) return -1;

  fprintf(stderr, "[sqlite] ROLLBACK\n");
  char *err_msg = NULL;
  int rc = sqlite3_exec(conn->db, "ROLLBACK", NULL, NULL, &err_msg);

  if (rc != SQLITE_OK) {
    fprintf(stderr, "[sqlite] Error: %s\n", err_msg);
    sqlite3_free(err_msg);
    return -1;
  }

  return SQLITE_OK;
}

/* ===== Error Handling ===== */

/**
 * Get last error message
 */
const char* fl_sqlite_get_error(fl_sqlite_connection_t *conn) {
  if (!conn) return "Invalid connection";

  if (conn->last_error) {
    return conn->last_error;
  }

  return sqlite3_errmsg(conn->db);
}

/**
 * Get last error code
 */
int fl_sqlite_get_error_code(fl_sqlite_connection_t *conn) {
  if (!conn) return -1;
  return conn->error_code;
}

/* ===== Statistics ===== */

/**
 * Get database statistics
 */
void fl_sqlite_print_stats(fl_sqlite_connection_t *conn) {
  if (!conn) return;

  fprintf(stderr, "[sqlite] Connection Statistics:\n");
  fprintf(stderr, "  Path: %s\n", conn->path);
  fprintf(stderr, "  Open: %s\n", conn->is_open ? "yes" : "no");
  fprintf(stderr, "  Last Error: %s\n", conn->last_error ? conn->last_error : "none");
  fprintf(stderr, "  Error Code: %d\n", conn->error_code);
}

/* ===== Initialization ===== */

/**
 * Initialize SQLite module
 */
int fl_sqlite_init(void) {
  int rc = sqlite3_initialize();

  if (rc != SQLITE_OK) {
    fprintf(stderr, "[sqlite] Error initializing SQLite: %d\n", rc);
    return rc;
  }

  fprintf(stderr, "[sqlite] Module initialized (SQLite %s)\n", sqlite3_libversion());
  return SQLITE_OK;
}

/**
 * Shutdown SQLite module
 */
int fl_sqlite_shutdown(void) {
  int rc = sqlite3_shutdown();

  if (rc != SQLITE_OK) {
    fprintf(stderr, "[sqlite] Error shutting down SQLite: %d\n", rc);
    return rc;
  }

  fprintf(stderr, "[sqlite] Module shutdown\n");
  return SQLITE_OK;
}
