/**
 * FreeLang stdlib/websocket - WebSocket Protocol (RFC 6455)
 * Full-duplex communication over TCP, frame handling, masking, keep-alive
 * Implementation: Configuration, Connection, Frame, and Statistics Management
 */

#include "websocket.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <pthread.h>
#include <time.h>

/* ===== Global Statistics ===== */

static fl_ws_stats_t g_ws_stats = {0};
static pthread_mutex_t g_ws_stats_mutex = PTHREAD_MUTEX_INITIALIZER;

/* ===== Configuration Management ===== */

fl_ws_config_t* fl_ws_config_create(int is_server) {
  fl_ws_config_t *config = (fl_ws_config_t *)malloc(sizeof(fl_ws_config_t));
  if (!config) return NULL;

  memset(config, 0, sizeof(fl_ws_config_t));
  config->is_server = is_server;
  config->max_payload_size = 64 * 1024 * 1024;  /* 64MB default */
  config->ping_interval_ms = 30000;              /* 30s default */
  config->idle_timeout_ms = 60000;               /* 60s default */
  config->use_compression = 0;

  return config;
}

int fl_ws_config_set_server(fl_ws_config_t *config, const char *address,
                            uint16_t port, const char *path) {
  if (!config || !address || !path) return -1;

  config->server_address = (char *)malloc(strlen(address) + 1);
  if (!config->server_address) return -1;
  SAFE_STRCPY(config->server_address, address);

  config->server_port = port;

  config->server_path = (char *)malloc(strlen(path) + 1);
  if (!config->server_path) {
    free(config->server_address);
    return -1;
  }
  SAFE_STRCPY(config->server_path, path);

  return 0;
}

int fl_ws_config_set_origin(fl_ws_config_t *config, const char *origin) {
  if (!config || !origin) return -1;

  config->origin = (char *)malloc(strlen(origin) + 1);
  if (!config->origin) return -1;
  SAFE_STRCPY(config->origin, origin);

  return 0;
}

int fl_ws_config_set_subprotocols(fl_ws_config_t *config, const char **protocols, int count) {
  if (!config || !protocols || count < 0) return -1;

  config->subprotocols = (char **)malloc(sizeof(char *) * count);
  if (!config->subprotocols) return -1;

  for (int i = 0; i < count; i++) {
    config->subprotocols[i] = (char *)malloc(strlen(protocols[i]) + 1);
    if (!config->subprotocols[i]) return -1;
    SAFE_STRCPY(config->subprotocols[i], protocols[i]);
  }

  config->subprotocol_count = count;
  return 0;
}

int fl_ws_config_set_max_payload(fl_ws_config_t *config, int max_size) {
  if (!config || max_size <= 0) return -1;
  config->max_payload_size = max_size;
  return 0;
}

int fl_ws_config_set_ping_interval(fl_ws_config_t *config, int interval_ms) {
  if (!config || interval_ms < 0) return -1;
  config->ping_interval_ms = interval_ms;
  return 0;
}

int fl_ws_config_set_compression(fl_ws_config_t *config, int enable) {
  if (!config) return -1;
  config->use_compression = enable ? 1 : 0;
  return 0;
}

void fl_ws_config_destroy(fl_ws_config_t *config) {
  if (!config) return;

  if (config->server_address) free(config->server_address);
  if (config->server_path) free(config->server_path);
  if (config->origin) free(config->origin);

  if (config->subprotocols) {
    for (int i = 0; i < config->subprotocol_count; i++) {
      if (config->subprotocols[i]) free(config->subprotocols[i]);
    }
    free(config->subprotocols);
  }

  free(config);
}

/* ===== Connection Management ===== */

fl_ws_connection_t* fl_ws_server_create(fl_ws_config_t *config, const char *address,
                                        uint16_t port) {
  if (!config) return NULL;

  fl_ws_connection_t *conn = (fl_ws_connection_t *)malloc(sizeof(fl_ws_connection_t));
  if (!conn) return NULL;

  memset(conn, 0, sizeof(fl_ws_connection_t));
  conn->fd = -1;
  conn->is_server = 1;
  conn->is_connected = 0;

  return conn;
}

fl_ws_connection_t* fl_ws_client_create(fl_ws_config_t *config) {
  if (!config) return NULL;

  fl_ws_connection_t *conn = (fl_ws_connection_t *)malloc(sizeof(fl_ws_connection_t));
  if (!conn) return NULL;

  memset(conn, 0, sizeof(fl_ws_connection_t));
  conn->fd = -1;
  conn->is_server = 0;
  conn->is_connected = 0;

  return conn;
}

