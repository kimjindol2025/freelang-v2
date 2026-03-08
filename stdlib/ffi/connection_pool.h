/**
 * FreeLang Connection Pool (Phase 19)
 * Manages multiple Redis connections for high performance
 */

#ifndef FREELANG_CONNECTION_POOL_H
#define FREELANG_CONNECTION_POOL_H

#include "mini_redis.h"

/* ===== Connection Pool Configuration ===== */

#define POOL_MAX_SERVERS 16         /* Max number of pooled servers */
#define POOL_MIN_CONNECTIONS 2      /* Min connections per server */
#define POOL_MAX_CONNECTIONS 10     /* Max connections per server */
#define POOL_IDLE_TIMEOUT 300       /* Idle connection timeout (sec) */

/* ===== Pool Entry ===== */

typedef struct {
  char host[256];
  int port;
  mini_redis_t **connections;     /* Array of mini_redis_t pointers */
  int total_connections;          /* Total in pool */
  int available_connections;      /* Currently available */
  int active_connections;         /* Currently in use */
  int failed_attempts;            /* Consecutive connection failures */
  int last_activity;              /* Last activity timestamp */
} fl_pool_server_t;

/* ===== Pool Manager ===== */

typedef struct {
  fl_pool_server_t *servers[POOL_MAX_SERVERS];
  int server_count;
  pthread_mutex_t pool_mutex;
} fl_connection_pool_t;

/* ===== Public API ===== */

/* Initialize connection pool */
fl_connection_pool_t* freelang_pool_create(void);

/* Destroy connection pool */
void freelang_pool_destroy(fl_connection_pool_t *pool);

/* Get connection from pool (creates new if needed) */
mini_redis_t* freelang_pool_get_connection(fl_connection_pool_t *pool,
                                           const char *host, int port);

/* Return connection to pool */
void freelang_pool_return_connection(fl_connection_pool_t *pool,
                                     const char *host, int port,
                                     mini_redis_t *conn);

/* Get pool statistics */
typedef struct {
  int total_servers;
  int total_connections;
  int available_connections;
  int active_connections;
} fl_pool_stats_t;

fl_pool_stats_t freelang_pool_get_stats(fl_connection_pool_t *pool);

/* Reset pool (close all connections) */
void freelang_pool_reset(fl_connection_pool_t *pool);

#endif /* FREELANG_CONNECTION_POOL_H */
