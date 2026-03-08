/**
 * FreeLang Authentication Manager (Phase 23)
 * Integrated authentication, session management, and MFA
 */

#ifndef FREELANG_AUTH_MANAGER_H
#define FREELANG_AUTH_MANAGER_H

#include "jwt_auth.h"
#include "rbac.h"
#include <time.h>

/* ===== Authentication Methods ===== */

typedef enum {
  AUTH_METHOD_PASSWORD = 0,       /* Username/password */
  AUTH_METHOD_JWT = 1,            /* JWT token */
  AUTH_METHOD_OAUTH2 = 2,         /* OAuth2 */
  AUTH_METHOD_MFA = 3             /* Multi-factor authentication */
} fl_auth_method_t;

/* ===== MFA Provider ===== */

typedef enum {
  MFA_PROVIDER_TOTP = 0,          /* Time-based OTP (Google Authenticator) */
  MFA_PROVIDER_SMS = 1,           /* SMS OTP */
  MFA_PROVIDER_EMAIL = 2,         /* Email OTP */
  MFA_PROVIDER_BACKUP = 3         /* Backup codes */
} fl_mfa_provider_t;

/* ===== Session ===== */

typedef struct {
  char session_id[256];           /* Unique session ID */
  char user_id[256];

  char ip_address[16];            /* Client IP */
  char user_agent[512];           /* Client user agent */

  int64_t created_at;
  int64_t last_activity;
  int64_t expires_at;

  int is_active;
  int is_mfa_verified;            /* MFA verification status */

  char device_fingerprint[256];   /* Device identification */
} fl_session_t;

/* ===== MFA Configuration ===== */

typedef struct {
  char user_id[256];
  fl_mfa_provider_t provider;

  char secret[256];               /* TOTP secret or phone number */
  int is_enabled;
  int is_verified;

  char backup_codes[32][64];      /* Backup codes */
  int backup_code_count;

  int64_t created_at;
} fl_mfa_config_t;

/* ===== Login Attempt ===== */

typedef struct {
  char user_id[256];
  char ip_address[16];

  int success;                    /* 1 = success, 0 = failed */
  char failure_reason[256];

  int64_t timestamp;
} fl_login_attempt_t;

/* ===== Auth Manager ===== */

typedef struct {
  fl_jwt_manager_t *jwt_manager;
  fl_rbac_manager_t *rbac_manager;

  fl_session_t sessions[256];     /* Active sessions */
  int session_count;

  fl_mfa_config_t mfa_configs[512];  /* MFA configs */
  int mfa_count;

  fl_login_attempt_t login_attempts[1024];  /* Login history */
  int login_attempt_count;

  int max_failed_attempts;        /* Default: 5 */
  int session_timeout_seconds;    /* Default: 3600 */

  pthread_mutex_t auth_mutex;
} fl_auth_manager_t;

/* ===== Public API: Manager ===== */

/* Create auth manager */
fl_auth_manager_t* freelang_auth_manager_create(const char *jwt_secret);

/* Destroy manager */
void freelang_auth_manager_destroy(fl_auth_manager_t *manager);

/* ===== Public API: Authentication ===== */

/* Authenticate user (username/password) */
int freelang_auth_login(fl_auth_manager_t *manager,
                        const char *username,
                        const char *password,
                        const char *ip_address);

/* Login with JWT */
int freelang_auth_login_jwt(fl_auth_manager_t *manager,
                             const char *jwt_token,
                             const char *ip_address);

/* Logout */
void freelang_auth_logout(fl_auth_manager_t *manager,
                          const char *session_id);

/* ===== Public API: Session Management ===== */

/* Create session */
fl_session_t* freelang_auth_create_session(fl_auth_manager_t *manager,
                                            const char *user_id,
                                            const char *ip_address,
                                            int session_duration_seconds);

/* Get session */
fl_session_t* freelang_auth_get_session(fl_auth_manager_t *manager,
                                         const char *session_id);

