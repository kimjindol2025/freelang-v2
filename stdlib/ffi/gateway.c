/**
 * FreeLang API Gateway Implementation (Phase 24)
 * Reverse proxy, request routing, load balancing, health checking
 */

#include "gateway.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>

/* ===== Gateway Creation ===== */

fl_api_gateway_t* freelang_gateway_create(fl_lb_strategy_t lb_strategy) {
  fl_api_gateway_t *gateway = (fl_api_gateway_t*)malloc(sizeof(fl_api_gateway_t));
  if (!gateway) return NULL;

  memset(gateway, 0, sizeof(fl_api_gateway_t));
  pthread_mutex_init(&gateway->gateway_mutex, NULL);

  gateway->lb_strategy = lb_strategy;
  gateway->current_lb_index = 0;
  gateway->health_check_interval_sec = 30;
  gateway->health_check_timeout_ms = 5000;
  gateway->unhealthy_threshold = 3;

  fprintf(stderr, "[Gateway] Created (strategy: %d)\\n", lb_strategy);
  return gateway;
}

void freelang_gateway_destroy(fl_api_gateway_t *gateway) {
  if (!gateway) return;

  pthread_mutex_destroy(&gateway->gateway_mutex);
  free(gateway);

  fprintf(stderr, "[Gateway] Destroyed\\n");
}

/* ===== Service Management ===== */

int freelang_gateway_register_service(fl_api_gateway_t *gateway,
                                       const char *service_name,
                                       const char *host,
                                       int port,
                                       int weight) {
  if (!gateway || !service_name || !host || gateway->service_count >= 64) return -1;

  pthread_mutex_lock(&gateway->gateway_mutex);

  fl_service_t *service = &gateway->services[gateway->service_count];
  snprintf(service->service_id, sizeof(service->service_id), "svc_%d", gateway->service_count);
  strncpy(service->name, service_name, sizeof(service->name) - 1);
  strncpy(service->host, host, sizeof(service->host) - 1);

  service->port = port;
  service->is_healthy = 1;
  service->last_health_check = time(NULL);
  service->consecutive_failures = 0;
  service->weight = weight > 0 ? weight : 1;
  service->is_active = 1;

  int service_id = gateway->service_count;
  gateway->service_count++;

  pthread_mutex_unlock(&gateway->gateway_mutex);

  fprintf(stderr, "[Gateway] Service registered: %s (%s:%d, weight: %d)\\n",
          service_name, host, port, weight);

  return service_id;
}

void freelang_gateway_unregister_service(fl_api_gateway_t *gateway,
                                          const char *service_id) {
  if (!gateway || !service_id) return;

  pthread_mutex_lock(&gateway->gateway_mutex);

  for (int i = 0; i < gateway->service_count; i++) {
    if (strcmp(gateway->services[i].service_id, service_id) == 0) {
      for (int j = i; j < gateway->service_count - 1; j++) {
        memcpy(&gateway->services[j], &gateway->services[j + 1], sizeof(fl_service_t));
      }
      gateway->service_count--;
      fprintf(stderr, "[Gateway] Service unregistered: %s\\n", service_id);
      break;
    }
  }

  pthread_mutex_unlock(&gateway->gateway_mutex);
}

fl_service_t* freelang_gateway_get_service(fl_api_gateway_t *gateway,
                                            const char *service_id) {
  if (!gateway || !service_id) return NULL;

  pthread_mutex_lock(&gateway->gateway_mutex);

  for (int i = 0; i < gateway->service_count; i++) {
    if (strcmp(gateway->services[i].service_id, service_id) == 0) {
      pthread_mutex_unlock(&gateway->gateway_mutex);
      return &gateway->services[i];
    }
  }

  pthread_mutex_unlock(&gateway->gateway_mutex);
  return NULL;
}

void freelang_gateway_list_services(fl_api_gateway_t *gateway,
                                     fl_service_t **services,
                                     int *count) {
  if (!gateway || !services || !count) return;

  pthread_mutex_lock(&gateway->gateway_mutex);
  *services = gateway->services;
  *count = gateway->service_count;
  pthread_mutex_unlock(&gateway->gateway_mutex);
}

/* ===== Route Management ===== */

int freelang_gateway_create_route(fl_api_gateway_t *gateway,
                                   const char *path_pattern,
                                   const char *service_id,
                                   int required_permission) {
  if (!gateway || !path_pattern || !service_id || gateway->route_count >= 256) return -1;

  pthread_mutex_lock(&gateway->gateway_mutex);

  fl_route_t *route = &gateway->routes[gateway->route_count];
  snprintf(route->route_id, sizeof(route->route_id), "route_%d", gateway->route_count);
  strncpy(route->path_pattern, path_pattern, sizeof(route->path_pattern) - 1);
  strncpy(route->service_id, service_id, sizeof(route->service_id) - 1);

  route->required_permission = required_permission;
  route->rate_limit_per_minute = 0;  /* No limit by default */
  route->is_active = 1;

  int route_id = gateway->route_count;
  gateway->route_count++;

  pthread_mutex_unlock(&gateway->gateway_mutex);

  fprintf(stderr, "[Gateway] Route created: %s → %s\\n", path_pattern, service_id);

  return route_id;
}

