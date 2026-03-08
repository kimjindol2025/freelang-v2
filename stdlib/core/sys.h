/**
 * FreeLang stdlib/sys - System Resource Information
 * CPU, memory, uptime, platform information
 */

#ifndef FREELANG_STDLIB_SYS_H
#define FREELANG_STDLIB_SYS_H

#include <stdint.h>
#include <time.h>

/* ===== System Information ===== */

typedef struct {
  uint32_t total_memory;         /* Bytes */
  uint32_t available_memory;     /* Bytes */
  uint32_t used_memory;          /* Bytes */
  uint8_t memory_percent;        /* 0-100 */
} fl_sys_memory_t;

typedef struct {
  uint8_t cpu_count;             /* Number of CPU cores */
  uint16_t cpu_percent;          /* Overall CPU usage 0-10000 (0.00-100.00%) */
  uint16_t load_average[3];      /* 1min, 5min, 15min (x100) */
} fl_sys_cpu_t;

typedef struct {
  char os_name[64];              /* "Linux", "Darwin", "Windows" */
  char os_version[64];           /* e.g., "6.8.0-94-generic" */
  char arch[32];                 /* "x86_64", "aarch64" */
  char hostname[256];
  char platform[64];             /* e.g., "linux-gnu" */
} fl_sys_platform_t;

typedef struct {
  uint64_t uptime_seconds;       /* System uptime */
  time_t boot_time;              /* System boot timestamp */
  uint32_t process_count;        /* Running processes */
  uint32_t thread_count;         /* System threads */
} fl_sys_runtime_t;

typedef struct {
  fl_sys_memory_t memory;
  fl_sys_cpu_t cpu;
  fl_sys_platform_t platform;
  fl_sys_runtime_t runtime;
} fl_sys_info_t;

/* ===== Public API ===== */

/* Get current system information */
int fl_sys_get_info(fl_sys_info_t *out_info);

/* Get memory info only */
int fl_sys_get_memory(fl_sys_memory_t *out_mem);

/* Get CPU info only */
int fl_sys_get_cpu(fl_sys_cpu_t *out_cpu);

/* Get platform info only */
int fl_sys_get_platform(fl_sys_platform_t *out_platform);

/* Get system uptime in seconds */
uint64_t fl_sys_get_uptime(void);

/* Get process ID */
uint32_t fl_sys_get_pid(void);

/* Get parent process ID */
uint32_t fl_sys_get_ppid(void);

/* Get current user ID */
uint32_t fl_sys_get_uid(void);

/* Check if running as root/admin */
int fl_sys_is_elevated(void);

#endif /* FREELANG_STDLIB_SYS_H */
