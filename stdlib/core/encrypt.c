/**
 * FreeLang stdlib/encrypt Implementation - Data Encryption
 * OpenSSL wrapper for AES encryption
 */

#include "encrypt.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <openssl/evp.h>
#include <openssl/rand.h>
#include <openssl/evp.h>

/* ===== Key Derivation ===== */

int fl_kdf_derive_key(fl_kdf_type_t type, const char *password, const uint8_t *salt,
                      size_t salt_size, uint8_t *out_key, size_t key_size) {
  if (!password || !salt || !out_key) return -1;

  if (type == FL_KDF_PBKDF2) {
    return fl_kdf_pbkdf2(password, salt, salt_size, 100000, out_key, key_size);
  }

  return -1;  /* Unsupported KDF */
}

int fl_kdf_pbkdf2(const char *password, const uint8_t *salt, size_t salt_size,
                  int iterations, uint8_t *out_key, size_t key_size) {
  if (!password || !salt || !out_key) return -1;

  if (PKCS5_PBKDF2_HMAC(password, -1, salt, (int)salt_size, iterations,
                        EVP_sha256(), (int)key_size, out_key) == 1) {
    fprintf(stderr, "[encrypt] PBKDF2 key derived: %zu bytes, %d iterations\n", key_size, iterations);
    return 0;
  }

  return -1;
}

/* ===== Random IV Generation ===== */

int fl_encrypt_random_iv(uint8_t *iv, size_t size) {
  if (!iv || size == 0) return -1;

  if (RAND_bytes(iv, (int)size) == 1) {
    fprintf(stderr, "[encrypt] Generated random IV: %zu bytes\n", size);
    return 0;
  }

  return -1;
}

/* ===== Encryptor Lifecycle ===== */

fl_encryptor_t* fl_encrypt_create(fl_cipher_type_t cipher) {
  fl_encryptor_t *enc = (fl_encryptor_t*)malloc(sizeof(fl_encryptor_t));
  if (!enc) return NULL;

  memset(enc, 0, sizeof(fl_encryptor_t));

  enc->cipher = cipher;

  if (cipher == FL_CIPHER_AES_128_CBC || cipher == FL_CIPHER_AES_128_ECB) {
    enc->key_size = 16;
  } else {
    enc->key_size = 32;
  }

  fprintf(stderr, "[encrypt] Encryptor created: cipher=%d, key_size=%d\n", cipher, enc->key_size);
  return enc;
}

void fl_encrypt_destroy(fl_encryptor_t *encryptor) {
  if (!encryptor) return;

  if (encryptor->internal_state) {
    EVP_CIPHER_CTX_free((EVP_CIPHER_CTX*)encryptor->internal_state);
  }

  free(encryptor);

  fprintf(stderr, "[encrypt] Encryptor destroyed\n");
}

/* ===== Key and IV Setup ===== */

int fl_encrypt_set_key(fl_encryptor_t *encryptor, const uint8_t *key, size_t key_size) {
  if (!encryptor || !key) return -1;

  if ((int)key_size != encryptor->key_size) {
    fprintf(stderr, "[encrypt] Invalid key size: expected %d, got %zu\n", encryptor->key_size, key_size);
    return -1;
  }

  memcpy(encryptor->key, key, key_size);
  fprintf(stderr, "[encrypt] Key set: %zu bytes\n", key_size);
  return 0;
}

int fl_encrypt_set_iv(fl_encryptor_t *encryptor, const uint8_t *iv, size_t iv_size) {
  if (!encryptor || !iv) return -1;

  if (iv_size != 16) {
    return -1;
  }

  memcpy(encryptor->iv, iv, 16);
  fprintf(stderr, "[encrypt] IV set: %zu bytes\n", iv_size);
  return 0;
}

int fl_encrypt_generate_iv(fl_encryptor_t *encryptor) {
  if (!encryptor) return -1;

  return fl_encrypt_random_iv(encryptor->iv, 16);
}

/* ===== Encryption ===== */

