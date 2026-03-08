/**
 * FreeLang stdlib/hash Implementation - Hash Functions & Hash Tables
 */

#include "hash.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

/* ===== FNV-1a Hash ===== */

uint32_t fl_hash_fnv1a_32(const void *data, size_t len) {
  uint32_t hash = 2166136261U;
  const uint8_t *bytes = (const uint8_t*)data;

  for (size_t i = 0; i < len; i++) {
    hash ^= bytes[i];
    hash *= 16777619U;
  }

  return hash;
}

uint64_t fl_hash_fnv1a_64(const void *data, size_t len) {
  uint64_t hash = 14695981039346656037ULL;
  const uint8_t *bytes = (const uint8_t*)data;

  for (size_t i = 0; i < len; i++) {
    hash ^= bytes[i];
    hash *= 1099511628211ULL;
  }

  return hash;
}

/* ===== MurmurHash3 ===== */

static uint32_t murmur3_fmix32(uint32_t h) {
  h ^= h >> 15;
  h *= 0x85ebca6b;
  h ^= h >> 13;
  h *= 0xc2b2ae35;
  h ^= h >> 16;
  return h;
}

uint32_t fl_hash_murmur3_32(const void *data, size_t len, uint32_t seed) {
  const uint8_t *bytes = (const uint8_t*)data;
  uint32_t h1 = seed;
  const uint32_t c1 = 0xcc9e2d51;
  const uint32_t c2 = 0x1b873593;

  size_t nblocks = len / 4;

  /* Process blocks */
  const uint32_t *blocks = (const uint32_t*)(bytes + nblocks * 4);
  for (int i = -(int)nblocks; i; i++) {
    uint32_t k1 = blocks[i];

    k1 *= c1;
    k1 = (k1 << 15) | (k1 >> 17);
    k1 *= c2;

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >> 19);
    h1 = h1 * 5 + 0xe6546b64;
  }

  /* Process tail */
  const uint8_t *tail = bytes + nblocks * 4;
  uint32_t k1 = 0;

  switch (len & 3) {
    case 3: k1 ^= tail[2] << 16;
    case 2: k1 ^= tail[1] << 8;
    case 1: k1 ^= tail[0];
            k1 *= c1;
            k1 = (k1 << 15) | (k1 >> 17);
            k1 *= c2;
            h1 ^= k1;
  }

  h1 ^= len;
  return murmur3_fmix32(h1);
}

uint64_t fl_hash_murmur3_64(const void *data, size_t len, uint32_t seed) {
  /* Simplified: combine two 32-bit hashes */
  uint32_t h1 = fl_hash_murmur3_32(data, len, seed);
  uint32_t h2 = fl_hash_murmur3_32(data, len, seed ^ 0x9e3779b9);
  return ((uint64_t)h1 << 32) | h2;
}

/* ===== String Hashing ===== */

uint32_t fl_hash_string(const char *str) {
  return fl_hash_fnv1a_32(str, strlen(str));
}

uint32_t fl_hash_string_seed(const char *str, uint32_t seed) {
  return fl_hash_murmur3_32(str, strlen(str), seed);
}

/* ===== CRC32 ===== */

static uint32_t crc32_table[256] = {0};
static int crc32_table_initialized = 0;

static void init_crc32_table(void) {
  if (crc32_table_initialized) return;

  for (int i = 0; i < 256; i++) {
    uint32_t crc = i;
    for (int j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >> 1) ^ 0xedb88320;
      } else {
        crc >>= 1;
      }
    }
    crc32_table[i] = crc;
  }

  crc32_table_initialized = 1;
}

uint32_t fl_hash_crc32(const void *data, size_t len) {
  init_crc32_table();

  uint32_t crc = 0xffffffff;
  const uint8_t *bytes = (const uint8_t*)data;

  for (size_t i = 0; i < len; i++) {
    crc = crc32_table[(crc ^ bytes[i]) & 0xff] ^ (crc >> 8);
  }

  return crc ^ 0xffffffff;
}

/* ===== djb2 Hash ===== */

uint32_t fl_hash_djb2(const char *str) {
  uint32_t hash = 5381;

  for (int c; (c = *str++);) {
    hash = ((hash << 5) + hash) + c;
  }

  return hash;
}

/* ===== Hash Table ===== */

fl_hash_table_t* fl_hash_table_create(int initial_capacity) {
  if (initial_capacity <= 0) initial_capacity = 256;

  fl_hash_table_t *table = (fl_hash_table_t*)malloc(sizeof(fl_hash_table_t));
  if (!table) return NULL;

  table->entries = (fl_hash_entry_t*)malloc(sizeof(fl_hash_entry_t) * initial_capacity);
  if (!table->entries) {
    free(table);
    return NULL;
  }

  memset(table->entries, 0, sizeof(fl_hash_entry_t) * initial_capacity);

  table->capacity = initial_capacity;
  table->count = 0;
  table->max_load_factor = 75;

  fprintf(stderr, "[hash] Hash table created: capacity=%d\n", initial_capacity);
  return table;
}

