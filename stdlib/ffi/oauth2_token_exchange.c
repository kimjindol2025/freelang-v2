/**
 * FreeLang OAuth2 ↔ JWT Token Exchange Implementation (Phase 25-3)
 * Seamless integration between OAuth2 and internal JWT tokens
 */

#include "oauth2_token_exchange.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>

/* ===== Manager Lifecycle ===== */

fl_token_exchange_manager_t* freelang_oauth2_token_exchange_create(void) {
  fl_token_exchange_manager_t *manager = (fl_token_exchange_manager_t*)malloc(sizeof(fl_token_exchange_manager_t));
  if (!manager) return NULL;

  memset(manager, 0, sizeof(fl_token_exchange_manager_t));
  pthread_mutex_init(&manager->exchange_mutex, NULL);

  /* Default scope mappings */
  freelang_oauth2_map_scope(manager, "openid", "READ");
  freelang_oauth2_map_scope(manager, "profile", "READ");
  freelang_oauth2_map_scope(manager, "email", "READ");

  fprintf(stderr, "[TokenExchange] Manager created with default scope mappings\n");
  return manager;
}

void freelang_oauth2_token_exchange_destroy(fl_token_exchange_manager_t *manager) {
  if (!manager) return;

  pthread_mutex_destroy(&manager->exchange_mutex);
  free(manager);

  fprintf(stderr, "[TokenExchange] Manager destroyed\n");
}

/* ===== Scope Mapping ===== */

int freelang_oauth2_map_scope(fl_token_exchange_manager_t *manager,
                               const char *oauth2_scope,
                               const char *freelang_scope) {
  if (!manager || !oauth2_scope || !freelang_scope) return -1;
  if (manager->scope_mapping_count >= 64) return -1;

  pthread_mutex_lock(&manager->exchange_mutex);

  fl_scope_mapping_t *mapping = &manager->scope_mappings[manager->scope_mapping_count];
  strncpy(mapping->oauth2_scope, oauth2_scope, sizeof(mapping->oauth2_scope) - 1);
  strncpy(mapping->freelang_scope, freelang_scope, sizeof(mapping->freelang_scope) - 1);
  mapping->is_active = 1;

  manager->scope_mapping_count++;

  pthread_mutex_unlock(&manager->exchange_mutex);

  fprintf(stderr, "[TokenExchange] Scope mapping created: %s -> %s\n", oauth2_scope, freelang_scope);
  return 0;
}

char* freelang_oauth2_get_mapped_scope(fl_token_exchange_manager_t *manager,
                                        const char *oauth2_scope) {
  if (!manager || !oauth2_scope) return NULL;

  pthread_mutex_lock(&manager->exchange_mutex);

  for (int i = 0; i < manager->scope_mapping_count; i++) {
    if (manager->scope_mappings[i].is_active &&
        strcmp(manager->scope_mappings[i].oauth2_scope, oauth2_scope) == 0) {
      char *scope_copy = (char*)malloc(64);
      if (scope_copy) {
        strcpy(scope_copy, manager->scope_mappings[i].freelang_scope);
      }

      pthread_mutex_unlock(&manager->exchange_mutex);
      return scope_copy;
    }
  }

  pthread_mutex_unlock(&manager->exchange_mutex);
  return NULL;
}

/* ===== Token Parsing ===== */

int freelang_oauth2_parse_claims(const char *token,
                                  fl_oauth2_token_claims_t *out_claims) {
  if (!token || !out_claims) return -1;

  memset(out_claims, 0, sizeof(fl_oauth2_token_claims_t));

  /* Simulate JWT parsing (simple base64 decode in real implementation) */
  strncpy(out_claims->iss, "https://accounts.google.com", sizeof(out_claims->iss) - 1);
  strncpy(out_claims->sub, "123456789", sizeof(out_claims->sub) - 1);
  strncpy(out_claims->aud, "freelang_app", sizeof(out_claims->aud) - 1);
  strncpy(out_claims->scope, "openid profile email", sizeof(out_claims->scope) - 1);

  out_claims->iat = time(NULL);
  out_claims->exp = time(NULL) + 3600;
  out_claims->email_verified = 1;

  return 0;
}

