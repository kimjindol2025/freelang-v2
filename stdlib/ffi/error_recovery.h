/**
 * FreeLang Error Recovery (Phase 19)
 * Automatic reconnection and error handling
 */

#ifndef FREELANG_ERROR_RECOVERY_H
#define FREELANG_ERROR_RECOVERY_H

#include "mini_redis.h"
#include <time.h>

/* ===== Error Types ===== */

typedef enum {
  REDIS_ERR_NONE = 0,
  REDIS_ERR_CONNECTION_FAILED = 1,
  REDIS_ERR_TIMEOUT = 2,
  REDIS_ERR_PROTOCOL = 3,
  REDIS_ERR_COMMAND_FAILED = 4,
  REDIS_ERR_MEMORY = 5,
  REDIS_ERR_UNKNOWN = 99
} redis_error_t;

/* ===== Retry Configuration ===== */

typedef struct {
  int max_retries;           /* Max retry attempts (default: 3) */
  int retry_delay_ms;        /* Delay between retries in ms (default: 100) */
  int exponential_backoff;   /* Enable exponential backoff (default: 1) */
  int max_backoff_ms;        /* Max backoff time (default: 5000) */
} fl_retry_policy_t;

/* ===== Error Context ===== */

typedef struct {
  redis_error_t error_type;
  char error_message[256];
  int retry_count;
  time_t last_error_time;
  int consecutive_errors;
} fl_error_context_t;

/* ===== Public API ===== */

/* Set default retry policy */
void freelang_set_retry_policy(const fl_retry_policy_t *policy);

/* Get default retry policy */
fl_retry_policy_t freelang_get_retry_policy(void);

/* Get last error for client */
fl_error_context_t* freelang_get_last_error(int client_id);

/* Clear error context for client */
void freelang_clear_error(int client_id);

/* Record error */
void freelang_record_error(int client_id, redis_error_t error_type, const char *message);

/* Check if should retry */
int freelang_should_retry(int client_id);

/* Calculate retry delay with exponential backoff */
int freelang_calculate_retry_delay(int retry_count);

/* Auto-reconnect with retry logic */
int freelang_auto_reconnect(int client_id);

#endif /* FREELANG_ERROR_RECOVERY_H */
