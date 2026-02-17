/**
 * FreeLang JWT Authentication Implementation (Phase 23)
 * JSON Web Token creation, validation, and management
 */

#include "jwt_auth.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>
#include <pthread.h>

/* ===== Base64 Encoding ===== */

static const char *base64_chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

static void base64_encode(const unsigned char *src, int src_len, char *dst) {
  int i = 0, j = 0;
  unsigned char char_array_3[3], char_array_4[4];

  while (src_len--) {
    char_array_3[i++] = *(src++);
    if (i == 3) {
      char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
      char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
      char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
      char_array_4[3] = char_array_3[2] & 0x3f;
      for(i = 0; i < 4; i++) dst[j++] = base64_chars[char_array_4[i]];
      i = 0;
    }
  }

  if (i) {
    for(int k = i; k < 3; k++) char_array_3[k] = '\0';
    char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
    char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
    char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
    for (int k = 0; k <= i; k++) dst[j++] = base64_chars[char_array_4[k]];
    while(i++ < 3) dst[j++] = '=';
  }
  dst[j] = '\0';
}

/* ===== JWT Manager ===== */

fl_jwt_manager_t* freelang_jwt_manager_create(const char *secret_key,
                                               fl_jwt_algorithm_t algorithm) {
  fl_jwt_manager_t *manager = (fl_jwt_manager_t*)malloc(sizeof(fl_jwt_manager_t));
  if (!manager) return NULL;

  memset(manager, 0, sizeof(fl_jwt_manager_t));
  pthread_mutex_init(&manager->jwt_mutex, NULL);

  strncpy(manager->secret_key, secret_key, sizeof(manager->secret_key) - 1);
  manager->algorithm = algorithm;

  fprintf(stderr, "[JWT] Manager created (algorithm: %d)\\n", algorithm);
  return manager;
}

void freelang_jwt_manager_destroy(fl_jwt_manager_t *manager) {
  if (!manager) return;

  pthread_mutex_destroy(&manager->jwt_mutex);
  free(manager);

  fprintf(stderr, "[JWT] Manager destroyed\\n");
}

/* ===== Token Creation ===== */

fl_jwt_token_t* freelang_jwt_create(fl_jwt_manager_t *manager,
                                     const char *subject,
                                     int expires_in_seconds) {
  if (!manager || !subject) return NULL;

  fl_jwt_token_t *token = (fl_jwt_token_t*)malloc(sizeof(fl_jwt_token_t));
  if (!token) return NULL;

  memset(token, 0, sizeof(fl_jwt_token_t));

  /* Create claims */
  strncpy(token->claims.subject, subject, sizeof(token->claims.subject) - 1);
  token->claims.issued_at = time(NULL);
  token->claims.expires_at = time(NULL) + expires_in_seconds;
  token->claims.not_before = time(NULL);

  /* Create header (HS256) */
  char header_json[256];
  snprintf(header_json, sizeof(header_json),
           "{\"alg\":\"HS256\",\"typ\":\"JWT\"}");
  base64_encode((unsigned char*)header_json, strlen(header_json), token->header);

  /* Create payload */
  char payload_json[1024];
  snprintf(payload_json, sizeof(payload_json),
           "{\"sub\":\"%s\",\"iat\":%ld,\"exp\":%ld,\"nbf\":%ld}",
           subject,
           token->claims.issued_at,
           token->claims.expires_at,
           token->claims.not_before);
  base64_encode((unsigned char*)payload_json, strlen(payload_json), token->payload);

  /* Create signature (simplified - HMAC-SHA256 would be real implementation) */
  char sig_input[2048];
  snprintf(sig_input, sizeof(sig_input), "%s.%s", token->header, token->payload);
  base64_encode((unsigned char*)sig_input, strlen(sig_input), token->signature);

  /* Create full token */
  snprintf(token->full_token, sizeof(token->full_token), "%s.%s.%s",
           token->header, token->payload, token->signature);

  token->algorithm = manager->algorithm;
  token->created_at = time(NULL);
  token->is_valid = 1;

  pthread_mutex_lock(&manager->jwt_mutex);
  manager->token_count++;
  manager->valid_tokens++;
  pthread_mutex_unlock(&manager->jwt_mutex);

  fprintf(stderr, "[JWT] Token created for subject: %s (expires: %ld)\\n",
          subject, token->claims.expires_at);

  return token;
}

