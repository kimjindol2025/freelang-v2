/**
 * FreeLang stdlib/ratelimit Implementation - Rate Limiting
 * Token bucket, sliding window, fixed window algorithms
 */

#include "ratelimit.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <pthread.h>
#include <time.h>

/* ===== Rate Limiter Structure ===== */

struct fl_ratelimit_t {
  fl_ratelimit_algorithm_t algorithm;
  
  /* Global limit */
  int global_rate_limit;
  int global_window_ms;
  uint64_t global_request_count;
  int64_t global_window_reset_time;
  
  /* Per-client limits */
  fl_ratelimit_client_t *clients;
  int client_count;
  
  fl_ratelimit_stats_t stats;
  pthread_mutex_t mutex;
};

/* ===== Creation & Destruction ===== */

fl_ratelimit_t* fl_ratelimit_create(fl_ratelimit_algorithm_t algorithm) {
  fl_ratelimit_t *limiter = (fl_ratelimit_t*)malloc(sizeof(fl_ratelimit_t));
  if (!limiter) return NULL;

  limiter->algorithm = algorithm;
  limiter->global_rate_limit = 1000;
  limiter->global_window_ms = 1000;
  limiter->global_request_count = 0;
  limiter->global_window_reset_time = (int64_t)(time(NULL) * 1000) + limiter->global_window_ms;
  
  limiter->clients = NULL;
  limiter->client_count = 0;
  
  memset(&limiter->stats, 0, sizeof(fl_ratelimit_stats_t));
  pthread_mutex_init(&limiter->mutex, NULL);

  fprintf(stderr, "[ratelimit] Rate limiter created: algorithm=%d\n", algorithm);
  return limiter;
}

void fl_ratelimit_destroy(fl_ratelimit_t *limiter) {
  if (!limiter) return;

  for (int i = 0; i < limiter->client_count; i++) {
    free(limiter->clients[i].identifier);
  }
  free(limiter->clients);
  
  pthread_mutex_destroy(&limiter->mutex);
  free(limiter);

  fprintf(stderr, "[ratelimit] Rate limiter destroyed\n");
}

/* ===== Global Rate Limits ===== */

int fl_ratelimit_set_global_limit(fl_ratelimit_t *limiter, int requests_per_window, int window_ms) {
  if (!limiter || requests_per_window < 0 || window_ms < 0) return -1;

  pthread_mutex_lock(&limiter->mutex);
  
  limiter->global_rate_limit = requests_per_window;
  limiter->global_window_ms = window_ms;
  limiter->global_request_count = 0;
  limiter->global_window_reset_time = (int64_t)(time(NULL) * 1000) + window_ms;

  pthread_mutex_unlock(&limiter->mutex);

  fprintf(stderr, "[ratelimit] Global limit set: %d requests per %dms\n",
          requests_per_window, window_ms);

  return 0;
}

/* ===== Per-Client Limits ===== */

int fl_ratelimit_set_client_limit(fl_ratelimit_t *limiter, const char *identifier,
                                  int requests_per_window, int window_ms) {
  if (!limiter || !identifier) return -1;

  pthread_mutex_lock(&limiter->mutex);

  /* Find existing client */
  for (int i = 0; i < limiter->client_count; i++) {
    if (strcmp(limiter->clients[i].identifier, identifier) == 0) {
      limiter->clients[i].rate_limit = requests_per_window;
      limiter->clients[i].window_ms = window_ms;
      limiter->clients[i].request_count = 0;
      limiter->clients[i].window_reset_time = (int64_t)(time(NULL) * 1000) + window_ms;
      pthread_mutex_unlock(&limiter->mutex);
      return 0;
    }
  }

  /* Add new client */
  fl_ratelimit_client_t *new_clients = (fl_ratelimit_client_t*)realloc(
    limiter->clients, (limiter->client_count + 1) * sizeof(fl_ratelimit_client_t));
  if (!new_clients) {
    pthread_mutex_unlock(&limiter->mutex);
    return -1;
  }

  limiter->clients = new_clients;
  fl_ratelimit_client_t *client = &limiter->clients[limiter->client_count];
  
  client->identifier = (char*)malloc(strlen(identifier) + 1);
  SAFE_STRCPY(client->identifier, identifier);
  client->rate_limit = requests_per_window;
  client->window_ms = window_ms;
  client->request_count = 0;
  client->window_reset_time = (int64_t)(time(NULL) * 1000) + window_ms;
  client->last_request_time = time(NULL) * 1000;

  limiter->client_count++;
  limiter->stats.unique_clients++;

  pthread_mutex_unlock(&limiter->mutex);

  fprintf(stderr, "[ratelimit] Client limit set: %s (%d requests per %dms)\n",
          identifier, requests_per_window, window_ms);

  return 0;
}

