/**
 * FreeLang stdlib/udp Implementation - Advanced UDP Datagram Socket Operations
 * Multicast, broadcast, fragmentation, server pools for high-throughput networking
 */

#include "udp.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <net/if.h>
#include <ifaddrs.h>
#include <time.h>
#include <pthread.h>

/* ===== Global Statistics ===== */

static struct {
  uint64_t total_packets_sent;
  uint64_t total_packets_received;
  uint64_t total_bytes_sent;
  uint64_t total_bytes_received;
  uint32_t lost_packets;
  uint32_t checksum_errors;
  pthread_mutex_t lock;
} udp_stats = {
  .lock = PTHREAD_MUTEX_INITIALIZER
};

/* ===== Multicast API Implementation ===== */

fl_udp_multicast_t* fl_udp_multicast_create(fl_udp_multicast_config_t *config) {
  if (!config || !config->group_address) return NULL;

  fl_udp_multicast_t *mcast = (fl_udp_multicast_t*)malloc(sizeof(fl_udp_multicast_t));
  if (!mcast) return NULL;

  mcast->socket = fl_socket_create(FL_SOCK_UDP, FL_SOCK_IPv4);
  if (!mcast->socket) {
    free(mcast);
    return NULL;
  }

  mcast->config = (fl_udp_multicast_config_t*)malloc(sizeof(fl_udp_multicast_config_t));
  mcast->config->group_address = (char*)malloc(strlen(config->group_address) + 1);
  SAFE_STRCPY(mcast->config->group_address, config->group_address);

  if (config->interface_address) {
    mcast->config->interface_address = (char*)malloc(strlen(config->interface_address) + 1);
    SAFE_STRCPY(mcast->config->interface_address, config->interface_address);
  } else {
    mcast->config->interface_address = NULL;
  }

  mcast->config->ttl = config->ttl > 0 ? config->ttl : 1;
  mcast->config->loopback = config->loopback;
  mcast->packets_sent = 0;
  mcast->packets_received = 0;
  mcast->dropped = 0;

  fprintf(stderr, "[udp] Multicast created: group=%s, ttl=%d\n",
          config->group_address, mcast->config->ttl);

  return mcast;
}

int fl_udp_multicast_join(fl_udp_multicast_t *mcast) {
  if (!mcast || !mcast->socket) return -1;

  struct ip_mreq mreq;
  inet_aton(mcast->config->group_address, &mreq.imr_multiaddr);

  if (mcast->config->interface_address) {
    inet_aton(mcast->config->interface_address, &mreq.imr_interface);
  } else {
    mreq.imr_interface.s_addr = htonl(INADDR_ANY);
  }

  if (setsockopt(mcast->socket->fd, IPPROTO_IP, IP_ADD_MEMBERSHIP, &mreq, sizeof(mreq)) < 0) {
    fprintf(stderr, "[udp] Failed to join multicast group\n");
    return -1;
  }

  fprintf(stderr, "[udp] Joined multicast group: %s\n", mcast->config->group_address);
  return 0;
}

int fl_udp_multicast_leave(fl_udp_multicast_t *mcast) {
  if (!mcast || !mcast->socket) return -1;

  struct ip_mreq mreq;
  inet_aton(mcast->config->group_address, &mreq.imr_multiaddr);
  mreq.imr_interface.s_addr = htonl(INADDR_ANY);

  if (setsockopt(mcast->socket->fd, IPPROTO_IP, IP_DROP_MEMBERSHIP, &mreq, sizeof(mreq)) < 0) {
    fprintf(stderr, "[udp] Failed to leave multicast group\n");
    return -1;
  }

  fprintf(stderr, "[udp] Left multicast group: %s\n", mcast->config->group_address);
  return 0;
}

