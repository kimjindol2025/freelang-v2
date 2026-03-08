/**
 * FreeLang OAuth2 Protocol Implementation (Phase 25-1)
 * OpenID Connect compatible OAuth2 implementation
 */

#include "oauth2.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>
#include <pthread.h>

/* ===== Provider Lifecycle ===== */

fl_oauth2_provider_t* freelang_oauth2_provider_create(void) {
  fl_oauth2_provider_t *provider = (fl_oauth2_provider_t*)malloc(sizeof(fl_oauth2_provider_t));
  if (!provider) return NULL;

  memset(provider, 0, sizeof(fl_oauth2_provider_t));
  pthread_mutex_init(&provider->oauth2_mutex, NULL);

  /* Default endpoints */
  strncpy(provider->authorization_endpoint, "/oauth2/authorize", sizeof(provider->authorization_endpoint) - 1);
  strncpy(provider->token_endpoint, "/oauth2/token", sizeof(provider->token_endpoint) - 1);
  strncpy(provider->userinfo_endpoint, "/oauth2/userinfo", sizeof(provider->userinfo_endpoint) - 1);

  /* Token lifetimes */
  provider->authcode_lifetime_sec = 600;          /* 10 minutes */
  provider->access_token_lifetime_sec = 3600;     /* 1 hour */
  provider->refresh_token_lifetime_sec = 604800;  /* 7 days */

  /* Default scopes */
  freelang_oauth2_define_scope(provider, "openid", "User identity");
  freelang_oauth2_define_scope(provider, "profile", "User profile data");
  freelang_oauth2_define_scope(provider, "email", "User email address");

  fprintf(stderr, "[OAuth2] Provider created with endpoints (auth, token, userinfo)\n");
  return provider;
}

void freelang_oauth2_provider_destroy(fl_oauth2_provider_t *provider) {
  if (!provider) return;

  pthread_mutex_destroy(&provider->oauth2_mutex);
  free(provider);

  fprintf(stderr, "[OAuth2] Provider destroyed\n");
}

/* ===== Client Registration ===== */

int freelang_oauth2_register_client(fl_oauth2_provider_t *provider,
                                     const char *client_name,
                                     const char *redirect_uri,
                                     int is_confidential) {
  if (!provider || !client_name || !redirect_uri) return -1;
  if (provider->client_count >= 256) return -1;

  pthread_mutex_lock(&provider->oauth2_mutex);

  fl_oauth2_client_t *client = &provider->clients[provider->client_count];

  /* Generate client_id (using timestamp + counter) */
  snprintf(client->client_id, sizeof(client->client_id), "cli_%ld_%d",
           time(NULL), provider->client_count);

  /* Generate client_secret (simple: base64-like string) */
  snprintf(client->client_secret, sizeof(client->client_secret),
           "secret_%ld_%d_%d", time(NULL), provider->client_count, rand());

  strncpy(client->client_name, client_name, sizeof(client->client_name) - 1);

  /* Register redirect URI */
  if (provider->clients[provider->client_count].redirect_uri_count < 10) {
    strncpy(client->redirect_uris[0], redirect_uri, sizeof(client->redirect_uris[0]) - 1);
    client->redirect_uri_count = 1;
  }

  client->is_confidential = is_confidential;
  client->is_public = !is_confidential;
  client->token_endpoint_auth_method = 1;  /* client_secret_basic */
  client->created_at = time(NULL);

  /* Default scope: openid */
  if (provider->scope_count > 0) {
    strcpy(client->scopes[0].scope_name, "openid");
    client->scope_count = 1;
  }

  int client_id = provider->client_count;
  provider->client_count++;

  pthread_mutex_unlock(&provider->oauth2_mutex);

  fprintf(stderr, "[OAuth2] Client registered: %s (confidential=%d)\n", client_name, is_confidential);
  return client_id;
}

fl_oauth2_client_t* freelang_oauth2_get_client(fl_oauth2_provider_t *provider,
                                                const char *client_id) {
  if (!provider || !client_id) return NULL;

  pthread_mutex_lock(&provider->oauth2_mutex);

  for (int i = 0; i < provider->client_count; i++) {
    if (strcmp(provider->clients[i].client_id, client_id) == 0) {
      pthread_mutex_unlock(&provider->oauth2_mutex);
      return &provider->clients[i];
    }
  }

  pthread_mutex_unlock(&provider->oauth2_mutex);
  return NULL;
}

/* ===== Authorization Flow ===== */