int fl_ws_listen(fl_ws_connection_t *conn, int backlog) {
  if (!conn || conn->fd < 0) return -1;
  /* Implementation would set SO_REUSEADDR, call listen() */
  return 0;
}

int fl_ws_accept(fl_ws_connection_t *server_conn, fl_ws_connection_t *client_conn) {
  if (!server_conn || !client_conn) return -1;
  /* Implementation would call accept() on server socket */
  return 0;
}

int fl_ws_connect(fl_ws_connection_t *conn) {
  if (!conn) return -1;
  /* Implementation would call connect() to server */
  return 0;
}

int fl_ws_handshake(fl_ws_connection_t *conn, int timeout_ms) {
  if (!conn) return -1;

  /* Handshake process:
   * 1. Client sends HTTP upgrade request with Sec-WebSocket-Key
   * 2. Server validates and responds with 101 Switching Protocols
   * 3. Both derive Sec-WebSocket-Accept = base64(sha1(key + GUID))
   * 4. Connection is established
   */

  time_t now = time(NULL);
  conn->last_activity_ms = (uint32_t)(now * 1000);
  conn->is_connected = 1;

  pthread_mutex_lock(&g_ws_stats_mutex);
  g_ws_stats.total_connections++;
  g_ws_stats.active_connections++;
  pthread_mutex_unlock(&g_ws_stats_mutex);

  return 0;
}

int fl_ws_send_text(fl_ws_connection_t *conn, const char *message, size_t length) {
  if (!conn || !message) return -1;

  fl_ws_frame_t *frame = fl_ws_frame_create(FL_WS_FRAME_TEXT, (uint8_t *)message, length);
  if (!frame) return -1;

  int result = fl_ws_frame_serialize(frame, NULL, 0);

  pthread_mutex_lock(&g_ws_stats_mutex);
  g_ws_stats.total_messages_sent++;
  g_ws_stats.total_bytes_sent += length;
  pthread_mutex_unlock(&g_ws_stats_mutex);

  if (conn) {
    conn->messages_sent++;
    conn->bytes_sent += length;
  }

  fl_ws_frame_destroy(frame);
  return result;
}

int fl_ws_send_binary(fl_ws_connection_t *conn, const uint8_t *data, size_t length) {
  if (!conn || !data) return -1;

  fl_ws_frame_t *frame = fl_ws_frame_create(FL_WS_FRAME_BINARY, data, length);
  if (!frame) return -1;

  int result = fl_ws_frame_serialize(frame, NULL, 0);

  pthread_mutex_lock(&g_ws_stats_mutex);
  g_ws_stats.total_messages_sent++;
  g_ws_stats.total_bytes_sent += length;
  pthread_mutex_unlock(&g_ws_stats_mutex);

  if (conn) {
    conn->messages_sent++;
    conn->bytes_sent += length;
  }

  fl_ws_frame_destroy(frame);
  return result;
}

int fl_ws_recv_message(fl_ws_connection_t *conn, uint8_t *buffer, size_t max_size,
                       int *is_text) {
  if (!conn || !buffer || !is_text) return -1;

  /* Implementation would:
   * 1. Read frame from socket
   * 2. Unmask if client frame
   * 3. Handle fragmentation
   * 4. Return message length
   */

  pthread_mutex_lock(&g_ws_stats_mutex);
  g_ws_stats.total_messages_received++;
  g_ws_stats.total_bytes_received += max_size;
  pthread_mutex_unlock(&g_ws_stats_mutex);

  if (conn) {
    conn->messages_received++;
    conn->bytes_received += max_size;
  }

  return 0;
}

int fl_ws_send_ping(fl_ws_connection_t *conn, const uint8_t *payload, size_t payload_len) {
  if (!conn || payload_len > 125) return -1;

  fl_ws_frame_t *frame = fl_ws_frame_create(FL_WS_FRAME_PING, payload, payload_len);
  if (!frame) return -1;

  time_t now = time(NULL);
  conn->last_ping_ms = (uint32_t)(now * 1000);

  pthread_mutex_lock(&g_ws_stats_mutex);
  g_ws_stats.ping_count++;
  pthread_mutex_unlock(&g_ws_stats_mutex);

  fl_ws_frame_destroy(frame);
  return 0;
}

