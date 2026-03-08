/**
 * FreeLang stdlib/lb Implementation - Load Balancer
 * Multiple algorithms, health checks, connection tracking, statistics
 */

#include "lb.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <pthread.h>
#include <time.h>

/* ===== Load Balancer Structure ===== */

struct fl_lb_t {
  fl_lb_algorithm_t algorithm;
  fl_lb_backend_t *backends;
  int backend_count;
  int current_index;          /* For round-robin */
  
  fl_lb_health_check_t health_check;
  
  fl_lb_stats_t stats;
  pthread_mutex_t stats_mutex;
  pthread_mutex_t backend_mutex;
};

/* ===== Creation & Destruction ===== */

fl_lb_t* fl_lb_create(fl_lb_algorithm_t algorithm) {
  fl_lb_t *lb = (fl_lb_t*)malloc(sizeof(fl_lb_t));
  if (!lb) return NULL;

  lb->algorithm = algorithm;
  lb->backends = NULL;
  lb->backend_count = 0;
  lb->current_index = 0;
  
  memset(&lb->health_check, 0, sizeof(fl_lb_health_check_t));
  lb->health_check.enabled = 0;
  lb->health_check.interval_ms = 5000;
  lb->health_check.timeout_ms = 2000;
  lb->health_check.max_retries = 3;
  
  memset(&lb->stats, 0, sizeof(fl_lb_stats_t));
  pthread_mutex_init(&lb->stats_mutex, NULL);
  pthread_mutex_init(&lb->backend_mutex, NULL);

  fprintf(stderr, "[lb] Load balancer created: algorithm=%d\n", algorithm);
  return lb;
}

void fl_lb_destroy(fl_lb_t *lb) {
  if (!lb) return;

  for (int i = 0; i < lb->backend_count; i++) {
    free(lb->backends[i].host);
  }
  free(lb->backends);
  
  if (lb->health_check.path) {
    free(lb->health_check.path);
  }
  
  pthread_mutex_destroy(&lb->stats_mutex);
  pthread_mutex_destroy(&lb->backend_mutex);

  free(lb);

  fprintf(stderr, "[lb] Load balancer destroyed\n");
}

/* ===== Backend Management ===== */

int fl_lb_add_backend(fl_lb_t *lb, const char *host, uint16_t port, int weight) {
  if (!lb || !host || weight < 0) return -1;

  pthread_mutex_lock(&lb->backend_mutex);

  fl_lb_backend_t *new_backends = (fl_lb_backend_t*)realloc(lb->backends,
                                   (lb->backend_count + 1) * sizeof(fl_lb_backend_t));
  if (!new_backends) {
    pthread_mutex_unlock(&lb->backend_mutex);
    return -1;
  }

  lb->backends = new_backends;
  fl_lb_backend_t *backend = &lb->backends[lb->backend_count];
  
  backend->host = (char*)malloc(strlen(host) + 1);
  SAFE_STRCPY(backend->host, host);
  backend->port = port;
  backend->weight = weight > 0 ? weight : 1;
  backend->is_healthy = 1;
  backend->total_requests = 0;
  backend->current_connections = 0;
  backend->last_health_check = time(NULL) * 1000;

  lb->backend_count++;

  pthread_mutex_unlock(&lb->backend_mutex);

  fprintf(stderr, "[lb] Backend added: %s:%d (weight=%d)\n", host, port, backend->weight);
  return 0;
}

int fl_lb_remove_backend(fl_lb_t *lb, const char *host, uint16_t port) {
  if (!lb || !host) return -1;

  pthread_mutex_lock(&lb->backend_mutex);

  for (int i = 0; i < lb->backend_count; i++) {
    if (strcmp(lb->backends[i].host, host) == 0 && lb->backends[i].port == port) {
      free(lb->backends[i].host);
      
      for (int j = i; j < lb->backend_count - 1; j++) {
        lb->backends[j] = lb->backends[j + 1];
      }
      
      lb->backend_count--;
      fprintf(stderr, "[lb] Backend removed: %s:%d\n", host, port);
      
      pthread_mutex_unlock(&lb->backend_mutex);
      return 0;
    }
  }

  pthread_mutex_unlock(&lb->backend_mutex);
  return -1;
}

