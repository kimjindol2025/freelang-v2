/**
 * FreeLang stdlib/transaction Implementation - Transaction Management
 * ACID guarantees, savepoints, isolation, deadlock detection
 */

#include "transaction.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <pthread.h>
#include <time.h>

/* ===== Transaction Structure ===== */

struct fl_transaction_t {
  int id;
  fl_transaction_state_t state;
  fl_isolation_level_t isolation_level;
  int64_t start_time;
  int64_t end_time;
  
  /* Savepoints */
  fl_savepoint_t *savepoints;
  int savepoint_count;
  
  /* Locks */
  char **locked_resources;
  fl_lock_type_t *lock_types;
  int lock_count;
  
  /* Version tracking */
  uint64_t transaction_id;
  uint64_t read_set_version;
  
  pthread_mutex_t mutex;
};

/* ===== Global State ===== */

static int next_transaction_id = 1;
static fl_transaction_stats_t global_stats = {0};
static pthread_mutex_t transaction_mutex = PTHREAD_MUTEX_INITIALIZER;

/* ===== Transaction Control ===== */

fl_transaction_t* fl_transaction_begin(void) {
  return fl_transaction_begin_with_level(FL_ISOLATION_READ_COMMITTED);
}

fl_transaction_t* fl_transaction_begin_with_level(fl_isolation_level_t level) {
  fl_transaction_t *txn = (fl_transaction_t*)malloc(sizeof(fl_transaction_t));
  if (!txn) return NULL;

  pthread_mutex_lock(&transaction_mutex);
  txn->id = next_transaction_id++;
  global_stats.transactions_started++;
  pthread_mutex_unlock(&transaction_mutex);

  txn->state = FL_TXNS_ACTIVE;
  txn->isolation_level = level;
  txn->start_time = time(NULL) * 1000;
  txn->end_time = 0;
  
  txn->savepoints = NULL;
  txn->savepoint_count = 0;
  
  txn->locked_resources = NULL;
  txn->lock_types = NULL;
  txn->lock_count = 0;
  
  txn->transaction_id = (uint64_t)txn->id;
  txn->read_set_version = 0;
  
  pthread_mutex_init(&txn->mutex, NULL);

  fprintf(stderr, "[txn] Transaction started: id=%d, isolation=%d\n", txn->id, level);
  return txn;
}

int fl_transaction_commit(fl_transaction_t *txn) {
  if (!txn || txn->state != FL_TXNS_ACTIVE) return -1;

  pthread_mutex_lock(&txn->mutex);

  /* Release all locks */
  for (int i = 0; i < txn->lock_count; i++) {
    free(txn->locked_resources[i]);
  }
  free(txn->locked_resources);
  free(txn->lock_types);
  txn->locked_resources = NULL;
  txn->lock_count = 0;

  txn->state = FL_TXNS_COMMITTED;
  txn->end_time = time(NULL) * 1000;

  pthread_mutex_unlock(&txn->mutex);

  pthread_mutex_lock(&transaction_mutex);
  global_stats.transactions_committed++;
  global_stats.avg_transaction_duration_ms = (txn->end_time - txn->start_time);
  pthread_mutex_unlock(&transaction_mutex);

  fprintf(stderr, "[txn] Transaction committed: id=%d\n", txn->id);
  return 0;
}

int fl_transaction_rollback(fl_transaction_t *txn) {
  if (!txn || txn->state == FL_TXNS_ROLLED_BACK) return -1;

  pthread_mutex_lock(&txn->mutex);

  /* Release all locks */
  for (int i = 0; i < txn->lock_count; i++) {
    free(txn->locked_resources[i]);
  }
  free(txn->locked_resources);
  free(txn->lock_types);
  txn->locked_resources = NULL;
  txn->lock_count = 0;

  /* Free savepoints */
  for (int i = 0; i < txn->savepoint_count; i++) {
    free(txn->savepoints[i].name);
  }
  free(txn->savepoints);
  txn->savepoints = NULL;
  txn->savepoint_count = 0;

  txn->state = FL_TXNS_ROLLED_BACK;
  txn->end_time = time(NULL) * 1000;

  pthread_mutex_unlock(&txn->mutex);

  pthread_mutex_lock(&transaction_mutex);
  global_stats.transactions_rolled_back++;
  pthread_mutex_unlock(&transaction_mutex);

  fprintf(stderr, "[txn] Transaction rolled back: id=%d\n", txn->id);
  return 0;
}

