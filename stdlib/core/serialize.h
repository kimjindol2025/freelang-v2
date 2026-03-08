/**
 * FreeLang stdlib/serialize - Serialization Framework
 * Object serialization, binary encoding, versioning, schema support
 */

#ifndef FREELANG_STDLIB_SERIALIZE_H
#define FREELANG_STDLIB_SERIALIZE_H

#include <stdint.h>
#include <stddef.h>

/* ===== Serialization Format ===== */

typedef enum {
  FL_SERIALIZE_BINARY = 0,    /* Compact binary format */
  FL_SERIALIZE_TEXT = 1       /* Human-readable text */
} fl_serialize_format_t;

/* ===== Buffer ===== */

typedef struct {
  uint8_t *data;
  size_t size;
  size_t capacity;
  size_t pos;                 /* Read position */
} fl_buffer_t;

/* ===== Serializer ===== */

typedef struct {
  fl_buffer_t buffer;
  fl_serialize_format_t format;
  uint32_t version;           /* Schema version */
  int little_endian;          /* Byte order */
} fl_serializer_t;

/* ===== Public API ===== */

/* Buffer creation */
fl_buffer_t* fl_buffer_create(size_t initial_capacity);
void fl_buffer_destroy(fl_buffer_t *buffer);
void fl_buffer_clear(fl_buffer_t *buffer);
void fl_buffer_reset_pos(fl_buffer_t *buffer);

/* Buffer operations */
int fl_buffer_write(fl_buffer_t *buffer, const void *data, size_t size);
int fl_buffer_read(fl_buffer_t *buffer, void *data, size_t size);
const uint8_t* fl_buffer_data(fl_buffer_t *buffer);
size_t fl_buffer_size(fl_buffer_t *buffer);

/* Serializer creation */
fl_serializer_t* fl_serializer_create(fl_serialize_format_t format);
void fl_serializer_destroy(fl_serializer_t *serializer);

/* Primitive serialization */
int fl_serialize_bool(fl_serializer_t *ser, int value);
int fl_serialize_int8(fl_serializer_t *ser, int8_t value);
int fl_serialize_int16(fl_serializer_t *ser, int16_t value);
int fl_serialize_int32(fl_serializer_t *ser, int32_t value);
int fl_serialize_int64(fl_serializer_t *ser, int64_t value);
int fl_serialize_float(fl_serializer_t *ser, float value);
int fl_serialize_double(fl_serializer_t *ser, double value);
int fl_serialize_string(fl_serializer_t *ser, const char *value);
int fl_serialize_bytes(fl_serializer_t *ser, const void *data, size_t size);

/* Deserialization */
int fl_deserialize_bool(fl_serializer_t *ser, int *out_value);
int fl_deserialize_int8(fl_serializer_t *ser, int8_t *out_value);
int fl_deserialize_int16(fl_serializer_t *ser, int16_t *out_value);
int fl_deserialize_int32(fl_serializer_t *ser, int32_t *out_value);
int fl_deserialize_int64(fl_serializer_t *ser, int64_t *out_value);
int fl_deserialize_float(fl_serializer_t *ser, float *out_value);
int fl_deserialize_double(fl_serializer_t *ser, double *out_value);
char* fl_deserialize_string(fl_serializer_t *ser);
int fl_deserialize_bytes(fl_serializer_t *ser, void *out_data, size_t size);

/* Container serialization */
int fl_serialize_array_begin(fl_serializer_t *ser, int count);
int fl_serialize_array_end(fl_serializer_t *ser);
int fl_deserialize_array_size(fl_serializer_t *ser, int *out_count);

/* Versioning & Schema */
void fl_serializer_set_version(fl_serializer_t *ser, uint32_t version);
uint32_t fl_serializer_get_version(fl_serializer_t *ser);

/* Byte order */
uint16_t fl_serialize_htons(uint16_t value);
uint32_t fl_serialize_htonl(uint32_t value);
uint64_t fl_serialize_htonll(uint64_t value);

#endif /* FREELANG_STDLIB_SERIALIZE_H */
