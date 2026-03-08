/**
 * FreeLang stdlib/url Implementation - URL Encoding, Decoding & Parsing
 * RFC 3986 compliant, percent encoding, URI component handling
 */

#include "url.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <ctype.h>

/* ===== URI Parsing ===== */

fl_uri_t* fl_uri_parse(const char *uri) {
  if (!uri) return NULL;

  fl_uri_t *parsed = (fl_uri_t*)malloc(sizeof(fl_uri_t));
  if (!parsed) return NULL;

  memset(parsed, 0, sizeof(fl_uri_t));

  const char *ptr = uri;
  const char *start;

  /* Parse scheme (http, https, ftp, etc.) */
  const char *scheme_end = strchr(ptr, ':');
  if (scheme_end) {
    size_t scheme_len = scheme_end - ptr;
    if (scheme_len > 0 && scheme_len < 20) {
      parsed->scheme = (char*)malloc(scheme_len + 1);
      strncpy(parsed->scheme, ptr, scheme_len);
      parsed->scheme[scheme_len] = '\0';
      ptr = scheme_end + 1;
    }
  }

  /* Parse authority (//host:port/...) */
  if (ptr[0] == '/' && ptr[1] == '/') {
    ptr += 2;

    /* Find end of authority */
    const char *auth_end = ptr;
    while (*auth_end && *auth_end != '/' && *auth_end != '?' && *auth_end != '#') {
      auth_end++;
    }

    /* Parse userinfo (user:pass@) */
    const char *at = memchr(ptr, '@', auth_end - ptr);
    if (at) {
      size_t userinfo_len = at - ptr;
      parsed->userinfo = (char*)malloc(userinfo_len + 1);
      strncpy(parsed->userinfo, ptr, userinfo_len);
      parsed->userinfo[userinfo_len] = '\0';
      ptr = at + 1;
    }

    /* Parse host:port */
    const char *host_start = ptr;
    const char *host_end = ptr;

    while (host_end < auth_end && *host_end != ':') {
      host_end++;
    }

    size_t host_len = host_end - host_start;
    parsed->host = (char*)malloc(host_len + 1);
    strncpy(parsed->host, host_start, host_len);
    parsed->host[host_len] = '\0';

    /* Parse port */
    parsed->port = -1;
    if (*host_end == ':') {
      const char *port_start = host_end + 1;
      const char *port_end = port_start;
      while (port_end < auth_end && isdigit(*port_end)) {
        port_end++;
      }
      if (port_end > port_start) {
        parsed->port = atoi(port_start);
      }
    }

    ptr = auth_end;
  }

  /* Parse path */
  start = ptr;
  while (*ptr && *ptr != '?' && *ptr != '#') {
    ptr++;
  }
  if (ptr > start) {
    size_t path_len = ptr - start;
    parsed->path = (char*)malloc(path_len + 1);
    strncpy(parsed->path, start, path_len);
    parsed->path[path_len] = '\0';
  }

  /* Parse query */
  if (*ptr == '?') {
    ptr++;
    start = ptr;
    while (*ptr && *ptr != '#') {
      ptr++;
    }
    if (ptr > start) {
      size_t query_len = ptr - start;
      parsed->query = (char*)malloc(query_len + 1);
      strncpy(parsed->query, start, query_len);
      parsed->query[query_len] = '\0';
    }
  }

  /* Parse fragment */
  if (*ptr == '#') {
    ptr++;
    start = ptr;
    while (*ptr) {
      ptr++;
    }
    if (ptr > start) {
      size_t fragment_len = ptr - start;
      parsed->fragment = (char*)malloc(fragment_len + 1);
      strncpy(parsed->fragment, start, fragment_len);
      parsed->fragment[fragment_len] = '\0';
    }
  }

  fprintf(stderr, "[url] Parsed URI: scheme=%s, host=%s, port=%d, path=%s\n",
          parsed->scheme ? parsed->scheme : "(none)",
          parsed->host ? parsed->host : "(none)",
          parsed->port, parsed->path ? parsed->path : "(none)");

  return parsed;
}

