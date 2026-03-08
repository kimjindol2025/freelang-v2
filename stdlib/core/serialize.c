/**
 * FreeLang stdlib/serialize Implementation - Serialization Framework
 */

#include "serialize.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <arpa/inet.h>

/* ===== Buffer Operations ===== */

fl_buffer_t* fl_buffer_create(size_t initial_capacity) {
  if (initial_capacity <= 0) initial_capacity = 1024;

  fl_buffer_t *buffer = (fl_buffer_t*)malloc(sizeof(fl_buffer_t));
  if (!buffer) return NULL;

  buffer->data = (uint8_t*)malloc(initial_capacity);
  if (!buffer->data) {
    free(buffer);
    return NULL;
  }

  buffer->capacity = initial_capacity;
  buffer->size = 0;
  buffer->pos = 0;

  fprintf(stderr, "[serialize] Buffer created: capacity=%zu\n", initial_capacity);
  return buffer;
}

void fl_buffer_destroy(fl_buffer_t *buffer) {
  if (!buffer) return;

  free(buffer->data);
  free(buffer);

  fprintf(stderr, "[serialize] Buffer destroyed\n");
}

void fl_buffer_clear(fl_buffer_t *buffer) {
  if (!buffer) return;

  buffer->size = 0;
  buffer->pos = 0;
}

void fl_buffer_reset_pos(fl_buffer_t *buffer) {
  if (!buffer) return;

  buffer->pos = 0;
}

int fl_buffer_write(fl_buffer_t *buffer, const void *data, size_t size) {
  if (!buffer || !data || size == 0) return -1;

  if (buffer->size + size > buffer->capacity) {
    size_t new_capacity = buffer->capacity * 2;
    while (new_capacity < buffer->size + size) {
      new_capacity *= 2;
    }

    uint8_t *new_data = (uint8_t*)realloc(buffer->data, new_capacity);
    if (!new_data) return -1;

    buffer->data = new_data;
    buffer->capacity = new_capacity;
  }

  memcpy(&buffer->data[buffer->size], data, size);
  buffer->size += size;

  return 0;
}

int fl_buffer_read(fl_buffer_t *buffer, void *data, size_t size) {
  if (!buffer || !data || size == 0) return -1;

  if (buffer->pos + size > buffer->size) {
    return -1;  /* Not enough data */
  }

  memcpy(data, &buffer->data[buffer->pos], size);
  buffer->pos += size;

  return 0;
}

const uint8_t* fl_buffer_data(fl_buffer_t *buffer) {
  return buffer ? buffer->data : NULL;
}

size_t fl_buffer_size(fl_buffer_t *buffer) {
  return buffer ? buffer->size : 0;
}

/* ===== Serializer ===== */

fl_serializer_t* fl_serializer_create(fl_serialize_format_t format) {
  fl_serializer_t *ser = (fl_serializer_t*)malloc(sizeof(fl_serializer_t));
  if (!ser) return NULL;

  ser->buffer = *fl_buffer_create(4096);
  ser->format = format;
  ser->version = 1;
  ser->little_endian = 1;  /* Host byte order */

  fprintf(stderr, "[serialize] Serializer created: format=%d\n", format);
  return ser;
}

void fl_serializer_destroy(fl_serializer_t *ser) {
  if (!ser) return;

  fl_buffer_destroy(&ser->buffer);
  free(ser);

  fprintf(stderr, "[serialize] Serializer destroyed\n");
}

/* ===== Byte Order ===== */

uint16_t fl_serialize_htons(uint16_t value) {
  return htons(value);
}

uint32_t fl_serialize_htonl(uint32_t value) {
  return htonl(value);
}

uint64_t fl_serialize_htonll(uint64_t value) {
  return ((uint64_t)htonl(value & 0xffffffff) << 32) | htonl(value >> 32);
}

/* ===== Primitive Serialization ===== */

int fl_serialize_bool(fl_serializer_t *ser, int value) {
  uint8_t byte = value ? 1 : 0;
  return fl_buffer_write(&ser->buffer, &byte, 1);
}

int fl_serialize_int8(fl_serializer_t *ser, int8_t value) {
  return fl_buffer_write(&ser->buffer, &value, 1);
}

int fl_serialize_int16(fl_serializer_t *ser, int16_t value) {
  uint16_t net_value = htons(value);
  return fl_buffer_write(&ser->buffer, &net_value, 2);
}

int fl_serialize_int32(fl_serializer_t *ser, int32_t value) {
  uint32_t net_value = htonl(value);
  return fl_buffer_write(&ser->buffer, &net_value, 4);
}

int fl_serialize_int64(fl_serializer_t *ser, int64_t value) {
  uint64_t net_value = fl_serialize_htonll(value);
  return fl_buffer_write(&ser->buffer, &net_value, 8);
}

