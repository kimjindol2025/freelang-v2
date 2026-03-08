/**
 * FreeLang stdlib/proc Implementation - Child Process Management
 */

#include "proc.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>
#include <signal.h>
#include <time.h>
#include <errno.h>

/* Create process options */
fl_spawn_options_t* fl_proc_options_create(void) {
  fl_spawn_options_t *opts = (fl_spawn_options_t*)malloc(sizeof(fl_spawn_options_t));
  if (!opts) return NULL;

  memset(opts, 0, sizeof(fl_spawn_options_t));
  opts->timeout_ms = -1;  /* No timeout by default */

  return opts;
}

/* Destroy options */
void fl_proc_options_destroy(fl_spawn_options_t *opts) {
  if (!opts) return;

  /* Free allocated args and env */
  for (int i = 0; i < opts->arg_count; i++) {
    if (opts->args[i]) free(opts->args[i]);
  }
  for (int i = 0; i < opts->env_count; i++) {
    if (opts->env[i]) free(opts->env[i]);
  }

  free(opts);
}

/* Add argument */
int fl_proc_add_arg(fl_spawn_options_t *opts, const char *arg) {
  if (!opts || !arg || opts->arg_count >= 63) return -1;

  opts->args[opts->arg_count] = (char*)malloc(strlen(arg) + 1);
  if (!opts->args[opts->arg_count]) return -1;

  SAFE_STRCPY(opts->args[opts->arg_count], arg);
  opts->arg_count++;

  return 0;
}

/* Add environment variable */
int fl_proc_add_env(fl_spawn_options_t *opts, const char *key, const char *value) {
  if (!opts || !key || !value || opts->env_count >= 127) return -1;

  int len = strlen(key) + strlen(value) + 2;  /* "key=value\0" */
  opts->env[opts->env_count] = (char*)malloc(len);
  if (!opts->env[opts->env_count]) return -1;

  snprintf(opts->env[opts->env_count], len, "%s=%s", key, value);
  opts->env_count++;

  return 0;
}

/* Set working directory */
int fl_proc_set_cwd(fl_spawn_options_t *opts, const char *cwd) {
  if (!opts || !cwd) return -1;

  strncpy(opts->cwd, cwd, sizeof(opts->cwd) - 1);
  return 0;
}

/* Set shell mode */
void fl_proc_set_shell(fl_spawn_options_t *opts, int shell) {
  if (opts) opts->shell = shell;
}

/* Enable stdout capture */
void fl_proc_capture_stdout(fl_spawn_options_t *opts) {
  if (opts) opts->capture_stdout = 1;
}

/* Enable stderr capture */
void fl_proc_capture_stderr(fl_spawn_options_t *opts) {
  if (opts) opts->capture_stderr = 1;
}

/* Set stdin data */
int fl_proc_set_stdin(fl_spawn_options_t *opts, const char *data) {
  if (!opts || !data) return -1;

  strncpy(opts->stdin_data, data, sizeof(opts->stdin_data) - 1);
  return 0;
}

/* Set timeout (milliseconds) */
void fl_proc_set_timeout(fl_spawn_options_t *opts, int timeout_ms) {
  if (opts) opts->timeout_ms = timeout_ms;
}

/* Spawn process (non-blocking) */
fl_process_t* fl_proc_spawn(const char *command, fl_spawn_options_t *opts) {
  if (!command) return NULL;

  fl_process_t *proc = (fl_process_t*)malloc(sizeof(fl_process_t));
  if (!proc) return NULL;

  memset(proc, 0, sizeof(fl_process_t));
  strncpy(proc->command, command, sizeof(proc->command) - 1);
  proc->start_time = time(NULL);
  proc->status = PROC_STATUS_RUNNING;

  pid_t pid = fork();

  if (pid == -1) {
    /* Fork failed */
    free(proc);
    fprintf(stderr, "[proc] Fork failed: %s\n", strerror(errno));
    return NULL;
  }

  if (pid == 0) {
    /* Child process */

    /* Change working directory if specified */
    if (opts && strlen(opts->cwd) > 0) {
      if (chdir(opts->cwd) != 0) {
        fprintf(stderr, "[proc] chdir failed: %s\n", strerror(errno));
        exit(1);
      }
    }

    /* Setup environment */
    if (opts && opts->env_count > 0) {
      for (int i = 0; i < opts->env_count; i++) {
        putenv(opts->env[i]);
      }
    }

    /* Execute command */
    if (opts && opts->shell) {
      /* Execute via shell */
      execlp("sh", "sh", "-c", command, (char*)NULL);
    } else {
      /* Execute directly */
      if (opts && opts->arg_count > 0) {
        opts->args[opts->arg_count] = NULL;  /* Null-terminate */
        execvp(opts->args[0], opts->args);
      } else {
        execlp(command, command, (char*)NULL);
      }
    }

    /* If exec fails */
    fprintf(stderr, "[proc] exec failed: %s\n", strerror(errno));
    exit(127);
  }

  /* Parent process */
  proc->pid = (uint32_t)pid;

  fprintf(stderr, "[proc] Process spawned: PID=%d, cmd=%s\n", pid, command);
  return proc;
}

/* Spawn and wait for completion */
int fl_proc_spawn_sync(const char *command, fl_spawn_options_t *opts,
                       fl_process_result_t *out_result) {
  if (!command || !out_result) return -1;

  fl_process_t *proc = fl_proc_spawn(command, opts);
  if (!proc) return -1;

  memset(out_result, 0, sizeof(fl_process_result_t));
  out_result->pid = proc->pid;

  /* Wait for process */
  int timeout_ms = (opts) ? opts->timeout_ms : -1;
  int wait_result = fl_proc_wait(proc, timeout_ms);

  out_result->exit_code = proc->exit_code;
  out_result->status = proc->status;
  out_result->elapsed_ms = (proc->end_time - proc->start_time) * 1000;

  fl_proc_destroy(proc);

  return wait_result;
}

