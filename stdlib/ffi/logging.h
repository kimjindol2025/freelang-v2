/**
 * FreeLang Centralized Logging (Phase 22)
 * Structured logging aggregation and management
 */

#ifndef FREELANG_LOGGING_H
#define FREELANG_LOGGING_H

#include <pthread.h>
#include <time.h>

/* ===== Log Levels ===== */

typedef enum {
  LOG_LEVEL_DEBUG = 0,
  LOG_LEVEL_INFO = 1,
  LOG_LEVEL_WARN = 2,
  LOG_LEVEL_ERROR = 3,
  LOG_LEVEL_FATAL = 4
} fl_log_level_t;

/* ===== Log Entry ===== */

typedef struct {
  int64_t timestamp;                   /* Milliseconds since epoch */
  fl_log_level_t level;
  char message[2048];
  char context[256];                   /* Caller context */
  char *fields[32];                    /* Structured fields (key=value) */
  int field_count;
  char trace_id[33];                   /* For distributed tracing */
} fl_log_entry_t;

/* ===== Log Buffer & Ring Buffer ===== */

typedef struct {
  fl_log_entry_t *buffer;              /* Ring buffer */
  int buffer_size;
  int head;                            /* Write position */
  int tail;                            /* Read position */
  int entry_count;                     /* Current entries */

  int total_logged;                    /* Lifetime count */

  pthread_mutex_t buffer_mutex;
} fl_log_buffer_t;

/* ===== Logger Instance ===== */

typedef struct {
  char service_name[256];
  fl_log_level_t min_level;            /* Minimum level to log */

  fl_log_buffer_t buffer;              /* Local ring buffer */

  char *log_file;                      /* File path (optional) */
  FILE *file_handle;

  int64_t created_at;

  pthread_mutex_t logger_mutex;
} fl_logger_t;

/* ===== Statistics ===== */

typedef struct {
  int total_entries;                   /* Total logged */
  int debug_entries;
  int info_entries;
  int warn_entries;
  int error_entries;
  int fatal_entries;
  double average_entry_size_bytes;
} fl_logging_stats_t;

/* ===== Public API: Logger Management ===== */

/* Create logger instance */
fl_logger_t* freelang_logger_create(const char *service_name, int buffer_size);

/* Create logger with file output */
fl_logger_t* freelang_logger_create_with_file(const char *service_name,
                                               int buffer_size,
                                               const char *log_file);

/* Destroy logger */
void freelang_logger_destroy(fl_logger_t *logger);

/* ===== Public API: Logging ===== */

/* Log message at level */
void freelang_log(fl_logger_t *logger, fl_log_level_t level,
                   const char *message, const char *context);

/* Log with structured fields */
void freelang_log_with_fields(fl_logger_t *logger, fl_log_level_t level,
                               const char *message, const char **fields,
                               int field_count);

/* Log with trace ID */
void freelang_log_with_trace(fl_logger_t *logger, fl_log_level_t level,
                              const char *message, const char *trace_id);

/* Convenience functions */
void freelang_log_debug(fl_logger_t *logger, const char *message);
void freelang_log_info(fl_logger_t *logger, const char *message);
void freelang_log_warn(fl_logger_t *logger, const char *message);
void freelang_log_error(fl_logger_t *logger, const char *message);
void freelang_log_fatal(fl_logger_t *logger, const char *message);

/* ===== Public API: Log Retrieval ===== */

/* Get next log entry from buffer */
int freelang_log_read_entry(fl_logger_t *logger, fl_log_entry_t *entry);

/* Get all entries matching level */
void freelang_log_get_by_level(fl_logger_t *logger, fl_log_level_t level,
                                fl_log_entry_t **entries, int *count);

/* Clear buffer */
void freelang_log_clear_buffer(fl_logger_t *logger);

/* ===== Public API: Export ===== */

/* Export logs in JSON format */
char* freelang_log_export_json(fl_logger_t *logger);

/* Export logs in plain text */
char* freelang_log_export_text(fl_logger_t *logger);

/* Flush to file */
void freelang_log_flush(fl_logger_t *logger);

/* ===== Public API: Statistics & Management ===== */

/* Get logger statistics */
fl_logging_stats_t freelang_logging_get_stats(fl_logger_t *logger);

/* Set minimum log level */
void freelang_logger_set_level(fl_logger_t *logger, fl_log_level_t level);

/* Reset statistics */
void freelang_logging_reset_stats(fl_logger_t *logger);

#endif /* FREELANG_LOGGING_H */
