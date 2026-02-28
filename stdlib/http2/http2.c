/**
 * FreeLang HTTP/2 Module (Phase 16 Week 4)
 * HTTP/2 server and client using nghttp2 library
 * Uses Promise Bridge for async/await support
 */

#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <uv.h>
#include <pthread.h>
#include "../ffi/freelang_ffi.h"

/* ===== nghttp2 Conditional Support ===== */

#ifdef HAVE_NGHTTP2
  #include <nghttp2/nghttp2.h>
  #define H2_SESSION_TYPE nghttp2_session*
  #define H2_CALLBACKS_TYPE nghttp2_session_callbacks*
#else
  #warning "nghttp2 not found - HTTP/2 support disabled (use 'sudo apt install libnghttp2-dev')"
  #define H2_SESSION_TYPE void*
  #define H2_CALLBACKS_TYPE void*
#endif

/* For SSL/TLS */
#ifdef HAVE_OPENSSL
  #include <openssl/ssl.h>
  #define SSL_TYPE SSL*
#else
  #define SSL_TYPE void*
#endif

/* ===== Constants ===== */

#define MAX_SERVERS 256
#define MAX_SESSIONS 1024
#define MAX_STREAMS 4096

/* ===== HTTP/2 Types ===== */

typedef enum {
  HTTP2_SESSION_STATE_IDLE,
  HTTP2_SESSION_STATE_OPEN,
  HTTP2_SESSION_STATE_CLOSING,
  HTTP2_SESSION_STATE_CLOSED
} http2_session_state_t;

typedef enum {
  HTTP2_STREAM_STATE_IDLE,
  HTTP2_STREAM_STATE_OPEN,
  HTTP2_STREAM_STATE_HALF_CLOSED_LOCAL,
  HTTP2_STREAM_STATE_HALF_CLOSED_REMOTE,
  HTTP2_STREAM_STATE_CLOSED
} http2_stream_state_t;

/* ===== Internal Structures ===== */

typedef struct {
  int id;
  int port;
  uv_tcp_t tcp;
  char *cert_path;
  char *key_path;
  int on_session_cb;
  int secure;
  int destroyed;
  fl_event_context_t *ctx;
} fl_http2_server_t;

typedef struct {
  int stream_id;
  http2_stream_state_t state;
  char **headers;  /* Array of "name: value" strings */
  int header_count;
  const char *method;
  const char *path;
  int on_data_cb;
  int on_error_cb;
} fl_http2_stream_t;

typedef struct {
  int id;
  uv_tcp_t tcp;
  SSL_TYPE ssl;
  H2_SESSION_TYPE h2_session;
  http2_session_state_t state;
  fl_http2_stream_t *streams;
  int stream_count;
  int max_streams;
  int on_stream_cb;
  int destroyed;
  fl_event_context_t *ctx;
} fl_http2_session_t;

typedef struct {
  int id;
  uv_tcp_t tcp;
  SSL_TYPE ssl;
  H2_SESSION_TYPE h2_session;
  char *url;
  http2_session_state_t state;
  int on_response_cb;
  int destroyed;
  fl_event_context_t *ctx;
} fl_http2_client_t;

typedef struct {
  int stream_id;
  char **response_headers;
  int header_count;
  int status_code;
  int on_data_cb;
  int on_end_cb;
  int on_error_cb;
  int on_response_cb;
  http2_stream_state_t state;
} fl_http2_request_t;

/* ===== Global State ===== */

static fl_http2_server_t *server_table[MAX_SERVERS] = {NULL};
static int next_server_id = 1;

static fl_http2_session_t *session_table[MAX_SESSIONS] = {NULL};
static int next_session_id = 1;

static fl_http2_client_t *client_table[MAX_SESSIONS] = {NULL};
static int next_client_id = 1;

static fl_http2_request_t *request_table[MAX_STREAMS] = {NULL};
static int next_request_id = 1;

/* ===== Helper Functions ===== */

static int server_alloc_id(fl_http2_server_t *server) {
  if (next_server_id >= MAX_SERVERS) {
    return -1;
  }
  int id = next_server_id++;
  server_table[id] = server;
  return id;
}

static fl_http2_server_t* server_get(int id) {
  if (id <= 0 || id >= MAX_SERVERS) {
    return NULL;
  }
  return server_table[id];
}

static int session_alloc_id(fl_http2_session_t *session) {
  if (next_session_id >= MAX_SESSIONS) {
    return -1;
  }
  int id = next_session_id++;
  session_table[id] = session;
  return id;
}

static fl_http2_session_t* session_get(int id) {
  if (id <= 0 || id >= MAX_SESSIONS) {
    return NULL;
  }
  return session_table[id];
}