int freelang_jwt_parse_claims(const char *token,
                               fl_jwt_token_claims_t *out_claims) {
  if (!token || !out_claims) return -1;

  memset(out_claims, 0, sizeof(fl_jwt_token_claims_t));

  /* Simulate JWT parsing */
  strncpy(out_claims->iss, "freelang", sizeof(out_claims->iss) - 1);
  strncpy(out_claims->sub, "user_123", sizeof(out_claims->sub) - 1);
  strncpy(out_claims->role, "USER", sizeof(out_claims->role) - 1);
  strncpy(out_claims->permission, "READ", sizeof(out_claims->permission) - 1);

  out_claims->iat = time(NULL);
  out_claims->exp = time(NULL) + 3600;
  out_claims->is_refreshable = 1;

  return 0;
}

/* ===== Token Exchange ===== */

int freelang_oauth2_to_jwt(fl_token_exchange_manager_t *manager,
                            const char *user_id,
                            const char *oauth2_token,
                            const char *oauth2_scope,
                            char *out_jwt_token,
                            int max_token_len) {
  if (!manager || !user_id || !oauth2_token || !out_jwt_token) return -1;

  pthread_mutex_lock(&manager->exchange_mutex);

  if (manager->exchange_count >= 512) {
    pthread_mutex_unlock(&manager->exchange_mutex);
    return -1;
  }

  /* Parse OAuth2 token */
  fl_oauth2_token_claims_t oauth2_claims = {0};
  freelang_oauth2_parse_claims(oauth2_token, &oauth2_claims);

  /* Map OAuth2 scopes to FreeLang permissions */
  char mapped_permission[256] = {0};
  if (oauth2_scope) {
    char *mapped = freelang_oauth2_get_mapped_scope(manager, oauth2_scope);
    if (mapped) {
      strncpy(mapped_permission, mapped, sizeof(mapped_permission) - 1);
      free(mapped);
    }
  }

  if (strlen(mapped_permission) == 0) {
    strcpy(mapped_permission, "READ");  /* Default permission */
  }

  /* Generate JWT token */
  time_t now = time(NULL);
  snprintf(out_jwt_token, max_token_len,
           "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.%s.%ld",
           user_id, now);

  /* Record exchange for audit */
  fl_token_exchange_context_t *ctx = &manager->exchanges[manager->exchange_count];
  strncpy(ctx->exchange_id, "exchange_", sizeof(ctx->exchange_id) - 1);
  snprintf(ctx->exchange_id + 9, sizeof(ctx->exchange_id) - 10, "%ld", now);

  strncpy(ctx->source_token, oauth2_token, sizeof(ctx->source_token) - 1);
  ctx->source_type = TOKEN_TYPE_OAUTH2;

  strncpy(ctx->target_token, out_jwt_token, sizeof(ctx->target_token) - 1);
  ctx->target_type = TOKEN_TYPE_JWT;

  strncpy(ctx->user_id, user_id, sizeof(ctx->user_id) - 1);
  strncpy(ctx->scope, oauth2_scope ? oauth2_scope : "openid", sizeof(ctx->scope) - 1);

  ctx->created_at = now;
  ctx->expires_at = now + 3600;
  ctx->is_valid = 1;

  manager->exchange_count++;
  manager->total_oauth2_to_jwt++;

  pthread_mutex_unlock(&manager->exchange_mutex);

  fprintf(stderr, "[TokenExchange] OAuth2 -> JWT conversion (user=%s, scope=%s)\n", user_id, oauth2_scope);
  return 0;
}

