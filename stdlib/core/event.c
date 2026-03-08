/**
 * FreeLang stdlib/event Implementation - Custom Event Emitter
 */

#include "event.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <pthread.h>

/* ===== Event Emitter ===== */

fl_event_emitter_t* fl_event_emitter_create(int max_listeners) {
  if (max_listeners <= 0 || max_listeners > 65536) max_listeners = 1024;

  fl_event_emitter_t *emitter = (fl_event_emitter_t*)malloc(sizeof(fl_event_emitter_t));
  if (!emitter) return NULL;

  memset(emitter, 0, sizeof(fl_event_emitter_t));

  emitter->listener_capacity = max_listeners;
  emitter->listeners = (fl_listener_t*)malloc(sizeof(fl_listener_t) * max_listeners);
  if (!emitter->listeners) {
    free(emitter);
    return NULL;
  }

  memset(emitter->listeners, 0, sizeof(fl_listener_t) * max_listeners);

  pthread_mutex_init(&emitter->emitter_mutex, NULL);

  fprintf(stderr, "[event] Emitter created: max_listeners=%d\n", max_listeners);
  return emitter;
}

void fl_event_emitter_destroy(fl_event_emitter_t *emitter) {
  if (!emitter) return;

  pthread_mutex_destroy(&emitter->emitter_mutex);
  free(emitter->listeners);
  free(emitter);

  fprintf(stderr, "[event] Emitter destroyed\n");
}

/* ===== Pattern Matching ===== */

int fl_event_match_pattern(const char *pattern, const char *event_name) {
  if (!pattern || !event_name) return 0;

  /* Simple wildcard matching */
  if (strcmp(pattern, "*") == 0) return 1;  /* Match all */

  const char *p = pattern;
  const char *e = event_name;

  while (*p && *e) {
    if (*p == '*') {
      /* Skip wildcard and remaining pattern */
      return 1;
    }
    if (*p != *e) return 0;

    p++;
    e++;
  }

  return (*p == '\0' && *e == '\0') ? 1 : 0;
}

/* ===== Listener Registration ===== */

uint32_t fl_event_on(fl_event_emitter_t *emitter,
                     const char *event_name,
                     fl_event_listener_t callback,
                     void *context) {
  if (!emitter || !event_name || !callback) return 0;

  pthread_mutex_lock(&emitter->emitter_mutex);

  if (emitter->listener_count >= emitter->listener_capacity) {
    pthread_mutex_unlock(&emitter->emitter_mutex);
    fprintf(stderr, "[event] Listener capacity exceeded\n");
    return 0;
  }

  int index = emitter->listener_count;
  fl_listener_t *listener = &emitter->listeners[index];

  listener->listener_id = ++emitter->next_listener_id;
  strncpy(listener->event_name, event_name, sizeof(listener->event_name) - 1);
  listener->callback = callback;
  listener->context = context;
  listener->once = 0;
  listener->created_at = time(NULL);
  listener->fired_count = 0;

  emitter->listener_count++;
  emitter->total_listeners++;

  pthread_mutex_unlock(&emitter->emitter_mutex);

  fprintf(stderr, "[event] Listener added: ID=%u, event=%s\n", listener->listener_id, event_name);
  return listener->listener_id;
}

uint32_t fl_event_once(fl_event_emitter_t *emitter,
                       const char *event_name,
                       fl_event_listener_t callback,
                       void *context) {
  if (!emitter || !event_name || !callback) return 0;

  pthread_mutex_lock(&emitter->emitter_mutex);

  if (emitter->listener_count >= emitter->listener_capacity) {
    pthread_mutex_unlock(&emitter->emitter_mutex);
    return 0;
  }

  int index = emitter->listener_count;
  fl_listener_t *listener = &emitter->listeners[index];

  listener->listener_id = ++emitter->next_listener_id;
  strncpy(listener->event_name, event_name, sizeof(listener->event_name) - 1);
  listener->callback = callback;
  listener->context = context;
  listener->once = 1;  /* Mark as one-time */
  listener->created_at = time(NULL);
  listener->fired_count = 0;

  emitter->listener_count++;
  emitter->total_listeners++;

  pthread_mutex_unlock(&emitter->emitter_mutex);

  fprintf(stderr, "[event] Once listener added: ID=%u, event=%s\n", listener->listener_id, event_name);
  return listener->listener_id;
}

uint32_t fl_event_on_any(fl_event_emitter_t *emitter,
                         fl_event_listener_t callback,
                         void *context) {
  return fl_event_on(emitter, "*", callback, context);
}

int fl_event_off(fl_event_emitter_t *emitter, uint32_t listener_id) {
  if (!emitter || listener_id == 0) return -1;

  pthread_mutex_lock(&emitter->emitter_mutex);

  for (int i = 0; i < emitter->listener_count; i++) {
    if (emitter->listeners[i].listener_id == listener_id) {
      /* Shift remaining listeners */
      for (int j = i; j < emitter->listener_count - 1; j++) {
        emitter->listeners[j] = emitter->listeners[j + 1];
      }
      emitter->listener_count--;

      pthread_mutex_unlock(&emitter->emitter_mutex);

      fprintf(stderr, "[event] Listener removed: ID=%u\n", listener_id);
      return 0;
    }
  }

  pthread_mutex_unlock(&emitter->emitter_mutex);
  return -1;
}

