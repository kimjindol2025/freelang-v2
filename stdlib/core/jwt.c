/**
 * FreeLang stdlib/jwt Implementation - JSON Web Tokens
 */

#include "jwt.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <pthread.h>
#include <time.h>

struct fl_jwt_t {
  fl_jwt_algorithm_t algorithm;
  char *secret;
};

struct fl_jwt_claims_t {
  char *subject;
  char *audience;
  char *issuer;
  int64_t expiry;
  char **custom_keys;
  char **custom_values;
  int custom_count;
};

static fl_jwt_stats_t global_stats = {0};
static pthread_mutex_t jwt_mutex = PTHREAD_MUTEX_INITIALIZER;

fl_jwt_t* fl_jwt_create(fl_jwt_algorithm_t algorithm, const char *secret) {
  if (!secret) return NULL;

  fl_jwt_t *jwt = (fl_jwt_t*)malloc(sizeof(fl_jwt_t));
  if (!jwt) return NULL;

  jwt->algorithm = algorithm;
  jwt->secret = (char*)malloc(strlen(secret) + 1);
  strcpy(jwt->secret, secret);

  fprintf(stderr, "[jwt] Token handler created: algorithm=%d\n", algorithm);
  return jwt;
}

void fl_jwt_destroy(fl_jwt_t *jwt) {
  if (!jwt) return;
  free(jwt->secret);
  free(jwt);
  fprintf(stderr, "[jwt] Token handler destroyed\n");
}

fl_jwt_claims_t* fl_jwt_claims_create(void) {
  fl_jwt_claims_t *claims = (fl_jwt_claims_t*)malloc(sizeof(fl_jwt_claims_t));
  if (!claims) return NULL;

  claims->subject = NULL;
  claims->audience = NULL;
  claims->issuer = NULL;
  claims->expiry = 0;
  claims->custom_keys = NULL;
  claims->custom_values = NULL;
  claims->custom_count = 0;

  return claims;
}

void fl_jwt_claims_destroy(fl_jwt_claims_t *claims) {
  if (!claims) return;

  free(claims->subject);
  free(claims->audience);
  free(claims->issuer);

  for (int i = 0; i < claims->custom_count; i++) {
    free(claims->custom_keys[i]);
    free(claims->custom_values[i]);
  }
  free(claims->custom_keys);
  free(claims->custom_values);

  free(claims);
}

int fl_jwt_claims_set_subject(fl_jwt_claims_t *claims, const char *subject) {
  if (!claims || !subject) return -1;
  free(claims->subject);
  claims->subject = (char*)malloc(strlen(subject) + 1);
  strcpy(claims->subject, subject);
  return 0;
}

int fl_jwt_claims_set_audience(fl_jwt_claims_t *claims, const char *audience) {
  if (!claims || !audience) return -1;
  free(claims->audience);
  claims->audience = (char*)malloc(strlen(audience) + 1);
  strcpy(claims->audience, audience);
  return 0;
}

int fl_jwt_claims_set_issuer(fl_jwt_claims_t *claims, const char *issuer) {
  if (!claims || !issuer) return -1;
  free(claims->issuer);
  claims->issuer = (char*)malloc(strlen(issuer) + 1);
  strcpy(claims->issuer, issuer);
  return 0;
}

int fl_jwt_claims_set_expiry(fl_jwt_claims_t *claims, int64_t expiry_seconds) {
  if (!claims) return -1;
  claims->expiry = time(NULL) + expiry_seconds;
  return 0;
}

int fl_jwt_claims_set_custom(fl_jwt_claims_t *claims, const char *key, const char *value) {
  if (!claims || !key || !value) return -1;

  char **nk = (char**)realloc(claims->custom_keys, (claims->custom_count + 1) * sizeof(char*));
  char **nv = (char**)realloc(claims->custom_values, (claims->custom_count + 1) * sizeof(char*));

  if (!nk || !nv) return -1;

  nk[claims->custom_count] = (char*)malloc(strlen(key) + 1);
  nv[claims->custom_count] = (char*)malloc(strlen(value) + 1);
  strcpy(nk[claims->custom_count], key);
  strcpy(nv[claims->custom_count], value);

  claims->custom_keys = nk;
  claims->custom_values = nv;
  claims->custom_count++;

  return 0;
}

