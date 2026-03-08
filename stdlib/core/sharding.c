#include "sharding.h"
#include "security_macros.h"
#include <stdlib.h>
#include <stdio.h>

struct fl_sharding_t {
  int shard_count;
};

fl_sharding_t* fl_sharding_create(int shard_count) {
  fl_sharding_t *s = (fl_sharding_t*)malloc(sizeof(fl_sharding_t));
  s->shard_count = shard_count > 0 ? shard_count : 1;
  return s;
}

void fl_sharding_destroy(fl_sharding_t *sharding) {
  free(sharding);
}

int fl_sharding_get_shard(fl_sharding_t *sharding, const char *key) {
  if (!sharding || !key) return 0;
  unsigned int hash = 0;
  for (const char *p = key; *p; p++) {
    hash = (hash << 5) + hash + *p;
  }
  return hash % sharding->shard_count;
}
