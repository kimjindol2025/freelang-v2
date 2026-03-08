/**
 * FreeLang OAuth2 Protocol (Phase 25)
 * OpenID Connect compatible OAuth2 implementation
 */

#ifndef FREELANG_OAUTH2_H
#define FREELANG_OAUTH2_H

#include <time.h>
#include <pthread.h>

/* ===== OAuth2 Flow Types ===== */

typedef enum {
  OAUTH2_FLOW_AUTHCODE = 0,      /* Authorization Code (3-legged) */
  OAUTH2_FLOW_IMPLICIT = 1,      /* Implicit (browser-based) */
  OAUTH2_FLOW_CLIENT_CRED = 2,   /* Client Credentials (M2M) */
  OAUTH2_FLOW_REFRESH = 3        /* Refresh Token */
} fl_oauth2_flow_t;

/* ===== OAuth2 Scope ===== */

typedef struct {
  char scope_name[64];           /* "openid", "profile", "email" */
  char description[256];
  int is_active;
} fl_oauth2_scope_t;

/* ===== Authorization Request ===== */

typedef struct {
  char client_id[256];           /* OAuth2 app ID */
  char redirect_uri[512];        /* Callback URL */
  char response_type[32];        /* "code" */

  char state[256];               /* CSRF protection */
  char nonce[256];               /* ID token verification */

  char scope[512];               /* Space-separated scopes */
  char prompt[64];               /* "login", "consent", "none" */

  int64_t created_at;
  int is_valid;
} fl_oauth2_auth_request_t;

/* ===== Authorization Code ===== */

typedef struct {
  char code[256];                /* Short-lived authorization code */
  char client_id[256];
  char user_id[256];

  char redirect_uri[512];
  char scope[512];

  int64_t issued_at;
  int64_t expires_at;            /* Typically 10 minutes */

  int is_redeemed;               /* Can only be used once */
  int64_t redeemed_at;
} fl_oauth2_authcode_t;

/* ===== OAuth2 Token Response ===== */

typedef struct {
  char access_token[2048];       /* JWT access token */
  char token_type[32];           /* "Bearer" */
  int expires_in;                /* Seconds */

  char refresh_token[256];       /* Long-lived refresh token */
  char id_token[2048];           /* OIDC ID token (JWT) */

  char scope[512];               /* Granted scopes */
} fl_oauth2_token_response_t;

/* ===== OAuth2 Client ===== */

typedef struct {
  char client_id[256];
  char client_secret[512];       /* Must be kept secret */

  char client_name[256];
  char redirect_uris[10][512];   /* Multiple allowed redirect URIs */
  int redirect_uri_count;

  int token_endpoint_auth_method; /* "client_secret_basic" or "client_secret_post" */

  fl_oauth2_scope_t scopes[32];  /* Allowed scopes */
  int scope_count;

  int is_public;                 /* Public client (e.g., SPA) */
  int is_confidential;           /* Confidential client (e.g., backend server) */

  int64_t created_at;
} fl_oauth2_client_t;

/* ===== OAuth2 Provider Manager ===== */

typedef struct {
  fl_oauth2_client_t clients[256];    /* Registered OAuth2 clients */
  int client_count;

  fl_oauth2_authcode_t auth_codes[1024];  /* Active authorization codes */
  int authcode_count;

  fl_oauth2_scope_t scopes[64];  /* Defined scopes */
  int scope_count;

  /* Configuration */
  char authorization_endpoint[512];
  char token_endpoint[512];
  char userinfo_endpoint[512];

  int authcode_lifetime_sec;     /* Default: 600 (10 min) */
  int access_token_lifetime_sec; /* Default: 3600 (1 hour) */
  int refresh_token_lifetime_sec;/* Default: 604800 (7 days) */

  /* Statistics */
  int total_auth_requests;
  int total_tokens_issued;
  int total_tokens_refreshed;

  pthread_mutex_t oauth2_mutex;
} fl_oauth2_provider_t;

/* ===== Public API: Provider Management ===== */

/* Create OAuth2 provider */
fl_oauth2_provider_t* freelang_oauth2_provider_create(void);

/* Destroy provider */
void freelang_oauth2_provider_destroy(fl_oauth2_provider_t *provider);

/* ===== Public API: Client Registration ===== */

/* Register OAuth2 client */
int freelang_oauth2_register_client(fl_oauth2_provider_t *provider,
                                     const char *client_name,
                                     const char *redirect_uri,
                                     int is_confidential);

/* Get client */
fl_oauth2_client_t* freelang_oauth2_get_client(fl_oauth2_provider_t *provider,
                                                const char *client_id);

/* ===== Public API: Authorization Flow (3-Legged) ===== */

/* Create authorization request */
fl_oauth2_auth_request_t* freelang_oauth2_create_auth_request(
    fl_oauth2_provider_t *provider,
    const char *client_id,
    const char *redirect_uri,
    const char *scope);

/* Validate authorization request */
int freelang_oauth2_validate_auth_request(fl_oauth2_provider_t *provider,
                                           fl_oauth2_auth_request_t *request);

/* Issue authorization code (after user consents) */
char* freelang_oauth2_issue_authcode(fl_oauth2_provider_t *provider,
                                      const char *client_id,
                                      const char *user_id,
                                      const char *scope,
                                      const char *redirect_uri);

/* ===== Public API: Token Endpoint ===== */

/* Exchange authorization code for token */
int freelang_oauth2_exchange_code(fl_oauth2_provider_t *provider,
                                   const char *client_id,
                                   const char *client_secret,
                                   const char *code,
                                   const char *redirect_uri,
                                   fl_oauth2_token_response_t *out_response);

/* Refresh access token */
int freelang_oauth2_refresh_token(fl_oauth2_provider_t *provider,
                                   const char *client_id,
                                   const char *client_secret,
                                   const char *refresh_token,
                                   fl_oauth2_token_response_t *out_response);

/* ===== Public API: Validation ===== */

/* Validate authorization code */
int freelang_oauth2_validate_code(fl_oauth2_provider_t *provider,
                                   const char *code);

/* Validate redirect URI */
int freelang_oauth2_validate_redirect_uri(fl_oauth2_provider_t *provider,
                                           const char *client_id,
                                           const char *redirect_uri);

/* ===== Public API: Scope Management ===== */

/* Define scope */
void freelang_oauth2_define_scope(fl_oauth2_provider_t *provider,
                                   const char *scope_name,
                                   const char *description);

/* Check if scope granted */
int freelang_oauth2_has_scope(const char *granted_scopes,
                               const char *required_scope);

/* ===== Public API: Statistics ===== */

typedef struct {
  int total_auth_requests;
  int total_tokens_issued;
  int total_tokens_refreshed;
  int active_authcodes;
  int total_clients;
} fl_oauth2_stats_t;

/* Get OAuth2 statistics */
fl_oauth2_stats_t freelang_oauth2_get_stats(fl_oauth2_provider_t *provider);

#endif /* FREELANG_OAUTH2_H */
