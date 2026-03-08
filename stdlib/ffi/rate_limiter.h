/**
 * FreeLang Rate Limiter (Phase 20)
 * QoS control with multiple algorithms
 */

#ifndef FREELANG_RATE_LIMITER_H
#define FREELANG_RATE_LIMITER_H

#include <pthread.h>
#include <time.h>

/* ===== Rate Limiting Algorithm ===== */

typedef enum {
  RATE_LIMIT_TOKEN_BUCKET = 0,         /* Token bucket (smooth burst) */
  RATE_LIMIT_SLIDING_WINDOW = 1,       /* Sliding window (precise) */
  RATE_LIMIT_LEAKY_BUCKET = 2,         /* Leaky bucket (queue) */
  RATE_LIMIT_FIXED_WINDOW = 3          /* Fixed window (simple) */
} fl_rate_limit_algorithm_t;

/* ===== Token Bucket State ===== */

typedef struct {
  double tokens;                       /* Current tokens */
  double max_tokens;                   /* Capacity */
  double refill_rate;                  /* Tokens per second */
  int64_t last_refill;                 /* Last refill timestamp (ms) */
} fl_token_bucket_t;

/* ===== Sliding Window State ===== */

typedef struct {
  int64_t window_start;                /* Window start time (ms) */
  int request_count;                   /* Requests in window */
  int window_size_ms;                  /* Window size in ms */
  int max_requests;                    /* Max requests per window */
} fl_sliding_window_t;

/* ===== Rate Limiter State ===== */

typedef struct {
  fl_rate_limit_algorithm_t algorithm;

  union {
    fl_token_bucket_t token_bucket;
    fl_sliding_window_t sliding_window;
  } state;

  int allowed;                         /* Requests allowed */
  int rejected;                        /* Requests rejected */

  pthread_mutex_t limiter_mutex;       /* Thread-safe access */
} fl_rate_limiter_t;

/* ===== Statistics ===== */

typedef struct {
  int total_requests;                  /* Total requests checked */
  int allowed_requests;                /* Requests allowed */
  int rejected_requests;               /* Requests rejected */
  double rejection_rate;               /* Rejected / total */
  double avg_wait_time_ms;             /* Avg wait time before allowing */
} fl_rate_limit_stats_t;

/* ===== Public API: Creation ===== */

/* Create token bucket limiter */
fl_rate_limiter_t* freelang_rate_limiter_token_bucket_create(
  double max_tokens, double refill_rate);

/* Create sliding window limiter */
fl_rate_limiter_t* freelang_rate_limiter_sliding_window_create(
  int window_size_ms, int max_requests);

/* Create leaky bucket limiter */
fl_rate_limiter_t* freelang_rate_limiter_leaky_bucket_create(
  int capacity, double leak_rate);

/* Create fixed window limiter */
fl_rate_limiter_t* freelang_rate_limiter_fixed_window_create(
  int window_size_ms, int max_requests);

/* ===== Public API: Rate Limiting ===== */

/* Check if request is allowed */
int freelang_rate_limiter_allow(fl_rate_limiter_t *limiter);

/* Try to consume N tokens */
int freelang_rate_limiter_try_consume(fl_rate_limiter_t *limiter, int tokens);

/* Wait until request allowed (blocking) */
void freelang_rate_limiter_wait_until_allowed(fl_rate_limiter_t *limiter);

/* Get estimated wait time (ms) */
int freelang_rate_limiter_get_wait_time(fl_rate_limiter_t *limiter);

/* ===== Public API: Management ===== */

/* Reset rate limiter */
void freelang_rate_limiter_reset(fl_rate_limiter_t *limiter);

/* Get statistics */
fl_rate_limit_stats_t freelang_rate_limiter_get_stats(fl_rate_limiter_t *limiter);

/* Set new rate (for token bucket) */
void freelang_rate_limiter_set_rate(fl_rate_limiter_t *limiter,
                                     double refill_rate);

/* Set new capacity (for token bucket) */
void freelang_rate_limiter_set_capacity(fl_rate_limiter_t *limiter,
                                         double max_tokens);

/* Destroy rate limiter */
void freelang_rate_limiter_destroy(fl_rate_limiter_t *limiter);

/* ===== Helper Functions ===== */

/* Get current timestamp in milliseconds */
int64_t _get_timestamp_ms(void);

/* Calculate tokens available */
double _calculate_available_tokens(fl_token_bucket_t *bucket);

#endif /* FREELANG_RATE_LIMITER_H */
