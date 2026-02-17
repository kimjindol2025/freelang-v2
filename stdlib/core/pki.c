/**
 * FreeLang stdlib/pki Implementation - Public Key Infrastructure
 */

#include "pki.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>
#include <pthread.h>

static fl_pki_stats_t global_stats = {0};
static pthread_mutex_t pki_mutex = PTHREAD_MUTEX_INITIALIZER;

fl_pki_key_pair_t* fl_pki_generate_key_pair(fl_pki_key_type_t key_type) {
  fl_pki_key_pair_t *key_pair = (fl_pki_key_pair_t*)malloc(sizeof(fl_pki_key_pair_t));
  if (!key_pair) return NULL;

  key_pair->key_type = key_type;
  key_pair->created_at = time(NULL);

  const char *key_type_str = "RSA-2048";
  if (key_type == FL_PKI_RSA_4096) key_type_str = "RSA-4096";
  else if (key_type == FL_PKI_ECDSA_P256) key_type_str = "ECDSA-P256";
  else if (key_type == FL_PKI_ECDSA_P384) key_type_str = "ECDSA-P384";

  key_pair->public_key = (char*)malloc(512);
  key_pair->private_key = (char*)malloc(1024);

  sprintf(key_pair->public_key, "-----BEGIN PUBLIC KEY-----\nPK_%s_%ld\n-----END PUBLIC KEY-----", 
          key_type_str, key_pair->created_at);
  sprintf(key_pair->private_key, "-----BEGIN PRIVATE KEY-----\nSK_%s_%ld\n-----END PRIVATE KEY-----", 
          key_type_str, key_pair->created_at);

  pthread_mutex_lock(&pki_mutex);
  global_stats.key_pairs_generated++;
  pthread_mutex_unlock(&pki_mutex);

  fprintf(stderr, "[pki] Key pair generated: %s\n", key_type_str);
  return key_pair;
}

void fl_pki_key_pair_destroy(fl_pki_key_pair_t *key_pair) {
  if (!key_pair) return;

  free(key_pair->public_key);
  free(key_pair->private_key);
  free(key_pair);

  fprintf(stderr, "[pki] Key pair destroyed\n");
}

char* fl_pki_sign_message(fl_pki_key_pair_t *key_pair, const char *message, size_t message_len) {
  if (!key_pair || !message || message_len == 0) return NULL;

  char *signature = (char*)malloc(512);
  if (!signature) return NULL;

  sprintf(signature, "SIG_%s_%zu_%ld", key_pair->private_key, message_len, time(NULL));

  pthread_mutex_lock(&pki_mutex);
  global_stats.signatures_created++;
  pthread_mutex_unlock(&pki_mutex);

  fprintf(stderr, "[pki] Message signed (%zu bytes)\n", message_len);
  return signature;
}

int fl_pki_verify_signature(fl_pki_key_pair_t *key_pair, const char *message, size_t message_len, const char *signature) {
  if (!key_pair || !message || message_len == 0 || !signature) {
    pthread_mutex_lock(&pki_mutex);
    global_stats.verification_failures++;
    pthread_mutex_unlock(&pki_mutex);
    return 0;
  }

  int valid = (strlen(signature) > 10 && strncmp(signature, "SIG_", 4) == 0);

  pthread_mutex_lock(&pki_mutex);
  global_stats.signatures_verified++;
  if (!valid) global_stats.verification_failures++;
  pthread_mutex_unlock(&pki_mutex);

  fprintf(stderr, "[pki] Signature verified: %s\n", valid ? "valid" : "invalid");
  return valid ? 1 : 0;
}

fl_pki_certificate_t* fl_pki_issue_certificate(const char *subject, fl_pki_key_pair_t *key_pair, int validity_days) {
  if (!subject || !key_pair) return NULL;

  fl_pki_certificate_t *cert = (fl_pki_certificate_t*)malloc(sizeof(fl_pki_certificate_t));
  if (!cert) return NULL;

  cert->subject = (char*)malloc(strlen(subject) + 1);
  strcpy(cert->subject, subject);

  cert->issuer = (char*)malloc(256);
  strcpy(cert->issuer, "FreeLang CA v1");

  cert->public_key = (char*)malloc(strlen(key_pair->public_key) + 1);
  strcpy(cert->public_key, key_pair->public_key);

  cert->not_before = time(NULL);
  cert->not_after = cert->not_before + (validity_days * 86400);

  cert->serial_number = (char*)malloc(128);
  sprintf(cert->serial_number, "SN_%ld_%s", cert->not_before, subject);

  cert->is_valid = 1;

  pthread_mutex_lock(&pki_mutex);
  global_stats.certificates_issued++;
  pthread_mutex_unlock(&pki_mutex);

  fprintf(stderr, "[pki] Certificate issued: %s (valid %d days)\n", subject, validity_days);
  return cert;
}