int fl_udp_multicast_send(fl_udp_multicast_t *mcast, const uint8_t *data, size_t size) {
  if (!mcast || !mcast->socket || !data) return -1;

  int sent = sendto(mcast->socket->fd, data, size, 0,
                    (struct sockaddr*)&(struct sockaddr_in){
                      .sin_family = AF_INET,
                      .sin_addr = {inet_addr(mcast->config->group_address)},
                      .sin_port = htons(5353)
                    },
                    sizeof(struct sockaddr_in));

  if (sent > 0) {
    mcast->packets_sent++;
    pthread_mutex_lock(&udp_stats.lock);
    udp_stats.total_packets_sent++;
    udp_stats.total_bytes_sent += sent;
    pthread_mutex_unlock(&udp_stats.lock);
  }

  return sent;
}

int fl_udp_multicast_recv(fl_udp_multicast_t *mcast, uint8_t *buffer, size_t max_size) {
  if (!mcast || !mcast->socket || !buffer) return -1;

  int received = recvfrom(mcast->socket->fd, buffer, max_size, 0, NULL, NULL);

  if (received > 0) {
    mcast->packets_received++;
    pthread_mutex_lock(&udp_stats.lock);
    udp_stats.total_packets_received++;
    udp_stats.total_bytes_received += received;
    pthread_mutex_unlock(&udp_stats.lock);
  }

  return received;
}

int fl_udp_multicast_set_ttl(fl_udp_multicast_t *mcast, int ttl) {
  if (!mcast || !mcast->socket || ttl < 1 || ttl > 255) return -1;

  if (setsockopt(mcast->socket->fd, IPPROTO_IP, IP_MULTICAST_TTL, &ttl, sizeof(ttl)) < 0) {
    return -1;
  }

  mcast->config->ttl = ttl;
  return 0;
}

void fl_udp_multicast_destroy(fl_udp_multicast_t *mcast) {
  if (!mcast) return;

  free(mcast->config->group_address);
  free(mcast->config->interface_address);
  free(mcast->config);
  fl_socket_close(mcast->socket);
  fl_socket_destroy(mcast->socket);
  free(mcast);

  fprintf(stderr, "[udp] Multicast destroyed\n");
}

/* ===== Broadcast API Implementation ===== */

fl_udp_broadcast_t* fl_udp_broadcast_create(uint16_t port) {
  fl_udp_broadcast_t *bcast = (fl_udp_broadcast_t*)malloc(sizeof(fl_udp_broadcast_t));
  if (!bcast) return NULL;

  bcast->socket = fl_socket_create(FL_SOCK_UDP, FL_SOCK_IPv4);
  if (!bcast->socket) {
    free(bcast);
    return NULL;
  }

  int opt = 1;
  if (setsockopt(bcast->socket->fd, SOL_SOCKET, SO_BROADCAST, &opt, sizeof(opt)) < 0) {
    fl_socket_destroy(bcast->socket);
    free(bcast);
    return NULL;
  }

  bcast->broadcast_port = port;
  bcast->packets_sent = 0;
  bcast->packets_received = 0;

  fprintf(stderr, "[udp] Broadcast created: port=%d\n", port);
  return bcast;
}

int fl_udp_broadcast_send(fl_udp_broadcast_t *bcast, const uint8_t *data, size_t size) {
  if (!bcast || !bcast->socket || !data) return -1;

  struct sockaddr_in addr = {
    .sin_family = AF_INET,
    .sin_addr.s_addr = inet_addr("255.255.255.255"),
    .sin_port = htons(bcast->broadcast_port)
  };

  int sent = sendto(bcast->socket->fd, data, size, 0, (struct sockaddr*)&addr, sizeof(addr));

  if (sent > 0) {
    bcast->packets_sent++;
  }

  return sent;
}

