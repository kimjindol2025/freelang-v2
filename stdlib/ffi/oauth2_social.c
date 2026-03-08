/**
 * FreeLang OAuth2 Social Provider Integration (Phase 25-2)
 * Google, GitHub, Facebook OAuth2 connectors implementation
 */

#include "oauth2_social.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>

/* ===== Manager Lifecycle ===== */

fl_social_provider_manager_t* freelang_oauth2_social_manager_create(void) {
  fl_social_provider_manager_t *manager = (fl_social_provider_manager_t*)malloc(sizeof(fl_social_provider_manager_t));
  if (!manager) return NULL;

  memset(manager, 0, sizeof(fl_social_provider_manager_t));
  pthread_mutex_init(&manager->social_mutex, NULL);

  fprintf(stderr, "[OAuth2Social] Manager created\n");
  return manager;
}

void freelang_oauth2_social_manager_destroy(fl_social_provider_manager_t *manager) {
  if (!manager) return;

  pthread_mutex_destroy(&manager->social_mutex);
  free(manager);

  fprintf(stderr, "[OAuth2Social] Manager destroyed\n");
}

/* ===== Provider Configuration ===== */

int freelang_oauth2_configure_google(fl_social_provider_manager_t *manager,
                                      const char *client_id,
                                      const char *client_secret,
                                      const char *redirect_uri) {
  if (!manager || !client_id || !client_secret) return -1;

  pthread_mutex_lock(&manager->social_mutex);

  fl_social_provider_config_t *config = &manager->providers[SOCIAL_PROVIDER_GOOGLE];

  config->provider_type = SOCIAL_PROVIDER_GOOGLE;
  strcpy(config->provider_name, "google");

  strncpy(config->client_id, client_id, sizeof(config->client_id) - 1);
  strncpy(config->client_secret, client_secret, sizeof(config->client_secret) - 1);

  /* Google OAuth2 endpoints */
  strcpy(config->auth_endpoint, "https://accounts.google.com/o/oauth2/v2/auth");
  strcpy(config->token_endpoint, "https://oauth2.googleapis.com/token");
  strcpy(config->userinfo_endpoint, "https://openidconnect.googleapis.com/v1/userinfo");

  strncpy(config->redirect_uri, redirect_uri, sizeof(config->redirect_uri) - 1);
  strcpy(config->scopes, "openid profile email");

  config->is_configured = 1;
  config->configured_at = time(NULL);

  manager->provider_count++;

  pthread_mutex_unlock(&manager->social_mutex);

  fprintf(stderr, "[OAuth2Social] Google configured (client_id=%s)\n", client_id);
  return 0;
}

int freelang_oauth2_configure_github(fl_social_provider_manager_t *manager,
                                      const char *client_id,
                                      const char *client_secret,
                                      const char *redirect_uri) {
  if (!manager || !client_id || !client_secret) return -1;

  pthread_mutex_lock(&manager->social_mutex);

  fl_social_provider_config_t *config = &manager->providers[SOCIAL_PROVIDER_GITHUB];

  config->provider_type = SOCIAL_PROVIDER_GITHUB;
  strcpy(config->provider_name, "github");

  strncpy(config->client_id, client_id, sizeof(config->client_id) - 1);
  strncpy(config->client_secret, client_secret, sizeof(config->client_secret) - 1);

  /* GitHub OAuth2 endpoints */
  strcpy(config->auth_endpoint, "https://github.com/login/oauth/authorize");
  strcpy(config->token_endpoint, "https://github.com/login/oauth/access_token");
  strcpy(config->userinfo_endpoint, "https://api.github.com/user");

  strncpy(config->redirect_uri, redirect_uri, sizeof(config->redirect_uri) - 1);
  strcpy(config->scopes, "user:email");

  config->is_configured = 1;
  config->configured_at = time(NULL);

  manager->provider_count++;

  pthread_mutex_unlock(&manager->social_mutex);

  fprintf(stderr, "[OAuth2Social] GitHub configured (client_id=%s)\n", client_id);
  return 0;
}

