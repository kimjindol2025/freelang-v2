/**
 * FreeLang FFI - Native Bindings Header
 * Exposes libuv and system functions to FreeLang
 */

#ifndef FREELANG_FFI_H
#define FREELANG_FFI_H

#include <uv.h>
#include <pthread.h>

/* ===== Type Definitions ===== */

#define MAX_HANDLES 1024
#define MAX_CALLBACKS 4096

/* Handle wrapper: Maps C handles to FreeLang callbacks */
typedef struct {
  void *uv_handle;        /* uv_timer_t*, uv_tcp_t*, etc */
  int callback_id;        /* Reference to FreeLang function */
  void *userdata;         /* Additional context */
  int handle_type;        /* HANDLE_TIMER, HANDLE_TCP, etc */
} fl_handle_wrapper_t;

/* Callback entry for deferred execution queue */
typedef struct callback_entry {
  int callback_id;
  void *args;
  struct callback_entry *next;
} callback_entry_t;

/* Event loop context */
typedef struct {
  uv_loop_t *uv_loop;
  pthread_mutex_t cb_mutex;
  callback_entry_t *cb_queue_head;
  callback_entry_t *cb_queue_tail;
  int running;
} fl_event_context_t;

/* ===== Handle Registry ===== */

/* Create and destroy handles */
int freelang_handle_create(void *uv_handle, int callback_id, int handle_type);
void freelang_handle_destroy(int handle_id);
fl_handle_wrapper_t* freelang_handle_get(int handle_id);

/* ===== Callback Queue ===== */

/* Enqueue callback for deferred execution */
void freelang_enqueue_callback(fl_event_context_t *ctx, int callback_id, void *args);

/* Process all pending callbacks */
void freelang_process_callbacks(fl_event_context_t *ctx);

/* ===== Timer API ===== */

/* Create, start, and stop timers */
int freelang_timer_create(fl_event_context_t *ctx);
int freelang_timer_start(fl_event_context_t *ctx, int timer_id, int timeout_ms, int callback_id, int repeat);
void freelang_timer_stop(int timer_id);
void freelang_timer_close(int timer_id);

/* ===== Event Context ===== */

/* Initialize and cleanup */
fl_event_context_t* freelang_event_context_create(void);
void freelang_event_context_destroy(fl_event_context_t *ctx);

/* Main event loop (integrate with existing event_loop.c) */
void freelang_event_loop_run(fl_event_context_t *ctx, int timeout_ms);
void freelang_event_loop_stop(fl_event_context_t *ctx);

/* ===== VM Callback Execution ===== */

/* Declare external VM function for callback execution */
extern void vm_execute_callback(int callback_id, void *args);

/* ===== Dynamic Library Loading (dlopen/dlsym) ===== */

/* Load a shared library */
void* freelang_load_library(const char *path);

/* Get function pointer from loaded library */
void* freelang_get_function(void *lib_handle, const char *func_name);

/* Unload library */
void freelang_unload_library(void *lib_handle);

/* Get last error message from dlopen */
const char* freelang_ffi_get_error(void);

/* ===== FFI Function Call (C ↔ FreeLang) ===== */

typedef void (*fl_native_fn_t)(void);

/* Call native function with arbitrary arguments */
int freelang_call_native(const char *lib_path, const char *func_name, void *args);

#endif /* FREELANG_FFI_H */
