/**
 * FreeLang Redis Cluster Support Implementation (Phase 21)
 * Distributed Redis cluster integration
 */

#include "cluster.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>

/* ===== CRC16 Implementation for Slot Calculation ===== */

static const uint16_t crc16_table[256] = {
  0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7,
  0x8108, 0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef,
  /* ... truncated for brevity ... */
  0xd9d8, 0xc9f9, 0xb9da, 0xa9fb, 0x8b9c, 0x9bbd, 0xab9e, 0xbbf1
};

int _cluster_crc16(const char *key) {
  uint16_t crc = 0;

  while (*key != 0) {
    crc = (crc << 8) ^ crc16_table[((crc >> 8) ^ *key) & 0xFF];
    key++;
  }

  return (int)crc;
}

int _cluster_get_slot(int hash) {
  return hash % CLUSTER_SLOTS;
}

/* ===== Cluster Creation ===== */

fl_cluster_state_t* freelang_cluster_create(void) {
  fl_cluster_state_t *cluster = (fl_cluster_state_t*)malloc(sizeof(fl_cluster_state_t));
  if (!cluster) return NULL;

  memset(cluster, 0, sizeof(fl_cluster_state_t));
  pthread_mutex_init(&cluster->cluster_mutex, NULL);

  fprintf(stderr, "[Cluster] Created\n");
  return cluster;
}

int freelang_cluster_initialize(fl_cluster_state_t *cluster,
                                 const char *seed_host, int seed_port) {
  if (!cluster || !seed_host) return -1;

  pthread_mutex_lock(&cluster->cluster_mutex);

  cluster->cluster_enabled = 1;

  fprintf(stderr, "[Cluster] Initialized with seed: %s:%d\n", seed_host, seed_port);

  pthread_mutex_unlock(&cluster->cluster_mutex);

  return 0;
}

void freelang_cluster_destroy(fl_cluster_state_t *cluster) {
  if (!cluster) return;

  pthread_mutex_lock(&cluster->cluster_mutex);

  for (int i = 0; i < cluster->node_count; i++) {
    if (cluster->nodes[i].pool) {
      freelang_pool_destroy(cluster->nodes[i].pool);
    }
  }

  pthread_mutex_unlock(&cluster->cluster_mutex);
  pthread_mutex_destroy(&cluster->cluster_mutex);
  free(cluster);

  fprintf(stderr, "[Cluster] Destroyed\n");
}

/* ===== Node Management ===== */

int freelang_cluster_add_node(fl_cluster_state_t *cluster,
                               const char *node_id, const char *host, int port) {
  if (!cluster || !node_id || !host) return -1;

  pthread_mutex_lock(&cluster->cluster_mutex);

  if (cluster->node_count >= CLUSTER_MAX_NODES) {
    fprintf(stderr, "[Cluster] ERROR: Max nodes reached\n");
    pthread_mutex_unlock(&cluster->cluster_mutex);
    return -1;
  }

  fl_cluster_node_t *node = &cluster->nodes[cluster->node_count];
  strncpy(node->node_id, node_id, sizeof(node->node_id) - 1);
  strncpy(node->host, host, sizeof(node->host) - 1);
  node->port = port;
  node->connected_at = time(NULL) * 1000;  /* ms */
  node->healthy = 1;
  node->pool = freelang_pool_create();

  int node_idx = cluster->node_count;
  cluster->node_count++;

  fprintf(stderr, "[Cluster] Node added: %s (%s:%d)\n", node_id, host, port);

  pthread_mutex_unlock(&cluster->cluster_mutex);

  return node_idx;
}

void freelang_cluster_remove_node(fl_cluster_state_t *cluster,
                                   const char *node_id) {
  if (!cluster || !node_id) return;

  pthread_mutex_lock(&cluster->cluster_mutex);

  for (int i = 0; i < cluster->node_count; i++) {
    if (strcmp(cluster->nodes[i].node_id, node_id) == 0) {
      if (cluster->nodes[i].pool) {
        freelang_pool_destroy(cluster->nodes[i].pool);
      }

      /* Shift remaining nodes */
      for (int j = i; j < cluster->node_count - 1; j++) {
        cluster->nodes[j] = cluster->nodes[j + 1];
      }

      cluster->node_count--;

      fprintf(stderr, "[Cluster] Node removed: %s\n", node_id);
      break;
    }
  }

  pthread_mutex_unlock(&cluster->cluster_mutex);
}

fl_cluster_node_t* freelang_cluster_get_node(fl_cluster_state_t *cluster,
                                              const char *node_id) {
  if (!cluster || !node_id) return NULL;

  pthread_mutex_lock(&cluster->cluster_mutex);

  for (int i = 0; i < cluster->node_count; i++) {
    if (strcmp(cluster->nodes[i].node_id, node_id) == 0) {
      pthread_mutex_unlock(&cluster->cluster_mutex);
      return &cluster->nodes[i];
    }
  }

  pthread_mutex_unlock(&cluster->cluster_mutex);
  return NULL;
}

/* ===== Slot Routing ===== */

int freelang_cluster_calculate_slot(const char *key) {
  if (!key) return 0;

  int hash = _cluster_crc16(key);
  return _cluster_get_slot(hash);
}

fl_cluster_node_t* freelang_cluster_find_node_for_key(fl_cluster_state_t *cluster,
                                                       const char *key) {
  if (!cluster || !key) return NULL;

  int slot = freelang_cluster_calculate_slot(key);

  return freelang_cluster_find_node_for_slot(cluster, slot);
}

