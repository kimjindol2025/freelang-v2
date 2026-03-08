/**
 * FreeLang stdlib/cache - In-Memory Caching
 * LRU cache, TTL expiration, cache statistics, thread-safe operations
 */

#ifndef FREELANG_STDLIB_CACHE_H
#define FREELANG_STDLIB_CACHE_H

#include <stdint.h>
#include <time.h>
#include <pthread.h>

/* ===== Cache Entry ===== */

typedef struct fl_cache_entry {
  const char *key;
  void *value;
  size_t value_size;
  int64_t created_at;
  int64_t accessed_at;
  int64_t ttl_ms;        /* 0 = no expiration */
  struct fl_cache_entry *prev;
  struct fl_cache_entry *next;
} fl_cache_entry_t;

/* ===== LRU Cache ===== */

typedef struct {
  fl_cache_entry_t **hash_table;
  int hash_capacity;

  fl_cache_entry_t *lru_head;  /* Least recently used */
  fl_cache_entry_t *lru_tail;  /* Most recently used */

  int max_entries;
  int entry_count;

  int64_t hits;
  int64_t misses;
  int64_t evictions;

  pthread_mutex_t cache_mutex;
} fl_cache_t;

/* ===== Public API ===== */

/* Cache creation */
fl_cache_t* fl_cache_create(int max_entries);
void fl_cache_destroy(fl_cache_t *cache);

/* Basic operations */
int fl_cache_set(fl_cache_t *cache, const char *key, void *value, size_t value_size);
int fl_cache_set_ttl(fl_cache_t *cache, const char *key, void *value, size_t value_size, int64_t ttl_ms);
void* fl_cache_get(fl_cache_t *cache, const char *key, size_t *out_size);
int fl_cache_delete(fl_cache_t *cache, const char *key);
int fl_cache_has(fl_cache_t *cache, const char *key);

/* Cache management */
void fl_cache_clear(fl_cache_t *cache);
void fl_cache_evict_expired(fl_cache_t *cache);
int fl_cache_size(fl_cache_t *cache);

/* Enumeration */
typedef void (*fl_cache_callback_t)(const char *key, void *value, size_t size, void *userdata);
void fl_cache_foreach(fl_cache_t *cache, fl_cache_callback_t callback, void *userdata);

/* Statistics */
typedef struct {
  int entry_count;
  int max_entries;
  int64_t total_hits;
  int64_t total_misses;
  int64_t total_evictions;
  double hit_rate;
} fl_cache_stats_t;

fl_cache_stats_t fl_cache_get_stats(fl_cache_t *cache);

#endif /* FREELANG_STDLIB_CACHE_H */
