/**
 * FreeLang Advanced Redis Commands (Phase 19)
 * Extended command set beyond basic GET/SET
 */

#ifndef FREELANG_ADVANCED_COMMANDS_H
#define FREELANG_ADVANCED_COMMANDS_H

#include "redis_bindings.h"

/* ===== List Commands ===== */

/* LPUSH - push to list head */
void freelang_redis_lpush(int client_id, const char *key, const char *value, int callback_id);

/* RPUSH - push to list tail */
void freelang_redis_rpush(int client_id, const char *key, const char *value, int callback_id);

/* LPOP - pop from list head */
void freelang_redis_lpop(int client_id, const char *key, int callback_id);

/* RPOP - pop from list tail */
void freelang_redis_rpop(int client_id, const char *key, int callback_id);

/* LLEN - get list length */
void freelang_redis_llen(int client_id, const char *key, int callback_id);

/* ===== Hash Commands ===== */

/* HSET - set hash field */
void freelang_redis_hset(int client_id, const char *key, const char *field,
                         const char *value, int callback_id);

/* HGET - get hash field */
void freelang_redis_hget(int client_id, const char *key, const char *field, int callback_id);

/* HDEL - delete hash field */
void freelang_redis_hdel(int client_id, const char *key, const char *field, int callback_id);

/* HEXISTS - check hash field exists */
void freelang_redis_hexists(int client_id, const char *key, const char *field, int callback_id);

/* HLEN - get hash length */
void freelang_redis_hlen(int client_id, const char *key, int callback_id);

/* ===== Set Commands ===== */

/* SADD - add to set */
void freelang_redis_sadd(int client_id, const char *key, const char *member, int callback_id);

/* SREM - remove from set */
void freelang_redis_srem(int client_id, const char *key, const char *member, int callback_id);

/* SCARD - get set cardinality */
void freelang_redis_scard(int client_id, const char *key, int callback_id);

/* SISMEMBER - check set membership */
void freelang_redis_sismember(int client_id, const char *key, const char *member, int callback_id);

/* ===== Sorted Set Commands ===== */

/* ZADD - add to sorted set */
void freelang_redis_zadd(int client_id, const char *key, double score,
                         const char *member, int callback_id);

/* ZREM - remove from sorted set */
void freelang_redis_zrem(int client_id, const char *key, const char *member, int callback_id);

/* ZCARD - get sorted set cardinality */
void freelang_redis_zcard(int client_id, const char *key, int callback_id);

/* ZSCORE - get score of sorted set member */
void freelang_redis_zscore(int client_id, const char *key, const char *member, int callback_id);

/* ===== String Commands ===== */

/* APPEND - append to string */
void freelang_redis_append(int client_id, const char *key, const char *value, int callback_id);

/* STRLEN - get string length */
void freelang_redis_strlen(int client_id, const char *key, int callback_id);

/* GETRANGE - get substring */
void freelang_redis_getrange(int client_id, const char *key, int start, int end, int callback_id);

/* ===== Key Commands ===== */

/* TTL - get remaining TTL */
void freelang_redis_ttl(int client_id, const char *key, int callback_id);

/* TYPE - get key type */
void freelang_redis_type(int client_id, const char *key, int callback_id);

/* KEYS - get matching keys (pattern) */
void freelang_redis_keys(int client_id, const char *pattern, int callback_id);

/* ===== Server Commands ===== */

/* INFO - get server info */
void freelang_redis_info(int client_id, int callback_id);

/* DBSIZE - get database size */
void freelang_redis_dbsize(int client_id, int callback_id);

/* FLUSHDB - flush current database */
void freelang_redis_flushdb(int client_id, int callback_id);

/* SAVE - save to disk */
void freelang_redis_save(int client_id, int callback_id);

#endif /* FREELANG_ADVANCED_COMMANDS_H */
