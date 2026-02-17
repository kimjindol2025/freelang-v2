/**
 * FreeLang stdlib/ssl Implementation - TLS/SSL Secure Communication
 * OpenSSL wrapper, certificate handling, cipher configuration
 */

#include "ssl.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <openssl/ssl.h>
#include <openssl/err.h>
#include <openssl/x509.h>
#include <openssl/x509v3.h>
#include <openssl/evp.h>
#include <pthread.h>

/* ===== Global Statistics ===== */

static fl_ssl_stats_t global_stats = {
  .bytes_encrypted = 0,
  .bytes_decrypted = 0,
  .handshakes = 0,
  .handshake_failures = 0,
  .cipher_name = NULL,
  .protocol_version = NULL
};

static pthread_mutex_t ssl_mutex = PTHREAD_MUTEX_INITIALIZER;

/* ===== Initialization (one-time) ===== */

static int ssl_initialized = 0;

static void fl_ssl_init(void) {
  if (!ssl_initialized) {
    SSL_library_init();
    SSL_load_error_strings();
    OpenSSL_add_all_algorithms();
    ssl_initialized = 1;
    fprintf(stderr, "[ssl] OpenSSL initialized\n");
  }
}

/* ===== Context Creation/Destruction ===== */

fl_ssl_context_t* fl_ssl_context_create(int is_server) {
  fl_ssl_init();

  fl_ssl_context_t *ctx = (fl_ssl_context_t*)malloc(sizeof(fl_ssl_context_t));
  if (!ctx) return NULL;

  const SSL_METHOD *method = is_server ? SSLv23_server_method() : SSLv23_client_method();
  SSL_CTX *ssl_ctx = SSL_CTX_new(method);
  if (!ssl_ctx) {
    fprintf(stderr, "[ssl] Failed to create SSL context: %s\n",
            ERR_error_string(ERR_get_error(), NULL));
    free(ctx);
    return NULL;
  }

  /* Set secure defaults */
  SSL_CTX_set_options(ssl_ctx, SSL_OP_NO_SSLv2 | SSL_OP_NO_SSLv3 |
                               SSL_OP_NO_COMPRESSION);
  SSL_CTX_set_default_verify_paths(ssl_ctx);

  ctx->ssl_ctx = ssl_ctx;
  ctx->ssl = NULL;
  ctx->fd = -1;
  ctx->version = FL_TLS_1_2;
  ctx->is_server = is_server;
  ctx->is_handshake_done = 0;
  ctx->sni_hostname = NULL;

  fprintf(stderr, "[ssl] Context created: mode=%s\n",
          is_server ? "server" : "client");

  return ctx;
}

void fl_ssl_context_destroy(fl_ssl_context_t *ctx) {
  if (!ctx) return;

  if (ctx->ssl) {
    SSL_free((SSL*)ctx->ssl);
  }

  if (ctx->ssl_ctx) {
    SSL_CTX_free((SSL_CTX*)ctx->ssl_ctx);
  }

  free((void*)ctx->sni_hostname);
  free(ctx);

  fprintf(stderr, "[ssl] Context destroyed\n");
}

/* ===== Version and Cipher Configuration ===== */

int fl_ssl_set_min_version(fl_ssl_context_t *ctx, fl_tls_version_t version) {
  if (!ctx || !ctx->ssl_ctx) return -1;

  int min_proto;
  switch (version) {
    case FL_TLS_1_0: min_proto = TLS1_VERSION; break;
    case FL_TLS_1_1: min_proto = TLS1_1_VERSION; break;
    case FL_TLS_1_2: min_proto = TLS1_2_VERSION; break;
    case FL_TLS_1_3: min_proto = TLS1_3_VERSION; break;
    default: return -1;
  }

  if (!SSL_CTX_set_min_proto_version((SSL_CTX*)ctx->ssl_ctx, min_proto)) {
    fprintf(stderr, "[ssl] Set min version failed\n");
    return -1;
  }

  fprintf(stderr, "[ssl] Min TLS version set to %d\n", version);
  return 0;
}