void fl_hash_table_destroy(fl_hash_table_t *table) {
  if (!table) return;

  for (int i = 0; i < table->capacity; i++) {
    if (table->entries[i].key) {
      free((char*)table->entries[i].key);
    }
  }

  free(table->entries);
  free(table);

  fprintf(stderr, "[hash] Hash table destroyed\n");
}

static int hash_table_resize(fl_hash_table_t *table) {
  int new_capacity = table->capacity * 2;
  fl_hash_entry_t *new_entries = (fl_hash_entry_t*)malloc(sizeof(fl_hash_entry_t) * new_capacity);

  if (!new_entries) return -1;

  memset(new_entries, 0, sizeof(fl_hash_entry_t) * new_capacity);

  /* Rehash all entries */
  for (int i = 0; i < table->capacity; i++) {
    if (table->entries[i].key) {
      uint32_t index = table->entries[i].hash % new_capacity;

      /* Linear probing */
      while (new_entries[index].key) {
        index = (index + 1) % new_capacity;
      }

      new_entries[index] = table->entries[i];
    }
  }

  free(table->entries);
  table->entries = new_entries;
  table->capacity = new_capacity;

  fprintf(stderr, "[hash] Hash table resized: new_capacity=%d\n", new_capacity);
  return 0;
}

int fl_hash_table_set(fl_hash_table_t *table, const char *key, void *value) {
  if (!table || !key) return -1;

  uint32_t hash = fl_hash_string(key);
  uint32_t index = hash % table->capacity;

  /* Linear probing: find empty slot or existing key */
  int empty_index = -1;
  for (int i = 0; i < table->capacity; i++) {
    uint32_t probe_index = (index + i) % table->capacity;

    if (!table->entries[probe_index].key) {
      if (empty_index == -1) empty_index = probe_index;
      break;
    }

    if (strcmp(table->entries[probe_index].key, key) == 0) {
      table->entries[probe_index].value = value;
      return 0;
    }
  }

  if (empty_index == -1) {
    if (hash_table_resize(table) < 0) return -1;
    return fl_hash_table_set(table, key, value);  /* Retry */
  }

  char *key_copy = (char*)malloc(strlen(key) + 1);
  if (!key_copy) return -1;

  if(snprintf(key_copy, sizeof(key_copy), "%s", key) < 0) return -1;;

  table->entries[empty_index].key = key_copy;
  table->entries[empty_index].value = value;
  table->entries[empty_index].hash = hash;

  table->count++;

  /* Check load factor */
  int load_factor = (table->count * 100) / table->capacity;
  if (load_factor > table->max_load_factor) {
    hash_table_resize(table);
  }

  fprintf(stderr, "[hash] Entry set: %s (load=%d%%)\n", key, load_factor);
  return 0;
}

void* fl_hash_table_get(fl_hash_table_t *table, const char *key) {
  if (!table || !key) return NULL;

  uint32_t hash = fl_hash_string(key);
  uint32_t index = hash % table->capacity;

  for (int i = 0; i < table->capacity; i++) {
    uint32_t probe_index = (index + i) % table->capacity;

    if (!table->entries[probe_index].key) {
      break;
    }

    if (strcmp(table->entries[probe_index].key, key) == 0) {
      return table->entries[probe_index].value;
    }
  }

  return NULL;
}

int fl_hash_table_delete(fl_hash_table_t *table, const char *key) {
  if (!table || !key) return -1;

  uint32_t hash = fl_hash_string(key);
  uint32_t index = hash % table->capacity;

  for (int i = 0; i < table->capacity; i++) {
    uint32_t probe_index = (index + i) % table->capacity;

    if (!table->entries[probe_index].key) {
      break;
    }

    if (strcmp(table->entries[probe_index].key, key) == 0) {
      free((char*)table->entries[probe_index].key);
      table->entries[probe_index].key = NULL;
      table->entries[probe_index].value = NULL;
      table->count--;

      fprintf(stderr, "[hash] Entry deleted: %s\n", key);
      return 0;
    }
  }

  return -1;
}

int fl_hash_table_has(fl_hash_table_t *table, const char *key) {
  return fl_hash_table_get(table, key) != NULL ? 1 : 0;
}

void fl_hash_table_clear(fl_hash_table_t *table) {
  if (!table) return;

  for (int i = 0; i < table->capacity; i++) {
    if (table->entries[i].key) {
      free((char*)table->entries[i].key);
      table->entries[i].key = NULL;
      table->entries[i].value = NULL;
    }
  }

  table->count = 0;

  fprintf(stderr, "[hash] Hash table cleared\n");
}

int fl_hash_table_size(fl_hash_table_t *table) {
  return table ? table->count : 0;
}

void fl_hash_table_foreach(fl_hash_table_t *table, fl_hash_callback_t callback, void *userdata) {
  if (!table || !callback) return;

  for (int i = 0; i < table->capacity; i++) {
    if (table->entries[i].key) {
      callback(table->entries[i].key, table->entries[i].value, userdata);
    }
  }
}
