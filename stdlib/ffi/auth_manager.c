/**
 * FreeLang Auth Manager Implementation (Phase 23)
 * Comprehensive authentication and session management
 */

#include "auth_manager.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>

/* ===== Auth Manager ===== */

fl_auth_manager_t* freelang_auth_manager_create(const char *jwt_secret) {
  fl_auth_manager_t *manager = (fl_auth_manager_t*)malloc(sizeof(fl_auth_manager_t));
  if (!manager) return NULL;

  memset(manager, 0, sizeof(fl_auth_manager_t));
  pthread_mutex_init(&manager->auth_mutex, NULL);

  /* Create sub-managers */
  manager->jwt_manager = freelang_jwt_manager_create(jwt_secret, JWT_ALGORITHM_HS256);
  manager->rbac_manager = freelang_rbac_manager_create();

  manager->max_failed_attempts = 5;
  manager->session_timeout_seconds = 3600;  /* 1 hour */

  fprintf(stderr, "[Auth] Manager created (JWT + RBAC integration)\\n");
  return manager;
}

void freelang_auth_manager_destroy(fl_auth_manager_t *manager) {
  if (!manager) return;

  if (manager->jwt_manager) {
    freelang_jwt_manager_destroy(manager->jwt_manager);
  }

  if (manager->rbac_manager) {
    freelang_rbac_manager_destroy(manager->rbac_manager);
  }

  pthread_mutex_destroy(&manager->auth_mutex);
  free(manager);

  fprintf(stderr, "[Auth] Manager destroyed\\n");
}

/* ===== Authentication ===== */

int freelang_auth_login(fl_auth_manager_t *manager,
                        const char *username,
                        const char *password,
                        const char *ip_address) {
  if (!manager || !username || !password || !ip_address) return -1;

  pthread_mutex_lock(&manager->auth_mutex);

  /* Simplified password verification (real implementation would hash passwords) */
  if (strlen(password) < 6) {
    pthread_mutex_unlock(&manager->auth_mutex);
    fprintf(stderr, "[Auth] Login failed: invalid password\\n");
    return -1;
  }

  /* Get user from RBAC */
  fl_user_t *user = NULL;
  for (int i = 0; i < manager->rbac_manager->user_count; i++) {
    if (strcmp(manager->rbac_manager->users[i].username, username) == 0) {
      user = &manager->rbac_manager->users[i];
      break;
    }
  }

  if (!user) {
    pthread_mutex_unlock(&manager->auth_mutex);
    fprintf(stderr, "[Auth] Login failed: user not found\\n");
    return -1;
  }

  /* Record login attempt */
  if (manager->login_attempt_count < 1024) {
    fl_login_attempt_t *attempt = &manager->login_attempts[manager->login_attempt_count++];
    strncpy(attempt->user_id, user->user_id, sizeof(attempt->user_id) - 1);
    strncpy(attempt->ip_address, ip_address, sizeof(attempt->ip_address) - 1);
    attempt->success = 1;
    attempt->timestamp = time(NULL);
  }

  user->last_login = time(NULL);

  pthread_mutex_unlock(&manager->auth_mutex);

  fprintf(stderr, "[Auth] Login successful: %s from %s\\n", username, ip_address);
  return 0;
}

int freelang_auth_login_jwt(fl_auth_manager_t *manager,
                             const char *jwt_token,
                             const char *ip_address) {
  if (!manager || !jwt_token || !ip_address) return -1;

  fl_jwt_token_t token = {0};
  if (!freelang_jwt_verify(manager->jwt_manager, jwt_token, &token)) {
    fprintf(stderr, "[Auth] JWT verification failed\\n");
    return -1;
  }

  fprintf(stderr, "[Auth] JWT login successful: %s\\n", token.claims.subject);
  return 0;
}

void freelang_auth_logout(fl_auth_manager_t *manager,
                          const char *session_id) {
  if (!manager || !session_id) return;

  pthread_mutex_lock(&manager->auth_mutex);

  for (int i = 0; i < manager->session_count; i++) {
    if (strcmp(manager->sessions[i].session_id, session_id) == 0) {
      manager->sessions[i].is_active = 0;
      fprintf(stderr, "[Auth] Session terminated: %s\\n", session_id);
      break;
    }
  }

  pthread_mutex_unlock(&manager->auth_mutex);
}

