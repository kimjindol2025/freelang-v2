/**
 * FreeLang stdlib/ssl - TLS/SSL Secure Communication
 * OpenSSL wrapper, certificate handling, cipher configuration
 */

#ifndef FREELANG_STDLIB_SSL_H
#define FREELANG_STDLIB_SSL_H

#include <stdint.h>
#include <stddef.h>

/* ===== TLS Versions ===== */

typedef enum {
  FL_TLS_1_0 = 0,
  FL_TLS_1_1 = 1,
  FL_TLS_1_2 = 2,
  FL_TLS_1_3 = 3
} fl_tls_version_t;

/* ===== Certificate Types ===== */

typedef enum {
  FL_CERT_PEM = 0,        /* PEM format */
  FL_CERT_DER = 1,        /* DER binary format */
  FL_CERT_PKCS12 = 2      /* PKCS#12 format */
} fl_cert_type_t;

/* ===== SSL/TLS Context ===== */

typedef struct {
  void *ssl_ctx;          /* OpenSSL SSL_CTX* */
  void *ssl;              /* OpenSSL SSL* */
  int fd;                 /* Underlying socket FD */
  fl_tls_version_t version;
  int is_server;          /* Server or client context */
  int is_handshake_done;  /* Handshake completed */
  const char *sni_hostname;  /* Server Name Indication */
} fl_ssl_context_t;

/* ===== Certificate ===== */

typedef struct {
  void *cert;             /* OpenSSL X509* */
  char *subject;
  char *issuer;
  char *not_before;
  char *not_after;
  char *serial;
} fl_certificate_t;

/* ===== SSL Statistics ===== */

typedef struct {
  uint64_t bytes_encrypted;
  uint64_t bytes_decrypted;
  uint32_t handshakes;
  uint32_t handshake_failures;
  const char *cipher_name;
  const char *protocol_version;
} fl_ssl_stats_t;

/* ===== Public API ===== */

/* Context creation/destruction */
fl_ssl_context_t* fl_ssl_context_create(int is_server);
void fl_ssl_context_destroy(fl_ssl_context_t *ctx);

/* Version and cipher configuration */
int fl_ssl_set_min_version(fl_ssl_context_t *ctx, fl_tls_version_t version);
int fl_ssl_set_max_version(fl_ssl_context_t *ctx, fl_tls_version_t version);
int fl_ssl_set_cipher_suite(fl_ssl_context_t *ctx, const char *ciphers);

/* Certificate and key loading */
int fl_ssl_load_certificate(fl_ssl_context_t *ctx, const char *cert_path,
                            fl_cert_type_t type);
int fl_ssl_load_private_key(fl_ssl_context_t *ctx, const char *key_path,
                            fl_cert_type_t type, const char *password);
int fl_ssl_load_ca_certificates(fl_ssl_context_t *ctx, const char *ca_path);

/* Server configuration */
int fl_ssl_set_server_name(fl_ssl_context_t *ctx, const char *hostname);

/* SSL connection */
int fl_ssl_connect(fl_ssl_context_t *ctx, int sock_fd);
int fl_ssl_accept(fl_ssl_context_t *ctx, int sock_fd);

/* I/O operations */
int fl_ssl_read(fl_ssl_context_t *ctx, uint8_t *buffer, size_t size);
int fl_ssl_write(fl_ssl_context_t *ctx, const uint8_t *data, size_t size);

/* Handshake control */
int fl_ssl_do_handshake(fl_ssl_context_t *ctx);
int fl_ssl_is_handshake_done(fl_ssl_context_t *ctx);

/* Certificate operations */
fl_certificate_t* fl_ssl_get_peer_certificate(fl_ssl_context_t *ctx);
fl_certificate_t* fl_ssl_load_certificate_file(const char *path);
void fl_certificate_destroy(fl_certificate_t *cert);
int fl_certificate_verify(fl_certificate_t *cert);

/* Verification options */
int fl_ssl_set_verify_mode(fl_ssl_context_t *ctx, int verify_peer,
                           int verify_depth);
int fl_ssl_set_hostname_check(fl_ssl_context_t *ctx, const char *hostname);

/* Session management */
int fl_ssl_get_session_id(fl_ssl_context_t *ctx, uint8_t *session_id,
                          size_t *id_size);
int fl_ssl_set_session_id(fl_ssl_context_t *ctx, const uint8_t *session_id,
                          size_t id_size);

/* Statistics and info */
fl_ssl_stats_t* fl_ssl_get_stats(fl_ssl_context_t *ctx);
const char* fl_ssl_get_cipher_name(fl_ssl_context_t *ctx);
const char* fl_ssl_get_protocol_version(fl_ssl_context_t *ctx);

/* Cleanup */
int fl_ssl_shutdown(fl_ssl_context_t *ctx);
int fl_ssl_close(fl_ssl_context_t *ctx);

/* Utilities */
int fl_ssl_is_connected(fl_ssl_context_t *ctx);
int fl_ssl_get_errno(void);

#endif /* FREELANG_STDLIB_SSL_H */
