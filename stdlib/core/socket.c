/**
 * FreeLang stdlib/socket Implementation - Raw TCP/UDP Socket Networking
 * BSD socket API wrapper, IPv4/IPv6 support, blocking/non-blocking I/O
 */

#include "socket.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <arpa/inet.h>
#include <netdb.h>

/* ===== Global Statistics ===== */

static fl_socket_stats_t global_stats = {0};

/* ===== Socket Creation/Destruction ===== */

fl_socket_t* fl_socket_create(fl_socket_type_t type, fl_socket_family_t family) {
  fl_socket_t *sock = (fl_socket_t*)malloc(sizeof(fl_socket_t));
  if (!sock) return NULL;

  int sock_type = (type == FL_SOCK_TCP) ? SOCK_STREAM : SOCK_DGRAM;
  int sock_family = (family == FL_SOCK_IPv4) ? AF_INET : AF_INET6;

  int fd = socket(sock_family, sock_type, 0);
  if (fd < 0) {
    fprintf(stderr, "[socket] Failed to create socket: %s\n", strerror(errno));
    free(sock);
    return NULL;
  }

  sock->fd = fd;
  sock->type = type;
  sock->family = family;
  sock->is_listening = 0;
  sock->is_connected = 0;
  sock->userdata = NULL;

  fprintf(stderr, "[socket] Created: fd=%d, type=%s, family=%s\n",
          fd, type == FL_SOCK_TCP ? "TCP" : "UDP",
          family == FL_SOCK_IPv4 ? "IPv4" : "IPv6");

  return sock;
}

void fl_socket_destroy(fl_socket_t *sock) {
  if (!sock) return;

  if (sock->fd >= 0) {
    close(sock->fd);
  }

  free(sock);
  fprintf(stderr, "[socket] Destroyed\n");
}

/* ===== Address Utilities ===== */

int fl_socket_is_ipv4(const char *address) {
  if (!address) return 0;

  struct in_addr addr;
  return inet_pton(AF_INET, address, &addr) == 1 ? 1 : 0;
}

int fl_socket_is_ipv6(const char *address) {
  if (!address) return 0;

  struct in6_addr addr;
  return inet_pton(AF_INET6, address, &addr) == 1 ? 1 : 0;
}

/* ===== Binding and Listening ===== */

