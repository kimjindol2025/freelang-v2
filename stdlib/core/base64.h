/**
 * FreeLang stdlib/base64 - Base64 Encoding & Decoding
 * RFC 4648 compliant, padding support, URL-safe variant
 */

#ifndef FREELANG_STDLIB_BASE64_H
#define FREELANG_STDLIB_BASE64_H

#include <stdint.h>
#include <stddef.h>

/* ===== Base64 Variants ===== */

typedef enum {
  FL_BASE64_STANDARD = 0,     /* Standard alphabet: A-Z, a-z, 0-9, +, / */
  FL_BASE64_URL_SAFE = 1      /* URL-safe alphabet: A-Z, a-z, 0-9, -, _ */
} fl_base64_variant_t;

/* ===== Public API ===== */

/* Encoding */
char* fl_base64_encode(const uint8_t *data, size_t size);
char* fl_base64_encode_ex(const uint8_t *data, size_t size, fl_base64_variant_t variant);
int fl_base64_encode_buffer(const uint8_t *data, size_t size, char *output, size_t output_size);

/* Decoding */
uint8_t* fl_base64_decode(const char *encoded, size_t *out_size);
uint8_t* fl_base64_decode_ex(const char *encoded, fl_base64_variant_t variant, size_t *out_size);
int fl_base64_decode_buffer(const char *encoded, uint8_t *output, size_t output_size, size_t *out_size);

/* Size calculation */
size_t fl_base64_encode_size(size_t data_size);
size_t fl_base64_decode_size(const char *encoded);

/* Validation */
int fl_base64_is_valid(const char *encoded);
int fl_base64_validate_char(char c, fl_base64_variant_t variant);

#endif /* FREELANG_STDLIB_BASE64_H */
