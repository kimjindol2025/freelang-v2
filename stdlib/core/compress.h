/**
 * FreeLang stdlib/compress - Data Compression
 * zlib/deflate, gzip, compression levels, streaming decompression
 */

#ifndef FREELANG_STDLIB_COMPRESS_H
#define FREELANG_STDLIB_COMPRESS_H

#include <stdint.h>
#include <stddef.h>

/* ===== Compression Types ===== */

typedef enum {
  FL_COMPRESS_DEFLATE = 0,    /* Raw deflate */
  FL_COMPRESS_ZLIB = 1,       /* zlib format (default) */
  FL_COMPRESS_GZIP = 2        /* gzip format */
} fl_compress_type_t;

/* ===== Compressor ===== */

typedef struct {
  fl_compress_type_t type;
  int level;                  /* 0-9, 6=default */
  void *internal_state;       /* zlib state */
} fl_compress_t;

/* ===== Public API ===== */

/* Compressor creation */
fl_compress_t* fl_compress_create(fl_compress_type_t type, int level);
void fl_compress_destroy(fl_compress_t *compressor);

/* Simple compression */
uint8_t* fl_compress_data(const uint8_t *data, size_t size, size_t *out_size);
uint8_t* fl_compress_data_ex(const uint8_t *data, size_t size,
                             fl_compress_type_t type, int level, size_t *out_size);

/* Simple decompression */
uint8_t* fl_decompress_data(const uint8_t *compressed, size_t size, size_t *out_size);
uint8_t* fl_decompress_data_ex(const uint8_t *compressed, size_t size,
                               fl_compress_type_t type, size_t *out_size);

/* Streaming compression */
int fl_compress_init(fl_compress_t *compressor);
int fl_compress_update(fl_compress_t *compressor, const uint8_t *input, size_t input_size,
                       uint8_t *output, size_t output_size, size_t *out_bytes);
int fl_compress_finish(fl_compress_t *compressor, uint8_t *output, size_t output_size,
                       size_t *out_bytes);

/* Streaming decompression */
int fl_decompress_init(fl_compress_t *compressor);
int fl_decompress_update(fl_compress_t *compressor, const uint8_t *input, size_t input_size,
                         uint8_t *output, size_t output_size, size_t *out_bytes);
int fl_decompress_finish(fl_compress_t *compressor, uint8_t *output, size_t output_size,
                         size_t *out_bytes);

/* Utilities */
size_t fl_compress_bound(size_t source_size);
int fl_compress_ratio(size_t original_size, size_t compressed_size);

#endif /* FREELANG_STDLIB_COMPRESS_H */
