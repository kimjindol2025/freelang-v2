/**
 * FreeLang stdlib/jwt - JSON Web Tokens (JWT)
 * Token generation, validation, claims management, RS256/HS256
 */

#ifndef FREELANG_STDLIB_JWT_H
#define FREELANG_STDLIB_JWT_H

#include <stdint.h>
#include <stddef.h>

typedef enum {
  FL_JWT_HS256 = 0,
  FL_JWT_HS512 = 1,
  FL_JWT_RS256 = 2,
  FL_JWT_RS512 = 3,
  FL_JWT_ES256 = 4
} fl_jwt_algorithm_t;

typedef struct fl_jwt_t fl_jwt_t;
typedef struct fl_jwt_claims_t fl_jwt_claims_t;

typedef struct {
  uint64_t tokens_issued;
  uint64_t tokens_verified;
  uint64_t tokens_expired;
  uint64_t verification_failures;
} fl_jwt_stats_t;

/* Creation */
fl_jwt_t* fl_jwt_create(fl_jwt_algorithm_t algorithm, const char *secret);
void fl_jwt_destroy(fl_jwt_t *jwt);

/* Claims */
fl_jwt_claims_t* fl_jwt_claims_create(void);
void fl_jwt_claims_destroy(fl_jwt_claims_t *claims);
int fl_jwt_claims_set_subject(fl_jwt_claims_t *claims, const char *subject);
int fl_jwt_claims_set_audience(fl_jwt_claims_t *claims, const char *audience);
int fl_jwt_claims_set_issuer(fl_jwt_claims_t *claims, const char *issuer);
int fl_jwt_claims_set_expiry(fl_jwt_claims_t *claims, int64_t expiry_seconds);
int fl_jwt_claims_set_custom(fl_jwt_claims_t *claims, const char *key, const char *value);

/* Token Operations */
char* fl_jwt_encode(fl_jwt_t *jwt, fl_jwt_claims_t *claims);
int fl_jwt_decode(fl_jwt_t *jwt, const char *token, fl_jwt_claims_t **claims_out);
int fl_jwt_verify(fl_jwt_t *jwt, const char *token);
int fl_jwt_validate_signature(fl_jwt_t *jwt, const char *token);

/* Claims Access */
const char* fl_jwt_claims_get_subject(fl_jwt_claims_t *claims);
const char* fl_jwt_claims_get_audience(fl_jwt_claims_t *claims);
const char* fl_jwt_claims_get_issuer(fl_jwt_claims_t *claims);
int64_t fl_jwt_claims_get_expiry(fl_jwt_claims_t *claims);
const char* fl_jwt_claims_get_custom(fl_jwt_claims_t *claims, const char *key);

/* Statistics */
fl_jwt_stats_t* fl_jwt_get_stats(void);
void fl_jwt_reset_stats(void);

#endif
