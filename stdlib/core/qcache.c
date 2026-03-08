#include "qcache.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

struct fl_qcache_t {
  char **queries;
  void **results;
  int count;
  int max_entries;
};

fl_qcache_t* fl_qcache_create(int max_entries) {
  fl_qcache_t *c = (fl_qcache_t*)malloc(sizeof(fl_qcache_t));
  c->queries = NULL;
  c->results = NULL;
  c->count = 0;
  c->max_entries = max_entries;
  return c;
}

void fl_qcache_destroy(fl_qcache_t *cache) {
  if (!cache) return;
  for (int i = 0; i < cache->count; i++) {
    free(cache->queries[i]);
  }
  free(cache->queries);
  free(cache->results);
  free(cache);
}

int fl_qcache_put(fl_qcache_t *cache, const char *query, void *result) {
  if (!cache || !query || cache->count >= cache->max_entries) return -1;
  char **q = (char**)realloc(cache->queries, (cache->count + 1) * sizeof(char*));
  void **r = (void**)realloc(cache->results, (cache->count + 1) * sizeof(void*));
  q[cache->count] = (char*)malloc(strlen(query) + 1);
  SAFE_STRCPY(q[cache->count], query);
  r[cache->count] = result;
  cache->queries = q;
  cache->results = r;
  cache->count++;
  return 0;
}

void* fl_qcache_get(fl_qcache_t *cache, const char *query) {
  if (!cache || !query) return NULL;
  for (int i = 0; i < cache->count; i++) {
    if (strcmp(cache->queries[i], query) == 0) return cache->results[i];
  }
  return NULL;
}

int fl_qcache_invalidate(fl_qcache_t *cache, const char *table) {
  if (!cache) return -1;
  cache->count = 0;
  return 0;
}
