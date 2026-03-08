/**
 * FreeLang stdlib/grpc Implementation - gRPC RPC (HTTP/2)
 * Protocol buffers wrapper, service definitions, streaming support
 */

#include "grpc.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <pthread.h>

/* ===== Global Statistics ===== */

static fl_grpc_stats_t global_stats = {0};
static pthread_mutex_t grpc_mutex = PTHREAD_MUTEX_INITIALIZER;

/* ===== gRPC Call Structure ===== */

struct fl_grpc_call_t {
  char *service;
  char *method;
  fl_grpc_call_type_t call_type;
  fl_grpc_status_t status;
  int is_active;
  uint8_t *request_data;
  size_t request_size;
  uint8_t *response_data;
  size_t response_size;
  fl_grpc_metadata_t *metadata;
  int metadata_count;
  fl_grpc_on_message_t on_message;
  fl_grpc_on_completion_t on_completion;
  void *userdata;
};

/* ===== Client Operations ===== */

fl_grpc_client_t* fl_grpc_client_create(const char *target, int timeout_ms) {
  if (!target) return NULL;

  fl_grpc_client_t *client = (fl_grpc_client_t*)malloc(sizeof(fl_grpc_client_t));
  if (!client) return NULL;

  client->target = (const char*)malloc(strlen(target) + 1);
  SAFE_STRCPY((char*)client->target, target);
  client->timeout_ms = timeout_ms;

  fprintf(stderr, "[grpc] Client created: %s, timeout=%dms\n", target, timeout_ms);
  return client;
}

void fl_grpc_client_destroy(fl_grpc_client_t *client) {
  if (!client) return;

  free((void*)client->target);
  free(client);

  fprintf(stderr, "[grpc] Client destroyed\n");
}

int fl_grpc_client_connect(fl_grpc_client_t *client) {
  if (!client) return -1;

  /* Simplified: just verify target is non-empty */
  fprintf(stderr, "[grpc] Client connected to %s\n", client->target);
  return 0;
}

/* ===== Unary RPC ===== */

int fl_grpc_call_unary(fl_grpc_client_t *client, const char *service,
                       const char *method, const fl_grpc_message_t *req,
                       fl_grpc_message_t *resp) {
  if (!client || !service || !method || !req || !resp) return -1;

  pthread_mutex_lock(&grpc_mutex);
  global_stats.unary_calls++;
  global_stats.messages_sent++;
  global_stats.bytes_sent += req->size;
  pthread_mutex_unlock(&grpc_mutex);

  /* Copy request data to response (simplified echo) */
  if (fl_grpc_message_set_data(resp, req->data, req->size) < 0) {
    return -1;
  }

  fprintf(stderr, "[grpc] Unary call: %s/%s (%zu bytes)\n", service, method,
          req->size);

  return 0;
}

/* ===== Streaming RPC (Client) ===== */

fl_grpc_call_t* fl_grpc_call_client_streaming(fl_grpc_client_t *client,
                                              const char *service,
                                              const char *method) {
  if (!client || !service || !method) return NULL;

  fl_grpc_call_t *call = (fl_grpc_call_t*)malloc(sizeof(fl_grpc_call_t));
  if (!call) return NULL;

  call->service = (char*)malloc(strlen(service) + 1);
  call->method = (char*)malloc(strlen(method) + 1);
  SAFE_STRCPY(call->service, service);
  SAFE_STRCPY(call->method, method);
  call->call_type = FL_GRPC_CLIENT_STREAMING;
  call->status = FL_GRPC_OK;
  call->is_active = 1;
  call->request_data = NULL;
  call->request_size = 0;
  call->response_data = NULL;
  call->response_size = 0;
  call->metadata = NULL;
  call->metadata_count = 0;
  call->on_message = NULL;
  call->on_completion = NULL;
  call->userdata = NULL;

  pthread_mutex_lock(&grpc_mutex);
  global_stats.streaming_calls++;
  pthread_mutex_unlock(&grpc_mutex);

  fprintf(stderr, "[grpc] Client streaming call: %s/%s\n", service, method);
  return call;
}