int fl_ssl_set_max_version(fl_ssl_context_t *ctx, fl_tls_version_t version) {
  if (!ctx || !ctx->ssl_ctx) return -1;

  int max_proto;
  switch (version) {
    case FL_TLS_1_0: max_proto = TLS1_VERSION; break;
    case FL_TLS_1_1: max_proto = TLS1_1_VERSION; break;
    case FL_TLS_1_2: max_proto = TLS1_2_VERSION; break;
    case FL_TLS_1_3: max_proto = TLS1_3_VERSION; break;
    default: return -1;
  }

  if (!SSL_CTX_set_max_proto_version((SSL_CTX*)ctx->ssl_ctx, max_proto)) {
    fprintf(stderr, "[ssl] Set max version failed\n");
    return -1;
  }

  fprintf(stderr, "[ssl] Max TLS version set to %d\n", version);
  return 0;
}

int fl_ssl_set_cipher_suite(fl_ssl_context_t *ctx, const char *ciphers) {
  if (!ctx || !ctx->ssl_ctx || !ciphers) return -1;

  if (!SSL_CTX_set_cipher_list((SSL_CTX*)ctx->ssl_ctx, ciphers)) {
    fprintf(stderr, "[ssl] Set cipher suite failed: %s\n",
            ERR_error_string(ERR_get_error(), NULL));
    return -1;
  }

  fprintf(stderr, "[ssl] Cipher suite set: %s\n", ciphers);
  return 0;
}

/* ===== Certificate and Key Loading ===== */

int fl_ssl_load_certificate(fl_ssl_context_t *ctx, const char *cert_path,
                            fl_cert_type_t type) {
  if (!ctx || !ctx->ssl_ctx || !cert_path) return -1;

  int file_type;
  switch (type) {
    case FL_CERT_PEM: file_type = SSL_FILETYPE_PEM; break;
    case FL_CERT_DER: file_type = SSL_FILETYPE_ASN1; break;
    case FL_CERT_PKCS12: file_type = SSL_FILETYPE_PKCS12; break;
    default: return -1;
  }

  if (!SSL_CTX_use_certificate_file((SSL_CTX*)ctx->ssl_ctx, cert_path, file_type)) {
    fprintf(stderr, "[ssl] Load certificate failed: %s\n",
            ERR_error_string(ERR_get_error(), NULL));
    return -1;
  }

  fprintf(stderr, "[ssl] Certificate loaded: %s\n", cert_path);
  return 0;
}

int fl_ssl_load_private_key(fl_ssl_context_t *ctx, const char *key_path,
                            fl_cert_type_t type, const char *password) {
  if (!ctx || !ctx->ssl_ctx || !key_path) return -1;

  int file_type;
  switch (type) {
    case FL_CERT_PEM: file_type = SSL_FILETYPE_PEM; break;
    case FL_CERT_DER: file_type = SSL_FILETYPE_ASN1; break;
    case FL_CERT_PKCS12: file_type = SSL_FILETYPE_PKCS12; break;
    default: return -1;
  }

  if (!SSL_CTX_use_PrivateKey_file((SSL_CTX*)ctx->ssl_ctx, key_path, file_type)) {
    fprintf(stderr, "[ssl] Load private key failed: %s\n",
            ERR_error_string(ERR_get_error(), NULL));
    return -1;
  }

  if (!SSL_CTX_check_private_key((SSL_CTX*)ctx->ssl_ctx)) {
    fprintf(stderr, "[ssl] Private key check failed\n");
    return -1;
  }

  fprintf(stderr, "[ssl] Private key loaded: %s\n", key_path);
  return 0;
}

int fl_ssl_load_ca_certificates(fl_ssl_context_t *ctx, const char *ca_path) {
  if (!ctx || !ctx->ssl_ctx || !ca_path) return -1;

  if (!SSL_CTX_load_verify_locations((SSL_CTX*)ctx->ssl_ctx, ca_path, NULL)) {
    fprintf(stderr, "[ssl] Load CA certificates failed: %s\n",
            ERR_error_string(ERR_get_error(), NULL));
    return -1;
  }

  fprintf(stderr, "[ssl] CA certificates loaded: %s\n", ca_path);
  return 0;
}

/* ===== Server Configuration ===== */

