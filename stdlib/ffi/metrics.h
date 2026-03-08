/**
 * FreeLang Metrics Collection (Phase 22)
 * Prometheus-compatible metrics for monitoring and observability
 */

#ifndef FREELANG_METRICS_H
#define FREELANG_METRICS_H

#include <pthread.h>
#include <time.h>

/* ===== Metric Types ===== */

typedef enum {
  METRIC_TYPE_COUNTER = 0,             /* Monotonic counter */
  METRIC_TYPE_GAUGE = 1,               /* Point-in-time value */
  METRIC_TYPE_HISTOGRAM = 2,           /* Distribution (buckets) */
  METRIC_TYPE_SUMMARY = 3              /* Quantiles */
} fl_metric_type_t;

/* ===== Counter Metric ===== */

typedef struct {
  char name[256];
  char help[512];
  int64_t value;
  char *labels[16];                    /* Label pairs */
  int label_count;
} fl_counter_t;

/* ===== Gauge Metric ===== */

typedef struct {
  char name[256];
  char help[512];
  double value;
  char *labels[16];
  int label_count;
} fl_gauge_t;

/* ===== Histogram Bucket ===== */

typedef struct {
  double bucket_bound;                 /* Upper bound */
  int64_t count;                       /* Count in bucket */
} fl_histogram_bucket_t;

typedef struct {
  char name[256];
  char help[512];
  fl_histogram_bucket_t buckets[32];   /* Bucket array */
  int bucket_count;
  int64_t total_count;
  double total_sum;
  char *labels[16];
  int label_count;
} fl_histogram_t;

/* ===== Metrics Registry ===== */

typedef struct {
  fl_counter_t counters[256];
  int counter_count;

  fl_gauge_t gauges[256];
  int gauge_count;

  fl_histogram_t histograms[128];
  int histogram_count;

  int64_t collection_start_time;       /* Registry creation time */
  int64_t last_collection_time;        /* Last collection time */

  pthread_mutex_t metrics_mutex;       /* Thread-safe access */
} fl_metrics_registry_t;

/* ===== Statistics Summary ===== */

typedef struct {
  int total_metrics;                   /* Total metric count */
  int total_counters;
  int total_gauges;
  int total_histograms;
  int64_t total_collections;           /* Number of collections */
  double average_collection_time_ms;   /* Avg collection duration */
} fl_metrics_stats_t;

/* ===== Public API: Registry Management ===== */

/* Create metrics registry */
fl_metrics_registry_t* freelang_metrics_registry_create(void);

/* Destroy registry */
void freelang_metrics_registry_destroy(fl_metrics_registry_t *registry);

/* ===== Public API: Counter Operations ===== */

/* Create or get counter */
int freelang_metrics_counter_create(fl_metrics_registry_t *registry,
                                     const char *name, const char *help);

/* Increment counter by 1 */
void freelang_metrics_counter_inc(fl_metrics_registry_t *registry, int counter_id);

/* Increment counter by N */
void freelang_metrics_counter_add(fl_metrics_registry_t *registry,
                                   int counter_id, int64_t value);

/* Get counter value */
int64_t freelang_metrics_counter_get(fl_metrics_registry_t *registry,
                                      int counter_id);

/* ===== Public API: Gauge Operations ===== */

/* Create or get gauge */
int freelang_metrics_gauge_create(fl_metrics_registry_t *registry,
                                   const char *name, const char *help);

/* Set gauge value */
void freelang_metrics_gauge_set(fl_metrics_registry_t *registry,
                                 int gauge_id, double value);

/* Increment gauge by N */
void freelang_metrics_gauge_add(fl_metrics_registry_t *registry,
                                 int gauge_id, double value);

/* Get gauge value */
double freelang_metrics_gauge_get(fl_metrics_registry_t *registry, int gauge_id);

/* ===== Public API: Histogram Operations ===== */

/* Create histogram with bucket bounds */
int freelang_metrics_histogram_create(fl_metrics_registry_t *registry,
                                       const char *name, const char *help,
                                       double *bucket_bounds, int bucket_count);

/* Observe value (add to histogram) */
void freelang_metrics_histogram_observe(fl_metrics_registry_t *registry,
                                         int histogram_id, double value);

/* Get histogram percentile */
double freelang_metrics_histogram_percentile(fl_metrics_registry_t *registry,
                                              int histogram_id, double percentile);

/* ===== Public API: Labels ===== */

/* Add label to metric */
void freelang_metrics_add_label(fl_metrics_registry_t *registry,
                                 int metric_id, const char *key,
                                 const char *value);

/* ===== Public API: Export & Scraping ===== */

/* Export metrics in Prometheus text format */
char* freelang_metrics_export_prometheus(fl_metrics_registry_t *registry);

/* Export metrics in JSON format */
char* freelang_metrics_export_json(fl_metrics_registry_t *registry);

/* Scrape metrics (for Prometheus scraper) */
void freelang_metrics_scrape(fl_metrics_registry_t *registry,
                              char *buffer, int buffer_size);

/* ===== Public API: Statistics & Management ===== */

/* Get registry statistics */
fl_metrics_stats_t freelang_metrics_get_stats(fl_metrics_registry_t *registry);

/* Reset all metrics */
void freelang_metrics_reset(fl_metrics_registry_t *registry);

/* Delete metric */
void freelang_metrics_delete(fl_metrics_registry_t *registry, int metric_id);

#endif /* FREELANG_METRICS_H */
