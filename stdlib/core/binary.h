/**
 * FreeLang stdlib/binary - Binary Encoding & Decoding
 * Struct packing, endian handling, bit operations, binary protocols
 */

#ifndef FREELANG_STDLIB_BINARY_H
#define FREELANG_STDLIB_BINARY_H

#include <stdint.h>
#include <stddef.h>

/* ===== Byte Order ===== */

typedef enum {
  FL_ENDIAN_LITTLE = 0,
  FL_ENDIAN_BIG = 1,
  FL_ENDIAN_NATIVE = 2
} fl_endian_t;

/* ===== Bit Operations ===== */

/* Bit manipulation */
uint8_t fl_binary_get_bit(uint8_t value, int bit);
uint8_t fl_binary_set_bit(uint8_t value, int bit, int set);
uint8_t fl_binary_toggle_bit(uint8_t value, int bit);

int fl_binary_popcount(uint64_t value);
int fl_binary_leading_zeros(uint64_t value);
int fl_binary_trailing_zeros(uint64_t value);

/* ===== Byte Swapping ===== */

uint16_t fl_binary_swap16(uint16_t value);
uint32_t fl_binary_swap32(uint32_t value);
uint64_t fl_binary_swap64(uint64_t value);

/* ===== Encoding ===== */

/* Variable-length integer encoding */
int fl_binary_encode_varint(uint64_t value, uint8_t *buffer, size_t max_size);
int fl_binary_decode_varint(const uint8_t *buffer, size_t max_size, uint64_t *out_value);

/* Bit packing */
int fl_binary_pack_bits(const uint8_t *values, int count, int bits_per_value,
                        uint8_t *output, size_t output_size);
int fl_binary_unpack_bits(const uint8_t *data, size_t data_size, int bits_per_value,
                          uint8_t *output, int max_values);

/* Base encoding utilities */
int fl_binary_count_ones(const uint8_t *data, size_t size);
int fl_binary_count_zeros(const uint8_t *data, size_t size);
int fl_binary_hamming_distance(const uint8_t *data1, const uint8_t *data2, size_t size);

/* ===== Struct Packing ===== */

typedef struct {
  uint8_t *buffer;
  size_t pos;
  size_t size;
  fl_endian_t endian;
} fl_binary_packer_t;

fl_binary_packer_t* fl_binary_packer_create(size_t size, fl_endian_t endian);
void fl_binary_packer_destroy(fl_binary_packer_t *packer);

int fl_binary_pack_u8(fl_binary_packer_t *packer, uint8_t value);
int fl_binary_pack_u16(fl_binary_packer_t *packer, uint16_t value);
int fl_binary_pack_u32(fl_binary_packer_t *packer, uint32_t value);
int fl_binary_pack_u64(fl_binary_packer_t *packer, uint64_t value);
int fl_binary_pack_i8(fl_binary_packer_t *packer, int8_t value);
int fl_binary_pack_i16(fl_binary_packer_t *packer, int16_t value);
int fl_binary_pack_i32(fl_binary_packer_t *packer, int32_t value);
int fl_binary_pack_i64(fl_binary_packer_t *packer, int64_t value);
int fl_binary_pack_f32(fl_binary_packer_t *packer, float value);
int fl_binary_pack_f64(fl_binary_packer_t *packer, double value);
int fl_binary_pack_bytes(fl_binary_packer_t *packer, const void *data, size_t size);

/* Unpacking */
int fl_binary_unpack_u8(fl_binary_packer_t *packer, uint8_t *out_value);
int fl_binary_unpack_u16(fl_binary_packer_t *packer, uint16_t *out_value);
int fl_binary_unpack_u32(fl_binary_packer_t *packer, uint32_t *out_value);
int fl_binary_unpack_u64(fl_binary_packer_t *packer, uint64_t *out_value);
int fl_binary_unpack_i8(fl_binary_packer_t *packer, int8_t *out_value);
int fl_binary_unpack_i16(fl_binary_packer_t *packer, int16_t *out_value);
int fl_binary_unpack_i32(fl_binary_packer_t *packer, int32_t *out_value);
int fl_binary_unpack_i64(fl_binary_packer_t *packer, int64_t *out_value);
int fl_binary_unpack_f32(fl_binary_packer_t *packer, float *out_value);
int fl_binary_unpack_f64(fl_binary_packer_t *packer, double *out_value);
int fl_binary_unpack_bytes(fl_binary_packer_t *packer, void *out_data, size_t size);

/* Position management */
void fl_binary_packer_reset(fl_binary_packer_t *packer);
size_t fl_binary_packer_pos(fl_binary_packer_t *packer);
const uint8_t* fl_binary_packer_data(fl_binary_packer_t *packer);

#endif /* FREELANG_STDLIB_BINARY_H */
