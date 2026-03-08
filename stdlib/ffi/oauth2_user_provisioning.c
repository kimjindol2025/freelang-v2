/**
 * FreeLang OAuth2 User Provisioning & RBAC Integration Implementation (Phase 25-4)
 * Auto user creation, profile mapping, and role assignment
 */

#include "oauth2_user_provisioning.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>

/* ===== Manager Lifecycle ===== */

fl_user_provisioning_manager_t* freelang_oauth2_provisioning_create(
    fl_user_provisioning_strategy_t strategy) {
  fl_user_provisioning_manager_t *manager = (fl_user_provisioning_manager_t*)malloc(sizeof(fl_user_provisioning_manager_t));
  if (!manager) return NULL;

  memset(manager, 0, sizeof(fl_user_provisioning_manager_t));
  pthread_mutex_init(&manager->provisioning_mutex, NULL);

  manager->policy.strategy = strategy;
  manager->policy.auto_create_user = 1;
  manager->policy.auto_assign_role = 1;
  manager->policy.sync_profile_data = 1;
  manager->policy.verify_email = 1;

  strcpy(manager->policy.default_role, "USER");
  strcpy(manager->policy.premium_email_domain, "company.com");

  manager->policy.created_at = time(NULL);

  fprintf(stderr, "[UserProvisioning] Manager created (strategy=%d)\n", strategy);
  return manager;
}

void freelang_oauth2_provisioning_destroy(fl_user_provisioning_manager_t *manager) {
  if (!manager) return;

  pthread_mutex_destroy(&manager->provisioning_mutex);
  free(manager);

  fprintf(stderr, "[UserProvisioning] Manager destroyed\n");
}

/* ===== Policy Configuration ===== */

int freelang_oauth2_set_provisioning_policy(fl_user_provisioning_manager_t *manager,
                                             fl_user_provisioning_strategy_t strategy,
                                             int auto_create,
                                             int auto_assign_role) {
  if (!manager) return -1;

  pthread_mutex_lock(&manager->provisioning_mutex);

  manager->policy.strategy = strategy;
  manager->policy.auto_create_user = auto_create;
  manager->policy.auto_assign_role = auto_assign_role;

  pthread_mutex_unlock(&manager->provisioning_mutex);

  fprintf(stderr, "[UserProvisioning] Policy updated (auto_create=%d, auto_assign_role=%d)\n",
          auto_create, auto_assign_role);
  return 0;
}

int freelang_oauth2_add_domain_role_mapping(fl_user_provisioning_manager_t *manager,
                                             const char *email_domain,
                                             const char *role) {
  if (!manager || !email_domain || !role) return -1;
  if (manager->domain_mapping_count >= 64) return -1;

  pthread_mutex_lock(&manager->provisioning_mutex);

  fl_domain_role_mapping_t *mapping = &manager->domain_mappings[manager->domain_mapping_count];
  strncpy(mapping->email_domain, email_domain, sizeof(mapping->email_domain) - 1);
  strncpy(mapping->assigned_role, role, sizeof(mapping->assigned_role) - 1);
  mapping->is_active = 1;

  manager->domain_mapping_count++;

  pthread_mutex_unlock(&manager->provisioning_mutex);

  fprintf(stderr, "[UserProvisioning] Domain mapping created: %s -> %s\n", email_domain, role);
  return 0;
}

/* ===== Helper: Email Domain Extraction ===== */

int freelang_oauth2_extract_email_domain(const char *email,
                                          char *out_domain,
                                          int max_domain_len) {
  if (!email || !out_domain) return -1;

  const char *at = strchr(email, '@');
  if (!at) return -1;

  const char *domain = at + 1;
  int domain_len = strlen(domain);

  if (domain_len >= max_domain_len) return -1;

  strcpy(out_domain, domain);
  return 0;
}

/* ===== Auto Role Assignment ===== */

const char* freelang_oauth2_determine_user_role(fl_user_provisioning_manager_t *manager,
                                                 const char *email,
                                                 int email_verified) {
  if (!manager || !email) return "GUEST";

  pthread_mutex_lock(&manager->provisioning_mutex);

  /* Extract email domain */
  char domain[256] = {0};
  freelang_oauth2_extract_email_domain(email, domain, sizeof(domain));

  /* Check domain mappings */
  for (int i = 0; i < manager->domain_mapping_count; i++) {
    if (manager->domain_mappings[i].is_active &&
        strcmp(manager->domain_mappings[i].email_domain, domain) == 0) {
      const char *role = manager->domain_mappings[i].assigned_role;
      pthread_mutex_unlock(&manager->provisioning_mutex);
      return role;
    }
  }

  /* Check premium domain */
  if (email_verified && strcmp(domain, manager->policy.premium_email_domain) == 0) {
    pthread_mutex_unlock(&manager->provisioning_mutex);
    return "PREMIUM";
  }

  /* Default role */
  const char *default_role = manager->policy.default_role;
  pthread_mutex_unlock(&manager->provisioning_mutex);
  return default_role;
}

