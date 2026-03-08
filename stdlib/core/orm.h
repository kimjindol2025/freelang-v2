/**
 * FreeLang stdlib/orm - Object-Relational Mapping
 * Entity mapping, relationships, query building
 */
#ifndef FREELANG_STDLIB_ORM_H
#define FREELANG_STDLIB_ORM_H
#include <stdint.h>

typedef struct fl_entity_t fl_entity_t;
typedef struct fl_query_builder_t fl_query_builder_t;
typedef struct { uint64_t total_entities; } fl_orm_stats_t;

fl_entity_t* fl_entity_create(const char *name);
void fl_entity_destroy(fl_entity_t *entity);
int fl_entity_add_field(fl_entity_t *entity, const char *name, int type);

fl_query_builder_t* fl_query_builder_create(fl_entity_t *entity);
void fl_query_builder_destroy(fl_query_builder_t *builder);
fl_query_builder_t* fl_query_where(fl_query_builder_t *builder, const char *condition);
fl_query_builder_t* fl_query_order_by(fl_query_builder_t *builder, const char *column);

fl_orm_stats_t* fl_orm_get_stats(void);
#endif
