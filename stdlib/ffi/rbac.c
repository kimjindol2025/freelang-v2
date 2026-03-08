/**
 * FreeLang RBAC Implementation (Phase 23)
 * Role-Based Access Control enforcement and policy management
 */

#include "rbac.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>

/* ===== RBAC Manager ===== */

fl_rbac_manager_t* freelang_rbac_manager_create(void) {
  fl_rbac_manager_t *manager = (fl_rbac_manager_t*)malloc(sizeof(fl_rbac_manager_t));
  if (!manager) return NULL;

  memset(manager, 0, sizeof(fl_rbac_manager_t));
  pthread_mutex_init(&manager->rbac_mutex, NULL);

  /* Initialize default roles */
  manager->roles[0].role = ROLE_GUEST;
  strcpy(manager->roles[0].role_name, "Guest");
  manager->roles[0].permissions = 0;  /* No permissions */
  manager->role_count = 1;

  manager->roles[1].role = ROLE_USER;
  strcpy(manager->roles[1].role_name, "User");
  manager->roles[1].permissions = PERM_READ;
  manager->role_count = 2;

  manager->roles[2].role = ROLE_OPERATOR;
  strcpy(manager->roles[2].role_name, "Operator");
  manager->roles[2].permissions = PERM_READ | PERM_WRITE | PERM_EXECUTE;
  manager->role_count = 3;

  manager->roles[3].role = ROLE_ADMIN;
  strcpy(manager->roles[3].role_name, "Admin");
  manager->roles[3].permissions = PERM_READ | PERM_WRITE | PERM_DELETE | PERM_EXECUTE | PERM_ADMIN;
  manager->role_count = 4;

  fprintf(stderr, "[RBAC] Manager created (4 default roles)\\n");
  return manager;
}

void freelang_rbac_manager_destroy(fl_rbac_manager_t *manager) {
  if (!manager) return;

  pthread_mutex_destroy(&manager->rbac_mutex);
  free(manager);

  fprintf(stderr, "[RBAC] Manager destroyed\\n");
}

/* ===== User Management ===== */

int freelang_rbac_register_user(fl_rbac_manager_t *manager,
                                const char *username,
                                const char *email,
                                fl_rbac_role_t role) {
  if (!manager || !username || manager->user_count >= 512) return -1;

  pthread_mutex_lock(&manager->rbac_mutex);

  fl_user_t *user = &manager->users[manager->user_count];
  snprintf(user->user_id, sizeof(user->user_id), "user_%d_%ld", manager->user_count, time(NULL));
  strncpy(user->username, username, sizeof(user->username) - 1);
  strncpy(user->email, email, sizeof(user->email) - 1);

  user->role = role;
  user->created_at = time(NULL);
  user->last_login = 0;
  user->is_active = 1;
  user->is_suspended = 0;

  /* Set permissions based on role */
  for (int i = 0; i < manager->role_count; i++) {
    if (manager->roles[i].role == role) {
      user->permissions = manager->roles[i].permissions;
      break;
    }
  }

  int user_id = manager->user_count;
  manager->user_count++;

  pthread_mutex_unlock(&manager->rbac_mutex);

  fprintf(stderr, "[RBAC] User registered: %s (role: %d)\\n", username, role);
  return user_id;
}

fl_user_t* freelang_rbac_get_user(fl_rbac_manager_t *manager,
                                   const char *user_id) {
  if (!manager || !user_id) return NULL;

  pthread_mutex_lock(&manager->rbac_mutex);

  for (int i = 0; i < manager->user_count; i++) {
    if (strcmp(manager->users[i].user_id, user_id) == 0) {
      pthread_mutex_unlock(&manager->rbac_mutex);
      return &manager->users[i];
    }
  }

  pthread_mutex_unlock(&manager->rbac_mutex);
  return NULL;
}

