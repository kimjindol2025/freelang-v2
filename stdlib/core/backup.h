/**
 * FreeLang stdlib/backup - Backup & Restore
 */
#ifndef FREELANG_STDLIB_BACKUP_H
#define FREELANG_STDLIB_BACKUP_H
#include <stdint.h>
typedef struct { uint64_t backups_created; } fl_backup_stats_t;

int fl_backup_create(const char *database, const char *backup_path);
int fl_backup_restore(const char *backup_path, const char *database);
fl_backup_stats_t* fl_backup_get_stats(void);
#endif
