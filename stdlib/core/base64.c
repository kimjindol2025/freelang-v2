/**
 * FreeLang stdlib/base64 Implementation - Base64 Encoding & Decoding
 * RFC 4648 compliant, padding support, URL-safe variant
 */

#include "base64.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

/* ===== Base64 Alphabets ===== */

static const char BASE64_STANDARD[] =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

static const char BASE64_URL_SAFE[] =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/* ===== Inverse Lookup Tables ===== */

static int base64_decode_char(char c, fl_base64_variant_t variant) {
  if (c >= 'A' && c <= 'Z') return c - 'A';
  if (c >= 'a' && c <= 'z') return c - 'a' + 26;
  if (c >= '0' && c <= '9') return c - '0' + 52;

  if (variant == FL_BASE64_STANDARD) {
    if (c == '+') return 62;
    if (c == '/') return 63;
  } else {  /* URL_SAFE */
    if (c == '-') return 62;
    if (c == '_') return 63;
  }

  return -1;  /* Invalid */
}

/* ===== Size Calculation ===== */

size_t fl_base64_encode_size(size_t data_size) {
  return ((data_size + 2) / 3) * 4;
}

size_t fl_base64_decode_size(const char *encoded) {
  if (!encoded) return 0;

  size_t len = strlen(encoded);
  if (len == 0) return 0;

  /* Remove padding */
  size_t padding = 0;
  if (len >= 1 && encoded[len - 1] == '=') padding++;
  if (len >= 2 && encoded[len - 2] == '=') padding++;

  return (len / 4) * 3 - padding;
}

/* ===== Validation ===== */

int fl_base64_validate_char(char c, fl_base64_variant_t variant) {
  if (c == '=') return 1;  /* Padding is always valid */

  if (c >= 'A' && c <= 'Z') return 1;
  if (c >= 'a' && c <= 'z') return 1;
  if (c >= '0' && c <= '9') return 1;

  if (variant == FL_BASE64_STANDARD) {
    return (c == '+' || c == '/') ? 1 : 0;
  } else {  /* URL_SAFE */
    return (c == '-' || c == '_') ? 1 : 0;
  }
}

int fl_base64_is_valid(const char *encoded) {
  if (!encoded) return 0;

  size_t len = strlen(encoded);
  if (len == 0) return 1;  /* Empty string is valid */

  /* Check length is multiple of 4 */
  if (len % 4 != 0) return 0;

  /* Detect variant from characters (try standard first) */
  fl_base64_variant_t variant = FL_BASE64_STANDARD;
  int has_url_chars = 0;

  for (size_t i = 0; i < len; i++) {
    char c = encoded[i];

    if (c == '+' || c == '/') {
      if (has_url_chars) return 0;  /* Mixed variants */
      variant = FL_BASE64_STANDARD;
      continue;
    }

    if (c == '-' || c == '_') {
      variant = FL_BASE64_URL_SAFE;
      has_url_chars = 1;
      continue;
    }

    if (!fl_base64_validate_char(c, variant)) {
      return 0;
    }
  }

  /* Check padding is at end */
  if (len >= 1 && encoded[len - 1] == '=') {
    if (len >= 2 && encoded[len - 2] == '=') {
      /* Both last chars are padding */
    } else {
      /* Only last char is padding */
    }
    /* Check that padding is only at end */
    if (len >= 3 && encoded[len - 3] == '=') {
      return 0;  /* 3 padding chars is invalid */
    }
  }

  return 1;
}

/* ===== Encoding ===== */

char* fl_base64_encode(const uint8_t *data, size_t size) {
  return fl_base64_encode_ex(data, size, FL_BASE64_STANDARD);
}

char* fl_base64_encode_ex(const uint8_t *data, size_t size,
                          fl_base64_variant_t variant) {
  if (!data && size > 0) return NULL;

  size_t output_size = fl_base64_encode_size(size);
  char *output = (char*)malloc(output_size + 1);
  if (!output) return NULL;

  if (fl_base64_encode_buffer(data, size, output, output_size) >= 0) {
    output[output_size] = '\0';
    return output;
  }

  free(output);
  return NULL;
}

