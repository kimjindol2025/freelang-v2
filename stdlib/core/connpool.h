/**
 * FreeLang stdlib/connpool - Connection Pool Management
 * Database connection pooling, resource reuse, queue management
 */

#ifndef FREELANG_STDLIB_CONNPOOL_H
#define FREELANG_STDLIB_CONNPOOL_H

#include <stdint.h>
#include <stddef.h>

/* ===== Connection State ===== */

typedef enum {
  FL_CONN_AVAILABLE = 0,
  FL_CONN_IN_USE = 1,
  FL_CONN_IDLE = 2,
  FL_CONN_STALE = 3,
  FL_CONN_CLOSED = 4
} fl_connection_state_t;

/* ===== Connection Pool Handle ===== */

typedef struct fl_connpool_t fl_connpool_t;

/* ===== Connection Info ===== */

typedef struct {
  int connection_id;
  fl_connection_state_t state;
  int64_t created_at;
  int64_t last_used_at;
  int64_t idle_time_ms;
  const char *connection_string;
} fl_connection_info_t;

/* ===== Statistics ===== */

typedef struct {
  int total_connections;
  int available_connections;
  int in_use_connections;
  int idle_connections;
  int stale_connections;
  uint64_t connections_created;
  uint64_t connections_reused;
  uint64_t connections_closed;
  uint64_t failed_acquisitions;
  double avg_acquisition_time_ms;
} fl_connpool_stats_t;

/* ===== Public API ===== */

/* Pool Creation */
fl_connpool_t* fl_connpool_create(const char *connection_string, int initial_size, int max_size);
void fl_connpool_destroy(fl_connpool_t *pool);

/* Connection Acquisition */
void* fl_connpool_acquire(fl_connpool_t *pool);
void* fl_connpool_acquire_timeout(fl_connpool_t *pool, int timeout_ms);
int fl_connpool_release(fl_connpool_t *pool, void *connection);

/* Connection Management */
int fl_connpool_validate_connection(void *connection);
int fl_connpool_close_connection(void *connection);
int fl_connpool_reset_connection(void *connection);

/* Pool Configuration */
int fl_connpool_set_min_idle(fl_connpool_t *pool, int min_idle);
int fl_connpool_set_max_idle_time(fl_connpool_t *pool, int max_idle_ms);
int fl_connpool_set_test_on_borrow(fl_connpool_t *pool, int enabled);
int fl_connpool_set_test_on_return(fl_connpool_t *pool, int enabled);

/* Health & Maintenance */
int fl_connpool_validate_all(fl_connpool_t *pool);
int fl_connpool_close_idle_connections(fl_connpool_t *pool);
int fl_connpool_evict_expired(fl_connpool_t *pool);

/* Queue Operations */
int fl_connpool_get_available_count(fl_connpool_t *pool);
int fl_connpool_get_in_use_count(fl_connpool_t *pool);
int fl_connpool_get_size(fl_connpool_t *pool);

/* Statistics */
fl_connpool_stats_t* fl_connpool_get_stats(fl_connpool_t *pool);
void fl_connpool_reset_stats(fl_connpool_t *pool);

#endif /* FREELANG_STDLIB_CONNPOOL_H */
