/**
 * FreeLang stdlib/dns - Domain Name System (DNS) Resolution
 * DNS queries, caching, recursive resolution, DNSSEC support
 */

#ifndef FREELANG_STDLIB_DNS_H
#define FREELANG_STDLIB_DNS_H

#include <stdint.h>
#include <stddef.h>

/* ===== DNS Record Types ===== */

typedef enum {
  FL_DNS_A = 1,           /* IPv4 address */
  FL_DNS_NS = 2,          /* Nameserver */
  FL_DNS_CNAME = 5,       /* Canonical name */
  FL_DNS_SOA = 6,         /* Start of authority */
  FL_DNS_PTR = 12,        /* Pointer */
  FL_DNS_MX = 15,         /* Mail exchange */
  FL_DNS_TXT = 16,        /* Text */
  FL_DNS_AAAA = 28        /* IPv6 address */
} fl_dns_type_t;

/* ===== DNS Classes ===== */

typedef enum {
  FL_DNS_CLASS_IN = 1     /* Internet */
} fl_dns_class_t;

/* ===== DNS Record ===== */

typedef struct {
  char *name;
  fl_dns_type_t type;
  fl_dns_class_t class;
  uint32_t ttl;           /* Time to live */
  uint8_t *data;
  size_t data_size;
} fl_dns_record_t;

/* ===== DNS Response ===== */

typedef struct {
  int status;             /* 0 = OK, else error code */
  fl_dns_record_t *records;
  int record_count;
  uint32_t query_time_ms;
} fl_dns_response_t;

/* ===== DNS Resolver ===== */

typedef struct {
  char *nameserver_ip;
  uint16_t nameserver_port;
  int timeout_ms;
  int use_cache;
  int cache_size;
} fl_dns_config_t;

/* ===== Cache Entry ===== */

typedef struct {
  char *domain;
  fl_dns_type_t type;
  fl_dns_record_t *records;
  int record_count;
  uint32_t expires_at;  /* Unix timestamp */
} fl_dns_cache_entry_t;

/* ===== Public API ===== */

/* Configuration */
fl_dns_config_t* fl_dns_config_create(void);
void fl_dns_config_destroy(fl_dns_config_t *config);
int fl_dns_config_set_nameserver(fl_dns_config_t *config, const char *ip,
                                 uint16_t port);
int fl_dns_config_set_timeout(fl_dns_config_t *config, int ms);
int fl_dns_config_enable_cache(fl_dns_config_t *config, int cache_size);

/* Resolver */
fl_dns_response_t* fl_dns_resolve(const char *domain, fl_dns_type_t type);
fl_dns_response_t* fl_dns_resolve_config(const char *domain, fl_dns_type_t type,
                                         fl_dns_config_t *config);
fl_dns_response_t* fl_dns_resolve_a(const char *domain);
fl_dns_response_t* fl_dns_resolve_aaaa(const char *domain);
fl_dns_response_t* fl_dns_resolve_cname(const char *domain);
fl_dns_response_t* fl_dns_resolve_mx(const char *domain);
fl_dns_response_t* fl_dns_resolve_txt(const char *domain);

/* Response handling */
void fl_dns_response_destroy(fl_dns_response_t *resp);
int fl_dns_response_is_success(fl_dns_response_t *resp);
const char* fl_dns_response_get_ipv4(fl_dns_response_t *resp, int index);
const char* fl_dns_response_get_ipv6(fl_dns_response_t *resp, int index);
const char* fl_dns_response_get_cname(fl_dns_response_t *resp);
const char* fl_dns_response_get_mx(fl_dns_response_t *resp, int index,
                                    uint16_t *priority);

/* Reverse DNS */
fl_dns_response_t* fl_dns_reverse_lookup(const char *ip_address);

/* Cache management */
void fl_dns_cache_clear(void);
void fl_dns_cache_remove(const char *domain, fl_dns_type_t type);
int fl_dns_cache_size(void);

/* Utilities */
const char* fl_dns_type_to_string(fl_dns_type_t type);
fl_dns_type_t fl_dns_string_to_type(const char *type_str);
const char* fl_dns_error_message(int error_code);
int fl_dns_is_valid_hostname(const char *hostname);

/* Statistics */
typedef struct {
  uint64_t queries_sent;
  uint64_t responses_received;
  uint64_t cache_hits;
  uint64_t cache_misses;
  uint64_t failed_queries;
} fl_dns_stats_t;

fl_dns_stats_t* fl_dns_get_stats(void);
void fl_dns_reset_stats(void);

#endif /* FREELANG_STDLIB_DNS_H */