int freelang_jwt_to_oauth2(fl_token_exchange_manager_t *manager,
                            const char *jwt_token,
                            const char *target_provider,
                            char *out_oauth2_token,
                            int max_token_len) {
  if (!manager || !jwt_token || !target_provider || !out_oauth2_token) return -1;

  pthread_mutex_lock(&manager->exchange_mutex);

  if (manager->exchange_count >= 512) {
    pthread_mutex_unlock(&manager->exchange_mutex);
    return -1;
  }

  /* Parse JWT token */
  fl_jwt_token_claims_t jwt_claims = {0};
  freelang_jwt_parse_claims(jwt_token, &jwt_claims);

  /* Generate OAuth2 compatible token */
  time_t now = time(NULL);
  snprintf(out_oauth2_token, max_token_len,
           "oauth2_%s_%ld",
           target_provider, now);

  /* Record exchange for audit */
  fl_token_exchange_context_t *ctx = &manager->exchanges[manager->exchange_count];
  snprintf(ctx->exchange_id, sizeof(ctx->exchange_id), "jwt2oauth_%ld", now);

  strncpy(ctx->source_token, jwt_token, sizeof(ctx->source_token) - 1);
  ctx->source_type = TOKEN_TYPE_JWT;

  strncpy(ctx->target_token, out_oauth2_token, sizeof(ctx->target_token) - 1);
  ctx->target_type = TOKEN_TYPE_OAUTH2;

  strncpy(ctx->user_id, jwt_claims.sub, sizeof(ctx->user_id) - 1);
  strncpy(ctx->scope, jwt_claims.permission, sizeof(ctx->scope) - 1);

  ctx->created_at = now;
  ctx->expires_at = now + 3600;
  ctx->is_valid = 1;

  manager->exchange_count++;
  manager->total_jwt_to_oauth2++;

  pthread_mutex_unlock(&manager->exchange_mutex);

  fprintf(stderr, "[TokenExchange] JWT -> OAuth2 conversion (provider=%s)\n", target_provider);
  return 0;
}

/* ===== Cross-System Validation ===== */

int freelang_oauth2_validate_and_map(fl_token_exchange_manager_t *manager,
                                      const char *oauth2_token,
                                      fl_jwt_token_claims_t *out_jwt_claims) {
  if (!manager || !oauth2_token || !out_jwt_claims) return -1;

  pthread_mutex_lock(&manager->exchange_mutex);

  /* Parse OAuth2 token */
  fl_oauth2_token_claims_t oauth2_claims = {0};
  freelang_oauth2_parse_claims(oauth2_token, &oauth2_claims);

  /* Validate expiration */
  if (time(NULL) > oauth2_claims.exp) {
    pthread_mutex_unlock(&manager->exchange_mutex);
    fprintf(stderr, "[TokenExchange] OAuth2 token expired\n");
    manager->failed_exchanges++;
    return -1;
  }

  /* Map to JWT claims */
  memset(out_jwt_claims, 0, sizeof(fl_jwt_token_claims_t));
  strcpy(out_jwt_claims->iss, "freelang");
  strncpy(out_jwt_claims->sub, oauth2_claims.sub, sizeof(out_jwt_claims->sub) - 1);

  /* Map OAuth2 scope to permission */
  char *mapped_perm = freelang_oauth2_get_mapped_scope(manager, oauth2_claims.scope);
  if (mapped_perm) {
    strncpy(out_jwt_claims->permission, mapped_perm, sizeof(out_jwt_claims->permission) - 1);
    free(mapped_perm);
  } else {
    strcpy(out_jwt_claims->permission, "READ");
  }

  out_jwt_claims->iat = time(NULL);
  out_jwt_claims->exp = time(NULL) + 3600;

  pthread_mutex_unlock(&manager->exchange_mutex);

  fprintf(stderr, "[TokenExchange] OAuth2 token validated and mapped (sub=%s, perm=%s)\n",
          out_jwt_claims->sub, out_jwt_claims->permission);
  return 0;
}

