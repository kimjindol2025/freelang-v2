/**
 * FreeLang FFI Implementation
 * Native bindings for libuv and system functions
 */

#include "freelang_ffi.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

/* ===== Global State ===== */

static fl_handle_wrapper_t *global_handles[MAX_HANDLES];
static int global_handle_count = 0;
static pthread_mutex_t handle_registry_mutex = PTHREAD_MUTEX_INITIALIZER;

/* ===== Handle Registry Implementation ===== */

int freelang_handle_create(void *uv_handle, int callback_id, int handle_type) {
  if (global_handle_count >= MAX_HANDLES) {
    return -1;  /* Registry full */
  }

  fl_handle_wrapper_t *wrapper = (fl_handle_wrapper_t*)malloc(sizeof(fl_handle_wrapper_t));
  if (!wrapper) return -1;

  wrapper->uv_handle = uv_handle;
  wrapper->callback_id = callback_id;
  wrapper->handle_type = handle_type;
  wrapper->userdata = NULL;

  pthread_mutex_lock(&handle_registry_mutex);
  int handle_id = global_handle_count;
  global_handles[global_handle_count++] = wrapper;
  pthread_mutex_unlock(&handle_registry_mutex);

  return handle_id;
}

void freelang_handle_destroy(int handle_id) {
  if (handle_id < 0 || handle_id >= global_handle_count) return;

  pthread_mutex_lock(&handle_registry_mutex);
  if (global_handles[handle_id]) {
    free(global_handles[handle_id]);
    global_handles[handle_id] = NULL;
  }
  pthread_mutex_unlock(&handle_registry_mutex);
}

fl_handle_wrapper_t* freelang_handle_get(int handle_id) {
  if (handle_id < 0 || handle_id >= global_handle_count) return NULL;
  return global_handles[handle_id];
}

/* ===== Callback Queue Implementation ===== */

void freelang_enqueue_callback(fl_event_context_t *ctx, int callback_id, void *args) {
  if (!ctx) return;

  callback_entry_t *entry = (callback_entry_t*)malloc(sizeof(callback_entry_t));
  if (!entry) return;

  entry->callback_id = callback_id;
  entry->args = args;
  entry->next = NULL;

  pthread_mutex_lock(&ctx->cb_mutex);
  if (ctx->cb_queue_tail) {
    ctx->cb_queue_tail->next = entry;
  } else {
    ctx->cb_queue_head = entry;
  }
  ctx->cb_queue_tail = entry;
  pthread_mutex_unlock(&ctx->cb_mutex);
}

void freelang_process_callbacks(fl_event_context_t *ctx) {
  if (!ctx) return;

  pthread_mutex_lock(&ctx->cb_mutex);
  while (ctx->cb_queue_head) {
    callback_entry_t *entry = ctx->cb_queue_head;
    ctx->cb_queue_head = entry->next;
    if (!ctx->cb_queue_head) {
      ctx->cb_queue_tail = NULL;
    }
    pthread_mutex_unlock(&ctx->cb_mutex);

    /* Execute callback in VM context */
    vm_execute_callback(entry->callback_id, entry->args);
    free(entry);

    pthread_mutex_lock(&ctx->cb_mutex);
  }
  pthread_mutex_unlock(&ctx->cb_mutex);
}

/* ===== Timer Implementation ===== */

#define HANDLE_TIMER 1
#define HANDLE_TCP 2

typedef struct {
  uv_timer_t handle;
  int wrapper_id;
  fl_event_context_t *ctx;
} fl_timer_internal_t;

/* Timer callback: enqueues callback for deferred execution */
static void timer_callback_wrapper(uv_timer_t *handle) {
  fl_timer_internal_t *timer = (fl_timer_internal_t*)handle->data;
  if (!timer || !timer->ctx) return;

  fl_handle_wrapper_t *wrapper = freelang_handle_get(timer->wrapper_id);
  if (!wrapper) return;

  freelang_enqueue_callback(timer->ctx, wrapper->callback_id, NULL);
}

int freelang_timer_create(fl_event_context_t *ctx) {
  if (!ctx || !ctx->uv_loop) return -1;

  fl_timer_internal_t *timer = (fl_timer_internal_t*)malloc(sizeof(fl_timer_internal_t));
  if (!timer) return -1;

  int ret = uv_timer_init(ctx->uv_loop, &timer->handle);
  if (ret) {
    free(timer);
    return -1;
  }

  timer->ctx = ctx;
  timer->wrapper_id = -1;  /* Will be set by freelang_timer_start */

  /* Store timer pointer for later reference */
  timer->handle.data = timer;

  return (int)(intptr_t)timer;
}

int freelang_timer_start(fl_event_context_t *ctx, int timer_handle, int timeout_ms,
                         int callback_id, int repeat) {
  if (!ctx) return -1;

  fl_timer_internal_t *timer = (fl_timer_internal_t*)timer_handle;
  if (!timer) return -1;

  /* Create handle wrapper for this timer */
  int wrapper_id = freelang_handle_create(&timer->handle, callback_id, HANDLE_TIMER);
  if (wrapper_id < 0) return -1;

  timer->wrapper_id = wrapper_id;

  /* Start timer */
  int ret = uv_timer_start(&timer->handle, timer_callback_wrapper, timeout_ms,
                           repeat ? timeout_ms : 0);
  if (ret) {
    freelang_handle_destroy(wrapper_id);
    return -1;
  }

  return 0;
}

void freelang_timer_stop(int timer_handle) {
  fl_timer_internal_t *timer = (fl_timer_internal_t*)timer_handle;
  if (!timer) return;

  uv_timer_stop(&timer->handle);
}

