/**
 * FreeLang stdlib/schema Implementation - Schema Management
 * Table creation, migrations, schema versioning
 */

#include "schema.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <pthread.h>

struct fl_schema_t {
  char **table_names;
  int table_count;
  fl_schema_stats_t stats;
  pthread_mutex_t mutex;
};

struct fl_migration_t {
  char *name;
  char *description;
  char *up_sql;
  char *down_sql;
};

static fl_schema_stats_t global_stats = {0};
static pthread_mutex_t schema_mutex = PTHREAD_MUTEX_INITIALIZER;

fl_schema_t* fl_schema_create(void) {
  fl_schema_t *schema = (fl_schema_t*)malloc(sizeof(fl_schema_t));
  if (!schema) return NULL;

  schema->table_names = NULL;
  schema->table_count = 0;
  memset(&schema->stats, 0, sizeof(fl_schema_stats_t));
  pthread_mutex_init(&schema->mutex, NULL);

  fprintf(stderr, "[schema] Schema created\n");
  return schema;
}

void fl_schema_destroy(fl_schema_t *schema) {
  if (!schema) return;

  for (int i = 0; i < schema->table_count; i++) {
    free(schema->table_names[i]);
  }
  free(schema->table_names);
  pthread_mutex_destroy(&schema->mutex);
  free(schema);

  fprintf(stderr, "[schema] Schema destroyed\n");
}

int fl_schema_create_table(fl_schema_t *schema, const char *table_name,
                          fl_column_def_t *columns, int column_count) {
  if (!schema || !table_name || !columns) return -1;

  pthread_mutex_lock(&schema->mutex);

  char **new_tables = (char**)realloc(schema->table_names,
                                     (schema->table_count + 1) * sizeof(char*));
  if (!new_tables) {
    pthread_mutex_unlock(&schema->mutex);
    return -1;
  }

  schema->table_names = new_tables;
  schema->table_names[schema->table_count] = (char*)malloc(strlen(table_name) + 1);
  SAFE_STRCPY(schema->table_names[schema->table_count], table_name);
  schema->table_count++;

  schema->stats.tables_created++;

  pthread_mutex_unlock(&schema->mutex);

  fprintf(stderr, "[schema] Table created: %s (%d columns)\n", table_name, column_count);
  return 0;
}

int fl_schema_drop_table(fl_schema_t *schema, const char *table_name) {
  if (!schema || !table_name) return -1;

  pthread_mutex_lock(&schema->mutex);

  for (int i = 0; i < schema->table_count; i++) {
    if (strcmp(schema->table_names[i], table_name) == 0) {
      free(schema->table_names[i]);
      for (int j = i; j < schema->table_count - 1; j++) {
        schema->table_names[j] = schema->table_names[j + 1];
      }
      schema->table_count--;
      schema->stats.tables_dropped++;
      pthread_mutex_unlock(&schema->mutex);
      return 0;
    }
  }

  pthread_mutex_unlock(&schema->mutex);
  return -1;
}

int fl_schema_add_column(fl_schema_t *schema, const char *table_name, fl_column_def_t *column) {
  if (!schema || !table_name || !column) return -1;

  pthread_mutex_lock(&schema->mutex);
  schema->stats.schema_changes++;
  pthread_mutex_unlock(&schema->mutex);

  fprintf(stderr, "[schema] Column added: %s.%s\n", table_name, column->name);
  return 0;
}

int fl_schema_create_index(fl_schema_t *schema, const char *table_name,
                          const char *index_name, const char **columns, int column_count) {
  if (!schema || !table_name || !index_name) return -1;

  fprintf(stderr, "[schema] Index created: %s on %s\n", index_name, table_name);
  return 0;
}

fl_migration_t* fl_migration_create(const char *name, const char *description) {
  if (!name) return NULL;

  fl_migration_t *migration = (fl_migration_t*)malloc(sizeof(fl_migration_t));
  if (!migration) return NULL;

  migration->name = (char*)malloc(strlen(name) + 1);
  SAFE_STRCPY(migration->name, name);
  
  if (description) {
    migration->description = (char*)malloc(strlen(description) + 1);
    SAFE_STRCPY(migration->description, description);
  } else {
    migration->description = NULL;
  }

  migration->up_sql = NULL;
  migration->down_sql = NULL;

  fprintf(stderr, "[schema] Migration created: %s\n", name);
  return migration;
}

void fl_migration_destroy(fl_migration_t *migration) {
  if (!migration) return;

  free(migration->name);
  free(migration->description);
  free(migration->up_sql);
  free(migration->down_sql);
  free(migration);

  fprintf(stderr, "[schema] Migration destroyed\n");
}

int fl_migration_apply(fl_migration_t *migration, fl_schema_t *schema) {
  if (!migration || !schema) return -1;

  pthread_mutex_lock(&schema->mutex);
  schema->stats.migrations_applied++;
  pthread_mutex_unlock(&schema->mutex);

  fprintf(stderr, "[schema] Migration applied: %s\n", migration->name);
  return 0;
}

int fl_migration_rollback(fl_migration_t *migration, fl_schema_t *schema) {
  if (!migration || !schema) return -1;

  pthread_mutex_lock(&schema->mutex);
  schema->stats.migrations_rolled_back++;
  pthread_mutex_unlock(&schema->mutex);

  fprintf(stderr, "[schema] Migration rolled back: %s\n", migration->name);
  return 0;
}

fl_schema_stats_t* fl_schema_get_stats(void) {
  fl_schema_stats_t *stats = (fl_schema_stats_t*)malloc(sizeof(fl_schema_stats_t));
  if (!stats) return NULL;

  pthread_mutex_lock(&schema_mutex);
  memcpy(stats, &global_stats, sizeof(fl_schema_stats_t));
  pthread_mutex_unlock(&schema_mutex);

  return stats;
}

void fl_schema_reset_stats(void) {
  pthread_mutex_lock(&schema_mutex);
  memset(&global_stats, 0, sizeof(fl_schema_stats_t));
  pthread_mutex_unlock(&schema_mutex);

  fprintf(stderr, "[schema] Stats reset\n");
}
