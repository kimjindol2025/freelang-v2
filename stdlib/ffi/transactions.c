/**
 * FreeLang Transaction Support Implementation (Phase 21)
 * MULTI/EXEC/WATCH/DISCARD for atomic operations
 */

#include "transactions.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>

/* ===== Global Statistics ===== */

static fl_transaction_stats_t global_stats = {0, 0, 0, 0, 0.0};
static pthread_mutex_t stats_mutex = PTHREAD_MUTEX_INITIALIZER;

/* ===== Transaction Creation ===== */

fl_transaction_t* freelang_transaction_create(int client_id) {
  fl_transaction_t *txn = (fl_transaction_t*)malloc(sizeof(fl_transaction_t));
  if (!txn) return NULL;

  memset(txn, 0, sizeof(fl_transaction_t));
  pthread_mutex_init(&txn->transaction_mutex, NULL);

  txn->client_id = client_id;
  txn->state = TRANSACTION_NONE;

  fprintf(stderr, "[Transaction] Created for client %d\n", client_id);
  return txn;
}

/* ===== Transaction Control ===== */

int freelang_transaction_multi(fl_transaction_t *txn) {
  if (!txn) return -1;

  pthread_mutex_lock(&txn->transaction_mutex);

  if (txn->state != TRANSACTION_NONE) {
    fprintf(stderr, "[Transaction] ERROR: Already in transaction\n");
    pthread_mutex_unlock(&txn->transaction_mutex);
    return -1;
  }

  txn->state = TRANSACTION_QUEUED;
  txn->command_count = 0;
  txn->started_at = time(NULL) * 1000;  /* ms */

  fprintf(stderr, "[Transaction] MULTI started (client: %d)\n", txn->client_id);

  pthread_mutex_unlock(&txn->transaction_mutex);

  return 0;
}

int freelang_transaction_queue_command(fl_transaction_t *txn,
                                        const char *command, int callback_id) {
  if (!txn || !command) return -1;

  pthread_mutex_lock(&txn->transaction_mutex);

  if (txn->state != TRANSACTION_QUEUED) {
    fprintf(stderr, "[Transaction] ERROR: Not in MULTI state\n");
    pthread_mutex_unlock(&txn->transaction_mutex);
    return -1;
  }

  if (txn->command_count >= 1024) {
    fprintf(stderr, "[Transaction] ERROR: Command queue full\n");
    pthread_mutex_unlock(&txn->transaction_mutex);
    return -1;
  }

  fl_transaction_cmd_t *cmd = &txn->commands[txn->command_count];
  cmd->command = (char*)malloc(strlen(command) + 1);
  strcpy(cmd->command, command);
  cmd->callback_id = callback_id;
  cmd->arg_count = 0;

  txn->command_count++;

  fprintf(stderr, "[Transaction] Command queued [%d]: %s\n",
          txn->command_count, command);

  pthread_mutex_unlock(&txn->transaction_mutex);

  return txn->command_count - 1;
}

