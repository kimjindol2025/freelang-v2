/**
 * FreeLang Load Balancer Implementation (Phase 20)
 * Distributed request routing and load balancing
 */

#include "load_balancer.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>

/* ===== Load Balancer Creation ===== */

fl_load_balancer_t* freelang_load_balancer_create(fl_lb_strategy_t strategy,
                                                   fl_connection_pool_t *pool) {
  fl_load_balancer_t *lb = (fl_load_balancer_t*)malloc(sizeof(fl_load_balancer_t));
  if (!lb) return NULL;

  memset(lb, 0, sizeof(fl_load_balancer_t));
  pthread_mutex_init(&lb->lb_mutex, NULL);

  lb->strategy = strategy;
  lb->pool = pool;
  lb->current_index = 0;

  const char *strategy_name[] = {
    "Round-Robin", "Least Connections", "Weighted", "Random"
  };

  fprintf(stderr, "[LoadBalancer] Created with strategy: %s\n",
          strategy_name[strategy]);

  return lb;
}

/* ===== Server Management ===== */

int freelang_load_balancer_add_server(fl_load_balancer_t *lb,
                                       const char *host, int port,
                                       int weight) {
  if (!lb || !host) return -1;

  pthread_mutex_lock(&lb->lb_mutex);

  if (lb->server_count >= 16) {
    fprintf(stderr, "[LoadBalancer] ERROR: Max servers reached\n");
    pthread_mutex_unlock(&lb->lb_mutex);
    return -1;
  }

  fl_lb_server_t *server = &lb->servers[lb->server_count];
  strncpy(server->host, host, sizeof(server->host) - 1);
  server->port = port;
  server->weight = (weight > 0 && weight <= 10) ? weight : 1;
  server->healthy = 1;
  server->last_used = 0;

  int server_id = lb->server_count;
  lb->server_count++;

  fprintf(stderr, "[LoadBalancer] Server added: %s:%d (id: %d, weight: %d)\n",
          host, port, server_id, server->weight);

  pthread_mutex_unlock(&lb->lb_mutex);
  return server_id;
}

void freelang_load_balancer_remove_server(fl_load_balancer_t *lb, int server_id) {
  if (!lb || server_id < 0 || server_id >= lb->server_count) return;

  pthread_mutex_lock(&lb->lb_mutex);

  for (int i = server_id; i < lb->server_count - 1; i++) {
    lb->servers[i] = lb->servers[i + 1];
  }

  lb->server_count--;

  fprintf(stderr, "[LoadBalancer] Server removed: id %d\n", server_id);

  pthread_mutex_unlock(&lb->lb_mutex);
}

/* ===== Strategy Implementations ===== */

fl_lb_server_t* _lb_select_round_robin(fl_load_balancer_t *lb) {
  if (lb->server_count == 0) return NULL;

  fl_lb_server_t *server = &lb->servers[lb->current_index];

  lb->current_index = (lb->current_index + 1) % lb->server_count;

  return server;
}

fl_lb_server_t* _lb_select_least_connections(fl_load_balancer_t *lb) {
  if (lb->server_count == 0) return NULL;

  fl_lb_server_t *least_loaded = &lb->servers[0];
  int min_connections = least_loaded->active_connections;

  for (int i = 1; i < lb->server_count; i++) {
    if (lb->servers[i].active_connections < min_connections) {
      least_loaded = &lb->servers[i];
      min_connections = lb->servers[i].active_connections;
    }
  }

  return least_loaded;
}

fl_lb_server_t* _lb_select_weighted(fl_load_balancer_t *lb) {
  if (lb->server_count == 0) return NULL;

  int total_weight = 0;
  for (int i = 0; i < lb->server_count; i++) {
    total_weight += lb->servers[i].weight;
  }

  int random_weight = rand() % total_weight;
  int current = 0;

  for (int i = 0; i < lb->server_count; i++) {
    current += lb->servers[i].weight;
    if (random_weight < current) {
      return &lb->servers[i];
    }
  }

  return &lb->servers[0];
}

fl_lb_server_t* _lb_select_random(fl_load_balancer_t *lb) {
  if (lb->server_count == 0) return NULL;

  int index = rand() % lb->server_count;
  return &lb->servers[index];
}

/* ===== Request Routing ===== */

fl_lb_server_t* freelang_load_balancer_select_server(fl_load_balancer_t *lb) {
  if (!lb || lb->server_count == 0) return NULL;

  pthread_mutex_lock(&lb->lb_mutex);

  fl_lb_server_t *server = NULL;

  switch (lb->strategy) {
    case LB_STRATEGY_ROUND_ROBIN:
      server = _lb_select_round_robin(lb);
      break;
    case LB_STRATEGY_LEAST_CONNECTIONS:
      server = _lb_select_least_connections(lb);
      break;
    case LB_STRATEGY_WEIGHTED:
      server = _lb_select_weighted(lb);
      break;
    case LB_STRATEGY_RANDOM:
      server = _lb_select_random(lb);
      break;
    default:
      server = &lb->servers[0];
  }

  if (server) {
    server->last_used = time(NULL);
    fprintf(stderr, "[LoadBalancer] Selected: %s:%d (active: %d)\n",
            server->host, server->port, server->active_connections);
  }

  pthread_mutex_unlock(&lb->lb_mutex);
  return server;
}

