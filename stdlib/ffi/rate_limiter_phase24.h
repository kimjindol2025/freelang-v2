/**
 * FreeLang Advanced Rate Limiter (Phase 24)
 * Per-user, per-endpoint, IP-based rate limiting
 */

#ifndef FREELANG_RATE_LIMITER_PHASE24_H
#define FREELANG_RATE_LIMITER_PHASE24_H

#include <time.h>
#include <pthread.h>

/* ===== Rate Limit Strategy ===== */

typedef enum {
  LIMIT_STRATEGY_TOKEN_BUCKET = 0,   /* Smooth burst handling */
  LIMIT_STRATEGY_SLIDING_WINDOW = 1, /* Precise per-second */
  LIMIT_STRATEGY_FIXED_WINDOW = 2    /* Simple minute window */
} fl_limit_strategy_t;

/* ===== Rate Limit Status ===== */

typedef enum {
  LIMIT_ALLOWED = 0,
  LIMIT_EXCEEDED = 1,
  LIMIT_WAIT_REQUIRED = 2
} fl_limit_status_t;

/* ===== Token Bucket ===== */

typedef struct {
  double tokens_available;        /* Current tokens */
  double bucket_capacity;         /* Max tokens (capacity) */
  double refill_rate;            /* Tokens per second */

  int64_t last_refill;           /* Last refill timestamp */
} fl_token_bucket_t;

/* ===== Rate Limit Rule ===== */

typedef struct {
  char rule_id[64];

  char identifier[256];          /* "user:123", "ip:192.168.1.1", "endpoint:/api/users" */
  int limit_per_minute;          /* Max requests per minute */

  fl_limit_strategy_t strategy;

  int64_t window_start;          /* Start of current window */
  int request_count;             /* Requests in current window */

  int is_active;
  int violation_count;           /* How many times exceeded */

  fl_token_bucket_t bucket;
} fl_rate_limit_rule_t;

/* ===== Rate Limit Context ===== */

typedef struct {
  char context_id[64];           /* "user:123" or "ip:192.168.1.1" */
  int requests_per_minute;       /* Configured limit */

  fl_token_bucket_t bucket;
  int64_t window_start;
  int requests_this_window;

  int consecutive_violations;
  int is_temporarily_blocked;
  int64_t block_until;           /* Timestamp when block expires */
} fl_rate_limit_context_t;

/* ===== Rate Limiter Manager ===== */

typedef struct {
  fl_rate_limit_rule_t rules[1024];  /* Per-endpoint/user/IP rules */
  int rule_count;

  fl_rate_limit_context_t contexts[4096];  /* Active rate limit contexts */
  int context_count;

  /* Global settings */
  fl_limit_strategy_t default_strategy;
  int default_limit_per_minute;
  int auto_block_after_violations;  /* Auto-block after N violations */
  int auto_block_duration_seconds;  /* How long to block */

  /* Statistics */
  int total_requests_allowed;
  int total_requests_blocked;
  int total_violations;

  pthread_mutex_t limiter_mutex;
} fl_rate_limiter_t;

/* ===== Public API: Manager ===== */

/* Create rate limiter */
fl_rate_limiter_t* freelang_rate_limiter_create(fl_limit_strategy_t strategy,
                                                 int default_limit_per_minute);

/* Destroy limiter */
void freelang_rate_limiter_destroy(fl_rate_limiter_t *limiter);

/* ===== Public API: Rule Management ===== */

/* Create rate limit rule */
int freelang_rate_limiter_create_rule(fl_rate_limiter_t *limiter,
                                       const char *identifier,
                                       int limit_per_minute);

/* Get rule */
fl_rate_limit_rule_t* freelang_rate_limiter_get_rule(fl_rate_limiter_t *limiter,
                                                      const char *identifier);

/* Delete rule */
void freelang_rate_limiter_delete_rule(fl_rate_limiter_t *limiter,
                                        const char *identifier);

/* Update rule */
void freelang_rate_limiter_update_rule(fl_rate_limiter_t *limiter,
                                        const char *identifier,
                                        int new_limit_per_minute);

/* ===== Public API: Rate Limit Checking ===== */

/* Check if request allowed */
fl_limit_status_t freelang_rate_limiter_check(fl_rate_limiter_t *limiter,
                                               const char *identifier);

/* Check and consume token */
fl_limit_status_t freelang_rate_limiter_check_and_consume(fl_rate_limiter_t *limiter,
                                                           const char *identifier);

/* Get remaining requests */
int freelang_rate_limiter_get_remaining(fl_rate_limiter_t *limiter,
                                         const char *identifier);

/* Get wait time until next allowed request (in milliseconds) */
int freelang_rate_limiter_get_wait_time_ms(fl_rate_limiter_t *limiter,
                                            const char *identifier);

/* ===== Public API: Token Bucket Operations ===== */

/* Refill tokens based on elapsed time */
void freelang_rate_limiter_refill_tokens(fl_token_bucket_t *bucket,
                                          double refill_rate);

/* Add tokens manually */
void freelang_rate_limiter_add_tokens(fl_rate_limiter_t *limiter,
                                       const char *identifier,
                                       double tokens);

/* ===== Public API: Blocking & Penalties ===== */

/* Block identifier temporarily */
void freelang_rate_limiter_block(fl_rate_limiter_t *limiter,
                                  const char *identifier,
                                  int duration_seconds);

/* Unblock identifier */
void freelang_rate_limiter_unblock(fl_rate_limiter_t *limiter,
                                    const char *identifier);

/* Check if identifier is blocked */
int freelang_rate_limiter_is_blocked(fl_rate_limiter_t *limiter,
                                      const char *identifier);

/* Get block expiration time */
int64_t freelang_rate_limiter_get_block_until(fl_rate_limiter_t *limiter,
                                               const char *identifier);

/* ===== Public API: Context Management ===== */

/* Get or create context */
fl_rate_limit_context_t* freelang_rate_limiter_get_context(fl_rate_limiter_t *limiter,
                                                            const char *identifier);

/* Reset context */
void freelang_rate_limiter_reset_context(fl_rate_limiter_t *limiter,
                                          const char *identifier);

/* Reset all contexts */
void freelang_rate_limiter_reset_all_contexts(fl_rate_limiter_t *limiter);

/* ===== Public API: Monitoring ===== */

typedef struct {
  int total_requests_allowed;
  int total_requests_blocked;
  int total_violations;
  int currently_blocked_identifiers;
  double allow_rate;
} fl_rate_limiter_stats_t;

/* Get rate limiter statistics */
fl_rate_limiter_stats_t freelang_rate_limiter_get_stats(fl_rate_limiter_t *limiter);

/* Reset statistics */
void freelang_rate_limiter_reset_stats(fl_rate_limiter_t *limiter);

#endif /* FREELANG_RATE_LIMITER_PHASE24_H */
