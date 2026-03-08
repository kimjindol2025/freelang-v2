#include "replication.h"
#include "security_macros.h"
#include <stdlib.h>
#include <stdio.h>

static fl_replication_stats_t global_stats = {0};

int fl_replication_start(const char *master, const char *slave) {
  if (!master || !slave) return -1;
  fprintf(stderr, "[replication] Started: %s → %s\n", master, slave);
  return 0;
}

int fl_replication_stop(void) {
  fprintf(stderr, "[replication] Stopped\n");
  return 0;
}

int fl_replication_sync(void) {
  fprintf(stderr, "[replication] Syncing...\n");
  return 0;
}

fl_replication_stats_t* fl_replication_get_stats(void) {
  fl_replication_stats_t *s = (fl_replication_stats_t*)malloc(sizeof(fl_replication_stats_t));
  *s = global_stats;
  return s;
}
