/**
 * FreeLang stdlib/websocket - WebSocket Protocol (RFC 6455)
 * Full-duplex communication over TCP, frame handling, masking, keep-alive
 */

#ifndef FREELANG_STDLIB_WEBSOCKET_H
#define FREELANG_STDLIB_WEBSOCKET_H

#include <stdint.h>
#include <stddef.h>
#include <time.h>

/* ===== WebSocket Frame Types ===== */

typedef enum {
  FL_WS_FRAME_CONTINUATION = 0x0,
  FL_WS_FRAME_TEXT = 0x1,
  FL_WS_FRAME_BINARY = 0x2,
  FL_WS_FRAME_CLOSE = 0x8,
  FL_WS_FRAME_PING = 0x9,
  FL_WS_FRAME_PONG = 0xa
} fl_ws_frame_type_t;

/* ===== WebSocket Close Codes ===== */

typedef enum {
  FL_WS_CLOSE_NORMAL = 1000,
  FL_WS_CLOSE_GOING_AWAY = 1001,
  FL_WS_CLOSE_PROTOCOL_ERROR = 1002,
  FL_WS_CLOSE_UNSUPPORTED_DATA = 1003,
  FL_WS_CLOSE_NO_STATUS = 1005,
  FL_WS_CLOSE_ABNORMAL = 1006,
  FL_WS_CLOSE_INVALID_FRAME_PAYLOAD = 1007,
  FL_WS_CLOSE_POLICY_VIOLATION = 1008,
  FL_WS_CLOSE_MESSAGE_TOO_BIG = 1009,
  FL_WS_CLOSE_MISSING_EXTENSION = 1010,
  FL_WS_CLOSE_INTERNAL_ERROR = 1011
} fl_ws_close_code_t;

/* ===== WebSocket Frame ===== */

typedef struct {
  int fin;                    /* Final frame flag (0/1) */
  int rsv1, rsv2, rsv3;       /* Reserved bits */
  fl_ws_frame_type_t opcode;  /* Frame type */
  int masked;                 /* Masking flag (0/1) */
  uint8_t *mask_key;          /* 4-byte mask key (client only) */
  uint64_t payload_len;       /* Payload length */
  uint8_t *payload;           /* Payload data */
  size_t payload_size;        /* Allocated payload size */
} fl_ws_frame_t;

/* ===== WebSocket Configuration ===== */

typedef struct {
  int is_server;              /* 1 for server, 0 for client */
  char *server_address;       /* Server IP for client mode */
  uint16_t server_port;       /* Server port */
  char *server_path;          /* WebSocket path (e.g., "/ws") */
  char *origin;               /* Origin header */
  char **subprotocols;        /* Supported subprotocols */
  int subprotocol_count;
  int max_payload_size;       /* Maximum payload size (default 64MB) */
  int ping_interval_ms;       /* Ping interval in milliseconds (0 = disabled) */
  int idle_timeout_ms;        /* Idle connection timeout (default 60s) */
  int use_compression;        /* permessage-deflate support */
} fl_ws_config_t;

/* ===== WebSocket Connection ===== */

typedef struct {
  int fd;                     /* Underlying TCP socket fd */
  int is_server;              /* 1 for server, 0 for client */
  int is_connected;           /* Connection established flag */
  char *selected_subprotocol; /* Negotiated subprotocol */
  uint64_t messages_sent;     /* Total messages sent */
  uint64_t messages_received; /* Total messages received */
  uint64_t bytes_sent;        /* Total bytes sent (including frames) */
  uint64_t bytes_received;    /* Total bytes received */
  uint32_t last_ping_ms;      /* Last ping timestamp */
  uint32_t last_pong_ms;      /* Last pong timestamp */
  uint32_t last_activity_ms;  /* Last frame activity */
  void *compression_context;  /* Compression state (if enabled) */
} fl_ws_connection_t;

/* ===== Statistics ===== */

typedef struct {
  uint64_t total_connections;
  uint64_t active_connections;
  uint64_t total_messages_sent;
  uint64_t total_messages_received;
  uint64_t total_bytes_sent;
  uint64_t total_bytes_received;
  uint32_t ping_count;
  uint32_t pong_count;
  uint32_t close_count;
  uint32_t error_count;
} fl_ws_stats_t;

/* ===== WebSocket Configuration API ===== */

/**
 * Create WebSocket configuration
 * @param is_server: 1 for server, 0 for client
 * @return: WebSocket config or NULL on error
 */
fl_ws_config_t* fl_ws_config_create(int is_server);