int fl_lb_get_backend_count(fl_lb_t *lb) {
  return lb ? lb->backend_count : 0;
}

fl_lb_backend_t* fl_lb_get_backend(fl_lb_t *lb, int index) {
  if (!lb || index < 0 || index >= lb->backend_count) return NULL;
  return &lb->backends[index];
}

/* ===== Server Selection ===== */

fl_lb_backend_t* fl_lb_select_backend(fl_lb_t *lb, const char *client_ip) {
  if (!lb || lb->backend_count == 0) return NULL;

  pthread_mutex_lock(&lb->backend_mutex);

  fl_lb_backend_t *selected = NULL;

  if (lb->algorithm == FL_LB_ROUND_ROBIN) {
    selected = &lb->backends[lb->current_index];
    lb->current_index = (lb->current_index + 1) % lb->backend_count;
  } else if (lb->algorithm == FL_LB_LEAST_CONNECTIONS) {
    selected = &lb->backends[0];
    for (int i = 1; i < lb->backend_count; i++) {
      if (lb->backends[i].current_connections < selected->current_connections) {
        selected = &lb->backends[i];
      }
    }
  } else if (lb->algorithm == FL_LB_WEIGHTED) {
    uint64_t total_weight = 0;
    for (int i = 0; i < lb->backend_count; i++) {
      total_weight += lb->backends[i].weight;
    }
    
    uint64_t pick = total_weight ? (lb->current_index++ % total_weight) : 0;
    uint64_t cumulative = 0;
    for (int i = 0; i < lb->backend_count; i++) {
      cumulative += lb->backends[i].weight;
      if (pick < cumulative) {
        selected = &lb->backends[i];
        break;
      }
    }
  } else if (lb->algorithm == FL_LB_IP_HASH && client_ip) {
    uint32_t hash = 0;
    for (const char *p = client_ip; *p; p++) {
      hash = (hash << 5) + hash + *p;
    }
    selected = &lb->backends[hash % lb->backend_count];
  } else {
    selected = &lb->backends[0];
  }

  if (selected) {
    selected->total_requests++;
  }

  pthread_mutex_unlock(&lb->backend_mutex);

  return selected;
}

fl_lb_backend_t* fl_lb_select_backend_by_index(fl_lb_t *lb, int index) {
  if (!lb || index < 0 || index >= lb->backend_count) return NULL;
  return &lb->backends[index];
}

/* ===== Health Checks ===== */

int fl_lb_set_health_check(fl_lb_t *lb, const fl_lb_health_check_t *config) {
  if (!lb || !config) return -1;

  lb->health_check.enabled = config->enabled;
  lb->health_check.interval_ms = config->interval_ms;
  lb->health_check.timeout_ms = config->timeout_ms;
  lb->health_check.max_retries = config->max_retries;
  
  if (config->path) {
    lb->health_check.path = (char*)malloc(strlen(config->path) + 1);
    SAFE_STRCPY(lb->health_check.path, config->path);
  }
  
  lb->health_check.expected_status = config->expected_status;

  fprintf(stderr, "[lb] Health check configured: interval=%dms, enabled=%d\n",
          config->interval_ms, config->enabled);

  return 0;
}

int fl_lb_mark_backend_unhealthy(fl_lb_t *lb, const char *host, uint16_t port) {
  if (!lb || !host) return -1;

  pthread_mutex_lock(&lb->backend_mutex);

  for (int i = 0; i < lb->backend_count; i++) {
    if (strcmp(lb->backends[i].host, host) == 0 && lb->backends[i].port == port) {
      lb->backends[i].is_healthy = 0;
      pthread_mutex_unlock(&lb->backend_mutex);
      fprintf(stderr, "[lb] Backend marked unhealthy: %s:%d\n", host, port);
      return 0;
    }
  }

  pthread_mutex_unlock(&lb->backend_mutex);
  return -1;
}

