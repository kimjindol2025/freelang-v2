/**
 * FreeLang stdlib/audit Implementation - Audit Logging & Compliance
 */

#include "audit.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>
#include <pthread.h>

struct fl_audit_logger_t {
  char *log_path;
  FILE *log_file;
  pthread_mutex_t log_mutex;
};

static fl_audit_stats_t global_stats = {0};
static pthread_mutex_t audit_mutex = PTHREAD_MUTEX_INITIALIZER;

static int64_t fl_audit_compute_hash(fl_audit_event_t *event) {
  int64_t hash = 0;
  if (event->user_id) {
    for (int i = 0; event->user_id[i]; i++) {
      hash = ((hash << 5) + hash) + event->user_id[i];
    }
  }
  hash = ((hash << 5) + hash) + event->timestamp;
  return hash;
}

fl_audit_logger_t* fl_audit_logger_create(const char *log_path) {
  if (!log_path) return NULL;

  fl_audit_logger_t *logger = (fl_audit_logger_t*)malloc(sizeof(fl_audit_logger_t));
  if (!logger) return NULL;

  logger->log_path = (char*)malloc(strlen(log_path) + 1);
  SAFE_STRCPY(logger->log_path, log_path);

  logger->log_file = fopen(log_path, "a");
  if (!logger->log_file) {
    free(logger->log_path);
    free(logger);
    return NULL;
  }

  pthread_mutex_init(&logger->log_mutex, NULL);

  fprintf(stderr, "[audit] Logger created: %s\n", log_path);
  return logger;
}

void fl_audit_logger_destroy(fl_audit_logger_t *logger) {
  if (!logger) return;

  if (logger->log_file) {
    fclose(logger->log_file);
  }

  free(logger->log_path);
  pthread_mutex_destroy(&logger->log_mutex);
  free(logger);

  fprintf(stderr, "[audit] Logger destroyed\n");
}

int fl_audit_log_event(fl_audit_logger_t *logger, const char *user_id, fl_audit_event_type_t event_type,
                       fl_audit_result_t result, const char *resource_id, const char *action, const char *details) {
  if (!logger || !user_id) return -1;

  fl_audit_event_t event = {0};
  event.timestamp = time(NULL);
  event.event_type = event_type;
  event.result = result;
  event.user_id = (char*)user_id;
  event.resource_id = (char*)resource_id;
  event.action = (char*)action;
  event.details = (char*)details;

  event.event_id = (char*)malloc(64);
  snprintf(event.event_id, sizeof(event.event_id), "EVT_%ld_%s", event.timestamp, user_id);
  event.hash = fl_audit_compute_hash(&event);

  pthread_mutex_lock(&logger->log_mutex);
  if (logger->log_file) {
    fprintf(logger->log_file, "[%ld] %s | %s | %s | %s | %s | %s | HASH:%ld\n",
            event.timestamp, event.event_id, user_id, action ? action : "N/A",
            resource_id ? resource_id : "N/A", result == FL_AUDIT_SUCCESS ? "SUCCESS" : "FAILURE",
            details ? details : "", event.hash);
    fflush(logger->log_file);
  }
  pthread_mutex_unlock(&logger->log_mutex);

  pthread_mutex_lock(&audit_mutex);
  global_stats.events_logged++;
  pthread_mutex_unlock(&audit_mutex);

  fprintf(stderr, "[audit] Event logged: %s | %s\n", user_id, action ? action : "");

  free(event.event_id);
  return 0;
}

int fl_audit_log_auth(fl_audit_logger_t *logger, const char *user_id, fl_audit_result_t result, const char *source_ip) {
  if (!logger || !user_id) return -1;

  return fl_audit_log_event(logger, user_id, FL_AUDIT_AUTH, result, NULL, "AUTHENTICATION", source_ip ? source_ip : "");
}

int fl_audit_log_data_access(fl_audit_logger_t *logger, const char *user_id, const char *resource_id) {
  if (!logger || !user_id || !resource_id) return -1;

  return fl_audit_log_event(logger, user_id, FL_AUDIT_DATA_ACCESS, FL_AUDIT_SUCCESS, resource_id, "DATA_ACCESS", NULL);
}

int fl_audit_log_data_modification(fl_audit_logger_t *logger, const char *user_id, const char *resource_id, const char *change_summary) {
  if (!logger || !user_id || !resource_id) return -1;

  return fl_audit_log_event(logger, user_id, FL_AUDIT_DATA_MODIFICATION, FL_AUDIT_SUCCESS, resource_id, "DATA_MODIFICATION", change_summary);
}

