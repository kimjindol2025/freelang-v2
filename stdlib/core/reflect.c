/**
 * FreeLang stdlib/reflect Implementation - Runtime Type Information
 */

#include "reflect.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

/* ===== Registry Creation ===== */

fl_type_registry_t* fl_reflect_registry_create(void) {
  fl_type_registry_t *registry = (fl_type_registry_t*)malloc(sizeof(fl_type_registry_t));
  if (!registry) return NULL;

  memset(registry, 0, sizeof(fl_type_registry_t));

  registry->type_capacity = 256;
  registry->function_capacity = 256;
  registry->struct_capacity = 128;

  registry->types = (fl_type_info_t*)malloc(sizeof(fl_type_info_t) * 256);
  registry->functions = (fl_function_sig_t*)malloc(sizeof(fl_function_sig_t) * 256);
  registry->structs = (fl_struct_info_t*)malloc(sizeof(fl_struct_info_t) * 128);

  if (!registry->types || !registry->functions || !registry->structs) {
    free(registry->types);
    free(registry->functions);
    free(registry->structs);
    free(registry);
    return NULL;
  }

  memset(registry->types, 0, sizeof(fl_type_info_t) * 256);
  memset(registry->functions, 0, sizeof(fl_function_sig_t) * 256);
  memset(registry->structs, 0, sizeof(fl_struct_info_t) * 128);

  pthread_mutex_init(&registry->registry_mutex, NULL);

  fprintf(stderr, "[reflect] Registry created\n");
  return registry;
}

void fl_reflect_registry_destroy(fl_type_registry_t *registry) {
  if (!registry) return;

  pthread_mutex_destroy(&registry->registry_mutex);

  for (int i = 0; i < registry->function_count; i++) {
    free(registry->functions[i].param_types);
  }

  for (int i = 0; i < registry->struct_count; i++) {
    free(registry->structs[i].fields);
  }

  free(registry->types);
  free(registry->functions);
  free(registry->structs);
  free(registry);

  fprintf(stderr, "[reflect] Registry destroyed\n");
}

/* ===== Type Registration ===== */

int fl_reflect_register_type(fl_type_registry_t *registry, const char *name,
                             fl_type_kind_t kind, size_t size) {
  if (!registry || !name) return -1;

  pthread_mutex_lock(&registry->registry_mutex);

  if (registry->type_count >= registry->type_capacity) {
    pthread_mutex_unlock(&registry->registry_mutex);
    return -1;
  }

  fl_type_info_t *type = &registry->types[registry->type_count];
  type->name = name;
  type->kind = kind;
  type->size = size;
  type->is_pointer = 0;

  registry->type_count++;

  pthread_mutex_unlock(&registry->registry_mutex);

  fprintf(stderr, "[reflect] Type registered: %s (kind=%d, size=%zu)\n", name, kind, size);
  return registry->type_count - 1;
}

int fl_reflect_register_function(fl_type_registry_t *registry, const char *name,
                                 fl_type_info_t return_type) {
  if (!registry || !name) return -1;

  pthread_mutex_lock(&registry->registry_mutex);

  if (registry->function_count >= registry->function_capacity) {
    pthread_mutex_unlock(&registry->registry_mutex);
    return -1;
  }

  fl_function_sig_t *func = &registry->functions[registry->function_count];
  func->name = name;
  func->return_type = return_type;
  func->max_params = 32;
  func->param_types = (fl_type_info_t*)malloc(sizeof(fl_type_info_t) * 32);

  if (!func->param_types) {
    pthread_mutex_unlock(&registry->registry_mutex);
    return -1;
  }

  memset(func->param_types, 0, sizeof(fl_type_info_t) * 32);
  func->param_count = 0;
  func->is_variadic = 0;

  registry->function_count++;

  pthread_mutex_unlock(&registry->registry_mutex);

  fprintf(stderr, "[reflect] Function registered: %s\n", name);
  return registry->function_count - 1;
}

int fl_reflect_add_param(fl_type_registry_t *registry, const char *function_name,
                         fl_type_info_t param_type) {
  if (!registry || !function_name) return -1;

  pthread_mutex_lock(&registry->registry_mutex);

  for (int i = 0; i < registry->function_count; i++) {
    if (strcmp(registry->functions[i].name, function_name) == 0) {
      fl_function_sig_t *func = &registry->functions[i];

      if (func->param_count >= func->max_params) {
        pthread_mutex_unlock(&registry->registry_mutex);
        return -1;
      }

      func->param_types[func->param_count] = param_type;
      func->param_count++;

      pthread_mutex_unlock(&registry->registry_mutex);
      return func->param_count - 1;
    }
  }

  pthread_mutex_unlock(&registry->registry_mutex);
  return -1;
}

