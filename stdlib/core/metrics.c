/**
 * FreeLang stdlib/metrics Implementation - Prometheus-style Metrics
 */

#include "metrics.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>
#include <pthread.h>

struct fl_metric_t {
  fl_metric_type_t type;
  char *name;
  char *help;
  int64_t value;
  int64_t *histogram_buckets;
  int bucket_count;
  fl_metric_label_t *labels;
  int label_count;
};

static fl_metrics_stats_t global_stats = {0};
static pthread_mutex_t metrics_mutex = PTHREAD_MUTEX_INITIALIZER;

fl_metric_t* fl_metrics_new_registry(void) {
  fl_metric_t *registry = (fl_metric_t*)malloc(sizeof(fl_metric_t));
  if (!registry) return NULL;

  registry->name = (char*)malloc(64);
  strcpy(registry->name, "freelang_registry");
  registry->help = (char*)malloc(128);
  strcpy(registry->help, "FreeLang metrics registry");
  registry->value = 0;
  registry->histogram_buckets = NULL;
  registry->bucket_count = 0;
  registry->labels = NULL;
  registry->label_count = 0;

  fprintf(stderr, "[metrics] Registry created\n");
  return registry;
}

void fl_metrics_destroy_registry(fl_metric_t *registry) {
  if (!registry) return;

  free(registry->name);
  free(registry->help);

  if (registry->histogram_buckets) {
    free(registry->histogram_buckets);
  }

  if (registry->labels) {
    for (int i = 0; i < registry->label_count; i++) {
      free((void*)registry->labels[i].label_name);
      free((void*)registry->labels[i].label_value);
    }
    free(registry->labels);
  }

  free(registry);
  fprintf(stderr, "[metrics] Registry destroyed\n");
}

int fl_metrics_counter_create(fl_metric_t *registry, const char *name, const char *help) {
  if (!registry || !name || !help) return -1;

  registry->type = FL_METRIC_COUNTER;
  free(registry->name);
  registry->name = (char*)malloc(strlen(name) + 1);
  strcpy(registry->name, name);
  free(registry->help);
  registry->help = (char*)malloc(strlen(help) + 1);
  strcpy(registry->help, help);
  registry->value = 0;

  pthread_mutex_lock(&metrics_mutex);
  global_stats.metrics_registered++;
  pthread_mutex_unlock(&metrics_mutex);

  fprintf(stderr, "[metrics] Counter created: %s\n", name);
  return 0;
}

int fl_metrics_counter_inc(fl_metric_t *registry, const char *name, int64_t value) {
  if (!registry || !name || value < 0) return -1;

  registry->value += value;

  pthread_mutex_lock(&metrics_mutex);
  global_stats.metrics_updated++;
  pthread_mutex_unlock(&metrics_mutex);

  fprintf(stderr, "[metrics] Counter incremented: %s += %ld\n", name, value);
  return 0;
}

int fl_metrics_counter_get(fl_metric_t *registry, const char *name, int64_t *value_out) {
  if (!registry || !value_out) return -1;

  *value_out = registry->value;
  return 0;
}

int fl_metrics_gauge_create(fl_metric_t *registry, const char *name, const char *help) {
  if (!registry || !name || !help) return -1;

  registry->type = FL_METRIC_GAUGE;
  free(registry->name);
  registry->name = (char*)malloc(strlen(name) + 1);
  strcpy(registry->name, name);
  free(registry->help);
  registry->help = (char*)malloc(strlen(help) + 1);
  strcpy(registry->help, help);
  registry->value = 0;

  pthread_mutex_lock(&metrics_mutex);
  global_stats.metrics_registered++;
  pthread_mutex_unlock(&metrics_mutex);

  fprintf(stderr, "[metrics] Gauge created: %s\n", name);
  return 0;
}

int fl_metrics_gauge_set(fl_metric_t *registry, const char *name, int64_t value) {
  if (!registry) return -1;

  registry->value = value;

  pthread_mutex_lock(&metrics_mutex);
  global_stats.metrics_updated++;
  pthread_mutex_unlock(&metrics_mutex);

  fprintf(stderr, "[metrics] Gauge set: %s = %ld\n", name, value);
  return 0;
}

int fl_metrics_gauge_inc(fl_metric_t *registry, const char *name, int64_t delta) {
  if (!registry) return -1;

  registry->value += delta;

  pthread_mutex_lock(&metrics_mutex);
  global_stats.metrics_updated++;
  pthread_mutex_unlock(&metrics_mutex);

  fprintf(stderr, "[metrics] Gauge incremented: %s += %ld\n", name, delta);
  return 0;
}

int fl_metrics_gauge_dec(fl_metric_t *registry, const char *name, int64_t delta) {
  if (!registry) return -1;

  registry->value -= delta;

  pthread_mutex_lock(&metrics_mutex);
  global_stats.metrics_updated++;
  pthread_mutex_unlock(&metrics_mutex);

  fprintf(stderr, "[metrics] Gauge decremented: %s -= %ld\n", name, delta);
  return 0;
}

int fl_metrics_gauge_get(fl_metric_t *registry, const char *name, int64_t *value_out) {
  if (!registry || !value_out) return -1;

  *value_out = registry->value;
  return 0;
}

