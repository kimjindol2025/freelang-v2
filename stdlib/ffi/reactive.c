/**
 * FreeLang Reactive Chains Implementation (Phase 20)
 * Promise-based async operation composition
 */

#include "reactive.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

/* ===== Global Statistics ===== */

static fl_reactive_stats_t global_stats = {0, 0, 0, 0.0, 0.0};
static pthread_mutex_t stats_mutex = PTHREAD_MUTEX_INITIALIZER;

/* ===== Promise Creation ===== */

fl_promise_t* freelang_promise_create(void) {
  fl_promise_t *promise = (fl_promise_t*)malloc(sizeof(fl_promise_t));
  if (!promise) return NULL;

  memset(promise, 0, sizeof(fl_promise_t));
  pthread_mutex_init(&promise->promise_mutex, NULL);

  promise->state = PROMISE_PENDING;
  promise->created_at = time(NULL) * 1000;  /* ms */

  fprintf(stderr, "[Reactive] Promise created (id: %p)\n", (void*)promise);

  /* Update statistics */
  pthread_mutex_lock(&stats_mutex);
  global_stats.total_promises++;
  pthread_mutex_unlock(&stats_mutex);

  return promise;
}

/* ===== Promise Resolution ===== */

void freelang_promise_resolve(fl_promise_t *promise, void *value) {
  if (!promise) return;

  pthread_mutex_lock(&promise->promise_mutex);

  if (promise->state != PROMISE_PENDING) {
    fprintf(stderr, "[Reactive] WARNING: Promise already resolved\n");
    pthread_mutex_unlock(&promise->promise_mutex);
    return;
  }

  promise->state = PROMISE_FULFILLED;
  promise->value = value;
  promise->resolved_at = time(NULL) * 1000;  /* ms */

  fprintf(stderr, "[Reactive] Promise resolved (id: %p)\n", (void*)promise);

  /* Update statistics */
  pthread_mutex_lock(&stats_mutex);
  global_stats.fulfilled_promises++;
  if (promise->resolved_at > promise->created_at) {
    double elapsed = promise->resolved_at - promise->created_at;
    global_stats.average_resolution_time_ms = elapsed;
  }
  pthread_mutex_unlock(&stats_mutex);

  pthread_mutex_unlock(&promise->promise_mutex);
}

void freelang_promise_reject(fl_promise_t *promise, const char *error) {
  if (!promise) return;

  pthread_mutex_lock(&promise->promise_mutex);

  if (promise->state != PROMISE_PENDING) {
    fprintf(stderr, "[Reactive] WARNING: Promise already resolved\n");
    pthread_mutex_unlock(&promise->promise_mutex);
    return;
  }

  promise->state = PROMISE_REJECTED;
  promise->error = (char*)malloc(strlen(error) + 1);
  strcpy(promise->error, error);
  promise->resolved_at = time(NULL) * 1000;  /* ms */

  fprintf(stderr, "[Reactive] Promise rejected: %s (id: %p)\n", error,
          (void*)promise);

  /* Update statistics */
  pthread_mutex_lock(&stats_mutex);
  global_stats.rejected_promises++;
  pthread_mutex_unlock(&stats_mutex);

  pthread_mutex_unlock(&promise->promise_mutex);
}

/* ===== Promise Chaining ===== */

fl_promise_t* freelang_promise_then(fl_promise_t *promise, int callback_id) {
  if (!promise) return NULL;

  pthread_mutex_lock(&promise->promise_mutex);
  promise->then_callback_id = callback_id;

  /* Create next promise in chain */
  fl_promise_t *next = freelang_promise_create();

  promise->next_promise = next;

  fprintf(stderr, "[Reactive] .then() registered (callback: %d)\n", callback_id);

  pthread_mutex_unlock(&promise->promise_mutex);
  return next;
}

fl_promise_t* freelang_promise_catch(fl_promise_t *promise, int callback_id) {
  if (!promise) return NULL;

  pthread_mutex_lock(&promise->promise_mutex);
  promise->catch_callback_id = callback_id;

  /* Create next promise in chain */
  fl_promise_t *next = freelang_promise_create();
  promise->next_promise = next;

  fprintf(stderr, "[Reactive] .catch() registered (callback: %d)\n", callback_id);

  pthread_mutex_unlock(&promise->promise_mutex);
  return next;
}

/* ===== Promise State Inspection ===== */

fl_promise_state_t freelang_promise_get_state(fl_promise_t *promise) {
  if (!promise) return PROMISE_REJECTED;

  pthread_mutex_lock(&promise->promise_mutex);
  fl_promise_state_t state = promise->state;
  pthread_mutex_unlock(&promise->promise_mutex);

  return state;
}

void* freelang_promise_get_value(fl_promise_t *promise) {
  if (!promise) return NULL;

  pthread_mutex_lock(&promise->promise_mutex);
  void *value = (promise->state == PROMISE_FULFILLED) ? promise->value : NULL;
  pthread_mutex_unlock(&promise->promise_mutex);

  return value;
}

