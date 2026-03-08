/**
 * FreeLang Lua Scripting Support (Phase 21)
 * Server-side Lua script execution for atomic multi-command operations
 */

#ifndef FREELANG_LUA_SCRIPTING_H
#define FREELANG_LUA_SCRIPTING_H

#include <pthread.h>
#include <time.h>

/* ===== Script Cache ===== */

typedef struct {
  char sha1[41];                       /* SHA1 hash of script */
  char *script_body;                   /* Lua script source */
  int script_size;                     /* Script size (bytes) */
  int64_t loaded_at;                   /* Load time */
  int execution_count;                 /* Times executed */
} fl_lua_script_t;

/* ===== Execution Context ===== */

typedef struct {
  int script_id;                       /* Script identifier */
  char sha1[41];                       /* Script hash */

  char *keys[32];                      /* KEYS array for script */
  int key_count;

  char *args[32];                      /* ARGV array for script */
  int arg_count;

  int callback_id;                     /* Result callback */
  char *result;                        /* Script result */

  int64_t started_at;                  /* Execution start time */
  int64_t completed_at;                /* Execution end time */
  int success;                         /* Execution success */
} fl_lua_execution_t;

/* ===== Lua Script Manager ===== */

typedef struct {
  fl_lua_script_t scripts[256];        /* Cached scripts */
  int script_count;                    /* Number of scripts */

  int total_executions;                /* Total script executions */
  int total_errors;                    /* Total errors */

  pthread_mutex_t manager_mutex;       /* Thread-safe access */
} fl_lua_manager_t;

/* ===== Statistics ===== */

typedef struct {
  int total_scripts_loaded;            /* Scripts in cache */
  int total_executions;                /* Total runs */
  int successful_executions;           /* Successful runs */
  int failed_executions;               /* Failed runs */
  double average_execution_time_ms;    /* Avg execution time */
} fl_lua_stats_t;

/* ===== Public API: Manager ===== */

/* Create Lua script manager */
fl_lua_manager_t* freelang_lua_manager_create(void);

/* Destroy manager */
void freelang_lua_manager_destroy(fl_lua_manager_t *manager);

/* ===== Public API: Script Loading & Caching ===== */

/* Load and cache Lua script */
int freelang_lua_script_load(fl_lua_manager_t *manager,
                              const char *script_body, char *sha1);

/* Get script by SHA1 */
fl_lua_script_t* freelang_lua_script_get(fl_lua_manager_t *manager,
                                          const char *sha1);

/* Check if script exists (SCRIPT EXISTS) */
int freelang_lua_script_exists(fl_lua_manager_t *manager, const char *sha1);

/* Flush all cached scripts (SCRIPT FLUSH) */
void freelang_lua_script_flush(fl_lua_manager_t *manager);

/* ===== Public API: Script Execution ===== */

/* Execute script with KEYS and ARGV */
int freelang_lua_eval(fl_lua_manager_t *manager,
                       const char *script_body,
                       const char **keys, int key_count,
                       const char **args, int arg_count,
                       int callback_id);

/* Execute cached script by SHA1 */
int freelang_lua_evalsha(fl_lua_manager_t *manager,
                          const char *sha1,
                          const char **keys, int key_count,
                          const char **args, int arg_count,
                          int callback_id);

/* ===== Public API: Script Management ===== */

/* Kill running script (SCRIPT KILL) */
void freelang_lua_script_kill(fl_lua_manager_t *manager);

/* Get script info */
fl_lua_script_t* freelang_lua_script_info(fl_lua_manager_t *manager,
                                           const char *sha1);

/* List all cached scripts */
void freelang_lua_list_scripts(fl_lua_manager_t *manager,
                                char **sha1_list, int *count);

/* ===== Public API: Statistics & Monitoring ===== */

/* Get Lua statistics */
fl_lua_stats_t freelang_lua_get_stats(fl_lua_manager_t *manager);

/* Reset statistics */
void freelang_lua_reset_stats(fl_lua_manager_t *manager);

/* ===== Helper Functions ===== */

/* Compute SHA1 hash of script */
void _lua_compute_sha1(const char *script_body, char *sha1_out);

/* Serialize script result to string */
char* _lua_serialize_result(void *result, int result_type);

#endif /* FREELANG_LUA_SCRIPTING_H */