int freelang_oauth2_assign_role_auto(fl_user_provisioning_manager_t *manager,
                                      const char *email,
                                      char *out_role,
                                      int max_role_len) {
  if (!manager || !email || !out_role) return -1;

  const char *role = freelang_oauth2_determine_user_role(manager, email, 1);
  if (!role) return -1;

  strncpy(out_role, role, max_role_len - 1);

  fprintf(stderr, "[UserProvisioning] Role assigned: %s\n", role);
  return 0;
}

/* ===== User Auto-Provisioning ===== */

int freelang_oauth2_auto_provision_user(fl_user_provisioning_manager_t *manager,
                                         const char *email,
                                         const char *display_name,
                                         const char *avatar_url,
                                         const char *social_provider_id,
                                         char *out_user_id,
                                         int max_user_id_len) {
  if (!manager || !email || !out_user_id) return -1;

  pthread_mutex_lock(&manager->provisioning_mutex);

  if (manager->user_count >= 1024) {
    pthread_mutex_unlock(&manager->provisioning_mutex);
    return -1;
  }

  /* Generate user ID */
  snprintf(out_user_id, max_user_id_len, "user_%ld_%d", time(NULL), manager->user_count);

  /* Create user record */
  fl_provisioned_user_t *user = &manager->users[manager->user_count];
  strncpy(user->user_id, out_user_id, sizeof(user->user_id) - 1);
  strncpy(user->email, email, sizeof(user->email) - 1);

  if (display_name) {
    strncpy(user->display_name, display_name, sizeof(user->display_name) - 1);
  }

  if (avatar_url) {
    strncpy(user->avatar_url, avatar_url, sizeof(user->avatar_url) - 1);
  }

  /* Assign role */
  const char *role = freelang_oauth2_determine_user_role(manager, email, 1);
  if (role) {
    strncpy(user->role, role, sizeof(user->role) - 1);
    manager->total_auto_role_assigned++;
  } else {
    strcpy(user->role, "USER");
  }

  strcpy(user->status, "ACTIVE");
  user->email_verified = 1;
  user->is_social_only = 1;
  user->created_at = time(NULL);
  user->last_login = time(NULL);

  manager->user_count++;
  manager->total_users_created++;

  /* Link to social provider */
  if (social_provider_id && manager->social_mapping_count < 512) {
    strncpy(manager->social_mappings[manager->social_mapping_count], social_provider_id, 255);
    manager->social_mapping_count++;
  }

  pthread_mutex_unlock(&manager->provisioning_mutex);

  fprintf(stderr, "[UserProvisioning] User auto-provisioned (user_id=%s, email=%s, role=%s)\n",
          out_user_id, email, user->role);
  return 0;
}

fl_provisioned_user_t* freelang_oauth2_get_or_create_user(fl_user_provisioning_manager_t *manager,
                                                           const char *email,
                                                           const char *display_name) {
  if (!manager || !email) return NULL;

  pthread_mutex_lock(&manager->provisioning_mutex);

  /* Check if user exists */
  for (int i = 0; i < manager->user_count; i++) {
    if (strcmp(manager->users[i].email, email) == 0) {
      pthread_mutex_unlock(&manager->provisioning_mutex);
      return &manager->users[i];
    }
  }

  if (manager->user_count >= 1024) {
    pthread_mutex_unlock(&manager->provisioning_mutex);
    return NULL;
  }

  /* Create new user */
  fl_provisioned_user_t *user = &manager->users[manager->user_count];

  snprintf(user->user_id, sizeof(user->user_id), "user_%ld_%d", time(NULL), manager->user_count);
  strncpy(user->email, email, sizeof(user->email) - 1);

  if (display_name) {
    strncpy(user->display_name, display_name, sizeof(user->display_name) - 1);
  }

  const char *role = freelang_oauth2_determine_user_role(manager, email, 0);
  strncpy(user->role, role, sizeof(user->role) - 1);

  strcpy(user->status, "ACTIVE");
  user->is_social_only = 1;
  user->created_at = time(NULL);
  user->last_login = time(NULL);

  manager->user_count++;
  manager->total_users_created++;

  pthread_mutex_unlock(&manager->provisioning_mutex);

  fprintf(stderr, "[UserProvisioning] User created (user_id=%s, email=%s)\n", user->user_id, email);
  return user;
}

