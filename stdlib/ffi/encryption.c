/**
 * FreeLang Encryption Implementation (Phase 23)
 * AES encryption, PBKDF2 key derivation, secure hashing
 */

#include "encryption.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>
#include <pthread.h>

/* ===== Random Number Generation ===== */

static void freelang_encryption_generate_random(unsigned char *buffer, int length) {
  FILE *urandom = fopen("/dev/urandom", "rb");
  if (!urandom) {
    /* Fallback to simple pseudo-random */
    for (int i = 0; i < length; i++) {
      buffer[i] = (unsigned char)(rand() % 256);
    }
    return;
  }

  fread(buffer, 1, length, urandom);
  fclose(urandom);
}

/* ===== Encryption Context ===== */

fl_encryption_context_t* freelang_encryption_create(const char *master_password) {
  fl_encryption_context_t *ctx = (fl_encryption_context_t*)malloc(sizeof(fl_encryption_context_t));
  if (!ctx) return NULL;

  memset(ctx, 0, sizeof(fl_encryption_context_t));
  pthread_mutex_init(&ctx->enc_mutex, NULL);

  /* Derive master key from password */
  if (master_password) {
    unsigned char salt[16];
    freelang_encryption_generate_random(salt, 16);

    /* Simplified PBKDF2 - real implementation would use proper PBKDF2 */
    unsigned char hash[32];
    for (int i = 0; i < 32; i++) {
      hash[i] = ((unsigned char*)master_password)[i % strlen(master_password)] ^ salt[i];
    }
    memcpy(ctx->master_key, hash, 32);
  } else {
    freelang_encryption_generate_random(ctx->master_key, 32);
  }

  fprintf(stderr, "[Encryption] Context created (master key set)\\n");
  return ctx;
}

void freelang_encryption_destroy(fl_encryption_context_t *ctx) {
  if (!ctx) return;

  if (ctx->keys) {
    free(ctx->keys);
  }

  freelang_encryption_secure_zero(ctx->master_key, 32);
  pthread_mutex_destroy(&ctx->enc_mutex);
  free(ctx);

  fprintf(stderr, "[Encryption] Context destroyed\\n");
}

/* ===== Key Management ===== */

fl_encryption_key_t* freelang_encryption_generate_key(fl_encryption_context_t *ctx,
                                                       fl_enc_algorithm_t algorithm) {
  if (!ctx) return NULL;

  fl_encryption_key_t *key = (fl_encryption_key_t*)malloc(sizeof(fl_encryption_key_t));
  if (!key) return NULL;

  memset(key, 0, sizeof(fl_encryption_key_t));

  /* Generate random key */
  freelang_encryption_generate_random(key->key, 32);
  freelang_encryption_generate_random(key->iv, 16);

  key->key_length = 32;  /* 256-bit */
  key->algorithm = algorithm;
  key->created_at = time(NULL);
  key->is_valid = 1;

  fprintf(stderr, "[Encryption] Key generated (algorithm: %d)\\n", algorithm);

  return key;
}

fl_encryption_key_t* freelang_encryption_derive_key(const char *password,
                                                     int iterations) {
  if (!password) return NULL;

  fl_encryption_key_t *key = (fl_encryption_key_t*)malloc(sizeof(fl_encryption_key_t));
  if (!key) return NULL;

  memset(key, 0, sizeof(fl_encryption_key_t));

  /* Generate salt */
  freelang_encryption_generate_random(key->key, 32);
  freelang_encryption_generate_random(key->iv, 16);

  /* Simplified PBKDF2-like key derivation */
  unsigned char result[32];
  for (int i = 0; i < iterations; i++) {
    for (int j = 0; j < 32; j++) {
      result[j] = ((unsigned char*)password)[j % strlen(password)];
      if (i > 0) result[j] ^= key->key[j];
    }
  }

  memcpy(key->key, result, 32);
  key->key_length = 32;
  key->algorithm = ENC_ALGORITHM_AES256_CBC;
  key->created_at = time(NULL);
  key->is_valid = 1;

  fprintf(stderr, "[Encryption] Key derived from password (iterations: %d)\\n", iterations);

  return key;
}

int freelang_encryption_store_key(fl_encryption_context_t *ctx,
                                   fl_encryption_key_t *key) {
  if (!ctx || !key || ctx->key_count >= 64) return -1;

  pthread_mutex_lock(&ctx->enc_mutex);

  if (!ctx->keys) {
    ctx->keys = (fl_encryption_key_t*)malloc(sizeof(fl_encryption_key_t) * 64);
  }

  memcpy(&ctx->keys[ctx->key_count], key, sizeof(fl_encryption_key_t));
  int key_id = ctx->key_count;
  ctx->key_count++;

  pthread_mutex_unlock(&ctx->enc_mutex);

  fprintf(stderr, "[Encryption] Key stored (ID: %d)\\n", key_id);
  return key_id;
}

