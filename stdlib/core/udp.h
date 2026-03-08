/**
 * FreeLang stdlib/udp - Advanced UDP Datagram Socket Operations
 * Multicast, broadcast, fragmentation, server pools for high-throughput datagram networking
 */

#ifndef FREELANG_STDLIB_UDP_H
#define FREELANG_STDLIB_UDP_H

#include <stdint.h>
#include <stddef.h>
#include "socket.h"

/* ===== UDP Multicast ===== */

typedef struct {
  char *group_address;         /* Multicast group IP (e.g., 224.0.0.1) */
  char *interface_address;     /* Local interface IP (or NULL for default) */
  int ttl;                     /* Time-to-live (1-255, default 1) */
  int loopback;                /* Enable loopback (0/1) */
} fl_udp_multicast_config_t;

typedef struct {
  fl_socket_t *socket;         /* UDP socket */
  fl_udp_multicast_config_t *config;
  uint32_t packets_sent;
  uint32_t packets_received;
  uint32_t dropped;            /* Dropped packets */
} fl_udp_multicast_t;

/* ===== UDP Broadcast ===== */

typedef struct {
  fl_socket_t *socket;         /* UDP socket with SO_BROADCAST */
  uint16_t broadcast_port;     /* Broadcast port */
  uint32_t packets_sent;
  uint32_t packets_received;
} fl_udp_broadcast_t;

/* ===== UDP Fragmentation ===== */

typedef struct {
  uint16_t fragment_id;        /* Unique ID for reassembly */
  uint8_t fragment_offset;     /* Offset in 8-byte chunks */
  uint8_t more_fragments;      /* More fragments flag (MF) */
  size_t total_size;           /* Total reassembled size */
  size_t reassembled_size;     /* Current reassembled bytes */
  uint8_t *buffer;             /* Reassembly buffer */
  uint32_t last_seen_ms;       /* Last activity timestamp */
} fl_udp_fragment_t;

typedef struct {
  fl_udp_fragment_t *fragments;
  int fragment_count;
  int max_fragments;
  size_t max_datagram_size;    /* UDP payload limit (1472 for IPv4) */
  uint32_t reassembly_timeout_ms;
} fl_udp_fragmentation_t;

/* ===== UDP Server Pool ===== */

typedef struct {
  fl_socket_t *socket;
  char *client_address;
  uint16_t client_port;
  uint64_t bytes_received;
  uint64_t packets_received;
  uint32_t last_activity_ms;
} fl_udp_client_session_t;

typedef struct {
  fl_socket_t *listen_socket;
  fl_udp_client_session_t *sessions;
  int session_count;
  int max_sessions;
  uint32_t session_timeout_ms;  /* Inactive session timeout */
  uint32_t packets_received;
  uint32_t packets_dropped;
  uint32_t errors;
} fl_udp_server_t;

/* ===== UDP Statistics ===== */

typedef struct {
  uint64_t total_packets_sent;
  uint64_t total_packets_received;
  uint64_t total_bytes_sent;
  uint64_t total_bytes_received;
  uint32_t lost_packets;
  uint32_t out_of_order_packets;
  uint32_t duplicate_packets;
  uint32_t checksum_errors;
  double packet_loss_rate;      /* 0.0 - 1.0 */
  double avg_latency_ms;
} fl_udp_stats_t;

/* ===== Multicast API ===== */

/**
 * Create a UDP multicast socket
 * @param config: Multicast configuration
 * @return: Multicast handler or NULL on error
 */
fl_udp_multicast_t* fl_udp_multicast_create(fl_udp_multicast_config_t *config);

/**
 * Join a multicast group
 * @param mcast: Multicast handler
 * @return: 0 on success, -1 on error
 */
int fl_udp_multicast_join(fl_udp_multicast_t *mcast);

/**
 * Leave a multicast group
 * @param mcast: Multicast handler
 * @return: 0 on success, -1 on error
 */
int fl_udp_multicast_leave(fl_udp_multicast_t *mcast);

/**
 * Send to multicast group
 * @param mcast: Multicast handler
 * @param data: Packet data
 * @param size: Packet size
 * @return: Bytes sent or -1 on error
 */
int fl_udp_multicast_send(fl_udp_multicast_t *mcast, const uint8_t *data, size_t size);

/**
 * Receive from multicast group
 * @param mcast: Multicast handler
 * @param buffer: Receive buffer
 * @param max_size: Buffer capacity
 * @return: Bytes received or -1 on error
 */
int fl_udp_multicast_recv(fl_udp_multicast_t *mcast, uint8_t *buffer, size_t max_size);

/**
 * Set TTL (Time-To-Live)
 * @param mcast: Multicast handler
 * @param ttl: TTL value (1-255)
 * @return: 0 on success, -1 on error
 */
int fl_udp_multicast_set_ttl(fl_udp_multicast_t *mcast, int ttl);

/**
 * Destroy multicast handler
 * @param mcast: Multicast handler
 */
void fl_udp_multicast_destroy(fl_udp_multicast_t *mcast);

/* ===== Broadcast API ===== */

/**
 * Create a UDP broadcast socket
 * @param port: Broadcast port
 * @return: Broadcast handler or NULL on error
 */
fl_udp_broadcast_t* fl_udp_broadcast_create(uint16_t port);

/**
 * Send broadcast packet
 * @param bcast: Broadcast handler
 * @param data: Packet data
 * @param size: Packet size
 * @return: Bytes sent or -1 on error
 */
