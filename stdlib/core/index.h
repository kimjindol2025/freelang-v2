/**
 * FreeLang stdlib/index - Index Management
 * B-tree, hash, bitmap indexes
 */
#ifndef FREELANG_STDLIB_INDEX_H
#define FREELANG_STDLIB_INDEX_H
#include <stdint.h>

typedef enum { FL_INDEX_BTREE = 0, FL_INDEX_HASH = 1 } fl_index_type_t;
typedef struct fl_index_t fl_index_t;

fl_index_t* fl_index_create(const char *name, fl_index_type_t type);
void fl_index_destroy(fl_index_t *index);
int fl_index_insert(fl_index_t *index, const char *key, uint64_t row_id);
int fl_index_delete(fl_index_t *index, const char *key);
uint64_t fl_index_search(fl_index_t *index, const char *key);
#endif