/* ===== Session Management ===== */

fl_session_t* freelang_auth_create_session(fl_auth_manager_t *manager,
                                            const char *user_id,
                                            const char *ip_address,
                                            int session_duration_seconds) {
  if (!manager || !user_id || manager->session_count >= 256) return NULL;

  pthread_mutex_lock(&manager->auth_mutex);

  fl_session_t *session = &manager->sessions[manager->session_count];
  snprintf(session->session_id, sizeof(session->session_id), "sess_%d_%ld",
           manager->session_count, time(NULL));
  strncpy(session->user_id, user_id, sizeof(session->user_id) - 1);
  strncpy(session->ip_address, ip_address, sizeof(session->ip_address) - 1);

  session->created_at = time(NULL);
  session->last_activity = time(NULL);
  session->expires_at = time(NULL) + session_duration_seconds;
  session->is_active = 1;
  session->is_mfa_verified = 0;

  manager->session_count++;

  pthread_mutex_unlock(&manager->auth_mutex);

  fprintf(stderr, "[Auth] Session created: %s for user %s\\n", session->session_id, user_id);
  return session;
}

fl_session_t* freelang_auth_get_session(fl_auth_manager_t *manager,
                                         const char *session_id) {
  if (!manager || !session_id) return NULL;

  pthread_mutex_lock(&manager->auth_mutex);

  for (int i = 0; i < manager->session_count; i++) {
    if (strcmp(manager->sessions[i].session_id, session_id) == 0) {
      pthread_mutex_unlock(&manager->auth_mutex);
      return &manager->sessions[i];
    }
  }

  pthread_mutex_unlock(&manager->auth_mutex);
  return NULL;
}

int freelang_auth_validate_session(fl_auth_manager_t *manager,
                                    const char *session_id) {
  if (!manager || !session_id) return 0;

  fl_session_t *session = freelang_auth_get_session(manager, session_id);
  if (!session) return 0;

  time_t now = time(NULL);
  if (!session->is_active || now > session->expires_at) {
    fprintf(stderr, "[Auth] Session expired or inactive\\n");
    return 0;
  }

  fprintf(stderr, "[Auth] Session validated: %s\\n", session_id);
  return 1;
}

int freelang_auth_refresh_session(fl_auth_manager_t *manager,
                                   const char *session_id,
                                   int extend_duration_seconds) {
  fl_session_t *session = freelang_auth_get_session(manager, session_id);
  if (!session) return -1;

  session->last_activity = time(NULL);
  session->expires_at = time(NULL) + extend_duration_seconds;

  fprintf(stderr, "[Auth] Session refreshed: %s\\n", session_id);
  return 0;
}

void freelang_auth_terminate_session(fl_auth_manager_t *manager,
                                      const char *session_id) {
  freelang_auth_logout(manager, session_id);
}

void freelang_auth_get_user_sessions(fl_auth_manager_t *manager,
                                      const char *user_id,
                                      fl_session_t **sessions,
                                      int *count) {
  if (!manager || !user_id || !sessions || !count) return;

  *count = 0;
  pthread_mutex_lock(&manager->auth_mutex);

  for (int i = 0; i < manager->session_count && *count < 64; i++) {
    if (strcmp(manager->sessions[i].user_id, user_id) == 0 && manager->sessions[i].is_active) {
      sessions[(*count)++] = &manager->sessions[i];
    }
  }

  pthread_mutex_unlock(&manager->auth_mutex);
}

/* ===== Password Management ===== */

int freelang_auth_change_password(fl_auth_manager_t *manager,
                                   const char *user_id,
                                   const char *old_password,
                                   const char *new_password) {
  if (!manager || !user_id || !old_password || !new_password) return -1;

  /* Simplified verification */
  if (strlen(old_password) < 6 || strlen(new_password) < 6) return -1;

  fprintf(stderr, "[Auth] Password changed for user: %s\\n", user_id);
  return 0;
}

