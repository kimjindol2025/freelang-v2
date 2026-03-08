/**
 * FreeLang Distributed Tracing Implementation (Phase 22)
 * Request tracing for distributed systems observability
 */

#include "tracing.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>

/* ===== Random ID Generation ===== */

void _tracing_generate_trace_id(char *trace_id) {
  if (!trace_id) return;

  /* Generate 32-character hex string (16 bytes) */
  srand(time(NULL));
  for (int i = 0; i < 32; i++) {
    sprintf(trace_id + i, "%x", rand() % 16);
  }
  trace_id[32] = '\0';
}

void _tracing_generate_span_id(char *span_id) {
  if (!span_id) return;

  /* Generate 16-character hex string (8 bytes) */
  srand(time(NULL));
  for (int i = 0; i < 16; i++) {
    sprintf(span_id + i, "%x", rand() % 16);
  }
  span_id[16] = '\0';
}

/* ===== Tracer Creation ===== */

fl_tracer_t* freelang_tracer_create(const char *service_name) {
  fl_tracer_t *tracer = (fl_tracer_t*)malloc(sizeof(fl_tracer_t));
  if (!tracer) return NULL;

  memset(tracer, 0, sizeof(fl_tracer_t));
  pthread_mutex_init(&tracer->tracer_mutex, NULL);

  if (service_name) {
    strncpy(tracer->service_name, service_name, sizeof(tracer->service_name) - 1);
  }

  fprintf(stderr, "[Tracing] Tracer created for service: %s\n",
          service_name ? service_name : "unknown");

  return tracer;
}

void freelang_tracer_destroy(fl_tracer_t *tracer) {
  if (!tracer) return;

  pthread_mutex_destroy(&tracer->tracer_mutex);
  free(tracer);

  fprintf(stderr, "[Tracing] Tracer destroyed\n");
}

/* ===== Trace Context ===== */

fl_trace_context_t* freelang_trace_context_create(void) {
  fl_trace_context_t *context = (fl_trace_context_t*)malloc(sizeof(fl_trace_context_t));
  if (!context) return NULL;

  memset(context, 0, sizeof(fl_trace_context_t));

  _tracing_generate_trace_id(context->trace_id);
  _tracing_generate_span_id(context->span_id);
  context->trace_flags = 1;  /* Sampled */

  fprintf(stderr, "[Tracing] Trace context created: %s\n", context->trace_id);

  return context;
}

fl_trace_context_t* freelang_trace_context_extract(const char *trace_header) {
  if (!trace_header) return NULL;

  fl_trace_context_t *context = (fl_trace_context_t*)malloc(sizeof(fl_trace_context_t));
  if (!context) return NULL;

  memset(context, 0, sizeof(fl_trace_context_t));

  /* Parse W3C trace context format: traceparent: version-trace_id-parent_id-trace_flags */
  sscanf(trace_header, "%32s-%16s-%d", context->trace_id, context->span_id,
         &context->trace_flags);

  fprintf(stderr, "[Tracing] Trace context extracted: %s\n", context->trace_id);

  return context;
}

char* freelang_trace_context_inject(fl_trace_context_t *context) {
  if (!context) return NULL;

  char *header = (char*)malloc(256);
  if (!header) return NULL;

  /* W3C trace context format */
  snprintf(header, 256, "00-%s-%s-%02d", context->trace_id, context->span_id,
           context->trace_flags);

  return header;
}

/* ===== Span Operations ===== */

fl_span_t* freelang_span_start(fl_tracer_t *tracer, const char *operation_name,
                                fl_span_kind_t kind) {
  if (!tracer || !operation_name) return NULL;

  fl_trace_context_t *new_context = freelang_trace_context_create();
  if (!new_context) return NULL;

  return freelang_span_start_with_context(tracer, operation_name, kind, new_context);
}

fl_span_t* freelang_span_start_with_context(fl_tracer_t *tracer,
                                             const char *operation_name,
                                             fl_span_kind_t kind,
                                             fl_trace_context_t *parent_context) {
  if (!tracer || !operation_name) return NULL;

  pthread_mutex_lock(&tracer->tracer_mutex);

  fl_span_t *span = &tracer->active_span;
  memset(span, 0, sizeof(fl_span_t));

  strncpy(span->operation_name, operation_name, sizeof(span->operation_name) - 1);
  span->kind = kind;
  span->start_time = time(NULL) * 1000000;  /* Microseconds */

  if (parent_context) {
    span->context = *parent_context;
    strncpy(span->context.parent_span_id, parent_context->span_id,
            sizeof(span->context.parent_span_id) - 1);

    /* Generate new span ID for this span */
    _tracing_generate_span_id(span->context.span_id);
  } else {
    span->context = *freelang_trace_context_create();
  }

  tracer->total_spans++;

  fprintf(stderr, "[Tracing] Span started: %s (trace: %s)\n",
          operation_name, span->context.trace_id);

  pthread_mutex_unlock(&tracer->tracer_mutex);

  return span;
}

