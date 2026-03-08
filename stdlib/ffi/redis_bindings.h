/**
 * FreeLang Redis Bindings (Phase 17 Week 2)
 * Async Redis client bindings
 */

#ifndef FREELANG_REDIS_BINDINGS_H
#define FREELANG_REDIS_BINDINGS_H

#include "freelang_ffi.h"

/* ===== Redis Client Management ===== */

/* Create Redis client */
int freelang_redis_create(const char *host, int port, int callback_ctx_id);

/* Close Redis client */
void freelang_redis_close(int client_id);

/* ===== Async Redis Commands ===== */

/* GET - retrieve value */
void freelang_redis_get(int client_id, const char *key, int callback_id);

/* SET - store value */
void freelang_redis_set(int client_id, const char *key, const char *value, int callback_id);

/* DEL - delete key */
void freelang_redis_del(int client_id, const char *key, int callback_id);

/* EXISTS - check if key exists */
void freelang_redis_exists(int client_id, const char *key, int callback_id);

/* INCR - increment integer */
void freelang_redis_incr(int client_id, const char *key, int callback_id);

/* EXPIRE - set TTL */
void freelang_redis_expire(int client_id, const char *key, int seconds, int callback_id);

/* ===== Connection Status ===== */

int freelang_redis_is_connected(int client_id);

int freelang_redis_ping(int client_id, int callback_id);

#endif /* FREELANG_REDIS_BINDINGS_H */
