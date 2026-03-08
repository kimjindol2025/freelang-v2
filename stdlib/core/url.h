/**
 * FreeLang stdlib/url - URL Encoding, Decoding & Parsing
 * Percent encoding (RFC 3986), query string parsing, URI component handling
 */

#ifndef FREELANG_STDLIB_URL_H
#define FREELANG_STDLIB_URL_H

#include <stdint.h>
#include <stddef.h>

/* ===== URL Components ===== */

typedef struct {
  char *scheme;           /* http, https, ftp, etc. */
  char *userinfo;         /* username:password */
  char *host;             /* domain or IP */
  int port;               /* port number, -1 if not specified */
  char *path;             /* /path/to/resource */
  char *query;            /* key=value&key2=value2 */
  char *fragment;         /* anchor */
} fl_uri_t;

/* ===== Query String Parsing ===== */

typedef struct {
  char *key;
  char *value;
} fl_query_param_t;

typedef struct {
  fl_query_param_t *params;
  int param_count;
  int max_params;
} fl_query_string_t;

/* ===== Public API ===== */

/* URI parsing */
fl_uri_t* fl_uri_parse(const char *uri);
void fl_uri_destroy(fl_uri_t *uri);
int fl_uri_is_absolute(const char *uri);
int fl_uri_is_valid(const char *uri);

/* URL encoding/decoding */
char* fl_url_encode(const char *str);
char* fl_url_encode_strict(const char *str);  /* RFC 3986 strict */
char* fl_url_decode(const char *encoded);
int fl_url_encode_buffer(const char *str, char *output, size_t output_size);
int fl_url_decode_buffer(const char *encoded, char *output, size_t output_size);

/* Percent encoding (internal use) */
char* fl_percent_encode(const uint8_t *data, size_t size);
uint8_t* fl_percent_decode(const char *encoded, size_t *out_size);

/* Query string parsing */
fl_query_string_t* fl_query_string_parse(const char *query);
void fl_query_string_destroy(fl_query_string_t *qs);
const char* fl_query_string_get(fl_query_string_t *qs, const char *key);
int fl_query_string_set(fl_query_string_t *qs, const char *key, const char *value);
char* fl_query_string_encode(fl_query_string_t *qs);

/* URL normalization */
char* fl_url_normalize(const char *url);
int fl_url_normalize_buffer(const char *url, char *output, size_t output_size);

/* Size calculation */
size_t fl_url_encode_size(const char *str);
size_t fl_url_decode_size(const char *encoded);

/* Validation */
int fl_url_validate_char(char c);
int fl_url_is_encoded(const char *str);

#endif /* FREELANG_STDLIB_URL_H */
[URL Module Phase 27-4]
