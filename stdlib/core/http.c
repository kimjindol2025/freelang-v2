/**
 * FreeLang stdlib/http Implementation - HTTP Client and Server
 * HTTP/1.1 protocol, request/response handling, header management
 */

#include "http.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <pthread.h>

/* ===== Global Statistics ===== */

static fl_http_stats_t global_stats = {0};
static pthread_mutex_t http_mutex = PTHREAD_MUTEX_INITIALIZER;

/* ===== HTTP Headers ===== */

fl_http_headers_t* fl_http_headers_create(int capacity) {
  if (capacity <= 0) capacity = 20;

  fl_http_headers_t *headers = (fl_http_headers_t*)malloc(sizeof(fl_http_headers_t));
  if (!headers) return NULL;

  headers->names = (char**)malloc(capacity * sizeof(char*));
  headers->values = (char**)malloc(capacity * sizeof(char*));
  if (!headers->names || !headers->values) {
    free(headers->names);
    free(headers->values);
    free(headers);
    return NULL;
  }

  headers->count = 0;
  headers->max_count = capacity;

  fprintf(stderr, "[http] Headers created: capacity=%d\n", capacity);
  return headers;
}

void fl_http_headers_destroy(fl_http_headers_t *headers) {
  if (!headers) return;

  for (int i = 0; i < headers->count; i++) {
    free(headers->names[i]);
    free(headers->values[i]);
  }

  free(headers->names);
  free(headers->values);
  free(headers);

  fprintf(stderr, "[http] Headers destroyed\n");
}

int fl_http_headers_set(fl_http_headers_t *headers, const char *name,
                        const char *value) {
  if (!headers || !name || !value) return -1;

  /* Check if header already exists */
  for (int i = 0; i < headers->count; i++) {
    if (strcmp(headers->names[i], name) == 0) {
      free(headers->values[i]);
      headers->values[i] = (char*)malloc(strlen(value) + 1);
      strcpy(headers->values[i], value);
      return 0;
    }
  }

  /* Add new header */
  if (headers->count >= headers->max_count) {
    /* Resize */
    int new_capacity = headers->max_count * 2;
    char **new_names = (char**)realloc(headers->names, new_capacity * sizeof(char*));
    char **new_values = (char**)realloc(headers->values, new_capacity * sizeof(char*));
    if (!new_names || !new_values) return -1;

    headers->names = new_names;
    headers->values = new_values;
    headers->max_count = new_capacity;
  }

  headers->names[headers->count] = (char*)malloc(strlen(name) + 1);
  headers->values[headers->count] = (char*)malloc(strlen(value) + 1);
  strcpy(headers->names[headers->count], name);
  strcpy(headers->values[headers->count], value);
  headers->count++;

  fprintf(stderr, "[http] Header set: %s: %s\n", name, value);
  return 0;
}

const char* fl_http_headers_get(fl_http_headers_t *headers, const char *name) {
  if (!headers || !name) return NULL;

  for (int i = 0; i < headers->count; i++) {
    if (strcmp(headers->names[i], name) == 0) {
      return headers->values[i];
    }
  }

  return NULL;
}

int fl_http_headers_has(fl_http_headers_t *headers, const char *name) {
  return fl_http_headers_get(headers, name) != NULL ? 1 : 0;
}

/* ===== HTTP Request ===== */

