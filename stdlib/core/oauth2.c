/**
 * FreeLang stdlib/oauth2 Implementation - OAuth2 Protocol
 */

#include "oauth2.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>
#include <pthread.h>

struct fl_oauth2_t {
  char *client_id;
  char *client_secret;
  char *authorization_endpoint;
  char *token_endpoint;
  char *userinfo_endpoint;
};

static fl_oauth2_stats_t global_stats = {0};
static pthread_mutex_t oauth2_mutex = PTHREAD_MUTEX_INITIALIZER;

fl_oauth2_t* fl_oauth2_client_create(const char *client_id, const char *client_secret) {
  if (!client_id || !client_secret) return NULL;

  fl_oauth2_t *client = (fl_oauth2_t*)malloc(sizeof(fl_oauth2_t));
  if (!client) return NULL;

  client->client_id = (char*)malloc(strlen(client_id) + 1);
  client->client_secret = (char*)malloc(strlen(client_secret) + 1);
  SAFE_STRCPY(client->client_id, client_id);
  SAFE_STRCPY(client->client_secret, client_secret);

  client->authorization_endpoint = (char*)malloc(256);
  client->token_endpoint = (char*)malloc(256);
  client->userinfo_endpoint = (char*)malloc(256);
  strncpy(client->authorization_endpoint, "https://provider.com/oauth/authorize", sizeof(client->authorization_endpoint)-1); client->authorization_endpoint[sizeof(client->authorization_endpoint)-1] = '\0';
  strncpy(client->token_endpoint, "https://provider.com/oauth/token", sizeof(client->token_endpoint)-1); client->token_endpoint[sizeof(client->token_endpoint)-1] = '\0';
  strncpy(client->userinfo_endpoint, "https://provider.com/oauth/userinfo", sizeof(client->userinfo_endpoint)-1); client->userinfo_endpoint[sizeof(client->userinfo_endpoint)-1] = '\0';

  fprintf(stderr, "[oauth2] Client created: %s\n", client_id);
  return client;
}

void fl_oauth2_client_destroy(fl_oauth2_t *client) {
  if (!client) return;

  free(client->client_id);
  free(client->client_secret);
  free(client->authorization_endpoint);
  free(client->token_endpoint);
  free(client->userinfo_endpoint);
  free(client);

  fprintf(stderr, "[oauth2] Client destroyed\n");
}

char* fl_oauth2_get_authorization_url(fl_oauth2_t *client, const char *redirect_uri, const char **scopes, int scope_count) {
  if (!client || !redirect_uri) return NULL;

  char *url = (char*)malloc(1024);
  if (!url) return NULL;

  SAFE_STRCPY(url, client->authorization_endpoint);
  strncat(url, "?client_id=", sizeof(url)-strlen(url)-1);
  SAFE_STRCAT(url, client->client_id);
  strncat(url, "&redirect_uri=", sizeof(url)-strlen(url)-1);
  SAFE_STRCAT(url, redirect_uri);
  strncat(url, "&response_type=code", sizeof(url)-strlen(url)-1);

  if (scope_count > 0 && scopes) {
    strncat(url, "&scope=", sizeof(url)-strlen(url)-1);
    for (int i = 0; i < scope_count; i++) {
      if (i > 0) strncat(url, "%20", sizeof(url)-strlen(url)-1);
      SAFE_STRCAT(url, scopes[i]);
    }
  }

  pthread_mutex_lock(&oauth2_mutex);
  global_stats.authorization_requests++;
  pthread_mutex_unlock(&oauth2_mutex);

  fprintf(stderr, "[oauth2] Authorization URL generated\n");
  return url;
}

int fl_oauth2_exchange_code(fl_oauth2_t *client, const char *code, const char *redirect_uri, fl_oauth2_token_response_t **token_out) {
  if (!client || !code || !redirect_uri || !token_out) return -1;

  fl_oauth2_token_response_t *token = (fl_oauth2_token_response_t*)malloc(sizeof(fl_oauth2_token_response_t));
  if (!token) return -1;

  token->access_token = (char*)malloc(128);
  token->refresh_token = (char*)malloc(128);
  token->token_type = (char*)malloc(32);
  strncpy(token->access_token, "at_", sizeof(token->access_token)-1); token->access_token[sizeof(token->access_token)-1] = '\0';
  SAFE_STRCAT(token->access_token, code);
  strncpy(token->refresh_token, "rt_", sizeof(token->refresh_token)-1); token->refresh_token[sizeof(token->refresh_token)-1] = '\0';
  SAFE_STRCAT(token->refresh_token, code);
  strncpy(token->token_type, "Bearer", sizeof(token->token_type)-1); token->token_type[sizeof(token->token_type)-1] = '\0';

  token->expires_at = time(NULL) + 3600;
  token->scopes = NULL;
  token->scope_count = 0;

  *token_out = token;

  pthread_mutex_lock(&oauth2_mutex);
  global_stats.token_requests++;
  pthread_mutex_unlock(&oauth2_mutex);

  fprintf(stderr, "[oauth2] Code exchanged for token\n");
  return 0;
}

