/**
 * FreeLang stdlib/socket - Raw TCP/UDP Socket Networking
 * Low-level socket operations, IPv4/IPv6, blocking/non-blocking I/O
 */

#ifndef FREELANG_STDLIB_SOCKET_H
#define FREELANG_STDLIB_SOCKET_H

#include <stdint.h>
#include <stddef.h>

/* ===== Socket Types ===== */

typedef enum {
  FL_SOCK_TCP = 0,        /* SOCK_STREAM */
  FL_SOCK_UDP = 1         /* SOCK_DGRAM */
} fl_socket_type_t;

typedef enum {
  FL_SOCK_IPv4 = 0,       /* AF_INET */
  FL_SOCK_IPv6 = 1        /* AF_INET6 */
} fl_socket_family_t;

typedef enum {
  FL_SOCK_BLOCKING = 0,
  FL_SOCK_NONBLOCKING = 1
} fl_socket_mode_t;

/* ===== Socket Handle ===== */

typedef struct {
  int fd;                  /* File descriptor */
  fl_socket_type_t type;   /* TCP or UDP */
  fl_socket_family_t family;
  int is_listening;        /* For server sockets */
  int is_connected;        /* For client sockets */
  void *userdata;          /* User context */
} fl_socket_t;

/* ===== Socket Address ===== */

typedef struct {
  fl_socket_family_t family;
  char *address;           /* IP address string */
  uint16_t port;           /* Port number */
} fl_socket_addr_t;

/* ===== Socket Statistics ===== */

typedef struct {
  uint64_t bytes_sent;
  uint64_t bytes_received;
  uint64_t packets_sent;
  uint64_t packets_received;
  uint64_t errors;
  uint32_t mtu;            /* Maximum transmission unit */
} fl_socket_stats_t;

/* ===== Public API ===== */

/* Socket creation/destruction */
fl_socket_t* fl_socket_create(fl_socket_type_t type, fl_socket_family_t family);
void fl_socket_destroy(fl_socket_t *sock);

/* Binding and listening (server) */
int fl_socket_bind(fl_socket_t *sock, const char *address, uint16_t port);
int fl_socket_listen(fl_socket_t *sock, int backlog);
fl_socket_t* fl_socket_accept(fl_socket_t *server_sock, fl_socket_addr_t *client_addr);

/* Connection (client) */
int fl_socket_connect(fl_socket_t *sock, const char *address, uint16_t port);
int fl_socket_connect_timeout(fl_socket_t *sock, const char *address, uint16_t port, int timeout_ms);

/* I/O operations */
int fl_socket_send(fl_socket_t *sock, const uint8_t *data, size_t size);
int fl_socket_send_to(fl_socket_t *sock, const uint8_t *data, size_t size,
                      const char *address, uint16_t port);
int fl_socket_recv(fl_socket_t *sock, uint8_t *buffer, size_t size);
int fl_socket_recv_from(fl_socket_t *sock, uint8_t *buffer, size_t size,
                        fl_socket_addr_t *src_addr);

/* Socket options */
int fl_socket_set_mode(fl_socket_t *sock, fl_socket_mode_t mode);
int fl_socket_set_timeout(fl_socket_t *sock, int recv_timeout_ms, int send_timeout_ms);
int fl_socket_set_buffer_size(fl_socket_t *sock, size_t recv_buffer, size_t send_buffer);
int fl_socket_set_reuse_addr(fl_socket_t *sock, int reuse);
int fl_socket_set_no_delay(fl_socket_t *sock, int no_delay);

/* Socket state */
int fl_socket_is_connected(fl_socket_t *sock);
int fl_socket_is_listening(fl_socket_t *sock);
int fl_socket_get_local_addr(fl_socket_t *sock, fl_socket_addr_t *addr);
int fl_socket_get_remote_addr(fl_socket_t *sock, fl_socket_addr_t *addr);

/* Shutdown and cleanup */
int fl_socket_shutdown(fl_socket_t *sock, int shutdown_type);
int fl_socket_close(fl_socket_t *sock);

/* Statistics */
fl_socket_stats_t* fl_socket_get_stats(fl_socket_t *sock);
void fl_socket_reset_stats(fl_socket_t *sock);

/* Utilities */
int fl_socket_is_ipv4(const char *address);
int fl_socket_is_ipv6(const char *address);
int fl_socket_get_errno(void);

#endif /* FREELANG_STDLIB_SOCKET_H */
