/**
 * FreeLang stdlib/cache Implementation - LRU Cache with TTL
 */

#include "cache.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>

/* ===== Simple Hash Function ===== */

static uint32_t hash_fnv1a(const char *key, int capacity) {
  uint32_t hash = 2166136261U;
  while (*key) {
    hash ^= (unsigned char)*key++;
    hash *= 16777619U;
  }
  return hash % capacity;
}

/* ===== Cache Lifecycle ===== */

fl_cache_t* fl_cache_create(int max_entries) {
  if (max_entries <= 0 || max_entries > 65536) max_entries = 1024;

  fl_cache_t *cache = (fl_cache_t*)malloc(sizeof(fl_cache_t));
  if (!cache) return NULL;

  memset(cache, 0, sizeof(fl_cache_t));

  cache->max_entries = max_entries;
  cache->hash_capacity = max_entries * 2;
  cache->hash_table = (fl_cache_entry_t**)malloc(sizeof(fl_cache_entry_t*) * cache->hash_capacity);

  if (!cache->hash_table) {
    free(cache);
    return NULL;
  }

  memset(cache->hash_table, 0, sizeof(fl_cache_entry_t*) * cache->hash_capacity);

  pthread_mutex_init(&cache->cache_mutex, NULL);

  fprintf(stderr, "[cache] LRU cache created: max_entries=%d\n", max_entries);
  return cache;
}

void fl_cache_destroy(fl_cache_t *cache) {
  if (!cache) return;

  pthread_mutex_lock(&cache->cache_mutex);

  fl_cache_entry_t *entry = cache->lru_head;
  while (entry) {
    fl_cache_entry_t *next = entry->next;
    free((char*)entry->key);
    free(entry->value);
    free(entry);
    entry = next;
  }

  pthread_mutex_unlock(&cache->cache_mutex);

  pthread_mutex_destroy(&cache->cache_mutex);
  free(cache->hash_table);
  free(cache);

  fprintf(stderr, "[cache] Cache destroyed\n");
}

/* ===== LRU Helpers ===== */

static void move_to_tail(fl_cache_t *cache, fl_cache_entry_t *entry) {
  if (entry == cache->lru_tail) return;

  /* Remove from current position */
  if (entry->prev) {
    entry->prev->next = entry->next;
  } else {
    cache->lru_head = entry->next;
  }

  if (entry->next) {
    entry->next->prev = entry->prev;
  }

  /* Add to tail */
  entry->prev = cache->lru_tail;
  entry->next = NULL;

  if (cache->lru_tail) {
    cache->lru_tail->next = entry;
  }

  cache->lru_tail = entry;

  if (!cache->lru_head) {
    cache->lru_head = entry;
  }
}

static void evict_lru(fl_cache_t *cache) {
  if (!cache->lru_head) return;

  fl_cache_entry_t *to_evict = cache->lru_head;

  /* Remove from hash table */
  uint32_t index = hash_fnv1a(to_evict->key, cache->hash_capacity);
  fl_cache_entry_t *entry = cache->hash_table[index];
  fl_cache_entry_t *prev = NULL;

  while (entry) {
    if (entry == to_evict) {
      if (prev) {
        prev->next = entry->next;
      } else {
        cache->hash_table[index] = entry->next;
      }
      break;
    }
    prev = entry;
    entry = entry->next;
  }

  /* Remove from LRU list */
  cache->lru_head = to_evict->next;
  if (cache->lru_head) {
    cache->lru_head->prev = NULL;
  } else {
    cache->lru_tail = NULL;
  }

  free((char*)to_evict->key);
  free(to_evict->value);
  free(to_evict);

  cache->entry_count--;
  cache->evictions++;

  fprintf(stderr, "[cache] Evicted LRU entry\n");
}

/* ===== Basic Operations ===== */

int fl_cache_set(fl_cache_t *cache, const char *key, void *value, size_t value_size) {
  return fl_cache_set_ttl(cache, key, value, value_size, 0);
}