int fl_metrics_histogram_create(fl_metric_t *registry, const char *name, const char *help, const int64_t *buckets, int bucket_count) {
  if (!registry || !name || !help) return -1;

  registry->type = FL_METRIC_HISTOGRAM;
  free(registry->name);
  registry->name = (char*)malloc(strlen(name) + 1);
  strcpy(registry->name, name);
  free(registry->help);
  registry->help = (char*)malloc(strlen(help) + 1);
  strcpy(registry->help, help);

  if (buckets && bucket_count > 0) {
    registry->histogram_buckets = (int64_t*)malloc(sizeof(int64_t) * bucket_count);
    memcpy(registry->histogram_buckets, buckets, sizeof(int64_t) * bucket_count);
    registry->bucket_count = bucket_count;
  }

  pthread_mutex_lock(&metrics_mutex);
  global_stats.metrics_registered++;
  pthread_mutex_unlock(&metrics_mutex);

  fprintf(stderr, "[metrics] Histogram created: %s (%d buckets)\n", name, bucket_count);
  return 0;
}

int fl_metrics_histogram_observe(fl_metric_t *registry, const char *name, int64_t value) {
  if (!registry) return -1;

  registry->value += value;

  pthread_mutex_lock(&metrics_mutex);
  global_stats.metrics_updated++;
  pthread_mutex_unlock(&metrics_mutex);

  fprintf(stderr, "[metrics] Histogram observed: %s += %ld\n", name, value);
  return 0;
}

int fl_metrics_summary_create(fl_metric_t *registry, const char *name, const char *help) {
  if (!registry || !name || !help) return -1;

  registry->type = FL_METRIC_SUMMARY;
  free(registry->name);
  registry->name = (char*)malloc(strlen(name) + 1);
  strcpy(registry->name, name);
  free(registry->help);
  registry->help = (char*)malloc(strlen(help) + 1);
  strcpy(registry->help, help);
  registry->value = 0;

  pthread_mutex_lock(&metrics_mutex);
  global_stats.metrics_registered++;
  pthread_mutex_unlock(&metrics_mutex);

  fprintf(stderr, "[metrics] Summary created: %s\n", name);
  return 0;
}

int fl_metrics_summary_observe(fl_metric_t *registry, const char *name, int64_t value) {
  if (!registry) return -1;

  registry->value += value;

  pthread_mutex_lock(&metrics_mutex);
  global_stats.metrics_updated++;
  pthread_mutex_unlock(&metrics_mutex);

  fprintf(stderr, "[metrics] Summary observed: %s += %ld\n", name, value);
  return 0;
}

char* fl_metrics_export_prometheus(fl_metric_t *registry) {
  if (!registry) return NULL;

  char *export = (char*)malloc(2048);
  if (!export) return NULL;

  sprintf(export, "# HELP %s %s\n# TYPE %s %s\n%s %ld\n",
          registry->name, registry->help ? registry->help : "",
          registry->name, (registry->type == FL_METRIC_COUNTER ? "counter" : "gauge"),
          registry->name, registry->value);

  pthread_mutex_lock(&metrics_mutex);
  global_stats.export_count++;
  pthread_mutex_unlock(&metrics_mutex);

  fprintf(stderr, "[metrics] Metrics exported (Prometheus format)\n");
  return export;
}

int fl_metrics_scrape(fl_metric_t *registry, const char *endpoint) {
  if (!registry || !endpoint) return -1;

  fprintf(stderr, "[metrics] Scraping metrics from: %s\n", endpoint);
  return 0;
}

int fl_metrics_add_label(fl_metric_t *registry, const char *name, const char *label_name, const char *label_value) {
  if (!registry || !name || !label_name || !label_value) return -1;

  fl_metric_label_t *new_labels = (fl_metric_label_t*)realloc(registry->labels, 
                                                               (registry->label_count + 1) * sizeof(fl_metric_label_t));
  if (!new_labels) return -1;

  registry->labels = new_labels;
  registry->labels[registry->label_count].label_name = (char*)malloc(strlen(label_name) + 1);
  registry->labels[registry->label_count].label_value = (char*)malloc(strlen(label_value) + 1);

  strcpy((char*)registry->labels[registry->label_count].label_name, label_name);
  strcpy((char*)registry->labels[registry->label_count].label_value, label_value);
  registry->label_count++;

  fprintf(stderr, "[metrics] Label added: %s=%s\n", label_name, label_value);
  return 0;
}

fl_metrics_stats_t* fl_metrics_get_stats(void) {
  fl_metrics_stats_t *stats = (fl_metrics_stats_t*)malloc(sizeof(fl_metrics_stats_t));
  if (!stats) return NULL;

  pthread_mutex_lock(&metrics_mutex);
  memcpy(stats, &global_stats, sizeof(fl_metrics_stats_t));
  pthread_mutex_unlock(&metrics_mutex);

  return stats;
}

void fl_metrics_reset_stats(void) {
  pthread_mutex_lock(&metrics_mutex);
  memset(&global_stats, 0, sizeof(fl_metrics_stats_t));
  pthread_mutex_unlock(&metrics_mutex);

  fprintf(stderr, "[metrics] Stats reset\n");
}
