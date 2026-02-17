/**
 * FreeLang stdlib/audit - Audit Logging & Compliance
 * Immutable event log, compliance tracking, security audit trail
 */
#ifndef FREELANG_STDLIB_AUDIT_H
#define FREELANG_STDLIB_AUDIT_H

#include <stdint.h>
#include <stddef.h>
#include <time.h>

typedef enum {
  FL_AUDIT_AUTH = 0,
  FL_AUDIT_AUTHZ = 1,
  FL_AUDIT_DATA_ACCESS = 2,
  FL_AUDIT_DATA_MODIFICATION = 3,
  FL_AUDIT_ADMIN_ACTION = 4,
  FL_AUDIT_SECURITY_EVENT = 5,
  FL_AUDIT_SYSTEM_EVENT = 6
} fl_audit_event_type_t;

typedef enum {
  FL_AUDIT_SUCCESS = 0,
  FL_AUDIT_FAILURE = 1,
  FL_AUDIT_PARTIAL = 2
} fl_audit_result_t;

typedef struct fl_audit_logger_t fl_audit_logger_t;

typedef struct {
  char *event_id;
  int64_t timestamp;
  fl_audit_event_type_t event_type;
  fl_audit_result_t result;
  char *user_id;
  char *resource_id;
  char *action;
  char *details;
  char *source_ip;
  int64_t hash;
} fl_audit_event_t;

typedef struct {
  uint64_t events_logged;
  uint64_t events_verified;
  uint64_t compliance_checks;
  uint64_t anomalies_detected;
} fl_audit_stats_t;

/* Logger Creation */
fl_audit_logger_t* fl_audit_logger_create(const char *log_path);
void fl_audit_logger_destroy(fl_audit_logger_t *logger);

/* Event Logging */
int fl_audit_log_event(fl_audit_logger_t *logger, const char *user_id, fl_audit_event_type_t event_type,
                       fl_audit_result_t result, const char *resource_id, const char *action, const char *details);

int fl_audit_log_auth(fl_audit_logger_t *logger, const char *user_id, fl_audit_result_t result, const char *source_ip);
int fl_audit_log_data_access(fl_audit_logger_t *logger, const char *user_id, const char *resource_id);
int fl_audit_log_data_modification(fl_audit_logger_t *logger, const char *user_id, const char *resource_id, const char *change_summary);
int fl_audit_log_admin_action(fl_audit_logger_t *logger, const char *admin_id, const char *action, const char *target);

/* Event Retrieval */
fl_audit_event_t* fl_audit_query_events(fl_audit_logger_t *logger, int64_t start_time, int64_t end_time, int *count_out);
fl_audit_event_t* fl_audit_query_by_user(fl_audit_logger_t *logger, const char *user_id, int *count_out);
fl_audit_event_t* fl_audit_query_by_resource(fl_audit_logger_t *logger, const char *resource_id, int *count_out);

/* Integrity & Verification */
int fl_audit_verify_integrity(fl_audit_logger_t *logger);
int fl_audit_check_tampering(fl_audit_logger_t *logger);

/* Compliance */
int fl_audit_check_compliance(fl_audit_logger_t *logger, int days);
int fl_audit_detect_anomalies(fl_audit_logger_t *logger);
int fl_audit_generate_report(fl_audit_logger_t *logger, const char *output_file);

/* Statistics */
fl_audit_stats_t* fl_audit_get_stats(void);
void fl_audit_reset_stats(void);

/* Cleanup */
void fl_audit_event_free(fl_audit_event_t *event);

#endif