fl_oauth2_auth_request_t* freelang_oauth2_create_auth_request(
    fl_oauth2_provider_t *provider,
    const char *client_id,
    const char *redirect_uri,
    const char *scope) {
  if (!provider || !client_id || !redirect_uri) return NULL;

  fl_oauth2_auth_request_t *request = (fl_oauth2_auth_request_t*)malloc(sizeof(fl_oauth2_auth_request_t));
  if (!request) return NULL;

  memset(request, 0, sizeof(fl_oauth2_auth_request_t));

  strncpy(request->client_id, client_id, sizeof(request->client_id) - 1);
  strncpy(request->redirect_uri, redirect_uri, sizeof(request->redirect_uri) - 1);
  strncpy(request->response_type, "code", sizeof(request->response_type) - 1);

  /* Generate state (CSRF protection) */
  snprintf(request->state, sizeof(request->state), "state_%ld_%d", time(NULL), rand());

  /* Generate nonce (ID token verification) */
  snprintf(request->nonce, sizeof(request->nonce), "nonce_%ld_%d", time(NULL), rand());

  if (scope) {
    strncpy(request->scope, scope, sizeof(request->scope) - 1);
  } else {
    strcpy(request->scope, "openid profile email");
  }

  strncpy(request->prompt, "login", sizeof(request->prompt) - 1);
  request->created_at = time(NULL);
  request->is_valid = 1;

  fprintf(stderr, "[OAuth2] Auth request created (state=%s, nonce=%s)\n", request->state, request->nonce);
  return request;
}

int freelang_oauth2_validate_auth_request(fl_oauth2_provider_t *provider,
                                           fl_oauth2_auth_request_t *request) {
  if (!provider || !request) return 0;

  pthread_mutex_lock(&provider->oauth2_mutex);

  /* Validate client exists */
  fl_oauth2_client_t *client = NULL;
  for (int i = 0; i < provider->client_count; i++) {
    if (strcmp(provider->clients[i].client_id, request->client_id) == 0) {
      client = &provider->clients[i];
      break;
    }
  }

  if (!client) {
    pthread_mutex_unlock(&provider->oauth2_mutex);
    fprintf(stderr, "[OAuth2] Invalid client_id: %s\n", request->client_id);
    return 0;
  }

  /* Validate redirect_uri */
  int valid_redirect = 0;
  for (int i = 0; i < client->redirect_uri_count; i++) {
    if (strcmp(client->redirect_uris[i], request->redirect_uri) == 0) {
      valid_redirect = 1;
      break;
    }
  }

  if (!valid_redirect) {
    pthread_mutex_unlock(&provider->oauth2_mutex);
    fprintf(stderr, "[OAuth2] Invalid redirect_uri: %s\n", request->redirect_uri);
    return 0;
  }

  /* Validate scope (basic check) */
  if (strlen(request->scope) == 0) {
    pthread_mutex_unlock(&provider->oauth2_mutex);
    fprintf(stderr, "[OAuth2] Empty scope\n");
    return 0;
  }

  pthread_mutex_unlock(&provider->oauth2_mutex);

  fprintf(stderr, "[OAuth2] Auth request validated (client=%s, redirect=%s)\n",
          request->client_id, request->redirect_uri);
  return 1;
}

char* freelang_oauth2_issue_authcode(fl_oauth2_provider_t *provider,
                                      const char *client_id,
                                      const char *user_id,
                                      const char *scope,
                                      const char *redirect_uri) {
  if (!provider || !client_id || !user_id || !scope) return NULL;

  pthread_mutex_lock(&provider->oauth2_mutex);

  if (provider->authcode_count >= 1024) {
    pthread_mutex_unlock(&provider->oauth2_mutex);
    return NULL;
  }

  fl_oauth2_authcode_t *authcode = &provider->auth_codes[provider->authcode_count];

  /* Generate short-lived authorization code */
  snprintf(authcode->code, sizeof(authcode->code), "auth_%ld_%d",
           time(NULL), provider->authcode_count);

  strncpy(authcode->client_id, client_id, sizeof(authcode->client_id) - 1);
  strncpy(authcode->user_id, user_id, sizeof(authcode->user_id) - 1);
  strncpy(authcode->redirect_uri, redirect_uri, sizeof(authcode->redirect_uri) - 1);
  strncpy(authcode->scope, scope, sizeof(authcode->scope) - 1);

  authcode->issued_at = time(NULL);
  authcode->expires_at = authcode->issued_at + provider->authcode_lifetime_sec;
  authcode->is_redeemed = 0;

  char *code_copy = (char*)malloc(256);
  if (code_copy) {
    strcpy(code_copy, authcode->code);
  }

  provider->authcode_count++;
  provider->total_auth_requests++;

  pthread_mutex_unlock(&provider->oauth2_mutex);

  fprintf(stderr, "[OAuth2] Authorization code issued (code=%s, user=%s)\n",
          authcode->code, user_id);
  return code_copy;
}