int fl_base64_encode_buffer(const uint8_t *data, size_t size, char *output,
                            size_t output_size) {
  if (!output) return -1;

  /* Variant is standard (default) */
  const char *alphabet = BASE64_STANDARD;

  size_t required = fl_base64_encode_size(size);
  if (output_size < required) {
    fprintf(stderr, "[base64] Output buffer too small: need %zu, have %zu\n",
            required, output_size);
    return -1;
  }

  size_t out_idx = 0;

  for (size_t i = 0; i < size; i += 3) {
    /* Read up to 3 bytes */
    uint32_t b1 = (i < size) ? data[i] : 0;
    uint32_t b2 = (i + 1 < size) ? data[i + 1] : 0;
    uint32_t b3 = (i + 2 < size) ? data[i + 2] : 0;

    /* Combine into 24-bit value */
    uint32_t triple = (b1 << 16) | (b2 << 8) | b3;

    /* Extract 4 6-bit values */
    uint32_t c1 = (triple >> 18) & 0x3F;
    uint32_t c2 = (triple >> 12) & 0x3F;
    uint32_t c3 = (triple >> 6) & 0x3F;
    uint32_t c4 = triple & 0x3F;

    /* Write encoded characters */
    output[out_idx++] = alphabet[c1];
    output[out_idx++] = alphabet[c2];

    if (i + 1 < size) {
      output[out_idx++] = alphabet[c3];
    } else {
      output[out_idx++] = '=';
    }

    if (i + 2 < size) {
      output[out_idx++] = alphabet[c4];
    } else {
      output[out_idx++] = '=';
    }
  }

  fprintf(stderr, "[base64] Encoded: %zu → %zu bytes\n", size, out_idx);
  return (int)out_idx;
}

/* ===== Decoding ===== */

uint8_t* fl_base64_decode(const char *encoded, size_t *out_size) {
  return fl_base64_decode_ex(encoded, FL_BASE64_STANDARD, out_size);
}

uint8_t* fl_base64_decode_ex(const char *encoded, fl_base64_variant_t variant,
                             size_t *out_size) {
  if (!encoded || !out_size) return NULL;

  size_t decoded_size = fl_base64_decode_size(encoded);
  uint8_t *output = (uint8_t*)malloc(decoded_size + 1);
  if (!output) return NULL;

  if (fl_base64_decode_buffer(encoded, output, decoded_size, out_size) >= 0) {
    return output;
  }

  free(output);
  return NULL;
}

int fl_base64_decode_buffer(const char *encoded, uint8_t *output,
                            size_t output_size, size_t *out_size) {
  if (!encoded || !output || !out_size) return -1;

  size_t len = strlen(encoded);
  if (len == 0) {
    *out_size = 0;
    return 0;
  }

  /* Detect variant */
  fl_base64_variant_t variant = FL_BASE64_STANDARD;
  for (size_t i = 0; i < len; i++) {
    if (encoded[i] == '-' || encoded[i] == '_') {
      variant = FL_BASE64_URL_SAFE;
      break;
    }
  }

  if (len % 4 != 0) {
    fprintf(stderr, "[base64] Invalid length: %zu (not multiple of 4)\n", len);
    return -1;
  }

  size_t out_idx = 0;

  for (size_t i = 0; i < len; i += 4) {
    if (i + 3 >= len) break;

    /* Decode 4 characters */
    int c1 = base64_decode_char(encoded[i], variant);
    int c2 = base64_decode_char(encoded[i + 1], variant);
    int c3 = (encoded[i + 2] == '=') ? 0 : base64_decode_char(encoded[i + 2], variant);
    int c4 = (encoded[i + 3] == '=') ? 0 : base64_decode_char(encoded[i + 3], variant);

    if (c1 < 0 || c2 < 0) {
      fprintf(stderr, "[base64] Invalid character at position %zu\n", i);
      return -1;
    }

    if (encoded[i + 2] != '=' && c3 < 0) {
      fprintf(stderr, "[base64] Invalid character at position %zu\n", i + 2);
      return -1;
    }

    if (encoded[i + 3] != '=' && c4 < 0) {
      fprintf(stderr, "[base64] Invalid character at position %zu\n", i + 3);
      return -1;
    }

    /* Combine into 24-bit value */
    uint32_t triple = ((uint32_t)c1 << 18) | ((uint32_t)c2 << 12) |
                      ((uint32_t)c3 << 6) | (uint32_t)c4;

    /* Extract 3 bytes */
    if (out_idx < output_size) {
      output[out_idx++] = (triple >> 16) & 0xFF;
    }

    if (encoded[i + 2] != '=' && out_idx < output_size) {
      output[out_idx++] = (triple >> 8) & 0xFF;
    }

    if (encoded[i + 3] != '=' && out_idx < output_size) {
      output[out_idx++] = triple & 0xFF;
    }
  }

  if (out_idx > output_size) {
    fprintf(stderr, "[base64] Output buffer too small\n");
    return -1;
  }

  *out_size = out_idx;
  fprintf(stderr, "[base64] Decoded: %zu → %zu bytes\n", len, out_idx);
  return 0;
}
