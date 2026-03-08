/**
 * FreeLang Alerting System (Phase 22)
 * Threshold-based alerting and incident management
 */

#ifndef FREELANG_ALERTING_H
#define FREELANG_ALERTING_H

#include <pthread.h>
#include <time.h>

/* ===== Alert Severity ===== */

typedef enum {
  ALERT_SEVERITY_INFO = 0,
  ALERT_SEVERITY_WARNING = 1,
  ALERT_SEVERITY_ERROR = 2,
  ALERT_SEVERITY_CRITICAL = 3
} fl_alert_severity_t;

/* ===== Alert Rule ===== */

typedef struct {
  char name[256];                      /* Rule identifier */
  char metric_name[256];               /* Metric to monitor */
  char condition[256];                 /* e.g., ">100", "<50", "==critical" */

  fl_alert_severity_t severity;        /* Alert level */

  double threshold;                    /* Numeric threshold */
  int duration_seconds;                /* How long condition must persist */

  int enabled;                         /* Is rule active? */
  int firing;                          /* Currently firing? */

  int64_t last_triggered;              /* Last trigger time */
  int trigger_count;                   /* Total triggers */

  char *notification_channel;          /* Where to send alert */

  pthread_mutex_t rule_mutex;
} fl_alert_rule_t;

/* ===== Alert Event ===== */

typedef struct {
  char alert_id[33];                   /* Unique alert ID */
  char rule_name[256];                 /* Associated rule */

  fl_alert_severity_t severity;

  char title[512];
  char description[1024];

  int64_t started_at;                  /* Alert start time */
  int64_t resolved_at;                 /* Alert resolution time (0=active) */

  int acknowledged;                    /* Has someone acknowledged? */
  char acknowledged_by[256];

  int resolved;                        /* Is alert resolved? */
} fl_alert_event_t;

/* ===== Alert Manager ===== */

typedef struct {
  fl_alert_rule_t rules[256];
  int rule_count;

  fl_alert_event_t active_alerts[512];
  int active_alert_count;

  fl_alert_event_t resolved_alerts[1024];
  int resolved_alert_count;

  int total_alerts_triggered;

  pthread_mutex_t manager_mutex;
} fl_alert_manager_t;

/* ===== Statistics ===== */

typedef struct {
  int total_rules;                     /* Active rules */
  int enabled_rules;                   /* Enabled rules */
  int active_alerts;                   /* Currently firing */
  int resolved_alerts;                 /* Historical */
  int total_alerts_triggered;          /* Lifetime count */
  double average_alert_duration_seconds;
} fl_alert_stats_t;

/* ===== Public API: Manager ===== */

/* Create alert manager */
fl_alert_manager_t* freelang_alert_manager_create(void);

/* Destroy manager */
void freelang_alert_manager_destroy(fl_alert_manager_t *manager);

/* ===== Public API: Rule Management ===== */

/* Create alert rule */
int freelang_alert_rule_create(fl_alert_manager_t *manager,
                                const char *name, const char *metric_name,
                                const char *condition, double threshold,
                                fl_alert_severity_t severity);

/* Enable rule */
void freelang_alert_rule_enable(fl_alert_manager_t *manager, int rule_id);

/* Disable rule */
void freelang_alert_rule_disable(fl_alert_manager_t *manager, int rule_id);

/* Delete rule */
void freelang_alert_rule_delete(fl_alert_manager_t *manager, int rule_id);

/* Get rule by ID */
fl_alert_rule_t* freelang_alert_rule_get(fl_alert_manager_t *manager, int rule_id);

/* ===== Public API: Alert Evaluation ===== */

/* Evaluate all rules against current metrics */
void freelang_alert_evaluate_all(fl_alert_manager_t *manager);

/* Evaluate specific rule */
int freelang_alert_evaluate_rule(fl_alert_manager_t *manager, int rule_id,
                                  double current_value);

/* Check if rule should fire */
int freelang_alert_check_condition(fl_alert_rule_t *rule, double current_value);

/* ===== Public API: Alert Handling ===== */

/* Fire/trigger alert */
int freelang_alert_fire(fl_alert_manager_t *manager, int rule_id,
                        const char *title, const char *description);

/* Acknowledge alert */
void freelang_alert_acknowledge(fl_alert_manager_t *manager,
                                 const char *alert_id, const char *acknowledged_by);

/* Resolve alert */
void freelang_alert_resolve(fl_alert_manager_t *manager, const char *alert_id);

/* Get active alerts */
void freelang_alert_get_active(fl_alert_manager_t *manager,
                                fl_alert_event_t **alerts, int *count);

/* ===== Public API: Notifications ===== */

/* Register notification channel (e.g., email, Slack) */
void freelang_alert_register_channel(fl_alert_manager_t *manager,
                                      const char *channel_name);

/* Send notification */
void freelang_alert_send_notification(fl_alert_manager_t *manager,
                                       const char *channel,
                                       fl_alert_event_t *alert);

/* ===== Public API: Statistics & Monitoring ===== */

/* Get alert manager statistics */
fl_alert_stats_t freelang_alert_get_stats(fl_alert_manager_t *manager);

/* Reset statistics */
void freelang_alert_reset_stats(fl_alert_manager_t *manager);

/* Clear resolved alerts */
void freelang_alert_clear_resolved(fl_alert_manager_t *manager);

#endif /* FREELANG_ALERTING_H */
