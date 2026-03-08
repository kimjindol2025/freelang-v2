/**
 * FreeLang Alerting System Implementation (Phase 22)
 * Threshold-based alerting and incident management
 */

#include "alerting.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>

/* ===== Alert Manager Creation ===== */

fl_alert_manager_t* freelang_alert_manager_create(void) {
  fl_alert_manager_t *manager = (fl_alert_manager_t*)malloc(sizeof(fl_alert_manager_t));
  if (!manager) return NULL;

  memset(manager, 0, sizeof(fl_alert_manager_t));
  pthread_mutex_init(&manager->manager_mutex, NULL);

  fprintf(stderr, "[Alerting] Manager created\n");
  return manager;
}

void freelang_alert_manager_destroy(fl_alert_manager_t *manager) {
  if (!manager) return;

  pthread_mutex_lock(&manager->manager_mutex);

  for (int i = 0; i < manager->rule_count; i++) {
    pthread_mutex_destroy(&manager->rules[i].rule_mutex);
    if (manager->rules[i].notification_channel) {
      free(manager->rules[i].notification_channel);
    }
  }

  pthread_mutex_unlock(&manager->manager_mutex);
  pthread_mutex_destroy(&manager->manager_mutex);
  free(manager);

  fprintf(stderr, "[Alerting] Manager destroyed\n");
}

/* ===== Rule Management ===== */

int freelang_alert_rule_create(fl_alert_manager_t *manager,
                                const char *name, const char *metric_name,
                                const char *condition, double threshold,
                                fl_alert_severity_t severity) {
  if (!manager || !name || !metric_name) return -1;

  pthread_mutex_lock(&manager->manager_mutex);

  if (manager->rule_count >= 256) {
    fprintf(stderr, "[Alerting] ERROR: Max rules reached\n");
    pthread_mutex_unlock(&manager->manager_mutex);
    return -1;
  }

  fl_alert_rule_t *rule = &manager->rules[manager->rule_count];
  strncpy(rule->name, name, sizeof(rule->name) - 1);
  strncpy(rule->metric_name, metric_name, sizeof(rule->metric_name) - 1);
  strncpy(rule->condition, condition, sizeof(rule->condition) - 1);
  rule->threshold = threshold;
  rule->severity = severity;
  rule->enabled = 1;
  rule->firing = 0;
  rule->last_triggered = 0;
  rule->trigger_count = 0;

  pthread_mutex_init(&rule->rule_mutex, NULL);

  int rule_id = manager->rule_count;
  manager->rule_count++;

  fprintf(stderr, "[Alerting] Rule created: %s (threshold: %.2f)\n", name, threshold);

  pthread_mutex_unlock(&manager->manager_mutex);
  return rule_id;
}

void freelang_alert_rule_enable(fl_alert_manager_t *manager, int rule_id) {
  if (!manager || rule_id < 0 || rule_id >= manager->rule_count) return;

  pthread_mutex_lock(&manager->manager_mutex);
  manager->rules[rule_id].enabled = 1;
  fprintf(stderr, "[Alerting] Rule enabled: %s\n", manager->rules[rule_id].name);
  pthread_mutex_unlock(&manager->manager_mutex);
}

void freelang_alert_rule_disable(fl_alert_manager_t *manager, int rule_id) {
  if (!manager || rule_id < 0 || rule_id >= manager->rule_count) return;

  pthread_mutex_lock(&manager->manager_mutex);
  manager->rules[rule_id].enabled = 0;
  fprintf(stderr, "[Alerting] Rule disabled: %s\n", manager->rules[rule_id].name);
  pthread_mutex_unlock(&manager->manager_mutex);
}

void freelang_alert_rule_delete(fl_alert_manager_t *manager, int rule_id) {
  if (!manager || rule_id < 0 || rule_id >= manager->rule_count) return;

  pthread_mutex_lock(&manager->manager_mutex);

  for (int i = rule_id; i < manager->rule_count - 1; i++) {
    manager->rules[i] = manager->rules[i + 1];
  }

  manager->rule_count--;

  fprintf(stderr, "[Alerting] Rule deleted: id %d\n", rule_id);

  pthread_mutex_unlock(&manager->manager_mutex);
}