void fl_uri_destroy(fl_uri_t *uri) {
  if (!uri) return;

  free(uri->scheme);
  free(uri->userinfo);
  free(uri->host);
  free(uri->path);
  free(uri->query);
  free(uri->fragment);
  free(uri);

  fprintf(stderr, "[url] URI destroyed\n");
}

int fl_uri_is_absolute(const char *uri) {
  if (!uri) return 0;

  fl_uri_t *parsed = fl_uri_parse(uri);
  if (!parsed) return 0;

  int is_absolute = (parsed->scheme != NULL && parsed->host != NULL) ? 1 : 0;
  fl_uri_destroy(parsed);

  return is_absolute;
}

int fl_uri_is_valid(const char *uri) {
  if (!uri || strlen(uri) == 0) return 0;

  fl_uri_t *parsed = fl_uri_parse(uri);
  if (!parsed) return 0;

  /* Valid if has scheme or path */
  int is_valid = (parsed->scheme != NULL || parsed->path != NULL) ? 1 : 0;

  fl_uri_destroy(parsed);
  return is_valid;
}

/* ===== URL Encoding/Decoding ===== */

int fl_url_validate_char(char c) {
  /* Unreserved characters in RFC 3986: A-Z a-z 0-9 - . _ ~ */
  return isalnum(c) || c == '-' || c == '.' || c == '_' || c == '~';
}

size_t fl_url_encode_size(const char *str) {
  if (!str) return 0;

  size_t size = 0;
  for (const char *ptr = str; *ptr; ptr++) {
    if (fl_url_validate_char(*ptr)) {
      size++;
    } else {
      size += 3;  /* %XX */
    }
  }

  return size;
}

size_t fl_url_decode_size(const char *encoded) {
  if (!encoded) return 0;

  size_t size = 0;
  for (const char *ptr = encoded; *ptr; ptr++) {
    if (*ptr == '%' && ptr[1] && ptr[2]) {
      size++;
      ptr += 2;
    } else {
      size++;
    }
  }

  return size;
}

char* fl_url_encode(const char *str) {
  if (!str) return NULL;

  size_t output_size = fl_url_encode_size(str);
  char *output = (char*)malloc(output_size + 1);
  if (!output) return NULL;

  if (fl_url_encode_buffer(str, output, output_size) >= 0) {
    output[output_size] = '\0';
    return output;
  }

  free(output);
  return NULL;
}

char* fl_url_encode_strict(const char *str) {
  /* RFC 3986 strict: encode more characters */
  if (!str) return NULL;

  size_t output_size = fl_url_encode_size(str) + 10;
  char *output = (char*)malloc(output_size + 1);
  if (!output) return NULL;

  size_t out_idx = 0;

  for (const char *ptr = str; *ptr && out_idx < output_size - 3; ptr++) {
    unsigned char c = (unsigned char)*ptr;

    /* Encode space and reserved characters */
    if (c <= 32 || c >= 127 || c == ' ' || c == ':' || c == '/' || c == '?' ||
        c == '#' || c == '[' || c == ']' || c == '@' || c == '!' || c == '$' ||
        c == '&' || c == '\'' || c == '(' || c == ')' || c == '*' || c == '+' ||
        c == ',' || c == ';' || c == '=') {
      out_idx += snprintf(&output[out_idx], output_size - out_idx, "%%%02X", c);
    } else {
      output[out_idx++] = *ptr;
    }
  }

  output[out_idx] = '\0';
  fprintf(stderr, "[url] Encoded (strict): %zu → %zu bytes\n", strlen(str), out_idx);
  return output;
}

int fl_url_encode_buffer(const char *str, char *output, size_t output_size) {
  if (!str || !output) return -1;

  size_t out_idx = 0;
  const char *hex = "0123456789ABCDEF";

  for (const char *ptr = str; *ptr && out_idx < output_size; ptr++) {
    unsigned char c = (unsigned char)*ptr;

    if (fl_url_validate_char(c)) {
      output[out_idx++] = c;
    } else if (out_idx + 3 <= output_size) {
      output[out_idx++] = '%';
      output[out_idx++] = hex[(c >> 4) & 0x0F];
      output[out_idx++] = hex[c & 0x0F];
    } else {
      return -1;
    }
  }

  fprintf(stderr, "[url] Encoded: %zu → %zu bytes\n", strlen(str), out_idx);
  return (int)out_idx;
}