/**
 * Set server address for client mode
 * @param config: WebSocket config
 * @param address: Server address
 * @param port: Server port
 * @param path: WebSocket path (e.g., "/ws")
 * @return: 0 on success, -1 on error
 */
int fl_ws_config_set_server(fl_ws_config_t *config, const char *address,
                             uint16_t port, const char *path);

/**
 * Set origin header
 * @param config: WebSocket config
 * @param origin: Origin URL
 * @return: 0 on success, -1 on error
 */
int fl_ws_config_set_origin(fl_ws_config_t *config, const char *origin);

/**
 * Set supported subprotocols
 * @param config: WebSocket config
 * @param protocols: Array of protocol names
 * @param count: Number of protocols
 * @return: 0 on success, -1 on error
 */
int fl_ws_config_set_subprotocols(fl_ws_config_t *config, const char **protocols, int count);

/**
 * Set maximum payload size
 * @param config: WebSocket config
 * @param max_size: Maximum size in bytes (default 64MB)
 * @return: 0 on success, -1 on error
 */
int fl_ws_config_set_max_payload(fl_ws_config_t *config, int max_size);

/**
 * Set ping interval
 * @param config: WebSocket config
 * @param interval_ms: Ping interval in milliseconds (0 = disabled)
 * @return: 0 on success, -1 on error
 */
int fl_ws_config_set_ping_interval(fl_ws_config_t *config, int interval_ms);

/**
 * Enable compression support
 * @param config: WebSocket config
 * @param enable: 1 to enable, 0 to disable
 * @return: 0 on success, -1 on error
 */
int fl_ws_config_set_compression(fl_ws_config_t *config, int enable);

/**
 * Destroy configuration
 * @param config: WebSocket config
 */
void fl_ws_config_destroy(fl_ws_config_t *config);

/* ===== WebSocket Connection API ===== */

/**
 * Create WebSocket server
 * @param config: WebSocket configuration
 * @param address: Bind address
 * @param port: Bind port
 * @return: Connection or NULL on error
 */
fl_ws_connection_t* fl_ws_server_create(fl_ws_config_t *config, const char *address,
                                        uint16_t port);

/**
 * Create WebSocket client
 * @param config: WebSocket configuration
 * @return: Connection or NULL on error
 */
fl_ws_connection_t* fl_ws_client_create(fl_ws_config_t *config);

/**
 * Listen on WebSocket server
 * @param conn: WebSocket connection
 * @param backlog: Connection backlog
 * @return: 0 on success, -1 on error
 */
int fl_ws_listen(fl_ws_connection_t *conn, int backlog);

/**
 * Accept WebSocket client connection
 * @param server_conn: Server connection
 * @param client_conn: Client connection structure
 * @return: 0 on success, -1 on error
 */
int fl_ws_accept(fl_ws_connection_t *server_conn, fl_ws_connection_t *client_conn);

/**
 * Connect to WebSocket server
 * @param conn: WebSocket connection
 * @return: 0 on success, -1 on error
 */
int fl_ws_connect(fl_ws_connection_t *conn);

/**
 * Perform WebSocket handshake
 * @param conn: WebSocket connection
 * @param timeout_ms: Handshake timeout
 * @return: 0 on success, -1 on error
 */
int fl_ws_handshake(fl_ws_connection_t *conn, int timeout_ms);

/**
 * Send text message
 * @param conn: WebSocket connection
 * @param message: Text message (UTF-8)
 * @param length: Message length
 * @return: 0 on success, -1 on error
 */
int fl_ws_send_text(fl_ws_connection_t *conn, const char *message, size_t length);

/**
 * Send binary message
 * @param conn: WebSocket connection
 * @param data: Binary data
 * @param length: Data length
 * @return: 0 on success, -1 on error
 */
int fl_ws_send_binary(fl_ws_connection_t *conn, const uint8_t *data, size_t length);

/**
 * Receive message (auto-detects text/binary)
 * @param conn: WebSocket connection
 * @param buffer: Receive buffer
 * @param max_size: Buffer capacity
 * @param is_text: Output flag (1 = text, 0 = binary)
 * @return: Message length or -1 on error
 */
int fl_ws_recv_message(fl_ws_connection_t *conn, uint8_t *buffer, size_t max_size,
                       int *is_text);

/**
 * Send ping frame
 * @param conn: WebSocket connection
 * @param payload: Ping payload (optional)
 * @param payload_len: Payload length (0-125 bytes)
 * @return: 0 on success, -1 on error
 */
int fl_ws_send_ping(fl_ws_connection_t *conn, const uint8_t *payload, size_t payload_len);

