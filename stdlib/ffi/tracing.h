/**
 * FreeLang Distributed Tracing (Phase 22)
 * Request tracing for observability across services
 */

#ifndef FREELANG_TRACING_H
#define FREELANG_TRACING_H

#include <pthread.h>
#include <time.h>

/* ===== Trace Types ===== */

typedef enum {
  SPAN_KIND_INTERNAL = 0,              /* Internal operation */
  SPAN_KIND_SERVER = 1,                /* Server-side (receiver) */
  SPAN_KIND_CLIENT = 2,                /* Client-side (sender) */
  SPAN_KIND_PRODUCER = 3,              /* Producer (publish) */
  SPAN_KIND_CONSUMER = 4               /* Consumer (subscribe) */
} fl_span_kind_t;

/* ===== Trace Context ===== */

typedef struct {
  char trace_id[33];                   /* Unique trace identifier (16 bytes) */
  char span_id[17];                    /* Unique span identifier (8 bytes) */
  char parent_span_id[17];             /* Parent span ID */
  int trace_flags;                     /* Sampled flag */
  int baggage_items;                   /* Baggage count */
} fl_trace_context_t;

/* ===== Span Attribute ===== */

typedef struct {
  char key[128];
  char value[256];
} fl_span_attribute_t;

/* ===== Span Event (Log within span) ===== */

typedef struct {
  char name[256];
  int64_t timestamp;
  fl_span_attribute_t attributes[16];
  int attribute_count;
} fl_span_event_t;

/* ===== Span ===== */

typedef struct {
  fl_trace_context_t context;

  char operation_name[256];
  fl_span_kind_t kind;

  int64_t start_time;                  /* Microseconds */
  int64_t end_time;

  int status;                          /* 0=OK, 1=ERROR */
  char error_message[512];

  fl_span_attribute_t attributes[32];
  int attribute_count;

  fl_span_event_t events[16];
  int event_count;

  int64_t duration_us;                 /* Duration in microseconds */
} fl_span_t;

/* ===== Tracer ===== */

typedef struct {
  fl_span_t active_span;               /* Currently active span */
  int span_stack[128];                 /* Span ID stack for nested spans */
  int span_depth;

  int total_spans;                     /* Lifetime spans */
  int total_events;                    /* Total events */

  char service_name[256];              /* Service identifier */

  pthread_mutex_t tracer_mutex;        /* Thread-safe access */
} fl_tracer_t;

/* ===== Statistics ===== */

typedef struct {
  int total_spans;                     /* Total created spans */
  int successful_spans;                /* Spans with OK status */
  int error_spans;                     /* Spans with ERROR status */
  double average_span_duration_ms;     /* Avg duration */
  double p99_latency_ms;               /* 99th percentile latency */
} fl_tracing_stats_t;

/* ===== Public API: Tracer Management ===== */

/* Create tracer instance */
fl_tracer_t* freelang_tracer_create(const char *service_name);

/* Destroy tracer */
void freelang_tracer_destroy(fl_tracer_t *tracer);

/* ===== Public API: Trace Context ===== */

/* Create new trace context */
fl_trace_context_t* freelang_trace_context_create(void);

/* Extract trace context from headers */
fl_trace_context_t* freelang_trace_context_extract(const char *trace_header);

/* Inject trace context into headers */
char* freelang_trace_context_inject(fl_trace_context_t *context);

/* ===== Public API: Span Operations ===== */

/* Start new span */
fl_span_t* freelang_span_start(fl_tracer_t *tracer, const char *operation_name,
                                fl_span_kind_t kind);

/* Start span with parent context */
fl_span_t* freelang_span_start_with_context(fl_tracer_t *tracer,
                                             const char *operation_name,
                                             fl_span_kind_t kind,
                                             fl_trace_context_t *parent_context);

/* End current span */
void freelang_span_end(fl_tracer_t *tracer);

/* Set span status */
void freelang_span_set_status(fl_span_t *span, int status, const char *error_msg);

/* Add attribute to span */
void freelang_span_add_attribute(fl_span_t *span, const char *key,
                                  const char *value);

/* Add event to span */
void freelang_span_add_event(fl_span_t *span, const char *event_name);

/* Get active span */
fl_span_t* freelang_tracer_get_active_span(fl_tracer_t *tracer);

/* Get span duration */
int64_t freelang_span_get_duration_us(fl_span_t *span);

/* ===== Public API: Statistics & Export ===== */

/* Get tracing statistics */
fl_tracing_stats_t freelang_tracing_get_stats(fl_tracer_t *tracer);

/* Export span in Jaeger format */
char* freelang_span_export_jaeger(fl_span_t *span);

/* Export span in OpenTelemetry format */
char* freelang_span_export_otel(fl_span_t *span);

/* Reset statistics */
void freelang_tracing_reset_stats(fl_tracer_t *tracer);

/* ===== Helper Functions ===== */

/* Generate random trace ID */
void _tracing_generate_trace_id(char *trace_id);

/* Generate random span ID */
void _tracing_generate_span_id(char *span_id);

#endif /* FREELANG_TRACING_H */