int fl_cache_set_ttl(fl_cache_t *cache, const char *key, void *value, size_t value_size, int64_t ttl_ms) {
  if (!cache || !key || !value) return -1;

  pthread_mutex_lock(&cache->cache_mutex);

  uint32_t index = hash_fnv1a(key, cache->hash_capacity);

  /* Check if key already exists */
  fl_cache_entry_t *entry = cache->hash_table[index];
  while (entry) {
    if (strcmp(entry->key, key) == 0) {
      /* Update existing entry */
      void *new_value = malloc(value_size);
      if (!new_value) {
        pthread_mutex_unlock(&cache->cache_mutex);
        return -1;
      }

      memcpy(new_value, value, value_size);
      free(entry->value);
      entry->value = new_value;
      entry->value_size = value_size;
      entry->accessed_at = time(NULL);
      entry->ttl_ms = ttl_ms;

      move_to_tail(cache, entry);

      pthread_mutex_unlock(&cache->cache_mutex);
      fprintf(stderr, "[cache] Entry updated: %s\n", key);
      return 0;
    }
    entry = entry->next;
  }

  /* Create new entry */
  if (cache->entry_count >= cache->max_entries) {
    evict_lru(cache);
  }

  fl_cache_entry_t *new_entry = (fl_cache_entry_t*)malloc(sizeof(fl_cache_entry_t));
  if (!new_entry) {
    pthread_mutex_unlock(&cache->cache_mutex);
    return -1;
  }

  void *new_value = malloc(value_size);
  if (!new_value) {
    free(new_entry);
    pthread_mutex_unlock(&cache->cache_mutex);
    return -1;
  }

  memcpy(new_value, value, value_size);

  char *key_copy = (char*)malloc(strlen(key) + 1);
  if (!key_copy) {
    free(new_value);
    free(new_entry);
    pthread_mutex_unlock(&cache->cache_mutex);
    return -1;
  }

  if(snprintf(key_copy, sizeof(key_copy), "%s", key) < 0) return -1;;

  new_entry->key = key_copy;
  new_entry->value = new_value;
  new_entry->value_size = value_size;
  new_entry->created_at = time(NULL);
  new_entry->accessed_at = new_entry->created_at;
  new_entry->ttl_ms = ttl_ms;
  new_entry->prev = NULL;
  new_entry->next = NULL;

  /* Add to hash table */
  new_entry->next = cache->hash_table[index];
  cache->hash_table[index] = new_entry;

  /* Add to LRU tail */
  move_to_tail(cache, new_entry);

  cache->entry_count++;

  pthread_mutex_unlock(&cache->cache_mutex);

  fprintf(stderr, "[cache] Entry set: %s (size=%zu)\n", key, value_size);
  return 0;
}

void* fl_cache_get(fl_cache_t *cache, const char *key, size_t *out_size) {
  if (!cache || !key) return NULL;

  pthread_mutex_lock(&cache->cache_mutex);

  uint32_t index = hash_fnv1a(key, cache->hash_capacity);
  fl_cache_entry_t *entry = cache->hash_table[index];

  while (entry) {
    if (strcmp(entry->key, key) == 0) {
      /* Check if expired */
      if (entry->ttl_ms > 0) {
        int64_t now = time(NULL);
        if ((now - entry->accessed_at) * 1000 > entry->ttl_ms) {
          /* Expired, delete it */
          cache->hash_table[index] = entry->next;
          free((char*)entry->key);
          free(entry->value);
          free(entry);
          cache->entry_count--;
          cache->misses++;

          pthread_mutex_unlock(&cache->cache_mutex);
          return NULL;
        }
      }

      /* Move to tail (most recently used) */
      entry->accessed_at = time(NULL);
      move_to_tail(cache, entry);

      cache->hits++;

      if (out_size) *out_size = entry->value_size;

      pthread_mutex_unlock(&cache->cache_mutex);
      fprintf(stderr, "[cache] Cache hit: %s\n", key);
      return entry->value;
    }
    entry = entry->next;
  }

  cache->misses++;

  pthread_mutex_unlock(&cache->cache_mutex);
  fprintf(stderr, "[cache] Cache miss: %s\n", key);
  return NULL;
}