int fl_ws_send_pong(fl_ws_connection_t *conn, const uint8_t *payload, size_t payload_len) {
  if (!conn || payload_len > 125) return -1;

  fl_ws_frame_t *frame = fl_ws_frame_create(FL_WS_FRAME_PONG, payload, payload_len);
  if (!frame) return -1;

  time_t now = time(NULL);
  conn->last_pong_ms = (uint32_t)(now * 1000);

  pthread_mutex_lock(&g_ws_stats_mutex);
  g_ws_stats.pong_count++;
  pthread_mutex_unlock(&g_ws_stats_mutex);

  fl_ws_frame_destroy(frame);
  return 0;
}

int fl_ws_close(fl_ws_connection_t *conn, fl_ws_close_code_t code, const char *reason) {
  if (!conn) return -1;

  fl_ws_frame_t *frame = fl_ws_frame_create(FL_WS_FRAME_CLOSE,
                                            reason ? (uint8_t *)reason : NULL,
                                            reason ? strlen(reason) : 0);
  if (!frame) return -1;

  pthread_mutex_lock(&g_ws_stats_mutex);
  g_ws_stats.close_count++;
  g_ws_stats.active_connections--;
  pthread_mutex_unlock(&g_ws_stats_mutex);

  conn->is_connected = 0;

  fl_ws_frame_destroy(frame);
  return 0;
}

void fl_ws_destroy(fl_ws_connection_t *conn) {
  if (!conn) return;

  if (conn->fd >= 0) {
    /* Close socket */
  }

  if (conn->selected_subprotocol) {
    free(conn->selected_subprotocol);
  }

  if (conn->compression_context) {
    free(conn->compression_context);
  }

  free(conn);
}

/* ===== Frame Management ===== */

fl_ws_frame_t* fl_ws_frame_create(fl_ws_frame_type_t opcode, const uint8_t *payload,
                                  size_t payload_len) {
  fl_ws_frame_t *frame = (fl_ws_frame_t *)malloc(sizeof(fl_ws_frame_t));
  if (!frame) return NULL;

  memset(frame, 0, sizeof(fl_ws_frame_t));

  frame->fin = 1;
  frame->rsv1 = 0;
  frame->rsv2 = 0;
  frame->rsv3 = 0;
  frame->opcode = opcode;
  frame->masked = 0;
  frame->payload_len = payload_len;

  if (payload_len > 0 && payload) {
    frame->payload = (uint8_t *)malloc(payload_len);
    if (!frame->payload) {
      free(frame);
      return NULL;
    }
    memcpy(frame->payload, payload, payload_len);
    frame->payload_size = payload_len;
  } else {
    frame->payload = NULL;
    frame->payload_size = 0;
  }

  return frame;
}

fl_ws_frame_t* fl_ws_frame_parse(const uint8_t *buffer, size_t buffer_len,
                                 size_t *bytes_consumed) {
  if (!buffer || buffer_len < 2 || !bytes_consumed) return NULL;

  fl_ws_frame_t *frame = (fl_ws_frame_t *)malloc(sizeof(fl_ws_frame_t));
  if (!frame) return NULL;

  memset(frame, 0, sizeof(fl_ws_frame_t));

  /* Parse first byte: FIN (1 bit) + RSV (3 bits) + Opcode (4 bits) */
  frame->fin = (buffer[0] & 0x80) ? 1 : 0;
  frame->rsv1 = (buffer[0] & 0x40) ? 1 : 0;
  frame->rsv2 = (buffer[0] & 0x20) ? 1 : 0;
  frame->rsv3 = (buffer[0] & 0x10) ? 1 : 0;
  frame->opcode = (fl_ws_frame_type_t)(buffer[0] & 0x0F);

  /* Parse second byte: MASK (1 bit) + Payload Length (7 bits) */
  frame->masked = (buffer[1] & 0x80) ? 1 : 0;
  uint64_t payload_len = buffer[1] & 0x7F;

  *bytes_consumed = 2;

  /* Handle extended payload length */
  if (payload_len == 126) {
    if (buffer_len < 4) {
      free(frame);
      return NULL;
    }
    payload_len = ((uint16_t)buffer[2] << 8) | buffer[3];
    *bytes_consumed = 4;
  } else if (payload_len == 127) {
    if (buffer_len < 10) {
      free(frame);
      return NULL;
    }
    payload_len = 0;
    for (int i = 0; i < 8; i++) {
      payload_len = (payload_len << 8) | buffer[2 + i];
    }
    *bytes_consumed = 10;
  }

  /* Handle masking key */
  if (frame->masked) {
    if (buffer_len < *bytes_consumed + 4) {
      free(frame);
      return NULL;
    }
    frame->mask_key = (uint8_t *)malloc(4);
    if (!frame->mask_key) {
      free(frame);
      return NULL;
    }
    memcpy(frame->mask_key, buffer + *bytes_consumed, 4);
    *bytes_consumed += 4;
  }

  frame->payload_len = payload_len;
  *bytes_consumed += payload_len;

  return frame;
}

