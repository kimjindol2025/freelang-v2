/**
 * FreeLang stdlib/schema - Schema Management & Migrations
 * Table definitions, schema versioning, migration tracking
 */

#ifndef FREELANG_STDLIB_SCHEMA_H
#define FREELANG_STDLIB_SCHEMA_H

#include <stdint.h>
#include <stddef.h>

typedef enum {
  FL_COLUMN_NULL = 0,
  FL_COLUMN_INTEGER = 1,
  FL_COLUMN_TEXT = 2,
  FL_COLUMN_REAL = 3,
  FL_COLUMN_BLOB = 4
} fl_column_type_t;

typedef struct {
  char *name;
  fl_column_type_t type;
  int primary_key;
  int not_null;
  int auto_increment;
  char *default_value;
} fl_column_def_t;

typedef struct fl_schema_t fl_schema_t;
typedef struct fl_migration_t fl_migration_t;

typedef struct {
  uint64_t migrations_applied;
  uint64_t migrations_rolled_back;
  uint64_t schema_changes;
  uint64_t tables_created;
  uint64_t tables_dropped;
} fl_schema_stats_t;

/* Public API */
fl_schema_t* fl_schema_create(void);
void fl_schema_destroy(fl_schema_t *schema);

int fl_schema_create_table(fl_schema_t *schema, const char *table_name, 
                          fl_column_def_t *columns, int column_count);
int fl_schema_drop_table(fl_schema_t *schema, const char *table_name);
int fl_schema_add_column(fl_schema_t *schema, const char *table_name, fl_column_def_t *column);
int fl_schema_create_index(fl_schema_t *schema, const char *table_name, const char *index_name, 
                          const char **columns, int column_count);

fl_migration_t* fl_migration_create(const char *name, const char *description);
void fl_migration_destroy(fl_migration_t *migration);
int fl_migration_apply(fl_migration_t *migration, fl_schema_t *schema);
int fl_migration_rollback(fl_migration_t *migration, fl_schema_t *schema);

fl_schema_stats_t* fl_schema_get_stats(void);
void fl_schema_reset_stats(void);

#endif /* FREELANG_STDLIB_SCHEMA_H */