fl_http_request_t* fl_http_request_create(fl_http_method_t method, const char *uri) {
  if (!uri) return NULL;

  fl_http_request_t *req = (fl_http_request_t*)malloc(sizeof(fl_http_request_t));
  if (!req) return NULL;

  req->method = method;
  req->uri = (char*)malloc(strlen(uri) + 1);
  strcpy(req->uri, uri);
  req->path = NULL;
  req->query = NULL;
  req->fragment = NULL;
  req->headers = fl_http_headers_create(20);
  req->body = NULL;
  req->body_size = 0;

  /* Parse URI */
  const char *question = strchr(uri, '?');
  const char *hash = strchr(uri, '#');

  if (question) {
    size_t path_len = question - uri;
    req->path = (char*)malloc(path_len + 1);
    strncpy(req->path, uri, path_len);
    req->path[path_len] = '\0';

    size_t query_end = hash ? (hash - question - 1) : strlen(question + 1);
    req->query = (char*)malloc(query_end + 1);
    strncpy(req->query, question + 1, query_end);
    req->query[query_end] = '\0';
  } else {
    size_t path_end = hash ? (hash - uri) : strlen(uri);
    req->path = (char*)malloc(path_end + 1);
    strncpy(req->path, uri, path_end);
    req->path[path_end] = '\0';
  }

  if (hash) {
    req->fragment = (char*)malloc(strlen(hash + 1) + 1);
    strcpy(req->fragment, hash + 1);
  }

  fprintf(stderr, "[http] Request created: %s %s\n",
          fl_http_method_to_string(method), uri);

  return req;
}

void fl_http_request_destroy(fl_http_request_t *req) {
  if (!req) return;

  free(req->uri);
  free(req->path);
  free(req->query);
  free(req->fragment);
  free(req->body);
  if (req->headers) fl_http_headers_destroy(req->headers);
  free(req);

  fprintf(stderr, "[http] Request destroyed\n");
}

int fl_http_request_set_body(fl_http_request_t *req, const uint8_t *body,
                             size_t size) {
  if (!req || !body) return -1;

  req->body = (uint8_t*)malloc(size);
  if (!req->body) return -1;

  memcpy(req->body, body, size);
  req->body_size = size;

  char size_str[32];
  snprintf(size_str, sizeof(size_str), "%zu", size);
  fl_http_headers_set(req->headers, "Content-Length", size_str);

  fprintf(stderr, "[http] Request body set: %zu bytes\n", size);
  return 0;
}

char* fl_http_request_to_string(fl_http_request_t *req) {
  if (!req) return NULL;

  size_t total_size = 1024 + req->body_size;
  char *str = (char*)malloc(total_size);
  if (!str) return NULL;

  int pos = snprintf(str, total_size, "%s %s HTTP/1.1\r\n",
                     fl_http_method_to_string(req->method),
                     req->path ? req->path : "/");

  if (req->query) {
    pos += snprintf(&str[pos], total_size - pos, "?%s", req->query);
  }

  snprintf(&str[pos], total_size - pos, "\r\n");
  pos = strlen(str);

  /* Add headers */
  for (int i = 0; i < req->headers->count; i++) {
    pos += snprintf(&str[pos], total_size - pos, "%s: %s\r\n",
                    req->headers->names[i], req->headers->values[i]);
  }

  pos += snprintf(&str[pos], total_size - pos, "\r\n");

  /* Add body */
  if (req->body && req->body_size > 0) {
    memcpy(&str[pos], req->body, req->body_size);
  }

  return str;
}

/* ===== HTTP Response ===== */

fl_http_response_t* fl_http_response_create(int status_code) {
  fl_http_response_t *resp = (fl_http_response_t*)malloc(sizeof(fl_http_response_t));
  if (!resp) return NULL;

  resp->status_code = status_code;
  resp->status_message = (char*)malloc(strlen(fl_http_status_to_message(status_code)) + 1);
  strcpy(resp->status_message, fl_http_status_to_message(status_code));
  resp->headers = fl_http_headers_create(20);
  resp->body = NULL;
  resp->body_size = 0;

  fprintf(stderr, "[http] Response created: %d %s\n", status_code,
          resp->status_message);

  return resp;
}

void fl_http_response_destroy(fl_http_response_t *resp) {
  if (!resp) return;

  free(resp->status_message);
  free(resp->body);
  if (resp->headers) fl_http_headers_destroy(resp->headers);
  free(resp);

  fprintf(stderr, "[http] Response destroyed\n");
}