int fl_cache_delete(fl_cache_t *cache, const char *key) {
  if (!cache || !key) return -1;

  pthread_mutex_lock(&cache->cache_mutex);

  uint32_t index = hash_fnv1a(key, cache->hash_capacity);
  fl_cache_entry_t *entry = cache->hash_table[index];
  fl_cache_entry_t *prev = NULL;

  while (entry) {
    if (strcmp(entry->key, key) == 0) {
      if (prev) {
        prev->next = entry->next;
      } else {
        cache->hash_table[index] = entry->next;
      }

      /* Remove from LRU list */
      if (entry->prev) {
        entry->prev->next = entry->next;
      } else {
        cache->lru_head = entry->next;
      }

      if (entry->next) {
        entry->next->prev = entry->prev;
      } else {
        cache->lru_tail = entry->prev;
      }

      free((char*)entry->key);
      free(entry->value);
      free(entry);

      cache->entry_count--;

      pthread_mutex_unlock(&cache->cache_mutex);
      fprintf(stderr, "[cache] Entry deleted: %s\n", key);
      return 0;
    }

    prev = entry;
    entry = entry->next;
  }

  pthread_mutex_unlock(&cache->cache_mutex);
  return -1;
}

int fl_cache_has(fl_cache_t *cache, const char *key) {
  if (!cache || !key) return 0;

  pthread_mutex_lock(&cache->cache_mutex);

  uint32_t index = hash_fnv1a(key, cache->hash_capacity);
  fl_cache_entry_t *entry = cache->hash_table[index];

  while (entry) {
    if (strcmp(entry->key, key) == 0) {
      pthread_mutex_unlock(&cache->cache_mutex);
      return 1;
    }
    entry = entry->next;
  }

  pthread_mutex_unlock(&cache->cache_mutex);
  return 0;
}

/* ===== Cache Management ===== */

void fl_cache_clear(fl_cache_t *cache) {
  if (!cache) return;

  pthread_mutex_lock(&cache->cache_mutex);

  fl_cache_entry_t *entry = cache->lru_head;
  while (entry) {
    fl_cache_entry_t *next = entry->next;
    free((char*)entry->key);
    free(entry->value);
    free(entry);
    entry = next;
  }

  memset(cache->hash_table, 0, sizeof(fl_cache_entry_t*) * cache->hash_capacity);

  cache->lru_head = NULL;
  cache->lru_tail = NULL;
  cache->entry_count = 0;

  pthread_mutex_unlock(&cache->cache_mutex);

  fprintf(stderr, "[cache] Cache cleared\n");
}

void fl_cache_evict_expired(fl_cache_t *cache) {
  if (!cache) return;

  pthread_mutex_lock(&cache->cache_mutex);

  int64_t now = time(NULL);
  fl_cache_entry_t *entry = cache->lru_head;
  int expired_count = 0;

  while (entry) {
    fl_cache_entry_t *next = entry->next;

    if (entry->ttl_ms > 0 && (now - entry->accessed_at) * 1000 > entry->ttl_ms) {
      fl_cache_delete(cache, entry->key);
      expired_count++;
    }

    entry = next;
  }

  pthread_mutex_unlock(&cache->cache_mutex);

  fprintf(stderr, "[cache] Evicted %d expired entries\n", expired_count);
}

int fl_cache_size(fl_cache_t *cache) {
  if (!cache) return 0;

  pthread_mutex_lock(&cache->cache_mutex);
  int size = cache->entry_count;
  pthread_mutex_unlock(&cache->cache_mutex);

  return size;
}

/* ===== Enumeration ===== */

void fl_cache_foreach(fl_cache_t *cache, fl_cache_callback_t callback, void *userdata) {
  if (!cache || !callback) return;

  pthread_mutex_lock(&cache->cache_mutex);

  fl_cache_entry_t *entry = cache->lru_head;
  while (entry) {
    callback(entry->key, entry->value, entry->value_size, userdata);
    entry = entry->next;
  }

  pthread_mutex_unlock(&cache->cache_mutex);
}

/* ===== Statistics ===== */

fl_cache_stats_t fl_cache_get_stats(fl_cache_t *cache) {
  fl_cache_stats_t stats = {0};

  if (!cache) return stats;

  pthread_mutex_lock(&cache->cache_mutex);

  stats.entry_count = cache->entry_count;
  stats.max_entries = cache->max_entries;
  stats.total_hits = cache->hits;
  stats.total_misses = cache->misses;
  stats.total_evictions = cache->evictions;

  int64_t total = cache->hits + cache->misses;
  stats.hit_rate = total > 0 ? (double)cache->hits / total : 0.0;

  pthread_mutex_unlock(&cache->cache_mutex);

  return stats;
}