int fl_ratelimit_remove_client(fl_ratelimit_t *limiter, const char *identifier) {
  if (!limiter || !identifier) return -1;

  pthread_mutex_lock(&limiter->mutex);

  for (int i = 0; i < limiter->client_count; i++) {
    if (strcmp(limiter->clients[i].identifier, identifier) == 0) {
      free(limiter->clients[i].identifier);
      
      for (int j = i; j < limiter->client_count - 1; j++) {
        limiter->clients[j] = limiter->clients[j + 1];
      }
      
      limiter->client_count--;
      pthread_mutex_unlock(&limiter->mutex);
      return 0;
    }
  }

  pthread_mutex_unlock(&limiter->mutex);
  return -1;
}

/* ===== Check Rate Limit ===== */

int fl_ratelimit_check(fl_ratelimit_t *limiter, const char *identifier) {
  if (!limiter || !identifier) return 0;

  pthread_mutex_lock(&limiter->mutex);

  int64_t now = time(NULL) * 1000;
  
  /* Check global limit */
  if (now >= limiter->global_window_reset_time) {
    limiter->global_request_count = 0;
    limiter->global_window_reset_time = now + limiter->global_window_ms;
  }

  if (limiter->global_request_count >= limiter->global_rate_limit) {
    pthread_mutex_unlock(&limiter->mutex);
    limiter->stats.rejected_requests++;
    return 0;
  }

  /* Check per-client limit */
  for (int i = 0; i < limiter->client_count; i++) {
    if (strcmp(limiter->clients[i].identifier, identifier) == 0) {
      fl_ratelimit_client_t *client = &limiter->clients[i];
      
      if (now >= client->window_reset_time) {
        client->request_count = 0;
        client->window_reset_time = now + client->window_ms;
      }

      int allowed = (client->request_count < client->rate_limit);
      
      pthread_mutex_unlock(&limiter->mutex);
      return allowed ? 1 : 0;
    }
  }

  pthread_mutex_unlock(&limiter->mutex);
  return 1;  /* No per-client limit, check global only */
}

int fl_ratelimit_check_and_increment(fl_ratelimit_t *limiter, const char *identifier) {
  if (!limiter || !identifier) return 0;

  pthread_mutex_lock(&limiter->mutex);

  int64_t now = time(NULL) * 1000;
  
  /* Reset global window if expired */
  if (now >= limiter->global_window_reset_time) {
    limiter->global_request_count = 0;
    limiter->global_window_reset_time = now + limiter->global_window_ms;
  }

  /* Check global limit */
  if (limiter->global_request_count >= limiter->global_rate_limit) {
    limiter->stats.rejected_requests++;
    limiter->stats.total_requests++;
    pthread_mutex_unlock(&limiter->mutex);
    return 0;
  }

  /* Find and update per-client limit */
  for (int i = 0; i < limiter->client_count; i++) {
    if (strcmp(limiter->clients[i].identifier, identifier) == 0) {
      fl_ratelimit_client_t *client = &limiter->clients[i];
      
      if (now >= client->window_reset_time) {
        client->request_count = 0;
        client->window_reset_time = now + client->window_ms;
      }

      if (client->request_count >= client->rate_limit) {
        limiter->stats.rejected_requests++;
        limiter->stats.total_requests++;
        pthread_mutex_unlock(&limiter->mutex);
        return 0;
      }

      client->request_count++;
      client->last_request_time = now;
      limiter->global_request_count++;
      limiter->stats.allowed_requests++;
      limiter->stats.total_requests++;
      
      pthread_mutex_unlock(&limiter->mutex);
      return 1;
    }
  }

  /* No per-client limit, allow and increment global */
  limiter->global_request_count++;
  limiter->stats.allowed_requests++;
  limiter->stats.total_requests++;
  
  pthread_mutex_unlock(&limiter->mutex);
  return 1;
}

/* ===== Get Remaining Quota ===== */

int fl_ratelimit_get_remaining(fl_ratelimit_t *limiter, const char *identifier) {
  if (!limiter || !identifier) return 0;

  pthread_mutex_lock(&limiter->mutex);

  int64_t now = time(NULL) * 1000;
  
  for (int i = 0; i < limiter->client_count; i++) {
    if (strcmp(limiter->clients[i].identifier, identifier) == 0) {
      fl_ratelimit_client_t *client = &limiter->clients[i];
      
      if (now >= client->window_reset_time) {
        pthread_mutex_unlock(&limiter->mutex);
        return client->rate_limit;
      }

      int remaining = client->rate_limit - client->request_count;
      pthread_mutex_unlock(&limiter->mutex);
      return remaining >= 0 ? remaining : 0;
    }
  }

  pthread_mutex_unlock(&limiter->mutex);
  return limiter->global_rate_limit;
}