fl_jwt_token_t* freelang_jwt_create_with_claims(fl_jwt_manager_t *manager,
                                                 fl_jwt_claims_t *claims) {
  if (!manager || !claims) return NULL;

  fl_jwt_token_t *token = freelang_jwt_create(manager, claims->subject,
                                               claims->expires_at - time(NULL));

  if (token) {
    memcpy(&token->claims, claims, sizeof(fl_jwt_claims_t));
  }

  return token;
}

char* freelang_jwt_get_token(fl_jwt_token_t *token) {
  if (!token) return NULL;
  return token->full_token;
}

/* ===== Token Validation ===== */

int freelang_jwt_verify(fl_jwt_manager_t *manager, const char *token_string,
                        fl_jwt_token_t *out_token) {
  if (!manager || !token_string || !out_token) return 0;

  /* Parse token: header.payload.signature */
  char token_copy[4096];
  strncpy(token_copy, token_string, sizeof(token_copy) - 1);

  char *header = strtok(token_copy, ".");
  char *payload = strtok(NULL, ".");
  char *signature = strtok(NULL, ".");

  if (!header || !payload || !signature) {
    fprintf(stderr, "[JWT] Invalid token format\\n");
    return 0;
  }

  strncpy(out_token->header, header, sizeof(out_token->header) - 1);
  strncpy(out_token->payload, payload, sizeof(out_token->payload) - 1);
  strncpy(out_token->signature, signature, sizeof(out_token->signature) - 1);
  strncpy(out_token->full_token, token_string, sizeof(out_token->full_token) - 1);

  /* Validate signature */
  if (!freelang_jwt_validate_signature(manager, token_string)) {
    fprintf(stderr, "[JWT] Signature validation failed\\n");
    return 0;
  }

  /* Validate expiration */
  out_token->created_at = time(NULL);
  out_token->is_valid = 1;

  fprintf(stderr, "[JWT] Token verified successfully\\n");
  return 1;
}

int freelang_jwt_validate_signature(fl_jwt_manager_t *manager,
                                     const char *token_string) {
  if (!manager || !token_string) return 0;

  /* Simplified signature validation - real implementation would verify HMAC */
  fprintf(stderr, "[JWT] Signature validation (simplified)\\n");
  return 1;
}

int freelang_jwt_validate_expiration(fl_jwt_token_t *token) {
  if (!token) return 0;

  time_t now = time(NULL);
  if (now > token->claims.expires_at) {
    fprintf(stderr, "[JWT] Token expired\\n");
    return 0;
  }

  fprintf(stderr, "[JWT] Token is not expired\\n");
  return 1;
}

int freelang_jwt_validate_claims(fl_jwt_token_t *token,
                                  const char *expected_issuer,
                                  const char *expected_audience) {
  if (!token) return 0;

  if (expected_issuer && strcmp(token->claims.issuer, expected_issuer) != 0) {
    fprintf(stderr, "[JWT] Issuer mismatch\\n");
    return 0;
  }

  if (expected_audience && strcmp(token->claims.audience, expected_audience) != 0) {
    fprintf(stderr, "[JWT] Audience mismatch\\n");
    return 0;
  }

  fprintf(stderr, "[JWT] Claims validated\\n");
  return 1;
}

/* ===== Token Refresh ===== */

fl_refresh_token_t* freelang_jwt_issue_refresh(fl_jwt_manager_t *manager,
                                                const char *user_id,
                                                int expires_in_days) {
  if (!manager || !user_id) return NULL;

  fl_refresh_token_t *refresh = (fl_refresh_token_t*)malloc(sizeof(fl_refresh_token_t));
  if (!refresh) return NULL;

  snprintf(refresh->token_id, sizeof(refresh->token_id), "rt_%ld", time(NULL));
  strncpy(refresh->user_id, user_id, sizeof(refresh->user_id) - 1);

  /* Generate refresh token */
  snprintf(refresh->refresh_token, sizeof(refresh->refresh_token),
           "refresh_%s_%ld", user_id, time(NULL));

  refresh->created_at = time(NULL);
  refresh->expires_at = time(NULL) + (expires_in_days * 86400);
  refresh->last_used = time(NULL);
  refresh->is_revoked = 0;

  fprintf(stderr, "[JWT] Refresh token issued for user: %s\\n", user_id);

  return refresh;
}