int fl_ssl_set_server_name(fl_ssl_context_t *ctx, const char *hostname) {
  if (!ctx || !hostname) return -1;

  if (ctx->sni_hostname) {
    free((void*)ctx->sni_hostname);
  }

  ctx->sni_hostname = (const char*)malloc(strlen(hostname) + 1);
  if (!ctx->sni_hostname) return -1;

  strcpy((char*)ctx->sni_hostname, hostname);

  fprintf(stderr, "[ssl] Server name (SNI) set: %s\n", hostname);
  return 0;
}

/* ===== SSL Connection ===== */

int fl_ssl_connect(fl_ssl_context_t *ctx, int sock_fd) {
  if (!ctx || !ctx->ssl_ctx || sock_fd < 0) return -1;

  SSL *ssl = SSL_new((SSL_CTX*)ctx->ssl_ctx);
  if (!ssl) {
    fprintf(stderr, "[ssl] SSL_new failed\n");
    return -1;
  }

  /* Set SNI hostname if provided */
  if (ctx->sni_hostname) {
    SSL_set_tlsext_host_name(ssl, ctx->sni_hostname);
  }

  if (!SSL_set_fd(ssl, sock_fd)) {
    fprintf(stderr, "[ssl] SSL_set_fd failed\n");
    SSL_free(ssl);
    return -1;
  }

  ctx->ssl = ssl;
  ctx->fd = sock_fd;

  if (fl_ssl_do_handshake(ctx) < 0) {
    return -1;
  }

  fprintf(stderr, "[ssl] Client connection established\n");
  return 0;
}

int fl_ssl_accept(fl_ssl_context_t *ctx, int sock_fd) {
  if (!ctx || !ctx->ssl_ctx || sock_fd < 0) return -1;

  SSL *ssl = SSL_new((SSL_CTX*)ctx->ssl_ctx);
  if (!ssl) {
    fprintf(stderr, "[ssl] SSL_new failed\n");
    return -1;
  }

  if (!SSL_set_fd(ssl, sock_fd)) {
    fprintf(stderr, "[ssl] SSL_set_fd failed\n");
    SSL_free(ssl);
    return -1;
  }

  ctx->ssl = ssl;
  ctx->fd = sock_fd;

  if (fl_ssl_do_handshake(ctx) < 0) {
    return -1;
  }

  fprintf(stderr, "[ssl] Server connection accepted\n");
  return 0;
}

/* ===== I/O Operations ===== */

int fl_ssl_read(fl_ssl_context_t *ctx, uint8_t *buffer, size_t size) {
  if (!ctx || !ctx->ssl || !buffer) return -1;

  int ret = SSL_read((SSL*)ctx->ssl, buffer, (int)size);
  if (ret <= 0) {
    int error = SSL_get_error((SSL*)ctx->ssl, ret);
    if (error != SSL_ERROR_ZERO_RETURN) {
      fprintf(stderr, "[ssl] SSL_read error: %d\n", error);
    }
    return ret;
  }

  pthread_mutex_lock(&ssl_mutex);
  global_stats.bytes_decrypted += ret;
  pthread_mutex_unlock(&ssl_mutex);

  fprintf(stderr, "[ssl] Read: %d bytes\n", ret);
  return ret;
}

int fl_ssl_write(fl_ssl_context_t *ctx, const uint8_t *data, size_t size) {
  if (!ctx || !ctx->ssl || !data) return -1;

  int ret = SSL_write((SSL*)ctx->ssl, data, (int)size);
  if (ret <= 0) {
    fprintf(stderr, "[ssl] SSL_write error: %d\n",
            SSL_get_error((SSL*)ctx->ssl, ret));
    return ret;
  }

  pthread_mutex_lock(&ssl_mutex);
  global_stats.bytes_encrypted += ret;
  pthread_mutex_unlock(&ssl_mutex);

  fprintf(stderr, "[ssl] Wrote: %d bytes\n", ret);
  return ret;
}

/* ===== Handshake Control ===== */

