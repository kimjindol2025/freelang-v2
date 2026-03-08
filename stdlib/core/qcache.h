/**
 * FreeLang stdlib/qcache - Query Result Caching
 */
#ifndef FREELANG_STDLIB_QCACHE_H
#define FREELANG_STDLIB_QCACHE_H
#include <stdint.h>

typedef struct fl_qcache_t fl_qcache_t;

fl_qcache_t* fl_qcache_create(int max_entries);
void fl_qcache_destroy(fl_qcache_t *cache);
int fl_qcache_put(fl_qcache_t *cache, const char *query, void *result);
void* fl_qcache_get(fl_qcache_t *cache, const char *query);
int fl_qcache_invalidate(fl_qcache_t *cache, const char *table);
#endif