int fl_http_response_set_body(fl_http_response_t *resp, const uint8_t *body,
                              size_t size) {
  if (!resp || !body) return -1;

  resp->body = (uint8_t*)malloc(size);
  if (!resp->body) return -1;

  memcpy(resp->body, body, size);
  resp->body_size = size;

  char size_str[32];
  snprintf(size_str, sizeof(size_str), "%zu", size);
  fl_http_headers_set(resp->headers, "Content-Length", size_str);

  fprintf(stderr, "[http] Response body set: %zu bytes\n", size);
  return 0;
}

char* fl_http_response_to_string(fl_http_response_t *resp) {
  if (!resp) return NULL;

  size_t total_size = 1024 + resp->body_size;
  char *str = (char*)malloc(total_size);
  if (!str) return NULL;

  int pos = snprintf(str, total_size, "HTTP/1.1 %d %s\r\n",
                     resp->status_code, resp->status_message);

  /* Add headers */
  for (int i = 0; i < resp->headers->count; i++) {
    pos += snprintf(&str[pos], total_size - pos, "%s: %s\r\n",
                    resp->headers->names[i], resp->headers->values[i]);
  }

  pos += snprintf(&str[pos], total_size - pos, "\r\n");

  /* Add body */
  if (resp->body && resp->body_size > 0) {
    memcpy(&str[pos], resp->body, resp->body_size);
  }

  return str;
}

/* ===== HTTP Client ===== */

fl_http_client_t* fl_http_client_create(const char *host, uint16_t port,
                                        int use_ssl) {
  if (!host) return NULL;

  fl_http_client_t *client = (fl_http_client_t*)malloc(sizeof(fl_http_client_t));
  if (!client) return NULL;

  client->host = (char*)malloc(strlen(host) + 1);
  strcpy(client->host, host);
  client->port = port;
  client->use_ssl = use_ssl;
  client->socket_fd = -1;
  client->timeout_ms = 5000;

  fprintf(stderr, "[http] Client created: %s:%d %s\n", host, port,
          use_ssl ? "HTTPS" : "HTTP");

  return client;
}

void fl_http_client_destroy(fl_http_client_t *client) {
  if (!client) return;

  fl_http_client_close(client);
  free(client->host);
  free(client);

  fprintf(stderr, "[http] Client destroyed\n");
}

