/**
 * FreeLang stdlib/tracing - Distributed Tracing
 * OpenTelemetry-compatible span and trace management
 */
#ifndef FREELANG_STDLIB_TRACING_H
#define FREELANG_STDLIB_TRACING_H

#include <stdint.h>
#include <stddef.h>
#include <time.h>

typedef enum {
  FL_SPAN_INTERNAL = 0,
  FL_SPAN_SERVER = 1,
  FL_SPAN_CLIENT = 2,
  FL_SPAN_PRODUCER = 3,
  FL_SPAN_CONSUMER = 4
} fl_span_kind_t;

typedef enum {
  FL_SPAN_UNSET = 0,
  FL_SPAN_OK = 1,
  FL_SPAN_ERROR = 2
} fl_span_status_t;

typedef struct fl_tracer_t fl_tracer_t;
typedef struct fl_span_t fl_span_t;

typedef struct {
  const char *key;
  const char *string_value;
  int64_t int_value;
  double float_value;
  int is_string;
} fl_span_attribute_t;

typedef struct {
  uint64_t spans_created;
  uint64_t spans_finished;
  uint64_t traces_sampled;
  uint64_t traces_exported;
  uint64_t export_errors;
} fl_tracing_stats_t;

/* Tracer */
fl_tracer_t* fl_tracer_create(const char *service_name);
void fl_tracer_destroy(fl_tracer_t *tracer);

/* Span Creation & Management */
fl_span_t* fl_span_start(fl_tracer_t *tracer, const char *span_name, fl_span_kind_t span_kind);
int fl_span_finish(fl_span_t *span);
int fl_span_set_status(fl_span_t *span, fl_span_status_t status, const char *description);

/* Span Attributes */
int fl_span_add_attribute_string(fl_span_t *span, const char *key, const char *value);
int fl_span_add_attribute_int(fl_span_t *span, const char *key, int64_t value);
int fl_span_add_attribute_float(fl_span_t *span, const char *key, double value);

/* Span Events */
int fl_span_add_event(fl_span_t *span, const char *event_name);
int fl_span_add_event_with_timestamp(fl_span_t *span, const char *event_name, int64_t timestamp_ns);

/* Span Links */
int fl_span_add_link(fl_span_t *span, const char *trace_id, const char *span_id);

/* Span Context & Propagation */
char* fl_span_get_trace_id(fl_span_t *span);
char* fl_span_get_span_id(fl_span_t *span);
int fl_span_is_recording(fl_span_t *span);

/* Context Propagation */
char* fl_trace_inject_context(fl_span_t *span);
fl_span_t* fl_trace_extract_context(fl_tracer_t *tracer, const char *context);

/* Export */
int fl_tracer_export_jaeger(fl_tracer_t *tracer, const char *jaeger_endpoint);
int fl_tracer_export_otlp(fl_tracer_t *tracer, const char *otlp_endpoint);

/* Statistics */
fl_tracing_stats_t* fl_tracing_get_stats(void);
void fl_tracing_reset_stats(void);

/* Cleanup */
void fl_span_destroy(fl_span_t *span);

#endif
