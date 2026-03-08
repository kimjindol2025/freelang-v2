/**
 * FreeLang stdlib/module - Module Loading & Management
 * Dynamic module loading, symbol resolution, dependency management
 */

#ifndef FREELANG_STDLIB_MODULE_H
#define FREELANG_STDLIB_MODULE_H

#include <stdint.h>
#include <pthread.h>

/* ===== Module Information ===== */

typedef struct {
  const char *name;
  const char *version;
  const char *file_path;
  void *handle;              /* dlopen handle */
  int64_t load_time;
  int ref_count;             /* Reference counting */
  int is_loaded;
} fl_module_t;

/* ===== Symbol ===== */

typedef struct {
  const char *name;
  void *address;
  int is_function;           /* 1 = function, 0 = data */
} fl_symbol_t;

/* ===== Module Manager ===== */

typedef struct {
  fl_module_t *modules;
  int module_count;
  int module_capacity;

  fl_symbol_t *symbols;
  int symbol_count;
  int symbol_capacity;

  const char **search_paths;
  int search_path_count;
  int search_path_capacity;

  pthread_mutex_t module_mutex;
} fl_module_manager_t;

/* ===== Public API ===== */

/* Manager creation */
fl_module_manager_t* fl_module_manager_create(void);
void fl_module_manager_destroy(fl_module_manager_t *manager);

/* Module loading */
fl_module_t* fl_module_load(fl_module_manager_t *manager, const char *name, const char *path);
int fl_module_unload(fl_module_manager_t *manager, const char *name);
int fl_module_is_loaded(fl_module_manager_t *manager, const char *name);
fl_module_t* fl_module_get(fl_module_manager_t *manager, const char *name);

/* Reference counting */
int fl_module_addref(fl_module_manager_t *manager, const char *name);
int fl_module_release(fl_module_manager_t *manager, const char *name);

/* Symbol resolution */
void* fl_module_get_symbol(fl_module_manager_t *manager, const char *module_name,
                           const char *symbol_name);
int fl_module_has_symbol(fl_module_manager_t *manager, const char *module_name,
                         const char *symbol_name);

/* Search paths */
int fl_module_add_search_path(fl_module_manager_t *manager, const char *path);
const char* fl_module_find_file(fl_module_manager_t *manager, const char *name);

/* Module enumeration */
typedef void (*fl_module_callback_t)(fl_module_t *module, void *userdata);
void fl_module_list(fl_module_manager_t *manager, fl_module_callback_t callback, void *userdata);

/* Metadata */
typedef struct {
  int loaded_modules;
  int total_symbols;
  int search_paths;
} fl_module_stats_t;

fl_module_stats_t fl_module_get_stats(fl_module_manager_t *manager);

#endif /* FREELANG_STDLIB_MODULE_H */
