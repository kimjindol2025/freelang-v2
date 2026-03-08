/**
 * FreeLang Service Discovery Implementation (Phase 24-3)
 * Service instance registration and discovery
 */

#include "service_discovery.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>

fl_service_registry_t* freelang_service_discovery_create(void) {
  fl_service_registry_t *registry = (fl_service_registry_t*)malloc(sizeof(fl_service_registry_t));
  if (!registry) return NULL;

  memset(registry, 0, sizeof(fl_service_registry_t));
  pthread_mutex_init(&registry->discovery_mutex, NULL);

  registry->heartbeat_timeout_sec = 30;
  registry->auto_deregister_on_timeout = 1;

  fprintf(stderr, "[ServiceDiscovery] Registry created\\n");
  return registry;
}

void freelang_service_discovery_destroy(fl_service_registry_t *registry) {
  if (!registry) return;

  pthread_mutex_destroy(&registry->discovery_mutex);
  free(registry);

  fprintf(stderr, "[ServiceDiscovery] Registry destroyed\\n");
}

int freelang_service_discovery_register(fl_service_registry_t *registry,
                                         const char *service_name,
                                         const char *host,
                                         int port) {
  if (!registry || !service_name || !host || registry->instance_count >= 256) return -1;

  pthread_mutex_lock(&registry->discovery_mutex);

  fl_service_instance_t *inst = &registry->instances[registry->instance_count];
  strncpy(inst->service_name, service_name, sizeof(inst->service_name) - 1);
  strncpy(inst->host, host, sizeof(inst->host) - 1);

  snprintf(inst->instance_id, sizeof(inst->instance_id), "%s_%ld", service_name, time(NULL));
  inst->port = port;
  inst->registered_at = time(NULL);
  inst->last_heartbeat = time(NULL);
  inst->is_healthy = 1;
  inst->weight = 1;

  int instance_id = registry->instance_count;
  registry->instance_count++;

  pthread_mutex_unlock(&registry->discovery_mutex);

  fprintf(stderr, "[ServiceDiscovery] Service registered: %s at %s:%d\\n",
          service_name, host, port);

  return instance_id;
}

void freelang_service_discovery_deregister(fl_service_registry_t *registry,
                                            const char *instance_id) {
  if (!registry || !instance_id) return;

  pthread_mutex_lock(&registry->discovery_mutex);

  for (int i = 0; i < registry->instance_count; i++) {
    if (strcmp(registry->instances[i].instance_id, instance_id) == 0) {
      for (int j = i; j < registry->instance_count - 1; j++) {
        memcpy(&registry->instances[j], &registry->instances[j + 1],
               sizeof(fl_service_instance_t));
      }
      registry->instance_count--;
      break;
    }
  }

  pthread_mutex_unlock(&registry->discovery_mutex);

  fprintf(stderr, "[ServiceDiscovery] Service deregistered: %s\\n", instance_id);
}

void freelang_service_discovery_find(fl_service_registry_t *registry,
                                      const char *service_name,
                                      fl_service_instance_t **instances,
                                      int *count) {
  if (!registry || !service_name || !instances || !count) return;

  *count = 0;
  pthread_mutex_lock(&registry->discovery_mutex);

  for (int i = 0; i < registry->instance_count && *count < 256; i++) {
    if (strcmp(registry->instances[i].service_name, service_name) == 0 &&
        registry->instances[i].is_healthy) {
      instances[(*count)++] = &registry->instances[i];
    }
  }

  pthread_mutex_unlock(&registry->discovery_mutex);

  fprintf(stderr, "[ServiceDiscovery] Found %d instances of %s\\n", *count, service_name);
}

void freelang_service_discovery_heartbeat(fl_service_registry_t *registry,
                                           const char *instance_id) {
  if (!registry || !instance_id) return;

  pthread_mutex_lock(&registry->discovery_mutex);

  for (int i = 0; i < registry->instance_count; i++) {
    if (strcmp(registry->instances[i].instance_id, instance_id) == 0) {
      registry->instances[i].last_heartbeat = time(NULL);
      registry->instances[i].is_healthy = 1;
      break;
    }
  }

  pthread_mutex_unlock(&registry->discovery_mutex);
}

fl_service_instance_t* freelang_service_discovery_get_instance(fl_service_registry_t *registry,
                                                                const char *service_name) {
  if (!registry || !service_name) return NULL;

  fl_service_instance_t *result = NULL;
  pthread_mutex_lock(&registry->discovery_mutex);

  for (int i = 0; i < registry->instance_count; i++) {
    if (strcmp(registry->instances[i].service_name, service_name) == 0 &&
        registry->instances[i].is_healthy) {
      result = &registry->instances[i];
      break;
    }
  }

  pthread_mutex_unlock(&registry->discovery_mutex);

  return result;
}
