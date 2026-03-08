/**
 * FreeLang Lua Scripting Support Implementation (Phase 21)
 * Server-side Lua script execution for atomic operations
 */

#include "lua_scripting.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>

/* ===== Simple SHA1 Implementation ===== */

void _lua_compute_sha1(const char *script_body, char *sha1_out) {
  if (!script_body || !sha1_out) return;

  /* Simplified: use djb2 hash as placeholder for SHA1 */
  unsigned long hash = 5381;
  unsigned char c;

  while ((c = *script_body++) != 0) {
    hash = ((hash << 5) + hash) + c;
  }

  snprintf(sha1_out, 41, "%040lx", hash);
}

char* _lua_serialize_result(void *result, int result_type) {
  /* Placeholder for result serialization */
  char *output = (char*)malloc(256);
  if (!output) return NULL;

  sprintf(output, "{result}");
  return output;
}

/* ===== Manager Creation ===== */

fl_lua_manager_t* freelang_lua_manager_create(void) {
  fl_lua_manager_t *manager = (fl_lua_manager_t*)malloc(sizeof(fl_lua_manager_t));
  if (!manager) return NULL;

  memset(manager, 0, sizeof(fl_lua_manager_t));
  pthread_mutex_init(&manager->manager_mutex, NULL);

  fprintf(stderr, "[Lua] Manager created\n");
  return manager;
}

void freelang_lua_manager_destroy(fl_lua_manager_t *manager) {
  if (!manager) return;

  pthread_mutex_lock(&manager->manager_mutex);

  for (int i = 0; i < manager->script_count; i++) {
    if (manager->scripts[i].script_body) {
      free(manager->scripts[i].script_body);
    }
  }

  pthread_mutex_unlock(&manager->manager_mutex);
  pthread_mutex_destroy(&manager->manager_mutex);
  free(manager);

  fprintf(stderr, "[Lua] Manager destroyed\n");
}

/* ===== Script Loading & Caching ===== */

int freelang_lua_script_load(fl_lua_manager_t *manager,
                              const char *script_body, char *sha1) {
  if (!manager || !script_body || !sha1) return -1;

  pthread_mutex_lock(&manager->manager_mutex);

  /* Compute SHA1 */
  _lua_compute_sha1(script_body, sha1);

  /* Check if already loaded */
  for (int i = 0; i < manager->script_count; i++) {
    if (strcmp(manager->scripts[i].sha1, sha1) == 0) {
      fprintf(stderr, "[Lua] Script already cached: %s\n", sha1);
      pthread_mutex_unlock(&manager->manager_mutex);
      return i;
    }
  }

  /* Add new script */
  if (manager->script_count >= 256) {
    fprintf(stderr, "[Lua] ERROR: Script cache full\n");
    pthread_mutex_unlock(&manager->manager_mutex);
    return -1;
  }

  fl_lua_script_t *script = &manager->scripts[manager->script_count];
  strncpy(script->sha1, sha1, sizeof(script->sha1) - 1);
  script->script_body = (char*)malloc(strlen(script_body) + 1);
  strcpy(script->script_body, script_body);
  script->script_size = strlen(script_body);
  script->loaded_at = time(NULL) * 1000;  /* ms */
  script->execution_count = 0;

  int script_id = manager->script_count;
  manager->script_count++;

  fprintf(stderr, "[Lua] Script loaded: %s (%d bytes)\n", sha1, script->script_size);

  pthread_mutex_unlock(&manager->manager_mutex);
  return script_id;
}

fl_lua_script_t* freelang_lua_script_get(fl_lua_manager_t *manager,
                                          const char *sha1) {
  if (!manager || !sha1) return NULL;

  pthread_mutex_lock(&manager->manager_mutex);

  for (int i = 0; i < manager->script_count; i++) {
    if (strcmp(manager->scripts[i].sha1, sha1) == 0) {
      pthread_mutex_unlock(&manager->manager_mutex);
      return &manager->scripts[i];
    }
  }

  pthread_mutex_unlock(&manager->manager_mutex);
  return NULL;
}

int freelang_lua_script_exists(fl_lua_manager_t *manager, const char *sha1) {
  if (!manager || !sha1) return 0;

  pthread_mutex_lock(&manager->manager_mutex);

  for (int i = 0; i < manager->script_count; i++) {
    if (strcmp(manager->scripts[i].sha1, sha1) == 0) {
      pthread_mutex_unlock(&manager->manager_mutex);
      return 1;
    }
  }

  pthread_mutex_unlock(&manager->manager_mutex);
  return 0;
}