int freelang_oauth2_configure_facebook(fl_social_provider_manager_t *manager,
                                        const char *app_id,
                                        const char *app_secret,
                                        const char *redirect_uri) {
  if (!manager || !app_id || !app_secret) return -1;

  pthread_mutex_lock(&manager->social_mutex);

  fl_social_provider_config_t *config = &manager->providers[SOCIAL_PROVIDER_FACEBOOK];

  config->provider_type = SOCIAL_PROVIDER_FACEBOOK;
  strcpy(config->provider_name, "facebook");

  strncpy(config->client_id, app_id, sizeof(config->client_id) - 1);
  strncpy(config->client_secret, app_secret, sizeof(config->client_secret) - 1);

  /* Facebook OAuth endpoints */
  strcpy(config->auth_endpoint, "https://www.facebook.com/v12.0/dialog/oauth");
  strcpy(config->token_endpoint, "https://graph.facebook.com/v12.0/oauth/access_token");
  strcpy(config->userinfo_endpoint, "https://graph.facebook.com/me");

  strncpy(config->redirect_uri, redirect_uri, sizeof(config->redirect_uri) - 1);
  strcpy(config->scopes, "public_profile,email");

  config->is_configured = 1;
  config->configured_at = time(NULL);

  manager->provider_count++;

  pthread_mutex_unlock(&manager->social_mutex);

  fprintf(stderr, "[OAuth2Social] Facebook configured (app_id=%s)\n", app_id);
  return 0;
}

/* ===== Authorization Flow ===== */

fl_oauth2_auth_url_t* freelang_oauth2_social_get_auth_url(
    fl_social_provider_manager_t *manager,
    fl_social_provider_type_t provider,
    const char *state) {
  if (!manager || !state) return NULL;

  pthread_mutex_lock(&manager->social_mutex);

  fl_social_provider_config_t *config = &manager->providers[provider];

  if (!config->is_configured) {
    pthread_mutex_unlock(&manager->social_mutex);
    return NULL;
  }

  fl_oauth2_auth_url_t *auth_url = (fl_oauth2_auth_url_t*)malloc(sizeof(fl_oauth2_auth_url_t));
  if (!auth_url) {
    pthread_mutex_unlock(&manager->social_mutex);
    return NULL;
  }

  memset(auth_url, 0, sizeof(fl_oauth2_auth_url_t));

  strncpy(auth_url->state, state, sizeof(auth_url->state) - 1);
  snprintf(auth_url->nonce, sizeof(auth_url->nonce), "nonce_%ld", time(NULL));
  strcpy(auth_url->response_type, "code");
  strncpy(auth_url->redirect_uri, config->redirect_uri, sizeof(auth_url->redirect_uri) - 1);
  strncpy(auth_url->scope, config->scopes, sizeof(auth_url->scope) - 1);

  /* Construct authorization URL */
  snprintf(auth_url->auth_url, sizeof(auth_url->auth_url),
           "%s?client_id=%s&redirect_uri=%s&response_type=code&scope=%s&state=%s",
           config->auth_endpoint, config->client_id, config->redirect_uri,
           config->scopes, state);

  pthread_mutex_unlock(&manager->social_mutex);

  fprintf(stderr, "[OAuth2Social] Auth URL generated (%s)\n", config->provider_name);
  return auth_url;
}

int freelang_oauth2_social_exchange_code(fl_social_provider_manager_t *manager,
                                          fl_social_provider_type_t provider,
                                          const char *code,
                                          const char *state,
                                          fl_social_connection_t *out_connection) {
  if (!manager || !code || !state || !out_connection) return -1;

  pthread_mutex_lock(&manager->social_mutex);

  fl_social_provider_config_t *config = &manager->providers[provider];

  if (!config->is_configured) {
    pthread_mutex_unlock(&manager->social_mutex);
    return -1;
  }

  /* Simulate token exchange (in real implementation, make HTTP POST request) */
  memset(out_connection, 0, sizeof(fl_social_connection_t));

  snprintf(out_connection->connection_id, sizeof(out_connection->connection_id),
           "conn_%ld", time(NULL));

  snprintf(out_connection->provider_access_token, sizeof(out_connection->provider_access_token),
           "access_%s_%ld", config->provider_name, time(NULL));

  snprintf(out_connection->provider_refresh_token, sizeof(out_connection->provider_refresh_token),
           "refresh_%s_%ld", config->provider_name, time(NULL));

  out_connection->provider = provider;
  out_connection->token_expires_at = time(NULL) + 3600;  /* 1 hour */
  out_connection->connected_at = time(NULL);
  out_connection->is_active = 1;

  manager->total_auth_attempts++;
  manager->total_successful_logins++;

  pthread_mutex_unlock(&manager->social_mutex);

  fprintf(stderr, "[OAuth2Social] Code exchanged for tokens (%s)\n", config->provider_name);
  return 0;
}