int freelang_rbac_update_user_role(fl_rbac_manager_t *manager,
                                    const char *user_id,
                                    fl_rbac_role_t new_role) {
  if (!manager || !user_id) return -1;

  fl_user_t *user = freelang_rbac_get_user(manager, user_id);
  if (!user) return -1;

  pthread_mutex_lock(&manager->rbac_mutex);

  user->role = new_role;

  /* Update permissions */
  for (int i = 0; i < manager->role_count; i++) {
    if (manager->roles[i].role == new_role) {
      user->permissions = manager->roles[i].permissions;
      break;
    }
  }

  pthread_mutex_unlock(&manager->rbac_mutex);

  fprintf(stderr, "[RBAC] User role updated: %s (new role: %d)\\n", user_id, new_role);
  return 0;
}

void freelang_rbac_suspend_user(fl_rbac_manager_t *manager,
                                 const char *user_id) {
  fl_user_t *user = freelang_rbac_get_user(manager, user_id);
  if (user) {
    user->is_suspended = 1;
    fprintf(stderr, "[RBAC] User suspended: %s\\n", user_id);
  }
}

void freelang_rbac_activate_user(fl_rbac_manager_t *manager,
                                  const char *user_id) {
  fl_user_t *user = freelang_rbac_get_user(manager, user_id);
  if (user) {
    user->is_suspended = 0;
    fprintf(stderr, "[RBAC] User activated: %s\\n", user_id);
  }
}

int freelang_rbac_delete_user(fl_rbac_manager_t *manager,
                               const char *user_id) {
  if (!manager || !user_id) return -1;

  pthread_mutex_lock(&manager->rbac_mutex);

  for (int i = 0; i < manager->user_count; i++) {
    if (strcmp(manager->users[i].user_id, user_id) == 0) {
      /* Remove user by shifting */
      for (int j = i; j < manager->user_count - 1; j++) {
        memcpy(&manager->users[j], &manager->users[j + 1], sizeof(fl_user_t));
      }
      manager->user_count--;
      pthread_mutex_unlock(&manager->rbac_mutex);

      fprintf(stderr, "[RBAC] User deleted: %s\\n", user_id);
      return 0;
    }
  }

  pthread_mutex_unlock(&manager->rbac_mutex);
  return -1;
}

/* ===== Role Management ===== */

int freelang_rbac_define_role(fl_rbac_manager_t *manager,
                               fl_rbac_role_t role,
                               const char *role_name,
                               int permissions) {
  if (!manager || !role_name || manager->role_count >= 8) return -1;

  pthread_mutex_lock(&manager->rbac_mutex);

  fl_role_definition_t *role_def = &manager->roles[manager->role_count];
  role_def->role = role;
  strncpy(role_def->role_name, role_name, sizeof(role_def->role_name) - 1);
  role_def->permissions = permissions;
  role_def->priority = manager->role_count;

  manager->role_count++;

  pthread_mutex_unlock(&manager->rbac_mutex);

  fprintf(stderr, "[RBAC] Role defined: %s (perms: %d)\\n", role_name, permissions);
  return 0;
}

fl_role_definition_t* freelang_rbac_get_role(fl_rbac_manager_t *manager,
                                              fl_rbac_role_t role) {
  if (!manager) return NULL;

  pthread_mutex_lock(&manager->rbac_mutex);

  for (int i = 0; i < manager->role_count; i++) {
    if (manager->roles[i].role == role) {
      pthread_mutex_unlock(&manager->rbac_mutex);
      return &manager->roles[i];
    }
  }

  pthread_mutex_unlock(&manager->rbac_mutex);
  return NULL;
}

void freelang_rbac_grant_permission(fl_rbac_manager_t *manager,
                                     fl_rbac_role_t role,
                                     fl_permission_t permission) {
  fl_role_definition_t *role_def = freelang_rbac_get_role(manager, role);
  if (role_def) {
    role_def->permissions |= permission;
    fprintf(stderr, "[RBAC] Permission granted (role: %d, perm: %d)\\n", role, permission);
  }
}

void freelang_rbac_revoke_permission(fl_rbac_manager_t *manager,
                                      fl_rbac_role_t role,
                                      fl_permission_t permission) {
  fl_role_definition_t *role_def = freelang_rbac_get_role(manager, role);
  if (role_def) {
    role_def->permissions &= ~permission;
    fprintf(stderr, "[RBAC] Permission revoked (role: %d, perm: %d)\\n", role, permission);
  }
}

