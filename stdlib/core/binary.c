/**
 * FreeLang stdlib/binary Implementation - Binary Encoding
 */

#include "binary.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

/* ===== Bit Operations ===== */

uint8_t fl_binary_get_bit(uint8_t value, int bit) {
  return (value >> bit) & 1;
}

uint8_t fl_binary_set_bit(uint8_t value, int bit, int set) {
  if (set) {
    return value | (1 << bit);
  } else {
    return value & ~(1 << bit);
  }
}

uint8_t fl_binary_toggle_bit(uint8_t value, int bit) {
  return value ^ (1 << bit);
}

int fl_binary_popcount(uint64_t value) {
  return __builtin_popcountll(value);
}

int fl_binary_leading_zeros(uint64_t value) {
  return value == 0 ? 64 : __builtin_clzll(value);
}

int fl_binary_trailing_zeros(uint64_t value) {
  return value == 0 ? 64 : __builtin_ctzll(value);
}

/* ===== Byte Swapping ===== */

uint16_t fl_binary_swap16(uint16_t value) {
  return __builtin_bswap16(value);
}

uint32_t fl_binary_swap32(uint32_t value) {
  return __builtin_bswap32(value);
}

uint64_t fl_binary_swap64(uint64_t value) {
  return __builtin_bswap64(value);
}

/* ===== Variable-Length Encoding ===== */

int fl_binary_encode_varint(uint64_t value, uint8_t *buffer, size_t max_size) {
  if (!buffer || max_size == 0) return -1;

  int len = 0;

  while (value >= 128 && len < (int)max_size - 1) {
    buffer[len++] = (uint8_t)((value & 0x7f) | 0x80);
    value >>= 7;
  }

  if (len >= (int)max_size) return -1;

  buffer[len++] = (uint8_t)(value & 0x7f);

  return len;
}

int fl_binary_decode_varint(const uint8_t *buffer, size_t max_size, uint64_t *out_value) {
  if (!buffer || !out_value) return -1;

  uint64_t value = 0;
  int shift = 0;
  int len = 0;

  for (size_t i = 0; i < max_size; i++) {
    uint8_t byte = buffer[i];
    value |= (uint64_t)(byte & 0x7f) << shift;
    len++;

    if ((byte & 0x80) == 0) {
      *out_value = value;
      return len;
    }

    shift += 7;
    if (shift >= 64) return -1;  /* Overflow */
  }

  return -1;  /* Incomplete */
}

/* ===== Bit Packing ===== */

int fl_binary_pack_bits(const uint8_t *values, int count, int bits_per_value,
                        uint8_t *output, size_t output_size) {
  if (!values || !output || bits_per_value <= 0 || bits_per_value > 8) return -1;

  int output_bits = count * bits_per_value;
  if (output_bits > (int)output_size * 8) return -1;

  memset(output, 0, output_size);

  int bit_pos = 0;
  for (int i = 0; i < count; i++) {
    uint8_t value = values[i] & ((1 << bits_per_value) - 1);

    int byte_index = bit_pos / 8;
    int bit_offset = bit_pos % 8;

    output[byte_index] |= (value << bit_offset);

    if (bit_offset + bits_per_value > 8 && byte_index + 1 < (int)output_size) {
      output[byte_index + 1] |= (value >> (8 - bit_offset));
    }

    bit_pos += bits_per_value;
  }

  return (output_bits + 7) / 8;
}

int fl_binary_unpack_bits(const uint8_t *data, size_t data_size, int bits_per_value,
                          uint8_t *output, int max_values) {
  if (!data || !output || bits_per_value <= 0 || bits_per_value > 8) return -1;

  int mask = (1 << bits_per_value) - 1;
  int bit_pos = 0;
  int count = 0;

  while (count < max_values) {
    int byte_index = bit_pos / 8;
    int bit_offset = bit_pos % 8;

    if (byte_index >= (int)data_size) break;

    uint8_t value = (data[byte_index] >> bit_offset) & mask;

    if (bit_offset + bits_per_value > 8 && byte_index + 1 < (int)data_size) {
      value |= (data[byte_index + 1] << (8 - bit_offset)) & mask;
    }

    output[count++] = value;
    bit_pos += bits_per_value;
  }

  return count;
}

