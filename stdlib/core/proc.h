/**
 * FreeLang stdlib/proc - Child Process Management
 * Process spawn, stdio redirection, signal handling
 */

#ifndef FREELANG_STDLIB_PROC_H
#define FREELANG_STDLIB_PROC_H

#include <stdint.h>
#include <time.h>

/* ===== Process Information ===== */

typedef enum {
  PROC_STATUS_RUNNING = 0,
  PROC_STATUS_EXITED = 1,
  PROC_STATUS_SIGNALED = 2,
  PROC_STATUS_STOPPED = 3
} fl_proc_status_t;

typedef struct {
  uint32_t pid;                  /* Process ID */
  int exit_code;                 /* Exit status */
  int signal;                    /* Termination signal (if signaled) */
  fl_proc_status_t status;       /* Current status */

  int64_t start_time;            /* Process start timestamp */
  int64_t end_time;              /* Process end timestamp */

  char command[512];             /* Original command */
  char cwd[256];                 /* Working directory */
} fl_process_t;

/* ===== Process Options ===== */

typedef struct {
  char *args[64];                /* Command arguments (null-terminated) */
  int arg_count;

  char *env[128];                /* Environment variables (null-terminated) */
  int env_count;

  char cwd[256];                 /* Working directory */
  int shell;                     /* Run in shell */

  int capture_stdout;            /* Capture stdout */
  int capture_stderr;            /* Capture stderr */
  char stdin_data[4096];         /* Data to send to stdin */

  int timeout_ms;                /* Kill if exceeds timeout */
} fl_spawn_options_t;

/* ===== Process Results ===== */

typedef struct {
  uint32_t pid;
  int exit_code;
  char stdout_buf[65536];        /* Max 64KB output */
  char stderr_buf[65536];
  int stdout_len;
  int stderr_len;

  int64_t elapsed_ms;            /* Execution time */
  fl_proc_status_t status;
} fl_process_result_t;

/* ===== Public API ===== */

/* Create process options */
fl_spawn_options_t* fl_proc_options_create(void);

/* Destroy options */
void fl_proc_options_destroy(fl_spawn_options_t *opts);

/* Add argument */
int fl_proc_add_arg(fl_spawn_options_t *opts, const char *arg);

/* Add environment variable */
int fl_proc_add_env(fl_spawn_options_t *opts, const char *key, const char *value);

/* Set working directory */
int fl_proc_set_cwd(fl_spawn_options_t *opts, const char *cwd);

/* Set shell mode */
void fl_proc_set_shell(fl_spawn_options_t *opts, int shell);

/* Enable stdout capture */
void fl_proc_capture_stdout(fl_spawn_options_t *opts);

/* Enable stderr capture */
void fl_proc_capture_stderr(fl_spawn_options_t *opts);

/* Set stdin data */
int fl_proc_set_stdin(fl_spawn_options_t *opts, const char *data);

/* Set timeout (milliseconds) */
void fl_proc_set_timeout(fl_spawn_options_t *opts, int timeout_ms);

/* ===== Process Execution ===== */

/* Spawn process (non-blocking) */
fl_process_t* fl_proc_spawn(const char *command, fl_spawn_options_t *opts);

/* Spawn and wait for completion */
int fl_proc_spawn_sync(const char *command, fl_spawn_options_t *opts,
                       fl_process_result_t *out_result);

/* Wait for process completion */
int fl_proc_wait(fl_process_t *proc, int timeout_ms);

/* Send signal to process */
int fl_proc_kill(fl_process_t *proc, int signal);

/* Check if process is running */
int fl_proc_is_running(fl_process_t *proc);

/* Get process status */
fl_proc_status_t fl_proc_get_status(fl_process_t *proc);

/* Destroy process handle */
void fl_proc_destroy(fl_process_t *proc);

/* ===== Process Group ===== */

typedef struct {
  fl_process_t *processes[256];
  int process_count;
  uint32_t group_id;
} fl_process_group_t;

/* Create process group */
fl_process_group_t* fl_proc_group_create(void);

/* Add process to group */
int fl_proc_group_add(fl_process_group_t *group, fl_process_t *proc);

/* Kill all processes in group */
int fl_proc_group_kill(fl_process_group_t *group, int signal);

/* Wait for all processes */
int fl_proc_group_wait_all(fl_process_group_t *group, int timeout_ms);

/* Destroy group */
void fl_proc_group_destroy(fl_process_group_t *group);

#endif /* FREELANG_STDLIB_PROC_H */
