/**
 * FreeLang stdlib/env - Environment Variables & Execution Paths
 * Environment variable access, working directory management
 */

#ifndef FREELANG_STDLIB_ENV_H
#define FREELANG_STDLIB_ENV_H

#include <stdint.h>

/* ===== Environment Variables ===== */

typedef struct {
  char key[256];
  char value[512];
} fl_env_var_t;

typedef struct {
  fl_env_var_t vars[256];        /* Cached environment variables */
  int var_count;
} fl_env_context_t;

/* ===== Public API ===== */

/* Get environment variable */
char* fl_env_get(const char *key);

/* Get environment variable with default */
char* fl_env_get_default(const char *key, const char *default_value);

/* Set environment variable */
int fl_env_set(const char *key, const char *value);

/* Delete environment variable */
int fl_env_delete(const char *key);

/* Check if environment variable exists */
int fl_env_exists(const char *key);

/* Get all environment variables count */
int fl_env_count(void);

/* Get environment variable by index */
char* fl_env_get_at(int index);

/* Get key at index */
char* fl_env_get_key_at(int index);

/* ===== Paths & Directories ===== */

/* Get current working directory */
char* fl_env_get_cwd(void);

/* Change working directory */
int fl_env_chdir(const char *path);

/* Get home directory */
char* fl_env_get_home(void);

/* Get temporary directory */
char* fl_env_get_tmpdir(void);

/* Get executable path */
char* fl_env_get_exec_path(void);

/* ===== System Paths ===== */

/* Get PATH environment variable as array */
void fl_env_get_path_list(char **paths, int *count);

/* Search for executable in PATH */
char* fl_env_find_in_path(const char *executable);

/* ===== Context Management ===== */

/* Create environment context (snapshot) */
fl_env_context_t* fl_env_context_create(void);

/* Destroy context */
void fl_env_context_destroy(fl_env_context_t *ctx);

/* Get variable from context */
char* fl_env_context_get(fl_env_context_t *ctx, const char *key);

#endif /* FREELANG_STDLIB_ENV_H */
