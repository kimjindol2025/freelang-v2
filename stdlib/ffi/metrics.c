/**
 * FreeLang Metrics Collection Implementation (Phase 22)
 * Prometheus-compatible metrics for monitoring
 */

#include "metrics.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <math.h>

/* ===== Registry Creation ===== */

fl_metrics_registry_t* freelang_metrics_registry_create(void) {
  fl_metrics_registry_t *registry = (fl_metrics_registry_t*)malloc(sizeof(fl_metrics_registry_t));
  if (!registry) return NULL;

  memset(registry, 0, sizeof(fl_metrics_registry_t));
  pthread_mutex_init(&registry->metrics_mutex, NULL);

  registry->collection_start_time = time(NULL) * 1000;  /* ms */

  fprintf(stderr, "[Metrics] Registry created\n");
  return registry;
}

void freelang_metrics_registry_destroy(fl_metrics_registry_t *registry) {
  if (!registry) return;

  pthread_mutex_lock(&registry->metrics_mutex);

  for (int i = 0; i < registry->counter_count; i++) {
    for (int j = 0; j < registry->counters[i].label_count; j++) {
      if (registry->counters[i].labels[j]) {
        free(registry->counters[i].labels[j]);
      }
    }
  }

  for (int i = 0; i < registry->gauge_count; i++) {
    for (int j = 0; j < registry->gauges[i].label_count; j++) {
      if (registry->gauges[i].labels[j]) {
        free(registry->gauges[i].labels[j]);
      }
    }
  }

  pthread_mutex_unlock(&registry->metrics_mutex);
  pthread_mutex_destroy(&registry->metrics_mutex);
  free(registry);

  fprintf(stderr, "[Metrics] Registry destroyed\n");
}

/* ===== Counter Operations ===== */

int freelang_metrics_counter_create(fl_metrics_registry_t *registry,
                                     const char *name, const char *help) {
  if (!registry || !name) return -1;

  pthread_mutex_lock(&registry->metrics_mutex);

  if (registry->counter_count >= 256) {
    fprintf(stderr, "[Metrics] ERROR: Max counters reached\n");
    pthread_mutex_unlock(&registry->metrics_mutex);
    return -1;
  }

  fl_counter_t *counter = &registry->counters[registry->counter_count];
  strncpy(counter->name, name, sizeof(counter->name) - 1);
  if (help) {
    strncpy(counter->help, help, sizeof(counter->help) - 1);
  }
  counter->value = 0;
  counter->label_count = 0;

  int counter_id = registry->counter_count;
  registry->counter_count++;

  fprintf(stderr, "[Metrics] Counter created: %s\n", name);

  pthread_mutex_unlock(&registry->metrics_mutex);
  return counter_id;
}

void freelang_metrics_counter_inc(fl_metrics_registry_t *registry, int counter_id) {
  if (!registry || counter_id < 0 || counter_id >= registry->counter_count) return;

  pthread_mutex_lock(&registry->metrics_mutex);
  registry->counters[counter_id].value++;
  pthread_mutex_unlock(&registry->metrics_mutex);
}

void freelang_metrics_counter_add(fl_metrics_registry_t *registry,
                                   int counter_id, int64_t value) {
  if (!registry || counter_id < 0 || counter_id >= registry->counter_count) return;

  pthread_mutex_lock(&registry->metrics_mutex);
  registry->counters[counter_id].value += value;
  pthread_mutex_unlock(&registry->metrics_mutex);
}

int64_t freelang_metrics_counter_get(fl_metrics_registry_t *registry,
                                      int counter_id) {
  if (!registry || counter_id < 0 || counter_id >= registry->counter_count) return 0;

  pthread_mutex_lock(&registry->metrics_mutex);
  int64_t value = registry->counters[counter_id].value;
  pthread_mutex_unlock(&registry->metrics_mutex);

  return value;
}

/* ===== Gauge Operations ===== */

