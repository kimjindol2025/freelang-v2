/**
 * FreeLang stdlib/mqueue Implementation - Thread-Safe Message Queue
 * FIFO/LIFO/Priority modes, blocking operations, timeout support
 */

#include "mqueue.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <pthread.h>
#include <time.h>

/* ===== Queue Node ===== */

typedef struct fl_mqueue_node_t {
  fl_mqueue_msg_t msg;
  struct fl_mqueue_node_t *next;
  struct fl_mqueue_node_t *prev;
} fl_mqueue_node_t;

/* ===== Queue Structure ===== */

struct fl_mqueue_t {
  fl_mqueue_mode_t mode;
  fl_mqueue_node_t *head;
  fl_mqueue_node_t *tail;
  size_t current_size;
  size_t max_size;
  uint64_t next_sequence_id;
  
  pthread_mutex_t mutex;
  pthread_cond_t not_empty;
  pthread_cond_t not_full;
  
  fl_mqueue_stats_t stats;
};

/* ===== Creation & Destruction ===== */

fl_mqueue_t* fl_mqueue_create(fl_mqueue_mode_t mode, size_t max_size) {
  if (max_size == 0) max_size = 1000;

  fl_mqueue_t *queue = (fl_mqueue_t*)malloc(sizeof(fl_mqueue_t));
  if (!queue) return NULL;

  queue->mode = mode;
  queue->head = NULL;
  queue->tail = NULL;
  queue->current_size = 0;
  queue->max_size = max_size;
  queue->next_sequence_id = 0;
  
  pthread_mutex_init(&queue->mutex, NULL);
  pthread_cond_init(&queue->not_empty, NULL);
  pthread_cond_init(&queue->not_full, NULL);
  
  memset(&queue->stats, 0, sizeof(fl_mqueue_stats_t));
  queue->stats.max_queue_size = max_size;

  fprintf(stderr, "[mqueue] Queue created: mode=%d, max_size=%zu\n", mode, max_size);
  return queue;
}

void fl_mqueue_destroy(fl_mqueue_t *queue) {
  if (!queue) return;

  pthread_mutex_lock(&queue->mutex);

  fl_mqueue_node_t *node = queue->head;
  while (node) {
    fl_mqueue_node_t *next = node->next;
    free(node->msg.data);
    free(node);
    node = next;
  }

  pthread_mutex_unlock(&queue->mutex);
  pthread_mutex_destroy(&queue->mutex);
  pthread_cond_destroy(&queue->not_empty);
  pthread_cond_destroy(&queue->not_full);

  free(queue);

  fprintf(stderr, "[mqueue] Queue destroyed\n");
}

/* ===== Enqueue ===== */

int fl_mqueue_enqueue(fl_mqueue_t *queue, const uint8_t *data, size_t size, int priority) {
  return fl_mqueue_enqueue_timeout(queue, data, size, priority, -1);
}

