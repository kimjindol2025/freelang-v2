#include "index.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

struct fl_index_t {
  char *name;
  fl_index_type_t type;
  char **keys;
  uint64_t *row_ids;
  int entry_count;
};

fl_index_t* fl_index_create(const char *name, fl_index_type_t type) {
  fl_index_t *idx = (fl_index_t*)malloc(sizeof(fl_index_t));
  idx->name = (char*)malloc(strlen(name) + 1);
  SAFE_STRCPY(idx->name, name);
  idx->type = type;
  idx->keys = NULL;
  idx->row_ids = NULL;
  idx->entry_count = 0;
  fprintf(stderr, "[index] Index created: %s\n", name);
  return idx;
}

void fl_index_destroy(fl_index_t *index) {
  if (!index) return;
  free(index->name);
  free(index->keys);
  free(index->row_ids);
  free(index);
}

int fl_index_insert(fl_index_t *index, const char *key, uint64_t row_id) {
  if (!index || !key) return -1;
  char **nk = (char**)realloc(index->keys, (index->entry_count + 1) * sizeof(char*));
  uint64_t *nr = (uint64_t*)realloc(index->row_ids, (index->entry_count + 1) * sizeof(uint64_t));
  nk[index->entry_count] = (char*)malloc(strlen(key) + 1);
  SAFE_STRCPY(nk[index->entry_count], key);
  nr[index->entry_count] = row_id;
  index->keys = nk;
  index->row_ids = nr;
  index->entry_count++;
  return 0;
}

int fl_index_delete(fl_index_t *index, const char *key) {
  if (!index || !key) return -1;
  for (int i = 0; i < index->entry_count; i++) {
    if (strcmp(index->keys[i], key) == 0) {
      free(index->keys[i]);
      for (int j = i; j < index->entry_count - 1; j++) {
        index->keys[j] = index->keys[j + 1];
        index->row_ids[j] = index->row_ids[j + 1];
      }
      index->entry_count--;
      return 0;
    }
  }
  return -1;
}

uint64_t fl_index_search(fl_index_t *index, const char *key) {
  if (!index || !key) return 0;
  for (int i = 0; i < index->entry_count; i++) {
    if (strcmp(index->keys[i], key) == 0) return index->row_ids[i];
  }
  return 0;
}