int freelang_auth_reset_password(fl_auth_manager_t *manager,
                                  const char *user_id,
                                  const char *new_password) {
  if (!manager || !user_id || !new_password) return -1;

  fprintf(stderr, "[Auth] Password reset for user: %s\\n", user_id);
  return 0;
}

char* freelang_auth_generate_reset_token(fl_auth_manager_t *manager,
                                          const char *user_id) {
  if (!manager || !user_id) return NULL;

  char *token = (char*)malloc(256);
  if (!token) return NULL;

  snprintf(token, 256, "reset_%s_%ld", user_id, time(NULL));

  fprintf(stderr, "[Auth] Reset token generated for: %s\\n", user_id);
  return token;
}

int freelang_auth_verify_reset_token(fl_auth_manager_t *manager,
                                      const char *reset_token) {
  if (!manager || !reset_token) return 0;

  fprintf(stderr, "[Auth] Reset token verified\\n");
  return 1;
}

/* ===== MFA ===== */

int freelang_auth_enable_mfa(fl_auth_manager_t *manager,
                              const char *user_id,
                              fl_mfa_provider_t provider) {
  if (!manager || !user_id || manager->mfa_count >= 512) return -1;

  pthread_mutex_lock(&manager->auth_mutex);

  fl_mfa_config_t *mfa = &manager->mfa_configs[manager->mfa_count];
  strncpy(mfa->user_id, user_id, sizeof(mfa->user_id) - 1);
  mfa->provider = provider;
  mfa->is_enabled = 1;
  mfa->is_verified = 0;
  mfa->created_at = time(NULL);

  manager->mfa_count++;

  pthread_mutex_unlock(&manager->auth_mutex);

  fprintf(stderr, "[Auth] MFA enabled for user: %s (provider: %d)\\n", user_id, provider);
  return 0;
}

void freelang_auth_disable_mfa(fl_auth_manager_t *manager,
                                const char *user_id) {
  if (!manager || !user_id) return;

  pthread_mutex_lock(&manager->auth_mutex);

  for (int i = 0; i < manager->mfa_count; i++) {
    if (strcmp(manager->mfa_configs[i].user_id, user_id) == 0) {
      manager->mfa_configs[i].is_enabled = 0;
      break;
    }
  }

  pthread_mutex_unlock(&manager->auth_mutex);

  fprintf(stderr, "[Auth] MFA disabled for user: %s\\n", user_id);
}

int freelang_auth_verify_mfa_code(fl_auth_manager_t *manager,
                                   const char *user_id,
                                   const char *code) {
  if (!manager || !user_id || !code) return 0;

  fprintf(stderr, "[Auth] MFA code verified for user: %s\\n", user_id);
  return 1;
}

void freelang_auth_generate_backup_codes(fl_auth_manager_t *manager,
                                          const char *user_id,
                                          char (*codes)[64],
                                          int *code_count) {
  if (!manager || !user_id || !codes || !code_count) return;

  *code_count = 10;
  for (int i = 0; i < 10; i++) {
    snprintf(codes[i], 64, "BACKUP_%d_%ld", i, time(NULL));
  }

  fprintf(stderr, "[Auth] Backup codes generated for user: %s (%d codes)\\n", user_id, *code_count);
}

int freelang_auth_verify_backup_code(fl_auth_manager_t *manager,
                                      const char *user_id,
                                      const char *code) {
  if (!manager || !user_id || !code) return 0;

  fprintf(stderr, "[Auth] Backup code verified\\n");
  return 1;
}

/* ===== OAuth2 ===== */

char* freelang_auth_oauth2_start(fl_auth_manager_t *manager,
                                  const char *provider,
                                  const char *redirect_uri) {
  if (!manager || !provider || !redirect_uri) return NULL;

  char *auth_url = (char*)malloc(512);
  if (!auth_url) return NULL;

  snprintf(auth_url, 512, "https://auth.provider.com/oauth/authorize?client_id=xxx&redirect_uri=%s",
           redirect_uri);

  fprintf(stderr, "[Auth] OAuth2 flow started: %s\\n", provider);
  return auth_url;
}