int fl_reflect_register_struct(fl_type_registry_t *registry, const char *name) {
  if (!registry || !name) return -1;

  pthread_mutex_lock(&registry->registry_mutex);

  if (registry->struct_count >= registry->struct_capacity) {
    pthread_mutex_unlock(&registry->registry_mutex);
    return -1;
  }

  fl_struct_info_t *st = &registry->structs[registry->struct_count];
  st->name = name;
  st->max_fields = 64;
  st->fields = (fl_field_info_t*)malloc(sizeof(fl_field_info_t) * 64);

  if (!st->fields) {
    pthread_mutex_unlock(&registry->registry_mutex);
    return -1;
  }

  memset(st->fields, 0, sizeof(fl_field_info_t) * 64);
  st->field_count = 0;
  st->size = 0;

  registry->struct_count++;

  pthread_mutex_unlock(&registry->registry_mutex);

  fprintf(stderr, "[reflect] Struct registered: %s\n", name);
  return registry->struct_count - 1;
}

int fl_reflect_struct_add_field(fl_type_registry_t *registry, const char *struct_name,
                                const char *field_name, fl_type_info_t type, size_t offset) {
  if (!registry || !struct_name || !field_name) return -1;

  pthread_mutex_lock(&registry->registry_mutex);

  for (int i = 0; i < registry->struct_count; i++) {
    if (strcmp(registry->structs[i].name, struct_name) == 0) {
      fl_struct_info_t *st = &registry->structs[i];

      if (st->field_count >= st->max_fields) {
        pthread_mutex_unlock(&registry->registry_mutex);
        return -1;
      }

      fl_field_info_t *field = &st->fields[st->field_count];
      field->name = field_name;
      field->type = type;
      field->offset = offset;

      st->field_count++;
      if (offset + type.size > st->size) {
        st->size = offset + type.size;
      }

      pthread_mutex_unlock(&registry->registry_mutex);
      return st->field_count - 1;
    }
  }

  pthread_mutex_unlock(&registry->registry_mutex);
  return -1;
}

/* ===== Type Queries ===== */

fl_type_info_t* fl_reflect_get_type(fl_type_registry_t *registry, const char *name) {
  if (!registry || !name) return NULL;

  pthread_mutex_lock(&registry->registry_mutex);

  for (int i = 0; i < registry->type_count; i++) {
    if (strcmp(registry->types[i].name, name) == 0) {
      fl_type_info_t *type = &registry->types[i];
      pthread_mutex_unlock(&registry->registry_mutex);
      return type;
    }
  }

  pthread_mutex_unlock(&registry->registry_mutex);
  return NULL;
}

int fl_reflect_has_type(fl_type_registry_t *registry, const char *name) {
  return fl_reflect_get_type(registry, name) != NULL ? 1 : 0;
}

int fl_reflect_type_size(fl_type_registry_t *registry, const char *name) {
  fl_type_info_t *type = fl_reflect_get_type(registry, name);
  return type ? type->size : 0;
}

/* ===== Function Queries ===== */

fl_function_sig_t* fl_reflect_get_function(fl_type_registry_t *registry, const char *name) {
  if (!registry || !name) return NULL;

  pthread_mutex_lock(&registry->registry_mutex);

  for (int i = 0; i < registry->function_count; i++) {
    if (strcmp(registry->functions[i].name, name) == 0) {
      fl_function_sig_t *func = &registry->functions[i];
      pthread_mutex_unlock(&registry->registry_mutex);
      return func;
    }
  }

  pthread_mutex_unlock(&registry->registry_mutex);
  return NULL;
}

int fl_reflect_has_function(fl_type_registry_t *registry, const char *name) {
  return fl_reflect_get_function(registry, name) != NULL ? 1 : 0;
}

int fl_reflect_function_param_count(fl_type_registry_t *registry, const char *name) {
  fl_function_sig_t *func = fl_reflect_get_function(registry, name);
  return func ? func->param_count : 0;
}

fl_type_info_t fl_reflect_function_return_type(fl_type_registry_t *registry, const char *name) {
  fl_function_sig_t *func = fl_reflect_get_function(registry, name);

  if (func) {
    return func->return_type;
  }

  fl_type_info_t unknown = {0};
  return unknown;
}