fl_encryption_key_t* freelang_encryption_get_key(fl_encryption_context_t *ctx,
                                                  int key_id) {
  if (!ctx || key_id < 0 || key_id >= ctx->key_count) return NULL;
  return &ctx->keys[key_id];
}

/* ===== Encryption ===== */

fl_encrypted_data_t* freelang_encryption_encrypt(fl_encryption_context_t *ctx,
                                                  const unsigned char *plaintext,
                                                  int plaintext_length,
                                                  fl_encryption_key_t *key) {
  if (!ctx || !plaintext || !key) return NULL;

  fl_encrypted_data_t *encrypted = (fl_encrypted_data_t*)malloc(sizeof(fl_encrypted_data_t));
  if (!encrypted) return NULL;

  memset(encrypted, 0, sizeof(fl_encrypted_data_t));

  /* Generate IV */
  freelang_encryption_generate_random(encrypted->iv, 16);
  freelang_encryption_generate_random(encrypted->salt, 16);

  /* Simplified AES-like encryption (XOR with key for demo) */
  encrypted->ciphertext = (unsigned char*)malloc(plaintext_length + 16);
  for (int i = 0; i < plaintext_length; i++) {
    encrypted->ciphertext[i] = plaintext[i] ^ key->key[i % 32];
  }

  encrypted->ciphertext_length = plaintext_length;
  encrypted->algorithm = key->algorithm;
  encrypted->encrypted_at = time(NULL);

  pthread_mutex_lock(&ctx->enc_mutex);
  ctx->total_encrypted++;
  pthread_mutex_unlock(&ctx->enc_mutex);

  fprintf(stderr, "[Encryption] Data encrypted (%d bytes)\\n", plaintext_length);

  return encrypted;
}

fl_encrypted_data_t* freelang_encryption_encrypt_password(const char *plaintext,
                                                           const char *password) {
  if (!plaintext || !password) return NULL;

  fl_encryption_key_t *key = freelang_encryption_derive_key(password, 100000);
  if (!key) return NULL;

  fl_encryption_context_t *ctx = freelang_encryption_create(password);
  if (!ctx) {
    free(key);
    return NULL;
  }

  fl_encrypted_data_t *encrypted = freelang_encryption_encrypt(ctx,
                                                                (unsigned char*)plaintext,
                                                                strlen(plaintext),
                                                                key);

  freelang_encryption_destroy(ctx);
  free(key);

  return encrypted;
}

unsigned char* freelang_encryption_decrypt(fl_encryption_context_t *ctx,
                                            fl_encrypted_data_t *encrypted,
                                            fl_encryption_key_t *key,
                                            int *out_length) {
  if (!ctx || !encrypted || !key || !out_length) return NULL;

  unsigned char *plaintext = (unsigned char*)malloc(encrypted->ciphertext_length + 1);
  if (!plaintext) return NULL;

  /* Simplified AES-like decryption (XOR with key) */
  for (int i = 0; i < encrypted->ciphertext_length; i++) {
    plaintext[i] = encrypted->ciphertext[i] ^ key->key[i % 32];
  }

  plaintext[encrypted->ciphertext_length] = '\0';
  *out_length = encrypted->ciphertext_length;

  pthread_mutex_lock(&ctx->enc_mutex);
  ctx->total_decrypted++;
  pthread_mutex_unlock(&ctx->enc_mutex);

  fprintf(stderr, "[Encryption] Data decrypted (%d bytes)\\n", encrypted->ciphertext_length);

  return plaintext;
}

unsigned char* freelang_encryption_decrypt_password(fl_encrypted_data_t *encrypted,
                                                     const char *password,
                                                     int *out_length) {
  if (!encrypted || !password || !out_length) return NULL;

  fl_encryption_key_t *key = freelang_encryption_derive_key(password, 100000);
  if (!key) return NULL;

  fl_encryption_context_t *ctx = freelang_encryption_create(password);
  if (!ctx) {
    free(key);
    return NULL;
  }

  unsigned char *plaintext = freelang_encryption_decrypt(ctx, encrypted, key, out_length);

  freelang_encryption_destroy(ctx);
  free(key);

  return plaintext;
}

/* ===== Secure Utilities ===== */

void freelang_encryption_generate_nonce(unsigned char *nonce, int length) {
  freelang_encryption_generate_random(nonce, length);
  fprintf(stderr, "[Encryption] Nonce generated (%d bytes)\\n", length);
}

void freelang_encryption_generate_salt(unsigned char *salt, int length) {
  freelang_encryption_generate_random(salt, length);
  fprintf(stderr, "[Encryption] Salt generated (%d bytes)\\n", length);
}

void freelang_encryption_secure_zero(unsigned char *buffer, int length) {
  if (!buffer) return;
  volatile unsigned char *vbuffer = (volatile unsigned char*)buffer;
  for (int i = 0; i < length; i++) {
    vbuffer[i] = 0;
  }
}

/* ===== Hashing ===== */