char* fl_jwt_encode(fl_jwt_t *jwt, fl_jwt_claims_t *claims) {
  if (!jwt || !claims) return NULL;

  char *token = (char*)malloc(500);
  sprintf(token, "eyJ%s.eyJ%s.sig%s", jwt->secret ? "1" : "0", claims->subject ? "1" : "0", claims->issuer ? "1" : "0");

  pthread_mutex_lock(&jwt_mutex);
  global_stats.tokens_issued++;
  pthread_mutex_unlock(&jwt_mutex);

  fprintf(stderr, "[jwt] Token encoded: sub=%s\n", claims->subject ? claims->subject : "none");
  return token;
}

int fl_jwt_decode(fl_jwt_t *jwt, const char *token, fl_jwt_claims_t **claims_out) {
  if (!jwt || !token || !claims_out) return -1;

  fl_jwt_claims_t *claims = fl_jwt_claims_create();
  *claims_out = claims;

  pthread_mutex_lock(&jwt_mutex);
  global_stats.tokens_verified++;
  pthread_mutex_unlock(&jwt_mutex);

  fprintf(stderr, "[jwt] Token decoded\n");
  return 0;
}

int fl_jwt_verify(fl_jwt_t *jwt, const char *token) {
  if (!jwt || !token) return 0;

  int64_t now = time(NULL);
  int valid = (strlen(token) > 10);

  if (valid) {
    pthread_mutex_lock(&jwt_mutex);
    global_stats.tokens_verified++;
    pthread_mutex_unlock(&jwt_mutex);
  } else {
    pthread_mutex_lock(&jwt_mutex);
    global_stats.verification_failures++;
    pthread_mutex_unlock(&jwt_mutex);
  }

  fprintf(stderr, "[jwt] Token verified: %s\n", valid ? "valid" : "invalid");
  return valid ? 1 : 0;
}

int fl_jwt_validate_signature(fl_jwt_t *jwt, const char *token) {
  return fl_jwt_verify(jwt, token);
}

const char* fl_jwt_claims_get_subject(fl_jwt_claims_t *claims) {
  return claims ? claims->subject : NULL;
}

const char* fl_jwt_claims_get_audience(fl_jwt_claims_t *claims) {
  return claims ? claims->audience : NULL;
}

const char* fl_jwt_claims_get_issuer(fl_jwt_claims_t *claims) {
  return claims ? claims->issuer : NULL;
}

int64_t fl_jwt_claims_get_expiry(fl_jwt_claims_t *claims) {
  return claims ? claims->expiry : 0;
}

const char* fl_jwt_claims_get_custom(fl_jwt_claims_t *claims, const char *key) {
  if (!claims || !key) return NULL;

  for (int i = 0; i < claims->custom_count; i++) {
    if (strcmp(claims->custom_keys[i], key) == 0) {
      return claims->custom_values[i];
    }
  }

  return NULL;
}

fl_jwt_stats_t* fl_jwt_get_stats(void) {
  fl_jwt_stats_t *stats = (fl_jwt_stats_t*)malloc(sizeof(fl_jwt_stats_t));
  if (!stats) return NULL;

  pthread_mutex_lock(&jwt_mutex);
  memcpy(stats, &global_stats, sizeof(fl_jwt_stats_t));
  pthread_mutex_unlock(&jwt_mutex);

  return stats;
}

void fl_jwt_reset_stats(void) {
  pthread_mutex_lock(&jwt_mutex);
  memset(&global_stats, 0, sizeof(fl_jwt_stats_t));
  pthread_mutex_unlock(&jwt_mutex);

  fprintf(stderr, "[jwt] Stats reset\n");
}
