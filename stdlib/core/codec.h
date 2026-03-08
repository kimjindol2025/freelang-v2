/**
 * FreeLang stdlib/codec - General Codec Framework
 * Pluggable encoding/decoding with multiple algorithms
 */

#ifndef FREELANG_STDLIB_CODEC_H
#define FREELANG_STDLIB_CODEC_H

#include <stdint.h>
#include <stddef.h>

/* ===== Codec Types ===== */

typedef enum {
  FL_CODEC_BASE64 = 0,
  FL_CODEC_HEX = 1,
  FL_CODEC_UTF8 = 2,
  FL_CODEC_URL = 3,
  FL_CODEC_PERCENT = 4
} fl_codec_type_t;

/* ===== Codec Registry ===== */

typedef struct {
  int codec_id;
  const char *name;
  uint8_t (*encode)(const uint8_t *data, size_t size, uint8_t *output, size_t *out_size);
  uint8_t (*decode)(const uint8_t *data, size_t size, uint8_t *output, size_t *out_size);
} fl_codec_t;

typedef struct {
  fl_codec_t *codecs;
  int codec_count;
  int max_codecs;
} fl_codec_registry_t;

/* ===== Codec Operations ===== */

/* Create/destroy registry */
fl_codec_registry_t* fl_codec_registry_create(int capacity);
void fl_codec_registry_destroy(fl_codec_registry_t *registry);

/* Register codec */
int fl_codec_register(fl_codec_registry_t *registry, fl_codec_type_t type,
                      const char *name,
                      uint8_t (*encode)(const uint8_t*, size_t, uint8_t*, size_t*),
                      uint8_t (*decode)(const uint8_t*, size_t, uint8_t*, size_t*));

/* Get codec by type */
fl_codec_t* fl_codec_get(fl_codec_registry_t *registry, fl_codec_type_t type);
fl_codec_t* fl_codec_get_by_name(fl_codec_registry_t *registry, const char *name);

/* Encode/decode with codec */
int fl_codec_encode(fl_codec_registry_t *registry, fl_codec_type_t type,
                    const uint8_t *data, size_t size,
                    uint8_t *output, size_t *out_size);

int fl_codec_decode(fl_codec_registry_t *registry, fl_codec_type_t type,
                    const uint8_t *data, size_t size,
                    uint8_t *output, size_t *out_size);

/* Codec chain (sequence of codecs) */
typedef struct {
  fl_codec_type_t *chain;
  int chain_length;
  int max_length;
} fl_codec_chain_t;

fl_codec_chain_t* fl_codec_chain_create(int capacity);
void fl_codec_chain_destroy(fl_codec_chain_t *chain);
int fl_codec_chain_add(fl_codec_chain_t *chain, fl_codec_type_t type);
int fl_codec_chain_execute(fl_codec_registry_t *registry, fl_codec_chain_t *chain,
                           const uint8_t *data, size_t size,
                           uint8_t *output, size_t *out_size);

/* Built-in codecs */
int fl_codec_register_builtins(fl_codec_registry_t *registry);

/* Statistics */
typedef struct {
  int total_encodes;
  int total_decodes;
  int encode_errors;
  int decode_errors;
  uint64_t total_bytes_encoded;
  uint64_t total_bytes_decoded;
} fl_codec_stats_t;

fl_codec_stats_t* fl_codec_get_stats(void);
void fl_codec_reset_stats(void);

#endif /* FREELANG_STDLIB_CODEC_H */
