/**
 * FreeLang stdlib/metrics - Prometheus-style Metrics Collection
 * Counters, gauges, histograms, summaries
 */
#ifndef FREELANG_STDLIB_METRICS_H
#define FREELANG_STDLIB_METRICS_H

#include <stdint.h>
#include <stddef.h>

typedef enum {
  FL_METRIC_COUNTER = 0,
  FL_METRIC_GAUGE = 1,
  FL_METRIC_HISTOGRAM = 2,
  FL_METRIC_SUMMARY = 3
} fl_metric_type_t;

typedef struct fl_metric_t fl_metric_t;

typedef struct {
  const char *label_name;
  const char *label_value;
} fl_metric_label_t;

typedef struct {
  int64_t value;
  const char *help;
  fl_metric_label_t *labels;
  int label_count;
  int64_t timestamp;
} fl_metric_value_t;

typedef struct {
  uint64_t metrics_registered;
  uint64_t metrics_updated;
  uint64_t export_count;
  uint64_t scrape_failures;
} fl_metrics_stats_t;

/* Metric Registry */
fl_metric_t* fl_metrics_new_registry(void);
void fl_metrics_destroy_registry(fl_metric_t *registry);

/* Counter */
int fl_metrics_counter_create(fl_metric_t *registry, const char *name, const char *help);
int fl_metrics_counter_inc(fl_metric_t *registry, const char *name, int64_t value);
int fl_metrics_counter_get(fl_metric_t *registry, const char *name, int64_t *value_out);

/* Gauge */
int fl_metrics_gauge_create(fl_metric_t *registry, const char *name, const char *help);
int fl_metrics_gauge_set(fl_metric_t *registry, const char *name, int64_t value);
int fl_metrics_gauge_inc(fl_metric_t *registry, const char *name, int64_t delta);
int fl_metrics_gauge_dec(fl_metric_t *registry, const char *name, int64_t delta);
int fl_metrics_gauge_get(fl_metric_t *registry, const char *name, int64_t *value_out);

/* Histogram */
int fl_metrics_histogram_create(fl_metric_t *registry, const char *name, const char *help, const int64_t *buckets, int bucket_count);
int fl_metrics_histogram_observe(fl_metric_t *registry, const char *name, int64_t value);

/* Summary */
int fl_metrics_summary_create(fl_metric_t *registry, const char *name, const char *help);
int fl_metrics_summary_observe(fl_metric_t *registry, const char *name, int64_t value);

/* Export & Scraping */
char* fl_metrics_export_prometheus(fl_metric_t *registry);
int fl_metrics_scrape(fl_metric_t *registry, const char *endpoint);

/* Labels */
int fl_metrics_add_label(fl_metric_t *registry, const char *name, const char *label_name, const char *label_value);

/* Statistics */
fl_metrics_stats_t* fl_metrics_get_stats(void);
void fl_metrics_reset_stats(void);

#endif