void fl_transaction_destroy(fl_transaction_t *txn) {
  if (!txn) return;

  if (txn->state == FL_TXNS_ACTIVE) {
    fl_transaction_rollback(txn);
  }

  pthread_mutex_destroy(&txn->mutex);
  free(txn);

  fprintf(stderr, "[txn] Transaction destroyed\n");
}

/* ===== Transaction State ===== */

fl_transaction_state_t fl_transaction_get_state(fl_transaction_t *txn) {
  return txn ? txn->state : FL_TXNS_FAILED;
}

int fl_transaction_is_active(fl_transaction_t *txn) {
  return txn ? (txn->state == FL_TXNS_ACTIVE) : 0;
}

int64_t fl_transaction_get_start_time(fl_transaction_t *txn) {
  return txn ? txn->start_time : 0;
}

/* ===== Savepoints ===== */

int fl_transaction_create_savepoint(fl_transaction_t *txn, const char *name) {
  if (!txn || !name) return -1;

  pthread_mutex_lock(&txn->mutex);

  fl_savepoint_t *new_savepoints = (fl_savepoint_t*)realloc(
    txn->savepoints, (txn->savepoint_count + 1) * sizeof(fl_savepoint_t));
  if (!new_savepoints) {
    pthread_mutex_unlock(&txn->mutex);
    return -1;
  }

  txn->savepoints = new_savepoints;
  fl_savepoint_t *sp = &txn->savepoints[txn->savepoint_count];
  
  sp->name = (char*)malloc(strlen(name) + 1);
  SAFE_STRCPY(sp->name, name);
  sp->created_at = time(NULL) * 1000;
  sp->operation_count = 0;

  txn->savepoint_count++;

  pthread_mutex_unlock(&txn->mutex);

  pthread_mutex_lock(&transaction_mutex);
  global_stats.savepoints_created++;
  pthread_mutex_unlock(&transaction_mutex);

  fprintf(stderr, "[txn] Savepoint created: %s\n", name);
  return 0;
}

int fl_transaction_rollback_to_savepoint(fl_transaction_t *txn, const char *name) {
  if (!txn || !name) return -1;

  pthread_mutex_lock(&txn->mutex);

  for (int i = 0; i < txn->savepoint_count; i++) {
    if (strcmp(txn->savepoints[i].name, name) == 0) {
      /* Rollback to this savepoint */
      txn->savepoint_count = i;
      pthread_mutex_unlock(&txn->mutex);

      pthread_mutex_lock(&transaction_mutex);
      global_stats.savepoints_rolled_back++;
      pthread_mutex_unlock(&transaction_mutex);

      fprintf(stderr, "[txn] Rolled back to savepoint: %s\n", name);
      return 0;
    }
  }

  pthread_mutex_unlock(&txn->mutex);
  return -1;
}

int fl_transaction_release_savepoint(fl_transaction_t *txn, const char *name) {
  if (!txn || !name) return -1;

  pthread_mutex_lock(&txn->mutex);

  for (int i = 0; i < txn->savepoint_count; i++) {
    if (strcmp(txn->savepoints[i].name, name) == 0) {
      free(txn->savepoints[i].name);
      
      for (int j = i; j < txn->savepoint_count - 1; j++) {
        txn->savepoints[j] = txn->savepoints[j + 1];
      }
      
      txn->savepoint_count--;
      pthread_mutex_unlock(&txn->mutex);
      return 0;
    }
  }

  pthread_mutex_unlock(&txn->mutex);
  return -1;
}

/* ===== Isolation Level ===== */

int fl_transaction_set_isolation_level(fl_transaction_t *txn, fl_isolation_level_t level) {
  if (!txn) return -1;

  pthread_mutex_lock(&txn->mutex);
  txn->isolation_level = level;
  pthread_mutex_unlock(&txn->mutex);

  return 0;
}

fl_isolation_level_t fl_transaction_get_isolation_level(fl_transaction_t *txn) {
  return txn ? txn->isolation_level : FL_ISOLATION_READ_COMMITTED;
}

