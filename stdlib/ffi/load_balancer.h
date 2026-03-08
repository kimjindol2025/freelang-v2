/**
 * FreeLang Load Balancer (Phase 20)
 * Distribute connections across multiple Redis servers
 */

#ifndef FREELANG_LOAD_BALANCER_H
#define FREELANG_LOAD_BALANCER_H

#include "connection_pool.h"
#include <pthread.h>

/* ===== Load Balancing Strategy ===== */

typedef enum {
  LB_STRATEGY_ROUND_ROBIN = 0,        /* Rotate through servers */
  LB_STRATEGY_LEAST_CONNECTIONS = 1,  /* Choose least loaded */
  LB_STRATEGY_WEIGHTED = 2,            /* Weighted distribution */
  LB_STRATEGY_RANDOM = 3               /* Random selection */
} fl_lb_strategy_t;

/* ===== Server Entry in Load Balancer ===== */

typedef struct {
  char host[256];
  int port;
  int weight;                          /* 1-10, higher = more load */
  int active_connections;              /* Current active connections */
  int total_requests;                  /* Lifetime requests */
  int failed_requests;                 /* Failed requests */
  int64_t last_used;                   /* Last use timestamp */
  int healthy;                         /* Health status */
} fl_lb_server_t;

/* ===== Load Balancer State ===== */

typedef struct {
  fl_lb_server_t servers[16];          /* Pool of servers */
  int server_count;

  fl_lb_strategy_t strategy;           /* Current strategy */

  int current_index;                   /* For round-robin */

  fl_connection_pool_t *pool;          /* Connection pool reference */

  pthread_mutex_t lb_mutex;            /* Thread-safe access */
} fl_load_balancer_t;

/* ===== Statistics ===== */

typedef struct {
  int total_requests;                  /* Total requests handled */
  int failed_requests;                 /* Failed requests */
  double average_connections_per_server;
  int healthiest_server_id;            /* Server with most success */
  double request_distribution_variance; /* Fairness measure */
} fl_lb_stats_t;

/* ===== Public API: Initialization ===== */

/* Create load balancer */
fl_load_balancer_t* freelang_load_balancer_create(fl_lb_strategy_t strategy,
                                                   fl_connection_pool_t *pool);

/* Add server to load balancer */
int freelang_load_balancer_add_server(fl_load_balancer_t *lb,
                                       const char *host, int port,
                                       int weight);

/* Remove server from load balancer */
void freelang_load_balancer_remove_server(fl_load_balancer_t *lb, int server_id);

/* ===== Public API: Request Routing ===== */

/* Select next server (based on strategy) */
fl_lb_server_t* freelang_load_balancer_select_server(fl_load_balancer_t *lb);

/* Get specific server by ID */
fl_lb_server_t* freelang_load_balancer_get_server(fl_load_balancer_t *lb,
                                                   int server_id);

/* Record successful request */
void freelang_load_balancer_record_success(fl_load_balancer_t *lb,
                                            fl_lb_server_t *server);

/* Record failed request */
void freelang_load_balancer_record_failure(fl_load_balancer_t *lb,
                                            fl_lb_server_t *server);

/* ===== Public API: Health Management ===== */

/* Set server health status */
void freelang_load_balancer_set_health(fl_load_balancer_t *lb,
                                        int server_id, int healthy);

/* Get server health status */
int freelang_load_balancer_get_health(fl_load_balancer_t *lb, int server_id);

/* Check all servers and update health */
void freelang_load_balancer_health_check(fl_load_balancer_t *lb);

/* ===== Public API: Statistics & Management ===== */

/* Get load balancer statistics */
fl_lb_stats_t freelang_load_balancer_get_stats(fl_load_balancer_t *lb);

/* Switch load balancing strategy */
void freelang_load_balancer_set_strategy(fl_load_balancer_t *lb,
                                          fl_lb_strategy_t strategy);

/* Reset statistics */
void freelang_load_balancer_reset_stats(fl_load_balancer_t *lb);

/* Destroy load balancer */
void freelang_load_balancer_destroy(fl_load_balancer_t *lb);

/* ===== Strategy Implementations (Internal) ===== */

/* Round-robin selection */
fl_lb_server_t* _lb_select_round_robin(fl_load_balancer_t *lb);

/* Least connections selection */
fl_lb_server_t* _lb_select_least_connections(fl_load_balancer_t *lb);

/* Weighted selection */
fl_lb_server_t* _lb_select_weighted(fl_load_balancer_t *lb);

/* Random selection */
fl_lb_server_t* _lb_select_random(fl_load_balancer_t *lb);

#endif /* FREELANG_LOAD_BALANCER_H */