void freelang_gateway_delete_route(fl_api_gateway_t *gateway,
                                    const char *route_id) {
  if (!gateway || !route_id) return;

  pthread_mutex_lock(&gateway->gateway_mutex);

  for (int i = 0; i < gateway->route_count; i++) {
    if (strcmp(gateway->routes[i].route_id, route_id) == 0) {
      for (int j = i; j < gateway->route_count - 1; j++) {
        memcpy(&gateway->routes[j], &gateway->routes[j + 1], sizeof(fl_route_t));
      }
      gateway->route_count--;
      break;
    }
  }

  pthread_mutex_unlock(&gateway->gateway_mutex);

  fprintf(stderr, "[Gateway] Route deleted: %s\\n", route_id);
}

fl_route_t* freelang_gateway_get_route(fl_api_gateway_t *gateway,
                                        const char *path) {
  if (!gateway || !path) return NULL;

  pthread_mutex_lock(&gateway->gateway_mutex);

  /* Simple path matching (real implementation would support wildcards) */
  for (int i = 0; i < gateway->route_count; i++) {
    if (strncmp(gateway->routes[i].path_pattern, path,
               strlen(gateway->routes[i].path_pattern) - 2) == 0) {
      pthread_mutex_unlock(&gateway->gateway_mutex);
      return &gateway->routes[i];
    }
  }

  pthread_mutex_unlock(&gateway->gateway_mutex);
  return NULL;
}

void freelang_gateway_list_routes(fl_api_gateway_t *gateway,
                                   fl_route_t **routes,
                                   int *count) {
  if (!gateway || !routes || !count) return;

  pthread_mutex_lock(&gateway->gateway_mutex);
  *routes = gateway->routes;
  *count = gateway->route_count;
  pthread_mutex_unlock(&gateway->gateway_mutex);
}

/* ===== Request Routing ===== */

fl_service_t* freelang_gateway_select_backend(fl_api_gateway_t *gateway,
                                               const char *request_id) {
  if (!gateway || gateway->service_count == 0) return NULL;

  pthread_mutex_lock(&gateway->gateway_mutex);

  fl_service_t *selected = NULL;

  switch (gateway->lb_strategy) {
    case LB_STRATEGY_ROUND_ROBIN: {
      /* Find next healthy service */
      int attempts = gateway->service_count;
      while (attempts-- > 0) {
        selected = &gateway->services[gateway->current_lb_index];
        gateway->current_lb_index = (gateway->current_lb_index + 1) % gateway->service_count;
        if (selected->is_healthy && selected->is_active) {
          break;
        }
      }
      break;
    }

    case LB_STRATEGY_LEAST_CONN: {
      /* Select service with fewest requests */
      int min_requests = INT_MAX;
      for (int i = 0; i < gateway->service_count; i++) {
        if (gateway->services[i].is_healthy &&
            gateway->services[i].request_count < min_requests) {
          min_requests = gateway->services[i].request_count;
          selected = &gateway->services[i];
        }
      }
      break;
    }

    case LB_STRATEGY_WEIGHTED: {
      /* Weighted round-robin */
      int total_weight = 0;
      for (int i = 0; i < gateway->service_count; i++) {
        if (gateway->services[i].is_healthy && gateway->services[i].is_active) {
          total_weight += gateway->services[i].weight;
        }
      }

      if (total_weight > 0) {
        int random_weight = (rand() % total_weight) + 1;
        int cumulative = 0;
        for (int i = 0; i < gateway->service_count; i++) {
          if (gateway->services[i].is_healthy && gateway->services[i].is_active) {
            cumulative += gateway->services[i].weight;
            if (random_weight <= cumulative) {
              selected = &gateway->services[i];
              break;
            }
          }
        }
      }
      break;
    }

    case LB_STRATEGY_IP_HASH: {
      /* Hash-based selection */
      unsigned long hash = 0;
      for (int i = 0; i < strlen(request_id); i++) {
        hash = ((hash << 5) + hash) + request_id[i];
      }

      int index = hash % gateway->service_count;
      selected = &gateway->services[index];

      if (!selected->is_healthy || !selected->is_active) {
        /* Fallback to round-robin if selected is unhealthy */
        for (int i = 0; i < gateway->service_count; i++) {
          if (gateway->services[i].is_healthy && gateway->services[i].is_active) {
            selected = &gateway->services[i];
            break;
          }
        }
      }
      break;
    }
  }

  if (selected) {
    selected->request_count++;
  }

  pthread_mutex_unlock(&gateway->gateway_mutex);

  fprintf(stderr, "[Gateway] Backend selected: %s (%s)\\n",
          selected ? selected->name : "none",
          selected ? selected->host : "unavailable");

  return selected;
}

