/**
 * FreeLang stdlib/debug Implementation - Debugging & Assertion Framework
 */

#include "debug.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>

/* ===== Global Debugger ===== */

static fl_debugger_t *global_debugger = NULL;

/* ===== Assertion ===== */

void fl_assert(int condition, const char *message) {
  if (!condition) {
    fprintf(stderr, "[assert] FAILED: %s\n", message ? message : "assertion failed");

    if (global_debugger) {
      pthread_mutex_lock(&global_debugger->debug_mutex);
      global_debugger->assertion_count++;
      global_debugger->assertion_failed++;
      pthread_mutex_unlock(&global_debugger->debug_mutex);
    }

    /* In production, could throw exception or call abort() */
    abort();
  }
}

void fl_assert_equals(int expected, int actual, const char *message) {
  if (expected != actual) {
    fprintf(stderr, "[assert] EQUALS FAILED: expected=%d, actual=%d, msg=%s\n",
            expected, actual, message ? message : "");
    fl_assert(0, message);
  }
}

void fl_assert_not_null(const void *ptr, const char *message) {
  if (ptr == NULL) {
    fprintf(stderr, "[assert] NOT_NULL FAILED: %s\n", message ? message : "pointer is null");
    fl_assert(0, message);
  }
}

void fl_assert_null(const void *ptr, const char *message) {
  if (ptr != NULL) {
    fprintf(stderr, "[assert] NULL FAILED: %s\n", message ? message : "pointer is not null");
    fl_assert(0, message);
  }
}

/* ===== Debugger Lifecycle ===== */

fl_debugger_t* fl_debugger_create(void) {
  fl_debugger_t *debugger = (fl_debugger_t*)malloc(sizeof(fl_debugger_t));
  if (!debugger) return NULL;

  memset(debugger, 0, sizeof(fl_debugger_t));

  debugger->enabled = 1;
  debugger->breakpoint_capacity = 256;
  debugger->trace_capacity = 1024;
  debugger->profile_capacity = 128;

  debugger->breakpoints = (fl_breakpoint_t*)malloc(sizeof(fl_breakpoint_t) * 256);
  debugger->trace_events = (fl_trace_event_t*)malloc(sizeof(fl_trace_event_t) * 1024);
  debugger->profiles = (fl_profile_entry_t*)malloc(sizeof(fl_profile_entry_t) * 128);

  if (!debugger->breakpoints || !debugger->trace_events || !debugger->profiles) {
    free(debugger->breakpoints);
    free(debugger->trace_events);
    free(debugger->profiles);
    free(debugger);
    return NULL;
  }

  memset(debugger->breakpoints, 0, sizeof(fl_breakpoint_t) * 256);
  memset(debugger->trace_events, 0, sizeof(fl_trace_event_t) * 1024);
  memset(debugger->profiles, 0, sizeof(fl_profile_entry_t) * 128);

  pthread_mutex_init(&debugger->debug_mutex, NULL);
  debugger->session_start_time = time(NULL);

  fprintf(stderr, "[debug] Debugger created\n");
  global_debugger = debugger;

  return debugger;
}

void fl_debugger_destroy(fl_debugger_t *debugger) {
  if (!debugger) return;

  pthread_mutex_destroy(&debugger->debug_mutex);
  free(debugger->breakpoints);
  free(debugger->trace_events);
  free(debugger->profiles);
  free(debugger);

  fprintf(stderr, "[debug] Debugger destroyed\n");
  global_debugger = NULL;
}

void fl_debugger_enable(fl_debugger_t *debugger) {
  if (debugger) debugger->enabled = 1;
}

void fl_debugger_disable(fl_debugger_t *debugger) {
  if (debugger) debugger->enabled = 0;
}

/* ===== Breakpoints ===== */

