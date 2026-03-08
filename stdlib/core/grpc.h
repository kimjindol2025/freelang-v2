/**
 * FreeLang stdlib/grpc - gRPC Remote Procedure Call (HTTP/2)
 * Protocol buffers, service definitions, bidirectional streaming
 */

#ifndef FREELANG_STDLIB_GRPC_H
#define FREELANG_STDLIB_GRPC_H

#include <stdint.h>
#include <stddef.h>

/* ===== gRPC Message Types ===== */

typedef enum {
  FL_GRPC_UNARY = 0,                 /* Single request/response */
  FL_GRPC_SERVER_STREAMING = 1,      /* Request, multiple responses */
  FL_GRPC_CLIENT_STREAMING = 2,      /* Multiple requests, response */
  FL_GRPC_BIDI_STREAMING = 3         /* Bidirectional streaming */
} fl_grpc_call_type_t;

/* ===== gRPC Status Codes ===== */

typedef enum {
  FL_GRPC_OK = 0,
  FL_GRPC_CANCELLED = 1,
  FL_GRPC_UNKNOWN = 2,
  FL_GRPC_INVALID_ARGUMENT = 3,
  FL_GRPC_DEADLINE_EXCEEDED = 4,
  FL_GRPC_NOT_FOUND = 5,
  FL_GRPC_ALREADY_EXISTS = 6,
  FL_GRPC_PERMISSION_DENIED = 7,
  FL_GRPC_RESOURCE_EXHAUSTED = 8,
  FL_GRPC_FAILED_PRECONDITION = 9,
  FL_GRPC_ABORTED = 10,
  FL_GRPC_OUT_OF_RANGE = 11,
  FL_GRPC_UNIMPLEMENTED = 12,
  FL_GRPC_INTERNAL = 13,
  FL_GRPC_UNAVAILABLE = 14,
  FL_GRPC_DATA_LOSS = 15,
  FL_GRPC_UNAUTHENTICATED = 16
} fl_grpc_status_t;

/* ===== gRPC Message ===== */

typedef struct {
  uint8_t *data;
  size_t size;
  int flags;
} fl_grpc_message_t;

/* ===== gRPC Call ===== */

typedef struct fl_grpc_call_t fl_grpc_call_t;

typedef void (*fl_grpc_on_message_t)(fl_grpc_call_t *call,
                                     const fl_grpc_message_t *msg, void *userdata);
typedef void (*fl_grpc_on_completion_t)(fl_grpc_call_t *call,
                                        fl_grpc_status_t status, void *userdata);

/* ===== gRPC Service ===== */

typedef struct fl_grpc_service_t fl_grpc_service_t;
typedef int (*fl_grpc_handler_t)(fl_grpc_call_t *call,
                                 const fl_grpc_message_t *req,
                                 fl_grpc_message_t *resp, void *userdata);

/* ===== gRPC Server ===== */

typedef struct {
  const char *host;
  uint16_t port;
  int running;
  int num_services;
} fl_grpc_server_t;

/* ===== gRPC Client ===== */

typedef struct {
  const char *target;
  int timeout_ms;
} fl_grpc_client_t;

/* ===== gRPC Metadata ===== */

typedef struct {
  char *key;
  char *value;
} fl_grpc_metadata_t;

/* ===== Statistics ===== */

typedef struct {
  uint64_t unary_calls;
  uint64_t streaming_calls;
  uint64_t messages_sent;
  uint64_t messages_received;
  uint64_t bytes_sent;
  uint64_t bytes_received;
  uint64_t call_errors;
} fl_grpc_stats_t;

/* ===== Public API ===== */

/* Client */
fl_grpc_client_t* fl_grpc_client_create(const char *target, int timeout_ms);
void fl_grpc_client_destroy(fl_grpc_client_t *client);
int fl_grpc_client_connect(fl_grpc_client_t *client);

/* Unary RPC */
int fl_grpc_call_unary(fl_grpc_client_t *client, const char *service,
                       const char *method, const fl_grpc_message_t *req,
                       fl_grpc_message_t *resp);

/* Streaming RPC (Client) */
fl_grpc_call_t* fl_grpc_call_client_streaming(fl_grpc_client_t *client,
                                              const char *service,
                                              const char *method);
int fl_grpc_call_send_message(fl_grpc_call_t *call, const fl_grpc_message_t *msg);
int fl_grpc_call_close_send(fl_grpc_call_t *call);

/* Streaming RPC (Server) */
int fl_grpc_call_send_message_server(fl_grpc_call_t *call,
                                     const fl_grpc_message_t *msg);
int fl_grpc_call_finish(fl_grpc_call_t *call, fl_grpc_status_t status);

/* Server */
fl_grpc_server_t* fl_grpc_server_create(const char *host, uint16_t port);
void fl_grpc_server_destroy(fl_grpc_server_t *server);
int fl_grpc_server_register_service(fl_grpc_server_t *server,
                                    const char *service_name);
int fl_grpc_server_register_method(fl_grpc_server_t *server,
                                   const char *service, const char *method,
                                   fl_grpc_call_type_t call_type,
                                   fl_grpc_handler_t handler, void *userdata);
int fl_grpc_server_start(fl_grpc_server_t *server);
int fl_grpc_server_stop(fl_grpc_server_t *server);

/* Message handling */
fl_grpc_message_t* fl_grpc_message_create(size_t capacity);
void fl_grpc_message_destroy(fl_grpc_message_t *msg);
int fl_grpc_message_set_data(fl_grpc_message_t *msg, const uint8_t *data, size_t size);
int fl_grpc_message_append_data(fl_grpc_message_t *msg, const uint8_t *data, size_t size);

/* Metadata */
int fl_grpc_call_set_metadata(fl_grpc_call_t *call, const fl_grpc_metadata_t *metadata,
                              int metadata_count);
int fl_grpc_call_get_metadata(fl_grpc_call_t *call, fl_grpc_metadata_t **metadata,
                              int *metadata_count);

/* Call state */
int fl_grpc_call_is_active(fl_grpc_call_t *call);
fl_grpc_status_t fl_grpc_call_get_status(fl_grpc_call_t *call);
void fl_grpc_call_destroy(fl_grpc_call_t *call);

/* Statistics */
fl_grpc_stats_t* fl_grpc_get_stats(void);
void fl_grpc_reset_stats(void);

#endif /* FREELANG_STDLIB_GRPC_H */
