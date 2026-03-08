/**
 * FreeLang API Gateway (Phase 24)
 * Reverse proxy, request routing, service discovery
 */

#ifndef FREELANG_GATEWAY_H
#define FREELANG_GATEWAY_H

#include <time.h>
#include <pthread.h>

/* ===== Service Backend ===== */

typedef struct {
  char service_id[64];          /* Unique service identifier */
  char name[256];               /* Service name */
  char host[256];               /* Backend host (e.g., localhost:3001) */
  int port;

  int is_healthy;               /* Health check status */
  int64_t last_health_check;
  int consecutive_failures;

  int request_count;            /* Total requests routed */
  int error_count;              /* Failed requests */
  double average_latency_ms;

  int weight;                   /* Load balancing weight (1-100) */
  int is_active;
} fl_service_t;

/* ===== Route ===== */

typedef struct {
  char route_id[64];
  char path_pattern[512];       /* e.g., "/api/users/*" */
  char service_id[64];          /* Target service */

  int required_permission;      /* RBAC permission (from Phase 23) */
  int rate_limit_per_minute;    /* 0 = no limit */

  int match_count;
  int error_count;

  int is_active;
} fl_route_t;

/* ===== Gateway Request ===== */

typedef struct {
  char request_id[64];
  char method[16];              /* GET, POST, PUT, DELETE */
  char path[512];
  char query_string[1024];

  char user_id[256];            /* From JWT (Phase 23) */
  char ip_address[16];

  char headers[2048];           /* Raw headers */
  unsigned char *body;          /* Request body */
  int body_length;

  int64_t received_at;
  int64_t routed_at;
  int64_t completed_at;

  int status_code;              /* Response status */
  int response_time_ms;
} fl_gateway_request_t;

/* ===== Gateway Response ===== */

typedef struct {
  int status_code;              /* 200, 301, 404, 500 */
  char headers[2048];
  unsigned char *body;
  int body_length;

  char service_host[256];       /* Which backend served this */
  int64_t response_time_ms;
} fl_gateway_response_t;

/* ===== Load Balancer ===== */

typedef enum {
  LB_STRATEGY_ROUND_ROBIN = 0,
  LB_STRATEGY_LEAST_CONN = 1,
  LB_STRATEGY_WEIGHTED = 2,
  LB_STRATEGY_IP_HASH = 3
} fl_lb_strategy_t;

/* ===== API Gateway ===== */

typedef struct {
  fl_service_t services[64];    /* Registered services */
  int service_count;

  fl_route_t routes[256];       /* URL routes */
  int route_count;

  fl_lb_strategy_t lb_strategy;
  int current_lb_index;

  /* Health checking */
  int health_check_interval_sec;
  int health_check_timeout_ms;
  int unhealthy_threshold;      /* Consecutive failures before marking unhealthy */

  /* Statistics */
  int total_requests;
  int total_errors;
  int total_timeouts;

  pthread_mutex_t gateway_mutex;
} fl_api_gateway_t;

/* ===== Public API: Gateway Management ===== */

/* Create API gateway */
fl_api_gateway_t* freelang_gateway_create(fl_lb_strategy_t lb_strategy);

/* Destroy gateway */
void freelang_gateway_destroy(fl_api_gateway_t *gateway);

/* ===== Public API: Service Management ===== */

/* Register backend service */
int freelang_gateway_register_service(fl_api_gateway_t *gateway,
                                       const char *service_name,
                                       const char *host,
                                       int port,
                                       int weight);

/* Unregister service */
void freelang_gateway_unregister_service(fl_api_gateway_t *gateway,
                                          const char *service_id);

/* Get service */
fl_service_t* freelang_gateway_get_service(fl_api_gateway_t *gateway,
                                            const char *service_id);

/* List all services */
void freelang_gateway_list_services(fl_api_gateway_t *gateway,
                                     fl_service_t **services,
                                     int *count);

/* ===== Public API: Route Management ===== */

/* Create route */
int freelang_gateway_create_route(fl_api_gateway_t *gateway,
                                   const char *path_pattern,
                                   const char *service_id,
                                   int required_permission);

/* Delete route */
void freelang_gateway_delete_route(fl_api_gateway_t *gateway,
                                    const char *route_id);

/* Get route for path */
fl_route_t* freelang_gateway_get_route(fl_api_gateway_t *gateway,
                                        const char *path);

/* List all routes */
void freelang_gateway_list_routes(fl_api_gateway_t *gateway,
                                   fl_route_t **routes,
                                   int *count);

/* ===== Public API: Request Routing ===== */

/* Route request to backend */
int freelang_gateway_route_request(fl_api_gateway_t *gateway,
                                    fl_gateway_request_t *request,
                                    fl_gateway_response_t *response);

/* Select backend service (load balancing) */
fl_service_t* freelang_gateway_select_backend(fl_api_gateway_t *gateway,
                                               const char *request_id);

/* Forward request to backend */
int freelang_gateway_forward_request(fl_service_t *service,
                                      fl_gateway_request_t *request,
                                      fl_gateway_response_t *response);

/* ===== Public API: Health Checking ===== */

/* Check service health */
int freelang_gateway_health_check(fl_service_t *service);

/* Mark service healthy */
void freelang_gateway_mark_healthy(fl_api_gateway_t *gateway,
                                    const char *service_id);

/* Mark service unhealthy */
void freelang_gateway_mark_unhealthy(fl_api_gateway_t *gateway,
                                      const char *service_id);

/* Get all unhealthy services */
void freelang_gateway_get_unhealthy_services(fl_api_gateway_t *gateway,
                                              fl_service_t **services,
                                              int *count);

/* ===== Public API: Monitoring ===== */

typedef struct {
  int total_requests;
  int total_errors;
  int total_timeouts;
  int healthy_services;
  int unhealthy_services;
  double average_latency_ms;
  double error_rate;
} fl_gateway_stats_t;

/* Get gateway statistics */
fl_gateway_stats_t freelang_gateway_get_stats(fl_api_gateway_t *gateway);

/* Reset statistics */
void freelang_gateway_reset_stats(fl_api_gateway_t *gateway);

#endif /* FREELANG_GATEWAY_H */
