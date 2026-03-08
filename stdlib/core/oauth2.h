/**
 * FreeLang stdlib/oauth2 - OAuth2 Protocol Implementation
 * Authorization code flow, implicit flow, client credentials, resource owner password
 */
#ifndef FREELANG_STDLIB_OAUTH2_H
#define FREELANG_STDLIB_OAUTH2_H

#include <stdint.h>
#include <stddef.h>
#include <time.h>

typedef enum {
  FL_OAUTH2_AUTHORIZATION_CODE = 0,
  FL_OAUTH2_IMPLICIT = 1,
  FL_OAUTH2_CLIENT_CREDENTIALS = 2,
  FL_OAUTH2_RESOURCE_OWNER_PASSWORD = 3,
  FL_OAUTH2_REFRESH_TOKEN = 4
} fl_oauth2_grant_type_t;

typedef struct fl_oauth2_t fl_oauth2_t;

typedef struct {
  char *access_token;
  char *refresh_token;
  char *token_type;
  int64_t expires_at;
  char **scopes;
  int scope_count;
} fl_oauth2_token_response_t;

typedef struct {
  uint64_t authorization_requests;
  uint64_t token_requests;
  uint64_t token_refreshes;
  uint64_t authorization_errors;
  uint64_t token_errors;
} fl_oauth2_stats_t;

/* OAuth2 Client */
fl_oauth2_t* fl_oauth2_client_create(const char *client_id, const char *client_secret);
void fl_oauth2_client_destroy(fl_oauth2_t *client);

/* Authorization Flow */
char* fl_oauth2_get_authorization_url(fl_oauth2_t *client, const char *redirect_uri, const char **scopes, int scope_count);
int fl_oauth2_exchange_code(fl_oauth2_t *client, const char *code, const char *redirect_uri, fl_oauth2_token_response_t **token_out);

/* Token Operations */
int fl_oauth2_refresh_token(fl_oauth2_t *client, const char *refresh_token, fl_oauth2_token_response_t **token_out);
int fl_oauth2_validate_access_token(fl_oauth2_t *client, const char *access_token);
int fl_oauth2_is_token_expired(const fl_oauth2_token_response_t *token);

/* Client Credentials Flow */
int fl_oauth2_client_credentials_flow(fl_oauth2_t *client, const char **scopes, int scope_count, fl_oauth2_token_response_t **token_out);

/* Statistics */
fl_oauth2_stats_t* fl_oauth2_get_stats(void);
void fl_oauth2_reset_stats(void);

/* Cleanup */
void fl_oauth2_token_free(fl_oauth2_token_response_t *token);

#endif
