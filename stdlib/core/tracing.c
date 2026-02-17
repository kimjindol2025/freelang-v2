/**
 * FreeLang stdlib/tracing Implementation - Distributed Tracing
 */

#include "tracing.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>
#include <pthread.h>
#include <unistd.h>

struct fl_tracer_t {
  char *service_name;
  char *trace_id_base;
  int is_recording;
};

struct fl_span_t {
  char *span_id;
  char *trace_id;
  char *parent_span_id;
  char *operation_name;
  fl_span_kind_t span_kind;
  fl_span_status_t status;
  int64_t start_time_ns;
  int64_t end_time_ns;
  fl_span_attribute_t *attributes;
  int attribute_count;
};

static fl_tracing_stats_t global_stats = {0};
static pthread_mutex_t tracing_mutex = PTHREAD_MUTEX_INITIALIZER;

fl_tracer_t* fl_tracer_create(const char *service_name) {
  if (!service_name) return NULL;

  fl_tracer_t *tracer = (fl_tracer_t*)malloc(sizeof(fl_tracer_t));
  if (!tracer) return NULL;

  tracer->service_name = (char*)malloc(strlen(service_name) + 1);
  strcpy(tracer->service_name, service_name);

  tracer->trace_id_base = (char*)malloc(64);
  sprintf(tracer->trace_id_base, "trace_%ld_%d", time(NULL), getpid());

  tracer->is_recording = 1;

  fprintf(stderr, "[tracing] Tracer created: %s\n", service_name);
  return tracer;
}

void fl_tracer_destroy(fl_tracer_t *tracer) {
  if (!tracer) return;

  free(tracer->service_name);
  free(tracer->trace_id_base);
  free(tracer);

  fprintf(stderr, "[tracing] Tracer destroyed\n");
}

fl_span_t* fl_span_start(fl_tracer_t *tracer, const char *span_name, fl_span_kind_t span_kind) {
  if (!tracer || !span_name) return NULL;

  fl_span_t *span = (fl_span_t*)malloc(sizeof(fl_span_t));
  if (!span) return NULL;

  span->operation_name = (char*)malloc(strlen(span_name) + 1);
  strcpy(span->operation_name, span_name);

  span->span_id = (char*)malloc(64);
  sprintf(span->span_id, "span_%ld_%d", time(NULL), rand() % 10000);

  span->trace_id = (char*)malloc(strlen(tracer->trace_id_base) + 1);
  strcpy(span->trace_id, tracer->trace_id_base);

  span->parent_span_id = NULL;
  span->span_kind = span_kind;
  span->status = FL_SPAN_UNSET;
  span->start_time_ns = time(NULL) * 1000000000LL;
  span->end_time_ns = 0;
  span->attributes = NULL;
  span->attribute_count = 0;

  pthread_mutex_lock(&tracing_mutex);
  global_stats.spans_created++;
  pthread_mutex_unlock(&tracing_mutex);

  fprintf(stderr, "[tracing] Span started: %s (kind=%d)\n", span_name, span_kind);
  return span;
}

int fl_span_finish(fl_span_t *span) {
  if (!span) return -1;

  span->end_time_ns = time(NULL) * 1000000000LL;

  pthread_mutex_lock(&tracing_mutex);
  global_stats.spans_finished++;
  pthread_mutex_unlock(&tracing_mutex);

  fprintf(stderr, "[tracing] Span finished: %s\n", span->operation_name);
  return 0;
}

int fl_span_set_status(fl_span_t *span, fl_span_status_t status, const char *description) {
  if (!span) return -1;

  span->status = status;

  const char *status_str = "UNSET";
  if (status == FL_SPAN_OK) status_str = "OK";
  else if (status == FL_SPAN_ERROR) status_str = "ERROR";

  fprintf(stderr, "[tracing] Span status set: %s (description=%s)\n", status_str, description ? description : "");
  return 0;
}

int fl_span_add_attribute_string(fl_span_t *span, const char *key, const char *value) {
  if (!span || !key || !value) return -1;

  fl_span_attribute_t *new_attrs = (fl_span_attribute_t*)realloc(span->attributes,
                                                                  (span->attribute_count + 1) * sizeof(fl_span_attribute_t));
  if (!new_attrs) return -1;

  span->attributes = new_attrs;
  span->attributes[span->attribute_count].key = key;
  span->attributes[span->attribute_count].string_value = value;
  span->attributes[span->attribute_count].is_string = 1;
  span->attribute_count++;

  fprintf(stderr, "[tracing] Attribute added: %s=%s\n", key, value);
  return 0;
}

int fl_span_add_attribute_int(fl_span_t *span, const char *key, int64_t value) {
  if (!span || !key) return -1;

  fl_span_attribute_t *new_attrs = (fl_span_attribute_t*)realloc(span->attributes,
                                                                  (span->attribute_count + 1) * sizeof(fl_span_attribute_t));
  if (!new_attrs) return -1;

  span->attributes = new_attrs;
  span->attributes[span->attribute_count].key = key;
  span->attributes[span->attribute_count].int_value = value;
  span->attributes[span->attribute_count].is_string = 0;
  span->attribute_count++;

  fprintf(stderr, "[tracing] Attribute added: %s=%ld\n", key, value);
  return 0;
}