int freelang_gateway_route_request(fl_api_gateway_t *gateway,
                                    fl_gateway_request_t *request,
                                    fl_gateway_response_t *response) {
  if (!gateway || !request || !response) return 0;

  snprintf(request->request_id, sizeof(request->request_id), "req_%ld", time(NULL));
  request->received_at = time(NULL);

  /* Find matching route */
  fl_route_t *route = freelang_gateway_get_route(gateway, request->path);
  if (!route) {
    response->status_code = 404;
    strcpy((char*)response->body, "Not Found");
    return 0;
  }

  /* Select backend */
  fl_service_t *backend = freelang_gateway_select_backend(gateway, request->request_id);
  if (!backend) {
    response->status_code = 503;
    strcpy((char*)response->body, "Service Unavailable");
    gateway->total_errors++;
    return 0;
  }

  /* Forward request */
  int result = freelang_gateway_forward_request(backend, request, response);

  request->routed_at = time(NULL);
  request->completed_at = time(NULL);
  request->response_time_ms = (request->completed_at - request->received_at) * 1000;

  pthread_mutex_lock(&gateway->gateway_mutex);
  gateway->total_requests++;
  if (!result) {
    gateway->total_errors++;
  }
  pthread_mutex_unlock(&gateway->gateway_mutex);

  return result;
}

int freelang_gateway_forward_request(fl_service_t *service,
                                      fl_gateway_request_t *request,
                                      fl_gateway_response_t *response) {
  if (!service || !request || !response) return 0;

  /* Simplified: In real implementation, would use HTTP client to forward */
  response->status_code = 200;
  strncpy(response->service_host, service->host, sizeof(response->service_host) - 1);
  response->response_time_ms = 50;  /* Simulated latency */

  fprintf(stderr, "[Gateway] Request forwarded: %s %s → %s:%d (200)\\n",
          request->method, request->path, service->host, service->port);

  return 1;
}

/* ===== Health Checking ===== */

int freelang_gateway_health_check(fl_service_t *service) {
  if (!service) return 0;

  /* Simplified health check: In real implementation, would make HTTP request */
  fprintf(stderr, "[Gateway] Health check: %s ✓\\n", service->name);
  return 1;
}

void freelang_gateway_mark_healthy(fl_api_gateway_t *gateway,
                                    const char *service_id) {
  fl_service_t *service = freelang_gateway_get_service(gateway, service_id);
  if (service) {
    service->is_healthy = 1;
    service->consecutive_failures = 0;
    fprintf(stderr, "[Gateway] Service marked healthy: %s\\n", service_id);
  }
}

void freelang_gateway_mark_unhealthy(fl_api_gateway_t *gateway,
                                      const char *service_id) {
  fl_service_t *service = freelang_gateway_get_service(gateway, service_id);
  if (service) {
    service->is_healthy = 0;
    fprintf(stderr, "[Gateway] Service marked unhealthy: %s\\n", service_id);
  }
}

void freelang_gateway_get_unhealthy_services(fl_api_gateway_t *gateway,
                                              fl_service_t **services,
                                              int *count) {
  if (!gateway || !services || !count) return;

  *count = 0;
  pthread_mutex_lock(&gateway->gateway_mutex);

  for (int i = 0; i < gateway->service_count && *count < 64; i++) {
    if (!gateway->services[i].is_healthy) {
      services[(*count)++] = &gateway->services[i];
    }
  }

  pthread_mutex_unlock(&gateway->gateway_mutex);
}

/* ===== Monitoring ===== */

fl_gateway_stats_t freelang_gateway_get_stats(fl_api_gateway_t *gateway) {
  fl_gateway_stats_t stats = {0, 0, 0, 0, 0, 0.0, 0.0};

  if (!gateway) return stats;

  pthread_mutex_lock(&gateway->gateway_mutex);

  stats.total_requests = gateway->total_requests;
  stats.total_errors = gateway->total_errors;
  stats.total_timeouts = gateway->total_timeouts;

  for (int i = 0; i < gateway->service_count; i++) {
    if (gateway->services[i].is_healthy) {
      stats.healthy_services++;
    } else {
      stats.unhealthy_services++;
    }
  }

  if (stats.total_requests > 0) {
    stats.error_rate = (double)stats.total_errors / stats.total_requests * 100.0;
  }

  pthread_mutex_unlock(&gateway->gateway_mutex);

  fprintf(stderr, "[Gateway] Stats: requests=%d, errors=%d, healthy=%d, unhealthy=%d\\n",
          stats.total_requests, stats.total_errors, stats.healthy_services, stats.unhealthy_services);

  return stats;
}

void freelang_gateway_reset_stats(fl_api_gateway_t *gateway) {
  if (!gateway) return;

  pthread_mutex_lock(&gateway->gateway_mutex);
  gateway->total_requests = 0;
  gateway->total_errors = 0;
  gateway->total_timeouts = 0;
  pthread_mutex_unlock(&gateway->gateway_mutex);

  fprintf(stderr, "[Gateway] Statistics reset\\n");
}
