/**
 * FreeLang stdlib/module Implementation - Dynamic Module Loading
 */

#include "module.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <dlfcn.h>
#include <time.h>

/* ===== Manager Lifecycle ===== */

fl_module_manager_t* fl_module_manager_create(void) {
  fl_module_manager_t *manager = (fl_module_manager_t*)malloc(sizeof(fl_module_manager_t));
  if (!manager) return NULL;

  memset(manager, 0, sizeof(fl_module_manager_t));

  manager->module_capacity = 256;
  manager->symbol_capacity = 1024;
  manager->search_path_capacity = 64;

  manager->modules = (fl_module_t*)malloc(sizeof(fl_module_t) * 256);
  manager->symbols = (fl_symbol_t*)malloc(sizeof(fl_symbol_t) * 1024);
  manager->search_paths = (const char**)malloc(sizeof(const char*) * 64);

  if (!manager->modules || !manager->symbols || !manager->search_paths) {
    free(manager->modules);
    free(manager->symbols);
    free(manager->search_paths);
    free(manager);
    return NULL;
  }

  memset(manager->modules, 0, sizeof(fl_module_t) * 256);
  memset(manager->symbols, 0, sizeof(fl_symbol_t) * 1024);
  memset(manager->search_paths, 0, sizeof(const char*) * 64);

  pthread_mutex_init(&manager->module_mutex, NULL);

  fprintf(stderr, "[module] Manager created\n");
  return manager;
}

void fl_module_manager_destroy(fl_module_manager_t *manager) {
  if (!manager) return;

  pthread_mutex_lock(&manager->module_mutex);

  for (int i = 0; i < manager->module_count; i++) {
    if (manager->modules[i].handle) {
      dlclose(manager->modules[i].handle);
    }
  }

  pthread_mutex_unlock(&manager->module_mutex);

  pthread_mutex_destroy(&manager->module_mutex);
  free(manager->modules);
  free(manager->symbols);
  free(manager->search_paths);
  free(manager);

  fprintf(stderr, "[module] Manager destroyed\n");
}

/* ===== Module Loading ===== */

fl_module_t* fl_module_load(fl_module_manager_t *manager, const char *name, const char *path) {
  if (!manager || !name || !path) return NULL;

  pthread_mutex_lock(&manager->module_mutex);

  /* Check if already loaded */
  for (int i = 0; i < manager->module_count; i++) {
    if (strcmp(manager->modules[i].name, name) == 0) {
      fl_module_t *module = &manager->modules[i];
      module->ref_count++;

      pthread_mutex_unlock(&manager->module_mutex);
      fprintf(stderr, "[module] Module already loaded: %s (ref_count=%d)\n", name, module->ref_count);
      return module;
    }
  }

  if (manager->module_count >= manager->module_capacity) {
    pthread_mutex_unlock(&manager->module_mutex);
    return NULL;
  }

  /* Load the module */
  void *handle = dlopen(path, RTLD_LAZY | RTLD_LOCAL);
  if (!handle) {
    pthread_mutex_unlock(&manager->module_mutex);
    fprintf(stderr, "[module] Failed to load: %s (error: %s)\n", path, dlerror());
    return NULL;
  }

  fl_module_t *module = &manager->modules[manager->module_count];
  module->name = name;
  module->file_path = path;
  module->handle = handle;
  module->load_time = time(NULL);
  module->ref_count = 1;
  module->is_loaded = 1;

  manager->module_count++;

  pthread_mutex_unlock(&manager->module_mutex);

  fprintf(stderr, "[module] Module loaded: %s (path=%s)\n", name, path);
  return module;
}

int fl_module_unload(fl_module_manager_t *manager, const char *name) {
  if (!manager || !name) return -1;

  pthread_mutex_lock(&manager->module_mutex);

  for (int i = 0; i < manager->module_count; i++) {
    if (strcmp(manager->modules[i].name, name) == 0) {
      fl_module_t *module = &manager->modules[i];

      module->ref_count--;
      if (module->ref_count <= 0) {
        dlclose(module->handle);

        /* Shift remaining modules */
        for (int j = i; j < manager->module_count - 1; j++) {
          manager->modules[j] = manager->modules[j + 1];
        }
        manager->module_count--;

        pthread_mutex_unlock(&manager->module_mutex);
        fprintf(stderr, "[module] Module unloaded: %s\n", name);
        return 0;
      }

      pthread_mutex_unlock(&manager->module_mutex);
      fprintf(stderr, "[module] Module ref_count decremented: %s (ref_count=%d)\n", name, module->ref_count);
      return 0;
    }
  }

  pthread_mutex_unlock(&manager->module_mutex);
  return -1;
}