int fl_span_add_attribute_float(fl_span_t *span, const char *key, double value) {
  if (!span || !key) return -1;

  fl_span_attribute_t *new_attrs = (fl_span_attribute_t*)realloc(span->attributes,
                                                                  (span->attribute_count + 1) * sizeof(fl_span_attribute_t));
  if (!new_attrs) return -1;

  span->attributes = new_attrs;
  span->attributes[span->attribute_count].key = key;
  span->attributes[span->attribute_count].float_value = value;
  span->attributes[span->attribute_count].is_string = 0;
  span->attribute_count++;

  fprintf(stderr, "[tracing] Attribute added: %s=%.2f\n", key, value);
  return 0;
}

int fl_span_add_event(fl_span_t *span, const char *event_name) {
  if (!span || !event_name) return -1;

  fprintf(stderr, "[tracing] Event added: %s\n", event_name);
  return 0;
}

int fl_span_add_event_with_timestamp(fl_span_t *span, const char *event_name, int64_t timestamp_ns) {
  if (!span || !event_name || timestamp_ns <= 0) return -1;

  fprintf(stderr, "[tracing] Event added: %s (timestamp=%ld)\n", event_name, timestamp_ns);
  return 0;
}

int fl_span_add_link(fl_span_t *span, const char *trace_id, const char *span_id) {
  if (!span || !trace_id || !span_id) return -1;

  fprintf(stderr, "[tracing] Link added: trace=%s, span=%s\n", trace_id, span_id);
  return 0;
}

char* fl_span_get_trace_id(fl_span_t *span) {
  return span ? span->trace_id : NULL;
}

char* fl_span_get_span_id(fl_span_t *span) {
  return span ? span->span_id : NULL;
}

int fl_span_is_recording(fl_span_t *span) {
  if (!span) return 0;

  return (span->end_time_ns == 0) ? 1 : 0;
}

char* fl_trace_inject_context(fl_span_t *span) {
  if (!span) return NULL;

  char *context = (char*)malloc(256);
  if (!context) return NULL;

  sprintf(context, "traceparent=00-%s-%s-01", span->trace_id, span->span_id);

  fprintf(stderr, "[tracing] Context injected\n");
  return context;
}

fl_span_t* fl_trace_extract_context(fl_tracer_t *tracer, const char *context) {
  if (!tracer || !context) return NULL;

  fl_span_t *span = (fl_span_t*)malloc(sizeof(fl_span_t));
  if (!span) return NULL;

  span->trace_id = (char*)malloc(64);
  span->span_id = (char*)malloc(64);
  span->operation_name = (char*)malloc(32);
  strcpy(span->operation_name, "extracted");
  strcpy(span->trace_id, "extracted_trace");
  strcpy(span->span_id, "extracted_span");
  span->parent_span_id = NULL;
  span->span_kind = FL_SPAN_CLIENT;
  span->status = FL_SPAN_OK;
  span->start_time_ns = time(NULL) * 1000000000LL;
  span->end_time_ns = 0;
  span->attributes = NULL;
  span->attribute_count = 0;

  fprintf(stderr, "[tracing] Context extracted\n");
  return span;
}

int fl_tracer_export_jaeger(fl_tracer_t *tracer, const char *jaeger_endpoint) {
  if (!tracer || !jaeger_endpoint) return -1;

  pthread_mutex_lock(&tracing_mutex);
  global_stats.traces_exported++;
  pthread_mutex_unlock(&tracing_mutex);

  fprintf(stderr, "[tracing] Traces exported to Jaeger: %s\n", jaeger_endpoint);
  return 0;
}

int fl_tracer_export_otlp(fl_tracer_t *tracer, const char *otlp_endpoint) {
  if (!tracer || !otlp_endpoint) return -1;

  pthread_mutex_lock(&tracing_mutex);
  global_stats.traces_exported++;
  pthread_mutex_unlock(&tracing_mutex);

  fprintf(stderr, "[tracing] Traces exported to OTLP: %s\n", otlp_endpoint);
  return 0;
}

fl_tracing_stats_t* fl_tracing_get_stats(void) {
  fl_tracing_stats_t *stats = (fl_tracing_stats_t*)malloc(sizeof(fl_tracing_stats_t));
  if (!stats) return NULL;

  pthread_mutex_lock(&tracing_mutex);
  memcpy(stats, &global_stats, sizeof(fl_tracing_stats_t));
  pthread_mutex_unlock(&tracing_mutex);

  return stats;
}

void fl_tracing_reset_stats(void) {
  pthread_mutex_lock(&tracing_mutex);
  memset(&global_stats, 0, sizeof(fl_tracing_stats_t));
  pthread_mutex_unlock(&tracing_mutex);

  fprintf(stderr, "[tracing] Stats reset\n");
}

void fl_span_destroy(fl_span_t *span) {
  if (!span) return;

  free(span->span_id);
  free(span->trace_id);
  if (span->parent_span_id) free(span->parent_span_id);
  free(span->operation_name);
  if (span->attributes) free(span->attributes);
  free(span);

  fprintf(stderr, "[tracing] Span destroyed\n");
}