/* ===== Profile Retrieval ===== */

int freelang_oauth2_social_fetch_profile(fl_social_provider_manager_t *manager,
                                          fl_social_provider_type_t provider,
                                          const char *access_token,
                                          fl_social_profile_t *out_profile) {
  if (!manager || !access_token || !out_profile) return -1;

  pthread_mutex_lock(&manager->social_mutex);

  if (manager->profile_count >= 512) {
    pthread_mutex_unlock(&manager->social_mutex);
    return -1;
  }

  fl_social_provider_config_t *config = &manager->providers[provider];

  if (!config->is_configured) {
    pthread_mutex_unlock(&manager->social_mutex);
    return -1;
  }

  /* Simulate profile fetch (in real implementation, make HTTP GET request) */
  memset(out_profile, 0, sizeof(fl_social_profile_t));

  snprintf(out_profile->provider_id, sizeof(out_profile->provider_id),
           "%s_%ld", config->provider_name, time(NULL));

  snprintf(out_profile->user_id, sizeof(out_profile->user_id),
           "user_%d_%d", provider, manager->profile_count);

  strncpy(out_profile->email, "user@example.com", sizeof(out_profile->email) - 1);
  strncpy(out_profile->name, "Social User", sizeof(out_profile->name) - 1);

  out_profile->email_verified = 1;
  out_profile->is_active = 1;
  out_profile->created_at = time(NULL);
  out_profile->last_login = time(NULL);

  /* Cache profile */
  fl_social_profile_t *cached = &manager->profiles[manager->profile_count];
  memcpy(cached, out_profile, sizeof(fl_social_profile_t));
  manager->profile_count++;

  pthread_mutex_unlock(&manager->social_mutex);

  fprintf(stderr, "[OAuth2Social] Profile fetched (%s, email=%s)\n", config->provider_name, out_profile->email);
  return 0;
}

fl_social_profile_t* freelang_oauth2_social_get_profile(fl_social_provider_manager_t *manager,
                                                         const char *provider_id) {
  if (!manager || !provider_id) return NULL;

  pthread_mutex_lock(&manager->social_mutex);

  for (int i = 0; i < manager->profile_count; i++) {
    if (strcmp(manager->profiles[i].provider_id, provider_id) == 0) {
      pthread_mutex_unlock(&manager->social_mutex);
      return &manager->profiles[i];
    }
  }

  pthread_mutex_unlock(&manager->social_mutex);
  return NULL;
}

/* ===== Connection Management ===== */

int freelang_oauth2_social_link_account(fl_social_provider_manager_t *manager,
                                         const char *freelang_user_id,
                                         fl_social_provider_type_t provider,
                                         const char *provider_user_id,
                                         const char *access_token) {
  if (!manager || !freelang_user_id || !provider_user_id || !access_token) return -1;

  pthread_mutex_lock(&manager->social_mutex);

  if (manager->connection_count >= 1024) {
    pthread_mutex_unlock(&manager->social_mutex);
    return -1;
  }

  fl_social_connection_t *conn = &manager->connections[manager->connection_count];

  snprintf(conn->connection_id, sizeof(conn->connection_id), "link_%ld", time(NULL));
  strncpy(conn->freelang_user_id, freelang_user_id, sizeof(conn->freelang_user_id) - 1);
  conn->provider = provider;
  strncpy(conn->provider_user_id, provider_user_id, sizeof(conn->provider_user_id) - 1);
  strncpy(conn->provider_access_token, access_token, sizeof(conn->provider_access_token) - 1);

  conn->connected_at = time(NULL);
  conn->token_expires_at = time(NULL) + 86400 * 30;  /* 30 days */
  conn->is_active = 1;

  manager->connection_count++;
  manager->total_profile_links++;

  pthread_mutex_unlock(&manager->social_mutex);

  fprintf(stderr, "[OAuth2Social] Account linked (user=%s, provider=%d)\n", freelang_user_id, provider);
  return 0;
}

