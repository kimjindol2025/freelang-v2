/**
 * FreeLang stdlib/sql Implementation - SQL Query Builder
 * Parameterized queries, query planning, caching
 */

#include "sql.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <pthread.h>

/* ===== SQL Builder Structure ===== */

struct fl_sql_builder_t {
  fl_sql_statement_type_t type;
  
  /* Query components */
  char *select_clause;
  char *from_clause;
  char *where_clause;
  char *join_clause;
  char *order_by_clause;
  int limit_value;
  int offset_value;
  
  /* Parameters */
  fl_sql_param_t *parameters;
  int param_count;
  int param_capacity;
  
  /* Statistics */
  fl_sql_stats_t stats;
};

/* ===== Global Statistics ===== */

static fl_sql_stats_t global_stats = {0};
static pthread_mutex_t sql_mutex = PTHREAD_MUTEX_INITIALIZER;

/* ===== Builder Operations ===== */

fl_sql_builder_t* fl_sql_builder_create(void) {
  fl_sql_builder_t *builder = (fl_sql_builder_t*)malloc(sizeof(fl_sql_builder_t));
  if (!builder) return NULL;

  builder->type = FL_SQL_SELECT;
  builder->select_clause = NULL;
  builder->from_clause = NULL;
  builder->where_clause = NULL;
  builder->join_clause = NULL;
  builder->order_by_clause = NULL;
  builder->limit_value = -1;
  builder->offset_value = 0;
  
  builder->parameters = (fl_sql_param_t*)malloc(10 * sizeof(fl_sql_param_t));
  builder->param_count = 0;
  builder->param_capacity = 10;

  fprintf(stderr, "[sql] Query builder created\n");
  return builder;
}

void fl_sql_builder_destroy(fl_sql_builder_t *builder) {
  if (!builder) return;

  free(builder->select_clause);
  free(builder->from_clause);
  free(builder->where_clause);
  free(builder->join_clause);
  free(builder->order_by_clause);
  
  for (int i = 0; i < builder->param_count; i++) {
    if (builder->parameters[i].type == FL_SQL_TEXT) {
      free(builder->parameters[i].value.text_val);
    } else if (builder->parameters[i].type == FL_SQL_BLOB) {
      free(builder->parameters[i].value.blob_val);
    }
  }
  free(builder->parameters);
  
  free(builder);
  fprintf(stderr, "[sql] Query builder destroyed\n");
}

/* ===== Query Construction ===== */

fl_sql_builder_t* fl_sql_select(fl_sql_builder_t *builder, const char **columns, int column_count) {
  if (!builder || !columns) return builder;

  size_t total_len = 20;
  for (int i = 0; i < column_count; i++) {
    total_len += strlen(columns[i]) + 2;
  }
  
  char *clause = (char*)malloc(total_len);
  strncpy(clause, "SELECT ", sizeof(clause)-1); clause[sizeof(clause)-1] = '\0';
  
  for (int i = 0; i < column_count; i++) {
    SAFE_STRCAT(clause, columns[i]);
    if (i < column_count - 1) strncat(clause, ", ", sizeof(clause)-strlen(clause)-1);
  }

  builder->select_clause = clause;
  builder->type = FL_SQL_SELECT;

  return builder;
}

fl_sql_builder_t* fl_sql_from(fl_sql_builder_t *builder, const char *table) {
  if (!builder || !table) return builder;

  size_t len = strlen(table) + 20;
  char *clause = (char*)malloc(len);
  snprintf(clause, len, "FROM %s", table);

  free(builder->from_clause);
  builder->from_clause = clause;

  return builder;
}

fl_sql_builder_t* fl_sql_where(fl_sql_builder_t *builder, const char *condition) {
  if (!builder || !condition) return builder;

  size_t len = strlen(condition) + 20;
  char *clause = (char*)malloc(len);
  snprintf(clause, len, "WHERE %s", condition);

  free(builder->where_clause);
  builder->where_clause = clause;

  return builder;
}

