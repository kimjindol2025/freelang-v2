/**
 * FreeLang OAuth2 User Provisioning & RBAC Integration (Phase 25-4)
 * Auto user creation, profile mapping, and role assignment
 */

#ifndef FREELANG_OAUTH2_USER_PROVISIONING_H
#define FREELANG_OAUTH2_USER_PROVISIONING_H

#include <time.h>
#include <pthread.h>

/* ===== Social to Local User Mapping ===== */

typedef enum {
  ROLE_AUTO_GUEST = 0,     /* Auto-assign GUEST for new social users */
  ROLE_AUTO_USER = 1,      /* Auto-assign USER for new social users */
  ROLE_AUTO_PREMIUM = 2,   /* Auto-assign PREMIUM for verified emails */
  ROLE_DOMAIN_BASED = 3    /* Assign based on email domain */
} fl_user_provisioning_strategy_t;

/* ===== User Provisioning Policy ===== */

typedef struct {
  fl_user_provisioning_strategy_t strategy;

  int auto_create_user;        /* Auto-create user on first OAuth2 login */
  int auto_assign_role;        /* Auto-assign role based on strategy */
  int sync_profile_data;       /* Sync profile info from provider */
  int verify_email;            /* Require email verification */

  char default_role[64];       /* Default role if not matched (USER) */
  char premium_email_domain[256];  /* Email domain for PREMIUM role (e.g., "company.com") */

  int64_t created_at;
} fl_user_provisioning_policy_t;

/* ===== Provisioned User Record ===== */

typedef struct {
  char user_id[256];           /* Local FreeLang user ID */
  char email[256];
  char username[256];
  char display_name[256];
  char avatar_url[512];

  char role[64];               /* Assigned role */
  char status[64];             /* ACTIVE, SUSPENDED, DELETED */

  int email_verified;
  int profile_complete;

  int64_t created_at;
  int64_t last_login;
  int64_t last_profile_sync;

  int is_social_only;          /* User created via OAuth2 (no password) */
} fl_provisioned_user_t;

/* ===== Email Domain to Role Mapping ===== */

typedef struct {
  char email_domain[256];      /* e.g., "example.com" */
  char assigned_role[64];      /* Role to assign for this domain */
  int is_active;
} fl_domain_role_mapping_t;

/* ===== Provisioning Manager ===== */

typedef struct {
  fl_user_provisioning_policy_t policy;

  fl_provisioned_user_t users[1024];     /* Provisioned users */
  int user_count;

  fl_domain_role_mapping_t domain_mappings[64];  /* Email domain to role mappings */
  int domain_mapping_count;

  /* Social provider user mappings */
  char social_mappings[512][256];  /* Maps social_provider_id to freelang_user_id */
  int social_mapping_count;

  /* Statistics */
  int total_users_created;
  int total_auto_role_assigned;
  int total_profile_syncs;
  int total_users_suspended;

  pthread_mutex_t provisioning_mutex;
} fl_user_provisioning_manager_t;

/* ===== Public API: Manager ===== */

/* Create provisioning manager */
fl_user_provisioning_manager_t* freelang_oauth2_provisioning_create(
    fl_user_provisioning_strategy_t strategy);

/* Destroy provisioning manager */
void freelang_oauth2_provisioning_destroy(fl_user_provisioning_manager_t *manager);

/* ===== Policy Configuration ===== */

/* Set provisioning policy */
int freelang_oauth2_set_provisioning_policy(fl_user_provisioning_manager_t *manager,
                                             fl_user_provisioning_strategy_t strategy,
                                             int auto_create,
                                             int auto_assign_role);

/* Map email domain to role */
int freelang_oauth2_add_domain_role_mapping(fl_user_provisioning_manager_t *manager,
                                             const char *email_domain,
                                             const char *role);

/* ===== User Auto-Provisioning ===== */

/* Auto-create user from social profile */
int freelang_oauth2_auto_provision_user(fl_user_provisioning_manager_t *manager,
                                         const char *email,
                                         const char *display_name,
                                         const char *avatar_url,
                                         const char *social_provider_id,
                                         char *out_user_id,
                                         int max_user_id_len);

/* Get or create user (idempotent) */
fl_provisioned_user_t* freelang_oauth2_get_or_create_user(fl_user_provisioning_manager_t *manager,
                                                           const char *email,
                                                           const char *display_name);

/* Get user by ID */
fl_provisioned_user_t* freelang_oauth2_get_user(fl_user_provisioning_manager_t *manager,
                                                 const char *user_id);

/* Get user by email */
fl_provisioned_user_t* freelang_oauth2_get_user_by_email(fl_user_provisioning_manager_t *manager,
                                                          const char *email);

/* ===== Profile Sync ===== */

/* Sync social profile to local user */
int freelang_oauth2_sync_user_profile(fl_user_provisioning_manager_t *manager,
                                       const char *user_id,
                                       const char *email,
                                       const char *display_name,
                                       const char *avatar_url);

/* Update user status */
int freelang_oauth2_update_user_status(fl_user_provisioning_manager_t *manager,
                                        const char *user_id,
                                        const char *status);

/* Update user role (admin operation) */
int freelang_oauth2_update_user_role(fl_user_provisioning_manager_t *manager,
                                      const char *user_id,
                                      const char *new_role);

/* ===== Auto Role Assignment ===== */

/* Assign role based on email domain and policy */
int freelang_oauth2_assign_role_auto(fl_user_provisioning_manager_t *manager,
                                      const char *email,
                                      char *out_role,
                                      int max_role_len);

/* Determine role for new user */
const char* freelang_oauth2_determine_user_role(fl_user_provisioning_manager_t *manager,
                                                 const char *email,
                                                 int email_verified);

/* ===== Social Account Mapping ===== */

/* Link social provider account to FreeLang user */
int freelang_oauth2_link_social_account(fl_user_provisioning_manager_t *manager,
                                         const char *user_id,
                                         const char *social_provider_id);

/* Get FreeLang user from social provider ID */
char* freelang_oauth2_get_user_from_social_id(fl_user_provisioning_manager_t *manager,
                                               const char *social_provider_id);

/* Get all social accounts for user */
void freelang_oauth2_get_user_social_accounts(fl_user_provisioning_manager_t *manager,
                                               const char *user_id,
                                               char **social_ids,
                                               int *count);

/* ===== User Management ===== */

/* Suspend user account */
int freelang_oauth2_suspend_user(fl_user_provisioning_manager_t *manager,
                                  const char *user_id);

/* Reactivate user account */
int freelang_oauth2_reactivate_user(fl_user_provisioning_manager_t *manager,
                                     const char *user_id);

/* Delete user account (logical delete) */
int freelang_oauth2_delete_user(fl_user_provisioning_manager_t *manager,
                                 const char *user_id);

/* Record user login */
int freelang_oauth2_record_user_login(fl_user_provisioning_manager_t *manager,
                                       const char *user_id);

/* ===== Statistics ===== */

typedef struct {
  int total_users_created;
  int total_auto_role_assigned;
  int total_profile_syncs;
  int total_users_suspended;
  int active_users;
  int social_only_users;
  int domain_mappings_configured;
} fl_user_provisioning_stats_t;

/* Get provisioning statistics */
fl_user_provisioning_stats_t freelang_oauth2_provisioning_get_stats(fl_user_provisioning_manager_t *manager);

/* ===== Email Domain Analysis ===== */

/* Extract domain from email */
int freelang_oauth2_extract_email_domain(const char *email,
                                          char *out_domain,
                                          int max_domain_len);

#endif /* FREELANG_OAUTH2_USER_PROVISIONING_H */