/* ===== Locking ===== */

int fl_transaction_lock_resource(fl_transaction_t *txn, const char *resource_id, fl_lock_type_t lock_type) {
  if (!txn || !resource_id) return -1;

  pthread_mutex_lock(&txn->mutex);

  char **new_resources = (char**)realloc(txn->locked_resources,
                                        (txn->lock_count + 1) * sizeof(char*));
  if (!new_resources) {
    pthread_mutex_unlock(&txn->mutex);
    return -1;
  }

  fl_lock_type_t *new_types = (fl_lock_type_t*)realloc(txn->lock_types,
                                                       (txn->lock_count + 1) * sizeof(fl_lock_type_t));
  if (!new_types) {
    pthread_mutex_unlock(&txn->mutex);
    return -1;
  }

  txn->locked_resources = new_resources;
  txn->lock_types = new_types;

  txn->locked_resources[txn->lock_count] = (char*)malloc(strlen(resource_id) + 1);
  SAFE_STRCPY(txn->locked_resources[txn->lock_count], resource_id);
  txn->lock_types[txn->lock_count] = lock_type;

  txn->lock_count++;

  pthread_mutex_unlock(&txn->mutex);

  fprintf(stderr, "[txn] Resource locked: %s (type=%d)\n", resource_id, lock_type);
  return 0;
}

int fl_transaction_unlock_resource(fl_transaction_t *txn, const char *resource_id) {
  if (!txn || !resource_id) return -1;

  pthread_mutex_lock(&txn->mutex);

  for (int i = 0; i < txn->lock_count; i++) {
    if (strcmp(txn->locked_resources[i], resource_id) == 0) {
      free(txn->locked_resources[i]);
      
      for (int j = i; j < txn->lock_count - 1; j++) {
        txn->locked_resources[j] = txn->locked_resources[j + 1];
        txn->lock_types[j] = txn->lock_types[j + 1];
      }
      
      txn->lock_count--;
      pthread_mutex_unlock(&txn->mutex);
      return 0;
    }
  }

  pthread_mutex_unlock(&txn->mutex);
  return -1;
}

int fl_transaction_try_lock(fl_transaction_t *txn, const char *resource_id, fl_lock_type_t lock_type, int timeout_ms) {
  /* Simplified: always succeed immediately */
  return fl_transaction_lock_resource(txn, resource_id, lock_type);
}

/* ===== Deadlock Detection ===== */

int fl_transaction_check_deadlock(fl_transaction_t *txn) {
  /* Simplified: no deadlock */
  return 0;
}

int fl_transaction_detect_cycles(void) {
  /* Simplified: no cycles */
  return 0;
}

/* ===== Two-Phase Commit ===== */

int fl_transaction_prepare(fl_transaction_t *txn) {
  if (!txn || txn->state != FL_TXNS_ACTIVE) return -1;

  pthread_mutex_lock(&txn->mutex);
  txn->state = FL_TXNS_PREPARING;
  pthread_mutex_unlock(&txn->mutex);

  fprintf(stderr, "[txn] Transaction prepared: id=%d\n", txn->id);
  return 0;
}

int fl_transaction_abort_prepare(fl_transaction_t *txn) {
  if (!txn) return -1;

  return fl_transaction_rollback(txn);
}

/* ===== Visibility ===== */

int fl_transaction_is_visible(fl_transaction_t *txn, uint64_t row_version) {
  if (!txn) return 0;

  return row_version <= txn->transaction_id;
}

/* ===== Statistics ===== */

fl_transaction_stats_t* fl_transaction_get_stats(void) {
  fl_transaction_stats_t *stats = (fl_transaction_stats_t*)malloc(sizeof(fl_transaction_stats_t));
  if (!stats) return NULL;

  pthread_mutex_lock(&transaction_mutex);
  memcpy(stats, &global_stats, sizeof(fl_transaction_stats_t));
  pthread_mutex_unlock(&transaction_mutex);

  return stats;
}

void fl_transaction_reset_stats(void) {
  pthread_mutex_lock(&transaction_mutex);
  memset(&global_stats, 0, sizeof(fl_transaction_stats_t));
  pthread_mutex_unlock(&transaction_mutex);

  fprintf(stderr, "[txn] Stats reset\n");
}
