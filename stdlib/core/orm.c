#include "orm.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

struct fl_entity_t {
  char *name;
  char **fields;
  int field_count;
};

struct fl_query_builder_t {
  fl_entity_t *entity;
  char *conditions;
};

static fl_orm_stats_t global_stats = {0};

fl_entity_t* fl_entity_create(const char *name) {
  fl_entity_t *e = (fl_entity_t*)malloc(sizeof(fl_entity_t));
  e->name = (char*)malloc(strlen(name) + 1);
  SAFE_STRCPY(e->name, name);
  e->fields = NULL;
  e->field_count = 0;
  fprintf(stderr, "[orm] Entity created: %s\n", name);
  return e;
}

void fl_entity_destroy(fl_entity_t *entity) {
  if (!entity) return;
  free(entity->name);
  free(entity->fields);
  free(entity);
}

int fl_entity_add_field(fl_entity_t *entity, const char *name, int type) {
  if (!entity || !name) return -1;
  char **fields = (char**)realloc(entity->fields, (entity->field_count + 1) * sizeof(char*));
  fields[entity->field_count] = (char*)malloc(strlen(name) + 1);
  SAFE_STRCPY(fields[entity->field_count], name);
  entity->fields = fields;
  entity->field_count++;
  return 0;
}

fl_query_builder_t* fl_query_builder_create(fl_entity_t *entity) {
  fl_query_builder_t *b = (fl_query_builder_t*)malloc(sizeof(fl_query_builder_t));
  b->entity = entity;
  b->conditions = NULL;
  return b;
}

void fl_query_builder_destroy(fl_query_builder_t *builder) {
  if (builder) {
    free(builder->conditions);
    free(builder);
  }
}

fl_query_builder_t* fl_query_where(fl_query_builder_t *builder, const char *condition) {
  if (builder && condition) {
    builder->conditions = (char*)malloc(strlen(condition) + 1);
    SAFE_STRCPY(builder->conditions, condition);
  }
  return builder;
}

fl_query_builder_t* fl_query_order_by(fl_query_builder_t *builder, const char *column) {
  return builder;
}

fl_orm_stats_t* fl_orm_get_stats(void) {
  fl_orm_stats_t *s = (fl_orm_stats_t*)malloc(sizeof(fl_orm_stats_t));
  *s = global_stats;
  return s;
}
