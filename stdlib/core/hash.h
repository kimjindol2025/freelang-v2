/**
 * FreeLang stdlib/hash - Hashing Utilities
 * Hash functions (FNV-1a, MurmurHash), checksums, hash tables
 */

#ifndef FREELANG_STDLIB_HASH_H
#define FREELANG_STDLIB_HASH_H

#include <stdint.h>
#include <stddef.h>

/* ===== Hash Functions ===== */

/* FNV-1a (Fowler-Noll-Vo) - fast, simple, good distribution */
uint32_t fl_hash_fnv1a_32(const void *data, size_t len);
uint64_t fl_hash_fnv1a_64(const void *data, size_t len);

/* MurmurHash3 - avalanche properties, faster on large data */
uint32_t fl_hash_murmur3_32(const void *data, size_t len, uint32_t seed);
uint64_t fl_hash_murmur3_64(const void *data, size_t len, uint32_t seed);

/* String hashing */
uint32_t fl_hash_string(const char *str);
uint32_t fl_hash_string_seed(const char *str, uint32_t seed);

/* ===== Checksums ===== */

/* CRC32 - error detection */
uint32_t fl_hash_crc32(const void *data, size_t len);

/* djb2 - simple, fast string hash */
uint32_t fl_hash_djb2(const char *str);

/* ===== Hash Table Entry ===== */

typedef struct {
  const char *key;
  void *value;
  uint32_t hash;
} fl_hash_entry_t;

/* ===== Hash Table ===== */

typedef struct {
  fl_hash_entry_t *entries;
  int capacity;
  int count;
  int max_load_factor;  /* 75 = 75% */
} fl_hash_table_t;

/* ===== Hash Table API ===== */

fl_hash_table_t* fl_hash_table_create(int initial_capacity);
void fl_hash_table_destroy(fl_hash_table_t *table);

int fl_hash_table_set(fl_hash_table_t *table, const char *key, void *value);
void* fl_hash_table_get(fl_hash_table_t *table, const char *key);
int fl_hash_table_delete(fl_hash_table_t *table, const char *key);
int fl_hash_table_has(fl_hash_table_t *table, const char *key);

void fl_hash_table_clear(fl_hash_table_t *table);
int fl_hash_table_size(fl_hash_table_t *table);

/* Enumeration */
typedef void (*fl_hash_callback_t)(const char *key, void *value, void *userdata);
void fl_hash_table_foreach(fl_hash_table_t *table, fl_hash_callback_t callback, void *userdata);

#endif /* FREELANG_STDLIB_HASH_H */