int freelang_oauth2_social_unlink_account(fl_social_provider_manager_t *manager,
                                           const char *freelang_user_id,
                                           fl_social_provider_type_t provider) {
  if (!manager || !freelang_user_id) return -1;

  pthread_mutex_lock(&manager->social_mutex);

  for (int i = 0; i < manager->connection_count; i++) {
    if (strcmp(manager->connections[i].freelang_user_id, freelang_user_id) == 0 &&
        manager->connections[i].provider == provider) {
      manager->connections[i].is_active = 0;

      /* Shift remaining connections */
      for (int j = i; j < manager->connection_count - 1; j++) {
        memcpy(&manager->connections[j], &manager->connections[j + 1],
               sizeof(fl_social_connection_t));
      }
      manager->connection_count--;

      pthread_mutex_unlock(&manager->social_mutex);
      fprintf(stderr, "[OAuth2Social] Account unlinked (user=%s, provider=%d)\n", freelang_user_id, provider);
      return 0;
    }
  }

  pthread_mutex_unlock(&manager->social_mutex);
  return -1;
}

void freelang_oauth2_social_get_connections(fl_social_provider_manager_t *manager,
                                             const char *freelang_user_id,
                                             fl_social_connection_t **connections,
                                             int *count) {
  if (!manager || !freelang_user_id || !connections || !count) return;

  *count = 0;
  pthread_mutex_lock(&manager->social_mutex);

  for (int i = 0; i < manager->connection_count && *count < 4; i++) {
    if (strcmp(manager->connections[i].freelang_user_id, freelang_user_id) == 0 &&
        manager->connections[i].is_active) {
      connections[(*count)++] = &manager->connections[i];
    }
  }

  pthread_mutex_unlock(&manager->social_mutex);
}

/* ===== Token Management ===== */

int freelang_oauth2_social_refresh_access_token(fl_social_provider_manager_t *manager,
                                                 fl_social_connection_t *connection) {
  if (!manager || !connection) return -1;

  pthread_mutex_lock(&manager->social_mutex);

  /* Generate new access token */
  snprintf(connection->provider_access_token, sizeof(connection->provider_access_token),
           "access_refreshed_%ld", time(NULL));

  connection->token_expires_at = time(NULL) + 3600;  /* 1 hour */

  pthread_mutex_unlock(&manager->social_mutex);

  fprintf(stderr, "[OAuth2Social] Access token refreshed (provider=%d)\n", connection->provider);
  return 0;
}

int freelang_oauth2_social_validate_token(fl_social_provider_manager_t *manager,
                                           fl_social_provider_type_t provider,
                                           const char *access_token) {
  if (!manager || !access_token) return 0;

  /* Simulate token validation */
  return (strlen(access_token) > 10) ? 1 : 0;
}

/* ===== Statistics ===== */

fl_social_stats_t freelang_oauth2_social_get_stats(fl_social_provider_manager_t *manager) {
  fl_social_stats_t stats = {0, 0, 0, 0, 0};

  if (!manager) return stats;

  pthread_mutex_lock(&manager->social_mutex);

  stats.total_auth_attempts = manager->total_auth_attempts;
  stats.total_successful_logins = manager->total_successful_logins;
  stats.total_profile_links = manager->total_profile_links;
  stats.total_providers_configured = manager->provider_count;

  /* Count active connections */
  for (int i = 0; i < manager->connection_count; i++) {
    if (manager->connections[i].is_active) {
      stats.active_connections++;
    }
  }

  pthread_mutex_unlock(&manager->social_mutex);

  return stats;
}
