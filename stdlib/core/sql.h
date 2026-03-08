/**
 * FreeLang stdlib/sql - SQL Query Builder & Executor
 * Parameterized queries, statement caching, execution planning
 */

#ifndef FREELANG_STDLIB_SQL_H
#define FREELANG_STDLIB_SQL_H

#include <stdint.h>
#include <stddef.h>

/* ===== SQL Statement Types ===== */

typedef enum {
  FL_SQL_SELECT = 0,
  FL_SQL_INSERT = 1,
  FL_SQL_UPDATE = 2,
  FL_SQL_DELETE = 3,
  FL_SQL_CREATE = 4,
  FL_SQL_ALTER = 5,
  FL_SQL_DROP = 6,
  FL_SQL_BEGIN = 7,
  FL_SQL_COMMIT = 8,
  FL_SQL_ROLLBACK = 9
} fl_sql_statement_type_t;

/* ===== SQL Builder & Statement ===== */

typedef struct fl_sql_builder_t fl_sql_builder_t;
typedef struct fl_sql_statement_t fl_sql_statement_t;

/* ===== SQL Result Set ===== */

typedef struct {
  char **column_names;
  int column_count;
  uint8_t **rows;
  size_t *row_sizes;
  int row_count;
  int current_row;
} fl_sql_result_t;

/* ===== SQL Parameter ===== */

typedef enum {
  FL_SQL_NULL = 0,
  FL_SQL_INTEGER = 1,
  FL_SQL_REAL = 2,
  FL_SQL_TEXT = 3,
  FL_SQL_BLOB = 4
} fl_sql_param_type_t;

typedef struct {
  fl_sql_param_type_t type;
  union {
    int64_t integer_val;
    double real_val;
    char *text_val;
    uint8_t *blob_val;
  } value;
  size_t blob_size;
} fl_sql_param_t;

/* ===== Execution Plan ===== */

typedef struct {
  char *plan_text;
  int estimated_cost;
  int estimated_rows;
  char **used_indexes;
  int index_count;
} fl_sql_execution_plan_t;

/* ===== Statistics ===== */

typedef struct {
  uint64_t queries_executed;
  uint64_t rows_affected;
  uint64_t cache_hits;
  uint64_t cache_misses;
  uint64_t execution_errors;
  double avg_query_time_ms;
} fl_sql_stats_t;

/* ===== Public API ===== */

/* Builder Operations */
fl_sql_builder_t* fl_sql_builder_create(void);
void fl_sql_builder_destroy(fl_sql_builder_t *builder);

/* Query Construction */
fl_sql_builder_t* fl_sql_select(fl_sql_builder_t *builder, const char **columns, int column_count);
fl_sql_builder_t* fl_sql_from(fl_sql_builder_t *builder, const char *table);
fl_sql_builder_t* fl_sql_where(fl_sql_builder_t *builder, const char *condition);
fl_sql_builder_t* fl_sql_join(fl_sql_builder_t *builder, const char *table, const char *on_condition);
fl_sql_builder_t* fl_sql_order_by(fl_sql_builder_t *builder, const char *column, int ascending);
fl_sql_builder_t* fl_sql_limit(fl_sql_builder_t *builder, int limit);
fl_sql_builder_t* fl_sql_offset(fl_sql_builder_t *builder, int offset);

/* Insert/Update/Delete */
fl_sql_builder_t* fl_sql_insert_into(fl_sql_builder_t *builder, const char *table);
fl_sql_builder_t* fl_sql_values(fl_sql_builder_t *builder, const char **columns, int column_count);
fl_sql_builder_t* fl_sql_update(fl_sql_builder_t *builder, const char *table);
fl_sql_builder_t* fl_sql_set(fl_sql_builder_t *builder, const char *column, const char *value);
fl_sql_builder_t* fl_sql_delete_from(fl_sql_builder_t *builder, const char *table);

/* Parameterization */
int fl_sql_bind_parameter(fl_sql_builder_t *builder, int param_index, const fl_sql_param_t *param);
int fl_sql_bind_null(fl_sql_builder_t *builder, int param_index);
int fl_sql_bind_integer(fl_sql_builder_t *builder, int param_index, int64_t value);
int fl_sql_bind_real(fl_sql_builder_t *builder, int param_index, double value);
int fl_sql_bind_text(fl_sql_builder_t *builder, int param_index, const char *value);
int fl_sql_bind_blob(fl_sql_builder_t *builder, int param_index, const uint8_t *data, size_t size);

/* Execution */
char* fl_sql_build(fl_sql_builder_t *builder);
int fl_sql_get_statement_type(fl_sql_builder_t *builder);

/* Execution Planning */
fl_sql_execution_plan_t* fl_sql_explain(fl_sql_builder_t *builder);

/* Result Handling */
void fl_sql_result_destroy(fl_sql_result_t *result);
int fl_sql_result_next(fl_sql_result_t *result);
const char* fl_sql_result_get_column(fl_sql_result_t *result, int column_index);

/* Prepared Statements */
fl_sql_statement_t* fl_sql_prepare(const char *query);
void fl_sql_statement_destroy(fl_sql_statement_t *stmt);

/* Statistics */
fl_sql_stats_t* fl_sql_get_stats(void);
void fl_sql_reset_stats(void);

#endif /* FREELANG_STDLIB_SQL_H */