char* fl_url_decode(const char *encoded) {
  if (!encoded) return NULL;

  size_t output_size = fl_url_decode_size(encoded);
  char *output = (char*)malloc(output_size + 1);
  if (!output) return NULL;

  if (fl_url_decode_buffer(encoded, output, output_size) >= 0) {
    output[output_size] = '\0';
    return output;
  }

  free(output);
  return NULL;
}

int fl_url_decode_buffer(const char *encoded, char *output, size_t output_size) {
  if (!encoded || !output) return -1;

  size_t out_idx = 0;

  for (const char *ptr = encoded; *ptr && out_idx < output_size; ptr++) {
    if (*ptr == '%' && ptr[1] && ptr[2]) {
      char hex_str[3] = {ptr[1], ptr[2], '\0'};
      int value = (int)strtol(hex_str, NULL, 16);

      if (value >= 0 && value <= 255) {
        output[out_idx++] = (char)value;
        ptr += 2;
      } else {
        return -1;
      }
    } else if (*ptr == '+') {
      output[out_idx++] = ' ';
    } else {
      output[out_idx++] = *ptr;
    }
  }

  fprintf(stderr, "[url] Decoded: %zu → %zu bytes\n", strlen(encoded), out_idx);
  return (int)out_idx;
}

int fl_url_is_encoded(const char *str) {
  if (!str) return 0;

  for (const char *ptr = str; *ptr; ptr++) {
    if (*ptr == '%') {
      if (!ptr[1] || !ptr[2]) return 0;
      if (!isxdigit(ptr[1]) || !isxdigit(ptr[2])) return 0;
    }
  }

  return 1;
}

/* ===== Query String Parsing ===== */

fl_query_string_t* fl_query_string_parse(const char *query) {
  if (!query) return NULL;

  fl_query_string_t *qs = (fl_query_string_t*)malloc(sizeof(fl_query_string_t));
  if (!qs) return NULL;

  qs->params = (fl_query_param_t*)malloc(20 * sizeof(fl_query_param_t));
  if (!qs->params) {
    free(qs);
    return NULL;
  }

  qs->param_count = 0;
  qs->max_params = 20;

  char *query_copy = (char*)malloc(strlen(query) + 1);
  if(snprintf(query_copy, sizeof(query_copy), "%s", query) < 0) return -1;;

  char *saveptr = NULL;
  char *pair = strtok_r(query_copy, "&", &saveptr);

  while (pair && qs->param_count < qs->max_params) {
    const char *eq = strchr(pair, '=');

    if (eq) {
      size_t key_len = eq - pair;
      size_t val_len = strlen(eq + 1);

      qs->params[qs->param_count].key = (char*)malloc(key_len + 1);
      qs->params[qs->param_count].value = (char*)malloc(val_len + 1);

      strncpy(qs->params[qs->param_count].key, pair, key_len);
      qs->params[qs->param_count].key[key_len] = '\0';
      SAFE_STRCPY(qs->params[qs->param_count].value, eq + 1);

      qs->param_count++;
    } else {
      /* Key without value */
      qs->params[qs->param_count].key = (char*)malloc(strlen(pair) + 1);
      qs->params[qs->param_count].value = (char*)malloc(1);
      SAFE_STRCPY(qs->params[qs->param_count].key, pair);
      qs->params[qs->param_count].value[0] = '\0';

      qs->param_count++;
    }

    pair = strtok_r(NULL, "&", &saveptr);
  }

  free(query_copy);
  fprintf(stderr, "[url] Parsed query string: %d parameters\n", qs->param_count);
  return qs;
}

void fl_query_string_destroy(fl_query_string_t *qs) {
  if (!qs) return;

  for (int i = 0; i < qs->param_count; i++) {
    free(qs->params[i].key);
    free(qs->params[i].value);
  }

  free(qs->params);
  free(qs);

  fprintf(stderr, "[url] Query string destroyed\n");
}

const char* fl_query_string_get(fl_query_string_t *qs, const char *key) {
  if (!qs || !key) return NULL;

  for (int i = 0; i < qs->param_count; i++) {
    if (strcmp(qs->params[i].key, key) == 0) {
      return qs->params[i].value;
    }
  }

  return NULL;
}