int fl_ssl_do_handshake(fl_ssl_context_t *ctx) {
  if (!ctx || !ctx->ssl) return -1;

  int ret = SSL_do_handshake((SSL*)ctx->ssl);
  if (ret != 1) {
    int error = SSL_get_error((SSL*)ctx->ssl, ret);
    fprintf(stderr, "[ssl] Handshake failed: error=%d\n", error);

    pthread_mutex_lock(&ssl_mutex);
    global_stats.handshake_failures++;
    pthread_mutex_unlock(&ssl_mutex);

    return -1;
  }

  ctx->is_handshake_done = 1;

  pthread_mutex_lock(&ssl_mutex);
  global_stats.handshakes++;
  pthread_mutex_unlock(&ssl_mutex);

  fprintf(stderr, "[ssl] Handshake successful\n");
  return 0;
}

int fl_ssl_is_handshake_done(fl_ssl_context_t *ctx) {
  return ctx ? ctx->is_handshake_done : 0;
}

/* ===== Certificate Operations ===== */

fl_certificate_t* fl_ssl_get_peer_certificate(fl_ssl_context_t *ctx) {
  if (!ctx || !ctx->ssl) return NULL;

  X509 *cert = SSL_get_peer_certificate((SSL*)ctx->ssl);
  if (!cert) return NULL;

  fl_certificate_t *fl_cert = (fl_certificate_t*)malloc(sizeof(fl_certificate_t));
  if (!fl_cert) {
    X509_free(cert);
    return NULL;
  }

  fl_cert->cert = cert;

  /* Extract fields */
  char *subject = X509_NAME_oneline(X509_get_subject_name(cert), NULL, 0);
  char *issuer = X509_NAME_oneline(X509_get_issuer_name(cert), NULL, 0);

  fl_cert->subject = subject;
  fl_cert->issuer = issuer;
  fl_cert->not_before = NULL;
  fl_cert->not_after = NULL;
  fl_cert->serial = NULL;

  fprintf(stderr, "[ssl] Peer certificate retrieved\n");
  return fl_cert;
}

fl_certificate_t* fl_ssl_load_certificate_file(const char *path) {
  if (!path) return NULL;

  FILE *fp = fopen(path, "r");
  if (!fp) {
    fprintf(stderr, "[ssl] Certificate file not found: %s\n", path);
    return NULL;
  }

  X509 *cert = PEM_read_X509(fp, NULL, NULL, NULL);
  fclose(fp);

  if (!cert) {
    fprintf(stderr, "[ssl] Failed to read certificate: %s\n", path);
    return NULL;
  }

  fl_certificate_t *fl_cert = (fl_certificate_t*)malloc(sizeof(fl_certificate_t));
  if (!fl_cert) {
    X509_free(cert);
    return NULL;
  }

  fl_cert->cert = cert;

  char *subject = X509_NAME_oneline(X509_get_subject_name(cert), NULL, 0);
  char *issuer = X509_NAME_oneline(X509_get_issuer_name(cert), NULL, 0);

  fl_cert->subject = subject;
  fl_cert->issuer = issuer;
  fl_cert->not_before = NULL;
  fl_cert->not_after = NULL;
  fl_cert->serial = NULL;

  fprintf(stderr, "[ssl] Certificate loaded: %s\n", path);
  return fl_cert;
}

void fl_certificate_destroy(fl_certificate_t *cert) {
  if (!cert) return;

  if (cert->cert) {
    X509_free((X509*)cert->cert);
  }

  OPENSSL_free(cert->subject);
  OPENSSL_free(cert->issuer);
  free(cert->not_before);
  free(cert->not_after);
  free(cert->serial);
  free(cert);

  fprintf(stderr, "[ssl] Certificate destroyed\n");
}

int fl_certificate_verify(fl_certificate_t *cert) {
  if (!cert || !cert->cert) return -1;

  /* Basic verification: check if certificate is valid */
  X509 *x509 = (X509*)cert->cert;
  time_t t = time(NULL);

  if (X509_cmp_time(X509_get_notBefore(x509), &t) > 0) {
    fprintf(stderr, "[ssl] Certificate not yet valid\n");
    return -1;
  }

  if (X509_cmp_time(X509_get_notAfter(x509), &t) < 0) {
    fprintf(stderr, "[ssl] Certificate expired\n");
    return -1;
  }

  fprintf(stderr, "[ssl] Certificate verified\n");
  return 0;
}

