/**
 * FreeLang stdlib/debug - Debugging & Assertion Framework
 * Assertions, breakpoints, tracing, variable inspection, profiling
 */

#ifndef FREELANG_STDLIB_DEBUG_H
#define FREELANG_STDLIB_DEBUG_H

#include <stdint.h>
#include <time.h>
#include <pthread.h>

/* ===== Assertion ===== */

typedef struct {
  const char *file;
  int line;
  const char *function;
  const char *condition;
  const char *message;
  int64_t timestamp;
} fl_assertion_info_t;

/* ===== Breakpoint ===== */

typedef struct {
  uint32_t bp_id;
  const char *location;  /* file:line */
  int hit_count;
  int enabled;
} fl_breakpoint_t;

/* ===== Trace ===== */

typedef struct {
  const char *event_name;
  const char *message;
  int64_t timestamp;
  uint32_t depth;  /* Call stack depth */
} fl_trace_event_t;

/* ===== Profiler ===== */

typedef struct {
  const char *function_name;
  int64_t total_time_ns;
  int call_count;
  int64_t min_time_ns;
  int64_t max_time_ns;
} fl_profile_entry_t;

/* ===== Debugger State ===== */

typedef struct {
  int enabled;
  int assertion_count;
  int assertion_failed;

  fl_breakpoint_t *breakpoints;
  int breakpoint_count;
  int breakpoint_capacity;

  fl_trace_event_t *trace_events;
  int trace_count;
  int trace_capacity;

  fl_profile_entry_t *profiles;
  int profile_count;
  int profile_capacity;

  int64_t session_start_time;
  pthread_mutex_t debug_mutex;
} fl_debugger_t;

/* ===== Public API ===== */

/* Assertion */
void fl_assert(int condition, const char *message);
void fl_assert_equals(int expected, int actual, const char *message);
void fl_assert_not_null(const void *ptr, const char *message);
void fl_assert_null(const void *ptr, const char *message);

/* Debugger initialization */
fl_debugger_t* fl_debugger_create(void);
void fl_debugger_destroy(fl_debugger_t *debugger);
void fl_debugger_enable(fl_debugger_t *debugger);
void fl_debugger_disable(fl_debugger_t *debugger);

/* Breakpoints */
uint32_t fl_debug_breakpoint_add(fl_debugger_t *debugger, const char *location);
int fl_debug_breakpoint_remove(fl_debugger_t *debugger, uint32_t bp_id);
int fl_debug_breakpoint_hit(fl_debugger_t *debugger, const char *location);
int fl_debug_breakpoint_count(fl_debugger_t *debugger);

/* Tracing */
void fl_debug_trace(fl_debugger_t *debugger, const char *event_name, const char *message);
void fl_debug_trace_enter(fl_debugger_t *debugger, const char *function);
void fl_debug_trace_exit(fl_debugger_t *debugger, const char *function);
int fl_debug_trace_count(fl_debugger_t *debugger);

/* Profiling */
void fl_debug_profile_start(fl_debugger_t *debugger, const char *function_name);
void fl_debug_profile_end(fl_debugger_t *debugger, const char *function_name);
fl_profile_entry_t* fl_debug_profile_get(fl_debugger_t *debugger, const char *function_name);
void fl_debug_profile_dump(fl_debugger_t *debugger);

/* Variable inspection */
void fl_debug_print_int(const char *name, int value);
void fl_debug_print_float(const char *name, double value);
void fl_debug_print_string(const char *name, const char *value);
void fl_debug_print_ptr(const char *name, const void *ptr);

/* Statistics */
typedef struct {
  int total_assertions;
  int failed_assertions;
  int breakpoint_count;
  int trace_events;
  int profiled_functions;
  int64_t session_duration_ms;
} fl_debug_stats_t;

fl_debug_stats_t fl_debug_get_stats(fl_debugger_t *debugger);

#endif /* FREELANG_STDLIB_DEBUG_H */