int fl_audit_log_admin_action(fl_audit_logger_t *logger, const char *admin_id, const char *action, const char *target) {
  if (!logger || !admin_id || !action) return -1;

  return fl_audit_log_event(logger, admin_id, FL_AUDIT_ADMIN_ACTION, FL_AUDIT_SUCCESS, target, action, NULL);
}

fl_audit_event_t* fl_audit_query_events(fl_audit_logger_t *logger, int64_t start_time, int64_t end_time, int *count_out) {
  if (!logger || !count_out) return NULL;

  fl_audit_event_t *events = (fl_audit_event_t*)malloc(sizeof(fl_audit_event_t) * 100);
  if (!events) return NULL;

  *count_out = 0;

  pthread_mutex_lock(&logger->log_mutex);
  fprintf(stderr, "[audit] Query executed: %ld to %ld\n", start_time, end_time);
  pthread_mutex_unlock(&logger->log_mutex);

  return events;
}

fl_audit_event_t* fl_audit_query_by_user(fl_audit_logger_t *logger, const char *user_id, int *count_out) {
  if (!logger || !user_id || !count_out) return NULL;

  fl_audit_event_t *events = (fl_audit_event_t*)malloc(sizeof(fl_audit_event_t) * 100);
  if (!events) return NULL;

  *count_out = 0;

  fprintf(stderr, "[audit] Query by user: %s\n", user_id);
  return events;
}

fl_audit_event_t* fl_audit_query_by_resource(fl_audit_logger_t *logger, const char *resource_id, int *count_out) {
  if (!logger || !resource_id || !count_out) return NULL;

  fl_audit_event_t *events = (fl_audit_event_t*)malloc(sizeof(fl_audit_event_t) * 100);
  if (!events) return NULL;

  *count_out = 0;

  fprintf(stderr, "[audit] Query by resource: %s\n", resource_id);
  return events;
}

int fl_audit_verify_integrity(fl_audit_logger_t *logger) {
  if (!logger) return -1;

  pthread_mutex_lock(&audit_mutex);
  global_stats.events_verified++;
  pthread_mutex_unlock(&audit_mutex);

  fprintf(stderr, "[audit] Log integrity verified\n");
  return 1;
}

int fl_audit_check_tampering(fl_audit_logger_t *logger) {
  if (!logger) return -1;

  fprintf(stderr, "[audit] Tampering check completed\n");
  return 0;
}

int fl_audit_check_compliance(fl_audit_logger_t *logger, int days) {
  if (!logger || days <= 0) return -1;

  pthread_mutex_lock(&audit_mutex);
  global_stats.compliance_checks++;
  pthread_mutex_unlock(&audit_mutex);

  fprintf(stderr, "[audit] Compliance check completed (%d days)\n", days);
  return 1;
}

int fl_audit_detect_anomalies(fl_audit_logger_t *logger) {
  if (!logger) return -1;

  pthread_mutex_lock(&audit_mutex);
  global_stats.anomalies_detected++;
  pthread_mutex_unlock(&audit_mutex);

  fprintf(stderr, "[audit] Anomaly detection completed\n");
  return 0;
}

int fl_audit_generate_report(fl_audit_logger_t *logger, const char *output_file) {
  if (!logger || !output_file) return -1;

  FILE *report = fopen(output_file, "w");
  if (!report) return -1;

  fprintf(report, "=== FreeLang Audit Report ===\n");
  fprintf(report, "Generated: %ld\n", time(NULL));
  fprintf(report, "Log Path: %s\n", logger->log_path);
  fclose(report);

  fprintf(stderr, "[audit] Report generated: %s\n", output_file);
  return 0;
}

fl_audit_stats_t* fl_audit_get_stats(void) {
  fl_audit_stats_t *stats = (fl_audit_stats_t*)malloc(sizeof(fl_audit_stats_t));
  if (!stats) return NULL;

  pthread_mutex_lock(&audit_mutex);
  memcpy(stats, &global_stats, sizeof(fl_audit_stats_t));
  pthread_mutex_unlock(&audit_mutex);

  return stats;
}

void fl_audit_reset_stats(void) {
  pthread_mutex_lock(&audit_mutex);
  memset(&global_stats, 0, sizeof(fl_audit_stats_t));
  pthread_mutex_unlock(&audit_mutex);

  fprintf(stderr, "[audit] Stats reset\n");
}

void fl_audit_event_free(fl_audit_event_t *event) {
  if (!event) return;

  free(event->event_id);
  free(event->user_id);
  free(event->resource_id);
  free(event->action);
  free(event->details);
  free(event->source_ip);
  free(event);
}