int fl_lb_mark_backend_healthy(fl_lb_t *lb, const char *host, uint16_t port) {
  if (!lb || !host) return -1;

  pthread_mutex_lock(&lb->backend_mutex);

  for (int i = 0; i < lb->backend_count; i++) {
    if (strcmp(lb->backends[i].host, host) == 0 && lb->backends[i].port == port) {
      lb->backends[i].is_healthy = 1;
      pthread_mutex_unlock(&lb->backend_mutex);
      fprintf(stderr, "[lb] Backend marked healthy: %s:%d\n", host, port);
      return 0;
    }
  }

  pthread_mutex_unlock(&lb->backend_mutex);
  return -1;
}

int fl_lb_is_backend_healthy(fl_lb_t *lb, const char *host, uint16_t port) {
  if (!lb || !host) return 0;

  pthread_mutex_lock(&lb->backend_mutex);

  for (int i = 0; i < lb->backend_count; i++) {
    if (strcmp(lb->backends[i].host, host) == 0 && lb->backends[i].port == port) {
      int healthy = lb->backends[i].is_healthy;
      pthread_mutex_unlock(&lb->backend_mutex);
      return healthy;
    }
  }

  pthread_mutex_unlock(&lb->backend_mutex);
  return 0;
}

/* ===== Connection Tracking ===== */

int fl_lb_increment_connection(fl_lb_t *lb, fl_lb_backend_t *backend) {
  if (!lb || !backend) return -1;

  pthread_mutex_lock(&lb->backend_mutex);
  backend->current_connections++;
  pthread_mutex_unlock(&lb->backend_mutex);

  return 0;
}

int fl_lb_decrement_connection(fl_lb_t *lb, fl_lb_backend_t *backend) {
  if (!lb || !backend) return -1;

  pthread_mutex_lock(&lb->backend_mutex);
  if (backend->current_connections > 0) {
    backend->current_connections--;
  }
  pthread_mutex_unlock(&lb->backend_mutex);

  return 0;
}

/* ===== Statistics ===== */

fl_lb_stats_t* fl_lb_get_stats(fl_lb_t *lb) {
  if (!lb) return NULL;

  fl_lb_stats_t *stats = (fl_lb_stats_t*)malloc(sizeof(fl_lb_stats_t));
  if (!stats) return NULL;

  pthread_mutex_lock(&lb->stats_mutex);
  memcpy(stats, &lb->stats, sizeof(fl_lb_stats_t));
  pthread_mutex_unlock(&lb->stats_mutex);

  return stats;
}

void fl_lb_reset_stats(fl_lb_t *lb) {
  if (!lb) return;

  pthread_mutex_lock(&lb->stats_mutex);
  memset(&lb->stats, 0, sizeof(fl_lb_stats_t));
  pthread_mutex_unlock(&lb->stats_mutex);

  fprintf(stderr, "[lb] Stats reset\n");
}

/* ===== Algorithm Configuration ===== */

int fl_lb_set_algorithm(fl_lb_t *lb, fl_lb_algorithm_t algorithm) {
  if (!lb) return -1;

  pthread_mutex_lock(&lb->backend_mutex);
  lb->algorithm = algorithm;
  lb->current_index = 0;
  pthread_mutex_unlock(&lb->backend_mutex);

  fprintf(stderr, "[lb] Algorithm changed: %d\n", algorithm);
  return 0;
}

fl_lb_algorithm_t fl_lb_get_algorithm(fl_lb_t *lb) {
  return lb ? lb->algorithm : FL_LB_ROUND_ROBIN;
}