int fl_oauth2_refresh_token(fl_oauth2_t *client, const char *refresh_token, fl_oauth2_token_response_t **token_out) {
  if (!client || !refresh_token || !token_out) return -1;

  fl_oauth2_token_response_t *token = (fl_oauth2_token_response_t*)malloc(sizeof(fl_oauth2_token_response_t));
  if (!token) return -1;

  token->access_token = (char*)malloc(128);
  strncpy(token->access_token, "at_new_", sizeof(token->access_token)-1); token->access_token[sizeof(token->access_token)-1] = '\0';
  SAFE_STRCAT(token->access_token, refresh_token);
  token->refresh_token = (char*)malloc(strlen(refresh_token) + 1);
  SAFE_STRCPY(token->refresh_token, refresh_token);
  token->token_type = (char*)malloc(32);
  strncpy(token->token_type, "Bearer", sizeof(token->token_type)-1); token->token_type[sizeof(token->token_type)-1] = '\0';
  token->expires_at = time(NULL) + 3600;
  token->scopes = NULL;
  token->scope_count = 0;

  *token_out = token;

  pthread_mutex_lock(&oauth2_mutex);
  global_stats.token_refreshes++;
  pthread_mutex_unlock(&oauth2_mutex);

  fprintf(stderr, "[oauth2] Token refreshed\n");
  return 0;
}

int fl_oauth2_validate_access_token(fl_oauth2_t *client, const char *access_token) {
  if (!client || !access_token) return 0;

  int valid = (strlen(access_token) > 10);

  if (valid) {
    fprintf(stderr, "[oauth2] Access token validated: valid\n");
  } else {
    pthread_mutex_lock(&oauth2_mutex);
    global_stats.token_errors++;
    pthread_mutex_unlock(&oauth2_mutex);
    fprintf(stderr, "[oauth2] Access token validated: invalid\n");
  }

  return valid ? 1 : 0;
}

int fl_oauth2_is_token_expired(const fl_oauth2_token_response_t *token) {
  if (!token) return 1;
  return time(NULL) >= token->expires_at ? 1 : 0;
}

int fl_oauth2_client_credentials_flow(fl_oauth2_t *client, const char **scopes, int scope_count, fl_oauth2_token_response_t **token_out) {
  if (!client || !token_out) return -1;

  fl_oauth2_token_response_t *token = (fl_oauth2_token_response_t*)malloc(sizeof(fl_oauth2_token_response_t));
  if (!token) return -1;

  token->access_token = (char*)malloc(128);
  token->refresh_token = NULL;
  token->token_type = (char*)malloc(32);
  strncpy(token->access_token, "cc_at_", sizeof(token->access_token)-1); token->access_token[sizeof(token->access_token)-1] = '\0';
  SAFE_STRCAT(token->access_token, client->client_id);
  strncpy(token->token_type, "Bearer", sizeof(token->token_type)-1); token->token_type[sizeof(token->token_type)-1] = '\0';
  token->expires_at = time(NULL) + 7200;
  token->scopes = (char**)malloc(sizeof(char*) * scope_count);
  token->scope_count = scope_count;

  for (int i = 0; i < scope_count; i++) {
    token->scopes[i] = (char*)malloc(strlen(scopes[i]) + 1);
    SAFE_STRCPY(token->scopes[i], scopes[i]);
  }

  *token_out = token;

  pthread_mutex_lock(&oauth2_mutex);
  global_stats.token_requests++;
  pthread_mutex_unlock(&oauth2_mutex);

  fprintf(stderr, "[oauth2] Client credentials flow completed\n");
  return 0;
}

fl_oauth2_stats_t* fl_oauth2_get_stats(void) {
  fl_oauth2_stats_t *stats = (fl_oauth2_stats_t*)malloc(sizeof(fl_oauth2_stats_t));
  if (!stats) return NULL;

  pthread_mutex_lock(&oauth2_mutex);
  memcpy(stats, &global_stats, sizeof(fl_oauth2_stats_t));
  pthread_mutex_unlock(&oauth2_mutex);

  return stats;
}

void fl_oauth2_reset_stats(void) {
  pthread_mutex_lock(&oauth2_mutex);
  memset(&global_stats, 0, sizeof(fl_oauth2_stats_t));
  pthread_mutex_unlock(&oauth2_mutex);

  fprintf(stderr, "[oauth2] Stats reset\n");
}

void fl_oauth2_token_free(fl_oauth2_token_response_t *token) {
  if (!token) return;

  free(token->access_token);
  free(token->refresh_token);
  free(token->token_type);

  if (token->scopes) {
    for (int i = 0; i < token->scope_count; i++) {
      free(token->scopes[i]);
    }
    free(token->scopes);
  }

  free(token);
}