/* ===== Binary Analysis ===== */

int fl_binary_count_ones(const uint8_t *data, size_t size) {
  int count = 0;
  for (size_t i = 0; i < size; i++) {
    count += __builtin_popcount(data[i]);
  }
  return count;
}

int fl_binary_count_zeros(const uint8_t *data, size_t size) {
  return (int)size * 8 - fl_binary_count_ones(data, size);
}

int fl_binary_hamming_distance(const uint8_t *data1, const uint8_t *data2, size_t size) {
  int distance = 0;
  for (size_t i = 0; i < size; i++) {
    distance += __builtin_popcount(data1[i] ^ data2[i]);
  }
  return distance;
}

/* ===== Struct Packer ===== */

fl_binary_packer_t* fl_binary_packer_create(size_t size, fl_endian_t endian) {
  fl_binary_packer_t *packer = (fl_binary_packer_t*)malloc(sizeof(fl_binary_packer_t));
  if (!packer) return NULL;

  packer->buffer = (uint8_t*)malloc(size);
  if (!packer->buffer) {
    free(packer);
    return NULL;
  }

  memset(packer->buffer, 0, size);
  packer->pos = 0;
  packer->size = size;
  packer->endian = endian;

  fprintf(stderr, "[binary] Packer created: size=%zu, endian=%d\n", size, endian);
  return packer;
}

void fl_binary_packer_destroy(fl_binary_packer_t *packer) {
  if (!packer) return;

  free(packer->buffer);
  free(packer);

  fprintf(stderr, "[binary] Packer destroyed\n");
}

/* ===== Packing Primitives ===== */

int fl_binary_pack_u8(fl_binary_packer_t *packer, uint8_t value) {
  if (packer->pos + 1 > packer->size) return -1;
  packer->buffer[packer->pos++] = value;
  return 0;
}

int fl_binary_pack_u16(fl_binary_packer_t *packer, uint16_t value) {
  if (packer->pos + 2 > packer->size) return -1;

  if (packer->endian == FL_ENDIAN_BIG) {
    value = fl_binary_swap16(value);
  }

  memcpy(&packer->buffer[packer->pos], &value, 2);
  packer->pos += 2;
  return 0;
}

int fl_binary_pack_u32(fl_binary_packer_t *packer, uint32_t value) {
  if (packer->pos + 4 > packer->size) return -1;

  if (packer->endian == FL_ENDIAN_BIG) {
    value = fl_binary_swap32(value);
  }

  memcpy(&packer->buffer[packer->pos], &value, 4);
  packer->pos += 4;
  return 0;
}

int fl_binary_pack_u64(fl_binary_packer_t *packer, uint64_t value) {
  if (packer->pos + 8 > packer->size) return -1;

  if (packer->endian == FL_ENDIAN_BIG) {
    value = fl_binary_swap64(value);
  }

  memcpy(&packer->buffer[packer->pos], &value, 8);
  packer->pos += 8;
  return 0;
}

int fl_binary_pack_i8(fl_binary_packer_t *packer, int8_t value) {
  return fl_binary_pack_u8(packer, (uint8_t)value);
}

int fl_binary_pack_i16(fl_binary_packer_t *packer, int16_t value) {
  return fl_binary_pack_u16(packer, (uint16_t)value);
}

int fl_binary_pack_i32(fl_binary_packer_t *packer, int32_t value) {
  return fl_binary_pack_u32(packer, (uint32_t)value);
}

int fl_binary_pack_i64(fl_binary_packer_t *packer, int64_t value) {
  return fl_binary_pack_u64(packer, (uint64_t)value);
}

int fl_binary_pack_f32(fl_binary_packer_t *packer, float value) {
  uint32_t bits;
  memcpy(&bits, &value, 4);
  return fl_binary_pack_u32(packer, bits);
}

int fl_binary_pack_f64(fl_binary_packer_t *packer, double value) {
  uint64_t bits;
  memcpy(&bits, &value, 8);
  return fl_binary_pack_u64(packer, bits);
}