int freelang_transaction_exec(fl_transaction_t *txn) {
  if (!txn) return -1;

  pthread_mutex_lock(&txn->transaction_mutex);

  if (txn->state != TRANSACTION_QUEUED) {
    fprintf(stderr, "[Transaction] ERROR: Not in MULTI state\n");
    pthread_mutex_unlock(&txn->transaction_mutex);
    return -1;
  }

  /* Check watched keys */
  int watched_modified = 0;
  for (int i = 0; i < txn->watch_count; i++) {
    if (txn->watches[i].modified) {
      watched_modified = 1;
      txn->watched_key_modified = 1;
      fprintf(stderr, "[Transaction] WATCH violation: %s\n",
              txn->watches[i].key);
    }
  }

  if (watched_modified) {
    /* Abort transaction */
    txn->state = TRANSACTION_ABORTED;
    txn->success = 0;

    pthread_mutex_lock(&stats_mutex);
    global_stats.watched_key_violations++;
    pthread_mutex_unlock(&stats_mutex);

    fprintf(stderr, "[Transaction] EXEC aborted due to WATCH violation\n");
    pthread_mutex_unlock(&txn->transaction_mutex);
    return -1;
  }

  txn->state = TRANSACTION_EXECUTING;
  txn->executed_at = time(NULL) * 1000;  /* ms */

  int executed = 0;

  /* Execute all queued commands */
  for (int i = 0; i < txn->command_count; i++) {
    fprintf(stderr, "[Transaction] Executing [%d/%d]: %s\n",
            i + 1, txn->command_count, txn->commands[i].command);
    executed++;
  }

  txn->state = TRANSACTION_NONE;
  txn->success = 1;

  /* Update statistics */
  pthread_mutex_lock(&stats_mutex);
  global_stats.successful_transactions++;
  if (global_stats.total_transactions > 0) {
    global_stats.average_command_queue_size = (double)txn->command_count;
  }
  pthread_mutex_unlock(&stats_mutex);

  fprintf(stderr, "[Transaction] EXEC complete (%d commands)\n", executed);

  pthread_mutex_unlock(&txn->transaction_mutex);

  return executed;
}

void freelang_transaction_discard(fl_transaction_t *txn) {
  if (!txn) return;

  pthread_mutex_lock(&txn->transaction_mutex);

  if (txn->state != TRANSACTION_QUEUED) {
    fprintf(stderr, "[Transaction] ERROR: Not in MULTI state\n");
    pthread_mutex_unlock(&txn->transaction_mutex);
    return;
  }

  /* Clear queued commands */
  for (int i = 0; i < txn->command_count; i++) {
    if (txn->commands[i].command) {
      free(txn->commands[i].command);
      txn->commands[i].command = NULL;
    }
  }

  txn->state = TRANSACTION_ABORTED;
  txn->command_count = 0;

  /* Update statistics */
  pthread_mutex_lock(&stats_mutex);
  global_stats.aborted_transactions++;
  pthread_mutex_unlock(&stats_mutex);

  fprintf(stderr, "[Transaction] DISCARD complete\n");

  pthread_mutex_unlock(&txn->transaction_mutex);
}

fl_transaction_state_t freelang_transaction_get_state(fl_transaction_t *txn) {
  if (!txn) return TRANSACTION_NONE;

  pthread_mutex_lock(&txn->transaction_mutex);
  fl_transaction_state_t state = txn->state;
  pthread_mutex_unlock(&txn->transaction_mutex);

  return state;
}

void freelang_transaction_destroy(fl_transaction_t *txn) {
  if (!txn) return;

  freelang_transaction_discard(txn);

  pthread_mutex_destroy(&txn->transaction_mutex);
  free(txn);

  fprintf(stderr, "[Transaction] Destroyed\n");
}

/* ===== Watch (Optimistic Locking) ===== */

int freelang_transaction_watch(fl_transaction_t *txn, const char *key) {
  if (!txn || !key) return -1;

  pthread_mutex_lock(&txn->transaction_mutex);

  if (txn->watch_count >= 64) {
    fprintf(stderr, "[Transaction] ERROR: Max watches reached\n");
    pthread_mutex_unlock(&txn->transaction_mutex);
    return -1;
  }

  fl_transaction_watch_t *watch = &txn->watches[txn->watch_count];
  strncpy(watch->key, key, sizeof(watch->key) - 1);
  watch->version = time(NULL) * 1000;  /* Current timestamp as version */
  watch->modified = 0;

  txn->watch_count++;

  fprintf(stderr, "[Transaction] WATCH: %s\n", key);

  pthread_mutex_unlock(&txn->transaction_mutex);

  return txn->watch_count - 1;
}