int fl_udp_broadcast_send(fl_udp_broadcast_t *bcast, const uint8_t *data, size_t size);

/**
 * Receive broadcast packet
 * @param bcast: Broadcast handler
 * @param buffer: Receive buffer
 * @param max_size: Buffer capacity
 * @param src_addr: Source address (may be NULL)
 * @return: Bytes received or -1 on error
 */
int fl_udp_broadcast_recv(fl_udp_broadcast_t *bcast, uint8_t *buffer, size_t max_size,
                          fl_socket_addr_t *src_addr);

/**
 * Destroy broadcast handler
 * @param bcast: Broadcast handler
 */
void fl_udp_broadcast_destroy(fl_udp_broadcast_t *bcast);

/* ===== Fragmentation API ===== */

/**
 * Create fragmentation handler
 * @param max_datagram_size: Maximum datagram size (typically 1472 for IPv4)
 * @return: Fragmentation handler or NULL on error
 */
fl_udp_fragmentation_t* fl_udp_fragmentation_create(size_t max_datagram_size);

/**
 * Fragment large datagram
 * @param frag: Fragmentation handler
 * @param data: Original datagram
 * @param size: Datagram size
 * @param fragments_out: Output fragment array (caller allocates)
 * @return: Number of fragments or -1 on error
 */
int fl_udp_fragment_split(fl_udp_fragmentation_t *frag, const uint8_t *data, size_t size,
                          uint8_t **fragments_out);

/**
 * Add received fragment for reassembly
 * @param frag: Fragmentation handler
 * @param fragment_data: Fragment data
 * @param fragment_size: Fragment size
 * @param fragment_offset: Offset (in 8-byte chunks)
 * @param more_fragments: More fragments flag
 * @param reassembled_out: Reassembled datagram buffer (if complete)
 * @return: 0 if incomplete, size of reassembled datagram if complete, -1 on error
 */
int fl_udp_fragment_reassemble(fl_udp_fragmentation_t *frag, const uint8_t *fragment_data,
                               size_t fragment_size, uint8_t fragment_offset,
                               int more_fragments, uint8_t **reassembled_out);

/**
 * Cleanup expired reassembly buffers
 * @param frag: Fragmentation handler
 * @return: Number of cleaned up fragments
 */
int fl_udp_fragment_cleanup_expired(fl_udp_fragmentation_t *frag);

/**
 * Destroy fragmentation handler
 * @param frag: Fragmentation handler
 */
void fl_udp_fragmentation_destroy(fl_udp_fragmentation_t *frag);

/* ===== Server Pool API ===== */

/**
 * Create UDP server with client pooling
 * @param address: Server listen address
 * @param port: Server listen port
 * @param max_clients: Maximum concurrent clients
 * @return: Server handler or NULL on error
 */
fl_udp_server_t* fl_udp_server_create(const char *address, uint16_t port, int max_clients);

/**
 * Start accepting client datagrams
 * @param server: Server handler
 * @param timeout_ms: Receive timeout
 * @return: 0 on success, -1 on error
 */
int fl_udp_server_accept(fl_udp_server_t *server, int timeout_ms);

/**
 * Send response to client
 * @param server: Server handler
 * @param client_index: Index of client session
 * @param data: Response data
 * @param size: Response size
 * @return: Bytes sent or -1 on error
 */
int fl_udp_server_send_to_client(fl_udp_server_t *server, int client_index,
                                 const uint8_t *data, size_t size);

/**
 * Broadcast to all clients
 * @param server: Server handler
 * @param data: Broadcast data
 * @param size: Data size
 * @return: Number of clients reached or -1 on error
 */
int fl_udp_server_broadcast(fl_udp_server_t *server, const uint8_t *data, size_t size);

/**
 * Remove inactive clients
 * @param server: Server handler
 * @return: Number of removed clients
 */
int fl_udp_server_cleanup_sessions(fl_udp_server_t *server);

/**
 * Get client count
 * @param server: Server handler
 * @return: Number of active client sessions
 */
int fl_udp_server_get_client_count(fl_udp_server_t *server);

/**
 * Destroy server handler
 * @param server: Server handler
 */
void fl_udp_server_destroy(fl_udp_server_t *server);

/* ===== Statistics API ===== */

/**
 * Get UDP statistics
 * @param socket: UDP socket or NULL for global stats
 * @return: Statistics structure or NULL on error
 */
fl_udp_stats_t* fl_udp_get_stats(fl_socket_t *socket);

/**
 * Reset UDP statistics
 * @param socket: UDP socket or NULL for global stats
 */
void fl_udp_reset_stats(fl_socket_t *socket);

/* ===== Utility Functions ===== */

/**
 * Validate multicast address (224.0.0.0 - 239.255.255.255)
 * @param address: IP address string
 * @return: 1 if valid, 0 if invalid
 */
int fl_udp_is_multicast_address(const char *address);

/**
 * Calculate IP checksum
 * @param data: Packet data
 * @param size: Packet size
 * @return: 16-bit checksum
 */
uint16_t fl_udp_calculate_checksum(const uint8_t *data, size_t size);

/**
 * Get last UDP error
 * @return: Error code
 */
int fl_udp_get_error(void);

/**
 * Convert error code to message
 * @param error_code: Error code
 * @return: Error message string
 */
const char* fl_udp_error_message(int error_code);

#endif /* FREELANG_STDLIB_UDP_H */