uint8_t* fl_encrypt_data(fl_encryptor_t *encryptor, const uint8_t *plaintext, size_t size,
                         size_t *out_size) {
  if (!encryptor || !plaintext || !out_size) return NULL;

  EVP_CIPHER_CTX *ctx = EVP_CIPHER_CTX_new();
  if (!ctx) return NULL;

  const EVP_CIPHER *cipher = NULL;

  if (encryptor->cipher == FL_CIPHER_AES_128_CBC) {
    cipher = EVP_aes_128_cbc();
  } else if (encryptor->cipher == FL_CIPHER_AES_256_CBC) {
    cipher = EVP_aes_256_cbc();
  } else if (encryptor->cipher == FL_CIPHER_AES_128_ECB) {
    cipher = EVP_aes_128_ecb();
  } else if (encryptor->cipher == FL_CIPHER_AES_256_ECB) {
    cipher = EVP_aes_256_ecb();
  }

  if (!cipher) {
    EVP_CIPHER_CTX_free(ctx);
    return NULL;
  }

  size_t ciphertext_size = size + EVP_MAX_BLOCK_LENGTH;
  uint8_t *ciphertext = (uint8_t*)malloc(ciphertext_size);
  if (!ciphertext) {
    EVP_CIPHER_CTX_free(ctx);
    return NULL;
  }

  int len = 0;
  int total_len = 0;

  if (EVP_EncryptInit_ex(ctx, cipher, NULL, encryptor->key, encryptor->iv) != 1) {
    goto error;
  }

  if (EVP_EncryptUpdate(ctx, ciphertext, &len, plaintext, (int)size) != 1) {
    goto error;
  }

  total_len = len;

  if (EVP_EncryptFinal_ex(ctx, ciphertext + total_len, &len) != 1) {
    goto error;
  }

  total_len += len;

  EVP_CIPHER_CTX_free(ctx);

  *out_size = total_len;
  fprintf(stderr, "[encrypt] Encrypted: %zu → %zu bytes\n", size, *out_size);
  return ciphertext;

error:
  EVP_CIPHER_CTX_free(ctx);
  free(ciphertext);
  return NULL;
}

int fl_encrypt_update(fl_encryptor_t *encryptor, const uint8_t *plaintext, size_t size,
                      uint8_t *ciphertext, size_t *out_size) {
  if (!encryptor || !plaintext || !ciphertext) return -1;

  if (!encryptor->internal_state) {
    encryptor->internal_state = EVP_CIPHER_CTX_new();
    if (!encryptor->internal_state) return -1;

    const EVP_CIPHER *cipher = NULL;
    if (encryptor->cipher == FL_CIPHER_AES_128_CBC) {
      cipher = EVP_aes_128_cbc();
    } else if (encryptor->cipher == FL_CIPHER_AES_256_CBC) {
      cipher = EVP_aes_256_cbc();
    }

    if (EVP_EncryptInit_ex((EVP_CIPHER_CTX*)encryptor->internal_state, cipher, NULL,
                           encryptor->key, encryptor->iv) != 1) {
      return -1;
    }
  }

  int len = 0;
  if (EVP_EncryptUpdate((EVP_CIPHER_CTX*)encryptor->internal_state, ciphertext, &len,
                        plaintext, (int)size) != 1) {
    return -1;
  }

  *out_size = len;
  return 0;
}

int fl_encrypt_finish(fl_encryptor_t *encryptor, uint8_t *ciphertext, size_t *out_size) {
  if (!encryptor || !encryptor->internal_state) return -1;

  int len = 0;
  if (EVP_EncryptFinal_ex((EVP_CIPHER_CTX*)encryptor->internal_state, ciphertext, &len) != 1) {
    return -1;
  }

  *out_size = len;
  EVP_CIPHER_CTX_free((EVP_CIPHER_CTX*)encryptor->internal_state);
  encryptor->internal_state = NULL;

  return 0;
}

/* ===== Decryption ===== */

