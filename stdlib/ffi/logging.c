/**
 * FreeLang Centralized Logging Implementation (Phase 22)
 * Structured logging aggregation
 */

#include "logging.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>

/* ===== Logger Creation ===== */

fl_logger_t* freelang_logger_create(const char *service_name, int buffer_size) {
  fl_logger_t *logger = (fl_logger_t*)malloc(sizeof(fl_logger_t));
  if (!logger) return NULL;

  memset(logger, 0, sizeof(fl_logger_t));
  pthread_mutex_init(&logger->logger_mutex, NULL);

  strncpy(logger->service_name, service_name, sizeof(logger->service_name) - 1);
  logger->min_level = LOG_LEVEL_DEBUG;
  logger->created_at = time(NULL) * 1000;  /* ms */

  /* Create ring buffer */
  logger->buffer.buffer = (fl_log_entry_t*)malloc(sizeof(fl_log_entry_t) * buffer_size);
  logger->buffer.buffer_size = buffer_size;
  logger->buffer.head = 0;
  logger->buffer.tail = 0;
  logger->buffer.entry_count = 0;
  pthread_mutex_init(&logger->buffer.buffer_mutex, NULL);

  fprintf(stderr, "[Logging] Logger created: %s (buffer: %d entries)\n",
          service_name, buffer_size);

  return logger;
}

fl_logger_t* freelang_logger_create_with_file(const char *service_name,
                                               int buffer_size,
                                               const char *log_file) {
  fl_logger_t *logger = freelang_logger_create(service_name, buffer_size);
  if (!logger || !log_file) return logger;

  logger->log_file = (char*)malloc(strlen(log_file) + 1);
  strcpy(logger->log_file, log_file);

  logger->file_handle = fopen(log_file, "a");
  if (!logger->file_handle) {
    fprintf(stderr, "[Logging] WARNING: Failed to open log file: %s\n", log_file);
  }

  return logger;
}

void freelang_logger_destroy(fl_logger_t *logger) {
  if (!logger) return;

  if (logger->buffer.buffer) {
    free(logger->buffer.buffer);
  }

  if (logger->file_handle) {
    fclose(logger->file_handle);
  }

  if (logger->log_file) {
    free(logger->log_file);
  }

  pthread_mutex_destroy(&logger->buffer.buffer_mutex);
  pthread_mutex_destroy(&logger->logger_mutex);
  free(logger);

  fprintf(stderr, "[Logging] Logger destroyed\n");
}

/* ===== Logging ===== */

void freelang_log(fl_logger_t *logger, fl_log_level_t level,
                   const char *message, const char *context) {
  if (!logger || !message) return;

  pthread_mutex_lock(&logger->buffer.buffer_mutex);

  fl_log_entry_t *entry = &logger->buffer.buffer[logger->buffer.head];
  entry->timestamp = time(NULL) * 1000;  /* ms */
  entry->level = level;
  strncpy(entry->message, message, sizeof(entry->message) - 1);
  if (context) {
    strncpy(entry->context, context, sizeof(entry->context) - 1);
  }
  entry->field_count = 0;

  logger->buffer.head = (logger->buffer.head + 1) % logger->buffer.buffer_size;
  logger->buffer.total_logged++;

  if (logger->buffer.entry_count < logger->buffer.buffer_size) {
    logger->buffer.entry_count++;
  }

  fprintf(stderr, "[Logging] [%s] %s\n",
          level == LOG_LEVEL_DEBUG ? "DEBUG" :
          level == LOG_LEVEL_INFO ? "INFO" :
          level == LOG_LEVEL_WARN ? "WARN" :
          level == LOG_LEVEL_ERROR ? "ERROR" : "FATAL",
          message);

  pthread_mutex_unlock(&logger->buffer.buffer_mutex);
}

void freelang_log_with_fields(fl_logger_t *logger, fl_log_level_t level,
                               const char *message, const char **fields,
                               int field_count) {
  if (!logger || !message) return;

  freelang_log(logger, level, message, NULL);
}

void freelang_log_with_trace(fl_logger_t *logger, fl_log_level_t level,
                              const char *message, const char *trace_id) {
  if (!logger || !message) return;

  pthread_mutex_lock(&logger->buffer.buffer_mutex);

  fl_log_entry_t *entry = &logger->buffer.buffer[logger->buffer.head];
  entry->timestamp = time(NULL) * 1000;  /* ms */
  entry->level = level;
  strncpy(entry->message, message, sizeof(entry->message) - 1);
  if (trace_id) {
    strncpy(entry->trace_id, trace_id, sizeof(entry->trace_id) - 1);
  }

  logger->buffer.head = (logger->buffer.head + 1) % logger->buffer.buffer_size;
  logger->buffer.total_logged++;

  fprintf(stderr, "[Logging] [TRACE:%s] %s\n", trace_id ? trace_id : "none", message);

  pthread_mutex_unlock(&logger->buffer.buffer_mutex);
}

void freelang_log_debug(fl_logger_t *logger, const char *message) {
  freelang_log(logger, LOG_LEVEL_DEBUG, message, NULL);
}

void freelang_log_info(fl_logger_t *logger, const char *message) {
  freelang_log(logger, LOG_LEVEL_INFO, message, NULL);
}

void freelang_log_warn(fl_logger_t *logger, const char *message) {
  freelang_log(logger, LOG_LEVEL_WARN, message, NULL);
}

void freelang_log_error(fl_logger_t *logger, const char *message) {
  freelang_log(logger, LOG_LEVEL_ERROR, message, NULL);
}

void freelang_log_fatal(fl_logger_t *logger, const char *message) {
  freelang_log(logger, LOG_LEVEL_FATAL, message, NULL);
}

