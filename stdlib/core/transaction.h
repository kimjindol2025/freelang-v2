/**
 * FreeLang stdlib/transaction - Database Transaction Management
 * ACID properties, savepoints, isolation levels, deadlock detection
 */

#ifndef FREELANG_STDLIB_TRANSACTION_H
#define FREELANG_STDLIB_TRANSACTION_H

#include <stdint.h>
#include <stddef.h>
#include <time.h>

/* ===== Transaction Isolation Levels ===== */

typedef enum {
  FL_ISOLATION_READ_UNCOMMITTED = 0,
  FL_ISOLATION_READ_COMMITTED = 1,
  FL_ISOLATION_REPEATABLE_READ = 2,
  FL_ISOLATION_SERIALIZABLE = 3
} fl_isolation_level_t;

/* ===== Transaction State ===== */

typedef enum {
  FL_TXNS_INITIAL = 0,
  FL_TXNS_ACTIVE = 1,
  FL_TXNS_PREPARING = 2,
  FL_TXNS_COMMITTED = 3,
  FL_TXNS_ROLLED_BACK = 4,
  FL_TXNS_FAILED = 5
} fl_transaction_state_t;

/* ===== Transaction Handle ===== */

typedef struct fl_transaction_t fl_transaction_t;

/* ===== Savepoint ===== */

typedef struct {
  char *name;
  int64_t created_at;
  uint32_t operation_count;
} fl_savepoint_t;

/* ===== Lock Type ===== */

typedef enum {
  FL_LOCK_NONE = 0,
  FL_LOCK_SHARED = 1,
  FL_LOCK_EXCLUSIVE = 2
} fl_lock_type_t;

/* ===== Statistics ===== */

typedef struct {
  uint64_t transactions_started;
  uint64_t transactions_committed;
  uint64_t transactions_rolled_back;
  uint64_t savepoints_created;
  uint64_t savepoints_rolled_back;
  uint64_t deadlocks_detected;
  uint64_t lock_conflicts;
  double avg_transaction_duration_ms;
} fl_transaction_stats_t;

/* ===== Public API ===== */

/* Transaction Control */
fl_transaction_t* fl_transaction_begin(void);
fl_transaction_t* fl_transaction_begin_with_level(fl_isolation_level_t level);
int fl_transaction_commit(fl_transaction_t *txn);
int fl_transaction_rollback(fl_transaction_t *txn);
void fl_transaction_destroy(fl_transaction_t *txn);

/* Transaction State */
fl_transaction_state_t fl_transaction_get_state(fl_transaction_t *txn);
int fl_transaction_is_active(fl_transaction_t *txn);
int64_t fl_transaction_get_start_time(fl_transaction_t *txn);

/* Savepoints */
int fl_transaction_create_savepoint(fl_transaction_t *txn, const char *name);
int fl_transaction_rollback_to_savepoint(fl_transaction_t *txn, const char *name);
int fl_transaction_release_savepoint(fl_transaction_t *txn, const char *name);

/* Isolation Level */
int fl_transaction_set_isolation_level(fl_transaction_t *txn, fl_isolation_level_t level);
fl_isolation_level_t fl_transaction_get_isolation_level(fl_transaction_t *txn);

/* Locking */
int fl_transaction_lock_resource(fl_transaction_t *txn, const char *resource_id, fl_lock_type_t lock_type);
int fl_transaction_unlock_resource(fl_transaction_t *txn, const char *resource_id);
int fl_transaction_try_lock(fl_transaction_t *txn, const char *resource_id, fl_lock_type_t lock_type, int timeout_ms);

/* Deadlock Detection */
int fl_transaction_check_deadlock(fl_transaction_t *txn);
int fl_transaction_detect_cycles(void);

/* Two-Phase Commit */
int fl_transaction_prepare(fl_transaction_t *txn);
int fl_transaction_abort_prepare(fl_transaction_t *txn);

/* Visibility */
int fl_transaction_is_visible(fl_transaction_t *txn, uint64_t row_version);

/* Statistics */
fl_transaction_stats_t* fl_transaction_get_stats(void);
void fl_transaction_reset_stats(void);

#endif /* FREELANG_STDLIB_TRANSACTION_H */
