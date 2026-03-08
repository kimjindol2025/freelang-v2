/**
 * FreeLang JWT Authentication (Phase 23)
 * JSON Web Tokens for secure authentication
 */

#ifndef FREELANG_JWT_AUTH_H
#define FREELANG_JWT_AUTH_H

#include <time.h>

/* ===== JWT Algorithm ===== */

typedef enum {
  JWT_ALGORITHM_HS256 = 0,  /* HMAC SHA-256 */
  JWT_ALGORITHM_HS512 = 1,  /* HMAC SHA-512 */
  JWT_ALGORITHM_RS256 = 2   /* RSA SHA-256 */
} fl_jwt_algorithm_t;

/* ===== JWT Claims ===== */

typedef struct {
  char subject[256];              /* Subject (user ID) */
  char issuer[256];               /* Token issuer */
  char audience[256];             /* Target audience */

  int64_t issued_at;              /* iat: Token issue time */
  int64_t expires_at;             /* exp: Token expiration */
  int64_t not_before;             /* nbf: Not valid before */

  char custom_claims[1024];       /* Additional claims (JSON) */
  int claim_count;
} fl_jwt_claims_t;

/* ===== JWT Token ===== */

typedef struct {
  char header[512];               /* Base64 header */
  char payload[2048];             /* Base64 payload */
  char signature[512];            /* Base64 signature */

  char full_token[4096];          /* Complete JWT token */

  fl_jwt_claims_t claims;
  fl_jwt_algorithm_t algorithm;

  int64_t created_at;
  int is_valid;
} fl_jwt_token_t;

/* ===== JWT Manager ===== */

typedef struct {
  char secret_key[512];           /* HS256/HS512 secret */
  char public_key[2048];          /* RS256 public key */
  char private_key[2048];         /* RS256 private key */

  fl_jwt_algorithm_t algorithm;

  int token_count;                /* Total tokens issued */
  int valid_tokens;               /* Currently valid */
  int revoked_tokens;             /* Revoked tokens */

  char revocation_list[4096];     /* Revoked token hashes */
  int revocation_count;

  pthread_mutex_t jwt_mutex;
} fl_jwt_manager_t;

/* ===== Refresh Token ===== */

typedef struct {
  char token_id[33];              /* Unique ID */
  char user_id[256];
  char refresh_token[512];

  int64_t created_at;
  int64_t expires_at;
  int64_t last_used;

  int is_revoked;
} fl_refresh_token_t;

/* ===== Public API: Manager ===== */

/* Create JWT manager */
fl_jwt_manager_t* freelang_jwt_manager_create(const char *secret_key,
                                               fl_jwt_algorithm_t algorithm);

/* Destroy manager */
void freelang_jwt_manager_destroy(fl_jwt_manager_t *manager);

/* ===== Public API: Token Creation ===== */

/* Create JWT token */
fl_jwt_token_t* freelang_jwt_create(fl_jwt_manager_t *manager,
                                     const char *subject,
                                     int expires_in_seconds);

/* Create token with claims */
fl_jwt_token_t* freelang_jwt_create_with_claims(fl_jwt_manager_t *manager,
                                                 fl_jwt_claims_t *claims);

/* Get full token string */
char* freelang_jwt_get_token(fl_jwt_token_t *token);

/* ===== Public API: Token Validation ===== */

/* Verify and decode token */
int freelang_jwt_verify(fl_jwt_manager_t *manager, const char *token_string,
                        fl_jwt_token_t *out_token);

/* Validate token signature */
int freelang_jwt_validate_signature(fl_jwt_manager_t *manager,
                                     const char *token_string);

/* Validate token expiration */
int freelang_jwt_validate_expiration(fl_jwt_token_t *token);

/* Validate token claims */
int freelang_jwt_validate_claims(fl_jwt_token_t *token,
                                  const char *expected_issuer,
                                  const char *expected_audience);

/* ===== Public API: Token Refresh ===== */

/* Issue refresh token */
fl_refresh_token_t* freelang_jwt_issue_refresh(fl_jwt_manager_t *manager,
                                                const char *user_id,
                                                int expires_in_days);

/* Refresh access token */
fl_jwt_token_t* freelang_jwt_refresh_access(fl_jwt_manager_t *manager,
                                             fl_refresh_token_t *refresh);

/* Revoke refresh token */
void freelang_jwt_revoke_refresh(fl_jwt_manager_t *manager,
                                  fl_refresh_token_t *refresh);

/* ===== Public API: Token Revocation ===== */

/* Revoke token (blacklist) */
void freelang_jwt_revoke(fl_jwt_manager_t *manager, const char *token_string);

/* Check if token is revoked */
int freelang_jwt_is_revoked(fl_jwt_manager_t *manager,
                             const char *token_string);

/* Clear revocation list */
void freelang_jwt_clear_revocation(fl_jwt_manager_t *manager);

/* ===== Public API: Claims ===== */

/* Extract claims from token */
fl_jwt_claims_t* freelang_jwt_get_claims(fl_jwt_token_t *token);

/* Extract subject from token */
char* freelang_jwt_get_subject(fl_jwt_token_t *token);

/* Extract custom claim */
char* freelang_jwt_get_claim(fl_jwt_token_t *token, const char *claim_name);

/* ===== Public API: Statistics ===== */

typedef struct {
  int total_issued;
  int currently_valid;
  int revoked;
  double average_expiry_hours;
  int refresh_tokens_active;
} fl_jwt_stats_t;

/* Get JWT statistics */
fl_jwt_stats_t freelang_jwt_get_stats(fl_jwt_manager_t *manager);

/* Reset statistics */
void freelang_jwt_reset_stats(fl_jwt_manager_t *manager);

#endif /* FREELANG_JWT_AUTH_H */