fl_provisioned_user_t* freelang_oauth2_get_user(fl_user_provisioning_manager_t *manager,
                                                 const char *user_id) {
  if (!manager || !user_id) return NULL;

  pthread_mutex_lock(&manager->provisioning_mutex);

  for (int i = 0; i < manager->user_count; i++) {
    if (strcmp(manager->users[i].user_id, user_id) == 0) {
      pthread_mutex_unlock(&manager->provisioning_mutex);
      return &manager->users[i];
    }
  }

  pthread_mutex_unlock(&manager->provisioning_mutex);
  return NULL;
}

fl_provisioned_user_t* freelang_oauth2_get_user_by_email(fl_user_provisioning_manager_t *manager,
                                                          const char *email) {
  if (!manager || !email) return NULL;

  pthread_mutex_lock(&manager->provisioning_mutex);

  for (int i = 0; i < manager->user_count; i++) {
    if (strcmp(manager->users[i].email, email) == 0) {
      pthread_mutex_unlock(&manager->provisioning_mutex);
      return &manager->users[i];
    }
  }

  pthread_mutex_unlock(&manager->provisioning_mutex);
  return NULL;
}

/* ===== Profile Sync ===== */

int freelang_oauth2_sync_user_profile(fl_user_provisioning_manager_t *manager,
                                       const char *user_id,
                                       const char *email,
                                       const char *display_name,
                                       const char *avatar_url) {
  if (!manager || !user_id) return -1;

  pthread_mutex_lock(&manager->provisioning_mutex);

  fl_provisioned_user_t *user = NULL;
  for (int i = 0; i < manager->user_count; i++) {
    if (strcmp(manager->users[i].user_id, user_id) == 0) {
      user = &manager->users[i];
      break;
    }
  }

  if (!user) {
    pthread_mutex_unlock(&manager->provisioning_mutex);
    return -1;
  }

  if (email) {
    strncpy(user->email, email, sizeof(user->email) - 1);
  }

  if (display_name) {
    strncpy(user->display_name, display_name, sizeof(user->display_name) - 1);
  }

  if (avatar_url) {
    strncpy(user->avatar_url, avatar_url, sizeof(user->avatar_url) - 1);
  }

  user->profile_complete = 1;
  user->last_profile_sync = time(NULL);
  manager->total_profile_syncs++;

  pthread_mutex_unlock(&manager->provisioning_mutex);

  fprintf(stderr, "[UserProvisioning] User profile synced (user_id=%s)\n", user_id);
  return 0;
}

int freelang_oauth2_update_user_status(fl_user_provisioning_manager_t *manager,
                                        const char *user_id,
                                        const char *status) {
  if (!manager || !user_id || !status) return -1;

  pthread_mutex_lock(&manager->provisioning_mutex);

  fl_provisioned_user_t *user = NULL;
  for (int i = 0; i < manager->user_count; i++) {
    if (strcmp(manager->users[i].user_id, user_id) == 0) {
      user = &manager->users[i];
      break;
    }
  }

  if (!user) {
    pthread_mutex_unlock(&manager->provisioning_mutex);
    return -1;
  }

  strncpy(user->status, status, sizeof(user->status) - 1);

  pthread_mutex_unlock(&manager->provisioning_mutex);

  fprintf(stderr, "[UserProvisioning] User status updated (user_id=%s, status=%s)\n", user_id, status);
  return 0;
}

int freelang_oauth2_update_user_role(fl_user_provisioning_manager_t *manager,
                                      const char *user_id,
                                      const char *new_role) {
  if (!manager || !user_id || !new_role) return -1;

  pthread_mutex_lock(&manager->provisioning_mutex);

  fl_provisioned_user_t *user = NULL;
  for (int i = 0; i < manager->user_count; i++) {
    if (strcmp(manager->users[i].user_id, user_id) == 0) {
      user = &manager->users[i];
      break;
    }
  }

  if (!user) {
    pthread_mutex_unlock(&manager->provisioning_mutex);
    return -1;
  }

  strncpy(user->role, new_role, sizeof(user->role) - 1);

  pthread_mutex_unlock(&manager->provisioning_mutex);

  fprintf(stderr, "[UserProvisioning] User role updated (user_id=%s, role=%s)\n", user_id, new_role);
  return 0;
}

/* ===== Social Account Mapping ===== */