fl_lb_server_t* freelang_load_balancer_get_server(fl_load_balancer_t *lb,
                                                   int server_id) {
  if (!lb || server_id < 0 || server_id >= lb->server_count) return NULL;

  pthread_mutex_lock(&lb->lb_mutex);
  fl_lb_server_t *server = &lb->servers[server_id];
  pthread_mutex_unlock(&lb->lb_mutex);

  return server;
}

void freelang_load_balancer_record_success(fl_load_balancer_t *lb,
                                            fl_lb_server_t *server) {
  if (!lb || !server) return;

  pthread_mutex_lock(&lb->lb_mutex);
  server->total_requests++;
  pthread_mutex_unlock(&lb->lb_mutex);
}

void freelang_load_balancer_record_failure(fl_load_balancer_t *lb,
                                            fl_lb_server_t *server) {
  if (!lb || !server) return;

  pthread_mutex_lock(&lb->lb_mutex);
  server->failed_requests++;
  pthread_mutex_unlock(&lb->lb_mutex);
}

/* ===== Health Management ===== */

void freelang_load_balancer_set_health(fl_load_balancer_t *lb,
                                        int server_id, int healthy) {
  if (!lb || server_id < 0 || server_id >= lb->server_count) return;

  pthread_mutex_lock(&lb->lb_mutex);
  lb->servers[server_id].healthy = healthy;

  fprintf(stderr, "[LoadBalancer] Health updated: server %d = %s\n",
          server_id, healthy ? "healthy" : "unhealthy");

  pthread_mutex_unlock(&lb->lb_mutex);
}

int freelang_load_balancer_get_health(fl_load_balancer_t *lb, int server_id) {
  if (!lb || server_id < 0 || server_id >= lb->server_count) return 0;

  pthread_mutex_lock(&lb->lb_mutex);
  int healthy = lb->servers[server_id].healthy;
  pthread_mutex_unlock(&lb->lb_mutex);

  return healthy;
}

void freelang_load_balancer_health_check(fl_load_balancer_t *lb) {
  if (!lb) return;

  pthread_mutex_lock(&lb->lb_mutex);

  fprintf(stderr, "[LoadBalancer] Health check running...\n");

  for (int i = 0; i < lb->server_count; i++) {
    float success_rate = 1.0f;
    if (lb->servers[i].total_requests > 0) {
      success_rate = 1.0f - ((float)lb->servers[i].failed_requests /
                             (float)lb->servers[i].total_requests);
    }

    int healthy = (success_rate > 0.95f);  /* 95% success threshold */
    lb->servers[i].healthy = healthy;

    fprintf(stderr, "[LoadBalancer]   [%d] %s:%d - success: %.1f%%\n",
            i, lb->servers[i].host, lb->servers[i].port, success_rate * 100);
  }

  pthread_mutex_unlock(&lb->lb_mutex);
}

/* ===== Statistics ===== */

fl_lb_stats_t freelang_load_balancer_get_stats(fl_load_balancer_t *lb) {
  fl_lb_stats_t stats = {0, 0, 0.0, -1, 0.0};

  if (!lb) return stats;

  pthread_mutex_lock(&lb->lb_mutex);

  int total_requests = 0;
  int total_connections = 0;
  int healthiest_id = -1;
  int max_requests = 0;

  for (int i = 0; i < lb->server_count; i++) {
    total_requests += lb->servers[i].total_requests;
    total_connections += lb->servers[i].active_connections;
    stats.failed_requests += lb->servers[i].failed_requests;

    if (lb->servers[i].total_requests > max_requests) {
      max_requests = lb->servers[i].total_requests;
      healthiest_id = i;
    }
  }

  stats.total_requests = total_requests;
  stats.healthiest_server_id = healthiest_id;

  if (lb->server_count > 0) {
    stats.average_connections_per_server = (double)total_connections /
                                            (double)lb->server_count;
  }

  pthread_mutex_unlock(&lb->lb_mutex);
  return stats;
}

void freelang_load_balancer_set_strategy(fl_load_balancer_t *lb,
                                          fl_lb_strategy_t strategy) {
  if (!lb) return;

  pthread_mutex_lock(&lb->lb_mutex);
  lb->strategy = strategy;

  const char *strategy_name[] = {
    "Round-Robin", "Least Connections", "Weighted", "Random"
  };

  fprintf(stderr, "[LoadBalancer] Strategy changed to: %s\n",
          strategy_name[strategy]);

  pthread_mutex_unlock(&lb->lb_mutex);
}

void freelang_load_balancer_reset_stats(fl_load_balancer_t *lb) {
  if (!lb) return;

  pthread_mutex_lock(&lb->lb_mutex);

  for (int i = 0; i < lb->server_count; i++) {
    lb->servers[i].total_requests = 0;
    lb->servers[i].failed_requests = 0;
  }

  fprintf(stderr, "[LoadBalancer] Statistics reset\n");

  pthread_mutex_unlock(&lb->lb_mutex);
}

void freelang_load_balancer_destroy(fl_load_balancer_t *lb) {
  if (!lb) return;

  pthread_mutex_destroy(&lb->lb_mutex);
  free(lb);

  fprintf(stderr, "[LoadBalancer] Destroyed\n");
}