int fl_udp_broadcast_recv(fl_udp_broadcast_t *bcast, uint8_t *buffer, size_t max_size,
                          fl_socket_addr_t *src_addr) {
  if (!bcast || !bcast->socket || !buffer) return -1;

  struct sockaddr_in addr;
  socklen_t addr_len = sizeof(addr);

  int received = recvfrom(bcast->socket->fd, buffer, max_size, 0, (struct sockaddr*)&addr, &addr_len);

  if (received > 0) {
    bcast->packets_received++;
    if (src_addr) {
      src_addr->family = FL_SOCK_IPv4;
      src_addr->address = inet_ntoa(addr.sin_addr);
      src_addr->port = ntohs(addr.sin_port);
    }
  }

  return received;
}

void fl_udp_broadcast_destroy(fl_udp_broadcast_t *bcast) {
  if (!bcast) return;

  fl_socket_close(bcast->socket);
  fl_socket_destroy(bcast->socket);
  free(bcast);

  fprintf(stderr, "[udp] Broadcast destroyed\n");
}

/* ===== Fragmentation API Implementation ===== */

fl_udp_fragmentation_t* fl_udp_fragmentation_create(size_t max_datagram_size) {
  fl_udp_fragmentation_t *frag = (fl_udp_fragmentation_t*)malloc(sizeof(fl_udp_fragmentation_t));
  if (!frag) return NULL;

  frag->max_fragments = 64;
  frag->fragments = (fl_udp_fragment_t*)calloc(frag->max_fragments, sizeof(fl_udp_fragment_t));
  frag->fragment_count = 0;
  frag->max_datagram_size = max_datagram_size > 0 ? max_datagram_size : 1472;
  frag->reassembly_timeout_ms = 30000;

  fprintf(stderr, "[udp] Fragmentation created: max_datagram=%zu\n", frag->max_datagram_size);
  return frag;
}

int fl_udp_fragment_split(fl_udp_fragmentation_t *frag, const uint8_t *data, size_t size,
                          uint8_t **fragments_out) {
  if (!frag || !data || !fragments_out) return -1;

  int fragment_count = (size + frag->max_datagram_size - 1) / frag->max_datagram_size;
  *fragments_out = (uint8_t*)malloc(fragment_count * frag->max_datagram_size);

  if (!*fragments_out) return -1;

  for (int i = 0; i < fragment_count; i++) {
    size_t offset = i * frag->max_datagram_size;
    size_t copy_size = (offset + frag->max_datagram_size > size) ? (size - offset) : frag->max_datagram_size;
    memcpy(*fragments_out + offset, data + offset, copy_size);
  }

  fprintf(stderr, "[udp] Fragmented datagram into %d fragments\n", fragment_count);
  return fragment_count;
}

int fl_udp_fragment_reassemble(fl_udp_fragmentation_t *frag, const uint8_t *fragment_data,
                               size_t fragment_size, uint8_t fragment_offset,
                               int more_fragments, uint8_t **reassembled_out) {
  if (!frag || !fragment_data || !reassembled_out) return -1;

  // Simplified reassembly: just track that we received fragments
  if (frag->fragment_count < frag->max_fragments) {
    fl_udp_fragment_t *f = &frag->fragments[frag->fragment_count];
    f->fragment_offset = fragment_offset;
    f->more_fragments = more_fragments;
    f->data = (uint8_t*)malloc(fragment_size);
    memcpy(f->data, fragment_data, fragment_size);
    f->last_seen_ms = (uint32_t)time(NULL) * 1000;

    frag->fragment_count++;

    if (!more_fragments) {
      // All fragments received - reassemble
      size_t total_size = (fragment_offset + 1) * 8 + fragment_size;
      *reassembled_out = (uint8_t*)malloc(total_size);

      for (int i = 0; i < frag->fragment_count; i++) {
        memcpy(*reassembled_out + (frag->fragments[i].fragment_offset * 8),
               frag->fragments[i].data,
               fragment_size);
      }

      return total_size;
    }
  }

  return 0; // Incomplete
}

