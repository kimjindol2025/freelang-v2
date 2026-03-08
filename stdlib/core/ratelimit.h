/**
 * FreeLang stdlib/ratelimit - Rate Limiter
 * Token bucket, sliding window, fixed window, per-client rate limits
 */

#ifndef FREELANG_STDLIB_RATELIMIT_H
#define FREELANG_STDLIB_RATELIMIT_H

#include <stdint.h>
#include <stddef.h>

/* ===== Rate Limiting Algorithms ===== */

typedef enum {
  FL_RATELIMIT_TOKEN_BUCKET = 0,    /* Token bucket algorithm */
  FL_RATELIMIT_SLIDING_WINDOW = 1,  /* Sliding window log */
  FL_RATELIMIT_FIXED_WINDOW = 2     /* Fixed window counter */
} fl_ratelimit_algorithm_t;

/* ===== Rate Limiter Handle ===== */

typedef struct fl_ratelimit_t fl_ratelimit_t;

/* ===== Per-Client Limit ===== */

typedef struct {
  char *identifier;           /* Client ID, IP, or token */
  int rate_limit;            /* Max requests per window */
  int window_ms;             /* Time window in milliseconds */
  uint64_t request_count;    /* Current window requests */
  int64_t window_reset_time; /* When window resets */
  int64_t last_request_time; /* Last request timestamp */
} fl_ratelimit_client_t;

/* ===== Statistics ===== */

typedef struct {
  uint64_t total_requests;
  uint64_t allowed_requests;
  uint64_t rejected_requests;
  uint64_t retry_after_issued;
  uint64_t unique_clients;
  double avg_requests_per_second;
} fl_ratelimit_stats_t;

/* ===== Public API ===== */

/* Creation & Destruction */
fl_ratelimit_t* fl_ratelimit_create(fl_ratelimit_algorithm_t algorithm);
void fl_ratelimit_destroy(fl_ratelimit_t *limiter);

/* Global Rate Limits */
int fl_ratelimit_set_global_limit(fl_ratelimit_t *limiter, int requests_per_window, int window_ms);

/* Per-Client Limits */
int fl_ratelimit_set_client_limit(fl_ratelimit_t *limiter, const char *identifier,
                                  int requests_per_window, int window_ms);
int fl_ratelimit_remove_client(fl_ratelimit_t *limiter, const char *identifier);

/* Check Rate Limit */
int fl_ratelimit_check(fl_ratelimit_t *limiter, const char *identifier);
int fl_ratelimit_check_and_increment(fl_ratelimit_t *limiter, const char *identifier);

/* Get Remaining Quota */
int fl_ratelimit_get_remaining(fl_ratelimit_t *limiter, const char *identifier);
int64_t fl_ratelimit_get_reset_time(fl_ratelimit_t *limiter, const char *identifier);

/* Client Management */
int fl_ratelimit_reset_client(fl_ratelimit_t *limiter, const char *identifier);
fl_ratelimit_client_t* fl_ratelimit_get_client(fl_ratelimit_t *limiter, const char *identifier);

/* Cleanup */
int fl_ratelimit_cleanup_expired(fl_ratelimit_t *limiter, int max_idle_ms);

/* Statistics */
fl_ratelimit_stats_t* fl_ratelimit_get_stats(fl_ratelimit_t *limiter);
void fl_ratelimit_reset_stats(fl_ratelimit_t *limiter);

/* Algorithm Configuration */
int fl_ratelimit_set_algorithm(fl_ratelimit_t *limiter, fl_ratelimit_algorithm_t algorithm);

#endif /* FREELANG_STDLIB_RATELIMIT_H */