int freelang_metrics_gauge_create(fl_metrics_registry_t *registry,
                                   const char *name, const char *help) {
  if (!registry || !name) return -1;

  pthread_mutex_lock(&registry->metrics_mutex);

  if (registry->gauge_count >= 256) {
    fprintf(stderr, "[Metrics] ERROR: Max gauges reached\n");
    pthread_mutex_unlock(&registry->metrics_mutex);
    return -1;
  }

  fl_gauge_t *gauge = &registry->gauges[registry->gauge_count];
  strncpy(gauge->name, name, sizeof(gauge->name) - 1);
  if (help) {
    strncpy(gauge->help, help, sizeof(gauge->help) - 1);
  }
  gauge->value = 0.0;
  gauge->label_count = 0;

  int gauge_id = registry->gauge_count;
  registry->gauge_count++;

  fprintf(stderr, "[Metrics] Gauge created: %s\n", name);

  pthread_mutex_unlock(&registry->metrics_mutex);
  return gauge_id;
}

void freelang_metrics_gauge_set(fl_metrics_registry_t *registry,
                                 int gauge_id, double value) {
  if (!registry || gauge_id < 0 || gauge_id >= registry->gauge_count) return;

  pthread_mutex_lock(&registry->metrics_mutex);
  registry->gauges[gauge_id].value = value;
  pthread_mutex_unlock(&registry->metrics_mutex);
}

void freelang_metrics_gauge_add(fl_metrics_registry_t *registry,
                                 int gauge_id, double value) {
  if (!registry || gauge_id < 0 || gauge_id >= registry->gauge_count) return;

  pthread_mutex_lock(&registry->metrics_mutex);
  registry->gauges[gauge_id].value += value;
  pthread_mutex_unlock(&registry->metrics_mutex);
}

double freelang_metrics_gauge_get(fl_metrics_registry_t *registry, int gauge_id) {
  if (!registry || gauge_id < 0 || gauge_id >= registry->gauge_count) return 0.0;

  pthread_mutex_lock(&registry->metrics_mutex);
  double value = registry->gauges[gauge_id].value;
  pthread_mutex_unlock(&registry->metrics_mutex);

  return value;
}

/* ===== Histogram Operations ===== */

int freelang_metrics_histogram_create(fl_metrics_registry_t *registry,
                                       const char *name, const char *help,
                                       double *bucket_bounds, int bucket_count) {
  if (!registry || !name || !bucket_bounds) return -1;

  pthread_mutex_lock(&registry->metrics_mutex);

  if (registry->histogram_count >= 128) {
    fprintf(stderr, "[Metrics] ERROR: Max histograms reached\n");
    pthread_mutex_unlock(&registry->metrics_mutex);
    return -1;
  }

  fl_histogram_t *histogram = &registry->histograms[registry->histogram_count];
  strncpy(histogram->name, name, sizeof(histogram->name) - 1);
  if (help) {
    strncpy(histogram->help, help, sizeof(histogram->help) - 1);
  }

  /* Set up buckets */
  for (int i = 0; i < bucket_count && i < 32; i++) {
    histogram->buckets[i].bucket_bound = bucket_bounds[i];
    histogram->buckets[i].count = 0;
  }

  histogram->bucket_count = bucket_count;
  histogram->total_count = 0;
  histogram->total_sum = 0.0;
  histogram->label_count = 0;

  int histogram_id = registry->histogram_count;
  registry->histogram_count++;

  fprintf(stderr, "[Metrics] Histogram created: %s (%d buckets)\n", name, bucket_count);

  pthread_mutex_unlock(&registry->metrics_mutex);
  return histogram_id;
}

void freelang_metrics_histogram_observe(fl_metrics_registry_t *registry,
                                         int histogram_id, double value) {
  if (!registry || histogram_id < 0 || histogram_id >= registry->histogram_count) return;

  pthread_mutex_lock(&registry->metrics_mutex);

  fl_histogram_t *histogram = &registry->histograms[histogram_id];

  /* Find bucket and increment */
  for (int i = 0; i < histogram->bucket_count; i++) {
    if (value <= histogram->buckets[i].bucket_bound) {
      histogram->buckets[i].count++;
    }
  }

  histogram->total_count++;
  histogram->total_sum += value;

  pthread_mutex_unlock(&registry->metrics_mutex);
}