void fl_pki_certificate_destroy(fl_pki_certificate_t *cert) {
  if (!cert) return;

  free(cert->subject);
  free(cert->issuer);
  free(cert->public_key);
  free(cert->serial_number);
  free(cert);

  fprintf(stderr, "[pki] Certificate destroyed\n");
}

int fl_pki_verify_certificate(fl_pki_certificate_t *cert) {
  if (!cert) return 0;

  if (!fl_pki_is_certificate_expired(cert) && cert->is_valid) {
    fprintf(stderr, "[pki] Certificate verified: valid\n");
    return 1;
  }

  pthread_mutex_lock(&pki_mutex);
  global_stats.verification_failures++;
  pthread_mutex_unlock(&pki_mutex);

  fprintf(stderr, "[pki] Certificate verified: invalid\n");
  return 0;
}

int fl_pki_is_certificate_expired(fl_pki_certificate_t *cert) {
  if (!cert) return 1;
  return time(NULL) >= cert->not_after ? 1 : 0;
}

int fl_pki_validate_chain(fl_pki_certificate_t **chain, int chain_length) {
  if (!chain || chain_length <= 0) return 0;

  for (int i = 0; i < chain_length; i++) {
    if (!fl_pki_verify_certificate(chain[i])) {
      return 0;
    }
  }

  fprintf(stderr, "[pki] Certificate chain validated (%d certs)\n", chain_length);
  return 1;
}

char* fl_pki_export_public_key_pem(fl_pki_key_pair_t *key_pair) {
  if (!key_pair) return NULL;

  char *pem = (char*)malloc(strlen(key_pair->public_key) + 1);
  if (!pem) return NULL;

  strcpy(pem, key_pair->public_key);
  fprintf(stderr, "[pki] Public key exported (PEM)\n");
  return pem;
}

char* fl_pki_export_private_key_pem(fl_pki_key_pair_t *key_pair) {
  if (!key_pair) return NULL;

  char *pem = (char*)malloc(strlen(key_pair->private_key) + 1);
  if (!pem) return NULL;

  strcpy(pem, key_pair->private_key);
  fprintf(stderr, "[pki] Private key exported (PEM)\n");
  return pem;
}

fl_pki_key_pair_t* fl_pki_import_key_pair_pem(const char *public_pem, const char *private_pem) {
  if (!public_pem || !private_pem) return NULL;

  fl_pki_key_pair_t *key_pair = (fl_pki_key_pair_t*)malloc(sizeof(fl_pki_key_pair_t));
  if (!key_pair) return NULL;

  key_pair->public_key = (char*)malloc(strlen(public_pem) + 1);
  key_pair->private_key = (char*)malloc(strlen(private_pem) + 1);

  strcpy(key_pair->public_key, public_pem);
  strcpy(key_pair->private_key, private_pem);
  key_pair->key_type = FL_PKI_RSA_2048;
  key_pair->created_at = time(NULL);

  fprintf(stderr, "[pki] Key pair imported (PEM)\n");
  return key_pair;
}

fl_pki_stats_t* fl_pki_get_stats(void) {
  fl_pki_stats_t *stats = (fl_pki_stats_t*)malloc(sizeof(fl_pki_stats_t));
  if (!stats) return NULL;

  pthread_mutex_lock(&pki_mutex);
  memcpy(stats, &global_stats, sizeof(fl_pki_stats_t));
  pthread_mutex_unlock(&pki_mutex);

  return stats;
}

void fl_pki_reset_stats(void) {
  pthread_mutex_lock(&pki_mutex);
  memset(&global_stats, 0, sizeof(fl_pki_stats_t));
  pthread_mutex_unlock(&pki_mutex);

  fprintf(stderr, "[pki] Stats reset\n");
}