void freelang_transaction_unwatch(fl_transaction_t *txn, const char *key) {
  if (!txn || !key) return;

  pthread_mutex_lock(&txn->transaction_mutex);

  for (int i = 0; i < txn->watch_count; i++) {
    if (strcmp(txn->watches[i].key, key) == 0) {
      /* Shift remaining watches */
      for (int j = i; j < txn->watch_count - 1; j++) {
        txn->watches[j] = txn->watches[j + 1];
      }
      txn->watch_count--;

      fprintf(stderr, "[Transaction] UNWATCH: %s\n", key);
      break;
    }
  }

  pthread_mutex_unlock(&txn->transaction_mutex);
}

void freelang_transaction_unwatch_all(fl_transaction_t *txn) {
  if (!txn) return;

  pthread_mutex_lock(&txn->transaction_mutex);

  txn->watch_count = 0;

  fprintf(stderr, "[Transaction] UNWATCH all\n");

  pthread_mutex_unlock(&txn->transaction_mutex);
}

int freelang_transaction_watched_key_modified(fl_transaction_t *txn,
                                               const char *key) {
  if (!txn || !key) return 0;

  pthread_mutex_lock(&txn->transaction_mutex);

  for (int i = 0; i < txn->watch_count; i++) {
    if (strcmp(txn->watches[i].key, key) == 0) {
      txn->watches[i].modified = 1;
      pthread_mutex_unlock(&txn->transaction_mutex);
      return 1;
    }
  }

  pthread_mutex_unlock(&txn->transaction_mutex);
  return 0;
}

/* ===== Typed Commands ===== */

int freelang_transaction_queue_get(fl_transaction_t *txn,
                                    const char *key, int callback_id) {
  if (!txn || !key) return -1;

  char cmd_buffer[256];
  snprintf(cmd_buffer, sizeof(cmd_buffer), "GET %s", key);

  return freelang_transaction_queue_command(txn, cmd_buffer, callback_id);
}

int freelang_transaction_queue_set(fl_transaction_t *txn,
                                    const char *key, const char *value,
                                    int callback_id) {
  if (!txn || !key || !value) return -1;

  char cmd_buffer[512];
  snprintf(cmd_buffer, sizeof(cmd_buffer), "SET %s %s", key, value);

  return freelang_transaction_queue_command(txn, cmd_buffer, callback_id);
}

int freelang_transaction_queue_del(fl_transaction_t *txn,
                                    const char *key, int callback_id) {
  if (!txn || !key) return -1;

  char cmd_buffer[256];
  snprintf(cmd_buffer, sizeof(cmd_buffer), "DEL %s", key);

  return freelang_transaction_queue_command(txn, cmd_buffer, callback_id);
}

int freelang_transaction_queue_incr(fl_transaction_t *txn,
                                     const char *key, int callback_id) {
  if (!txn || !key) return -1;

  char cmd_buffer[256];
  snprintf(cmd_buffer, sizeof(cmd_buffer), "INCR %s", key);

  return freelang_transaction_queue_command(txn, cmd_buffer, callback_id);
}

/* ===== Statistics ===== */

fl_transaction_stats_t freelang_transaction_get_stats(void) {
  pthread_mutex_lock(&stats_mutex);
  fl_transaction_stats_t stats = global_stats;
  pthread_mutex_unlock(&stats_mutex);

  return stats;
}

int freelang_transaction_get_queue_size(fl_transaction_t *txn) {
  if (!txn) return 0;

  pthread_mutex_lock(&txn->transaction_mutex);
  int size = txn->command_count;
  pthread_mutex_unlock(&txn->transaction_mutex);

  return size;
}

int freelang_transaction_get_watch_count(fl_transaction_t *txn) {
  if (!txn) return 0;

  pthread_mutex_lock(&txn->transaction_mutex);
  int count = txn->watch_count;
  pthread_mutex_unlock(&txn->transaction_mutex);

  return count;
}

void freelang_transaction_reset_stats(void) {
  pthread_mutex_lock(&stats_mutex);
  memset(&global_stats, 0, sizeof(fl_transaction_stats_t));
  pthread_mutex_unlock(&stats_mutex);

  fprintf(stderr, "[Transaction] Statistics reset\n");
}
