/**
 * FreeLang Redis Pipelining Implementation (Phase 20)
 * High-performance batched command execution
 */

#include "pipelining.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>

/* ===== Global Statistics ===== */

static fl_pipeline_stats_t global_stats = {0, 0, 0, 0.0};
static pthread_mutex_t stats_mutex = PTHREAD_MUTEX_INITIALIZER;

/* ===== Pipeline Creation ===== */

fl_pipeline_t* freelang_pipeline_create(int client_id) {
  fl_pipeline_t *pipeline = (fl_pipeline_t*)malloc(sizeof(fl_pipeline_t));
  if (!pipeline) return NULL;

  memset(pipeline, 0, sizeof(fl_pipeline_t));
  pthread_mutex_init(&pipeline->pipeline_mutex, NULL);

  pipeline->client_id = client_id;
  pipeline->created_at = time(NULL);

  fprintf(stderr, "[Pipeline] Pipeline created for client %d\n", client_id);
  return pipeline;
}

/* ===== Command Addition ===== */

static int pipeline_serialize_command(fl_pipeline_t *pipeline,
                                       const char *command) {
  pthread_mutex_lock(&pipeline->pipeline_mutex);

  if (pipeline->command_count >= PIPELINE_MAX_COMMANDS) {
    fprintf(stderr, "[Pipeline] ERROR: Pipeline full (max %d commands)\n",
            PIPELINE_MAX_COMMANDS);
    pthread_mutex_unlock(&pipeline->pipeline_mutex);
    return -1;
  }

  /* Copy command string */
  size_t cmd_len = strlen(command);
  if (pipeline->buffer_pos + cmd_len + 2 >= PIPELINE_BUFFER_SIZE) {
    fprintf(stderr, "[Pipeline] WARNING: Buffer full, executing early\n");
    pthread_mutex_unlock(&pipeline->pipeline_mutex);
    return -2;  /* Buffer full */
  }

  /* Store command pointer */
  fl_pipeline_cmd_t *entry = &pipeline->commands[pipeline->command_count];
  entry->command = (char*)malloc(cmd_len + 1);
  strcpy(entry->command, command);

  pipeline->command_count++;
  pipeline->buffer_pos += cmd_len + 2;

  pthread_mutex_unlock(&pipeline->pipeline_mutex);
  return pipeline->command_count - 1;
}

int freelang_pipeline_add_command(fl_pipeline_t *pipeline,
                                   const char *command, int callback_id) {
  if (!pipeline || !command) return -1;

  int result = pipeline_serialize_command(pipeline, command);
  if (result >= 0) {
    pipeline->commands[result].callback_id = callback_id;
    fprintf(stderr, "[Pipeline] Command added: %s (callback: %d)\n",
            command, callback_id);
  }

  return result;
}

int freelang_pipeline_add_get(fl_pipeline_t *pipeline,
                               const char *key, int callback_id) {
  if (!pipeline || !key) return -1;

  char cmd_buffer[256];
  snprintf(cmd_buffer, sizeof(cmd_buffer), "GET %s", key);

  return freelang_pipeline_add_command(pipeline, cmd_buffer, callback_id);
}

int freelang_pipeline_add_set(fl_pipeline_t *pipeline,
                               const char *key, const char *value,
                               int callback_id) {
  if (!pipeline || !key || !value) return -1;

  char cmd_buffer[512];
  snprintf(cmd_buffer, sizeof(cmd_buffer), "SET %s %s", key, value);

  return freelang_pipeline_add_command(pipeline, cmd_buffer, callback_id);
}

int freelang_pipeline_add_del(fl_pipeline_t *pipeline,
                               const char *key, int callback_id) {
  if (!pipeline || !key) return -1;

  char cmd_buffer[256];
  snprintf(cmd_buffer, sizeof(cmd_buffer), "DEL %s", key);

  return freelang_pipeline_add_command(pipeline, cmd_buffer, callback_id);
}

int freelang_pipeline_add_incr(fl_pipeline_t *pipeline,
                                const char *key, int callback_id) {
  if (!pipeline || !key) return -1;

  char cmd_buffer[256];
  snprintf(cmd_buffer, sizeof(cmd_buffer), "INCR %s", key);

  return freelang_pipeline_add_command(pipeline, cmd_buffer, callback_id);
}

/* ===== Pipeline Execution ===== */

int freelang_pipeline_execute(fl_pipeline_t *pipeline) {
  if (!pipeline || pipeline->command_count == 0) return 0;

  pthread_mutex_lock(&pipeline->pipeline_mutex);

  int cmd_count = pipeline->command_count;
  int64_t start_time = time(NULL);

  fprintf(stderr, "[Pipeline] Executing %d batched commands\n", cmd_count);

  /* In real implementation, would serialize all commands and send to Redis */
  /* For now, simulate execution */
  for (int i = 0; i < cmd_count; i++) {
    fprintf(stderr, "[Pipeline]   [%d/%d] %s\n", i+1, cmd_count,
            pipeline->commands[i].command);
  }

  /* Update statistics */
  pthread_mutex_lock(&stats_mutex);
  global_stats.total_pipelines++;
  global_stats.total_commands += cmd_count;
  if (global_stats.total_pipelines > 0) {
    global_stats.average_batch_size = global_stats.total_commands /
                                       global_stats.total_pipelines;
  }
  pthread_mutex_unlock(&stats_mutex);

  int64_t elapsed = time(NULL) - start_time;
  fprintf(stderr, "[Pipeline] Execution complete (%lld ms)\n", elapsed);

  pthread_mutex_unlock(&pipeline->pipeline_mutex);
  return cmd_count;
}

/* ===== Pipeline Management ===== */

void freelang_pipeline_clear(fl_pipeline_t *pipeline) {
  if (!pipeline) return;

  pthread_mutex_lock(&pipeline->pipeline_mutex);

  for (int i = 0; i < pipeline->command_count; i++) {
    if (pipeline->commands[i].command) {
      free(pipeline->commands[i].command);
      pipeline->commands[i].command = NULL;
    }
  }

  pipeline->command_count = 0;
  pipeline->buffer_pos = 0;

  fprintf(stderr, "[Pipeline] Pipeline cleared\n");
  pthread_mutex_unlock(&pipeline->pipeline_mutex);
}

int freelang_pipeline_size(fl_pipeline_t *pipeline) {
  if (!pipeline) return 0;

  pthread_mutex_lock(&pipeline->pipeline_mutex);
  int size = pipeline->command_count;
  pthread_mutex_unlock(&pipeline->pipeline_mutex);

  return size;
}

fl_pipeline_stats_t freelang_pipeline_get_stats(void) {
  pthread_mutex_lock(&stats_mutex);
  fl_pipeline_stats_t stats = global_stats;
  pthread_mutex_unlock(&stats_mutex);

  return stats;
}

void freelang_pipeline_destroy(fl_pipeline_t *pipeline) {
  if (!pipeline) return;

  freelang_pipeline_clear(pipeline);
  pthread_mutex_destroy(&pipeline->pipeline_mutex);
  free(pipeline);

  fprintf(stderr, "[Pipeline] Pipeline destroyed\n");
}

void freelang_pipeline_reset_stats(void) {
  pthread_mutex_lock(&stats_mutex);
  memset(&global_stats, 0, sizeof(fl_pipeline_stats_t));
  pthread_mutex_unlock(&stats_mutex);

  fprintf(stderr, "[Pipeline] Statistics reset\n");
}
