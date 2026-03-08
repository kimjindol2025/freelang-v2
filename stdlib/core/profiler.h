/**
 * FreeLang stdlib/profiler - Query Performance Profiling
 */
#ifndef FREELANG_STDLIB_PROFILER_H
#define FREELANG_STDLIB_PROFILER_H
#include <stdint.h>

typedef struct {
  char *query;
  int64_t execution_time_ms;
  uint64_t rows_examined;
  uint64_t rows_returned;
} fl_profile_entry_t;

int fl_profiler_start(const char *query);
int fl_profiler_end(const char *query, int64_t time_ms, uint64_t rows_examined);
fl_profile_entry_t* fl_profiler_get_slowest(int limit);
#endif
