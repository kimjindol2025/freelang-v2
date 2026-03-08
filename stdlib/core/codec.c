/**
 * FreeLang stdlib/codec Implementation - General Codec Framework
 * Pluggable encoding/decoding with multiple algorithms
 */

#include "codec.h"
#include "security_macros.h"
#include "base64.h"
#include "security_macros.h"
#include "hex.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <pthread.h>

/* ===== Global Statistics ===== */

static fl_codec_stats_t global_stats = {
  .total_encodes = 0,
  .total_decodes = 0,
  .encode_errors = 0,
  .decode_errors = 0,
  .total_bytes_encoded = 0,
  .total_bytes_decoded = 0
};

static pthread_mutex_t stats_mutex = PTHREAD_MUTEX_INITIALIZER;

/* ===== Codec Registry ===== */

fl_codec_registry_t* fl_codec_registry_create(int capacity) {
  if (capacity <= 0) capacity = 10;

  fl_codec_registry_t *registry = (fl_codec_registry_t*)malloc(sizeof(fl_codec_registry_t));
  if (!registry) return NULL;

  registry->codecs = (fl_codec_t*)malloc(capacity * sizeof(fl_codec_t));
  if (!registry->codecs) {
    free(registry);
    return NULL;
  }

  registry->codec_count = 0;
  registry->max_codecs = capacity;

  fprintf(stderr, "[codec] Registry created: capacity=%d\n", capacity);
  return registry;
}

void fl_codec_registry_destroy(fl_codec_registry_t *registry) {
  if (!registry) return;

  for (int i = 0; i < registry->codec_count; i++) {
    free((void*)registry->codecs[i].name);
  }

  free(registry->codecs);
  free(registry);

  fprintf(stderr, "[codec] Registry destroyed\n");
}

/* ===== Codec Registration ===== */

int fl_codec_register(fl_codec_registry_t *registry, fl_codec_type_t type,
                      const char *name,
                      uint8_t (*encode)(const uint8_t*, size_t, uint8_t*, size_t*),
                      uint8_t (*decode)(const uint8_t*, size_t, uint8_t*, size_t*)) {
  if (!registry || !name) return -1;

  if (registry->codec_count >= registry->max_codecs) {
    /* Resize */
    int new_capacity = registry->max_codecs * 2;
    fl_codec_t *new_codecs = (fl_codec_t*)realloc(registry->codecs,
                                                   new_capacity * sizeof(fl_codec_t));
    if (!new_codecs) return -1;

    registry->codecs = new_codecs;
    registry->max_codecs = new_capacity;
  }

  fl_codec_t *codec = &registry->codecs[registry->codec_count];
  codec->codec_id = (int)type;
  codec->name = (const char*)malloc(strlen(name) + 1);
  if (!codec->name) return -1;

  SAFE_STRCPY((char*)codec->name, name);
  codec->encode = encode;
  codec->decode = decode;

  registry->codec_count++;

  fprintf(stderr, "[codec] Registered: %s (type=%d)\n", name, type);
  return (int)type;
}

/* ===== Codec Lookup ===== */

fl_codec_t* fl_codec_get(fl_codec_registry_t *registry, fl_codec_type_t type) {
  if (!registry) return NULL;

  for (int i = 0; i < registry->codec_count; i++) {
    if (registry->codecs[i].codec_id == (int)type) {
      return &registry->codecs[i];
    }
  }

  return NULL;
}

fl_codec_t* fl_codec_get_by_name(fl_codec_registry_t *registry, const char *name) {
  if (!registry || !name) return NULL;

  for (int i = 0; i < registry->codec_count; i++) {
    if (strcmp(registry->codecs[i].name, name) == 0) {
      return &registry->codecs[i];
    }
  }

  return NULL;
}

/* ===== Encode/Decode ===== */

