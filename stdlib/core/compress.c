/**
 * FreeLang stdlib/compress Implementation - Data Compression
 * zlib wrapper for deflate/gzip compression
 */

#include "compress.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <zlib.h>

/* ===== Compressor Lifecycle ===== */

fl_compress_t* fl_compress_create(fl_compress_type_t type, int level) {
  if (level < 0 || level > 9) level = 6;

  fl_compress_t *compressor = (fl_compress_t*)malloc(sizeof(fl_compress_t));
  if (!compressor) return NULL;

  compressor->type = type;
  compressor->level = level;
  compressor->internal_state = NULL;

  fprintf(stderr, "[compress] Compressor created: type=%d, level=%d\n", type, level);
  return compressor;
}

void fl_compress_destroy(fl_compress_t *compressor) {
  if (!compressor) return;

  if (compressor->internal_state) {
    z_stream *stream = (z_stream*)compressor->internal_state;
    deflateEnd(stream);
    free(stream);
  }

  free(compressor);

  fprintf(stderr, "[compress] Compressor destroyed\n");
}

/* ===== Simple Compression ===== */

uint8_t* fl_compress_data(const uint8_t *data, size_t size, size_t *out_size) {
  return fl_compress_data_ex(data, size, FL_COMPRESS_ZLIB, 6, out_size);
}

uint8_t* fl_compress_data_ex(const uint8_t *data, size_t size,
                             fl_compress_type_t type, int level, size_t *out_size) {
  if (!data || !out_size) return NULL;

  if (level < 0 || level > 9) level = 6;

  size_t compressed_size = compressBound(size);
  uint8_t *compressed = (uint8_t*)malloc(compressed_size);
  if (!compressed) return NULL;

  int window_bits = 15;
  if (type == FL_COMPRESS_GZIP) {
    window_bits = 15 + 16;  /* gzip */
  } else if (type == FL_COMPRESS_DEFLATE) {
    window_bits = -15;      /* raw deflate */
  }

  z_stream stream = {0};
  if (deflateInit2(&stream, level, Z_DEFLATED, window_bits, 8, Z_DEFAULT_STRATEGY) != Z_OK) {
    free(compressed);
    return NULL;
  }

  stream.avail_in = (uInt)size;
  stream.next_in = (Bytef*)data;
  stream.avail_out = (uInt)compressed_size;
  stream.next_out = compressed;

  int ret = deflate(&stream, Z_FINISH);
  deflateEnd(&stream);

  if (ret != Z_STREAM_END) {
    free(compressed);
    return NULL;
  }

  *out_size = stream.total_out;

  fprintf(stderr, "[compress] Compressed: %zu → %zu bytes (%.1f%%)\n",
          size, *out_size, 100.0 * (*out_size) / size);

  return compressed;
}

/* ===== Simple Decompression ===== */

uint8_t* fl_decompress_data(const uint8_t *compressed, size_t size, size_t *out_size) {
  return fl_decompress_data_ex(compressed, size, FL_COMPRESS_ZLIB, out_size);
}

uint8_t* fl_decompress_data_ex(const uint8_t *compressed, size_t size,
                               fl_compress_type_t type, size_t *out_size) {
  if (!compressed || !out_size) return NULL;

  int window_bits = 15;
  if (type == FL_COMPRESS_GZIP) {
    window_bits = 15 + 16;  /* gzip */
  } else if (type == FL_COMPRESS_DEFLATE) {
    window_bits = -15;      /* raw deflate */
  } else {
    window_bits = 32 + 15;  /* auto-detect */
  }

  /* Try decompressing with increasing buffer sizes */
  for (size_t attempt = 1; attempt <= 10; attempt++) {
    size_t decompressed_size = size * (1 << attempt);
    uint8_t *decompressed = (uint8_t*)malloc(decompressed_size);
    if (!decompressed) return NULL;

    z_stream stream = {0};
    if (inflateInit2(&stream, window_bits) != Z_OK) {
      free(decompressed);
      return NULL;
    }

    stream.avail_in = (uInt)size;
    stream.next_in = (Bytef*)compressed;
    stream.avail_out = (uInt)decompressed_size;
    stream.next_out = decompressed;

    int ret = inflate(&stream, Z_FINISH);
    inflateEnd(&stream);

    if (ret == Z_STREAM_END) {
      *out_size = stream.total_out;
      fprintf(stderr, "[compress] Decompressed: %zu → %zu bytes\n", size, *out_size);
      return decompressed;
    }

    free(decompressed);

    if (ret != Z_BUF_ERROR) {
      return NULL;  /* Other error */
    }
  }

  return NULL;  /* Buffer too small */
}

