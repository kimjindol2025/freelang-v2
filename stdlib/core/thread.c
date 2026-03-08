/**
 * FreeLang stdlib/thread Implementation - Worker Threads & Parallelism
 */

#include "thread.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <unistd.h>
#include <time.h>

/* ===== Worker Thread Function ===== */

void* fl_thread_worker(void *arg) {
  fl_thread_pool_t *pool = (fl_thread_pool_t*)arg;

  fprintf(stderr, "[thread] Worker started: TID=%ld\n", pthread_self());

  while (1) {
    pthread_mutex_lock(&pool->queue_mutex);

    /* Wait for task */
    while (pool->queue_size == 0 && !pool->shutdown) {
      pthread_cond_wait(&pool->task_available, &pool->queue_mutex);
    }

    if (pool->shutdown && pool->queue_size == 0) {
      pthread_mutex_unlock(&pool->queue_mutex);
      break;
    }

    /* Get task from queue (first in, first out) */
    fl_task_t task = pool->task_queue[0];

    /* Shift remaining tasks */
    for (int i = 0; i < pool->queue_size - 1; i++) {
      pool->task_queue[i] = pool->task_queue[i + 1];
    }
    pool->queue_size--;

    /* Signal if queue was full */
    if (pool->queue_size == pool->queue_capacity - 1) {
      pthread_cond_broadcast(&pool->queue_empty);
    }

    pthread_mutex_unlock(&pool->queue_mutex);

    /* Execute task */
    task.started_at = time(NULL);
    task.status = 1;  /* Running */

    if (task.func) {
      task.func(task.arg);
    }

    task.completed_at = time(NULL);
    task.status = 2;  /* Completed */

    fprintf(stderr, "[thread] Task completed: ID=%u, status=ok\n", task.task_id);

    /* Update pool statistics */
    pthread_mutex_lock(&pool->queue_mutex);
    pool->completed_tasks++;
    pthread_cond_broadcast(&pool->queue_empty);
    pthread_mutex_unlock(&pool->queue_mutex);
  }

  fprintf(stderr, "[thread] Worker exiting: TID=%ld\n", pthread_self());
  return NULL;
}

/* ===== Thread Pool Management ===== */

fl_thread_pool_t* fl_thread_pool_create(int num_threads, int queue_capacity) {
  if (num_threads <= 0 || queue_capacity <= 0) return NULL;

  fl_thread_pool_t *pool = (fl_thread_pool_t*)malloc(sizeof(fl_thread_pool_t));
  if (!pool) return NULL;

  memset(pool, 0, sizeof(fl_thread_pool_t));

  pool->thread_count = num_threads;
  pool->queue_capacity = queue_capacity;
  pool->running = 1;

  /* Allocate threads */
  pool->threads = (pthread_t*)malloc(sizeof(pthread_t) * num_threads);
  if (!pool->threads) {
    free(pool);
    return NULL;
  }

  /* Allocate task queue */
  pool->task_queue = (fl_task_t*)malloc(sizeof(fl_task_t) * queue_capacity);
  if (!pool->task_queue) {
    free(pool->threads);
    free(pool);
    return NULL;
  }

  /* Initialize synchronization primitives */
  pthread_mutex_init(&pool->queue_mutex, NULL);
  pthread_cond_init(&pool->task_available, NULL);
  pthread_cond_init(&pool->queue_empty, NULL);

  /* Create worker threads */
  for (int i = 0; i < num_threads; i++) {
    if (pthread_create(&pool->threads[i], NULL, fl_thread_worker, pool) != 0) {
      fprintf(stderr, "[thread] Failed to create worker thread\n");
      fl_thread_pool_destroy(pool);
      return NULL;
    }
  }

  fprintf(stderr, "[thread] Pool created: %d threads, queue size %d\n",
          num_threads, queue_capacity);

  return pool;
}

void fl_thread_pool_destroy(fl_thread_pool_t *pool) {
  if (!pool) return;

  /* Signal all workers to shutdown */
  pthread_mutex_lock(&pool->queue_mutex);
  pool->shutdown = 1;
  pthread_cond_broadcast(&pool->task_available);
  pthread_mutex_unlock(&pool->queue_mutex);

  /* Wait for all workers to exit */
  for (int i = 0; i < pool->thread_count; i++) {
    pthread_join(pool->threads[i], NULL);
  }

  pthread_mutex_destroy(&pool->queue_mutex);
  pthread_cond_destroy(&pool->task_available);
  pthread_cond_destroy(&pool->queue_empty);

  free(pool->task_queue);
  free(pool->threads);
  free(pool);

  fprintf(stderr, "[thread] Pool destroyed\n");
}

/* Submit task to pool */
int fl_thread_pool_submit(fl_thread_pool_t *pool, fl_task_fn_t func, void *arg) {
  return fl_thread_pool_submit_priority(pool, func, arg, 128);  /* Default priority */
}

/* Submit task with priority */
int fl_thread_pool_submit_priority(fl_thread_pool_t *pool, fl_task_fn_t func,
                                    void *arg, int priority) {
  if (!pool || !func || pool->shutdown) return -1;

  pthread_mutex_lock(&pool->queue_mutex);

  if (pool->queue_size >= pool->queue_capacity) {
    pthread_mutex_unlock(&pool->queue_mutex);
    fprintf(stderr, "[thread] Task queue full\n");
    return -1;
  }

  /* Add task to queue */
  fl_task_t *task = &pool->task_queue[pool->queue_size];
  task->task_id = pool->total_tasks + 1;
  task->func = func;
  task->arg = arg;
  task->priority = priority;
  task->submitted_at = time(NULL);
  task->status = 0;  /* Pending */

  pool->queue_size++;
  pool->total_tasks++;

  /* Signal worker thread */
  pthread_cond_signal(&pool->task_available);

  pthread_mutex_unlock(&pool->queue_mutex);

  return task->task_id;
}