int fl_codec_encode(fl_codec_registry_t *registry, fl_codec_type_t type,
                    const uint8_t *data, size_t size,
                    uint8_t *output, size_t *out_size) {
  if (!registry || !data || !output || !out_size) return -1;

  fl_codec_t *codec = fl_codec_get(registry, type);
  if (!codec || !codec->encode) {
    fprintf(stderr, "[codec] Encoder not found: type=%d\n", type);
    return -1;
  }

  uint8_t result = codec->encode(data, size, output, out_size);

  pthread_mutex_lock(&stats_mutex);
  global_stats.total_encodes++;
  if (result == 0) {
    global_stats.total_bytes_encoded += size;
  } else {
    global_stats.encode_errors++;
  }
  pthread_mutex_unlock(&stats_mutex);

  fprintf(stderr, "[codec] Encoded (%s): %zu → %zu bytes\n",
          codec->name, size, *out_size);
  return result == 0 ? 0 : -1;
}

int fl_codec_decode(fl_codec_registry_t *registry, fl_codec_type_t type,
                    const uint8_t *data, size_t size,
                    uint8_t *output, size_t *out_size) {
  if (!registry || !data || !output || !out_size) return -1;

  fl_codec_t *codec = fl_codec_get(registry, type);
  if (!codec || !codec->decode) {
    fprintf(stderr, "[codec] Decoder not found: type=%d\n", type);
    return -1;
  }

  uint8_t result = codec->decode(data, size, output, out_size);

  pthread_mutex_lock(&stats_mutex);
  global_stats.total_decodes++;
  if (result == 0) {
    global_stats.total_bytes_decoded += size;
  } else {
    global_stats.decode_errors++;
  }
  pthread_mutex_unlock(&stats_mutex);

  fprintf(stderr, "[codec] Decoded (%s): %zu → %zu bytes\n",
          codec->name, size, *out_size);
  return result == 0 ? 0 : -1;
}

/* ===== Codec Chain ===== */

fl_codec_chain_t* fl_codec_chain_create(int capacity) {
  if (capacity <= 0) capacity = 5;

  fl_codec_chain_t *chain = (fl_codec_chain_t*)malloc(sizeof(fl_codec_chain_t));
  if (!chain) return NULL;

  chain->chain = (fl_codec_type_t*)malloc(capacity * sizeof(fl_codec_type_t));
  if (!chain->chain) {
    free(chain);
    return NULL;
  }

  chain->chain_length = 0;
  chain->max_length = capacity;

  fprintf(stderr, "[codec] Chain created: capacity=%d\n", capacity);
  return chain;
}

void fl_codec_chain_destroy(fl_codec_chain_t *chain) {
  if (!chain) return;

  free(chain->chain);
  free(chain);

  fprintf(stderr, "[codec] Chain destroyed\n");
}

int fl_codec_chain_add(fl_codec_chain_t *chain, fl_codec_type_t type) {
  if (!chain) return -1;

  if (chain->chain_length >= chain->max_length) {
    /* Resize */
    int new_capacity = chain->max_length * 2;
    fl_codec_type_t *new_chain = (fl_codec_type_t*)realloc(chain->chain,
                                                            new_capacity * sizeof(fl_codec_type_t));
    if (!new_chain) return -1;

    chain->chain = new_chain;
    chain->max_length = new_capacity;
  }

  chain->chain[chain->chain_length++] = type;
  fprintf(stderr, "[codec] Added to chain: type=%d\n", type);
  return 0;
}

int fl_codec_chain_execute(fl_codec_registry_t *registry, fl_codec_chain_t *chain,
                           const uint8_t *data, size_t size,
                           uint8_t *output, size_t *out_size) {
  if (!registry || !chain || !data || !output || !out_size) return -1;

  /* Use intermediate buffer for chaining */
  uint8_t *buffer1 = (uint8_t*)malloc(size * 4);  /* Over-allocate for safety */
  uint8_t *buffer2 = (uint8_t*)malloc(size * 4);
  if (!buffer1 || !buffer2) {
    free(buffer1);
    free(buffer2);
    return -1;
  }

  uint8_t *current = (uint8_t*)data;
  size_t current_size = size;
  uint8_t *next_buffer = buffer1;

  for (int i = 0; i < chain->chain_length; i++) {
    size_t next_size = 0;

    if (fl_codec_encode(registry, chain->chain[i], current, current_size,
                        next_buffer, &next_size) != 0) {
      free(buffer1);
      free(buffer2);
      return -1;
    }

    /* Swap buffers */
    uint8_t *temp = current == data ? buffer2 : (current == buffer1 ? buffer2 : buffer1);
    current = next_buffer;
    current_size = next_size;
    next_buffer = temp;
  }

  /* Copy result */
  if (current_size <= *out_size) {
    memcpy(output, current, current_size);
    *out_size = current_size;
  } else {
    free(buffer1);
    free(buffer2);
    return -1;
  }

  free(buffer1);
  free(buffer2);

  fprintf(stderr, "[codec] Chain executed: %d codecs, %zu → %zu bytes\n",
          chain->chain_length, size, current_size);
  return 0;
}

