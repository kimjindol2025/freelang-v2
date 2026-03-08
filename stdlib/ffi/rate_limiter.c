/**
 * FreeLang Rate Limiter Implementation (Phase 20)
 * QoS control with token bucket, sliding window, and more
 */

#include "rate_limiter.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <unistd.h>

/* ===== Helper Functions ===== */

int64_t _get_timestamp_ms(void) {
  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC, &ts);
  return (ts.tv_sec * 1000) + (ts.tv_nsec / 1000000);
}

double _calculate_available_tokens(fl_token_bucket_t *bucket) {
  int64_t now = _get_timestamp_ms();
  int64_t elapsed = now - bucket->last_refill;
  double new_tokens = (elapsed / 1000.0) * bucket->refill_rate;
  double available = bucket->tokens + new_tokens;

  if (available > bucket->max_tokens) {
    available = bucket->max_tokens;
  }

  return available;
}

/* ===== Token Bucket Implementation ===== */

fl_rate_limiter_t* freelang_rate_limiter_token_bucket_create(
  double max_tokens, double refill_rate) {

  fl_rate_limiter_t *limiter = (fl_rate_limiter_t*)malloc(sizeof(fl_rate_limiter_t));
  if (!limiter) return NULL;

  memset(limiter, 0, sizeof(fl_rate_limiter_t));
  pthread_mutex_init(&limiter->limiter_mutex, NULL);

  limiter->algorithm = RATE_LIMIT_TOKEN_BUCKET;
  limiter->state.token_bucket.max_tokens = max_tokens;
  limiter->state.token_bucket.tokens = max_tokens;
  limiter->state.token_bucket.refill_rate = refill_rate;
  limiter->state.token_bucket.last_refill = _get_timestamp_ms();

  fprintf(stderr, "[RateLimit] Token bucket created (capacity: %.1f, rate: %.1f/s)\n",
          max_tokens, refill_rate);

  return limiter;
}

/* ===== Sliding Window Implementation ===== */

fl_rate_limiter_t* freelang_rate_limiter_sliding_window_create(
  int window_size_ms, int max_requests) {

  fl_rate_limiter_t *limiter = (fl_rate_limiter_t*)malloc(sizeof(fl_rate_limiter_t));
  if (!limiter) return NULL;

  memset(limiter, 0, sizeof(fl_rate_limiter_t));
  pthread_mutex_init(&limiter->limiter_mutex, NULL);

  limiter->algorithm = RATE_LIMIT_SLIDING_WINDOW;
  limiter->state.sliding_window.window_size_ms = window_size_ms;
  limiter->state.sliding_window.max_requests = max_requests;
  limiter->state.sliding_window.window_start = _get_timestamp_ms();

  fprintf(stderr, "[RateLimit] Sliding window created (window: %dms, max: %d req)\n",
          window_size_ms, max_requests);

  return limiter;
}

fl_rate_limiter_t* freelang_rate_limiter_leaky_bucket_create(
  int capacity, double leak_rate) {

  /* Leaky bucket is similar to token bucket, but drains instead of fills */
  return freelang_rate_limiter_token_bucket_create((double)capacity, leak_rate);
}

fl_rate_limiter_t* freelang_rate_limiter_fixed_window_create(
  int window_size_ms, int max_requests) {

  fl_rate_limiter_t *limiter = (fl_rate_limiter_t*)malloc(sizeof(fl_rate_limiter_t));
  if (!limiter) return NULL;

  memset(limiter, 0, sizeof(fl_rate_limiter_t));
  pthread_mutex_init(&limiter->limiter_mutex, NULL);

  limiter->algorithm = RATE_LIMIT_FIXED_WINDOW;
  limiter->state.sliding_window.window_size_ms = window_size_ms;
  limiter->state.sliding_window.max_requests = max_requests;
  limiter->state.sliding_window.window_start = _get_timestamp_ms();

  fprintf(stderr, "[RateLimit] Fixed window created (window: %dms, max: %d req)\n",
          window_size_ms, max_requests);

  return limiter;
}

/* ===== Rate Limiting Check ===== */

int freelang_rate_limiter_allow(fl_rate_limiter_t *limiter) {
  if (!limiter) return 0;

  pthread_mutex_lock(&limiter->limiter_mutex);

  int allowed = 0;

  if (limiter->algorithm == RATE_LIMIT_TOKEN_BUCKET) {
    double available = _calculate_available_tokens(&limiter->state.token_bucket);

    if (available >= 1.0) {
      limiter->state.token_bucket.tokens = available - 1.0;
      limiter->state.token_bucket.last_refill = _get_timestamp_ms();
      allowed = 1;
    }
  } else if (limiter->algorithm == RATE_LIMIT_SLIDING_WINDOW ||
             limiter->algorithm == RATE_LIMIT_FIXED_WINDOW) {

    int64_t now = _get_timestamp_ms();
    int64_t window_start = limiter->state.sliding_window.window_start;
    int64_t elapsed = now - window_start;

    if (elapsed > limiter->state.sliding_window.window_size_ms) {
      /* Window expired, reset */
      limiter->state.sliding_window.window_start = now;
      limiter->state.sliding_window.request_count = 0;
    }

    if (limiter->state.sliding_window.request_count <
        limiter->state.sliding_window.max_requests) {
      limiter->state.sliding_window.request_count++;
      allowed = 1;
    }
  }

  if (allowed) {
    limiter->allowed++;
  } else {
    limiter->rejected++;
  }

  pthread_mutex_unlock(&limiter->limiter_mutex);

  return allowed;
}