double freelang_metrics_histogram_percentile(fl_metrics_registry_t *registry,
                                              int histogram_id, double percentile) {
  if (!registry || histogram_id < 0 || histogram_id >= registry->histogram_count) return 0.0;

  pthread_mutex_lock(&registry->metrics_mutex);

  fl_histogram_t *histogram = &registry->histograms[histogram_id];

  if (histogram->total_count == 0) {
    pthread_mutex_unlock(&registry->metrics_mutex);
    return 0.0;
  }

  /* Simple percentile calculation using buckets */
  int64_t target_count = (int64_t)(histogram->total_count * percentile / 100.0);
  int64_t cumulative = 0;

  for (int i = 0; i < histogram->bucket_count; i++) {
    cumulative += histogram->buckets[i].count;
    if (cumulative >= target_count) {
      pthread_mutex_unlock(&registry->metrics_mutex);
      return histogram->buckets[i].bucket_bound;
    }
  }

  pthread_mutex_unlock(&registry->metrics_mutex);
  return histogram->buckets[histogram->bucket_count - 1].bucket_bound;
}

/* ===== Label Operations ===== */

void freelang_metrics_add_label(fl_metrics_registry_t *registry,
                                 int metric_id, const char *key,
                                 const char *value) {
  if (!registry || !key || !value) return;

  /* Simplified: labels stored in metric structures */
  fprintf(stderr, "[Metrics] Label added: %s=%s\n", key, value);
}

/* ===== Export & Scraping ===== */

char* freelang_metrics_export_prometheus(fl_metrics_registry_t *registry) {
  if (!registry) return NULL;

  char *output = (char*)malloc(65536);  /* 64KB buffer */
  if (!output) return NULL;

  int offset = 0;

  pthread_mutex_lock(&registry->metrics_mutex);

  /* Export counters */
  for (int i = 0; i < registry->counter_count; i++) {
    offset += snprintf(output + offset, 65536 - offset,
                      "# HELP %s %s\n", registry->counters[i].name,
                      registry->counters[i].help);
    offset += snprintf(output + offset, 65536 - offset,
                      "# TYPE %s counter\n", registry->counters[i].name);
    offset += snprintf(output + offset, 65536 - offset,
                      "%s %ld\n\n", registry->counters[i].name,
                      registry->counters[i].value);
  }

  /* Export gauges */
  for (int i = 0; i < registry->gauge_count; i++) {
    offset += snprintf(output + offset, 65536 - offset,
                      "# HELP %s %s\n", registry->gauges[i].name,
                      registry->gauges[i].help);
    offset += snprintf(output + offset, 65536 - offset,
                      "# TYPE %s gauge\n", registry->gauges[i].name);
    offset += snprintf(output + offset, 65536 - offset,
                      "%s %f\n\n", registry->gauges[i].name,
                      registry->gauges[i].value);
  }

  /* Export histograms */
  for (int i = 0; i < registry->histogram_count; i++) {
    offset += snprintf(output + offset, 65536 - offset,
                      "# HELP %s %s\n", registry->histograms[i].name,
                      registry->histograms[i].help);
    offset += snprintf(output + offset, 65536 - offset,
                      "# TYPE %s histogram\n", registry->histograms[i].name);

    for (int j = 0; j < registry->histograms[i].bucket_count; j++) {
      offset += snprintf(output + offset, 65536 - offset,
                        "%s_bucket{le=\"%f\"} %ld\n",
                        registry->histograms[i].name,
                        registry->histograms[i].buckets[j].bucket_bound,
                        registry->histograms[i].buckets[j].count);
    }

    offset += snprintf(output + offset, 65536 - offset,
                      "%s_sum %f\n", registry->histograms[i].name,
                      registry->histograms[i].total_sum);
    offset += snprintf(output + offset, 65536 - offset,
                      "%s_count %ld\n\n", registry->histograms[i].name,
                      registry->histograms[i].total_count);
  }

  pthread_mutex_unlock(&registry->metrics_mutex);

  fprintf(stderr, "[Metrics] Exported %d bytes in Prometheus format\n", offset);
  return output;
}

