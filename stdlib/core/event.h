/**
 * FreeLang stdlib/event - Custom Event Emitter
 * EventEmitter pattern, event listeners, wildcard matching
 */

#ifndef FREELANG_STDLIB_EVENT_H
#define FREELANG_STDLIB_EVENT_H

#include <stdint.h>
#include <pthread.h>

/* ===== Event Listener ===== */

typedef void (*fl_event_listener_t)(const char *event_name, void *data, void *context);

typedef struct {
  uint32_t listener_id;
  char event_name[64];
  fl_event_listener_t callback;
  void *context;

  int once;                  /* Execute once then remove */
  int64_t created_at;
  int64_t fired_at;
  int fired_count;
} fl_listener_t;

/* ===== Event Emitter ===== */

typedef struct {
  fl_listener_t *listeners;  /* Array of listeners */
  int listener_count;
  int listener_capacity;

  uint32_t next_listener_id;

  int64_t total_events;      /* Total events emitted */
  int64_t total_listeners;   /* Total listeners created */

  pthread_mutex_t emitter_mutex;
} fl_event_emitter_t;

/* ===== Event Data ===== */

typedef struct {
  char event_name[64];
  void *data;
  int64_t timestamp;
  uint32_t source_id;        /* Source emitter ID */
} fl_event_t;

/* ===== Public API ===== */

/* Create event emitter */
fl_event_emitter_t* fl_event_emitter_create(int max_listeners);

/* Destroy event emitter */
void fl_event_emitter_destroy(fl_event_emitter_t *emitter);

/* ===== Listener Registration ===== */

/* Add event listener */
uint32_t fl_event_on(fl_event_emitter_t *emitter,
                     const char *event_name,
                     fl_event_listener_t callback,
                     void *context);

/* Add one-time listener */
uint32_t fl_event_once(fl_event_emitter_t *emitter,
                       const char *event_name,
                       fl_event_listener_t callback,
                       void *context);

/* Add wildcard listener (matches all events) */
uint32_t fl_event_on_any(fl_event_emitter_t *emitter,
                         fl_event_listener_t callback,
                         void *context);

/* Remove specific listener */
int fl_event_off(fl_event_emitter_t *emitter, uint32_t listener_id);

/* Remove all listeners for event */
int fl_event_remove_all(fl_event_emitter_t *emitter, const char *event_name);

/* Remove all listeners */
int fl_event_clear(fl_event_emitter_t *emitter);

/* Get listener count for event */
int fl_event_listener_count(fl_event_emitter_t *emitter, const char *event_name);

/* Check if event has listeners */
int fl_event_has_listeners(fl_event_emitter_t *emitter, const char *event_name);

/* ===== Event Emission ===== */

/* Emit event (synchronous) */
int fl_event_emit(fl_event_emitter_t *emitter,
                  const char *event_name,
                  void *data);

/* Emit event with context */
int fl_event_emit_with_context(fl_event_emitter_t *emitter,
                               const char *event_name,
                               void *data,
                               void *context);

/* Emit and wait for completion */
int fl_event_emit_sync(fl_event_emitter_t *emitter,
                       const char *event_name,
                       void *data,
                       int timeout_ms);

/* Get last event timestamp */
int64_t fl_event_last_emit_time(fl_event_emitter_t *emitter, const char *event_name);

/* ===== Event Filtering ===== */

/* Match event pattern (wildcard: *) */
int fl_event_match_pattern(const char *pattern, const char *event_name);

/* Get listeners matching pattern */
void fl_event_get_matching_listeners(fl_event_emitter_t *emitter,
                                     const char *pattern,
                                     fl_listener_t **out_listeners,
                                     int *out_count);

/* ===== Statistics ===== */

typedef struct {
  int active_listeners;
  int total_listeners_created;
  int64_t total_events_emitted;
  int64_t total_unique_events;
} fl_event_stats_t;

/* Get event emitter statistics */
fl_event_stats_t fl_event_get_stats(fl_event_emitter_t *emitter);

/* ===== Error Handling ===== */

/* Set error handler for unhandled events */
void fl_event_on_error(fl_event_emitter_t *emitter,
                       fl_event_listener_t error_handler,
                       void *context);

/* Get error count */
int fl_event_get_error_count(fl_event_emitter_t *emitter);

#endif /* FREELANG_STDLIB_EVENT_H */