int freelang_jwt_validate_against_oauth2(fl_token_exchange_manager_t *manager,
                                          const char *jwt_token,
                                          const char *required_oauth2_scope) {
  if (!manager || !jwt_token || !required_oauth2_scope) return -1;

  pthread_mutex_lock(&manager->exchange_mutex);

  /* Parse JWT token */
  fl_jwt_token_claims_t jwt_claims = {0};
  freelang_jwt_parse_claims(jwt_token, &jwt_claims);

  /* Validate expiration */
  if (time(NULL) > jwt_claims.exp) {
    pthread_mutex_unlock(&manager->exchange_mutex);
    fprintf(stderr, "[TokenExchange] JWT token expired\n");
    return -1;
  }

  /* Check if JWT permission covers OAuth2 scope requirement */
  int valid = strcmp(jwt_claims.permission, "ADMIN") == 0 ||
              strcmp(jwt_claims.permission, "EXECUTE") == 0;

  pthread_mutex_unlock(&manager->exchange_mutex);

  return valid ? 0 : -1;
}

/* ===== Token Compatibility ===== */

int freelang_oauth2_scope_covers_permission(fl_token_exchange_manager_t *manager,
                                             const char *oauth2_scope,
                                             const char *required_permission) {
  if (!manager || !oauth2_scope || !required_permission) return 0;

  pthread_mutex_lock(&manager->exchange_mutex);

  char *mapped = freelang_oauth2_get_mapped_scope(manager, oauth2_scope);
  if (!mapped) {
    pthread_mutex_unlock(&manager->exchange_mutex);
    return 0;
  }

  int covers = strcmp(mapped, required_permission) == 0 ||
               strcmp(mapped, "ADMIN") == 0;
  free(mapped);

  pthread_mutex_unlock(&manager->exchange_mutex);

  return covers ? 1 : 0;
}

int freelang_oauth2_add_scopes(fl_token_exchange_manager_t *manager,
                                const char *token,
                                const char *additional_scopes,
                                char *out_updated_token,
                                int max_token_len) {
  if (!manager || !token || !additional_scopes || !out_updated_token) return -1;

  pthread_mutex_lock(&manager->exchange_mutex);

  /* Simulate scope addition (append to token) */
  snprintf(out_updated_token, max_token_len, "%s_%s", token, additional_scopes);

  pthread_mutex_unlock(&manager->exchange_mutex);

  fprintf(stderr, "[TokenExchange] Scopes added to token: %s\n", additional_scopes);
  return 0;
}

/* ===== Exchange History ===== */

void freelang_oauth2_token_exchange_get_history(fl_token_exchange_manager_t *manager,
                                                 const char *user_id,
                                                 fl_token_exchange_context_t **exchanges,
                                                 int *count) {
  if (!manager || !user_id || !exchanges || !count) return;

  *count = 0;
  pthread_mutex_lock(&manager->exchange_mutex);

  for (int i = 0; i < manager->exchange_count && *count < 512; i++) {
    if (strcmp(manager->exchanges[i].user_id, user_id) == 0) {
      exchanges[(*count)++] = &manager->exchanges[i];
    }
  }

  pthread_mutex_unlock(&manager->exchange_mutex);
}

/* ===== Statistics ===== */

fl_token_exchange_stats_t freelang_oauth2_token_exchange_get_stats(fl_token_exchange_manager_t *manager) {
  fl_token_exchange_stats_t stats = {0, 0, 0, 0, 0};

  if (!manager) return stats;

  pthread_mutex_lock(&manager->exchange_mutex);

  stats.total_oauth2_to_jwt = manager->total_oauth2_to_jwt;
  stats.total_jwt_to_oauth2 = manager->total_jwt_to_oauth2;
  stats.failed_exchanges = manager->failed_exchanges;
  stats.active_mapped_scopes = manager->scope_mapping_count;
  stats.cached_validations = manager->validated_count;

  pthread_mutex_unlock(&manager->exchange_mutex);

  return stats;
}

void freelang_oauth2_clear_validation_cache(fl_token_exchange_manager_t *manager) {
  if (!manager) return;

  pthread_mutex_lock(&manager->exchange_mutex);

  memset(manager->validated_tokens, 0, sizeof(manager->validated_tokens));
  memset(manager->validated_at, 0, sizeof(manager->validated_at));
  manager->validated_count = 0;

  pthread_mutex_unlock(&manager->exchange_mutex);

  fprintf(stderr, "[TokenExchange] Validation cache cleared\n");
}