uint8_t* fl_decrypt_data(fl_encryptor_t *encryptor, const uint8_t *ciphertext, size_t size,
                         size_t *out_size) {
  if (!encryptor || !ciphertext || !out_size) return NULL;

  EVP_CIPHER_CTX *ctx = EVP_CIPHER_CTX_new();
  if (!ctx) return NULL;

  const EVP_CIPHER *cipher = NULL;

  if (encryptor->cipher == FL_CIPHER_AES_128_CBC) {
    cipher = EVP_aes_128_cbc();
  } else if (encryptor->cipher == FL_CIPHER_AES_256_CBC) {
    cipher = EVP_aes_256_cbc();
  }

  if (!cipher) {
    EVP_CIPHER_CTX_free(ctx);
    return NULL;
  }

  uint8_t *plaintext = (uint8_t*)malloc(size + EVP_MAX_BLOCK_LENGTH);
  if (!plaintext) {
    EVP_CIPHER_CTX_free(ctx);
    return NULL;
  }

  int len = 0;
  int total_len = 0;

  if (EVP_DecryptInit_ex(ctx, cipher, NULL, encryptor->key, encryptor->iv) != 1) {
    goto error;
  }

  if (EVP_DecryptUpdate(ctx, plaintext, &len, ciphertext, (int)size) != 1) {
    goto error;
  }

  total_len = len;

  if (EVP_DecryptFinal_ex(ctx, plaintext + total_len, &len) != 1) {
    goto error;
  }

  total_len += len;

  EVP_CIPHER_CTX_free(ctx);

  *out_size = total_len;
  fprintf(stderr, "[encrypt] Decrypted: %zu → %zu bytes\n", size, *out_size);
  return plaintext;

error:
  EVP_CIPHER_CTX_free(ctx);
  free(plaintext);
  return NULL;
}

int fl_decrypt_update(fl_encryptor_t *encryptor, const uint8_t *ciphertext, size_t size,
                      uint8_t *plaintext, size_t *out_size) {
  if (!encryptor || !ciphertext || !plaintext) return -1;

  if (!encryptor->internal_state) {
    encryptor->internal_state = EVP_CIPHER_CTX_new();
    if (!encryptor->internal_state) return -1;

    const EVP_CIPHER *cipher = NULL;
    if (encryptor->cipher == FL_CIPHER_AES_128_CBC) {
      cipher = EVP_aes_128_cbc();
    } else if (encryptor->cipher == FL_CIPHER_AES_256_CBC) {
      cipher = EVP_aes_256_cbc();
    }

    if (EVP_DecryptInit_ex((EVP_CIPHER_CTX*)encryptor->internal_state, cipher, NULL,
                           encryptor->key, encryptor->iv) != 1) {
      return -1;
    }
  }

  int len = 0;
  if (EVP_DecryptUpdate((EVP_CIPHER_CTX*)encryptor->internal_state, plaintext, &len,
                        ciphertext, (int)size) != 1) {
    return -1;
  }

  *out_size = len;
  return 0;
}

int fl_decrypt_finish(fl_encryptor_t *encryptor, uint8_t *plaintext, size_t *out_size) {
  if (!encryptor || !encryptor->internal_state) return -1;

  int len = 0;
  if (EVP_DecryptFinal_ex((EVP_CIPHER_CTX*)encryptor->internal_state, plaintext, &len) != 1) {
    return -1;
  }

  *out_size = len;
  EVP_CIPHER_CTX_free((EVP_CIPHER_CTX*)encryptor->internal_state);
  encryptor->internal_state = NULL;

  return 0;
}

/* ===== Utilities ===== */

int fl_encrypt_validate_key_size(fl_cipher_type_t cipher, size_t key_size) {
  if (cipher == FL_CIPHER_AES_128_CBC || cipher == FL_CIPHER_AES_128_ECB) {
    return key_size == 16 ? 0 : -1;
  } else if (cipher == FL_CIPHER_AES_256_CBC || cipher == FL_CIPHER_AES_256_ECB) {
    return key_size == 32 ? 0 : -1;
  }

  return -1;
}