/* ===== Token Endpoint ===== */

int freelang_oauth2_exchange_code(fl_oauth2_provider_t *provider,
                                   const char *client_id,
                                   const char *client_secret,
                                   const char *code,
                                   const char *redirect_uri,
                                   fl_oauth2_token_response_t *out_response) {
  if (!provider || !client_id || !client_secret || !code || !out_response) return -1;

  pthread_mutex_lock(&provider->oauth2_mutex);

  /* Verify client credentials */
  fl_oauth2_client_t *client = NULL;
  for (int i = 0; i < provider->client_count; i++) {
    if (strcmp(provider->clients[i].client_id, client_id) == 0) {
      client = &provider->clients[i];
      break;
    }
  }

  if (!client || strcmp(client->client_secret, client_secret) != 0) {
    pthread_mutex_unlock(&provider->oauth2_mutex);
    fprintf(stderr, "[OAuth2] Client authentication failed\n");
    return -1;
  }

  /* Find and validate authorization code */
  fl_oauth2_authcode_t *authcode = NULL;
  int authcode_idx = -1;

  for (int i = 0; i < provider->authcode_count; i++) {
    if (strcmp(provider->auth_codes[i].code, code) == 0) {
      authcode = &provider->auth_codes[i];
      authcode_idx = i;
      break;
    }
  }

  if (!authcode) {
    pthread_mutex_unlock(&provider->oauth2_mutex);
    fprintf(stderr, "[OAuth2] Authorization code not found\n");
    return -1;
  }

  time_t now = time(NULL);

  /* Check code expiration */
  if (now > authcode->expires_at) {
    pthread_mutex_unlock(&provider->oauth2_mutex);
    fprintf(stderr, "[OAuth2] Authorization code expired\n");
    return -1;
  }

  /* Check single-use guarantee */
  if (authcode->is_redeemed) {
    pthread_mutex_unlock(&provider->oauth2_mutex);
    fprintf(stderr, "[OAuth2] Authorization code already redeemed (SECURITY: possible attack)\n");
    return -1;
  }

  /* Validate redirect_uri matches */
  if (strcmp(authcode->redirect_uri, redirect_uri) != 0) {
    pthread_mutex_unlock(&provider->oauth2_mutex);
    fprintf(stderr, "[OAuth2] Redirect URI mismatch\n");
    return -1;
  }

  /* Mark as redeemed (single-use) */
  authcode->is_redeemed = 1;
  authcode->redeemed_at = now;

  /* Generate tokens */
  memset(out_response, 0, sizeof(fl_oauth2_token_response_t));

  /* Access token (JWT-like format) */
  snprintf(out_response->access_token, sizeof(out_response->access_token),
           "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.%s.%ld",
           authcode->user_id, now);

  strcpy(out_response->token_type, "Bearer");
  out_response->expires_in = provider->access_token_lifetime_sec;

  /* Refresh token */
  snprintf(out_response->refresh_token, sizeof(out_response->refresh_token),
           "refresh_%ld_%d", now, rand());

  /* ID token (OpenID Connect) */
  snprintf(out_response->id_token, sizeof(out_response->id_token),
           "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.%s_id.%ld",
           authcode->user_id, now);

  strcpy(out_response->scope, authcode->scope);

  provider->total_tokens_issued++;

  pthread_mutex_unlock(&provider->oauth2_mutex);

  fprintf(stderr, "[OAuth2] Token exchange successful (user=%s, access_token expires in %ds)\n",
          authcode->user_id, out_response->expires_in);
  return 0;
}

int freelang_oauth2_refresh_token(fl_oauth2_provider_t *provider,
                                   const char *client_id,
                                   const char *client_secret,
                                   const char *refresh_token,
                                   fl_oauth2_token_response_t *out_response) {
  if (!provider || !client_id || !refresh_token || !out_response) return -1;

  pthread_mutex_lock(&provider->oauth2_mutex);

  /* Verify client */
  fl_oauth2_client_t *client = NULL;
  for (int i = 0; i < provider->client_count; i++) {
    if (strcmp(provider->clients[i].client_id, client_id) == 0) {
      client = &provider->clients[i];
      break;
    }
  }

  if (!client) {
    pthread_mutex_unlock(&provider->oauth2_mutex);
    fprintf(stderr, "[OAuth2] Client not found for token refresh\n");
    return -1;
  }

  /* Generate new access token */
  memset(out_response, 0, sizeof(fl_oauth2_token_response_t));

  time_t now = time(NULL);
  snprintf(out_response->access_token, sizeof(out_response->access_token),
           "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.%s.%ld",
           client_id, now);

  strcpy(out_response->token_type, "Bearer");
  out_response->expires_in = provider->access_token_lifetime_sec;

  /* Keep original refresh token or generate new one */
  strncpy(out_response->refresh_token, refresh_token, sizeof(out_response->refresh_token) - 1);

  provider->total_tokens_refreshed++;

  pthread_mutex_unlock(&provider->oauth2_mutex);

  fprintf(stderr, "[OAuth2] Token refreshed (access_token expires in %ds)\n",
          out_response->expires_in);
  return 0;
}

