/**
 * FreeLang stdlib/mqueue - Message Queue (Pub/Sub)
 * Thread-safe queue, blocking operations, priority levels, timeout
 */

#ifndef FREELANG_STDLIB_MQUEUE_H
#define FREELANG_STDLIB_MQUEUE_H

#include <stdint.h>
#include <stddef.h>

/* ===== Message Queue ===== */

typedef struct fl_mqueue_t fl_mqueue_t;

/* ===== Queue Message ===== */

typedef struct {
  uint8_t *data;
  size_t size;
  int priority;               /* Higher = earlier dequeue */
  uint64_t sequence_id;       /* Global ordering */
  int64_t timestamp_ms;       /* Enqueue time */
} fl_mqueue_msg_t;

/* ===== Queue Modes ===== */

typedef enum {
  FL_MQUEUE_FIFO = 0,        /* First-in, first-out */
  FL_MQUEUE_LIFO = 1,        /* Last-in, first-out (stack) */
  FL_MQUEUE_PRIORITY = 2     /* Priority-based ordering */
} fl_mqueue_mode_t;

/* ===== Statistics ===== */

typedef struct {
  uint64_t messages_enqueued;
  uint64_t messages_dequeued;
  uint64_t total_bytes_enqueued;
  uint64_t total_bytes_dequeued;
  uint64_t current_queue_size;
  uint64_t max_queue_size;
  uint64_t enqueue_timeouts;
  uint64_t dequeue_timeouts;
} fl_mqueue_stats_t;

/* ===== Public API ===== */

/* Creation & Destruction */
fl_mqueue_t* fl_mqueue_create(fl_mqueue_mode_t mode, size_t max_size);
void fl_mqueue_destroy(fl_mqueue_t *queue);

/* Enqueue (Blocking/Non-blocking) */
int fl_mqueue_enqueue(fl_mqueue_t *queue, const uint8_t *data, size_t size, int priority);
int fl_mqueue_enqueue_timeout(fl_mqueue_t *queue, const uint8_t *data, size_t size,
                              int priority, int timeout_ms);

/* Dequeue (Blocking/Non-blocking) */
int fl_mqueue_dequeue(fl_mqueue_t *queue, fl_mqueue_msg_t *msg);
int fl_mqueue_dequeue_timeout(fl_mqueue_t *queue, fl_mqueue_msg_t *msg, int timeout_ms);
int fl_mqueue_dequeue_nonblocking(fl_mqueue_t *queue, fl_mqueue_msg_t *msg);

/* Peek (Non-destructive) */
int fl_mqueue_peek(fl_mqueue_t *queue, fl_mqueue_msg_t *msg);

/* Queue Operations */
int fl_mqueue_is_empty(fl_mqueue_t *queue);
int fl_mqueue_is_full(fl_mqueue_t *queue);
size_t fl_mqueue_size(fl_mqueue_t *queue);
size_t fl_mqueue_max_size(fl_mqueue_t *queue);
int fl_mqueue_clear(fl_mqueue_t *queue);

/* Message Operations */
void fl_mqueue_msg_destroy(fl_mqueue_msg_t *msg);

/* Statistics */
fl_mqueue_stats_t* fl_mqueue_get_stats(fl_mqueue_t *queue);
void fl_mqueue_reset_stats(fl_mqueue_t *queue);

#endif /* FREELANG_STDLIB_MQUEUE_H */