/* Wait for process completion */
int fl_proc_wait(fl_process_t *proc, int timeout_ms) {
  if (!proc) return -1;

  time_t start_time = time(NULL);

  while (1) {
    int status;
    pid_t result = waitpid(proc->pid, &status, WNOHANG);

    if (result == proc->pid) {
      /* Process exited */
      proc->end_time = time(NULL);

      if (WIFEXITED(status)) {
        proc->exit_code = WEXITSTATUS(status);
        proc->status = PROC_STATUS_EXITED;
        fprintf(stderr, "[proc] Process exited: PID=%d, code=%d\n", proc->pid, proc->exit_code);
        return proc->exit_code;
      } else if (WIFSIGNALED(status)) {
        proc->signal = WTERMSIG(status);
        proc->status = PROC_STATUS_SIGNALED;
        fprintf(stderr, "[proc] Process killed by signal: PID=%d, signal=%d\n", proc->pid, proc->signal);
        return -1;
      }

      return 0;
    } else if (result == -1) {
      /* Error */
      fprintf(stderr, "[proc] waitpid failed: %s\n", strerror(errno));
      return -1;
    }

    /* Check timeout */
    if (timeout_ms > 0) {
      time_t elapsed = (time(NULL) - start_time) * 1000;
      if (elapsed >= timeout_ms) {
        /* Timeout - kill process */
        fprintf(stderr, "[proc] Timeout: killing PID=%d\n", proc->pid);
        fl_proc_kill(proc, SIGKILL);
        return -1;
      }
    }

    /* Sleep briefly */
    usleep(100000);  /* 100ms */
  }
}

/* Send signal to process */
int fl_proc_kill(fl_process_t *proc, int signal) {
  if (!proc) return -1;

  if (kill(proc->pid, signal) != 0) {
    fprintf(stderr, "[proc] kill failed: %s\n", strerror(errno));
    return -1;
  }

  fprintf(stderr, "[proc] Signal sent: PID=%d, signal=%d\n", proc->pid, signal);
  return 0;
}

/* Check if process is running */
int fl_proc_is_running(fl_process_t *proc) {
  if (!proc) return 0;

  int status;
  pid_t result = waitpid(proc->pid, &status, WNOHANG);

  if (result == 0) {
    return 1;  /* Still running */
  }

  if (result == proc->pid) {
    proc->end_time = time(NULL);
    if (WIFEXITED(status)) {
      proc->exit_code = WEXITSTATUS(status);
      proc->status = PROC_STATUS_EXITED;
    } else if (WIFSIGNALED(status)) {
      proc->signal = WTERMSIG(status);
      proc->status = PROC_STATUS_SIGNALED;
    }
    return 0;  /* Not running */
  }

  return 0;
}

/* Get process status */
fl_proc_status_t fl_proc_get_status(fl_process_t *proc) {
  if (!proc) return PROC_STATUS_EXITED;

  fl_proc_is_running(proc);  /* Update status */
  return proc->status;
}

/* Destroy process handle */
void fl_proc_destroy(fl_process_t *proc) {
  if (!proc) return;

  if (fl_proc_is_running(proc)) {
    fl_proc_kill(proc, SIGTERM);
  }

  free(proc);
}

/* Create process group */
fl_process_group_t* fl_proc_group_create(void) {
  fl_process_group_t *group = (fl_process_group_t*)malloc(sizeof(fl_process_group_t));
  if (!group) return NULL;

  memset(group, 0, sizeof(fl_process_group_t));
  group->group_id = getpid();

  fprintf(stderr, "[proc] Process group created: GID=%d\n", group->group_id);
  return group;
}

/* Add process to group */
int fl_proc_group_add(fl_process_group_t *group, fl_process_t *proc) {
  if (!group || !proc || group->process_count >= 256) return -1;

  group->processes[group->process_count++] = proc;

  return 0;
}

/* Kill all processes in group */
int fl_proc_group_kill(fl_process_group_t *group, int signal) {
  if (!group) return -1;

  for (int i = 0; i < group->process_count; i++) {
    if (group->processes[i]) {
      fl_proc_kill(group->processes[i], signal);
    }
  }

  fprintf(stderr, "[proc] Group signal sent: GID=%d, signal=%d, count=%d\n",
          group->group_id, signal, group->process_count);

  return 0;
}

/* Wait for all processes */
int fl_proc_group_wait_all(fl_process_group_t *group, int timeout_ms) {
  if (!group) return -1;

  time_t start_time = time(NULL);
  int finished_count = 0;

  while (finished_count < group->process_count) {
    finished_count = 0;

    for (int i = 0; i < group->process_count; i++) {
      if (group->processes[i] && !fl_proc_is_running(group->processes[i])) {
        finished_count++;
      }
    }

    if (finished_count < group->process_count) {
      if (timeout_ms > 0) {
        time_t elapsed = (time(NULL) - start_time) * 1000;
        if (elapsed >= timeout_ms) {
          fprintf(stderr, "[proc] Group timeout: killing all\n");
          fl_proc_group_kill(group, SIGKILL);
          return -1;
        }
      }

      usleep(100000);  /* 100ms */
    }
  }

  fprintf(stderr, "[proc] All processes finished: GID=%d\n", group->group_id);
  return 0;
}

/* Destroy group */
void fl_proc_group_destroy(fl_process_group_t *group) {
  if (!group) return;

  for (int i = 0; i < group->process_count; i++) {
    if (group->processes[i]) {
      fl_proc_destroy(group->processes[i]);
    }
  }

  free(group);
}