int fl_serialize_float(fl_serializer_t *ser, float value) {
  uint32_t bits;
  memcpy(&bits, &value, 4);
  uint32_t net_bits = htonl(bits);
  return fl_buffer_write(&ser->buffer, &net_bits, 4);
}

int fl_serialize_double(fl_serializer_t *ser, double value) {
  uint64_t bits;
  memcpy(&bits, &value, 8);
  uint64_t net_bits = fl_serialize_htonll(bits);
  return fl_buffer_write(&ser->buffer, &net_bits, 8);
}

int fl_serialize_string(fl_serializer_t *ser, const char *value) {
  if (!value) {
    uint32_t len = 0xffffffff;  /* NULL marker */
    return fl_serialize_int32(ser, len);
  }

  uint32_t len = strlen(value);
  if (fl_serialize_int32(ser, len) < 0) return -1;

  return fl_buffer_write(&ser->buffer, value, len);
}

int fl_serialize_bytes(fl_serializer_t *ser, const void *data, size_t size) {
  if (fl_serialize_int32(ser, (int32_t)size) < 0) return -1;
  return fl_buffer_write(&ser->buffer, data, size);
}

/* ===== Deserialization ===== */

int fl_deserialize_bool(fl_serializer_t *ser, int *out_value) {
  uint8_t byte;
  if (fl_buffer_read(&ser->buffer, &byte, 1) < 0) return -1;
  *out_value = byte ? 1 : 0;
  return 0;
}

int fl_deserialize_int8(fl_serializer_t *ser, int8_t *out_value) {
  return fl_buffer_read(&ser->buffer, out_value, 1);
}

int fl_deserialize_int16(fl_serializer_t *ser, int16_t *out_value) {
  uint16_t net_value;
  if (fl_buffer_read(&ser->buffer, &net_value, 2) < 0) return -1;
  *out_value = ntohs(net_value);
  return 0;
}

int fl_deserialize_int32(fl_serializer_t *ser, int32_t *out_value) {
  uint32_t net_value;
  if (fl_buffer_read(&ser->buffer, &net_value, 4) < 0) return -1;
  *out_value = ntohl(net_value);
  return 0;
}

int fl_deserialize_int64(fl_serializer_t *ser, int64_t *out_value) {
  uint64_t net_value;
  if (fl_buffer_read(&ser->buffer, &net_value, 8) < 0) return -1;
  *out_value = (int64_t)(((uint64_t)ntohl(net_value & 0xffffffff) << 32) | ntohl(net_value >> 32));
  return 0;
}

int fl_deserialize_float(fl_serializer_t *ser, float *out_value) {
  uint32_t net_bits;
  if (fl_buffer_read(&ser->buffer, &net_bits, 4) < 0) return -1;
  uint32_t bits = ntohl(net_bits);
  memcpy(out_value, &bits, 4);
  return 0;
}

int fl_deserialize_double(fl_serializer_t *ser, double *out_value) {
  uint64_t net_bits;
  if (fl_buffer_read(&ser->buffer, &net_bits, 8) < 0) return -1;
  uint64_t bits = (uint64_t)(((uint64_t)ntohl(net_bits & 0xffffffff) << 32) | ntohl(net_bits >> 32));
  memcpy(out_value, &bits, 8);
  return 0;
}

char* fl_deserialize_string(fl_serializer_t *ser) {
  int32_t len;
  if (fl_deserialize_int32(ser, &len) < 0) return NULL;

  if (len == -1) {  /* NULL marker */
    return NULL;
  }

  if (len < 0 || len > 1000000) {
    return NULL;  /* Invalid length */
  }

  char *str = (char*)malloc(len + 1);
  if (!str) return NULL;

  if (fl_buffer_read(&ser->buffer, str, len) < 0) {
    free(str);
    return NULL;
  }

  str[len] = '\0';
  return str;
}

int fl_deserialize_bytes(fl_serializer_t *ser, void *out_data, size_t size) {
  int32_t len;
  if (fl_deserialize_int32(ser, &len) < 0) return -1;

  if ((size_t)len != size) {
    return -1;  /* Size mismatch */
  }

  return fl_buffer_read(&ser->buffer, out_data, size);
}

/* ===== Container ===== */

int fl_serialize_array_begin(fl_serializer_t *ser, int count) {
  return fl_serialize_int32(ser, count);
}

int fl_serialize_array_end(fl_serializer_t *ser) {
  return 0;  /* No special marker */
}

int fl_deserialize_array_size(fl_serializer_t *ser, int *out_count) {
  int32_t count;
  if (fl_deserialize_int32(ser, &count) < 0) return -1;
  *out_count = count;
  return 0;
}

/* ===== Versioning ===== */

void fl_serializer_set_version(fl_serializer_t *ser, uint32_t version) {
  if (ser) ser->version = version;
}

uint32_t fl_serializer_get_version(fl_serializer_t *ser) {
  return ser ? ser->version : 0;
}