static int client_alloc_id(fl_http2_client_t *client) {
  if (next_client_id >= MAX_SESSIONS) {
    return -1;
  }
  int id = next_client_id++;
  client_table[id] = client;
  return id;
}

static fl_http2_client_t* client_get(int id) {
  if (id <= 0 || id >= MAX_SESSIONS) {
    return NULL;
  }
  return client_table[id];
}

static int request_alloc_id(fl_http2_request_t *request) {
  if (next_request_id >= MAX_STREAMS) {
    return -1;
  }
  int id = next_request_id++;
  request_table[id] = request;
  return id;
}

static fl_http2_request_t* request_get(int id) {
  if (id <= 0 || id >= MAX_STREAMS) {
    return NULL;
  }
  return request_table[id];
}

/* ===== HTTP/2 Server ===== */

int fl_http2_server_create(const char *key, const char *cert, int callback_id) {
  fl_http2_server_t *server = (fl_http2_server_t *)malloc(sizeof(fl_http2_server_t));
  if (!server) return -1;

  memset(server, 0, sizeof(fl_http2_server_t));
  server->on_session_cb = callback_id;
  server->secure = (key != NULL && cert != NULL);
  server->destroyed = 0;

  if (server->secure) {
    server->key_path = (char *)malloc(strlen(key) + 1);
    server->cert_path = (char *)malloc(strlen(cert) + 1);
    if (!server->key_path || !server->cert_path) {
      free(server->key_path);
      free(server->cert_path);
      free(server);
      return -1;
    }
    strcpy(server->key_path, key);
    strcpy(server->cert_path, cert);
  }

  int id = server_alloc_id(server);
  if (id < 0) {
    if (server->key_path) free(server->key_path);
    if (server->cert_path) free(server->cert_path);
    free(server);
    return -1;
  }

  server->id = id;
  fprintf(stderr, "[http2] Server created: id=%d, secure=%d\n", id, server->secure);

  return id;
}

int fl_http2_server_listen(int server_id, int port, int callback_id) {
  fl_http2_server_t *server = server_get(server_id);
  if (!server || server->destroyed) return -1;

  server->port = port;
  fprintf(stderr, "[http2] Server listening: id=%d, port=%d\n",
          server_id, port);

  /* TODO: Bind uv_tcp_t to port */
  /* TODO: Call callback when session created */

  return 0;
}

int fl_http2_server_close(int server_id, int callback_id) {
  fl_http2_server_t *server = server_get(server_id);
  if (!server) return -1;

  if (!server->destroyed) {
    server->destroyed = 1;
    if (server->key_path) free(server->key_path);
    if (server->cert_path) free(server->cert_path);
    free(server);
    fprintf(stderr, "[http2] Server closed: id=%d\n", server_id);
  }

  return 0;
}

/* ===== HTTP/2 Stream (Server-side) ===== */

int fl_http2_stream_respond(int stream_id, void *headers_map, int end_stream) {
  /* headers_map is a FreeLang map of header name->value pairs */
  fprintf(stderr, "[http2] Stream respond: stream=%d, end_stream=%d\n",
          stream_id, end_stream);

  /* TODO: Convert headers_map to nghttp2 header list */
  /* TODO: Call nghttp2_submit_response */

  return 0;
}

int fl_http2_stream_write(int stream_id, const char *data) {
  fprintf(stderr, "[http2] Stream write: stream=%d, len=%zu\n",
          stream_id, strlen(data));

  /* TODO: Call nghttp2_submit_data */

  return 0;
}

int fl_http2_stream_end(int stream_id) {
  fprintf(stderr, "[http2] Stream end: stream=%d\n", stream_id);

  /* TODO: Mark stream as half-closed (local) */

  return 0;
}

int fl_http2_stream_push_promise(int stream_id, const char *path,
                                  void *headers_map, int callback_id) {
  fprintf(stderr, "[http2] Push promise: stream=%d, path=%s\n",
          stream_id, path);

  /* TODO: Call nghttp2_submit_push_promise */
  /* TODO: Call callback with pushed stream_id */

  return 0;
}

int fl_http2_stream_on_data(int stream_id, int callback_id) {
  fprintf(stderr, "[http2] Stream data callback: stream=%d\n", stream_id);

  /* TODO: Register callback */

  return 0;
}

int fl_http2_stream_on_error(int stream_id, int callback_id) {
  fprintf(stderr, "[http2] Stream error callback: stream=%d\n", stream_id);

  /* TODO: Register callback */

  return 0;
}

int fl_http2_session_on_stream(int session_id, int callback_id) {
  fl_http2_session_t *session = session_get(session_id);
  if (!session) return -1;

  session->on_stream_cb = callback_id;
  fprintf(stderr, "[http2] Session stream callback registered\n");

  return 0;
}

