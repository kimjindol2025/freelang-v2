/**
 * FreeLang stdlib/env Implementation - Environment Variables & Execution Paths
 */

#include "env.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <unistd.h>
#include <limits.h>

extern char **environ;

/* Get environment variable */
char* fl_env_get(const char *key) {
  if (!key) return NULL;
  return getenv(key);
}

/* Get environment variable with default */
char* fl_env_get_default(const char *key, const char *default_value) {
  if (!key) return (char*)default_value;

  char *value = getenv(key);
  return value ? value : (char*)default_value;
}

/* Set environment variable */
int fl_env_set(const char *key, const char *value) {
  if (!key || !value) return -1;
  return setenv(key, value, 1);  /* 1 = overwrite */
}

/* Delete environment variable */
int fl_env_delete(const char *key) {
  if (!key) return -1;
  return unsetenv(key);
}

/* Check if environment variable exists */
int fl_env_exists(const char *key) {
  if (!key) return 0;
  return getenv(key) != NULL ? 1 : 0;
}

/* Get all environment variables count */
int fl_env_count(void) {
  int count = 0;
  for (char **env = environ; *env != NULL; env++) {
    count++;
  }
  return count;
}

/* Get environment variable by index */
char* fl_env_get_at(int index) {
  int count = 0;
  for (char **env = environ; *env != NULL; env++) {
    if (count == index) {
      return *env;
    }
    count++;
  }
  return NULL;
}

/* Get key at index */
char* fl_env_get_key_at(int index) {
  char *var = fl_env_get_at(index);
  if (!var) return NULL;

  static char key[256];
  const char *eq = strchr(var, '=');
  if (!eq) return NULL;

  int key_len = eq - var;
  if (key_len >= sizeof(key)) key_len = sizeof(key) - 1;

  strncpy(key, var, key_len);
  key[key_len] = '\0';
  return key;
}

/* Get current working directory */
char* fl_env_get_cwd(void) {
  static char cwd[PATH_MAX];
  if (getcwd(cwd, sizeof(cwd)) == NULL) {
    return NULL;
  }
  return cwd;
}

/* Change working directory */
int fl_env_chdir(const char *path) {
  if (!path) return -1;
  return chdir(path);
}

/* Get home directory */
char* fl_env_get_home(void) {
  char *home = getenv("HOME");
  if (home) return home;

  /* Fallback on Unix */
  return "/root";
}

/* Get temporary directory */
char* fl_env_get_tmpdir(void) {
  char *tmpdir = getenv("TMPDIR");
  if (tmpdir) return tmpdir;

  tmpdir = getenv("TMP");
  if (tmpdir) return tmpdir;

  tmpdir = getenv("TEMP");
  if (tmpdir) return tmpdir;

  return "/tmp";
}

/* Get executable path */
char* fl_env_get_exec_path(void) {
  static char exec_path[PATH_MAX];

  /* Try /proc/self/exe (Linux) */
  ssize_t len = readlink("/proc/self/exe", exec_path, sizeof(exec_path) - 1);
  if (len != -1) {
    exec_path[len] = '\0';
    return exec_path;
  }

  /* Fallback to current working directory + program name */
  char *cwd = fl_env_get_cwd();
  if (cwd) {
    snprintf(exec_path, sizeof(exec_path), "%s/freelang", cwd);
    return exec_path;
  }

  return NULL;
}

/* Get PATH environment variable as array */
void fl_env_get_path_list(char **paths, int *count) {
  if (!paths || !count) return;

  char *path_env = getenv("PATH");
  if (!path_env) {
    *count = 0;
    return;
  }

  char *path_copy = strdup(path_env);
  if (!path_copy) {
    *count = 0;
    return;
  }

  *count = 0;
  char *token = strtok(path_copy, ":");
  while (token && *count < 64) {
    paths[(*count)++] = strdup(token);
    token = strtok(NULL, ":");
  }

  free(path_copy);
}

/* Search for executable in PATH */
char* fl_env_find_in_path(const char *executable) {
  if (!executable) return NULL;

  char *path_env = getenv("PATH");
  if (!path_env) return NULL;

  static char full_path[PATH_MAX];
  char *path_copy = strdup(path_env);
  if (!path_copy) return NULL;

  char *token = strtok(path_copy, ":");
  while (token) {
    snprintf(full_path, sizeof(full_path), "%s/%s", token, executable);

    /* Check if file exists and is executable */
    if (access(full_path, X_OK) == 0) {
      free(path_copy);
      return full_path;
    }

    token = strtok(NULL, ":");
  }

  free(path_copy);
  return NULL;
}

/* Create environment context (snapshot) */
fl_env_context_t* fl_env_context_create(void) {
  fl_env_context_t *ctx = (fl_env_context_t*)malloc(sizeof(fl_env_context_t));
  if (!ctx) return NULL;

  memset(ctx, 0, sizeof(fl_env_context_t));

  /* Snapshot all environment variables */
  for (char **env = environ; *env != NULL && ctx->var_count < 256; env++) {
    const char *eq = strchr(*env, '=');
    if (!eq) continue;

    int key_len = eq - *env;
    if (key_len >= sizeof(ctx->vars[ctx->var_count].key)) continue;

    strncpy(ctx->vars[ctx->var_count].key, *env, key_len);
    ctx->vars[ctx->var_count].key[key_len] = '\0';

    strncpy(ctx->vars[ctx->var_count].value, eq + 1,
            sizeof(ctx->vars[ctx->var_count].value) - 1);

    ctx->var_count++;
  }

  fprintf(stderr, "[env] Context created with %d variables\n", ctx->var_count);
  return ctx;
}

/* Destroy context */
void fl_env_context_destroy(fl_env_context_t *ctx) {
  if (!ctx) return;

  free(ctx);
  fprintf(stderr, "[env] Context destroyed\n");
}

/* Get variable from context */
char* fl_env_context_get(fl_env_context_t *ctx, const char *key) {
  if (!ctx || !key) return NULL;

  for (int i = 0; i < ctx->var_count; i++) {
    if (strcmp(ctx->vars[i].key, key) == 0) {
      return ctx->vars[i].value;
    }
  }

  return NULL;
}
