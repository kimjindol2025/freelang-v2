/**
 * FreeLang Connection Pool Implementation (Phase 19)
 * High-performance connection pooling for Redis
 */

#include "connection_pool.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>

/* ===== Pool Creation ===== */

fl_connection_pool_t* freelang_pool_create(void) {
  fl_connection_pool_t *pool = (fl_connection_pool_t*)malloc(sizeof(fl_connection_pool_t));
  if (!pool) return NULL;

  memset(pool, 0, sizeof(fl_connection_pool_t));
  pthread_mutex_init(&pool->pool_mutex, NULL);

  fprintf(stderr, "[Pool] Connection pool created\n");
  return pool;
}

/* ===== Pool Destruction ===== */

void freelang_pool_destroy(fl_connection_pool_t *pool) {
  if (!pool) return;

  pthread_mutex_lock(&pool->pool_mutex);

  for (int i = 0; i < pool->server_count; i++) {
    fl_pool_server_t *server = pool->servers[i];
    if (!server) continue;

    /* Close all connections for this server */
    for (int j = 0; j < server->total_connections; j++) {
      if (server->connections[j]) {
        mini_redis_free(server->connections[j]);
        server->connections[j] = NULL;
      }
    }

    free(server->connections);
    free(server);
  }

  pthread_mutex_unlock(&pool->pool_mutex);
  pthread_mutex_destroy(&pool->pool_mutex);
  free(pool);

  fprintf(stderr, "[Pool] Connection pool destroyed\n");
}

/* ===== Helper: Find or Create Server Entry ===== */

static fl_pool_server_t* pool_find_server(fl_connection_pool_t *pool,
                                          const char *host, int port) {
  /* Find existing server entry */
  for (int i = 0; i < pool->server_count; i++) {
    fl_pool_server_t *server = pool->servers[i];
    if (server && strcmp(server->host, host) == 0 && server->port == port) {
      return server;
    }
  }

  return NULL;
}

static fl_pool_server_t* pool_create_server(fl_connection_pool_t *pool,
                                            const char *host, int port) {
  if (pool->server_count >= POOL_MAX_SERVERS) {
    fprintf(stderr, "[Pool] ERROR: Server pool full\n");
    return NULL;
  }

  fl_pool_server_t *server = (fl_pool_server_t*)malloc(sizeof(fl_pool_server_t));
  if (!server) return NULL;

  memset(server, 0, sizeof(fl_pool_server_t));
  strncpy(server->host, host, sizeof(server->host) - 1);
  server->port = port;
  server->failed_attempts = 0;
  server->last_activity = time(NULL);

  /* Allocate initial connections */
  server->connections = (mini_redis_t**)malloc(sizeof(mini_redis_t*) * POOL_MAX_CONNECTIONS);
  if (!server->connections) {
    free(server);
    return NULL;
  }

  memset(server->connections, 0, sizeof(mini_redis_t*) * POOL_MAX_CONNECTIONS);
  server->total_connections = 0;
  server->available_connections = 0;

  /* Create minimum pool size */
  for (int i = 0; i < POOL_MIN_CONNECTIONS; i++) {
    mini_redis_t *conn = mini_redis_new(uv_default_loop());
    if (!conn) {
      fprintf(stderr, "[Pool] WARNING: Failed to create connection %d for %s:%d\n", i, host, port);
      continue;
    }

    server->connections[server->total_connections++] = conn;
    server->available_connections++;
  }

  pool->servers[pool->server_count++] = server;

  fprintf(stderr, "[Pool] Server pool created: %s:%d (%d connections)\n",
          host, port, server->available_connections);

  return server;
}

/* ===== Get Connection from Pool ===== */