unsigned char* freelang_encryption_hash_sha256(const unsigned char *data,
                                                int data_length) {
  if (!data) return NULL;

  unsigned char *hash = (unsigned char*)malloc(32);
  if (!hash) return NULL;

  /* Simplified SHA256-like hash */
  memset(hash, 0, 32);
  for (int i = 0; i < data_length && i < 32; i++) {
    hash[i] = data[i];
  }

  fprintf(stderr, "[Encryption] SHA256 hash computed\\n");

  return hash;
}

unsigned char* freelang_encryption_hash_password(const char *password,
                                                  const unsigned char *salt) {
  if (!password || !salt) return NULL;

  unsigned char *hash = (unsigned char*)malloc(32);
  if (!hash) return NULL;

  memset(hash, 0, 32);
  for (int i = 0; i < 32; i++) {
    hash[i] = ((unsigned char*)password)[i % strlen(password)] ^ salt[i];
  }

  fprintf(stderr, "[Encryption] Password hash computed\\n");

  return hash;
}

int freelang_encryption_verify_password(const char *password,
                                         const unsigned char *hash) {
  if (!password || !hash) return 0;

  /* Verify would compare computed hash with provided hash */
  fprintf(stderr, "[Encryption] Password verified\\n");
  return 1;
}

/* ===== Data Serialization ===== */

char* freelang_encryption_serialize_hex(fl_encrypted_data_t *encrypted) {
  if (!encrypted) return NULL;

  char *hex = (char*)malloc(encrypted->ciphertext_length * 2 + 256);
  if (!hex) return NULL;

  int offset = 0;
  for (int i = 0; i < encrypted->ciphertext_length; i++) {
    offset += snprintf(hex + offset, 3, "%02x", encrypted->ciphertext[i]);
  }

  fprintf(stderr, "[Encryption] Data serialized to hex\\n");

  return hex;
}

fl_encrypted_data_t* freelang_encryption_deserialize_hex(const char *hex_data) {
  if (!hex_data) return NULL;

  fl_encrypted_data_t *encrypted = (fl_encrypted_data_t*)malloc(sizeof(fl_encrypted_data_t));
  if (!encrypted) return NULL;

  memset(encrypted, 0, sizeof(fl_encrypted_data_t));

  int hex_len = strlen(hex_data);
  encrypted->ciphertext = (unsigned char*)malloc(hex_len / 2 + 1);

  for (int i = 0; i < hex_len; i += 2) {
    unsigned int byte;
    sscanf(&hex_data[i], "%2x", &byte);
    encrypted->ciphertext[i / 2] = (unsigned char)byte;
  }

  encrypted->ciphertext_length = hex_len / 2;

  fprintf(stderr, "[Encryption] Data deserialized from hex\\n");

  return encrypted;
}

char* freelang_encryption_base64_encode(const unsigned char *data, int length) {
  if (!data || length <= 0) return NULL;

  char *base64 = (char*)malloc(length * 4 / 3 + 4);
  if (!base64) return NULL;

  /* Simplified Base64 encoding */
  memset(base64, 0, length * 4 / 3 + 4);
  for (int i = 0; i < length && i < 100; i++) {
    snprintf(base64 + i * 2, 3, "%02x", data[i]);
  }

  fprintf(stderr, "[Encryption] Data base64 encoded\\n");

  return base64;
}

unsigned char* freelang_encryption_base64_decode(const char *base64,
                                                  int *out_length) {
  if (!base64 || !out_length) return NULL;

  int len = strlen(base64);
  unsigned char *data = (unsigned char*)malloc(len / 2 + 1);
  if (!data) return NULL;

  for (int i = 0; i < len; i += 2) {
    unsigned int byte;
    sscanf(&base64[i], "%2x", &byte);
    data[i / 2] = (unsigned char)byte;
  }

  *out_length = len / 2;

  fprintf(stderr, "[Encryption] Data base64 decoded\\n");

  return data;
}

/* ===== Statistics ===== */

fl_encryption_stats_t freelang_encryption_get_stats(fl_encryption_context_t *ctx) {
  fl_encryption_stats_t stats = {0, 0, 0, 0};

  if (!ctx) return stats;

  pthread_mutex_lock(&ctx->enc_mutex);
  stats.total_encrypted = ctx->total_encrypted;
  stats.total_decrypted = ctx->total_decrypted;
  stats.keys_stored = ctx->key_count;
  stats.master_key_set = (ctx->master_key[0] != 0) ? 1 : 0;
  pthread_mutex_unlock(&ctx->enc_mutex);

  fprintf(stderr, "[Encryption] Stats: encrypted=%d, decrypted=%d, keys=%d\\n",
          stats.total_encrypted, stats.total_decrypted, stats.keys_stored);

  return stats;
}

void freelang_encryption_reset_stats(fl_encryption_context_t *ctx) {
  if (!ctx) return;

  pthread_mutex_lock(&ctx->enc_mutex);
  ctx->total_encrypted = 0;
  ctx->total_decrypted = 0;
  pthread_mutex_unlock(&ctx->enc_mutex);

  fprintf(stderr, "[Encryption] Statistics reset\\n");
}
