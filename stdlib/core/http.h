/**
 * FreeLang stdlib/http - HTTP Client and Server
 * HTTP/1.1 protocol, request/response handling, header management
 */

#ifndef FREELANG_STDLIB_HTTP_H
#define FREELANG_STDLIB_HTTP_H

#include <stdint.h>
#include <stddef.h>

/* ===== HTTP Methods ===== */

typedef enum {
  FL_HTTP_GET = 0,
  FL_HTTP_POST = 1,
  FL_HTTP_PUT = 2,
  FL_HTTP_DELETE = 3,
  FL_HTTP_HEAD = 4,
  FL_HTTP_PATCH = 5,
  FL_HTTP_OPTIONS = 6
} fl_http_method_t;

/* ===== HTTP Status Codes ===== */

typedef enum {
  FL_HTTP_200_OK = 200,
  FL_HTTP_201_CREATED = 201,
  FL_HTTP_204_NO_CONTENT = 204,
  FL_HTTP_301_MOVED = 301,
  FL_HTTP_302_FOUND = 302,
  FL_HTTP_304_NOT_MODIFIED = 304,
  FL_HTTP_400_BAD_REQUEST = 400,
  FL_HTTP_401_UNAUTHORIZED = 401,
  FL_HTTP_403_FORBIDDEN = 403,
  FL_HTTP_404_NOT_FOUND = 404,
  FL_HTTP_405_METHOD_NOT_ALLOWED = 405,
  FL_HTTP_500_INTERNAL_ERROR = 500,
  FL_HTTP_502_BAD_GATEWAY = 502,
  FL_HTTP_503_SERVICE_UNAVAILABLE = 503
} fl_http_status_t;

/* ===== HTTP Headers ===== */

typedef struct {
  char **names;
  char **values;
  int count;
  int max_count;
} fl_http_headers_t;

/* ===== HTTP Request ===== */

typedef struct {
  fl_http_method_t method;
  char *uri;
  char *path;
  char *query;
  char *fragment;
  fl_http_headers_t *headers;
  uint8_t *body;
  size_t body_size;
} fl_http_request_t;

/* ===== HTTP Response ===== */

typedef struct {
  int status_code;
  char *status_message;
  fl_http_headers_t *headers;
  uint8_t *body;
  size_t body_size;
} fl_http_response_t;

/* ===== HTTP Server ===== */

typedef struct fl_http_server_t fl_http_server_t;
typedef int (*fl_http_handler_t)(fl_http_request_t *req, fl_http_response_t *resp, void *userdata);

/* ===== HTTP Client ===== */

typedef struct {
  char *host;
  uint16_t port;
  int use_ssl;
  int socket_fd;
  int timeout_ms;
} fl_http_client_t;

/* ===== Statistics ===== */

typedef struct {
  uint64_t requests_sent;
  uint64_t responses_received;
  uint64_t requests_received;
  uint64_t responses_sent;
  uint64_t bytes_sent;
  uint64_t bytes_received;
} fl_http_stats_t;

/* ===== Public API ===== */

/* HTTP Headers */
fl_http_headers_t* fl_http_headers_create(int capacity);
void fl_http_headers_destroy(fl_http_headers_t *headers);
int fl_http_headers_set(fl_http_headers_t *headers, const char *name, const char *value);
const char* fl_http_headers_get(fl_http_headers_t *headers, const char *name);
int fl_http_headers_has(fl_http_headers_t *headers, const char *name);

/* HTTP Request */
fl_http_request_t* fl_http_request_create(fl_http_method_t method, const char *uri);
void fl_http_request_destroy(fl_http_request_t *req);
int fl_http_request_set_body(fl_http_request_t *req, const uint8_t *body, size_t size);
char* fl_http_request_to_string(fl_http_request_t *req);

/* HTTP Response */
fl_http_response_t* fl_http_response_create(int status_code);
void fl_http_response_destroy(fl_http_response_t *resp);
int fl_http_response_set_body(fl_http_response_t *resp, const uint8_t *body, size_t size);
char* fl_http_response_to_string(fl_http_response_t *resp);

/* HTTP Client */
fl_http_client_t* fl_http_client_create(const char *host, uint16_t port, int use_ssl);
void fl_http_client_destroy(fl_http_client_t *client);
int fl_http_client_connect(fl_http_client_t *client);
fl_http_response_t* fl_http_client_request(fl_http_client_t *client, fl_http_request_t *req);
int fl_http_client_send(fl_http_client_t *client, const char *request_str);
char* fl_http_client_recv(fl_http_client_t *client, size_t *size);
int fl_http_client_close(fl_http_client_t *client);

/* HTTP Server */
fl_http_server_t* fl_http_server_create(uint16_t port);
void fl_http_server_destroy(fl_http_server_t *server);
int fl_http_server_start(fl_http_server_t *server);
int fl_http_server_stop(fl_http_server_t *server);
int fl_http_server_register_handler(fl_http_server_t *server, const char *path,
                                    fl_http_method_t method,
                                    fl_http_handler_t handler, void *userdata);
int fl_http_server_is_running(fl_http_server_t *server);

/* HTTP Parser */
fl_http_request_t* fl_http_parse_request(const char *raw_request);
fl_http_response_t* fl_http_parse_response(const char *raw_response);

/* Utilities */
const char* fl_http_method_to_string(fl_http_method_t method);
fl_http_method_t fl_http_string_to_method(const char *method_str);
const char* fl_http_status_to_message(int status_code);
int fl_http_is_success(int status_code);
int fl_http_is_redirect(int status_code);
int fl_http_is_client_error(int status_code);
int fl_http_is_server_error(int status_code);

/* Statistics */
fl_http_stats_t* fl_http_get_stats(void);
void fl_http_reset_stats(void);

#endif /* FREELANG_STDLIB_HTTP_H */