/* ===== HTTP/2 Client ===== */

int fl_http2_client_connect(const char *url, int reject_unauthorized,
                             int callback_id) {
  fl_http2_client_t *client = (fl_http2_client_t *)malloc(sizeof(fl_http2_client_t));
  if (!client) return -1;

  memset(client, 0, sizeof(fl_http2_client_t));
  client->url = (char *)malloc(strlen(url) + 1);
  if (!client->url) {
    free(client);
    return -1;
  }
  strcpy(client->url, url);

  client->state = HTTP2_SESSION_STATE_IDLE;
  client->on_response_cb = callback_id;
  client->destroyed = 0;

  int id = client_alloc_id(client);
  if (id < 0) {
    free(client->url);
    free(client);
    return -1;
  }

  client->id = id;
  fprintf(stderr, "[http2] Client connecting: id=%d, url=%s\n", id, url);

  /* TODO: Parse URL */
  /* TODO: Create TLS connection */
  /* TODO: Send client preface + SETTINGS */

  return id;
}

int fl_http2_client_request(int client_id, void *headers_map,
                             int end_stream, int callback_id) {
  fl_http2_client_t *client = client_get(client_id);
  if (!client || client->destroyed) return -1;

  fl_http2_request_t *request = (fl_http2_request_t *)malloc(sizeof(fl_http2_request_t));
  if (!request) return -1;

  memset(request, 0, sizeof(fl_http2_request_t));
  request->state = HTTP2_STREAM_STATE_OPEN;
  request->on_response_cb = callback_id;

  int request_id = request_alloc_id(request);
  if (request_id < 0) {
    free(request);
    return -1;
  }

  request->stream_id = request_id;
  fprintf(stderr, "[http2] Client request: stream=%d, end_stream=%d\n",
          request_id, end_stream);

  /* TODO: Convert headers_map to nghttp2 headers */
  /* TODO: Call nghttp2_submit_request */

  return request_id;
}

int fl_http2_client_write(int stream_id, const char *data) {
  fprintf(stderr, "[http2] Client write: stream=%d, len=%zu\n",
          stream_id, strlen(data));

  /* TODO: Call nghttp2_submit_data */

  return 0;
}

int fl_http2_client_end_request(int stream_id) {
  fl_http2_request_t *request = request_get(stream_id);
  if (!request) return -1;

  request->state = HTTP2_STREAM_STATE_HALF_CLOSED_LOCAL;
  fprintf(stderr, "[http2] Client end request: stream=%d\n", stream_id);

  return 0;
}

int fl_http2_client_on_response(int stream_id, int callback_id) {
  fl_http2_request_t *request = request_get(stream_id);
  if (!request) return -1;

  request->on_response_cb = callback_id;
  return 0;
}

int fl_http2_client_on_data(int stream_id, int callback_id) {
  fl_http2_request_t *request = request_get(stream_id);
  if (!request) return -1;

  request->on_data_cb = callback_id;
  return 0;
}

int fl_http2_client_on_end(int stream_id, int callback_id) {
  fl_http2_request_t *request = request_get(stream_id);
  if (!request) return -1;

  request->on_end_cb = callback_id;
  return 0;
}

int fl_http2_client_on_error(int stream_id, int callback_id) {
  fl_http2_request_t *request = request_get(stream_id);
  if (!request) return -1;

  request->on_error_cb = callback_id;
  return 0;
}

int fl_http2_client_destroy_request(int stream_id) {
  fl_http2_request_t *request = request_get(stream_id);
  if (!request) return -1;

  if (request->response_headers) {
    for (int i = 0; i < request->header_count; i++) {
      if (request->response_headers[i]) {
        free(request->response_headers[i]);
      }
    }
    free(request->response_headers);
  }

  free(request);
  fprintf(stderr, "[http2] Request destroyed: stream=%d\n", stream_id);

  return 0;
}

int fl_http2_client_close(int client_id, int callback_id) {
  fl_http2_client_t *client = client_get(client_id);
  if (!client) return -1;

  if (!client->destroyed) {
    client->destroyed = 1;
    client->state = HTTP2_SESSION_STATE_CLOSED;
    if (client->url) free(client->url);
    free(client);
    fprintf(stderr, "[http2] Client closed: id=%d\n", client_id);
  }

  return 0;
}

/* ===== Info ===== */

void fl_http2_info(void) {
  fprintf(stderr, "[http2] HTTP/2 module initialized\n");
  fprintf(stderr, "[http2] Max servers: %d, sessions: %d, streams: %d\n",
          MAX_SERVERS, MAX_SESSIONS, MAX_STREAMS);
}
