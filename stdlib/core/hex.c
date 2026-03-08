/**
 * FreeLang stdlib/hex Implementation - Hexadecimal Encoding & Decoding
 */

#include "hex.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <ctype.h>

/* ===== Hex Alphabets ===== */

static const char HEX_LOWERCASE[] = "0123456789abcdef";
static const char HEX_UPPERCASE[] = "0123456789ABCDEF";

/* ===== Hex Digit Value ===== */

static int hex_digit_value(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  return -1;
}

/* ===== Size Calculation ===== */

size_t fl_hex_encode_size(size_t data_size) {
  return data_size * 2;
}

size_t fl_hex_decode_size(const char *encoded) {
  if (!encoded) return 0;
  size_t len = strlen(encoded);
  return (len + 1) / 2;
}

/* ===== Validation ===== */

int fl_hex_validate_char(char c) {
  return (c >= '0' && c <= '9') ||
         (c >= 'a' && c <= 'f') ||
         (c >= 'A' && c <= 'F');
}

int fl_hex_is_valid(const char *encoded) {
  if (!encoded) return 0;

  size_t len = strlen(encoded);
  if (len == 0) return 1;  /* Empty is valid */

  /* Must be even length for valid hex pairs */
  if (len % 2 != 0) return 0;

  /* Validate each character */
  for (size_t i = 0; i < len; i++) {
    if (!fl_hex_validate_char(encoded[i])) {
      return 0;
    }
  }

  return 1;
}

/* ===== Encoding ===== */

char* fl_hex_encode(const uint8_t *data, size_t size) {
  return fl_hex_encode_ex(data, size, FL_HEX_LOWERCASE);
}

char* fl_hex_encode_ex(const uint8_t *data, size_t size,
                       fl_hex_variant_t variant) {
  if (!data && size > 0) return NULL;

  size_t output_size = fl_hex_encode_size(size);
  char *output = (char*)malloc(output_size + 1);
  if (!output) return NULL;

  if (fl_hex_encode_buffer(data, size, output, output_size) >= 0) {
    output[output_size] = '\0';
    return output;
  }

  free(output);
  return NULL;
}

int fl_hex_encode_buffer(const uint8_t *data, size_t size, char *output,
                         size_t output_size) {
  if (!output) return -1;

  const char *alphabet = (output_size > 0) ? HEX_LOWERCASE : HEX_LOWERCASE;
  size_t required = fl_hex_encode_size(size);

  if (output_size < required) {
    fprintf(stderr, "[hex] Output buffer too small: need %zu, have %zu\n",
            required, output_size);
    return -1;
  }

  size_t out_idx = 0;

  for (size_t i = 0; i < size; i++) {
    uint8_t byte = data[i];
    output[out_idx++] = alphabet[(byte >> 4) & 0x0F];
    output[out_idx++] = alphabet[byte & 0x0F];
  }

  fprintf(stderr, "[hex] Encoded: %zu → %zu bytes\n", size, out_idx);
  return (int)out_idx;
}

/* ===== Decoding ===== */

uint8_t* fl_hex_decode(const char *encoded, size_t *out_size) {
  if (!encoded || !out_size) return NULL;

  size_t decoded_size = fl_hex_decode_size(encoded);
  uint8_t *output = (uint8_t*)malloc(decoded_size + 1);
  if (!output) return NULL;

  if (fl_hex_decode_buffer(encoded, output, decoded_size, out_size) >= 0) {
    return output;
  }

  free(output);
  return NULL;
}

int fl_hex_decode_buffer(const char *encoded, uint8_t *output,
                         size_t output_size, size_t *out_size) {
  if (!encoded || !output || !out_size) return -1;

  size_t len = strlen(encoded);
  if (len == 0) {
    *out_size = 0;
    return 0;
  }

  /* Must be even length */
  if (len % 2 != 0) {
    fprintf(stderr, "[hex] Invalid length: %zu (odd number)\n", len);
    return -1;
  }

  size_t required = fl_hex_decode_size(encoded);
  if (output_size < required) {
    fprintf(stderr, "[hex] Output buffer too small: need %zu, have %zu\n",
            required, output_size);
    return -1;
  }

  size_t out_idx = 0;

  for (size_t i = 0; i < len; i += 2) {
    int high = hex_digit_value(encoded[i]);
    int low = hex_digit_value(encoded[i + 1]);

    if (high < 0 || low < 0) {
      fprintf(stderr, "[hex] Invalid hex character at position %zu\n", i);
      return -1;
    }

    output[out_idx++] = (high << 4) | low;
  }

  *out_size = out_idx;
  fprintf(stderr, "[hex] Decoded: %zu → %zu bytes\n", len, out_idx);
  return 0;
}