fl_alert_rule_t* freelang_alert_rule_get(fl_alert_manager_t *manager, int rule_id) {
  if (!manager || rule_id < 0 || rule_id >= manager->rule_count) return NULL;

  return &manager->rules[rule_id];
}

/* ===== Alert Evaluation ===== */

void freelang_alert_evaluate_all(fl_alert_manager_t *manager) {
  if (!manager) return;

  pthread_mutex_lock(&manager->manager_mutex);

  fprintf(stderr, "[Alerting] Evaluating %d rules...\n", manager->rule_count);

  for (int i = 0; i < manager->rule_count; i++) {
    if (manager->rules[i].enabled) {
      /* Simulate evaluation */
      fprintf(stderr, "[Alerting]   Rule %s: evaluation (threshold: %.2f)\n",
              manager->rules[i].name, manager->rules[i].threshold);
    }
  }

  pthread_mutex_unlock(&manager->manager_mutex);
}

int freelang_alert_evaluate_rule(fl_alert_manager_t *manager, int rule_id,
                                  double current_value) {
  if (!manager || rule_id < 0 || rule_id >= manager->rule_count) return 0;

  fl_alert_rule_t *rule = &manager->rules[rule_id];

  if (!rule->enabled) return 0;

  int should_fire = freelang_alert_check_condition(rule, current_value);

  fprintf(stderr, "[Alerting] Rule %s evaluated: value=%.2f, fire=%d\n",
          rule->name, current_value, should_fire);

  return should_fire;
}

int freelang_alert_check_condition(fl_alert_rule_t *rule, double current_value) {
  if (!rule) return 0;

  /* Simple condition checking */
  if (strstr(rule->condition, ">")) {
    return current_value > rule->threshold;
  } else if (strstr(rule->condition, "<")) {
    return current_value < rule->threshold;
  } else if (strstr(rule->condition, "==")) {
    return current_value == rule->threshold;
  }

  return 0;
}

/* ===== Alert Handling ===== */

int freelang_alert_fire(fl_alert_manager_t *manager, int rule_id,
                        const char *title, const char *description) {
  if (!manager || rule_id < 0 || rule_id >= manager->rule_count) return -1;

  pthread_mutex_lock(&manager->manager_mutex);

  if (manager->active_alert_count >= 512) {
    fprintf(stderr, "[Alerting] ERROR: Max active alerts reached\n");
    pthread_mutex_unlock(&manager->manager_mutex);
    return -1;
  }

  fl_alert_event_t *alert = &manager->active_alerts[manager->active_alert_count];
  snprintf(alert->alert_id, sizeof(alert->alert_id), "alert_%ld", time(NULL));
  strncpy(alert->rule_name, manager->rules[rule_id].name, sizeof(alert->rule_name) - 1);
  alert->severity = manager->rules[rule_id].severity;
  strncpy(alert->title, title, sizeof(alert->title) - 1);
  strncpy(alert->description, description, sizeof(alert->description) - 1);
  alert->started_at = time(NULL) * 1000;  /* ms */
  alert->resolved_at = 0;
  alert->acknowledged = 0;
  alert->resolved = 0;

  manager->rules[rule_id].firing = 1;
  manager->rules[rule_id].last_triggered = time(NULL) * 1000;
  manager->rules[rule_id].trigger_count++;

  int alert_id = manager->active_alert_count;
  manager->active_alert_count++;

  manager->total_alerts_triggered++;

  fprintf(stderr, "[Alerting] Alert fired: %s (severity: %d)\n", title, alert->severity);

  pthread_mutex_unlock(&manager->manager_mutex);
  return alert_id;
}

void freelang_alert_acknowledge(fl_alert_manager_t *manager,
                                 const char *alert_id, const char *acknowledged_by) {
  if (!manager || !alert_id) return;

  pthread_mutex_lock(&manager->manager_mutex);

  for (int i = 0; i < manager->active_alert_count; i++) {
    if (strcmp(manager->active_alerts[i].alert_id, alert_id) == 0) {
      manager->active_alerts[i].acknowledged = 1;
      strncpy(manager->active_alerts[i].acknowledged_by, acknowledged_by,
              sizeof(manager->active_alerts[i].acknowledged_by) - 1);

      fprintf(stderr, "[Alerting] Alert acknowledged: %s by %s\n", alert_id, acknowledged_by);
      break;
    }
  }

  pthread_mutex_unlock(&manager->manager_mutex);
}