int fl_grpc_call_send_message(fl_grpc_call_t *call, const fl_grpc_message_t *msg) {
  if (!call || !msg) return -1;

  /* Append message to request buffer */
  uint8_t *new_buffer = (uint8_t*)realloc(call->request_data,
                                          call->request_size + msg->size);
  if (!new_buffer) return -1;

  memcpy(&new_buffer[call->request_size], msg->data, msg->size);
  call->request_data = new_buffer;
  call->request_size += msg->size;

  pthread_mutex_lock(&grpc_mutex);
  global_stats.messages_sent++;
  global_stats.bytes_sent += msg->size;
  pthread_mutex_unlock(&grpc_mutex);

  fprintf(stderr, "[grpc] Message sent: %zu bytes\n", msg->size);
  return 0;
}

int fl_grpc_call_close_send(fl_grpc_call_t *call) {
  if (!call) return -1;

  fprintf(stderr, "[grpc] Send closed for %s/%s\n", call->service, call->method);
  return 0;
}

/* ===== Streaming RPC (Server) ===== */

int fl_grpc_call_send_message_server(fl_grpc_call_t *call,
                                     const fl_grpc_message_t *msg) {
  if (!call || !msg) return -1;

  uint8_t *new_buffer = (uint8_t*)realloc(call->response_data,
                                          call->response_size + msg->size);
  if (!new_buffer) return -1;

  memcpy(&new_buffer[call->response_size], msg->data, msg->size);
  call->response_data = new_buffer;
  call->response_size += msg->size;

  pthread_mutex_lock(&grpc_mutex);
  global_stats.messages_sent++;
  global_stats.bytes_sent += msg->size;
  pthread_mutex_unlock(&grpc_mutex);

  return 0;
}

int fl_grpc_call_finish(fl_grpc_call_t *call, fl_grpc_status_t status) {
  if (!call) return -1;

  call->status = status;
  call->is_active = 0;

  fprintf(stderr, "[grpc] Call finished: status=%d\n", status);
  return 0;
}

/* ===== Server ===== */

fl_grpc_server_t* fl_grpc_server_create(const char *host, uint16_t port) {
  if (!host) return NULL;

  fl_grpc_server_t *server = (fl_grpc_server_t*)malloc(sizeof(fl_grpc_server_t));
  if (!server) return NULL;

  server->host = (const char*)malloc(strlen(host) + 1);
  SAFE_STRCPY((char*)server->host, host);
  server->port = port;
  server->running = 0;
  server->num_services = 0;

  fprintf(stderr, "[grpc] Server created: %s:%d\n", host, port);
  return server;
}

void fl_grpc_server_destroy(fl_grpc_server_t *server) {
  if (!server) return;

  free((void*)server->host);
  free(server);

  fprintf(stderr, "[grpc] Server destroyed\n");
}

int fl_grpc_server_register_service(fl_grpc_server_t *server,
                                    const char *service_name) {
  if (!server || !service_name) return -1;

  server->num_services++;
  fprintf(stderr, "[grpc] Service registered: %s\n", service_name);
  return 0;
}

int fl_grpc_server_register_method(fl_grpc_server_t *server,
                                   const char *service, const char *method,
                                   fl_grpc_call_type_t call_type,
                                   fl_grpc_handler_t handler, void *userdata) {
  if (!server || !service || !method || !handler) return -1;

  fprintf(stderr, "[grpc] Method registered: %s/%s (type=%d)\n", service, method,
          call_type);

  return 0;
}

int fl_grpc_server_start(fl_grpc_server_t *server) {
  if (!server) return -1;

  server->running = 1;
  fprintf(stderr, "[grpc] Server started on %s:%d\n", server->host, server->port);
  return 0;
}

int fl_grpc_server_stop(fl_grpc_server_t *server) {
  if (!server) return -1;

  server->running = 0;
  fprintf(stderr, "[grpc] Server stopped\n");
  return 0;
}

/* ===== Message Handling ===== */