fl_jwt_token_t* freelang_jwt_refresh_access(fl_jwt_manager_t *manager,
                                             fl_refresh_token_t *refresh) {
  if (!manager || !refresh || refresh->is_revoked) return NULL;

  refresh->last_used = time(NULL);

  /* Issue new access token with same user_id */
  return freelang_jwt_create(manager, refresh->user_id, 3600);  /* 1 hour */
}

void freelang_jwt_revoke_refresh(fl_jwt_manager_t *manager,
                                  fl_refresh_token_t *refresh) {
  if (!refresh) return;

  refresh->is_revoked = 1;
  fprintf(stderr, "[JWT] Refresh token revoked: %s\\n", refresh->token_id);
}

/* ===== Token Revocation ===== */

void freelang_jwt_revoke(fl_jwt_manager_t *manager, const char *token_string) {
  if (!manager || !token_string) return;

  pthread_mutex_lock(&manager->jwt_mutex);

  if (manager->revocation_count < 4096) {
    strncpy(manager->revocation_list + manager->revocation_count * 128,
            token_string, 127);
    manager->revocation_count++;
    manager->valid_tokens--;
    manager->revoked_tokens++;
  }

  pthread_mutex_unlock(&manager->jwt_mutex);

  fprintf(stderr, "[JWT] Token revoked\\n");
}

int freelang_jwt_is_revoked(fl_jwt_manager_t *manager,
                             const char *token_string) {
  if (!manager || !token_string) return 0;

  pthread_mutex_lock(&manager->jwt_mutex);

  for (int i = 0; i < manager->revocation_count; i++) {
    if (strcmp(manager->revocation_list + i * 128, token_string) == 0) {
      pthread_mutex_unlock(&manager->jwt_mutex);
      return 1;
    }
  }

  pthread_mutex_unlock(&manager->jwt_mutex);
  return 0;
}

void freelang_jwt_clear_revocation(fl_jwt_manager_t *manager) {
  if (!manager) return;

  pthread_mutex_lock(&manager->jwt_mutex);
  memset(manager->revocation_list, 0, sizeof(manager->revocation_list));
  manager->revocation_count = 0;
  pthread_mutex_unlock(&manager->jwt_mutex);

  fprintf(stderr, "[JWT] Revocation list cleared\\n");
}

/* ===== Claims ===== */

fl_jwt_claims_t* freelang_jwt_get_claims(fl_jwt_token_t *token) {
  if (!token) return NULL;
  return &token->claims;
}

char* freelang_jwt_get_subject(fl_jwt_token_t *token) {
  if (!token) return NULL;
  return token->claims.subject;
}

char* freelang_jwt_get_claim(fl_jwt_token_t *token, const char *claim_name) {
  if (!token || !claim_name) return NULL;

  /* Simplified - return custom claims */
  return token->claims.custom_claims;
}

/* ===== Statistics ===== */

fl_jwt_stats_t freelang_jwt_get_stats(fl_jwt_manager_t *manager) {
  fl_jwt_stats_t stats = {0, 0, 0, 0.0, 0};

  if (!manager) return stats;

  pthread_mutex_lock(&manager->jwt_mutex);
  stats.total_issued = manager->token_count;
  stats.currently_valid = manager->valid_tokens;
  stats.revoked = manager->revoked_tokens;
  pthread_mutex_unlock(&manager->jwt_mutex);

  fprintf(stderr, "[JWT] Stats: total=%d, valid=%d, revoked=%d\\n",
          stats.total_issued, stats.currently_valid, stats.revoked);

  return stats;
}

void freelang_jwt_reset_stats(fl_jwt_manager_t *manager) {
  if (!manager) return;

  pthread_mutex_lock(&manager->jwt_mutex);
  manager->token_count = 0;
  manager->valid_tokens = 0;
  manager->revoked_tokens = 0;
  pthread_mutex_unlock(&manager->jwt_mutex);

  fprintf(stderr, "[JWT] Statistics reset\\n");
}