/* ===== Streaming Compression ===== */

int fl_compress_init(fl_compress_t *compressor) {
  if (!compressor) return -1;

  if (compressor->internal_state) {
    z_stream *stream = (z_stream*)compressor->internal_state;
    deflateEnd(stream);
    free(stream);
  }

  z_stream *stream = (z_stream*)malloc(sizeof(z_stream));
  if (!stream) return -1;

  memset(stream, 0, sizeof(z_stream));

  int window_bits = 15;
  if (compressor->type == FL_COMPRESS_GZIP) {
    window_bits = 15 + 16;
  } else if (compressor->type == FL_COMPRESS_DEFLATE) {
    window_bits = -15;
  }

  if (deflateInit2(stream, compressor->level, Z_DEFLATED, window_bits, 8, Z_DEFAULT_STRATEGY) != Z_OK) {
    free(stream);
    return -1;
  }

  compressor->internal_state = stream;
  return 0;
}

int fl_compress_update(fl_compress_t *compressor, const uint8_t *input, size_t input_size,
                       uint8_t *output, size_t output_size, size_t *out_bytes) {
  if (!compressor || !compressor->internal_state) return -1;

  z_stream *stream = (z_stream*)compressor->internal_state;

  stream->avail_in = (uInt)input_size;
  stream->next_in = (Bytef*)input;
  stream->avail_out = (uInt)output_size;
  stream->next_out = output;

  int ret = deflate(stream, Z_NO_FLUSH);
  if (ret != Z_OK) return -1;

  *out_bytes = output_size - stream->avail_out;
  return 0;
}

int fl_compress_finish(fl_compress_t *compressor, uint8_t *output, size_t output_size,
                       size_t *out_bytes) {
  if (!compressor || !compressor->internal_state) return -1;

  z_stream *stream = (z_stream*)compressor->internal_state;

  stream->avail_out = (uInt)output_size;
  stream->next_out = output;

  int ret = deflate(stream, Z_FINISH);
  if (ret != Z_STREAM_END) return -1;

  *out_bytes = output_size - stream->avail_out;
  return 0;
}

/* ===== Streaming Decompression ===== */

int fl_decompress_init(fl_compress_t *compressor) {
  if (!compressor) return -1;

  if (compressor->internal_state) {
    z_stream *stream = (z_stream*)compressor->internal_state;
    inflateEnd(stream);
    free(stream);
  }

  z_stream *stream = (z_stream*)malloc(sizeof(z_stream));
  if (!stream) return -1;

  memset(stream, 0, sizeof(z_stream));

  int window_bits = 32 + 15;  /* Auto-detect */

  if (inflateInit2(stream, window_bits) != Z_OK) {
    free(stream);
    return -1;
  }

  compressor->internal_state = stream;
  return 0;
}

int fl_decompress_update(fl_compress_t *compressor, const uint8_t *input, size_t input_size,
                         uint8_t *output, size_t output_size, size_t *out_bytes) {
  if (!compressor || !compressor->internal_state) return -1;

  z_stream *stream = (z_stream*)compressor->internal_state;

  stream->avail_in = (uInt)input_size;
  stream->next_in = (Bytef*)input;
  stream->avail_out = (uInt)output_size;
  stream->next_out = output;

  int ret = inflate(stream, Z_NO_FLUSH);
  if (ret != Z_OK && ret != Z_STREAM_END) return -1;

  *out_bytes = output_size - stream->avail_out;
  return ret == Z_STREAM_END ? 1 : 0;  /* 1 = finished, 0 = continue */
}

int fl_decompress_finish(fl_compress_t *compressor, uint8_t *output, size_t output_size,
                         size_t *out_bytes) {
  if (!compressor || !compressor->internal_state) return -1;

  z_stream *stream = (z_stream*)compressor->internal_state;

  stream->avail_out = (uInt)output_size;
  stream->next_out = output;

  int ret = inflate(stream, Z_FINISH);
  if (ret != Z_STREAM_END) return -1;

  *out_bytes = output_size - stream->avail_out;
  return 0;
}

/* ===== Utilities ===== */

size_t fl_compress_bound(size_t source_size) {
  return compressBound(source_size);
}

int fl_compress_ratio(size_t original_size, size_t compressed_size) {
  if (original_size == 0) return 0;
  return (int)((100 * compressed_size) / original_size);
}