/* Submit batch of tasks */
int fl_thread_pool_submit_batch(fl_thread_pool_t *pool, fl_task_fn_t *funcs,
                                 void **args, int count) {
  if (!pool || !funcs || !args || count <= 0) return -1;

  for (int i = 0; i < count; i++) {
    if (fl_thread_pool_submit(pool, funcs[i], args[i]) < 0) {
      return -1;
    }
  }

  return count;
}

/* Wait for all tasks to complete */
int fl_thread_pool_wait_all(fl_thread_pool_t *pool) {
  if (!pool) return -1;

  pthread_mutex_lock(&pool->queue_mutex);

  while (pool->completed_tasks < pool->total_tasks) {
    pthread_cond_wait(&pool->queue_empty, &pool->queue_mutex);
  }

  pthread_mutex_unlock(&pool->queue_mutex);

  fprintf(stderr, "[thread] All tasks completed: %lu\n", pool->completed_tasks);
  return 0;
}

/* Wait with timeout (milliseconds) */
int fl_thread_pool_wait_timeout(fl_thread_pool_t *pool, int timeout_ms) {
  if (!pool) return -1;

  struct timespec ts;
  clock_gettime(CLOCK_REALTIME, &ts);
  ts.tv_sec += timeout_ms / 1000;
  ts.tv_nsec += (timeout_ms % 1000) * 1000000;

  pthread_mutex_lock(&pool->queue_mutex);

  int result = 0;
  while (pool->completed_tasks < pool->total_tasks) {
    int rc = pthread_cond_timedwait(&pool->queue_empty, &pool->queue_mutex, &ts);
    if (rc == ETIMEDOUT) {
      result = -1;
      break;
    }
  }

  pthread_mutex_unlock(&pool->queue_mutex);

  return result;
}

/* Get pool statistics */
void fl_thread_pool_stats(fl_thread_pool_t *pool, uint64_t *total, uint64_t *completed) {
  if (!pool) return;

  pthread_mutex_lock(&pool->queue_mutex);

  if (total) *total = pool->total_tasks;
  if (completed) *completed = pool->completed_tasks;

  pthread_mutex_unlock(&pool->queue_mutex);
}

/* Get queue size */
int fl_thread_pool_queue_size(fl_thread_pool_t *pool) {
  if (!pool) return 0;

  pthread_mutex_lock(&pool->queue_mutex);
  int size = pool->queue_size;
  pthread_mutex_unlock(&pool->queue_mutex);

  return size;
}

/* Shutdown pool */
void fl_thread_pool_shutdown(fl_thread_pool_t *pool) {
  if (!pool) return;

  fl_thread_pool_wait_all(pool);
  fl_thread_pool_destroy(pool);
}

/* ===== Synchronization Primitives ===== */

fl_semaphore_t* fl_semaphore_create(int initial_count) {
  fl_semaphore_t *sem = (fl_semaphore_t*)malloc(sizeof(fl_semaphore_t));
  if (!sem) return NULL;

  pthread_mutex_init(&sem->mutex, NULL);
  sem->count = initial_count;

  return sem;
}

int fl_semaphore_wait(fl_semaphore_t *sem) {
  if (!sem) return -1;

  pthread_mutex_lock(&sem->mutex);

  while (sem->count <= 0) {
    /* Busy wait (simplified) */
    pthread_mutex_unlock(&sem->mutex);
    usleep(1000);  /* 1ms */
    pthread_mutex_lock(&sem->mutex);
  }

  sem->count--;

  pthread_mutex_unlock(&sem->mutex);

  return 0;
}

int fl_semaphore_post(fl_semaphore_t *sem) {
  if (!sem) return -1;

  pthread_mutex_lock(&sem->mutex);

  sem->count++;

  pthread_mutex_unlock(&sem->mutex);

  return 0;
}

int fl_semaphore_trywait(fl_semaphore_t *sem) {
  if (!sem) return -1;

  pthread_mutex_lock(&sem->mutex);

  if (sem->count > 0) {
    sem->count--;
    pthread_mutex_unlock(&sem->mutex);
    return 0;
  }

  pthread_mutex_unlock(&sem->mutex);

  return -1;  /* Would block */
}

void fl_semaphore_destroy(fl_semaphore_t *sem) {
  if (!sem) return;

  pthread_mutex_destroy(&sem->mutex);
  free(sem);
}

/* ===== Atomic Operations ===== */

int fl_atomic_increment(int *value) {
  if (!value) return 0;

  return __atomic_add_fetch(value, 1, __ATOMIC_SEQ_CST);
}

int fl_atomic_decrement(int *value) {
  if (!value) return 0;

  return __atomic_sub_fetch(value, 1, __ATOMIC_SEQ_CST);
}

int fl_atomic_cas(int *value, int expected, int new_value) {
  if (!value) return 0;

  return __atomic_compare_exchange_n(value, &expected, new_value,
                                      0, __ATOMIC_SEQ_CST, __ATOMIC_SEQ_CST);
}

int fl_atomic_add(int *value, int delta) {
  if (!value) return 0;

  return __atomic_add_fetch(value, delta, __ATOMIC_SEQ_CST);
}