/* Validate session */
int freelang_auth_validate_session(fl_auth_manager_t *manager,
                                    const char *session_id);

/* Refresh session */
int freelang_auth_refresh_session(fl_auth_manager_t *manager,
                                   const char *session_id,
                                   int extend_duration_seconds);

/* Terminate session */
void freelang_auth_terminate_session(fl_auth_manager_t *manager,
                                      const char *session_id);

/* Get active sessions for user */
void freelang_auth_get_user_sessions(fl_auth_manager_t *manager,
                                      const char *user_id,
                                      fl_session_t **sessions,
                                      int *count);

/* ===== Public API: Password Management ===== */

/* Change password */
int freelang_auth_change_password(fl_auth_manager_t *manager,
                                   const char *user_id,
                                   const char *old_password,
                                   const char *new_password);

/* Reset password (admin) */
int freelang_auth_reset_password(fl_auth_manager_t *manager,
                                  const char *user_id,
                                  const char *new_password);

/* Generate password reset token */
char* freelang_auth_generate_reset_token(fl_auth_manager_t *manager,
                                          const char *user_id);

/* Verify password reset token */
int freelang_auth_verify_reset_token(fl_auth_manager_t *manager,
                                      const char *reset_token);

/* ===== Public API: MFA ===== */

/* Enable MFA for user */
int freelang_auth_enable_mfa(fl_auth_manager_t *manager,
                              const char *user_id,
                              fl_mfa_provider_t provider);

/* Disable MFA */
void freelang_auth_disable_mfa(fl_auth_manager_t *manager,
                                const char *user_id);

/* Verify MFA code */
int freelang_auth_verify_mfa_code(fl_auth_manager_t *manager,
                                   const char *user_id,
                                   const char *code);

/* Generate backup codes */
void freelang_auth_generate_backup_codes(fl_auth_manager_t *manager,
                                          const char *user_id,
                                          char (*codes)[64],
                                          int *code_count);

/* Verify backup code */
int freelang_auth_verify_backup_code(fl_auth_manager_t *manager,
                                      const char *user_id,
                                      const char *code);

/* ===== Public API: OAuth2 (Placeholder) ===== */

/* Start OAuth2 flow */
char* freelang_auth_oauth2_start(fl_auth_manager_t *manager,
                                  const char *provider,  /* "google", "github", etc */
                                  const char *redirect_uri);

/* Complete OAuth2 flow */
int freelang_auth_oauth2_callback(fl_auth_manager_t *manager,
                                   const char *provider,
                                   const char *code);

/* ===== Public API: Security ===== */

/* Check if IP is blocked */
int freelang_auth_is_ip_blocked(fl_auth_manager_t *manager,
                                 const char *ip_address);

/* Block IP after failed attempts */
void freelang_auth_block_ip(fl_auth_manager_t *manager,
                             const char *ip_address,
                             int duration_seconds);

/* Detect suspicious activity */
int freelang_auth_detect_suspicious_activity(fl_auth_manager_t *manager,
                                              const char *user_id,
                                              const char *ip_address);

/* ===== Public API: Audit ===== */

/* Get login history */
void freelang_auth_get_login_history(fl_auth_manager_t *manager,
                                      fl_login_attempt_t **attempts,
                                      int *count);

/* Get login history for user */
void freelang_auth_get_user_login_history(fl_auth_manager_t *manager,
                                           const char *user_id,
                                           fl_login_attempt_t **attempts,
                                           int *count);

/* ===== Public API: Statistics ===== */

typedef struct {
  int total_sessions;
  int active_sessions;
  int total_login_attempts;
  int failed_login_attempts;
  int users_with_mfa;
  int blocked_ips;
} fl_auth_stats_t;

/* Get authentication statistics */
fl_auth_stats_t freelang_auth_get_stats(fl_auth_manager_t *manager);

/* Reset statistics */
void freelang_auth_reset_stats(fl_auth_manager_t *manager);

#endif /* FREELANG_AUTH_MANAGER_H */