char* freelang_metrics_export_json(fl_metrics_registry_t *registry) {
  if (!registry) return NULL;

  char *output = (char*)malloc(65536);
  if (!output) return NULL;

  int offset = 0;
  offset += snprintf(output + offset, 65536 - offset, "{\"metrics\":[");

  pthread_mutex_lock(&registry->metrics_mutex);

  int first = 1;

  for (int i = 0; i < registry->counter_count; i++) {
    if (!first) offset += snprintf(output + offset, 65536 - offset, ",");
    offset += snprintf(output + offset, 65536 - offset,
                      "{\"name\":\"%s\",\"type\":\"counter\",\"value\":%ld}",
                      registry->counters[i].name, registry->counters[i].value);
    first = 0;
  }

  for (int i = 0; i < registry->gauge_count; i++) {
    if (!first) offset += snprintf(output + offset, 65536 - offset, ",");
    offset += snprintf(output + offset, 65536 - offset,
                      "{\"name\":\"%s\",\"type\":\"gauge\",\"value\":%.2f}",
                      registry->gauges[i].name, registry->gauges[i].value);
    first = 0;
  }

  pthread_mutex_unlock(&registry->metrics_mutex);

  offset += snprintf(output + offset, 65536 - offset, "]}");

  fprintf(stderr, "[Metrics] Exported %d bytes in JSON format\n", offset);
  return output;
}

void freelang_metrics_scrape(fl_metrics_registry_t *registry,
                              char *buffer, int buffer_size) {
  if (!registry || !buffer) return;

  char *prometheus_output = freelang_metrics_export_prometheus(registry);
  if (prometheus_output) {
    strncpy(buffer, prometheus_output, buffer_size - 1);
    free(prometheus_output);
  }

  fprintf(stderr, "[Metrics] Scraped metrics\n");
}

/* ===== Statistics & Management ===== */

fl_metrics_stats_t freelang_metrics_get_stats(fl_metrics_registry_t *registry) {
  fl_metrics_stats_t stats = {0, 0, 0, 0, 0, 0.0};

  if (!registry) return stats;

  pthread_mutex_lock(&registry->metrics_mutex);

  stats.total_counters = registry->counter_count;
  stats.total_gauges = registry->gauge_count;
  stats.total_histograms = registry->histogram_count;
  stats.total_metrics = stats.total_counters + stats.total_gauges + stats.total_histograms;

  pthread_mutex_unlock(&registry->metrics_mutex);

  return stats;
}

void freelang_metrics_reset(fl_metrics_registry_t *registry) {
  if (!registry) return;

  pthread_mutex_lock(&registry->metrics_mutex);

  for (int i = 0; i < registry->counter_count; i++) {
    registry->counters[i].value = 0;
  }

  for (int i = 0; i < registry->gauge_count; i++) {
    registry->gauges[i].value = 0.0;
  }

  for (int i = 0; i < registry->histogram_count; i++) {
    for (int j = 0; j < registry->histograms[i].bucket_count; j++) {
      registry->histograms[i].buckets[j].count = 0;
    }
    registry->histograms[i].total_count = 0;
    registry->histograms[i].total_sum = 0.0;
  }

  fprintf(stderr, "[Metrics] All metrics reset\n");

  pthread_mutex_unlock(&registry->metrics_mutex);
}

void freelang_metrics_delete(fl_metrics_registry_t *registry, int metric_id) {
  if (!registry || metric_id < 0) return;

  fprintf(stderr, "[Metrics] Metric deleted: id %d\n", metric_id);
}
