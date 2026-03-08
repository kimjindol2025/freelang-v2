/**
 * FreeLang SQLite Binding - Header
 * stdlib/core/sqlite_binding.h
 *
 * C interface for SQLite database operations
 */

#ifndef FREELANG_STDLIB_SQLITE_BINDING_H
#define FREELANG_STDLIB_SQLITE_BINDING_H

#include <stdint.h>
#include <time.h>

/* ===== Type Definitions ===== */

typedef struct fl_sqlite_connection_t fl_sqlite_connection_t;
typedef struct fl_sqlite_result_t fl_sqlite_result_t;

/* ===== Connection Management ===== */

/**
 * Open SQLite database
 * @param db_path Path to database file
 * @return Connection handle, or NULL on error
 */
fl_sqlite_connection_t* fl_sqlite_open(const char *db_path);

/**
 * Close SQLite database
 * @param conn Connection handle
 * @return 0 on success, error code on failure
 */
int fl_sqlite_close(fl_sqlite_connection_t *conn);

/* ===== Query Execution ===== */

/**
 * Execute SELECT query
 * @param conn Connection handle
 * @param query SQL query string
 * @return Result set, or NULL on error
 */
fl_sqlite_result_t* fl_sqlite_execute(fl_sqlite_connection_t *conn, const char *query);

/**
 * Execute INSERT/UPDATE/DELETE query
 * @param conn Connection handle
 * @param query SQL query string
 * @return Number of rows affected, -1 on error
 */
int fl_sqlite_execute_update(fl_sqlite_connection_t *conn, const char *query);

/* ===== Result Set Navigation ===== */

/**
 * Fetch next row
 * @param result Result set
 * @return 1 if row available, 0 if end, -1 on error
 */
int fl_sqlite_fetch_row(fl_sqlite_result_t *result);

/**
 * Get column count
 * @param result Result set
 * @return Column count
 */
int fl_sqlite_get_column_count(fl_sqlite_result_t *result);

/**
 * Get row count
 * @param result Result set
 * @return Total row count
 */
int fl_sqlite_get_row_count(fl_sqlite_result_t *result);

/**
 * Get column name
 * @param result Result set
 * @param column_index Column index
 * @return Column name, or NULL
 */
const char* fl_sqlite_get_column_name(fl_sqlite_result_t *result, int column_index);

/* ===== Column Value Retrieval ===== */

/**
 * Get column value as text
 * @param result Result set
 * @param column_index Column index
 * @return Text value, or NULL
 */
const char* fl_sqlite_get_column_text(fl_sqlite_result_t *result, int column_index);

/**
 * Get column value as integer
 * @param result Result set
 * @param column_index Column index
 * @return Integer value
 */
int64_t fl_sqlite_get_column_int(fl_sqlite_result_t *result, int column_index);

/**
 * Get column value as double
 * @param result Result set
 * @param column_index Column index
 * @return Double value
 */
double fl_sqlite_get_column_double(fl_sqlite_result_t *result, int column_index);

/* ===== Result Set Management ===== */

/**
 * Free result set
 * @param result Result set to free
 */
void fl_sqlite_result_free(fl_sqlite_result_t *result);

/* ===== Transaction Support ===== */

/**
 * Begin transaction
 * @param conn Connection handle
 * @return 0 on success, -1 on error
 */
int fl_sqlite_begin(fl_sqlite_connection_t *conn);

/**
 * Commit transaction
 * @param conn Connection handle
 * @return 0 on success, -1 on error
 */
int fl_sqlite_commit(fl_sqlite_connection_t *conn);

/**
 * Rollback transaction
 * @param conn Connection handle
 * @return 0 on success, -1 on error
 */
int fl_sqlite_rollback(fl_sqlite_connection_t *conn);

/* ===== Error Handling ===== */

/**
 * Get last error message
 * @param conn Connection handle
 * @return Error message string
 */
const char* fl_sqlite_get_error(fl_sqlite_connection_t *conn);

/**
 * Get last error code
 * @param conn Connection handle
 * @return Error code
 */
int fl_sqlite_get_error_code(fl_sqlite_connection_t *conn);

/* ===== Statistics ===== */

/**
 * Print connection statistics (for debugging)
 * @param conn Connection handle
 */
void fl_sqlite_print_stats(fl_sqlite_connection_t *conn);

/* ===== Module Initialization ===== */

/**
 * Initialize SQLite module
 * @return 0 on success, error code on failure
 */
int fl_sqlite_init(void);

/**
 * Shutdown SQLite module
 * @return 0 on success, error code on failure
 */
int fl_sqlite_shutdown(void);

#endif /* FREELANG_STDLIB_SQLITE_BINDING_H */
