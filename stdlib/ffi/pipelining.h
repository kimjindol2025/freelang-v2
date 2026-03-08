/**
 * FreeLang Redis Pipelining (Phase 20)
 * Batch multiple commands and reduce round-trip latency
 */

#ifndef FREELANG_PIPELINING_H
#define FREELANG_PIPELINING_H

#include "mini_redis.h"
#include <pthread.h>

/* ===== Pipeline Configuration ===== */

#define PIPELINE_MAX_COMMANDS 1024      /* Max commands per pipeline */
#define PIPELINE_BUFFER_SIZE 65536      /* Command buffer size (64KB) */

/* ===== Command Entry ===== */

typedef struct {
  char *command;                       /* Raw Redis command */
  char *args[32];                      /* Command arguments */
  int arg_count;                       /* Number of arguments */
  int callback_id;                     /* Callback for response */
} fl_pipeline_cmd_t;

/* ===== Pipeline State ===== */

typedef struct {
  fl_pipeline_cmd_t commands[PIPELINE_MAX_COMMANDS];
  int command_count;                   /* Current commands in pipeline */

  char buffer[PIPELINE_BUFFER_SIZE];   /* Serialized command buffer */
  int buffer_pos;                      /* Current buffer position */

  int client_id;                       /* Associated Redis client */
  int64_t created_at;                  /* Creation timestamp */

  pthread_mutex_t pipeline_mutex;      /* Thread-safe access */
} fl_pipeline_t;

/* ===== Statistics ===== */

typedef struct {
  int total_pipelines;                 /* Total pipelines executed */
  int total_commands;                  /* Total commands batched */
  int average_batch_size;              /* Avg commands per pipeline */
  double latency_reduction;            /* Measured latency reduction % */
} fl_pipeline_stats_t;

/* ===== Public API ===== */

/* Create new pipeline */
fl_pipeline_t* freelang_pipeline_create(int client_id);

/* Add command to pipeline */
int freelang_pipeline_add_command(fl_pipeline_t *pipeline,
                                   const char *command, int callback_id);

/* Add typed command (GET, SET, etc) */
int freelang_pipeline_add_get(fl_pipeline_t *pipeline,
                               const char *key, int callback_id);

int freelang_pipeline_add_set(fl_pipeline_t *pipeline,
                               const char *key, const char *value,
                               int callback_id);

int freelang_pipeline_add_del(fl_pipeline_t *pipeline,
                               const char *key, int callback_id);

int freelang_pipeline_add_incr(fl_pipeline_t *pipeline,
                                const char *key, int callback_id);

/* Execute pipeline (sends all commands at once) */
int freelang_pipeline_execute(fl_pipeline_t *pipeline);

/* Clear pipeline without executing */
void freelang_pipeline_clear(fl_pipeline_t *pipeline);

/* Get pipeline size (buffered commands) */
int freelang_pipeline_size(fl_pipeline_t *pipeline);

/* Get pipeline statistics */
fl_pipeline_stats_t freelang_pipeline_get_stats(void);

/* Destroy pipeline */
void freelang_pipeline_destroy(fl_pipeline_t *pipeline);

/* Reset global statistics */
void freelang_pipeline_reset_stats(void);

#endif /* FREELANG_PIPELINING_H */