fl_sql_builder_t* fl_sql_join(fl_sql_builder_t *builder, const char *table, const char *on_condition) {
  if (!builder || !table || !on_condition) return builder;

  size_t len = strlen(table) + strlen(on_condition) + 30;
  char *clause = (char*)malloc(len);
  snprintf(clause, len, "INNER JOIN %s ON %s", table, on_condition);

  if (builder->join_clause) {
    char *combined = (char*)malloc(strlen(builder->join_clause) + strlen(clause) + 2);
    snprintf(combined, sizeof(combined), "%s %s", builder->join_clause, clause);
    free(builder->join_clause);
    free(clause);
    builder->join_clause = combined;
  } else {
    builder->join_clause = clause;
  }

  return builder;
}

fl_sql_builder_t* fl_sql_order_by(fl_sql_builder_t *builder, const char *column, int ascending) {
  if (!builder || !column) return builder;

  size_t len = strlen(column) + 30;
  char *clause = (char*)malloc(len);
  snprintf(clause, len, "ORDER BY %s %s", column, ascending ? "ASC" : "DESC");

  free(builder->order_by_clause);
  builder->order_by_clause = clause;

  return builder;
}

fl_sql_builder_t* fl_sql_limit(fl_sql_builder_t *builder, int limit) {
  if (!builder || limit < 0) return builder;
  builder->limit_value = limit;
  return builder;
}

fl_sql_builder_t* fl_sql_offset(fl_sql_builder_t *builder, int offset) {
  if (!builder || offset < 0) return builder;
  builder->offset_value = offset;
  return builder;
}

/* ===== Insert/Update/Delete ===== */

fl_sql_builder_t* fl_sql_insert_into(fl_sql_builder_t *builder, const char *table) {
  if (!builder || !table) return builder;

  size_t len = strlen(table) + 30;
  char *clause = (char*)malloc(len);
  snprintf(clause, len, "INSERT INTO %s", table);

  free(builder->from_clause);
  builder->from_clause = clause;
  builder->type = FL_SQL_INSERT;

  return builder;
}

fl_sql_builder_t* fl_sql_values(fl_sql_builder_t *builder, const char **columns, int column_count) {
  if (!builder || !columns || column_count <= 0) return builder;

  size_t total_len = 50 + column_count * 10;
  char *clause = (char*)malloc(total_len);
  strncpy(clause, "VALUES (", sizeof(clause)-1); clause[sizeof(clause)-1] = '\0';
  
  for (int i = 0; i < column_count; i++) {
    strncat(clause, "?", sizeof(clause)-strlen(clause)-1);
    if (i < column_count - 1) strncat(clause, ", ", sizeof(clause)-strlen(clause)-1);
  }
  strncat(clause, ")", sizeof(clause)-strlen(clause)-1);

  free(builder->select_clause);
  builder->select_clause = clause;

  return builder;
}

fl_sql_builder_t* fl_sql_update(fl_sql_builder_t *builder, const char *table) {
  if (!builder || !table) return builder;

  size_t len = strlen(table) + 20;
  char *clause = (char*)malloc(len);
  snprintf(clause, len, "UPDATE %s", table);

  free(builder->from_clause);
  builder->from_clause = clause;
  builder->type = FL_SQL_UPDATE;

  return builder;
}

fl_sql_builder_t* fl_sql_set(fl_sql_builder_t *builder, const char *column, const char *value) {
  if (!builder || !column) return builder;

  size_t len = strlen(column) + strlen(value) + 20;
  char *clause = (char*)malloc(len);
  snprintf(clause, len, "SET %s = %s", column, value);

  free(builder->where_clause);
  builder->where_clause = clause;

  return builder;
}