int freelang_rbac_role_has_permission(fl_rbac_manager_t *manager,
                                       fl_rbac_role_t role,
                                       fl_permission_t permission) {
  fl_role_definition_t *role_def = freelang_rbac_get_role(manager, role);
  if (!role_def) return 0;

  return (role_def->permissions & permission) ? 1 : 0;
}

/* ===== Access Control ===== */

int freelang_rbac_check_access(fl_rbac_manager_t *manager,
                                const char *user_id,
                                const char *resource,
                                fl_permission_t required_permission) {
  if (!manager || !user_id || !resource) return 0;

  fl_user_t *user = freelang_rbac_get_user(manager, user_id);
  if (!user || user->is_suspended) {
    freelang_rbac_log_access(manager, user_id, "access_denied", resource, 0, "user_suspended_or_not_found");
    return 0;
  }

  if ((user->permissions & required_permission) == 0) {
    freelang_rbac_log_access(manager, user_id, "access_denied", resource, 0, "insufficient_permissions");
    return 0;
  }

  freelang_rbac_log_access(manager, user_id, "access_granted", resource, 1, "");
  fprintf(stderr, "[RBAC] Access granted: %s → %s\\n", user_id, resource);
  return 1;
}

int freelang_rbac_create_policy(fl_rbac_manager_t *manager,
                                 const char *resource_name,
                                 fl_rbac_role_t required_role,
                                 int required_permissions) {
  if (!manager || !resource_name || manager->policy_count >= 256) return -1;

  pthread_mutex_lock(&manager->rbac_mutex);

  fl_access_policy_t *policy = &manager->policies[manager->policy_count];
  snprintf(policy->policy_id, sizeof(policy->policy_id), "pol_%d", manager->policy_count);
  strncpy(policy->resource_name, resource_name, sizeof(policy->resource_name) - 1);

  policy->required_role = required_role;
  policy->required_permissions = required_permissions;
  policy->created_at = time(NULL);
  policy->is_active = 1;

  int policy_id = manager->policy_count;
  manager->policy_count++;

  pthread_mutex_unlock(&manager->rbac_mutex);

  fprintf(stderr, "[RBAC] Policy created: %s (role: %d)\\n", resource_name, required_role);
  return policy_id;
}

int freelang_rbac_enforce_policy(fl_rbac_manager_t *manager,
                                  const char *user_id,
                                  const char *resource_name) {
  if (!manager || !user_id || !resource_name) return 0;

  fl_user_t *user = freelang_rbac_get_user(manager, user_id);
  if (!user || user->is_suspended) return 0;

  fl_access_policy_t *policy = freelang_rbac_get_policy(manager, resource_name);
  if (!policy || !policy->is_active) return 1;  /* No policy = allow */

  if (user->role >= policy->required_role &&
      (user->permissions & policy->required_permissions)) {
    policy->allow_count++;
    fprintf(stderr, "[RBAC] Policy enforced: %s allowed\\n", resource_name);
    return 1;
  }

  policy->deny_count++;
  fprintf(stderr, "[RBAC] Policy enforced: %s denied\\n", resource_name);
  return 0;
}

fl_access_policy_t* freelang_rbac_get_policy(fl_rbac_manager_t *manager,
                                              const char *resource_name) {
  if (!manager || !resource_name) return NULL;

  pthread_mutex_lock(&manager->rbac_mutex);

  for (int i = 0; i < manager->policy_count; i++) {
    if (strcmp(manager->policies[i].resource_name, resource_name) == 0) {
      pthread_mutex_unlock(&manager->rbac_mutex);
      return &manager->policies[i];
    }
  }

  pthread_mutex_unlock(&manager->rbac_mutex);
  return NULL;
}

/* ===== Audit Logging ===== */