int fl_mqueue_enqueue_timeout(fl_mqueue_t *queue, const uint8_t *data, size_t size,
                              int priority, int timeout_ms) {
  if (!queue || !data) return -1;

  pthread_mutex_lock(&queue->mutex);

  /* Wait if queue is full */
  if (timeout_ms == -1) {
    while (queue->current_size >= queue->max_size) {
      pthread_cond_wait(&queue->not_full, &queue->mutex);
    }
  } else {
    struct timespec ts;
    clock_gettime(CLOCK_REALTIME, &ts);
    ts.tv_sec += timeout_ms / 1000;
    ts.tv_nsec += (timeout_ms % 1000) * 1000000;
    
    while (queue->current_size >= queue->max_size) {
      if (pthread_cond_timedwait(&queue->not_full, &queue->mutex, &ts) == ETIMEDOUT) {
        queue->stats.enqueue_timeouts++;
        pthread_mutex_unlock(&queue->mutex);
        return -2;
      }
    }
  }

  /* Create message node */
  fl_mqueue_node_t *node = (fl_mqueue_node_t*)malloc(sizeof(fl_mqueue_node_t));
  if (!node) {
    pthread_mutex_unlock(&queue->mutex);
    return -1;
  }

  node->msg.data = (uint8_t*)malloc(size);
  if (!node->msg.data) {
    free(node);
    pthread_mutex_unlock(&queue->mutex);
    return -1;
  }

  memcpy(node->msg.data, data, size);
  node->msg.size = size;
  node->msg.priority = priority;
  node->msg.sequence_id = queue->next_sequence_id++;
  node->msg.timestamp_ms = (int64_t)(time(NULL) * 1000);

  /* Enqueue based on mode */
  if (queue->mode == FL_MQUEUE_FIFO) {
    node->next = NULL;
    node->prev = queue->tail;
    if (queue->tail) queue->tail->next = node;
    queue->tail = node;
    if (!queue->head) queue->head = node;
  } else if (queue->mode == FL_MQUEUE_LIFO) {
    node->next = queue->head;
    node->prev = NULL;
    if (queue->head) queue->head->prev = node;
    queue->head = node;
    if (!queue->tail) queue->tail = node;
  } else if (queue->mode == FL_MQUEUE_PRIORITY) {
    /* Insert by priority (higher priority first) */
    fl_mqueue_node_t *current = queue->head;
    while (current && current->msg.priority > priority) {
      current = current->next;
    }
    
    if (!current) {
      node->next = NULL;
      node->prev = queue->tail;
      if (queue->tail) queue->tail->next = node;
      queue->tail = node;
      if (!queue->head) queue->head = node;
    } else {
      node->next = current;
      node->prev = current->prev;
      if (current->prev) current->prev->next = node;
      current->prev = node;
      if (current == queue->head) queue->head = node;
    }
  }

  queue->current_size++;
  queue->stats.messages_enqueued++;
  queue->stats.total_bytes_enqueued += size;

  pthread_cond_signal(&queue->not_empty);
  pthread_mutex_unlock(&queue->mutex);

  fprintf(stderr, "[mqueue] Enqueued: %zu bytes (priority=%d, size=%zu/%zu)\n",
          size, priority, queue->current_size, queue->max_size);

  return 0;
}

/* ===== Dequeue ===== */

int fl_mqueue_dequeue(fl_mqueue_t *queue, fl_mqueue_msg_t *msg) {
  return fl_mqueue_dequeue_timeout(queue, msg, -1);
}

int fl_mqueue_dequeue_timeout(fl_mqueue_t *queue, fl_mqueue_msg_t *msg, int timeout_ms) {
  if (!queue || !msg) return -1;

  pthread_mutex_lock(&queue->mutex);

  /* Wait if queue is empty */
  if (timeout_ms == -1) {
    while (queue->current_size == 0) {
      pthread_cond_wait(&queue->not_empty, &queue->mutex);
    }
  } else {
    struct timespec ts;
    clock_gettime(CLOCK_REALTIME, &ts);
    ts.tv_sec += timeout_ms / 1000;
    ts.tv_nsec += (timeout_ms % 1000) * 1000000;
    
    while (queue->current_size == 0) {
      if (pthread_cond_timedwait(&queue->not_empty, &queue->mutex, &ts) == ETIMEDOUT) {
        queue->stats.dequeue_timeouts++;
        pthread_mutex_unlock(&queue->mutex);
        return -2;
      }
    }
  }

  fl_mqueue_node_t *node = queue->head;
  if (!node) {
    pthread_mutex_unlock(&queue->mutex);
    return -1;
  }

  /* Copy message */
  msg->data = node->msg.data;
  msg->size = node->msg.size;
  msg->priority = node->msg.priority;
  msg->sequence_id = node->msg.sequence_id;
  msg->timestamp_ms = node->msg.timestamp_ms;

  /* Remove from queue */
  queue->head = node->next;
  if (queue->head) {
    queue->head->prev = NULL;
  } else {
    queue->tail = NULL;
  }

  free(node);
  queue->current_size--;
  queue->stats.messages_dequeued++;
  queue->stats.total_bytes_dequeued += msg->size;

  pthread_cond_signal(&queue->not_full);
  pthread_mutex_unlock(&queue->mutex);

  fprintf(stderr, "[mqueue] Dequeued: %zu bytes (size=%zu/%zu)\n",
          msg->size, queue->current_size, queue->max_size);

  return 0;
}