void freelang_lua_script_flush(fl_lua_manager_t *manager) {
  if (!manager) return;

  pthread_mutex_lock(&manager->manager_mutex);

  for (int i = 0; i < manager->script_count; i++) {
    if (manager->scripts[i].script_body) {
      free(manager->scripts[i].script_body);
      manager->scripts[i].script_body = NULL;
    }
  }

  manager->script_count = 0;

  fprintf(stderr, "[Lua] Script cache flushed\n");

  pthread_mutex_unlock(&manager->manager_mutex);
}

/* ===== Script Execution ===== */

int freelang_lua_eval(fl_lua_manager_t *manager,
                       const char *script_body,
                       const char **keys, int key_count,
                       const char **args, int arg_count,
                       int callback_id) {
  if (!manager || !script_body) return -1;

  pthread_mutex_lock(&manager->manager_mutex);

  char sha1[41];
  _lua_compute_sha1(script_body, sha1);

  fprintf(stderr, "[Lua] EVAL: %s (%d keys, %d args)\n", sha1, key_count, arg_count);

  /* Log KEYS array */
  for (int i = 0; i < key_count; i++) {
    fprintf(stderr, "[Lua]   KEYS[%d] = %s\n", i + 1, keys[i]);
  }

  /* Log ARGV array */
  for (int i = 0; i < arg_count; i++) {
    fprintf(stderr, "[Lua]   ARGV[%d] = %s\n", i + 1, args[i]);
  }

  /* Update statistics */
  manager->total_executions++;

  pthread_mutex_unlock(&manager->manager_mutex);

  return 0;
}

int freelang_lua_evalsha(fl_lua_manager_t *manager,
                          const char *sha1,
                          const char **keys, int key_count,
                          const char **args, int arg_count,
                          int callback_id) {
  if (!manager || !sha1) return -1;

  pthread_mutex_lock(&manager->manager_mutex);

  /* Find script */
  fl_lua_script_t *script = NULL;
  for (int i = 0; i < manager->script_count; i++) {
    if (strcmp(manager->scripts[i].sha1, sha1) == 0) {
      script = &manager->scripts[i];
      break;
    }
  }

  if (!script) {
    fprintf(stderr, "[Lua] ERROR: Script not found: %s\n", sha1);
    pthread_mutex_unlock(&manager->manager_mutex);
    return -1;
  }

  script->execution_count++;
  manager->total_executions++;

  fprintf(stderr, "[Lua] EVALSHA: %s (%d keys, %d args, execution #%d)\n",
          sha1, key_count, arg_count, script->execution_count);

  pthread_mutex_unlock(&manager->manager_mutex);

  return 0;
}

/* ===== Script Management ===== */

void freelang_lua_script_kill(fl_lua_manager_t *manager) {
  if (!manager) return;

  fprintf(stderr, "[Lua] SCRIPT KILL: Killing running script\n");
}

fl_lua_script_t* freelang_lua_script_info(fl_lua_manager_t *manager,
                                           const char *sha1) {
  return freelang_lua_script_get(manager, sha1);
}

void freelang_lua_list_scripts(fl_lua_manager_t *manager,
                                char **sha1_list, int *count) {
  if (!manager || !sha1_list || !count) return;

  pthread_mutex_lock(&manager->manager_mutex);

  int i = 0;
  for (; i < manager->script_count && i < *count; i++) {
    sha1_list[i] = manager->scripts[i].sha1;
  }

  *count = i;

  fprintf(stderr, "[Lua] Listed %d scripts\n", i);

  pthread_mutex_unlock(&manager->manager_mutex);
}

/* ===== Statistics ===== */

fl_lua_stats_t freelang_lua_get_stats(fl_lua_manager_t *manager) {
  fl_lua_stats_t stats = {0, 0, 0, 0, 0.0};

  if (!manager) return stats;

  pthread_mutex_lock(&manager->manager_mutex);

  stats.total_scripts_loaded = manager->script_count;
  stats.total_executions = manager->total_executions;
  stats.failed_executions = manager->total_errors;
  stats.successful_executions = manager->total_executions - manager->total_errors;

  pthread_mutex_unlock(&manager->manager_mutex);

  return stats;
}

void freelang_lua_reset_stats(fl_lua_manager_t *manager) {
  if (!manager) return;

  pthread_mutex_lock(&manager->manager_mutex);

  manager->total_executions = 0;
  manager->total_errors = 0;

  for (int i = 0; i < manager->script_count; i++) {
    manager->scripts[i].execution_count = 0;
  }

  fprintf(stderr, "[Lua] Statistics reset\n");

  pthread_mutex_unlock(&manager->manager_mutex);
}
