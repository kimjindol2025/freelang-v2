/**
 * FreeLang stdlib/hex - Hexadecimal Encoding & Decoding
 * Standard hex (0-9a-f), uppercase variant, binary data handling
 */

#ifndef FREELANG_STDLIB_HEX_H
#define FREELANG_STDLIB_HEX_H

#include <stdint.h>
#include <stddef.h>

/* ===== Hex Variants ===== */

typedef enum {
  FL_HEX_LOWERCASE = 0,     /* Standard: 0-9a-f */
  FL_HEX_UPPERCASE = 1      /* Uppercase: 0-9A-F */
} fl_hex_variant_t;

/* ===== Public API ===== */

/* Encoding */
char* fl_hex_encode(const uint8_t *data, size_t size);
char* fl_hex_encode_ex(const uint8_t *data, size_t size, fl_hex_variant_t variant);
int fl_hex_encode_buffer(const uint8_t *data, size_t size, char *output, size_t output_size);

/* Decoding */
uint8_t* fl_hex_decode(const char *encoded, size_t *out_size);
int fl_hex_decode_buffer(const char *encoded, uint8_t *output, size_t output_size, size_t *out_size);

/* Size calculation */
size_t fl_hex_encode_size(size_t data_size);
size_t fl_hex_decode_size(const char *encoded);

/* Validation */
int fl_hex_is_valid(const char *encoded);
int fl_hex_validate_char(char c);

#endif /* FREELANG_STDLIB_HEX_H */