int fl_mqueue_dequeue_nonblocking(fl_mqueue_t *queue, fl_mqueue_msg_t *msg) {
  if (!queue || !msg) return -1;

  pthread_mutex_lock(&queue->mutex);

  if (queue->current_size == 0) {
    pthread_mutex_unlock(&queue->mutex);
    return -2;  /* Empty */
  }

  fl_mqueue_node_t *node = queue->head;
  msg->data = node->msg.data;
  msg->size = node->msg.size;
  msg->priority = node->msg.priority;
  msg->sequence_id = node->msg.sequence_id;
  msg->timestamp_ms = node->msg.timestamp_ms;

  queue->head = node->next;
  if (queue->head) queue->head->prev = NULL;
  else queue->tail = NULL;

  free(node);
  queue->current_size--;
  queue->stats.messages_dequeued++;
  queue->stats.total_bytes_dequeued += msg->size;

  pthread_cond_signal(&queue->not_full);
  pthread_mutex_unlock(&queue->mutex);

  return 0;
}

/* ===== Peek ===== */

int fl_mqueue_peek(fl_mqueue_t *queue, fl_mqueue_msg_t *msg) {
  if (!queue || !msg) return -1;

  pthread_mutex_lock(&queue->mutex);

  if (!queue->head) {
    pthread_mutex_unlock(&queue->mutex);
    return -2;
  }

  msg->data = queue->head->msg.data;
  msg->size = queue->head->msg.size;
  msg->priority = queue->head->msg.priority;
  msg->sequence_id = queue->head->msg.sequence_id;
  msg->timestamp_ms = queue->head->msg.timestamp_ms;

  pthread_mutex_unlock(&queue->mutex);

  return 0;
}

/* ===== Queue Operations ===== */

int fl_mqueue_is_empty(fl_mqueue_t *queue) {
  return queue ? queue->current_size == 0 : 1;
}

int fl_mqueue_is_full(fl_mqueue_t *queue) {
  return queue ? queue->current_size >= queue->max_size : 1;
}

size_t fl_mqueue_size(fl_mqueue_t *queue) {
  return queue ? queue->current_size : 0;
}

size_t fl_mqueue_max_size(fl_mqueue_t *queue) {
  return queue ? queue->max_size : 0;
}

int fl_mqueue_clear(fl_mqueue_t *queue) {
  if (!queue) return -1;

  pthread_mutex_lock(&queue->mutex);

  fl_mqueue_node_t *node = queue->head;
  while (node) {
    fl_mqueue_node_t *next = node->next;
    free(node->msg.data);
    free(node);
    node = next;
  }

  queue->head = NULL;
  queue->tail = NULL;
  queue->current_size = 0;

  pthread_cond_broadcast(&queue->not_full);
  pthread_mutex_unlock(&queue->mutex);

  fprintf(stderr, "[mqueue] Queue cleared\n");

  return 0;
}

void fl_mqueue_msg_destroy(fl_mqueue_msg_t *msg) {
  if (!msg) return;
  free(msg->data);
  msg->size = 0;
}

/* ===== Statistics ===== */

fl_mqueue_stats_t* fl_mqueue_get_stats(fl_mqueue_t *queue) {
  if (!queue) return NULL;

  fl_mqueue_stats_t *stats = (fl_mqueue_stats_t*)malloc(sizeof(fl_mqueue_stats_t));
  if (!stats) return NULL;

  pthread_mutex_lock(&queue->mutex);
  memcpy(stats, &queue->stats, sizeof(fl_mqueue_stats_t));
  stats->current_queue_size = queue->current_size;
  pthread_mutex_unlock(&queue->mutex);

  return stats;
}

void fl_mqueue_reset_stats(fl_mqueue_t *queue) {
  if (!queue) return;

  pthread_mutex_lock(&queue->mutex);
  memset(&queue->stats, 0, sizeof(fl_mqueue_stats_t));
  queue->stats.max_queue_size = queue->max_size;
  pthread_mutex_unlock(&queue->mutex);

  fprintf(stderr, "[mqueue] Stats reset\n");
}
