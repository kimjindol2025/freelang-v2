/**
 * FreeLang stdlib/reflect - Runtime Type Information & Reflection
 * Type metadata, function signatures, dynamic invocation, type queries
 */

#ifndef FREELANG_STDLIB_REFLECT_H
#define FREELANG_STDLIB_REFLECT_H

#include <stdint.h>
#include <pthread.h>

/* ===== Type Information ===== */

typedef enum {
  FL_TYPE_UNKNOWN = 0,
  FL_TYPE_INT = 1,
  FL_TYPE_FLOAT = 2,
  FL_TYPE_STRING = 3,
  FL_TYPE_BOOL = 4,
  FL_TYPE_ARRAY = 5,
  FL_TYPE_STRUCT = 6,
  FL_TYPE_FUNCTION = 7,
  FL_TYPE_POINTER = 8
} fl_type_kind_t;

typedef struct {
  const char *name;
  fl_type_kind_t kind;
  size_t size;          /* Size in bytes */
  int is_pointer;
} fl_type_info_t;

/* ===== Function Signature ===== */

typedef struct {
  const char *name;
  fl_type_info_t return_type;
  fl_type_info_t *param_types;
  int param_count;
  int max_params;
  int is_variadic;
} fl_function_sig_t;

/* ===== Field Information ===== */

typedef struct {
  const char *name;
  fl_type_info_t type;
  size_t offset;        /* Offset in struct */
} fl_field_info_t;

/* ===== Struct Definition ===== */

typedef struct {
  const char *name;
  fl_field_info_t *fields;
  int field_count;
  int max_fields;
  size_t size;          /* Total size */
} fl_struct_info_t;

/* ===== Type Registry ===== */

typedef struct {
  fl_type_info_t *types;
  int type_count;
  int type_capacity;

  fl_function_sig_t *functions;
  int function_count;
  int function_capacity;

  fl_struct_info_t *structs;
  int struct_count;
  int struct_capacity;

  pthread_mutex_t registry_mutex;
} fl_type_registry_t;

/* ===== Public API ===== */

/* Registry creation */
fl_type_registry_t* fl_reflect_registry_create(void);
void fl_reflect_registry_destroy(fl_type_registry_t *registry);

/* Type registration */
int fl_reflect_register_type(fl_type_registry_t *registry, const char *name,
                             fl_type_kind_t kind, size_t size);
int fl_reflect_register_function(fl_type_registry_t *registry, const char *name,
                                 fl_type_info_t return_type);
int fl_reflect_add_param(fl_type_registry_t *registry, const char *function_name,
                         fl_type_info_t param_type);
int fl_reflect_register_struct(fl_type_registry_t *registry, const char *name);
int fl_reflect_struct_add_field(fl_type_registry_t *registry, const char *struct_name,
                                const char *field_name, fl_type_info_t type, size_t offset);

/* Type queries */
fl_type_info_t* fl_reflect_get_type(fl_type_registry_t *registry, const char *name);
int fl_reflect_has_type(fl_type_registry_t *registry, const char *name);
int fl_reflect_type_size(fl_type_registry_t *registry, const char *name);

/* Function queries */
fl_function_sig_t* fl_reflect_get_function(fl_type_registry_t *registry, const char *name);
int fl_reflect_has_function(fl_type_registry_t *registry, const char *name);
int fl_reflect_function_param_count(fl_type_registry_t *registry, const char *name);
fl_type_info_t fl_reflect_function_return_type(fl_type_registry_t *registry, const char *name);
fl_type_info_t* fl_reflect_function_params(fl_type_registry_t *registry, const char *name, int *count);

/* Struct queries */
fl_struct_info_t* fl_reflect_get_struct(fl_type_registry_t *registry, const char *name);
int fl_reflect_has_struct(fl_type_registry_t *registry, const char *name);
int fl_reflect_struct_field_count(fl_type_registry_t *registry, const char *name);
fl_field_info_t* fl_reflect_struct_get_field(fl_type_registry_t *registry,
                                             const char *struct_name, const char *field_name);

/* Introspection */
typedef void (*fl_reflect_callback_t)(const char *name, fl_type_info_t type, void *userdata);
void fl_reflect_list_types(fl_type_registry_t *registry, fl_reflect_callback_t callback, void *userdata);
void fl_reflect_list_functions(fl_type_registry_t *registry, fl_reflect_callback_t callback, void *userdata);

/* Dynamic type conversion */
int fl_reflect_can_convert(fl_type_info_t from, fl_type_info_t to);
void* fl_reflect_convert(const void *value, fl_type_info_t from, fl_type_info_t to);

/* Statistics */
typedef struct {
  int total_types;
  int total_functions;
  int total_structs;
  int total_fields;
} fl_reflect_stats_t;

fl_reflect_stats_t fl_reflect_get_stats(fl_type_registry_t *registry);

#endif /* FREELANG_STDLIB_REFLECT_H */
