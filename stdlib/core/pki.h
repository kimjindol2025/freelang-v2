/**
 * FreeLang stdlib/pki - Public Key Infrastructure
 * RSA/ECDSA key generation, certificate management, signing/verification
 */
#ifndef FREELANG_STDLIB_PKI_H
#define FREELANG_STDLIB_PKI_H

#include <stdint.h>
#include <stddef.h>
#include <time.h>

typedef enum {
  FL_PKI_RSA_2048 = 0,
  FL_PKI_RSA_4096 = 1,
  FL_PKI_ECDSA_P256 = 2,
  FL_PKI_ECDSA_P384 = 3
} fl_pki_key_type_t;

typedef struct {
  fl_pki_key_type_t key_type;
  char *public_key;
  char *private_key;
  int64_t created_at;
} fl_pki_key_pair_t;

typedef struct {
  char *subject;
  char *issuer;
  char *public_key;
  int64_t not_before;
  int64_t not_after;
  char *serial_number;
  int is_valid;
} fl_pki_certificate_t;

typedef struct {
  uint64_t key_pairs_generated;
  uint64_t signatures_created;
  uint64_t signatures_verified;
  uint64_t certificates_issued;
  uint64_t verification_failures;
} fl_pki_stats_t;

/* Key Generation */
fl_pki_key_pair_t* fl_pki_generate_key_pair(fl_pki_key_type_t key_type);
void fl_pki_key_pair_destroy(fl_pki_key_pair_t *key_pair);

/* Signing & Verification */
char* fl_pki_sign_message(fl_pki_key_pair_t *key_pair, const char *message, size_t message_len);
int fl_pki_verify_signature(fl_pki_key_pair_t *key_pair, const char *message, size_t message_len, const char *signature);

/* Certificate Management */
fl_pki_certificate_t* fl_pki_issue_certificate(const char *subject, fl_pki_key_pair_t *key_pair, int validity_days);
void fl_pki_certificate_destroy(fl_pki_certificate_t *cert);
int fl_pki_verify_certificate(fl_pki_certificate_t *cert);
int fl_pki_is_certificate_expired(fl_pki_certificate_t *cert);

/* Certificate Chain */
int fl_pki_validate_chain(fl_pki_certificate_t **chain, int chain_length);

/* Key Export/Import */
char* fl_pki_export_public_key_pem(fl_pki_key_pair_t *key_pair);
char* fl_pki_export_private_key_pem(fl_pki_key_pair_t *key_pair);
fl_pki_key_pair_t* fl_pki_import_key_pair_pem(const char *public_pem, const char *private_pem);

/* Statistics */
fl_pki_stats_t* fl_pki_get_stats(void);
void fl_pki_reset_stats(void);

#endif