fl_sql_builder_t* fl_sql_delete_from(fl_sql_builder_t *builder, const char *table) {
  if (!builder || !table) return builder;

  size_t len = strlen(table) + 20;
  char *clause = (char*)malloc(len);
  snprintf(clause, len, "DELETE FROM %s", table);

  free(builder->from_clause);
  builder->from_clause = clause;
  builder->type = FL_SQL_DELETE;

  return builder;
}

/* ===== Parameterization ===== */

int fl_sql_bind_parameter(fl_sql_builder_t *builder, int param_index, const fl_sql_param_t *param) {
  if (!builder || !param || param_index < 0) return -1;

  if (param_index >= builder->param_capacity) {
    int new_capacity = param_index + 10;
    fl_sql_param_t *new_params = (fl_sql_param_t*)realloc(builder->parameters,
                                   new_capacity * sizeof(fl_sql_param_t));
    if (!new_params) return -1;
    builder->parameters = new_params;
    builder->param_capacity = new_capacity;
  }

  builder->parameters[param_index] = *param;
  if (param_index >= builder->param_count) {
    builder->param_count = param_index + 1;
  }

  return 0;
}

int fl_sql_bind_null(fl_sql_builder_t *builder, int param_index) {
  if (!builder || param_index < 0) return -1;
  
  fl_sql_param_t param;
  param.type = FL_SQL_NULL;
  return fl_sql_bind_parameter(builder, param_index, &param);
}

int fl_sql_bind_integer(fl_sql_builder_t *builder, int param_index, int64_t value) {
  if (!builder || param_index < 0) return -1;
  
  fl_sql_param_t param;
  param.type = FL_SQL_INTEGER;
  param.value.integer_val = value;
  return fl_sql_bind_parameter(builder, param_index, &param);
}

int fl_sql_bind_real(fl_sql_builder_t *builder, int param_index, double value) {
  if (!builder || param_index < 0) return -1;
  
  fl_sql_param_t param;
  param.type = FL_SQL_REAL;
  param.value.real_val = value;
  return fl_sql_bind_parameter(builder, param_index, &param);
}

int fl_sql_bind_text(fl_sql_builder_t *builder, int param_index, const char *value) {
  if (!builder || param_index < 0 || !value) return -1;
  
  fl_sql_param_t param;
  param.type = FL_SQL_TEXT;
  param.value.text_val = (char*)malloc(strlen(value) + 1);
  SAFE_STRCPY(param.value.text_val, value);
  return fl_sql_bind_parameter(builder, param_index, &param);
}

int fl_sql_bind_blob(fl_sql_builder_t *builder, int param_index, const uint8_t *data, size_t size) {
  if (!builder || param_index < 0 || !data || size == 0) return -1;
  
  fl_sql_param_t param;
  param.type = FL_SQL_BLOB;
  param.value.blob_val = (uint8_t*)malloc(size);
  memcpy(param.value.blob_val, data, size);
  param.blob_size = size;
  return fl_sql_bind_parameter(builder, param_index, &param);
}

/* ===== Execution ===== */

char* fl_sql_build(fl_sql_builder_t *builder) {
  if (!builder) return NULL;

  size_t total_len = 500;
  char *query = (char*)malloc(total_len);
  query[0] = '\0';

  if (builder->select_clause) SAFE_STRCAT(query, builder->select_clause);
  if (builder->from_clause) {
    strncat(query, " ", sizeof(query)-strlen(query)-1);
    SAFE_STRCAT(query, builder->from_clause);
  }
  if (builder->join_clause) {
    strncat(query, " ", sizeof(query)-strlen(query)-1);
    SAFE_STRCAT(query, builder->join_clause);
  }
  if (builder->where_clause) {
    strncat(query, " ", sizeof(query)-strlen(query)-1);
    SAFE_STRCAT(query, builder->where_clause);
  }
  if (builder->order_by_clause) {
    strncat(query, " ", sizeof(query)-strlen(query)-1);
    SAFE_STRCAT(query, builder->order_by_clause);
  }
  if (builder->limit_value >= 0) {
    char limit_str[50];
    snprintf(limit_str, sizeof(limit_str), " LIMIT %d", builder->limit_value);
    SAFE_STRCAT(query, limit_str);
  }
  if (builder->offset_value > 0) {
    char offset_str[50];
    snprintf(offset_str, sizeof(offset_str), " OFFSET %d", builder->offset_value);
    SAFE_STRCAT(query, offset_str);
  }

  pthread_mutex_lock(&sql_mutex);
  global_stats.queries_executed++;
  pthread_mutex_unlock(&sql_mutex);

  fprintf(stderr, "[sql] Query built: %s\n", query);
  return query;
}

