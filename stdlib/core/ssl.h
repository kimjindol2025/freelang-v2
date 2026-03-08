/**
 * FreeLang stdlib/ssl - TLS/SSL Secure Socket Layer
 * TLS 1.2/1.3, certificate validation, cipher suites, session resumption
 */

#ifndef FREELANG_STDLIB_SSL_H
#define FREELANG_STDLIB_SSL_H

#include <stdint.h>
#include <stddef.h>
#include <time.h>

/* ===== TLS Version ===== */

typedef enum {
  FL_TLS_V1_0 = 0x0301,    /* TLS 1.0 */
  FL_TLS_V1_1 = 0x0302,    /* TLS 1.1 */
  FL_TLS_V1_2 = 0x0303,    /* TLS 1.2 (default) */
  FL_TLS_V1_3 = 0x0304     /* TLS 1.3 */
} fl_tls_version_t;

/* ===== TLS Cipher Suites ===== */

typedef enum {
  /* TLS 1.3 */
  FL_CIPHER_TLS_AES_128_GCM_SHA256 = 0x1301,
  FL_CIPHER_TLS_AES_256_GCM_SHA384 = 0x1302,
  FL_CIPHER_TLS_CHACHA20_POLY1305_SHA256 = 0x1303,

  /* TLS 1.2 ECDHE-RSA */
  FL_CIPHER_ECDHE_RSA_AES_128_GCM_SHA256 = 0xc02f,
  FL_CIPHER_ECDHE_RSA_AES_256_GCM_SHA384 = 0xc030,
  FL_CIPHER_ECDHE_RSA_CHACHA20_POLY1305 = 0xcca8
} fl_tls_cipher_suite_t;

/* ===== Certificate Validation ===== */

typedef enum {
  FL_CERT_VERIFY_NONE = 0,
  FL_CERT_VERIFY_OPTIONAL = 1,
  FL_CERT_VERIFY_REQUIRED = 2
} fl_tls_cert_verify_t;

/* ===== SSL/TLS Configuration ===== */

typedef struct {
  char *hostname;
  char *cert_file;
  char *key_file;
  char *ca_file;
  char *ca_path;
  fl_tls_version_t min_version;
  fl_tls_version_t max_version;
  fl_tls_cert_verify_t verify_mode;
  int verify_depth;
} fl_tls_config_t;

/* ===== SSL/TLS Socket ===== */

typedef struct {
  int fd;
  void *tls_context;
  void *tls_session;
  fl_tls_version_t negotiated_version;
  fl_tls_cipher_suite_t negotiated_cipher;
  int is_connected;
  int is_server;
  uint64_t bytes_sent;
  uint64_t bytes_received;
  uint32_t handshake_time_ms;
} fl_tls_socket_t;

/* ===== Certificate Info ===== */

typedef struct {
  char *subject;
  char *issuer;
  char *fingerprint;
  int is_self_signed;
  int key_size;
  char *public_key_type;
} fl_tls_cert_info_t;

/* ===== Connection Info ===== */

typedef struct {
  char *protocol_name;
  char *cipher_name;
  int key_size;
  int handshake_time_ms;
  fl_tls_cert_info_t *peer_cert;
} fl_tls_connection_info_t;

/* ===== Statistics ===== */

typedef struct {
  uint64_t total_handshakes;
  uint64_t successful_handshakes;
  uint64_t failed_handshakes;
  uint64_t total_bytes_sent;
  uint64_t total_bytes_received;
  uint32_t avg_handshake_time_ms;
  uint32_t certificate_errors;
} fl_tls_stats_t;

/* ===== TLS Configuration API ===== */

fl_tls_config_t* fl_tls_config_create(void);
int fl_tls_config_set_hostname(fl_tls_config_t *config, const char *hostname);
int fl_tls_config_set_cert_key(fl_tls_config_t *config, const char *cert_file,
                               const char *key_file);
int fl_tls_config_set_ca(fl_tls_config_t *config, const char *ca_file, const char *ca_path);
int fl_tls_config_set_version(fl_tls_config_t *config, fl_tls_version_t min_version,
                              fl_tls_version_t max_version);
int fl_tls_config_set_verify(fl_tls_config_t *config, fl_tls_cert_verify_t verify_mode,
                             int depth);
int fl_tls_config_set_ciphers(fl_tls_config_t *config, const fl_tls_cipher_suite_t *ciphers,
                              int cipher_count);
void fl_tls_config_destroy(fl_tls_config_t *config);

/* ===== TLS Socket API ===== */

fl_tls_socket_t* fl_tls_server_create(fl_tls_config_t *config);
fl_tls_socket_t* fl_tls_client_create(fl_tls_config_t *config);
int fl_tls_bind(fl_tls_socket_t *sock, const char *address, uint16_t port);
int fl_tls_listen(fl_tls_socket_t *sock, int backlog);
int fl_tls_accept(fl_tls_socket_t *server_sock, fl_tls_socket_t *client_sock);
int fl_tls_connect(fl_tls_socket_t *sock, const char *address, uint16_t port);
int fl_tls_connect_timeout(fl_tls_socket_t *sock, const char *address, uint16_t port,
                           int timeout_ms);
int fl_tls_send(fl_tls_socket_t *sock, const uint8_t *data, size_t size);
int fl_tls_recv(fl_tls_socket_t *sock, uint8_t *buffer, size_t max_size);
int fl_tls_handshake(fl_tls_socket_t *sock, int timeout_ms);
fl_tls_connection_info_t* fl_tls_get_connection_info(fl_tls_socket_t *sock);
fl_tls_cert_info_t* fl_tls_get_peer_cert(fl_tls_socket_t *sock);
int fl_tls_verify_peer_cert(fl_tls_socket_t *sock);
int fl_tls_shutdown(fl_tls_socket_t *sock);
int fl_tls_close(fl_tls_socket_t *sock);
void fl_tls_destroy(fl_tls_socket_t *sock);

/* ===== Session & Advanced ===== */

int fl_tls_get_session_ticket(fl_tls_socket_t *sock, uint8_t *ticket_data, size_t max_size);
int fl_tls_set_session_ticket(fl_tls_socket_t *sock, const uint8_t *ticket_data,
                              size_t ticket_size);
int fl_tls_config_force_ephemeral_keys(fl_tls_config_t *config, int enable);
const char* fl_tls_get_ephemeral_key_type(fl_tls_socket_t *sock);
int fl_tls_config_set_alpn(fl_tls_config_t *config, const char **protocols,
                           int protocol_count);
const char* fl_tls_get_alpn_protocol(fl_tls_socket_t *sock);

/* ===== Statistics ===== */

fl_tls_stats_t* fl_tls_get_stats(void);
void fl_tls_reset_stats(void);

/* ===== Utilities ===== */

const char* fl_tls_error_message(int error_code);
const char* fl_tls_version_to_string(fl_tls_version_t version);
const char* fl_tls_cipher_to_string(fl_tls_cipher_suite_t cipher);
int fl_tls_validate_hostname(const char *hostname, const char *cert_subject);
int fl_tls_check_cert_validity(fl_tls_cert_info_t *cert_info);
void fl_tls_cert_info_free(fl_tls_cert_info_t *cert_info);
void fl_tls_connection_info_free(fl_tls_connection_info_t *conn_info);

#endif /* FREELANG_STDLIB_SSL_H */