void freelang_span_end(fl_tracer_t *tracer) {
  if (!tracer) return;

  pthread_mutex_lock(&tracer->tracer_mutex);

  fl_span_t *span = &tracer->active_span;
  span->end_time = time(NULL) * 1000000;  /* Microseconds */
  span->duration_us = span->end_time - span->start_time;

  fprintf(stderr, "[Tracing] Span ended: %s (duration: %ld us)\n",
          span->operation_name, span->duration_us);

  pthread_mutex_unlock(&tracer->tracer_mutex);
}

void freelang_span_set_status(fl_span_t *span, int status, const char *error_msg) {
  if (!span) return;

  span->status = status;
  if (status != 0 && error_msg) {
    strncpy(span->error_message, error_msg, sizeof(span->error_message) - 1);

    fprintf(stderr, "[Tracing] Span error: %s\n", error_msg);
  }
}

void freelang_span_add_attribute(fl_span_t *span, const char *key,
                                  const char *value) {
  if (!span || !key || !value) return;

  if (span->attribute_count >= 32) {
    fprintf(stderr, "[Tracing] WARNING: Span attributes full\n");
    return;
  }

  fl_span_attribute_t *attr = &span->attributes[span->attribute_count];
  strncpy(attr->key, key, sizeof(attr->key) - 1);
  strncpy(attr->value, value, sizeof(attr->value) - 1);

  span->attribute_count++;

  fprintf(stderr, "[Tracing] Attribute added: %s=%s\n", key, value);
}

void freelang_span_add_event(fl_span_t *span, const char *event_name) {
  if (!span || !event_name) return;

  if (span->event_count >= 16) {
    fprintf(stderr, "[Tracing] WARNING: Span events full\n");
    return;
  }

  fl_span_event_t *event = &span->events[span->event_count];
  strncpy(event->name, event_name, sizeof(event->name) - 1);
  event->timestamp = time(NULL) * 1000000;  /* Microseconds */
  event->attribute_count = 0;

  span->event_count++;

  fprintf(stderr, "[Tracing] Event added: %s\n", event_name);
}

fl_span_t* freelang_tracer_get_active_span(fl_tracer_t *tracer) {
  if (!tracer) return NULL;

  pthread_mutex_lock(&tracer->tracer_mutex);
  fl_span_t *span = &tracer->active_span;
  pthread_mutex_unlock(&tracer->tracer_mutex);

  return span;
}

int64_t freelang_span_get_duration_us(fl_span_t *span) {
  if (!span) return 0;
  return span->duration_us;
}

/* ===== Statistics & Export ===== */

fl_tracing_stats_t freelang_tracing_get_stats(fl_tracer_t *tracer) {
  fl_tracing_stats_t stats = {0, 0, 0, 0.0, 0.0};

  if (!tracer) return stats;

  pthread_mutex_lock(&tracer->tracer_mutex);

  stats.total_spans = tracer->total_spans;

  if (tracer->active_span.status == 0) {
    stats.successful_spans++;
  } else {
    stats.error_spans++;
  }

  if (tracer->active_span.duration_us > 0) {
    stats.average_span_duration_ms = tracer->active_span.duration_us / 1000.0;
  }

  pthread_mutex_unlock(&tracer->tracer_mutex);

  return stats;
}

char* freelang_span_export_jaeger(fl_span_t *span) {
  if (!span) return NULL;

  char *output = (char*)malloc(4096);
  if (!output) return NULL;

  int offset = 0;

  offset += snprintf(output + offset, 4096 - offset,
                    "{\"traceID\":\"%s\",\"spanID\":\"%s\","
                    "\"operationName\":\"%s\",\"kind\":%d,"
                    "\"startTime\":%ld,\"duration\":%ld,\"status\":%d}",
                    span->context.trace_id, span->context.span_id,
                    span->operation_name, span->kind,
                    span->start_time, span->duration_us, span->status);

  return output;
}

char* freelang_span_export_otel(fl_span_t *span) {
  if (!span) return NULL;

  char *output = (char*)malloc(4096);
  if (!output) return NULL;

  int offset = 0;

  offset += snprintf(output + offset, 4096 - offset,
                    "{\"traceId\":\"%s\",\"spanId\":\"%s\","
                    "\"name\":\"%s\",\"kind\":%d,"
                    "\"startTimeUnixNano\":%ld,\"endTimeUnixNano\":%ld,"
                    "\"status\":{\"code\":%d}}",
                    span->context.trace_id, span->context.span_id,
                    span->operation_name, span->kind,
                    span->start_time, span->end_time, span->status);

  return output;
}

void freelang_tracing_reset_stats(fl_tracer_t *tracer) {
  if (!tracer) return;

  pthread_mutex_lock(&tracer->tracer_mutex);

  tracer->total_spans = 0;
  tracer->total_events = 0;

  fprintf(stderr, "[Tracing] Statistics reset\n");

  pthread_mutex_unlock(&tracer->tracer_mutex);
}