void freelang_rbac_log_access(fl_rbac_manager_t *manager,
                               const char *user_id,
                               const char *action,
                               const char *resource,
                               int success,
                               const char *reason) {
  if (!manager || !user_id || manager->audit_log_count >= 2048) return;

  pthread_mutex_lock(&manager->rbac_mutex);

  fl_audit_log_t *log = &manager->audit_logs[manager->audit_log_count];
  snprintf(log->audit_id, sizeof(log->audit_id), "aud_%d", manager->audit_log_count);
  strncpy(log->user_id, user_id, sizeof(log->user_id) - 1);
  strncpy(log->action, action, sizeof(log->action) - 1);
  strncpy(log->resource, resource, sizeof(log->resource) - 1);

  log->success = success;
  strncpy(log->reason, reason, sizeof(log->reason) - 1);
  log->timestamp = time(NULL);

  manager->audit_log_count++;

  pthread_mutex_unlock(&manager->rbac_mutex);

  fprintf(stderr, "[RBAC] Audit log: %s → %s (%s)\\n", user_id, resource,
          success ? "allowed" : "denied");
}

void freelang_rbac_get_audit_logs(fl_rbac_manager_t *manager,
                                   fl_audit_log_t **logs,
                                   int *count) {
  if (!manager || !logs || !count) return;

  pthread_mutex_lock(&manager->rbac_mutex);
  *logs = manager->audit_logs;
  *count = manager->audit_log_count;
  pthread_mutex_unlock(&manager->rbac_mutex);
}

void freelang_rbac_get_audit_logs_by_user(fl_rbac_manager_t *manager,
                                           const char *user_id,
                                           fl_audit_log_t **logs,
                                           int *count) {
  if (!manager || !user_id || !logs || !count) return;

  *count = 0;
  pthread_mutex_lock(&manager->rbac_mutex);

  for (int i = 0; i < manager->audit_log_count && *count < 512; i++) {
    if (strcmp(manager->audit_logs[i].user_id, user_id) == 0) {
      logs[(*count)++] = &manager->audit_logs[i];
    }
  }

  pthread_mutex_unlock(&manager->rbac_mutex);
}

void freelang_rbac_clear_audit_logs(fl_rbac_manager_t *manager) {
  if (!manager) return;

  pthread_mutex_lock(&manager->rbac_mutex);
  manager->audit_log_count = 0;
  memset(manager->audit_logs, 0, sizeof(manager->audit_logs));
  pthread_mutex_unlock(&manager->rbac_mutex);

  fprintf(stderr, "[RBAC] Audit logs cleared\\n");
}

/* ===== Statistics ===== */

fl_rbac_stats_t freelang_rbac_get_stats(fl_rbac_manager_t *manager) {
  fl_rbac_stats_t stats = {0, 0, 0, 0, 0, 0};

  if (!manager) return stats;

  pthread_mutex_lock(&manager->rbac_mutex);

  stats.total_users = manager->user_count;
  stats.total_policies = manager->policy_count;
  stats.audit_entries = manager->audit_log_count;

  for (int i = 0; i < manager->user_count; i++) {
    if (manager->users[i].is_active && !manager->users[i].is_suspended) {
      stats.active_users++;
    }
    if (manager->users[i].is_suspended) {
      stats.suspended_users++;
    }
  }

  for (int i = 0; i < manager->audit_log_count; i++) {
    if (!manager->audit_logs[i].success) {
      stats.failed_access_attempts++;
    }
  }

  pthread_mutex_unlock(&manager->rbac_mutex);

  fprintf(stderr, "[RBAC] Stats: users=%d, active=%d, policies=%d, audits=%d\\n",
          stats.total_users, stats.active_users, stats.total_policies, stats.audit_entries);

  return stats;
}

void freelang_rbac_reset_stats(fl_rbac_manager_t *manager) {
  if (!manager) return;

  pthread_mutex_lock(&manager->rbac_mutex);
  manager->user_count = 0;
  manager->policy_count = 0;
  manager->audit_log_count = 0;
  pthread_mutex_unlock(&manager->rbac_mutex);

  fprintf(stderr, "[RBAC] Statistics reset\\n");
}
