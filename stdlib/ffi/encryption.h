/**
 * FreeLang Encryption Module (Phase 23)
 * AES encryption, key derivation, and secure data handling
 */

#ifndef FREELANG_ENCRYPTION_H
#define FREELANG_ENCRYPTION_H

#include <stdlib.h>

/* ===== Encryption Algorithm ===== */

typedef enum {
  ENC_ALGORITHM_AES256_CBC = 0,
  ENC_ALGORITHM_AES128_CBC = 1,
  ENC_ALGORITHM_AES256_GCM = 2
} fl_enc_algorithm_t;

/* ===== Encryption Key ===== */

typedef struct {
  unsigned char key[32];          /* 256-bit key */
  unsigned char iv[16];           /* Initialization vector (128-bit) */

  int key_length;
  fl_enc_algorithm_t algorithm;

  int64_t created_at;
  int is_valid;
} fl_encryption_key_t;

/* ===== Encrypted Data ===== */

typedef struct {
  unsigned char *ciphertext;      /* Encrypted data */
  int ciphertext_length;

  unsigned char iv[16];           /* IV used for encryption */
  unsigned char salt[16];         /* Salt for key derivation */
  unsigned char tag[16];          /* Authentication tag (GCM only) */

  fl_enc_algorithm_t algorithm;

  int64_t encrypted_at;
} fl_encrypted_data_t;

/* ===== Key Derivation ===== */

typedef struct {
  unsigned char salt[16];
  unsigned char derived_key[32];

  int iterations;                 /* PBKDF2 iterations */
  int hash_length;
} fl_key_derivation_t;

/* ===== Encryption Context ===== */

typedef struct {
  fl_encryption_key_t *keys;      /* Key storage (max 64 keys) */
  int key_count;

  unsigned char master_key[32];   /* Master encryption key */

  int total_encrypted;            /* Total items encrypted */
  int total_decrypted;            /* Total items decrypted */

  pthread_mutex_t enc_mutex;
} fl_encryption_context_t;

/* ===== Public API: Context Management ===== */

/* Create encryption context */
fl_encryption_context_t* freelang_encryption_create(const char *master_password);

/* Destroy context */
void freelang_encryption_destroy(fl_encryption_context_t *ctx);

/* ===== Public API: Key Management ===== */

/* Generate encryption key */
fl_encryption_key_t* freelang_encryption_generate_key(fl_encryption_context_t *ctx,
                                                       fl_enc_algorithm_t algorithm);

/* Derive key from password */
fl_encryption_key_t* freelang_encryption_derive_key(const char *password,
                                                     int iterations);

/* Store key */
int freelang_encryption_store_key(fl_encryption_context_t *ctx,
                                   fl_encryption_key_t *key);

/* Retrieve key by ID */
fl_encryption_key_t* freelang_encryption_get_key(fl_encryption_context_t *ctx,
                                                  int key_id);

/* ===== Public API: Encryption ===== */

/* Encrypt data */
fl_encrypted_data_t* freelang_encryption_encrypt(fl_encryption_context_t *ctx,
                                                  const unsigned char *plaintext,
                                                  int plaintext_length,
                                                  fl_encryption_key_t *key);

/* Encrypt with password */
fl_encrypted_data_t* freelang_encryption_encrypt_password(const char *plaintext,
                                                           const char *password);

/* Decrypt data */
unsigned char* freelang_encryption_decrypt(fl_encryption_context_t *ctx,
                                            fl_encrypted_data_t *encrypted,
                                            fl_encryption_key_t *key,
                                            int *out_length);

/* Decrypt with password */
unsigned char* freelang_encryption_decrypt_password(fl_encrypted_data_t *encrypted,
                                                     const char *password,
                                                     int *out_length);

/* ===== Public API: Secure Utilities ===== */

/* Generate random nonce */
void freelang_encryption_generate_nonce(unsigned char *nonce, int length);

/* Generate random salt */
void freelang_encryption_generate_salt(unsigned char *salt, int length);

/* Securely zero memory */
void freelang_encryption_secure_zero(unsigned char *buffer, int length);

/* ===== Public API: Hashing ===== */

/* Hash data (SHA-256) */
unsigned char* freelang_encryption_hash_sha256(const unsigned char *data,
                                                int data_length);

/* Hash password (with salt) */
unsigned char* freelang_encryption_hash_password(const char *password,
                                                  const unsigned char *salt);

/* Verify password hash */
int freelang_encryption_verify_password(const char *password,
                                         const unsigned char *hash);

/* ===== Public API: Data Serialization ===== */

/* Serialize encrypted data to hex */
char* freelang_encryption_serialize_hex(fl_encrypted_data_t *encrypted);

/* Deserialize encrypted data from hex */
fl_encrypted_data_t* freelang_encryption_deserialize_hex(const char *hex_data);

/* Base64 encode */
char* freelang_encryption_base64_encode(const unsigned char *data, int length);

/* Base64 decode */
unsigned char* freelang_encryption_base64_decode(const char *base64,
                                                  int *out_length);

/* ===== Public API: Statistics ===== */

typedef struct {
  int total_encrypted;
  int total_decrypted;
  int keys_stored;
  int master_key_set;
} fl_encryption_stats_t;

/* Get encryption statistics */
fl_encryption_stats_t freelang_encryption_get_stats(fl_encryption_context_t *ctx);

/* Reset statistics */
void freelang_encryption_reset_stats(fl_encryption_context_t *ctx);

#endif /* FREELANG_ENCRYPTION_H */
