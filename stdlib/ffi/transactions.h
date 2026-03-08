/**
 * FreeLang Transaction Support (Phase 21)
 * MULTI/EXEC/WATCH/DISCARD for atomic operations
 */

#ifndef FREELANG_TRANSACTIONS_H
#define FREELANG_TRANSACTIONS_H

#include <pthread.h>
#include <time.h>

/* ===== Transaction State ===== */

typedef enum {
  TRANSACTION_NONE = 0,
  TRANSACTION_QUEUED = 1,              /* MULTI started, commands queued */
  TRANSACTION_EXECUTING = 2,           /* EXEC in progress */
  TRANSACTION_ABORTED = 3              /* DISCARD called */
} fl_transaction_state_t;

/* ===== Queued Command ===== */

typedef struct {
  char *command;                       /* Command name (GET, SET, etc) */
  char *args[16];                      /* Command arguments */
  int arg_count;
  int callback_id;                     /* Callback for result */
} fl_transaction_cmd_t;

/* ===== Watch Entry (Optimistic Locking) ===== */

typedef struct {
  char key[256];                       /* Watched key */
  int64_t version;                     /* Key version/timestamp */
  int modified;                        /* Has been modified? */
} fl_transaction_watch_t;

/* ===== Transaction State ===== */

typedef struct {
  int client_id;                       /* Associated client */
  fl_transaction_state_t state;        /* Current state */

  fl_transaction_cmd_t commands[1024];  /* Queued commands */
  int command_count;                   /* Number of queued commands */

  fl_transaction_watch_t watches[64];  /* Watched keys */
  int watch_count;                     /* Number of watched keys */

  int64_t started_at;                  /* MULTI start time */
  int64_t executed_at;                 /* EXEC execution time */

  int success;                         /* Transaction success flag */
  int watched_key_modified;            /* Was watched key modified? */

  pthread_mutex_t transaction_mutex;   /* Thread-safe access */
} fl_transaction_t;

/* ===== Statistics ===== */

typedef struct {
  int total_transactions;              /* Total started */
  int successful_transactions;         /* Completed successfully */
  int aborted_transactions;            /* Aborted/DISCARD */
  int watched_key_violations;          /* WATCH violations */
  double average_command_queue_size;   /* Avg commands per transaction */
} fl_transaction_stats_t;

/* ===== Public API: Transaction Control ===== */

/* Create transaction for client */
fl_transaction_t* freelang_transaction_create(int client_id);

/* Start transaction (MULTI) */
int freelang_transaction_multi(fl_transaction_t *txn);

/* Queue command (inside MULTI) */
int freelang_transaction_queue_command(fl_transaction_t *txn,
                                        const char *command, int callback_id);

/* Execute transaction (EXEC) */
int freelang_transaction_exec(fl_transaction_t *txn);

/* Abort transaction (DISCARD) */
void freelang_transaction_discard(fl_transaction_t *txn);

/* Get transaction state */
fl_transaction_state_t freelang_transaction_get_state(fl_transaction_t *txn);

/* Destroy transaction */
void freelang_transaction_destroy(fl_transaction_t *txn);

/* ===== Public API: Watch (Optimistic Locking) ===== */

/* Watch key for modifications */
int freelang_transaction_watch(fl_transaction_t *txn, const char *key);

/* Unwatch specific key */
void freelang_transaction_unwatch(fl_transaction_t *txn, const char *key);

/* Clear all watches */
void freelang_transaction_unwatch_all(fl_transaction_t *txn);

/* Check if watched key was modified */
int freelang_transaction_watched_key_modified(fl_transaction_t *txn,
                                               const char *key);

/* ===== Public API: Typed Commands ===== */

/* Queue GET command */
int freelang_transaction_queue_get(fl_transaction_t *txn,
                                    const char *key, int callback_id);

/* Queue SET command */
int freelang_transaction_queue_set(fl_transaction_t *txn,
                                    const char *key, const char *value,
                                    int callback_id);

/* Queue DEL command */
int freelang_transaction_queue_del(fl_transaction_t *txn,
                                    const char *key, int callback_id);

/* Queue INCR command */
int freelang_transaction_queue_incr(fl_transaction_t *txn,
                                     const char *key, int callback_id);

/* ===== Public API: Statistics & Management ===== */

/* Get transaction statistics */
fl_transaction_stats_t freelang_transaction_get_stats(void);

/* Get queued command count */
int freelang_transaction_get_queue_size(fl_transaction_t *txn);

/* Get watched key count */
int freelang_transaction_get_watch_count(fl_transaction_t *txn);

/* Reset statistics */
void freelang_transaction_reset_stats(void);

#endif /* FREELANG_TRANSACTIONS_H */
