/**
 * FreeLang stdlib/timer Implementation - High-Resolution Timers
 */

#include "timer.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>
#include <pthread.h>
#include <unistd.h>

/* ===== Timer Manager ===== */

fl_timer_manager_t* fl_timer_manager_create(int max_timers) {
  if (max_timers <= 0 || max_timers > 65536) max_timers = 1024;

  fl_timer_manager_t *manager = (fl_timer_manager_t*)malloc(sizeof(fl_timer_manager_t));
  if (!manager) return NULL;

  memset(manager, 0, sizeof(fl_timer_manager_t));

  manager->timer_capacity = max_timers;
  manager->timers = (fl_timer_t*)malloc(sizeof(fl_timer_t) * max_timers);
  if (!manager->timers) {
    free(manager);
    return NULL;
  }

  memset(manager->timers, 0, sizeof(fl_timer_t) * max_timers);

  pthread_mutex_init(&manager->timer_mutex, NULL);
  manager->last_tick_time = fl_timer_now_ns();

  fprintf(stderr, "[timer] Manager created: max_timers=%d\n", max_timers);
  return manager;
}

void fl_timer_manager_destroy(fl_timer_manager_t *manager) {
  if (!manager) return;

  pthread_mutex_destroy(&manager->timer_mutex);
  free(manager->timers);
  free(manager);

  fprintf(stderr, "[timer] Manager destroyed\n");
}

/* ===== Time Functions ===== */

int64_t fl_timer_now_ns(void) {
  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC, &ts);
  return ((int64_t)ts.tv_sec * 1000000000LL) + ts.tv_nsec;
}

int64_t fl_timer_now_us(void) {
  return fl_timer_now_ns() / 1000;
}

int64_t fl_timer_now_ms(void) {
  return fl_timer_now_ns() / 1000000;
}

void fl_timer_sleep_ms(int ms) {
  usleep(ms * 1000);
}

void fl_timer_sleep_us(int64_t us) {
  usleep(us);
}

/* ===== Timer Creation ===== */

uint32_t fl_timer_set_timeout(fl_timer_manager_t *manager,
                               int delay_ms,
                               fl_timer_callback_t callback,
                               void *data) {
  return fl_timer_set_timeout_us(manager, (int64_t)delay_ms * 1000, callback, data);
}

uint32_t fl_timer_set_interval(fl_timer_manager_t *manager,
                                int interval_ms,
                                fl_timer_callback_t callback,
                                void *data) {
  return fl_timer_set_interval_us(manager, (int64_t)interval_ms * 1000, callback, data);
}

uint32_t fl_timer_set_timeout_us(fl_timer_manager_t *manager,
                                  int64_t delay_us,
                                  fl_timer_callback_t callback,
                                  void *data) {
  if (!manager || delay_us < 0 || !callback) return 0;

  pthread_mutex_lock(&manager->timer_mutex);

  if (manager->timer_count >= manager->timer_capacity) {
    pthread_mutex_unlock(&manager->timer_mutex);
    fprintf(stderr, "[timer] Timer capacity exceeded\n");
    return 0;
  }

  int index = manager->timer_count;
  fl_timer_t *timer = &manager->timers[index];

  timer->timer_id = ++manager->next_timer_id;
  timer->type = TIMER_TYPE_TIMEOUT;
  timer->callback = callback;
  timer->data = data;

  timer->created_at = fl_timer_now_ns();
  timer->delay_ns = delay_us * 1000;
  timer->scheduled_at = timer->created_at + timer->delay_ns;

  timer->active = 1;
  timer->fired = 0;
  timer->cancelled = 0;

  manager->timer_count++;

  pthread_mutex_unlock(&manager->timer_mutex);

  fprintf(stderr, "[timer] Timeout created: ID=%u, delay=%ldus\n", timer->timer_id, delay_us);
  return timer->timer_id;
}

uint32_t fl_timer_set_interval_us(fl_timer_manager_t *manager,
                                   int64_t interval_us,
                                   fl_timer_callback_t callback,
                                   void *data) {
  if (!manager || interval_us < 0 || !callback) return 0;

  pthread_mutex_lock(&manager->timer_mutex);

  if (manager->timer_count >= manager->timer_capacity) {
    pthread_mutex_unlock(&manager->timer_mutex);
    return 0;
  }

  int index = manager->timer_count;
  fl_timer_t *timer = &manager->timers[index];

  timer->timer_id = ++manager->next_timer_id;
  timer->type = TIMER_TYPE_INTERVAL;
  timer->callback = callback;
  timer->data = data;

  timer->created_at = fl_timer_now_ns();
  timer->interval_ns = interval_us * 1000;
  timer->scheduled_at = timer->created_at + timer->interval_ns;

  timer->active = 1;
  timer->fired = 0;
  timer->cancelled = 0;

  manager->timer_count++;

  pthread_mutex_unlock(&manager->timer_mutex);

  fprintf(stderr, "[timer] Interval created: ID=%u, interval=%ldus\n", timer->timer_id, interval_us);
  return timer->timer_id;
}

uint32_t fl_timer_set_immediate(fl_timer_manager_t *manager,
                                 fl_timer_callback_t callback,
                                 void *data) {
  return fl_timer_set_timeout_us(manager, 0, callback, data);
}