int fl_binary_pack_bytes(fl_binary_packer_t *packer, const void *data, size_t size) {
  if (packer->pos + size > packer->size) return -1;

  memcpy(&packer->buffer[packer->pos], data, size);
  packer->pos += size;
  return 0;
}

/* ===== Unpacking ===== */

int fl_binary_unpack_u8(fl_binary_packer_t *packer, uint8_t *out_value) {
  if (packer->pos + 1 > packer->size) return -1;
  *out_value = packer->buffer[packer->pos++];
  return 0;
}

int fl_binary_unpack_u16(fl_binary_packer_t *packer, uint16_t *out_value) {
  if (packer->pos + 2 > packer->size) return -1;

  memcpy(out_value, &packer->buffer[packer->pos], 2);
  packer->pos += 2;

  if (packer->endian == FL_ENDIAN_BIG) {
    *out_value = fl_binary_swap16(*out_value);
  }

  return 0;
}

int fl_binary_unpack_u32(fl_binary_packer_t *packer, uint32_t *out_value) {
  if (packer->pos + 4 > packer->size) return -1;

  memcpy(out_value, &packer->buffer[packer->pos], 4);
  packer->pos += 4;

  if (packer->endian == FL_ENDIAN_BIG) {
    *out_value = fl_binary_swap32(*out_value);
  }

  return 0;
}

int fl_binary_unpack_u64(fl_binary_packer_t *packer, uint64_t *out_value) {
  if (packer->pos + 8 > packer->size) return -1;

  memcpy(out_value, &packer->buffer[packer->pos], 8);
  packer->pos += 8;

  if (packer->endian == FL_ENDIAN_BIG) {
    *out_value = fl_binary_swap64(*out_value);
  }

  return 0;
}

int fl_binary_unpack_i8(fl_binary_packer_t *packer, int8_t *out_value) {
  uint8_t val;
  if (fl_binary_unpack_u8(packer, &val) < 0) return -1;
  *out_value = (int8_t)val;
  return 0;
}

int fl_binary_unpack_i16(fl_binary_packer_t *packer, int16_t *out_value) {
  uint16_t val;
  if (fl_binary_unpack_u16(packer, &val) < 0) return -1;
  *out_value = (int16_t)val;
  return 0;
}

int fl_binary_unpack_i32(fl_binary_packer_t *packer, int32_t *out_value) {
  uint32_t val;
  if (fl_binary_unpack_u32(packer, &val) < 0) return -1;
  *out_value = (int32_t)val;
  return 0;
}

int fl_binary_unpack_i64(fl_binary_packer_t *packer, int64_t *out_value) {
  uint64_t val;
  if (fl_binary_unpack_u64(packer, &val) < 0) return -1;
  *out_value = (int64_t)val;
  return 0;
}

int fl_binary_unpack_f32(fl_binary_packer_t *packer, float *out_value) {
  uint32_t bits;
  if (fl_binary_unpack_u32(packer, &bits) < 0) return -1;
  memcpy(out_value, &bits, 4);
  return 0;
}

int fl_binary_unpack_f64(fl_binary_packer_t *packer, double *out_value) {
  uint64_t bits;
  if (fl_binary_unpack_u64(packer, &bits) < 0) return -1;
  memcpy(out_value, &bits, 8);
  return 0;
}

int fl_binary_unpack_bytes(fl_binary_packer_t *packer, void *out_data, size_t size) {
  if (packer->pos + size > packer->size) return -1;

  memcpy(out_data, &packer->buffer[packer->pos], size);
  packer->pos += size;
  return 0;
}

/* ===== Position Management ===== */

void fl_binary_packer_reset(fl_binary_packer_t *packer) {
  if (packer) packer->pos = 0;
}

size_t fl_binary_packer_pos(fl_binary_packer_t *packer) {
  return packer ? packer->pos : 0;
}

const uint8_t* fl_binary_packer_data(fl_binary_packer_t *packer) {
  return packer ? packer->buffer : NULL;
}