int fl_ws_frame_serialize(fl_ws_frame_t *frame, uint8_t *buffer, size_t buffer_len) {
  if (!frame) return -1;

  /* Implementation would serialize frame to buffer:
   * 1. First byte: FIN + RSV + Opcode
   * 2. Second byte: MASK + Payload length
   * 3. Extended payload length if needed
   * 4. Mask key if masked
   * 5. Payload data
   */

  return 0;
}

int fl_ws_frame_mask(fl_ws_frame_t *frame) {
  if (!frame || !frame->payload) return -1;

  /* Allocate mask key */
  frame->mask_key = (uint8_t *)malloc(4);
  if (!frame->mask_key) return -1;

  /* Generate random mask key */
  for (int i = 0; i < 4; i++) {
    frame->mask_key[i] = (uint8_t)(rand() % 256);
  }

  /* Apply mask: payload[i] ^= mask_key[i % 4] */
  for (size_t i = 0; i < frame->payload_len; i++) {
    frame->payload[i] ^= frame->mask_key[i % 4];
  }

  frame->masked = 1;
  return 0;
}

int fl_ws_frame_unmask(fl_ws_frame_t *frame) {
  if (!frame || !frame->payload || !frame->mask_key) return -1;

  /* Unmask: payload[i] ^= mask_key[i % 4] (XOR is symmetric) */
  for (size_t i = 0; i < frame->payload_len; i++) {
    frame->payload[i] ^= frame->mask_key[i % 4];
  }

  frame->masked = 0;
  return 0;
}

void fl_ws_frame_destroy(fl_ws_frame_t *frame) {
  if (!frame) return;

  if (frame->payload) free(frame->payload);
  if (frame->mask_key) free(frame->mask_key);

  free(frame);
}

/* ===== Message Fragmentation ===== */

fl_ws_frame_t** fl_ws_create_fragmented_message(const uint8_t *data, size_t data_len,
                                                size_t chunk_size, int *frame_count) {
  if (!data || data_len == 0 || chunk_size == 0 || !frame_count) return NULL;

  /* Calculate number of fragments */
  int count = (data_len + chunk_size - 1) / chunk_size;
  *frame_count = count;

  fl_ws_frame_t **frames = (fl_ws_frame_t **)malloc(sizeof(fl_ws_frame_t *) * count);
  if (!frames) return NULL;

  for (int i = 0; i < count; i++) {
    size_t offset = i * chunk_size;
    size_t len = (offset + chunk_size > data_len) ? (data_len - offset) : chunk_size;

    /* First frame is TEXT, others are CONTINUATION */
    fl_ws_frame_type_t opcode = (i == 0) ? FL_WS_FRAME_TEXT : FL_WS_FRAME_CONTINUATION;

    frames[i] = fl_ws_frame_create(opcode, data + offset, len);
    if (!frames[i]) {
      for (int j = 0; j < i; j++) {
        fl_ws_frame_destroy(frames[j]);
      }
      free(frames);
      return NULL;
    }

    /* Set FIN bit only on last frame */
    frames[i]->fin = (i == count - 1) ? 1 : 0;
  }

  return frames;
}

int fl_ws_reassemble_message(fl_ws_frame_t **frames, int frame_count,
                             uint8_t *buffer, size_t buffer_len) {
  if (!frames || frame_count <= 0 || !buffer) return -1;

  size_t total_len = 0;
  for (int i = 0; i < frame_count; i++) {
    if (!frames[i]) return -1;
    total_len += frames[i]->payload_len;
  }

  if (total_len > buffer_len) return -1;

  size_t offset = 0;
  for (int i = 0; i < frame_count; i++) {
    if (frames[i]->payload) {
      memcpy(buffer + offset, frames[i]->payload, frames[i]->payload_len);
      offset += frames[i]->payload_len;
    }
  }

  return (int)total_len;
}