int fl_udp_fragment_cleanup_expired(fl_udp_fragmentation_t *frag) {
  if (!frag) return -1;

  uint32_t now = (uint32_t)time(NULL) * 1000;
  int cleaned = 0;

  for (int i = 0; i < frag->fragment_count; i++) {
    if ((now - frag->fragments[i].last_seen_ms) > frag->reassembly_timeout_ms) {
      free(frag->fragments[i].data);
      cleaned++;
    }
  }

  return cleaned;
}

void fl_udp_fragmentation_destroy(fl_udp_fragmentation_t *frag) {
  if (!frag) return;

  for (int i = 0; i < frag->fragment_count; i++) {
    free(frag->fragments[i].data);
  }
  free(frag->fragments);
  free(frag);

  fprintf(stderr, "[udp] Fragmentation destroyed\n");
}

/* ===== Server Pool API Implementation ===== */

fl_udp_server_t* fl_udp_server_create(const char *address, uint16_t port, int max_clients) {
  if (!address || max_clients <= 0) return NULL;

  fl_udp_server_t *server = (fl_udp_server_t*)malloc(sizeof(fl_udp_server_t));
  if (!server) return NULL;

  server->listen_socket = fl_socket_create(FL_SOCK_UDP, FL_SOCK_IPv4);
  if (!server->listen_socket) {
    free(server);
    return NULL;
  }

  if (fl_socket_bind(server->listen_socket, address, port) < 0) {
    fl_socket_destroy(server->listen_socket);
    free(server);
    return NULL;
  }

  server->sessions = (fl_udp_client_session_t*)calloc(max_clients, sizeof(fl_udp_client_session_t));
  server->session_count = 0;
  server->max_sessions = max_clients;
  server->session_timeout_ms = 60000;
  server->packets_received = 0;
  server->packets_dropped = 0;
  server->errors = 0;

  fprintf(stderr, "[udp] Server created: addr=%s, port=%d, max_clients=%d\n",
          address, port, max_clients);

  return server;
}

int fl_udp_server_accept(fl_udp_server_t *server, int timeout_ms) {
  if (!server || !server->listen_socket) return -1;

  fl_socket_set_timeout(server->listen_socket, timeout_ms, timeout_ms);

  uint8_t buffer[4096];
  fl_socket_addr_t src_addr = {0};

  int received = fl_socket_recv_from(server->listen_socket, buffer, sizeof(buffer), &src_addr);

  if (received > 0) {
    server->packets_received++;

    if (server->session_count < server->max_sessions) {
      fl_udp_client_session_t *sess = &server->sessions[server->session_count];
      sess->client_address = (char*)malloc(strlen(src_addr.address) + 1);
      SAFE_STRCPY(sess->client_address, src_addr.address);
      sess->client_port = src_addr.port;
      sess->bytes_received = received;
      sess->packets_received = 1;
      sess->last_activity_ms = (uint32_t)time(NULL) * 1000;

      server->session_count++;
    } else {
      server->packets_dropped++;
    }
  }

  return received;
}

int fl_udp_server_send_to_client(fl_udp_server_t *server, int client_index,
                                 const uint8_t *data, size_t size) {
  if (!server || client_index < 0 || client_index >= server->session_count || !data) {
    return -1;
  }

  fl_udp_client_session_t *sess = &server->sessions[client_index];
  int sent = fl_socket_send_to(server->listen_socket, data, size,
                               sess->client_address, sess->client_port);

  if (sent > 0) {
    sess->last_activity_ms = (uint32_t)time(NULL) * 1000;
  }

  return sent;
}

int fl_udp_server_broadcast(fl_udp_server_t *server, const uint8_t *data, size_t size) {
  if (!server || !data) return -1;

  int sent_count = 0;

  for (int i = 0; i < server->session_count; i++) {
    int sent = fl_udp_server_send_to_client(server, i, data, size);
    if (sent > 0) {
      sent_count++;
    }
  }

  return sent_count;
}