void freelang_alert_resolve(fl_alert_manager_t *manager, const char *alert_id) {
  if (!manager || !alert_id) return;

  pthread_mutex_lock(&manager->manager_mutex);

  for (int i = 0; i < manager->active_alert_count; i++) {
    if (strcmp(manager->active_alerts[i].alert_id, alert_id) == 0) {
      fl_alert_event_t alert = manager->active_alerts[i];
      alert.resolved_at = time(NULL) * 1000;  /* ms */
      alert.resolved = 1;

      /* Move to resolved */
      if (manager->resolved_alert_count < 1024) {
        manager->resolved_alerts[manager->resolved_alert_count++] = alert;
      }

      /* Remove from active */
      for (int j = i; j < manager->active_alert_count - 1; j++) {
        manager->active_alerts[j] = manager->active_alerts[j + 1];
      }
      manager->active_alert_count--;

      fprintf(stderr, "[Alerting] Alert resolved: %s\n", alert_id);
      break;
    }
  }

  pthread_mutex_unlock(&manager->manager_mutex);
}

void freelang_alert_get_active(fl_alert_manager_t *manager,
                                fl_alert_event_t **alerts, int *count) {
  if (!manager || !alerts || !count) return;

  pthread_mutex_lock(&manager->manager_mutex);

  int i = 0;
  for (; i < manager->active_alert_count && i < *count; i++) {
    alerts[i] = &manager->active_alerts[i];
  }

  *count = i;

  fprintf(stderr, "[Alerting] Retrieved %d active alerts\n", i);

  pthread_mutex_unlock(&manager->manager_mutex);
}

/* ===== Notifications ===== */

void freelang_alert_register_channel(fl_alert_manager_t *manager,
                                      const char *channel_name) {
  if (!manager || !channel_name) return;

  fprintf(stderr, "[Alerting] Channel registered: %s\n", channel_name);
}

void freelang_alert_send_notification(fl_alert_manager_t *manager,
                                       const char *channel,
                                       fl_alert_event_t *alert) {
  if (!manager || !channel || !alert) return;

  fprintf(stderr, "[Alerting] Notification sent via %s: %s\n", channel, alert->title);
}

/* ===== Statistics ===== */

fl_alert_stats_t freelang_alert_get_stats(fl_alert_manager_t *manager) {
  fl_alert_stats_t stats = {0, 0, 0, 0, 0, 0.0};

  if (!manager) return stats;

  pthread_mutex_lock(&manager->manager_mutex);

  stats.total_rules = manager->rule_count;
  for (int i = 0; i < manager->rule_count; i++) {
    if (manager->rules[i].enabled) {
      stats.enabled_rules++;
    }
  }

  stats.active_alerts = manager->active_alert_count;
  stats.resolved_alerts = manager->resolved_alert_count;
  stats.total_alerts_triggered = manager->total_alerts_triggered;

  pthread_mutex_unlock(&manager->manager_mutex);

  return stats;
}

void freelang_alert_reset_stats(fl_alert_manager_t *manager) {
  if (!manager) return;

  pthread_mutex_lock(&manager->manager_mutex);

  manager->total_alerts_triggered = 0;
  manager->active_alert_count = 0;
  manager->resolved_alert_count = 0;

  for (int i = 0; i < manager->rule_count; i++) {
    manager->rules[i].trigger_count = 0;
  }

  fprintf(stderr, "[Alerting] Statistics reset\n");

  pthread_mutex_unlock(&manager->manager_mutex);
}

void freelang_alert_clear_resolved(fl_alert_manager_t *manager) {
  if (!manager) return;

  pthread_mutex_lock(&manager->manager_mutex);

  manager->resolved_alert_count = 0;

  fprintf(stderr, "[Alerting] Resolved alerts cleared\n");

  pthread_mutex_unlock(&manager->manager_mutex);
}