/* ===== Timer Control ===== */

int fl_timer_clear(fl_timer_manager_t *manager, uint32_t timer_id) {
  if (!manager || timer_id == 0) return -1;

  pthread_mutex_lock(&manager->timer_mutex);

  for (int i = 0; i < manager->timer_count; i++) {
    if (manager->timers[i].timer_id == timer_id) {
      manager->timers[i].cancelled = 1;
      manager->timers[i].active = 0;

      pthread_mutex_unlock(&manager->timer_mutex);

      fprintf(stderr, "[timer] Timer cancelled: ID=%u\n", timer_id);
      return 0;
    }
  }

  pthread_mutex_unlock(&manager->timer_mutex);
  return -1;
}

int fl_timer_is_active(fl_timer_manager_t *manager, uint32_t timer_id) {
  if (!manager || timer_id == 0) return 0;

  pthread_mutex_lock(&manager->timer_mutex);

  for (int i = 0; i < manager->timer_count; i++) {
    if (manager->timers[i].timer_id == timer_id) {
      int active = manager->timers[i].active;

      pthread_mutex_unlock(&manager->timer_mutex);
      return active;
    }
  }

  pthread_mutex_unlock(&manager->timer_mutex);
  return 0;
}

fl_timer_t* fl_timer_get(fl_timer_manager_t *manager, uint32_t timer_id) {
  if (!manager || timer_id == 0) return NULL;

  for (int i = 0; i < manager->timer_count; i++) {
    if (manager->timers[i].timer_id == timer_id) {
      return &manager->timers[i];
    }
  }

  return NULL;
}

/* ===== Timer Processing ===== */

int fl_timer_tick(fl_timer_manager_t *manager) {
  if (!manager) return 0;

  int64_t now = fl_timer_now_ns();
  int callbacks_fired = 0;

  pthread_mutex_lock(&manager->timer_mutex);

  for (int i = 0; i < manager->timer_count; i++) {
    fl_timer_t *timer = &manager->timers[i];

    if (!timer->active || timer->cancelled) continue;

    /* Check if timer is due */
    if (now >= timer->scheduled_at) {
      timer->fired_at = now;
      timer->fired = 1;
      callbacks_fired++;

      /* Execute callback */
      pthread_mutex_unlock(&manager->timer_mutex);
      if (timer->callback) {
        timer->callback(timer->timer_id, timer->data);
      }
      pthread_mutex_lock(&manager->timer_mutex);

      /* Reschedule if interval */
      if (timer->type == TIMER_TYPE_INTERVAL && timer->active) {
        timer->scheduled_at = now + timer->interval_ns;
      } else {
        /* One-shot timer: deactivate */
        timer->active = 0;
      }
    }
  }

  manager->last_tick_time = now;
  manager->total_ticks++;

  pthread_mutex_unlock(&manager->timer_mutex);

  return callbacks_fired;
}

int fl_timer_tick_until(fl_timer_manager_t *manager, int64_t until_ns) {
  if (!manager) return 0;

  int total_callbacks = 0;

  while (fl_timer_now_ns() < until_ns) {
    int callbacks = fl_timer_tick(manager);
    total_callbacks += callbacks;

    if (callbacks == 0) {
      usleep(1000);  /* 1ms sleep if nothing to do */
    }
  }

  return total_callbacks;
}

int64_t fl_timer_next_due_time_ns(fl_timer_manager_t *manager) {
  if (!manager) return -1;

  int64_t next_due = INT64_MAX;
  int64_t now = fl_timer_now_ns();

  pthread_mutex_lock(&manager->timer_mutex);

  for (int i = 0; i < manager->timer_count; i++) {
    fl_timer_t *timer = &manager->timers[i];

    if (timer->active && !timer->cancelled) {
      if (timer->scheduled_at < next_due) {
        next_due = timer->scheduled_at;
      }
    }
  }

  pthread_mutex_unlock(&manager->timer_mutex);

  if (next_due == INT64_MAX) {
    return -1;
  }

  return (next_due > now) ? (next_due - now) : 0;
}

int fl_timer_process(fl_timer_manager_t *manager, int max_callbacks) {
  if (!manager) return 0;

  int callbacks_fired = 0;

  for (int i = 0; i < max_callbacks && callbacks_fired < max_callbacks; i++) {
    if (fl_timer_tick(manager) == 0) {
      break;
    }
    callbacks_fired += 1;
  }

  return callbacks_fired;
}

/* ===== Statistics ===== */

fl_timer_stats_t fl_timer_get_stats(fl_timer_manager_t *manager) {
  fl_timer_stats_t stats = {0};

  if (!manager) return stats;

  pthread_mutex_lock(&manager->timer_mutex);

  stats.total_created = manager->next_timer_id;
  stats.total_ticks = manager->total_ticks;

  for (int i = 0; i < manager->timer_count; i++) {
    if (manager->timers[i].active) {
      stats.active_timers++;
    }
    if (manager->timers[i].fired) {
      stats.total_fired++;
    }
  }

  pthread_mutex_unlock(&manager->timer_mutex);

  return stats;
}