int fl_socket_bind(fl_socket_t *sock, const char *address, uint16_t port) {
  if (!sock || !address) return -1;

  if (sock->family == FL_SOCK_IPv4) {
    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_port = htons(port);

    if (inet_pton(AF_INET, address, &addr.sin_addr) <= 0) {
      fprintf(stderr, "[socket] Invalid IPv4 address: %s\n", address);
      return -1;
    }

    if (bind(sock->fd, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
      fprintf(stderr, "[socket] Bind failed: %s\n", strerror(errno));
      return -1;
    }
  } else {
    struct sockaddr_in6 addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin6_family = AF_INET6;
    addr.sin6_port = htons(port);

    if (inet_pton(AF_INET6, address, &addr.sin6_addr) <= 0) {
      fprintf(stderr, "[socket] Invalid IPv6 address: %s\n", address);
      return -1;
    }

    if (bind(sock->fd, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
      fprintf(stderr, "[socket] Bind failed: %s\n", strerror(errno));
      return -1;
    }
  }

  fprintf(stderr, "[socket] Bound to %s:%d\n", address, port);
  return 0;
}

int fl_socket_listen(fl_socket_t *sock, int backlog) {
  if (!sock || sock->type != FL_SOCK_TCP) return -1;

  if (listen(sock->fd, backlog) < 0) {
    fprintf(stderr, "[socket] Listen failed: %s\n", strerror(errno));
    return -1;
  }

  sock->is_listening = 1;
  fprintf(stderr, "[socket] Listening with backlog=%d\n", backlog);
  return 0;
}

fl_socket_t* fl_socket_accept(fl_socket_t *server_sock, fl_socket_addr_t *client_addr) {
  if (!server_sock || server_sock->type != FL_SOCK_TCP) return NULL;

  struct sockaddr_storage addr_storage;
  socklen_t addr_len = sizeof(addr_storage);

  int client_fd = accept(server_sock->fd, (struct sockaddr*)&addr_storage, &addr_len);
  if (client_fd < 0) {
    fprintf(stderr, "[socket] Accept failed: %s\n", strerror(errno));
    return NULL;
  }

  fl_socket_t *client_sock = (fl_socket_t*)malloc(sizeof(fl_socket_t));
  if (!client_sock) {
    close(client_fd);
    return NULL;
  }

  client_sock->fd = client_fd;
  client_sock->type = FL_SOCK_TCP;
  client_sock->family = server_sock->family;
  client_sock->is_listening = 0;
  client_sock->is_connected = 1;
  client_sock->userdata = NULL;

  /* Extract client address */
  if (client_addr) {
    client_addr->family = server_sock->family;
    client_addr->address = (char*)malloc(INET6_ADDRSTRLEN);

    if (server_sock->family == FL_SOCK_IPv4) {
      struct sockaddr_in *ipv4 = (struct sockaddr_in*)&addr_storage;
      inet_ntop(AF_INET, &ipv4->sin_addr, client_addr->address, INET_ADDRSTRLEN);
      client_addr->port = ntohs(ipv4->sin_port);
    } else {
      struct sockaddr_in6 *ipv6 = (struct sockaddr_in6*)&addr_storage;
      inet_ntop(AF_INET6, &ipv6->sin6_addr, client_addr->address, INET6_ADDRSTRLEN);
      client_addr->port = ntohs(ipv6->sin6_port);
    }
  }

  fprintf(stderr, "[socket] Accepted connection from %s:%d\n",
          client_addr ? client_addr->address : "unknown",
          client_addr ? client_addr->port : 0);

  return client_sock;
}

/* ===== Connection ===== */

int fl_socket_connect(fl_socket_t *sock, const char *address, uint16_t port) {
  if (!sock || !address) return -1;

  if (sock->family == FL_SOCK_IPv4) {
    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_port = htons(port);

    if (inet_pton(AF_INET, address, &addr.sin_addr) <= 0) {
      fprintf(stderr, "[socket] Invalid IPv4 address: %s\n", address);
      return -1;
    }

    if (connect(sock->fd, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
      fprintf(stderr, "[socket] Connect failed: %s\n", strerror(errno));
      return -1;
    }
  } else {
    struct sockaddr_in6 addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin6_family = AF_INET6;
    addr.sin6_port = htons(port);

    if (inet_pton(AF_INET6, address, &addr.sin6_addr) <= 0) {
      fprintf(stderr, "[socket] Invalid IPv6 address: %s\n", address);
      return -1;
    }

    if (connect(sock->fd, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
      fprintf(stderr, "[socket] Connect failed: %s\n", strerror(errno));
      return -1;
    }
  }

  sock->is_connected = 1;
  fprintf(stderr, "[socket] Connected to %s:%d\n", address, port);
  return 0;
}

int fl_socket_connect_timeout(fl_socket_t *sock, const char *address, uint16_t port,
                              int timeout_ms) {
  if (!sock || !address || timeout_ms < 0) return -1;

  /* Set non-blocking mode */
  int flags = fcntl(sock->fd, F_GETFL, 0);
  fcntl(sock->fd, F_SETFL, flags | O_NONBLOCK);

  int result = fl_socket_connect(sock, address, port);

  if (result < 0 && errno == EINPROGRESS) {
    /* Connection in progress, wait for timeout */
    fd_set writefds;
    FD_ZERO(&writefds);
    FD_SET(sock->fd, &writefds);

    struct timeval tv;
    tv.tv_sec = timeout_ms / 1000;
    tv.tv_usec = (timeout_ms % 1000) * 1000;

    result = select(sock->fd + 1, NULL, &writefds, NULL, &tv);

    if (result > 0 && FD_ISSET(sock->fd, &writefds)) {
      /* Check if connection succeeded */
      int error = 0;
      socklen_t len = sizeof(error);
      getsockopt(sock->fd, SOL_SOCKET, SO_ERROR, &error, &len);

      if (error == 0) {
        result = 0;  /* Success */
      } else {
        result = -1;
      }
    } else {
      result = -1;
    }
  }

  /* Restore blocking mode */
  fcntl(sock->fd, F_SETFL, flags);

  return result;
}

/* ===== I/O Operations ===== */

int fl_socket_send(fl_socket_t *sock, const uint8_t *data, size_t size) {
  if (!sock || !data) return -1;

  ssize_t sent = send(sock->fd, data, size, 0);
  if (sent < 0) {
    fprintf(stderr, "[socket] Send failed: %s\n", strerror(errno));
    return -1;
  }

  global_stats.bytes_sent += sent;
  global_stats.packets_sent++;

  fprintf(stderr, "[socket] Sent: %zu bytes\n", (size_t)sent);
  return (int)sent;
}

int fl_socket_send_to(fl_socket_t *sock, const uint8_t *data, size_t size,
                      const char *address, uint16_t port) {
  if (!sock || !data || !address || sock->type != FL_SOCK_UDP) return -1;

  if (sock->family == FL_SOCK_IPv4) {
    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_port = htons(port);
    inet_pton(AF_INET, address, &addr.sin_addr);

    ssize_t sent = sendto(sock->fd, data, size, 0, (struct sockaddr*)&addr, sizeof(addr));
    if (sent < 0) {
      fprintf(stderr, "[socket] SendTo failed: %s\n", strerror(errno));
      return -1;
    }

    global_stats.bytes_sent += sent;
    global_stats.packets_sent++;

    return (int)sent;
  } else {
    struct sockaddr_in6 addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin6_family = AF_INET6;
    addr.sin6_port = htons(port);
    inet_pton(AF_INET6, address, &addr.sin6_addr);

    ssize_t sent = sendto(sock->fd, data, size, 0, (struct sockaddr*)&addr, sizeof(addr));
    if (sent < 0) {
      fprintf(stderr, "[socket] SendTo failed: %s\n", strerror(errno));
      return -1;
    }

    global_stats.bytes_sent += sent;
    global_stats.packets_sent++;

    return (int)sent;
  }
}

int fl_socket_recv(fl_socket_t *sock, uint8_t *buffer, size_t size) {
  if (!sock || !buffer) return -1;

  ssize_t received = recv(sock->fd, buffer, size, 0);
  if (received < 0) {
    fprintf(stderr, "[socket] Recv failed: %s\n", strerror(errno));
    return -1;
  }

  if (received == 0) {
    fprintf(stderr, "[socket] Connection closed\n");
    sock->is_connected = 0;
  }

  global_stats.bytes_received += received;
  global_stats.packets_received++;

  fprintf(stderr, "[socket] Received: %zu bytes\n", (size_t)received);
  return (int)received;
}

int fl_socket_recv_from(fl_socket_t *sock, uint8_t *buffer, size_t size,
                        fl_socket_addr_t *src_addr) {
  if (!sock || !buffer || sock->type != FL_SOCK_UDP) return -1;

  struct sockaddr_storage addr_storage;
  socklen_t addr_len = sizeof(addr_storage);

  ssize_t received = recvfrom(sock->fd, buffer, size, 0,
                              (struct sockaddr*)&addr_storage, &addr_len);
  if (received < 0) {
    fprintf(stderr, "[socket] RecvFrom failed: %s\n", strerror(errno));
    return -1;
  }

  if (src_addr) {
    src_addr->family = sock->family;
    src_addr->address = (char*)malloc(INET6_ADDRSTRLEN);

    if (sock->family == FL_SOCK_IPv4) {
      struct sockaddr_in *ipv4 = (struct sockaddr_in*)&addr_storage;
      inet_ntop(AF_INET, &ipv4->sin_addr, src_addr->address, INET_ADDRSTRLEN);
      src_addr->port = ntohs(ipv4->sin_port);
    } else {
      struct sockaddr_in6 *ipv6 = (struct sockaddr_in6*)&addr_storage;
      inet_ntop(AF_INET6, &ipv6->sin6_addr, src_addr->address, INET6_ADDRSTRLEN);
      src_addr->port = ntohs(ipv6->sin6_port);
    }
  }

  global_stats.bytes_received += received;
  global_stats.packets_received++;

  return (int)received;
}

/* ===== Socket Options ===== */

int fl_socket_set_mode(fl_socket_t *sock, fl_socket_mode_t mode) {
  if (!sock) return -1;

  int flags = fcntl(sock->fd, F_GETFL, 0);
  if (mode == FL_SOCK_NONBLOCKING) {
    flags |= O_NONBLOCK;
  } else {
    flags &= ~O_NONBLOCK;
  }

  if (fcntl(sock->fd, F_SETFL, flags) < 0) {
    fprintf(stderr, "[socket] Set mode failed: %s\n", strerror(errno));
    return -1;
  }

  fprintf(stderr, "[socket] Mode set to %s\n",
          mode == FL_SOCK_NONBLOCKING ? "non-blocking" : "blocking");
  return 0;
}

int fl_socket_set_timeout(fl_socket_t *sock, int recv_timeout_ms,
                          int send_timeout_ms) {
  if (!sock) return -1;

  struct timeval recv_tv, send_tv;

  if (recv_timeout_ms >= 0) {
    recv_tv.tv_sec = recv_timeout_ms / 1000;
    recv_tv.tv_usec = (recv_timeout_ms % 1000) * 1000;
    setsockopt(sock->fd, SOL_SOCKET, SO_RCVTIMEO, &recv_tv, sizeof(recv_tv));
  }

  if (send_timeout_ms >= 0) {
    send_tv.tv_sec = send_timeout_ms / 1000;
    send_tv.tv_usec = (send_timeout_ms % 1000) * 1000;
    setsockopt(sock->fd, SOL_SOCKET, SO_SNDTIMEO, &send_tv, sizeof(send_tv));
  }

  fprintf(stderr, "[socket] Timeout set: recv=%dms, send=%dms\n",
          recv_timeout_ms, send_timeout_ms);
  return 0;
}

int fl_socket_set_buffer_size(fl_socket_t *sock, size_t recv_buffer,
                              size_t send_buffer) {
  if (!sock) return -1;

  if (recv_buffer > 0) {
    int buf_size = (int)recv_buffer;
    setsockopt(sock->fd, SOL_SOCKET, SO_RCVBUF, &buf_size, sizeof(buf_size));
  }

  if (send_buffer > 0) {
    int buf_size = (int)send_buffer;
    setsockopt(sock->fd, SOL_SOCKET, SO_SNDBUF, &buf_size, sizeof(buf_size));
  }

  fprintf(stderr, "[socket] Buffer size set: recv=%zu, send=%zu\n",
          recv_buffer, send_buffer);
  return 0;
}

int fl_socket_set_reuse_addr(fl_socket_t *sock, int reuse) {
  if (!sock) return -1;

  int opt = reuse ? 1 : 0;
  if (setsockopt(sock->fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) < 0) {
    fprintf(stderr, "[socket] Set reuse addr failed: %s\n", strerror(errno));
    return -1;
  }

  fprintf(stderr, "[socket] Reuse addr: %s\n", reuse ? "enabled" : "disabled");
  return 0;
}

int fl_socket_set_no_delay(fl_socket_t *sock, int no_delay) {
  if (!sock || sock->type != FL_SOCK_TCP) return -1;

  int opt = no_delay ? 1 : 0;
  if (setsockopt(sock->fd, IPPROTO_TCP, TCP_NODELAY, &opt, sizeof(opt)) < 0) {
    fprintf(stderr, "[socket] Set no delay failed: %s\n", strerror(errno));
    return -1;
  }

  fprintf(stderr, "[socket] TCP_NODELAY: %s\n", no_delay ? "enabled" : "disabled");
  return 0;
}

/* ===== Socket State ===== */

int fl_socket_is_connected(fl_socket_t *sock) {
  return sock ? sock->is_connected : 0;
}

int fl_socket_is_listening(fl_socket_t *sock) {
  return sock ? sock->is_listening : 0;
}

int fl_socket_get_local_addr(fl_socket_t *sock, fl_socket_addr_t *addr) {
  if (!sock || !addr) return -1;

  struct sockaddr_storage addr_storage;
  socklen_t addr_len = sizeof(addr_storage);

  if (getsockname(sock->fd, (struct sockaddr*)&addr_storage, &addr_len) < 0) {
    fprintf(stderr, "[socket] Get local addr failed: %s\n", strerror(errno));
    return -1;
  }

  addr->family = sock->family;
  addr->address = (char*)malloc(INET6_ADDRSTRLEN);

  if (sock->family == FL_SOCK_IPv4) {
    struct sockaddr_in *ipv4 = (struct sockaddr_in*)&addr_storage;
    inet_ntop(AF_INET, &ipv4->sin_addr, addr->address, INET_ADDRSTRLEN);
    addr->port = ntohs(ipv4->sin_port);
  } else {
    struct sockaddr_in6 *ipv6 = (struct sockaddr_in6*)&addr_storage;
    inet_ntop(AF_INET6, &ipv6->sin6_addr, addr->address, INET6_ADDRSTRLEN);
    addr->port = ntohs(ipv6->sin6_port);
  }

  return 0;
}

int fl_socket_get_remote_addr(fl_socket_t *sock, fl_socket_addr_t *addr) {
  if (!sock || !addr) return -1;

  struct sockaddr_storage addr_storage;
  socklen_t addr_len = sizeof(addr_storage);

  if (getpeername(sock->fd, (struct sockaddr*)&addr_storage, &addr_len) < 0) {
    fprintf(stderr, "[socket] Get remote addr failed: %s\n", strerror(errno));
    return -1;
  }

  addr->family = sock->family;
  addr->address = (char*)malloc(INET6_ADDRSTRLEN);

  if (sock->family == FL_SOCK_IPv4) {
    struct sockaddr_in *ipv4 = (struct sockaddr_in*)&addr_storage;
    inet_ntop(AF_INET, &ipv4->sin_addr, addr->address, INET_ADDRSTRLEN);
    addr->port = ntohs(ipv4->sin_port);
  } else {
    struct sockaddr_in6 *ipv6 = (struct sockaddr_in6*)&addr_storage;
    inet_ntop(AF_INET6, &ipv6->sin6_addr, addr->address, INET6_ADDRSTRLEN);
    addr->port = ntohs(ipv6->sin6_port);
  }

  return 0;
}

/* ===== Shutdown and Cleanup ===== */

int fl_socket_shutdown(fl_socket_t *sock, int shutdown_type) {
  if (!sock) return -1;

  if (shutdown(sock->fd, shutdown_type) < 0) {
    fprintf(stderr, "[socket] Shutdown failed: %s\n", strerror(errno));
    return -1;
  }

  fprintf(stderr, "[socket] Shutdown: type=%d\n", shutdown_type);
  return 0;
}

int fl_socket_close(fl_socket_t *sock) {
  if (!sock) return -1;

  if (sock->fd >= 0) {
    if (close(sock->fd) < 0) {
      fprintf(stderr, "[socket] Close failed: %s\n", strerror(errno));
      return -1;
    }
    sock->fd = -1;
  }

  fprintf(stderr, "[socket] Closed\n");
  return 0;
}

/* ===== Statistics ===== */

fl_socket_stats_t* fl_socket_get_stats(fl_socket_t *sock) {
  fl_socket_stats_t *stats = (fl_socket_stats_t*)malloc(sizeof(fl_socket_stats_t));
  if (!stats) return NULL;

  memcpy(stats, &global_stats, sizeof(fl_socket_stats_t));
  return stats;
}

void fl_socket_reset_stats(fl_socket_t *sock) {
  memset(&global_stats, 0, sizeof(fl_socket_stats_t));
  fprintf(stderr, "[socket] Stats reset\n");
}

/* ===== Utilities ===== */

int fl_socket_get_errno(void) {
  return errno;
}