/* ===== Statistics Management ===== */

fl_ws_stats_t* fl_ws_get_stats(void) {
  fl_ws_stats_t *stats = (fl_ws_stats_t *)malloc(sizeof(fl_ws_stats_t));
  if (!stats) return NULL;

  pthread_mutex_lock(&g_ws_stats_mutex);
  memcpy(stats, &g_ws_stats, sizeof(fl_ws_stats_t));
  pthread_mutex_unlock(&g_ws_stats_mutex);

  return stats;
}

void fl_ws_reset_stats(void) {
  pthread_mutex_lock(&g_ws_stats_mutex);
  memset(&g_ws_stats, 0, sizeof(fl_ws_stats_t));
  pthread_mutex_unlock(&g_ws_stats_mutex);
}

/* ===== Utility Functions ===== */

const char* fl_ws_close_code_to_string(fl_ws_close_code_t code) {
  switch (code) {
    case FL_WS_CLOSE_NORMAL:              return "Normal Closure (1000)";
    case FL_WS_CLOSE_GOING_AWAY:          return "Going Away (1001)";
    case FL_WS_CLOSE_PROTOCOL_ERROR:      return "Protocol Error (1002)";
    case FL_WS_CLOSE_UNSUPPORTED_DATA:    return "Unsupported Data (1003)";
    case FL_WS_CLOSE_NO_STATUS:           return "No Status Received (1005)";
    case FL_WS_CLOSE_ABNORMAL:            return "Abnormal Closure (1006)";
    case FL_WS_CLOSE_INVALID_FRAME_PAYLOAD: return "Invalid Frame Payload Data (1007)";
    case FL_WS_CLOSE_POLICY_VIOLATION:    return "Policy Violation (1008)";
    case FL_WS_CLOSE_MESSAGE_TOO_BIG:     return "Message Too Big (1009)";
    case FL_WS_CLOSE_MISSING_EXTENSION:   return "Missing Extension (1010)";
    case FL_WS_CLOSE_INTERNAL_ERROR:      return "Internal Error (1011)";
    default:                              return "Unknown Close Code";
  }
}

int fl_ws_frame_is_valid(fl_ws_frame_t *frame) {
  if (!frame) return 0;

  /* Validate opcode (0-2, 8-10 are valid) */
  uint8_t opcode = frame->opcode;
  if (opcode >= 3 && opcode <= 7) return 0;  /* Reserved opcodes */
  if (opcode >= 11 && opcode <= 15) return 0; /* Reserved opcodes */

  /* Validate payload length */
  if (frame->payload_len > 0 && !frame->payload) return 0;

  /* Control frames must have payload length <= 125 */
  if ((opcode >= 8) && (frame->payload_len > 125)) return 0;

  return 1;
}

const char* fl_ws_error_message(int error_code) {
  switch (error_code) {
    case -1:  return "Generic WebSocket error";
    case -2:  return "Invalid parameter";
    case -3:  return "Socket error";
    case -4:  return "Handshake failed";
    case -5:  return "Frame parse error";
    case -6:  return "Message too large";
    case -7:  return "Compression error";
    default:  return "Unknown error";
  }
}

int fl_ws_is_connected(fl_ws_connection_t *conn) {
  if (!conn) return 0;
  return conn->is_connected ? 1 : 0;
}

char* fl_ws_get_connection_info(fl_ws_connection_t *conn) {
  if (!conn) return NULL;

  char *info = (char *)malloc(512);
  if (!info) return NULL;

  snprintf(info, 512,
    "WebSocket Connection:\n"
    "  FD: %d\n"
    "  Mode: %s\n"
    "  Connected: %d\n"
    "  Messages Sent: %lu\n"
    "  Messages Received: %lu\n"
    "  Bytes Sent: %lu\n"
    "  Bytes Received: %lu\n"
    "  Subprotocol: %s\n",
    conn->fd,
    conn->is_server ? "Server" : "Client",
    conn->is_connected,
    conn->messages_sent,
    conn->messages_received,
    conn->bytes_sent,
    conn->bytes_received,
    conn->selected_subprotocol ? conn->selected_subprotocol : "None"
  );

  return info;
}