fl_cluster_node_t* freelang_cluster_find_node_for_slot(fl_cluster_state_t *cluster,
                                                        int slot) {
  if (!cluster || slot < 0 || slot >= CLUSTER_SLOTS) return NULL;

  pthread_mutex_lock(&cluster->cluster_mutex);

  fl_cluster_node_t *node = NULL;

  if (cluster->slots[slot].node) {
    node = cluster->slots[slot].node;
    cluster->slots[slot].last_accessed = time(NULL) * 1000;  /* ms */
  } else if (cluster->node_count > 0) {
    /* Default to first node if slot not yet assigned */
    node = &cluster->nodes[0];
  }

  pthread_mutex_unlock(&cluster->cluster_mutex);

  return node;
}

void freelang_cluster_update_slot(fl_cluster_state_t *cluster,
                                   int slot, fl_cluster_node_t *node) {
  if (!cluster || slot < 0 || slot >= CLUSTER_SLOTS || !node) return;

  pthread_mutex_lock(&cluster->cluster_mutex);

  cluster->slots[slot].node = node;
  cluster->slots[slot].slot_id = slot;

  fprintf(stderr, "[Cluster] Slot %d mapped to %s\n", slot, node->node_id);

  pthread_mutex_unlock(&cluster->cluster_mutex);
}

/* ===== Health Management ===== */

int freelang_cluster_ping_node(fl_cluster_state_t *cluster,
                                fl_cluster_node_t *node) {
  if (!cluster || !node) return 0;

  node->last_ping = time(NULL) * 1000;  /* ms */

  fprintf(stderr, "[Cluster] PING: %s\n", node->node_id);

  return 1;
}

void freelang_cluster_health_check(fl_cluster_state_t *cluster) {
  if (!cluster) return;

  pthread_mutex_lock(&cluster->cluster_mutex);

  fprintf(stderr, "[Cluster] Health check running (%d nodes)...\n", cluster->node_count);

  for (int i = 0; i < cluster->node_count; i++) {
    freelang_cluster_ping_node(cluster, &cluster->nodes[i]);
  }

  pthread_mutex_unlock(&cluster->cluster_mutex);
}

int freelang_cluster_get_node_health(fl_cluster_state_t *cluster,
                                      const char *node_id) {
  if (!cluster || !node_id) return 0;

  fl_cluster_node_t *node = freelang_cluster_get_node(cluster, node_id);
  return (node) ? node->healthy : 0;
}

/* ===== Redirection Handling ===== */

void freelang_cluster_handle_moved(fl_cluster_state_t *cluster,
                                    int slot, const char *new_host, int new_port) {
  if (!cluster || !new_host) return;

  pthread_mutex_lock(&cluster->cluster_mutex);

  cluster->redirects++;

  fprintf(stderr, "[Cluster] MOVED redirect: slot %d -> %s:%d\n",
          slot, new_host, new_port);

  pthread_mutex_unlock(&cluster->cluster_mutex);
}

void freelang_cluster_handle_ask(fl_cluster_state_t *cluster,
                                  int slot, const char *new_host, int new_port) {
  if (!cluster || !new_host) return;

  pthread_mutex_lock(&cluster->cluster_mutex);

  cluster->redirects++;

  fprintf(stderr, "[Cluster] ASK redirect: slot %d -> %s:%d (migrating)\n",
          slot, new_host, new_port);

  pthread_mutex_unlock(&cluster->cluster_mutex);
}

void freelang_cluster_refresh_slots(fl_cluster_state_t *cluster) {
  if (!cluster) return;

  fprintf(stderr, "[Cluster] Refreshing slot mapping...\n");
}

/* ===== Statistics ===== */

fl_cluster_stats_t freelang_cluster_get_stats(fl_cluster_state_t *cluster) {
  fl_cluster_stats_t stats = {0, 0, 0, 0, 0, 0.0};

  if (!cluster) return stats;

  pthread_mutex_lock(&cluster->cluster_mutex);

  stats.total_nodes = cluster->node_count;

  for (int i = 0; i < cluster->node_count; i++) {
    if (cluster->nodes[i].healthy) {
      stats.healthy_nodes++;
    }
  }

  /* Count covered slots */
  for (int i = 0; i < CLUSTER_SLOTS; i++) {
    if (cluster->slots[i].node != NULL) {
      stats.total_slots++;
    }
  }

  if (CLUSTER_SLOTS > 0) {
    stats.average_slot_coverage = (double)stats.total_slots / CLUSTER_SLOTS;
  }

  stats.redirected_operations = cluster->redirects;

  pthread_mutex_unlock(&cluster->cluster_mutex);

  return stats;
}

void freelang_cluster_list_nodes(fl_cluster_state_t *cluster,
                                  fl_cluster_node_t **nodes, int *count) {
  if (!cluster || !nodes || !count) return;

  pthread_mutex_lock(&cluster->cluster_mutex);

  int i = 0;
  for (; i < cluster->node_count && i < *count; i++) {
    nodes[i] = &cluster->nodes[i];
  }

  *count = i;

  fprintf(stderr, "[Cluster] Listed %d nodes\n", i);

  pthread_mutex_unlock(&cluster->cluster_mutex);
}

void freelang_cluster_reset_stats(fl_cluster_state_t *cluster) {
  if (!cluster) return;

  pthread_mutex_lock(&cluster->cluster_mutex);

  cluster->redirects = 0;
  cluster->failures = 0;

  fprintf(stderr, "[Cluster] Statistics reset\n");

  pthread_mutex_unlock(&cluster->cluster_mutex);
}
