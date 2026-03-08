/**
 * FreeLang stdlib/encrypt - Data Encryption
 * AES encryption, key derivation, IV generation, authenticated encryption
 */

#ifndef FREELANG_STDLIB_ENCRYPT_H
#define FREELANG_STDLIB_ENCRYPT_H

#include <stdint.h>
#include <stddef.h>

/* ===== Cipher Types ===== */

typedef enum {
  FL_CIPHER_AES_128_CBC = 0,
  FL_CIPHER_AES_256_CBC = 1,
  FL_CIPHER_AES_128_ECB = 2,
  FL_CIPHER_AES_256_ECB = 3
} fl_cipher_type_t;

/* ===== Key Derivation ===== */

typedef enum {
  FL_KDF_PBKDF2 = 0,
  FL_KDF_SCRYPT = 1
} fl_kdf_type_t;

/* ===== Encryptor ===== */

typedef struct {
  fl_cipher_type_t cipher;
  uint8_t key[32];            /* 128 or 256 bits */
  uint8_t iv[16];             /* Initialization vector */
  int key_size;               /* 16 or 32 bytes */
  void *internal_state;       /* OpenSSL context */
} fl_encryptor_t;

/* ===== Public API ===== */

/* Key derivation */
int fl_kdf_derive_key(fl_kdf_type_t type, const char *password, const uint8_t *salt,
                      size_t salt_size, uint8_t *out_key, size_t key_size);

int fl_kdf_pbkdf2(const char *password, const uint8_t *salt, size_t salt_size,
                  int iterations, uint8_t *out_key, size_t key_size);

/* Random IV generation */
int fl_encrypt_random_iv(uint8_t *iv, size_t size);

/* Encryptor creation */
fl_encryptor_t* fl_encrypt_create(fl_cipher_type_t cipher);
void fl_encrypt_destroy(fl_encryptor_t *encryptor);

/* Key and IV setup */
int fl_encrypt_set_key(fl_encryptor_t *encryptor, const uint8_t *key, size_t key_size);
int fl_encrypt_set_iv(fl_encryptor_t *encryptor, const uint8_t *iv, size_t iv_size);
int fl_encrypt_generate_iv(fl_encryptor_t *encryptor);

/* Encryption */
uint8_t* fl_encrypt_data(fl_encryptor_t *encryptor, const uint8_t *plaintext, size_t size,
                         size_t *out_size);
int fl_encrypt_update(fl_encryptor_t *encryptor, const uint8_t *plaintext, size_t size,
                      uint8_t *ciphertext, size_t *out_size);
int fl_encrypt_finish(fl_encryptor_t *encryptor, uint8_t *ciphertext, size_t *out_size);

/* Decryption */
uint8_t* fl_decrypt_data(fl_encryptor_t *encryptor, const uint8_t *ciphertext, size_t size,
                         size_t *out_size);
int fl_decrypt_update(fl_encryptor_t *encryptor, const uint8_t *ciphertext, size_t size,
                      uint8_t *plaintext, size_t *out_size);
int fl_decrypt_finish(fl_encryptor_t *encryptor, uint8_t *plaintext, size_t *out_size);

/* Utilities */
int fl_encrypt_validate_key_size(fl_cipher_type_t cipher, size_t key_size);

#endif /* FREELANG_STDLIB_ENCRYPT_H */