const char* freelang_promise_get_error(fl_promise_t *promise) {
  if (!promise) return NULL;

  pthread_mutex_lock(&promise->promise_mutex);
  const char *error = (promise->state == PROMISE_REJECTED) ? promise->error : NULL;
  pthread_mutex_unlock(&promise->promise_mutex);

  return error;
}

/* ===== Promise Destruction ===== */

void freelang_promise_destroy(fl_promise_t *promise) {
  if (!promise) return;

  if (promise->error) {
    free(promise->error);
  }

  pthread_mutex_destroy(&promise->promise_mutex);
  free(promise);

  fprintf(stderr, "[Reactive] Promise destroyed\n");
}

/* ===== Promise Chain Management ===== */

fl_promise_chain_t* freelang_promise_chain_create(void) {
  fl_promise_chain_t *chain = (fl_promise_chain_t*)malloc(sizeof(fl_promise_chain_t));
  if (!chain) return NULL;

  memset(chain, 0, sizeof(fl_promise_chain_t));
  pthread_mutex_init(&chain->chain_mutex, NULL);

  fprintf(stderr, "[Reactive] Promise chain created\n");
  return chain;
}

void freelang_promise_chain_add(fl_promise_chain_t *chain,
                                 fl_promise_t *promise) {
  if (!chain || !promise) return;

  pthread_mutex_lock(&chain->chain_mutex);

  if (!chain->head) {
    chain->head = promise;
  } else if (chain->tail) {
    chain->tail->next_promise = promise;
  }

  chain->tail = promise;
  chain->chain_length++;

  fprintf(stderr, "[Reactive] Promise added to chain (length: %d)\n",
          chain->chain_length);

  pthread_mutex_unlock(&chain->chain_mutex);
}

int freelang_promise_chain_execute(fl_promise_chain_t *chain) {
  if (!chain || !chain->head) return 0;

  pthread_mutex_lock(&chain->chain_mutex);

  int executed = 0;
  fl_promise_t *current = chain->head;

  fprintf(stderr, "[Reactive] Executing chain (%d promises)\n",
          chain->chain_length);

  while (current) {
    if (freelang_promise_get_state(current) == PROMISE_PENDING) {
      /* In real implementation, would execute the promise */
      fprintf(stderr, "[Reactive]   [%d] Executing promise...\n", executed + 1);
      executed++;
    }

    current = current->next_promise;
  }

  /* Update statistics */
  pthread_mutex_lock(&stats_mutex);
  if (chain->chain_length > 0) {
    global_stats.average_chain_length = chain->chain_length;
  }
  pthread_mutex_unlock(&stats_mutex);

  pthread_mutex_unlock(&chain->chain_mutex);
  return executed;
}

fl_reactive_stats_t freelang_promise_chain_get_stats(void) {
  pthread_mutex_lock(&stats_mutex);
  fl_reactive_stats_t stats = global_stats;
  pthread_mutex_unlock(&stats_mutex);

  return stats;
}

void freelang_promise_chain_destroy(fl_promise_chain_t *chain) {
  if (!chain) return;

  pthread_mutex_lock(&chain->chain_mutex);

  fl_promise_t *current = chain->head;
  while (current) {
    fl_promise_t *next = current->next_promise;
    freelang_promise_destroy(current);
    current = next;
  }

  pthread_mutex_unlock(&chain->chain_mutex);
  pthread_mutex_destroy(&chain->chain_mutex);
  free(chain);

  fprintf(stderr, "[Reactive] Promise chain destroyed\n");
}

/* ===== Utility Functions ===== */

fl_promise_t* freelang_promise_resolve_immediate(void *value) {
  fl_promise_t *promise = freelang_promise_create();
  if (promise) {
    freelang_promise_resolve(promise, value);
  }
  return promise;
}

fl_promise_t* freelang_promise_reject_immediate(const char *error) {
  fl_promise_t *promise = freelang_promise_create();
  if (promise) {
    freelang_promise_reject(promise, error);
  }
  return promise;
}

fl_promise_t* freelang_promise_all(fl_promise_t **promises, int count) {
  if (!promises || count <= 0) return NULL;

  fl_promise_t *all_promise = freelang_promise_create();

  /* Check if all promises are fulfilled */
  int fulfilled_count = 0;
  for (int i = 0; i < count; i++) {
    if (freelang_promise_get_state(promises[i]) == PROMISE_FULFILLED) {
      fulfilled_count++;
    }
  }

  if (fulfilled_count == count) {
    freelang_promise_resolve(all_promise, (void*)(intptr_t)count);
  } else {
    freelang_promise_reject(all_promise, "Not all promises fulfilled");
  }

  return all_promise;
}

fl_promise_t* freelang_promise_race(fl_promise_t **promises, int count) {
  if (!promises || count <= 0) return NULL;

  fl_promise_t *race_promise = freelang_promise_create();

  /* Return first fulfilled promise */
  for (int i = 0; i < count; i++) {
    if (freelang_promise_get_state(promises[i]) == PROMISE_FULFILLED) {
      freelang_promise_resolve(race_promise,
                                freelang_promise_get_value(promises[i]));
      return race_promise;
    }
  }

  freelang_promise_reject(race_promise, "No promise fulfilled");
  return race_promise;
}
