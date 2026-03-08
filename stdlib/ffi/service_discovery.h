/**
 * FreeLang Service Discovery (Phase 24-3)
 * Auto service registration, discovery, DNS resolution
 */

#ifndef FREELANG_SERVICE_DISCOVERY_H
#define FREELANG_SERVICE_DISCOVERY_H

#include <time.h>
#include <pthread.h>

typedef struct {
  char service_name[256];
  char instance_id[64];
  char host[256];
  int port;

  int health_check_port;
  char health_check_path[256];  /* e.g., "/health" */

  int64_t registered_at;
  int64_t last_heartbeat;
  int is_healthy;

  int weight;
  int metadata_count;
  char metadata[256][256];
} fl_service_instance_t;

typedef struct {
  fl_service_instance_t instances[256];
  int instance_count;

  int heartbeat_timeout_sec;
  int auto_deregister_on_timeout;

  pthread_mutex_t discovery_mutex;
} fl_service_registry_t;

/* Create/destroy registry */
fl_service_registry_t* freelang_service_discovery_create(void);
void freelang_service_discovery_destroy(fl_service_registry_t *registry);

/* Register service instance */
int freelang_service_discovery_register(fl_service_registry_t *registry,
                                         const char *service_name,
                                         const char *host,
                                         int port);

/* Deregister service */
void freelang_service_discovery_deregister(fl_service_registry_t *registry,
                                            const char *instance_id);

/* Discover service instances */
void freelang_service_discovery_find(fl_service_registry_t *registry,
                                      const char *service_name,
                                      fl_service_instance_t **instances,
                                      int *count);

/* Heartbeat update */
void freelang_service_discovery_heartbeat(fl_service_registry_t *registry,
                                           const char *instance_id);

/* Get single instance (load balanced) */
fl_service_instance_t* freelang_service_discovery_get_instance(fl_service_registry_t *registry,
                                                                const char *service_name);

#endif /* FREELANG_SERVICE_DISCOVERY_H */
