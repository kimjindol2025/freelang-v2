#include "profiler.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

int fl_profiler_start(const char *query) {
  if (!query) return -1;
  fprintf(stderr, "[profiler] Query started: %s\n", query);
  return 0;
}

int fl_profiler_end(const char *query, int64_t time_ms, uint64_t rows_examined) {
  if (!query) return -1;
  fprintf(stderr, "[profiler] Query ended: %ldms, %lu rows\n", time_ms, rows_examined);
  return 0;
}

fl_profile_entry_t* fl_profiler_get_slowest(int limit) {
  return NULL;
}
