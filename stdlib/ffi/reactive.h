/**
 * FreeLang Reactive Chains (Phase 20)
 * Promise-based async operation composition
 */

#ifndef FREELANG_REACTIVE_H
#define FREELANG_REACTIVE_H

#include <pthread.h>
#include <time.h>

/* ===== Promise State ===== */

typedef enum {
  PROMISE_PENDING = 0,
  PROMISE_FULFILLED = 1,
  PROMISE_REJECTED = 2
} fl_promise_state_t;

/* ===== Promise Structure ===== */

typedef struct fl_promise {
  fl_promise_state_t state;            /* Current state */
  void *value;                         /* Resolved value */
  char *error;                         /* Error message if rejected */

  int then_callback_id;                /* then() callback */
  int catch_callback_id;               /* catch() callback */

  struct fl_promise *next_promise;     /* Chained promise */
  pthread_mutex_t promise_mutex;       /* Thread-safe state */

  int64_t created_at;                  /* Creation time */
  int64_t resolved_at;                 /* Resolution time */
} fl_promise_t;

/* ===== Promise Chain ===== */

typedef struct {
  fl_promise_t *head;                  /* First promise */
  fl_promise_t *tail;                  /* Last promise */
  int chain_length;                    /* Number of promises */

  pthread_mutex_t chain_mutex;
} fl_promise_chain_t;

/* ===== Statistics ===== */

typedef struct {
  int total_promises;                  /* Total created */
  int fulfilled_promises;              /* Resolved successfully */
  int rejected_promises;               /* Rejected */
  double average_chain_length;         /* Avg promises per chain */
  double average_resolution_time_ms;   /* Avg time to resolve (ms) */
} fl_reactive_stats_t;

/* ===== Public API: Promise Management ===== */

/* Create new promise */
fl_promise_t* freelang_promise_create(void);

/* Resolve promise with value */
void freelang_promise_resolve(fl_promise_t *promise, void *value);

/* Reject promise with error */
void freelang_promise_reject(fl_promise_t *promise, const char *error);

/* Chain .then() callback */
fl_promise_t* freelang_promise_then(fl_promise_t *promise, int callback_id);

/* Chain .catch() callback */
fl_promise_t* freelang_promise_catch(fl_promise_t *promise, int callback_id);

/* Get promise state */
fl_promise_state_t freelang_promise_get_state(fl_promise_t *promise);

/* Get promise value (if resolved) */
void* freelang_promise_get_value(fl_promise_t *promise);

/* Get promise error (if rejected) */
const char* freelang_promise_get_error(fl_promise_t *promise);

/* Destroy promise */
void freelang_promise_destroy(fl_promise_t *promise);

/* ===== Public API: Promise Chains ===== */

/* Create promise chain */
fl_promise_chain_t* freelang_promise_chain_create(void);

/* Add promise to chain */
void freelang_promise_chain_add(fl_promise_chain_t *chain,
                                 fl_promise_t *promise);

/* Execute chain (resolve all in sequence) */
int freelang_promise_chain_execute(fl_promise_chain_t *chain);

/* Get chain statistics */
fl_reactive_stats_t freelang_promise_chain_get_stats(void);

/* Destroy chain */
void freelang_promise_chain_destroy(fl_promise_chain_t *chain);

/* ===== Utility Functions ===== */

/* Create resolved promise */
fl_promise_t* freelang_promise_resolve_immediate(void *value);

/* Create rejected promise */
fl_promise_t* freelang_promise_reject_immediate(const char *error);

/* Promise.all() - wait for all promises */
fl_promise_t* freelang_promise_all(fl_promise_t **promises, int count);

/* Promise.race() - wait for first promise */
fl_promise_t* freelang_promise_race(fl_promise_t **promises, int count);

#endif /* FREELANG_REACTIVE_H */
