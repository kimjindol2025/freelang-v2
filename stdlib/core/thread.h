/**
 * FreeLang stdlib/thread - Worker Threads & Parallelism
 * Thread pool, task queue, synchronization primitives
 */

#ifndef FREELANG_STDLIB_THREAD_H
#define FREELANG_STDLIB_THREAD_H

#include <pthread.h>
#include <stdint.h>

/* ===== Task Definition ===== */

typedef void (*fl_task_fn_t)(void *arg);

typedef struct {
  uint32_t task_id;
  fl_task_fn_t func;
  void *arg;
  int priority;           /* 0-255, higher = more important */

  int64_t submitted_at;
  int64_t started_at;
  int64_t completed_at;

  int status;             /* 0=pending, 1=running, 2=completed */
  int result_code;
} fl_task_t;

/* ===== Thread Pool ===== */

typedef struct {
  pthread_t *threads;
  int thread_count;

  fl_task_t *task_queue;
  int queue_capacity;
  int queue_size;

  pthread_mutex_t queue_mutex;
  pthread_cond_t task_available;
  pthread_cond_t queue_empty;

  int running;            /* Pool is active */
  int shutdown;           /* Shutdown in progress */

  uint64_t total_tasks;
  uint64_t completed_tasks;
} fl_thread_pool_t;

/* ===== Synchronization Primitives ===== */

typedef struct {
  pthread_mutex_t mutex;
  int count;              /* Semaphore count */
} fl_semaphore_t;

typedef struct {
  pthread_mutex_t mutex;
  pthread_cond_t cond;
  int count;              /* Counter value */
} fl_barrier_t;

/* ===== Thread Results ===== */

typedef struct {
  fl_task_t **completed_tasks;
  int task_count;
  uint64_t total_time_ms;
} fl_batch_result_t;

/* ===== Public API: Thread Pool ===== */

/* Create thread pool */
fl_thread_pool_t* fl_thread_pool_create(int num_threads, int queue_capacity);

/* Destroy thread pool */
void fl_thread_pool_destroy(fl_thread_pool_t *pool);

/* Submit task to pool */
int fl_thread_pool_submit(fl_thread_pool_t *pool, fl_task_fn_t func, void *arg);

/* Submit task with priority */
int fl_thread_pool_submit_priority(fl_thread_pool_t *pool, fl_task_fn_t func,
                                    void *arg, int priority);

/* Submit batch of tasks */
int fl_thread_pool_submit_batch(fl_thread_pool_t *pool, fl_task_fn_t *funcs,
                                 void **args, int count);

/* Wait for all tasks to complete */
int fl_thread_pool_wait_all(fl_thread_pool_t *pool);

/* Wait with timeout (milliseconds) */
int fl_thread_pool_wait_timeout(fl_thread_pool_t *pool, int timeout_ms);

/* Get pool statistics */
void fl_thread_pool_stats(fl_thread_pool_t *pool, uint64_t *total, uint64_t *completed);

/* Get queue size */
int fl_thread_pool_queue_size(fl_thread_pool_t *pool);

/* Shutdown pool (wait for tasks) */
void fl_thread_pool_shutdown(fl_thread_pool_t *pool);

/* ===== Parallel Execution ===== */

/* Map function over array (parallel) */
int fl_thread_pool_map(fl_thread_pool_t *pool, fl_task_fn_t func,
                       void **items, int count, int *out_results);

/* Reduce results from parallel map */
void fl_thread_pool_reduce(int *results, int count, int (*reducer)(int, int));

/* Parallel for loop */
int fl_thread_pool_for(fl_thread_pool_t *pool, int start, int end,
                       void (*loop_func)(int index, void *arg), void *arg);

/* ===== Synchronization Primitives ===== */

/* Create semaphore */
fl_semaphore_t* fl_semaphore_create(int initial_count);

/* Acquire semaphore (wait) */
int fl_semaphore_wait(fl_semaphore_t *sem);

/* Release semaphore (signal) */
int fl_semaphore_post(fl_semaphore_t *sem);

/* Try acquire without blocking */
int fl_semaphore_trywait(fl_semaphore_t *sem);

/* Destroy semaphore */
void fl_semaphore_destroy(fl_semaphore_t *sem);

/* Create barrier */
fl_barrier_t* fl_barrier_create(int count);

/* Wait at barrier */
int fl_barrier_wait(fl_barrier_t *barrier);

/* Destroy barrier */
void fl_barrier_destroy(fl_barrier_t *barrier);

/* ===== Atomic Operations ===== */

/* Atomic increment */
int fl_atomic_increment(int *value);

/* Atomic decrement */
int fl_atomic_decrement(int *value);

/* Atomic compare-and-swap */
int fl_atomic_cas(int *value, int expected, int new_value);

/* Atomic add */
int fl_atomic_add(int *value, int delta);

#endif /* FREELANG_STDLIB_THREAD_H */
