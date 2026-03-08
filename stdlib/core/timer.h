/**
 * FreeLang stdlib/timer - High-Resolution Timers & Intervals
 * setTimeout, setInterval, microsecond precision
 */

#ifndef FREELANG_STDLIB_TIMER_H
#define FREELANG_STDLIB_TIMER_H

#include <stdint.h>
#include <time.h>

/* ===== Timer Types ===== */

typedef enum {
  TIMER_TYPE_TIMEOUT = 0,    /* One-shot timer */
  TIMER_TYPE_INTERVAL = 1    /* Repeating timer */
} fl_timer_type_t;

typedef void (*fl_timer_callback_t)(uint32_t timer_id, void *data);

typedef struct {
  uint32_t timer_id;
  fl_timer_type_t type;
  fl_timer_callback_t callback;
  void *data;

  int64_t created_at;        /* Creation timestamp (ns) */
  int64_t scheduled_at;      /* When timer should fire (ns) */
  int64_t fired_at;          /* When timer actually fired (ns) */

  int64_t delay_ns;          /* Delay in nanoseconds */
  int64_t interval_ns;       /* Repeat interval in nanoseconds */

  int active;                /* Timer is active */
  int fired;                 /* Timer has fired at least once */
  int cancelled;             /* Timer was cancelled */
} fl_timer_t;

/* ===== Timer Manager ===== */

typedef struct {
  fl_timer_t *timers;        /* Array of timers */
  int timer_count;
  int timer_capacity;

  uint32_t next_timer_id;

  int64_t last_tick_time;    /* Last tick timestamp (ns) */
  int64_t total_ticks;       /* Total ticks processed */

  pthread_mutex_t timer_mutex;
} fl_timer_manager_t;

/* ===== Public API ===== */

/* Create timer manager */
fl_timer_manager_t* fl_timer_manager_create(int max_timers);

/* Destroy timer manager */
void fl_timer_manager_destroy(fl_timer_manager_t *manager);

/* ===== Timer Scheduling ===== */

/* Create one-shot timer (milliseconds) */
uint32_t fl_timer_set_timeout(fl_timer_manager_t *manager,
                               int delay_ms,
                               fl_timer_callback_t callback,
                               void *data);

/* Create repeating timer (milliseconds) */
uint32_t fl_timer_set_interval(fl_timer_manager_t *manager,
                                int interval_ms,
                                fl_timer_callback_t callback,
                                void *data);

/* Create timer with microsecond precision */
uint32_t fl_timer_set_timeout_us(fl_timer_manager_t *manager,
                                  int64_t delay_us,
                                  fl_timer_callback_t callback,
                                  void *data);

/* Create interval timer with microsecond precision */
uint32_t fl_timer_set_interval_us(fl_timer_manager_t *manager,
                                   int64_t interval_us,
                                   fl_timer_callback_t callback,
                                   void *data);

/* Create immediate callback (next tick) */
uint32_t fl_timer_set_immediate(fl_timer_manager_t *manager,
                                 fl_timer_callback_t callback,
                                 void *data);

/* Cancel timer */
int fl_timer_clear(fl_timer_manager_t *manager, uint32_t timer_id);

/* Check if timer is active */
int fl_timer_is_active(fl_timer_manager_t *manager, uint32_t timer_id);

/* Get timer info */
fl_timer_t* fl_timer_get(fl_timer_manager_t *manager, uint32_t timer_id);

/* ===== Timer Processing ===== */

/* Process timers (fire due callbacks) */
int fl_timer_tick(fl_timer_manager_t *manager);

/* Process timers until specific time */
int fl_timer_tick_until(fl_timer_manager_t *manager, int64_t until_ns);

/* Get next timer due time (for polling) */
int64_t fl_timer_next_due_time_ns(fl_timer_manager_t *manager);

/* Process all timers with deadline */
int fl_timer_process(fl_timer_manager_t *manager, int max_callbacks);

/* ===== Statistics ===== */

typedef struct {
  int active_timers;
  int total_created;
  int total_fired;
  int64_t total_ticks;
  int64_t avg_tick_time_us;
} fl_timer_stats_t;

/* Get timer manager statistics */
fl_timer_stats_t fl_timer_get_stats(fl_timer_manager_t *manager);

/* ===== Utility Functions ===== */

/* Get current time in nanoseconds */
int64_t fl_timer_now_ns(void);

/* Get current time in microseconds */
int64_t fl_timer_now_us(void);

/* Get current time in milliseconds */
int64_t fl_timer_now_ms(void);

/* Sleep for milliseconds */
void fl_timer_sleep_ms(int ms);

/* Sleep for microseconds */
void fl_timer_sleep_us(int64_t us);

#endif /* FREELANG_STDLIB_TIMER_H */
