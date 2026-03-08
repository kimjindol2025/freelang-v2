/**
 * FreeLang Redis Cluster Support (Phase 21)
 * Distributed Redis cluster integration and slot management
 */

#ifndef FREELANG_CLUSTER_H
#define FREELANG_CLUSTER_H

#include "connection_pool.h"
#include <pthread.h>

/* ===== Cluster Configuration ===== */

#define CLUSTER_MAX_NODES 16            /* Max nodes in cluster */
#define CLUSTER_SLOTS 16384             /* Redis cluster slots */
#define CLUSTER_HASH_SLOTS 16384        /* Hash slot count */

/* ===== Cluster Node ===== */

typedef struct {
  char node_id[41];                    /* Node identifier */
  char host[256];
  int port;

  int64_t connected_at;                /* Connection time */
  int healthy;                         /* Health status */

  int slots_start;                     /* Slot range start */
  int slots_end;                       /* Slot range end */
  int slot_count;                      /* Number of slots */

  int64_t last_ping;                   /* Last ping time */
  int replicas;                        /* Number of replicas */

  fl_connection_pool_t *pool;          /* Node's connection pool */
} fl_cluster_node_t;

/* ===== Slot Mapping ===== */

typedef struct {
  fl_cluster_node_t *node;             /* Owning node */
  int slot_id;                         /* Slot number (0-16383) */
  int64_t last_accessed;               /* Last access time */
} fl_cluster_slot_t;

/* ===== Cluster State ===== */

typedef struct {
  fl_cluster_node_t nodes[CLUSTER_MAX_NODES];
  int node_count;

  fl_cluster_slot_t slots[CLUSTER_SLOTS];  /* Slot to node mapping */

  int cluster_enabled;                 /* Is clustering enabled? */
  int slots_covered;                   /* How many slots are covered */

  int redirects;                       /* MOVED/ASK redirects */
  int failures;                        /* Failed operations */

  pthread_mutex_t cluster_mutex;       /* Thread-safe access */
} fl_cluster_state_t;

/* ===== Statistics ===== */

typedef struct {
  int total_nodes;                     /* Nodes in cluster */
  int healthy_nodes;                   /* Healthy nodes */
  int total_slots;                     /* Covered slots */
  int total_operations;                /* Total operations */
  int redirected_operations;           /* Redirected ops */
  double average_slot_coverage;        /* % of slots covered */
} fl_cluster_stats_t;

/* ===== Public API: Cluster Initialization ===== */

/* Create cluster state */
fl_cluster_state_t* freelang_cluster_create(void);

/* Initialize cluster (CLUSTER SLOTS) */
int freelang_cluster_initialize(fl_cluster_state_t *cluster,
                                 const char *seed_host, int seed_port);

/* Destroy cluster */
void freelang_cluster_destroy(fl_cluster_state_t *cluster);

/* ===== Public API: Node Management ===== */

/* Add node to cluster */
int freelang_cluster_add_node(fl_cluster_state_t *cluster,
                               const char *node_id, const char *host, int port);

/* Remove node from cluster */
void freelang_cluster_remove_node(fl_cluster_state_t *cluster,
                                   const char *node_id);

/* Get node by ID */
fl_cluster_node_t* freelang_cluster_get_node(fl_cluster_state_t *cluster,
                                              const char *node_id);

/* ===== Public API: Slot Routing ===== */

/* Find node for key (hash slot routing) */
fl_cluster_node_t* freelang_cluster_find_node_for_key(fl_cluster_state_t *cluster,
                                                       const char *key);

/* Find node for slot */
fl_cluster_node_t* freelang_cluster_find_node_for_slot(fl_cluster_state_t *cluster,
                                                        int slot);

/* Calculate hash slot for key */
int freelang_cluster_calculate_slot(const char *key);

/* Update slot ownership */
void freelang_cluster_update_slot(fl_cluster_state_t *cluster,
                                   int slot, fl_cluster_node_t *node);

/* ===== Public API: Health Management ===== */

/* Check node health (PING) */
int freelang_cluster_ping_node(fl_cluster_state_t *cluster,
                                fl_cluster_node_t *node);

/* Perform cluster health check */
void freelang_cluster_health_check(fl_cluster_state_t *cluster);

/* Get node health status */
int freelang_cluster_get_node_health(fl_cluster_state_t *cluster,
                                      const char *node_id);

/* ===== Public API: Redirection Handling ===== */

/* Handle MOVED redirect (slot migrated) */
void freelang_cluster_handle_moved(fl_cluster_state_t *cluster,
                                    int slot, const char *new_host, int new_port);

/* Handle ASK redirect (slot migrating) */
void freelang_cluster_handle_ask(fl_cluster_state_t *cluster,
                                  int slot, const char *new_host, int new_port);

/* Force cluster refresh */
void freelang_cluster_refresh_slots(fl_cluster_state_t *cluster);

/* ===== Public API: Statistics & Monitoring ===== */

/* Get cluster statistics */
fl_cluster_stats_t freelang_cluster_get_stats(fl_cluster_state_t *cluster);

/* List all nodes */
void freelang_cluster_list_nodes(fl_cluster_state_t *cluster,
                                  fl_cluster_node_t **nodes, int *count);

/* Reset statistics */
void freelang_cluster_reset_stats(fl_cluster_state_t *cluster);

/* ===== Helper Functions ===== */

/* CRC16 hash for key slot calculation */
int _cluster_crc16(const char *key);

/* Get slot from CRC16 hash */
int _cluster_get_slot(int hash);

#endif /* FREELANG_CLUSTER_H */