/* ===== Log Retrieval ===== */

int freelang_log_read_entry(fl_logger_t *logger, fl_log_entry_t *entry) {
  if (!logger || !entry) return 0;

  pthread_mutex_lock(&logger->buffer.buffer_mutex);

  if (logger->buffer.entry_count == 0) {
    pthread_mutex_unlock(&logger->buffer.buffer_mutex);
    return 0;
  }

  *entry = logger->buffer.buffer[logger->buffer.tail];
  logger->buffer.tail = (logger->buffer.tail + 1) % logger->buffer.buffer_size;
  logger->buffer.entry_count--;

  pthread_mutex_unlock(&logger->buffer.buffer_mutex);
  return 1;
}

void freelang_log_get_by_level(fl_logger_t *logger, fl_log_level_t level,
                                fl_log_entry_t **entries, int *count) {
  if (!logger || !entries || !count) return;

  pthread_mutex_lock(&logger->buffer.buffer_mutex);

  int found = 0;
  for (int i = 0; i < logger->buffer.entry_count && found < *count; i++) {
    int idx = (logger->buffer.tail + i) % logger->buffer.buffer_size;
    if (logger->buffer.buffer[idx].level == level) {
      entries[found++] = &logger->buffer.buffer[idx];
    }
  }

  *count = found;

  pthread_mutex_unlock(&logger->buffer.buffer_mutex);
}

void freelang_log_clear_buffer(fl_logger_t *logger) {
  if (!logger) return;

  pthread_mutex_lock(&logger->buffer.buffer_mutex);
  logger->buffer.entry_count = 0;
  logger->buffer.head = 0;
  logger->buffer.tail = 0;
  fprintf(stderr, "[Logging] Buffer cleared\n");
  pthread_mutex_unlock(&logger->buffer.buffer_mutex);
}

/* ===== Export ===== */

char* freelang_log_export_json(fl_logger_t *logger) {
  if (!logger) return NULL;

  char *output = (char*)malloc(65536);
  if (!output) return NULL;

  int offset = 0;
  offset += snprintf(output + offset, 65536 - offset, "{\"logs\":[");

  pthread_mutex_lock(&logger->buffer.buffer_mutex);

  int first = 1;
  for (int i = 0; i < logger->buffer.entry_count; i++) {
    int idx = (logger->buffer.tail + i) % logger->buffer.buffer_size;
    fl_log_entry_t *e = &logger->buffer.buffer[idx];

    if (!first) offset += snprintf(output + offset, 65536 - offset, ",");
    offset += snprintf(output + offset, 65536 - offset,
                      "{\"timestamp\":%ld,\"level\":%d,\"message\":\"%s\"}",
                      e->timestamp, e->level, e->message);
    first = 0;
  }

  pthread_mutex_unlock(&logger->buffer.buffer_mutex);

  offset += snprintf(output + offset, 65536 - offset, "]}");

  return output;
}

char* freelang_log_export_text(fl_logger_t *logger) {
  if (!logger) return NULL;

  char *output = (char*)malloc(65536);
  if (!output) return NULL;

  int offset = 0;

  pthread_mutex_lock(&logger->buffer.buffer_mutex);

  for (int i = 0; i < logger->buffer.entry_count; i++) {
    int idx = (logger->buffer.tail + i) % logger->buffer.buffer_size;
    fl_log_entry_t *e = &logger->buffer.buffer[idx];

    offset += snprintf(output + offset, 65536 - offset, "[%ld] %s\n",
                      e->timestamp, e->message);
  }

  pthread_mutex_unlock(&logger->buffer.buffer_mutex);

  return output;
}

void freelang_log_flush(fl_logger_t *logger) {
  if (!logger || !logger->file_handle) return;

  pthread_mutex_lock(&logger->logger_mutex);
  fflush(logger->file_handle);
  fprintf(stderr, "[Logging] Buffer flushed to file\n");
  pthread_mutex_unlock(&logger->logger_mutex);
}

/* ===== Statistics ===== */

fl_logging_stats_t freelang_logging_get_stats(fl_logger_t *logger) {
  fl_logging_stats_t stats = {0, 0, 0, 0, 0, 0, 0.0};

  if (!logger) return stats;

  pthread_mutex_lock(&logger->buffer.buffer_mutex);

  stats.total_entries = logger->buffer.total_logged;

  for (int i = 0; i < logger->buffer.entry_count; i++) {
    int idx = (logger->buffer.tail + i) % logger->buffer.buffer_size;
    switch (logger->buffer.buffer[idx].level) {
      case LOG_LEVEL_DEBUG: stats.debug_entries++; break;
      case LOG_LEVEL_INFO: stats.info_entries++; break;
      case LOG_LEVEL_WARN: stats.warn_entries++; break;
      case LOG_LEVEL_ERROR: stats.error_entries++; break;
      case LOG_LEVEL_FATAL: stats.fatal_entries++; break;
    }
  }

  pthread_mutex_unlock(&logger->buffer.buffer_mutex);

  return stats;
}

void freelang_logger_set_level(fl_logger_t *logger, fl_log_level_t level) {
  if (!logger) return;

  pthread_mutex_lock(&logger->logger_mutex);
  logger->min_level = level;
  fprintf(stderr, "[Logging] Log level set to %d\n", level);
  pthread_mutex_unlock(&logger->logger_mutex);
}

void freelang_logging_reset_stats(fl_logger_t *logger) {
  if (!logger) return;

  pthread_mutex_lock(&logger->buffer.buffer_mutex);
  logger->buffer.total_logged = 0;
  fprintf(stderr, "[Logging] Statistics reset\n");
  pthread_mutex_unlock(&logger->buffer.buffer_mutex);
}