int freelang_rate_limiter_try_consume(fl_rate_limiter_t *limiter, int tokens) {
  if (!limiter) return 0;

  pthread_mutex_lock(&limiter->limiter_mutex);

  int allowed = 0;

  if (limiter->algorithm == RATE_LIMIT_TOKEN_BUCKET) {
    double available = _calculate_available_tokens(&limiter->state.token_bucket);

    if (available >= tokens) {
      limiter->state.token_bucket.tokens = available - tokens;
      limiter->state.token_bucket.last_refill = _get_timestamp_ms();
      allowed = 1;
    }
  }

  pthread_mutex_unlock(&limiter->limiter_mutex);

  return allowed;
}

void freelang_rate_limiter_wait_until_allowed(fl_rate_limiter_t *limiter) {
  if (!limiter) return;

  while (!freelang_rate_limiter_allow(limiter)) {
    usleep(10000);  /* Sleep 10ms before retry */
  }
}

int freelang_rate_limiter_get_wait_time(fl_rate_limiter_t *limiter) {
  if (!limiter) return 0;

  pthread_mutex_lock(&limiter->limiter_mutex);

  int wait_time = 0;

  if (limiter->algorithm == RATE_LIMIT_TOKEN_BUCKET) {
    double available = _calculate_available_tokens(&limiter->state.token_bucket);

    if (available < 1.0) {
      double tokens_needed = 1.0 - available;
      wait_time = (int)((tokens_needed / limiter->state.token_bucket.refill_rate)
                        * 1000);  /* Convert to ms */
    }
  }

  pthread_mutex_unlock(&limiter->limiter_mutex);

  return wait_time;
}

/* ===== Management ===== */

void freelang_rate_limiter_reset(fl_rate_limiter_t *limiter) {
  if (!limiter) return;

  pthread_mutex_lock(&limiter->limiter_mutex);

  if (limiter->algorithm == RATE_LIMIT_TOKEN_BUCKET) {
    limiter->state.token_bucket.tokens = limiter->state.token_bucket.max_tokens;
    limiter->state.token_bucket.last_refill = _get_timestamp_ms();
  } else if (limiter->algorithm == RATE_LIMIT_SLIDING_WINDOW ||
             limiter->algorithm == RATE_LIMIT_FIXED_WINDOW) {
    limiter->state.sliding_window.request_count = 0;
    limiter->state.sliding_window.window_start = _get_timestamp_ms();
  }

  fprintf(stderr, "[RateLimit] Rate limiter reset\n");

  pthread_mutex_unlock(&limiter->limiter_mutex);
}

fl_rate_limit_stats_t freelang_rate_limiter_get_stats(fl_rate_limiter_t *limiter) {
  fl_rate_limit_stats_t stats = {0, 0, 0, 0.0, 0.0};

  if (!limiter) return stats;

  pthread_mutex_lock(&limiter->limiter_mutex);

  stats.total_requests = limiter->allowed + limiter->rejected;
  stats.allowed_requests = limiter->allowed;
  stats.rejected_requests = limiter->rejected;

  if (stats.total_requests > 0) {
    stats.rejection_rate = (double)stats.rejected_requests /
                           (double)stats.total_requests;
  }

  pthread_mutex_unlock(&limiter->limiter_mutex);

  return stats;
}

void freelang_rate_limiter_set_rate(fl_rate_limiter_t *limiter,
                                     double refill_rate) {
  if (!limiter) return;

  pthread_mutex_lock(&limiter->limiter_mutex);

  if (limiter->algorithm == RATE_LIMIT_TOKEN_BUCKET) {
    limiter->state.token_bucket.refill_rate = refill_rate;
    fprintf(stderr, "[RateLimit] Rate updated to %.1f/s\n", refill_rate);
  }

  pthread_mutex_unlock(&limiter->limiter_mutex);
}

void freelang_rate_limiter_set_capacity(fl_rate_limiter_t *limiter,
                                         double max_tokens) {
  if (!limiter) return;

  pthread_mutex_lock(&limiter->limiter_mutex);

  if (limiter->algorithm == RATE_LIMIT_TOKEN_BUCKET) {
    limiter->state.token_bucket.max_tokens = max_tokens;
    if (limiter->state.token_bucket.tokens > max_tokens) {
      limiter->state.token_bucket.tokens = max_tokens;
    }
    fprintf(stderr, "[RateLimit] Capacity updated to %.1f\n", max_tokens);
  }

  pthread_mutex_unlock(&limiter->limiter_mutex);
}

void freelang_rate_limiter_destroy(fl_rate_limiter_t *limiter) {
  if (!limiter) return;

  pthread_mutex_destroy(&limiter->limiter_mutex);
  free(limiter);

  fprintf(stderr, "[RateLimit] Rate limiter destroyed\n");
}