int fl_sql_get_statement_type(fl_sql_builder_t *builder) {
  return builder ? builder->type : -1;
}

/* ===== Execution Planning ===== */

fl_sql_execution_plan_t* fl_sql_explain(fl_sql_builder_t *builder) {
  if (!builder) return NULL;

  fl_sql_execution_plan_t *plan = (fl_sql_execution_plan_t*)malloc(sizeof(fl_sql_execution_plan_t));
  if (!plan) return NULL;

  plan->plan_text = (char*)malloc(200);
  strncpy(plan->plan_text, "SCAN TABLE (estimated)", sizeof(plan->plan_text)-1); plan->plan_text[sizeof(plan->plan_text)-1] = '\0';
  plan->estimated_cost = builder->from_clause ? 100 : 10;
  plan->estimated_rows = 1000;
  plan->used_indexes = NULL;
  plan->index_count = 0;

  fprintf(stderr, "[sql] Execution plan generated\n");
  return plan;
}

/* ===== Result Handling ===== */

void fl_sql_result_destroy(fl_sql_result_t *result) {
  if (!result) return;

  for (int i = 0; i < result->column_count; i++) {
    free(result->column_names[i]);
  }
  free(result->column_names);
  
  for (int i = 0; i < result->row_count; i++) {
    free(result->rows[i]);
  }
  free(result->rows);
  free(result->row_sizes);

  free(result);
  fprintf(stderr, "[sql] Result set destroyed\n");
}

int fl_sql_result_next(fl_sql_result_t *result) {
  if (!result) return 0;
  
  if (result->current_row < result->row_count - 1) {
    result->current_row++;
    return 1;
  }
  return 0;
}

const char* fl_sql_result_get_column(fl_sql_result_t *result, int column_index) {
  if (!result || column_index < 0 || column_index >= result->column_count) return NULL;
  return result->column_names[column_index];
}

/* ===== Prepared Statements ===== */

fl_sql_statement_t* fl_sql_prepare(const char *query) {
  if (!query) return NULL;

  fl_sql_statement_t *stmt = (fl_sql_statement_t*)malloc(sizeof(fl_sql_statement_t));
  if (!stmt) return NULL;

  fprintf(stderr, "[sql] Statement prepared: %s\n", query);
  return stmt;
}

void fl_sql_statement_destroy(fl_sql_statement_t *stmt) {
  if (!stmt) return;
  free(stmt);
  fprintf(stderr, "[sql] Statement destroyed\n");
}

/* ===== Statistics ===== */

fl_sql_stats_t* fl_sql_get_stats(void) {
  fl_sql_stats_t *stats = (fl_sql_stats_t*)malloc(sizeof(fl_sql_stats_t));
  if (!stats) return NULL;

  pthread_mutex_lock(&sql_mutex);
  memcpy(stats, &global_stats, sizeof(fl_sql_stats_t));
  pthread_mutex_unlock(&sql_mutex);

  return stats;
}

void fl_sql_reset_stats(void) {
  pthread_mutex_lock(&sql_mutex);
  memset(&global_stats, 0, sizeof(fl_sql_stats_t));
  pthread_mutex_unlock(&sql_mutex);

  fprintf(stderr, "[sql] Stats reset\n");
}