uint32_t fl_debug_breakpoint_add(fl_debugger_t *debugger, const char *location) {
  if (!debugger || !location) return 0;

  pthread_mutex_lock(&debugger->debug_mutex);

  if (debugger->breakpoint_count >= debugger->breakpoint_capacity) {
    pthread_mutex_unlock(&debugger->debug_mutex);
    return 0;
  }

  fl_breakpoint_t *bp = &debugger->breakpoints[debugger->breakpoint_count];
  bp->bp_id = debugger->breakpoint_count + 1;
  bp->location = location;
  bp->hit_count = 0;
  bp->enabled = 1;

  debugger->breakpoint_count++;

  pthread_mutex_unlock(&debugger->debug_mutex);

  fprintf(stderr, "[debug] Breakpoint added: ID=%u, location=%s\n", bp->bp_id, location);
  return bp->bp_id;
}

int fl_debug_breakpoint_remove(fl_debugger_t *debugger, uint32_t bp_id) {
  if (!debugger || bp_id == 0) return -1;

  pthread_mutex_lock(&debugger->debug_mutex);

  for (int i = 0; i < debugger->breakpoint_count; i++) {
    if (debugger->breakpoints[i].bp_id == bp_id) {
      for (int j = i; j < debugger->breakpoint_count - 1; j++) {
        debugger->breakpoints[j] = debugger->breakpoints[j + 1];
      }
      debugger->breakpoint_count--;

      pthread_mutex_unlock(&debugger->debug_mutex);
      fprintf(stderr, "[debug] Breakpoint removed: ID=%u\n", bp_id);
      return 0;
    }
  }

  pthread_mutex_unlock(&debugger->debug_mutex);
  return -1;
}

int fl_debug_breakpoint_hit(fl_debugger_t *debugger, const char *location) {
  if (!debugger || !location) return 0;

  pthread_mutex_lock(&debugger->debug_mutex);

  for (int i = 0; i < debugger->breakpoint_count; i++) {
    if (debugger->breakpoints[i].enabled &&
        strcmp(debugger->breakpoints[i].location, location) == 0) {
      debugger->breakpoints[i].hit_count++;

      fprintf(stderr, "[debug] Breakpoint hit: location=%s, count=%d\n",
              location, debugger->breakpoints[i].hit_count);

      pthread_mutex_unlock(&debugger->debug_mutex);
      return 1;
    }
  }

  pthread_mutex_unlock(&debugger->debug_mutex);
  return 0;
}

int fl_debug_breakpoint_count(fl_debugger_t *debugger) {
  if (!debugger) return 0;

  pthread_mutex_lock(&debugger->debug_mutex);
  int count = debugger->breakpoint_count;
  pthread_mutex_unlock(&debugger->debug_mutex);

  return count;
}

/* ===== Tracing ===== */

void fl_debug_trace(fl_debugger_t *debugger, const char *event_name, const char *message) {
  if (!debugger || !debugger->enabled || !event_name) return;

  pthread_mutex_lock(&debugger->debug_mutex);

  if (debugger->trace_count >= debugger->trace_capacity) {
    pthread_mutex_unlock(&debugger->debug_mutex);
    return;
  }

  fl_trace_event_t *event = &debugger->trace_events[debugger->trace_count];
  event->event_name = event_name;
  event->message = message;
  event->timestamp = time(NULL);
  event->depth = debugger->trace_count;  /* Simplified depth */

  debugger->trace_count++;

  pthread_mutex_unlock(&debugger->debug_mutex);

  fprintf(stderr, "[trace] %s: %s\n", event_name, message ? message : "");
}

void fl_debug_trace_enter(fl_debugger_t *debugger, const char *function) {
  char msg[256];
  snprintf(msg, sizeof(msg), "enter %s", function);
  fl_debug_trace(debugger, "ENTER", msg);
}

void fl_debug_trace_exit(fl_debugger_t *debugger, const char *function) {
  char msg[256];
  snprintf(msg, sizeof(msg), "exit %s", function);
  fl_debug_trace(debugger, "EXIT", msg);
}

int fl_debug_trace_count(fl_debugger_t *debugger) {
  if (!debugger) return 0;

  pthread_mutex_lock(&debugger->debug_mutex);
  int count = debugger->trace_count;
  pthread_mutex_unlock(&debugger->debug_mutex);

  return count;
}

