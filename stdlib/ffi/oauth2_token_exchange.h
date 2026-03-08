/**
 * FreeLang OAuth2 ↔ JWT Token Exchange (Phase 25-3)
 * Seamless integration between OAuth2 and internal JWT tokens
 */

#ifndef FREELANG_OAUTH2_TOKEN_EXCHANGE_H
#define FREELANG_OAUTH2_TOKEN_EXCHANGE_H

#include <time.h>
#include <pthread.h>

/* ===== Token Type ===== */

typedef enum {
  TOKEN_TYPE_JWT = 0,           /* Internal JWT token */
  TOKEN_TYPE_OAUTH2 = 1,        /* External OAuth2 token */
  TOKEN_TYPE_REFRESH = 2        /* Refresh token (both types) */
} fl_token_type_t;

/* ===== Scope Mapping ===== */

typedef struct {
  char oauth2_scope[64];        /* OAuth2 scope name (e.g., "openid", "profile") */
  char freelang_scope[64];      /* FreeLang scope/permission mapping */
  int is_active;
} fl_scope_mapping_t;

/* ===== Token Exchange Context ===== */

typedef struct {
  char exchange_id[64];
  char source_token[2048];      /* Original token */
  fl_token_type_t source_type;

  char target_token[2048];      /* Exchanged token */
  fl_token_type_t target_type;

  char user_id[256];
  char scope[512];              /* Space-separated scopes */

  int64_t created_at;
  int64_t expires_at;
  int is_valid;
} fl_token_exchange_context_t;

/* ===== Token Exchange Manager ===== */

typedef struct {
  fl_scope_mapping_t scope_mappings[64];  /* OAuth2 <-> FreeLang scope mappings */
  int scope_mapping_count;

  fl_token_exchange_context_t exchanges[512];  /* Exchange history for audit */
  int exchange_count;

  /* Cross-system token validation cache */
  char validated_tokens[256][2048];
  int64_t validated_at[256];
  int validated_count;

  /* Statistics */
  int total_oauth2_to_jwt;
  int total_jwt_to_oauth2;
  int failed_exchanges;

  pthread_mutex_t exchange_mutex;
} fl_token_exchange_manager_t;

/* ===== OAuth2 Token Claims ===== */

typedef struct {
  char iss[256];                /* Issuer (OAuth2 provider) */
  char sub[256];                /* Subject (user ID) */
  char aud[256];                /* Audience (application) */
  char scope[512];              /* Authorized scopes */
  char name[256];
  char email[256];

  int64_t iat;                  /* Issued at */
  int64_t exp;                  /* Expiration */
  int64_t auth_time;            /* Authentication time */

  int email_verified;
  int phone_verified;
} fl_oauth2_token_claims_t;

/* ===== JWT Token Claims ===== */

typedef struct {
  char iss[256];                /* Issuer (FreeLang) */
  char sub[256];                /* Subject (user ID) */
  char aud[256];                /* Audience */
  char permission[256];         /* RBAC permission */
  char role[64];                /* User role (USER, ADMIN, etc) */

  int64_t iat;                  /* Issued at */
  int64_t exp;                  /* Expiration */

  int is_refreshable;
  char refresh_token_id[256];   /* Reference to refresh token */
} fl_jwt_token_claims_t;

/* ===== Public API: Manager ===== */

/* Create token exchange manager */
fl_token_exchange_manager_t* freelang_oauth2_token_exchange_create(void);

/* Destroy manager */
void freelang_oauth2_token_exchange_destroy(fl_token_exchange_manager_t *manager);

/* ===== Scope Mapping ===== */

/* Map OAuth2 scope to FreeLang permission */
int freelang_oauth2_map_scope(fl_token_exchange_manager_t *manager,
                               const char *oauth2_scope,
                               const char *freelang_scope);

/* Get FreeLang scope for OAuth2 scope */
char* freelang_oauth2_get_mapped_scope(fl_token_exchange_manager_t *manager,
                                        const char *oauth2_scope);

/* ===== Token Parsing ===== */

/* Parse OAuth2 token claims */
int freelang_oauth2_parse_claims(const char *token,
                                  fl_oauth2_token_claims_t *out_claims);

/* Parse JWT token claims */
int freelang_jwt_parse_claims(const char *token,
                               fl_jwt_token_claims_t *out_claims);

/* ===== Token Exchange ===== */

/* Exchange OAuth2 token for JWT token */
int freelang_oauth2_to_jwt(fl_token_exchange_manager_t *manager,
                            const char *user_id,
                            const char *oauth2_token,
                            const char *oauth2_scope,
                            char *out_jwt_token,
                            int max_token_len);

/* Exchange JWT token to OAuth2 compatible token */
int freelang_jwt_to_oauth2(fl_token_exchange_manager_t *manager,
                            const char *jwt_token,
                            const char *target_provider,
                            char *out_oauth2_token,
                            int max_token_len);

/* ===== Cross-System Validation ===== */

/* Validate OAuth2 token and convert scopes to FreeLang permissions */
int freelang_oauth2_validate_and_map(fl_token_exchange_manager_t *manager,
                                      const char *oauth2_token,
                                      fl_jwt_token_claims_t *out_jwt_claims);

/* Validate JWT token against OAuth2 scopes */
int freelang_jwt_validate_against_oauth2(fl_token_exchange_manager_t *manager,
                                          const char *jwt_token,
                                          const char *required_oauth2_scope);

/* ===== Token Compatibility ===== */

/* Check if OAuth2 scopes satisfy required permissions */
int freelang_oauth2_scope_covers_permission(fl_token_exchange_manager_t *manager,
                                             const char *oauth2_scope,
                                             const char *required_permission);

/* Upgrade token with additional scopes */
int freelang_oauth2_add_scopes(fl_token_exchange_manager_t *manager,
                                const char *token,
                                const char *additional_scopes,
                                char *out_updated_token,
                                int max_token_len);

/* ===== Exchange History ===== */

/* Get exchange records for audit trail */
void freelang_oauth2_token_exchange_get_history(fl_token_exchange_manager_t *manager,
                                                 const char *user_id,
                                                 fl_token_exchange_context_t **exchanges,
                                                 int *count);

/* ===== Statistics ===== */

typedef struct {
  int total_oauth2_to_jwt;
  int total_jwt_to_oauth2;
  int failed_exchanges;
  int active_mapped_scopes;
  int cached_validations;
} fl_token_exchange_stats_t;

/* Get token exchange statistics */
fl_token_exchange_stats_t freelang_oauth2_token_exchange_get_stats(fl_token_exchange_manager_t *manager);

/* Clear validation cache */
void freelang_oauth2_clear_validation_cache(fl_token_exchange_manager_t *manager);

#endif /* FREELANG_OAUTH2_TOKEN_EXCHANGE_H */