fl_type_info_t* fl_reflect_function_params(fl_type_registry_t *registry, const char *name, int *count) {
  fl_function_sig_t *func = fl_reflect_get_function(registry, name);

  if (func && count) {
    *count = func->param_count;
    return func->param_types;
  }

  if (count) *count = 0;
  return NULL;
}

/* ===== Struct Queries ===== */

fl_struct_info_t* fl_reflect_get_struct(fl_type_registry_t *registry, const char *name) {
  if (!registry || !name) return NULL;

  pthread_mutex_lock(&registry->registry_mutex);

  for (int i = 0; i < registry->struct_count; i++) {
    if (strcmp(registry->structs[i].name, name) == 0) {
      fl_struct_info_t *st = &registry->structs[i];
      pthread_mutex_unlock(&registry->registry_mutex);
      return st;
    }
  }

  pthread_mutex_unlock(&registry->registry_mutex);
  return NULL;
}

int fl_reflect_has_struct(fl_type_registry_t *registry, const char *name) {
  return fl_reflect_get_struct(registry, name) != NULL ? 1 : 0;
}

int fl_reflect_struct_field_count(fl_type_registry_t *registry, const char *name) {
  fl_struct_info_t *st = fl_reflect_get_struct(registry, name);
  return st ? st->field_count : 0;
}

fl_field_info_t* fl_reflect_struct_get_field(fl_type_registry_t *registry,
                                             const char *struct_name, const char *field_name) {
  fl_struct_info_t *st = fl_reflect_get_struct(registry, struct_name);

  if (st) {
    for (int i = 0; i < st->field_count; i++) {
      if (strcmp(st->fields[i].name, field_name) == 0) {
        return &st->fields[i];
      }
    }
  }

  return NULL;
}

/* ===== Introspection ===== */

void fl_reflect_list_types(fl_type_registry_t *registry, fl_reflect_callback_t callback, void *userdata) {
  if (!registry || !callback) return;

  pthread_mutex_lock(&registry->registry_mutex);

  for (int i = 0; i < registry->type_count; i++) {
    callback(registry->types[i].name, registry->types[i], userdata);
  }

  pthread_mutex_unlock(&registry->registry_mutex);
}

void fl_reflect_list_functions(fl_type_registry_t *registry, fl_reflect_callback_t callback, void *userdata) {
  if (!registry || !callback) return;

  pthread_mutex_lock(&registry->registry_mutex);

  for (int i = 0; i < registry->function_count; i++) {
    fl_type_info_t func_type = {
      .name = registry->functions[i].name,
      .kind = FL_TYPE_FUNCTION,
      .size = 0
    };
    callback(registry->functions[i].name, func_type, userdata);
  }

  pthread_mutex_unlock(&registry->registry_mutex);
}

/* ===== Type Conversion ===== */

int fl_reflect_can_convert(fl_type_info_t from, fl_type_info_t to) {
  /* Simplified: same type always convertible */
  if (from.kind == to.kind) {
    return 1;
  }

  /* Allow numeric conversions */
  if ((from.kind == FL_TYPE_INT || from.kind == FL_TYPE_FLOAT) &&
      (to.kind == FL_TYPE_INT || to.kind == FL_TYPE_FLOAT)) {
    return 1;
  }

  /* Allow pointer conversions */
  if (from.is_pointer && to.is_pointer) {
    return 1;
  }

  return 0;
}

void* fl_reflect_convert(const void *value, fl_type_info_t from, fl_type_info_t to) {
  if (!value || !fl_reflect_can_convert(from, to)) {
    return NULL;
  }

  /* Simplified: direct copy for same-size types */
  void *result = malloc(to.size);
  if (result) {
    memcpy(result, value, (from.size < to.size) ? from.size : to.size);
  }

  return result;
}

/* ===== Statistics ===== */

fl_reflect_stats_t fl_reflect_get_stats(fl_type_registry_t *registry) {
  fl_reflect_stats_t stats = {0};

  if (!registry) return stats;

  pthread_mutex_lock(&registry->registry_mutex);

  stats.total_types = registry->type_count;
  stats.total_functions = registry->function_count;
  stats.total_structs = registry->struct_count;

  for (int i = 0; i < registry->struct_count; i++) {
    stats.total_fields += registry->structs[i].field_count;
  }

  pthread_mutex_unlock(&registry->registry_mutex);

  return stats;
}
