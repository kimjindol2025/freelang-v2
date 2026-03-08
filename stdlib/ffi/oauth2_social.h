/**
 * FreeLang OAuth2 Social Provider Integration (Phase 25-2)
 * Google, GitHub, Facebook OAuth2 connectors
 */

#ifndef FREELANG_OAUTH2_SOCIAL_H
#define FREELANG_OAUTH2_SOCIAL_H

#include <time.h>
#include <pthread.h>

/* ===== Social Provider Types ===== */

typedef enum {
  SOCIAL_PROVIDER_GOOGLE = 0,
  SOCIAL_PROVIDER_GITHUB = 1,
  SOCIAL_PROVIDER_FACEBOOK = 2,
  SOCIAL_PROVIDER_LINKEDIN = 3
} fl_social_provider_type_t;

/* ===== Social Profile ===== */

typedef struct {
  char provider_id[256];           /* google_123456789 */
  char user_id[256];               /* Unique per provider */
  char email[256];
  char name[256];
  char avatar_url[512];

  char first_name[128];
  char last_name[128];

  int email_verified;
  int is_active;

  int64_t created_at;
  int64_t last_login;
} fl_social_profile_t;

/* ===== Social Provider Configuration ===== */

typedef struct {
  fl_social_provider_type_t provider_type;

  char provider_name[64];          /* "google", "github", "facebook" */
  char client_id[512];             /* OAuth2 app ID */
  char client_secret[512];         /* OAuth2 app secret */

  char auth_endpoint[512];         /* e.g., https://accounts.google.com/o/oauth2/v2/auth */
  char token_endpoint[512];        /* e.g., https://oauth2.googleapis.com/token */
  char userinfo_endpoint[512];     /* e.g., https://openidconnect.googleapis.com/v1/userinfo */

  char redirect_uri[512];          /* Callback URL */
  char scopes[512];                /* space-separated scopes */

  int is_configured;
  int64_t configured_at;
} fl_social_provider_config_t;

/* ===== Social Connection (User <-> Provider) ===== */

typedef struct {
  char connection_id[64];
  char freelang_user_id[256];      /* Local user ID */
  fl_social_provider_type_t provider;
  char provider_user_id[256];      /* Remote user ID */

  char provider_access_token[2048];
  char provider_refresh_token[512];

  int64_t token_expires_at;
  int64_t connected_at;
  int is_active;
} fl_social_connection_t;

/* ===== Social Provider Manager ===== */

typedef struct {
  fl_social_provider_config_t providers[4];  /* Google, GitHub, Facebook, LinkedIn */
  int provider_count;

  fl_social_profile_t profiles[512];         /* Cached social profiles */
  int profile_count;

  fl_social_connection_t connections[1024];  /* User <-> Provider mappings */
  int connection_count;

  /* Statistics */
  int total_auth_attempts;
  int total_successful_logins;
  int total_profile_links;

  pthread_mutex_t social_mutex;
} fl_social_provider_manager_t;

/* ===== OAuth2 Authorization URL ===== */

typedef struct {
  char auth_url[1024];
  char state[256];                 /* CSRF protection */
  char nonce[256];                 /* Nonce for openid connect */
  char scope[512];
  char response_type[32];          /* "code" */
  char redirect_uri[512];
} fl_oauth2_auth_url_t;

/* ===== Public API: Provider Setup ===== */

/* Create social provider manager */
fl_social_provider_manager_t* freelang_oauth2_social_manager_create(void);

/* Destroy manager */
void freelang_oauth2_social_manager_destroy(fl_social_provider_manager_t *manager);

/* ===== Provider Configuration ===== */

/* Configure Google OAuth2 */
int freelang_oauth2_configure_google(fl_social_provider_manager_t *manager,
                                      const char *client_id,
                                      const char *client_secret,
                                      const char *redirect_uri);

/* Configure GitHub OAuth2 */
int freelang_oauth2_configure_github(fl_social_provider_manager_t *manager,
                                      const char *client_id,
                                      const char *client_secret,
                                      const char *redirect_uri);

/* Configure Facebook OAuth2 */
int freelang_oauth2_configure_facebook(fl_social_provider_manager_t *manager,
                                        const char *app_id,
                                        const char *app_secret,
                                        const char *redirect_uri);

/* ===== Authorization Flow ===== */

/* Generate authorization URL */
fl_oauth2_auth_url_t* freelang_oauth2_social_get_auth_url(
    fl_social_provider_manager_t *manager,
    fl_social_provider_type_t provider,
    const char *state);

/* Exchange authorization code for tokens */
int freelang_oauth2_social_exchange_code(fl_social_provider_manager_t *manager,
                                          fl_social_provider_type_t provider,
                                          const char *code,
                                          const char *state,
                                          fl_social_connection_t *out_connection);

/* ===== Profile Retrieval ===== */

/* Fetch user profile from provider */
int freelang_oauth2_social_fetch_profile(fl_social_provider_manager_t *manager,
                                          fl_social_provider_type_t provider,
                                          const char *access_token,
                                          fl_social_profile_t *out_profile);

/* Get cached profile */
fl_social_profile_t* freelang_oauth2_social_get_profile(fl_social_provider_manager_t *manager,
                                                         const char *provider_id);

/* ===== Connection Management ===== */

/* Link provider account to local user */
int freelang_oauth2_social_link_account(fl_social_provider_manager_t *manager,
                                         const char *freelang_user_id,
                                         fl_social_provider_type_t provider,
                                         const char *provider_user_id,
                                         const char *access_token);

/* Unlink provider account from local user */
int freelang_oauth2_social_unlink_account(fl_social_provider_manager_t *manager,
                                           const char *freelang_user_id,
                                           fl_social_provider_type_t provider);

/* Get user's connected social accounts */
void freelang_oauth2_social_get_connections(fl_social_provider_manager_t *manager,
                                             const char *freelang_user_id,
                                             fl_social_connection_t **connections,
                                             int *count);

/* ===== Token Management ===== */

/* Refresh provider access token */
int freelang_oauth2_social_refresh_access_token(fl_social_provider_manager_t *manager,
                                                 fl_social_connection_t *connection);

/* Validate provider token */
int freelang_oauth2_social_validate_token(fl_social_provider_manager_t *manager,
                                           fl_social_provider_type_t provider,
                                           const char *access_token);

/* ===== Statistics ===== */

typedef struct {
  int total_auth_attempts;
  int total_successful_logins;
  int total_profile_links;
  int active_connections;
  int total_providers_configured;
} fl_social_stats_t;

/* Get social authentication statistics */
fl_social_stats_t freelang_oauth2_social_get_stats(fl_social_provider_manager_t *manager);

#endif /* FREELANG_OAUTH2_SOCIAL_H */
