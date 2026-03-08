/**
 * FreeLang stdlib/sharding - Horizontal Sharding
 */
#ifndef FREELANG_STDLIB_SHARDING_H
#define FREELANG_STDLIB_SHARDING_H
typedef struct fl_sharding_t fl_sharding_t;

fl_sharding_t* fl_sharding_create(int shard_count);
void fl_sharding_destroy(fl_sharding_t *sharding);
int fl_sharding_get_shard(fl_sharding_t *sharding, const char *key);
#endif