/* ===== Validation ===== */

int freelang_oauth2_validate_code(fl_oauth2_provider_t *provider,
                                   const char *code) {
  if (!provider || !code) return 0;

  pthread_mutex_lock(&provider->oauth2_mutex);

  for (int i = 0; i < provider->authcode_count; i++) {
    if (strcmp(provider->auth_codes[i].code, code) == 0) {
      int is_valid = !provider->auth_codes[i].is_redeemed &&
                     (time(NULL) <= provider->auth_codes[i].expires_at);

      pthread_mutex_unlock(&provider->oauth2_mutex);
      return is_valid ? 1 : 0;
    }
  }

  pthread_mutex_unlock(&provider->oauth2_mutex);
  return 0;
}

int freelang_oauth2_validate_redirect_uri(fl_oauth2_provider_t *provider,
                                           const char *client_id,
                                           const char *redirect_uri) {
  if (!provider || !client_id || !redirect_uri) return 0;

  pthread_mutex_lock(&provider->oauth2_mutex);

  fl_oauth2_client_t *client = NULL;
  for (int i = 0; i < provider->client_count; i++) {
    if (strcmp(provider->clients[i].client_id, client_id) == 0) {
      client = &provider->clients[i];
      break;
    }
  }

  if (!client) {
    pthread_mutex_unlock(&provider->oauth2_mutex);
    return 0;
  }

  for (int i = 0; i < client->redirect_uri_count; i++) {
    if (strcmp(client->redirect_uris[i], redirect_uri) == 0) {
      pthread_mutex_unlock(&provider->oauth2_mutex);
      return 1;
    }
  }

  pthread_mutex_unlock(&provider->oauth2_mutex);
  return 0;
}

/* ===== Scope Management ===== */

void freelang_oauth2_define_scope(fl_oauth2_provider_t *provider,
                                   const char *scope_name,
                                   const char *description) {
  if (!provider || !scope_name) return;
  if (provider->scope_count >= 64) return;

  pthread_mutex_lock(&provider->oauth2_mutex);

  fl_oauth2_scope_t *scope = &provider->scopes[provider->scope_count];
  strncpy(scope->scope_name, scope_name, sizeof(scope->scope_name) - 1);
  strncpy(scope->description, description, sizeof(scope->description) - 1);
  scope->is_active = 1;

  provider->scope_count++;

  pthread_mutex_unlock(&provider->oauth2_mutex);

  fprintf(stderr, "[OAuth2] Scope defined: %s\n", scope_name);
}

int freelang_oauth2_has_scope(const char *granted_scopes,
                               const char *required_scope) {
  if (!granted_scopes || !required_scope) return 0;

  /* Check if required_scope is in space-separated granted_scopes */
  char scopes_copy[512];
  strncpy(scopes_copy, granted_scopes, sizeof(scopes_copy) - 1);

  char *token = strtok(scopes_copy, " ");
  while (token) {
    if (strcmp(token, required_scope) == 0) {
      return 1;
    }
    token = strtok(NULL, " ");
  }

  return 0;
}

/* ===== Statistics ===== */

fl_oauth2_stats_t freelang_oauth2_get_stats(fl_oauth2_provider_t *provider) {
  fl_oauth2_stats_t stats = {0, 0, 0, 0, 0};

  if (!provider) return stats;

  pthread_mutex_lock(&provider->oauth2_mutex);

  stats.total_auth_requests = provider->total_auth_requests;
  stats.total_tokens_issued = provider->total_tokens_issued;
  stats.total_tokens_refreshed = provider->total_tokens_refreshed;
  stats.total_clients = provider->client_count;

  /* Count active auth codes */
  time_t now = time(NULL);
  for (int i = 0; i < provider->authcode_count; i++) {
    if (!provider->auth_codes[i].is_redeemed && now <= provider->auth_codes[i].expires_at) {
      stats.active_authcodes++;
    }
  }

  pthread_mutex_unlock(&provider->oauth2_mutex);

  return stats;
}