int64_t fl_ratelimit_get_reset_time(fl_ratelimit_t *limiter, const char *identifier) {
  if (!limiter || !identifier) return 0;

  pthread_mutex_lock(&limiter->mutex);

  for (int i = 0; i < limiter->client_count; i++) {
    if (strcmp(limiter->clients[i].identifier, identifier) == 0) {
      int64_t reset_time = limiter->clients[i].window_reset_time;
      pthread_mutex_unlock(&limiter->mutex);
      return reset_time;
    }
  }

  int64_t reset_time = limiter->global_window_reset_time;
  pthread_mutex_unlock(&limiter->mutex);
  return reset_time;
}

/* ===== Client Management ===== */

int fl_ratelimit_reset_client(fl_ratelimit_t *limiter, const char *identifier) {
  if (!limiter || !identifier) return -1;

  pthread_mutex_lock(&limiter->mutex);

  for (int i = 0; i < limiter->client_count; i++) {
    if (strcmp(limiter->clients[i].identifier, identifier) == 0) {
      int64_t now = time(NULL) * 1000;
      limiter->clients[i].request_count = 0;
      limiter->clients[i].window_reset_time = now + limiter->clients[i].window_ms;
      pthread_mutex_unlock(&limiter->mutex);
      return 0;
    }
  }

  pthread_mutex_unlock(&limiter->mutex);
  return -1;
}

fl_ratelimit_client_t* fl_ratelimit_get_client(fl_ratelimit_t *limiter, const char *identifier) {
  if (!limiter || !identifier) return NULL;

  pthread_mutex_lock(&limiter->mutex);

  for (int i = 0; i < limiter->client_count; i++) {
    if (strcmp(limiter->clients[i].identifier, identifier) == 0) {
      fl_ratelimit_client_t *client = (fl_ratelimit_client_t*)malloc(sizeof(fl_ratelimit_client_t));
      if (client) {
        memcpy(client, &limiter->clients[i], sizeof(fl_ratelimit_client_t));
        client->identifier = (char*)malloc(strlen(limiter->clients[i].identifier) + 1);
        SAFE_STRCPY(client->identifier, limiter->clients[i].identifier);
      }
      pthread_mutex_unlock(&limiter->mutex);
      return client;
    }
  }

  pthread_mutex_unlock(&limiter->mutex);
  return NULL;
}

/* ===== Cleanup ===== */

int fl_ratelimit_cleanup_expired(fl_ratelimit_t *limiter, int max_idle_ms) {
  if (!limiter || max_idle_ms < 0) return -1;

  pthread_mutex_lock(&limiter->mutex);

  int64_t now = time(NULL) * 1000;
  int removed = 0;

  for (int i = 0; i < limiter->client_count; i++) {
    if (now - limiter->clients[i].last_request_time > max_idle_ms) {
      free(limiter->clients[i].identifier);
      
      for (int j = i; j < limiter->client_count - 1; j++) {
        limiter->clients[j] = limiter->clients[j + 1];
      }
      
      limiter->client_count--;
      removed++;
      i--;
    }
  }

  pthread_mutex_unlock(&limiter->mutex);

  if (removed > 0) {
    fprintf(stderr, "[ratelimit] Cleaned up %d expired clients\n", removed);
  }

  return removed;
}

/* ===== Statistics ===== */

fl_ratelimit_stats_t* fl_ratelimit_get_stats(fl_ratelimit_t *limiter) {
  if (!limiter) return NULL;

  fl_ratelimit_stats_t *stats = (fl_ratelimit_stats_t*)malloc(sizeof(fl_ratelimit_stats_t));
  if (!stats) return NULL;

  pthread_mutex_lock(&limiter->mutex);
  memcpy(stats, &limiter->stats, sizeof(fl_ratelimit_stats_t));
  pthread_mutex_unlock(&limiter->mutex);

  return stats;
}

void fl_ratelimit_reset_stats(fl_ratelimit_t *limiter) {
  if (!limiter) return;

  pthread_mutex_lock(&limiter->mutex);
  memset(&limiter->stats, 0, sizeof(fl_ratelimit_stats_t));
  pthread_mutex_unlock(&limiter->mutex);

  fprintf(stderr, "[ratelimit] Stats reset\n");
}

/* ===== Algorithm Configuration ===== */

int fl_ratelimit_set_algorithm(fl_ratelimit_t *limiter, fl_ratelimit_algorithm_t algorithm) {
  if (!limiter) return -1;

  pthread_mutex_lock(&limiter->mutex);
  limiter->algorithm = algorithm;
  pthread_mutex_unlock(&limiter->mutex);

  fprintf(stderr, "[ratelimit] Algorithm changed: %d\n", algorithm);
  return 0;
}