int fl_udp_server_cleanup_sessions(fl_udp_server_t *server) {
  if (!server) return -1;

  uint32_t now = (uint32_t)time(NULL) * 1000;
  int removed = 0;

  for (int i = 0; i < server->session_count; i++) {
    if ((now - server->sessions[i].last_activity_ms) > server->session_timeout_ms) {
      free(server->sessions[i].client_address);
      removed++;
    }
  }

  return removed;
}

int fl_udp_server_get_client_count(fl_udp_server_t *server) {
  if (!server) return -1;
  return server->session_count;
}

void fl_udp_server_destroy(fl_udp_server_t *server) {
  if (!server) return;

  for (int i = 0; i < server->session_count; i++) {
    free(server->sessions[i].client_address);
  }

  free(server->sessions);
  fl_socket_close(server->listen_socket);
  fl_socket_destroy(server->listen_socket);
  free(server);

  fprintf(stderr, "[udp] Server destroyed\n");
}

/* ===== Statistics API ===== */

fl_udp_stats_t* fl_udp_get_stats(fl_socket_t *socket) {
  fl_udp_stats_t *stats = (fl_udp_stats_t*)malloc(sizeof(fl_udp_stats_t));
  if (!stats) return NULL;

  pthread_mutex_lock(&udp_stats.lock);
  stats->total_packets_sent = udp_stats.total_packets_sent;
  stats->total_packets_received = udp_stats.total_packets_received;
  stats->total_bytes_sent = udp_stats.total_bytes_sent;
  stats->total_bytes_received = udp_stats.total_bytes_received;
  stats->lost_packets = udp_stats.lost_packets;
  stats->checksum_errors = udp_stats.checksum_errors;
  pthread_mutex_unlock(&udp_stats.lock);

  if (stats->total_packets_sent > 0) {
    stats->packet_loss_rate = (double)stats->lost_packets / stats->total_packets_sent;
  } else {
    stats->packet_loss_rate = 0.0;
  }

  stats->avg_latency_ms = 0.0; // Would need additional tracking
  stats->out_of_order_packets = 0;
  stats->duplicate_packets = 0;

  return stats;
}

void fl_udp_reset_stats(fl_socket_t *socket) {
  pthread_mutex_lock(&udp_stats.lock);
  udp_stats.total_packets_sent = 0;
  udp_stats.total_packets_received = 0;
  udp_stats.total_bytes_sent = 0;
  udp_stats.total_bytes_received = 0;
  udp_stats.lost_packets = 0;
  udp_stats.checksum_errors = 0;
  pthread_mutex_unlock(&udp_stats.lock);

  fprintf(stderr, "[udp] Statistics reset\n");
}

/* ===== Utility Functions ===== */

int fl_udp_is_multicast_address(const char *address) {
  if (!address) return 0;

  struct in_addr addr;
  if (inet_aton(address, &addr) == 0) return 0;

  uint8_t *bytes = (uint8_t*)&addr.s_addr;
  return (bytes[0] >= 224 && bytes[0] < 240) ? 1 : 0;
}

uint16_t fl_udp_calculate_checksum(const uint8_t *data, size_t size) {
  if (!data) return 0;

  uint32_t sum = 0;

  for (size_t i = 0; i < size; i += 2) {
    uint16_t word = (data[i] << 8) | (i + 1 < size ? data[i + 1] : 0);
    sum += word;
    if (sum >> 16) sum = (sum & 0xffff) + (sum >> 16);
  }

  return (~sum) & 0xffff;
}

int fl_udp_get_error(void) {
  return errno;
}

const char* fl_udp_error_message(int error_code) {
  switch (error_code) {
    case -1: return "UDP operation failed";
    case -2: return "Invalid socket";
    case -3: return "Timeout";
    case -4: return "No memory";
    case -5: return "Permission denied";
    default: return "Unknown error";
  }
}