mini_redis_t* freelang_pool_get_connection(fl_connection_pool_t *pool,
                                           const char *host, int port) {
  if (!pool || !host) return NULL;

  pthread_mutex_lock(&pool->pool_mutex);

  /* Find or create server entry */
  fl_pool_server_t *server = pool_find_server(pool, host, port);
  if (!server) {
    server = pool_create_server(pool, host, port);
    if (!server) {
      pthread_mutex_unlock(&pool->pool_mutex);
      return NULL;
    }
  }

  /* Find available connection */
  mini_redis_t *conn = NULL;
  for (int i = 0; i < server->total_connections; i++) {
    if (server->connections[i]) {
      conn = server->connections[i];
      server->connections[i] = NULL;  /* Mark as taken */
      server->available_connections--;
      server->active_connections++;
      break;
    }
  }

  /* Create new connection if needed and pool not full */
  if (!conn && server->total_connections < POOL_MAX_CONNECTIONS) {
    conn = mini_redis_new(uv_default_loop());
    if (conn) {
      server->total_connections++;
      server->active_connections++;
      fprintf(stderr, "[Pool] New connection created for %s:%d (total: %d)\n",
              host, port, server->total_connections);
    }
  }

  server->last_activity = time(NULL);
  pthread_mutex_unlock(&pool->pool_mutex);

  if (conn) {
    fprintf(stderr, "[Pool] Connection retrieved: %s:%d (active: %d, available: %d)\n",
            host, port, server->active_connections, server->available_connections);
  }

  return conn;
}

/* ===== Return Connection to Pool ===== */

void freelang_pool_return_connection(fl_connection_pool_t *pool,
                                     const char *host, int port,
                                     mini_redis_t *conn) {
  if (!pool || !host || !conn) return;

  pthread_mutex_lock(&pool->pool_mutex);

  fl_pool_server_t *server = pool_find_server(pool, host, port);
  if (!server) {
    pthread_mutex_unlock(&pool->pool_mutex);
    fprintf(stderr, "[Pool] WARNING: Server not found for %s:%d\n", host, port);
    mini_redis_free(conn);
    return;
  }

  /* Find empty slot in connections array */
  int slot = -1;
  for (int i = 0; i < server->total_connections; i++) {
    if (!server->connections[i]) {
      slot = i;
      break;
    }
  }

  if (slot >= 0) {
    server->connections[slot] = conn;
    server->available_connections++;
    server->active_connections--;
    server->failed_attempts = 0;  /* Reset failure count on successful return */
    fprintf(stderr, "[Pool] Connection returned: %s:%d (active: %d, available: %d)\n",
            host, port, server->active_connections, server->available_connections);
  } else {
    /* No slot available, close the connection */
    mini_redis_free(conn);
    fprintf(stderr, "[Pool] WARNING: No slot for returning connection, closed\n");
  }

  server->last_activity = time(NULL);
  pthread_mutex_unlock(&pool->pool_mutex);
}

/* ===== Get Pool Statistics ===== */

fl_pool_stats_t freelang_pool_get_stats(fl_connection_pool_t *pool) {
  fl_pool_stats_t stats = {0, 0, 0, 0};

  if (!pool) return stats;

  pthread_mutex_lock(&pool->pool_mutex);

  stats.total_servers = pool->server_count;

  for (int i = 0; i < pool->server_count; i++) {
    fl_pool_server_t *server = pool->servers[i];
    if (server) {
      stats.total_connections += server->total_connections;
      stats.available_connections += server->available_connections;
      stats.active_connections += server->active_connections;
    }
  }

  pthread_mutex_unlock(&pool->pool_mutex);

  return stats;
}

/* ===== Reset Pool ===== */

void freelang_pool_reset(fl_connection_pool_t *pool) {
  if (!pool) return;

  pthread_mutex_lock(&pool->pool_mutex);

  for (int i = 0; i < pool->server_count; i++) {
    fl_pool_server_t *server = pool->servers[i];
    if (!server) continue;

    /* Close all connections */
    for (int j = 0; j < server->total_connections; j++) {
      if (server->connections[j]) {
        mini_redis_free(server->connections[j]);
        server->connections[j] = NULL;
      }
    }

    server->total_connections = 0;
    server->available_connections = 0;
    server->active_connections = 0;

    fprintf(stderr, "[Pool] Server pool reset: %s:%d\n", server->host, server->port);
  }

  pthread_mutex_unlock(&pool->pool_mutex);
}