int fl_http_client_connect(fl_http_client_t *client) {
  if (!client) return -1;

  struct sockaddr_in addr;
  struct hostent *host_info;

  host_info = gethostbyname(client->host);
  if (!host_info) {
    fprintf(stderr, "[http] Could not resolve host: %s\n", client->host);
    return -1;
  }

  client->socket_fd = socket(AF_INET, SOCK_STREAM, 0);
  if (client->socket_fd < 0) {
    fprintf(stderr, "[http] Socket creation failed\n");
    return -1;
  }

  memset(&addr, 0, sizeof(addr));
  addr.sin_family = AF_INET;
  addr.sin_port = htons(client->port);
  memcpy(&addr.sin_addr, host_info->h_addr, host_info->h_length);

  if (connect(client->socket_fd, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
    fprintf(stderr, "[http] Connection failed\n");
    close(client->socket_fd);
    client->socket_fd = -1;
    return -1;
  }

  fprintf(stderr, "[http] Connected to %s:%d\n", client->host, client->port);
  return 0;
}

fl_http_response_t* fl_http_client_request(fl_http_client_t *client,
                                           fl_http_request_t *req) {
  if (!client || !req) return NULL;

  /* Ensure connection */
  if (client->socket_fd < 0) {
    if (fl_http_client_connect(client) < 0) return NULL;
  }

  /* Send request */
  char *req_str = fl_http_request_to_string(req);
  if (!req_str) return NULL;

  ssize_t sent = send(client->socket_fd, req_str, strlen(req_str), 0);
  free(req_str);

  if (sent < 0) {
    fprintf(stderr, "[http] Send failed\n");
    return NULL;
  }

  pthread_mutex_lock(&http_mutex);
  global_stats.requests_sent++;
  global_stats.bytes_sent += sent;
  pthread_mutex_unlock(&http_mutex);

  /* Receive response (simplified: just parse status line for now) */
  uint8_t buffer[4096];
  ssize_t received = recv(client->socket_fd, buffer, sizeof(buffer), 0);
  if (received < 0) {
    fprintf(stderr, "[http] Recv failed\n");
    return NULL;
  }

  pthread_mutex_lock(&http_mutex);
  global_stats.responses_received++;
  global_stats.bytes_received += received;
  pthread_mutex_unlock(&http_mutex);

  /* Parse response (simplified: extract status code from first line) */
  int status_code = 200;  /* Default */
  if (received > 12) {
    sscanf((char*)buffer, "HTTP/1.1 %d", &status_code);
  }

  fl_http_response_t *resp = fl_http_response_create(status_code);
  if (resp && received > 0) {
    /* Find body start (after double CRLF) */
    const char *body_start = strstr((char*)buffer, "\r\n\r\n");
    if (body_start) {
      body_start += 4;
      size_t body_size = received - (body_start - (char*)buffer);
      if (body_size > 0) {
        fl_http_response_set_body(resp, (uint8_t*)body_start, body_size);
      }
    }
  }

  fprintf(stderr, "[http] Response: %d\n", status_code);
  return resp;
}

int fl_http_client_send(fl_http_client_t *client, const char *request_str) {
  if (!client || !request_str) return -1;

  ssize_t sent = send(client->socket_fd, request_str, strlen(request_str), 0);
  if (sent < 0) {
    fprintf(stderr, "[http] Send failed\n");
    return -1;
  }

  return (int)sent;
}

char* fl_http_client_recv(fl_http_client_t *client, size_t *size) {
  if (!client || !size) return NULL;

  uint8_t *buffer = (uint8_t*)malloc(4096);
  if (!buffer) return NULL;

  ssize_t received = recv(client->socket_fd, buffer, 4096, 0);
  if (received <= 0) {
    free(buffer);
    return NULL;
  }

  *size = (size_t)received;
  return (char*)buffer;
}

int fl_http_client_close(fl_http_client_t *client) {
  if (!client) return -1;

  if (client->socket_fd >= 0) {
    close(client->socket_fd);
    client->socket_fd = -1;
  }

  fprintf(stderr, "[http] Client closed\n");
  return 0;
}

/* ===== HTTP Server (Stub) ===== */

struct fl_http_server_t {
  uint16_t port;
  int running;
};

fl_http_server_t* fl_http_server_create(uint16_t port) {
  fl_http_server_t *server = (fl_http_server_t*)malloc(sizeof(fl_http_server_t));
  if (!server) return NULL;

  server->port = port;
  server->running = 0;

  fprintf(stderr, "[http] Server created: port=%d\n", port);
  return server;
}

void fl_http_server_destroy(fl_http_server_t *server) {
  if (!server) return;
  free(server);
  fprintf(stderr, "[http] Server destroyed\n");
}

int fl_http_server_start(fl_http_server_t *server) {
  if (!server) return -1;
  server->running = 1;
  fprintf(stderr, "[http] Server started: port=%d\n", server->port);
  return 0;
}

int fl_http_server_stop(fl_http_server_t *server) {
  if (!server) return -1;
  server->running = 0;
  fprintf(stderr, "[http] Server stopped\n");
  return 0;
}

int fl_http_server_register_handler(fl_http_server_t *server, const char *path,
                                    fl_http_method_t method,
                                    fl_http_handler_t handler, void *userdata) {
  if (!server || !path || !handler) return -1;
  fprintf(stderr, "[http] Handler registered: %s %s\n",
          fl_http_method_to_string(method), path);
  return 0;
}

int fl_http_server_is_running(fl_http_server_t *server) {
  return server ? server->running : 0;
}

/* ===== HTTP Parser ===== */

fl_http_request_t* fl_http_parse_request(const char *raw_request) {
  if (!raw_request) return NULL;

  /* Simplified: just parse the request line */
  fl_http_method_t method = FL_HTTP_GET;
  char uri[256] = "/";

  sscanf(raw_request, "%*s %255s", uri);

  return fl_http_request_create(method, uri);
}

fl_http_response_t* fl_http_parse_response(const char *raw_response) {
  if (!raw_response) return NULL;

  int status_code = 200;
  sscanf(raw_response, "HTTP/1.1 %d", &status_code);

  return fl_http_response_create(status_code);
}

/* ===== Utilities ===== */

const char* fl_http_method_to_string(fl_http_method_t method) {
  switch (method) {
    case FL_HTTP_GET: return "GET";
    case FL_HTTP_POST: return "POST";
    case FL_HTTP_PUT: return "PUT";
    case FL_HTTP_DELETE: return "DELETE";
    case FL_HTTP_HEAD: return "HEAD";
    case FL_HTTP_PATCH: return "PATCH";
    case FL_HTTP_OPTIONS: return "OPTIONS";
    default: return "UNKNOWN";
  }
}

fl_http_method_t fl_http_string_to_method(const char *method_str) {
  if (!method_str) return FL_HTTP_GET;
  if (strcmp(method_str, "POST") == 0) return FL_HTTP_POST;
  if (strcmp(method_str, "PUT") == 0) return FL_HTTP_PUT;
  if (strcmp(method_str, "DELETE") == 0) return FL_HTTP_DELETE;
  if (strcmp(method_str, "HEAD") == 0) return FL_HTTP_HEAD;
  if (strcmp(method_str, "PATCH") == 0) return FL_HTTP_PATCH;
  if (strcmp(method_str, "OPTIONS") == 0) return FL_HTTP_OPTIONS;
  return FL_HTTP_GET;
}

const char* fl_http_status_to_message(int status_code) {
  switch (status_code) {
    case 200: return "OK";
    case 201: return "Created";
    case 204: return "No Content";
    case 301: return "Moved Permanently";
    case 302: return "Found";
    case 304: return "Not Modified";
    case 400: return "Bad Request";
    case 401: return "Unauthorized";
    case 403: return "Forbidden";
    case 404: return "Not Found";
    case 405: return "Method Not Allowed";
    case 500: return "Internal Server Error";
    case 502: return "Bad Gateway";
    case 503: return "Service Unavailable";
    default: return "Unknown";
  }
}

int fl_http_is_success(int status_code) {
  return status_code >= 200 && status_code < 300 ? 1 : 0;
}

int fl_http_is_redirect(int status_code) {
  return status_code >= 300 && status_code < 400 ? 1 : 0;
}

int fl_http_is_client_error(int status_code) {
  return status_code >= 400 && status_code < 500 ? 1 : 0;
}

int fl_http_is_server_error(int status_code) {
  return status_code >= 500 && status_code < 600 ? 1 : 0;
}

/* ===== Statistics ===== */

fl_http_stats_t* fl_http_get_stats(void) {
  fl_http_stats_t *stats = (fl_http_stats_t*)malloc(sizeof(fl_http_stats_t));
  if (!stats) return NULL;

  pthread_mutex_lock(&http_mutex);
  memcpy(stats, &global_stats, sizeof(fl_http_stats_t));
  pthread_mutex_unlock(&http_mutex);

  return stats;
}

void fl_http_reset_stats(void) {
  pthread_mutex_lock(&http_mutex);
  memset(&global_stats, 0, sizeof(fl_http_stats_t));
  pthread_mutex_unlock(&http_mutex);

  fprintf(stderr, "[http] Stats reset\n");
}
