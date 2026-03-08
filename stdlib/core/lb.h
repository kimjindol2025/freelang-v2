/**
 * FreeLang stdlib/lb - Load Balancer
 * Round-robin, least-connections, weighted distribution, health checks
 */

#ifndef FREELANG_STDLIB_LB_H
#define FREELANG_STDLIB_LB_H

#include <stdint.h>
#include <stddef.h>

/* ===== Load Balancing Algorithms ===== */

typedef enum {
  FL_LB_ROUND_ROBIN = 0,      /* Rotate through servers */
  FL_LB_LEAST_CONNECTIONS = 1, /* Choose least loaded */
  FL_LB_WEIGHTED = 2,          /* Weight-based distribution */
  FL_LB_IP_HASH = 3            /* Client IP hash */
} fl_lb_algorithm_t;

/* ===== Load Balancer Handle ===== */

typedef struct fl_lb_t fl_lb_t;

/* ===== Backend Server ===== */

typedef struct {
  char *host;
  uint16_t port;
  int weight;                  /* For weighted algorithm */
  int is_healthy;             /* Health check status */
  uint64_t total_requests;    /* Lifetime requests */
  uint64_t current_connections;
  int64_t last_health_check;
} fl_lb_backend_t;

/* ===== Health Check Configuration ===== */

typedef struct {
  int enabled;
  int interval_ms;            /* Check interval */
  int timeout_ms;             /* Health check timeout */
  int max_retries;            /* Retries before marking unhealthy */
  char *path;                 /* HTTP path to check */
  uint16_t expected_status;   /* Expected HTTP status */
} fl_lb_health_check_t;

/* ===== Statistics ===== */

typedef struct {
  uint64_t total_requests;
  uint64_t total_bytes_forwarded;
  uint64_t errors;
  uint64_t backend_failures;
  uint64_t request_timeouts;
  double avg_response_time_ms;
} fl_lb_stats_t;

/* ===== Public API ===== */

/* Creation & Destruction */
fl_lb_t* fl_lb_create(fl_lb_algorithm_t algorithm);
void fl_lb_destroy(fl_lb_t *lb);

/* Backend Management */
int fl_lb_add_backend(fl_lb_t *lb, const char *host, uint16_t port, int weight);
int fl_lb_remove_backend(fl_lb_t *lb, const char *host, uint16_t port);
int fl_lb_get_backend_count(fl_lb_t *lb);
fl_lb_backend_t* fl_lb_get_backend(fl_lb_t *lb, int index);

/* Server Selection */
fl_lb_backend_t* fl_lb_select_backend(fl_lb_t *lb, const char *client_ip);
fl_lb_backend_t* fl_lb_select_backend_by_index(fl_lb_t *lb, int index);

/* Health Checks */
int fl_lb_set_health_check(fl_lb_t *lb, const fl_lb_health_check_t *config);
int fl_lb_mark_backend_unhealthy(fl_lb_t *lb, const char *host, uint16_t port);
int fl_lb_mark_backend_healthy(fl_lb_t *lb, const char *host, uint16_t port);
int fl_lb_is_backend_healthy(fl_lb_t *lb, const char *host, uint16_t port);

/* Connection Tracking */
int fl_lb_increment_connection(fl_lb_t *lb, fl_lb_backend_t *backend);
int fl_lb_decrement_connection(fl_lb_t *lb, fl_lb_backend_t *backend);

/* Statistics */
fl_lb_stats_t* fl_lb_get_stats(fl_lb_t *lb);
void fl_lb_reset_stats(fl_lb_t *lb);

/* Algorithm Configuration */
int fl_lb_set_algorithm(fl_lb_t *lb, fl_lb_algorithm_t algorithm);
fl_lb_algorithm_t fl_lb_get_algorithm(fl_lb_t *lb);

#endif /* FREELANG_STDLIB_LB_H */
