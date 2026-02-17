/**
 * FreeLang RBAC System (Phase 23)
 * Role-Based Access Control and permission management
 */

#ifndef FREELANG_RBAC_H
#define FREELANG_RBAC_H

#include <pthread.h>

/* ===== Roles ===== */

typedef enum {
  ROLE_GUEST = 0,        /* No permissions */
  ROLE_USER = 1,         /* Basic read permissions */
  ROLE_OPERATOR = 2,     /* Read/write operations */
  ROLE_ADMIN = 3,        /* Full access */
  ROLE_SUPERUSER = 4     /* System administration */
} fl_rbac_role_t;

/* ===== Permissions ===== */

typedef enum {
  PERM_READ = 1,         /* Read data */
  PERM_WRITE = 2,        /* Write data */
  PERM_DELETE = 4,       /* Delete data */
  PERM_EXECUTE = 8,      /* Execute operations */
  PERM_ADMIN = 16,       /* Administrative actions */
  PERM_AUDIT = 32        /* Access logs and monitoring */
} fl_permission_t;

/* ===== User ===== */

typedef struct {
  char user_id[256];              /* Unique user identifier */
  char username[256];
  char email[256];

  fl_rbac_role_t role;

  int permissions;                /* Bitmask of permissions */
  int64_t created_at;
  int64_t last_login;

  int is_active;
  int is_suspended;
} fl_user_t;

/* ===== Role Definition ===== */

typedef struct {
  fl_rbac_role_t role;
  char role_name[128];
  char description[512];

  int permissions;                /* Bitmask of permissions */
  int priority;                   /* Higher = more privileged */

  int user_count;                 /* Users with this role */
} fl_role_definition_t;

/* ===== Access Policy ===== */

typedef struct {
  char policy_id[33];
  char resource_name[256];        /* Resource being protected */
  fl_rbac_role_t required_role;
  int required_permissions;       /* Bitmask */

  int deny_count;                 /* Failed access attempts */
  int allow_count;                /* Successful access */

  int64_t created_at;
  int is_active;
} fl_access_policy_t;

/* ===== Audit Log ===== */

typedef struct {
  char audit_id[33];
  char user_id[256];
  char action[256];               /* Action performed */
  char resource[256];             /* Resource accessed */

  int success;                    /* 1 = allowed, 0 = denied */
  char reason[512];               /* Reason for deny */

  int64_t timestamp;
} fl_audit_log_t;

/* ===== RBAC Manager ===== */

typedef struct {
  fl_user_t users[512];           /* User registry (max 512) */
  int user_count;

  fl_role_definition_t roles[8];  /* Role definitions */
  int role_count;

  fl_access_policy_t policies[256];  /* Access policies */
  int policy_count;

  fl_audit_log_t audit_logs[2048];   /* Audit logs */
  int audit_log_count;

  pthread_mutex_t rbac_mutex;
} fl_rbac_manager_t;

/* ===== Public API: Manager ===== */

/* Create RBAC manager */
fl_rbac_manager_t* freelang_rbac_manager_create(void);

/* Destroy manager */
void freelang_rbac_manager_destroy(fl_rbac_manager_t *manager);

/* ===== Public API: User Management ===== */

/* Register user */
int freelang_rbac_register_user(fl_rbac_manager_t *manager,
                                const char *username,
                                const char *email,
                                fl_rbac_role_t role);

/* Get user by ID */
fl_user_t* freelang_rbac_get_user(fl_rbac_manager_t *manager,
                                   const char *user_id);

/* Update user role */
int freelang_rbac_update_user_role(fl_rbac_manager_t *manager,
                                    const char *user_id,
                                    fl_rbac_role_t new_role);

/* Suspend user */
void freelang_rbac_suspend_user(fl_rbac_manager_t *manager,
                                 const char *user_id);

/* Activate user */
void freelang_rbac_activate_user(fl_rbac_manager_t *manager,
                                  const char *user_id);

/* Delete user */
int freelang_rbac_delete_user(fl_rbac_manager_t *manager,
                               const char *user_id);

/* ===== Public API: Role Management ===== */

/* Define role */
int freelang_rbac_define_role(fl_rbac_manager_t *manager,
                               fl_rbac_role_t role,
                               const char *role_name,
                               int permissions);

/* Get role definition */
fl_role_definition_t* freelang_rbac_get_role(fl_rbac_manager_t *manager,
                                              fl_rbac_role_t role);

/* Grant permission to role */
void freelang_rbac_grant_permission(fl_rbac_manager_t *manager,
                                     fl_rbac_role_t role,
                                     fl_permission_t permission);

/* Revoke permission from role */
void freelang_rbac_revoke_permission(fl_rbac_manager_t *manager,
                                      fl_rbac_role_t role,
                                      fl_permission_t permission);

/* Check if role has permission */
int freelang_rbac_role_has_permission(fl_rbac_manager_t *manager,
                                       fl_rbac_role_t role,
                                       fl_permission_t permission);

/* ===== Public API: Access Control ===== */

/* Check access (user + resource + permission) */
int freelang_rbac_check_access(fl_rbac_manager_t *manager,
                                const char *user_id,
                                const char *resource,
                                fl_permission_t required_permission);

/* Create access policy */
int freelang_rbac_create_policy(fl_rbac_manager_t *manager,
                                 const char *resource_name,
                                 fl_rbac_role_t required_role,
                                 int required_permissions);

/* Enforce policy */
int freelang_rbac_enforce_policy(fl_rbac_manager_t *manager,
                                  const char *user_id,
                                  const char *resource_name);

/* Get policy for resource */
fl_access_policy_t* freelang_rbac_get_policy(fl_rbac_manager_t *manager,
                                              const char *resource_name);

/* ===== Public API: Audit Logging ===== */

/* Log access attempt */
void freelang_rbac_log_access(fl_rbac_manager_t *manager,
                               const char *user_id,
                               const char *action,
                               const char *resource,
                               int success,
                               const char *reason);

/* Get audit logs */
void freelang_rbac_get_audit_logs(fl_rbac_manager_t *manager,
                                   fl_audit_log_t **logs,
                                   int *count);

/* Get audit logs by user */
void freelang_rbac_get_audit_logs_by_user(fl_rbac_manager_t *manager,
                                           const char *user_id,
                                           fl_audit_log_t **logs,
                                           int *count);

/* Clear audit logs */
void freelang_rbac_clear_audit_logs(fl_rbac_manager_t *manager);

/* ===== Public API: Statistics ===== */

typedef struct {
  int total_users;
  int active_users;
  int suspended_users;
  int total_policies;
  int audit_entries;
  int failed_access_attempts;
} fl_rbac_stats_t;

/* Get RBAC statistics */
fl_rbac_stats_t freelang_rbac_get_stats(fl_rbac_manager_t *manager);

/* Reset statistics */
void freelang_rbac_reset_stats(fl_rbac_manager_t *manager);

#endif /* FREELANG_RBAC_H */