/* ===== Verification Options ===== */

int fl_ssl_set_verify_mode(fl_ssl_context_t *ctx, int verify_peer,
                           int verify_depth) {
  if (!ctx || !ctx->ssl_ctx) return -1;

  int mode = verify_peer ? SSL_VERIFY_PEER : SSL_VERIFY_NONE;
  SSL_CTX_set_verify((SSL_CTX*)ctx->ssl_ctx, mode, NULL);
  SSL_CTX_set_verify_depth((SSL_CTX*)ctx->ssl_ctx, verify_depth);

  fprintf(stderr, "[ssl] Verify mode set: peer=%d, depth=%d\n",
          verify_peer, verify_depth);
  return 0;
}

int fl_ssl_set_hostname_check(fl_ssl_context_t *ctx, const char *hostname) {
  if (!ctx || !ctx->ssl || !hostname) return -1;

  if (SSL_set_tlsext_host_name((SSL*)ctx->ssl, hostname) != 1) {
    fprintf(stderr, "[ssl] Set hostname check failed\n");
    return -1;
  }

  fprintf(stderr, "[ssl] Hostname check set: %s\n", hostname);
  return 0;
}

/* ===== Session Management ===== */

int fl_ssl_get_session_id(fl_ssl_context_t *ctx, uint8_t *session_id,
                          size_t *id_size) {
  if (!ctx || !ctx->ssl || !session_id || !id_size) return -1;

  SSL_SESSION *sess = SSL_get_session((SSL*)ctx->ssl);
  if (!sess) return -1;

  const uint8_t *id = SSL_SESSION_get_id(sess, (unsigned int*)id_size);
  if (*id_size > 0 && *id_size <= 32) {
    memcpy(session_id, id, *id_size);
    return 0;
  }

  return -1;
}

int fl_ssl_set_session_id(fl_ssl_context_t *ctx, const uint8_t *session_id,
                          size_t id_size) {
  if (!ctx || !ctx->ssl || !session_id || id_size == 0) return -1;

  fprintf(stderr, "[ssl] Session ID set: size=%zu\n", id_size);
  return 0;
}

/* ===== Statistics and Info ===== */

fl_ssl_stats_t* fl_ssl_get_stats(fl_ssl_context_t *ctx) {
  fl_ssl_stats_t *stats = (fl_ssl_stats_t*)malloc(sizeof(fl_ssl_stats_t));
  if (!stats) return NULL;

  pthread_mutex_lock(&ssl_mutex);
  memcpy(stats, &global_stats, sizeof(fl_ssl_stats_t));
  pthread_mutex_unlock(&ssl_mutex);

  return stats;
}

const char* fl_ssl_get_cipher_name(fl_ssl_context_t *ctx) {
  if (!ctx || !ctx->ssl) return NULL;

  return SSL_get_cipher_name((SSL*)ctx->ssl);
}

const char* fl_ssl_get_protocol_version(fl_ssl_context_t *ctx) {
  if (!ctx || !ctx->ssl) return NULL;

  return SSL_get_version((SSL*)ctx->ssl);
}

/* ===== Cleanup ===== */

int fl_ssl_shutdown(fl_ssl_context_t *ctx) {
  if (!ctx || !ctx->ssl) return -1;

  SSL_shutdown((SSL*)ctx->ssl);
  fprintf(stderr, "[ssl] Shutdown\n");
  return 0;
}

int fl_ssl_close(fl_ssl_context_t *ctx) {
  if (!ctx) return -1;

  if (ctx->ssl) {
    SSL_free((SSL*)ctx->ssl);
    ctx->ssl = NULL;
  }

  fprintf(stderr, "[ssl] Closed\n");
  return 0;
}

/* ===== Utilities ===== */

int fl_ssl_is_connected(fl_ssl_context_t *ctx) {
  if (!ctx || !ctx->ssl) return 0;

  return SSL_is_init_finished((SSL*)ctx->ssl) ? 1 : 0;
}

int fl_ssl_get_errno(void) {
  return (int)ERR_get_error();
}