int fl_event_remove_all(fl_event_emitter_t *emitter, const char *event_name) {
  if (!emitter || !event_name) return -1;

  pthread_mutex_lock(&emitter->emitter_mutex);

  int removed = 0;
  for (int i = emitter->listener_count - 1; i >= 0; i--) {
    if (strcmp(emitter->listeners[i].event_name, event_name) == 0) {
      /* Shift remaining listeners */
      for (int j = i; j < emitter->listener_count - 1; j++) {
        emitter->listeners[j] = emitter->listeners[j + 1];
      }
      emitter->listener_count--;
      removed++;
    }
  }

  pthread_mutex_unlock(&emitter->emitter_mutex);

  fprintf(stderr, "[event] Listeners removed: event=%s, count=%d\n", event_name, removed);
  return removed;
}

int fl_event_clear(fl_event_emitter_t *emitter) {
  if (!emitter) return -1;

  pthread_mutex_lock(&emitter->emitter_mutex);

  int count = emitter->listener_count;
  emitter->listener_count = 0;

  pthread_mutex_unlock(&emitter->emitter_mutex);

  fprintf(stderr, "[event] All listeners cleared: count=%d\n", count);
  return count;
}

int fl_event_listener_count(fl_event_emitter_t *emitter, const char *event_name) {
  if (!emitter || !event_name) return 0;

  pthread_mutex_lock(&emitter->emitter_mutex);

  int count = 0;
  for (int i = 0; i < emitter->listener_count; i++) {
    if (fl_event_match_pattern(emitter->listeners[i].event_name, event_name)) {
      count++;
    }
  }

  pthread_mutex_unlock(&emitter->emitter_mutex);

  return count;
}

int fl_event_has_listeners(fl_event_emitter_t *emitter, const char *event_name) {
  return fl_event_listener_count(emitter, event_name) > 0 ? 1 : 0;
}

/* ===== Event Emission ===== */

int fl_event_emit(fl_event_emitter_t *emitter,
                  const char *event_name,
                  void *data) {
  if (!emitter || !event_name) return 0;

  pthread_mutex_lock(&emitter->emitter_mutex);

  int callbacks_fired = 0;
  int64_t now = time(NULL);

  for (int i = emitter->listener_count - 1; i >= 0; i--) {
    fl_listener_t *listener = &emitter->listeners[i];

    if (fl_event_match_pattern(listener->event_name, event_name)) {
      listener->fired_at = now;
      listener->fired_count++;
      callbacks_fired++;

      /* Execute callback */
      pthread_mutex_unlock(&emitter->emitter_mutex);
      if (listener->callback) {
        listener->callback(event_name, data, listener->context);
      }
      pthread_mutex_lock(&emitter->emitter_mutex);

      /* Remove if one-time listener */
      if (listener->once) {
        for (int j = i; j < emitter->listener_count - 1; j++) {
          emitter->listeners[j] = emitter->listeners[j + 1];
        }
        emitter->listener_count--;
      }
    }
  }

  emitter->total_events++;

  pthread_mutex_unlock(&emitter->emitter_mutex);

  fprintf(stderr, "[event] Event emitted: name=%s, listeners=%d\n", event_name, callbacks_fired);
  return callbacks_fired;
}

int fl_event_emit_with_context(fl_event_emitter_t *emitter,
                               const char *event_name,
                               void *data,
                               void *context) {
  /* For now, same as emit (context handled per-listener) */
  return fl_event_emit(emitter, event_name, data);
}

int fl_event_emit_sync(fl_event_emitter_t *emitter,
                       const char *event_name,
                       void *data,
                       int timeout_ms) {
  /* Synchronous emit is same as regular emit in this implementation */
  return fl_event_emit(emitter, event_name, data);
}

int64_t fl_event_last_emit_time(fl_event_emitter_t *emitter, const char *event_name) {
  if (!emitter || !event_name) return -1;

  pthread_mutex_lock(&emitter->emitter_mutex);

  int64_t last_time = -1;
  for (int i = 0; i < emitter->listener_count; i++) {
    if (fl_event_match_pattern(emitter->listeners[i].event_name, event_name)) {
      if (emitter->listeners[i].fired_at > last_time) {
        last_time = emitter->listeners[i].fired_at;
      }
    }
  }

  pthread_mutex_unlock(&emitter->emitter_mutex);

  return last_time;
}

/* ===== Event Filtering ===== */

void fl_event_get_matching_listeners(fl_event_emitter_t *emitter,
                                     const char *pattern,
                                     fl_listener_t **out_listeners,
                                     int *out_count) {
  if (!emitter || !pattern || !out_listeners || !out_count) return;

  *out_count = 0;
  pthread_mutex_lock(&emitter->emitter_mutex);

  for (int i = 0; i < emitter->listener_count && *out_count < 256; i++) {
    if (fl_event_match_pattern(pattern, emitter->listeners[i].event_name)) {
      out_listeners[(*out_count)++] = &emitter->listeners[i];
    }
  }

  pthread_mutex_unlock(&emitter->emitter_mutex);
}

/* ===== Statistics ===== */

fl_event_stats_t fl_event_get_stats(fl_event_emitter_t *emitter) {
  fl_event_stats_t stats = {0};

  if (!emitter) return stats;

  pthread_mutex_lock(&emitter->emitter_mutex);

  stats.active_listeners = emitter->listener_count;
  stats.total_listeners_created = emitter->total_listeners;
  stats.total_events_emitted = emitter->total_events;

  pthread_mutex_unlock(&emitter->emitter_mutex);

  return stats;
}

void fl_event_on_error(fl_event_emitter_t *emitter,
                       fl_event_listener_t error_handler,
                       void *context) {
  if (!emitter) return;

  /* Register as special 'error' event listener */
  fl_event_on(emitter, "error", error_handler, context);
}

int fl_event_get_error_count(fl_event_emitter_t *emitter) {
  if (!emitter) return 0;

  return fl_event_listener_count(emitter, "error");
}