void freelang_timer_close(int timer_handle) {
  fl_timer_internal_t *timer = (fl_timer_internal_t*)timer_handle;
  if (!timer) return;

  uv_close((uv_handle_t*)&timer->handle, NULL);

  /* Cleanup wrapper if exists */
  if (timer->wrapper_id >= 0) {
    freelang_handle_destroy(timer->wrapper_id);
  }

  free(timer);
}

/* ===== Event Context Management ===== */

fl_event_context_t* freelang_event_context_create(void) {
  fl_event_context_t *ctx = (fl_event_context_t*)malloc(sizeof(fl_event_context_t));
  if (!ctx) return NULL;

  ctx->uv_loop = uv_default_loop();
  if (!ctx->uv_loop) {
    free(ctx);
    return NULL;
  }

  pthread_mutex_init(&ctx->cb_mutex, NULL);
  ctx->cb_queue_head = NULL;
  ctx->cb_queue_tail = NULL;
  ctx->running = 1;

  return ctx;
}

void freelang_event_context_destroy(fl_event_context_t *ctx) {
  if (!ctx) return;

  /* Cleanup pending callbacks */
  freelang_process_callbacks(ctx);

  pthread_mutex_destroy(&ctx->cb_mutex);
  free(ctx);
}

/* ===== Event Loop Integration ===== */

void freelang_event_loop_run(fl_event_context_t *ctx, int timeout_ms) {
  if (!ctx) return;

  /* Run libuv with non-blocking mode */
  uv_run(ctx->uv_loop, UV_RUN_NOWAIT);

  /* Process any pending FreeLang callbacks */
  freelang_process_callbacks(ctx);
}

void freelang_event_loop_stop(fl_event_context_t *ctx) {
  if (!ctx) return;
  ctx->running = 0;
}

/* ===== Stub for VM callback execution (to be linked from vm.ts) ===== */

/* This function is implemented in vm.ts and exported via Node.js addon */
void vm_execute_callback(int callback_id, void *args) {
  /* Stub: Will be replaced by actual VM implementation */
  fprintf(stderr, "[FFI] Callback %d executed (stub)\n", callback_id);
}

/* ===== Dynamic Library Loading (dlopen/dlsym) ===== */

#include <dlfcn.h>

/* Keep track of loaded libraries */
typedef struct {
  void *handle;
  char path[256];
  int usage_count;
} fl_library_entry_t;

static fl_library_entry_t *loaded_libs[256];
static int loaded_libs_count = 0;
static pthread_mutex_t libs_mutex = PTHREAD_MUTEX_INITIALIZER;

/* Load a shared library */
void* freelang_load_library(const char *path) {
  if (!path) return NULL;

  /* Check if already loaded */
  pthread_mutex_lock(&libs_mutex);
  for (int i = 0; i < loaded_libs_count; i++) {
    if (strcmp(loaded_libs[i]->path, path) == 0) {
      loaded_libs[i]->usage_count++;
      void *handle = loaded_libs[i]->handle;
      pthread_mutex_unlock(&libs_mutex);
      return handle;
    }
  }

  /* Load new library */
  void *handle = dlopen(path, RTLD_LAZY);
  if (!handle) {
    pthread_mutex_unlock(&libs_mutex);
    fprintf(stderr, "[FFI] dlopen failed for %s: %s\n", path, dlerror());
    return NULL;
  }

  /* Add to registry */
  if (loaded_libs_count < 256) {
    fl_library_entry_t *entry = (fl_library_entry_t*)malloc(sizeof(fl_library_entry_t));
    entry->handle = handle;
    strncpy(entry->path, path, 255);
    entry->usage_count = 1;
    loaded_libs[loaded_libs_count++] = entry;
  }

  pthread_mutex_unlock(&libs_mutex);
  fprintf(stderr, "[FFI] Library loaded: %s (%p)\n", path, handle);
  return handle;
}

/* Get function pointer from loaded library */
void* freelang_get_function(void *lib_handle, const char *func_name) {
  if (!lib_handle || !func_name) return NULL;

  void *func_ptr = dlsym(lib_handle, func_name);
  if (!func_ptr) {
    fprintf(stderr, "[FFI] dlsym failed for %s: %s\n", func_name, dlerror());
    return NULL;
  }

  fprintf(stderr, "[FFI] Function resolved: %s (%p)\n", func_name, func_ptr);
  return func_ptr;
}

/* Unload library */
void freelang_unload_library(void *lib_handle) {
  if (!lib_handle) return;

  pthread_mutex_lock(&libs_mutex);
  for (int i = 0; i < loaded_libs_count; i++) {
    if (loaded_libs[i]->handle == lib_handle) {
      loaded_libs[i]->usage_count--;
      if (loaded_libs[i]->usage_count <= 0) {
        dlclose(lib_handle);
        free(loaded_libs[i]);
        /* Remove from array */
        for (int j = i; j < loaded_libs_count - 1; j++) {
          loaded_libs[j] = loaded_libs[j + 1];
        }
        loaded_libs_count--;
        fprintf(stderr, "[FFI] Library unloaded (%p)\n", lib_handle);
      }
      pthread_mutex_unlock(&libs_mutex);
      return;
    }
  }
  pthread_mutex_unlock(&libs_mutex);
}

/* Get last error message from dlopen */
const char* freelang_ffi_get_error(void) {
  return dlerror();
}

/* Call native function with arbitrary arguments */
int freelang_call_native(const char *lib_path, const char *func_name, void *args) {
  /* Load library */
  void *lib_handle = freelang_load_library(lib_path);
  if (!lib_handle) return -1;

  /* Get function pointer */
  fl_native_fn_t fn = (fl_native_fn_t)freelang_get_function(lib_handle, func_name);
  if (!fn) return -1;

  /* Call function (simplified - real implementation needs argument marshalling) */
  fn();

  return 0;
}