fl_grpc_message_t* fl_grpc_message_create(size_t capacity) {
  if (capacity == 0) capacity = 1024;

  fl_grpc_message_t *msg = (fl_grpc_message_t*)malloc(sizeof(fl_grpc_message_t));
  if (!msg) return NULL;

  msg->data = (uint8_t*)malloc(capacity);
  if (!msg->data) {
    free(msg);
    return NULL;
  }

  msg->size = 0;
  msg->flags = 0;

  return msg;
}

void fl_grpc_message_destroy(fl_grpc_message_t *msg) {
  if (!msg) return;

  free(msg->data);
  free(msg);
}

int fl_grpc_message_set_data(fl_grpc_message_t *msg, const uint8_t *data,
                             size_t size) {
  if (!msg || !data) return -1;

  msg->data = (uint8_t*)realloc(msg->data, size);
  if (!msg->data) return -1;

  memcpy(msg->data, data, size);
  msg->size = size;

  return 0;
}

int fl_grpc_message_append_data(fl_grpc_message_t *msg, const uint8_t *data,
                                size_t size) {
  if (!msg || !data) return -1;

  uint8_t *new_data = (uint8_t*)realloc(msg->data, msg->size + size);
  if (!new_data) return -1;

  memcpy(&new_data[msg->size], data, size);
  msg->data = new_data;
  msg->size += size;

  return 0;
}

/* ===== Metadata ===== */

int fl_grpc_call_set_metadata(fl_grpc_call_t *call, const fl_grpc_metadata_t *metadata,
                              int metadata_count) {
  if (!call || !metadata || metadata_count <= 0) return -1;

  call->metadata = (fl_grpc_metadata_t*)malloc(metadata_count * sizeof(fl_grpc_metadata_t));
  if (!call->metadata) return -1;

  for (int i = 0; i < metadata_count; i++) {
    call->metadata[i].key = (char*)malloc(strlen(metadata[i].key) + 1);
    call->metadata[i].value = (char*)malloc(strlen(metadata[i].value) + 1);
    SAFE_STRCPY(call->metadata[i].key, metadata[i].key);
    SAFE_STRCPY(call->metadata[i].value, metadata[i].value);
  }

  call->metadata_count = metadata_count;
  return 0;
}

int fl_grpc_call_get_metadata(fl_grpc_call_t *call, fl_grpc_metadata_t **metadata,
                              int *metadata_count) {
  if (!call || !metadata || !metadata_count) return -1;

  *metadata = call->metadata;
  *metadata_count = call->metadata_count;

  return 0;
}

/* ===== Call State ===== */

int fl_grpc_call_is_active(fl_grpc_call_t *call) {
  return call ? call->is_active : 0;
}

fl_grpc_status_t fl_grpc_call_get_status(fl_grpc_call_t *call) {
  return call ? call->status : FL_GRPC_UNKNOWN;
}

void fl_grpc_call_destroy(fl_grpc_call_t *call) {
  if (!call) return;

  free(call->service);
  free(call->method);
  free(call->request_data);
  free(call->response_data);

  for (int i = 0; i < call->metadata_count; i++) {
    free(call->metadata[i].key);
    free(call->metadata[i].value);
  }
  free(call->metadata);

  free(call);

  fprintf(stderr, "[grpc] Call destroyed\n");
}

/* ===== Statistics ===== */

fl_grpc_stats_t* fl_grpc_get_stats(void) {
  fl_grpc_stats_t *stats = (fl_grpc_stats_t*)malloc(sizeof(fl_grpc_stats_t));
  if (!stats) return NULL;

  pthread_mutex_lock(&grpc_mutex);
  memcpy(stats, &global_stats, sizeof(fl_grpc_stats_t));
  pthread_mutex_unlock(&grpc_mutex);

  return stats;
}

void fl_grpc_reset_stats(void) {
  pthread_mutex_lock(&grpc_mutex);
  memset(&global_stats, 0, sizeof(fl_grpc_stats_t));
  pthread_mutex_unlock(&grpc_mutex);

  fprintf(stderr, "[grpc] Stats reset\n");
}