/**
 * Send pong frame
 * @param conn: WebSocket connection
 * @param payload: Pong payload (optional)
 * @param payload_len: Payload length (0-125 bytes)
 * @return: 0 on success, -1 on error
 */
int fl_ws_send_pong(fl_ws_connection_t *conn, const uint8_t *payload, size_t payload_len);

/**
 * Close connection gracefully
 * @param conn: WebSocket connection
 * @param code: Close code
 * @param reason: Close reason (optional)
 * @return: 0 on success, -1 on error
 */
int fl_ws_close(fl_ws_connection_t *conn, fl_ws_close_code_t code, const char *reason);

/**
 * Destroy connection
 * @param conn: WebSocket connection
 */
void fl_ws_destroy(fl_ws_connection_t *conn);

/* ===== Frame API ===== */

/**
 * Create WebSocket frame
 * @param opcode: Frame type
 * @param payload: Payload data
 * @param payload_len: Payload length
 * @return: Frame or NULL on error
 */
fl_ws_frame_t* fl_ws_frame_create(fl_ws_frame_type_t opcode, const uint8_t *payload,
                                  size_t payload_len);

/**
 * Parse frame from buffer
 * @param buffer: Data buffer
 * @param buffer_len: Buffer length
 * @param bytes_consumed: Output - bytes consumed
 * @return: Parsed frame or NULL if incomplete
 */
fl_ws_frame_t* fl_ws_frame_parse(const uint8_t *buffer, size_t buffer_len,
                                 size_t *bytes_consumed);

/**
 * Serialize frame to buffer
 * @param frame: Frame to serialize
 * @param buffer: Output buffer
 * @param buffer_len: Buffer capacity
 * @return: Bytes written or -1 on error
 */
int fl_ws_frame_serialize(fl_ws_frame_t *frame, uint8_t *buffer, size_t buffer_len);

/**
 * Apply masking (client-only, modifies payload)
 * @param frame: Frame to mask
 * @return: 0 on success, -1 on error
 */
int fl_ws_frame_mask(fl_ws_frame_t *frame);

/**
 * Unmask payload (server-only, modifies payload)
 * @param frame: Frame to unmask
 * @return: 0 on success, -1 on error
 */
int fl_ws_frame_unmask(fl_ws_frame_t *frame);

/**
 * Destroy frame
 * @param frame: Frame to destroy
 */
void fl_ws_frame_destroy(fl_ws_frame_t *frame);

/* ===== Message Fragmentation ===== */

/**
 * Create fragmented message (multiple frames)
 * @param data: Message data
 * @param data_len: Message length
 * @param chunk_size: Fragment size (default 65536)
 * @return: Frame array or NULL on error
 */
fl_ws_frame_t** fl_ws_create_fragmented_message(const uint8_t *data, size_t data_len,
                                                 size_t chunk_size, int *frame_count);

/**
 * Reassemble fragmented message
 * @param frames: Frame array
 * @param frame_count: Number of frames
 * @param buffer: Output buffer
 * @param buffer_len: Buffer capacity
 * @return: Reassembled message length or -1 on error
 */
int fl_ws_reassemble_message(fl_ws_frame_t **frames, int frame_count,
                             uint8_t *buffer, size_t buffer_len);

/* ===== Statistics ===== */

/**
 * Get WebSocket statistics
 * @return: Statistics or NULL on error
 */
fl_ws_stats_t* fl_ws_get_stats(void);

/**
 * Reset statistics
 */
void fl_ws_reset_stats(void);

/* ===== Utilities ===== */

/**
 * Get close code description
 * @param code: Close code
 * @return: Description string
 */
const char* fl_ws_close_code_to_string(fl_ws_close_code_t code);

/**
 * Validate WebSocket frame
 * @param frame: Frame to validate
 * @return: 1 if valid, 0 if invalid
 */
int fl_ws_frame_is_valid(fl_ws_frame_t *frame);

/**
 * Get error message
 * @param error_code: Error code
 * @return: Error message
 */
const char* fl_ws_error_message(int error_code);

/**
 * Check if connection is alive
 * @param conn: WebSocket connection
 * @return: 1 if alive, 0 if dead/closed
 */
int fl_ws_is_connected(fl_ws_connection_t *conn);

/**
 * Get connection info
 * @param conn: WebSocket connection
 * @return: Info string (caller should free)
 */
char* fl_ws_get_connection_info(fl_ws_connection_t *conn);

#endif /* FREELANG_STDLIB_WEBSOCKET_H */