/* ===== Built-in Codecs ===== */

static uint8_t builtin_base64_encode(const uint8_t *data, size_t size,
                                     uint8_t *output, size_t *out_size) {
  char *encoded = fl_base64_encode(data, size);
  if (!encoded) return 1;

  size_t len = strlen(encoded);
  if (len <= *out_size) {
    memcpy(output, encoded, len);
    *out_size = len;
    free(encoded);
    return 0;
  }

  free(encoded);
  return 1;
}

static uint8_t builtin_base64_decode(const uint8_t *data, size_t size,
                                     uint8_t *output, size_t *out_size) {
  char *encoded = (char*)malloc(size + 1);
  if (!encoded) return 1;

  memcpy(encoded, data, size);
  encoded[size] = '\0';

  size_t decoded_size = 0;
  uint8_t *decoded = fl_base64_decode(encoded, &decoded_size);
  free(encoded);

  if (!decoded) return 1;

  if (decoded_size <= *out_size) {
    memcpy(output, decoded, decoded_size);
    *out_size = decoded_size;
    free(decoded);
    return 0;
  }

  free(decoded);
  return 1;
}

static uint8_t builtin_hex_encode(const uint8_t *data, size_t size,
                                  uint8_t *output, size_t *out_size) {
  char *encoded = fl_hex_encode(data, size);
  if (!encoded) return 1;

  size_t len = strlen(encoded);
  if (len <= *out_size) {
    memcpy(output, encoded, len);
    *out_size = len;
    free(encoded);
    return 0;
  }

  free(encoded);
  return 1;
}

static uint8_t builtin_hex_decode(const uint8_t *data, size_t size,
                                  uint8_t *output, size_t *out_size) {
  char *encoded = (char*)malloc(size + 1);
  if (!encoded) return 1;

  memcpy(encoded, data, size);
  encoded[size] = '\0';

  size_t decoded_size = 0;
  uint8_t *decoded = fl_hex_decode(encoded, &decoded_size);
  free(encoded);

  if (!decoded) return 1;

  if (decoded_size <= *out_size) {
    memcpy(output, decoded, decoded_size);
    *out_size = decoded_size;
    free(decoded);
    return 0;
  }

  free(decoded);
  return 1;
}

int fl_codec_register_builtins(fl_codec_registry_t *registry) {
  if (!registry) return -1;

  fl_codec_register(registry, FL_CODEC_BASE64, "base64",
                    builtin_base64_encode, builtin_base64_decode);

  fl_codec_register(registry, FL_CODEC_HEX, "hex",
                    builtin_hex_encode, builtin_hex_decode);

  fprintf(stderr, "[codec] Built-in codecs registered: 2\n");
  return 0;
}

/* ===== Statistics ===== */

fl_codec_stats_t* fl_codec_get_stats(void) {
  fl_codec_stats_t *stats = (fl_codec_stats_t*)malloc(sizeof(fl_codec_stats_t));
  if (!stats) return NULL;

  pthread_mutex_lock(&stats_mutex);
  memcpy(stats, &global_stats, sizeof(fl_codec_stats_t));
  pthread_mutex_unlock(&stats_mutex);

  return stats;
}

void fl_codec_reset_stats(void) {
  pthread_mutex_lock(&stats_mutex);
  memset(&global_stats, 0, sizeof(fl_codec_stats_t));
  pthread_mutex_unlock(&stats_mutex);

  fprintf(stderr, "[codec] Stats reset\n");
}