/* ===== Profiling ===== */

void fl_debug_profile_start(fl_debugger_t *debugger, const char *function_name) {
  if (!debugger || !function_name) return;
  /* Simplified: actual implementation would track start time per function */
}

void fl_debug_profile_end(fl_debugger_t *debugger, const char *function_name) {
  if (!debugger || !function_name) return;

  pthread_mutex_lock(&debugger->debug_mutex);

  /* Find or create profile entry */
  fl_profile_entry_t *entry = NULL;
  for (int i = 0; i < debugger->profile_count; i++) {
    if (strcmp(debugger->profiles[i].function_name, function_name) == 0) {
      entry = &debugger->profiles[i];
      break;
    }
  }

  if (!entry && debugger->profile_count < debugger->profile_capacity) {
    entry = &debugger->profiles[debugger->profile_count];
    entry->function_name = function_name;
    entry->call_count = 0;
    entry->total_time_ns = 0;
    entry->min_time_ns = INT64_MAX;
    entry->max_time_ns = 0;
    debugger->profile_count++;
  }

  if (entry) {
    entry->call_count++;
  }

  pthread_mutex_unlock(&debugger->debug_mutex);
}

fl_profile_entry_t* fl_debug_profile_get(fl_debugger_t *debugger, const char *function_name) {
  if (!debugger || !function_name) return NULL;

  pthread_mutex_lock(&debugger->debug_mutex);

  for (int i = 0; i < debugger->profile_count; i++) {
    if (strcmp(debugger->profiles[i].function_name, function_name) == 0) {
      fl_profile_entry_t *result = &debugger->profiles[i];

      pthread_mutex_unlock(&debugger->debug_mutex);
      return result;
    }
  }

  pthread_mutex_unlock(&debugger->debug_mutex);
  return NULL;
}

void fl_debug_profile_dump(fl_debugger_t *debugger) {
  if (!debugger) return;

  pthread_mutex_lock(&debugger->debug_mutex);

  fprintf(stderr, "\n[profile] Profiling Report\n");
  fprintf(stderr, "%-30s %10s %15s %15s %15s\n", "Function", "Calls", "Total (ns)", "Min (ns)", "Max (ns)");
  fprintf(stderr, "%s\n", "===============================================================================");

  for (int i = 0; i < debugger->profile_count; i++) {
    fl_profile_entry_t *p = &debugger->profiles[i];
    fprintf(stderr, "%-30s %10d %15ld %15ld %15ld\n",
            p->function_name, p->call_count, p->total_time_ns, p->min_time_ns, p->max_time_ns);
  }

  pthread_mutex_unlock(&debugger->debug_mutex);
}

/* ===== Variable Inspection ===== */

void fl_debug_print_int(const char *name, int value) {
  fprintf(stderr, "[inspect] int %s = %d\n", name, value);
}

void fl_debug_print_float(const char *name, double value) {
  fprintf(stderr, "[inspect] float %s = %.6f\n", name, value);
}

void fl_debug_print_string(const char *name, const char *value) {
  fprintf(stderr, "[inspect] string %s = \"%s\"\n", name, value ? value : "(null)");
}

void fl_debug_print_ptr(const char *name, const void *ptr) {
  fprintf(stderr, "[inspect] ptr %s = %p\n", name, ptr);
}

/* ===== Statistics ===== */

fl_debug_stats_t fl_debug_get_stats(fl_debugger_t *debugger) {
  fl_debug_stats_t stats = {0};

  if (!debugger) return stats;

  pthread_mutex_lock(&debugger->debug_mutex);

  stats.total_assertions = debugger->assertion_count;
  stats.failed_assertions = debugger->assertion_failed;
  stats.breakpoint_count = debugger->breakpoint_count;
  stats.trace_events = debugger->trace_count;
  stats.profiled_functions = debugger->profile_count;
  stats.session_duration_ms = (time(NULL) - debugger->session_start_time) * 1000;

  pthread_mutex_unlock(&debugger->debug_mutex);

  return stats;
}