int freelang_oauth2_link_social_account(fl_user_provisioning_manager_t *manager,
                                         const char *user_id,
                                         const char *social_provider_id) {
  if (!manager || !user_id || !social_provider_id) return -1;

  pthread_mutex_lock(&manager->provisioning_mutex);

  if (manager->social_mapping_count >= 512) {
    pthread_mutex_unlock(&manager->provisioning_mutex);
    return -1;
  }

  /* Store mapping: social_provider_id -> user_id */
  snprintf(manager->social_mappings[manager->social_mapping_count], 256,
           "%s:%s", social_provider_id, user_id);

  manager->social_mapping_count++;

  pthread_mutex_unlock(&manager->provisioning_mutex);

  fprintf(stderr, "[UserProvisioning] Social account linked (user_id=%s, provider_id=%s)\n",
          user_id, social_provider_id);
  return 0;
}

char* freelang_oauth2_get_user_from_social_id(fl_user_provisioning_manager_t *manager,
                                               const char *social_provider_id) {
  if (!manager || !social_provider_id) return NULL;

  pthread_mutex_lock(&manager->provisioning_mutex);

  for (int i = 0; i < manager->social_mapping_count; i++) {
    char *mapping = manager->social_mappings[i];
    const char *colon = strchr(mapping, ':');
    if (colon && strncmp(mapping, social_provider_id, colon - mapping) == 0) {
      char *user_id = (char*)malloc(256);
      if (user_id) {
        strcpy(user_id, colon + 1);
      }

      pthread_mutex_unlock(&manager->provisioning_mutex);
      return user_id;
    }
  }

  pthread_mutex_unlock(&manager->provisioning_mutex);
  return NULL;
}

void freelang_oauth2_get_user_social_accounts(fl_user_provisioning_manager_t *manager,
                                               const char *user_id,
                                               char **social_ids,
                                               int *count) {
  if (!manager || !user_id || !social_ids || !count) return;

  *count = 0;
  pthread_mutex_lock(&manager->provisioning_mutex);

  for (int i = 0; i < manager->social_mapping_count && *count < 4; i++) {
    char *mapping = manager->social_mappings[i];
    const char *colon = strchr(mapping, ':');
    if (colon && strcmp(colon + 1, user_id) == 0) {
      social_ids[(*count)++] = mapping;  /* Points to provider_id before colon */
    }
  }

  pthread_mutex_unlock(&manager->provisioning_mutex);
}

/* ===== User Management ===== */

int freelang_oauth2_suspend_user(fl_user_provisioning_manager_t *manager,
                                  const char *user_id) {
  return freelang_oauth2_update_user_status(manager, user_id, "SUSPENDED");
}

int freelang_oauth2_reactivate_user(fl_user_provisioning_manager_t *manager,
                                     const char *user_id) {
  return freelang_oauth2_update_user_status(manager, user_id, "ACTIVE");
}

int freelang_oauth2_delete_user(fl_user_provisioning_manager_t *manager,
                                 const char *user_id) {
  return freelang_oauth2_update_user_status(manager, user_id, "DELETED");
}

int freelang_oauth2_record_user_login(fl_user_provisioning_manager_t *manager,
                                       const char *user_id) {
  if (!manager || !user_id) return -1;

  pthread_mutex_lock(&manager->provisioning_mutex);

  fl_provisioned_user_t *user = NULL;
  for (int i = 0; i < manager->user_count; i++) {
    if (strcmp(manager->users[i].user_id, user_id) == 0) {
      user = &manager->users[i];
      break;
    }
  }

  if (!user) {
    pthread_mutex_unlock(&manager->provisioning_mutex);
    return -1;
  }

  user->last_login = time(NULL);

  pthread_mutex_unlock(&manager->provisioning_mutex);

  return 0;
}

/* ===== Statistics ===== */

fl_user_provisioning_stats_t freelang_oauth2_provisioning_get_stats(fl_user_provisioning_manager_t *manager) {
  fl_user_provisioning_stats_t stats = {0, 0, 0, 0, 0, 0, 0};

  if (!manager) return stats;

  pthread_mutex_lock(&manager->provisioning_mutex);

  stats.total_users_created = manager->total_users_created;
  stats.total_auto_role_assigned = manager->total_auto_role_assigned;
  stats.total_profile_syncs = manager->total_profile_syncs;
  stats.domain_mappings_configured = manager->domain_mapping_count;

  /* Count active and social-only users */
  for (int i = 0; i < manager->user_count; i++) {
    if (strcmp(manager->users[i].status, "ACTIVE") == 0) {
      stats.active_users++;
    }
    if (manager->users[i].is_social_only) {
      stats.social_only_users++;
    }
    if (strcmp(manager->users[i].status, "SUSPENDED") == 0) {
      stats.total_users_suspended++;
    }
  }

  pthread_mutex_unlock(&manager->provisioning_mutex);

  return stats;
}