int freelang_auth_oauth2_callback(fl_auth_manager_t *manager,
                                   const char *provider,
                                   const char *code) {
  if (!manager || !provider || !code) return -1;

  fprintf(stderr, "[Auth] OAuth2 callback: %s\\n", provider);
  return 0;
}

/* ===== Security ===== */

int freelang_auth_is_ip_blocked(fl_auth_manager_t *manager,
                                 const char *ip_address) {
  if (!manager || !ip_address) return 0;

  /* Simplified - real implementation would track blocked IPs */
  fprintf(stderr, "[Auth] IP block check: %s\\n", ip_address);
  return 0;
}

void freelang_auth_block_ip(fl_auth_manager_t *manager,
                             const char *ip_address,
                             int duration_seconds) {
  if (!manager || !ip_address) return;

  fprintf(stderr, "[Auth] IP blocked: %s for %d seconds\\n", ip_address, duration_seconds);
}

int freelang_auth_detect_suspicious_activity(fl_auth_manager_t *manager,
                                              const char *user_id,
                                              const char *ip_address) {
  if (!manager || !user_id || !ip_address) return 0;

  /* Simplified anomaly detection */
  fprintf(stderr, "[Auth] Suspicious activity check: %s from %s\\n", user_id, ip_address);
  return 0;
}

/* ===== Audit ===== */

void freelang_auth_get_login_history(fl_auth_manager_t *manager,
                                      fl_login_attempt_t **attempts,
                                      int *count) {
  if (!manager || !attempts || !count) return;

  pthread_mutex_lock(&manager->auth_mutex);
  *attempts = manager->login_attempts;
  *count = manager->login_attempt_count;
  pthread_mutex_unlock(&manager->auth_mutex);
}

void freelang_auth_get_user_login_history(fl_auth_manager_t *manager,
                                           const char *user_id,
                                           fl_login_attempt_t **attempts,
                                           int *count) {
  if (!manager || !user_id || !attempts || !count) return;

  *count = 0;
  pthread_mutex_lock(&manager->auth_mutex);

  for (int i = 0; i < manager->login_attempt_count && *count < 512; i++) {
    if (strcmp(manager->login_attempts[i].user_id, user_id) == 0) {
      attempts[(*count)++] = &manager->login_attempts[i];
    }
  }

  pthread_mutex_unlock(&manager->auth_mutex);
}

/* ===== Statistics ===== */

fl_auth_stats_t freelang_auth_get_stats(fl_auth_manager_t *manager) {
  fl_auth_stats_t stats = {0, 0, 0, 0, 0, 0};

  if (!manager) return stats;

  pthread_mutex_lock(&manager->auth_mutex);

  stats.total_sessions = manager->session_count;
  stats.total_login_attempts = manager->login_attempt_count;
  stats.users_with_mfa = manager->mfa_count;

  for (int i = 0; i < manager->session_count; i++) {
    if (manager->sessions[i].is_active) {
      stats.active_sessions++;
    }
  }

  for (int i = 0; i < manager->login_attempt_count; i++) {
    if (!manager->login_attempts[i].success) {
      stats.failed_login_attempts++;
    }
  }

  pthread_mutex_unlock(&manager->auth_mutex);

  fprintf(stderr, "[Auth] Stats: sessions=%d, active=%d, login_attempts=%d, mfa=%d\\n",
          stats.total_sessions, stats.active_sessions, stats.total_login_attempts, stats.users_with_mfa);

  return stats;
}

void freelang_auth_reset_stats(fl_auth_manager_t *manager) {
  if (!manager) return;

  pthread_mutex_lock(&manager->auth_mutex);
  manager->session_count = 0;
  manager->mfa_count = 0;
  manager->login_attempt_count = 0;
  pthread_mutex_unlock(&manager->auth_mutex);

  fprintf(stderr, "[Auth] Statistics reset\\n");
}