int fl_module_is_loaded(fl_module_manager_t *manager, const char *name) {
  return fl_module_get(manager, name) != NULL ? 1 : 0;
}

fl_module_t* fl_module_get(fl_module_manager_t *manager, const char *name) {
  if (!manager || !name) return NULL;

  pthread_mutex_lock(&manager->module_mutex);

  for (int i = 0; i < manager->module_count; i++) {
    if (strcmp(manager->modules[i].name, name) == 0) {
      fl_module_t *module = &manager->modules[i];

      pthread_mutex_unlock(&manager->module_mutex);
      return module;
    }
  }

  pthread_mutex_unlock(&manager->module_mutex);
  return NULL;
}

/* ===== Reference Counting ===== */

int fl_module_addref(fl_module_manager_t *manager, const char *name) {
  fl_module_t *module = fl_module_get(manager, name);
  if (!module) return 0;

  pthread_mutex_lock(&manager->module_mutex);
  module->ref_count++;
  int count = module->ref_count;
  pthread_mutex_unlock(&manager->module_mutex);

  return count;
}

int fl_module_release(fl_module_manager_t *manager, const char *name) {
  return fl_module_unload(manager, name);
}

/* ===== Symbol Resolution ===== */

void* fl_module_get_symbol(fl_module_manager_t *manager, const char *module_name,
                           const char *symbol_name) {
  if (!manager || !module_name || !symbol_name) return NULL;

  fl_module_t *module = fl_module_get(manager, module_name);
  if (!module || !module->handle) return NULL;

  void *symbol = dlsym(module->handle, symbol_name);
  if (!symbol) {
    fprintf(stderr, "[module] Symbol not found: %s in %s\n", symbol_name, module_name);
    return NULL;
  }

  return symbol;
}

int fl_module_has_symbol(fl_module_manager_t *manager, const char *module_name,
                         const char *symbol_name) {
  return fl_module_get_symbol(manager, module_name, symbol_name) != NULL ? 1 : 0;
}

/* ===== Search Paths ===== */

int fl_module_add_search_path(fl_module_manager_t *manager, const char *path) {
  if (!manager || !path) return -1;

  pthread_mutex_lock(&manager->module_mutex);

  if (manager->search_path_count >= manager->search_path_capacity) {
    pthread_mutex_unlock(&manager->module_mutex);
    return -1;
  }

  manager->search_paths[manager->search_path_count] = path;
  manager->search_path_count++;

  pthread_mutex_unlock(&manager->module_mutex);

  fprintf(stderr, "[module] Search path added: %s\n", path);
  return 0;
}

const char* fl_module_find_file(fl_module_manager_t *manager, const char *name) {
  if (!manager || !name) return NULL;

  pthread_mutex_lock(&manager->module_mutex);

  for (int i = 0; i < manager->search_path_count; i++) {
    static char filepath[512];
    snprintf(filepath, sizeof(filepath), "%s/%s.so", manager->search_paths[i], name);

    /* Simplified: just return the constructed path */
    pthread_mutex_unlock(&manager->module_mutex);
    return filepath;
  }

  pthread_mutex_unlock(&manager->module_mutex);
  return NULL;
}

/* ===== Enumeration ===== */

void fl_module_list(fl_module_manager_t *manager, fl_module_callback_t callback, void *userdata) {
  if (!manager || !callback) return;

  pthread_mutex_lock(&manager->module_mutex);

  for (int i = 0; i < manager->module_count; i++) {
    callback(&manager->modules[i], userdata);
  }

  pthread_mutex_unlock(&manager->module_mutex);
}

/* ===== Statistics ===== */

fl_module_stats_t fl_module_get_stats(fl_module_manager_t *manager) {
  fl_module_stats_t stats = {0};

  if (!manager) return stats;

  pthread_mutex_lock(&manager->module_mutex);

  stats.loaded_modules = manager->module_count;
  stats.total_symbols = manager->symbol_count;
  stats.search_paths = manager->search_path_count;

  pthread_mutex_unlock(&manager->module_mutex);

  return stats;
}
