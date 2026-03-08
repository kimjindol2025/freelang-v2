/**
 * FreeLang stdlib/replication - Database Replication
 */
#ifndef FREELANG_STDLIB_REPLICATION_H
#define FREELANG_STDLIB_REPLICATION_H
typedef struct { uint64_t replicated_rows; } fl_replication_stats_t;

int fl_replication_start(const char *master, const char *slave);
int fl_replication_stop(void);
int fl_replication_sync(void);
fl_replication_stats_t* fl_replication_get_stats(void);
#endif
