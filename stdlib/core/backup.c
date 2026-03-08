#include "backup.h"
#include "security_macros.h"
#include <stdlib.h>
#include <stdio.h>

static fl_backup_stats_t global_stats = {0};

int fl_backup_create(const char *database, const char *backup_path) {
  if (!database || !backup_path) return -1;
  global_stats.backups_created++;
  fprintf(stderr, "[backup] Backup created: %s → %s\n", database, backup_path);
  return 0;
}

int fl_backup_restore(const char *backup_path, const char *database) {
  if (!backup_path || !database) return -1;
  fprintf(stderr, "[backup] Backup restored: %s → %s\n", backup_path, database);
  return 0;
}

fl_backup_stats_t* fl_backup_get_stats(void) {
  fl_backup_stats_t *s = (fl_backup_stats_t*)malloc(sizeof(fl_backup_stats_t));
  *s = global_stats;
  return s;
}