int fl_query_string_set(fl_query_string_t *qs, const char *key,
                        const char *value) {
  if (!qs || !key || !value) return -1;

  /* Check if key exists */
  for (int i = 0; i < qs->param_count; i++) {
    if (strcmp(qs->params[i].key, key) == 0) {
      free(qs->params[i].value);
      qs->params[i].value = (char*)malloc(strlen(value) + 1);
      SAFE_STRCPY(qs->params[i].value, value);
      return 0;
    }
  }

  /* Add new parameter */
  if (qs->param_count >= qs->max_params) {
    return -1;  /* Buffer full */
  }

  qs->params[qs->param_count].key = (char*)malloc(strlen(key) + 1);
  qs->params[qs->param_count].value = (char*)malloc(strlen(value) + 1);
  SAFE_STRCPY(qs->params[qs->param_count].key, key);
  SAFE_STRCPY(qs->params[qs->param_count].value, value);
  qs->param_count++;

  return 0;
}

char* fl_query_string_encode(fl_query_string_t *qs) {
  if (!qs) return NULL;

  size_t total_size = 0;

  for (int i = 0; i < qs->param_count; i++) {
    if (i > 0) total_size++;  /* & separator */
    total_size += strlen(qs->params[i].key) + 1 + strlen(qs->params[i].value);
  }

  char *output = (char*)malloc(total_size + 1);
  if (!output) return NULL;

  size_t out_idx = 0;

  for (int i = 0; i < qs->param_count; i++) {
    if (i > 0) {
      output[out_idx++] = '&';
    }

    SAFE_STRCPY(&output[out_idx], qs->params[i].key);
    out_idx += strlen(qs->params[i].key);
    output[out_idx++] = '=';
    SAFE_STRCPY(&output[out_idx], qs->params[i].value);
    out_idx += strlen(qs->params[i].value);
  }

  output[out_idx] = '\0';
  fprintf(stderr, "[url] Encoded query string: %zu bytes\n", out_idx);
  return output;
}

/* ===== URL Normalization ===== */

char* fl_url_normalize(const char *url) {
  if (!url) return NULL;

  size_t output_size = strlen(url) * 2;  /* Over-allocate */
  char *output = (char*)malloc(output_size + 1);
  if (!output) return NULL;

  if (fl_url_normalize_buffer(url, output, output_size) >= 0) {
    return output;
  }

  free(output);
  return NULL;
}

int fl_url_normalize_buffer(const char *url, char *output, size_t output_size) {
  if (!url || !output) return -1;

  fl_uri_t *parsed = fl_uri_parse(url);
  if (!parsed) return -1;

  size_t out_idx = 0;

  /* Reconstruct normalized URL */
  if (parsed->scheme) {
    /* Lowercase scheme */
    for (const char *p = parsed->scheme; *p; p++) {
      if (out_idx < output_size) {
        output[out_idx++] = tolower(*p);
      }
    }
    if (out_idx < output_size) output[out_idx++] = ':';
  }

  if (parsed->host) {
    if (out_idx + 2 < output_size) {
      output[out_idx++] = '/';
      output[out_idx++] = '/';
    }

    /* Lowercase host */
    for (const char *p = parsed->host; *p; p++) {
      if (out_idx < output_size) {
        output[out_idx++] = tolower(*p);
      }
    }

    if (parsed->port > 0) {
      out_idx += snprintf(&output[out_idx], output_size - out_idx, ":%d",
                          parsed->port);
    }
  }

  if (parsed->path) {
    for (const char *p = parsed->path; *p; p++) {
      if (out_idx < output_size) {
        output[out_idx++] = *p;
      }
    }
  }

  if (parsed->query) {
    if (out_idx < output_size) output[out_idx++] = '?';
    for (const char *p = parsed->query; *p; p++) {
      if (out_idx < output_size) {
        output[out_idx++] = *p;
      }
    }
  }

  output[out_idx] = '\0';

  fl_uri_destroy(parsed);
  fprintf(stderr, "[url] Normalized URL: %zu bytes\n", out_idx);
  return (int)out_idx;
}
